import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { createAuthClient } from '../lib/supabase.js';
import type { DecayStatus, DashboardCategory, DashboardStats } from '../shared/types.js';

// ─── Router ─────────────────────────────────────────────

type Handler = (req: VercelRequest, res: VercelResponse, params: Record<string, string>, supabase: SupabaseClient, userId: string) => Promise<any>;
type Route = { method: string; pattern: RegExp; paramNames: string[]; handler: Handler };

const routes: Route[] = [];

function addRoute(method: string, path: string, handler: Handler) {
  const paramNames: string[] = [];
  const pattern = new RegExp(
    '^' + path.replace(/:(\w+)/g, (_, name) => { paramNames.push(name); return '([^/]+)'; }) + '$'
  );
  routes.push({ method, pattern, paramNames, handler });
}

function matchRoute(method: string, path: string): { handler: Handler; params: Record<string, string> } | null {
  for (const route of routes) {
    if (route.method !== method) continue;
    const match = path.match(route.pattern);
    if (match) {
      const params: Record<string, string> = {};
      route.paramNames.forEach((name, i) => { params[name] = match[i + 1]; });
      return { handler: route.handler, params };
    }
  }
  return null;
}

// ─── Schemas ────────────────────────────────────────────

const categorySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).nullable().optional(),
  icon: z.string().max(10).optional(),
  decay_days: z.number().int().min(1).max(365).optional(),
});

const itemSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).nullable().optional(),
  icon: z.string().max(10).optional(),
});

const skillSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).nullable().optional(),
  decay_days: z.number().int().min(1).max(365).optional(),
  target_frequency_days: z.number().int().min(1).max(365).optional(),
});

const sessionSchema = z.object({
  practiced_at: z.string().regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?)?$/),
  duration_minutes: z.number().int().min(1).max(1440).optional(),
  rating: z.number().int().min(1).max(5).optional(),
  notes: z.string().max(1000).optional(),
});

// ─── Categories ─────────────────────────────────────────

addRoute('GET', 'categories', async (_req, res, _params, supabase) => {
  const { data, error } = await supabase.from('categories').select('*').order('sort_order').order('name');
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

addRoute('POST', 'categories', async (req, res, _params, supabase, userId) => {
  const result = categorySchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.flatten() });
  const { name, description, icon, decay_days } = result.data;
  const { data: maxRow } = await supabase
    .from('categories').select('sort_order')
    .order('sort_order', { ascending: false }).limit(1).maybeSingle();
  const nextOrder = (maxRow?.sort_order ?? -1) + 1;
  const { data, error } = await supabase
    .from('categories')
    .insert({ name, description: description ?? null, icon: icon ?? null, decay_days: decay_days ?? 14, sort_order: nextOrder, user_id: userId })
    .select().single();
  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json(data);
});

addRoute('PUT', 'categories/reorder', async (req, res, _params, supabase) => {
  const schema = z.object({ ids: z.array(z.number().int()).min(1) });
  const result = schema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.flatten() });
  const updates = await Promise.all(
    result.data.ids.map((id, idx) =>
      supabase.from('categories').update({ sort_order: idx }).eq('id', id)
    )
  );
  const firstErr = updates.find(u => u.error)?.error;
  if (firstErr) return res.status(500).json({ error: firstErr.message });
  return res.status(204).end();
});

addRoute('GET', 'categories/:id', async (_req, res, { id }, supabase) => {
  const { data: category, error } = await supabase.from('categories').select('*').eq('id', Number(id)).single();
  if (error) return res.status(404).json({ error: 'Category not found' });
  const { data: items } = await supabase
    .from('items').select('*, skills(*)').eq('category_id', Number(id))
    .order('name').order('name', { referencedTable: 'skills' });
  return res.json({ ...category, items: items ?? [] });
});

addRoute('PUT', 'categories/:id', async (req, res, { id }, supabase) => {
  const result = categorySchema.partial().safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.flatten() });
  const { data, error } = await supabase.from('categories').update(result.data).eq('id', Number(id)).select().single();
  if (error) return res.status(404).json({ error: 'Category not found' });
  return res.json(data);
});

addRoute('DELETE', 'categories/:id', async (_req, res, { id }, supabase) => {
  const { error } = await supabase.from('categories').delete().eq('id', Number(id));
  if (error) return res.status(404).json({ error: 'Category not found' });
  return res.status(204).end();
});

