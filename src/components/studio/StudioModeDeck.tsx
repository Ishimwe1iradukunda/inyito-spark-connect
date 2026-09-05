import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import type { Scene } from "@/components/studio/SceneManager";
import { ArrowRight, Monitor, Radio, Zap } from "lucide-react";

export type TransitionKind = "cut" | "fade" | "stinger";

interface StudioModeDeckProps {
  scenes: Scene[];
  previewSceneId: string;
  programSceneId: string;
  onPreviewChange: (id: string) => void;
  transition: TransitionKind;
  onTransitionChange: (t: TransitionKind) => void;
  durationMs: number;
  onDurationChange: (ms: number) => void;
  onTransition: () => void;
  transitioning: boolean;
}

const SceneCard = ({
  title,
  scene,
  live,
  progress,
}: {
  title: string;
  scene?: Scene;
  live?: boolean;
  progress?: number;
}) => (
  <div className={`flex-1 rounded-lg border p-2 ${live ? "border-destructive/60 bg-destructive/5" : "border-primary/40 bg-primary/5"}`}>
    <div className="mb-1.5 flex items-center justify-between">
      <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{title}</span>
      {live ? (
        <Badge className="h-4 gap-1 bg-destructive text-[8px] text-destructive-foreground">
          <Radio size={7} /> LIVE
        </Badge>
      ) : (
        <Badge variant="secondary" className="h-4 text-[8px]">
          PREVIEW
        </Badge>
      )}
    </div>
    <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-md bg-black/60">
      <div className="flex flex-col items-center gap-1 text-muted-foreground">
        <Monitor size={20} className="opacity-40" />
        <span className="text-[10px] font-semibold text-foreground">{scene?.name ?? "—"}</span>
        <span className="text-[9px]">{scene?.sources.filter((s) => s.visible).length ?? 0} visible sources</span>
      </div>
      {progress !== undefined && progress > 0 && (
        <motion.div className="absolute inset-0 bg-background" style={{ opacity: progress }} />
      )}
    </div>
  </div>
);

const StudioModeDeck = ({
  scenes,
  previewSceneId,
  programSceneId,
  onPreviewChange,
  transition,
  onTransitionChange,
  durationMs,
  onDurationChange,
  onTransition,
  transitioning,
}: StudioModeDeckProps) => {
  const preview = scenes.find((s) => s.id === previewSceneId);
  const program = scenes.find((s) => s.id === programSceneId);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Zap size={11} className="text-primary" />
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Studio Mode</h4>
      </div>

      <div className="flex items-stretch gap-3">
        <SceneCard title="Preview" scene={preview} />
        <div className="flex flex-col items-center justify-center gap-2">
          <Button size="sm" className="h-9 gap-1.5 font-bold" onClick={onTransition} disabled={transitioning || previewSceneId === programSceneId}>
            <ArrowRight size={13} /> Transition
          </Button>
          <span className="text-[9px] text-muted-foreground">{transitioning ? "Switching…" : `${transition} · ${durationMs}ms`}</span>
        </div>
        <SceneCard title="Program" scene={program} live progress={transitioning && transition !== "cut" ? 0.5 : 0} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex gap-0.5 rounded-md border border-border bg-muted/40 p-0.5">
          {(["cut", "fade", "stinger"] as TransitionKind[]).map((t) => (
            <Button
              key={t}
              variant={transition === t ? "default" : "ghost"}
              size="sm"
              className="h-6 px-2 text-[10px] capitalize"
              onClick={() => onTransitionChange(t)}
            >
              {t}
            </Button>
          ))}
        </div>
        <div className="flex min-w-[160px] flex-1 items-center gap-2">
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Duration</span>
          <Slider min={0} max={2000} step={100} value={[durationMs]} onValueChange={([v]) => onDurationChange(v)} className="flex-1" />
          <span className="w-12 font-mono text-[10px]">{durationMs}ms</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {scenes.map((s, i) => (
          <Button
            key={s.id}
            variant={s.id === previewSceneId ? "secondary" : "ghost"}
            size="sm"
            className="h-6 px-2 text-[10px]"
            onClick={() => onPreviewChange(s.id)}
          >
            {i + 1}. {s.name}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default StudioModeDeck;
