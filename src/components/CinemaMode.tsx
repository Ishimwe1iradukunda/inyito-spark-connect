import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, RotateCcw, Maximize, Minimize, Video, Circle, Download, Info, Music, Volume2, VolumeX } from "lucide-react";

/* ─── AMBIENT MUSIC ENGINE ─── */
type TrackId = "cosmic" | "pulse" | "minimal";

interface Track {
  id: TrackId;
  label: string;
  description: string;
  emoji: string;
  color: string;
}

const TRACKS: Track[] = [
  { id: "cosmic",  label: "Cosmic Drift",   description: "Ethereal pads & shimmer", emoji: "🌌", color: "hsl(var(--brand-blue))" },
  { id: "pulse",   label: "Electric Pulse",  description: "Energetic beats & synth",  emoji: "⚡", color: "hsl(var(--brand-purple))" },
  { id: "minimal", label: "Pure Minimal",    description: "Calm tones & space",       emoji: "🌿", color: "hsl(var(--brand-green))" },
];

class AmbientPlayer {
  private ctx: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private nodes: AudioNode[] = [];
  private oscillators: OscillatorNode[] = [];
  private running = false;

  private get audio() {
    if (!this.ctx) this.ctx = new AudioContext();
    return this.ctx;
  }

  private makeGain(val: number, dest?: AudioNode) {
    const g = this.audio.createGain();
    g.gain.value = val;
    g.connect(dest ?? this.gainNode!);
    this.nodes.push(g);
    return g;
  }

  private osc(freq: number, type: OscillatorType, dest: AudioNode, detune = 0) {
    const o = this.audio.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    o.detune.value = detune;
    o.connect(dest);
    o.start();
    this.oscillators.push(o);
    return o;
  }

  private lfo(rate: number, depth: number, param: AudioParam) {
    const l = this.audio.createOscillator();
    const g = this.audio.createGain();
    l.frequency.value = rate;
    g.gain.value = depth;
    l.connect(g);
    g.connect(param);
    l.start();
    this.oscillators.push(l);
    this.nodes.push(g);
  }

  start(track: TrackId, volume: number) {
    this.stop();
    this.running = true;
    const ctx = this.audio;
    if (ctx.state === "suspended") ctx.resume();

    this.gainNode = ctx.createGain();
    this.gainNode.gain.value = volume;
    this.gainNode.connect(ctx.destination);

    if (track === "cosmic") this.playCosmic();
    else if (track === "pulse") this.playPulse();
    else this.playMinimal();
  }

  private playCosmic() {
    // Soft pad chords: C maj7 → Am7 cycling
    const notes = [130.81, 164.81, 196.00, 246.94, 261.63, 329.63];
    notes.forEach((f, i) => {
      const filter = this.audio.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 800 + i * 120;
      filter.connect(this.gainNode!);
      const g = this.makeGain(0.06, filter);
      const o = this.osc(f, "sawtooth", g, i * 5);
      // slow vibrato
      this.lfo(0.3 + i * 0.05, 3, o.frequency);
    });
    // shimmer high harmonics
    [523.25, 659.25, 783.99].forEach((f, i) => {
      const g = this.makeGain(0.018);
      this.osc(f, "sine", g, i * 2);
      this.lfo(0.15 + i * 0.1, 8, this.oscillators[this.oscillators.length - 1].frequency);
    });
    // sub bass drone
    const bassG = this.makeGain(0.07);
    this.osc(65.41, "sine", bassG);
  }

  private playPulse() {
    // Rhythmic gate effect via gain LFO
    const gateGain = this.audio.createGain();
    gateGain.gain.value = 0;
    gateGain.connect(this.gainNode!);
    this.nodes.push(gateGain);
    // Gate LFO at ~120bpm (2Hz)
    const gateLFO = this.audio.createOscillator();
    gateLFO.frequency.value = 2;
    const gateDepth = this.audio.createGain();
    gateDepth.gain.value = 0.15;
    gateLFO.connect(gateDepth);
    gateDepth.connect(gateGain.gain);
    gateLFO.start();
    this.oscillators.push(gateLFO);
    this.nodes.push(gateDepth);
    // Lead synth
    [220, 277.18, 329.63, 440].forEach((f, i) => {
      const filter = this.audio.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = f * 2;
      filter.Q.value = 2;
      filter.connect(gateGain);
      const g = this.makeGain(0.1, filter);
      this.osc(f, "square", g, i * 3);
    });
    // Bass pulse
    const bassFilter = this.audio.createBiquadFilter();
    bassFilter.type = "lowpass";
    bassFilter.frequency.value = 200;
    bassFilter.connect(this.gainNode!);
    const bassG = this.makeGain(0.12, bassFilter);
    const bassO = this.osc(55, "sawtooth", bassG);
    this.lfo(2, 20, bassO.frequency);
    // Hi-hat noise bursts (white noise via buffer)
    this.spawnNoise(0.03, "highpass", 6000);
  }

  private playMinimal() {
    // Clean sine tones in pentatonic scale with long attack/release envelope feel
    const freqs = [174.61, 220, 261.63, 349.23, 440];
    freqs.forEach((f, i) => {
      const filter = this.audio.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 600;
      filter.connect(this.gainNode!);
      const g = this.makeGain(0.04, filter);
      const o = this.osc(f, "sine", g);
      this.lfo(0.1 + i * 0.03, 2, o.frequency);
    });
    // gentle shimmer
    const shimG = this.makeGain(0.02);
    this.osc(880, "triangle", shimG);
    this.lfo(0.25, 6, this.oscillators[this.oscillators.length - 1].frequency);
    // sub
    const subG = this.makeGain(0.05);
    this.osc(87.31, "sine", subG);
  }

