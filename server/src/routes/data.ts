import { Router } from 'express';
import { queryAll, execute, insert } from '../db/helpers.js';
import { getDb, saveDb } from '../db/connection.js';

const router = Router();

// GET /api/v1/data/export
router.get('/export', (_req, res) => {
  const categories = queryAll('SELECT * FROM categories ORDER BY id');
  const items = queryAll('SELECT * FROM items ORDER BY id');
  const skills = queryAll('SELECT * FROM skills ORDER BY id');
  const sessions = queryAll('SELECT * FROM sessions ORDER BY id');

  res.json({
    version: 1,
    exportedAt: new Date().toISOString(),
    data: { categories, items, skills, sessions },
  });
});

// POST /api/v1/data/import
router.post('/import', (req, res) => {
  const { version, data } = req.body;
  if (!data?.categories || !data?.items || !data?.skills || !data?.sessions) {
    return res.status(400).json({ error: 'Invalid import format' });
  }

  const db = getDb();

  try {
    db.run('BEGIN TRANSACTION');

    // Clear existing data (order matters for FK)
    db.run('DELETE FROM sessions');
    db.run('DELETE FROM skills');
    db.run('DELETE FROM items');
    db.run('DELETE FROM categories');

    for (const c of data.categories) {
      db.run(
        'INSERT INTO categories (id, name, description, icon, decay_days, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [c.id, c.name, c.description, c.icon, c.decay_days, c.created_at, c.updated_at]
      );
    }
    for (const i of data.items) {
      db.run(
        'INSERT INTO items (id, category_id, name, description, icon, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [i.id, i.category_id, i.name, i.description, i.icon, i.created_at, i.updated_at]
      );
    }
    for (const s of data.skills) {
      db.run(
        'INSERT INTO skills (id, item_id, name, description, decay_days, target_frequency_days, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [s.id, s.item_id, s.name, s.description, s.decay_days, s.target_frequency_days, s.created_at, s.updated_at]
      );
    }
    for (const se of data.sessions) {
      db.run(
        'INSERT INTO sessions (id, skill_id, practiced_at, duration_minutes, rating, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [se.id, se.skill_id, se.practiced_at, se.duration_minutes, se.rating, se.notes, se.created_at]
      );
    }

    db.run('COMMIT');
    saveDb();

    res.json({
      message: 'Import successful',
      counts: {
        categories: data.categories.length,
        items: data.items.length,
        skills: data.skills.length,
        sessions: data.sessions.length,
      },
    });
  } catch (err: any) {
    db.run('ROLLBACK');
    res.status(500).json({ error: 'Import failed: ' + err.message });
  }
});

export default router;
