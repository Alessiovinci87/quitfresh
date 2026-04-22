import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

const CRITICAL_MOMENTS_OPTIONS = [
  'Caffè', 'Stress', 'Pausa lavoro', 'Dopo i pasti', 'Guida',
  'Alcol', 'Noia', 'Telefonate', 'Mattino al risveglio', 'Socialità',
];

const DEPENDENCY_LABELS = {
  1: 'Leggera',
  2: 'Moderata',
  3: 'Media',
  4: 'Alta',
  5: 'Molto alta',
};

export default function Profile() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Notifications state
  const [notifTimes, setNotifTimes] = useState(user.notificationTimes || []);
  const [newTime, setNewTime] = useState('');
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [notifSupported, setNotifSupported] = useState(false);
  const [notifSaving, setNotifSaving] = useState(false);

  useEffect(() => {
    setNotifSupported('Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window);
    setNotifEnabled(Notification.permission === 'granted');
  }, []);

  async function enableNotifications() {
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;
      setNotifEnabled(true);

      const { enabled, publicKey } = await api.notifications.vapidKey();
      if (!enabled || !publicKey) return;

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      await api.notifications.subscribe({ endpoint: sub.endpoint, keys: { p256dh: btoa(String.fromCharCode(...new Uint8Array(sub.getKey('p256dh')))), auth: btoa(String.fromCharCode(...new Uint8Array(sub.getKey('auth')))) } });
    } catch (err) {
      console.error('Push subscribe error:', err);
    }
  }

  async function saveNotifTimes(times) {
    setNotifSaving(true);
    try {
      const { user: updated } = await api.notifications.saveTimes(times);
      updateUser(updated);
      setNotifTimes(times);
    } catch (err) {
      console.error(err);
    } finally {
      setNotifSaving(false);
    }
  }

  function addTime() {
    if (!newTime || notifTimes.includes(newTime)) return;
    const updated = [...notifTimes, newTime].sort();
    setNewTime('');
    saveNotifTimes(updated);
  }

  function removeTime(t) {
    saveNotifTimes(notifTimes.filter(x => x !== t));
  }

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const [cigarettesPerDay, setCigarettesPerDay] = useState(String(user.cigarettesPerDay || ''));
  const [selectedMoments, setSelectedMoments] = useState(user.criticalMoments || []);
  const [customMoment, setCustomMoment] = useState('');
  const [dependencyLevel, setDependencyLevel] = useState(user.dependencyLevel || null);

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

  async function handleSave() {
    if (!cigarettesPerDay || !dependencyLevel) {
      setError('Compila tutti i campi obbligatori');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const { user: updated } = await api.quiz.save({
        cigarettesPerDay: parseInt(cigarettesPerDay),
        criticalMoments: selectedMoments,
        dependencyLevel,
      });
      updateUser(updated);
      setEditing(false);
      setSuccess('Profilo aggiornato');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setCigarettesPerDay(String(user.cigarettesPerDay || ''));
    setSelectedMoments(user.criticalMoments || []);
    setDependencyLevel(user.dependencyLevel || null);
    setError('');
    setEditing(false);
  }

  return (
    <div className="px-6 py-8 animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-xl font-bold text-gray-900">Il tuo profilo</h1>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="text-sm text-sage-600 font-medium hover:text-sage-700 transition-colors"
          >
            Modifica
          </button>
        )}
      </div>

      {success && (
        <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2 mb-4">{success}</p>
      )}

      {/* Account info */}
      <div className="bg-gray-50 rounded-xl px-4 py-4 mb-6">
        <p className="text-xs text-gray-500 mb-0.5">Account</p>
        <p className="text-sm font-medium text-gray-800">{user.email}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          Registrato il {new Date(user.createdAt).toLocaleDateString('it-IT')}
        </p>
      </div>

      {/* Sigarette */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Sigarette al giorno
        </label>
        {editing ? (
          <input
            type="number"
            min="1"
            max="100"
            value={cigarettesPerDay}
            onChange={(e) => setCigarettesPerDay(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sage-400 transition"
          />
        ) : (
          <p className="text-gray-800 text-sm">{user.cigarettesPerDay ?? '—'}</p>
        )}
      </div>

      {/* Momenti critici */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Momenti critici
        </label>
        {editing ? (
          <>
            <div className="flex flex-wrap gap-2 mb-2">
              {CRITICAL_MOMENTS_OPTIONS.map((m) => (
                <button
                  key={m}
                  onClick={() => toggleMoment(m)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    selectedMoments.includes(m)
                      ? 'bg-sage-500 border-sage-500 text-white'
                      : 'border-gray-200 text-gray-600 hover:border-sage-300'
                  }`}
                >
                  {m}
                </button>
              ))}
              {selectedMoments
                .filter((s) => !CRITICAL_MOMENTS_OPTIONS.includes(s))
                .map((m) => (
                  <button
                    key={m}
                    onClick={() => toggleMoment(m)}
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
                onChange={(e) => setCustomMoment(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomMoment())}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sage-400"
                placeholder="Altro…"
              />
              <button
                onClick={addCustomMoment}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                +
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {(user.criticalMoments || []).length === 0 ? (
              <p className="text-gray-400 text-sm">Nessuno impostato</p>
            ) : (
              user.criticalMoments.map((m) => (
                <span key={m} className="px-3 py-1 rounded-full bg-sage-50 text-sage-700 text-xs font-medium border border-sage-200">
                  {m}
                </span>
              ))
            )}
          </div>
        )}
      </div>

      {/* Livello dipendenza */}
      <div className="mb-8">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Livello di dipendenza
        </label>
        {editing ? (
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map((level) => (
              <button
                key={level}
                onClick={() => setDependencyLevel(level)}
                className={`py-2.5 rounded-xl text-sm font-bold border transition-colors ${
                  dependencyLevel === level
                    ? 'bg-sage-500 border-sage-500 text-white'
                    : 'border-gray-200 text-gray-600 hover:border-sage-300'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-gray-800 text-sm">
            {user.dependencyLevel
              ? `${user.dependencyLevel} — ${DEPENDENCY_LABELS[user.dependencyLevel]}`
              : '—'}
          </p>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">{error}</p>
      )}

      {editing && (
        <div className="flex gap-3 mb-8">
          <button onClick={handleCancel} className="flex-1 py-3.5 border border-gray-200 text-gray-600 rounded-xl font-medium text-sm hover:bg-gray-50 transition-colors">
            Annulla
          </button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-3.5 bg-sage-500 text-white rounded-xl font-semibold text-sm hover:bg-sage-600 disabled:opacity-60 transition-colors">
            {saving ? 'Salvataggio…' : 'Salva'}
          </button>
        </div>
      )}

      {/* Promemoria notifiche */}
      <div className="mb-8 border-t border-gray-100 pt-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-1">Promemoria</h2>
        <p className="text-xs text-gray-400 mb-4">
          Ricevi una notifica push nei tuoi momenti critici.
        </p>

        {!notifSupported ? (
          <p className="text-xs text-gray-400">Le notifiche non sono supportate su questo dispositivo/browser.</p>
        ) : !notifEnabled ? (
          <button onClick={enableNotifications} className="w-full py-3 border border-sage-300 text-sage-600 rounded-xl text-sm font-medium hover:bg-sage-50 transition-colors">
            Attiva notifiche
          </button>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 mb-3">
              {notifTimes.map(t => (
                <span key={t} className="flex items-center gap-1.5 px-3 py-1.5 bg-sage-50 border border-sage-200 rounded-full text-xs font-medium text-sage-700">
                  {t}
                  <button onClick={() => removeTime(t)} className="text-sage-400 hover:text-sage-600 leading-none">✕</button>
                </span>
              ))}
              {notifTimes.length === 0 && <p className="text-xs text-gray-400">Nessun orario impostato</p>}
            </div>
            <div className="flex gap-2">
              <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sage-400" />
              <button onClick={addTime} disabled={!newTime || notifSaving}
                className="px-4 py-2 bg-sage-500 text-white rounded-xl text-sm font-medium hover:bg-sage-600 disabled:opacity-50 transition-colors">
                {notifSaving ? '…' : 'Aggiungi'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Logout */}
      <div className="border-t border-gray-100 pt-6">
        <button onClick={handleLogout} className="w-full py-3 text-sm text-red-500 hover:text-red-700 font-medium transition-colors">
          Esci dall'account
        </button>
      </div>
    </div>
  );
}
