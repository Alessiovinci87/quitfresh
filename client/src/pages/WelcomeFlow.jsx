import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { track } from '../lib/tracker';
import { enablePush, pushSupported } from '../lib/push';

// Welcome Flow — micro-esperienza di attivazione post-onboarding (60-90s).
// NON è un tutorial: è un mini-scenario reale che fa SENTIRE cosa è QuitFresh
// usando gli strumenti veri (frasi cognitive + voce AI) in modo invisibile.
//
// 6 schermate sequenziali. L'utente può solo AVANZARE. Niente label tipo
// "demo/prova/esempio". Uscita di emergenza minima ("Salta") in alto a destra.

const PHRASE_AUTO_MS = 8_000; // più rapido del carosello SOS reale (60s)

export default function WelcomeFlow() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [step, setStep] = useState(1);
  const startedRef = useRef(false);

  // Guard: chi ha già visto il flow (grandfathered o completato) non lo rivede,
  // anche navigando a mano qui. Va dritto a /home.
  const alreadyDone = user && user.welcomeFlowCompleted === true;

  useEffect(() => {
    if (alreadyDone) {
      navigate('/home', { replace: true });
      return;
    }
    if (!startedRef.current) {
      startedRef.current = true;
      track('welcome_flow_started');
    }
  }, [alreadyDone, navigate]);

  if (alreadyDone) return null;

  function go(next) {
    setStep(next);
  }

  async function finish() {
    track('welcome_flow_completed');
    try {
      const { user: updated } = await api.user.completeWelcomeFlow();
      updateUser(updated);
    } catch {
      // Anche se la chiamata fallisce non blocchiamo l'utente fuori dalla home.
      updateUser({ welcomeFlowCompleted: true });
    }
    navigate('/home', { replace: true });
  }

  async function skip() {
    track('welcome_flow_skipped', { step });
    await finish();
  }

  return (
    <div className="mobile-container relative bg-gradient-to-b from-sage-50 via-sage-50 to-sage-100/70 px-6 overflow-hidden">
      {/* Uscita di emergenza: minima, grigia, mai evidenziata. */}
      <button
        onClick={skip}
        className="absolute top-4 right-4 z-10 text-[11px] text-sage-400/70 hover:text-sage-500 tracking-wide"
        aria-label="Salta"
      >
        Salta
      </button>

      <div className="max-w-mobile w-full mx-auto flex-1 flex flex-col">
        {step === 1 && <ScreenOpening onAdvance={() => go(2)} />}
        {step === 2 && <ScreenInvite onAdvance={() => go(3)} />}
        {step === 3 && <ScreenScenario onAdvance={() => go(4)} />}
        {step === 4 && <ScreenPhrases onAdvance={() => go(5)} />}
        {step === 5 && <ScreenChatBubble onAdvance={() => go(6)} />}
        {step === 6 && <ScreenClosing onAdvance={() => go(7)} />}
        {step === 7 && <ScreenNotifications onFinish={finish} />}
      </div>
    </div>
  );
}

// ── Schermata 1 — Apertura (auto-advance 4s o tap) ──────────────────────────
function ScreenOpening({ onAdvance }) {
  useAutoAdvance(onAdvance, 4000);
  return (
    <TapLayer onTap={onAdvance}>
      <p className="font-display text-[26px] leading-relaxed text-sage-900 text-center animate-fade-in">
        La parte difficile non è smettere.
        <br /><br />
        È quel momento preciso in cui il cervello prova a riportarti dentro.
      </p>
    </TapLayer>
  );
}

// ── Schermata 2 — Invito implicito (auto-advance 3s o tap) ──────────────────
function ScreenInvite({ onAdvance }) {
  useAutoAdvance(onAdvance, 3000);
  return (
    <TapLayer onTap={onAdvance}>
      <p className="font-display text-3xl text-sage-900 text-center animate-fade-in">
        Facciamo una prova.
      </p>
    </TapLayer>
  );
}

