import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { track } from '../lib/tracker';
import { CHAPTERS, TOTAL_DAYS, getCurrentDay, getChapter } from '../data/percorso';

// PLACEHOLDER — non è la UI finale. Mostra i 4 campi strutturali del capitolo
// di oggi + l'elenco dei 7 giorni con stato locked/unlocked, per validare la
// meccanica (derivazione currentDay, sblocco temporale). Il design e il copy
// definitivi arrivano dopo l'allineamento della mappa.
export default function Percorso() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const currentDay = getCurrentDay(user?.quitDate);
  const today = getChapter(currentDay);

  useEffect(() => {
    track('percorso_opened', { currentDay });
  }, [currentDay]);

  return (
    <div className="mobile-container bg-gradient-to-b from-cream-50 to-cream-100 px-6 py-8 animate-fade-in">
      <div className="max-w-mobile w-full mx-auto">
        <p className="text-[10px] uppercase tracking-[0.2em] text-sage-600/70 font-semibold">
          Percorso · placeholder
        </p>
        <h1 className="font-display text-2xl font-semibold text-sage-900 mt-1 mb-6">
          Giorno {currentDay} di {TOTAL_DAYS}
        </h1>

        {today && (
          <div className="bg-white rounded-2xl-soft border border-sage-100/60 shadow-soft p-6 mb-8">
            {today.body ? (
              // Copy definitivo (micro). Ogni frase respira su una riga propria.
              <div className="space-y-3">
                {today.body.map((line, i) => (
                  <p key={i} className="font-display text-lg text-sage-900 leading-snug">{line}</p>
                ))}
              </div>
            ) : (
              // Fallback: capitolo senza copy ancora scritto → campi strutturali.
              <div className="space-y-4">
                <Field label="Illusione" value={today.illusione} />
                <Field label="Nuova percezione" value={today.nuovaPercezione} />
                <Field label="Osservazione reale" value={today.osservazione} />
                <Field label="Stato mentale finale" value={today.statoFinale} />
              </div>
            )}
          </div>
        )}

        <p className="text-[10px] uppercase tracking-[0.2em] text-sage-600/70 font-semibold mb-2">
          I 7 giorni
        </p>
        <ul className="space-y-1.5">
          {CHAPTERS.map((c) => {
            const unlocked = c.day <= currentDay;
            const isToday = c.day === currentDay;
            return (
              <li
                key={c.day}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl-soft border text-sm ${
                  isToday
                    ? 'border-sage-400 bg-sage-50 text-sage-900 font-medium'
                    : unlocked
                    ? 'border-sage-100 bg-white text-sage-800'
                    : 'border-sage-100/50 bg-white/50 text-sage-400'
                }`}
              >
                <span className="tabular-nums w-6">{c.day}</span>
                <span className="flex-1 truncate">{unlocked ? c.illusione : '— bloccato —'}</span>
                {!unlocked && <span className="text-xs">🔒</span>}
              </li>
            );
          })}
        </ul>

        <button
          onClick={() => navigate('/home')}
          className="mt-8 w-full py-3 text-sm text-sage-700/80 hover:text-sage-900"
        >
          ← Torna alla home
        </button>
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.15em] text-sage-500 font-semibold mb-0.5">{label}</p>
      <p className="text-sage-900 leading-snug">{value}</p>
    </div>
  );
}
