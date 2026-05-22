import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

function fmtDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' });
}
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('it-IT', { dateStyle: 'medium' });
}
function daysAgo(d) {
  if (!d) return null;
  return Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
}

function Card({ title, children, right }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{title}</h2>
        {right}
      </div>
      {children}
    </div>
  );
}

function Stat({ label, value, sub }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3">
      <p className="text-[11px] text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-xl font-bold text-gray-900 mt-1">{value}</p>
      {sub && <p className="text-[11px] text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

export default function AdminAnalytics() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [users, setUsers] = useState([]);
  const [live, setLive] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function refresh() {
    try {
      const [s, u, l] = await Promise.all([
        api.admin.analyticsSummary(30),
        api.admin.analyticsUsers(),
        api.admin.analyticsLive(30),
      ]);
      setSummary(s);
      setUsers(u.users || []);
      setLive(l.events || []);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!user?.isAdmin) {
      navigate('/home', { replace: true });
      return;
    }
    refresh();
    const t = setInterval(refresh, 15000);
    return () => clearInterval(t);
  }, [user]);

  if (loading) return <div className="p-6 text-gray-500">Caricamento…</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!summary) return null;

  const y = summary.yesterday;
  const o = summary.overall;

  return (
    <div className="max-w-3xl w-full mx-auto px-4 py-6 pb-24">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-xs text-gray-500">Aggiornato {fmtDateTime(summary.generatedAt)}</p>
        </div>
        <button onClick={() => navigate('/home')} className="text-sm text-sage-700">← Home</button>
      </div>

      <Card title="Overall">
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Utenti totali" value={o.totalUsers} />
          <Stat label="DAU" value={o.DAU} sub={`${Math.round(o.dauOverTotal * 100)}% del totale`} />
          <Stat label="WAU" value={o.WAU} />
          <Stat label="MAU" value={o.MAU} />
        </div>
      </Card>

      <Card title="Ieri">
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Nuove reg" value={y.newUsers} />
          <Stat label="Nuovi premium" value={y.newPremium} sub={y.newPremiumViaPromo ? `${y.newPremiumViaPromo} con codice` : null} />
          <Stat label="Utenti attivi (eventi)" value={y.activeUniqueByEvents} />
          <Stat label="Chat limit hit" value={y.chatLimitHits} />
        </div>
        <div className="mt-3 text-xs text-gray-600 grid grid-cols-2 gap-2">
          <div>
            <p className="font-semibold mb-1">SOS</p>
            <p>{y.sos.started} avviati → {y.sos.completed} completati</p>
            {y.sos.completionRate != null && <p>Completion {Math.round(y.sos.completionRate * 100)}%</p>}
          </div>
          <div>
            <p className="font-semibold mb-1">Paywall</p>
            <p>{y.paywall.seen} visti → {y.paywall.cta} CTA → {y.paywall.checkout} checkout</p>
          </div>
        </div>
      </Card>

      <Card title="Top attivi ieri">
        {summary.topActive.length === 0 ? (
          <p className="text-xs text-gray-500">Nessuna attività ieri</p>
        ) : (
          <ul className="text-sm space-y-1">
            {summary.topActive.map(t => (
              <li key={t.userId} className="flex justify-between">
                <Link to={`/admin/analytics/users/${t.userId}`} className="text-sage-700 truncate">{t.email}</Link>
                <span className="text-gray-500">{t.actions} azioni</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Utenti dormienti">
        {summary.dormantUsers.length === 0 ? (
          <p className="text-xs text-gray-500">Nessun dormiente</p>
        ) : (
          <ul className="text-sm space-y-1">
            {summary.dormantUsers.slice(0, 10).map(u => (
              <li key={u.id} className="flex justify-between">
                <Link to={`/admin/analytics/users/${u.id}`} className="text-sage-700 truncate">{u.email}</Link>
                <span className="text-gray-500 text-xs">
                  {u.lastActiveAt ? `${daysAgo(u.lastActiveAt)}gg fa` : 'mai'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title={`Tutti gli utenti (${users.length})`}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-gray-500">
              <tr>
                <th className="text-left py-1">Email</th>
                <th className="text-right">Reg</th>
                <th className="text-right">Ultimo</th>
                <th className="text-right">Eventi</th>
                <th className="text-right">SOS</th>
                <th className="text-right">Diary</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-t border-gray-100">
                  <td className="py-1.5">
                    <Link to={`/admin/analytics/users/${u.id}`} className="text-sage-700 truncate inline-block max-w-[160px]">{u.email}</Link>
                    {u.isPremium && <span className="ml-1 text-[9px] bg-amber-100 text-amber-700 px-1 rounded">PREM</span>}
                    {!u.emailVerified && <span className="ml-1 text-[9px] bg-red-100 text-red-700 px-1 rounded">NV</span>}
                  </td>
                  <td className="text-right text-gray-500">{fmtDate(u.createdAt)}</td>
                  <td className="text-right text-gray-500">{u.lastActiveAt ? `${daysAgo(u.lastActiveAt)}gg` : '—'}</td>
                  <td className="text-right">{u._count.usageEvents}</td>
                  <td className="text-right">{u._count.cravingSessions}</td>
                  <td className="text-right">{u._count.diaryEntries}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Live (ultimi 30)" right={<span className="text-[10px] text-gray-400">refresh 15s</span>}>
        {live.length === 0 ? (
          <p className="text-xs text-gray-500">Nessun evento ancora. Quando gli utenti aprono l'app appariranno qui.</p>
        ) : (
          <ul className="text-xs space-y-1.5">
            {live.map(e => (
              <li key={e.id} className="flex items-start gap-2">
                <span className="text-gray-400 shrink-0 w-20">{fmtDateTime(e.createdAt)}</span>
                <span className="font-mono text-sage-700 shrink-0">{e.type}</span>
                <span className="text-gray-600 truncate">
                  {e.user?.email || 'anon'}
                  {e.path && ` · ${e.path}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

export function AdminUserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.isAdmin) { navigate('/home', { replace: true }); return; }
    api.admin.analyticsUser(id)
      .then(setData)
      .catch(err => setError(err.message));
  }, [id, user]);

  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!data) return <div className="p-6 text-gray-500">Caricamento…</div>;

  const u = data.user;
  return (
    <div className="max-w-3xl w-full mx-auto px-4 py-6 pb-24">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 truncate">{u.email}</h1>
          <p className="text-xs text-gray-500">
            Registrato {fmtDate(u.createdAt)} · ultimo accesso {u.lastActiveAt ? fmtDateTime(u.lastActiveAt) : 'mai'}
          </p>
        </div>
        <Link to="/admin/analytics" className="text-sm text-sage-700">← Analytics</Link>
      </div>

      <Card title="Profilo">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div><span className="text-gray-500">Premium:</span> {u.isPremium ? `Sì (${fmtDate(u.premiumSince)})` : 'No'}</div>
          <div><span className="text-gray-500">Email verif.:</span> {u.emailVerified ? 'Sì' : 'No'}</div>
          <div><span className="text-gray-500">Codice promo:</span> {u.promoCodeUsed || '—'}</div>
          <div><span className="text-gray-500">Sigarette/g:</span> {u.cigarettesPerDay ?? '—'}</div>
          <div><span className="text-gray-500">Quit date:</span> {fmtDate(u.quitDate)}</div>
          <div><span className="text-gray-500">Smoke-free dal:</span> {fmtDate(u.smokeFreeSince)}</div>
          <div><span className="text-gray-500">Citisina dal:</span> {fmtDate(u.cytisineStartDate)}</div>
          <div><span className="text-gray-500">SOS battuti:</span> {u.cravingsBattled}</div>
          <div><span className="text-gray-500">Chat usate:</span> {u.chatMessagesUsed}</div>
          <div><span className="text-gray-500">Grandfathered:</span> {u.freemiumGrandfathered ? 'Sì' : 'No'}</div>
          <div><span className="text-gray-500">Reasons:</span> {(u.quitReasons || []).join(', ') || '—'}</div>
          <div><span className="text-gray-500">Trigger:</span> {(u.criticalMoments || []).join(', ') || '—'}</div>
        </div>
      </Card>

      <Card title="Contatori">
        <div className="grid grid-cols-3 gap-2 text-xs">
          <Stat label="Eventi" value={data.counts.events} />
          <Stat label="Diary" value={data.counts.diaryEntries} />
          <Stat label="SOS" value={data.counts.cravingSessions} />
          <Stat label="Craving log" value={data.counts.cravingLogs} />
          <Stat label="Quit attempts" value={data.counts.quitAttempts} />
          <Stat label="Push subs" value={data.counts.pushSubscriptions} />
        </div>
      </Card>

      <Card title={`Timeline (${data.timeline.length})`}>
        {data.timeline.length === 0 ? (
          <p className="text-xs text-gray-500">Nessuna attività registrata</p>
        ) : (
          <ul className="text-xs space-y-1.5 max-h-[600px] overflow-y-auto">
            {data.timeline.map((t, i) => (
              <li key={i} className="flex items-start gap-2 border-b border-gray-50 pb-1">
                <span className="text-gray-400 shrink-0 w-24">{fmtDateTime(t.when)}</span>
                <span className={`shrink-0 text-[10px] uppercase px-1 rounded ${
                  t.source === 'event' ? 'bg-sky-100 text-sky-700' :
                  t.source === 'diary' ? 'bg-emerald-100 text-emerald-700' :
                  t.source === 'sos' ? 'bg-rose-100 text-rose-700' :
                  t.source === 'craving_log' ? 'bg-amber-100 text-amber-700' :
                  'bg-gray-100 text-gray-700'
                }`}>{t.source}</span>
                <span className="font-mono text-sage-700">{t.type}</span>
                {t.data && Object.keys(t.data).length > 0 && (
                  <span className="text-gray-500 truncate">
                    {Object.entries(t.data).slice(0, 4).map(([k, v]) =>
                      `${k}=${typeof v === 'object' ? JSON.stringify(v).slice(0, 30) : String(v).slice(0, 30)}`
                    ).join(' · ')}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
