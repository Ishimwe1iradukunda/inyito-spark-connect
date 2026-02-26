import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Mic, MicOff, Volume2, VolumeX } from "lucide-react";

interface AudioLevelMeterProps {
  stream: MediaStream | null;
  label: string;
  type: "mic" | "system";
  enabled: boolean;
}

const BAR_COUNT = 8;

const AudioLevelMeter = ({ stream, label, type, enabled }: AudioLevelMeterProps) => {
  const [level, setLevel] = useState(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!stream || !enabled) {
      setLevel(0);
      return;
    }

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
      setLevel(0);
      return;
    }

    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.5;

    const source = ctx.createMediaStreamSource(new MediaStream(audioTracks));
    source.connect(analyser);

    ctxRef.current = ctx;
    analyserRef.current = analyser;
    sourceRef.current = source;

    const data = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      analyser.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b, 0) / data.length;
      setLevel(Math.min(avg / 128, 1)); // normalize 0-1
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      source.disconnect();
      ctx.close();
    };
  }, [stream, enabled]);

  const Icon = type === "mic" ? (enabled ? Mic : MicOff) : (enabled ? Volume2 : VolumeX);
  const activeBars = Math.round(level * BAR_COUNT);

  return (
    <div className="flex items-center gap-2">
      <Icon
        size={14}
        className={enabled ? "text-primary" : "text-muted-foreground"}
      />
      <span className="text-[10px] text-muted-foreground w-14 truncate">
        {label}
      </span>
      <div className="flex items-end gap-px h-4">
        {Array.from({ length: BAR_COUNT }).map((_, i) => {
          const isActive = enabled && i < activeBars;
          const barHeight = 4 + (i / BAR_COUNT) * 12;
          return (
            <motion.div
              key={i}
              animate={{
                backgroundColor: !enabled
                  ? "hsl(var(--muted))"
                  : isActive
                  ? i < BAR_COUNT * 0.6
                    ? "hsl(var(--primary))"
                    : i < BAR_COUNT * 0.85
                    ? "hsl(45 93% 47%)"
                    : "hsl(var(--destructive))"
                  : "hsl(var(--muted))",
              }}
              style={{ height: barHeight, width: 3, borderRadius: 1 }}
              transition={{ duration: 0.05 }}
            />
          );
        })}
      </div>
    </div>
  );
};

export default AudioLevelMeter;
