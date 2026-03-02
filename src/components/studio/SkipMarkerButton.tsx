import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { SkipForward, Undo2 } from "lucide-react";

export interface SkipRegion {
  startMs: number;
  endMs: number | null; // null = currently marking
}

interface Props {
  duration: number;
  isRecording: boolean;
  isPaused: boolean;
  skipRegions: SkipRegion[];
  onAddSkipStart: () => void;
  onAddSkipEnd: () => void;
  onUndo: () => void;
  isMarking: boolean;
  canUndo: boolean;
}

export default function SkipMarkerButton({
  duration,
  isRecording,
  isPaused,
  skipRegions,
  onAddSkipStart,
  onAddSkipEnd,
  onUndo,
  isMarking,
  canUndo,
}: Props) {
  // Keyboard shortcuts: S to toggle skip, Ctrl+Z to undo
  useEffect(() => {
    if (!isRecording && !isPaused) return;

    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        if (isMarking) {
          onAddSkipEnd();
        } else {
          onAddSkipStart();
        }
      }

      if (e.key === "z" && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        e.preventDefault();
        onUndo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isRecording, isPaused, isMarking, onAddSkipStart, onAddSkipEnd, onUndo]);

  if (!isRecording && !isPaused) return null;

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={isMarking ? "destructive" : "secondary"}
        size="sm"
        className="gap-2"
        onClick={isMarking ? onAddSkipEnd : onAddSkipStart}
      >
        <SkipForward size={16} />
        {isMarking ? "End Skip" : "Mark Skip"}
        <kbd className="ml-1 px-1 py-0.5 bg-background/30 rounded text-[9px] font-mono">S</kbd>
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className="gap-1.5"
        disabled={!canUndo}
        onClick={onUndo}
      >
        <Undo2 size={14} />
        Undo
        <kbd className="ml-1 px-1 py-0.5 bg-background/30 rounded text-[9px] font-mono">⌘Z</kbd>
      </Button>
    </div>
  );
}
