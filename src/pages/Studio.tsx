import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import NavBar from "@/components/NavBar";
import SiteFooter from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useMediaRecorder, RecordingState } from "@/hooks/useMediaRecorder";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import VideoEditor from "@/components/studio/VideoEditor";
import WorkflowSteps from "@/components/studio/WorkflowSteps";
import ShareModal from "@/components/studio/ShareModal";
import RecordingProgressPanel from "@/components/studio/RecordingProgressPanel";
import SkipMarkerButton, { type SkipRegion } from "@/components/studio/SkipMarkerButton";
import LiveSkipTimeline from "@/components/studio/LiveSkipTimeline";
import MultiRangeTrimmer from "@/components/studio/MultiRangeTrimmer";
import LiveStreamPanel from "@/components/studio/LiveStreamPanel";
import DeviceSelector, { type DeviceSelection, type RecordingQuality, RESOLUTIONS } from "@/components/studio/DeviceSelector";
import SourcePreview from "@/components/studio/SourcePreview";
import SceneManager, { type Scene, type SceneSource } from "@/components/studio/SceneManager";
import AudioMixer, { type AudioChannel } from "@/components/studio/AudioMixer";
import StreamChat from "@/components/studio/StreamChat";
import Compositor, { DEFAULT_LAYOUT, type CompositorLayout } from "@/components/studio/Compositor";
import StreamHealthBar from "@/components/studio/StreamHealthBar";
import StudioModeDeck, { type TransitionKind } from "@/components/studio/StudioModeDeck";
import HotkeysPanel from "@/components/studio/HotkeysPanel";
import { useHotkeys } from "@/hooks/useHotkeys";
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
  Loader2,
  Wand2,
  Share2,
  Scissors,
  Radio,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  Keyboard,
  Zap,
  Film,
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