  private spawnNoise(vol: number, filterType: BiquadFilterType, filterFreq: number) {
    const bufSize = this.audio.sampleRate * 0.5;
    const buf = this.audio.createBuffer(1, bufSize, this.audio.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const src = this.audio.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const filter = this.audio.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = filterFreq;
    const g = this.audio.createGain();
    g.gain.value = vol;
    src.connect(filter);
    filter.connect(g);
    g.connect(this.gainNode!);
    src.start();
    this.nodes.push(filter, g);
  }

  setVolume(v: number) {
    if (this.gainNode) this.gainNode.gain.setTargetAtTime(v, this.audio.currentTime, 0.1);
  }

  stop() {
    this.running = false;
    this.oscillators.forEach(o => { try { o.stop(); } catch {} });
    this.oscillators = [];
    this.nodes.forEach(n => { try { n.disconnect(); } catch {} });
    this.nodes = [];
    if (this.gainNode) { try { this.gainNode.disconnect(); } catch {} this.gainNode = null; }
  }

  isRunning() { return this.running; }
}

const ambientPlayer = new AmbientPlayer();

const LETTERS = ["i", "n", "y", "i", "t", "o"];
const LETTER_COLORS = [
  "hsl(var(--brand-blue))",
  "hsl(var(--brand-green))",
  "hsl(var(--brand-gold))",
  "hsl(var(--brand-purple))",
  "hsl(var(--brand-orange))",
  "hsl(var(--brand-red))",
];
const TAGLINE = "The Future is Together";
const BRAND_COLORS = LETTER_COLORS;

/* ─── SCENE DURATIONS (ms) ─── */
const SCENES = [
  { id: "logo", label: "Logo Reveal", duration: 5000, color: "hsl(var(--brand-blue))" },
  { id: "globe", label: "Global Web", duration: 6000, color: "hsl(var(--brand-green))" },
  { id: "generations", label: "Generations", duration: 6000, color: "hsl(var(--brand-gold))" },
  { id: "life", label: "Life Aspects", duration: 6000, color: "hsl(var(--brand-purple))" },
  { id: "cta", label: "Join Us", duration: 5000, color: "hsl(var(--brand-orange))" },
];
const TOTAL_DURATION = SCENES.reduce((a, s) => a + s.duration, 0);

/* ─── SCENE COMPONENTS ─── */

const SceneLogo = ({ progress }: { progress: number }) => {
  const shown = Math.floor(progress * LETTERS.length * 1.4);
  const taglineChars = Math.floor(Math.max(0, progress - 0.5) * 2 * TAGLINE.length);
  return (
    <div className="flex flex-col items-center justify-center h-full"
      style={{ background: "radial-gradient(ellipse at center, hsl(240 30% 10%) 0%, hsl(var(--background)) 70%)" }}>
      {Array.from({ length: 30 }).map((_, i) => (
        <motion.div key={i} className="absolute w-1 h-1 rounded-full"
          style={{ left: `${10 + (i * 2.7) % 80}%`, top: `${10 + (i * 3.1) % 80}%`, backgroundColor: LETTER_COLORS[i % 6] }}
          animate={{ opacity: [0, 0.8, 0], scale: [0, 1.5, 0] }}
          transition={{ duration: 2.5 + (i % 3), repeat: Infinity, delay: (i * 0.2) % 3 }} />
      ))}
      {[1, 2, 3].map((r) => (
        <motion.div key={r} className="absolute rounded-full border" style={{ width: r * 180, height: r * 180, borderColor: `${LETTER_COLORS[r - 1]}30` }}
          animate={{ scale: [1, 1.06, 1], opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 3 + r, repeat: Infinity }} />
      ))}
      <div className="relative z-10 flex items-end gap-1 sm:gap-2 mb-6">
        {LETTERS.map((letter, i) => (
          <motion.span key={i} className="font-black" style={{ color: LETTER_COLORS[i], fontSize: "clamp(3.5rem,10vw,8rem)", textShadow: `0 0 40px ${LETTER_COLORS[i]}80` }}
            initial={{ opacity: 0, y: 60, scale: 0.5 }}
            animate={shown > i ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 60, scale: 0.5 }}
            transition={{ duration: 0.6, type: "spring", stiffness: 200 }}>
            {letter}
          </motion.span>
        ))}
        <motion.span className="text-muted-foreground font-bold self-end pb-2" style={{ fontSize: "clamp(1.2rem,3vw,2.5rem)" }}
          animate={{ opacity: shown >= LETTERS.length ? 1 : 0 }} transition={{ duration: 0.5 }}>
          .com
        </motion.span>
      </div>
      <motion.p className="text-xl sm:text-3xl font-light tracking-widest text-gradient-brand"
        style={{ letterSpacing: "0.2em" }} animate={{ opacity: progress > 0.4 ? 1 : 0 }} transition={{ duration: 0.5 }}>
        {TAGLINE.slice(0, taglineChars)}<span className="opacity-60">|</span>
      </motion.p>
      <motion.p className="mt-4 text-muted-foreground text-center text-sm sm:text-base max-w-md px-4"
        animate={{ opacity: progress > 0.8 ? 1 : 0 }} transition={{ duration: 0.5 }}>
        One platform. Every generation. All aspects of life — connected.
      </motion.p>
    </div>
  );
};

const GLOBE_NODES = [
  { x: 50, y: 50, color: "hsl(var(--brand-blue))" },
  { x: 48, y: 22, color: "hsl(var(--brand-green))" },
  { x: 62, y: 30, color: "hsl(var(--brand-gold))" },
  { x: 55, y: 68, color: "hsl(var(--brand-orange))" },
  { x: 75, y: 55, color: "hsl(var(--brand-purple))" },
  { x: 25, y: 45, color: "hsl(var(--brand-red))" },
  { x: 65, y: 75, color: "hsl(var(--brand-blue))" },
  { x: 38, y: 18, color: "hsl(var(--brand-gold))" },
  { x: 80, y: 25, color: "hsl(var(--brand-orange))" },
];
const CONNECTIONS = [[0,1],[0,2],[0,5],[1,2],[1,3],[2,4],[2,8],[3,6],[4,6],[0,3],[1,7],[5,3]];

