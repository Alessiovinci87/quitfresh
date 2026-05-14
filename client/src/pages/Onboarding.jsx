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
    <div className="mobile-container bg-white px-6 py-10 animate-fade-in">
      <div className="max-w-mobile w-full mx-auto flex-1 flex flex-col">
        {/* Progress dots */}
        <div className="flex gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                s <= step ? 'bg-sage-500' : 'bg-gray-200'
              }`}
            />
          ))}
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
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">{error}</p>
        )}

        <div className="flex gap-3 mt-6">
          {step > 1 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="flex-1 py-3.5 border border-gray-200 text-gray-600 rounded-xl font-medium text-sm hover:bg-gray-50 transition-colors"
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
              className="flex-1 py-3.5 bg-sage-500 text-white rounded-xl font-semibold text-sm hover:bg-sage-600 transition-colors"
            >
              Avanti
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={loading}
              className="flex-1 py-3.5 bg-sage-500 text-white rounded-xl font-semibold text-sm hover:bg-sage-600 disabled:opacity-60 transition-colors"
            >
              {loading ? 'Salvataggio…' : 'Inizia'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Step1({ value, onChange }) {
  return (
    <div>
      <p className="text-xs font-semibold text-sage-600 uppercase tracking-wider mb-2">Passo 1 di 3</p>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Quante sigarette fumi?</h2>
      <p className="text-gray-500 text-sm mb-8">Al giorno, in media.</p>
      <div className="flex items-center gap-4">
        <button
          onClick={() => onChange((v) => String(Math.max(1, parseInt(v || 1) - 1)))}
          className="w-12 h-12 rounded-full border border-gray-200 text-xl text-gray-600 flex items-center justify-center hover:bg-gray-50 active:bg-gray-100 transition-colors"
        >
          −
        </button>
        <input
          type="number"
          min="1"
          max="100"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 text-center text-4xl font-bold text-gray-900 border-0 focus:outline-none focus:ring-0 bg-transparent"
          placeholder="0"
        />
        <button
          onClick={() => onChange((v) => String(Math.min(100, parseInt(v || 0) + 1)))}
          className="w-12 h-12 rounded-full border border-gray-200 text-xl text-gray-600 flex items-center justify-center hover:bg-gray-50 active:bg-gray-100 transition-colors"
        >
          +
        </button>
      </div>
    </div>
  );
}

function Step2({ selected, onToggle, customMoment, onCustomChange, onAddCustom }) {
  return (
    <div>
      <p className="text-xs font-semibold text-sage-600 uppercase tracking-wider mb-2">Passo 2 di 3</p>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Quando hai più voglia?</h2>
      <p className="text-gray-500 text-sm mb-6">Seleziona tutti i momenti che riconosci.</p>
      <div className="flex flex-wrap gap-2 mb-4">
        {CRITICAL_MOMENTS_OPTIONS.map((m) => (
          <button
            key={m}
            onClick={() => onToggle(m)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              selected.includes(m)
                ? 'bg-sage-500 border-sage-500 text-white'
                : 'border-gray-200 text-gray-600 hover:border-sage-300'
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
              className="px-3 py-1.5 rounded-full text-sm font-medium border bg-sage-500 border-sage-500 text-white"
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
          className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sage-400"
          placeholder="Altro momento…"
        />
        <button
          onClick={onAddCustom}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
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
  5: 'Molto alta — fumo appena mi sveglio, non riesco a smettere',
};

function Step3({ value, onChange }) {
  return (
    <div>
      <p className="text-xs font-semibold text-sage-600 uppercase tracking-wider mb-2">Passo 3 di 3</p>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Quanto è forte la dipendenza?</h2>
      <p className="text-gray-500 text-sm mb-6">Sii onesto — aiuta l'AI a darti risposte più utili.</p>
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((level) => (
          <button
            key={level}
            onClick={() => onChange(level)}
            className={`w-full text-left px-4 py-3.5 rounded-xl border text-sm transition-colors ${
              value === level
                ? 'border-sage-500 bg-sage-50 text-sage-800 font-medium'
                : 'border-gray-200 text-gray-600 hover:border-sage-200'
            }`}
          >
            <span className="font-bold mr-2">{level}</span>
            {DEPENDENCY_LABELS[level]}
          </button>
        ))}
      </div>
    </div>
  );
}
