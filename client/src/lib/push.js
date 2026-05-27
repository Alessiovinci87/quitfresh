// Logica unica di attivazione/registrazione delle Web Push.
// Usata sia dal welcome-flow (attivazione post-onboarding) sia dal Profilo
// (Profilo → Notifiche). Tenere una sola fonte di verità evita derive tra i
// due punti d'ingresso.
import { api } from '../api/client';

// True se il device/browser supporta le push. Su iOS questo è false finché
// l'app non viene installata come PWA (PushManager assente in Safari).
export function pushSupported() {
  return 'Notification' in window
    && 'serviceWorker' in navigator
    && 'PushManager' in window;
}

// Permesso corrente: 'granted' | 'denied' | 'default' (o 'unsupported').
export function pushPermission() {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

// Registra (o riusa) la subscription push e la salva nel backend.
// Presuppone il permesso già concesso. Ritorna true se registrata.
export async function registerPushSubscription() {
  const { enabled, publicKey } = await api.notifications.vapidKey();
  if (!enabled || !publicKey) return false;
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }
  await api.notifications.subscribe({
    endpoint: sub.endpoint,
    keys: {
      p256dh: btoa(String.fromCharCode(...new Uint8Array(sub.getKey('p256dh')))),
      auth: btoa(String.fromCharCode(...new Uint8Array(sub.getKey('auth')))),
    },
  });
  return true;
}

// Flusso completo: chiede il permesso (deve partire da un gesto utente) e poi
// registra la subscription. Ritorna lo stato finale:
//   'granted' | 'denied' | 'default' | 'unsupported' | 'error'
export async function enablePush() {
  if (!pushSupported()) return 'unsupported';
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission; // 'denied' | 'default'
  try {
    await registerPushSubscription();
    return 'granted';
  } catch (err) {
    console.error('Push register error:', err);
    return 'error';
  }
}
