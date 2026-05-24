import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { track } from '../lib/tracker';

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
  {
    type: 'cold',
    icon: '🧊',
    title: 'Acqua fredda sul viso',
    duration: 60,
    coach: [
      'Vai al lavandino, apri l\'acqua fredda.',
      'Bagna le mani e portale al viso.',
      'Senti il freddo svegliare la pelle.',
      'Il craving è solo una sensazione: questa è più forte.',
    ],
  },
  {
    type: 'breath',
    icon: '🌬️',
    title: 'Respiro profondo (4-7-8)',
    duration: 120,
    coach: [
      'Inspira dal naso per 4 secondi.',
      'Trattieni il respiro per 7 secondi.',
      'Espira dalla bocca per 8 secondi.',
      'Ripeti. Ogni ciclo è un mattone tra te e la sigaretta.',
    ],
  },
  {
    type: 'call',
    icon: '📞',
    title: 'Chiama o scrivi a qualcuno',
    duration: 180,
    coach: [
      'Apri i contatti. Scegli una persona che ti vuole bene.',
      'Mandagli un messaggio anche solo per salutare.',
      'Distrai la mente con una conversazione vera.',
      'Non sei solo in questo. Mai.',
    ],
  },
  {
    type: 'snack',
    icon: '🍎',
    title: 'Mangia qualcosa di sano',
    duration: 180,
    coach: [
      'Mela, carota, mandorle, frutta secca: scegli tu.',
      'Mastica lentamente. Senti il sapore vero.',
      'Stai dando al corpo qualcosa di buono, non di tossico.',
      'Ogni morso è una piccola scelta giusta.',
    ],
  },
];

const CUSTOM_COACH = [
  'Stai facendo qualcosa di buono. Continua.',
  'Il craving è solo un\'onda. Sta scendendo.',
  'Tu sei più forte di questa voglia.',
  'Manca poco. Non mollare adesso.',
];

const CUSTOM_KEY = 'qf_sos_custom_action';

function loadCustomAction() {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.title || !parsed?.duration) return null;
    return {
      type: 'custom',
      icon: '⭐',
      title: String(parsed.title).slice(0, 60),
      duration: Math.max(30, Math.min(600, parseInt(parsed.duration, 10) || 120)),
      coach: CUSTOM_COACH,
    };
  } catch {
    return null;
  }
}

function saveCustomAction({ title, duration }) {
  try {
    localStorage.setItem(CUSTOM_KEY, JSON.stringify({ title, duration }));
  } catch {}
}

function clearCustomAction() {
  try { localStorage.removeItem(CUSTOM_KEY); } catch {}
}

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

  useEffect(() => { track('sos_started'); }, []);

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
              onCta={() => setStep(1.5)}
            />
          )}

          {step === 1.5 && (
            <StepCognitiveCarousel
              intensity={intensityBefore >= 8 ? 'emergenza' : intensityBefore >= 6 ? 'alta' : intensityBefore >= 3 ? 'media' : 'bassa'}
              onOverpowered={() => {
                setAction({
                  type: 'cognitive',
                  icon: '🧠',
                  title: 'Frasi che fermano il craving',
                  duration: 180,
                  coach: [],
                });
                setStep(5);
              }}
              onWantAction={() => setStep(2)}
              onTalkToCoach={() => navigate('/craving', { state: { trigger: 'sos' } })}
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
              onEditCustom={() => setStep(3.5)}
            />
          )}

          {step === 3.5 && (
            <StepEditCustom
              initial={loadCustomAction()}
              onCancel={() => setStep(3)}
              onSave={(payload) => {
                if (payload === null) {
                  clearCustomAction();
                } else {
                  saveCustomAction(payload);
                }
                setStep(3);
              }}
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
                  track('sos_completed', {
                    type: action.type,
                    intensityBefore,
                    intensityAfter,
                    delta: intensityBefore - intensityAfter,
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
              onTalkToCoach={() => navigate('/craving', { state: { trigger: 'sos' } })}
            />
          )}
        </div>
      </div>
    </div>
  );
}

const CAROUSEL_AUTO_MS = 60_000;