addRoute('GET', 'categories/:id/sessions', async (_req, res, { id }, supabase) => {
  const { data: items, error: itemErr } = await supabase
    .from('items').select('id, name, icon').eq('category_id', Number(id));
  if (itemErr) return res.status(500).json({ error: itemErr.message });
  if (!items || items.length === 0) return res.json([]);

  const itemIds = items.map(i => i.id);
  const itemMap = new Map(items.map(i => [i.id, { name: i.name, icon: i.icon }]));

  const { data: skills, error: skillErr } = await supabase
    .from('skills').select('id, name, item_id').in('item_id', itemIds);
  if (skillErr) return res.status(500).json({ error: skillErr.message });
  if (!skills || skills.length === 0) return res.json([]);

  const skillIds = skills.map(s => s.id);
  const skillMap = new Map(skills.map(s => [s.id, { name: s.name, item_id: s.item_id }]));

  const { data: sessions, error } = await supabase
    .from('sessions').select('*').in('skill_id', skillIds)
    .order('practiced_at', { ascending: false }).order('id', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });

  return res.json((sessions ?? []).map(s => {
    const sk = skillMap.get(s.skill_id);
    const it = sk ? itemMap.get(sk.item_id) : null;
    return {
      ...s,
      skill_name: sk?.name ?? null,
      item_name: it?.name ?? null,
      item_icon: it?.icon ?? null,
    };
  }));
});

// ─── Items ──────────────────────────────────────────────

addRoute('GET', 'categories/:catId/items', async (_req, res, { catId }, supabase) => {
  const { data, error } = await supabase.from('items').select('*').eq('category_id', Number(catId)).order('name');
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

addRoute('POST', 'categories/:catId/items', async (req, res, { catId }, supabase, userId) => {
  const result = itemSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.flatten() });
  const { data: cat } = await supabase.from('categories').select('id').eq('id', Number(catId)).single();
  if (!cat) return res.status(404).json({ error: 'Category not found' });
  const { name, description, icon } = result.data;
  const { data, error } = await supabase
    .from('items').insert({ category_id: Number(catId), name, description: description ?? null, icon: icon ?? null, user_id: userId })
    .select().single();
  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json(data);
});

addRoute('GET', 'items/:id', async (_req, res, { id }, supabase) => {
  const { data: item, error } = await supabase
    .from('items').select('*, skills(*)').eq('id', Number(id))
    .order('name', { referencedTable: 'skills' }).single();
  if (error) return res.status(404).json({ error: 'Item not found' });
  return res.json(item);
});

addRoute('GET', 'items/:id/sessions', async (_req, res, { id }, supabase) => {
  const { data: skills, error: skillErr } = await supabase
    .from('skills').select('id, name').eq('item_id', Number(id));
  if (skillErr) return res.status(500).json({ error: skillErr.message });
  if (!skills || skills.length === 0) return res.json([]);

  const skillIds = skills.map(s => s.id);
  const nameMap = new Map(skills.map(s => [s.id, s.name]));

  const { data: sessions, error } = await supabase
    .from('sessions').select('*').in('skill_id', skillIds)
    .order('practiced_at', { ascending: false }).order('id', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });

  return res.json((sessions ?? []).map(s => ({ ...s, skill_name: nameMap.get(s.skill_id) ?? null })));
});

addRoute('PUT', 'items/:id', async (req, res, { id }, supabase) => {
  const result = itemSchema.partial().safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.flatten() });
  const { data, error } = await supabase.from('items').update(result.data).eq('id', Number(id)).select().single();
  if (error) return res.status(404).json({ error: 'Item not found' });
  return res.json(data);
});

addRoute('POST', 'items/:id/copy', async (_req, res, { id }, supabase, userId) => {
  const { data: existing } = await supabase.from('items').select('*').eq('id', Number(id)).single();
  if (!existing) return res.status(404).json({ error: 'Item not found' });

  const { data: newItem, error } = await supabase.from('items')
    .insert({ category_id: existing.category_id, name: `Copy of ${existing.name}`, description: existing.description, icon: existing.icon, user_id: userId })
    .select().single();
  if (error) return res.status(500).json({ error: error.message });

  const { data: skills } = await supabase.from('skills').select('*').eq('item_id', Number(id));
  if (skills && skills.length > 0) {
    await supabase.from('skills').insert(skills.map(s => ({
      item_id: newItem.id, name: s.name, description: s.description,
      decay_days: s.decay_days, target_frequency_days: s.target_frequency_days, user_id: userId,
    })));
  }

  const { data: result } = await supabase.from('items').select('*, skills(*)').eq('id', newItem.id).single();
  return res.status(201).json(result);
});

addRoute('DELETE', 'items/:id', async (_req, res, { id }, supabase) => {
  const { error } = await supabase.from('items').delete().eq('id', Number(id));
  if (error) return res.status(404).json({ error: 'Item not found' });
  return res.status(204).end();
});

// ─── Skills ─────────────────────────────────────────────

