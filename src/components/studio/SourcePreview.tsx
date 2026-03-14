import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Camera, CameraOff, MonitorPlay } from "lucide-react";

interface SourcePreviewProps {
  sourceType: "screen" | "camera" | "both";
  videoDeviceId: string;
  audioDeviceId: string;
  micEnabled: boolean;
}

const SourcePreview = ({ sourceType, videoDeviceId, audioDeviceId, micEnabled }: SourcePreviewProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (sourceType === "screen") {
      // Can't auto-preview screen — requires user gesture
      setStream(null);
      setError(false);
      return;
    }

    let cancelled = false;
    const start = async () => {
      try {
        const constraints: MediaStreamConstraints = {
          video: videoDeviceId && videoDeviceId !== "default"
            ? { deviceId: { exact: videoDeviceId }, width: 640, height: 480 }
            : { width: 640, height: 480 },
          audio: micEnabled
            ? audioDeviceId && audioDeviceId !== "default"
              ? { deviceId: { exact: audioDeviceId } }
              : true
            : false,
        };

        const s = await navigator.mediaDevices.getUserMedia(constraints);
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        setStream(s);
        setError(false);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
      } catch {
        if (!cancelled) setError(true);
      }
    };

    start();

    return () => {
      cancelled = true;
      setStream((prev) => {
        prev?.getTracks().forEach((t) => t.stop());
        return null;
      });
    };
  }, [sourceType, videoDeviceId, audioDeviceId, micEnabled]);

  // Screen mode — show placeholder
  if (sourceType === "screen") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground h-full">
        <MonitorPlay size={40} className="opacity-30" />
        <p className="text-xs">Screen preview will appear when you start recording</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground h-full">
        <CameraOff size={40} className="opacity-30" />
        <p className="text-xs">Camera access denied or unavailable</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="relative w-full h-full"
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover rounded-lg"
      />
      <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-background/70 backdrop-blur-sm rounded-md px-2 py-1">
        <Camera size={10} className="text-primary" />
        <span className="text-[9px] font-medium text-foreground">Live Preview</span>
      </div>
    </motion.div>
  );
};

export default SourcePreview;
