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
  1: 'Leggera', 2: 'Moderata', 3: 'Media', 4: 'Alta', 5: 'Molto alta',
};

const CYTISINE_PHASES = [
  { maxDay: 3,  days: '1–3',   label: 'Fase 1', pills: 6, intervalMin: 120, intervalLabel: '2 ore' },
  { maxDay: 12, days: '4–12',  label: 'Fase 2', pills: 5, intervalMin: 150, intervalLabel: '2,5 ore' },
  { maxDay: 16, days: '13–16', label: 'Fase 3', pills: 4, intervalMin: 180, intervalLabel: '3 ore' },
  { maxDay: 20, days: '17–20', label: 'Fase 4', pills: 3, intervalMin: 300, intervalLabel: '5 ore' },
  { maxDay: 25, days: '21–25', label: 'Fase 5', pills: 1, intervalMin: 0,   intervalLabel: 'al giorno' },
];

function getDoseTimes(firstDoseTime, phase) {
  const [h, m] = firstDoseTime.split(':').map(Number);
  const firstMin = h * 60 + m;
  const times = [];
  for (let i = 0; i < phase.pills; i++) {
    const total = firstMin + i * phase.intervalMin;
    if (total >= 1440) break;
    const hh = String(Math.floor(total / 60)).padStart(2, '0');
    const mm = String(total % 60).padStart(2, '0');
    times.push(`${hh}:${mm}`);
  }
  return times;
}

function getCurrentPhase(startDate) {
  if (!startDate) return null;
  const day = Math.floor((Date.now() - new Date(startDate)) / 86400000) + 1;
  if (day < 1 || day > 25) return null;
  const phase = CYTISINE_PHASES.find(p => day <= p.maxDay);
  return phase ? { day, ...phase } : null;
}

