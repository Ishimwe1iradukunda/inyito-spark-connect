import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Sparkles, RotateCcw } from "lucide-react";

export type TransitionType = "none" | "fade" | "dissolve" | "wipe-left" | "wipe-right" | "wipe-up";

export interface TransitionConfig {
  inType: TransitionType;
  inDuration: number; // seconds
  outType: TransitionType;
  outDuration: number; // seconds
}

export const DEFAULT_TRANSITIONS: TransitionConfig = {
  inType: "none",
  inDuration: 0.5,
  outType: "none",
  outDuration: 0.5,
};

const TRANSITION_OPTIONS: { value: TransitionType; label: string; description: string }[] = [
  { value: "none", label: "None", description: "No transition" },
  { value: "fade", label: "Fade", description: "Fade to/from black" },
  { value: "dissolve", label: "Dissolve", description: "Cross-dissolve with blur" },
  { value: "wipe-left", label: "Wipe →", description: "Wipe from left to right" },
  { value: "wipe-right", label: "Wipe ←", description: "Wipe from right to left" },
  { value: "wipe-up", label: "Wipe ↑", description: "Wipe from bottom to top" },
];

interface TransitionsPanelProps {
  transitions: TransitionConfig;
  onChange: (transitions: TransitionConfig) => void;
}

/**
 * Compute the transition alpha / effect at a given time within the trimmed region.
 * Returns an object describing what to apply on the canvas.
 */
export interface TransitionEffect {
  opacity: number;       // 0–1
  clipX: number;         // 0–1, horizontal clip progress
  clipY: number;         // 0–1, vertical clip progress
  extraBlur: number;     // additional blur in px
}

export function computeTransitionEffect(
  currentTime: number,
  trimStart: number,
  trimEnd: number,
  config: TransitionConfig
): TransitionEffect {
  const result: TransitionEffect = { opacity: 1, clipX: 1, clipY: 1, extraBlur: 0 };
  const elapsed = currentTime - trimStart;
  const remaining = trimEnd - currentTime;

  // In-transition
  if (config.inType !== "none" && config.inDuration > 0 && elapsed < config.inDuration) {
    const t = Math.max(0, Math.min(1, elapsed / config.inDuration)); // 0→1
    applyTransition(result, config.inType, t);
  }

  // Out-transition
  if (config.outType !== "none" && config.outDuration > 0 && remaining < config.outDuration) {
    const t = Math.max(0, Math.min(1, remaining / config.outDuration)); // 1→0 as we approach end
    applyTransition(result, config.outType, t);
  }

  return result;
}

function applyTransition(effect: TransitionEffect, type: TransitionType, t: number) {
  switch (type) {
    case "fade":
      effect.opacity *= t;
      break;
    case "dissolve":
      effect.opacity *= t;
      effect.extraBlur += (1 - t) * 8;
      break;
    case "wipe-left":
      effect.clipX = Math.min(effect.clipX, t);
      break;
    case "wipe-right":
      effect.clipX = Math.min(effect.clipX, t);
      break;
    case "wipe-up":
      effect.clipY = Math.min(effect.clipY, t);
      break;
  }
}

const TransitionsPanel = ({ transitions, onChange }: TransitionsPanelProps) => {
  const update = (key: keyof TransitionConfig, value: any) =>
    onChange({ ...transitions, [key]: value });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-primary">
          <Sparkles size={14} />
          Transitions
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 text-xs"
          onClick={() => onChange(DEFAULT_TRANSITIONS)}
        >
          <RotateCcw size={12} />
          Reset
        </Button>
      </div>

      {/* In transition */}
      <div className="space-y-2">
        <Label className="text-[11px] font-medium text-foreground">Intro (at trim start)</Label>
        <div className="flex flex-wrap gap-1.5">
          {TRANSITION_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              variant={transitions.inType === opt.value ? "default" : "secondary"}
              size="sm"
              className="text-xs h-7 px-2.5"
              onClick={() => update("inType", opt.value)}
              title={opt.description}
            >
              {opt.label}
            </Button>
          ))}
        </div>
        {transitions.inType !== "none" && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] text-muted-foreground">Duration</Label>
              <span className="text-[10px] font-mono text-muted-foreground">
                {transitions.inDuration.toFixed(1)}s
              </span>
            </div>
            <Slider
              min={0.1}
              max={3}
              step={0.1}
              value={[transitions.inDuration]}
              onValueChange={([v]) => update("inDuration", v)}
            />
          </div>
        )}
      </div>

      {/* Out transition */}
      <div className="space-y-2">
        <Label className="text-[11px] font-medium text-foreground">Outro (at trim end)</Label>
        <div className="flex flex-wrap gap-1.5">
          {TRANSITION_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              variant={transitions.outType === opt.value ? "default" : "secondary"}
              size="sm"
              className="text-xs h-7 px-2.5"
              onClick={() => update("outType", opt.value)}
              title={opt.description}
            >
              {opt.label}
            </Button>
          ))}
        </div>
        {transitions.outType !== "none" && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] text-muted-foreground">Duration</Label>
              <span className="text-[10px] font-mono text-muted-foreground">
                {transitions.outDuration.toFixed(1)}s
              </span>
            </div>
            <Slider
              min={0.1}
              max={3}
              step={0.1}
              value={[transitions.outDuration]}
              onValueChange={([v]) => update("outDuration", v)}
            />
          </div>
        )}
      </div>

      {/* Preview hint */}
      {(transitions.inType !== "none" || transitions.outType !== "none") && (
        <p className="text-[9px] text-muted-foreground text-center">
          Play the video to preview transitions at trim boundaries
        </p>
      )}
    </div>
  );
};

export default TransitionsPanel;
