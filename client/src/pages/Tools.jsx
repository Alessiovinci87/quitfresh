import { useState, useEffect, useRef } from 'react';

export default function Tools() {
  const [activeTab, setActiveTab] = useState('breath');

  return (
    <div className="px-6 py-8 animate-fade-in">
      <h1 className="text-xl font-bold text-gray-900 mb-6">Strumenti</h1>

      <div className="flex gap-2 mb-6">
        {[
          { id: 'breath', label: '🫁 Respira' },
          { id: 'timer', label: '⏱ Timer' },
          { id: 'audio', label: '🎧 Audio' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
              activeTab === t.id
                ? 'bg-sage-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'breath' && <BreathingExercise />}
      {activeTab === 'timer' && <CravingTimer />}
      {activeTab === 'audio' && <AudioPlayer />}
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
        <p className="text-5xl mb-4">✓</p>
        <p className="text-xl font-bold text-gray-900 mb-2">Fatto.</p>
        <p className="text-sm text-gray-500 mb-8">5 cicli completati. Il tuo sistema nervoso è più calmo adesso.</p>
        <button onClick={start} className="px-6 py-3 bg-sage-500 text-white rounded-xl font-semibold text-sm hover:bg-sage-600 transition-colors">
          Ricomincia
        </button>
      </div>
    );
  }

  return (
    <div className="text-center py-6">
      <p className="text-sm text-gray-500 mb-2">Box breathing — 4-4-4-4</p>
      <p className="text-xs text-gray-400 mb-8">Ciclo {running ? cycles + 1 : '—'} di {totalCycles}</p>

      <div className="relative flex items-center justify-center mb-10">
        <div
          className="w-40 h-40 rounded-full bg-sage-100 border-4 border-sage-400 flex items-center justify-center transition-all"
          style={{
            transform: running ? `scale(${phase.scale})` : 'scale(1)',
            transition: `transform ${phase.duration}s ease-in-out`,
          }}
        >
          <div className="text-center">
            <p className="text-2xl font-bold text-sage-700">{running ? count : ''}</p>
            <p className="text-sm font-medium text-sage-600">{running ? phase.label : ''}</p>
          </div>
        </div>
      </div>

      {!running ? (
        <button onClick={start} className="w-full py-4 bg-sage-500 text-white rounded-2xl font-bold text-base hover:bg-sage-600 transition-colors">
          Inizia
        </button>
      ) : (
        <button onClick={stop} className="w-full py-4 bg-gray-100 text-gray-700 rounded-2xl font-semibold text-base hover:bg-gray-200 transition-colors">
          Interrompi
        </button>
      )}

      <p className="mt-4 text-xs text-gray-400">
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
        <p className="text-5xl mb-4">✓</p>
        <p className="text-xl font-bold text-gray-900 mb-2">Hai resistito.</p>
        <p className="text-sm text-gray-500 mb-8">Il picco del craving è passato. Bel lavoro.</p>
        <button onClick={start} className="px-6 py-3 bg-sage-500 text-white rounded-xl font-semibold text-sm hover:bg-sage-600 transition-colors">
          Ricomincia
        </button>
      </div>
    );
  }

  return (
    <div className="text-center py-6">
      <p className="text-sm text-gray-500 mb-2">Timer anti-craving</p>
      <p className="text-xs text-gray-400 mb-8">Il picco dura al massimo 5 minuti. Aspetta che passi.</p>

      <div className="relative flex items-center justify-center mb-10">
        <svg width="180" height="180" className="-rotate-90">
          <circle cx="90" cy="90" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="8" />
          <circle
            cx="90" cy="90" r={radius}
            fill="none"
            stroke="#6B8F71"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={circ - (circ * progress) / 100}
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
        </svg>
        <div className="absolute text-center">
          <p className="text-4xl font-bold text-gray-900 tabular-nums">{mm}:{ss}</p>
          <p className="text-xs text-gray-500 mt-1">{running ? 'in corso' : remaining === TOTAL ? 'pronto' : 'in pausa'}</p>
        </div>
      </div>

      {remaining === TOTAL && !running ? (
        <button onClick={start} className="w-full py-4 bg-sage-500 text-white rounded-2xl font-bold text-base hover:bg-sage-600 transition-colors">
          Avvia
        </button>
      ) : (
        <div className="flex gap-3">
          <button onClick={togglePause} className="flex-1 py-4 bg-sage-500 text-white rounded-2xl font-bold text-base hover:bg-sage-600 transition-colors">
            {running ? 'Pausa' : 'Riprendi'}
          </button>
          <button onClick={reset} className="px-5 py-4 bg-gray-100 text-gray-700 rounded-2xl font-semibold text-base hover:bg-gray-200 transition-colors">
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
    <div className="space-y-4">
      <p className="text-xs text-gray-400 mb-2">
        Per i binaural beats usa le cuffie — richiedono audio stereo per funzionare.
      </p>

      {TRACKS.map((track) => (
        <div key={track.id} className={`rounded-xl border px-4 py-4 transition-colors ${playing === track.id ? 'border-sage-400 bg-sage-50' : 'border-gray-200 bg-gray-50'}`}>
          <div className="flex items-center justify-between mb-1">
            <p className={`text-sm font-semibold ${playing === track.id ? 'text-sage-800' : 'text-gray-800'}`}>{track.label}</p>
            <button
              onClick={() => playing === track.id ? stopAll() : play(track)}
              className={`w-9 h-9 rounded-full flex items-center justify-center text-white transition-colors ${playing === track.id ? 'bg-sage-600' : 'bg-sage-500 hover:bg-sage-600'}`}
            >
              {playing === track.id ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>
              ) : (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21"/></svg>
              )}
            </button>
          </div>
          <p className="text-xs text-gray-500">{track.desc}</p>
        </div>
      ))}

      <div className="pt-2">
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs text-gray-500">Volume</label>
          <span className="text-xs text-gray-500">{Math.round(volume * 100)}%</span>
        </div>
        <input
          type="range" min="0" max="1" step="0.05"
          value={volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          className="w-full accent-sage-500"
        />
      </div>
    </div>
  );
}
