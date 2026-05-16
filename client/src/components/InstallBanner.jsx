import { useEffect, useState } from 'react';

const STORAGE_KEY = 'qf_install_banner_dismissed_at';
const DISMISS_DAYS = 7;
const SHOW_AFTER_MS = 30 * 1000;

// Detection iOS Safari non-PWA:
//  - UA include iPhone/iPad/iPod
//  - escluse altre webview iOS (Chrome=CriOS, Firefox=FxiOS, Opera=OPiOS,
//    Edge=EdgiOS, Yandex=YaBrowser); FBIOS/Instagram in-app webview pure
//    escluse perché non possono installare PWA
//  - non già in standalone mode (PWA installata o aggiunta a home)
function isIosSafariCandidate() {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  if (!isIOS) return false;
  const isOtherIosBrowser = /CriOS|FxiOS|OPiOS|EdgiOS|YaBrowser|FBIOS|Instagram/i.test(ua);
  if (isOtherIosBrowser) return false;
  const isStandalone = window.matchMedia?.('(display-mode: standalone)').matches
    || window.navigator.standalone === true;
  if (isStandalone) return false;
  return true;
}

function isRecentlyDismissed() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const ts = parseInt(raw, 10);
    if (!Number.isFinite(ts)) return false;
    return Date.now() - ts < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

export default function InstallBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isIosSafariCandidate()) return;
    if (isRecentlyDismissed()) return;

    const id = setTimeout(() => setVisible(true), SHOW_AFTER_MS);
    return () => clearTimeout(id);
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {}
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Installa QuitFresh sulla home"
      className="fixed inset-x-0 bottom-0 z-[9998] px-3 pb-[max(env(safe-area-inset-bottom),12px)] pt-2 animate-slide-up"
    >
      <div className="max-w-mobile mx-auto bg-white rounded-2xl-soft shadow-soft border border-sage-100 overflow-hidden">
        <div className="flex items-start gap-3 p-4">
          <img
            src="/icon-192.png"
            alt=""
            width="48"
            height="48"
            className="w-12 h-12 rounded-xl shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-sage-900 leading-tight">
              Installa QuitFresh
            </p>
            <p className="text-[12px] text-sage-700/80 leading-snug mt-0.5">
              Aggiungila alla home per averla sempre a portata di mano e ricevere
              le notifiche.
            </p>
          </div>
          <button
            onClick={dismiss}
            aria-label="Chiudi"
            className="w-7 h-7 -mt-1 -mr-1 rounded-full text-sage-500/70 hover:text-sage-700 hover:bg-sage-50 flex items-center justify-center transition-colors shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M6 18L18 6" />
            </svg>
          </button>
        </div>
        <div className="bg-sage-50 border-t border-sage-100 px-4 py-3">
          <div className="flex items-center gap-2 text-[12px] text-sage-700/90 leading-snug">
            <span>Tocca</span>
            <svg className="w-4 h-4 text-sage-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0-12l-4 4m4-4l4 4M5 20h14" />
            </svg>
            <span>in basso, poi</span>
            <span className="font-semibold text-sage-900">"Aggiungi a Home"</span>
          </div>
        </div>
      </div>
    </div>
  );
}
