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
    setQuitDate: (quitDate) => request('/api/quiz/quit-date', { method: 'PATCH', body: JSON.stringify({ quitDate }) }),
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
  relapse: {
    log: () => request('/api/relapse', { method: 'POST' }),
    restart: () => request('/api/relapse/restart', { method: 'POST' }),
  },
  diary: {
    list: () => request('/api/diary'),
    save: (body) => request('/api/diary', { method: 'POST', body: JSON.stringify(body) }),
  },
  notifications: {
    vapidKey: () => request('/api/notifications/vapid-key'),
    subscribe: (sub) => request('/api/notifications/subscribe', { method: 'POST', body: JSON.stringify(sub) }),
    unsubscribe: (endpoint) => request('/api/notifications/subscribe', { method: 'DELETE', body: JSON.stringify({ endpoint }) }),
    saveTimes: (times) => request('/api/notifications/times', { method: 'PUT', body: JSON.stringify({ times }) }),
    debug: () => request('/api/notifications/debug'),
    test: () => request('/api/notifications/test', { method: 'POST' }),
  },
};
