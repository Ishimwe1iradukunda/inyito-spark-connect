import { useRef, useState } from "react";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { Upload, Sparkles, Play, Download, Loader2, Film } from "lucide-react";
import NavBar from "@/components/NavBar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Highlight { start: number; end: number; title: string; description: string; score: number }

const fmt = (s: number) => {
  const m = Math.floor(s / 60), sec = Math.floor(s % 60);
  const h = Math.floor(m / 60);
  return `${h ? h + ":" : ""}${String(m % 60).padStart(h ? 2 : 1, "0")}:${String(sec).padStart(2, "0")}`;
};

/** Seek a hidden video and grab small JPEG frames at even intervals. */
async function sampleFrames(url: string, count: number, onProgress: (p: number) => void) {
  const v = document.createElement("video");
  v.src = url; v.muted = true; v.preload = "auto";
  await new Promise<void>((res, rej) => { v.onloadedmetadata = () => res(); v.onerror = () => rej(new Error("Could not read this video file.")); });
  const duration = v.duration;
  if (!isFinite(duration) || duration <= 0) throw new Error("Video length is unknown — try a different file.");
  const c = document.createElement("canvas");
  const scale = 384 / Math.max(v.videoWidth, 1);
  c.width = 384; c.height = Math.round(v.videoHeight * scale) || 216;
  const ctx = c.getContext("2d")!;
  const frames: { t: number; image: string }[] = [];
  for (let i = 0; i < count; i++) {
    const t = ((i + 0.5) / count) * duration;
    await new Promise<void>((res) => { v.onseeked = () => res(); v.currentTime = t; });
    ctx.drawImage(v, 0, 0, c.width, c.height);
    frames.push({ t, image: c.toDataURL("image/jpeg", 0.6) });
    onProgress((i + 1) / count);
  }
  return { duration, frames };
}

/** Decode audio and compute loudness per second (best effort). */
async function loudnessMap(file: File) {
  try {
    if (file.size > 300 * 1024 * 1024) return [];
    const ac = new AudioContext();
    const buf = await ac.decodeAudioData(await file.arrayBuffer());
    const data = buf.getChannelData(0), sr = buf.sampleRate;
    const out: { t: number; level: number }[] = [];
    const step = Math.max(1, Math.floor(buf.duration / 1500)) * sr;
    for (let s = 0; s < data.length; s += step) {
      let sum = 0; const end = Math.min(s + step, data.length);
      for (let j = s; j < end; j += 50) sum += data[j] * data[j];
      out.push({ t: s / sr, level: Math.min(1, Math.sqrt(sum / ((end - s) / 50)) * 3) });
    }
    ac.close();
    return out;
  } catch { return []; }
}

