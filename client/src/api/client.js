const API_BASE = '/api';

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  };

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  const res = await fetch(url, config);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `Request failed: ${res.status}`);
  }

  return data;
}

// ===== レシピ API =====
export const recipesApi = {
  getAll: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.group) params.set('group', filters.group);
    if (filters.favorite) params.set('favorite', 'true');
    if (filters.search) params.set('search', filters.search);
    const qs = params.toString();
    return request(`/recipes${qs ? '?' + qs : ''}`);
  },
  getById: (id) => request(`/recipes/${id}`),
  create: (recipe) => request('/recipes', { method: 'POST', body: recipe }),
  update: (id, updates) => request(`/recipes/${id}`, { method: 'PUT', body: updates }),
  delete: (id) => request(`/recipes/${id}`, { method: 'DELETE' }),
  toggleFavorite: (id) => request(`/recipes/${id}/favorite`, { method: 'PATCH' }),
  getGroups: () => request('/recipes/groups'),
};

// ===== AI解析 API =====
export const analyzeApi = {
  youtube: (url) => request('/analyze/youtube', { method: 'POST', body: { url } }),
  text: (text, sourceType = 'memo', imageUrl = null) =>
    request('/analyze/text', { method: 'POST', body: { text, sourceType, imageUrl } }),
  generate: (prompt) => request('/analyze/generate', { method: 'POST', body: { prompt } }),
};

// ===== 設定 API =====
export const settingsApi = {
  get: () => request('/settings'),
  getStatus: () => request('/settings/status'),
  update: (settings) => request('/settings', { method: 'PUT', body: settings }),
};
