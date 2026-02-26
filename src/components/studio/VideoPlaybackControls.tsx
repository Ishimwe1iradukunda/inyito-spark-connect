import { RefObject, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, SkipBack, SplitSquareHorizontal } from "lucide-react";

interface VideoPlaybackControlsProps {
  videoRef: RefObject<HTMLVideoElement>;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  trimStart: number;
  trimEnd: number;
  splitView: boolean;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onToggleSplitView: () => void;
}

function fmtTime(sec: number) {
  const m = String(Math.floor(sec / 60)).padStart(2, "0");
  const s = String(Math.floor(sec % 60)).padStart(2, "0");
  return `${m}:${s}`;
}

const VideoPlaybackControls = ({
  isPlaying,
  currentTime,
  duration,
  trimStart,
  trimEnd,
  splitView,
  onPlayPause,
  onSeek,
  onToggleSplitView,
}: VideoPlaybackControlsProps) => {
  const handleJumpToTrim = useCallback(() => {
    onSeek(trimStart);
  }, [trimStart, onSeek]);

  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-card/80 backdrop-blur-sm rounded-lg border border-border">
      {/* Jump to trim start */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
        onClick={handleJumpToTrim}
        title="Jump to trim start"
      >
        <SkipBack size={16} />
      </Button>

      {/* Play / Pause */}
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 text-primary hover:text-primary"
        onClick={onPlayPause}
      >
        {isPlaying ? <Pause size={20} /> : <Play size={20} />}
      </Button>

      {/* Time display */}
      <span className="text-xs font-mono text-muted-foreground min-w-[90px] text-center">
        {fmtTime(currentTime)} / {fmtTime(duration)}
      </span>

      {/* Seek slider */}
      <div className="flex-1">
        <Slider
          min={0}
          max={duration || 1}
          step={0.05}
          value={[currentTime]}
          onValueChange={([v]) => onSeek(v)}
          className="cursor-pointer"
        />
      </div>

      {/* Trim region indicator */}
      <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap">
        [{fmtTime(trimStart)} – {fmtTime(trimEnd)}]
      </span>

      {/* Before/After split toggle */}
      <Button
        variant={splitView ? "secondary" : "ghost"}
        size="icon"
        className="h-8 w-8"
        onClick={onToggleSplitView}
        title="Before / After split view"
      >
        <SplitSquareHorizontal size={16} />
      </Button>
    </div>
  );
};

export default VideoPlaybackControls;