const Highlights = () => {
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [stage, setStage] = useState<"idle" | "sampling" | "analyzing" | "done">("idle");
  const [progress, setProgress] = useState(0);
  const [summary, setSummary] = useState("");
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [duration, setDuration] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const stopAt = useRef<number | null>(null);

  const pick = (f: File | undefined) => {
    if (!f) return;
    if (!f.type.startsWith("video/")) { toast({ title: "Please choose a video file", variant: "destructive" }); return; }
    if (url) URL.revokeObjectURL(url);
    setFile(f); setUrl(URL.createObjectURL(f)); setHighlights([]); setSummary(""); setStage("idle");
  };

  const analyze = async () => {
    if (!file || !url) return;
    try {
      setStage("sampling"); setProgress(0);
      const [{ duration, frames }, loudness] = await Promise.all([
        sampleFrames(url, 24, (p) => setProgress(p * 100)),
        loudnessMap(file),
      ]);
      setDuration(duration);
      setStage("analyzing");
      const { data, error } = await supabase.functions.invoke("find-highlights", {
        body: { title: file.name, durationSec: duration, frames, loudness },
      });
      if (error) {
        let msg = error.message;
        if (error instanceof FunctionsHttpError) { try { msg = (await error.context.json()).error ?? msg; } catch { /* keep */ } }
        throw new Error(typeof msg === "string" ? msg : "Analysis failed");
      }
      setSummary(data.summary ?? ""); setHighlights(data.highlights ?? []); setStage("done");
      toast({ title: `Found ${data.highlights?.length ?? 0} highlights` });
    } catch (e) {
      setStage("idle");
      toast({ title: "Couldn't find highlights", description: (e as Error).message, variant: "destructive" });
    }
  };

  const playClip = (h: Highlight) => {
    const v = videoRef.current; if (!v) return;
    v.currentTime = h.start; stopAt.current = h.end; v.play();
  };

  const exportList = () => {
    const txt = highlights.map((h, i) => `${i + 1}. [${fmt(h.start)} - ${fmt(h.end)}] ${h.title}\n   ${h.description}`).join("\n\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([`${summary}\n\n${txt}`], { type: "text/plain" }));
    a.download = `${file?.name ?? "broadcast"}-highlights.txt`; a.click();
  };

  const busy = stage === "sampling" || stage === "analyzing";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <NavBar />
      <main className="mx-auto max-w-6xl px-4 pt-28 pb-16">
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3"><Sparkles className="text-primary" /> AI Highlight Finder</h1>
          <p className="mt-2 text-muted-foreground">Upload a broadcast recording and AI will pick the best moments, with timestamps and short clip descriptions.</p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <section className="space-y-4">
            {!url ? (
              <label className="flex aspect-video cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-card/50 hover:border-primary transition-colors"
                onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files[0]); }}>
                <Upload className="text-muted-foreground" size={36} />
                <span className="font-medium">Drop a recording here or click to choose</span>
                <span className="text-xs text-muted-foreground">MP4, WebM, MOV — stays on your device; only small snapshots are sent for analysis</span>
                <input type="file" accept="video/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
              </label>
            ) : (
              <div className="relative overflow-hidden rounded-xl border border-border bg-card">
                <video ref={videoRef} src={url} controls className="aspect-video w-full bg-background"
                  onTimeUpdate={(e) => { if (stopAt.current && e.currentTarget.currentTime >= stopAt.current) { e.currentTarget.pause(); stopAt.current = null; } }} />
                {duration > 0 && highlights.length > 0 && (
                  <div className="relative h-3 bg-muted">
                    {highlights.map((h, i) => (
                      <button key={i} title={h.title} onClick={() => playClip(h)}
                        className="absolute top-0 h-full bg-primary/80 hover:bg-primary"
                        style={{ left: `${(h.start / duration) * 100}%`, width: `${Math.max(0.6, ((h.end - h.start) / duration) * 100)}%` }} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {url && (
              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={analyze} disabled={busy}>
                  {busy ? <Loader2 className="animate-spin" /> : <Sparkles />} {stage === "done" ? "Analyze again" : "Find highlights"}
                </Button>
                <label className="inline-flex">
                  <Button variant="outline" asChild disabled={busy}><span className="cursor-pointer"><Film /> Change video</span></Button>
                  <input type="file" accept="video/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
                </label>
                <span className="text-sm text-muted-foreground truncate max-w-[16rem]">{file?.name}</span>
              </div>
            )}

            {busy && (
              <div className="space-y-2 rounded-lg border border-border bg-card/70 p-4">
                <p className="text-sm font-medium">{stage === "sampling" ? "Taking snapshots of your video…" : "AI is watching for the best moments…"}</p>
                <Progress value={stage === "sampling" ? progress : 100} className={stage === "analyzing" ? "animate-pulse" : ""} />
              </div>
            )}
          </section>

          <aside className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Highlights</h2>
              {highlights.length > 0 && <Button size="sm" variant="ghost" onClick={exportList}><Download /> Export</Button>}
            </div>
            {summary && <p className="text-sm text-muted-foreground">{summary}</p>}
            {highlights.length === 0 && !busy && (
              <div className="rounded-lg border border-border bg-card/50 p-6 text-center text-sm text-muted-foreground">
                Your highlight moments will appear here.
              </div>
            )}
            {highlights.map((h, i) => (
              <button key={i} onClick={() => playClip(h)}
                className="group w-full rounded-lg border border-border bg-card p-4 text-left transition-colors hover:border-primary">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs text-primary">{fmt(h.start)} – {fmt(h.end)}</span>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{Math.round(h.score * 100)}% strength</span>
                </div>
                <p className="mt-1 font-semibold flex items-center gap-2"><Play size={14} className="opacity-60 group-hover:opacity-100" /> {h.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{h.description}</p>
              </button>
            ))}
          </aside>
        </div>
      </main>
    </div>
  );
};

export default Highlights;