export default function Profile() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
      await api.notifications.subscribe({
        endpoint: sub.endpoint,
        keys: {
          p256dh: btoa(String.fromCharCode(...new Uint8Array(sub.getKey('p256dh')))),
          auth: btoa(String.fromCharCode(...new Uint8Array(sub.getKey('auth')))),
        },
      });
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
  const [cytisineStartDate, setCytisineStartDate] = useState(
    user.cytisineStartDate ? new Date(user.cytisineStartDate).toISOString().split('T')[0] : ''
  );
  const [firstDoseTime, setFirstDoseTime] = useState(user.firstDoseTime || '');

  function toggleMoment(m) {
    setSelectedMoments(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
  }

  function addCustomMoment() {
    const val = customMoment.trim();
    if (val && !selectedMoments.includes(val)) setSelectedMoments(prev => [...prev, val]);
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
        cytisineStartDate: cytisineStartDate || null,
        firstDoseTime: firstDoseTime || null,
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
    setCytisineStartDate(user.cytisineStartDate ? new Date(user.cytisineStartDate).toISOString().split('T')[0] : '');
    setFirstDoseTime(user.firstDoseTime || '');
    setError('');
    setEditing(false);
  }

  const currentPhase = getCurrentPhase(user.cytisineStartDate);

  return (
    <div className="px-6 py-8 animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-xl font-bold text-gray-900">Il tuo profilo</h1>
        {!editing && (
          <button onClick={() => setEditing(true)} className="text-sm text-sage-600 font-medium hover:text-sage-700 transition-colors">
            Modifica
          </button>
        )}
      </div>

      {success && <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2 mb-4">{success}</p>}

      {/* Account */}
      <div className="bg-gray-50 rounded-xl px-4 py-4 mb-6">
        <p className="text-xs text-gray-500 mb-0.5">Account</p>
        <p className="text-sm font-medium text-gray-800">{user.email}</p>
        <p className="text-xs text-gray-400 mt-0.5">Registrato il {new Date(user.createdAt).toLocaleDateString('it-IT')}</p>
      </div>

      {/* Citisina */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Protocollo citisina</label>
        {editing ? (
          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-500 mb-1">Data inizio</p>
              <input type="date" value={cytisineStartDate} onChange={e => setCytisineStartDate(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sage-400 transition" />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Orario prima capsula del giorno</p>
              <input type="time" value={firstDoseTime} onChange={e => setFirstDoseTime(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sage-400 transition" />
            </div>
          </div>
        ) : (cytisineStartDate || user.cytisineStartDate) && (user.firstDoseTime || firstDoseTime) ? (
          <CytisineSchedule
            startDate={user.cytisineStartDate}
            firstDoseTime={user.firstDoseTime}
            currentPhase={currentPhase}
          />
        ) : (
          <p className="text-gray-400 text-sm">Non impostato — clicca Modifica</p>
        )}
      </div>

      {/* Sigarette */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Sigarette al giorno</label>
        {editing ? (
          <input type="number" min="1" max="100" value={cigarettesPerDay} onChange={e => setCigarettesPerDay(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sage-400 transition" />
        ) : (
          <p className="text-gray-800 text-sm">{user.cigarettesPerDay ?? '—'}</p>
        )}
      </div>

      {/* Momenti critici */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Momenti critici</label>
        {editing ? (
          <>
            <div className="flex flex-wrap gap-2 mb-2">
              {CRITICAL_MOMENTS_OPTIONS.map(m => (
                <button key={m} onClick={() => toggleMoment(m)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${selectedMoments.includes(m) ? 'bg-sage-500 border-sage-500 text-white' : 'border-gray-200 text-gray-600 hover:border-sage-300'}`}>
                  {m}
                </button>
              ))}
              {selectedMoments.filter(s => !CRITICAL_MOMENTS_OPTIONS.includes(s)).map(m => (
                <button key={m} onClick={() => toggleMoment(m)}
                  className="px-3 py-1.5 rounded-full text-sm font-medium border bg-sage-500 border-sage-500 text-white">
                  {m}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input type="text" value={customMoment} onChange={e => setCustomMoment(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomMoment())}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sage-400"
                placeholder="Altro…" />
              <button onClick={addCustomMoment} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors">+</button>
            </div>
          </>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {(user.criticalMoments || []).length === 0 ? (
              <p className="text-gray-400 text-sm">Nessuno impostato</p>
            ) : (
              user.criticalMoments.map(m => (
                <span key={m} className="px-3 py-1 rounded-full bg-sage-50 text-sage-700 text-xs font-medium border border-sage-200">{m}</span>
              ))
            )}
          </div>
        )}
      </div>

      {/* Livello dipendenza */}
      <div className="mb-8">
        <label className="block text-sm font-medium text-gray-700 mb-2">Livello di dipendenza</label>
        {editing ? (
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map(level => (
              <button key={level} onClick={() => setDependencyLevel(level)}
                className={`py-2.5 rounded-xl text-sm font-bold border transition-colors ${dependencyLevel === level ? 'bg-sage-500 border-sage-500 text-white' : 'border-gray-200 text-gray-600 hover:border-sage-300'}`}>
                {level}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-gray-800 text-sm">{user.dependencyLevel ? `${user.dependencyLevel} — ${DEPENDENCY_LABELS[user.dependencyLevel]}` : '—'}</p>
        )}
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">{error}</p>}

      {editing && (
        <div className="flex gap-3 mb-8">
          <button onClick={handleCancel} className="flex-1 py-3.5 border border-gray-200 text-gray-600 rounded-xl font-medium text-sm hover:bg-gray-50 transition-colors">Annulla</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-3.5 bg-sage-500 text-white rounded-xl font-semibold text-sm hover:bg-sage-600 disabled:opacity-60 transition-colors">
            {saving ? 'Salvataggio…' : 'Salva'}
          </button>
        </div>
      )}

      {/* Promemoria anti-craving */}
      <div className="mb-8 border-t border-gray-100 pt-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-1">Promemoria anti-craving</h2>
        <p className="text-xs text-gray-400 mb-4">Notifiche di supporto nei tuoi momenti critici.</p>

        {!notifSupported ? (
          <p className="text-xs text-gray-400">Notifiche non supportate su questo dispositivo.</p>
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

function CytisineSchedule({ startDate, firstDoseTime, currentPhase }) {
  if (!firstDoseTime) return null;

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      {/* Intestazione fase corrente */}
      {currentPhase && (
        <div className="bg-sage-500 px-4 py-3">
          <p className="text-white text-sm font-semibold">Giorno {currentPhase.day} · {currentPhase.label}</p>
          <p className="text-sage-100 text-xs mt-0.5">{currentPhase.pills} capsule al dì · 1 ogni {currentPhase.intervalLabel}</p>
        </div>
      )}

      {/* Prospetto fasi */}
      <div className="divide-y divide-gray-100">
        {CYTISINE_PHASES.map(phase => {
          const times = getDoseTimes(firstDoseTime, phase);
          const isCurrent = currentPhase?.maxDay === phase.maxDay;
          return (
            <div key={phase.maxDay} className={`px-4 py-3 ${isCurrent ? 'bg-sage-50' : 'bg-white'}`}>
              <div className="flex items-baseline justify-between mb-1.5">
                <span className={`text-xs font-semibold ${isCurrent ? 'text-sage-700' : 'text-gray-500'}`}>
                  Gg {phase.days}
                </span>
                <span className="text-xs text-gray-400">{phase.pills} cps · ogni {phase.intervalLabel}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {times.map(t => (
                  <span key={t} className={`px-2 py-0.5 rounded-full text-xs font-medium ${isCurrent ? 'bg-sage-200 text-sage-800' : 'bg-gray-100 text-gray-600'}`}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