const SceneGlobe = ({ progress }: { progress: number }) => {
  const visibleConns = Math.floor(progress * CONNECTIONS.length);
  const visibleNodes = Math.floor(progress * GLOBE_NODES.length * 1.5);
  return (
    <div className="flex flex-col items-center justify-center h-full px-4"
      style={{ background: "radial-gradient(ellipse at 60% 40%, hsl(213 94% 54% / 0.1) 0%, hsl(var(--background)) 60%)" }}>
      <motion.h2 className="text-3xl sm:text-5xl font-black mb-2 text-center"
        animate={{ opacity: progress > 0.05 ? 1 : 0, y: progress > 0.05 ? 0 : 30 }} transition={{ duration: 0.5 }}>
        <span className="text-gradient-brand">Connecting the World</span>
      </motion.h2>
      <motion.p className="text-muted-foreground text-base mb-6 text-center max-w-lg"
        animate={{ opacity: progress > 0.1 ? 1 : 0 }} transition={{ duration: 0.4 }}>
        inyito.com bridges every corner of the globe — one living, breathing network of people.
      </motion.p>
      <div className="relative w-full" style={{ maxWidth: 560, height: 300 }}>
        <svg viewBox="0 0 100 80" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
          <circle cx="50" cy="45" r="34" fill="none" stroke="hsl(var(--border))" strokeWidth="0.3" opacity={progress > 0.1 ? 1 : 0} />
          {[-18, 0, 18].map((o, i) => (
            <ellipse key={i} cx="50" cy={45 + o * 0.7} rx={Math.max(1, Math.sqrt(34*34 - o*o*0.5))} ry="4"
              fill="none" stroke="hsl(var(--border))" strokeWidth="0.2" opacity={progress > 0.15 ? 0.5 : 0} />
          ))}
          {CONNECTIONS.slice(0, visibleConns).map(([a, b], i) => {
            const nA = GLOBE_NODES[a], nB = GLOBE_NODES[b];
            return <line key={i} x1={nA.x*0.7+15} y1={nA.y*0.65+10} x2={nB.x*0.7+15} y2={nB.y*0.65+10}
              stroke={nA.color} strokeWidth="0.35" strokeOpacity="0.6" />;
          })}
          {GLOBE_NODES.map((n, i) => {
            const nx = n.x*0.7+15, ny = n.y*0.65+10;
            const visible = visibleNodes > i;
            return (
              <g key={i}>
                <motion.circle cx={nx} cy={ny} r={5} fill={n.color} fillOpacity="0.12"
                  animate={{ r: [5, 11, 5], opacity: [0.12, 0, 0.12] }} transition={{ duration: 2.5, repeat: Infinity, delay: i*0.3 }} />
                <circle cx={nx} cy={ny} r={3} fill={n.color} opacity={visible ? 1 : 0} />
              </g>
            );
          })}
        </svg>
      </div>
      <motion.div className="grid grid-cols-3 gap-8 mt-4" animate={{ opacity: progress > 0.75 ? 1 : 0 }} transition={{ duration: 0.5 }}>
        {[["190+","Countries","hsl(var(--brand-blue))"],["∞","Connections","hsl(var(--brand-gold))"],["All Ages","Supported","hsl(var(--brand-green))"]].map(([v,l,c],i) => (
          <div key={i} className="text-center">
            <p className="text-3xl font-black" style={{ color: c }}>{v}</p>
            <p className="text-muted-foreground text-sm">{l}</p>
          </div>
        ))}
      </motion.div>
    </div>
  );
};

const GENERATIONS = [
  { emoji:"👴", label:"Grandparent", age:"65+", action:"Sharing life stories", color:"hsl(var(--brand-gold))", bg:"hsl(var(--brand-gold) / 0.12)", border:"hsl(var(--brand-gold) / 0.3)" },
  { emoji:"👩", label:"Parent", age:"35–64", action:"Managing family life", color:"hsl(var(--brand-blue))", bg:"hsl(var(--brand-blue) / 0.12)", border:"hsl(var(--brand-blue) / 0.3)" },
  { emoji:"🧑", label:"Teen", age:"13–34", action:"Learning & creating", color:"hsl(var(--brand-purple))", bg:"hsl(var(--brand-purple) / 0.12)", border:"hsl(var(--brand-purple) / 0.3)" },
  { emoji:"👧", label:"Child", age:"Under 12", action:"Playing & discovering", color:"hsl(var(--brand-green))", bg:"hsl(var(--brand-green) / 0.12)", border:"hsl(var(--brand-green) / 0.3)" },
];

