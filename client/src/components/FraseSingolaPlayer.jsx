import { useEffect, useState } from 'react';
import { track } from '../lib/tracker';

// FraseSingolaPlayer — un solo pensiero, molto spazio, niente tap.
// Mostra scenes[0].text centrato; nessuna barra di progresso. Il CTA appare
// in fade-in lento dopo 3 secondi; al click chiama onComplete().
//
// Stesso contratto di ScenePlayer: { scenes, cta, day, onComplete, onSkip }.
// `formato` è opzionale e serve SOLO a etichettare l'evento analytics
// percorso_scene_viewed (default: 'frase_singola').
export default function FraseSingolaPlayer({ scenes, cta, day, onComplete, onSkip, formato = 'frase_singola' }) {
  const text = scenes?.[0]?.text ?? '';
  const [showCta, setShowCta] = useState(false);

  useEffect(() => {
    track('percorso_scene_viewed', { day, sceneIndex: 0, totalScenes: 1, formato });
    const t = setTimeout(() => setShowCta(true), 3000);
    return () => clearTimeout(t);
  }, [day, formato]);

  return (
    <div className="relative flex-1 flex flex-col">
      {/* Solo Salta — nessuna barra di progresso */}
      <div className="flex items-center justify-end pt-4">
        <button
          onClick={onSkip}
          className="text-[11px] text-sage-400/70 hover:text-sage-500 tracking-wide shrink-0"
          aria-label="Salta"
        >
          Salta
        </button>
      </div>

      {/* Pensiero centrale — font grande, molto spazio bianco */}
      <div className="flex-1 flex flex-col items-center justify-center text-center px-2">
        <p className="font-display text-[34px] leading-snug text-sage-900 max-w-[20rem] animate-slide-up">
          {text}
        </p>
      </div>

      {/* CTA: fade-in lento dopo 3s, non cliccabile finché nascosto */}
      <div className="pb-8 min-h-[68px] flex flex-col items-center justify-end">
        <button
          onClick={onComplete}
          className={`w-full py-3.5 bg-gradient-to-br from-sage-500 to-sage-700 text-white rounded-xl-soft font-semibold text-sm shadow-sage active:scale-[0.98] transition-opacity duration-700 ${
            showCta ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          {cta}
        </button>
      </div>
    </div>
  );
}
