import { useEffect } from 'react';

/**
 * SubPage — full-screen overlay che slide-in da destra.
 * Pattern iOS-native per "drill down" dentro una pagina senza cambiare route.
 * - Header sticky con tasto Indietro (chevron ‹) a sinistra
 * - eyebrow opzionale (uppercase tracking) + title in Fraunces
 * - Body scroll lock mentre aperto
 *
 * Usage:
 *   {open && <SubPage title="Calendario" onClose={() => setOpen(false)}>...</SubPage>}
 */
export default function SubPage({ eyebrow, title, onClose, children, padded = true }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 bg-cream-50 overflow-y-auto"
      style={{ animation: 'qfSlideInRight 280ms cubic-bezier(0.16, 1, 0.3, 1)' }}
    >
      <style>{`
        @keyframes qfSlideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>

      <div className="max-w-mobile mx-auto min-h-full bg-cream-50">
        <header className="sticky top-0 z-10 px-6 pt-6 pb-3 bg-cream-50/85 backdrop-blur-xl border-b border-sage-100/30 flex items-center gap-3">
          <button
            onClick={onClose}
            className="w-9 h-9 -ml-1 rounded-full flex items-center justify-center text-sage-700 hover:bg-sage-100/60 transition-colors active:scale-95 shrink-0"
            aria-label="Indietro"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="min-w-0 flex-1">
            {eyebrow && (
              <p className="text-[10px] uppercase tracking-[0.2em] text-sage-600/70 font-semibold">{eyebrow}</p>
            )}
            <h1 className="font-display text-2xl font-semibold text-sage-900 leading-tight truncate">{title}</h1>
          </div>
        </header>

        <div className={padded ? 'px-6 py-5 pb-16' : 'pb-16'}>
          {children}
        </div>
      </div>
    </div>
  );
}
