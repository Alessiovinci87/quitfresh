import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

// SOS Craving — flow B+C+E (mini-task fisico + motivi personali + benefici live).
// Free-tier: nessuna chiamata AI, costa zero. Pensata come retention hook.

const ACTIONS = [
  {
    type: 'water',
    icon: '💧',
    title: 'Bevi un bicchiere d\'acqua',
    duration: 60,
    coach: [
      'Riempi un bicchiere fino in cima.',
      'Bevi lentamente, un sorso alla volta.',
      'Senti come si distende la gola.',
      'L\'acqua sta spegnendo la voglia, non la sigaretta.',
    ],
  },
  {
    type: 'teeth',
    icon: '🦷',
    title: 'Lava i denti',
    duration: 180,
    coach: [
      'Vai in bagno e prendi spazzolino e dentifricio.',
      'Spazzola con calma, due minuti pieni.',
      'Senti il sapore di menta in bocca.',
      'Una bocca pulita non ha voglia di fumo.',
    ],
  },
  {
    type: 'squats',
    icon: '🏃',
    title: '20 squat',
    duration: 120,
    coach: [
      'Mettiti in piedi, gambe larghezza spalle.',
      'Scendi e risali. Conta a voce alta.',
      'Respira: giù inspira, su espira.',
      'Il cuore batte forte: è energia, non craving.',
    ],
  },
  {
    type: 'walk',
    icon: '🚶',
    title: '100 passi',
    duration: 120,
    coach: [
      'Alzati e cammina, anche solo in casa.',
      'Conta i passi: 25, 50, 75…',
      'Cambia stanza, guarda fuori dalla finestra.',
      'Sei in movimento. La voglia sta passando.',
    ],
  },
  {
    type: 'gum',
    icon: '🍬',
    title: 'Chewing gum / caramella',
    duration: 180,
    coach: [
      'Prendi una gomma o una caramella forte.',
      'Mastica/sciogli lentamente.',
      'Concentrati sul sapore: menta, frutta, zenzero.',
      'La bocca è occupata. Il craving ha meno spazio.',
    ],
  },
];

function fmt(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function Sos() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1=before, 2=reasons, 3=choose, 4=timer, 5=after
  const [intensityBefore, setIntensityBefore] = useState(5);
  const [intensityAfter, setIntensityAfter] = useState(5);
  const [action, setAction] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedCounter, setSavedCounter] = useState(null);

  const cigsPerDay = user?.cigarettesPerDay || 0;
  const packPrice = user?.cigarettePackPrice || 5.80;
  const eurPerCig = packPrice / 20;
  const eurPerSec = (cigsPerDay * eurPerCig) / 86400;

  return (
    <div className="mobile-container bg-gradient-to-b from-cream-50 to-cream-100 px-6 py-8 animate-fade-in">
      <div className="max-w-mobile w-full mx-auto flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <Link
            to="/home"
            className="text-sage-700 text-sm font-medium flex items-center gap-1 active:scale-95 transition-transform"
            aria-label="Esci"
          >
            <span aria-hidden>←</span> Esci
          </Link>
          <span className="text-[10px] font-semibold text-sage-600/70 uppercase tracking-[0.2em]">SOS Craving</span>
          <span className="w-12" />
        </div>

        <div className="flex-1">
          {step === 1 && (
            <StepIntensity
              title="Quanto è forte adesso?"
              sub="Spostala dove senti il craving in questo momento."
              value={intensityBefore}
              onChange={setIntensityBefore}
              cta="Vai avanti"
              onCta={() => setStep(2)}
            />
          )}

          {step === 2 && (
            <StepReasons
              reasons={user?.quitReasons || []}
              onNext={() => setStep(3)}
            />
          )}

          {step === 3 && (
            <StepChoose
              onPick={(a) => { setAction(a); setStep(4); }}
            />
          )}

          {step === 4 && action && (
            <StepTimer
              action={action}
              eurPerSec={eurPerSec}
              onDone={() => setStep(5)}
            />
          )}

          {step === 5 && action && (
            <StepAfter
              before={intensityBefore}
              after={intensityAfter}
              onChangeAfter={setIntensityAfter}
              saving={saving}
              savedCounter={savedCounter}
              onSave={async () => {
                if (saving || savedCounter != null) return;
                setSaving(true);
                try {
                  const { cravingsBattled } = await api.sos.createSession({
                    intensityBefore,
                    intensityAfter,
                    type: action.type,
                  });
                  setSavedCounter(cravingsBattled);
                  updateUser({ cravingsBattled });
                } catch (err) {
                  console.error(err);
                  // fallback ottimistico: mostriamo comunque il delta
                  setSavedCounter((user?.cravingsBattled || 0) + 1);
                } finally {
                  setSaving(false);
                }
              }}
              onClose={() => navigate('/home', { replace: true })}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function StepIntensity({ title, sub, value, onChange, cta, onCta }) {
  return (
    <div className="flex flex-col h-full">
      <h2 className="font-display text-3xl font-semibold text-sage-900 leading-tight mb-2">{title}</h2>
      <p className="text-sage-700/80 text-sm mb-10 leading-relaxed">{sub}</p>

      <div className="bg-white rounded-2xl-soft border border-sage-100/60 shadow-soft p-8 mb-6">
        <div className="text-center mb-6">
          <div className="font-display text-7xl font-semibold text-sage-900 tabular-nums leading-none">
            {value}
          </div>
          <p className="text-[11px] uppercase tracking-wider text-sage-600/70 mt-1">su 10</p>
        </div>
        <input
          type="range"
          min="0"
          max="10"
          step="1"
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value, 10))}
          className="w-full accent-sage-600"
        />
        <div className="flex justify-between text-[11px] text-sage-600/60 mt-2">
          <span>Niente</span>
          <span>Fortissimo</span>
        </div>
      </div>

      <button
        onClick={onCta}
        className="w-full py-3.5 bg-gradient-to-br from-sage-500 to-sage-700 text-white rounded-xl-soft font-semibold text-sm shadow-sage active:scale-[0.98] transition-all"
      >
        {cta}
      </button>
    </div>
  );
}

