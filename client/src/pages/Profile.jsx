import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  DEFAULT_SCHEDULE, getActivePhase, getDoseTimes,
  formatInterval, phaseDayRange, totalDays,
} from '../lib/cytisine';

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
  const [notifRegistered, setNotifRegistered] = useState(false);
  const [testResult, setTestResult] = useState('');

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  async function handleDeleteAccount() {
    if (deleteConfirmEmail.trim().toLowerCase() !== user.email.toLowerCase()) {
      setDeleteError('L\'email digitata non corrisponde.');
      return;
    }
    setDeleting(true);
    setDeleteError('');
    try {
      await api.auth.deleteAccount();
      logout();
      navigate('/login', { replace: true });
    } catch (err) {
      setDeleteError(err.message || 'Errore durante la cancellazione.');
      setDeleting(false);
    }
  }

  useEffect(() => {
    const supported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
    setNotifSupported(supported);
    const granted = Notification.permission === 'granted';
    setNotifEnabled(granted);
    if (supported && granted) registerSubscription();
  }, []);

  async function registerSubscription() {
    try {
      const { enabled, publicKey } = await api.notifications.vapidKey();
      if (!enabled || !publicKey) return;
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }
      await api.notifications.subscribe({
        endpoint: sub.endpoint,
        keys: {
          p256dh: btoa(String.fromCharCode(...new Uint8Array(sub.getKey('p256dh')))),
          auth: btoa(String.fromCharCode(...new Uint8Array(sub.getKey('auth')))),
        },
      });
      setNotifRegistered(true);
    } catch (err) {
      console.error('Push register error:', err);
    }
  }

  async function enableNotifications() {
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;
      setNotifEnabled(true);
      await registerSubscription();
    } catch (err) {
      console.error('Push subscribe error:', err);
    }
  }

  async function sendTestNotification() {
    setTestResult('Invio…');
    try {
      const res = await api.notifications.test();
      const ok = res.results?.some(r => r.status === 'ok');
      setTestResult(ok ? '✓ Notifica inviata! Controllare il telefono.' : '✗ Errore: ' + JSON.stringify(res));
    } catch (err) {
      setTestResult('✗ ' + err.message);
    }
    setTimeout(() => setTestResult(''), 6000);
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
  const [schedule, setSchedule] = useState(
    Array.isArray(user.cytisineSchedule) && user.cytisineSchedule.length > 0
      ? user.cytisineSchedule.map(p => ({ ...p }))
      : DEFAULT_SCHEDULE.map(p => ({ ...p }))
  );
  const [packPrice, setPackPrice] = useState(
    user.cigarettePackPrice != null ? String(user.cigarettePackPrice) : '5.80'
  );

  const isCustomSchedule = JSON.stringify(schedule) !== JSON.stringify(DEFAULT_SCHEDULE);

  function updatePhase(idx, field, value) {
    setSchedule(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  }

  function resetScheduleToDefault() {
    setSchedule(DEFAULT_SCHEDULE.map(p => ({ ...p })));
  }

  function daysFromQuitDate(quitDate) {
    if (!quitDate) return '';
    const d = Math.floor((Date.now() - new Date(quitDate)) / 86400000) + 1;
    return d > 0 ? String(d) : '';
  }
  const [smokeFreeDays, setSmokeFreeDays] = useState(daysFromQuitDate(user.quitDate));

  function toggleMoment(m) {
    setSelectedMoments(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
  }

  function addCustomMoment() {
    const val = customMoment.trim();
    if (val && !selectedMoments.includes(val)) setSelectedMoments(prev => [...prev, val]);
    setCustomMoment('');
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const days = parseInt(smokeFreeDays);
      const quitDate = smokeFreeDays && days > 0
        ? new Date(Date.now() - days * 86400000).toISOString()
        : undefined;

      const priceValue = parseFloat(packPrice);
      const validPrice = Number.isFinite(priceValue) && priceValue > 0;

      const { user: updated } = await api.quiz.save({
        cigarettesPerDay: cigarettesPerDay ? parseInt(cigarettesPerDay) : null,
        criticalMoments: selectedMoments,
        dependencyLevel: dependencyLevel || null,
        cytisineStartDate: cytisineStartDate || null,
        firstDoseTime: firstDoseTime || null,
        cytisineSchedule: isCustomSchedule ? schedule : null,
        ...(validPrice && { cigarettePackPrice: priceValue }),
        ...(quitDate !== undefined && { quitDate }),
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
    setSmokeFreeDays(daysFromQuitDate(user.quitDate));
    setSelectedMoments(user.criticalMoments || []);
    setDependencyLevel(user.dependencyLevel || null);
    setCytisineStartDate(user.cytisineStartDate ? new Date(user.cytisineStartDate).toISOString().split('T')[0] : '');
    setFirstDoseTime(user.firstDoseTime || '');
    setSchedule(
      Array.isArray(user.cytisineSchedule) && user.cytisineSchedule.length > 0
        ? user.cytisineSchedule.map(p => ({ ...p }))
        : DEFAULT_SCHEDULE.map(p => ({ ...p }))
    );
    setPackPrice(user.cigarettePackPrice != null ? String(user.cigarettePackPrice) : '5.80');
    setError('');
    setEditing(false);
  }

  const activeSchedule = Array.isArray(user.cytisineSchedule) && user.cytisineSchedule.length > 0
    ? user.cytisineSchedule
    : DEFAULT_SCHEDULE;
  const currentPhase = user.cytisineStartDate
    ? getActivePhase(activeSchedule, user.cytisineStartDate)
    : null;

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

      {!user.isPremium && (
        <button
          onClick={() => navigate('/paywall')}
          className="w-full mb-6 bg-sage-500 hover:bg-sage-600 text-white rounded-xl px-4 py-3.5 flex items-center justify-between transition-colors"
        >
          <div className="text-left">
            <p className="text-sm font-semibold">Sblocca QuitFresh</p>
            <p className="text-xs text-sage-100">€2.99 una tantum — accesso completo</p>
          </div>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {success && <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2 mb-4">{success}</p>}

      {/* Account */}
      <div className="bg-gray-50 rounded-xl px-4 py-4 mb-6">
        <div className="flex items-center justify-between mb-0.5">
          <p className="text-xs text-gray-500">Account</p>
          {user.isPremium && (
            <span className="px-2 py-0.5 bg-sage-500 text-white text-xs font-semibold rounded-full">
              Premium
            </span>
          )}
        </div>
        <p className="text-sm font-medium text-gray-800">{user.email}</p>
        <p className="text-xs text-gray-400 mt-0.5">Registrato il {new Date(user.createdAt).toLocaleDateString('it-IT')}</p>
        {user.isPremium && user.premiumSince && (
          <p className="text-xs text-sage-600 mt-1">
            Premium dal {new Date(user.premiumSince).toLocaleDateString('it-IT')}
          </p>
        )}
      </div>

      {/* Giorni senza fumo */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Giorni senza fumo</label>
        {editing ? (
          <div>
            <input
              type="number" min="0" max="3650"
              value={smokeFreeDays}
              onChange={e => setSmokeFreeDays(e.target.value)}
              placeholder="Es. 5"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sage-400 transition"
            />
            <p className="text-xs text-gray-400 mt-1">
              Inserisci il numero di giorni e l'app calcolerà la data di inizio.
            </p>
          </div>
        ) : (
          <p className="text-gray-800 text-sm">
            {daysFromQuitDate(user.quitDate)
              ? `${daysFromQuitDate(user.quitDate)} giorni`
              : '—'}
          </p>
        )}
      </div>

      {/* Citisina */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Protocollo citisina</label>
        {editing ? (
          <div className="space-y-4">
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

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-500">Fasi del protocollo ({totalDays(schedule)} giorni totali)</p>
                {isCustomSchedule && (
                  <button onClick={resetScheduleToDefault} className="text-xs text-sage-600 underline">
                    Ripristina standard
                  </button>
                )}
              </div>
              <div className="rounded-xl border border-gray-200 divide-y divide-gray-100">
                {schedule.map((phase, idx) => (
                  <div key={idx} className="px-3 py-3">
                    <p className="text-xs font-semibold text-gray-600 mb-2">
                      Fase {idx + 1} · giorni {phaseDayRange(schedule, idx)}
                    </p>
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      <label className="text-xs">
                        <span className="block text-gray-500 mb-0.5">Giorni</span>
                        <input
                          type="number" min="1" max="60"
                          value={phase.days}
                          onChange={e => updatePhase(idx, 'days', Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sage-400"
                        />
                      </label>
                      <label className="text-xs">
                        <span className="block text-gray-500 mb-0.5">Capsule/dì</span>
                        <input
                          type="number" min="1" max="12"
                          value={phase.pills}
                          onChange={e => updatePhase(idx, 'pills', Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sage-400"
                        />
                      </label>
                      <label className="text-xs">
                        <span className="block text-gray-500 mb-0.5">Intervallo (min)</span>
                        <input
                          type="number" min="0" max="1440" step="15"
                          value={phase.intervalMin}
                          onChange={e => updatePhase(idx, 'intervalMin', Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sage-400"
                        />
                      </label>
                    </div>
                    <label className="text-xs block">
                      <span className="block text-gray-500 mb-0.5">
                        Orario prima capsula
                        {!phase.firstDoseTime && firstDoseTime && (
                          <span className="ml-1 text-gray-400">(usa {firstDoseTime})</span>
                        )}
                      </span>
                      <div className="flex gap-1.5">
                        <input
                          type="time"
                          value={phase.firstDoseTime || ''}
                          onChange={e => updatePhase(idx, 'firstDoseTime', e.target.value || undefined)}
                          className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sage-400"
                        />
                        {phase.firstDoseTime && (
                          <button
                            type="button"
                            onClick={() => updatePhase(idx, 'firstDoseTime', undefined)}
                            className="px-2 text-xs text-gray-400 hover:text-gray-600"
                          >
                            ↺
                          </button>
                        )}
                      </div>
                    </label>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Il default è il protocollo Tabex standard. Modifica solo se il tuo medico ti ha prescritto qualcosa di diverso.
              </p>
            </div>
          </div>
        ) : (cytisineStartDate || user.cytisineStartDate) && (user.firstDoseTime || firstDoseTime) ? (
          <CytisineSchedule
            startDate={user.cytisineStartDate}
            firstDoseTime={user.firstDoseTime}
            schedule={activeSchedule}
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

      {/* Prezzo pacchetto */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Prezzo pacchetto (€)</label>
        {editing ? (
          <>
            <input
              type="number" min="0.5" max="50" step="0.10"
              value={packPrice}
              onChange={e => setPackPrice(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sage-400 transition"
            />
            <p className="text-xs text-gray-400 mt-1">Usato per calcolare il risparmio reale (default €5.80, pacchetto da 20).</p>
          </>
        ) : (
          <p className="text-gray-800 text-sm">
            €{(user.cigarettePackPrice ?? 5.80).toFixed(2)}
          </p>
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
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-semibold text-gray-700">Promemoria anti-craving</h2>
          {notifEnabled && (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${notifRegistered ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
              {notifRegistered ? 'Dispositivo registrato ✓' : 'Registrazione…'}
            </span>
          )}
        </div>
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
            <button onClick={sendTestNotification}
              className="mt-3 w-full py-2.5 border border-sage-300 text-sage-600 rounded-xl text-sm font-medium hover:bg-sage-50 transition-colors">
              Invia notifica di test
            </button>
            {testResult && (
              <p className={`mt-2 text-xs text-center ${testResult.startsWith('✓') ? 'text-green-600' : 'text-red-500'}`}>{testResult}</p>
            )}
          </>
        )}
      </div>

      {/* Logout */}
      <div className="border-t border-gray-100 pt-6">
        <button onClick={handleLogout} className="w-full py-3 text-sm text-red-500 hover:text-red-700 font-medium transition-colors">
          Esci dall'account
        </button>
      </div>

      {/* Zona pericolosa */}
      <div className="mt-8 pt-6 border-t border-gray-100">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Zona pericolosa</p>
        <button
          onClick={() => { setShowDeleteModal(true); setDeleteConfirmEmail(''); setDeleteError(''); }}
          className="text-xs text-gray-500 hover:text-red-600 underline transition-colors"
        >
          Elimina account
        </button>
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-6">
          <div className="bg-white rounded-2xl max-w-mobile w-full p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Eliminare l'account?</h3>
            <p className="text-sm text-gray-600 mb-4 leading-relaxed">
              Questa azione è <strong>irreversibile</strong>. Verranno cancellati:
              il tuo profilo, lo storico craving, il diario, i promemoria e tutte le
              statistiche. Non potrai recuperarli.
            </p>
            <label className="block text-xs text-gray-500 mb-1">
              Per confermare, digita la tua email <span className="font-medium">{user.email}</span>:
            </label>
            <input
              type="email"
              value={deleteConfirmEmail}
              onChange={(e) => setDeleteConfirmEmail(e.target.value)}
              placeholder={user.email}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-red-400"
              autoFocus
            />
            {deleteError && (
              <p className="text-xs text-red-600 bg-red-50 rounded-lg px-2 py-1.5 mb-3">{deleteError}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
              >
                Annulla
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting || deleteConfirmEmail.trim().toLowerCase() !== user.email.toLowerCase()}
                className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600 disabled:opacity-40 transition-colors"
              >
                {deleting ? 'Cancellazione…' : 'Elimina definitivamente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CytisineSchedule({ startDate, firstDoseTime, schedule, currentPhase }) {
  if (!firstDoseTime || !schedule) return null;

  const totalProtocolDays = totalDays(schedule);
  const endDate = startDate
    ? new Date(new Date(startDate).getTime() + (totalProtocolDays - 1) * 86400000)
    : null;

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      {/* Intestazione fase corrente */}
      {currentPhase && (
        <div className="bg-sage-500 px-4 py-3">
          <p className="text-white text-sm font-semibold">
            Giorno {currentPhase.day} · Fase {currentPhase.index + 1}
          </p>
          <p className="text-sage-100 text-xs mt-0.5">
            {currentPhase.pills} capsule al dì · 1 ogni {formatInterval(currentPhase.intervalMin)}
          </p>
        </div>
      )}

      {/* Date inizio / fine */}
      {startDate && endDate && (
        <div className="flex justify-between px-4 py-2 bg-gray-50 border-b border-gray-100 text-xs text-gray-500">
          <span>Inizio: <span className="font-medium text-gray-700">{new Date(startDate).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}</span></span>
          <span>Fine: <span className="font-medium text-gray-700">{endDate.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}</span></span>
        </div>
      )}

      {/* Prospetto fasi */}
      <div className="divide-y divide-gray-100">
        {schedule.map((phase, idx) => {
          const times = getDoseTimes(firstDoseTime, phase);
          const isCurrent = currentPhase?.index === idx;
          return (
            <div key={idx} className={`px-4 py-3 ${isCurrent ? 'bg-sage-50' : 'bg-white'}`}>
              <div className="flex items-baseline justify-between mb-1.5">
                <span className={`text-xs font-semibold ${isCurrent ? 'text-sage-700' : 'text-gray-500'}`}>
                  Gg {phaseDayRange(schedule, idx)}
                </span>
                <span className="text-xs text-gray-400">
                  {phase.pills} cps · ogni {formatInterval(phase.intervalMin)}
                </span>
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
