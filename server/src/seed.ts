import { initDb, getDb, saveDb } from './db/connection.js';

async function seed() {
  await initDb();
  const db = getDb();

  // Check if data already exists
  const stmt = db.prepare('SELECT COUNT(*) as count FROM categories');
  stmt.step();
  const row = stmt.getAsObject();
  stmt.free();
  if ((row.count as number) > 0) {
    console.log('Database already has data. Skipping seed.');
    return;
  }

  console.log('Seeding database...');

  // Categories
  db.run(`INSERT INTO categories (name, description, icon, decay_days) VALUES ('Flight Simulation', 'Combat flight simulator proficiency', '✈️', 7)`);
  db.run(`INSERT INTO categories (name, description, icon, decay_days) VALUES ('Language Study', 'Foreign language skills', '📚', 14)`);

  // Items - Flight Sim
  db.run(`INSERT INTO items (category_id, name, description) VALUES (1, 'F-16C Viper', 'General Dynamics F-16 Fighting Falcon')`);
  db.run(`INSERT INTO items (category_id, name, description) VALUES (1, 'F/A-18C Hornet', 'McDonnell Douglas F/A-18 Hornet')`);

  // Items - Language
  db.run(`INSERT INTO items (category_id, name, description) VALUES (2, 'English', 'English language skills')`);

  // Skills - F-16
  db.run(`INSERT INTO skills (item_id, name, description) VALUES (1, 'Takeoff', 'Normal and short field takeoff')`);
  db.run(`INSERT INTO skills (item_id, name, description) VALUES (1, 'Landing', 'Normal and crosswind landing')`);
  db.run(`INSERT INTO skills (item_id, name, description) VALUES (1, 'A2A BVR', 'Beyond visual range air-to-air combat')`);
  db.run(`INSERT INTO skills (item_id, name, description) VALUES (1, 'A2A Dogfight', 'Close range dogfighting')`);
  db.run(`INSERT INTO skills (item_id, name, description) VALUES (1, 'A2G CCIP', 'CCIP bombing')`);
  db.run(`INSERT INTO skills (item_id, name, description) VALUES (1, 'A2G CCRP', 'CCRP bombing')`);

  // Skills - F/A-18
  db.run(`INSERT INTO skills (item_id, name, description) VALUES (2, 'Carrier Takeoff', 'Catapult launch from carrier')`);
  db.run(`INSERT INTO skills (item_id, name, description) VALUES (2, 'Carrier Landing', 'Arrested landing on carrier')`);
  db.run(`INSERT INTO skills (item_id, name, description) VALUES (2, 'A2A BVR', 'Beyond visual range combat with AIM-120')`);
  db.run(`INSERT INTO skills (item_id, name, description) VALUES (2, 'CAS', 'Close air support missions')`);

  // Skills - English
  db.run(`INSERT INTO skills (item_id, name, description) VALUES (3, 'Speaking', 'Conversation practice')`);
  db.run(`INSERT INTO skills (item_id, name, description) VALUES (3, 'Listening', 'Listening comprehension')`);
  db.run(`INSERT INTO skills (item_id, name, description) VALUES (3, 'Writing', 'Essay and email writing')`);

  // Sample sessions (various dates for demo)
  const today = new Date();
  const d = (daysAgo: number) => {
    const date = new Date(today);
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString().split('T')[0];
  };

  // F-16 sessions
  db.run(`INSERT INTO sessions (skill_id, practiced_at, duration_minutes, rating, notes) VALUES (1, '${d(1)}', 30, 4, 'Clean takeoff, good crosswind handling')`);
  db.run(`INSERT INTO sessions (skill_id, practiced_at, duration_minutes, rating, notes) VALUES (2, '${d(1)}', 25, 3, 'Landing was a bit rough')`);
  db.run(`INSERT INTO sessions (skill_id, practiced_at, duration_minutes, rating, notes) VALUES (3, '${d(3)}', 45, 4, 'Good BVR shots with AIM-120')`);
  db.run(`INSERT INTO sessions (skill_id, practiced_at, duration_minutes, rating, notes) VALUES (4, '${d(5)}', 60, 5, 'Excellent dogfight session')`);
  db.run(`INSERT INTO sessions (skill_id, practiced_at, duration_minutes, rating, notes) VALUES (5, '${d(8)}', 40, 3, 'CCIP accuracy needs work')`);
  db.run(`INSERT INTO sessions (skill_id, practiced_at, duration_minutes, rating, notes) VALUES (1, '${d(10)}', 20, 4, 'Quick takeoff practice')`);
  db.run(`INSERT INTO sessions (skill_id, practiced_at, duration_minutes, rating, notes) VALUES (3, '${d(12)}', 50, 3, 'BVR against AI')`);

  // F/A-18 sessions
  db.run(`INSERT INTO sessions (skill_id, practiced_at, duration_minutes, rating, notes) VALUES (7, '${d(2)}', 35, 4, 'Smooth cat launch')`);
  db.run(`INSERT INTO sessions (skill_id, practiced_at, duration_minutes, rating, notes) VALUES (8, '${d(2)}', 45, 3, 'Case I recovery, caught 3-wire')`);
  db.run(`INSERT INTO sessions (skill_id, practiced_at, duration_minutes, rating, notes) VALUES (9, '${d(6)}', 40, 4, 'Good AIM-120 employment')`);

  // English sessions
  db.run(`INSERT INTO sessions (skill_id, practiced_at, duration_minutes, rating, notes) VALUES (11, '${d(0)}', 30, 4, 'Online conversation class')`);
  db.run(`INSERT INTO sessions (skill_id, practiced_at, duration_minutes, rating, notes) VALUES (12, '${d(3)}', 20, 3, 'Podcast listening')`);
  db.run(`INSERT INTO sessions (skill_id, practiced_at, duration_minutes, rating, notes) VALUES (11, '${d(7)}', 25, 4, 'Presentation practice')`);

  saveDb();
  console.log('Seed complete! Created 2 categories, 3 items, 13 skills, 13 sessions.');
}

seed().catch(console.error);
