import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Radio, Clock } from "lucide-react";
import NavBar from "@/components/NavBar";
import SessionChatPanel from "@/components/studio/SessionChatPanel";
import { supabase } from "@/integrations/supabase/client";

interface PublicSession { id: string; title: string; status: string; started_at: string; ended_at: string | null }

const LiveViewer = () => {
  const { id } = useParams();
  const [session, setSession] = useState<PublicSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const load = () => (supabase as any).from("public_broadcasts").select("id,title,status,started_at,ended_at").eq("id", id).maybeSingle()
      .then(({ data }: { data: PublicSession | null }) => { setSession(data ?? null); setLoading(false); });
    load();
    const t = window.setInterval(load, 15000);
    return () => window.clearInterval(t);
  }, [id]);

  const live = session && session.status !== "ended";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <NavBar />
      <main className="mx-auto max-w-6xl px-4 pt-28 pb-10">
        {loading ? <p className="text-muted-foreground">Loading broadcast…</p> : !session ? (
          <div className="py-20 text-center"><h1 className="text-2xl font-bold">Broadcast not found</h1><p className="mt-2 text-muted-foreground">The link may be wrong or the broadcast was removed.</p></div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <section>
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-bold uppercase ${live ? "bg-destructive text-destructive-foreground" : "bg-muted text-muted-foreground"}`}>
                  <Radio size={12} /> {live ? "Live" : "Ended"}
                </span>
                <h1 className="text-2xl font-bold">{session.title}</h1>
              </div>
              <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground"><Clock size={14} /> Started {new Date(session.started_at).toLocaleString()}</p>
              <div className="mt-4 flex aspect-video items-center justify-center rounded-xl border border-border bg-card text-center text-muted-foreground">
                <p className="max-w-sm px-4 text-sm">{live ? "Watch the stream on the host's YouTube, Twitch or Facebook channel — chat with them right here." : "This broadcast has ended. The chat below is the saved conversation."}</p>
              </div>
            </section>
            <aside className="flex h-[70vh] flex-col overflow-hidden rounded-xl border border-border bg-card">
              <div className="border-b border-border px-4 py-2 text-sm font-semibold">Live chat</div>
              <SessionChatPanel sessionId={session.id} />
            </aside>
          </div>
        )}
      </main>
    </div>
  );
};

export default LiveViewer;
