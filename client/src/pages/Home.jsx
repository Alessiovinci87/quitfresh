import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { getActivePhase, getDoseTimes, totalDays } from '../lib/cytisine';
import { track } from '../lib/tracker';
import { getCurrentDay, getChapter, isInPercorsoWindow } from '../data/percorso';

const BADGE_EMOJI = {
  day1: '🌱', day3: '🌿', week1: '⭐', day14: '🌟', month1: '🏅', month3: '🏆',
};

function getTodayStr() {
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Rome' }));
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export default function Home() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRelapseConfirm, setShowRelapseConfirm] = useState(false);
  const [showStreakSheet, setShowStreakSheet] = useState(false);
  const [showCapsuleDetails, setShowCapsuleDetails] = useState(false);
  const [relapseLoading, setRelapseLoading] = useState(false);
  const [restartLoading, setRestartLoading] = useState(false);
  const [adjusting, setAdjusting] = useState(false);
  const [resendStatus, setResendStatus] = useState('idle');

  async function handleResendVerify() {
    setResendStatus('sending');
    try {
      await api.auth.resendVerify();
      setResendStatus('sent');
    } catch {
      setResendStatus('error');
    }
  }

  const verifyBanner = !user.emailVerified ? (
    <div className="mb-3 bg-cream-100 border border-terracotta-200 rounded-xl px-3 py-2 flex items-start gap-2">
      <span className="text-terracotta-500 text-sm mt-0.5">⚠</span>
      <div className="flex-1 text-xs text-sage-900">
        <p className="font-medium">Verifica la tua email.</p>
        {resendStatus === 'sent' ? (
          <p className="mt-0.5 text-sage-700">Link inviato.</p>
        ) : resendStatus === 'error' ? (
          <p className="mt-0.5 text-terracotta-600">Errore. Riprova tra qualche minuto.</p>
        ) : (
          <button
            onClick={handleResendVerify}
            disabled={resendStatus === 'sending'}
            className="mt-0.5 underline text-sage-700 hover:text-sage-900 disabled:opacity-50"
          >
            {resendStatus === 'sending' ? 'Invio…' : 'Reinvia link'}
          </button>
        )}
      </div>
    </div>
  ) : null;

  useEffect(() => {
    if (!user.quitDate) { setLoading(false); return; }
    api.progress.get()
      .then(setProgress)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user.quitDate]);

  async function adjustDays(delta) {
    if (adjusting) return;
    const current = progress?.daysSinceQuit ?? 0;
    const next = current + delta;
    if (next < 0) return;
    setAdjusting(true);
    try {
      const newQuitDate = new Date(Date.now() - next * 86400000).toISOString();
      const { user: updated } = await api.quiz.setQuitDate(newQuitDate);
      updateUser(updated);
      setProgress(p => ({ ...p, daysSinceQuit: next }));
    } catch (err) {
      console.error(err);
    } finally {
      setAdjusting(false);
    }
  }

  async function handleRelapse() {
    setRelapseLoading(true);
    try {
      const { user: updated } = await api.relapse.log();
      updateUser(updated);
      setProgress(null);
      setShowRelapseConfirm(false);
    } catch (err) {
      console.error(err);
    } finally {
      setRelapseLoading(false);
    }
  }

  async function handleUseFreeze() {
    setRelapseLoading(true);
    try {
      const { user: updated } = await api.relapse.useFreeze();
      updateUser(updated);
      const p = await api.progress.get();
      setProgress(p);
      setShowRelapseConfirm(false);
    } catch (err) {
      console.error(err);
    } finally {
      setRelapseLoading(false);
    }
  }

  async function handleRestart() {
    setRestartLoading(true);
    try {
      const { user: updated } = await api.relapse.restart();
      updateUser(updated);
      setLoading(true);
      const p = await api.progress.get();
      setProgress(p);
    } catch (err) {
      console.error(err);
    } finally {
      setRestartLoading(false);
      setLoading(false);
    }
  }

  // ── Stato: nessuna data di quit impostata ──────────────────
  if (!user.quitDate && !loading) {
    return (
      <div
        className="min-h-[calc(100dvh-7rem)] flex flex-col px-6 pt-6 animate-fade-in"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1.5rem)' }}
      >
        {verifyBanner}
        <header className="mb-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-sage-600/70 font-semibold">Oggi</p>
          <h1 className="font-display text-3xl font-semibold text-sage-900 truncate leading-tight mt-0.5">
            {user.email.split('@')[0]}
          </h1>
        </header>

        <div className="flex-1 flex items-center justify-center">
          <div className="relative text-center py-14 px-6 rounded-2xl-soft overflow-hidden bg-gradient-to-br from-sage-50 via-cream-50 to-sage-100 shadow-card w-full">
            <div className="absolute inset-0 pointer-events-none opacity-60 bg-[radial-gradient(circle_at_50%_30%,rgba(104,131,97,0.15),transparent_60%)]" />
            <div className="relative">
              <p className="text-5xl mb-3">🌱</p>
              <p className="font-display text-xl font-semibold text-sage-900 mb-1">Quando vuoi, sei qui.</p>
              <p className="text-sm text-sage-700/80 mb-6">Ogni tentativo conta. Nessun giudizio.</p>
              <button
                onClick={handleRestart}
                disabled={restartLoading}
                className="px-6 py-3 bg-gradient-to-br from-sage-500 to-sage-700 text-white rounded-xl-soft font-semibold text-sm shadow-sage disabled:opacity-60 transition-all active:scale-[0.98]"
              >
                {restartLoading ? 'Avvio…' : 'Riparto adesso'}
              </button>
            </div>
          </div>
        </div>

        <button
          onClick={() => navigate('/craving')}
          className="w-full py-4 mb-3 bg-gradient-to-br from-sage-500 to-sage-700 text-white rounded-2xl-soft font-semibold text-base shadow-sage active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Ho bisogno ORA
        </button>
      </div>
    );
  }

  // ── Stato principale ──────────────────────────────────────
  const days = progress?.daysSinceQuit ?? 0;

  // Phase corrente del protocollo citisina (se attivo). Serve per
  // mostrare il banner "Giorno 5" — punto chiave del foglietto.
  const phaseNow = user.cytisineStartDate
    ? getActivePhase(user.cytisineSchedule, user.cytisineStartDate)
    : null;

  // Countdown alla fine della terapia citisina. null se non c'è terapia
  // attiva (cerchio destro nascosto, sinistro si centra).
  const therapyTotal = totalDays(user.cytisineSchedule);
  const therapyRemaining = phaseNow && phaseNow.day <= therapyTotal
    ? therapyTotal - phaseNow.day
    : null;

  return (
    <div
      className="min-h-[calc(100dvh-7rem)] flex flex-col px-6 pt-6 animate-fade-in"
      style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1.5rem)' }}
    >
      {verifyBanner}

      {/* Momento di oggi — porta d'ingresso emotiva (solo nella finestra dei 28
          giorni del percorso).
          Blocco dominante: non deve sembrare un link, ma il cuore dell'app. */}
      {user.quitDate && isInPercorsoWindow(user.quitDate) && (() => {
        const day = getCurrentDay(user.quitDate);
        const ch = getChapter(day);
        if (!ch) return null;
        return (
          <button
            onClick={() => { track('percorso_cta_clicked', { day, source: 'home' }); navigate('/percorso'); }}
            className="mb-6 w-full text-left bg-gradient-to-br from-sage-500 to-sage-700 text-white rounded-2xl-soft shadow-sage px-6 py-7 active:scale-[0.99] transition-transform"
          >
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/70 font-semibold">
              Il momento di oggi · Giorno {day}
            </p>
            <h2 className="font-display text-[28px] leading-tight mt-2.5">{ch.headline}</h2>
            <p className="text-white/75 text-sm mt-3">2 minuti. Una cosa da notare oggi.</p>
            <span className="inline-flex items-center gap-1.5 mt-5 bg-white/15 px-4 py-2 rounded-full text-sm font-medium">
              Entra nel momento →
            </span>
          </button>
        );
      })()}

      {/* Percorso concluso — oltre la finestra dei 28 giorni. Niente CTA, niente
          gradient: solo una chiusura sobria, coerente col tono osservativo.
          NB: getCurrentDay è cappato a 28, quindi il caso "oltre" è >= 28 in
          combinazione con !isInPercorsoWindow (che esclude il quit nel futuro). */}
      {user.quitDate && !isInPercorsoWindow(user.quitDate) && getCurrentDay(user.quitDate) >= 28 && (
        <div className="mb-6 w-full bg-white border border-sage-100/70 rounded-2xl-soft shadow-soft px-6 py-7 text-center">
          <h2 className="font-display text-[24px] leading-tight text-sage-900">Il percorso è finito.</h2>
          <p className="text-sage-700/70 text-sm mt-2">Quello che hai visto in questi 28 giorni resta con te.</p>
        </div>
      )}

      {/* Header compatto */}
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.2em] text-sage-600/70 font-semibold">Oggi</p>
          <h1 className="font-display text-2xl font-semibold text-sage-900 truncate leading-tight mt-0.5">
            {user.email.split('@')[0]}
          </h1>
        </div>
        {progress?.freezesAvailable > 0 && (
          <button
            onClick={() => setShowStreakSheet(true)}
            className="shrink-0 inline-flex items-center gap-1.5 text-xs font-medium text-sage-800 bg-white border border-sage-200 px-3 py-1.5 rounded-full shadow-soft active:scale-95 transition-all"
            aria-label={`${progress.freezesAvailable} freeze disponibili`}
          >
            <span>❄</span>
            <span className="tabular-nums">{progress.freezesAvailable}</span>
          </button>
        )}
      </header>

      {/* Ring centrale — tappable */}
      <div className="flex-1 flex flex-col items-center justify-center py-2">
        {loading ? (
          <div className="w-8 h-8 border-2 border-sage-400 border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            {/* Due cerchi affiancati: SX "Ho smesso" tappabile (apre lo
                StreakSheet con il numero giorni + badges), DX countdown alla
                fine della terapia citisina. Se non c'è terapia attiva, DX è
                nascosto e SX si centra da solo (justify-center). */}
            <div className="flex items-start justify-center gap-6 w-full">
              {/* SINISTRA: sage filled, tappable.
                  - days === 0 → invito "Ho smesso" (call to action, mai impostato)
                  - days > 0   → mostra il numero (auto-incrementato dal backend ogni 24h) */}
              <button
                onClick={() => setShowStreakSheet(true)}
                className="group focus:outline-none flex flex-col items-center"
                aria-label={days > 0 ? `${days} giorni senza fumo, apri dettagli` : 'Imposta giorni senza fumo'}
              >
                <div className="w-36 h-36 rounded-full bg-gradient-to-br from-sage-500 to-sage-700 shadow-sage flex items-center justify-center transition-transform group-active:scale-95">
                  {days > 0 ? (
                    <span className="font-display text-[64px] font-semibold text-white tabular-nums leading-none tracking-tight">
                      {days}
                    </span>
                  ) : (
                    <span className="font-display text-2xl font-semibold text-white tracking-tight">
                      Ho smesso
                    </span>
                  )}
                </div>
                <p className="mt-3 text-[11px] font-semibold text-sage-700/80 tracking-wider uppercase text-center max-w-[10rem]">
                  Giorni senza fumo
                </p>
              </button>

              {/* DESTRA: countdown terapia citisina — solo se attiva */}
              {therapyRemaining != null && (
                <div className="flex flex-col items-center">
                  <div className="w-36 h-36 rounded-full bg-white border-2 border-sage-200 shadow-soft flex items-center justify-center">
                    <span className="font-display text-[56px] font-semibold text-sage-800 tabular-nums leading-none">
                      {therapyRemaining}
                    </span>
                  </div>
                  <p className="mt-3 text-[11px] font-semibold text-sage-700/80 tracking-wider uppercase text-center max-w-[10rem]">
                    Alla fine terapia
                  </p>
                </div>
              )}
            </div>

            <p className="mt-3 text-xs text-sage-700/80">
              dal {progress?.quitDate
                ? new Date(progress.quitDate).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })
                : '—'}
            </p>

            <div className="mt-3 flex items-center gap-2 flex-wrap justify-center">
              {progress?.moneySaved > 0 && (
                <span className="inline-flex items-center gap-1.5 bg-gradient-to-br from-sage-50 to-sage-100 border border-sage-200 px-3 py-1.5 rounded-full shadow-soft text-sage-900">
                  <span className="text-base">💰</span>
                  <span className="font-display text-base font-semibold tabular-nums">€{progress.moneySaved.toFixed(2)}</span>
                  <span className="text-[11px] text-sage-700/80 font-medium">risparmiati</span>
                </span>
              )}
              {progress?.bestDays > 0 && (
                <span className="inline-flex items-center gap-1.5 bg-white border border-sage-200 px-3 py-1.5 rounded-full shadow-soft text-sage-900">
                  <span className="text-terracotta-500">★</span>
                  <span className="text-[11px] font-medium">Record <span className="font-display font-semibold tabular-nums">{progress.bestDays}</span></span>
                </span>
              )}
            </div>

            {/* Bottone esplicito per aprire lo Streak sheet */}
            <button
              onClick={() => setShowStreakSheet(true)}
              className="mt-4 inline-flex items-center gap-2 px-5 py-3 rounded-full bg-gradient-to-br from-white to-sage-50 border border-sage-200 shadow-sage text-sm font-semibold text-sage-800 hover:from-sage-50 hover:to-sage-100 active:scale-95 transition-all"
            >
              <svg className="w-4 h-4 text-terracotta-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              Traguardi e storia
              <svg className="w-4 h-4 text-sage-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Banner giorno 5 citisina — punto chiave del protocollo Tabex/
          Sopharma. Solo se phaseNow.day === 5 (calcolato sopra). */}
      {phaseNow && phaseNow.day === 5 && <Day5Banner />}

      {/* Capsule oggi — compatta */}
      <CapsuleCompact user={user} onOpenDetails={() => setShowCapsuleDetails(true)} />

      {/* CTA */}
      <button
        onClick={() => navigate('/craving')}
        className="w-full py-4 mt-3 bg-gradient-to-br from-sage-500 to-sage-700 text-white rounded-2xl-soft font-semibold text-base shadow-sage active:scale-[0.98] transition-all flex items-center justify-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        Ho bisogno ORA
      </button>

      <button
        onClick={() => setShowRelapseConfirm(true)}
        className="w-full py-2 mb-2 text-[11px] text-sage-600/60 hover:text-sage-700 transition-colors underline-offset-4 hover:underline"
      >
        Ho ceduto
      </button>

      {/* Streak bottom-sheet: aggiusta giorni + badges + storia */}
      {showStreakSheet && (
        <StreakSheet
          progress={progress}
          days={days}
          adjusting={adjusting}
          onAdjust={adjustDays}
          onClose={() => setShowStreakSheet(false)}
        />
      )}

      {/* Relapse confirm modal */}
      {showRelapseConfirm && (
        <RelapseModal
          progress={progress}
          relapseLoading={relapseLoading}
          onClose={() => setShowRelapseConfirm(false)}
          onRelapse={handleRelapse}
          onUseFreeze={handleUseFreeze}
        />
      )}

      {/* Capsule details sub-page */}
      {showCapsuleDetails && (
        <CapsuleDetailsPage
          user={user}
          onClose={() => setShowCapsuleDetails(false)}
        />
      )}
    </div>
  );
}