const DEFAULT_SCENES: Scene[] = [
  {
    id: "scene-1",
    name: "Scene 1",
    sources: [
      { id: "src-display", kind: "display", label: "Display Capture", visible: true, locked: false, volume: 100 },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const Studio = () => {
  /* Studio mode */
  const [studioMode, setStudioMode] = useState<StudioMode>("record");
  const [isStreaming, setIsStreaming] = useState(false);

  /* OBS-like state */
  const [scenes, setScenes] = useState<Scene[]>(DEFAULT_SCENES);
  const [activeSceneId, setActiveSceneId] = useState("scene-1");
  const [showDock, setShowDock] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [streamPlatform, setStreamPlatform] = useState("twitch");
  const [streamChannel, setStreamChannel] = useState("");

  /* Audio mixer channels */
  const [audioChannels, setAudioChannels] = useState<AudioChannel[]>([
    { id: "mic", label: "Mic", icon: "mic", volume: 100, muted: false },
    { id: "system", label: "Desktop", icon: "system", volume: 100, muted: false },
  ]);

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

  /* Compositor / studio mode / telemetry */
  const [layout, setLayout] = useState<CompositorLayout>(DEFAULT_LAYOUT);
  const [fps, setFps] = useState(0);
  const [hotkeysOpen, setHotkeysOpen] = useState(false);
  const [studioModeOn, setStudioModeOn] = useState(false);
  const [previewSceneId, setPreviewSceneId] = useState("scene-1");
  const [transitionKind, setTransitionKind] = useState<TransitionKind>("fade");
  const [transitionMs, setTransitionMs] = useState(300);
  const [transitioning, setTransitioning] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  /* Refs */
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
    bytesRecorded,
    getReplayClip,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    resetRecording,
  } = useMediaRecorder();

  // Sync mic stream to audio mixer
  useEffect(() => {
    setAudioChannels((prev) =>
      prev.map((ch) =>
        ch.id === "mic" ? { ...ch, stream: micStream, muted: !micEnabled } : ch
      )
    );
  }, [micStream, micEnabled]);

  useEffect(() => {
    setAudioChannels((prev) =>
      prev.map((ch) =>
        ch.id === "system" ? { ...ch, stream: screenStream, muted: !systemAudioEnabled } : ch
      )
    );
  }, [screenStream, systemAudioEnabled]);

  const handleAudioChannelChange = useCallback((id: string, patch: Partial<AudioChannel>) => {
    setAudioChannels((prev) => prev.map((ch) => (ch.id === id ? { ...ch, ...patch } : ch)));
    if (id === "mic" && "muted" in patch) setMicEnabled(!patch.muted);
    if (id === "system" && "muted" in patch) setSystemAudioEnabled(!patch.muted);
  }, []);

  /* ---- Acquire screen ---- */
  const acquireScreen = useCallback(async () => {
    const res = RESOLUTIONS[recordingQuality.resolution];
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { width: res.width, height: res.height, frameRate: recordingQuality.fps },
        audio: systemAudioEnabled,
      });
      setScreenStream(stream);
      if (screenVideoRef.current) screenVideoRef.current.srcObject = stream;
      return stream;
    } catch {
      console.error("Screen capture denied");
      return null;
    }
  }, [systemAudioEnabled, recordingQuality]);

  /* ---- Acquire camera ---- */
  const acquireCamera = useCallback(async () => {
    try {
      const videoConstraints: MediaTrackConstraints = { width: 640, height: 480, frameRate: recordingQuality.fps };
      if (deviceSelection.videoInputId && deviceSelection.videoInputId !== "default") {
        videoConstraints.deviceId = { exact: deviceSelection.videoInputId };
      }
      const audioConstraints: MediaTrackConstraints | boolean = micEnabled
        ? deviceSelection.audioInputId && deviceSelection.audioInputId !== "default"
          ? { deviceId: { exact: deviceSelection.audioInputId } }
          : true
        : false;
      const stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints, audio: audioConstraints });
      setCameraStream(stream);
      if (cameraVideoRef.current) cameraVideoRef.current.srcObject = stream;
      return stream;
    } catch {
      console.error("Camera access denied");
      return null;
    }
  }, [micEnabled, deviceSelection, recordingQuality]);

  /* ---- Composite stream (from the live compositor canvas) ---- */
  const buildCompositeStream = useCallback(
    (screen: MediaStream | null, cam: MediaStream | null): MediaStream => {
      const canvas = canvasRef.current!;
      const canvasStream = canvas.captureStream(recordingQuality.fps);
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
    [recordingQuality]
  );

  /* ---- Start recording ---- */
  const handleStart = useCallback(async () => {
    let scr: MediaStream | null = screenStream;
    let cam: MediaStream | null = cameraStream;
    if (sourceType !== "camera" && !scr) scr = await acquireScreen();
    if (sourceType !== "screen" && !cam) cam = await acquireCamera();
    if (!scr && !cam) return;

    // Give the video elements a moment to produce frames for the compositor
    await new Promise((r) => setTimeout(r, 400));
    const stream = buildCompositeStream(scr, cam);

    if (micEnabled && sourceType !== "camera") {
      try {
        const micConstraints: MediaTrackConstraints = {};
        if (deviceSelection.audioInputId && deviceSelection.audioInputId !== "default") {
          micConstraints.deviceId = { exact: deviceSelection.audioInputId };
        }
        const mic = await navigator.mediaDevices.getUserMedia({ audio: micConstraints.deviceId ? micConstraints : true });
        setMicStream(mic);
        mic.getAudioTracks().forEach((t) => stream.addTrack(t));
      } catch { /* mic denied */ }
    }

    for (let i = 3; i >= 1; i--) {
      setCountdown(i);
      await new Promise((r) => setTimeout(r, 1000));
    }
    setCountdown(null);
    startRecording(stream);
  }, [sourceType, micEnabled, screenStream, cameraStream, acquireScreen, acquireCamera, buildCompositeStream, startRecording, deviceSelection]);

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
      const { error: uploadErr } = await supabase.storage.from("recordings").upload(fileName, blob, { contentType: "video/webm" });
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

  /* ---- Toggle mic ---- */
  const toggleMicMidRecording = useCallback(() => {
    if (micStream) micStream.getAudioTracks().forEach((t) => { t.enabled = !t.enabled; });
    setMicEnabled((v) => !v);
  }, [micStream]);

  useEffect(() => {
    return () => {
      screenStream?.getTracks().forEach((t) => t.stop());
      cameraStream?.getTracks().forEach((t) => t.stop());
      micStream?.getTracks().forEach((t) => t.stop());
    };
  }, [screenStream, cameraStream, micStream]);

  const isIdle = state === "idle";
  const isRecording = state === "recording";
  const isPaused = state === "paused";
  const isStopped = state === "stopped";

  const activeUrl = useMemo(() => {
    if (exportedBlob) return URL.createObjectURL(exportedBlob);
    return recordedUrl;
  }, [exportedBlob, recordedUrl]);

  useEffect(() => {
    if (!exportedBlob) return;
    return () => { if (activeUrl && activeUrl !== recordedUrl) URL.revokeObjectURL(activeUrl); };
  }, [activeUrl, recordedUrl, exportedBlob]);

  const handleExportDone = (blob: Blob) => {
    setExportedBlob(blob);
    setEditingMode(false);
  };

  useEffect(() => {
    if (isStopped && recordedUrl && !editingMode && !exportedBlob) {
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
    setSkipRegions((prev) => prev.map((r) => (r.endMs === null ? { ...r, endMs: duration } : r)));
    setIsMarkingSkip(false);
  }, [duration]);

  const handleSkipUndo = useCallback(() => {
    if (isMarkingSkip) {
      setSkipRegions((prev) => prev.filter((r) => r.endMs !== null));
      setIsMarkingSkip(false);
    } else if (skipRegions.length > 0) {
      setSkipRegions((prev) => prev.slice(0, -1));
    }
  }, [isMarkingSkip, skipRegions.length]);

  const handleTrimConfirm = useCallback(async (keepRegions: { startMs: number; endMs: number }[]) => {
    setShowTrimmer(false);
  }, []);

  return (
    <div className="bg-background text-foreground min-h-screen overflow-x-hidden flex flex-col">
      <NavBar />

      <main className="pt-16 flex-1 flex flex-col">
        {/* Top Bar — Mode Toggle & Status */}
        <div className="border-b border-border bg-card/50 backdrop-blur-sm px-4 py-2">
          <div className="max-w-[1600px] mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-sm font-black">
                <span className="text-gradient-brand">Studio</span>
              </h1>
              <div className="inline-flex items-center gap-0.5 p-0.5 rounded-md bg-muted/50 border border-border">
                <Button
                  variant={studioMode === "record" ? "default" : "ghost"}
                  size="sm"
                  className="gap-1.5 text-[10px] h-7 px-3"
                  onClick={() => setStudioMode("record")}
                  disabled={isRecording || isPaused || isStreaming}
                >
                  <Circle size={10} className="fill-current" />
                  Record
                </Button>
                <Button
                  variant={studioMode === "stream" ? "default" : "ghost"}
                  size="sm"
                  className="gap-1.5 text-[10px] h-7 px-3"
                  onClick={() => setStudioMode("stream")}
                  disabled={isRecording || isPaused}
                >
                  <Radio size={10} />
                  Live Stream
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Source buttons */}
              {studioMode === "record" && (
                <div className="flex items-center gap-1">
                  {([
                    { key: "screen", icon: Monitor, label: "Screen" },
                    { key: "camera", icon: Camera, label: "Camera" },
                    { key: "both", icon: Layers, label: "Both" },
                  ] as const).map(({ key, icon: Icon, label }) => (
                    <Button
                      key={key}
                      variant={sourceType === key ? "default" : "ghost"}
                      size="sm"
                      className="gap-1 text-[10px] h-7 px-2"
                      disabled={!isIdle}
                      onClick={() => setSourceType(key)}
                    >
                      <Icon size={10} />
                      {label}
                    </Button>
                  ))}
                </div>
              )}

              <div className="h-5 w-px bg-border" />

              {/* Audio toggles */}
              <Button
                variant={micEnabled ? "default" : "ghost"}
                size="sm"
                className="gap-1 text-[10px] h-7 px-2"
                onClick={isIdle ? () => setMicEnabled(!micEnabled) : toggleMicMidRecording}
              >
                {micEnabled ? <Mic size={10} /> : <MicOff size={10} />}
              </Button>
              <Button
                variant={systemAudioEnabled ? "default" : "ghost"}
                size="sm"
                className="gap-1 text-[10px] h-7 px-2"
                disabled={!isIdle}
                onClick={() => setSystemAudioEnabled(!systemAudioEnabled)}
              >
                {systemAudioEnabled ? <Volume2 size={10} /> : <VolumeX size={10} />}
              </Button>

              <div className="h-5 w-px bg-border" />

              {/* Toggle dock & chat */}
              <Button
                variant={showDock ? "secondary" : "ghost"}
                size="sm"
                className="gap-1 text-[10px] h-7 px-2"
                onClick={() => setShowDock(!showDock)}
              >
                {showDock ? <ChevronDown size={10} /> : <ChevronUp size={10} />}
                Docks
              </Button>
              {studioMode === "stream" && (
                <Button
                  variant={showChat ? "secondary" : "ghost"}
                  size="sm"
                  className="gap-1 text-[10px] h-7 px-2"
                  onClick={() => setShowChat(!showChat)}
                >
                  <MessageSquare size={10} />
                  Chat
                </Button>
              )}

              {/* Recording status */}
              {(isRecording || isPaused) && (
                <Badge variant="destructive" className="text-[10px] gap-1 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-destructive-foreground" />
                  {isRecording ? "REC" : "PAUSED"} {formatTime(duration)}
                </Badge>
              )}
              {isStreaming && (
                <Badge className="text-[10px] gap-1 bg-destructive text-destructive-foreground animate-pulse">
                  <Radio size={8} /> LIVE
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Workflow steps */}
        {(isStopped || isRecording || isPaused) && (
          <div className="px-4 py-1 bg-muted/20">
            <div className="max-w-[1600px] mx-auto">
              <WorkflowSteps
                currentStep={
                  isRecording || isPaused ? "recording" : editingMode ? "editing" : showTrimmer ? "trimming" : exportedBlob ? "done" : "editing"
                }
              />
            </div>
          </div>
        )}

        {/* Main content area */}
        <div className="flex-1 flex">
          {/* Preview + Controls */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Device selector */}
            {studioMode === "record" && isIdle && (
              <div className="px-4 py-2 border-b border-border bg-card/30">
                <div className="max-w-[1200px] mx-auto">
                  <DeviceSelector
                    devices={deviceSelection}
                    quality={recordingQuality}
                    onDeviceChange={setDeviceSelection}
                    onQualityChange={setRecordingQuality}
                    disabled={!isIdle}
                  />
                </div>
              </div>
            )}

            {/* Stream Panel */}
            {studioMode === "stream" && (
              <div className="px-4 py-4 overflow-y-auto">
                <div className="max-w-5xl mx-auto">
                  <LiveStreamPanel
                    isStreaming={isStreaming}
                    onGoLive={(config: StreamConfig) => {
                      setIsStreaming(true);
                      setStreamPlatform(config.platform);
                      setStreamChannel(config.title);
                      toast({ title: "Going live!", description: `Streaming "${config.title}" to ${config.platform}` });
                    }}
                    onStopStream={() => {
                      setIsStreaming(false);
                      toast({ title: "Stream ended" });
                    }}
                  />
                </div>
              </div>
            )}

            {/* Recording progress */}
            {(isRecording || isPaused) && (
              <div className="px-4 py-2">
                <div className="max-w-[1200px] mx-auto">
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
                </div>
              </div>
            )}

            {/* Skip timeline */}
            {(isRecording || isPaused) && skipRegions.length > 0 && (
              <div className="px-4 py-1">
                <div className="max-w-[1200px] mx-auto">
                  <LiveSkipTimeline duration={duration} skipRegions={skipRegions} currentTime={duration} />
                </div>
              </div>
            )}

            {/* Editor */}
            {isStopped && editingMode && recordedUrl && (
              <div className="flex-1 overflow-y-auto px-4 py-2">
                <VideoEditor videoUrl={recordedUrl} videoBlob={recordedBlob!} onExport={handleExportDone} />
              </div>
            )}

            {/* Preview area */}
            {!editingMode && (
              <div className="flex-1 flex items-center justify-center p-4">
                <div className="relative w-full max-w-[1200px] aspect-video rounded-xl overflow-hidden border border-border bg-card">
                  {/* Hidden helpers */}
                  <video ref={screenVideoRef} autoPlay muted playsInline className="hidden" />
                  <video ref={cameraVideoRef} autoPlay muted playsInline className="hidden" />
                  <canvas ref={canvasRef} className="hidden" />

                  {/* Countdown */}
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

                  {/* Idle preview */}
                  {isIdle && !isStopped && !countdown && studioMode === "record" && (
                    <div className="absolute inset-0">
                      {sourceType === "camera" || sourceType === "both" ? (
                        <SourcePreview
                          sourceType={sourceType}
                          videoDeviceId={deviceSelection.videoInputId}
                          audioDeviceId={deviceSelection.audioInputId}
                          micEnabled={micEnabled}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground h-full">
                          <Video size={48} className="opacity-30" />
                          <p className="text-sm">Select a source and hit Record</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Stream idle preview */}
                  {studioMode === "stream" && !isStreaming && isIdle && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                      <Radio size={48} className="opacity-30" />
                      <p className="text-sm">Configure destinations and Go Live</p>
                    </div>
                  )}

                  {/* Recording indicator */}
                  {(isRecording || isPaused) && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className={`inline-block w-3 h-3 rounded-full ${isRecording ? "bg-destructive animate-pulse" : "bg-muted-foreground"}`} />
                        <span className="text-sm font-semibold">{isRecording ? "Recording" : "Paused"}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-lg font-mono font-bold text-foreground">
                        <Timer size={18} />
                        {formatTime(duration)}
                      </div>
                    </div>
                  )}

                  {/* Playback */}
                  {isStopped && activeUrl && (
                    <div className="relative w-full h-full">
                      <video ref={previewVideoRef} src={activeUrl} controls muted={previewMuted} className="w-full h-full object-contain" />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-8 w-8 bg-background/60 backdrop-blur-sm hover:bg-background/80 z-10"
                        onClick={() => setPreviewMuted((v) => !v)}
                      >
                        {previewMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Controls bar */}
            <div className="border-t border-border bg-card/50 px-4 py-3">
              <div className="max-w-[1200px] mx-auto flex flex-wrap items-center justify-center gap-3">
                <AnimatePresence mode="wait">
                  {isIdle && studioMode === "record" && (
                    <motion.div key="start" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <Button onClick={handleStart} className="gap-2 glow-blue font-bold px-8" size="lg">
                        <Circle size={18} className="fill-current" />
                        Start Recording
                      </Button>
                    </motion.div>
                  )}

                  {(isRecording || isPaused) && (
                    <motion.div key="active" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-3">
                      <Button variant="secondary" size="lg" className="gap-2" onClick={isPaused ? resumeRecording : pauseRecording}>
                        {isPaused ? <Play size={18} /> : <Pause size={18} />}
                        {isPaused ? "Resume" : "Pause"}
                      </Button>
                      <Button variant="destructive" size="lg" className="gap-2" onClick={stopRecording}>
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
                    <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-3">
                      <div className="flex items-center gap-2 flex-wrap justify-center">
                        {!exportedBlob && (
                          <Button size="lg" className="gap-2 glow-purple font-bold" onClick={() => setEditingMode(true)}>
                            <Wand2 size={18} /> Edit Video
                          </Button>
                        )}
                        {skipRegions.length > 0 && !exportedBlob && (
                          <Button size="lg" variant="secondary" className="gap-2" onClick={() => setShowTrimmer(true)}>
                            <Scissors size={18} /> Trim Scenes ({skipRegions.length})
                          </Button>
                        )}
                        {exportedBlob && (
                          <>
                            <Button size="lg" className="gap-2 glow-blue font-bold" onClick={() => handleDownload("edited")}>
                              <Download size={18} /> Download Edited
                            </Button>
                            <Button size="lg" variant="secondary" className="gap-2" onClick={() => handleDownload("original")}>
                              <Download size={18} /> Original
                            </Button>
                            <Button size="lg" variant="secondary" className="gap-2" onClick={() => setEditingMode(true)}>
                              <Wand2 size={18} /> Re-Edit
                            </Button>
                          </>
                        )}
                        <Button size="lg" variant="secondary" className="gap-2" onClick={() => setShareOpen(true)}>
                          <Share2 size={18} /> Share
                        </Button>
                        <Button variant="secondary" size="lg" className="gap-2" onClick={handleReset}>
                          <RotateCcw size={18} /> New
                        </Button>
                      </div>
                      {user ? (
                        <div className="flex items-center gap-2 w-full max-w-md">
                          <Input placeholder="Recording title..." value={saveTitle} onChange={(e) => setSaveTitle(e.target.value)} className="flex-1" />
                          <Button variant="secondary" size="lg" className="gap-2 shrink-0" onClick={handleSaveToCloud} disabled={saving}>
                            {saving ? <Loader2 size={18} className="animate-spin" /> : <CloudUpload size={18} />}
                            {saving ? "Saving..." : "Save"}
                          </Button>
                        </div>
                      ) : (
                        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" onClick={() => navigate("/auth")}>
                          <CloudUpload size={16} /> Sign in to save
                        </Button>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Trimmer */}
            {isStopped && showTrimmer && recordedUrl && (
              <div className="px-4 py-2">
                <MultiRangeTrimmer duration={duration} initialSkipRegions={skipRegions} videoUrl={recordedUrl} onConfirm={handleTrimConfirm} onCancel={() => setShowTrimmer(false)} />
              </div>
            )}
          </div>

          {/* Chat Sidebar */}
          <AnimatePresence>
            {showChat && studioMode === "stream" && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 320, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className="border-l border-border bg-card/50 overflow-hidden flex-shrink-0"
              >
                <StreamChat platform={streamPlatform} channelName={streamChannel} isStreaming={isStreaming} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom Dock — OBS-style Scenes, Sources, Audio Mixer */}
        <AnimatePresence>
          {showDock && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-border bg-card/80 backdrop-blur-sm overflow-hidden"
            >
              <div className="max-w-[1600px] mx-auto px-4 py-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Scenes & Sources */}
                  <div className="md:col-span-2 bg-muted/20 rounded-lg border border-border p-3">
                    <SceneManager
                      scenes={scenes}
                      activeSceneId={activeSceneId}
                      onScenesChange={setScenes}
                      onActiveSceneChange={setActiveSceneId}
                    />
                  </div>

                  {/* Audio Mixer */}
                  <div className="bg-muted/20 rounded-lg border border-border p-3">
                    <AudioMixer channels={audioChannels} onChannelChange={handleAudioChannelChange} />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <ShareModal open={shareOpen} onOpenChange={setShareOpen} videoTitle={saveTitle} />
      <SiteFooter />
    </div>
  );
};

export default Studio;