function StepCognitiveCarousel({ intensity, onOverpowered, onWantAction, onTalkToCoach }) {
  const [phrases, setPhrases] = useState(null);
  const [idx, setIdx] = useState(0);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.sos.getPhrases({ intensity, count: 3 })
      .then((res) => { if (!cancelled) setPhrases(res.phrases || []); })
      .catch(() => { if (!cancelled) setError(true); });
    track('sos_carousel_started', { intensity });
    return () => { cancelled = true; };
  }, [intensity]);

  useEffect(() => {
    if (!phrases || phrases.length === 0) return;
    if (idx >= phrases.length - 1) return;
    const t = setTimeout(() => setIdx((i) => i + 1), CAROUSEL_AUTO_MS);
    return () => clearTimeout(t);
  }, [phrases, idx]);

  const next = () => {
    if (!phrases) return;
    setIdx((i) => Math.min(phrases.length - 1, i + 1));
  };

  if (error) {
    return (
      <div className="flex flex-col h-full">
        <h2 className="font-display text-2xl font-semibold text-sage-900 mb-4">Connessione assente.</h2>
        <p className="text-sage-700/80 text-sm mb-6">Vai avanti con un'azione fisica, può bastare.</p>
        <button
          onClick={onWantAction}
          className="w-full py-3.5 bg-gradient-to-br from-sage-500 to-sage-700 text-white rounded-xl-soft font-semibold text-sm shadow-sage active:scale-[0.98] transition-all"
        >
          Scegli un'azione
        </button>
      </div>
    );
  }

  if (!phrases) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-sage-700/60 text-sm">
        <div className="w-8 h-8 rounded-full border-2 border-sage-300 border-t-sage-700 animate-spin mb-3" />
        Un momento.
      </div>
    );
  }

  if (phrases.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <p className="text-sage-700/80 text-sm mb-6">Vai avanti con un'azione fisica.</p>
        <button
          onClick={onWantAction}
          className="w-full py-3.5 bg-gradient-to-br from-sage-500 to-sage-700 text-white rounded-xl-soft font-semibold text-sm shadow-sage active:scale-[0.98] transition-all"
        >
          Scegli un'azione
        </button>
      </div>
    );
  }

  const isLast = idx >= phrases.length - 1;
  const phrase = phrases[idx];

  return (
    <div className="flex flex-col h-full">
      <p className="text-[10px] font-semibold text-sage-600/70 uppercase tracking-[0.2em] mb-2">Respira con queste parole</p>

      <div
        onClick={!isLast ? next : undefined}
        className={`flex-1 bg-white rounded-2xl-soft border border-sage-100/60 shadow-soft p-8 mb-4 flex flex-col justify-center min-h-[280px] ${!isLast ? 'cursor-pointer active:scale-[0.99]' : ''} transition-transform`}
        role={!isLast ? 'button' : undefined}
        aria-label={!isLast ? 'Vai alla prossima frase' : undefined}
      >
        <p className="font-display text-2xl text-sage-900 leading-snug text-center animate-fade-in" key={idx}>
          {phrase.text}
        </p>
      </div>

      <div className="flex justify-center gap-2 mb-6" aria-label="Progresso">
        {phrases.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all ${
              i === idx ? 'w-8 bg-sage-700' : i < idx ? 'w-3 bg-sage-400' : 'w-3 bg-sage-200'
            }`}
          />
        ))}
      </div>

      {!isLast ? (
        <button
          onClick={next}
          className="w-full py-3 text-sm text-sage-700/80 hover:text-sage-900"
        >
          Avanti →
        </button>
      ) : (
        <div className="space-y-2">
          <button
            onClick={onOverpowered}
            className="w-full py-3.5 bg-gradient-to-br from-sage-500 to-sage-700 text-white rounded-xl-soft font-semibold text-sm shadow-sage active:scale-[0.98] transition-all"
          >
            Ho superato il momento
          </button>
          <button
            onClick={onWantAction}
            className="w-full py-3 bg-white border border-sage-200 text-sage-800 rounded-xl-soft font-medium text-sm active:scale-[0.98] transition-all"
          >
            Voglio fare anche un'azione
          </button>
          <button
            onClick={onTalkToCoach}
            className="w-full py-2.5 text-sm text-sage-700/70 hover:text-sage-900"
          >
            Mi serve parlare
          </button>
        </div>
      )}
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

function StepChoose({ onPick, onEditCustom }) {
  const custom = loadCustomAction();
  const list = custom ? [custom, ...ACTIONS] : ACTIONS;

  return (
    <div>
      <p className="text-[10px] font-semibold text-sage-600/70 uppercase tracking-[0.2em] mb-2">Scegli un'azione</p>
      <h2 className="font-display text-3xl font-semibold text-sage-900 leading-tight mb-2">Qualcosa per il corpo.</h2>
      <p className="text-sage-700/80 text-sm mb-6 leading-relaxed">Una piccola azione concreta che spezza il craving. Scegli quella che senti più giusta adesso.</p>

      <div className="space-y-2.5">
        {list.map((a) => (
          <button
            key={a.type}
            onClick={() => onPick(a)}
            className={`w-full rounded-2xl-soft border shadow-soft px-4 py-4 flex items-center gap-4 active:scale-[0.98] transition-all ${
              a.type === 'custom'
                ? 'bg-gradient-to-br from-sage-50 to-sage-100/60 border-sage-200/70 hover:from-sage-100'
                : 'bg-white border-sage-100/60 hover:bg-sage-50/40'
            }`}
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl shrink-0 ${
              a.type === 'custom' ? 'bg-white shadow-soft' : 'bg-sage-50'
            }`}>
              {a.icon}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-semibold text-sage-900 truncate">{a.title}</p>
              <p className="text-[12px] text-sage-700/70">
                {Math.round(a.duration / 60) || 1} min
                {a.type === 'custom' ? ' · la tua azione' : ''}
              </p>
            </div>
            <span className="text-sage-400 text-lg">→</span>
          </button>
        ))}

        <button
          onClick={onEditCustom}
          className="w-full rounded-2xl-soft border border-dashed border-sage-300 px-4 py-3 flex items-center gap-3 text-sage-700 hover:bg-sage-50/60 active:scale-[0.98] transition-all"
        >
          <div className="w-9 h-9 rounded-full bg-sage-50 flex items-center justify-center text-lg shrink-0">
            {custom ? '✏️' : '+'}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-medium">{custom ? 'Modifica la tua azione personale' : 'Aggiungi un\'azione personale'}</p>
            <p className="text-[11px] text-sage-600/70">{custom ? 'Cambia titolo o durata' : 'Sai già cosa ti aiuta? Inseriscilo.'}</p>
          </div>
        </button>
      </div>
    </div>
  );
}

