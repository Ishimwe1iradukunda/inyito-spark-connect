import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import type { VideoFilters } from "./FiltersPanel";
import { DEFAULT_FILTERS } from "./FiltersPanel";

interface ActiveEffectsIndicatorProps {
  filters: VideoFilters;
  overlayCount: number;
  trimStart: number;
  trimEnd: number;
  totalDuration: number;
}

function fmtTime(sec: number) {
  const m = String(Math.floor(sec / 60)).padStart(2, "0");
  const s = String(Math.floor(sec % 60)).padStart(2, "0");
  return `${m}:${s}`;
}

const FILTER_LABELS: Record<keyof VideoFilters, { label: string; unit: string }> = {
  brightness: { label: "Brightness", unit: "%" },
  contrast: { label: "Contrast", unit: "%" },
  saturation: { label: "Saturation", unit: "%" },
  blur: { label: "Blur", unit: "px" },
  sepia: { label: "Sepia", unit: "%" },
  grayscale: { label: "Grayscale", unit: "%" },
  hueRotate: { label: "Hue", unit: "°" },
};

const ActiveEffectsIndicator = ({
  filters,
  overlayCount,
  trimStart,
  trimEnd,
  totalDuration,
}: ActiveEffectsIndicatorProps) => {
  const activeFilters = (Object.keys(filters) as (keyof VideoFilters)[]).filter(
    (k) => filters[k] !== DEFAULT_FILTERS[k]
  );

  const isTrimmed = trimStart > 0.05 || trimEnd < totalDuration - 0.05;
  const hasEffects = activeFilters.length > 0 || overlayCount > 0 || isTrimmed;

  return (
    <AnimatePresence>
      {hasEffects && (
        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.95 }}
          className="flex flex-wrap items-center gap-1.5 px-3 py-1.5 bg-card/70 backdrop-blur-sm rounded-lg border border-border text-[10px]"
        >
          <Sparkles size={12} className="text-primary mr-1" />

          {activeFilters.map((k) => (
            <span
              key={k}
              className="px-1.5 py-0.5 bg-primary/15 text-primary rounded font-mono"
            >
              {FILTER_LABELS[k].label}: {filters[k]}{FILTER_LABELS[k].unit}
            </span>
          ))}

          {overlayCount > 0 && (
            <span className="px-1.5 py-0.5 bg-accent/15 text-accent-foreground rounded">
              {overlayCount} text layer{overlayCount > 1 ? "s" : ""}
            </span>
          )}

          {isTrimmed && (
            <span className="px-1.5 py-0.5 bg-destructive/15 text-destructive rounded font-mono">
              Trim: {fmtTime(trimEnd - trimStart)} / {fmtTime(totalDuration)}
            </span>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ActiveEffectsIndicator;
