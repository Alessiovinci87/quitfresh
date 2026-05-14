import { useEffect, useState } from 'react';
import { api } from '../api/client';

const STATUS_LABELS = {
  available: { label: 'Disponibile', color: 'bg-green-100 text-green-700' },
  exhausted: { label: 'Esaurito', color: 'bg-gray-100 text-gray-600' },
  expired: { label: 'Scaduto', color: 'bg-gray-100 text-gray-600' },
  inactive: { label: 'Disattivato', color: 'bg-gray-100 text-gray-500' },
};

export default function Admin() {
  const [token, setToken] = useState(() => localStorage.getItem('qf_admin_token') || '');
  const [authed, setAuthed] = useState(false);
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [code, setCode] = useState('');
  const [discountPct, setDiscountPct] = useState('100');
  const [maxUses, setMaxUses] = useState('1');
  const [expiresAt, setExpiresAt] = useState('');
  const [notes, setNotes] = useState('');
  const [creating, setCreating] = useState(false);
  const [createSuccess, setCreateSuccess] = useState('');

  async function authenticate(e) {
    e?.preventDefault();
    setError('');
    setLoading(true);
    try {
      const list = await api.admin.listPromoCodes(token);
      localStorage.setItem('qf_admin_token', token);
      setCodes(list);
      setAuthed(true);
    } catch (err) {
      setError(err.message || 'Token non valido');
      localStorage.removeItem('qf_admin_token');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token) authenticate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refresh() {
    try {
      const list = await api.admin.listPromoCodes(token);
      setCodes(list);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setCreateSuccess('');
    setError('');
    setCreating(true);
    try {
      const body = {
        discountPct: parseInt(discountPct),
      };
      if (code.trim()) body.code = code.trim().toUpperCase();
      if (maxUses === '' || maxUses === 'null') body.maxUses = null;
      else body.maxUses = parseInt(maxUses);
      if (expiresAt) body.expiresAt = new Date(expiresAt).toISOString();
      if (notes.trim()) body.notes = notes.trim();

      const created = await api.admin.createPromoCode(token, body);
      setCreateSuccess(`Codice creato: ${created.code}`);
      setCode('');
      setNotes('');
      setExpiresAt('');
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(promo) {
    try {
      await api.admin.updatePromoCode(token, promo.id, { active: !promo.active });
      await refresh();
    } catch (err) { setError(err.message); }
  }

  async function deleteCode(promo) {
    if (!confirm(`Eliminare il codice ${promo.code}?`)) return;
    try {
      await api.admin.deletePromoCode(token, promo.id);
      await refresh();
    } catch (err) { setError(err.message); }
  }

  function logout() {
    localStorage.removeItem('qf_admin_token');
    setToken('');
    setAuthed(false);
    setCodes([]);
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
        <form onSubmit={authenticate} className="w-full max-w-md bg-white rounded-2xl p-6 shadow">
          <h1 className="text-lg font-bold text-gray-900 mb-1">Admin · Codici promo</h1>
          <p className="text-xs text-gray-500 mb-4">Inserisci il token admin (header <code>x-admin-token</code>).</p>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Token admin"
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sage-400"
            autoFocus
          />
          {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-2 py-1.5 mt-2">{error}</p>}
          <button
            type="submit"
            disabled={!token || loading}
            className="w-full mt-3 py-2.5 bg-sage-500 text-white rounded-xl text-sm font-semibold hover:bg-sage-600 disabled:opacity-60"
          >
            {loading ? 'Verifica…' : 'Entra'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-gray-900">Codici promo</h1>
          <button onClick={logout} className="text-xs text-gray-400 hover:text-gray-600">Esci</button>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">{error}</p>}
        {createSuccess && <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2 mb-4">{createSuccess}</p>}

        <form onSubmit={handleCreate} className="bg-white rounded-2xl p-5 shadow-sm mb-6 space-y-3">
          <h2 className="text-sm font-semibold text-gray-800">Nuovo codice</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Codice (vuoto = auto)</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="AUTO"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm uppercase font-mono focus:outline-none focus:ring-2 focus:ring-sage-400"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Sconto %</label>
              <input
                type="number" min="1" max="100"
                value={discountPct}
                onChange={(e) => setDiscountPct(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sage-400"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Utilizzi max (vuoto = ∞)</label>
              <input
                type="number" min="1"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                placeholder="1"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sage-400"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Scadenza (opz.)</label>
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sage-400"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Note (opzionale)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="es. regalo a Mario"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sage-400"
            />
          </div>
          <button
            type="submit"
            disabled={creating}
            className="w-full py-2.5 bg-sage-500 text-white rounded-xl text-sm font-semibold hover:bg-sage-600 disabled:opacity-60"
          >
            {creating ? 'Creazione…' : 'Crea codice'}
          </button>
        </form>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-800">Codici esistenti ({codes.length})</h2>
          </div>
          {codes.length === 0 ? (
            <p className="px-5 py-6 text-sm text-gray-400 text-center">Nessun codice ancora.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {codes.map((c) => {
                const s = STATUS_LABELS[c.status] || STATUS_LABELS.available;
                return (
                  <div key={c.id} className="px-5 py-3 flex items-center gap-3 text-sm">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-gray-900">{c.code}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.color}`}>{s.label}</span>
                        <span className="text-xs text-gray-500">−{c.discountPct}%</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        usato {c.usageCount}{c.maxUses != null ? `/${c.maxUses}` : ''}
                        {c.expiresAt && ` · scade ${new Date(c.expiresAt).toLocaleDateString('it-IT')}`}
                        {c.notes && ` · ${c.notes}`}
                      </div>
                    </div>
                    <button
                      onClick={() => toggleActive(c)}
                      className="text-xs text-gray-500 hover:text-gray-800 underline"
                    >
                      {c.active ? 'Disattiva' : 'Riattiva'}
                    </button>
                    {c.usageCount === 0 && (
                      <button
                        onClick={() => deleteCode(c)}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        Elimina
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
