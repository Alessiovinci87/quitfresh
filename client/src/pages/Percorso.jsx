import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { track } from '../lib/tracker';
import ScenePlayer from '../components/ScenePlayer';
import { TOTAL_DAYS, getCurrentDay, getChapter } from '../data/percorso';

// /percorso — NON è una pagina, è un momento.
// Player a tap di micro-scene a tutto schermo (no Layout/nav). La lista dei 7
// giorni è ridotta a pallini faint in fondo: presente ma mai dominante.
export default function Percorso() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const day = getCurrentDay(user?.quitDate);
  const chapter = getChapter(day);

  useEffect(() => {
    track('percorso_opened', { day });
  }, [day]);

  function handleComplete() {
    track('percorso_completed_day', { day, totalScenes: chapter?.scenes?.length || 0 });
    navigate('/home');
  }

  function handleSkip() {
    track('percorso_skipped', { day });
    navigate('/home');
  }

  return (
    <div className="mobile-container relative bg-gradient-to-b from-cream-50 via-cream-50 to-sage-50 px-6 overflow-hidden">
      <div className="max-w-mobile w-full mx-auto flex-1 flex flex-col">
        {chapter?.scenes ? (
          <ScenePlayer
            scenes={chapter.scenes}
            cta={chapter.cta}
            day={day}
            onComplete={handleComplete}
            onSkip={handleSkip}
          />
        ) : (
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
