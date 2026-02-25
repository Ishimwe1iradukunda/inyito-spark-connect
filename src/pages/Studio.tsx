import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import NavBar from "@/components/NavBar";
import SiteFooter from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMediaRecorder, RecordingState } from "@/hooks/useMediaRecorder";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import {
  Monitor,
  Camera,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Circle,
  Square,
  Pause,
  Play,
  Download,
  RotateCcw,
  Layers,
  Settings,
  Timer,
  CloudUpload,
  FolderOpen,
  Loader2,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatTime(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const m = String(Math.floor(totalSec / 60)).padStart(2, "0");
  const s = String(totalSec % 60).padStart(2, "0");
  return `${m}:${s}`;
}

type SourceType = "screen" | "camera" | "both";

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const Studio = () => {
  /* Source states */
  const [sourceType, setSourceType] = useState<SourceType>("screen");
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveTitle, setSaveTitle] = useState("");
  const { user } = useAuth();
  const navigate = useNavigate();

  /* Refs for video elements */
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  /* Recorder */
  const {
    state,
    recordedUrl,
    recordedBlob,
    duration,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    resetRecording,
  } = useMediaRecorder();

  /* ---- Acquire screen ---- */
  const acquireScreen = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { width: 1920, height: 1080 },
        audio: true,
      });
      setScreenStream(stream);
      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch {
      console.error("Screen capture denied");
      return null;
    }
  }, []);

  /* ---- Acquire camera ---- */
  const acquireCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: audioEnabled,
      });
      setCameraStream(stream);
      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch {
      console.error("Camera access denied");
      return null;
    }
  }, [audioEnabled]);

  /* ---- Combine streams on canvas ---- */
  const buildCompositeStream = useCallback(
    (screen: MediaStream | null, cam: MediaStream | null): MediaStream => {
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext("2d")!;
      canvas.width = 1920;
      canvas.height = 1080;

      const draw = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        /* Screen fill */
        if (screenVideoRef.current && screen) {
          ctx.drawImage(screenVideoRef.current, 0, 0, canvas.width, canvas.height);
        }
        /* Camera PIP bottom-right */
        if (cameraVideoRef.current && cam) {
          const pipW = 320;
          const pipH = 240;
          const margin = 24;
          ctx.save();
          ctx.beginPath();
          const x = canvas.width - pipW - margin;
          const y = canvas.height - pipH - margin;
          const r = 16;
          ctx.moveTo(x + r, y);
          ctx.arcTo(x + pipW, y, x + pipW, y + pipH, r);
          ctx.arcTo(x + pipW, y + pipH, x, y + pipH, r);
          ctx.arcTo(x, y + pipH, x, y, r);
          ctx.arcTo(x, y, x + pipW, y, r);
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(cameraVideoRef.current, x, y, pipW, pipH);
          ctx.restore();
          /* PIP border */
          ctx.strokeStyle = "hsl(213,94%,54%)";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(x + r, y);
          ctx.arcTo(x + pipW, y, x + pipW, y + pipH, r);
          ctx.arcTo(x + pipW, y + pipH, x, y + pipH, r);
          ctx.arcTo(x, y + pipH, x, y, r);
          ctx.arcTo(x, y, x + pipW, y, r);
          ctx.closePath();
          ctx.stroke();
        }
        if (state === "recording" || state === "paused") {
          requestAnimationFrame(draw);
        }
      };
      requestAnimationFrame(draw);

      const canvasStream = canvas.captureStream(30);

      /* Merge audio tracks */
      const audioCtx = new AudioContext();
      const dest = audioCtx.createMediaStreamDestination();
      [screen, cam].forEach((s) => {
        s?.getAudioTracks().forEach((track) => {
          const src = audioCtx.createMediaStreamSource(new MediaStream([track]));
          src.connect(dest);
        });
      });
      dest.stream.getAudioTracks().forEach((t) => canvasStream.addTrack(t));

      return canvasStream;
    },
    [state]
  );

  /* ---- Handle record start ---- */
  const handleStart = useCallback(async () => {
    let stream: MediaStream | null = null;

    if (sourceType === "screen") {
      stream = await acquireScreen();
    } else if (sourceType === "camera") {
      stream = await acquireCamera();
    } else {
      const scr = await acquireScreen();
      const cam = await acquireCamera();
      if (scr || cam) {
        stream = buildCompositeStream(scr, cam);
      }
    }

    if (!stream) return;

    /* Add mic audio if enabled and not already present */
    if (audioEnabled && sourceType !== "camera") {
      try {
        const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
        mic.getAudioTracks().forEach((t) => stream!.addTrack(t));
      } catch {
        /* mic denied — continue without */
      }
    }

    startRecording(stream);
  }, [sourceType, audioEnabled, acquireScreen, acquireCamera, buildCompositeStream, startRecording]);

  /* ---- Download ---- */
  const handleDownload = useCallback(() => {
    if (!recordedUrl) return;
    const a = document.createElement("a");
    a.href = recordedUrl;
    a.download = `recording-${Date.now()}.webm`;
    a.click();
  }, [recordedUrl]);

  /* ---- Save to Cloud ---- */
  const handleSaveToCloud = useCallback(async () => {
    if (!recordedBlob || !user) return;
    setSaving(true);
    try {
      const fileName = `${user.id}/${Date.now()}.webm`;
      const { error: uploadErr } = await supabase.storage
        .from("recordings")
        .upload(fileName, recordedBlob, { contentType: "video/webm" });
      if (uploadErr) throw uploadErr;

      await supabase.from("recordings").insert({
        user_id: user.id,
        title: saveTitle || `Recording ${new Date().toLocaleString()}`,
        file_url: fileName,
        file_size: recordedBlob.size,
        duration_ms: duration,
        source_type: sourceType,
      });
      setSaveTitle("");
      navigate("/my-recordings");
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setSaving(false);
    }
  }, [recordedBlob, user, saveTitle, duration, sourceType, navigate]);

  useEffect(() => {
    return () => {
      screenStream?.getTracks().forEach((t) => t.stop());
      cameraStream?.getTracks().forEach((t) => t.stop());
    };
  }, [screenStream, cameraStream]);

  /* ---- Recording state helpers ---- */
  const isIdle = state === "idle";
  const isRecording = state === "recording";
  const isPaused = state === "paused";
  const isStopped = state === "stopped";

  return (
    <div className="bg-background text-foreground min-h-screen overflow-x-hidden">
      <NavBar />

      <main className="pt-20 pb-16 px-4 max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <h1 className="text-3xl sm:text-4xl font-black mb-2">
            <span className="text-gradient-brand">Recording Studio</span>
          </h1>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Capture your screen, camera, or both — with audio. Download or upload to social media.
          </p>
        </motion.div>

        {/* Source Selector */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-wrap items-center justify-center gap-3 mb-8"
        >
          {([
            { key: "screen", icon: Monitor, label: "Screen" },
            { key: "camera", icon: Camera, label: "Camera" },
            { key: "both", icon: Layers, label: "Screen + Camera" },
          ] as const).map(({ key, icon: Icon, label }) => (
            <Button
              key={key}
              variant={sourceType === key ? "default" : "secondary"}
              size="sm"
              className="gap-2"
              disabled={!isIdle}
              onClick={() => setSourceType(key)}
            >
              <Icon size={16} />
              {label}
            </Button>
          ))}

          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
            disabled={!isIdle}
            onClick={() => setAudioEnabled(!audioEnabled)}
          >
            {audioEnabled ? <Mic size={16} /> : <MicOff size={16} />}
            {audioEnabled ? "Mic On" : "Mic Off"}
          </Button>
        </motion.div>

        {/* Preview / Playback Area */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="relative aspect-video w-full max-w-4xl mx-auto rounded-2xl overflow-hidden border border-border bg-card mb-8"
        >
          {/* Hidden helper elements */}
          <video ref={screenVideoRef} autoPlay muted playsInline className="hidden" />
          <video ref={cameraVideoRef} autoPlay muted playsInline className="hidden" />
          <canvas ref={canvasRef} className="hidden" />

          {/* IDLE placeholder */}
          {isIdle && !isStopped && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-muted-foreground">
              <Video size={48} className="opacity-30" />
              <p className="text-sm">Select a source and hit Record</p>
            </div>
          )}

          {/* RECORDING indicator */}
          {(isRecording || isPaused) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block w-3 h-3 rounded-full ${
                    isRecording ? "bg-destructive animate-pulse" : "bg-muted-foreground"
                  }`}
                />
                <span className="text-sm font-semibold">
                  {isRecording ? "Recording" : "Paused"}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-lg font-mono font-bold text-foreground">
                <Timer size={18} />
                {formatTime(duration)}
              </div>
            </div>
          )}

          {/* STOPPED — playback */}
          {isStopped && recordedUrl && (
            <video
              ref={previewVideoRef}
              src={recordedUrl}
              controls
              className="w-full h-full object-contain"
            />
          )}
        </motion.div>

        {/* Controls */}
        <div className="flex flex-wrap items-center justify-center gap-4">
          <AnimatePresence mode="wait">
            {isIdle && (
              <motion.div key="start" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Button
                  onClick={handleStart}
                  className="gap-2 glow-blue font-bold px-8"
                  size="lg"
                >
                  <Circle size={18} className="fill-current" />
                  Start Recording
                </Button>
              </motion.div>
            )}

            {(isRecording || isPaused) && (
              <motion.div
                key="active"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-3"
              >
                <Button
                  variant="secondary"
                  size="lg"
                  className="gap-2"
                  onClick={isPaused ? resumeRecording : pauseRecording}
                >
                  {isPaused ? <Play size={18} /> : <Pause size={18} />}
                  {isPaused ? "Resume" : "Pause"}
                </Button>
                <Button
                  variant="destructive"
                  size="lg"
                  className="gap-2"
                  onClick={stopRecording}
                >
                  <Square size={18} />
                  Stop
                </Button>
              </motion.div>
            )}

            {isStopped && (
              <motion.div
                key="done"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-4"
              >
                <div className="flex items-center gap-3">
                  <Button size="lg" className="gap-2 glow-blue font-bold" onClick={handleDownload}>
                    <Download size={18} />
                    Download
                  </Button>
                  <Button variant="secondary" size="lg" className="gap-2" onClick={resetRecording}>
                    <RotateCcw size={18} />
                    New Recording
                  </Button>
                </div>
                {/* Save to Cloud */}
                {user ? (
                  <div className="flex items-center gap-2 w-full max-w-md">
                    <Input
                      placeholder="Recording title..."
                      value={saveTitle}
                      onChange={(e) => setSaveTitle(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      variant="secondary"
                      size="lg"
                      className="gap-2 shrink-0"
                      onClick={handleSaveToCloud}
                      disabled={saving}
                    >
                      {saving ? <Loader2 size={18} className="animate-spin" /> : <CloudUpload size={18} />}
                      {saving ? "Saving..." : "Save to Cloud"}
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 text-muted-foreground"
                    onClick={() => navigate("/auth")}
                  >
                    <CloudUpload size={16} />
                    Sign in to save to cloud
                  </Button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Tips */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-12 max-w-2xl mx-auto card-glass rounded-xl p-6"
        >
          <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
            <Settings size={16} className="text-primary" /> Quick Tips
          </h3>
          <ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-4">
            <li>Choose <strong>Screen + Camera</strong> for a webcam overlay in the bottom-right.</li>
            <li>System audio is captured when you share a browser tab with "Share tab audio" checked.</li>
            <li>Recordings save as WebM — use the editor (coming soon) to trim and export as MP4.</li>
            <li>Social media upload will be available once you connect your accounts.</li>
          </ul>
        </motion.div>
      </main>

      <SiteFooter />
    </div>
  );
};

export default Studio;
