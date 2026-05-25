import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { track } from '../lib/tracker';
import ScenePlayer from '../components/ScenePlayer';
import { TOTAL_DAYS, getCurrentDay, getChapter } from '../data/percorso';

// /percorso — NON è una pagina, è un momento.
// Flusso: scene a tap → micro-interazione (un piccolo momento di verità) → CTA
// d'uscita. La lista dei 7 giorni è ridotta a pallini faint: mai dominante.
export default function Percorso() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [phase, setPhase] = useState('scenes'); // 'scenes' | 'interaction'
  const day = getCurrentDay(user?.quitDate);
  const chapter = getChapter(day);

  useEffect(() => {
    track('percorso_opened', { day });
  }, [day]);

  // Scene finite: se c'è una micro-interazione la mostriamo, altrimenti chiudiamo.
  function handleScenesDone() {
    if (chapter?.interaction) {
      setPhase('interaction');
    } else {
      track('percorso_completed_day', { day, totalScenes: chapter?.scenes?.length || 0 });
      navigate('/home');
    }
  }

  function finishInteraction(next, option) {
    track('percorso_interaction_completed', { day, next });
    track('percorso_completed_day', { day, totalScenes: chapter?.scenes?.length || 0 });
    if (next === 'sos') {
      navigate('/sos');
    } else if (next === 'chat') {
      // Apertura chat ponderata: passiamo la scelta del giorno così l'AI
      // riprende il momento invece di aprire generico.
      navigate('/craving', {
        state: {
          trigger: 'percorso',
          percorso: { day, optionLabel: option?.label, feedback: option?.feedback },
        },
      });
    } else {
      navigate('/home');
    }
  }

  function handleSkip() {
    track('percorso_skipped', { day, phase });
    navigate('/home');
  }

  return (
    <div className="mobile-container relative bg-gradient-to-b from-cream-50 via-cream-50 to-sage-50 px-6 overflow-hidden">
      <div className="max-w-mobile w-full mx-auto flex-1 flex flex-col">
        {chapter?.scenes && phase === 'scenes' && (
          <ScenePlayer
            scenes={chapter.scenes}
            cta={chapter.cta}
            day={day}
            onComplete={handleScenesDone}
            onSkip={handleSkip}
          />
        )}

        {phase === 'interaction' && chapter?.interaction && (
          <InteractionScreen
            day={day}
            interaction={chapter.interaction}
            onSkip={handleSkip}
            onFinish={finishInteraction}
          />
        )}

        {!chapter?.scenes && (
          // Fallback estremo (capitolo senza scene): non blocchiamo l'utente.
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <p className="font-display text-2xl text-sage-900">Il momento di oggi arriva presto.</p>
            <button onClick={() => navigate('/home')} className="mt-6 text-sm text-sage-700/80 hover:text-sage-900">
              ← Torna alla home
            </button>
          </div>
        )}

        {/* I 7 giorni — secondario, faint. Solo indicatore, non navigabile. */}
        <div className="shrink-0 flex justify-center gap-1.5 pb-5" aria-label={`Giorno ${day} di ${TOTAL_DAYS}`}>
          {Array.from({ length: TOTAL_DAYS }, (_, idx) => {
            const d = idx + 1;
            return (
              <div
                key={d}
                className={`h-1 rounded-full transition-all ${
                  d === day ? 'w-5 bg-sage-400' : d < day ? 'w-1.5 bg-sage-300/70' : 'w-1.5 bg-sage-200/40'
                }`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Micro-interazione — un piccolo momento di verità, non un quiz ───────────
function InteractionScreen({ day, interaction, onSkip, onFinish }) {
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    track('percorso_interaction_viewed', { day });
  }, [day]);

  function choose(opt) {
    track('percorso_interaction_selected', { day, optionLabel: opt.label });
    setSelected(opt);
  }

  return (
    <div className="relative flex-1 flex flex-col">
      <div className="flex items-center justify-end pt-4">
        <button
          onClick={onSkip}
          className="text-[11px] text-sage-400/70 hover:text-sage-500 tracking-wide"
          aria-label="Salta"
        >
          Salta
        </button>
      </div>

      <p className="text-[10px] uppercase tracking-[0.3em] text-sage-500/70 font-semibold mt-4">
        Giorno {day}
      </p>

      {!selected ? (
        // Domanda + opzioni
        <div className="flex-1 flex flex-col justify-center">
          <h2 className="font-display text-[26px] leading-snug text-sage-900 mb-7 animate-slide-up">
            {interaction.question}
          </h2>
          <div className="space-y-2.5">
            {interaction.options.map((opt) => (
              <button
                key={opt.label}
                onClick={() => choose(opt)}
                className="w-full text-left px-5 py-4 bg-white border border-sage-100/70 rounded-xl-soft text-sage-900 shadow-soft active:scale-[0.99] hover:border-sage-300 transition-all"
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        // Feedback + uscite
        <div className="flex-1 flex flex-col justify-center">
          <p className="font-display text-[24px] leading-relaxed text-sage-900 animate-slide-up">
            {selected.feedback}
          </p>
          <div className="mt-10 space-y-2.5">
            <button
              onClick={() => onFinish('home', selected)}
              className="w-full py-3.5 bg-gradient-to-br from-sage-500 to-sage-700 text-white rounded-xl-soft font-semibold text-sm shadow-sage active:scale-[0.98] transition-all"
            >
              Torno alla home
            </button>
            <div className="flex gap-2.5">
              <button
                onClick={() => onFinish('sos', selected)}
                className="flex-1 py-3 bg-white border border-sage-200 text-sage-800 rounded-xl-soft font-medium text-sm active:scale-[0.98] transition-all"
              >
                Apri SOS
              </button>
              <button
                onClick={() => onFinish('chat', selected)}
                className="flex-1 py-3 bg-white border border-sage-200 text-sage-800 rounded-xl-soft font-medium text-sm active:scale-[0.98] transition-all"
              >
                Parlane in chat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
