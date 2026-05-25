import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import FeatureLimitPaywall from '../components/FeatureLimitPaywall';
import { track } from '../lib/tracker';

// Formatta HH:mm da Date|stringa ISO. Usato per i timestamp leggeri
// sotto le bolle.
function fmtTime(d) {
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return '';
  return `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
}

// Suggerimenti rapidi mostrati quando la chat e' vuota o l'ultimo messaggio
// e' dell'assistente. Set dinamico in base a ora del giorno e trigger.
function getQuickReplies({ hour, trigger, hasHistory }) {
  if (trigger === 'sos') {
    return ['Ho resistito', 'Sto ancora male', 'Mi serve distrazione', 'Ce l\'ho fatta'];
  }
  if (!hasHistory) {
    if (hour >= 5 && hour < 12) return ['Buongiorno, come parto?', 'Ho voglia di fumare', 'Sono nervoso', 'Come sto andando?'];
    if (hour >= 21 || hour < 5) return ['Non riesco a dormire', 'Ho voglia di fumare', 'Sono ansioso', 'Come sto andando?'];
    return ['Ho voglia di fumare adesso', 'Sono stressato', 'Ho ceduto e fumato', 'Come sto andando?'];
  }
  return ['Ho voglia di fumare', 'Ho ceduto', 'Sto meglio', 'Aiutami a distrarmi'];
}

const HEADER_HEIGHT = 64;
const INPUT_HEIGHT = 72;
const MAX_WIDTH = 430;

export default function Craving() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  // Trigger di apertura passato via navigate('/craving', { state: { trigger } }).
  // 'sos' = chat aperta dopo SOS Craving; 'welcome' = primo flow post-onboarding;
  // 'percorso' = chat aperta dopo un capitolo, con la scelta fatta dall'utente.
  const trigger = location.state?.trigger || null;
  // Contesto percorso opzionale: { day, optionLabel, feedback }. Permette
  // all'AI di aprire riprendendo la scelta del giorno invece che generico.
  const percorso = location.state?.percorso || null;
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  // historyLoaded: blocca il render dei messaggi finche' la GET /history
  // non e' tornata, cosi' evitiamo flash di "empty state" sopra una chat
  // che invece ha gia' cronologia salvata.
  const [historyLoaded, setHistoryLoaded] = useState(false);
  // Freemium: settato quando il backend ritorna FREE_LIMIT_REACHED su chat.
  const [paywallReached, setPaywallReached] = useState(false);
  const [freemiumStatus, setFreemiumStatus] = useState(null); // { used, limit, remaining }
  // iOS PWA standalone: applichiamo lo stack visualViewport + body lock +
  // animating. Su Android Chrome (e desktop) il viewport rifluisce
  // nativamente con interactive-widget=resizes-content → layout flex
  // semplice 100dvh, niente body lock (lo blocchera' il rifluire), niente
  // visualViewport hack.
  const isIOS = typeof navigator !== 'undefined' &&
    /iPad|iPhone|iPod/.test(navigator.userAgent);
  const [kbHeight, setKbHeight] = useState(0);
  // vvOffset traccia visualViewport.offsetTop: in PWA standalone iOS,
  // quando la tastiera apre il visual viewport "shifts" in alto per
  // portare l'input in vista. Anche con body lock, position:fixed top:0
  // puo' finire SOPRA il top del visual viewport (header sparisce).
  // Settando top: vvOffset compensiamo lo shift e l'header resta visibile.
  const [vvOffset, setVvOffset] = useState(0);
  // Ready flag: il wrapper resta opacity:0 finche' il primo handleResize
  // non e' avvenuto. Cosi' gli elementi appaiono gia' nella posizione
  // corretta, niente flicker iniziale di "scendere dall'alto".
  const [ready, setReady] = useState(false);
  // animating: true durante la finestra in cui iOS sta aprendo/chiudendo
  // la tastiera (~400ms). In quel periodo wrapper opacity:0 → l'utente
  // vede un fade-out + fade-in invece del jitter di visualViewport che
  // ricalcola 15 volte in 250ms.
  const [animating, setAnimating] = useState(false);
  const animatingTimerRef = useRef(null);
  // Cache: l'altezza reale della tastiera dell'utente, memorizzata in
  // localStorage. Al primo focus della prima sessione usiamo un valore
  // di default; dalla seconda apertura in poi la stima coincide al pixel
  // con la realta' → zero salto. La cache si aggiorna a ogni vv.resize.
  const cachedKbRef = useRef(
    typeof localStorage !== 'undefined'
      ? parseInt(localStorage.getItem('chatKbHeight') || '340', 10)
      : 340
  );
  // Tap lock: timestamp fino al quale ignorare valori vv.resize bassi.
  // Si imposta al pointerdown/focusin per 500ms — copre l'animazione
  // tastiera iOS (~250ms) + margine.
  const tapLockUntilRef = useRef(0);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  // Ref al wrapper content per manipolare style direttamente al pointerdown
  // senza aspettare il render React → animazione parte nello stesso frame
  // del touch, prima che iOS inizi ad alzare la tastiera.
  const wrapperRef = useRef(null);

  useEffect(() => { bootstrap(); }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // BODY LOCK: SOLO su iOS PWA. Su Android impedirebbe il rifluire
  // naturale del viewport quando appare la tastiera → spazio bianco
  // enorme sopra la tastiera.
  useEffect(() => {
    if (!isIOS) return;
    const html = document.documentElement;
    const body = document.body;
    const prev = {
      htmlPosition: html.style.position,
      htmlOverflow: html.style.overflow,
      htmlHeight: html.style.height,
      htmlWidth: html.style.width,
      bodyPosition: body.style.position,
      bodyOverflow: body.style.overflow,
      bodyHeight: body.style.height,
      bodyWidth: body.style.width,
    };
    html.style.position = 'fixed';
    html.style.overflow = 'hidden';
    html.style.height = '100%';
    html.style.width = '100%';
    body.style.position = 'fixed';
    body.style.overflow = 'hidden';
    body.style.height = '100%';
    body.style.width = '100%';
    return () => {
      html.style.position = prev.htmlPosition;
      html.style.overflow = prev.htmlOverflow;
      html.style.height = prev.htmlHeight;
      html.style.width = prev.htmlWidth;
      body.style.position = prev.bodyPosition;
      body.style.overflow = prev.bodyOverflow;
      body.style.height = prev.bodyHeight;
      body.style.width = prev.bodyWidth;
    };
  }, [isIOS]);

  // visualViewport: unica API che riporta l'altezza tastiera in modo
  // affidabile su PWA installata iOS 16.4+, Safari mobile, Chrome Android.
  // Su desktop kbHeight resta 0.
  //
  // Su iOS PWA, quando l'input prende focus Safari sposta automaticamente
  // il visual viewport (vv.offsetTop > 0) per portare l'input "in vista".
  // Con il nostro layout fixed non serve, e anzi falsifica il calcolo:
  // window.scrollTo(0, 0) annulla lo scroll automatico ad ogni evento, cosi'
  // vv.offsetTop torna a 0 e la formula kb = innerHeight - vv.height e' pulita.
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    // Debounce con requestAnimationFrame: vv.resize triggera ad ogni
    // frame (~60Hz) durante l'animazione tastiera iOS. Senza debounce
    // setKbHeight viene chiamato ~15 volte in 250ms → re-render visibili
    // come "scatti". Con rAF, l'ultimo evento di una raffica viene
    // processato nel frame successivo: una sola setState per burst.
    let rafId = null;
    const compute = () => {
      window.scrollTo(0, 0);
      setVvOffset(vv.offsetTop);
      const rawKb = window.innerHeight - vv.height;
      // SOGLIA: su iPhone con notch, innerHeight include la home indicator
      // (~34px) e safe-area-bottom mentre vv.height le esclude → kb e' ~68
      // anche senza tastiera. La tastiera iOS piu' piccola e' ~250px
      // (numerica). Tutto sotto 100 e' "rumore" della safe area.
      const final = rawKb < 100 ? 0 : rawKb;
      // Aggiorna sempre la cache silenziosamente: la prossima apertura
      // partira' con il valore esatto del dispositivo.
      if (final > 50) {
        cachedKbRef.current = final;
        try { localStorage.setItem('chatKbHeight', String(final)); } catch {}
      }
      // Tap lock window: durante i 500ms dopo pointerdown/focusin,
      // ignora valori INTERMEDI (final < cached - 30).
      const inTapLock = Date.now() < tapLockUntilRef.current;
      if (inTapLock && final < cachedKbRef.current - 30) return;
      setKbHeight(final);
      setReady(true);
    };
    const handleResize = () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        rafId = null;
        compute();
      });
    };
    compute(); // primo run sincrono al mount per settare ready=true
    vv.addEventListener('resize', handleResize);
    vv.addEventListener('scroll', handleResize);
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      vv.removeEventListener('resize', handleResize);
      vv.removeEventListener('scroll', handleResize);
    };
  }, []);

  // Helper: avvia/rilancia la finestra di "animating" che maschera il
  // jitter durante apertura/chiusura tastiera. Cancella eventuali timer
  // pendenti per evitare race se piu' eventi rapidi (focus → blur → focus).
  const startAnimatingWindow = (durationMs = 400) => {
    setAnimating(true);
    if (animatingTimerRef.current) clearTimeout(animatingTimerRef.current);
    animatingTimerRef.current = setTimeout(() => {
      setAnimating(false);
      animatingTimerRef.current = null;
    }, durationMs);
  };

  // Anticipa lo spostamento dell'input. Su iOS PWA, vv.resize non triggera
  // finche' l'animazione tastiera non e' finita (~300ms): nel frattempo
  // l'input resta a bottom:0 e la tastiera lo copre. Con focusin pre-impostiamo
  // una stima conservativa (290px ≈ tastiera iOS portrait + QuickType bar):
  // l'input parte su immediatamente, e quando vv.resize arrivera' col valore
  // esatto l'aggiustamento e' di pochi pixel, smooth grazie alla transition.
  useEffect(() => {
    const onFocusIn = (e) => {
      const tag = e.target?.tagName;
      if (tag !== 'TEXTAREA' && tag !== 'INPUT') return;
      tapLockUntilRef.current = Date.now() + 500;
      setKbHeight(prev => prev > 0 ? prev : cachedKbRef.current);
      startAnimatingWindow(200);
    };
    const onFocusOut = (e) => {
      const tag = e.target?.tagName;
      if (tag !== 'TEXTAREA' && tag !== 'INPUT') return;
      startAnimatingWindow(200);
    };
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    return () => {
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
      if (animatingTimerRef.current) clearTimeout(animatingTimerRef.current);
    };
  }, []);

  // Bootstrap apertura chat:
  // 1) carica cronologia da DB → se piena, mostra e basta (nessun saluto duplicato).
  // 2) se vuota OPPURE arrivati con trigger='sos' → bootstrap saluto contestuale
  //    (POST con text vuoto, non conta nel freemium).
  async function bootstrap() {
    setLoading(true);
    try {
      const { messages: history } = await api.chat.history();
      const normalized = (history || []).map(m => ({
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
      }));
      const needsGreeting = normalized.length === 0 || trigger === 'sos' || trigger === 'welcome' || trigger === 'percorso';
      setMessages(normalized);
      setHistoryLoaded(true);
      if (needsGreeting) {
        const { reply } = await api.chat.send('', trigger, percorso ? { percorso } : {});
        setMessages(prev => [...prev, { role: 'assistant', content: reply, createdAt: new Date().toISOString() }]);
      }
    } catch {
      setHistoryLoaded(true);
      setError('Impossibile avviare la chat. Controlla la connessione.');
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage(textOverride) {
    const text = (textOverride ?? input).trim();
    if (!text || loading || paywallReached) return;
    const nowIso = new Date().toISOString();
    const userMsg = { role: 'user', content: text, createdAt: nowIso };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setError('');
    try {
      track('chat_message_sent', { length: text.length });
      const res = await api.chat.send(text);
      setMessages(prev => [...prev, { role: 'assistant', content: res.reply, createdAt: new Date().toISOString() }]);
      if (res.freemium) setFreemiumStatus(res.freemium);
    } catch (err) {
      if (err.freemiumLimit?.feature === 'chat') {
        track('chat_limit_hit', { used: err.freemiumLimit.used, limit: err.freemiumLimit.limit });
        setPaywallReached(true);
        setFreemiumStatus({
          used: err.freemiumLimit.used,
          limit: err.freemiumLimit.limit,
          remaining: 0,
        });
      } else {
        setError(err.message || 'Errore nella risposta AI.');
      }
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }

  async function clearConversation() {
    if (clearing) return;
    if (!window.confirm('Cancellare tutta la conversazione? Non si puo\' annullare.')) return;
    setClearing(true);
    setMenuOpen(false);
    try {
      await api.chat.clear();
      setMessages([]);
      setError('');
      // Ri-bootstrap per avere subito un saluto contestuale fresco.
      const { reply } = await api.chat.send('', null);
      setMessages([{ role: 'assistant', content: reply, createdAt: new Date().toISOString() }]);
    } catch (err) {
      setError(err.message || 'Errore durante la cancellazione.');
    } finally {
      setClearing(false);
    }
  }

  // Quick replies dinamiche: vuoto se in loading, se l'ultimo messaggio
  // e' dell'utente, o se siamo in paywall.
  const lastMsg = messages[messages.length - 1];
  const showQuickReplies = !loading && !paywallReached && historyLoaded && (
    messages.length === 0 || lastMsg?.role === 'assistant'
  );
  const quickReplies = useMemo(
    () => getQuickReplies({ hour: new Date().getHours(), trigger, hasHistory: messages.length > 0 }),
    [trigger, messages.length > 0]
  );

  async function handleResolved() {
    setResolving(true);
    try {
      const summary = messages.filter(m => m.role === 'user').map(m => m.content).join(' | ').slice(0, 200);
      await api.craving.create({ context: summary });
    } catch { /* non critico */ }
    finally {
      setResolving(false);
      navigate('/home');
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  // Colonna centrata: su mobile occupa tutta la larghezza (max 430).
  // Su desktop e' una colonna 430px centrata orizzontalmente.
  const columnBase = {
    position: 'fixed',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '100%',
    maxWidth: `${MAX_WIDTH}px`,
  };

  // Style condizionato per iOS PWA vs Android/desktop
  const outerWrapperStyle = isIOS ? null : {
    height: '100dvh',
    maxHeight: '100dvh',
    width: '100%',
    maxWidth: `${MAX_WIDTH}px`,
    marginLeft: 'auto',
    marginRight: 'auto',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  };

  const headerStyle = isIOS ? {
    ...columnBase,
    top: `${vvOffset}px`,
    height: `calc(${HEADER_HEIGHT}px + env(safe-area-inset-top, 0px))`,
    zIndex: 20,
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0 1rem',
    paddingTop: 'env(safe-area-inset-top, 0px)',
    borderBottom: '1px solid rgba(220, 232, 222, 0.5)',
    backgroundColor: '#ffffff',
  } : {
    flexShrink: 0,
    height: `calc(${HEADER_HEIGHT}px + env(safe-area-inset-top, 0px))`,
    zIndex: 20,
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0 1rem',
    paddingTop: 'env(safe-area-inset-top, 0px)',
    borderBottom: '1px solid rgba(220, 232, 222, 0.5)',
    backgroundColor: '#ffffff',
    position: 'relative',
  };

  const contentWrapperStyle = isIOS ? {
    position: 'fixed',
    left: '50%',
    top: `calc(${vvOffset}px + ${HEADER_HEIGHT}px + env(safe-area-inset-top, 0px))`,
    bottom: kbHeight > 0
      ? `${kbHeight}px`
      : 'env(safe-area-inset-bottom, 0px)',
    width: '100%',
    maxWidth: `${MAX_WIDTH}px`,
    transform: 'translateX(-50%)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    opacity: ready && !animating ? 1 : 0,
    transition: 'opacity 120ms ease-out',
  } : {
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  };

  const contentBody = (
    <>
      <header style={headerStyle}>
        {/* Overlay sage scuro nella zona safe-area (dietro la status bar).
            Con apple-mobile-web-app-status-bar-style=black-translucent il
            testo della status bar e' bianco: serve uno sfondo scuro dietro
            per essere leggibile. aria-hidden perche' puramente decorativo. */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 'env(safe-area-inset-top, 0px)',
            backgroundColor: '#6B8F71',
          }}
        />
        <button
          onClick={() => navigate('/home')}
          className="w-9 h-9 -ml-1 rounded-full flex items-center justify-center text-sage-700 hover:bg-sage-100/60 transition-colors active:scale-95 shrink-0"
          aria-label="Torna alla home"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sage-400 to-sage-600 flex items-center justify-center shrink-0 shadow-sage overflow-hidden">
          <img src="/icon-192.png" alt="" className="w-full h-full object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-base font-semibold text-sage-900 leading-tight truncate">QuitFresh Coach</p>
          <p className="text-[10px] text-sage-600/70 flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block" />
            {loading ? 'sta scrivendo…' : 'online · sempre qui'}
          </p>
        </div>
        <button
          onClick={handleResolved}
          disabled={resolving || messages.length < 2}
          className="ml-auto px-3 py-1.5 bg-gradient-to-br from-sage-500 to-sage-700 text-white text-[11px] font-semibold rounded-full shadow-sage disabled:opacity-40 active:scale-95 transition-all shrink-0"
        >
          {resolving ? '…' : "Ce l'ho fatta ✓"}
        </button>
        <div className="relative shrink-0">
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="w-9 h-9 rounded-full flex items-center justify-center text-sage-700 hover:bg-sage-100/60 transition-colors active:scale-95"
            aria-label="Menu chat"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="5" r="1.2" /><circle cx="12" cy="12" r="1.2" /><circle cx="12" cy="19" r="1.2" />
            </svg>
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-10 z-40 bg-white border border-sage-100 rounded-xl-soft shadow-soft py-1 min-w-[180px]">
                <button
                  onClick={clearConversation}
                  disabled={clearing || messages.length === 0}
                  className="w-full text-left px-3 py-2 text-xs text-terracotta-700 hover:bg-terracotta-50 disabled:opacity-40"
                >
                  {clearing ? 'Cancello…' : 'Cancella conversazione'}
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      {/* CONTENT WRAPPER — iOS PWA: position:fixed con bottom dinamico.
          Android/desktop: flex:1 dentro outer 100dvh flex column. */}
      <div ref={wrapperRef} style={contentWrapperStyle}>
        {/* MESSAGES */}
        <div
          className="overscroll-contain"
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '1rem',
            backgroundColor: '#fdfcf9',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <div className="space-y-3">
            {/* SOS Craving entry — azione guidata senza AI, alternativa
                immediata alla chat per chi vuole "fare" piuttosto che "parlare". */}
            <button
              onClick={() => navigate('/sos')}
              className="w-full bg-gradient-to-br from-terracotta-50 to-terracotta-100/70 border border-terracotta-200/80 rounded-2xl px-4 py-3 flex items-center gap-3 hover:from-terracotta-100 active:scale-[0.98] transition-all shadow-soft"
            >
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-xl shrink-0 shadow-soft">
                🆘
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-semibold text-terracotta-900 leading-tight">SOS Craving</p>
                <p className="text-[11px] text-terracotta-700/80 leading-snug">Un'azione guidata di 2-3 minuti, senza dover scrivere.</p>
              </div>
              <span className="text-terracotta-700/70 text-lg">→</span>
            </button>

            {/* Empty state caldo: niente cronologia + non in caricamento.
                Mostrato sopra l'eventuale risposta in arrivo. */}
            {historyLoaded && messages.length === 0 && !loading && (
              <div className="bg-gradient-to-br from-sage-50 to-cream-50 border border-sage-100 rounded-2xl px-4 py-5 text-center animate-fade-in">
                <div className="w-12 h-12 rounded-full bg-white shadow-sage mx-auto mb-3 overflow-hidden">
                  <img src="/icon-192.png" alt="" className="w-full h-full object-cover" />
                </div>
                <p className="font-display text-base font-semibold text-sage-900 mb-1">
                  Sono qui per te.
                </p>
                <p className="text-xs text-sage-700/80 leading-relaxed">
                  Scrivimi quando vuoi: voglia di fumare, dubbi sulla citisina, o solo per fare il punto. Le tue conversazioni restano private, salvate per max 90 giorni.
                </p>
              </div>
            )}

            {messages.length === 0 && loading && (
              <div className="flex items-center gap-2 text-sage-500/70">
                <TypingDots />
              </div>
            )}

            {messages.map((msg, i) => {
              const isUser = msg.role === 'user';
              const prev = messages[i - 1];
              // Mostra timestamp se passati >2min dal precedente o se primo msg.
              const showTs = !prev || (msg.createdAt && prev.createdAt &&
                Math.abs(new Date(msg.createdAt) - new Date(prev.createdAt)) > 2 * 60000);
              return (
                <div key={i} className="animate-fade-in">
                  {showTs && msg.createdAt && (
                    <div className="text-center text-[10px] text-sage-500/60 my-2">
                      {fmtTime(msg.createdAt)}
                    </div>
                  )}
                  <div className={`flex items-end gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
                    {!isUser && (
                      <div className="w-7 h-7 rounded-full bg-white shadow-soft shrink-0 overflow-hidden border border-sage-100">
                        <img src="/icon-192.png" alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words shadow-soft ${
                        isUser
                          ? 'bg-gradient-to-br from-sage-500 to-sage-700 text-white rounded-br-md'
                          : 'bg-white text-sage-900 rounded-bl-md border border-sage-100/60'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                </div>
              );
            })}

            {loading && messages.length > 0 && (
              <div className="flex items-end gap-2 justify-start animate-fade-in">
                <div className="w-7 h-7 rounded-full bg-white shadow-soft shrink-0 overflow-hidden border border-sage-100">
                  <img src="/icon-192.png" alt="" className="w-full h-full object-cover" />
                </div>
                <div className="bg-white border border-sage-100/60 rounded-2xl rounded-bl-md px-4 py-3 shadow-soft">
                  <TypingDots />
                </div>
              </div>
            )}

            {error && (
              <p className="text-xs text-terracotta-600 text-center bg-terracotta-50 border border-terracotta-200 rounded-xl-soft px-3 py-2">
                {error}
              </p>
            )}

            {paywallReached && (
              <div className="mt-2">
                <FeatureLimitPaywall feature="chat" compact />
              </div>
            )}

            {!paywallReached && freemiumStatus && (
              <p className="text-[11px] text-sage-600/80 text-center">
                {freemiumStatus.remaining === 0
                  ? 'Ultimo messaggio della settimana — il contatore si riapre tra 7 giorni.'
                  : `${freemiumStatus.used} di ${freemiumStatus.limit} messaggi usati questa settimana (${freemiumStatus.remaining} ${freemiumStatus.remaining === 1 ? 'rimasto' : 'rimasti'}).`}
              </p>
            )}

            <div ref={bottomRef} />
          </div>
        </div>

        {/* QUICK REPLIES — sopra l'input, scroll orizzontale.
            Visibili quando l'utente puo' scegliere il prossimo turno
            (ultimo msg = assistant o chat vuota, niente loading/paywall). */}
        {showQuickReplies && quickReplies.length > 0 && (
          <div
            style={{ flexShrink: 0, padding: '0 0.75rem 0.5rem', backgroundColor: '#fdfcf9' }}
            className="overflow-x-auto"
          >
            <div className="flex gap-2 min-w-min">
              {quickReplies.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="shrink-0 px-3 py-1.5 bg-white border border-sage-200 text-sage-800 text-xs font-medium rounded-full shadow-soft hover:bg-sage-50 active:scale-95 transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* INPUT — flex-shrink:0 in fondo al wrapper. Si muove con esso.
            minHeight (non height fisso) cosi' cresce in altezza con il
            content della textarea (max 128px tramite onInput handler).
            Messages (flex:1) si comprime automaticamente. */}
        <div
          style={{
            flexShrink: 0,
            minHeight: INPUT_HEIGHT,
            padding: '0.75rem 1rem',
            borderTop: '1px solid rgba(220, 232, 222, 0.5)',
            backgroundColor: '#ffffff',
          }}
        >
          <div className="flex items-end gap-2 min-w-0">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={paywallReached}
              onPointerDown={() => {
                // SUBITO: manipola il DOM direttamente — senza aspettare
                // React render, l'animazione parte nello stesso frame del
                // touch, prima che iOS inizi ad alzare la tastiera.
                if (wrapperRef.current) {
                  wrapperRef.current.style.bottom = `${cachedKbRef.current}px`;
                }
                tapLockUntilRef.current = Date.now() + 500;
                setKbHeight(prev => prev > 0 ? prev : cachedKbRef.current);
                startAnimatingWindow(200);
              }}
              rows={1}
              placeholder="Scrivi qualcosa…"
              className="flex-1 min-w-0 resize-none px-4 py-2.5 border border-sage-200/70 rounded-2xl focus:outline-none focus:ring-2 focus:ring-sage-400 focus:border-transparent transition max-h-32 overflow-y-auto bg-cream-50"
              style={{ minHeight: '42px', fontSize: '16px' }}
              onInput={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
              }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading || paywallReached}
              className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-sage-500 to-sage-700 text-white rounded-full shadow-sage disabled:opacity-40 active:scale-95 transition-all shrink-0"
              aria-label="Invia"
            >
              <svg className="w-4 h-4 rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-7 7m7-7l7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  );

  // iOS: render diretto (header e wrapper sono entrambi position:fixed).
  // Android/desktop: avvolgi in un outer container 100dvh flex column.
  return isIOS ? contentBody : <div style={outerWrapperStyle}>{contentBody}</div>;
}

function TypingDots() {
  return (
    <div className="flex gap-1 items-center py-0.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 bg-sage-400 rounded-full animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}
