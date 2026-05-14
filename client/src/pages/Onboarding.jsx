import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

const CRITICAL_MOMENTS_OPTIONS = [
  'Caffè', 'Stress', 'Pausa lavoro', 'Dopo i pasti', 'Guida',
  'Alcol', 'Noia', 'Telefonate', 'Mattino al risveglio', 'Socialità',
];

export default function Onboarding() {
  const { updateUser } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [cigarettesPerDay, setCigarettesPerDay] = useState('');
  const [selectedMoments, setSelectedMoments] = useState([]);
  const [customMoment, setCustomMoment] = useState('');
  const [dependencyLevel, setDependencyLevel] = useState(null);

  function toggleMoment(m) {
    setSelectedMoments((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]
    );
  }

  function addCustomMoment() {
    const val = customMoment.trim();
    if (val && !selectedMoments.includes(val)) {
      setSelectedMoments((prev) => [...prev, val]);
    }
    setCustomMoment('');
  }

  async function handleFinish() {
    if (!dependencyLevel) {
      setError('Seleziona il livello di dipendenza');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const { user } = await api.quiz.save({
        cigarettesPerDay: parseInt(cigarettesPerDay),
        criticalMoments: selectedMoments,
        dependencyLevel,
        quitDate: new Date().toISOString(),
      });
      updateUser(user);
      navigate(user.isPremium ? '/home' : '/paywall', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mobile-container bg-gradient-to-b from-cream-50 to-cream-100 px-6 py-8 animate-fade-in">
      <div className="max-w-mobile w-full mx-auto flex-1 flex flex-col">
        {/* Progress bar segmentata */}
        <div className="flex items-center gap-2 mb-10">
          <div className="flex gap-1.5 flex-1">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                  s <= step ? 'bg-gradient-to-r from-sage-500 to-sage-700' : 'bg-sage-100'
                }`}
              />
            ))}
          </div>
          <span className="text-[11px] font-semibold text-sage-700 tabular-nums shrink-0">
            {step}/3
          </span>
        </div>

        <div className="flex-1 animate-slide-up">
          {step === 1 && (
            <Step1
              value={cigarettesPerDay}
              onChange={setCigarettesPerDay}
            />
          )}
          {step === 2 && (
            <Step2
              selected={selectedMoments}
              onToggle={toggleMoment}
              customMoment={customMoment}
              onCustomChange={setCustomMoment}
              onAddCustom={addCustomMoment}
            />
          )}
          {step === 3 && (
            <Step3
              value={dependencyLevel}
              onChange={setDependencyLevel}
            />
          )}
        </div>

        {error && (
          <p className="text-sm text-terracotta-700 bg-terracotta-100 border border-terracotta-200 rounded-xl-soft px-3 py-2 mb-4">{error}</p>
        )}

        <div className="flex gap-3 mt-6">
          {step > 1 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="flex-1 py-3.5 border border-sage-200 text-sage-700 rounded-xl-soft font-medium text-sm hover:bg-sage-50 active:scale-[0.98] transition-all"
            >
              Indietro
            </button>
          )}
          {step < 3 ? (
            <button
              onClick={() => {
                if (step === 1 && (!cigarettesPerDay || parseInt(cigarettesPerDay) < 1)) {
                  setError('Inserisci un numero valido di sigarette');
                  return;
                }
                setError('');
                setStep((s) => s + 1);
              }}
              className="flex-1 py-3.5 bg-gradient-to-br from-sage-500 to-sage-700 text-white rounded-xl-soft font-semibold text-sm shadow-sage active:scale-[0.98] transition-all"
            >
              Avanti
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={loading}
              className="flex-1 py-3.5 bg-gradient-to-br from-sage-500 to-sage-700 text-white rounded-xl-soft font-semibold text-sm shadow-sage disabled:opacity-60 active:scale-[0.98] transition-all"
            >
              {loading ? 'Salvataggio…' : 'Inizia il percorso'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StepHeader({ step, title, sub }) {
  return (
    <>
      <p className="text-[10px] font-semibold text-sage-600/70 uppercase tracking-[0.2em] mb-2">Passo {step} di 3</p>
      <h2 className="font-display text-3xl font-semibold text-sage-900 leading-tight mb-2">{title}</h2>
      <p className="text-sage-700/80 text-sm mb-8 leading-relaxed">{sub}</p>
    </>
  );
}

function Step1({ value, onChange }) {
  return (
    <div>
      <StepHeader step={1} title="Quante sigarette fumi?" sub="Al giorno, in media." />
      <div className="relative bg-white rounded-2xl-soft border border-sage-100/60 shadow-soft p-6 mb-2">
        <div className="absolute inset-0 pointer-events-none opacity-50 bg-[radial-gradient(circle_at_50%_30%,rgba(104,131,97,0.08),transparent_60%)] rounded-2xl-soft" />
        <div className="relative flex items-center gap-4">
          <button
            onClick={() => onChange((v) => String(Math.max(1, parseInt(v || 1) - 1)))}
            className="w-12 h-12 rounded-full border border-sage-200 text-xl text-sage-700 flex items-center justify-center hover:bg-sage-50 shadow-soft active:scale-95 transition-all"
            aria-label="Diminuisci"
          >
            −
          </button>
          <input
            type="number"
            min="1"
            max="100"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1 min-w-0 text-center font-display text-6xl font-semibold text-sage-900 tabular-nums border-0 focus:outline-none focus:ring-0 bg-transparent leading-none"
            placeholder="0"
          />
          <button
            onClick={() => onChange((v) => String(Math.min(100, parseInt(v || 0) + 1)))}
            className="w-12 h-12 rounded-full bg-gradient-to-br from-sage-500 to-sage-700 text-xl text-white flex items-center justify-center shadow-sage active:scale-95 transition-all"
            aria-label="Aumenta"
          >
            +
          </button>
        </div>
      </div>
      <p className="text-[11px] text-sage-600/60 text-center">al giorno</p>
    </div>
  );
}

function Step2({ selected, onToggle, customMoment, onCustomChange, onAddCustom }) {
  return (
    <div>
      <StepHeader step={2} title="Quando hai più voglia?" sub="Seleziona tutti i momenti che riconosci. L'AI userà questi indizi nei suoi consigli." />
      <div className="flex flex-wrap gap-2 mb-4">
        {CRITICAL_MOMENTS_OPTIONS.map((m) => (
          <button
            key={m}
            onClick={() => onToggle(m)}
            className={`px-3.5 py-2 rounded-full text-sm font-medium border transition-all active:scale-95 ${
              selected.includes(m)
                ? 'bg-gradient-to-br from-sage-500 to-sage-700 border-transparent text-white shadow-sage'
                : 'border-sage-200 text-sage-700 bg-white hover:bg-sage-50'
            }`}
          >
            {m}
          </button>
        ))}
        {selected
          .filter((s) => !CRITICAL_MOMENTS_OPTIONS.includes(s))
          .map((m) => (
            <button
              key={m}
              onClick={() => onToggle(m)}
              className="px-3.5 py-2 rounded-full text-sm font-medium border border-transparent bg-gradient-to-br from-sage-500 to-sage-700 text-white shadow-sage"
            >
              {m}
            </button>
          ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={customMoment}
          onChange={(e) => onCustomChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), onAddCustom())}
          className="flex-1 min-w-0 px-3 py-2 border border-sage-200 rounded-xl-soft text-sm focus:outline-none focus:ring-2 focus:ring-sage-400 bg-white"
          placeholder="Altro momento…"
        />
        <button
          onClick={onAddCustom}
          className="px-4 py-2 bg-white border border-sage-200 text-sage-700 rounded-xl-soft text-sm font-medium hover:bg-sage-50 transition-colors"
        >
          Aggiungi
        </button>
      </div>
    </div>
  );
}

const DEPENDENCY_LABELS = {
  1: 'Leggera — fumo per abitudine, non dipendenza fisica',
  2: 'Moderata — difficile rifiutare, ma ce la faccio',
  3: 'Media — ci penso spesso, ho sintomi se smetto',
  4: 'Alta — ho bisogno di fumare per stare bene',
  5: 'Molto alta — fumo appena sveglio, non riesco a smettere',
};

function Step3({ value, onChange }) {
  return (
    <div>
      <StepHeader step={3} title="Quanto è forte la dipendenza?" sub="Sii onesto — aiuta l'AI a darti risposte più utili." />
      <div className="bg-white rounded-2xl-soft shadow-soft border border-sage-100/60 overflow-hidden divide-y divide-sage-100/60">
        {[1, 2, 3, 4, 5].map((level) => {
          const active = value === level;
          return (
            <button
              key={level}
              onClick={() => onChange(level)}
              className={`w-full text-left px-4 py-3.5 text-sm transition-all flex items-center gap-3 ${
                active ? 'bg-sage-50' : 'hover:bg-sage-50/40'
              }`}
            >
              <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                active
                  ? 'bg-gradient-to-br from-sage-500 to-sage-700 text-white shadow-sage'
                  : 'bg-sage-50 text-sage-700 border border-sage-200'
              }`}>
                {level}
              </span>
              <span className={`flex-1 ${active ? 'text-sage-900 font-medium' : 'text-sage-700/80'}`}>
                {DEPENDENCY_LABELS[level]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
