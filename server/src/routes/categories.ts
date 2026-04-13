import { Router } from 'express';
import { z } from 'zod';
import { queryAll, queryOne, execute, insert } from '../db/helpers.js';

const router = Router();

const createSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  icon: z.string().max(10).optional(),
  decay_days: z.number().int().min(1).max(365).optional(),
});

const updateSchema = createSchema.partial();

// GET /api/v1/categories
router.get('/', (_req, res) => {
  const categories = queryAll('SELECT * FROM categories ORDER BY sort_order, name');
  res.json(categories);
});

// PUT /api/v1/categories/reorder  (must be declared before /:id)
const reorderSchema = z.object({ ids: z.array(z.number().int()).min(1) });
router.put('/reorder', (req, res) => {
  const result = reorderSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.flatten() });

  result.data.ids.forEach((id, idx) => {
    execute(
      `UPDATE categories SET sort_order = ?, updated_at = datetime('now') WHERE id = ?`,
      [idx, id]
    );
  });
  res.status(204).end();
});

// GET /api/v1/categories/:id
router.get('/:id', (req, res) => {
  const category = queryOne('SELECT * FROM categories WHERE id = ?', [Number(req.params.id)]);
  if (!category) return res.status(404).json({ error: 'Category not found' });

  const items = queryAll('SELECT * FROM items WHERE category_id = ? ORDER BY name', [Number(req.params.id)]);
  const itemsWithSkills = items.map(item => {
    const skills = queryAll('SELECT * FROM skills WHERE item_id = ? ORDER BY name', [item.id]);
    return { ...item, skills };
  });

  res.json({ ...category, items: itemsWithSkills });
});

// POST /api/v1/categories
router.post('/', (req, res) => {
  const result = createSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.flatten() });

  const { name, description, icon, decay_days } = result.data;
  const maxRow = queryOne('SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM categories');
  const nextOrder = maxRow?.next ?? 0;
  const id = insert(
    'INSERT INTO categories (name, description, icon, decay_days, sort_order, user_id) VALUES (?, ?, ?, ?, ?, ?)',
    [name, description ?? null, icon ?? null, decay_days ?? 14, nextOrder, 'local-dev-user']
  );
  const category = queryOne('SELECT * FROM categories WHERE id = ?', [id]);
  res.status(201).json(category);
});

// PUT /api/v1/categories/:id
router.put('/:id', (req, res) => {
  const result = updateSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.flatten() });

  const existing = queryOne('SELECT * FROM categories WHERE id = ?', [Number(req.params.id)]);
  if (!existing) return res.status(404).json({ error: 'Category not found' });

  const data = { ...existing, ...result.data };
  execute(
    `UPDATE categories SET name = ?, description = ?, icon = ?, decay_days = ?, updated_at = datetime('now') WHERE id = ?`,
    [data.name, data.description, data.icon, data.decay_days, Number(req.params.id)]
  );

  const updated = queryOne('SELECT * FROM categories WHERE id = ?', [Number(req.params.id)]);
  res.json(updated);
});

// DELETE /api/v1/categories/:id
router.delete('/:id', (req, res) => {
  const existing = queryOne('SELECT * FROM categories WHERE id = ?', [Number(req.params.id)]);
  if (!existing) return res.status(404).json({ error: 'Category not found' });

  execute('DELETE FROM categories WHERE id = ?', [Number(req.params.id)]);
  res.status(204).end();
});

export default router;