function StepEditCustom({ initial, onCancel, onSave }) {
  const [title, setTitle] = useState(initial?.title || '');
  const [minutes, setMinutes] = useState(initial ? Math.round(initial.duration / 60) : 2);

  const canSave = title.trim().length >= 2 && minutes >= 1 && minutes <= 10;

  return (
    <div className="flex flex-col h-full">
      <p className="text-[10px] font-semibold text-sage-600/70 uppercase tracking-[0.2em] mb-2">La tua azione</p>
      <h2 className="font-display text-3xl font-semibold text-sage-900 leading-tight mb-2">Cosa ti aiuta?</h2>
      <p className="text-sage-700/80 text-sm mb-6 leading-relaxed">Scrivi un'azione che sai già funzionare per te. La ritroverai in cima alla lista la prossima volta.</p>

      <div className="bg-white rounded-2xl-soft border border-sage-100/60 shadow-soft p-5 space-y-4 mb-6">
        <div>
          <label className="block text-xs font-semibold text-sage-700/80 uppercase tracking-wider mb-2">
            Cosa fai
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={60}
            placeholder="Es. Suono la chitarra, doccia fredda…"
            className="w-full px-4 py-3 border border-sage-200 rounded-xl-soft text-sm focus:outline-none focus:ring-2 focus:ring-sage-400 bg-white"
          />
          <p className="text-[11px] text-sage-600/60 mt-1">{title.length}/60</p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-sage-700/80 uppercase tracking-wider mb-2">
            Quanti minuti
          </label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMinutes(m => Math.max(1, m - 1))}
              className="w-10 h-10 rounded-full border border-sage-200 text-lg text-sage-700 flex items-center justify-center hover:bg-sage-50 active:scale-95 transition-all"
              aria-label="Diminuisci"
            >
              −
            </button>
            <div className="flex-1 text-center font-display text-3xl font-semibold text-sage-900 tabular-nums">
              {minutes}
            </div>
            <button
              onClick={() => setMinutes(m => Math.min(10, m + 1))}
              className="w-10 h-10 rounded-full bg-gradient-to-br from-sage-500 to-sage-700 text-lg text-white flex items-center justify-center shadow-sage active:scale-95 transition-all"
              aria-label="Aumenta"
            >
              +
            </button>
          </div>
          <p className="text-[11px] text-sage-600/60 text-center mt-1">tra 1 e 10 min</p>
        </div>
      </div>

      <div className="space-y-2">
        <button
          onClick={() => onSave({ title: title.trim(), duration: minutes * 60 })}
          disabled={!canSave}
          className="w-full py-3.5 bg-gradient-to-br from-sage-500 to-sage-700 text-white rounded-xl-soft font-semibold text-sm shadow-sage disabled:opacity-50 active:scale-[0.98] transition-all"
        >
          Salva
        </button>
        <button
          onClick={onCancel}
          className="w-full py-2.5 text-sm text-sage-700 hover:text-sage-900"
        >
          Annulla
        </button>
        {initial && (
          <button
            onClick={() => onSave(null)}
            className="w-full py-2 text-xs text-terracotta-600 hover:text-terracotta-700"
          >
            Rimuovi azione personale
          </button>
        )}
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

function StepAfter({ before, after, onChangeAfter, saving, savedCounter, onSave, onClose, onTalkToCoach }) {
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
        <button
          onClick={onTalkToCoach}
          className="w-full mt-2 py-3 bg-white border border-sage-200 text-sage-800 rounded-xl-soft font-semibold text-sm active:scale-[0.98] transition-all"
        >
          Parla col coach
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
