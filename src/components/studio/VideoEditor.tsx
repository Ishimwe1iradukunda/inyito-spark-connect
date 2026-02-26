import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Download, Loader2, Scissors, Type, Palette, Wand2, Zap, Undo2, Redo2, Sparkles } from "lucide-react";
import { useUndoRedo } from "@/hooks/useUndoRedo";
import TrimTimeline from "./TrimTimeline";
import TextOverlayEditor, { type TextOverlay } from "./TextOverlayEditor";
import FiltersPanel, {
  type VideoFilters,
  DEFAULT_FILTERS,
  filtersToCSS,
} from "./FiltersPanel";
import VideoPlaybackControls from "./VideoPlaybackControls";
import CanvasOverlay from "./CanvasOverlay";
import ActiveEffectsIndicator from "./ActiveEffectsIndicator";
import KeyframesTrackPanel from "./KeyframesTrackPanel";
import TransitionsPanel, {
  type TransitionConfig,
  DEFAULT_TRANSITIONS,
  computeTransitionEffect,
} from "./TransitionsPanel";
import {
  type KeyframeTrack,
  type EasingType,
  createFilterTracks,
  createOverlayTracks,
  addKeyframe,
  removeKeyframe,
  interpolateAt,
} from "./KeyframeEngine";

interface VideoEditorProps {
  videoUrl: string;
  videoBlob: Blob;
  onExport: (blob: Blob) => void;
}

interface EditorState {
  overlays: TextOverlay[];
  filters: VideoFilters;
  keyframeTracks: KeyframeTrack[];
  transitions: TransitionConfig;
}

