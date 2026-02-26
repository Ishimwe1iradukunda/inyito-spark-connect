import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Diamond,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Zap,
} from "lucide-react";
import type {
  KeyframeTrack as KFTrack,
  Keyframe,
  EasingType,
} from "./KeyframeEngine";

interface KeyframesTrackProps {
  tracks: KFTrack[];
  currentTime: number;
  duration: number;
  onAddKeyframe: (trackId: string, time: number, value: number) => void;
  onRemoveKeyframe: (trackId: string, keyframeId: string) => void;
  onUpdateKeyframeEasing: (
    trackId: string,
    keyframeId: string,
    easing: EasingType
  ) => void;
  onSeek: (time: number) => void;
}

function fmtTime(sec: number) {
  const m = String(Math.floor(sec / 60)).padStart(2, "0");
  const s = String(Math.floor(sec % 60)).padStart(2, "0");
  const ms = String(Math.floor((sec % 1) * 10));
  return `${m}:${s}.${ms}`;
}

const EASING_OPTIONS: { value: EasingType; label: string }[] = [
  { value: "linear", label: "Linear" },
  { value: "ease-in", label: "Ease In" },
  { value: "ease-out", label: "Ease Out" },
  { value: "ease-in-out", label: "Ease In-Out" },
];

const KeyframesTrackPanel = ({
  tracks,
  currentTime,
  duration,
  onAddKeyframe,
  onRemoveKeyframe,
  onUpdateKeyframeEasing,
  onSeek,
}: KeyframesTrackProps) => {
  const [expandedTracks, setExpandedTracks] = useState<Set<string>>(new Set());
  const [selectedKf, setSelectedKf] = useState<{
    trackId: string;
    kfId: string;
  } | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedTracks((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const playheadPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Group tracks: filter tracks vs overlay tracks
  const filterTracks = tracks.filter((t) => !t.targetId);
  const overlayTrackGroups = new Map<string, KFTrack[]>();
  tracks
    .filter((t) => t.targetId)
    .forEach((t) => {
      const key = t.targetId!;
      if (!overlayTrackGroups.has(key)) overlayTrackGroups.set(key, []);
      overlayTrackGroups.get(key)!.push(t);
    });

  const renderTrack = (track: KFTrack) => {
    const isExpanded = expandedTracks.has(track.id);
    const sortedKfs = [...track.keyframes].sort((a, b) => a.time - b.time);
    const hasKeyframes = sortedKfs.length > 0;

    return (
      <div key={track.id} className="border-b border-border/50 last:border-0">
        {/* Track header */}
        <div
          className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted/30 cursor-pointer"
          onClick={() => toggleExpand(track.id)}
        >
          {isExpanded ? (
            <ChevronDown size={12} className="text-muted-foreground" />
          ) : (
            <ChevronRight size={12} className="text-muted-foreground" />
          )}
          <span className="text-[11px] font-medium flex-1 truncate">
            {track.label}
          </span>
          <span className="text-[9px] text-muted-foreground font-mono">
            {sortedKfs.length} kf
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={(e) => {
              e.stopPropagation();
              // Add keyframe at current time with default value
              const defaultVal =
                track.property === "opacity" || track.property === "overlayOpacity"
                  ? 100
                  : track.property === "brightness" ||
                    track.property === "contrast" ||
                    track.property === "saturation"
                  ? 100
                  : track.property === "x" || track.property === "y"
                  ? 50
                  : track.property === "fontSize"
                  ? 32
                  : 0;
              onAddKeyframe(track.id, currentTime, defaultVal);
            }}
            title="Add keyframe at current time"
          >
            <Plus size={10} />
          </Button>
        </div>

        {/* Timeline lane */}
        <div className="relative h-6 mx-2 mb-1">
          {/* Track background */}
          <div className="absolute inset-y-1 inset-x-0 bg-secondary/40 rounded-sm" />

          {/* Playhead */}
          <div
            className="absolute top-0 bottom-0 w-px bg-destructive/60 z-20"
            style={{ left: `${playheadPct}%` }}
          />

          {/* Keyframe diamonds */}
          {sortedKfs.map((kf) => {
            const pct = duration > 0 ? (kf.time / duration) * 100 : 0;
            const isSelected =
              selectedKf?.trackId === track.id &&
              selectedKf?.kfId === kf.id;
            return (
              <div
                key={kf.id}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 cursor-pointer group"
                style={{ left: `${pct}%` }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedKf({ trackId: track.id, kfId: kf.id });
                  onSeek(kf.time);
                }}
              >
                <Diamond
                  size={12}
                  className={`transition-colors ${
                    isSelected
                      ? "text-primary fill-primary"
                      : hasKeyframes
                      ? "text-accent-foreground fill-accent/60"
                      : "text-muted-foreground"
                  } group-hover:text-primary group-hover:fill-primary/60`}
                />
              </div>
            );
          })}

          {/* Interpolation lines between keyframes */}
          {sortedKfs.length >= 2 &&
            sortedKfs.slice(0, -1).map((kf, i) => {
              const next = sortedKfs[i + 1];
              const leftPct = (kf.time / duration) * 100;
              const rightPct = (next.time / duration) * 100;
              return (
                <div
                  key={`line-${kf.id}`}
                  className="absolute top-1/2 h-px bg-primary/40 z-5"
                  style={{
                    left: `${leftPct}%`,
                    width: `${rightPct - leftPct}%`,
                  }}
                />
              );
            })}
        </div>

        {/* Expanded: keyframe details */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="px-2 pb-2 space-y-1">
                {sortedKfs.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground text-center py-1">
                    No keyframes. Click + to add at playhead.
                  </p>
                ) : (
                  sortedKfs.map((kf) => {
                    const isSelected =
                      selectedKf?.trackId === track.id &&
                      selectedKf?.kfId === kf.id;
                    return (
                      <div
                        key={kf.id}
                        className={`flex items-center gap-1.5 px-1.5 py-1 rounded text-[10px] cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-primary/15 ring-1 ring-primary/30"
                            : "hover:bg-muted/40"
                        }`}
                        onClick={() => {
                          setSelectedKf({
                            trackId: track.id,
                            kfId: kf.id,
                          });
                          onSeek(kf.time);
                        }}
                      >
                        <Diamond size={8} className="text-primary fill-primary shrink-0" />
                        <span className="font-mono text-muted-foreground w-12">
                          {fmtTime(kf.time)}
                        </span>
                        <span className="font-mono font-semibold w-10">
                          {Number.isInteger(kf.value)
                            ? kf.value
                            : kf.value.toFixed(1)}
                          {track.unit}
                        </span>

                        {/* Easing selector */}
                        <Select
                          value={kf.easing}
                          onValueChange={(v) =>
                            onUpdateKeyframeEasing(
                              track.id,
                              kf.id,
                              v as EasingType
                            )
                          }
                        >
                          <SelectTrigger className="h-5 text-[9px] w-20 px-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {EASING_OPTIONS.map((e) => (
                              <SelectItem
                                key={e.value}
                                value={e.value}
                                className="text-[10px]"
                              >
                                {e.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 ml-auto text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveKeyframe(track.id, kf.id);
                            if (isSelected) setSelectedKf(null);
                          }}
                        >
                          <Trash2 size={9} />
                        </Button>
                      </div>
                    );
                  })
                )}

                {/* Value slider for selected keyframe */}
                {selectedKf?.trackId === track.id && (
                  <div className="pt-1 space-y-1">
                    <label className="text-[9px] text-muted-foreground">
                      Value
                    </label>
                    <Slider
                      min={track.min}
                      max={track.max}
                      step={track.step}
                      value={[
                        track.keyframes.find(
                          (k) => k.id === selectedKf.kfId
                        )?.value ?? track.min,
                      ]}
                      onValueChange={([v]) => {
                        onAddKeyframe(
                          track.id,
                          track.keyframes.find(
                            (k) => k.id === selectedKf.kfId
                          )?.time ?? currentTime,
                          v
                        );
                      }}
                    />
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-primary">
          <Zap size={14} />
          Keyframes
        </span>
        <span className="text-[10px] font-mono text-muted-foreground">
          Playhead: {fmtTime(currentTime)}
        </span>
      </div>

      {/* Master timeline ruler */}
      <div className="relative h-5 mx-2 bg-secondary/30 rounded border border-border/50 overflow-hidden">
        {/* Time markers */}
        {duration > 0 &&
          Array.from({ length: Math.min(Math.ceil(duration), 20) }).map(
            (_, i) => {
              const pct = (i / duration) * 100;
              if (pct > 100) return null;
              return (
                <div
                  key={i}
                  className="absolute top-0 bottom-0"
                  style={{ left: `${pct}%` }}
                >
                  <div className="w-px h-2 bg-muted-foreground/30" />
                  <span className="text-[7px] text-muted-foreground/50 ml-0.5">
                    {i}s
                  </span>
                </div>
              );
            }
          )}
        {/* Playhead */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-destructive z-10"
          style={{ left: `${playheadPct}%` }}
        />
      </div>

      {/* Filter tracks */}
      {filterTracks.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="px-2 py-1 bg-muted/30 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
            Filters
          </div>
          {filterTracks.map(renderTrack)}
        </div>
      )}

      {/* Overlay tracks */}
      {Array.from(overlayTrackGroups.entries()).map(([targetId, groupTracks]) => (
        <div
          key={targetId}
          className="rounded-lg border border-border overflow-hidden"
        >
          <div className="px-2 py-1 bg-muted/30 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
            Text: {groupTracks[0]?.label.split(" ")[0] ?? "Overlay"}
          </div>
          {groupTracks.map(renderTrack)}
        </div>
      ))}

      {tracks.length === 0 && (
        <p className="text-[10px] text-muted-foreground text-center py-3">
          No keyframe tracks. Add filters or text overlays to animate them.
        </p>
      )}
    </div>
  );
};

export default KeyframesTrackPanel;