// ── Day5Banner: banner solo il 5° giorno di terapia citisina ──
// Punto chiave del protocollo Tabex/Sopharma: il foglietto raccomanda
// di smettere di fumare entro il 5° giorno per massima efficacia.
// Messaggio caldo + citazione foglietto + invito al medico per
// inattaccabilita' medico-legale (no claims autonomi).
function Day5Banner() {
  return (
    <div className="mt-4 mb-2 p-4 rounded-2xl-soft bg-gradient-to-br from-sage-50 to-sage-100 border border-sage-300 shadow-soft">
      <div className="flex items-start gap-3">
        <div className="text-2xl shrink-0" aria-hidden>🌱</div>
        <div className="flex-1 min-w-0">
          <p className="font-display text-base font-semibold text-sage-900 leading-tight">
            Giorno 5: punto chiave
          </p>
          <p className="mt-2 text-[13px] text-sage-800 leading-relaxed">
            Sei al 5° giorno: il punto del protocollo in cui la citisina ti dà il massimo aiuto. Da oggi, ogni sigaretta in meno conta di più — è quanto indicato sul foglietto del produttore.
          </p>
          <p className="mt-2 text-[12px] text-sage-700/80 leading-relaxed">
            Hai dubbi? Il tuo medico è la voce giusta a cui chiedere.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── CapsuleCompact: card piccola con dots + bottoni +/- ──────
function CapsuleCompact({ user, onOpenDetails }) {
  const [pillsTaken, setPillsTaken] = useState(null);
  const [saving, setSaving] = useState(false);

  const phase = user.cytisineStartDate
    ? getActivePhase(user.cytisineSchedule, user.cytisineStartDate)
    : null;
  const doseTimes = phase && user.firstDoseTime ? getDoseTimes(user.firstDoseTime, phase) : null;

  useEffect(() => {
    if (!phase || !doseTimes) return;
    const today = getTodayStr();
    api.diary.list()
      .then(entries => {
        const entry = entries.find(e => e.date?.startsWith(today));
        setPillsTaken(entry?.pillsTaken ?? 0);
      })
      .catch(() => setPillsTaken(0));
  }, []);

  async function updateCount(next) {
    if (saving) return;
    setSaving(true);
    try {
      const today = getTodayStr();
      await api.diary.save({ date: new Date(today).toISOString(), pillsTaken: next });
      setPillsTaken(next);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  if (!phase || !doseTimes) return null;
  const taken = pillsTaken ?? 0;
  const allTaken = taken >= phase.pills;
  const nextTime = !allTaken ? doseTimes[taken] : null;

  return (
    <div className="bg-white border border-sage-100/80 rounded-2xl-soft px-4 py-3 shadow-soft mt-3">
      <button
        onClick={onOpenDetails}
        className="w-full flex items-center justify-between mb-2 -mx-1 px-1 rounded-md hover:bg-sage-50/40 active:bg-sage-50 transition-colors"
        aria-label="Apri dettagli capsule"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-6 h-6 rounded-md bg-sage-50 flex items-center justify-center text-xs">💊</span>
          <p className="text-[11px] uppercase tracking-wider text-sage-600/70 font-semibold">Capsule oggi</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] font-medium text-sage-700 bg-sage-50 px-2 py-0.5 rounded-full tabular-nums">
            Giorno {phase.day} · Fase {phase.index + 1}
          </span>
          <svg className="w-4 h-4 text-sage-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </button>

      {/* Pallini con orari sotto */}
      <div className="flex justify-around gap-2 mb-3">
        {doseTimes.map((t, i) => (
          <div key={t} className="flex flex-col items-center gap-1 min-w-0">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              i < taken
                ? 'bg-gradient-to-br from-sage-500 to-sage-700 text-white shadow-sage'
                : 'bg-sage-50 text-sage-400 border border-sage-100'
            }`}>
              {i < taken ? '✓' : i + 1}
            </div>
            <span className="text-[10px] text-sage-600/70 tabular-nums">{t}</span>
          </div>
        ))}
      </div>

      {/* Contatore +/- compatto */}
      <div className="flex items-center gap-3 pt-2 border-t border-sage-100/60">
        <button
          onClick={() => taken > 0 && updateCount(taken - 1)}
          disabled={taken <= 0 || saving}
          className="w-9 h-9 rounded-full border border-sage-200/70 text-sage-700 text-lg font-bold disabled:opacity-30 hover:bg-sage-50 transition-all flex items-center justify-center active:scale-95 shrink-0"
          aria-label="Togli capsula"
        >−</button>
        <div className="flex-1 text-center">
          <p className="text-[11px] text-sage-700/80">
            <span className="font-display text-base font-semibold text-sage-900 tabular-nums">{taken}</span>
            <span className="text-sage-500/70"> / {phase.pills}</span>
            <span className="text-sage-600/70 ml-2">
              {allTaken
                ? 'tutte prese ✓'
                : <>prossima alle <span className="font-semibold text-sage-800 tabular-nums">{nextTime}</span></>}
            </span>
          </p>
        </div>
        <button
          onClick={() => !allTaken && updateCount(taken + 1)}
          disabled={allTaken || saving}
          className="w-9 h-9 rounded-full bg-gradient-to-br from-sage-500 to-sage-700 text-white text-lg font-bold disabled:opacity-30 transition-all flex items-center justify-center shadow-sage active:scale-95 shrink-0"
          aria-label="Aggiungi capsula"
        >+</button>
      </div>
    </div>
  );
}

// ── CapsuleDetailsPage: sub-pagina full-screen con tutti gli orari ──
function CapsuleDetailsPage({ user, onClose }) {
  const [pillsTaken, setPillsTaken] = useState(null);

  const phase = user.cytisineStartDate
    ? getActivePhase(user.cytisineSchedule, user.cytisineStartDate)
    : null;
  const doseTimes = phase && user.firstDoseTime ? getDoseTimes(user.firstDoseTime, phase) : null;

  useEffect(() => {
    if (!phase || !doseTimes) return;
    const today = getTodayStr();
    api.diary.list()
      .then(entries => {
        const entry = entries.find(e => e.date?.startsWith(today));
        setPillsTaken(entry?.pillsTaken ?? 0);
      })
      .catch(() => setPillsTaken(0));
  }, []);

  // Lock body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  if (!phase || !doseTimes) return null;
  const taken = pillsTaken ?? 0;

  return (
    <div
      className="fixed inset-0 z-50 bg-cream-50 animate-slide-in-right overflow-y-auto"
      style={{ animation: 'slideInRight 280ms cubic-bezier(0.16, 1, 0.3, 1)' }}
    >
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>

      {/* Header sticky con tasto Indietro */}
      <header className="sticky top-0 z-10 px-6 pt-6 pb-3 bg-cream-50/85 backdrop-blur-xl border-b border-sage-100/30 flex items-center gap-3">
        <button
          onClick={onClose}
          className="w-9 h-9 -ml-1 rounded-full flex items-center justify-center text-sage-700 hover:bg-sage-100/60 transition-colors active:scale-95"
          aria-label="Torna alla Home"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-[0.2em] text-sage-600/70 font-semibold">Protocollo</p>
          <h1 className="font-display text-2xl font-semibold text-sage-900 leading-tight">Capsule oggi</h1>
        </div>
      </header>

      <div className="px-6 py-5 space-y-5">
        {/* Status fase */}
        <div className="bg-white border border-sage-100 rounded-2xl-soft p-4 shadow-soft">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] uppercase tracking-[0.18em] text-sage-600/70 font-semibold">Fase corrente</p>
            <span className="text-[10px] font-medium text-sage-700 bg-sage-50 px-2 py-0.5 rounded-full">
              Giorno {phase.day} · Fase {phase.index + 1}
            </span>
          </div>
          <p className="font-display text-2xl font-semibold text-sage-900 leading-tight">
            {phase.pills} {phase.pills === 1 ? 'capsula' : 'capsule'} al giorno
          </p>
          <p className="text-sm text-sage-700/70 mt-1">
            Una ogni {Math.round(phase.intervalMin / 60)} {phase.intervalMin / 60 === 1 ? 'ora' : 'ore'}
          </p>
        </div>

        {/* Timeline orari */}
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-sage-600/70 font-semibold mb-2 px-1">
            Orari di oggi
          </p>
          <div className="bg-white rounded-2xl-soft border border-sage-100 shadow-soft overflow-hidden divide-y divide-sage-100/60">
            {doseTimes.map((time, i) => {
              const isPast = i < taken;
              return (
                <div
                  key={i}
                  className={`flex items-center gap-3 px-4 py-3.5 transition-all ${isPast ? 'bg-sage-50/40' : ''}`}
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                    isPast
                      ? 'bg-gradient-to-br from-sage-500 to-sage-700 text-white shadow-sage'
                      : 'bg-sage-50 text-sage-700 border border-sage-200'
                  }`}>
                    {isPast ? '✓' : i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-base font-semibold text-sage-900 tabular-nums">
                      {time}
                    </p>
                    <p className="text-[11px] text-sage-600/70">
                      {isPast ? 'presa' : i === taken ? 'prossima' : 'in arrivo'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <p className="text-[11px] text-sage-600/60 px-1 leading-snug">
          Gli orari si calcolano dal primo dose-time impostato in Profilo e dal numero di capsule giornaliere della fase corrente.
        </p>
      </div>
    </div>
  );
}

// ── StreakSheet: bottom-sheet con aggiusta giorni + badges + storia ──
function StreakSheet({ progress, days, adjusting, onAdjust, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center animate-fade-in">
      <div
        className="absolute inset-0 bg-sage-900/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-mobile bg-white rounded-t-3xl shadow-lift animate-slide-up max-h-[85dvh] overflow-y-auto">
        <div className="sticky top-0 bg-white/95 backdrop-blur-md pt-3 pb-2 px-6 z-10">
          <div className="w-10 h-1 bg-sage-200 rounded-full mx-auto mb-3" />
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xl font-semibold text-sage-900">Streak</h3>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-sage-50 text-sage-700 flex items-center justify-center"
              aria-label="Chiudi"
            >✕</button>
          </div>
        </div>

        <div className="px-6 pb-6 space-y-5">
          {/* Aggiusta giorni */}
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-sage-600/70 font-semibold mb-2">
              Aggiusta giorni
            </p>
            <div className="bg-cream-100/60 border border-sage-100 rounded-xl-soft p-4 flex items-center justify-between">
              <button
                onClick={() => onAdjust(-1)}
                disabled={adjusting || days <= 0}
                className="w-10 h-10 rounded-full bg-white border border-sage-200 text-sage-700 text-xl font-bold disabled:opacity-30 hover:bg-sage-50 transition-all flex items-center justify-center shadow-soft active:scale-95"
                aria-label="Diminuisci giorni"
              >−</button>
              <div className="text-center">
                <p className="font-display text-3xl font-semibold text-sage-900 tabular-nums leading-none">{days}</p>
                <p className="text-[10px] text-sage-600/70 mt-1 uppercase tracking-wider">
                  {days === 1 ? 'giorno' : 'giorni'}
                </p>
              </div>
              <button
                onClick={() => onAdjust(+1)}
                disabled={adjusting}
                className="w-10 h-10 rounded-full bg-gradient-to-br from-sage-500 to-sage-700 text-white text-xl font-bold disabled:opacity-30 transition-all flex items-center justify-center shadow-sage active:scale-95"
                aria-label="Aumenta giorni"
              >+</button>
            </div>
            <p className="text-[10px] text-sage-600/60 mt-2 leading-snug">
              Sposta la data di inizio se quella attuale non è precisa.
            </p>
          </div>

          {/* Badges */}
          {progress?.badges && (
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-sage-600/70 font-semibold mb-2">
                Traguardi
              </p>
              <div className="bg-white rounded-xl-soft border border-sage-100 overflow-hidden divide-y divide-sage-100/60">
                {progress.badges.map((badge) => (
                  <div
                    key={badge.id}
                    className={`flex items-center gap-3 px-4 py-3 transition-all ${badge.earned ? '' : 'opacity-50'}`}
                  >
                    <span className="text-xl shrink-0">{BADGE_EMOJI[badge.id] || '🎯'}</span>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-medium ${badge.earned ? 'text-sage-900' : 'text-sage-700/70'}`}>
                        {badge.label}
                      </p>
                      {!badge.earned && progress.daysSinceQuit < badge.days && (
                        <p className="text-[11px] text-sage-600/60">
                          Mancano {badge.days - progress.daysSinceQuit} giorni
                        </p>
                      )}
                    </div>
                    {badge.earned && (
                      <span className="text-[10px] text-sage-700 font-medium bg-sage-50 px-2 py-0.5 rounded-full shrink-0">
                        Raggiunto
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Freeze info */}
          {progress && (
            <div className="bg-cream-100/60 border border-sage-100 rounded-xl-soft p-3 flex items-center gap-3">
              <span className="w-9 h-9 rounded-full bg-sage-50 flex items-center justify-center text-lg">❄</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sage-900">
                  {progress.freezesAvailable || 0} freeze disponibili
                </p>
                <p className="text-[11px] text-sage-600/70">
                  +1 ogni 7 giorni puliti
                  {progress.daysToNextFreeze != null && progress.freezesAvailable < 3
                    ? ` · prossimo tra ${progress.daysToNextFreeze} ${progress.daysToNextFreeze === 1 ? 'giorno' : 'giorni'}`
                    : ''}
                </p>
              </div>
            </div>
          )}

          {/* Past attempts */}
          {progress?.pastAttempts?.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-sage-600/70 font-semibold mb-2">
                Tentativi precedenti
              </p>
              <div className="space-y-2">
                {progress.pastAttempts.map((a, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-3 bg-cream-100/70 border border-sage-100/50 rounded-xl-soft">
                    <div className="min-w-0">
                      <p className="text-sm text-sage-900 font-medium">
                        {new Date(a.startDate).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                      <p className="text-[11px] text-sage-600/70 mt-0.5">
                        {a.endDate
                          ? `terminato il ${new Date(a.endDate).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}`
                          : 'in corso'}
                      </p>
                    </div>
                    <p className="font-display text-base font-semibold text-sage-800 tabular-nums">
                      {a.days !== null ? `${a.days}g` : '—'}
                      {a.days === progress.bestDays && progress.bestDays > 0 && (
                        <span className="ml-1 text-xs text-terracotta-500">★</span>
                      )}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── RelapseModal: invariato dal precedente ─────────────────────
function RelapseModal({ progress, relapseLoading, onClose, onRelapse, onUseFreeze }) {
  return (
    <div className="fixed inset-0 bg-sage-900/40 backdrop-blur-sm flex items-end justify-center z-50 px-4 pb-8 animate-fade-in">
      <div className="bg-white rounded-2xl-soft p-6 w-full max-w-mobile animate-slide-up shadow-lift">
        {progress?.freezesAvailable > 0 ? (
          <>
            <div className="flex items-center gap-3 mb-3">
              <span className="w-10 h-10 rounded-full bg-sage-50 flex items-center justify-center text-xl">❄</span>
              <div>
                <h3 className="font-display text-xl font-semibold text-sage-900 leading-tight">Hai {progress.freezesAvailable} freeze</h3>
                <p className="text-[11px] text-sage-600/70 mt-0.5">Proteggi lo streak senza azzerarlo</p>
              </div>
            </div>
            <p className="text-sm text-sage-700/80 mb-5 leading-relaxed">
              Una giornata difficile non deve cancellare tutto il tuo percorso. Usa un freeze per non perdere lo streak.
            </p>
            <button
              onClick={onUseFreeze}
              disabled={relapseLoading}
              className="w-full py-3.5 bg-gradient-to-br from-sage-500 to-sage-700 text-white rounded-xl-soft font-semibold text-sm shadow-sage disabled:opacity-60 active:scale-[0.98] transition-all mb-2 flex items-center justify-center gap-2"
            >
              <span>❄</span>
              {relapseLoading ? 'Uso freeze…' : 'Usa un freeze'}
            </button>
            <button
              onClick={onRelapse}
              disabled={relapseLoading}
              className="w-full py-3 border border-terracotta-200 text-terracotta-700 rounded-xl-soft font-medium text-sm hover:bg-terracotta-50 disabled:opacity-60 transition-colors active:scale-[0.98] mb-2"
            >
              Azzera lo streak
            </button>
            <button
              onClick={onClose}
              className="w-full py-2 text-xs text-sage-600/70 hover:text-sage-700 transition-colors"
            >
              Annulla
            </button>
          </>
        ) : (
          <>
            <h3 className="font-display text-xl font-semibold text-sage-900 mb-2">Azzerare il contatore?</h3>
            <p className="text-sm text-sage-700/80 mb-6 leading-relaxed">
              I giorni precedenti vengono salvati nella cronologia. Puoi ripartire quando sei pronto.
              {progress?.daysToNextFreeze != null && (
                <span className="block mt-2 text-[11px] text-sage-600/70">
                  ❄ Prossimo freeze tra {progress.daysToNextFreeze} {progress.daysToNextFreeze === 1 ? 'giorno' : 'giorni'} di streak pulito.
                </span>
              )}
            </p>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 border border-sage-200 text-sage-700 rounded-xl-soft font-medium text-sm hover:bg-sage-50 transition-colors active:scale-[0.98]"
              >
                Annulla
              </button>
              <button
                onClick={onRelapse}
                disabled={relapseLoading}
                className="flex-1 py-3 bg-terracotta-500 text-white rounded-xl-soft font-semibold text-sm hover:bg-terracotta-600 disabled:opacity-60 transition-colors active:scale-[0.98]"
              >
                {relapseLoading ? 'Azzeramento…' : 'Sì, azzera'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