// ── Schermata 3 — Scenario reale (tap obbligatorio sul bottone) ─────────────
function ScreenScenario({ onAdvance }) {
  const [showButton, setShowButton] = useState(false);
  // Pausa visiva di 1.5s prima che appaia il bottone.
  useEffect(() => {
    const t = setTimeout(() => setShowButton(true), 1500);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex-1 flex flex-col items-center justify-center py-10">
      <p className="font-display text-3xl text-sage-900 text-center animate-fade-in flex-1 flex items-center">
        Dopo cena. Divano. Automatico.
      </p>
      <div className="w-full pb-10 min-h-[64px]">
        {showButton && (
          <button
            onClick={onAdvance}
            className="w-full py-3.5 bg-white border border-sage-200 text-sage-800 rounded-xl-soft font-medium text-sm shadow-soft active:scale-[0.98] transition-all animate-fade-in"
          >
            È qui che di solito cedo
          </button>
        )}
      </div>
    </div>
  );
}

// ── Schermata 4 — Mini esperienza SOS (riusa lo stile del carosello) ────────
function ScreenPhrases({ onAdvance }) {
  const [phrases, setPhrases] = useState(null);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    let cancelled = false;
    api.sos.getPhrases({ intensity: 'alta', count: 2, triggerContext: 'dopo cena' })
      .then((res) => {
        if (cancelled) return;
        const list = (res.phrases || []).slice(0, 2);
        // Se per qualche motivo arrivano 0 frasi, non blocchiamo: avanza.
        if (list.length === 0) { onAdvance(); return; }
        setPhrases(list);
      })
      .catch(() => { if (!cancelled) onAdvance(); });
    return () => { cancelled = true; };
  }, []);

  // Auto-advance tra le frasi; dopo l'ultima passa alla bolla chat.
  useEffect(() => {
    if (!phrases) return;
    const t = setTimeout(() => {
      if (idx < phrases.length - 1) setIdx((i) => i + 1);
      else onAdvance();
    }, PHRASE_AUTO_MS);
    return () => clearTimeout(t);
  }, [phrases, idx]);

  if (!phrases) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-sage-700/60 text-sm">
        <div className="w-8 h-8 rounded-full border-2 border-sage-300 border-t-sage-700 animate-spin mb-3" />
        Un momento.
      </div>
    );
  }

  const isLast = idx >= phrases.length - 1;
  const next = () => { if (isLast) onAdvance(); else setIdx((i) => i + 1); };

  return (
    <div className="flex-1 flex flex-col py-10">
      <p className="text-[10px] font-semibold text-sage-600/70 uppercase tracking-[0.2em] mb-2 text-center">
        Respira con queste parole
      </p>
      <div
        onClick={next}
        className="flex-1 bg-white rounded-2xl-soft border border-sage-100/60 shadow-soft p-8 mb-4 flex flex-col justify-center min-h-[280px] cursor-pointer active:scale-[0.99] transition-transform"
        role="button"
        aria-label="Continua"
      >
        <p className="font-display text-2xl text-sage-900 leading-snug text-center animate-fade-in" key={idx}>
          {phrases[idx].text}
        </p>
      </div>
      <div className="flex justify-center gap-2 mb-2" aria-label="Progresso">
        {phrases.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all ${
              i === idx ? 'w-8 bg-sage-700' : i < idx ? 'w-3 bg-sage-400' : 'w-3 bg-sage-200'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

// ── Schermata 5 — Mini messaggio chat (bolla AI di sua iniziativa) ──────────
function ScreenChatBubble({ onAdvance }) {
  const [reply, setReply] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.chat.welcome()
      .then((res) => { if (!cancelled) setReply(res.reply || ''); })
      .catch(() => { if (!cancelled) setFailed(true); });
  }, []);

  return (
    <div className="flex-1 flex flex-col py-12">
      <div className="flex-1 flex flex-col justify-center">
        {!reply && !failed && (
          <div className="flex items-center gap-1.5 text-sage-500 animate-fade-in" aria-label="Sta scrivendo">
            <span className="w-2 h-2 rounded-full bg-sage-400 animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 rounded-full bg-sage-400 animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 rounded-full bg-sage-400 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        )}
        {(reply || failed) && (
          <div className="max-w-[85%] bg-white border border-sage-100/60 shadow-soft rounded-2xl-soft rounded-tl-md px-5 py-4 animate-fade-in">
            <p className="font-display text-lg text-sage-900 leading-snug">
              {reply || 'Questo momento è più intenso che pericoloso.'}
            </p>
          </div>
        )}
      </div>
      {(reply || failed) && (
        <button
          onClick={onAdvance}
          className="w-full py-3 text-sm text-sage-700/80 hover:text-sage-900 animate-fade-in"
        >
          Avanti →
        </button>
      )}
    </div>
  );
}

// ── Schermata 6 — Chiusura ──────────────────────────────────────────────────
function ScreenClosing({ onAdvance }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-10">
      <p className="font-display text-[26px] leading-relaxed text-sage-900 text-center animate-fade-in flex-1 flex items-center">
        Questo è QuitFresh.
        <br /><br />
        Una voce lucida nel momento in cui serve.
      </p>
      <div className="w-full pb-10">
        <button
          onClick={onAdvance}
          className="w-full py-3.5 bg-gradient-to-br from-sage-500 to-sage-700 text-white rounded-xl-soft font-semibold text-sm shadow-sage active:scale-[0.98] transition-all"
        >
          Avanti
        </button>
      </div>
    </div>
  );
}

// ── Schermata 7 — Attivazione notifiche ─────────────────────────────────────
// Si aggancia al tema della chiusura ("una voce nel momento in cui serve"):
// quella voce arriva tramite le push. Non bloccante — "Più tardi" prosegue.
// Su device non supportato (es. iOS non installato) niente bottone morto:
// si spiega come riceverle e si lascia proseguire.
function ScreenNotifications({ onFinish }) {
  const [supported] = useState(() => pushSupported());
  const [busy, setBusy] = useState(false);

  async function activate() {
    setBusy(true);
    const result = await enablePush();
    track('welcome_notifications_result', { result });
    setBusy(false);
    onFinish();
  }

  function later() {
    track('welcome_notifications_skipped');
    onFinish();
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center py-10">
      <div className="flex-1 flex flex-col justify-center animate-fade-in">
        <div className="text-5xl text-center mb-6">🔔</div>
        <p className="font-display text-[26px] leading-relaxed text-sage-900 text-center">
          Ma quel momento arriva
          <br />
          quando meno te lo aspetti.
        </p>
        <p className="text-sage-700/80 text-[15px] leading-relaxed text-center mt-4 px-2">
          {supported
            ? 'Attiva le notifiche e lascia che ti raggiunga: un promemoria nei tuoi orari critici, e — se la usi — l’avviso per ogni capsula di citisina.'
            : 'Per ricevere i promemoria nei tuoi momenti critici, installa QuitFresh sulla schermata Home: da lì potrai attivare le notifiche.'}
        </p>
      </div>

      <div className="w-full pb-10 space-y-3">
        {supported && (
          <button
            onClick={activate}
            disabled={busy}
            className="w-full py-3.5 bg-gradient-to-br from-sage-500 to-sage-700 text-white rounded-xl-soft font-semibold text-sm shadow-sage active:scale-[0.98] transition-all disabled:opacity-60"
          >
            {busy ? 'Attivazione…' : 'Attiva le notifiche'}
          </button>
        )}
        <button
          onClick={supported ? later : onFinish}
          className={supported
            ? 'w-full py-2 text-sm text-sage-500/80 hover:text-sage-700 transition-colors'
            : 'w-full py-3.5 bg-gradient-to-br from-sage-500 to-sage-700 text-white rounded-xl-soft font-semibold text-sm shadow-sage active:scale-[0.98] transition-all'}
        >
          {supported ? 'Più tardi' : 'Inizio il mio percorso'}
        </button>
      </div>
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────
// Auto-advance dopo `ms`, cancellato se l'utente avanza prima con un tap.
function useAutoAdvance(onAdvance, ms) {
  useEffect(() => {
    const t = setTimeout(onAdvance, ms);
    return () => clearTimeout(t);
  }, []);
}

// Layer a tutto schermo che avanza al tap (per le schermate di solo testo).
function TapLayer({ onTap, children }) {
  return (
    <div
      onClick={onTap}
      role="button"
      aria-label="Continua"
      className="flex-1 flex items-center justify-center cursor-pointer active:opacity-90 transition-opacity py-10"
    >
      {children}
    </div>
  );
}
