import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

// Pagina admin: invio email broadcast a una selezione di utenti.
// Due campagne:
//   - 'notifiche': invito ad attivare le notifiche (+ codice sconto opzionale)
//   - 'verify':    promemoria a chi non ha verificato l'email
// Flusso sicuro a due fasi: 1) dry-run (conteggio + anteprima), 2) invio confermato.
export default function AdminBroadcast() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [users, setUsers] = useState([]);
  const [promos, setPromos] = useState([]);
  const [campaign, setCampaign] = useState('notifiche'); // 'notifiche' | 'verify'
  const [selected, setSelected] = useState(() => new Set());
  const [onlyTargets, setOnlyTargets] = useState(true);
  const [promoCode, setPromoCode] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cambio campagna → ripristina la preselezione "naturale" dei destinatari.
  useEffect(() => {
    if (users.length === 0) return;
    presetSelection(campaign, users);
    setResult(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaign, users]);

  if (!user) return <Navigate to="/login" replace />;
  if (!user.isAdmin) return <Navigate to="/home" replace />;

  function isTarget(u, c) {
    return c === 'verify'
      ? !u.emailVerified
      : (u.emailVerified && u._count.pushSubscriptions === 0);
  }

  function presetSelection(c, list) {
    const preset = list.filter((x) => isTarget(x, c));
    setSelected(new Set(preset.map((x) => x.id)));
  }

  async function refresh() {
    try {
      const [u, p] = await Promise.all([
        api.admin.analyticsUsers(),
        api.admin.listPromoCodes(),
      ]);
      const list = u.users || [];
      setUsers(list);
      setPromos((p || []).filter((c) => c.status === 'available'));
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }

  // Lista visibile in base al filtro "solo i destinatari naturali".
  const visible = useMemo(() => {
    if (!onlyTargets) return users;
    return users.filter((u) => isTarget(u, campaign));
  }, [users, onlyTargets, campaign]);

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setResult(null);
  }

  function selectAllVisible() {
    setSelected(new Set(visible.map((u) => u.id)));
    setResult(null);
  }
  function clearSelection() {
    setSelected(new Set());
    setResult(null);
  }

  function callApi(body) {
    return campaign === 'verify'
      ? api.admin.broadcastVerify(body)
      : api.admin.broadcastNotifiche(body);
  }

  async function preview() {
    setError('');
    setResult(null);
    setSending(true);
    try {
      const body = { userIds: [...selected] };
      if (campaign === 'notifiche' && promoCode) body.promoCode = promoCode;
      const r = await callApi(body); // dry-run (no confirm)
      setResult(r);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  async function sendForReal() {
    const label = campaign === 'verify' ? 'promemoria di verifica email' : 'avviso notifiche';
    if (!confirm(`Inviare il ${label} a ${selected.size} utenti? Questa azione invia email reali.`)) return;
    setError('');
    setSending(true);
    try {
      const body = { userIds: [...selected], confirm: true };
      if (campaign === 'notifiche' && promoCode) body.promoCode = promoCode;
      const r = await callApi(body);
      setResult(r);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  // Avviso: selezionati non idonei alla campagna corrente.
  const offTargetCount = users.filter((u) => selected.has(u.id) && !isTarget(u, campaign)).length;

  const TabBtn = ({ value, children }) => (
    <button
      onClick={() => setCampaign(value)}
      className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
        campaign === value ? 'bg-sage-500 text-white' : 'bg-white text-gray-600 border border-gray-200'
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/admin/promo-codes')}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Indietro"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-gray-900">Invio email broadcast</h1>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">{error}</p>}

        {/* Selettore campagna */}
        <div className="flex gap-2 mb-4">
          <TabBtn value="notifiche">🔔 Attiva notifiche</TabBtn>
          <TabBtn value="verify">✉️ Verifica email</TabBtn>
        </div>

        {/* Opzioni */}
        <div className="bg-white rounded-2xl p-5 shadow-sm mb-4 space-y-4">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={onlyTargets}
              onChange={(e) => setOnlyTargets(e.target.checked)}
              className="accent-sage-500 w-4 h-4"
            />
            {campaign === 'verify'
              ? <>Mostra solo chi <strong>non</strong> ha verificato l'email</>
              : <>Mostra solo chi <strong>non</strong> ha le notifiche attive</>}
          </label>

          {campaign === 'notifiche' && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Codice sconto da allegare (opzionale)</label>
              <select
                value={promoCode}
                onChange={(e) => { setPromoCode(e.target.value); setResult(null); }}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sage-400"
              >
                <option value="">— Nessun codice —</option>
                {promos.map((c) => (
                  <option key={c.id} value={c.code}>
                    {c.code} (−{c.discountPct}%{c.expiresAt ? `, scade ${new Date(c.expiresAt).toLocaleDateString('it-IT')}` : ''})
                  </option>
                ))}
              </select>
              {promos.length === 0 && (
                <p className="text-xs text-gray-400 mt-1">Nessun codice disponibile. Creane uno dalla pagina Codici promo.</p>
              )}
            </div>
          )}
        </div>

        {/* Selezione utenti */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-4">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-800">
              Destinatari ({selected.size} selezionati / {visible.length} mostrati)
            </h2>
            <div className="flex gap-3 text-xs">
              <button onClick={selectAllVisible} className="text-sage-700 underline">Seleziona tutti</button>
              <button onClick={clearSelection} className="text-gray-500 underline">Nessuno</button>
            </div>
          </div>
          <div className="max-h-[340px] overflow-y-auto divide-y divide-gray-100">
            {visible.map((u) => (
              <label key={u.id} className="px-5 py-2.5 flex items-center gap-3 text-sm cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={selected.has(u.id)}
                  onChange={() => toggle(u.id)}
                  className="accent-sage-500 w-4 h-4"
                />
                <span className="flex-1 min-w-0 truncate text-gray-800">{u.email}</span>
                {!u.emailVerified && <span className="text-[9px] bg-red-100 text-red-700 px-1 rounded">non verif.</span>}
                {u._count.pushSubscriptions > 0 && <span className="text-[9px] bg-green-100 text-green-700 px-1 rounded">push ON</span>}
              </label>
            ))}
            {visible.length === 0 && <p className="px-5 py-6 text-sm text-gray-400 text-center">Nessun utente.</p>}
          </div>
        </div>

        {offTargetCount > 0 && (
          <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mb-4">
            {campaign === 'verify'
              ? `⚠️ ${offTargetCount} dei selezionati ha già l'email verificata: verrà saltato automaticamente.`
              : `⚠️ ${offTargetCount} dei selezionati ha l'email non verificata: potrebbe non ricevere la mail o finire in spam.`}
          </p>
        )}

        {/* Azioni */}
        <div className="flex gap-3 mb-4">
          <button
            onClick={preview}
            disabled={sending || selected.size === 0}
            className="flex-1 py-2.5 bg-white border border-sage-500 text-sage-700 rounded-xl text-sm font-semibold disabled:opacity-50"
          >
            {sending ? 'Attendi…' : `Anteprima (${selected.size})`}
          </button>
          <button
            onClick={sendForReal}
            disabled={sending || selected.size === 0}
            className="flex-1 py-2.5 bg-sage-500 text-white rounded-xl text-sm font-semibold hover:bg-sage-600 disabled:opacity-50"
          >
            Invia davvero
          </button>
        </div>

        {result && (
          <div className={`rounded-xl px-4 py-3 text-sm ${result.dryRun ? 'bg-sage-50 text-sage-800' : 'bg-green-50 text-green-800'}`}>
            <p className="font-semibold mb-1">{result.dryRun ? 'Anteprima (nessuna mail inviata)' : '✅ Invio avviato'}</p>
            <p>{result.message}</p>
            {result.sample?.length > 0 && (
              <p className="mt-1 text-xs opacity-80">Primi destinatari: {result.sample.join(', ')}…</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