const SceneGenerations = ({ progress }: { progress: number }) => (
  <div className="flex flex-col items-center justify-center h-full px-4"
    style={{ background: "radial-gradient(ellipse at 30% 60%, hsl(270 75% 60% / 0.08) 0%, hsl(var(--background)) 60%)" }}>
    <motion.h2 className="text-3xl sm:text-5xl font-black mb-2 text-center"
      animate={{ opacity: progress > 0.05 ? 1 : 0, y: progress > 0.05 ? 0 : 30 }} transition={{ duration: 0.5 }}>
      <span className="text-gradient-brand">For Every Generation</span>
    </motion.h2>
    <motion.p className="text-muted-foreground text-base mb-10 text-center max-w-lg"
      animate={{ opacity: progress > 0.1 ? 1 : 0 }} transition={{ duration: 0.4 }}>
      From grandparents to grandchildren — inyito.com brings every age group together.
    </motion.p>
    <div className="relative w-full max-w-3xl">
      <motion.div className="hidden sm:block absolute top-1/2 left-0 h-0.5 -translate-y-1/2 z-0"
        style={{ background: "linear-gradient(to right, hsl(var(--brand-gold)), hsl(var(--brand-blue)), hsl(var(--brand-purple)), hsl(var(--brand-green)))" }}
        animate={{ width: `${Math.min(100, progress * 160)}%` }} transition={{ duration: 0.05 }} />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 relative z-10">
        {GENERATIONS.map((g, i) => (
          <motion.div key={i} className="flex flex-col items-center text-center"
            animate={{ opacity: progress > i * 0.18 ? 1 : 0, y: progress > i * 0.18 ? 0 : 40 }}
            transition={{ duration: 0.5 }}>
            <div className="relative w-full rounded-2xl p-4 border" style={{ background: g.bg, borderColor: g.border }}>
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full border-4 border-background" style={{ backgroundColor: g.color }} />
              <div className="text-5xl mb-2 mt-1">{g.emoji}</div>
              <h3 className="text-lg font-bold mb-0.5" style={{ color: g.color }}>{g.label}</h3>
              <p className="text-muted-foreground text-xs mb-1">{g.age}</p>
              <p className="text-foreground text-xs">{g.action}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </div>
);

const ASPECTS = [
  { icon:"💬", title:"Social", color:"hsl(var(--brand-blue))", bg:"hsl(var(--brand-blue) / 0.15)", border:"hsl(var(--brand-blue) / 0.35)" },
  { icon:"🛒", title:"Commerce", color:"hsl(var(--brand-orange))", bg:"hsl(var(--brand-orange) / 0.15)", border:"hsl(var(--brand-orange) / 0.35)" },
  { icon:"📚", title:"Learning", color:"hsl(var(--brand-green))", bg:"hsl(var(--brand-green) / 0.15)", border:"hsl(var(--brand-green) / 0.35)" },
  { icon:"💼", title:"Work", color:"hsl(var(--brand-gold))", bg:"hsl(var(--brand-gold) / 0.15)", border:"hsl(var(--brand-gold) / 0.35)" },
  { icon:"🎉", title:"Events", color:"hsl(var(--brand-purple))", bg:"hsl(var(--brand-purple) / 0.15)", border:"hsl(var(--brand-purple) / 0.35)" },
  { icon:"❤️", title:"Family", color:"hsl(var(--brand-red))", bg:"hsl(var(--brand-red) / 0.15)", border:"hsl(var(--brand-red) / 0.35)" },
];

const SceneLifeAspects = ({ progress }: { progress: number }) => (
  <div className="flex flex-col items-center justify-center h-full px-4"
    style={{ background: "radial-gradient(ellipse at 70% 30%, hsl(45 95% 55% / 0.08) 0%, hsl(var(--background)) 60%)" }}>
    <motion.h2 className="text-3xl sm:text-5xl font-black mb-2 text-center"
      animate={{ opacity: progress > 0.03 ? 1 : 0, y: progress > 0.03 ? 0 : 30 }} transition={{ duration: 0.5 }}>
      <span className="text-gradient-brand">Every Aspect of Life</span>
    </motion.h2>
    <motion.p className="text-muted-foreground text-base mb-8 text-center max-w-lg"
      animate={{ opacity: progress > 0.08 ? 1 : 0 }} transition={{ duration: 0.4 }}>
      inyito.com is not just an app — it's the full spectrum of human experience.
    </motion.p>
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full max-w-3xl">
      {ASPECTS.map((a, i) => (
        <motion.div key={i} className="rounded-2xl p-4 border text-center relative overflow-hidden"
          style={{ background: a.bg, borderColor: a.border }}
          animate={{ opacity: progress > i * 0.13 ? 1 : 0, scale: progress > i * 0.13 ? 1 : 0.7, y: progress > i * 0.13 ? 0 : 30 }}
          transition={{ duration: 0.5 }}>
          <div className="text-4xl mb-2">{a.icon}</div>
          <h3 className="text-lg font-black" style={{ color: a.color }}>{a.title}</h3>
          <motion.div className="absolute bottom-0 left-0 h-1 rounded-b-2xl" style={{ background: a.color }}
            animate={{ width: progress > i * 0.13 ? "100%" : "0%" }} transition={{ duration: 0.6, delay: 0.2 }} />
        </motion.div>
      ))}
    </div>
  </div>
);

const SceneCTA = ({ progress }: { progress: number }) => {
  const gradIdx = Math.floor(progress * (BRAND_COLORS.length - 1));
  return (
    <div className="flex flex-col items-center justify-center h-full px-4 relative overflow-hidden">
      <motion.div className="absolute inset-0" animate={{ opacity: progress }} style={{
        background: `radial-gradient(ellipse at 50% 50%, ${BRAND_COLORS[gradIdx % BRAND_COLORS.length]}25 0%, hsl(var(--background)) 65%)`,
      }} />
      {BRAND_COLORS.map((c, i) => (
        Array.from({ length: 5 }).map((_, j) => (
          <motion.div key={`${i}-${j}`} className="absolute w-2 h-2 rounded-full" style={{ backgroundColor: c, left: `${10 + i * 13 + j * 3}%`, top: "70%" }}
            animate={{ y: [-200 - j * 60, 0], opacity: [1, 0], scale: [1, 0.3] }}
            transition={{ duration: 2.5, delay: progress > 0.3 ? 0 : 99, repeat: Infinity, repeatDelay: 1.5 }} />
        ))
      ))}
      <div className="relative z-10 text-center">
        <motion.div className="flex items-end justify-center gap-1 mb-3"
          animate={{ opacity: progress > 0.05 ? 1 : 0, scale: progress > 0.05 ? 1 : 0.7 }} transition={{ duration: 0.6 }}>
          {LETTERS.map((l, i) => (
            <motion.span key={i} className="font-black" style={{ color: BRAND_COLORS[i], fontSize: "clamp(2.5rem,7vw,5.5rem)", textShadow: `0 0 30px ${BRAND_COLORS[i]}80` }}
              animate={{ y: [0, -8, 0] }} transition={{ duration: 2, repeat: Infinity, delay: i * 0.15 }}>
              {l}
            </motion.span>
          ))}
          <span className="text-muted-foreground font-bold self-end pb-2" style={{ fontSize: "clamp(1rem,2.5vw,2rem)" }}>.com</span>
        </motion.div>
        <motion.h2 className="text-2xl sm:text-4xl font-light tracking-widest text-gradient-brand mb-4"
          animate={{ opacity: progress > 0.2 ? 1 : 0 }} transition={{ duration: 0.5 }}>
          The Future is Together
        </motion.h2>
        <motion.p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto mb-8"
          animate={{ opacity: progress > 0.4 ? 1 : 0 }} transition={{ duration: 0.5 }}>
          Join millions of people across every generation connecting, learning, working, and living on inyito.com.
        </motion.p>
        <motion.div className="flex flex-col sm:flex-row gap-3 justify-center"
          animate={{ opacity: progress > 0.6 ? 1 : 0, y: progress > 0.6 ? 0 : 20 }} transition={{ duration: 0.5 }}>
          <div className="px-10 py-4 rounded-full font-black text-lg text-background text-center"
            style={{ background: `linear-gradient(135deg, ${BRAND_COLORS[0]}, ${BRAND_COLORS[2]}, ${BRAND_COLORS[3]})` }}>
            ✨ Join inyito.com
          </div>
        </motion.div>
        <motion.div className="flex justify-center gap-3 mt-8" animate={{ opacity: progress > 0.8 ? 1 : 0 }}>
          {BRAND_COLORS.map((c, i) => (
            <motion.div key={i} className="w-3 h-3 rounded-full" style={{ backgroundColor: c }}
              animate={{ scale: [1, 1.5, 1] }} transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.25 }} />
          ))}
        </motion.div>
        <motion.p className="text-muted-foreground text-xs mt-3 tracking-widest uppercase"
          animate={{ opacity: progress > 0.85 ? 1 : 0 }}>
          One Platform · Every Generation · All Aspects of Life
        </motion.p>
      </div>
    </div>
  );
};

/* ─── RECORDING STATE ─── */
type RecordingState = "idle" | "countdown" | "recording" | "done";

/* ─── MAIN CINEMA MODE COMPONENT ─── */
interface CinemaModeProps {
  onClose: () => void;
}

const CinemaMode = ({ onClose }: CinemaModeProps) => {
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [started, setStarted] = useState(false);
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [countdown, setCountdown] = useState(3);
  const [showTips, setShowTips] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);

  // Music state
  const [selectedTrack, setSelectedTrack] = useState<TrackId | null>(null);
  const [musicVolume, setMusicVolume] = useState(0.5);
  const [musicMuted, setMusicMuted] = useState(false);
  const [showMusicPanel, setShowMusicPanel] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Playback tick
  useEffect(() => {
    if (!playing) return;
    const interval = setInterval(() => {
      setElapsed((e) => {
        if (e >= TOTAL_DURATION) {
          setPlaying(false);
          // Auto-stop recording when presentation ends
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
            mediaRecorderRef.current.stop();
          }
          return TOTAL_DURATION;
        }
        return e + 50;
      });
    }, 50);
    return () => clearInterval(interval);
  }, [playing]);

  // Recording duration counter
  useEffect(() => {
    if (recordingState === "recording") {
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((d) => d + 1);
      }, 1000);
    } else {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (recordingState !== "done") setRecordingDuration(0);
    }
    return () => { if (recordingTimerRef.current) clearInterval(recordingTimerRef.current); };
  }, [recordingState]);

  // Music: start/stop with playback
  useEffect(() => {
    if (playing && selectedTrack) {
      ambientPlayer.start(selectedTrack, musicMuted ? 0 : musicVolume);
    } else {
      ambientPlayer.stop();
    }
    return () => { ambientPlayer.stop(); };
  }, [playing, selectedTrack]); // eslint-disable-line

  // Music: volume/mute changes
  useEffect(() => {
    ambientPlayer.setVolume(musicMuted ? 0 : musicVolume);
  }, [musicVolume, musicMuted]);

  // Current scene
  let sceneIndex = 0;
  let sceneElapsed = elapsed;
  for (let i = 0; i < SCENES.length; i++) {
    if (sceneElapsed <= SCENES[i].duration) { sceneIndex = i; break; }
    sceneElapsed -= SCENES[i].duration;
    if (i === SCENES.length - 1) sceneIndex = i;
  }
  const sceneProgress = Math.min(1, sceneElapsed / SCENES[sceneIndex].duration);
  const totalProgress = elapsed / TOTAL_DURATION;

  const handlePlay = useCallback(() => {
    if (!started) setStarted(true);
    if (elapsed >= TOTAL_DURATION) { setElapsed(0); }
    setPlaying(true);
  }, [elapsed, started]);

  const handleReset = () => {
    setElapsed(0);
    setPlaying(false);
    setStarted(false);
    setRecordingState("idle");
    setRecordingDuration(0);
    ambientPlayer.stop();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  };

  /* ─── RECORD & DOWNLOAD ─── */
  const handleRecordDownload = useCallback(async () => {
    try {
      // Ask user to share their screen/tab
      const stream = await (navigator.mediaDevices as any).getDisplayMedia({
        video: { width: 1920, height: 1080, frameRate: 30 },
        audio: false,
      });

      chunksRef.current = [];

      // Pick best supported format
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : MediaRecorder.isTypeSupported("video/webm")
        ? "video/webm"
        : "video/mp4";

      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t: MediaStreamTrack) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `inyito-promo-${Date.now()}.webm`;
        a.click();
        URL.revokeObjectURL(url);
        setRecordingState("done");
      };

      // Handle user stopping share from browser UI
      stream.getVideoTracks()[0].onended = () => {
        if (recorder.state === "recording") recorder.stop();
        setRecordingState("idle");
        setPlaying(false);
      };

      // Start countdown, then begin recording + playback
      setRecordingState("countdown");
      setCountdown(3);
      setElapsed(0);
      setStarted(false);
      setPlaying(false);

      let count = 3;
      const countInterval = setInterval(() => {
        count -= 1;
        setCountdown(count);
        if (count <= 0) {
          clearInterval(countInterval);
          recorder.start(100);
          setRecordingState("recording");
          setRecordingDuration(0);
          // Small delay so the "recording" UI is visible before animations start
          setTimeout(() => {
            setStarted(true);
            setPlaying(true);
          }, 200);
        }
      }, 1000);

    } catch (err) {
      // User cancelled or browser doesn't support
      console.warn("Screen capture cancelled or not supported:", err);
      setRecordingState("idle");
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setPlaying(false);
  }, []);

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const sceneComponents = [
    <SceneLogo progress={sceneProgress} />,
    <SceneGlobe progress={sceneProgress} />,
    <SceneGenerations progress={sceneProgress} />,
    <SceneLifeAspects progress={sceneProgress} />,
    <SceneCTA progress={sceneProgress} />,
  ];

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col">

      {/* ─── COUNTDOWN OVERLAY ─── */}
      <AnimatePresence>
        {recordingState === "countdown" && (
          <motion.div className="absolute inset-0 z-[200] flex flex-col items-center justify-center"
            style={{ background: "rgba(0,0,0,0.85)" }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <p className="text-muted-foreground text-sm uppercase tracking-widest mb-6 font-semibold">Recording starts in</p>
            <AnimatePresence mode="wait">
              <motion.span key={countdown}
                className="font-black text-center"
                style={{ fontSize: "clamp(6rem,20vw,14rem)", background: "linear-gradient(135deg, hsl(var(--brand-blue)), hsl(var(--brand-purple)))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
                initial={{ scale: 1.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ duration: 0.4, type: "spring" }}>
                {countdown}
              </motion.span>
            </AnimatePresence>
            <p className="text-muted-foreground text-sm mt-6">Get ready — Cinema Mode will auto-play</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── DONE OVERLAY ─── */}
      <AnimatePresence>
        {recordingState === "done" && (
          <motion.div className="absolute inset-0 z-[200] flex flex-col items-center justify-center"
            style={{ background: "rgba(0,0,0,0.88)" }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <motion.div className="text-6xl mb-4" animate={{ scale: [0.5, 1.2, 1] }} transition={{ duration: 0.6 }}>🎬</motion.div>
            <h2 className="text-3xl font-black text-foreground mb-2">Video Downloaded!</h2>
            <p className="text-muted-foreground text-base text-center max-w-sm mb-8">
              Your <strong>inyito-promo.webm</strong> file is in your Downloads folder.
            </p>
            {/* Platform tips */}
            <div className="rounded-2xl border border-border bg-card/80 backdrop-blur p-5 max-w-sm w-full mx-4 mb-6">
              <p className="text-sm font-bold text-foreground mb-3 flex items-center gap-2"><Info size={14} /> Upload to platforms</p>
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2"><span className="text-green-400 font-bold">✓</span><span><strong className="text-foreground">YouTube</strong> — upload WebM directly, up to 4K</span></div>
                <div className="flex items-center gap-2"><span className="text-green-400 font-bold">✓</span><span><strong className="text-foreground">Twitter / X</strong> — WebM supported, max 512MB</span></div>
                <div className="flex items-center gap-2"><span className="text-green-400 font-bold">✓</span><span><strong className="text-foreground">Facebook</strong> — WebM accepted</span></div>
                <div className="flex items-center gap-2"><span className="text-yellow-400 font-bold">→</span><span><strong className="text-foreground">Instagram / TikTok</strong> — convert to MP4 first via <a href="https://cloudconvert.com/webm-to-mp4" target="_blank" rel="noopener noreferrer" className="underline text-primary">CloudConvert.com</a></span></div>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setRecordingState("idle"); handleReset(); }}
                className="px-6 py-2.5 rounded-full border border-border text-sm text-muted-foreground hover:bg-muted transition-colors">
                Record Again
              </button>
              <button onClick={handleRecordDownload}
                className="px-6 py-2.5 rounded-full font-bold text-sm text-background transition-all hover:scale-105"
                style={{ background: "linear-gradient(135deg, hsl(var(--brand-blue)), hsl(var(--brand-purple)))" }}>
                New Recording
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── TOP BAR ─── */}
      <div className="flex items-center justify-between px-4 sm:px-8 py-3 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          {/* Recording indicator */}
          {recordingState === "recording" ? (
            <motion.div className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold"
              style={{ background: "hsl(0 85% 55% / 0.15)", color: "hsl(0 85% 65%)", border: "1px solid hsl(0 85% 55% / 0.3)" }}>
              <motion.div animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 1, repeat: Infinity }}
                className="w-2 h-2 rounded-full" style={{ backgroundColor: "hsl(0 85% 65%)" }} />
              REC {formatTime(recordingDuration)}
            </motion.div>
          ) : (
            <>
              <Video size={18} className="text-primary" />
              <span className="font-bold text-sm text-foreground tracking-wide">Cinema Mode</span>
              <span className="text-xs text-muted-foreground hidden sm:inline">— Screen record or use Record & Download</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Scene indicators */}
          <div className="hidden sm:flex gap-2 mr-4">
            {SCENES.map((s, i) => (
              <button key={i} onClick={() => { let t = 0; for(let j=0;j<i;j++) t+=SCENES[j].duration; setElapsed(t); setStarted(true); }}
                className="text-xs px-2 py-1 rounded-full border transition-all"
                style={{ borderColor: sceneIndex === i ? s.color : "hsl(var(--border))", color: sceneIndex === i ? s.color : "hsl(var(--muted-foreground))", backgroundColor: sceneIndex === i ? `${s.color}15` : "transparent" }}>
                {s.label}
              </button>
            ))}
          </div>

          {/* Music button */}
          <div className="relative">
            <button onClick={() => setShowMusicPanel(p => !p)}
              className="p-2 rounded-lg hover:bg-muted transition-colors flex items-center gap-1.5 text-xs"
              style={{ color: selectedTrack ? TRACKS.find(t => t.id === selectedTrack)?.color : "hsl(var(--muted-foreground))" }}>
              <Music size={16} />
              <span className="hidden sm:inline font-medium">{selectedTrack ? TRACKS.find(t => t.id === selectedTrack)?.label : "Music"}</span>
            </button>

            {/* Music panel dropdown */}
            <AnimatePresence>
              {showMusicPanel && (
                <motion.div
                  className="absolute right-0 top-10 z-50 w-72 rounded-2xl border border-border bg-card shadow-2xl p-4"
                  initial={{ opacity: 0, y: -8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }}
                  transition={{ duration: 0.18 }}>
                  <p className="text-xs font-bold text-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Music size={12} /> Background Music
                  </p>

                  {/* Track list */}
                  <div className="space-y-2 mb-4">
                    {/* None option */}
                    <button
                      onClick={() => { setSelectedTrack(null); ambientPlayer.stop(); }}
                      className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all text-left border"
                      style={{ borderColor: !selectedTrack ? "hsl(var(--border))" : "transparent", backgroundColor: !selectedTrack ? "hsl(var(--muted))" : "transparent" }}>
                      <span className="text-xl">🔇</span>
                      <div>
                        <p className="text-sm font-semibold text-foreground">No Music</p>
                        <p className="text-xs text-muted-foreground">Silent presentation</p>
                      </div>
                      {!selectedTrack && <div className="ml-auto w-2 h-2 rounded-full bg-foreground" />}
                    </button>

                    {TRACKS.map(track => (
                      <button key={track.id}
                        onClick={() => { setSelectedTrack(track.id); if (playing) ambientPlayer.start(track.id, musicMuted ? 0 : musicVolume); }}
                        className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all text-left border"
                        style={{
                          borderColor: selectedTrack === track.id ? track.color : "transparent",
                          backgroundColor: selectedTrack === track.id ? `${track.color}15` : "hsl(var(--muted) / 0.4)",
                        }}>
                        <span className="text-xl">{track.emoji}</span>
                        <div>
                          <p className="text-sm font-semibold" style={{ color: selectedTrack === track.id ? track.color : "hsl(var(--foreground))" }}>{track.label}</p>
                          <p className="text-xs text-muted-foreground">{track.description}</p>
                        </div>
                        {selectedTrack === track.id && <motion.div className="ml-auto w-2 h-2 rounded-full" style={{ backgroundColor: track.color }} animate={{ scale: [1, 1.4, 1] }} transition={{ duration: 1.2, repeat: Infinity }} />}
                      </button>
                    ))}
                  </div>

                  {/* Volume */}
                  {selectedTrack && (
                    <div className="border-t border-border pt-3">
                      <div className="flex items-center gap-2 mb-2">
                        <button onClick={() => setMusicMuted(m => !m)} className="text-muted-foreground hover:text-foreground transition-colors">
                          {musicMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                        </button>
                        <p className="text-xs text-muted-foreground">Volume</p>
                        <span className="text-xs text-muted-foreground ml-auto">{Math.round(musicVolume * 100)}%</span>
                      </div>
                      <input type="range" min={0} max={1} step={0.01} value={musicMuted ? 0 : musicVolume}
                        onChange={e => { setMusicVolume(+e.target.value); setMusicMuted(false); }}
                        className="w-full h-1.5 rounded-full appearance-none bg-muted cursor-pointer"
                        style={{ accentColor: TRACKS.find(t => t.id === selectedTrack)?.color }} />
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button onClick={toggleFullscreen} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
          </button>
          <button onClick={onClose} className="px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-muted transition-colors text-muted-foreground">
            Exit
          </button>
        </div>
      </div>

      {/* ─── MAIN STAGE ─── */}
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div key={sceneIndex} className="absolute inset-0"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}>
            {!started ? (
              <div className="flex flex-col items-center justify-center h-full"
                style={{ background: "radial-gradient(ellipse at center, hsl(240 30% 10%) 0%, hsl(var(--background)) 70%)" }}>
                <div className="flex items-end gap-1 mb-6">
                  {LETTERS.map((l, i) => (
                    <span key={i} className="font-black" style={{ color: LETTER_COLORS[i], fontSize: "clamp(3rem,9vw,7rem)", textShadow: `0 0 30px ${LETTER_COLORS[i]}80` }}>{l}</span>
                  ))}
                  <span className="text-muted-foreground font-bold self-end pb-1" style={{ fontSize: "clamp(1rem,2.5vw,2rem)" }}>.com</span>
                </div>
                <p className="text-gradient-brand text-2xl font-light tracking-widest mb-10" style={{ letterSpacing: "0.2em" }}>The Future is Together</p>

                {/* Two action buttons */}
                <div className="flex flex-col sm:flex-row gap-4 items-center">
                  <button onClick={handlePlay}
                    className="flex items-center gap-3 px-8 py-4 rounded-full font-bold text-lg text-background transition-transform hover:scale-105"
                    style={{ background: "linear-gradient(135deg, hsl(var(--brand-blue)), hsl(var(--brand-purple)), hsl(var(--brand-gold)))" }}>
                    <Play size={22} fill="currentColor" /> Play Presentation
                  </button>
                  <button onClick={handleRecordDownload}
                    className="flex items-center gap-3 px-8 py-4 rounded-full font-bold text-lg border-2 transition-all hover:scale-105"
                    style={{ borderColor: "hsl(0 85% 55%)", color: "hsl(0 85% 65%)", background: "hsl(0 85% 55% / 0.1)" }}>
                    <Circle size={18} fill="hsl(0 85% 65%)" />
                    Record & Download
                  </button>
                </div>

                {/* Music picker on start screen */}
                <div className="mt-8 w-full max-w-sm">
                  <p className="text-xs text-muted-foreground text-center mb-3 flex items-center justify-center gap-1.5">
                    <Music size={12} /> Choose background music for your video
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => { setSelectedTrack(null); ambientPlayer.stop(); }}
                      className="rounded-xl px-3 py-2.5 border text-left transition-all hover:scale-105"
                      style={{ borderColor: !selectedTrack ? "hsl(var(--foreground) / 0.4)" : "hsl(var(--border))", backgroundColor: !selectedTrack ? "hsl(var(--muted))" : "transparent" }}>
                      <span className="text-base">🔇</span>
                      <p className="text-xs font-semibold text-foreground mt-1">No Music</p>
                    </button>
                    {TRACKS.map(track => (
                      <button key={track.id}
                        onClick={() => setSelectedTrack(track.id)}
                        className="rounded-xl px-3 py-2.5 border text-left transition-all hover:scale-105"
                        style={{ borderColor: selectedTrack === track.id ? track.color : "hsl(var(--border))", backgroundColor: selectedTrack === track.id ? `${track.color}18` : "transparent" }}>
                        <span className="text-base">{track.emoji}</span>
                        <p className="text-xs font-semibold mt-1" style={{ color: selectedTrack === track.id ? track.color : "hsl(var(--foreground))" }}>{track.label}</p>
                        <p className="text-[10px] text-muted-foreground">{track.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <button onClick={() => setShowTips(t => !t)} className="mt-6 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <Info size={12} /> How does Record & Download work?
                </button>
                <AnimatePresence>
                  {showTips && (
                    <motion.div className="mt-4 rounded-xl border border-border bg-card/80 p-4 max-w-sm text-xs text-muted-foreground text-center"
                      initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                      Your browser will ask you to <strong className="text-foreground">share this tab</strong>. Once selected, a 3-second countdown begins, then the presentation auto-plays and records. When it finishes, a <strong className="text-foreground">.webm video file</strong> is automatically downloaded to your device.
                    </motion.div>
                  )}
                </AnimatePresence>

                <p className="text-muted-foreground text-xs mt-4">Duration: {Math.ceil(TOTAL_DURATION / 1000)}s · 5 scenes · ~{Math.round(TOTAL_DURATION / 1000 * 8 / 8)}MB est.</p>
              </div>
            ) : (
              sceneComponents[sceneIndex]
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ─── BOTTOM CONTROLS ─── */}
      {started && (
        <div className="px-4 sm:px-8 py-4 border-t border-border bg-background/95 backdrop-blur-sm">
          {/* Progress bar */}
          <div className="relative h-1.5 bg-muted rounded-full mb-4 cursor-pointer"
            onClick={(e) => {
              if (recordingState === "recording") return; // don't allow scrubbing while recording
              const rect = e.currentTarget.getBoundingClientRect();
              const pct = (e.clientX - rect.left) / rect.width;
              setElapsed(pct * TOTAL_DURATION);
            }}>
            {SCENES.map((s, i) => {
              const start = SCENES.slice(0, i).reduce((a, x) => a + x.duration, 0) / TOTAL_DURATION;
              const width = s.duration / TOTAL_DURATION;
              return (
                <div key={i} className="absolute top-0 h-full rounded-full opacity-30"
                  style={{ left: `${start * 100}%`, width: `${width * 100 - 0.3}%`, backgroundColor: s.color }} />
              );
            })}
            <motion.div className="absolute top-0 left-0 h-full rounded-full"
              style={{ width: `${totalProgress * 100}%`, background: recordingState === "recording"
                ? "linear-gradient(to right, hsl(0 85% 55%), hsl(0 85% 65%))"
                : `linear-gradient(to right, ${BRAND_COLORS[0]}, ${BRAND_COLORS[2]}, ${BRAND_COLORS[4]})` }} />
            <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-foreground border-2 border-background shadow-lg"
              style={{ left: `calc(${totalProgress * 100}% - 8px)` }} />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {recordingState !== "recording" && (
                <button onClick={handleReset} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                  <RotateCcw size={18} />
                </button>
              )}
              {recordingState === "recording" ? (
                <button onClick={stopRecording}
                  className="flex items-center gap-2 px-5 py-2 rounded-full font-semibold text-sm transition-all hover:scale-105"
                  style={{ background: "hsl(0 85% 55% / 0.15)", color: "hsl(0 85% 65%)", border: "1px solid hsl(0 85% 55% / 0.4)" }}>
                  <Circle size={14} fill="hsl(0 85% 65%)" /> Stop & Download
                </button>
              ) : (
                <button onClick={() => playing ? setPlaying(false) : handlePlay()}
                  className="flex items-center gap-2 px-5 py-2 rounded-full font-semibold text-sm text-background transition-all hover:scale-105"
                  style={{ background: "linear-gradient(135deg, hsl(var(--brand-blue)), hsl(var(--brand-purple)))" }}>
                  {playing ? <><Pause size={16} fill="currentColor" /> Pause</> : <><Play size={16} fill="currentColor" /> Play</>}
                </button>
              )}
              <span className="text-muted-foreground text-xs font-mono">
                {Math.floor(elapsed / 1000)}s / {Math.floor(TOTAL_DURATION / 1000)}s
              </span>
            </div>
            <div className="flex items-center gap-2">
              {recordingState === "recording" && (
                <span className="text-xs text-muted-foreground font-mono mr-2">{formatTime(recordingDuration)}</span>
              )}
              {recordingState === "idle" && started && (
                <button onClick={handleRecordDownload}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all hover:scale-105"
                  style={{ borderColor: "hsl(0 85% 55% / 0.5)", color: "hsl(0 85% 65%)", background: "hsl(0 85% 55% / 0.08)" }}>
                  <Download size={12} /> Record & Download
                </button>
              )}
              <span className="text-xs font-semibold px-3 py-1 rounded-full border"
                style={{ color: SCENES[sceneIndex].color, borderColor: `${SCENES[sceneIndex].color}50`, backgroundColor: `${SCENES[sceneIndex].color}15` }}>
                Scene {sceneIndex + 1}: {SCENES[sceneIndex].label}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CinemaMode;
