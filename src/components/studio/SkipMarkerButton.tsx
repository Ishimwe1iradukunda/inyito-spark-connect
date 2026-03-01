import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { SkipForward } from "lucide-react";

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
  isMarking: boolean;
}

export default function SkipMarkerButton({
  duration,
  isRecording,
  isPaused,
  skipRegions,
  onAddSkipStart,
  onAddSkipEnd,
  isMarking,
}: Props) {
  // Keyboard shortcut: S to toggle skip marking
  useEffect(() => {
    if (!isRecording && !isPaused) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === "s" || e.key === "S") {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
        e.preventDefault();
        if (isMarking) {
          onAddSkipEnd();
        } else {
          onAddSkipStart();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isRecording, isPaused, isMarking, onAddSkipStart, onAddSkipEnd]);

  if (!isRecording && !isPaused) return null;

  return (
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
  );
}
