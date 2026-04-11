import { Router } from 'express';
import { z } from 'zod';
import { queryAll, queryOne, execute, insert } from '../db/helpers.js';

const router = Router();

const createSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).nullable().optional(),
  icon: z.string().max(10).optional(),
});

const updateSchema = createSchema.partial();

// GET /api/v1/categories/:catId/items
router.get('/categories/:catId/items', (req, res) => {
  const items = queryAll('SELECT * FROM items WHERE category_id = ? ORDER BY name', [Number(req.params.catId)]);
  res.json(items);
});

// GET /api/v1/items/:id
router.get('/items/:id', (req, res) => {
  const item = queryOne('SELECT * FROM items WHERE id = ?', [Number(req.params.id)]);
  if (!item) return res.status(404).json({ error: 'Item not found' });

  const skills = queryAll('SELECT * FROM skills WHERE item_id = ? ORDER BY name', [Number(req.params.id)]);
  res.json({ ...item, skills });
});

// POST /api/v1/categories/:catId/items
router.post('/categories/:catId/items', (req, res) => {
  const result = createSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.flatten() });

  const category = queryOne('SELECT id FROM categories WHERE id = ?', [Number(req.params.catId)]);
  if (!category) return res.status(404).json({ error: 'Category not found' });

  const { name, description, icon } = result.data;
  const id = insert(
    'INSERT INTO items (category_id, name, description, icon, user_id) VALUES (?, ?, ?, ?, ?)',
    [Number(req.params.catId), name, description ?? null, icon ?? null, 'local-dev-user']
  );

  const item = queryOne('SELECT * FROM items WHERE id = ?', [id]);
  res.status(201).json(item);
});

// PUT /api/v1/items/:id
router.put('/items/:id', (req, res) => {
  const result = updateSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.flatten() });

  const existing = queryOne('SELECT * FROM items WHERE id = ?', [Number(req.params.id)]);
  if (!existing) return res.status(404).json({ error: 'Item not found' });

  const data = { ...existing, ...result.data };
  execute(
    `UPDATE items SET name = ?, description = ?, icon = ?, updated_at = datetime('now') WHERE id = ?`,
    [data.name, data.description, data.icon, Number(req.params.id)]
  );

  const updated = queryOne('SELECT * FROM items WHERE id = ?', [Number(req.params.id)]);
  res.json(updated);
});

// POST /api/v1/items/:id/copy
router.post('/items/:id/copy', (req, res) => {
  const existing = queryOne('SELECT * FROM items WHERE id = ?', [Number(req.params.id)]);
  if (!existing) return res.status(404).json({ error: 'Item not found' });

  const newId = insert(
    'INSERT INTO items (category_id, name, description, icon, user_id) VALUES (?, ?, ?, ?, ?)',
    [existing.category_id, `Copy of ${existing.name}`, existing.description, existing.icon, 'local-dev-user']
  );

  // Copy all skills (without sessions)
  const skills = queryAll('SELECT * FROM skills WHERE item_id = ?', [Number(req.params.id)]);
  for (const skill of skills) {
    insert(
      'INSERT INTO skills (item_id, name, description, decay_days, target_frequency_days, user_id) VALUES (?, ?, ?, ?, ?, ?)',
      [newId, skill.name, skill.description, skill.decay_days, skill.target_frequency_days, 'local-dev-user']
    );
  }

  const item = queryOne('SELECT * FROM items WHERE id = ?', [newId]);
  const newSkills = queryAll('SELECT * FROM skills WHERE item_id = ?', [newId]);
  res.status(201).json({ ...item, skills: newSkills });
});

// DELETE /api/v1/items/:id
router.delete('/items/:id', (req, res) => {
  const existing = queryOne('SELECT * FROM items WHERE id = ?', [Number(req.params.id)]);
  if (!existing) return res.status(404).json({ error: 'Item not found' });

  execute('DELETE FROM items WHERE id = ?', [Number(req.params.id)]);
  res.status(204).end();
});

export default router;
