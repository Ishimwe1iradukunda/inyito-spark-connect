import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mic, Camera, Monitor, Settings2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

export interface DeviceSelection {
  audioInputId: string;
  videoInputId: string;
}

export interface RecordingQuality {
  resolution: "720p" | "1080p" | "1440p" | "4k";
  fps: 24 | 30 | 60;
}

const RESOLUTIONS: Record<string, { width: number; height: number; label: string }> = {
  "720p": { width: 1280, height: 720, label: "720p HD" },
  "1080p": { width: 1920, height: 1080, label: "1080p Full HD" },
  "1440p": { width: 2560, height: 1440, label: "1440p QHD" },
  "4k": { width: 3840, height: 2160, label: "4K Ultra HD" },
};

interface DeviceSelectorProps {
  devices: DeviceSelection;
  quality: RecordingQuality;
  onDeviceChange: (devices: DeviceSelection) => void;
  onQualityChange: (quality: RecordingQuality) => void;
  disabled?: boolean;
}

const DeviceSelector = ({ devices, quality, onDeviceChange, onQualityChange, disabled }: DeviceSelectorProps) => {
  const [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([]);
  const [videoInputs, setVideoInputs] = useState<MediaDeviceInfo[]>([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const enumerate = async () => {
      try {
        // Need a brief permission grant to see labels
        const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true }).catch(() => null);
        const all = await navigator.mediaDevices.enumerateDevices();
        setAudioInputs(all.filter((d) => d.kind === "audioinput"));
        setVideoInputs(all.filter((d) => d.kind === "videoinput"));
        tempStream?.getTracks().forEach((t) => t.stop());
      } catch {
        // Fallback — no permissions
        const all = await navigator.mediaDevices.enumerateDevices();
        setAudioInputs(all.filter((d) => d.kind === "audioinput"));
        setVideoInputs(all.filter((d) => d.kind === "videoinput"));
      }
    };
    enumerate();

    navigator.mediaDevices.addEventListener("devicechange", enumerate);
    return () => navigator.mediaDevices.removeEventListener("devicechange", enumerate);
  }, []);

  return (
    <div className="w-full max-w-4xl mx-auto mb-6">
      <Button
        variant="ghost"
        size="sm"
        className="gap-2 text-xs text-muted-foreground mx-auto flex"
        onClick={() => setExpanded(!expanded)}
        disabled={disabled}
      >
        <Settings2 size={14} />
        {expanded ? "Hide" : "Show"} Device & Quality Settings
      </Button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3 card-glass rounded-xl p-4">
              {/* Mic Selection */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Mic size={10} /> Microphone
                </label>
                <Select
                  value={devices.audioInputId}
                  onValueChange={(v) => onDeviceChange({ ...devices, audioInputId: v })}
                  disabled={disabled}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Default" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default" className="text-xs">Default</SelectItem>
                    {audioInputs.map((d) => (
                      <SelectItem key={d.deviceId} value={d.deviceId} className="text-xs">
                        {d.label || `Microphone ${d.deviceId.slice(0, 8)}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Camera Selection */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Camera size={10} /> Camera
                </label>
                <Select
                  value={devices.videoInputId}
                  onValueChange={(v) => onDeviceChange({ ...devices, videoInputId: v })}
                  disabled={disabled}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Default" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default" className="text-xs">Default</SelectItem>
                    {videoInputs.map((d) => (
                      <SelectItem key={d.deviceId} value={d.deviceId} className="text-xs">
                        {d.label || `Camera ${d.deviceId.slice(0, 8)}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Resolution */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Monitor size={10} /> Resolution
                </label>
                <Select
                  value={quality.resolution}
                  onValueChange={(v) => onQualityChange({ ...quality, resolution: v as RecordingQuality["resolution"] })}
                  disabled={disabled}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(RESOLUTIONS).map(([key, val]) => (
                      <SelectItem key={key} value={key} className="text-xs">
                        {val.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* FPS */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  Frame Rate
                </label>
                <Select
                  value={String(quality.fps)}
                  onValueChange={(v) => onQualityChange({ ...quality, fps: Number(v) as RecordingQuality["fps"] })}
                  disabled={disabled}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24" className="text-xs">24 fps (Cinematic)</SelectItem>
                    <SelectItem value="30" className="text-xs">30 fps (Standard)</SelectItem>
                    <SelectItem value="60" className="text-xs">60 fps (Smooth)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export { RESOLUTIONS };
export default DeviceSelector;
