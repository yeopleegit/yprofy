const BASE = '/api/v1';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (res.status === 204) return undefined as T;
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

export const api = {
  // Categories
  getCategories: () => request<any[]>('/categories'),
  getCategory: (id: number) => request<any>(`/categories/${id}`),
  createCategory: (data: any) => request<any>('/categories', { method: 'POST', body: JSON.stringify(data) }),
  updateCategory: (id: number, data: any) => request<any>(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCategory: (id: number) => request<void>(`/categories/${id}`, { method: 'DELETE' }),

  // Items
  getItems: (catId: number) => request<any[]>(`/categories/${catId}/items`),
  getItem: (id: number) => request<any>(`/items/${id}`),
  createItem: (catId: number, data: any) => request<any>(`/categories/${catId}/items`, { method: 'POST', body: JSON.stringify(data) }),
  updateItem: (id: number, data: any) => request<any>(`/items/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteItem: (id: number) => request<void>(`/items/${id}`, { method: 'DELETE' }),

  // Skills
  getSkills: (itemId: number) => request<any[]>(`/items/${itemId}/skills`),
  createSkill: (itemId: number, data: any) => request<any>(`/items/${itemId}/skills`, { method: 'POST', body: JSON.stringify(data) }),
  updateSkill: (id: number, data: any) => request<any>(`/skills/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSkill: (id: number) => request<void>(`/skills/${id}`, { method: 'DELETE' }),

  // Sessions
  getSessions: (skillId: number) => request<any[]>(`/skills/${skillId}/sessions`),
  createSession: (skillId: number, data: any) => request<any>(`/skills/${skillId}/sessions`, { method: 'POST', body: JSON.stringify(data) }),
  updateSession: (id: number, data: any) => request<any>(`/sessions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSession: (id: number) => request<void>(`/sessions/${id}`, { method: 'DELETE' }),

  // Dashboard
  getDashboard: () => request<any>('/dashboard/summary'),
  getFrequency: (params?: { skillId?: number; period?: number }) => {
    const qs = new URLSearchParams();
    if (params?.skillId) qs.set('skillId', String(params.skillId));
    if (params?.period) qs.set('period', String(params.period));
    return request<any[]>(`/dashboard/stats/frequency?${qs}`);
  },

  // Data export/import
  exportData: () => request<any>('/data/export'),
  importData: (data: any) => request<any>('/data/import', { method: 'POST', body: JSON.stringify(data) }),
};