function StepReasons({ reasons, onNext }) {
  const hasReasons = reasons && reasons.length > 0;
  return (
    <div className="flex flex-col h-full">
      <p className="text-[10px] font-semibold text-sage-600/70 uppercase tracking-[0.2em] mb-2">Ricordati perché</p>
      <h2 className="font-display text-3xl font-semibold text-sage-900 leading-tight mb-6">
        {hasReasons ? 'I motivi che hai scelto:' : 'Tu vali più di una sigaretta.'}
      </h2>

      {hasReasons ? (
        <div className="space-y-3 mb-8">
          {reasons.map((r, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl-soft border border-sage-100/60 shadow-soft px-5 py-4 flex items-center gap-3"
            >
              <span className="w-8 h-8 rounded-full bg-gradient-to-br from-sage-500 to-sage-700 text-white text-sm font-bold flex items-center justify-center shrink-0">
                {i + 1}
              </span>
              <span className="text-sage-900 font-medium leading-snug">{r}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-sage-50 border border-sage-100 rounded-2xl-soft px-5 py-4 text-sm text-sage-700/90 mb-8">
          Non hai ancora aggiunto i tuoi motivi. Potrai farlo dal profilo per averli pronti la prossima volta.
        </div>
      )}

      <button
        onClick={onNext}
        className="w-full py-3.5 bg-gradient-to-br from-sage-500 to-sage-700 text-white rounded-xl-soft font-semibold text-sm shadow-sage active:scale-[0.98] transition-all"
      >
        Sono pronto
      </button>
    </div>
  );
}

function StepChoose({ onPick }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-sage-600/70 uppercase tracking-[0.2em] mb-2">Scegli un'azione</p>
      <h2 className="font-display text-3xl font-semibold text-sage-900 leading-tight mb-2">Qualcosa per il corpo.</h2>
      <p className="text-sage-700/80 text-sm mb-6 leading-relaxed">Una piccola azione concreta che spezza il craving. Scegli quella che senti più giusta adesso.</p>

      <div className="space-y-2.5">
        {ACTIONS.map((a) => (
          <button
            key={a.type}
            onClick={() => onPick(a)}
            className="w-full bg-white rounded-2xl-soft border border-sage-100/60 shadow-soft px-4 py-4 flex items-center gap-4 hover:bg-sage-50/40 active:scale-[0.98] transition-all"
          >
            <div className="w-12 h-12 rounded-full bg-sage-50 flex items-center justify-center text-2xl shrink-0">
              {a.icon}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-semibold text-sage-900">{a.title}</p>
              <p className="text-[12px] text-sage-700/70">{Math.round(a.duration / 60) || 1} min</p>
            </div>
            <span className="text-sage-400 text-lg">→</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function StepTimer({ action, eurPerSec, onDone }) {
  const [remaining, setRemaining] = useState(action.duration);
  const elapsed = action.duration - remaining;

  useEffect(() => {
    if (remaining <= 0) return;
    const t = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(t);
  }, [remaining]);

  // Cycle coach line every duration/N seconds.
  const coachIdx = useMemo(() => {
    const step = Math.max(1, Math.floor(action.duration / action.coach.length));
    return Math.min(action.coach.length - 1, Math.floor(elapsed / step));
  }, [elapsed, action]);

  const eurNow = (eurPerSec * elapsed).toFixed(3);
  const progress = (elapsed / action.duration) * 100;

  return (
    <div className="flex flex-col h-full">
      <div className="text-center mb-6">
        <div className="w-20 h-20 rounded-full bg-sage-50 flex items-center justify-center text-4xl mx-auto mb-3">
          {action.icon}
        </div>
        <h2 className="font-display text-2xl font-semibold text-sage-900 leading-tight">{action.title}</h2>
      </div>

      <div className="bg-white rounded-2xl-soft border border-sage-100/60 shadow-soft p-6 mb-4">
        <div className="text-center mb-4">
          <div className="font-display text-6xl font-semibold text-sage-900 tabular-nums leading-none">
            {fmt(remaining)}
          </div>
        </div>
        <div className="w-full h-2 bg-sage-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-sage-500 to-sage-700 transition-[width] duration-1000"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-center text-sage-700/90 text-sm mt-4 leading-relaxed min-h-[2.5rem]">
          {action.coach[coachIdx]}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-gradient-to-br from-sage-50 to-sage-100/60 border border-sage-200/70 rounded-2xl-soft px-4 py-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-sage-700/70 font-semibold">Risparmi ora</p>
          <p className="font-display text-xl font-semibold text-sage-800 tabular-nums">+{eurNow} €</p>
        </div>
        <div className="bg-gradient-to-br from-sage-50 to-sage-100/60 border border-sage-200/70 rounded-2xl-soft px-4 py-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-sage-700/70 font-semibold">Ossigeno</p>
          <p className="font-display text-xl font-semibold text-sage-800">{remaining === 0 ? '↑↑' : '↑'}</p>
        </div>
      </div>

      <button
        onClick={onDone}
        disabled={remaining > 0}
        className="w-full py-3.5 bg-gradient-to-br from-sage-500 to-sage-700 text-white rounded-xl-soft font-semibold text-sm shadow-sage disabled:opacity-50 active:scale-[0.98] transition-all"
      >
        {remaining > 0 ? 'Tieni duro…' : 'Fatto'}
      </button>
      <button
        onClick={onDone}
        className="mt-2 text-xs text-sage-700/60 hover:text-sage-700"
      >
        Salta al risultato
      </button>
    </div>
  );
}

function StepAfter({ before, after, onChangeAfter, saving, savedCounter, onSave, onClose }) {
  const delta = before - after;
  const saved = savedCounter != null;

  if (saved) {
    return (
      <div className="flex flex-col h-full">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-sage-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">✓</span>
          </div>
          <h2 className="font-display text-3xl font-semibold text-sage-900 leading-tight mb-2">
            Craving battuto.
          </h2>
          <p className="text-sage-700/80 text-sm leading-relaxed">
            {delta > 0
              ? `Era ${before}, ora è ${after}. Ti sei tolto ${delta} punto${delta === 1 ? '' : 'i'} di intensità.`
              : delta === 0
                ? 'Resta su, può servire più tempo. Riprova fra qualche minuto.'
                : 'Ok, ora è più forte. Prova un\'altra azione, o respira lento per 1 minuto.'}
          </p>
        </div>

        <div className="bg-gradient-to-br from-sage-500 to-sage-700 rounded-2xl-soft shadow-sage text-white px-6 py-6 text-center mb-6">
          <p className="text-[11px] uppercase tracking-wider opacity-80 font-semibold mb-1">Craving battuti</p>
          <p className="font-display text-5xl font-semibold tabular-nums leading-none">{savedCounter}</p>
          <p className="text-[12px] opacity-80 mt-2">Ogni voglia superata è una vittoria.</p>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3.5 bg-gradient-to-br from-sage-500 to-sage-700 text-white rounded-xl-soft font-semibold text-sm shadow-sage active:scale-[0.98] transition-all"
        >
          Torna alla home
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <p className="text-[10px] font-semibold text-sage-600/70 uppercase tracking-[0.2em] mb-2">Come stai ora?</p>
      <h2 className="font-display text-3xl font-semibold text-sage-900 leading-tight mb-2">Quanto è forte adesso?</h2>
      <p className="text-sage-700/80 text-sm mb-8 leading-relaxed">
        Era <strong>{before}</strong>. Sposta lo slider sul valore attuale.
      </p>

      <div className="bg-white rounded-2xl-soft border border-sage-100/60 shadow-soft p-8 mb-6">
        <div className="text-center mb-6">
          <div className="font-display text-7xl font-semibold text-sage-900 tabular-nums leading-none">
            {after}
          </div>
          <p className="text-[11px] uppercase tracking-wider text-sage-600/70 mt-1">su 10</p>
        </div>
        <input
          type="range"
          min="0"
          max="10"
          step="1"
          value={after}
          onChange={(e) => onChangeAfter(parseInt(e.target.value, 10))}
          className="w-full accent-sage-600"
        />
        <div className="flex justify-between text-[11px] text-sage-600/60 mt-2">
          <span>Niente</span>
          <span>Fortissimo</span>
        </div>
      </div>

      <button
        onClick={onSave}
        disabled={saving}
        className="w-full py-3.5 bg-gradient-to-br from-sage-500 to-sage-700 text-white rounded-xl-soft font-semibold text-sm shadow-sage disabled:opacity-60 active:scale-[0.98] transition-all"
      >
        {saving ? 'Salvataggio…' : 'Vedi il risultato'}
      </button>
    </div>
  );
}
