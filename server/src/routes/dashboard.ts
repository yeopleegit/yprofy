import { Router } from 'express';
import { queryAll, queryOne } from '../db/helpers.js';
import type { DecayStatus, DashboardCategory, DashboardStats, FrequencyData } from '../../../shared/types.js';

const router = Router();

function getDecayStatus(daysSince: number | null, decayDays: number): DecayStatus {
  if (daysSince === null) return 'stale';
  if (daysSince <= decayDays * 0.5) return 'fresh';
  if (daysSince <= decayDays) return 'warming';
  return 'stale';
}

// GET /api/v1/dashboard/summary
router.get('/summary', (req, res) => {
  // 클라이언트 로컬타임 기준 날짜 (없으면 UTC fallback)
  const today = (req.query.today as string) || new Date().toISOString().slice(0, 10);

  const rows = queryAll(`
    SELECT
      c.id as category_id, c.name as category_name, c.icon as category_icon,
      c.decay_days as category_decay_days, c.sort_order as category_sort_order,
      i.id as item_id, i.name as item_name, i.icon as item_icon,
      s.id as skill_id, s.name as skill_name, s.decay_days as skill_decay_days,
      MAX(se.practiced_at) as last_practiced,
      COUNT(se.id) as total_sessions,
      ROUND(AVG(se.rating), 1) as avg_rating,
      CAST(julianday(?) - julianday(MAX(se.practiced_at)) AS INTEGER) as days_since
    FROM categories c
    LEFT JOIN items i ON i.category_id = c.id
    LEFT JOIN skills s ON s.item_id = i.id
    LEFT JOIN sessions se ON se.skill_id = s.id
    GROUP BY c.id, i.id, s.id
    ORDER BY c.sort_order, c.name, i.name, s.name
  `, [today]);

  const categoryMap = new Map<number, DashboardCategory>();

  for (const row of rows) {
    if (!categoryMap.has(row.category_id)) {
      categoryMap.set(row.category_id, {
        id: row.category_id,
        name: row.category_name,
        icon: row.category_icon,
        items: [],
      });
    }
    const cat = categoryMap.get(row.category_id)!;

    if (row.item_id === null) continue;

    let item = cat.items.find(i => i.id === row.item_id);
    if (!item) {
      item = { id: row.item_id, name: row.item_name, icon: row.item_icon, skills: [] };
      cat.items.push(item);
    }

    if (row.skill_id === null) continue;

    const effectiveDecay = row.skill_decay_days ?? row.category_decay_days;
    item.skills.push({
      id: row.skill_id,
      name: row.skill_name,
      status: getDecayStatus(row.days_since, effectiveDecay),
      lastPracticed: row.last_practiced,
      daysSinceLastPractice: row.days_since,
      decayDays: effectiveDecay,
      totalSessions: row.total_sessions,
      avgRating: row.avg_rating,
    });
  }

  const categories = Array.from(categoryMap.values());

  const statsRow = queryOne(`
    SELECT
      (SELECT COUNT(*) FROM categories) as totalCategories,
      (SELECT COUNT(*) FROM skills) as totalSkills,
      (SELECT COUNT(*) FROM sessions) as totalSessions,
      (SELECT COUNT(*) FROM sessions WHERE practiced_at >= date(?, '-7 days')) as sessionsThisWeek
  `, [today]);

  const mostStaleRow = queryOne(`
    SELECT s.name as skillName, i.name as itemName, c.name as categoryName,
      CAST(julianday(?) - julianday(MAX(se.practiced_at)) AS INTEGER) as daysSince
    FROM skills s
    JOIN items i ON i.id = s.item_id
    JOIN categories c ON c.id = i.category_id
    LEFT JOIN sessions se ON se.skill_id = s.id
    GROUP BY s.id
    ORDER BY CASE WHEN MAX(se.practiced_at) IS NULL THEN 999999
             ELSE julianday(?) - julianday(MAX(se.practiced_at)) END DESC
    LIMIT 1
  `, [today, today]);

  const stats: DashboardStats = {
    totalCategories: statsRow?.totalCategories ?? 0,
    totalSkills: statsRow?.totalSkills ?? 0,
    totalSessions: statsRow?.totalSessions ?? 0,
    sessionsThisWeek: statsRow?.sessionsThisWeek ?? 0,
    mostStaleSkill: mostStaleRow ? {
      name: mostStaleRow.skillName,
      itemName: mostStaleRow.itemName,
      categoryName: mostStaleRow.categoryName,
      daysSince: mostStaleRow.daysSince ?? -1,
    } : null,
  };

  res.json({ categories, stats });
});

// GET /api/v1/dashboard/stats/frequency
router.get('/stats/frequency', (req, res) => {
  const { skillId, period = '30' } = req.query;
  const days = Math.min(parseInt(period as string) || 30, 365);
  const today = (req.query.today as string) || new Date().toISOString().slice(0, 10);

  let data: FrequencyData[];

  if (skillId) {
    data = queryAll(
      `SELECT date(practiced_at) as date, COUNT(*) as count
       FROM sessions
       WHERE skill_id = ? AND practiced_at >= date(?, '-' || ? || ' days')
       GROUP BY date(practiced_at) ORDER BY date`,
      [Number(skillId), today, days]
    );
  } else {
    data = queryAll(
      `SELECT date(practiced_at) as date, COUNT(*) as count
       FROM sessions
       WHERE practiced_at >= date(?, '-' || ? || ' days')
       GROUP BY date(practiced_at) ORDER BY date`,
      [today, days]
    );
  }

  res.json(data);
});

export default router;
