import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';

export default function Craving() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { startChat(); }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function startChat() {
    setLoading(true);
    try {
      const { reply } = await api.chat.send([]);
      setMessages([{ role: 'assistant', content: reply }]);
    } catch {
      setError('Impossibile avviare la chat. Controlla la connessione.');
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;
    const userMsg = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    setError('');
    try {
      const { reply } = await api.chat.send(newMessages);
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      setError(err.message || 'Errore nella risposta AI.');
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }

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

  return (
    <div
      className="w-full max-w-mobile mx-auto bg-cream-50 flex flex-col overflow-hidden"
      style={{ height: '100dvh', maxHeight: '100dvh' }}
    >

      {/* Header in alto — flexShrink:0 inline per essere robusti */}
      <header
        className="flex items-center gap-3 px-4 pb-3 border-b border-sage-100/50 bg-white"
        style={{
          flexShrink: 0,
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)',
        }}
      >
        <button
          onClick={() => navigate('/home')}
          className="w-9 h-9 -ml-1 rounded-full flex items-center justify-center text-sage-700 hover:bg-sage-100/60 transition-colors active:scale-95 shrink-0"
          aria-label="Torna alla home"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="min-w-0 flex-1">
          <p className="font-display text-base font-semibold text-sage-900 leading-tight truncate">QuitFresh Coach</p>
          <p className="text-[10px] text-sage-600/70">online · sempre qui</p>
        </div>
        <button
          onClick={handleResolved}
          disabled={resolving || messages.length < 2}
          className="ml-auto px-3 py-1.5 bg-gradient-to-br from-sage-500 to-sage-700 text-white text-[11px] font-semibold rounded-full shadow-sage disabled:opacity-40 active:scale-95 transition-all shrink-0"
        >
          {resolving ? '…' : "Ce l'ho fatta ✓"}
        </button>
      </header>

      {/* Messages — UNICA zona scrollabile. flex:1 + minHeight:0 inline
          per essere robusti (Tailwind compila utility ma alcuni SW cache
          potrebbero servire CSS vecchio). overscroll-contain previene
          pull-to-refresh iOS. */}
      <div
        className="overflow-y-auto overflow-x-hidden overscroll-contain px-4 py-4 space-y-3 bg-cream-50"
        style={{
          flex: '1 1 0%',
          minHeight: 0,
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {messages.length === 0 && loading && (
          <div className="flex items-center gap-2 text-sage-500/70">
            <TypingDots />
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words shadow-soft ${
                msg.role === 'user'
                  ? 'bg-gradient-to-br from-sage-500 to-sage-700 text-white rounded-br-md'
                  : 'bg-white text-sage-900 rounded-bl-md border border-sage-100/60'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && messages.length > 0 && (
          <div className="flex justify-start animate-fade-in">
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

        <div ref={bottomRef} />
      </div>

      {/* Input in basso — flexShrink:0 inline per essere robusti */}
      <div
        className="border-t border-sage-100/50 px-4 pt-3 bg-white"
        style={{
          flexShrink: 0,
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)',
        }}
      >
        <div className="flex items-end gap-2 min-w-0">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="Scrivi qualcosa…"
            className="flex-1 min-w-0 resize-none px-4 py-2.5 border border-sage-200/70 rounded-2xl focus:outline-none focus:ring-2 focus:ring-sage-400 focus:border-transparent transition max-h-32 overflow-y-auto bg-cream-50"
            style={{ minHeight: '42px', fontSize: '16px' }}
            onFocus={() => {
              setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 300);
            }}
            onInput={(e) => {
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
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
  );
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
