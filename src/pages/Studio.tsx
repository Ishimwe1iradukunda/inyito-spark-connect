import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import NavBar from "@/components/NavBar";
import SiteFooter from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMediaRecorder, RecordingState } from "@/hooks/useMediaRecorder";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import VideoEditor from "@/components/studio/VideoEditor";
import WorkflowSteps from "@/components/studio/WorkflowSteps";
import ShareModal from "@/components/studio/ShareModal";
import AudioLevelMeter from "@/components/studio/AudioLevelMeter";
import RecordingProgressPanel from "@/components/studio/RecordingProgressPanel";
import SkipMarkerButton, { type SkipRegion } from "@/components/studio/SkipMarkerButton";
import LiveSkipTimeline from "@/components/studio/LiveSkipTimeline";
import MultiRangeTrimmer from "@/components/studio/MultiRangeTrimmer";
import LiveStreamPanel from "@/components/studio/LiveStreamPanel";
import DeviceSelector, { type DeviceSelection, type RecordingQuality, RESOLUTIONS } from "@/components/studio/DeviceSelector";
import SourcePreview from "@/components/studio/SourcePreview";
import { type StreamConfig } from "@/hooks/useStreamConfig";
import {
  Monitor,
  Camera,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
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
  Wand2,
  Share2,
  Scissors,
  Radio,
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
type StudioMode = "record" | "stream";

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const Studio = () => {
  /* Studio mode */
  const [studioMode, setStudioMode] = useState<StudioMode>("record");
  const [isStreaming, setIsStreaming] = useState(false);

  /* Source states */
  const [sourceType, setSourceType] = useState<SourceType>("screen");
  const [deviceSelection, setDeviceSelection] = useState<DeviceSelection>({ audioInputId: "default", videoInputId: "default" });
  const [recordingQuality, setRecordingQuality] = useState<RecordingQuality>({ resolution: "1080p", fps: 30 });
  const [micEnabled, setMicEnabled] = useState(true);
  const [systemAudioEnabled, setSystemAudioEnabled] = useState(true);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveTitle, setSaveTitle] = useState("");
  const [editingMode, setEditingMode] = useState(false);
  const [exportedBlob, setExportedBlob] = useState<Blob | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [previewMuted, setPreviewMuted] = useState(false);
  const [skipRegions, setSkipRegions] = useState<SkipRegion[]>([]);
  const [isMarkingSkip, setIsMarkingSkip] = useState(false);
  const [showTrimmer, setShowTrimmer] = useState(false);
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
    const res = RESOLUTIONS[recordingQuality.resolution];
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { width: res.width, height: res.height, frameRate: recordingQuality.fps },
        audio: systemAudioEnabled,
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
  }, [systemAudioEnabled, recordingQuality]);

  /* ---- Acquire camera ---- */
  const acquireCamera = useCallback(async () => {
    try {
      const videoConstraints: MediaTrackConstraints = {
        width: 640, height: 480, frameRate: recordingQuality.fps,
      };
      if (deviceSelection.videoInputId && deviceSelection.videoInputId !== "default") {
        videoConstraints.deviceId = { exact: deviceSelection.videoInputId };
      }
      const audioConstraints: MediaTrackConstraints | boolean = micEnabled
        ? deviceSelection.audioInputId && deviceSelection.audioInputId !== "default"
          ? { deviceId: { exact: deviceSelection.audioInputId } }
          : true
        : false;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: audioConstraints,
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
  }, [micEnabled, deviceSelection, recordingQuality]);

  /* ---- Combine streams on canvas ---- */
  const buildCompositeStream = useCallback(
    (screen: MediaStream | null, cam: MediaStream | null): MediaStream => {
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext("2d")!;
      const res = RESOLUTIONS[recordingQuality.resolution];
      canvas.width = res.width;
      canvas.height = res.height;

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

  /* ---- Handle record start with countdown ---- */
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
    if (micEnabled && sourceType !== "camera") {
      try {
        const micConstraints: MediaTrackConstraints = {};
        if (deviceSelection.audioInputId && deviceSelection.audioInputId !== "default") {
          micConstraints.deviceId = { exact: deviceSelection.audioInputId };
        }
        const mic = await navigator.mediaDevices.getUserMedia({ audio: micConstraints.deviceId ? micConstraints : true });
        setMicStream(mic);
        mic.getAudioTracks().forEach((t) => stream!.addTrack(t));
      } catch {
        /* mic denied — continue without */
      }
    }

    // Countdown 3-2-1
    for (let i = 3; i >= 1; i--) {
      setCountdown(i);
      await new Promise((r) => setTimeout(r, 1000));
    }
    setCountdown(null);

    startRecording(stream);
  }, [sourceType, micEnabled, acquireScreen, acquireCamera, buildCompositeStream, startRecording]);

  /* ---- Download ---- */
  const handleDownload = useCallback((type: "original" | "edited" = "original") => {
    const blob = type === "edited" && exportedBlob ? exportedBlob : recordedBlob;
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `recording-${type}-${Date.now()}.webm`;
    a.click();
    URL.revokeObjectURL(url);
  }, [recordedBlob, exportedBlob]);

  /* ---- Save to Cloud ---- */
  const handleSaveToCloud = useCallback(async () => {
    const blob = exportedBlob || recordedBlob;
    if (!blob || !user) return;
    setSaving(true);
    try {
      const fileName = `${user.id}/${Date.now()}.webm`;
      const { error: uploadErr } = await supabase.storage
        .from("recordings")
        .upload(fileName, blob, { contentType: "video/webm" });
      if (uploadErr) throw uploadErr;

      await supabase.from("recordings").insert({
        user_id: user.id,
        title: saveTitle || `Recording ${new Date().toLocaleString()}`,
        file_url: fileName,
        file_size: blob.size,
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
  }, [recordedBlob, exportedBlob, user, saveTitle, duration, sourceType, navigate]);

  /* ---- Toggle mic mid-recording ---- */
  const toggleMicMidRecording = useCallback(() => {
    if (micStream) {
      micStream.getAudioTracks().forEach((t) => {
        t.enabled = !t.enabled;
      });
    }
    setMicEnabled((v) => !v);
  }, [micStream]);

  useEffect(() => {
    return () => {
      screenStream?.getTracks().forEach((t) => t.stop());
      cameraStream?.getTracks().forEach((t) => t.stop());
      micStream?.getTracks().forEach((t) => t.stop());
    };
  }, [screenStream, cameraStream, micStream]);

  /* ---- Recording state helpers ---- */
  const isIdle = state === "idle";
  const isRecording = state === "recording";
  const isPaused = state === "paused";
  const isStopped = state === "stopped";

  /* ---- Active blob for saving (exported or original) ---- */
  const activeBlob = exportedBlob || recordedBlob;
  const activeUrl = useMemo(() => {
    if (exportedBlob) {
      const url = URL.createObjectURL(exportedBlob);
      return url;
    }
    return recordedUrl;
  }, [exportedBlob, recordedUrl]);

  // Cleanup exported blob URL
  useEffect(() => {
    if (!exportedBlob) return;
    return () => {
      if (activeUrl && activeUrl !== recordedUrl) {
        URL.revokeObjectURL(activeUrl);
      }
    };
  }, [activeUrl, recordedUrl, exportedBlob]);

  const handleExportDone = (blob: Blob) => {
    setExportedBlob(blob);
    setEditingMode(false);
    // After export, user lands on the review/download screen
  };

  // Auto-enter editing mode when recording stops
  useEffect(() => {
    if (isStopped && recordedUrl && !editingMode && !exportedBlob) {
      // Small delay so the user sees the transition
      const t = setTimeout(() => setEditingMode(true), 600);
      return () => clearTimeout(t);
    }
  }, [isStopped, recordedUrl, editingMode, exportedBlob]);

  const handleReset = () => {
    setEditingMode(false);
    setExportedBlob(null);
    setSkipRegions([]);
    setIsMarkingSkip(false);
    setShowTrimmer(false);
    resetRecording();
  };

  const handleSkipStart = useCallback(() => {
    setSkipRegions((prev) => [...prev, { startMs: duration, endMs: null }]);
    setIsMarkingSkip(true);
  }, [duration]);

  const handleSkipEnd = useCallback(() => {
    setSkipRegions((prev) =>
      prev.map((r) => (r.endMs === null ? { ...r, endMs: duration } : r))
    );
    setIsMarkingSkip(false);
  }, [duration]);

  const handleSkipUndo = useCallback(() => {
    if (isMarkingSkip) {
      // Cancel the in-progress mark
      setSkipRegions((prev) => prev.filter((r) => r.endMs !== null));
      setIsMarkingSkip(false);
    } else if (skipRegions.length > 0) {
      // Remove the last completed region
      setSkipRegions((prev) => prev.slice(0, -1));
    }
  }, [isMarkingSkip, skipRegions.length]);

  const handleTrimConfirm = useCallback(
    async (keepRegions: { startMs: number; endMs: number }[]) => {
      // For now, store keep regions and close trimmer
      // The actual trimming will happen via the video editor canvas export
      setShowTrimmer(false);
      console.log("Keep regions:", keepRegions);
      // TODO: integrate with video editor export pipeline
    },
    []
  );

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
          <p className="text-muted-foreground text-sm max-w-md mx-auto mb-4">
            Capture your screen, camera, or both — with audio. Stream live or download.
          </p>
          {/* Mode Toggle */}
          <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-muted/50 border border-border">
            <Button
              variant={studioMode === "record" ? "default" : "ghost"}
              size="sm"
              className="gap-2 text-xs"
              onClick={() => setStudioMode("record")}
              disabled={isRecording || isPaused || isStreaming}
            >
              <Circle size={14} className="fill-current" />
              Record
            </Button>
            <Button
              variant={studioMode === "stream" ? "default" : "ghost"}
              size="sm"
              className="gap-2 text-xs"
              onClick={() => setStudioMode("stream")}
              disabled={isRecording || isPaused}
            >
              <Radio size={14} />
              Live Stream
            </Button>
          </div>
        </motion.div>

        {/* Workflow Step Indicator */}
        {(isStopped || isRecording || isPaused) && (
          <WorkflowSteps
            currentStep={
              isRecording || isPaused
                ? "recording"
                : editingMode
                ? "editing"
                : showTrimmer
                ? "trimming"
                : exportedBlob
                ? "done"
                : "editing"
            }
          />
        )}

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

          <div className="h-6 w-px bg-border mx-1" />

          <Button
            variant={micEnabled ? "default" : "ghost"}
            size="sm"
            className="gap-2"
            onClick={isIdle ? () => setMicEnabled(!micEnabled) : toggleMicMidRecording}
          >
            {micEnabled ? <Mic size={16} /> : <MicOff size={16} />}
            Mic
          </Button>

          <Button
            variant={systemAudioEnabled ? "default" : "ghost"}
            size="sm"
            className="gap-2"
            disabled={!isIdle}
            onClick={() => setSystemAudioEnabled(!systemAudioEnabled)}
          >
            {systemAudioEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            System
          </Button>
        </motion.div>

        {/* Device & Quality Settings — only in record mode when idle */}
        {studioMode === "record" && isIdle && (
          <DeviceSelector
            devices={deviceSelection}
            quality={recordingQuality}
            onDeviceChange={setDeviceSelection}
            onQualityChange={setRecordingQuality}
            disabled={!isIdle}
          />
        )}

        {/* Live Stream Panel — shown in stream mode */}
        {studioMode === "stream" && (
          <div className="max-w-4xl mx-auto mb-8">
            <LiveStreamPanel
              isStreaming={isStreaming}
              onGoLive={(config: StreamConfig) => {
                setIsStreaming(true);
                toast({
                  title: "Going live!",
                  description: `Streaming "${config.title}" to ${config.platform}`,
                });
              }}
              onStopStream={() => {
                setIsStreaming(false);
                toast({ title: "Stream ended" });
              }}
            />
          </div>
        )}

        {(isRecording || isPaused) && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-6 mb-4"
          >
            <AudioLevelMeter
              stream={micStream}
              label="Mic"
              type="mic"
              enabled={micEnabled}
            />
            <AudioLevelMeter
              stream={screenStream}
              label="System"
              type="system"
              enabled={systemAudioEnabled}
            />
          </motion.div>
        )}

        {/* Recording Progress Panel */}
        {(isRecording || isPaused) && (
          <RecordingProgressPanel
            micStream={micStream}
            screenStream={screenStream}
            duration={duration}
            isRecording={isRecording}
            isPaused={isPaused}
            videoRef={screenVideoRef}
            canvasRef={canvasRef}
            sourceType={sourceType}
          />
        )}

        {/* Live Skip Timeline */}
        {(isRecording || isPaused) && skipRegions.length > 0 && (
          <LiveSkipTimeline
            duration={duration}
            skipRegions={skipRegions}
            currentTime={duration}
          />
        )}

        {/* Editor mode */}
        {isStopped && editingMode && recordedUrl && (
          <VideoEditor
            videoUrl={recordedUrl}
            videoBlob={recordedBlob!}
            onExport={handleExportDone}
          />
        )}

        {/* Preview / Playback Area (shown when NOT editing) */}
        {!editingMode && (
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

            {/* Countdown overlay */}
            {countdown !== null && (
              <motion.div
                key={countdown}
                initial={{ scale: 2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="absolute inset-0 flex items-center justify-center z-50 bg-background/60 backdrop-blur-sm"
              >
                <span className="text-8xl font-black text-primary drop-shadow-lg">{countdown}</span>
              </motion.div>
            )}

            {/* IDLE placeholder */}
            {isIdle && !isStopped && !countdown && (
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
            {isStopped && activeUrl && (
              <div className="relative w-full h-full">
                <video
                  ref={previewVideoRef}
                  src={activeUrl}
                  controls
                  muted={previewMuted}
                  className="w-full h-full object-contain"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8 bg-background/60 backdrop-blur-sm hover:bg-background/80 z-10"
                  onClick={() => setPreviewMuted((v) => !v)}
                  title={previewMuted ? "Unmute" : "Mute"}
                >
                  {previewMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </Button>
              </div>
            )}
          </motion.div>
        )}

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
                <SkipMarkerButton
                  duration={duration}
                  isRecording={isRecording}
                  isPaused={isPaused}
                  skipRegions={skipRegions}
                  onAddSkipStart={handleSkipStart}
                  onAddSkipEnd={handleSkipEnd}
                  onUndo={handleSkipUndo}
                  isMarking={isMarkingSkip}
                  canUndo={isMarkingSkip || skipRegions.length > 0}
                />
              </motion.div>
            )}

            {isStopped && !editingMode && !showTrimmer && (
              <motion.div
                key="done"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-4"
              >
                <div className="flex items-center gap-3 flex-wrap justify-center">
                  {/* If no export yet, primary action is Edit */}
                  {!exportedBlob && (
                    <Button
                      size="lg"
                      className="gap-2 glow-purple font-bold"
                      onClick={() => setEditingMode(true)}
                    >
                      <Wand2 size={18} />
                      Edit Video
                    </Button>
                  )}
                  {skipRegions.length > 0 && !exportedBlob && (
                    <Button
                      size="lg"
                      variant="secondary"
                      className="gap-2"
                      onClick={() => setShowTrimmer(true)}
                    >
                      <Scissors size={18} />
                      Trim Scenes ({skipRegions.length})
                    </Button>
                  )}
                  {/* After export, show download/share as primary */}
                  {exportedBlob && (
                    <>
                      <Button size="lg" className="gap-2 glow-blue font-bold" onClick={() => handleDownload("edited")}>
                        <Download size={18} />
                        Download Edited
                      </Button>
                      <Button size="lg" variant="secondary" className="gap-2" onClick={() => handleDownload("original")}>
                        <Download size={18} />
                        Download Original
                      </Button>
                      <Button
                        size="lg"
                        variant="secondary"
                        className="gap-2"
                        onClick={() => setEditingMode(true)}
                      >
                        <Wand2 size={18} />
                        Re-Edit
                      </Button>
                    </>
                  )}
                  <Button size="lg" variant="secondary" className="gap-2" onClick={() => setShareOpen(true)}>
                    <Share2 size={18} />
                    Share
                  </Button>
                  <Button variant="secondary" size="lg" className="gap-2" onClick={handleReset}>
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

        {/* Multi-Range Trimmer */}
        {isStopped && showTrimmer && recordedUrl && (
          <MultiRangeTrimmer
            duration={duration}
            initialSkipRegions={skipRegions}
            videoUrl={recordedUrl}
            onConfirm={handleTrimConfirm}
            onCancel={() => setShowTrimmer(false)}
          />
        )}

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
            <li>After recording, click <strong>Edit Video</strong> to trim, add text overlays, apply filters, and animate with keyframes.</li>
            <li>Download the <strong>original</strong> or <strong>edited</strong> version — or save to cloud for later.</li>
            <li>Use <kbd className="px-1 py-0.5 bg-muted rounded text-[8px] font-mono">Space</kbd> to play/pause and arrow keys to step frames in the editor.</li>
          </ul>
        </motion.div>
      </main>

      <ShareModal open={shareOpen} onOpenChange={setShareOpen} videoTitle={saveTitle} />
      <SiteFooter />
    </div>
  );
};

export default Studio;
