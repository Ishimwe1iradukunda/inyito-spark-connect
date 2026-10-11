import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Radio, MessageSquare, Clock, Users, Link2, Video, Activity } from "lucide-react";
import NavBar from "@/components/NavBar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface Session { id: string; title: string; status: string; started_at: string; ended_at: string | null; destinations: any }
interface Msg { id: string; session_id: string; display_name: string; message: string; is_host: boolean; created_at: string; user_id: string }

const clock = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

const LiveDashboard = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [now, setNow] = useState(Date.now());

  const live = sessions.find((s) => s.status !== "ended") ?? null;

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase.from("live_sessions").select("id,title,status,started_at,ended_at,destinations")
        .eq("user_id", user.id).order("started_at", { ascending: false }).limit(20);
      setSessions((data as Session[]) ?? []);
    };
    load();
    const ch = supabase.channel("dash-sessions")
      .on("postgres_changes", { event: "*", schema: "public", table: "live_sessions", filter: `user_id=eq.${user.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  useEffect(() => {
    if (!live) { setMessages([]); return; }
    supabase.from("stream_chat_messages").select("*").eq("session_id", live.id)
      .order("created_at", { ascending: true }).limit(200)
      .then(({ data }) => setMessages((data as Msg[]) ?? []));
    const ch = supabase.channel(`dash-chat-${live.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "stream_chat_messages", filter: `session_id=eq.${live.id}` },
        (p) => setMessages((m) => [...m.slice(-199), p.new as Msg]))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [live?.id]);

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  const chatters = useMemo(() => new Set(messages.map((m) => m.user_id)).size, [messages]);
  const perMin = useMemo(() => messages.filter((m) => now - new Date(m.created_at).getTime() < 60_000).length, [messages, now]);
  const outputs: { platform: string; ok: boolean }[] = Array.isArray(live?.destinations) ? live!.destinations : [];
  const viewerUrl = live ? `${window.location.origin}/live/${live.id}` : "";

  const Stat = ({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | number }) => (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground"><Icon size={14} /> {label}</div>
      <div className="mt-2 text-2xl font-bold font-mono">{value}</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <NavBar />
      <main className="mx-auto max-w-6xl px-4 pt-28 pb-16 space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3"><Activity className="text-primary" /> Live Dashboard</h1>
            <p className="text-muted-foreground mt-1">Your broadcast, chat and audience at a glance — updates on its own.</p>
          </div>
          {live ? (
            <Badge className="gap-1.5 bg-destructive text-destructive-foreground text-sm px-3 py-1"><Radio size={12} className="animate-pulse" /> ON AIR</Badge>
          ) : (
            <Button asChild><Link to="/studio?mode=stream"><Video /> Go live in Studio</Link></Button>
          )}
        </header>

        {live ? (
          <>
            <section className="rounded-xl border border-destructive/40 bg-card p-4 flex flex-wrap items-center gap-3">
              <span className="font-semibold">{live.title}</span>
              <span className="text-xs text-muted-foreground">status: {live.status}</span>
              {outputs.map((o, i) => (
                <Badge key={i} variant="outline" className={o.ok ? "border-primary/40" : "border-destructive/40 text-destructive"}>{o.platform} · {o.ok ? "relaying" : "failed"}</Badge>
              ))}
              <div className="ml-auto flex items-center gap-2">
                <span className="hidden md:block truncate max-w-[16rem] text-xs text-muted-foreground">{viewerUrl}</span>
                <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(viewerUrl); toast({ title: "Viewer link copied" }); }}><Link2 /> Copy viewer link</Button>
              </div>
            </section>
            <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Stat icon={Clock} label="Uptime" value={clock(now - new Date(live.started_at).getTime())} />
              <Stat icon={MessageSquare} label="Chat messages" value={messages.length} />
              <Stat icon={Users} label="Chatters" value={chatters} />
              <Stat icon={Activity} label="Messages / min" value={perMin} />
            </section>
            <section className="rounded-xl border border-border bg-card">
              <h2 className="border-b border-border px-4 py-2 font-semibold">Live chat feed</h2>
              <div className="max-h-96 overflow-y-auto p-4 space-y-1.5 text-sm">
                {messages.length === 0 ? <p className="text-muted-foreground">No messages yet — share the viewer link.</p> :
                  messages.map((m) => (
                    <p key={m.id}><span className="font-semibold text-primary">{m.display_name}{m.is_host ? " (host)" : ""}</span>: {m.message}</p>
                  ))}
              </div>
            </section>
          </>
        ) : (
          <section className="rounded-xl border border-dashed border-border bg-card/50 p-10 text-center text-muted-foreground">
            You're not live right now. When you go live, uptime, chat and platforms show up here instantly.
          </section>
        )}

        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold">Recent broadcasts</h2>
            <Link to="/broadcasts" className="text-sm text-primary">Full history</Link>
          </div>
          <div className="rounded-xl border border-border bg-card divide-y divide-border">
            {sessions.length === 0 && <p className="p-4 text-sm text-muted-foreground">No broadcasts yet.</p>}
            {sessions.slice(0, 8).map((s) => (
              <div key={s.id} className="flex items-center justify-between p-3 text-sm">
                <span className="truncate">{s.title}</span>
                <span className="text-muted-foreground text-xs font-mono">
                  {new Date(s.started_at).toLocaleString()} · {s.ended_at ? clock(new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) : "live"}
                </span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default LiveDashboard;
