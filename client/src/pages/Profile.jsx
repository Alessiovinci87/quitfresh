import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import InstallApp from '../components/InstallApp';
import SubPage from '../components/SubPage';
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
  const [subPage, setSubPage] = useState(null); // 'profile' | 'habits' | 'notifications' | 'install' | null

  // Modali
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const [showResetHistoryModal, setShowResetHistoryModal] = useState(false);
  const [resettingHistory, setResettingHistory] = useState(false);
  const [resetHistoryResult, setResetHistoryResult] = useState('');

  async function handleResetHistory() {
    setResettingHistory(true);
    try {
      const { deleted } = await api.relapse.resetHistory();
      setResetHistoryResult(`Cronologia svuotata (${deleted} ${deleted === 1 ? 'tentativo cancellato' : 'tentativi cancellati'}).`);
      setShowResetHistoryModal(false);
      setTimeout(() => setResetHistoryResult(''), 4000);
    } catch (err) {
      setResetHistoryResult('Errore: ' + (err.message || 'riprova'));
    } finally {
      setResettingHistory(false);
    }
  }

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

  function handleLogout() {
    logout();
    navigate('/login');
  }

  // Stato premium quick summary
  const activeSchedule = Array.isArray(user.cytisineSchedule) && user.cytisineSchedule.length > 0
    ? user.cytisineSchedule
    : DEFAULT_SCHEDULE;
  const currentPhase = user.cytisineStartDate
    ? getActivePhase(activeSchedule, user.cytisineStartDate)
    : null;

  return (
    <div className="min-h-[calc(100dvh-7rem)] flex flex-col px-6 pt-6 animate-fade-in">
      <header className="mb-4">
        <p className="text-[10px] uppercase tracking-[0.2em] text-sage-600/70 font-semibold">Account</p>
        <h1 className="font-display text-3xl font-semibold text-sage-900 leading-tight truncate mt-0.5">
          {user.email.split('@')[0]}
        </h1>
      </header>

      {/* Email + premium status */}
      <div className="bg-white rounded-2xl-soft shadow-soft border border-sage-100/60 p-4 mb-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[10px] uppercase tracking-wider text-sage-600/70 font-semibold">Email</p>
          {user.isPremium ? (
            <span className="px-2 py-0.5 bg-gradient-to-br from-sage-500 to-sage-700 text-white text-[10px] font-semibold rounded-full shadow-sage">
              ✓ Premium
            </span>
          ) : (
            <button
              onClick={() => navigate('/paywall')}
              className="px-2 py-0.5 bg-terracotta-100 text-terracotta-700 text-[10px] font-semibold rounded-full hover:bg-terracotta-200 transition-colors"
            >
              Sblocca →
            </button>
          )}
        </div>
        <p className="text-sm text-sage-900 truncate">{user.email}</p>
        <p className="text-[11px] text-sage-600/70 mt-0.5">
          Registrato il {new Date(user.createdAt).toLocaleDateString('it-IT')}
        </p>
      </div>

      {!user.isPremium ? (
        <button
          onClick={() => navigate('/paywall')}
          className="w-full mb-4 bg-gradient-to-br from-sage-500 to-sage-700 text-white rounded-2xl-soft px-4 py-3.5 flex items-center justify-between shadow-sage active:scale-[0.98] transition-all"
        >
          <div className="text-left">
            <p className="text-sm font-semibold">Sblocca QuitFresh</p>
            <p className="text-xs text-sage-100">€2.99 una tantum — accesso completo</p>
          </div>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      ) : (
        <>
          {/* Lista nav settings */}
          <div className="space-y-2 mb-4">
            <NavRow
              icon="👤"
              title="Profilo"
              value={user.email}
              onClick={() => setSubPage('profile')}
            />
            <NavRow
              icon="🌱"
              title="Gestione abitudini"
              value={
                currentPhase
                  ? `${user.cigarettesPerDay || '—'} sig/die · citisina G${currentPhase.day}·F${currentPhase.index + 1}`
                  : `${user.cigarettesPerDay || '—'} sig/die · €${(user.cigarettePackPrice ?? 5.80).toFixed(2)}/pacc`
              }
              onClick={() => setSubPage('habits')}
            />
            <NavRow
              icon="🔔"
              title="Notifiche"
              value={
                (user.notificationTimes?.length || user.encouragementTime)
                  ? [
                      user.notificationTimes?.length && `${user.notificationTimes.length} anti-craving`,
                      user.encouragementTime && `incoraggiamento ${user.encouragementTime}`,
                    ].filter(Boolean).join(' · ')
                  : 'Nessuna attiva'
              }
              onClick={() => setSubPage('notifications')}
            />
            <NavRow
              icon="📜"
              title="Cronologia tentativi"
              value="Azzera Record e tentativi"
              onClick={() => setShowResetHistoryModal(true)}
            />
            <NavRow
              icon="📱"
              title="Installa sul telefono"
              value="iOS · Android · PWA"
              onClick={() => setSubPage('install')}
            />
          </div>
        </>
      )}

      {resetHistoryResult && (
        <p className={`text-xs mb-3 px-3 py-2 rounded-lg ${resetHistoryResult.startsWith('Errore') ? 'text-terracotta-700 bg-terracotta-50' : 'text-sage-700 bg-sage-50'}`}>
          {resetHistoryResult}
        </p>
      )}

      {/* Footer azioni: privacy/terms + logout */}
      <div className="mt-auto space-y-2 pb-3">
        <div className="flex items-center justify-center gap-4 text-[11px] text-sage-600/70">
          <Link to="/privacy" className="hover:text-sage-800 transition-colors underline-offset-2 hover:underline">Privacy</Link>
          <span>·</span>
          <Link to="/terms" className="hover:text-sage-800 transition-colors underline-offset-2 hover:underline">Termini</Link>
        </div>
        <button
          onClick={handleLogout}
          className="w-full py-3 text-sm text-sage-700 font-medium hover:bg-sage-50 rounded-xl-soft transition-colors"
        >
          Esci dall'account
        </button>
        <button
          onClick={() => api.auth.exportData().catch(err => alert('Errore export: ' + err.message))}
          className="w-full py-2 text-[11px] text-sage-600/70 hover:text-sage-800 transition-colors underline underline-offset-2"
        >
          Esporta i miei dati (GDPR)
        </button>
        <button
          onClick={() => { setShowDeleteModal(true); setDeleteConfirmEmail(''); setDeleteError(''); }}
          className="w-full py-2 text-[11px] text-sage-500/70 hover:text-terracotta-600 transition-colors underline underline-offset-2"
        >
          Elimina account
        </button>
      </div>

      {/* Sub-pages */}
      {subPage === 'profile' && (
        <ProfileAccountSubPage
          user={user}
          onClose={() => setSubPage(null)}
        />
      )}
      {subPage === 'habits' && (
        <HabitsSubPage
          user={user}
          updateUser={updateUser}
          onClose={() => setSubPage(null)}
        />
      )}
      {subPage === 'notifications' && (
        <NotificationsSubPage
          user={user}
          updateUser={updateUser}
          onClose={() => setSubPage(null)}
        />
      )}
      {subPage === 'install' && (
        <SubPage eyebrow="Account" title="Installa sul telefono" onClose={() => setSubPage(null)}>
          <InstallApp mode="section" />
        </SubPage>
      )}

      {/* Modali */}
      {showResetHistoryModal && (
        <div className="fixed inset-0 z-50 bg-sage-900/40 backdrop-blur-sm flex items-end justify-center px-4 pb-8 animate-fade-in">
          <div className="bg-white rounded-2xl-soft max-w-mobile w-full p-6 shadow-lift animate-slide-up">
            <h3 className="font-display text-xl font-semibold text-sage-900 mb-2">Azzerare la cronologia?</h3>
            <p className="text-sm text-sage-700/80 mb-6 leading-relaxed">
              Tutti i tentativi precedenti vengono cancellati definitivamente. Il Record verrà azzerato.
              <span className="block mt-2 text-[11px] text-sage-600/70">
                Lo streak attuale (giorni senza fumo) NON viene toccato.
              </span>
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowResetHistoryModal(false)}
                disabled={resettingHistory}
                className="flex-1 py-3 border border-sage-200 text-sage-700 rounded-xl-soft font-medium text-sm hover:bg-sage-50 transition-colors active:scale-[0.98]"
              >
                Annulla
              </button>
              <button
                onClick={handleResetHistory}
                disabled={resettingHistory}
                className="flex-1 py-3 bg-terracotta-500 text-white rounded-xl-soft font-semibold text-sm hover:bg-terracotta-600 disabled:opacity-60 transition-colors active:scale-[0.98]"
              >
                {resettingHistory ? 'Azzero…' : 'Sì, azzera'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-sage-900/40 backdrop-blur-sm flex items-center justify-center px-6">
          <div className="bg-white rounded-2xl-soft max-w-mobile w-full p-6 shadow-lift">
            <h3 className="font-display text-xl font-semibold text-sage-900 mb-2">Eliminare l'account?</h3>
            <p className="text-sm text-sage-700/80 mb-4 leading-relaxed">
              Questa azione è <strong>irreversibile</strong>. Verranno cancellati: il tuo profilo, lo storico craving, il diario, i promemoria e tutte le statistiche.
            </p>
            <label className="block text-xs text-sage-600/70 mb-1">
              Per confermare, digita: <span className="font-medium text-sage-800">{user.email}</span>
            </label>
            <input
              type="email"
              value={deleteConfirmEmail}
              onChange={(e) => setDeleteConfirmEmail(e.target.value)}
              placeholder={user.email}
              className="w-full px-3 py-2.5 border border-sage-200 rounded-xl-soft text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-terracotta-400"
              autoFocus
            />
            {deleteError && (
              <p className="text-xs text-terracotta-700 bg-terracotta-50 rounded-lg px-2 py-1.5 mb-3">{deleteError}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="flex-1 py-2.5 border border-sage-200 text-sage-700 rounded-xl-soft text-sm font-medium hover:bg-sage-50 disabled:opacity-50"
              >
                Annulla
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting || deleteConfirmEmail.trim().toLowerCase() !== user.email.toLowerCase()}
                className="flex-1 py-2.5 bg-terracotta-500 text-white rounded-xl-soft text-sm font-semibold hover:bg-terracotta-600 disabled:opacity-40 transition-colors"
              >
                {deleting ? 'Cancellazione…' : 'Elimina'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── NavRow: riga settings stile iOS ──────────────────────────
function NavRow({ icon, title, value, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-2xl-soft border border-sage-100/60 shadow-soft px-4 py-3.5 flex items-center gap-3 active:bg-sage-50/40 transition-colors"
    >
      <span className="w-10 h-10 rounded-xl bg-sage-50 flex items-center justify-center text-xl shrink-0">
        {icon}
      </span>
      <div className="flex-1 min-w-0 text-left">
        <p className="font-display text-base font-semibold text-sage-900 leading-tight">{title}</p>
        <p className="text-[11px] text-sage-600/70 mt-0.5 truncate">{value}</p>
      </div>
      <svg className="w-5 h-5 text-sage-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );
}

// ── ProfileAccountSubPage: solo dati account (email, cambia password) ─
function ProfileAccountSubPage({ user, onClose }) {
  return (
    <SubPage eyebrow="Account" title="Profilo" onClose={onClose}>
      <div className="space-y-5">
        <Field label="Email">
          <div className="bg-white border border-sage-100 rounded-xl-soft px-4 py-3 shadow-soft">
            <p className="text-sm text-sage-900">{user.email}</p>
            <p className="text-[11px] text-sage-600/70 mt-0.5">
              {user.emailVerified ? '✓ Verificata' : 'Non ancora verificata'}
            </p>
          </div>
        </Field>

        <Field label="Password" hint="Per cambiare la password, ti invieremo un link di reset via email.">
          <Link
            to="/forgot-password"
            className="block w-full text-center py-3 border border-sage-200 text-sage-700 rounded-xl-soft font-medium text-sm hover:bg-sage-50 transition-colors"
          >
            Cambia password
          </Link>
        </Field>

        <Field label="Registrato">
          <p className="text-sm text-sage-700">
            {new Date(user.createdAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </Field>

        {user.isPremium && user.premiumSince && (
          <Field label="Premium dal">
            <p className="text-sm text-sage-700">
              {new Date(user.premiumSince).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </Field>
        )}
      </div>
    </SubPage>
  );
}

// ── HabitsSubPage: gestione abitudini + protocollo citisina ─────
function HabitsSubPage({ user, updateUser, onClose }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [cigarettesPerDay, setCigarettesPerDay] = useState(String(user.cigarettesPerDay || ''));
  const [packPrice, setPackPrice] = useState(user.cigarettePackPrice != null ? String(user.cigarettePackPrice) : '5.80');
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

  function daysFromQuitDate(quitDate) {
    if (!quitDate) return '';
    const d = Math.floor((Date.now() - new Date(quitDate)) / 86400000) + 1;
    return d > 0 ? String(d) : '';
  }
  const [smokeFreeDays, setSmokeFreeDays] = useState(daysFromQuitDate(user.quitDate));

  const isCustomSchedule = JSON.stringify(schedule) !== JSON.stringify(DEFAULT_SCHEDULE);

  function updatePhase(idx, field, value) {
    setSchedule(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  }
  function resetScheduleToDefault() {
    setSchedule(DEFAULT_SCHEDULE.map(p => ({ ...p })));
  }
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
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <SubPage eyebrow="Account" title="Gestione abitudini" onClose={onClose}>
      <div className="space-y-5">
        <Field label="Sigarette al giorno">
          <input
            type="number" min="1" max="100"
            value={cigarettesPerDay}
            onChange={e => setCigarettesPerDay(e.target.value)}
            className="w-full px-4 py-3 border border-sage-200 rounded-xl-soft text-sm focus:outline-none focus:ring-2 focus:ring-sage-400 bg-white"
          />
        </Field>

        <Field label="Prezzo pacchetto (€)" hint="Default €5.80 — pacchetto da 20 sigarette. Usato per calcolare il risparmio.">
          <input
            type="number" min="0.5" max="50" step="0.10"
            value={packPrice}
            onChange={e => setPackPrice(e.target.value)}
            className="w-full px-4 py-3 border border-sage-200 rounded-xl-soft text-sm focus:outline-none focus:ring-2 focus:ring-sage-400 bg-white"
          />
        </Field>

        <Field label="Giorni senza fumo" hint="Inserisci i giorni e l'app calcolerà la data di inizio.">
          <input
            type="number" min="0" max="3650"
            value={smokeFreeDays}
            onChange={e => setSmokeFreeDays(e.target.value)}
            placeholder="Es. 5"
            className="w-full px-4 py-3 border border-sage-200 rounded-xl-soft text-sm focus:outline-none focus:ring-2 focus:ring-sage-400 bg-white"
          />
        </Field>

        <Field label="Momenti critici">
          <div className="flex flex-wrap gap-2 mb-2">
            {CRITICAL_MOMENTS_OPTIONS.map(m => (
              <button
                key={m}
                onClick={() => toggleMoment(m)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all active:scale-95 ${
                  selectedMoments.includes(m)
                    ? 'bg-gradient-to-br from-sage-500 to-sage-700 border-transparent text-white shadow-sage'
                    : 'border-sage-200 text-sage-700 bg-white hover:bg-sage-50'
                }`}
              >
                {m}
              </button>
            ))}
            {selectedMoments.filter(s => !CRITICAL_MOMENTS_OPTIONS.includes(s)).map(m => (
              <button
                key={m}
                onClick={() => toggleMoment(m)}
                className="px-3 py-1.5 rounded-full text-sm font-medium border border-transparent bg-gradient-to-br from-sage-500 to-sage-700 text-white shadow-sage"
              >
                {m}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={customMoment}
              onChange={e => setCustomMoment(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomMoment())}
              className="flex-1 min-w-0 px-3 py-2 border border-sage-200 rounded-xl-soft text-sm focus:outline-none focus:ring-2 focus:ring-sage-400 bg-white"
              placeholder="Altro…"
            />
            <button
              onClick={addCustomMoment}
              className="px-4 py-2 bg-white border border-sage-200 text-sage-700 rounded-xl-soft text-sm font-medium hover:bg-sage-50 transition-colors"
            >
              Aggiungi
            </button>
          </div>
        </Field>

        <Field label="Livello di dipendenza">
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map(level => (
              <button
                key={level}
                onClick={() => setDependencyLevel(level)}
                className={`py-2.5 rounded-xl-soft text-sm font-bold border transition-all active:scale-95 ${
                  dependencyLevel === level
                    ? 'bg-gradient-to-br from-sage-500 to-sage-700 border-transparent text-white shadow-sage'
                    : 'border-sage-200 text-sage-700 bg-white hover:bg-sage-50'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
          {dependencyLevel && (
            <p className="text-[11px] text-sage-600/70 mt-2">{dependencyLevel} — {DEPENDENCY_LABELS[dependencyLevel]}</p>
          )}
        </Field>

        {/* Protocollo citisina */}
        <div className="pt-2 border-t border-sage-100/60">
          <p className="text-[11px] uppercase tracking-wider text-sage-600/70 font-semibold mb-3">Protocollo citisina</p>

          {typeof Notification !== 'undefined' && Notification.permission !== 'granted' && (
            <div className="mb-4 p-3 bg-terracotta-50 border border-terracotta-200 rounded-xl-soft">
              <p className="text-xs text-terracotta-700 leading-relaxed">
                <strong>Promemoria farmaco non ancora attivi.</strong> Gli orari qui sotto da soli non bastano: per ricevere le notifiche di assunzione vai in <strong>Profilo → Notifiche</strong> e premi <em>“Attiva notifiche”</em>.
              </p>
            </div>
          )}

          <Field label="Data inizio">
            <input
              type="date"
              value={cytisineStartDate}
              onChange={e => setCytisineStartDate(e.target.value)}
              className="w-full px-4 py-3 border border-sage-200 rounded-xl-soft text-sm focus:outline-none focus:ring-2 focus:ring-sage-400 bg-white"
            />
          </Field>

          <Field label="Orario prima capsula del giorno">
            <input
              type="time"
              value={firstDoseTime}
              onChange={e => setFirstDoseTime(e.target.value)}
              className="w-full px-4 py-3 border border-sage-200 rounded-xl-soft text-sm focus:outline-none focus:ring-2 focus:ring-sage-400 bg-white"
            />
          </Field>

          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] uppercase tracking-wider text-sage-600/70 font-semibold">
                Fasi ({totalDays(schedule)} giorni totali)
              </p>
              {isCustomSchedule && (
                <button onClick={resetScheduleToDefault} className="text-[11px] text-sage-600 hover:text-sage-800 underline underline-offset-2">
                  Ripristina default
                </button>
              )}
            </div>
            <div className="rounded-xl-soft border border-sage-100 divide-y divide-sage-100/60 bg-white shadow-soft">
              {schedule.map((phase, idx) => (
                <div key={idx} className="px-3 py-3">
                  <p className="text-[11px] font-semibold text-sage-700 mb-2">
                    Fase {idx + 1} · giorni {phaseDayRange(schedule, idx)}
                  </p>
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <label className="text-xs">
                      <span className="block text-sage-600/70 mb-0.5">Giorni</span>
                      <input
                        type="number" min="1" max="60"
                        value={phase.days}
                        onChange={e => updatePhase(idx, 'days', Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full px-2 py-1.5 border border-sage-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sage-400"
                      />
                    </label>
                    <label className="text-xs">
                      <span className="block text-sage-600/70 mb-0.5">Capsule/dì</span>
                      <input
                        type="number" min="1" max="12"
                        value={phase.pills}
                        onChange={e => updatePhase(idx, 'pills', Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full px-2 py-1.5 border border-sage-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sage-400"
                      />
                    </label>
                    <label className="text-xs">
                      <span className="block text-sage-600/70 mb-0.5">Intervallo (min)</span>
                      <input
                        type="number" min="0" max="1440" step="15"
                        value={phase.intervalMin}
                        onChange={e => updatePhase(idx, 'intervalMin', Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full px-2 py-1.5 border border-sage-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sage-400"
                      />
                    </label>
                  </div>
                  <label className="text-xs block">
                    <span className="block text-sage-600/70 mb-1">Orario prima capsula di questa fase</span>
                    {phase.firstDoseTime ? (
                      <div className="flex gap-1.5">
                        <input
                          type="time"
                          value={phase.firstDoseTime}
                          onChange={e => updatePhase(idx, 'firstDoseTime', e.target.value || undefined)}
                          className="flex-1 px-2 py-1.5 border border-sage-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sage-400"
                        />
                        <button
                          type="button"
                          onClick={() => updatePhase(idx, 'firstDoseTime', undefined)}
                          className="px-3 py-1.5 rounded-lg bg-sage-50 border border-sage-200 text-sage-700 text-xs font-medium hover:bg-sage-100 transition-colors flex items-center gap-1"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Default
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => updatePhase(idx, 'firstDoseTime', firstDoseTime || '08:00')}
                        className="w-full px-3 py-2 rounded-lg bg-white border border-sage-200 text-sage-700 text-xs font-medium hover:bg-sage-50 transition-colors text-left flex items-center justify-between"
                      >
                        <span>Usa <strong className="font-semibold">{firstDoseTime || '08:00'}</strong> (default)</span>
                        <span className="text-sage-500">Personalizza →</span>
                      </button>
                    )}
                  </label>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-sage-600/60 mt-2 leading-snug">
              Il default è il protocollo Tabex standard. Modifica solo se il tuo medico ti ha prescritto qualcosa di diverso.
            </p>
          </div>
        </div>

        {error && (
          <p className="text-sm text-terracotta-700 bg-terracotta-50 rounded-xl-soft px-3 py-2 border border-terracotta-200">
            {error}
          </p>
        )}

        <div className="flex gap-3 pt-2 sticky bottom-0 bg-cream-50 pb-2 -mx-6 px-6 border-t border-sage-100/60">
          <button
            onClick={onClose}
            className="flex-1 py-3.5 border border-sage-200 text-sage-700 rounded-xl-soft font-medium text-sm hover:bg-sage-50 transition-colors active:scale-[0.98]"
          >
            Annulla
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3.5 bg-gradient-to-br from-sage-500 to-sage-700 text-white rounded-xl-soft font-semibold text-sm shadow-sage disabled:opacity-60 active:scale-[0.98] transition-all"
          >
            {saving ? 'Salvataggio…' : 'Salva'}
          </button>
        </div>
      </div>
    </SubPage>
  );
}

// ── NotificationsSubPage ─────────────────────────────────────
function NotificationsSubPage({ user, updateUser, onClose }) {
  const [notifSupported, setNotifSupported] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [notifRegistered, setNotifRegistered] = useState(false);
  const [notifTimes, setNotifTimes] = useState(user.notificationTimes || []);
  const [newTime, setNewTime] = useState('');
  const [notifSaving, setNotifSaving] = useState(false);
  const [testResult, setTestResult] = useState('');
  const [encouragementTime, setEncouragementTime] = useState(user.encouragementTime || '');
  const [encouragementSaving, setEncouragementSaving] = useState(false);

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
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;
    setNotifEnabled(true);
    await registerSubscription();
  }

  async function sendTestNotification() {
    setTestResult('Invio…');
    try {
      const res = await api.notifications.test();
      const ok = res.results?.some(r => r.status === 'ok');
      setTestResult(ok ? '✓ Notifica inviata!' : '✗ Errore: ' + JSON.stringify(res));
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

  async function saveEncouragement(time) {
    setEncouragementSaving(true);
    try {
      const { user: updated } = await api.notifications.setEncouragement(time);
      updateUser(updated);
      setEncouragementTime(time || '');
    } catch (err) {
      console.error(err);
    } finally {
      setEncouragementSaving(false);
    }
  }

  return (
    <SubPage eyebrow="Account" title="Notifiche" onClose={onClose}>
      {!notifSupported ? (
        <p className="text-sm text-sage-600/70 bg-cream-100 border border-sage-100 rounded-xl-soft p-4">
          Notifiche non supportate su questo dispositivo. Installa l'app come PWA per attivarle.
        </p>
      ) : !notifEnabled ? (
        <div className="bg-white rounded-2xl-soft border border-sage-100 shadow-soft p-4 space-y-3">
          <p className="text-sm text-sage-700/80 leading-relaxed">
            Attiva le notifiche per ricevere promemoria nei tuoi momenti critici e incoraggiamento giornaliero.
          </p>
          <button
            onClick={enableNotifications}
            className="w-full py-3 bg-gradient-to-br from-sage-500 to-sage-700 text-white rounded-xl-soft text-sm font-semibold shadow-sage active:scale-[0.98] transition-all"
          >
            Attiva notifiche
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Anti-craving */}
          <Field
            label="Promemoria anti-craving"
            hint="Notifiche di supporto nei tuoi momenti critici."
            extra={
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${notifRegistered ? 'bg-sage-100 text-sage-700' : 'bg-cream-100 text-sage-600/70'}`}>
                {notifRegistered ? 'Attivo' : 'Registrazione…'}
              </span>
            }
          >
            <div className="flex flex-wrap gap-2 mb-3">
              {notifTimes.map(t => (
                <span key={t} className="flex items-center gap-1.5 px-3 py-1.5 bg-sage-50 border border-sage-200 rounded-full text-xs font-medium text-sage-800">
                  {t}
                  <button onClick={() => removeTime(t)} className="text-sage-500 hover:text-sage-800">✕</button>
                </span>
              ))}
              {notifTimes.length === 0 && <p className="text-[11px] text-sage-600/70">Nessun orario impostato</p>}
            </div>
            <div className="flex gap-2">
              <input
                type="time"
                value={newTime}
                onChange={e => setNewTime(e.target.value)}
                className="flex-1 min-w-0 px-3 py-2 border border-sage-200 rounded-xl-soft text-sm focus:outline-none focus:ring-2 focus:ring-sage-400 bg-white"
              />
              <button
                onClick={addTime}
                disabled={!newTime || notifSaving}
                className="px-4 py-2 bg-gradient-to-br from-sage-500 to-sage-700 text-white rounded-xl-soft text-sm font-semibold shadow-sage disabled:opacity-50 transition-all"
              >
                {notifSaving ? '…' : 'Aggiungi'}
              </button>
            </div>
          </Field>

          {/* Incoraggiamento giornaliero */}
          <Field
            label="Incoraggiamento giornaliero"
            hint="Una notifica al giorno, all'orario che scegli, per ricordarti il tuo progresso."
            extra={
              encouragementTime && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-sage-100 text-sage-700">
                  Attivo · {encouragementTime}
                </span>
              )
            }
          >
            {!encouragementTime ? (
              <div className="flex gap-2">
                <input
                  type="time"
                  value={encouragementTime}
                  onChange={e => setEncouragementTime(e.target.value)}
                  className="flex-1 min-w-0 px-3 py-2 border border-sage-200 rounded-xl-soft text-sm focus:outline-none focus:ring-2 focus:ring-sage-400 bg-white"
                />
                <button
                  onClick={() => saveEncouragement(encouragementTime)}
                  disabled={!encouragementTime || encouragementSaving}
                  className="px-4 py-2 bg-gradient-to-br from-sage-500 to-sage-700 text-white rounded-xl-soft text-sm font-semibold shadow-sage disabled:opacity-50 transition-all"
                >
                  {encouragementSaving ? '…' : 'Attiva'}
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="time"
                  value={encouragementTime}
                  onChange={e => setEncouragementTime(e.target.value)}
                  className="flex-1 min-w-0 px-3 py-2 border border-sage-200 rounded-xl-soft text-sm focus:outline-none focus:ring-2 focus:ring-sage-400 bg-white"
                />
                <button
                  onClick={() => saveEncouragement(encouragementTime)}
                  disabled={encouragementSaving || encouragementTime === (user.encouragementTime || '')}
                  className="px-3 py-2 bg-gradient-to-br from-sage-500 to-sage-700 text-white rounded-xl-soft text-sm font-semibold shadow-sage disabled:opacity-50 transition-all"
                >
                  {encouragementSaving ? '…' : 'Salva'}
                </button>
                <button
                  onClick={() => saveEncouragement(null)}
                  disabled={encouragementSaving}
                  className="px-3 py-2 border border-sage-200 text-sage-600 rounded-xl-soft text-sm font-medium hover:bg-sage-50 transition-colors"
                >
                  Disattiva
                </button>
              </div>
            )}
          </Field>

          {/* Test notifica */}
          <div className="pt-2 border-t border-sage-100/60">
            <button
              onClick={sendTestNotification}
              className="w-full py-2.5 border border-sage-300 text-sage-700 rounded-xl-soft text-sm font-medium hover:bg-sage-50 transition-colors"
            >
              Invia notifica di test
            </button>
            {testResult && (
              <p className={`mt-2 text-xs text-center ${testResult.startsWith('✓') ? 'text-sage-700' : 'text-terracotta-700'}`}>
                {testResult}
              </p>
            )}
          </div>
        </div>
      )}
    </SubPage>
  );
}

// ── Field: wrapper label + content per i form ────────────────
function Field({ label, hint, extra, children }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[11px] uppercase tracking-wider text-sage-600/70 font-semibold">{label}</p>
        {extra}
      </div>
      {children}
      {hint && <p className="text-[11px] text-sage-600/60 mt-1.5 leading-snug">{hint}</p>}
    </div>
  );
}
