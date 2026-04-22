import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

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
  if (day <= 5) return { text: `Fase 1 — Giorno ${day} (riduci, continua la citisina)`, color: 'text-amber-600' };
  if (day <= 25) return { text: `Fase 2 — Giorno ${day} (niente sigarette)`, color: 'text-sage-600' };
  return { text: `Giorno ${day} — protocollo completato`, color: 'text-sage-700' };
}

export default function Diary() {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [success, setSuccess] = useState('');

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
      console.error(err);
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
    <div className="px-6 py-8 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">Diario citisina</h1>
        <button
          onClick={() => openForm()}
          className="px-3 py-1.5 bg-sage-500 text-white text-sm font-semibold rounded-full hover:bg-sage-600 transition-colors"
        >
          + Oggi
        </button>
      </div>

      {phase && (
        <div className={`text-xs font-medium mb-6 ${phase.color}`}>{phase.text}</div>
      )}

      {success && (
        <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2 mb-4">{success}</p>
      )}

      {/* Entries list */}
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-2 border-sage-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          Nessuna registrazione ancora.<br />Inizia con quella di oggi.
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry, i) => (
            <EntryCard key={i} entry={entry} onEdit={() => openForm(entry)} isPhase1={isPhase1} />
          ))}
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-50 px-4 pb-4">
          <div className="bg-white rounded-2xl w-full max-w-mobile max-h-[85vh] overflow-y-auto animate-slide-up">
            <div className="px-6 py-5">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-bold text-gray-900">Registrazione</h2>
                <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Data</label>
                  <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sage-400" />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">
                    Compresse prese oggi <span className="text-sage-600 font-bold">{form.pillsTaken}</span>
                  </label>
                  <div className="flex gap-2">
                    {[0,1,2,3,4,5,6].map(n => (
                      <button key={n} onClick={() => setForm(f => ({ ...f, pillsTaken: n }))}
                        className={`w-9 h-9 rounded-full text-sm font-bold border transition-colors ${form.pillsTaken === n ? 'bg-sage-500 border-sage-500 text-white' : 'border-gray-200 text-gray-600'}`}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">
                    Sigarette fumate oggi <span className="text-gray-600 font-bold">{form.cigarettesToday}</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setForm(f => ({ ...f, cigarettesToday: Math.max(0, f.cigarettesToday - 1) }))}
                      className="w-9 h-9 rounded-full border border-gray-200 text-gray-600 flex items-center justify-center hover:bg-gray-50 text-lg">−</button>
                    <span className="text-2xl font-bold text-gray-900 w-10 text-center">{form.cigarettesToday}</span>
                    <button onClick={() => setForm(f => ({ ...f, cigarettesToday: f.cigarettesToday + 1 }))}
                      className="w-9 h-9 rounded-full border border-gray-200 text-gray-600 flex items-center justify-center hover:bg-gray-50 text-lg">+</button>
                  </div>
                  {form.cigarettesToday === 0 && <p className="text-xs text-sage-600 mt-1">Nessuna sigaretta — ottimo.</p>}
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">Effetti collaterali</label>
                  <div className="flex flex-wrap gap-2">
                    {SIDE_EFFECTS.map(e => (
                      <button key={e} onClick={() => toggleEffect(e)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                          form.sideEffects.includes(e) ? 'bg-amber-100 border-amber-400 text-amber-700' : 'border-gray-200 text-gray-600'
                        }`}>{e}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Note</label>
                  <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Come ti sei sentito oggi?"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-sage-400" />
                </div>

                <button onClick={handleSave} disabled={saving}
                  className="w-full py-3.5 bg-sage-500 text-white rounded-xl font-semibold text-sm hover:bg-sage-600 disabled:opacity-60 transition-colors">
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
  return (
    <div className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold text-gray-800 capitalize">{date}</p>
        <button onClick={onEdit} className="text-xs text-sage-600 hover:underline">modifica</button>
      </div>
      <div className="flex gap-4 text-xs text-gray-600">
        <span>💊 {entry.pillsTaken} compresse</span>
        <span>🚬 {entry.cigarettesToday} sigarette</span>
      </div>
      {entry.sideEffects?.length > 0 && (
        <p className="text-xs text-amber-600 mt-1">{entry.sideEffects.join(', ')}</p>
      )}
      {entry.notes && <p className="text-xs text-gray-500 mt-1 italic">"{entry.notes}"</p>}
    </div>
  );
}
