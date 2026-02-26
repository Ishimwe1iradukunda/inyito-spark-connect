import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Loader2, Scissors, Type, Palette, Wand2 } from "lucide-react";
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

interface VideoEditorProps {
  videoUrl: string;
  videoBlob: Blob;
  onExport: (blob: Blob) => void;
}

const VideoEditor = ({ videoUrl, videoBlob, onExport }: VideoEditorProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [videoDuration, setVideoDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [overlays, setOverlays] = useState<TextOverlay[]>([]);
  const [filters, setFilters] = useState<VideoFilters>(DEFAULT_FILTERS);
  const [exporting, setExporting] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);
  const [splitView, setSplitView] = useState(false);

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

  /* Sync current time with high frequency */
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

  const handlePlayPause = useCallback(() => {
    const vid = videoRef.current;
    if (!vid) return;
    if (isPlaying) {
      vid.pause();
      setIsPlaying(false);
    } else {
      // Jump to trim start if outside trim range
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

  /* ---- Draw overlays on canvas preview ---- */
  const drawFrame = useCallback(() => {
    const vid = videoRef.current;
    const canvas = canvasRef.current;
    if (!vid || !canvas) return;
    const ctx = canvas.getContext("2d")!;

    canvas.width = vid.videoWidth || 1920;
    canvas.height = vid.videoHeight || 1080;

    if (splitView) {
      // Left half: original (no filters)
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, canvas.width / 2, canvas.height);
      ctx.clip();
      ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);
      ctx.restore();

      // Right half: filtered
      ctx.save();
      ctx.beginPath();
      ctx.rect(canvas.width / 2, 0, canvas.width / 2, canvas.height);
      ctx.clip();
      ctx.filter = filtersToCSS(filters);
      ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);
      ctx.filter = "none";
      ctx.restore();

      // Divider line
      ctx.strokeStyle = "hsl(213, 94%, 54%)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2, 0);
      ctx.lineTo(canvas.width / 2, canvas.height);
      ctx.stroke();

      // Labels
      ctx.font = "bold 14px Inter, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.textAlign = "center";
      ctx.fillText("ORIGINAL", canvas.width / 4, 24);
      ctx.fillText("EDITED", (canvas.width * 3) / 4, 24);
    } else {
      // Normal: apply filters to full frame
      ctx.filter = filtersToCSS(filters);
      ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);
      ctx.filter = "none";
    }

    // Draw text overlays
    overlays.forEach((o) => {
      const x = (o.x / 100) * canvas.width;
      const y = (o.y / 100) * canvas.height;
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
    });
  }, [filters, overlays, splitView]);

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

  /* ---- Export edited video ---- */
  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const vid = videoRef.current!;
      const canvas = canvasRef.current!;
      canvas.width = vid.videoWidth || 1920;
      canvas.height = vid.videoHeight || 1080;

      vid.currentTime = trimStart;
      await new Promise((r) => vid.addEventListener("seeked", r, { once: true }));

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
        recorder.onstop = () => resolve(new Blob(chunks, { type: "video/webm" }));
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
        <canvas
          ref={canvasRef}
          className="w-full h-full object-contain"
        />
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
          onPlayPause={handlePlayPause}
          onSeek={handleSeek}
          onToggleSplitView={() => setSplitView((v) => !v)}
        />
      </div>

      {/* Active effects indicator */}
      <div className="max-w-4xl mx-auto">
        <ActiveEffectsIndicator
          filters={filters}
          overlayCount={overlays.length}
          trimStart={trimStart}
          trimEnd={trimEnd}
          totalDuration={videoDuration}
        />
      </div>

      {/* Editor panels */}
      <div className="max-w-4xl mx-auto">
        <Tabs defaultValue="trim" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="trim" className="gap-1.5 text-xs">
              <Scissors size={14} />
              Trim & Cut
            </TabsTrigger>
            <TabsTrigger value="text" className="gap-1.5 text-xs">
              <Type size={14} />
              Text
            </TabsTrigger>
            <TabsTrigger value="filters" className="gap-1.5 text-xs">
              <Palette size={14} />
              Filters
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
        </Tabs>

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
