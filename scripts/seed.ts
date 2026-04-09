import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_PUBLISHABLE_KEY!
);

async function seed() {
  // Check if data already exists
  const { count } = await supabase.from('categories').select('*', { count: 'exact', head: true });
  if (count && count > 0) {
    console.log('Database already has data. Skipping seed.');
    return;
  }

  console.log('Seeding database...');

  // Categories
  const { data: cats } = await supabase.from('categories').insert([
    { name: 'Flight Simulation', description: 'Combat flight simulator proficiency', icon: '✈️', decay_days: 7 },
    { name: 'Language Study', description: 'Foreign language skills', icon: '📚', decay_days: 14 },
  ]).select();

  const flightId = cats![0].id;
  const langId = cats![1].id;

  // Items
  const { data: items } = await supabase.from('items').insert([
    { category_id: flightId, name: 'F-16C Viper', description: 'General Dynamics F-16 Fighting Falcon' },
    { category_id: flightId, name: 'F/A-18C Hornet', description: 'McDonnell Douglas F/A-18 Hornet' },
    { category_id: langId, name: 'English', description: 'English language skills' },
  ]).select();

  const f16Id = items![0].id;
  const f18Id = items![1].id;
  const engId = items![2].id;

  // Skills
  const { data: skills } = await supabase.from('skills').insert([
    { item_id: f16Id, name: 'Takeoff', description: 'Normal and short field takeoff' },
    { item_id: f16Id, name: 'Landing', description: 'Normal and crosswind landing' },
    { item_id: f16Id, name: 'A2A BVR', description: 'Beyond visual range air-to-air combat' },
    { item_id: f16Id, name: 'A2A Dogfight', description: 'Close range dogfighting' },
    { item_id: f16Id, name: 'A2G CCIP', description: 'CCIP bombing' },
    { item_id: f16Id, name: 'A2G CCRP', description: 'CCRP bombing' },
    { item_id: f18Id, name: 'Carrier Takeoff', description: 'Catapult launch from carrier' },
    { item_id: f18Id, name: 'Carrier Landing', description: 'Arrested landing on carrier' },
    { item_id: f18Id, name: 'A2A BVR', description: 'Beyond visual range combat with AIM-120' },
    { item_id: f18Id, name: 'CAS', description: 'Close air support missions' },
    { item_id: engId, name: 'Speaking', description: 'Conversation practice' },
    { item_id: engId, name: 'Listening', description: 'Listening comprehension' },
    { item_id: engId, name: 'Writing', description: 'Essay and email writing' },
  ]).select();

  // Session helper
  const today = new Date();
  const d = (daysAgo: number) => {
    const date = new Date(today);
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString().split('T')[0];
  };

  const s = skills!;
  await supabase.from('sessions').insert([
    { skill_id: s[0].id, practiced_at: d(1), duration_minutes: 30, rating: 4, notes: 'Clean takeoff, good crosswind handling' },
    { skill_id: s[1].id, practiced_at: d(1), duration_minutes: 25, rating: 3, notes: 'Landing was a bit rough' },
    { skill_id: s[2].id, practiced_at: d(3), duration_minutes: 45, rating: 4, notes: 'Good BVR shots with AIM-120' },
    { skill_id: s[3].id, practiced_at: d(5), duration_minutes: 60, rating: 5, notes: 'Excellent dogfight session' },
    { skill_id: s[4].id, practiced_at: d(8), duration_minutes: 40, rating: 3, notes: 'CCIP accuracy needs work' },
    { skill_id: s[0].id, practiced_at: d(10), duration_minutes: 20, rating: 4, notes: 'Quick takeoff practice' },
    { skill_id: s[2].id, practiced_at: d(12), duration_minutes: 50, rating: 3, notes: 'BVR against AI' },
    { skill_id: s[6].id, practiced_at: d(2), duration_minutes: 35, rating: 4, notes: 'Smooth cat launch' },
    { skill_id: s[7].id, practiced_at: d(2), duration_minutes: 45, rating: 3, notes: 'Case I recovery, caught 3-wire' },
    { skill_id: s[8].id, practiced_at: d(6), duration_minutes: 40, rating: 4, notes: 'Good AIM-120 employment' },
    { skill_id: s[10].id, practiced_at: d(0), duration_minutes: 30, rating: 4, notes: 'Online conversation class' },
    { skill_id: s[11].id, practiced_at: d(3), duration_minutes: 20, rating: 3, notes: 'Podcast listening' },
    { skill_id: s[10].id, practiced_at: d(7), duration_minutes: 25, rating: 4, notes: 'Presentation practice' },
  ]);

  console.log('Seed complete! Created 2 categories, 3 items, 13 skills, 13 sessions.');
}

seed().catch(console.error);
