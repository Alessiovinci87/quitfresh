// Tracker telemetria di prodotto.
// - accumula eventi in coda in-memory
// - flush ogni 20s, on visibilitychange (hidden), e on pagehide
// - mai PII: chiamare track('type', { ...meta }) senza email/testo

const BASE_URL = import.meta.env.PROD
  ? ''
  : (import.meta.env.VITE_API_URL || 'http://localhost:3001');

const QUEUE_KEY = 'qf_event_queue';
const FLUSH_INTERVAL_MS = 20000;
const MAX_QUEUE = 100;

let queue = [];
let timer = null;
let started = false;

function loadQueue() {
  try {
    const raw = sessionStorage.getItem(QUEUE_KEY);
    if (raw) queue = JSON.parse(raw) || [];
  } catch { queue = []; }
}

function persistQueue() {
  try {
    sessionStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch { /* sessionStorage piena → skip */ }
}

function getToken() {
  return localStorage.getItem('qf_token');
}

async function flush(useBeacon = false) {
  if (queue.length === 0) return;
  const events = queue.splice(0, queue.length);
  persistQueue();

  const body = JSON.stringify({ events });
  const url = `${BASE_URL}/api/events`;
  const token = getToken();

  // sendBeacon è più affidabile su unload, ma non supporta headers custom:
  // se non c'è token (utente non loggato) lo usiamo; con token usiamo fetch
  // keepalive che permette Authorization.
  if (useBeacon && navigator.sendBeacon && !token) {
    try {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon(url, blob);
      return;
    } catch { /* fallback fetch */ }
  }

  try {
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body,
      keepalive: useBeacon,
    });
  } catch {
    // Errore di rete: rimetti in coda solo se non siamo in pagehide
    if (!useBeacon) {
      queue.unshift(...events);
      if (queue.length > MAX_QUEUE) queue.length = MAX_QUEUE;
      persistQueue();
    }
  }
}

export function track(type, meta) {
  if (!type || typeof type !== 'string') return;
  const ev = {
    type,
    path: typeof window !== 'undefined' ? window.location.pathname : null,
    meta: meta && typeof meta === 'object' ? meta : undefined,
  };
  queue.push(ev);
  if (queue.length > MAX_QUEUE) queue.shift();
  persistQueue();
}

export function startTracker() {
  if (started || typeof window === 'undefined') return;
  started = true;
  loadQueue();

  timer = setInterval(() => { flush(false); }, FLUSH_INTERVAL_MS);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush(true);
  });
  window.addEventListener('pagehide', () => flush(true));

  // App open: registrato al primo avvio della sessione tracker.
  track('app_open', {
    referrer: document.referrer || null,
    lang: navigator.language || null,
  });
}

export function stopTracker() {
  if (timer) clearInterval(timer);
  timer = null;
  started = false;
}
