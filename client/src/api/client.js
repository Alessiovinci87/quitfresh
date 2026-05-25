// In produzione frontend e backend sono sullo stesso dominio (Railway):
// BASE_URL = '' → fetch('/api/...') va same-origin all'Express server.
// In dev locale Vite gira su :5173 e il backend su :3001, quindi usiamo
// VITE_API_URL (default :3001) per chiamare l'API cross-origin.
const BASE_URL = import.meta.env.PROD
  ? ''
  : (import.meta.env.VITE_API_URL || 'http://localhost:3001');

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
    err.code = data.code; // es. 'EMAIL_NOT_VERIFIED' per gating UI
    // 402 freemium gating: il backend manda { error:'FREE_LIMIT_REACHED',
    // feature, limit, used } — il client lo usa per mostrare paywall inline.
    if (data.error === 'FREE_LIMIT_REACHED') {
      err.freemiumLimit = { feature: data.feature, limit: data.limit, used: data.used };
    }
    throw err;
  }
  return data;
}

export const api = {
  auth: {
    register: (body) => request('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),
    login: (body) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),
    me: () => request('/api/auth/me'),
    deleteAccount: () => request('/api/auth/me', { method: 'DELETE' }),
    forgotPassword: (email) => request('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
    resetPassword: (token, newPassword) => request('/api/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, newPassword }) }),
    verifyEmail: (token) => request(`/api/auth/verify-email?token=${encodeURIComponent(token)}`),
    resendVerify: () => request('/api/auth/resend-verify', { method: 'POST' }),
    logoutAll: () => request('/api/auth/logout-all', { method: 'POST' }),
    exportData: async () => {
      const token = getToken();
      const res = await fetch(`${BASE_URL}/api/auth/export`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Export fallito');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `quitfresh-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    },
  },
  quiz: {
    save: (body) => request('/api/quiz', { method: 'POST', body: JSON.stringify(body) }),
    setQuitDate: (quitDate) => request('/api/quiz/quit-date', { method: 'PATCH', body: JSON.stringify({ quitDate }) }),
    setSmokeFreeeSince: (smokeFreeSince) => request('/api/quiz/smoke-free-since', { method: 'PATCH', body: JSON.stringify({ smokeFreeSince }) }),
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
    // text vuoto/null = bootstrap saluto (non conta nel freemium).
    // trigger opzionale: 'sos' | 'welcome' | 'percorso' per saluto contestuale.
    // extra: payload aggiuntivo (es. { percorso: {day, optionLabel, feedback} })
    // per ponderare l'apertura sulla scelta fatta nel percorso.
    send: (text, trigger = null, extra = {}) => request('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ text: text || '', trigger, ...extra }),
    }),
    // Welcome flow: bolla AI dimostrativa. Non conta nel freemium, non salvata
    // in cronologia (backend skippa increment + ChatMessage.create).
    welcome: () => request('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ isWelcomeFlow: true }),
    }),
    history: () => request('/api/chat/history'),
    clear: () => request('/api/chat/history', { method: 'DELETE' }),
  },
  relapse: {
    log: () => request('/api/relapse', { method: 'POST' }),
    restart: () => request('/api/relapse/restart', { method: 'POST' }),
    useFreeze: () => request('/api/relapse/freeze', { method: 'POST' }),
    resetHistory: () => request('/api/relapse/history', { method: 'DELETE' }),
  },
  diary: {
    list: () => request('/api/diary'),
    save: (body) => request('/api/diary', { method: 'POST', body: JSON.stringify(body) }),
    logCigs: (date, cigarettes) => request('/api/diary/cigs', { method: 'PATCH', body: JSON.stringify({ date, cigarettes }) }),
  },
  notifications: {
    vapidKey: () => request('/api/notifications/vapid-key'),
    subscribe: (sub) => request('/api/notifications/subscribe', { method: 'POST', body: JSON.stringify(sub) }),
    unsubscribe: (endpoint) => request('/api/notifications/subscribe', { method: 'DELETE', body: JSON.stringify({ endpoint }) }),
    saveTimes: (times) => request('/api/notifications/times', { method: 'PUT', body: JSON.stringify({ times }) }),
    setEncouragement: (time) => request('/api/notifications/encouragement', { method: 'PUT', body: JSON.stringify({ time }) }),
    debug: () => request('/api/notifications/debug'),
    test: () => request('/api/notifications/test', { method: 'POST' }),
  },
  payments: {
    status: () => request('/api/payments/status'),
    checkout: (promoCode) => request('/api/payments/checkout', {
      method: 'POST',
      body: JSON.stringify({ promoCode: promoCode || '' }),
    }),
  },
  sos: {
    createSession: (body) => request('/api/sos/sessions', { method: 'POST', body: JSON.stringify(body) }),
    stats: () => request('/api/sos/stats'),
    getPhrases: ({ intensity = 'alta', count = 3, triggerContext = null } = {}) => {
      const qs = `intensity=${encodeURIComponent(intensity)}&count=${count}`
        + (triggerContext ? `&trigger_context=${encodeURIComponent(triggerContext)}` : '');
      return request(`/api/sos/phrases?${qs}`);
    },
  },
  user: {
    completeWelcomeFlow: () => request('/api/user/complete-welcome-flow', { method: 'POST' }),
  },
  admin: {
    listPromoCodes: () => request('/api/admin/promo-codes'),
    createPromoCode: (body) => request('/api/admin/promo-codes', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
    updatePromoCode: (id, body) => request(`/api/admin/promo-codes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
    deletePromoCode: (id) => request(`/api/admin/promo-codes/${id}`, {
      method: 'DELETE',
    }),
    analyticsSummary: (days = 30) => request(`/api/admin/analytics/summary?days=${days}`),
    analyticsLive: (limit = 50) => request(`/api/admin/analytics/live?limit=${limit}`),
    analyticsUsers: () => request('/api/admin/analytics/users'),
    analyticsUser: (id) => request(`/api/admin/analytics/user/${id}`),
  },
};
