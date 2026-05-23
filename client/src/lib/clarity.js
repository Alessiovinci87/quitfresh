// Microsoft Clarity loader: caricato lato JS (non inline in index.html)
// cosi' possiamo decidere se inizializzarlo in base allo stato auth.
// - utenti admin (isAdmin=true) → NON tracciati
// - utenti normali / anonimi → tracciati
//
// idempotente: se chiamato due volte, il secondo no-op. Garantisce che
// re-render di AuthContext (login/logout) non duplichino lo script.

const CLARITY_PROJECT_ID = 'wv4d12j162';

let initialized = false;

export function initClarity() {
  if (initialized) return;
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  initialized = true;

  // Snippet ufficiale Microsoft Clarity (era inline in index.html).
  (function (c, l, a, r, i, t, y) {
    c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
    t = l.createElement(r); t.async = 1; t.src = 'https://www.clarity.ms/tag/' + i;
    y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
  })(window, document, 'clarity', 'script', CLARITY_PROJECT_ID);
}
