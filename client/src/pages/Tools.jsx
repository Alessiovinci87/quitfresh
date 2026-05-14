import { useState, useEffect, useRef } from 'react';

export default function Tools() {
  const [activeTab, setActiveTab] = useState('breath');

  return (
    <div className="animate-fade-in">
      <header className="sticky top-0 z-30 px-6 pt-6 pb-3 bg-cream-50/85 backdrop-blur-xl border-b border-sage-100/30">
        <p className="text-[10px] uppercase tracking-[0.2em] text-sage-600/70 font-semibold">Aiuti</p>
        <h1 className="font-display text-3xl font-semibold text-sage-900 leading-tight mt-0.5">Strumenti</h1>
      </header>

      <div className="px-6 pt-6 pb-2">
        <div className="bg-white border border-sage-100/60 rounded-xl-soft p-1 shadow-soft flex gap-1 mb-6">
          {[
            { id: 'breath', label: 'Respira', icon: '🫁' },
            { id: 'timer', label: 'Timer', icon: '⏱' },
            { id: 'audio', label: 'Audio', icon: '🎧' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                activeTab === t.id
                  ? 'bg-gradient-to-br from-sage-500 to-sage-700 text-white shadow-sage'
                  : 'text-sage-700/70 hover:bg-sage-50'
              }`}
            >
              <span>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === 'breath' && <BreathingExercise />}
        {activeTab === 'timer' && <CravingTimer />}
        {activeTab === 'audio' && <AudioPlayer />}
      </div>
    </div>
  );
}

/* ─── BREATHING ─────────────────────────────────────────── */

const PHASES = [
  { label: 'Inspira', duration: 4, scale: 1.4 },
  { label: 'Tieni', duration: 4, scale: 1.4 },
  { label: 'Espira', duration: 4, scale: 1.0 },
  { label: 'Tieni', duration: 4, scale: 1.0 },
];

function BreathingExercise() {
  const [running, setRunning] = useState(false);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [count, setCount] = useState(PHASES[0].duration);
  const [cycles, setCycles] = useState(0);
  const [done, setDone] = useState(false);
  const totalCycles = 5;
  const intervalRef = useRef(null);

  function start() {
    setRunning(true);
    setPhaseIdx(0);
    setCount(PHASES[0].duration);
    setCycles(0);
    setDone(false);
  }

  function stop() {
    setRunning(false);
    clearInterval(intervalRef.current);
  }

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setCount((prev) => {
        if (prev > 1) return prev - 1;
        setPhaseIdx((pi) => {
          const next = (pi + 1) % PHASES.length;
          if (next === 0) {
            setCycles((c) => {
              if (c + 1 >= totalCycles) {
                setRunning(false);
                setDone(true);
                clearInterval(intervalRef.current);
              }
              return c + 1;
            });
          }
          setCount(PHASES[next].duration);
          return next;
        });
        return PHASES[0].duration;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [running]);

  const phase = PHASES[phaseIdx];

  if (done) {
    return (
      <div className="text-center py-12 animate-fade-in">
        <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-sage-500 to-sage-700 flex items-center justify-center text-white text-2xl shadow-sage mb-4">✓</div>
        <p className="font-display text-2xl font-semibold text-sage-900 mb-2">Fatto.</p>
        <p className="text-sm text-sage-700/80 mb-8 leading-relaxed">5 cicli completati. Il tuo sistema nervoso è più calmo adesso.</p>
        <button onClick={start} className="px-6 py-3 bg-gradient-to-br from-sage-500 to-sage-700 text-white rounded-xl-soft font-semibold text-sm shadow-sage active:scale-[0.98] transition-all">
          Ricomincia
        </button>
      </div>
    );
  }

  return (
    <div className="text-center py-4">
      <p className="text-[10px] uppercase tracking-[0.18em] text-sage-600/70 font-semibold mb-2">Box breathing 4·4·4·4</p>
      <p className="text-[11px] text-sage-700/70 mb-8">Ciclo {running ? cycles + 1 : '—'} di {totalCycles}</p>

      <div className="relative flex items-center justify-center mb-10 h-56">
        <div className="absolute w-40 h-40 rounded-full bg-gradient-to-br from-sage-100 via-cream-50 to-sage-200 opacity-50" />
        <div
          className="relative w-40 h-40 rounded-full bg-gradient-to-br from-sage-400 to-sage-600 flex items-center justify-center shadow-sage"
          style={{
            transform: running ? `scale(${phase.scale})` : 'scale(1)',
            transition: `transform ${phase.duration}s ease-in-out`,
          }}
        >
          <div className="text-center">
            <p className="font-display text-3xl font-semibold text-white tabular-nums leading-none">{running ? count : '·'}</p>
            <p className="text-[11px] font-medium text-white/90 mt-1.5 tracking-wide">{running ? phase.label : 'Tocca Inizia'}</p>
          </div>
        </div>
      </div>

      {!running ? (
        <button onClick={start} className="w-full py-4 bg-gradient-to-br from-sage-500 to-sage-700 text-white rounded-2xl-soft font-semibold text-base shadow-sage active:scale-[0.98] transition-all">
          Inizia
        </button>
      ) : (
        <button onClick={stop} className="w-full py-4 bg-white border border-sage-200 text-sage-700 rounded-2xl-soft font-medium text-base hover:bg-sage-50 transition-colors">
          Interrompi
        </button>
      )}

      <p className="mt-4 text-[11px] text-sage-600/60">
        Inspira 4s → Tieni 4s → Espira 4s → Tieni 4s
      </p>
    </div>
  );
}

/* ─── TIMER ─────────────────────────────────────────────── */

function CravingTimer() {
  const TOTAL = 5 * 60;
  const [remaining, setRemaining] = useState(TOTAL);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const intervalRef = useRef(null);

  function start() {
    setRemaining(TOTAL);
    setDone(false);
    setRunning(true);
  }

  function togglePause() {
    setRunning((r) => !r);
  }

  function reset() {
    setRunning(false);
    setDone(false);
    setRemaining(TOTAL);
    clearInterval(intervalRef.current);
  }

  useEffect(() => {
    if (!running) { clearInterval(intervalRef.current); return; }
    intervalRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          setRunning(false);
          setDone(true);
          clearInterval(intervalRef.current);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [running]);

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');
  const progress = ((TOTAL - remaining) / TOTAL) * 100;
  const radius = 70;
  const circ = 2 * Math.PI * radius;

  if (done) {
    return (
      <div className="text-center py-12 animate-fade-in">
        <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-sage-500 to-sage-700 flex items-center justify-center text-white text-2xl shadow-sage mb-4">✓</div>
        <p className="font-display text-2xl font-semibold text-sage-900 mb-2">Hai resistito.</p>
        <p className="text-sm text-sage-700/80 mb-8 leading-relaxed">Il picco del craving è passato. Bel lavoro.</p>
        <button onClick={start} className="px-6 py-3 bg-gradient-to-br from-sage-500 to-sage-700 text-white rounded-xl-soft font-semibold text-sm shadow-sage active:scale-[0.98] transition-all">
          Ricomincia
        </button>
      </div>
    );
  }

  return (
    <div className="text-center py-4">
      <p className="text-[10px] uppercase tracking-[0.18em] text-sage-600/70 font-semibold mb-2">Timer anti-craving</p>
      <p className="text-[11px] text-sage-700/70 mb-8 leading-snug px-4">
        Il picco dura al massimo 5 minuti. Aspetta che passi — il corpo ti dà retta.
      </p>

      <div className="relative flex items-center justify-center mb-10">
        <svg width="200" height="200" className="-rotate-90">
          <defs>
            <linearGradient id="timerGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#85a081" />
              <stop offset="100%" stopColor="#41553e" />
            </linearGradient>
          </defs>
          <circle cx="100" cy="100" r={radius} fill="none" stroke="rgba(104,131,97,0.12)" strokeWidth="10" />
          <circle
            cx="100" cy="100" r={radius}
            fill="none"
            stroke="url(#timerGrad)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={circ - (circ * progress) / 100}
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
        </svg>
        <div className="absolute text-center">
          <p className="font-display text-5xl font-semibold text-sage-900 tabular-nums leading-none tracking-tight">{mm}:{ss}</p>
          <p className="text-[11px] text-sage-600/70 mt-2 uppercase tracking-wider">{running ? 'in corso' : remaining === TOTAL ? 'pronto' : 'in pausa'}</p>
        </div>
      </div>

      {remaining === TOTAL && !running ? (
        <button onClick={start} className="w-full py-4 bg-gradient-to-br from-sage-500 to-sage-700 text-white rounded-2xl-soft font-semibold text-base shadow-sage active:scale-[0.98] transition-all">
          Avvia
        </button>
      ) : (
        <div className="flex gap-3">
          <button onClick={togglePause} className="flex-1 py-4 bg-gradient-to-br from-sage-500 to-sage-700 text-white rounded-2xl-soft font-semibold text-base shadow-sage active:scale-[0.98] transition-all">
            {running ? 'Pausa' : 'Riprendi'}
          </button>
          <button onClick={reset} className="px-5 py-4 bg-white border border-sage-200 text-sage-700 rounded-2xl-soft font-medium text-base hover:bg-sage-50 transition-colors">
            Reset
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── AUDIO ─────────────────────────────────────────────── */

const TRACKS = [
  { id: 'brown', label: 'Rumore marrone', desc: 'Frequenze basse, calmante. Funziona anche senza cuffie.', base: null, beat: null },
  { id: 'alpha', label: 'Alpha (10 Hz)', desc: 'Rilassamento consapevole. Richiede cuffie stereo.', base: 200, beat: 10 },
  { id: 'theta', label: 'Theta (6 Hz)', desc: 'Stato meditativo profondo. Richiede cuffie stereo.', base: 200, beat: 6 },
];

function AudioPlayer() {
  const [playing, setPlaying] = useState(null);
  const [volume, setVolume] = useState(0.4);
  const audioRef = useRef({ ctx: null, nodes: [] });

  function stopAll() {
    const { ctx, nodes } = audioRef.current;
    nodes.forEach(n => { try { n.stop?.(); n.disconnect?.(); } catch {} });
    audioRef.current.nodes = [];
    setPlaying(null);
  }

  function play(track) {
    stopAll();

    let ctx = audioRef.current.ctx;
    if (!ctx || ctx.state === 'closed') {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioRef.current.ctx = ctx;
    }
    if (ctx.state === 'suspended') ctx.resume();

    const gainNode = ctx.createGain();
    gainNode.gain.value = volume;
    gainNode.connect(ctx.destination);

    const nodes = [gainNode];

    if (track.id === 'brown') {
      const bufferSize = ctx.sampleRate * 4;
      const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const data = buffer.getChannelData(ch);
        let last = 0;
        for (let i = 0; i < bufferSize; i++) {
          const w = Math.random() * 2 - 1;
          data[i] = (last + 0.02 * w) / 1.02;
          last = data[i];
          data[i] *= 3.5;
        }
      }
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;
      src.connect(gainNode);
      src.start();
      nodes.push(src);
    } else {
      const merger = ctx.createChannelMerger(2);
      merger.connect(gainNode);

      const oscL = ctx.createOscillator();
      const gL = ctx.createGain(); gL.gain.value = 0.5;
      oscL.frequency.value = track.base;
      oscL.type = 'sine';
      oscL.connect(gL); gL.connect(merger, 0, 0);
      oscL.start();

      const oscR = ctx.createOscillator();
      const gR = ctx.createGain(); gR.gain.value = 0.5;
      oscR.frequency.value = track.base + track.beat;
      oscR.type = 'sine';
      oscR.connect(gR); gR.connect(merger, 0, 1);
      oscR.start();

      nodes.push(oscL, oscR);
    }

    audioRef.current.nodes = nodes;
    setPlaying(track.id);
  }

  useEffect(() => {
    const gainNode = audioRef.current.nodes[0];
    if (gainNode?.gain) gainNode.gain.value = volume;
  }, [volume]);

  useEffect(() => () => stopAll(), []);

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-sage-600/70 italic px-1">
        Per i binaural beats usa le cuffie — richiedono audio stereo.
      </p>

      {TRACKS.map((track) => {
        const isPlaying = playing === track.id;
        return (
          <div key={track.id} className={`rounded-2xl-soft border px-4 py-4 transition-all ${isPlaying ? 'border-sage-300 bg-white shadow-sage' : 'border-sage-100/60 bg-white shadow-soft'}`}>
            <div className="flex items-center justify-between mb-1">
              <p className={`font-display text-base font-semibold ${isPlaying ? 'text-sage-900' : 'text-sage-800'}`}>{track.label}</p>
              <button
                onClick={() => isPlaying ? stopAll() : play(track)}
                className={`w-10 h-10 rounded-full flex items-center justify-center text-white shadow-sage active:scale-95 transition-all ${isPlaying ? 'bg-gradient-to-br from-terracotta-400 to-terracotta-500' : 'bg-gradient-to-br from-sage-500 to-sage-700'}`}
                aria-label={isPlaying ? 'Stop' : 'Play'}
              >
                {isPlaying ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>
                ) : (
                  <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21"/></svg>
                )}
              </button>
            </div>
            <p className="text-xs text-sage-700/70 leading-snug">{track.desc}</p>
          </div>
        );
      })}

      <div className="bg-white rounded-2xl-soft border border-sage-100/60 px-4 py-4 shadow-soft mt-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-[10px] uppercase tracking-wider text-sage-600/70 font-semibold">Volume</label>
          <span className="font-display text-sm font-semibold text-sage-900 tabular-nums">{Math.round(volume * 100)}%</span>
        </div>
        <input
          type="range" min="0" max="1" step="0.05"
          value={volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          className="w-full accent-sage-600"
        />
      </div>
    </div>
  );
}
