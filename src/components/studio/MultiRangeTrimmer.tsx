import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Scissors, Plus, Trash2, Check, Undo2 } from "lucide-react";
import { type SkipRegion } from "./SkipMarkerButton";

interface Props {
  duration: number;
  initialSkipRegions: SkipRegion[];
  videoUrl: string;
  onConfirm: (keepRegions: { startMs: number; endMs: number }[]) => void;
  onCancel: () => void;
}

function formatTime(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const m = String(Math.floor(totalSec / 60)).padStart(2, "0");
  const s = String(totalSec % 60).padStart(2, "0");
  return `${m}:${s}`;
}

export default function MultiRangeTrimmer({
  duration,
  initialSkipRegions,
  videoUrl,
  onConfirm,
  onCancel,
}: Props) {
  const [skipRegions, setSkipRegions] = useState<SkipRegion[]>(
    initialSkipRegions.map((r) => ({ ...r, endMs: r.endMs ?? duration }))
  );
  const [dragState, setDragState] = useState<{
    regionIdx: number;
    handle: "start" | "end";
  } | null>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [previewTime, setPreviewTime] = useState(0);

  const totalMs = Math.max(duration, 1000);

  const pxToMs = useCallback(
    (clientX: number) => {
      const bar = barRef.current;
      if (!bar) return 0;
      const rect = bar.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return Math.round(pct * totalMs);
    },
    [totalMs]
  );

  // Mouse move/up for drag handles
  useEffect(() => {
    if (!dragState) return;
    const onMove = (e: MouseEvent) => {
      const ms = pxToMs(e.clientX);
      setSkipRegions((prev) =>
        prev.map((r, i) => {
          if (i !== dragState.regionIdx) return r;
          if (dragState.handle === "start") {
            return { ...r, startMs: Math.min(ms, (r.endMs ?? totalMs) - 500) };
          } else {
            return { ...r, endMs: Math.max(ms, r.startMs + 500) };
          }
        })
      );
      setPreviewTime(ms);
      if (videoRef.current) {
        videoRef.current.currentTime = ms / 1000;
      }
    };
    const onUp = () => setDragState(null);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragState, pxToMs, totalMs]);

  const addSkipRegion = () => {
    const mid = totalMs / 2;
    setSkipRegions((prev) => [
      ...prev,
      { startMs: mid - 2000, endMs: mid + 2000 },
    ]);
  };

  const removeSkipRegion = (idx: number) => {
    setSkipRegions((prev) => prev.filter((_, i) => i !== idx));
  };

  const computeKeepRegions = () => {
    const sorted = [...skipRegions]
      .filter((r) => r.endMs !== null)
      .sort((a, b) => a.startMs - b.startMs);

    const keep: { startMs: number; endMs: number }[] = [];
    let cursor = 0;

    for (const skip of sorted) {
      if (skip.startMs > cursor) {
        keep.push({ startMs: cursor, endMs: skip.startMs });
      }
      cursor = Math.max(cursor, skip.endMs!);
    }
    if (cursor < totalMs) {
      keep.push({ startMs: cursor, endMs: totalMs });
    }
    return keep;
  };

  const keepRegions = computeKeepRegions();
  const totalKeepMs = keepRegions.reduce((acc, r) => acc + (r.endMs - r.startMs), 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-4xl mx-auto mb-6"
    >
      <div className="card-glass rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Scissors size={16} className="text-primary" />
            Scene Trimmer
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              Final: {formatTime(totalKeepMs)} / {formatTime(totalMs)}
            </span>
          </div>
        </div>

        {/* Video preview */}
        <div className="aspect-video w-full max-h-48 rounded-lg overflow-hidden bg-background border border-border">
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full h-full object-contain"
            muted
          />
        </div>

        {/* Timeline bar */}
        <div
          ref={barRef}
          className="relative h-14 bg-secondary rounded-lg overflow-hidden cursor-pointer select-none"
          onClick={(e) => {
            if (dragState) return;
            const ms = pxToMs(e.clientX);
            setPreviewTime(ms);
            if (videoRef.current) videoRef.current.currentTime = ms / 1000;
          }}
        >
          {/* Keep regions (green tint) */}
          {keepRegions.map((r, i) => (
            <div
              key={`keep-${i}`}
              className="absolute top-0 bottom-0 bg-primary/10"
              style={{
                left: `${(r.startMs / totalMs) * 100}%`,
                width: `${((r.endMs - r.startMs) / totalMs) * 100}%`,
              }}
            />
          ))}

          {/* Skip regions (red) with drag handles */}
          {skipRegions.map((region, i) => {
            const startPct = (region.startMs / totalMs) * 100;
            const endMs = region.endMs ?? totalMs;
            const widthPct = ((endMs - region.startMs) / totalMs) * 100;
            return (
              <div
                key={i}
                className="absolute top-0 bottom-0 bg-destructive/30 border-x-2 border-destructive/60 group"
                style={{ left: `${startPct}%`, width: `${widthPct}%` }}
              >
                {/* Left handle */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-destructive/50 z-10"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setDragState({ regionIdx: i, handle: "start" });
                  }}
                />
                {/* Right handle */}
                <div
                  className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-destructive/50 z-10"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setDragState({ regionIdx: i, handle: "end" });
                  }}
                />
                {/* Label */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[9px] font-mono text-destructive-foreground/70 bg-destructive/40 px-1 rounded">
                    SKIP
                  </span>
                </div>
                {/* Delete button */}
                <button
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeSkipRegion(i);
                  }}
                >
                  <Trash2 size={8} />
                </button>
              </div>
            );
          })}

          {/* Preview playhead */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-primary z-10 pointer-events-none"
            style={{ left: `${(previewTime / totalMs) * 100}%` }}
          />

          {/* Time labels */}
          <span className="absolute bottom-0.5 left-1 text-[9px] font-mono text-muted-foreground">
            00:00
          </span>
          <span className="absolute bottom-0.5 right-1 text-[9px] font-mono text-muted-foreground">
            {formatTime(totalMs)}
          </span>
        </div>

        {/* Region list */}
        {skipRegions.length > 0 && (
          <div className="space-y-1">
            {skipRegions.map((r, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/50 rounded-lg px-3 py-1.5"
              >
                <span className="w-2 h-2 rounded-sm bg-destructive/50" />
                <span className="font-mono">
                  Skip {formatTime(r.startMs)} → {formatTime(r.endMs ?? totalMs)}
                </span>
                <button
                  className="ml-auto text-muted-foreground hover:text-destructive transition-colors"
                  onClick={() => removeSkipRegion(i)}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <Button variant="secondary" size="sm" className="gap-1.5" onClick={addSkipRegion}>
            <Plus size={14} />
            Add Skip Region
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={onCancel}>
              <Undo2 size={14} />
              Cancel
            </Button>
            <Button
              size="sm"
              className="gap-1.5 glow-blue"
              onClick={() => onConfirm(keepRegions)}
            >
              <Check size={14} />
              Apply Trim
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
