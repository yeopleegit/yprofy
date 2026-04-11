import { Router } from 'express';
import { z } from 'zod';
import { queryAll, queryOne, execute, insert } from '../db/helpers.js';

const router = Router();

const createSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).nullable().optional(),
  decay_days: z.number().int().min(1).max(365).optional(),
  target_frequency_days: z.number().int().min(1).max(365).optional(),
});

const updateSchema = createSchema.partial();

// GET /api/v1/items/:itemId/skills
router.get('/items/:itemId/skills', (req, res) => {
  const skills = queryAll('SELECT * FROM skills WHERE item_id = ? ORDER BY name', [Number(req.params.itemId)]);
  res.json(skills);
});

// POST /api/v1/items/:itemId/skills
router.post('/items/:itemId/skills', (req, res) => {
  const result = createSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.flatten() });

  const item = queryOne('SELECT id FROM items WHERE id = ?', [Number(req.params.itemId)]);
  if (!item) return res.status(404).json({ error: 'Item not found' });

  const { name, description, decay_days, target_frequency_days } = result.data;
  const id = insert(
    'INSERT INTO skills (item_id, name, description, decay_days, target_frequency_days, user_id) VALUES (?, ?, ?, ?, ?, ?)',
    [Number(req.params.itemId), name, description ?? null, decay_days ?? null, target_frequency_days ?? null, 'local-dev-user']
  );

  const skill = queryOne('SELECT * FROM skills WHERE id = ?', [id]);
  res.status(201).json(skill);
});

// PUT /api/v1/skills/:id
router.put('/skills/:id', (req, res) => {
  const result = updateSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.flatten() });

  const existing = queryOne('SELECT * FROM skills WHERE id = ?', [Number(req.params.id)]);
  if (!existing) return res.status(404).json({ error: 'Skill not found' });

  const data = { ...existing, ...result.data };
  execute(
    `UPDATE skills SET name = ?, description = ?, decay_days = ?, target_frequency_days = ?, updated_at = datetime('now') WHERE id = ?`,
    [data.name, data.description, data.decay_days, data.target_frequency_days, Number(req.params.id)]
  );

  const updated = queryOne('SELECT * FROM skills WHERE id = ?', [Number(req.params.id)]);
  res.json(updated);
});

// POST /api/v1/skills/:id/copy
router.post('/skills/:id/copy', (req, res) => {
  const existing = queryOne('SELECT * FROM skills WHERE id = ?', [Number(req.params.id)]);
  if (!existing) return res.status(404).json({ error: 'Skill not found' });

  const newId = insert(
    'INSERT INTO skills (item_id, name, description, decay_days, target_frequency_days, user_id) VALUES (?, ?, ?, ?, ?, ?)',
    [existing.item_id, `Copy of ${existing.name}`, existing.description, existing.decay_days, existing.target_frequency_days, 'local-dev-user']
  );

  const skill = queryOne('SELECT * FROM skills WHERE id = ?', [newId]);
  res.status(201).json(skill);
});

// DELETE /api/v1/skills/:id
router.delete('/skills/:id', (req, res) => {
  const existing = queryOne('SELECT * FROM skills WHERE id = ?', [Number(req.params.id)]);
  if (!existing) return res.status(404).json({ error: 'Skill not found' });

  execute('DELETE FROM skills WHERE id = ?', [Number(req.params.id)]);
  res.status(204).end();
});

export default router;