const VideoEditor = ({ videoUrl, videoBlob, onExport }: VideoEditorProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [videoDuration, setVideoDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);
  const [splitView, setSplitView] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  // Undo/redo state for overlays, filters, and keyframes
  const {
    state: editorState,
    set: setEditorState,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useUndoRedo<EditorState>({
    overlays: [],
    filters: DEFAULT_FILTERS,
    keyframeTracks: createFilterTracks(),
    transitions: DEFAULT_TRANSITIONS,
  });

  const { overlays, filters, keyframeTracks, transitions } = editorState;

  const setTransitions = useCallback(
    (newTransitions: TransitionConfig) => {
      setEditorState((prev) => ({ ...prev, transitions: newTransitions }));
    },
    [setEditorState]
  );

  // Convenience setters that push to undo history
  const setOverlays = useCallback(
    (updater: TextOverlay[] | ((prev: TextOverlay[]) => TextOverlay[])) => {
      setEditorState((prev) => ({
        ...prev,
        overlays: typeof updater === "function" ? updater(prev.overlays) : updater,
      }));
    },
    [setEditorState]
  );

  const setFilters = useCallback(
    (newFilters: VideoFilters) => {
      setEditorState((prev) => ({ ...prev, filters: newFilters }));
    },
    [setEditorState]
  );

  const setKeyframeTracks = useCallback(
    (updater: KeyframeTrack[] | ((prev: KeyframeTrack[]) => KeyframeTrack[])) => {
      setEditorState((prev) => ({
        ...prev,
        keyframeTracks:
          typeof updater === "function" ? updater(prev.keyframeTracks) : updater,
      }));
    },
    [setEditorState]
  );

  /* Load video metadata */
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    const onLoaded = () => {
      setVideoDuration(vid.duration);
      setTrimEnd(vid.duration);
    };
    vid.addEventListener("loadedmetadata", onLoaded);
    return () => vid.removeEventListener("loadedmetadata", onLoaded);
  }, [videoUrl]);

  /* Sync current time */
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    const onTime = () => setCurrentTime(vid.currentTime);
    vid.addEventListener("timeupdate", onTime);
    return () => vid.removeEventListener("timeupdate", onTime);
  }, []);

  /* Constrain playback within trim bounds */
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || !isPlaying) return;
    const check = () => {
      if (vid.currentTime >= trimEnd) {
        vid.currentTime = trimStart;
      }
    };
    vid.addEventListener("timeupdate", check);
    return () => vid.removeEventListener("timeupdate", check);
  }, [isPlaying, trimStart, trimEnd]);

  /* Sync playback speed */
  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = playbackSpeed;
  }, [playbackSpeed]);

  /* Keyboard shortcuts */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      // Undo: Ctrl+Z / Cmd+Z
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      // Redo: Ctrl+Shift+Z / Cmd+Shift+Z or Ctrl+Y
      if (
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "z") ||
        ((e.ctrlKey || e.metaKey) && e.key === "y")
      ) {
        e.preventDefault();
        redo();
        return;
      }

      switch (e.key) {
        case " ":
          e.preventDefault();
          handlePlayPause();
          break;
        case "ArrowLeft":
          e.preventDefault();
          handleSeek(Math.max(0, currentTime - 1 / 30));
          break;
        case "ArrowRight":
          e.preventDefault();
          handleSeek(Math.min(videoDuration, currentTime + 1 / 30));
          break;
        case "Escape":
          setSelectedOverlayId(null);
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [currentTime, videoDuration, undo, redo]);

  const handlePlayPause = useCallback(() => {
    const vid = videoRef.current;
    if (!vid) return;
    if (isPlaying) {
      vid.pause();
      setIsPlaying(false);
    } else {
      if (vid.currentTime < trimStart || vid.currentTime >= trimEnd) {
        vid.currentTime = trimStart;
      }
      vid.play();
      setIsPlaying(true);
    }
  }, [isPlaying, trimStart, trimEnd]);

  const handleSeek = useCallback((time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  const handleTrimChange = (start: number, end: number) => {
    setTrimStart(start);
    setTrimEnd(end);
  };

  const handleMoveOverlay = useCallback(
    (id: string, x: number, y: number) => {
      setOverlays((prev) =>
        prev.map((o) => (o.id === id ? { ...o, x, y } : o))
      );
    },
    []
  );

  /* ---- Sync overlay tracks when overlays change ---- */
  useEffect(() => {
    setKeyframeTracks((prev) => {
      const filterTracks = prev.filter((t) => !t.targetId);
      const existingOverlayIds = new Set(
        prev.filter((t) => t.targetId).map((t) => t.targetId!)
      );
      const currentOverlayIds = new Set(overlays.map((o) => o.id));

      // Keep existing overlay tracks that still exist
      const kept = prev.filter(
        (t) => !t.targetId || currentOverlayIds.has(t.targetId!)
      );

      // Add tracks for new overlays
      const newTracks: KeyframeTrack[] = [];
      overlays.forEach((o) => {
        if (!existingOverlayIds.has(o.id)) {
          newTracks.push(
            ...createOverlayTracks(o.id, o.text.slice(0, 10) || "Text")
          );
        }
      });

      return [...kept, ...newTracks];
    });
  }, [overlays]);

  /* ---- Apply keyframe values to filters at current time ---- */
  const getKeyframedFilters = useCallback((): VideoFilters => {
    const result = { ...filters };
    const filterTracks = keyframeTracks.filter((t) => !t.targetId);

    for (const track of filterTracks) {
      if (track.keyframes.length === 0) continue;
      const val = interpolateAt(track, currentTime);
      if (val !== null && track.property in result) {
        (result as any)[track.property] = val;
      }
    }
    return result;
  }, [filters, keyframeTracks, currentTime]);

  /* ---- Get keyframed overlay properties ---- */
  const getKeyframedOverlays = useCallback((): (TextOverlay & { opacity?: number })[] => {
    return overlays.map((o) => {
      const overlayTracks = keyframeTracks.filter(
        (t) => t.targetId === o.id && t.keyframes.length > 0
      );
      if (overlayTracks.length === 0) return { ...o, opacity: 100 };

      const result: any = { ...o, opacity: 100 };
      for (const track of overlayTracks) {
        const val = interpolateAt(track, currentTime);
        if (val === null) continue;
        if (track.property === "overlayOpacity") result.opacity = val;
        else if (track.property in result) result[track.property] = val;
      }
      return result;
    });
  }, [overlays, keyframeTracks, currentTime]);

  /* ---- Keyframe handlers ---- */
  const handleAddKeyframe = useCallback(
    (trackId: string, time: number, value: number) => {
      setKeyframeTracks((prev) =>
        prev.map((t) =>
          t.id === trackId ? addKeyframe(t, time, value) : t
        )
      );
    },
    []
  );

  const handleRemoveKeyframe = useCallback(
    (trackId: string, keyframeId: string) => {
      setKeyframeTracks((prev) =>
        prev.map((t) =>
          t.id === trackId ? removeKeyframe(t, keyframeId) : t
        )
      );
    },
    []
  );

  const handleUpdateKeyframeEasing = useCallback(
    (trackId: string, keyframeId: string, easing: EasingType) => {
      setKeyframeTracks((prev) =>
        prev.map((t) =>
          t.id === trackId
            ? {
                ...t,
                keyframes: t.keyframes.map((k) =>
                  k.id === keyframeId ? { ...k, easing } : k
                ),
              }
            : t
        )
      );
    },
    []
  );

  /* ---- Draw frame with keyframed values ---- */
  const drawFrame = useCallback(() => {
    const vid = videoRef.current;
    const canvas = canvasRef.current;
    if (!vid || !canvas) return;
    const ctx = canvas.getContext("2d")!;

    canvas.width = vid.videoWidth || 1920;
    canvas.height = vid.videoHeight || 1080;

    const activeFilters = getKeyframedFilters();
    const activeOverlays = getKeyframedOverlays();

    // Compute transition effect at current time
    const txEffect = computeTransitionEffect(currentTime, trimStart, trimEnd, transitions);

    // Get global opacity from keyframes
    const opacityTrack = keyframeTracks.find(
      (t) => t.property === "opacity" && !t.targetId
    );
    const globalOpacity =
      opacityTrack && opacityTrack.keyframes.length > 0
        ? (interpolateAt(opacityTrack, currentTime) ?? 100) / 100
        : 1;

    // Combined opacity: keyframe * transition
    const combinedOpacity = globalOpacity * txEffect.opacity;

    // Build filter string including transition blur
    const extraBlurCSS = txEffect.extraBlur > 0 ? ` blur(${txEffect.extraBlur}px)` : "";

    if (splitView) {
      // Left half: original
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, canvas.width / 2, canvas.height);
      ctx.clip();
      ctx.globalAlpha = combinedOpacity;
      ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);
      ctx.restore();

      // Right half: filtered
      ctx.save();
      ctx.beginPath();
      ctx.rect(canvas.width / 2, 0, canvas.width / 2, canvas.height);
      ctx.clip();
      ctx.globalAlpha = combinedOpacity;
      ctx.filter = filtersToCSS(activeFilters) + extraBlurCSS;
      ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);
      ctx.filter = "none";
      ctx.restore();

      // Divider
      ctx.globalAlpha = 1;
      ctx.strokeStyle = "hsl(213, 94%, 54%)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2, 0);
      ctx.lineTo(canvas.width / 2, canvas.height);
      ctx.stroke();

      ctx.font = "bold 14px Inter, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.textAlign = "center";
      ctx.fillText("ORIGINAL", canvas.width / 4, 24);
      ctx.fillText("EDITED", (canvas.width * 3) / 4, 24);
    } else {
      // Apply wipe clipping if needed
      if (txEffect.clipX < 1 || txEffect.clipY < 1) {
        ctx.save();
        ctx.beginPath();
        // Determine wipe direction
        const clipW = txEffect.clipX < 1 ? canvas.width * txEffect.clipX : canvas.width;
        const clipH = txEffect.clipY < 1 ? canvas.height * txEffect.clipY : canvas.height;

        // For wipe-right, clip from right side
        const inIsWipeRight = transitions.inType === "wipe-right";
        const outIsWipeRight = transitions.outType === "wipe-right";
        const isWipeRight = inIsWipeRight || outIsWipeRight;

        if (isWipeRight && txEffect.clipX < 1) {
          ctx.rect(canvas.width - clipW, 0, clipW, clipH);
        } else {
          ctx.rect(0, canvas.height - clipH, clipW, clipH);
        }
        ctx.clip();
      }

      ctx.globalAlpha = combinedOpacity;
      ctx.filter = filtersToCSS(activeFilters) + extraBlurCSS;
      ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);
      ctx.filter = "none";
      ctx.globalAlpha = 1;

      if (txEffect.clipX < 1 || txEffect.clipY < 1) {
        ctx.restore();
      }

      // Fill black behind for fade/dissolve
      if (txEffect.opacity < 1) {
        ctx.save();
        ctx.globalCompositeOperation = "destination-over";
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
      }
    }

    // Draw text overlays with keyframed properties
    activeOverlays.forEach((o: any) => {
      const x = (o.x / 100) * canvas.width;
      const y = (o.y / 100) * canvas.height;
      const opacity = (o.opacity ?? 100) / 100;

      ctx.globalAlpha = opacity;
      ctx.font = `${o.bold ? "bold " : ""}${o.fontSize}px ${o.fontFamily}`;
      ctx.fillStyle = o.color;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      ctx.shadowColor = "rgba(0,0,0,0.7)";
      ctx.shadowBlur = 6;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
      ctx.fillText(o.text, x, y);
      ctx.shadowColor = "transparent";
      ctx.globalAlpha = 1;
    });
  }, [getKeyframedFilters, getKeyframedOverlays, splitView, keyframeTracks, currentTime, transitions, trimStart, trimEnd]);

  /* Animate preview canvas */
  useEffect(() => {
    let raf: number;
    const loop = () => {
      drawFrame();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [drawFrame]);

  /* ---- Export ---- */
  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const vid = videoRef.current!;
      const canvas = canvasRef.current!;
      canvas.width = vid.videoWidth || 1920;
      canvas.height = vid.videoHeight || 1080;

      vid.currentTime = trimStart;
      await new Promise((r) =>
        vid.addEventListener("seeked", r, { once: true })
      );

      const stream = canvas.captureStream(30);
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaElementSource(vid);
      const dest = audioCtx.createMediaStreamDestination();
      source.connect(dest);
      source.connect(audioCtx.destination);
      dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));

      const recorder = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=vp9",
      });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      const done = new Promise<Blob>((resolve) => {
        recorder.onstop = () =>
          resolve(new Blob(chunks, { type: "video/webm" }));
      });

      vid.play();
      recorder.start();

      const checkEnd = () => {
        if (vid.currentTime >= trimEnd) {
          vid.pause();
          recorder.stop();
        } else {
          requestAnimationFrame(checkEnd);
        }
      };
      requestAnimationFrame(checkEnd);

      const exportedBlob = await done;
      source.disconnect();
      audioCtx.close();
      onExport(exportedBlob);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExporting(false);
    }
  }, [trimStart, trimEnd, onExport]);

  const totalKeyframes = keyframeTracks.reduce(
    (sum, t) => sum + t.keyframes.length,
    0
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Canvas preview with overlay */}
      <div className="relative aspect-video w-full max-w-4xl mx-auto rounded-2xl overflow-hidden border border-border bg-card">
        <video
          ref={videoRef}
          src={videoUrl}
          className="hidden"
          playsInline
          muted
          loop
        />
        <canvas ref={canvasRef} className="w-full h-full object-contain" />
        <CanvasOverlay
          overlays={overlays}
          selectedOverlayId={selectedOverlayId}
          currentTime={currentTime}
          trimStart={trimStart}
          trimEnd={trimEnd}
          onSelectOverlay={setSelectedOverlayId}
          onMoveOverlay={handleMoveOverlay}
        />
      </div>

      {/* Playback controls */}
      <div className="max-w-4xl mx-auto">
        <VideoPlaybackControls
          videoRef={videoRef}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={videoDuration}
          trimStart={trimStart}
          trimEnd={trimEnd}
          splitView={splitView}
          playbackSpeed={playbackSpeed}
          onPlayPause={handlePlayPause}
          onSeek={handleSeek}
          onToggleSplitView={() => setSplitView((v) => !v)}
          onSpeedChange={setPlaybackSpeed}
        />
      </div>

      {/* Active effects indicator */}
      <div className="max-w-4xl mx-auto">
        <ActiveEffectsIndicator
          filters={getKeyframedFilters()}
          overlayCount={overlays.length}
          trimStart={trimStart}
          trimEnd={trimEnd}
          totalDuration={videoDuration}
        />
      </div>

      {/* Editor panels */}
      <div className="max-w-4xl mx-auto">
        {/* Undo/Redo toolbar */}
        <div className="flex items-center justify-end gap-1 mb-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={undo}
                disabled={!canUndo}
              >
                <Undo2 size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">Undo (Ctrl+Z)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={redo}
                disabled={!canRedo}
              >
                <Redo2 size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">Redo (Ctrl+Shift+Z)</TooltipContent>
          </Tooltip>
        </div>

        <Tabs defaultValue="trim" className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-4">
            <TabsTrigger value="trim" className="gap-1.5 text-xs">
              <Scissors size={14} />
              Trim
            </TabsTrigger>
            <TabsTrigger value="text" className="gap-1.5 text-xs">
              <Type size={14} />
              Text
            </TabsTrigger>
            <TabsTrigger value="filters" className="gap-1.5 text-xs">
              <Palette size={14} />
              Filters
            </TabsTrigger>
            <TabsTrigger value="transitions" className="gap-1.5 text-xs">
              <Sparkles size={14} />
              Transitions
              {(transitions.inType !== "none" || transitions.outType !== "none") && (
                <span className="ml-1 w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </TabsTrigger>
            <TabsTrigger value="keyframes" className="gap-1.5 text-xs">
              <Zap size={14} />
              KF
              {totalKeyframes > 0 && (
                <span className="ml-1 text-[9px] bg-primary/20 text-primary px-1 rounded-full">
                  {totalKeyframes}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trim" className="card-glass rounded-xl p-4">
            <TrimTimeline
              duration={videoDuration}
              trimStart={trimStart}
              trimEnd={trimEnd}
              currentTime={currentTime}
              isPlaying={isPlaying}
              onTrimChange={handleTrimChange}
              onSeek={handleSeek}
            />
          </TabsContent>

          <TabsContent value="text" className="card-glass rounded-xl p-4">
            <TextOverlayEditor
              overlays={overlays}
              onChange={setOverlays}
              selectedId={selectedOverlayId}
              onSelect={setSelectedOverlayId}
            />
          </TabsContent>

          <TabsContent value="filters" className="card-glass rounded-xl p-4">
            <FiltersPanel filters={filters} onChange={setFilters} />
          </TabsContent>

          <TabsContent value="transitions" className="card-glass rounded-xl p-4">
            <TransitionsPanel transitions={transitions} onChange={setTransitions} />
          </TabsContent>

          <TabsContent value="keyframes" className="card-glass rounded-xl p-4">
            <KeyframesTrackPanel
              tracks={keyframeTracks}
              currentTime={currentTime}
              duration={videoDuration}
              onAddKeyframe={handleAddKeyframe}
              onRemoveKeyframe={handleRemoveKeyframe}
              onUpdateKeyframeEasing={handleUpdateKeyframeEasing}
              onSeek={handleSeek}
            />
          </TabsContent>
        </Tabs>

        {/* Keyboard shortcuts hint */}
        <div className="flex items-center justify-center gap-4 mt-3 text-[9px] text-muted-foreground flex-wrap">
          <span><kbd className="px-1 py-0.5 bg-muted rounded text-[8px] font-mono">Space</kbd> Play/Pause</span>
          <span><kbd className="px-1 py-0.5 bg-muted rounded text-[8px] font-mono">←</kbd><kbd className="px-1 py-0.5 bg-muted rounded text-[8px] font-mono ml-0.5">→</kbd> Frame step</span>
          <span><kbd className="px-1 py-0.5 bg-muted rounded text-[8px] font-mono">Ctrl+Z</kbd> Undo</span>
          <span><kbd className="px-1 py-0.5 bg-muted rounded text-[8px] font-mono">Ctrl+⇧+Z</kbd> Redo</span>
          <span><kbd className="px-1 py-0.5 bg-muted rounded text-[8px] font-mono">Esc</kbd> Deselect</span>
        </div>

        {/* Export button */}
        <div className="flex justify-center mt-6">
          <Button
            size="lg"
            className="gap-2 glow-blue font-bold px-8"
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Wand2 size={18} />
                Export Edited Video
              </>
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default VideoEditor;
