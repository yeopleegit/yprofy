import initSqlJs, { Database } from 'sql.js';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'proficiency.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

let db: Database;

export async function initDb(): Promise<Database> {
  if (db) return db;

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON');

  // Run schema
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
  db.run(schema);

  // Migration: add user_id column to pre-existing tables if missing
  for (const table of ['categories', 'items', 'skills', 'sessions']) {
    const info = db.exec(`PRAGMA table_info(${table})`);
    const columns = info[0]?.values.map((row: any) => row[1]) ?? [];
    if (!columns.includes('user_id')) {
      db.run(`ALTER TABLE ${table} ADD COLUMN user_id TEXT NOT NULL DEFAULT 'local-dev-user'`);
    }
  }

  // Migration: add sort_order column to categories if missing, backfill with id
  {
    const info = db.exec(`PRAGMA table_info(categories)`);
    const columns = info[0]?.values.map((row: any) => row[1]) ?? [];
    if (!columns.includes('sort_order')) {
      db.run(`ALTER TABLE categories ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0`);
      db.run(`UPDATE categories SET sort_order = id`);
    }
  }

  saveDb();
  return db;
}

export function getDb(): Database {
  if (!db) throw new Error('Database not initialized. Call initDb() first.');
  return db;
}

export function saveDb(): void {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}
