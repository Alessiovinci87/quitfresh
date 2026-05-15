import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from './App';
import './index.css';

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    tracesSampleRate: 0,
    environment: import.meta.env.MODE,
    beforeSend(event, hint) {
      const err = hint?.originalException;
      if (err?.status === 0) return null;
      const msg = typeof err?.message === 'string' ? err.message : '';
      if (/NetworkError|Failed to fetch|Load failed/i.test(msg)) return null;
      return event;
    },
  });
}

// ─── Service Worker + auto-update flow ──────────────────────────────
// Quando un deploy nuovo arriva, il SW si installa in waiting state.
// updatefound listener emette un custom event 'sw-update-ready' che il
// componente AppShell raccoglie per mostrare un banner "Aggiorna".
// L'utente clicca → window.applySwUpdate() → SKIP_WAITING al SW →
// activate + clients.claim → controllerchange → reload automatico.
//
// Senza questo flow, gli utenti restavano bloccati sulla versione
// cached del bundle finche' non rimuovevano e reinstallavano la PWA.
if ('serviceWorker' in navigator) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker.register(
      import.meta.env.BASE_URL + 'sw.js',
      { scope: import.meta.env.BASE_URL }
    ).then((reg) => {
      // Forza un check immediato al boot della PWA (iOS non sempre lo
      // fa automaticamente).
      reg.update().catch(() => {});

      // Listener: quando un nuovo SW si installa, notifica l'UI.
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // Nuovo SW pronto in waiting, vecchio ancora controller.
            window.dispatchEvent(new CustomEvent('sw-update-ready'));
          }
        });
      });

      // Se al boot c'e' gia' un SW in waiting (es. l'utente aveva
      // l'app aperta da prima e ha appena ricevuto un deploy), notifica.
      if (reg.waiting && navigator.serviceWorker.controller) {
        window.dispatchEvent(new CustomEvent('sw-update-ready'));
      }
    }).catch(() => {});
  });

  // Esposto globalmente per il banner React.
  window.applySwUpdate = () => {
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (reg?.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    });
  };
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