addRoute('GET', 'items/:itemId/skills', async (_req, res, { itemId }, supabase) => {
  const { data, error } = await supabase.from('skills').select('*').eq('item_id', Number(itemId)).order('name');
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

addRoute('POST', 'items/:itemId/skills', async (req, res, { itemId }, supabase, userId) => {
  const result = skillSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.flatten() });
  const { data: item } = await supabase.from('items').select('id').eq('id', Number(itemId)).single();
  if (!item) return res.status(404).json({ error: 'Item not found' });
  const { name, description, decay_days, target_frequency_days } = result.data;
  const { data, error } = await supabase.from('skills')
    .insert({ item_id: Number(itemId), name, description: description ?? null, decay_days: decay_days ?? null, target_frequency_days: target_frequency_days ?? null, user_id: userId })
    .select().single();
  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json(data);
});

addRoute('PUT', 'skills/:id', async (req, res, { id }, supabase) => {
  const result = skillSchema.partial().safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.flatten() });
  const { data, error } = await supabase.from('skills').update(result.data).eq('id', Number(id)).select().single();
  if (error) return res.status(404).json({ error: 'Skill not found' });
  return res.json(data);
});

addRoute('POST', 'skills/:id/copy', async (_req, res, { id }, supabase, userId) => {
  const { data: existing } = await supabase.from('skills').select('*').eq('id', Number(id)).single();
  if (!existing) return res.status(404).json({ error: 'Skill not found' });
  const { data, error } = await supabase.from('skills')
    .insert({ item_id: existing.item_id, name: `Copy of ${existing.name}`, description: existing.description, decay_days: existing.decay_days, target_frequency_days: existing.target_frequency_days, user_id: userId })
    .select().single();
  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json(data);
});

addRoute('DELETE', 'skills/:id', async (_req, res, { id }, supabase) => {
  const { error } = await supabase.from('skills').delete().eq('id', Number(id));
  if (error) return res.status(404).json({ error: 'Skill not found' });
  return res.status(204).end();
});

// ─── Sessions ───────────────────────────────────────────

addRoute('GET', 'skills/:skillId/sessions', async (req, res, { skillId }, supabase) => {
  const { from, to } = req.query;
  let query = supabase.from('sessions').select('*').eq('skill_id', Number(skillId)).order('practiced_at', { ascending: false });
  if (from) query = query.gte('practiced_at', from as string);
  if (to) query = query.lte('practiced_at', to as string);
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

addRoute('POST', 'skills/:skillId/sessions', async (req, res, { skillId }, supabase, userId) => {
  const result = sessionSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.flatten() });
  const { data: skill } = await supabase.from('skills').select('id').eq('id', Number(skillId)).single();
  if (!skill) return res.status(404).json({ error: 'Skill not found' });
  const { practiced_at, duration_minutes, rating, notes } = result.data;
  const { data, error } = await supabase.from('sessions')
    .insert({ skill_id: Number(skillId), practiced_at, duration_minutes: duration_minutes ?? null, rating: rating ?? null, notes: notes ?? null, user_id: userId })
    .select().single();
  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json(data);
});

addRoute('PUT', 'sessions/:id', async (req, res, { id }, supabase) => {
  const result = sessionSchema.partial().safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.flatten() });
  const { data, error } = await supabase.from('sessions').update(result.data).eq('id', Number(id)).select().single();
  if (error) return res.status(404).json({ error: 'Session not found' });
  return res.json(data);
});

addRoute('DELETE', 'sessions/:id', async (_req, res, { id }, supabase) => {
  const { error } = await supabase.from('sessions').delete().eq('id', Number(id));
  if (error) return res.status(404).json({ error: 'Session not found' });
  return res.status(204).end();
});

// ─── Dashboard ──────────────────────────────────────────

function getDecayStatus(daysSince: number | null, decayDays: number): DecayStatus {
  if (daysSince === null) return 'stale';
  if (daysSince <= decayDays * 0.5) return 'fresh';
  if (daysSince <= decayDays) return 'warming';
  return 'stale';
}

