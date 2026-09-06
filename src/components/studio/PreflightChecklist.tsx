import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, XCircle, ListChecks, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type Status = "ok" | "warn" | "fail" | "checking";

interface CheckItem {
  id: string;
  label: string;
  status: Status;
  detail: string;
}

interface PreflightChecklistProps {
  hasStreamKey: boolean;
  destinationCount: number;
  micStream: MediaStream | null;
}

const ICONS: Record<Status, React.ElementType> = {
  ok: CheckCircle2,
  warn: AlertTriangle,
  fail: XCircle,
  checking: RefreshCw,
};

const COLORS: Record<Status, string> = {
  ok: "text-green-500",
  warn: "text-yellow-500",
  fail: "text-destructive",
  checking: "text-muted-foreground",
};

const PreflightChecklist = ({ hasStreamKey, destinationCount, micStream }: PreflightChecklistProps) => {
  const [devices, setDevices] = useState<Status>("checking");
  const [micLevel, setMicLevel] = useState<Status>("checking");
  const [disk, setDisk] = useState<{ status: Status; detail: string }>({ status: "checking", detail: "Checking…" });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await navigator.mediaDevices.enumerateDevices();
        const hasCam = list.some((d) => d.kind === "videoinput");
        const hasMic = list.some((d) => d.kind === "audioinput");
        if (!cancelled) setDevices(hasCam && hasMic ? "ok" : hasCam || hasMic ? "warn" : "fail");
      } catch {
        if (!cancelled) setDevices("fail");
      }

      try {
        const est = await navigator.storage?.estimate?.();
        const freeGb = est?.quota ? (est.quota - (est.usage ?? 0)) / 1e9 : null;
        if (!cancelled)
          setDisk(
            freeGb === null
              ? { status: "warn", detail: "Cannot read free space" }
              : { status: freeGb > 1 ? "ok" : "warn", detail: `${freeGb.toFixed(1)} GB available` }
          );
      } catch {
        if (!cancelled) setDisk({ status: "warn", detail: "Cannot read free space" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [nonce]);

  useEffect(() => {
    if (!micStream) {
      setMicLevel("warn");
      return;
    }
    let raf = 0;
    let ctx: AudioContext | null = null;
    try {
      ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      ctx.createMediaStreamSource(micStream).connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const started = performance.now();
      const tick = () => {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        if (avg > 3) setMicLevel("ok");
        else if (performance.now() - started > 4000) setMicLevel("warn");
        raf = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      setMicLevel("fail");
    }
    return () => {
      cancelAnimationFrame(raf);
      ctx?.close();
    };
  }, [micStream, nonce]);

  const items: CheckItem[] = [
    {
      id: "key",
      label: "Stream key configured",
      status: hasStreamKey ? "ok" : "fail",
      detail: hasStreamKey ? "Key present" : "Add your platform stream key",
    },
    {
      id: "dest",
      label: "Destinations enabled",
      status: destinationCount > 0 ? "ok" : "warn",
      detail: destinationCount > 0 ? `${destinationCount} selected` : "No destination selected",
    },
    { id: "devices", label: "Camera & microphone", status: devices, detail: devices === "ok" ? "Devices detected" : "Check device permissions" },
    { id: "mic", label: "Microphone level", status: micLevel, detail: micLevel === "ok" ? "Audio detected" : "No audio detected yet" },
    { id: "disk", label: "Local storage", status: disk.status, detail: disk.detail },
  ];

  const blocking = items.some((i) => i.status === "fail");

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border border-border bg-card/60 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          <ListChecks size={11} /> Pre-flight check
        </span>
        <Button variant="ghost" size="sm" className="h-6 gap-1 text-[10px]" onClick={() => setNonce((n) => n + 1)}>
          <RefreshCw size={10} /> Re-check
        </Button>
      </div>
      <div className="grid gap-1.5 sm:grid-cols-2">
        {items.map((i) => {
          const Icon = ICONS[i.status];
          return (
            <div key={i.id} className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/20 px-2 py-1.5">
              <Icon size={13} className={`${COLORS[i.status]} ${i.status === "checking" ? "animate-spin" : ""}`} />
              <div className="min-w-0">
                <p className="truncate text-[11px] font-semibold">{i.label}</p>
                <p className="truncate text-[10px] text-muted-foreground">{i.detail}</p>
              </div>
            </div>
          );
        })}
      </div>
      <p className={`mt-2 text-[10px] font-semibold ${blocking ? "text-destructive" : "text-green-500"}`}>
        {blocking ? "Fix the red items before going live." : "All clear — you're ready to go live."}
      </p>
    </motion.div>
  );
};

export default PreflightChecklist;
