import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, AlertCircle, CheckCircle2, Gauge, Loader2, Radio, Timer, Wifi } from "lucide-react";
import type { BroadcastState, BroadcastStats } from "@/hooks/useLiveBroadcast";

interface Props {
  state: BroadcastState;
  stats: BroadcastStats;
  error: string | null;
  outputs: { platform: string; ok: boolean; error?: string }[];
  uptimeMs: number;
}

const PLATFORM_LABEL: Record<string, string> = {
  youtube: "YouTube Live",
  twitch: "Twitch",
  facebook: "Facebook Live",
  kick: "Kick",
  custom: "Custom RTMP",
};

const clock = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

const LiveBroadcastStatus = ({ state, stats, error, outputs, uptimeMs }: Props) => {
  const quality =
    stats.bitrateKbps > 2500 && stats.rttMs < 150 ? "Excellent" : stats.bitrateKbps > 1000 ? "Good" : stats.bitrateKbps > 0 ? "Low" : "Starting";
  const qualityClass =
    quality === "Excellent" || quality === "Good"
      ? "bg-green-500/15 text-green-500"
      : quality === "Low"
        ? "bg-yellow-500/15 text-yellow-500"
        : "bg-muted text-muted-foreground";

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="border-destructive/40">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <Badge className="gap-1.5 bg-destructive text-destructive-foreground">
              {state === "starting" ? <Loader2 size={10} className="animate-spin" /> : <Radio size={10} />}
              {state === "starting" ? "CONNECTING" : state === "reconnecting" ? "RECONNECTING" : state === "error" ? "ERROR" : "ON AIR"}
            </Badge>
            <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${qualityClass}`}>
              <Wifi size={10} className="inline mr-1" />
              {quality}
            </span>
            <span className="flex items-center gap-1.5 text-xs font-mono">
              <Activity size={12} className="text-muted-foreground" />
              {stats.bitrateKbps.toLocaleString()} kbps
            </span>
            <span className="flex items-center gap-1.5 text-xs font-mono">
              <Gauge size={12} className="text-muted-foreground" />
              {stats.fps} fps
            </span>
            <span className="flex items-center gap-1.5 text-xs font-mono">
              <Timer size={12} className="text-muted-foreground" />
              {clock(uptimeMs)}
            </span>
            <span className="text-xs font-mono text-muted-foreground">{stats.rttMs} ms · {stats.packetsLost} lost</span>
          </div>

          {error && (
            <p className="flex items-start gap-2 text-xs text-destructive">
              <AlertCircle size={13} className="mt-0.5 shrink-0" /> {error}
            </p>
          )}

          {outputs.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {outputs.map((o, i) => (
                <span
                  key={`${o.platform}-${i}`}
                  className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] ${
                    o.ok ? "border-green-500/30 text-green-500" : "border-destructive/40 text-destructive"
                  }`}
                  title={o.error}
                >
                  {o.ok ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />}
                  {PLATFORM_LABEL[o.platform] ?? o.platform}
                  {o.ok ? " · relaying" : " · failed"}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default LiveBroadcastStatus;