addRoute('GET', 'dashboard/summary', async (req, res, _params, supabase) => {
  const today = (req.query.today as string) || new Date().toISOString().slice(0, 10);

  const { data: rows, error: summaryError } = await supabase.rpc('dashboard_summary', { today_date: today });
  if (summaryError) return res.status(500).json({ error: summaryError.message });

  const categoryMap = new Map<number, DashboardCategory>();
  for (const row of rows ?? []) {
    if (!categoryMap.has(row.category_id)) {
      categoryMap.set(row.category_id, { id: row.category_id, name: row.category_name, icon: row.category_icon, items: [] });
    }
    const cat = categoryMap.get(row.category_id)!;
    if (row.item_id === null) continue;
    let item = cat.items.find(i => i.id === row.item_id);
    if (!item) { item = { id: row.item_id, name: row.item_name, icon: row.item_icon, skills: [] }; cat.items.push(item); }
    if (row.skill_id === null) continue;
    const effectiveDecay = row.skill_decay_days ?? row.category_decay_days;
    item.skills.push({
      id: row.skill_id, name: row.skill_name, status: getDecayStatus(row.days_since, effectiveDecay),
      lastPracticed: row.last_practiced, daysSinceLastPractice: row.days_since, decayDays: effectiveDecay,
      totalSessions: row.total_sessions, avgRating: row.avg_rating,
    });
  }

  const categories = Array.from(categoryMap.values());
  const { data: statsRows } = await supabase.rpc('dashboard_stats', { today_date: today });
  const statsRow = statsRows?.[0];
  const { data: staleRows } = await supabase.rpc('most_stale_skill', { today_date: today });
  const mostStaleRow = staleRows?.[0];

  const stats: DashboardStats = {
    totalCategories: statsRow?.total_categories ?? 0, totalSkills: statsRow?.total_skills ?? 0,
    totalSessions: statsRow?.total_sessions ?? 0, sessionsThisWeek: statsRow?.sessions_this_week ?? 0,
    mostStaleSkill: mostStaleRow ? { name: mostStaleRow.skill_name, itemName: mostStaleRow.item_name, categoryName: mostStaleRow.category_name, daysSince: mostStaleRow.days_since ?? -1 } : null,
  };
  return res.json({ categories, stats });
});

addRoute('GET', 'dashboard/stats/frequency', async (req, res, _params, supabase) => {
  const { skillId, period = '30' } = req.query;
  const days = Math.min(parseInt(period as string) || 30, 365);
  const today = (req.query.today as string) || new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase.rpc('session_frequency', {
    p_skill_id: skillId ? Number(skillId) : null,
    p_days: days,
    p_today: today,
  });
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// ─── Data Export/Import ─────────────────────────────────

addRoute('GET', 'data/export', async (_req, res, _params, supabase) => {
  const [categories, items, skills, sessions] = await Promise.all([
    supabase.from('categories').select('*').order('id'),
    supabase.from('items').select('*').order('id'),
    supabase.from('skills').select('*').order('id'),
    supabase.from('sessions').select('*').order('id'),
  ]);
  if (categories.error || items.error || skills.error || sessions.error) {
    return res.status(500).json({ error: 'Export failed' });
  }
  // user_id 제거 (백업 파일 이식성)
  const strip = (rows: any[]) => rows.map(({ user_id, ...rest }) => rest);
  return res.json({
    version: 1, exportedAt: new Date().toISOString(),
    data: { categories: strip(categories.data!), items: strip(items.data!), skills: strip(skills.data!), sessions: strip(sessions.data!) },
  });
});

addRoute('POST', 'data/import', async (req, res, _params, supabase, userId) => {
  const { data } = req.body;
  if (!data?.categories || !data?.items || !data?.skills || !data?.sessions) {
    return res.status(400).json({ error: 'Invalid import format' });
  }
  try {
    await supabase.from('sessions').delete().neq('id', 0);
    await supabase.from('skills').delete().neq('id', 0);
    await supabase.from('items').delete().neq('id', 0);
    await supabase.from('categories').delete().neq('id', 0);
    const inject = (rows: any[]) => rows.map(r => ({ ...r, user_id: userId }));
    if (data.categories.length > 0) { const { error } = await supabase.from('categories').insert(inject(data.categories)); if (error) throw error; }
    if (data.items.length > 0) { const { error } = await supabase.from('items').insert(inject(data.items)); if (error) throw error; }
    if (data.skills.length > 0) { const { error } = await supabase.from('skills').insert(inject(data.skills)); if (error) throw error; }
    if (data.sessions.length > 0) { const { error } = await supabase.from('sessions').insert(inject(data.sessions)); if (error) throw error; }
    return res.json({ message: 'Import successful', counts: { categories: data.categories.length, items: data.items.length, skills: data.skills.length, sessions: data.sessions.length } });
  } catch (err: any) {
    return res.status(500).json({ error: 'Import failed: ' + err.message });
  }
});

// ─── Main Handler ───────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  // Auth
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: '로그인이 필요합니다' });
  }
  const token = authHeader.slice(7);
  const supabase = createAuthClient(token);

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return res.status(401).json({ error: '인증이 만료되었습니다' });
  }

  // Path is passed via rewrite query param: /api/v1/categories/1 → __path=categories/1
  const rawPath = (req.query.__path as string) || '';
  const path = rawPath.replace(/\/$/, '');

  const matched = matchRoute(req.method!, path);
  if (!matched) return res.status(404).json({ error: 'Not found' });

  try {
    return await matched.handler(req, res, matched.params, supabase, user.id);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
