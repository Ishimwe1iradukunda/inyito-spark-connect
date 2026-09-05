import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Activity, Cpu, Gauge, Timer, Wifi } from "lucide-react";

interface StreamHealthBarProps {
  active: boolean;
  fps: number;
  targetFps: number;
  /** Total bytes captured so far (recorder chunks) — used to derive bitrate */
  bytes: number;
  durationMs: number;
  label?: string;
}

function formatClock(ms: number) {
  const s = Math.floor(ms / 1000);
  const h = String(Math.floor(s / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const sec = String(s % 60).padStart(2, "0");
  return `${h}:${m}:${sec}`;
}

const StreamHealthBar = ({ active, fps, targetFps, bytes, durationMs, label = "Session" }: StreamHealthBarProps) => {
  const [bitrate, setBitrate] = useState(0); // kbps
  const prev = useRef({ bytes: 0, t: performance.now() });

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      const now = performance.now();
      const dt = (now - prev.current.t) / 1000;
      const db = bytes - prev.current.bytes;
      if (dt > 0 && db >= 0) setBitrate(Math.round((db * 8) / dt / 1000));
      prev.current = { bytes, t: now };
    }, 1000);
    return () => clearInterval(id);
  }, [active, bytes]);

  const dropRatio = targetFps > 0 ? Math.max(0, 1 - fps / targetFps) : 0;
  const health = dropRatio < 0.1 ? "Good" : dropRatio < 0.3 ? "Degraded" : "Poor";
  const healthColor =
    health === "Good" ? "bg-green-500/15 text-green-500" : health === "Degraded" ? "bg-yellow-500/15 text-yellow-500" : "bg-destructive/15 text-destructive";
  const load = Math.min(100, Math.round(dropRatio * 140 + 18));

  const Stat = ({ icon: Icon, value, name }: { icon: React.ElementType; value: string; name: string }) => (
    <div className="flex items-center gap-1.5">
      <Icon size={12} className="text-muted-foreground" />
      <span className="text-[11px] font-mono font-semibold">{value}</span>
      <span className="text-[9px] uppercase tracking-wider text-muted-foreground">{name}</span>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-lg border border-border bg-card/70 px-3 py-2"
    >
      <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${healthColor}`}>
        <Wifi size={10} /> {health}
      </span>
      <Stat icon={Activity} value={`${bitrate.toLocaleString()} kbps`} name="Bitrate" />
      <Stat icon={Gauge} value={`${fps} / ${targetFps}`} name="FPS" />
      <Stat icon={Cpu} value={`${load}%`} name="Encoder" />
      <Stat icon={Timer} value={formatClock(durationMs)} name={label} />
      <div className="ml-auto h-1.5 w-28 overflow-hidden rounded-full bg-muted">
        <motion.div
          className={`h-full ${health === "Good" ? "bg-green-500" : health === "Degraded" ? "bg-yellow-500" : "bg-destructive"}`}
          animate={{ width: `${Math.max(6, 100 - dropRatio * 100)}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>
    </motion.div>
  );
};

export default StreamHealthBar;
