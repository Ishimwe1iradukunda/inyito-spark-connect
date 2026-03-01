import { useRef, useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Timer, HardDrive, Clock } from "lucide-react";

interface Props {
  micStream: MediaStream | null;
  screenStream: MediaStream | null;
  duration: number;
  isRecording: boolean;
  isPaused: boolean;
  onThumbnailCapture?: (url: string, timeMs: number) => void;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
  sourceType: "screen" | "camera" | "both";
}

function formatTime(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const m = String(Math.floor(totalSec / 60)).padStart(2, "0");
  const s = String(totalSec % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const WAVEFORM_BARS = 80;
const THUMBNAIL_INTERVAL_MS = 5000;

export default function RecordingProgressPanel({
  micStream,
  screenStream,
  duration,
  isRecording,
  isPaused,
  onThumbnailCapture,
  videoRef,
  canvasRef,
  sourceType,
}: Props) {
  const waveCanvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number>(0);
  const [estimatedSize, setEstimatedSize] = useState(0);
  const [thumbnails, setThumbnails] = useState<{ url: string; timeMs: number }[]>([]);
  const lastThumbRef = useRef(0);
  const thumbStripRef = useRef<HTMLDivElement>(null);

  // Estimate file size (~500kbps for webm)
  useEffect(() => {
    const bitrateKbps = 500;
    setEstimatedSize(Math.floor((duration / 1000) * (bitrateKbps / 8) * 1024));
  }, [duration]);

  // Set up audio analyser
  useEffect(() => {
    const stream = micStream || screenStream;
    if (!stream || (!isRecording && !isPaused)) return;

    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    const source = ctx.createMediaStreamSource(stream);
    source.connect(analyser);
    audioCtxRef.current = ctx;
    analyserRef.current = analyser;

    return () => {
      ctx.close();
      analyserRef.current = null;
    };
  }, [micStream, screenStream, isRecording, isPaused]);

  // Draw waveform
  useEffect(() => {
    const canvas = waveCanvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext("2d")!;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barW = canvas.width / WAVEFORM_BARS;
      const step = Math.floor(bufferLength / WAVEFORM_BARS);

      for (let i = 0; i < WAVEFORM_BARS; i++) {
        const val = dataArray[i * step] / 255;
        const barH = val * canvas.height * 0.9;
        const x = i * barW;
        const y = canvas.height - barH;

        // Gradient from brand-blue to brand-purple
        const hue = 213 + (i / WAVEFORM_BARS) * 57; // 213 -> 270
        ctx.fillStyle = isPaused
          ? `hsla(${hue}, 40%, 50%, 0.4)`
          : `hsla(${hue}, 85%, 58%, 0.85)`;
        ctx.fillRect(x + 1, y, barW - 2, barH);
      }
    };

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [analyserRef.current, isPaused]);

  // Capture thumbnails every 5s
  useEffect(() => {
    if (!isRecording || isPaused) return;

    const interval = setInterval(() => {
      if (duration - lastThumbRef.current < THUMBNAIL_INTERVAL_MS) return;
      lastThumbRef.current = duration;

      // Try to capture from the visible video/canvas
      try {
        let thumbCanvas: HTMLCanvasElement | null = null;

        if (canvasRef?.current && sourceType === "both") {
          thumbCanvas = document.createElement("canvas");
          thumbCanvas.width = 160;
          thumbCanvas.height = 90;
          const tCtx = thumbCanvas.getContext("2d")!;
          tCtx.drawImage(canvasRef.current, 0, 0, 160, 90);
        } else if (videoRef?.current) {
          thumbCanvas = document.createElement("canvas");
          thumbCanvas.width = 160;
          thumbCanvas.height = 90;
          const tCtx = thumbCanvas.getContext("2d")!;
          tCtx.drawImage(videoRef.current, 0, 0, 160, 90);
        }

        if (thumbCanvas) {
          const url = thumbCanvas.toDataURL("image/jpeg", 0.6);
          const entry = { url, timeMs: duration };
          setThumbnails((prev) => [...prev, entry]);
          onThumbnailCapture?.(url, duration);
        }
      } catch {
        /* cross-origin or no video yet */
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isRecording, isPaused, duration, sourceType, videoRef, canvasRef, onThumbnailCapture]);

  // Auto-scroll thumbnail strip
  useEffect(() => {
    if (thumbStripRef.current) {
      thumbStripRef.current.scrollLeft = thumbStripRef.current.scrollWidth;
    }
  }, [thumbnails]);

  // Reset thumbnails on mount
  useEffect(() => {
    setThumbnails([]);
    lastThumbRef.current = 0;
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-4xl mx-auto mb-6 space-y-3"
    >
      {/* Stats bar */}
      <div className="flex items-center justify-between card-glass rounded-xl px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-mono font-bold text-foreground">
          <Timer size={16} className="text-primary" />
          <span>{formatTime(duration)}</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <HardDrive size={14} />
            <span>~{formatFileSize(estimatedSize)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock size={14} />
            <span>{isPaused ? "Paused" : "Recording"}</span>
          </div>
          <div
            className={`w-2 h-2 rounded-full ${
              isPaused ? "bg-muted-foreground" : "bg-destructive animate-pulse"
            }`}
          />
        </div>
      </div>

      {/* Live waveform */}
      <div className="card-glass rounded-xl p-3 overflow-hidden">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 font-semibold">
          Audio Waveform
        </p>
        <canvas
          ref={waveCanvasRef}
          width={800}
          height={80}
          className="w-full h-16 rounded-lg"
        />
      </div>

      {/* Thumbnail strip */}
      {thumbnails.length > 0 && (
        <div className="card-glass rounded-xl p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 font-semibold">
            Timeline Thumbnails
          </p>
          <div
            ref={thumbStripRef}
            className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin"
          >
            {thumbnails.map((t, i) => (
              <div key={i} className="shrink-0 relative group">
                <img
                  src={t.url}
                  alt={`Thumb at ${formatTime(t.timeMs)}`}
                  className="w-28 h-16 object-cover rounded-md border border-border"
                />
                <span className="absolute bottom-0.5 right-0.5 text-[9px] font-mono bg-background/80 text-foreground px-1 rounded">
                  {formatTime(t.timeMs)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
