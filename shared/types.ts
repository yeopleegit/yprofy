// === Database Row Types ===

export interface Category {
  id: number;
  name: string;
  description: string | null;
  icon: string | null;
  decay_days: number;
  created_at: string;
  updated_at: string;
}

export interface Item {
  id: number;
  category_id: number;
  name: string;
  description: string | null;
  icon: string | null;
  created_at: string;
  updated_at: string;
}

export interface Skill {
  id: number;
  item_id: number;
  name: string;
  description: string | null;
  decay_days: number | null;
  target_frequency_days: number | null;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: number;
  skill_id: number;
  practiced_at: string;
  duration_minutes: number | null;
  rating: number | null;
  notes: string | null;
  created_at: string;
}

// === API Request Types ===

export interface CreateCategoryRequest {
  name: string;
  description?: string;
  icon?: string;
  decay_days?: number;
}

export interface UpdateCategoryRequest {
  name?: string;
  description?: string;
  icon?: string;
  decay_days?: number;
}

export interface CreateItemRequest {
  name: string;
  description?: string;
  icon?: string;
}

export interface UpdateItemRequest {
  name?: string;
  description?: string;
  icon?: string;
}

export interface CreateSkillRequest {
  name: string;
  description?: string;
  decay_days?: number;
  target_frequency_days?: number;
}

export interface UpdateSkillRequest {
  name?: string;
  description?: string;
  decay_days?: number;
  target_frequency_days?: number;
}

export interface CreateSessionRequest {
  practiced_at: string;
  duration_minutes?: number;
  rating?: number;
  notes?: string;
}

export interface UpdateSessionRequest {
  practiced_at?: string;
  duration_minutes?: number;
  rating?: number;
  notes?: string;
}

// === Dashboard Types ===

export type DecayStatus = 'fresh' | 'warming' | 'stale';

export interface SkillSummary {
  id: number;
  name: string;
  status: DecayStatus;
  lastPracticed: string | null;
  daysSinceLastPractice: number | null;
  decayDays: number;
  totalSessions: number;
  avgRating: number | null;
}

export interface ItemSummary {
  id: number;
  name: string;
  icon: string | null;
  skills: SkillSummary[];
}

export interface DashboardCategory {
  id: number;
  name: string;
  icon: string | null;
  items: ItemSummary[];
}

export interface DashboardStats {
  totalCategories: number;
  totalSkills: number;
  totalSessions: number;
  sessionsThisWeek: number;
  mostStaleSkill: { name: string; itemName: string; categoryName: string; daysSince: number } | null;
}

export interface FrequencyData {
  date: string;
  count: number;
}
