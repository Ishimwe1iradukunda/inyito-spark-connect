import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Monitor,
  Camera,
  Music,
  Settings,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface AudioChannel {
  id: string;
  label: string;
  icon: "mic" | "system" | "camera" | "music";
  volume: number;     // 0-100
  muted: boolean;
  stream?: MediaStream | null;
}

interface AudioMixerProps {
  channels: AudioChannel[];
  onChannelChange: (id: string, patch: Partial<AudioChannel>) => void;
}

const ICONS = {
  mic: Mic,
  system: Monitor,
  camera: Camera,
  music: Music,
};

/* ------------------------------------------------------------------ */
/*  VU Meter per channel                                                */
/* ------------------------------------------------------------------ */

const ChannelMeter = ({ stream, muted }: { stream?: MediaStream | null; muted: boolean }) => {
  const [level, setLevel] = useState(0);
  const rafRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    if (!stream || muted) {
      setLevel(0);
      return;
    }
    try {
      const ctx = new AudioContext();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      analyserRef.current = analyser;

      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setLevel(Math.min(avg / 128, 1));
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();

      return () => {
        cancelAnimationFrame(rafRef.current);
        ctx.close();
      };
    } catch {
      return;
    }
  }, [stream, muted]);

  const barCount = 16;
  return (
    <div className="flex flex-col-reverse gap-px h-[80px] w-3">
      {Array.from({ length: barCount }).map((_, i) => {
        const threshold = i / barCount;
        const active = level > threshold && !muted;
        const color =
          i >= barCount * 0.85
            ? "bg-destructive"
            : i >= barCount * 0.65
            ? "bg-yellow-500"
            : "bg-green-500";
        return (
          <div
            key={i}
            className={`w-full h-1 rounded-[1px] transition-colors duration-75 ${
              active ? color : "bg-muted/40"
            }`}
          />
        );
      })}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Channel Strip                                                       */
/* ------------------------------------------------------------------ */

const ChannelStrip = ({
  channel,
  onChange,
}: {
  channel: AudioChannel;
  onChange: (patch: Partial<AudioChannel>) => void;
}) => {
  const Icon = ICONS[channel.icon];
  const MuteIcon = channel.muted
    ? channel.icon === "mic"
      ? MicOff
      : VolumeX
    : channel.icon === "mic"
    ? Mic
    : Volume2;

  return (
    <div className="flex flex-col items-center gap-2 min-w-[52px]">
      {/* Label */}
      <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground truncate max-w-[52px]">
        {channel.label}
      </span>

      {/* VU Meter */}
      <ChannelMeter stream={channel.stream} muted={channel.muted} />

      {/* Volume slider (vertical style via rotation) */}
      <div className="w-full px-1">
        <Slider
          min={0}
          max={100}
          step={1}
          value={[channel.muted ? 0 : channel.volume]}
          onValueChange={([v]) => onChange({ volume: v, muted: v === 0 })}
          className="h-1"
        />
      </div>
      <span className="text-[8px] font-mono text-muted-foreground">
        {channel.muted ? "—" : `${channel.volume}%`}
      </span>

      {/* Mute button */}
      <Button
        variant={channel.muted ? "destructive" : "ghost"}
        size="icon"
        className="h-6 w-6"
        onClick={() => onChange({ muted: !channel.muted })}
      >
        <MuteIcon size={10} />
      </Button>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Main Mixer                                                          */
/* ------------------------------------------------------------------ */

const AudioMixer = ({ channels, onChannelChange }: AudioMixerProps) => {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-1.5 mb-2">
        <Settings size={10} className="text-muted-foreground" />
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Audio Mixer
        </h4>
      </div>
      <div className="flex gap-3 justify-center flex-1 overflow-x-auto py-1">
        {channels.map((ch) => (
          <ChannelStrip key={ch.id} channel={ch} onChange={(patch) => onChannelChange(ch.id, patch)} />
        ))}
        {channels.length === 0 && (
          <div className="text-center text-muted-foreground/50 text-[10px] py-6">
            No audio sources
          </div>
        )}
      </div>
    </div>
  );
};

export default AudioMixer;
