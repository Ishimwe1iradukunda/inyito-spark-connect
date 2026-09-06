import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { logError } from "@/lib/errorLog";

export type BroadcastState = "idle" | "starting" | "live" | "reconnecting" | "error";

export interface BroadcastDestination {
  platform: string;
  url: string;
  key: string;
}

export interface BroadcastStats {
  bitrateKbps: number;
  packetsLost: number;
  rttMs: number;
  fps: number;
}

interface StartResult {
  sessionId: string | null;
  liveInputUid: string;
  whipUrl: string;
  playbackUrl: string | null;
  outputs: { platform: string; ok: boolean; error?: string }[];
}

const EMPTY_STATS: BroadcastStats = { bitrateKbps: 0, packetsLost: 0, rttMs: 0, fps: 0 };

async function invokeLive(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("live-stream", { body });
  if (error) {
    let details = error.message;
    if (error instanceof FunctionsHttpError) {
      const text = await error.context.text();
      try { details = JSON.parse(text).error ?? text; } catch { details = text; }
    }
    throw new Error(details);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

/**
 * Publishes a MediaStream to Cloudflare Stream Live over WHIP (WebRTC ingest).
 * Cloudflare then re-broadcasts (simulcasts) to YouTube / Twitch / Facebook / any RTMP target.
 */
export function useLiveBroadcast() {
  const [state, setState] = useState<BroadcastState>("idle");
  const [stats, setStats] = useState<BroadcastStats>(EMPTY_STATS);
  const [error, setError] = useState<string | null>(null);
  const [outputs, setOutputs] = useState<{ platform: string; ok: boolean; error?: string }[]>([]);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const resourceRef = useRef<string | null>(null);
  const sessionRef = useRef<{ sessionId: string | null; liveInputUid: string } | null>(null);
  const statsTimer = useRef<number | null>(null);
  const prevStats = useRef({ bytes: 0, t: 0, frames: 0 });

  const teardownLocal = useCallback(() => {
    if (statsTimer.current) window.clearInterval(statsTimer.current);
    statsTimer.current = null;
    if (resourceRef.current) {
      // best-effort WHIP session delete
      fetch(resourceRef.current, { method: "DELETE" }).catch(() => undefined);
      resourceRef.current = null;
    }
    pcRef.current?.close();
    pcRef.current = null;
    prevStats.current = { bytes: 0, t: 0, frames: 0 };
  }, []);

  const collectStats = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc) return;
    const report = await pc.getStats();
    let bytes = 0, lost = 0, rtt = 0, frames = 0;
    report.forEach((r) => {
      if (r.type === "outbound-rtp" && !r.isRemote) {
        bytes += r.bytesSent ?? 0;
        frames += r.framesEncoded ?? 0;
      }
      if (r.type === "remote-inbound-rtp") {
        lost += r.packetsLost ?? 0;
        if (r.roundTripTime) rtt = Math.round(r.roundTripTime * 1000);
      }
      if (r.type === "candidate-pair" && r.state === "succeeded" && r.currentRoundTripTime) {
        rtt = rtt || Math.round(r.currentRoundTripTime * 1000);
      }
    });
    const now = performance.now();
    const prev = prevStats.current;
    if (prev.t) {
      const dt = (now - prev.t) / 1000;
      setStats({
        bitrateKbps: dt > 0 ? Math.round(((bytes - prev.bytes) * 8) / dt / 1000) : 0,
        packetsLost: lost,
        rttMs: rtt,
        fps: dt > 0 ? Math.round((frames - prev.frames) / dt) : 0,
      });
    }
    prevStats.current = { bytes, t: now, frames };
  }, []);

  const start = useCallback(
    async (stream: MediaStream, title: string, destinations: BroadcastDestination[]) => {
      setError(null);
      setState("starting");
      try {
        const result = (await invokeLive({ action: "start", title, destinations })) as StartResult;
        sessionRef.current = { sessionId: result.sessionId, liveInputUid: result.liveInputUid };
        setOutputs(result.outputs ?? []);
        setPlaybackUrl(result.playbackUrl);
        if (!result.whipUrl) throw new Error("The relay did not return an ingest endpoint.");

        const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.cloudflare.com:3478" }] });
        pcRef.current = pc;
        stream.getTracks().forEach((track) => pc.addTransceiver(track, { direction: "sendonly" }));

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        // wait briefly for ICE candidates to be gathered into the SDP
        await new Promise<void>((resolve) => {
          if (pc.iceGatheringState === "complete") return resolve();
          const check = () => {
            if (pc.iceGatheringState === "complete") {
              pc.removeEventListener("icegatheringstatechange", check);
              resolve();
            }
          };
          pc.addEventListener("icegatheringstatechange", check);
          window.setTimeout(resolve, 2000);
        });

        const res = await fetch(result.whipUrl, {
          method: "POST",
          headers: { "Content-Type": "application/sdp" },
          body: pc.localDescription?.sdp ?? "",
        });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Relay rejected the stream [${res.status}]: ${text.slice(0, 200)}`);
        }
        const location = res.headers.get("Location");
        if (location) resourceRef.current = new URL(location, result.whipUrl).toString();
        const answer = await res.text();
        await pc.setRemoteDescription({ type: "answer", sdp: answer });

        pc.addEventListener("connectionstatechange", () => {
          if (pc.connectionState === "connected") setState("live");
          else if (pc.connectionState === "disconnected") setState("reconnecting");
          else if (pc.connectionState === "failed") {
            setState("error");
            setError("Connection to the relay was lost.");
          }
        });

        setState("live");
        statsTimer.current = window.setInterval(collectStats, 1000);
        return result;
      } catch (e) {
        const message = (e as Error).message;
        logError("app", message, e);
        teardownLocal();
        setState("error");
        setError(message);
        throw e;
      }
    },
    [collectStats, teardownLocal],
  );

  const stop = useCallback(async () => {
    teardownLocal();
    const session = sessionRef.current;
    sessionRef.current = null;
    setState("idle");
    setStats(EMPTY_STATS);
    setOutputs([]);
    setPlaybackUrl(null);
    if (session?.liveInputUid) {
      try {
        await invokeLive({ action: "stop", liveInputUid: session.liveInputUid, sessionId: session.sessionId });
      } catch (e) {
        logError("app", (e as Error).message, e);
      }
    }
  }, [teardownLocal]);

  useEffect(() => () => teardownLocal(), [teardownLocal]);

  return { state, stats, error, outputs, playbackUrl, start, stop, isLive: state === "live" || state === "reconnecting" };
}
