const webpush = require('web-push');

let initialized = false;

function init() {
  if (initialized) return;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const email = process.env.VAPID_EMAIL || 'mailto:admin@quitfresh.app';

  if (!pub || !priv) {
    console.warn('[push] VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY non impostati — notifiche push disabilitate');
    return;
  }

  try {
    webpush.setVapidDetails(email, pub, priv);
    initialized = true;
  } catch (err) {
    console.warn('[push] Chiave VAPID non valida — notifiche push disabilitate:', err.message);
  }
}

function isEnabled() {
  return !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

async function sendPush(subscription, payload) {
  if (!initialized) return;
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
  } catch (err) {
    if (err.statusCode === 410 || err.statusCode === 404) {
      return 'expired';
    }
    console.error('[push] errore invio:', err.message);
  }
}

module.exports = { init, isEnabled, sendPush };
