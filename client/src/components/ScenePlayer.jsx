import { useEffect, useState } from 'react';
import { track } from '../lib/tracker';

// ScenePlayer — riproduttore di micro-scene a tap.
// Una scena alla volta, tap per avanzare, barra progresso minimale, CTA finale.
// Niente gamification: solo ritmo, silenzio, spazio. Riusa il pattern del
// WelcomeFlow ma generalizzato sul contenuto del percorso.
//
// Props:
//   scenes: [{ type: 'title'|'thought'|'break'|'notice', text }]
//   cta: etichetta del bottone sull'ultima scena
//   day: numero giorno (per analytics)
//   onComplete(), onSkip()
//   formato: opzionale, solo per etichettare l'evento analytics
export default function ScenePlayer({ scenes, cta, day, onComplete, onSkip, formato = 'player_sequenziale' }) {
  const [i, setI] = useState(0);
  const total = scenes.length;
  const isLast = i >= total - 1;
  const scene = scenes[i];

  // Analytics: ogni scena vista (incluso sceneIndex/totalScenes/formato).
  useEffect(() => {
    track('percorso_scene_viewed', { day, sceneIndex: i, totalScenes: total, formato });
  }, [i, day, total, formato]);

  const next = () => { if (!isLast) setI((n) => n + 1); };

  return (
    <div className="relative flex-1 flex flex-col">
      {/* Progresso scene + Salta */}
      <div className="flex items-center gap-3 pt-4">
        <div className="flex-1 flex gap-1">
          {scenes.map((_, idx) => (
            <div
              key={idx}
              className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                idx <= i ? 'bg-sage-500' : 'bg-sage-200/60'
              }`}
            />
          ))}
        </div>
        <button
          onClick={onSkip}
          className="text-[11px] text-sage-400/70 hover:text-sage-500 tracking-wide shrink-0"
          aria-label="Salta"
        >
          Salta
        </button>
      </div>

      <p className="text-[10px] uppercase tracking-[0.3em] text-sage-500/70 font-semibold mt-4">
        Giorno {day}
      </p>

      {/* Scena centrale — tap per avanzare (tranne sull'ultima) */}
      <div
        onClick={next}
        role={!isLast ? 'button' : undefined}
        aria-label={!isLast ? 'Continua' : undefined}
        className={`flex-1 flex flex-col items-center justify-center text-center select-none ${
          !isLast ? 'cursor-pointer active:opacity-90' : ''
        } transition-opacity`}
      >
        <Scene key={i} scene={scene} />
      </div>

      {/* Footer: CTA sull'ultima scena, altrimenti hint discreto */}
      <div className="pb-8 min-h-[68px] flex flex-col items-center justify-end">
        {isLast ? (
          <button
            onClick={onComplete}
            className="w-full py-3.5 bg-gradient-to-br from-sage-500 to-sage-700 text-white rounded-xl-soft font-semibold text-sm shadow-sage active:scale-[0.98] transition-all animate-fade-in"
          >
            {cta}
          </button>
        ) : (
          <p className="text-[11px] text-sage-400/60 animate-fade-in">tocca per continuare</p>
        )}
      </div>
    </div>
  );
}

function Scene({ scene }) {
  if (scene.type === 'notice') {
    return (
      <div className="animate-slide-up max-w-[20rem]">
        <p className="text-[10px] uppercase tracking-[0.3em] text-sage-500 font-semibold mb-4">
          Da notare oggi
        </p>
        <p className="font-display text-[26px] leading-snug text-sage-900">{scene.text}</p>
      </div>
    );
  }

  const cls =
    scene.type === 'title'
      ? 'font-display text-[32px] leading-tight text-sage-900'
      : scene.type === 'break'
      ? 'font-display text-[30px] leading-tight text-sage-900'
      : 'font-display text-[25px] leading-relaxed text-sage-800';

  return <p className={`animate-slide-up max-w-[20rem] ${cls}`}>{scene.text}</p>;
}
