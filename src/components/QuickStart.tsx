import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Video, Radio, Scissors, Sparkles, LayoutTemplate, History, FolderOpen, ArrowRight, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const ACTIONS = [
  { icon: Video, title: "Record a video", desc: "Capture your screen, camera and voice in one click — with countdown and live sound meters.", to: "/studio", color: "--brand-blue", cta: "Start recording" },
  { icon: Radio, title: "Go live", desc: "Stream to YouTube, Twitch and Facebook at once, with overlays and live chat for your viewers.", to: "/studio?mode=stream", color: "--brand-red", cta: "Set up a stream" },
  { icon: Scissors, title: "Edit like a pro", desc: "Trim, add text, filters, transitions and keyframes — see every change instantly.", to: "/studio", color: "--brand-purple", cta: "Open the editor" },
  { icon: Sparkles, title: "Find highlights with AI", desc: "Upload a stream and AI picks the best moments with timestamps and clip titles.", to: "/highlights", color: "--brand-gold", cta: "Find highlights" },
  { icon: LayoutTemplate, title: "Use a template", desc: "Ready-made looks, filters and effects you can apply in one click.", to: "/templates", color: "--brand-green", cta: "Browse templates" },
  { icon: History, title: "Review your broadcasts", desc: "See when you went live, for how long, and read back the chat — by day, week or month.", to: "/broadcasts", color: "--brand-orange", cta: "See history" },
];

const QuickStart = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [counts, setCounts] = useState<{ recordings: number; broadcasts: number } | null>(null);

  useEffect(() => {
    if (!user) { setCounts(null); return; }
    (async () => {
      const [p, r, b] = await Promise.all([
        supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle(),
        supabase.from("recordings").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        (supabase as any).from("live_sessions").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      ]);
      setName(p.data?.display_name?.split("@")[0] ?? "");
      setCounts({ recordings: r.count ?? 0, broadcasts: b.count ?? 0 });
    })();
  }, [user]);

  return (
    <section id="start" className="relative px-4 py-20">
      <div className="mx-auto max-w-6xl">
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">{user ? `Welcome back${name ? `, ${name}` : ""}` : "Get started in seconds"}</p>
          <h2 className="mt-2 text-3xl font-bold md:text-5xl">What do you want to do today?</h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">Everything you can do here, in one place. Pick one and you're on your way — no need to explore.</p>
        </motion.div>

        {user && counts && (
          <div className="mx-auto mt-8 flex max-w-xl flex-wrap items-center justify-center gap-3">
            <Button variant="outline" onClick={() => navigate("/my-recordings")}><FolderOpen /> {counts.recordings} recording{counts.recordings === 1 ? "" : "s"}</Button>
            <Button variant="outline" onClick={() => navigate("/broadcasts")}><Radio /> {counts.broadcasts} broadcast{counts.broadcasts === 1 ? "" : "s"}</Button>
          </div>
        )}

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ACTIONS.map((a, i) => (
            <motion.button
              key={a.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              onClick={() => navigate(a.to)}
              className="group flex flex-col rounded-2xl border border-border bg-card p-6 text-left transition-all hover:-translate-y-1 hover:shadow-xl"
              style={{ ["--accent" as string]: `hsl(var(${a.color}))` }}
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: `hsl(var(${a.color}) / 0.15)`, color: `hsl(var(${a.color}))` }}>
                <a.icon size={24} />
              </span>
              <h3 className="mt-4 text-lg font-semibold">{a.title}</h3>
              <p className="mt-1 flex-1 text-sm text-muted-foreground">{a.desc}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold" style={{ color: `hsl(var(${a.color}))` }}>
                {a.cta} <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
              </span>
            </motion.button>
          ))}
        </div>

        {!user && (
          <div className="mt-10 text-center">
            <Button size="lg" className="rounded-full px-8" onClick={() => navigate("/auth")}><LogIn /> Create a free account to save your work</Button>
          </div>
        )}
      </div>
    </section>
  );
};

export default QuickStart;
