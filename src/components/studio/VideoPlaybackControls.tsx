import { RefObject, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  SplitSquareHorizontal,
  Gauge,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

interface VideoPlaybackControlsProps {
  videoRef: RefObject<HTMLVideoElement>;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  trimStart: number;
  trimEnd: number;
  splitView: boolean;
  playbackSpeed: number;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onToggleSplitView: () => void;
  onSpeedChange: (speed: number) => void;
}

const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];

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
  playbackSpeed,
  onPlayPause,
  onSeek,
  onToggleSplitView,
  onSpeedChange,
}: VideoPlaybackControlsProps) => {
  const handleJumpToTrim = useCallback(() => {
    onSeek(trimStart);
  }, [trimStart, onSeek]);

  const handleFrameStep = useCallback(
    (dir: 1 | -1) => {
      const frameTime = 1 / 30; // ~30fps
      onSeek(Math.max(0, Math.min(duration, currentTime + dir * frameTime)));
    },
    [currentTime, duration, onSeek]
  );

  const cycleSpeed = useCallback(() => {
    const idx = SPEEDS.indexOf(playbackSpeed);
    const next = SPEEDS[(idx + 1) % SPEEDS.length];
    onSpeedChange(next);
  }, [playbackSpeed, onSpeedChange]);

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-card/80 backdrop-blur-sm rounded-lg border border-border">
      {/* Jump to trim start */}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground hover:text-foreground"
        onClick={handleJumpToTrim}
        title="Jump to trim start"
      >
        <SkipBack size={14} />
      </Button>

      {/* Frame back */}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground hover:text-foreground"
        onClick={() => handleFrameStep(-1)}
        title="Previous frame (←)"
      >
        <ChevronsLeft size={14} />
      </Button>

      {/* Play / Pause */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-primary hover:text-primary"
        onClick={onPlayPause}
        title="Play/Pause (Space)"
      >
        {isPlaying ? <Pause size={18} /> : <Play size={18} />}
      </Button>

      {/* Frame forward */}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground hover:text-foreground"
        onClick={() => handleFrameStep(1)}
        title="Next frame (→)"
      >
        <ChevronsRight size={14} />
      </Button>

      {/* Time display */}
      <span className="text-[10px] font-mono text-muted-foreground min-w-[80px] text-center">
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

      {/* Speed control */}
      <Button
        variant="ghost"
        size="sm"
        className="h-7 gap-1 text-[10px] font-mono px-2"
        onClick={cycleSpeed}
        title="Playback speed"
      >
        <Gauge size={12} />
        {playbackSpeed}x
      </Button>

      {/* Trim region indicator */}
      <span className="text-[9px] font-mono text-muted-foreground whitespace-nowrap hidden sm:inline">
        [{fmtTime(trimStart)} – {fmtTime(trimEnd)}]
      </span>

      {/* Before/After split toggle */}
      <Button
        variant={splitView ? "secondary" : "ghost"}
        size="icon"
        className="h-7 w-7"
        onClick={onToggleSplitView}
        title="Before / After split view"
      >
        <SplitSquareHorizontal size={14} />
      </Button>
    </div>
  );
};

export default VideoPlaybackControls;
