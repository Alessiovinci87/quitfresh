import { useEffect, useRef } from 'react';
import { track } from '../lib/tracker';

// SilenzioPlayer — un pensiero, nessun CTA, nessun tap. Dopo 6 secondi chiama
// onComplete() da solo. Nessuna barra di progresso. onSkip resta disponibile:
// l'utente non è mai bloccato.
//
// Stesso contratto di ScenePlayer: { scenes, cta, day, onComplete, onSkip }
// (cta non è usato qui). `formato` opzionale, solo per analytics.
export default function SilenzioPlayer({ scenes, day, onComplete, onSkip, formato = 'silenzio' }) {
  const text = scenes?.[0]?.text ?? '';
  // Ref per evitare che un nuovo identity di onComplete resetti il timer.
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    track('percorso_scene_viewed', { day, sceneIndex: 0, totalScenes: 1, formato });
    const t = setTimeout(() => onCompleteRef.current?.(), 6000);
    return () => clearTimeout(t);
  }, [day, formato]);

  return (
    <div className="relative flex-1 flex flex-col">
      {/* Solo Salta — nessuna barra di progresso, nessun CTA */}
      <div className="flex items-center justify-end pt-4">
        <button
          onClick={onSkip}
          className="text-[11px] text-sage-400/70 hover:text-sage-500 tracking-wide shrink-0"
          aria-label="Salta"
        >
          Salta
        </button>
      </div>

      {/* Pensiero centrale — stesso stile di FraseSingolaPlayer */}
      <div className="flex-1 flex flex-col items-center justify-center text-center px-2">
        <p className="font-display text-[34px] leading-snug text-sage-900 max-w-[20rem] animate-slide-up">
          {text}
        </p>
      </div>

      {/* Spazio sotto, simmetrico agli altri player (niente CTA) */}
      <div className="pb-8 min-h-[68px]" />
    </div>
  );
}
