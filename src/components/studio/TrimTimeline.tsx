import { useState, useRef, useCallback, useEffect } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Scissors, RotateCcw } from "lucide-react";

interface TrimTimelineProps {
  duration: number; // total duration in seconds
  trimStart: number;
  trimEnd: number;
  currentTime: number;
  onTrimChange: (start: number, end: number) => void;
  onSeek: (time: number) => void;
}

function fmtTime(sec: number) {
  const m = String(Math.floor(sec / 60)).padStart(2, "0");
  const s = String(Math.floor(sec % 60)).padStart(2, "0");
  return `${m}:${s}`;
}

const TrimTimeline = ({
  duration,
  trimStart,
  trimEnd,
  currentTime,
  onTrimChange,
  onSeek,
}: TrimTimelineProps) => {
  const trackRef = useRef<HTMLDivElement>(null);

  const leftPct = duration > 0 ? (trimStart / duration) * 100 : 0;
  const rightPct = duration > 0 ? (trimEnd / duration) * 100 : 100;
  const playheadPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleTrackClick = (e: React.MouseEvent) => {
    if (!trackRef.current || duration <= 0) return;
    const rect = trackRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onSeek(pct * duration);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="font-mono">{fmtTime(trimStart)}</span>
        <span className="flex items-center gap-1.5 text-primary font-semibold">
          <Scissors size={14} />
          Trim &amp; Cut
        </span>
        <span className="font-mono">{fmtTime(trimEnd)}</span>
      </div>

      {/* Visual timeline */}
      <div
        ref={trackRef}
        className="relative h-10 rounded-lg bg-secondary/50 cursor-pointer overflow-hidden border border-border"
        onClick={handleTrackClick}
      >
        {/* Dimmed outside trim */}
        <div
          className="absolute inset-y-0 left-0 bg-background/70 z-10"
          style={{ width: `${leftPct}%` }}
        />
        <div
          className="absolute inset-y-0 right-0 bg-background/70 z-10"
          style={{ width: `${100 - rightPct}%` }}
        />

        {/* Active trim region */}
        <div
          className="absolute inset-y-0 border-y-2 border-primary/60 z-20"
          style={{ left: `${leftPct}%`, width: `${rightPct - leftPct}%` }}
        />

        {/* Playhead */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-destructive z-30"
          style={{ left: `${playheadPct}%` }}
        />
      </div>

      {/* Range sliders */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Start</label>
          <Slider
            min={0}
            max={duration}
            step={0.1}
            value={[trimStart]}
            onValueChange={([v]) => onTrimChange(Math.min(v, trimEnd - 0.1), trimEnd)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">End</label>
          <Slider
            min={0}
            max={duration}
            step={0.1}
            value={[trimEnd]}
            onValueChange={([v]) => onTrimChange(trimStart, Math.max(v, trimStart + 0.1))}
          />
        </div>
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="gap-1.5 text-xs"
        onClick={() => onTrimChange(0, duration)}
      >
        <RotateCcw size={12} />
        Reset Trim
      </Button>
    </div>
  );
};

export default TrimTimeline;
