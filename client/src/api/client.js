const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function getToken() {
  return localStorage.getItem('qf_token');
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.error || 'Errore sconosciuto');
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  auth: {
    register: (body) => request('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),
    login: (body) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),
    me: () => request('/api/auth/me'),
  },
  quiz: {
    save: (body) => request('/api/quiz', { method: 'POST', body: JSON.stringify(body) }),
  },
  progress: {
    get: () => request('/api/progress'),
  },
  craving: {
    create: (body) => request('/api/craving', { method: 'POST', body: JSON.stringify(body) }),
    resolve: (id) => request(`/api/craving/${id}/resolve`, { method: 'PATCH' }),
    history: () => request('/api/craving/history'),
  },
  chat: {
    send: (messages) => request('/api/chat', { method: 'POST', body: JSON.stringify({ messages }) }),
  },
};
