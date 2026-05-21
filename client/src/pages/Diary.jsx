import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import FeatureLimitPaywall from '../components/FeatureLimitPaywall';

const SIDE_EFFECTS = ['Nausea', 'Secchezza bocca', 'Sogni vividi', 'Irritabilità', 'Insonnia', 'Mal di testa'];

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function protocolDay(quitDate) {
  if (!quitDate) return null;
  return Math.floor((Date.now() - new Date(quitDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

function phaseLabel(day) {
  if (!day) return null;
  if (day <= 5) return { text: `Fase 1 · Giorno ${day} — riduci, continua la citisina`, tone: 'warm' };
  if (day <= 25) return { text: `Fase 2 · Giorno ${day} — niente sigarette`, tone: 'sage' };
  return { text: `Giorno ${day} — protocollo completato`, tone: 'sage' };
}

export default function Diary() {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [success, setSuccess] = useState('');
  const [paywallReached, setPaywallReached] = useState(false);
  const [saveError, setSaveError] = useState('');

  const [form, setForm] = useState({
    date: todayISO(),
    pillsTaken: 0,
    cigarettesToday: 0,
    sideEffects: [],
    notes: '',
  });

  const day = protocolDay(user.quitDate);
  const phase = phaseLabel(day);
  const isPhase1 = day !== null && day <= 5;

  useEffect(() => {
    api.diary.list()
      .then(setEntries)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  function toggleEffect(e) {
    setForm(f => ({
      ...f,
      sideEffects: f.sideEffects.includes(e)
        ? f.sideEffects.filter(x => x !== e)
        : [...f.sideEffects, e],
    }));
  }

  async function handleSave() {
    setSaving(true);
    setSaveError('');
    try {
      const saved = await api.diary.save(form);
      setEntries(prev => {
        const idx = prev.findIndex(e => e.date?.startsWith(form.date));
        if (idx >= 0) { const n = [...prev]; n[idx] = saved; return n; }
        return [saved, ...prev];
      });
      setShowForm(false);
      setSuccess('Registrazione salvata');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      if (err.freemiumLimit?.feature === 'diary') {
        setPaywallReached(true);
        setShowForm(false);
      } else {
        setSaveError(err.message || 'Errore nel salvataggio');
      }
    } finally {
      setSaving(false);
    }
  }

  function openForm(entry = null) {
    if (entry) {
      setForm({
        date: entry.date?.split('T')[0] ?? todayISO(),
        pillsTaken: entry.pillsTaken,
        cigarettesToday: entry.cigarettesToday,
        sideEffects: entry.sideEffects ?? [],
        notes: entry.notes ?? '',
      });
    } else {
      setForm({ date: todayISO(), pillsTaken: 0, cigarettesToday: 0, sideEffects: [], notes: '' });
    }
    setShowForm(true);
  }

  return (
    <div className="min-h-[calc(100dvh-7rem)] flex flex-col px-6 pt-6 animate-fade-in">
      <header className="mb-4">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.2em] text-sage-600/70 font-semibold">Registro</p>
            <h1 className="font-display text-3xl font-semibold text-sage-900 leading-tight mt-0.5">Diario</h1>
          </div>
          <button
            onClick={() => openForm()}
            className="px-4 py-2 bg-gradient-to-br from-sage-500 to-sage-700 text-white text-xs font-semibold rounded-full shadow-sage active:scale-95 transition-all shrink-0"
          >
            + Oggi
          </button>
        </div>
        {phase && (
          <div className={`mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${
            phase.tone === 'warm'
              ? 'bg-terracotta-100/80 text-terracotta-700'
              : 'bg-sage-50 text-sage-700'
          }`}>
            {phase.text}
          </div>
        )}
      </header>

      <div className="flex-1 pb-2">
        {success && (
          <p className="text-sm text-sage-700 bg-sage-50 rounded-xl-soft px-3 py-2 mb-4 border border-sage-100">{success}</p>
        )}
        {saveError && (
          <p className="text-sm text-terracotta-700 bg-terracotta-50 rounded-xl-soft px-3 py-2 mb-4 border border-terracotta-100">{saveError}</p>
        )}
        {paywallReached && (
          <div className="mb-4">
            <FeatureLimitPaywall feature="diary" compact />
          </div>
        )}
        {!paywallReached && !user.isPremium && !user.freemiumGrandfathered && entries.length >= 5 && entries.length < 7 && (
          <p className="text-[11px] text-sage-600/80 mb-3 text-center">
            Hai usato {entries.length} di 7 giorni gratuiti del diario.
          </p>
        )}

        {/* Entries list */}
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-sage-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-14 h-14 mx-auto rounded-full bg-sage-50 flex items-center justify-center mb-3 text-2xl">📝</div>
            <p className="font-display text-lg font-semibold text-sage-900 mb-1">Nessuna registrazione</p>
            <p className="text-sm text-sage-700/70">Inizia con quella di oggi.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry, i) => (
              <EntryCard key={i} entry={entry} onEdit={() => openForm(entry)} isPhase1={isPhase1} />
            ))}
          </div>
        )}
      </div>

      {/* Form modal — bottom sheet */}
      {showForm && (
        <div className="fixed inset-0 bg-sage-900/40 backdrop-blur-sm flex items-end justify-center z-50 px-4 pb-4 animate-fade-in">
          <div className="bg-white rounded-2xl-soft w-full max-w-mobile max-h-[85vh] overflow-y-auto animate-slide-up shadow-lift">
            <div className="px-6 py-5">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-display text-xl font-semibold text-sage-900">Registrazione</h2>
                <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-full hover:bg-sage-50 text-sage-700 transition-colors flex items-center justify-center" aria-label="Chiudi">✕</button>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="text-[11px] uppercase tracking-wider text-sage-600/70 font-semibold block mb-1.5">Data</label>
                  <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    className="w-full px-3 py-2 border border-sage-200 rounded-xl-soft text-sm focus:outline-none focus:ring-2 focus:ring-sage-400" />
                </div>

                <div>
                  <label className="text-[11px] uppercase tracking-wider text-sage-600/70 font-semibold block mb-2">
                    Compresse prese — <span className="font-display text-base text-sage-800 normal-case tracking-normal">{form.pillsTaken}</span>
                  </label>
                  <div className="flex gap-1.5 flex-wrap">
                    {[0,1,2,3,4,5,6].map(n => (
                      <button key={n} onClick={() => setForm(f => ({ ...f, pillsTaken: n }))}
                        className={`w-10 h-10 rounded-full text-sm font-bold border transition-all ${form.pillsTaken === n
                          ? 'bg-gradient-to-br from-sage-500 to-sage-700 border-transparent text-white shadow-sage'
                          : 'border-sage-200 text-sage-700 hover:bg-sage-50'}`}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] uppercase tracking-wider text-sage-600/70 font-semibold block mb-2">
                    Sigarette fumate
                  </label>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setForm(f => ({ ...f, cigarettesToday: Math.max(0, f.cigarettesToday - 1) }))}
                      className="w-10 h-10 rounded-full border border-sage-200 text-sage-700 flex items-center justify-center hover:bg-sage-50 text-lg active:scale-95 transition-all">−</button>
                    <span className="font-display text-3xl font-semibold text-sage-900 w-12 text-center tabular-nums">{form.cigarettesToday}</span>
                    <button onClick={() => setForm(f => ({ ...f, cigarettesToday: f.cigarettesToday + 1 }))}
                      className="w-10 h-10 rounded-full bg-gradient-to-br from-sage-500 to-sage-700 text-white flex items-center justify-center text-lg shadow-sage active:scale-95 transition-all">+</button>
                  </div>
                  {form.cigarettesToday === 0 && <p className="text-xs text-sage-700 mt-2 font-medium">Nessuna sigaretta — ottimo.</p>}
                </div>

                <div>
                  <label className="text-[11px] uppercase tracking-wider text-sage-600/70 font-semibold block mb-2">Effetti collaterali</label>
                  <div className="flex flex-wrap gap-1.5">
                    {SIDE_EFFECTS.map(e => (
                      <button key={e} onClick={() => toggleEffect(e)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                          form.sideEffects.includes(e)
                            ? 'bg-terracotta-100 border-terracotta-200 text-terracotta-700'
                            : 'border-sage-200 text-sage-700 hover:bg-sage-50'
                        }`}>{e}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] uppercase tracking-wider text-sage-600/70 font-semibold block mb-1.5">Note</label>
                  <textarea rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Come ti sei sentito oggi?"
                    className="w-full px-3 py-2 border border-sage-200 rounded-xl-soft text-sm resize-none focus:outline-none focus:ring-2 focus:ring-sage-400" />
                </div>

                <button onClick={handleSave} disabled={saving}
                  className="w-full py-3.5 bg-gradient-to-br from-sage-500 to-sage-700 text-white rounded-xl-soft font-semibold text-sm shadow-sage disabled:opacity-60 active:scale-[0.98] transition-all">
                  {saving ? 'Salvataggio…' : 'Salva'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EntryCard({ entry, onEdit }) {
  const date = new Date(entry.date).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
  const isSmokeFree = entry.cigarettesToday === 0;
  return (
    <div className="bg-white rounded-xl-soft border border-sage-100/60 shadow-soft px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <p className="font-display text-sm font-semibold text-sage-900 capitalize">{date}</p>
        <button onClick={onEdit} className="text-[11px] text-sage-600 hover:text-sage-800 hover:underline underline-offset-2">modifica</button>
      </div>
      <div className="flex gap-3 text-[11px] flex-wrap">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sage-50 text-sage-700 font-medium">
          💊 {entry.pillsTaken} compresse
        </span>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium ${
          isSmokeFree ? 'bg-sage-100 text-sage-800' : 'bg-terracotta-100 text-terracotta-700'
        }`}>
          🚬 {entry.cigarettesToday} sigarette
        </span>
      </div>
      {entry.sideEffects?.length > 0 && (
        <p className="text-[11px] text-terracotta-600 mt-1.5">{entry.sideEffects.join(' · ')}</p>
      )}
      {entry.notes && <p className="text-[11px] text-sage-700/70 mt-1.5 italic leading-snug">"{entry.notes}"</p>}
    </div>
  );
}
