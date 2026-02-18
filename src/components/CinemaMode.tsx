import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, RotateCcw, Maximize, Minimize, Video } from "lucide-react";

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
      {/* Particles */}
      {Array.from({ length: 30 }).map((_, i) => (
        <motion.div key={i} className="absolute w-1 h-1 rounded-full"
          style={{ left: `${10 + (i * 2.7) % 80}%`, top: `${10 + (i * 3.1) % 80}%`, backgroundColor: LETTER_COLORS[i % 6] }}
          animate={{ opacity: [0, 0.8, 0], scale: [0, 1.5, 0] }}
          transition={{ duration: 2.5 + (i % 3), repeat: Infinity, delay: (i * 0.2) % 3 }} />
      ))}
      {/* Rings */}
      {[1, 2, 3].map((r) => (
        <motion.div key={r} className="absolute rounded-full border" style={{ width: r * 180, height: r * 180, borderColor: `${LETTER_COLORS[r - 1]}30` }}
          animate={{ scale: [1, 1.06, 1], opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 3 + r, repeat: Infinity }} />
      ))}
      {/* Logo letters */}
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
      {/* Tagline */}
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
    {/* Connector line */}
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
      {/* Confetti particles */}
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

/* ─── MAIN CINEMA MODE COMPONENT ─── */
interface CinemaModeProps {
  onClose: () => void;
}

const CinemaMode = ({ onClose }: CinemaModeProps) => {
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [started, setStarted] = useState(false);

  // Tick
  useEffect(() => {
    if (!playing) return;
    const interval = setInterval(() => {
      setElapsed((e) => {
        if (e >= TOTAL_DURATION) { setPlaying(false); return TOTAL_DURATION; }
        return e + 50;
      });
    }, 50);
    return () => clearInterval(interval);
  }, [playing]);

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

  const handleReset = () => { setElapsed(0); setPlaying(false); setStarted(false); };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  };

  const sceneComponents = [
    <SceneLogo progress={sceneProgress} />,
    <SceneGlobe progress={sceneProgress} />,
    <SceneGenerations progress={sceneProgress} />,
    <SceneLifeAspects progress={sceneProgress} />,
    <SceneCTA progress={sceneProgress} />,
  ];

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 sm:px-8 py-3 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Video size={18} className="text-primary" />
          <span className="font-bold text-sm text-foreground tracking-wide">Cinema Mode</span>
          <span className="text-xs text-muted-foreground hidden sm:inline">— Screen record this window to create your promo video</span>
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
          <button onClick={toggleFullscreen} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
          </button>
          <button onClick={onClose} className="px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-muted transition-colors text-muted-foreground">
            Exit
          </button>
        </div>
      </div>

      {/* Main stage */}
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div key={sceneIndex} className="absolute inset-0"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}>
            {!started ? (
              /* Start screen */
              <div className="flex flex-col items-center justify-center h-full"
                style={{ background: "radial-gradient(ellipse at center, hsl(240 30% 10%) 0%, hsl(var(--background)) 70%)" }}>
                <div className="flex items-end gap-1 mb-6">
                  {LETTERS.map((l, i) => (
                    <span key={i} className="font-black" style={{ color: LETTER_COLORS[i], fontSize: "clamp(3rem,9vw,7rem)", textShadow: `0 0 30px ${LETTER_COLORS[i]}80` }}>{l}</span>
                  ))}
                  <span className="text-muted-foreground font-bold self-end pb-1" style={{ fontSize: "clamp(1rem,2.5vw,2rem)" }}>.com</span>
                </div>
                <p className="text-gradient-brand text-2xl font-light tracking-widest mb-12" style={{ letterSpacing: "0.2em" }}>The Future is Together</p>
                <button onClick={handlePlay}
                  className="flex items-center gap-3 px-10 py-5 rounded-full font-bold text-xl text-background transition-transform hover:scale-105"
                  style={{ background: "linear-gradient(135deg, hsl(var(--brand-blue)), hsl(var(--brand-purple)), hsl(var(--brand-gold)))" }}>
                  <Play size={28} fill="currentColor" /> Play Full Presentation
                </button>
                <p className="text-muted-foreground text-sm mt-6">Duration: {Math.ceil(TOTAL_DURATION / 1000)}s · 5 scenes</p>
                <p className="text-muted-foreground text-xs mt-2">💡 Press Fullscreen, then screen-record for best quality</p>
              </div>
            ) : (
              sceneComponents[sceneIndex]
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom controls */}
      {started && (
        <div className="px-4 sm:px-8 py-4 border-t border-border bg-background/95 backdrop-blur-sm">
          {/* Progress bar */}
          <div className="relative h-1.5 bg-muted rounded-full mb-4 cursor-pointer"
            onClick={(e) => { const rect = e.currentTarget.getBoundingClientRect(); const pct = (e.clientX - rect.left) / rect.width; setElapsed(pct * TOTAL_DURATION); }}>
            {/* Scene segments */}
            {SCENES.map((s, i) => {
              const start = SCENES.slice(0, i).reduce((a, x) => a + x.duration, 0) / TOTAL_DURATION;
              const width = s.duration / TOTAL_DURATION;
              return (
                <div key={i} className="absolute top-0 h-full rounded-full opacity-30"
                  style={{ left: `${start * 100}%`, width: `${width * 100 - 0.3}%`, backgroundColor: s.color }} />
              );
            })}
            <motion.div className="absolute top-0 left-0 h-full rounded-full"
              style={{ width: `${totalProgress * 100}%`, background: `linear-gradient(to right, ${BRAND_COLORS[0]}, ${BRAND_COLORS[2]}, ${BRAND_COLORS[4]})` }} />
            {/* Thumb */}
            <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-foreground border-2 border-background shadow-lg"
              style={{ left: `calc(${totalProgress * 100}% - 8px)` }} />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={handleReset} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                <RotateCcw size={18} />
              </button>
              <button onClick={() => playing ? setPlaying(false) : handlePlay()}
                className="flex items-center gap-2 px-5 py-2 rounded-full font-semibold text-sm text-background transition-all hover:scale-105"
                style={{ background: "linear-gradient(135deg, hsl(var(--brand-blue)), hsl(var(--brand-purple)))" }}>
                {playing ? <><Pause size={16} fill="currentColor" /> Pause</> : <><Play size={16} fill="currentColor" /> Play</>}
              </button>
              <span className="text-muted-foreground text-xs font-mono">
                {Math.floor(elapsed / 1000)}s / {Math.floor(TOTAL_DURATION / 1000)}s
              </span>
            </div>
            <div className="flex items-center gap-2">
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
