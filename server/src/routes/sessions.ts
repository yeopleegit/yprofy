import { Router } from 'express';
import { z } from 'zod';
import { queryAll, queryOne, execute, insert } from '../db/helpers.js';

const router = Router();

const createSchema = z.object({
  practiced_at: z.string().regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?)?$/),
  duration_minutes: z.number().int().min(1).max(1440).optional(),
  rating: z.number().int().min(1).max(5).optional(),
  notes: z.string().max(1000).optional(),
});

const updateSchema = createSchema.partial();

// GET /api/v1/skills/:skillId/sessions
router.get('/skills/:skillId/sessions', (req, res) => {
  const { from, to } = req.query;
  let query = 'SELECT * FROM sessions WHERE skill_id = ?';
  const params: any[] = [Number(req.params.skillId)];

  if (from) {
    query += ' AND practiced_at >= ?';
    params.push(from);
  }
  if (to) {
    query += ' AND practiced_at <= ?';
    params.push(to);
  }

  query += ' ORDER BY practiced_at DESC';
  const sessions = queryAll(query, params);
  res.json(sessions);
});

// POST /api/v1/skills/:skillId/sessions
router.post('/skills/:skillId/sessions', (req, res) => {
  const result = createSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.flatten() });

  const skill = queryOne('SELECT id FROM skills WHERE id = ?', [Number(req.params.skillId)]);
  if (!skill) return res.status(404).json({ error: 'Skill not found' });

  const { practiced_at, duration_minutes, rating, notes } = result.data;
  const id = insert(
    'INSERT INTO sessions (skill_id, practiced_at, duration_minutes, rating, notes, user_id) VALUES (?, ?, ?, ?, ?, ?)',
    [Number(req.params.skillId), practiced_at, duration_minutes ?? null, rating ?? null, notes ?? null, 'local-dev-user']
  );

  const session = queryOne('SELECT * FROM sessions WHERE id = ?', [id]);
  res.status(201).json(session);
});

// PUT /api/v1/sessions/:id
router.put('/sessions/:id', (req, res) => {
  const result = updateSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.flatten() });

  const existing = queryOne('SELECT * FROM sessions WHERE id = ?', [Number(req.params.id)]);
  if (!existing) return res.status(404).json({ error: 'Session not found' });

  const data = { ...existing, ...result.data };
  execute(
    'UPDATE sessions SET practiced_at = ?, duration_minutes = ?, rating = ?, notes = ? WHERE id = ?',
    [data.practiced_at, data.duration_minutes, data.rating, data.notes, Number(req.params.id)]
  );

  const updated = queryOne('SELECT * FROM sessions WHERE id = ?', [Number(req.params.id)]);
  res.json(updated);
});

// DELETE /api/v1/sessions/:id
router.delete('/sessions/:id', (req, res) => {
  const existing = queryOne('SELECT * FROM sessions WHERE id = ?', [Number(req.params.id)]);
  if (!existing) return res.status(404).json({ error: 'Session not found' });

  execute('DELETE FROM sessions WHERE id = ?', [Number(req.params.id)]);
  res.status(204).end();
});

export default router;
