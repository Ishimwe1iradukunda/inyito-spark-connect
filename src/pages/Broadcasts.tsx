import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Radio, Clock, CalendarDays, MessageSquare, ExternalLink } from "lucide-react";
import NavBar from "@/components/NavBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type Period = "today" | "week" | "month" | "year" | "all" | "custom";
interface Session { id: string; title: string; status: string; started_at: string; ended_at: string | null; destinations: any }

const PERIODS: { id: Period; label: string }[] = [
  { id: "today", label: "Today" }, { id: "week", label: "Last 7 days" }, { id: "month", label: "Last 30 days" },
  { id: "year", label: "This year" }, { id: "all", label: "All time" }, { id: "custom", label: "Custom" },
];

const dur = (ms: number) => {
  const m = Math.round(ms / 60000);
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;
};

function range(p: Period, from: string, to: string): [Date | null, Date | null] {
  const now = new Date();
  if (p === "today") { const d = new Date(now); d.setHours(0, 0, 0, 0); return [d, null]; }
  if (p === "week") return [new Date(now.getTime() - 7 * 864e5), null];
  if (p === "month") return [new Date(now.getTime() - 30 * 864e5), null];
  if (p === "year") return [new Date(now.getFullYear(), 0, 1), null];
  if (p === "custom") return [from ? new Date(from) : null, to ? new Date(to + "T23:59:59") : null];
  return [null, null];
}

const Broadcasts = () => {
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>("month");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [chatCounts, setChatCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const [start, end] = range(period, from, to);
    setLoading(true);
    let q = (supabase as any).from("live_sessions").select("id,title,status,started_at,ended_at,destinations")
      .eq("user_id", user.id).order("started_at", { ascending: false }).limit(500);
    if (start) q = q.gte("started_at", start.toISOString());
    if (end) q = q.lte("started_at", end.toISOString());
    q.then(async ({ data }: { data: Session[] | null }) => {
      const list = data ?? [];
      setSessions(list);
      setLoading(false);
      if (list.length) {
        const { data: msgs } = await (supabase as any).from("stream_chat_messages").select("session_id").in("session_id", list.map((s) => s.id)).limit(10000);
        const c: Record<string, number> = {};
        (msgs ?? []).forEach((m: { session_id: string }) => { c[m.session_id] = (c[m.session_id] ?? 0) + 1; });
        setChatCounts(c);
      } else setChatCounts({});
    });
  }, [user, period, from, to]);

  const lengthOf = (s: Session) => (s.ended_at ? new Date(s.ended_at).getTime() : s.status === "ended" ? new Date(s.started_at).getTime() : Date.now()) - new Date(s.started_at).getTime();

  const stats = useMemo(() => {
    const total = sessions.reduce((a, s) => a + lengthOf(s), 0);
    return {
      count: sessions.length,
      total,
      avg: sessions.length ? total / sessions.length : 0,
      chats: Object.values(chatCounts).reduce((a, b) => a + b, 0),
    };
  }, [sessions, chatCounts]);

  // group by day
  const groups = useMemo(() => {
    const g: Record<string, Session[]> = {};
    sessions.forEach((s) => { const k = new Date(s.started_at).toLocaleDateString(undefined, { weekday: "short", year: "numeric", month: "short", day: "numeric" }); (g[k] ||= []).push(s); });
    return Object.entries(g);
  }, [sessions]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <NavBar />
      <main className="mx-auto max-w-5xl px-4 pt-28 pb-16">
        <h1 className="flex items-center gap-3 text-3xl font-bold"><Radio className="text-primary" /> Broadcast History</h1>
        <p className="mt-2 text-muted-foreground">See every time you went live, filtered by period.</p>

        <div className="mt-6 flex flex-wrap gap-2">
          {PERIODS.map((p) => (
            <Button key={p.id} size="sm" variant={period === p.id ? "default" : "outline"} onClick={() => setPeriod(p.id)}>{p.label}</Button>
          ))}
        </div>
        {period === "custom" && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-auto" />
            <span className="text-muted-foreground">to</span>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-auto" />
          </div>
        )}

        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: "Broadcasts", value: String(stats.count), icon: Radio },
            { label: "Time live", value: dur(stats.total), icon: Clock },
            { label: "Average length", value: dur(stats.avg), icon: CalendarDays },
            { label: "Chat messages", value: String(stats.chats), icon: MessageSquare },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-card p-4">
              <s.icon size={16} className="text-primary" />
              <p className="mt-2 text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 space-y-6">
          {loading ? <p className="text-muted-foreground">Loading…</p> : groups.length === 0 ? (
            <div className="rounded-xl border border-border bg-card/50 p-10 text-center text-muted-foreground">
              No broadcasts in this period. <Link to="/studio" className="text-primary underline">Go live from the Studio</Link>.
            </div>
          ) : groups.map(([day, list]) => (
            <section key={day}>
              <h2 className="mb-2 text-sm font-semibold text-muted-foreground">{day}</h2>
              <div className="space-y-2">
                {list.map((s) => {
                  const dests = Array.isArray(s.destinations) ? s.destinations : [];
                  return (
                    <div key={s.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-4">
                      <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${s.status === "ended" ? "bg-muted text-muted-foreground" : "bg-destructive text-destructive-foreground"}`}>
                        {s.status === "ended" ? "Ended" : "Live"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{s.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(s.started_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {dur(lengthOf(s))}
                          {dests.length > 0 && ` · ${dests.map((d: any) => d.platform).join(", ")}`}
                        </p>
                      </div>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground"><MessageSquare size={12} /> {chatCounts[s.id] ?? 0}</span>
                      <Button asChild size="sm" variant="ghost"><Link to={`/live/${s.id}`}><ExternalLink size={14} /> Chat</Link></Button>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Broadcasts;
