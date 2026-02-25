import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import NavBar from "@/components/NavBar";
import SiteFooter from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import {
  Video,
  Trash2,
  Download,
  Clock,
  Monitor,
  Camera,
  Layers,
  Search,
  Film,
} from "lucide-react";

interface Recording {
  id: string;
  title: string;
  description: string | null;
  file_url: string | null;
  file_size: number | null;
  duration_ms: number | null;
  source_type: string;
  created_at: string;
}

function formatDuration(ms: number | null) {
  if (!ms) return "--:--";
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function formatSize(bytes: number | null) {
  if (!bytes) return "--";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const sourceIcons: Record<string, typeof Monitor> = { screen: Monitor, camera: Camera, both: Layers };

const MyRecordings = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/auth"); return; }
    fetchRecordings();
  }, [user, authLoading]);

  const fetchRecordings = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("recordings")
      .select("*")
      .order("created_at", { ascending: false });
    setRecordings((data as Recording[]) || []);
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("recordings").delete().eq("id", id);
    setRecordings((prev) => prev.filter((r) => r.id !== id));
  };

  const handleDownload = async (rec: Recording) => {
    if (!rec.file_url) return;
    const { data } = await supabase.storage.from("recordings").createSignedUrl(rec.file_url, 300);
    if (data?.signedUrl) {
      const a = document.createElement("a");
      a.href = data.signedUrl;
      a.download = `${rec.title}.webm`;
      a.click();
    }
  };

  const filtered = recordings.filter((r) =>
    r.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-background text-foreground min-h-screen">
      <NavBar />
      <main className="pt-20 pb-16 px-4 max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-black mb-1">
            <span className="text-gradient-brand">My Recordings</span>
          </h1>
          <p className="text-muted-foreground text-sm">All your saved recordings in one place.</p>
        </motion.div>

        {/* Search + New */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search recordings..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button className="gap-2 glow-blue font-bold" onClick={() => navigate("/studio")}>
            <Video size={16} /> New Recording
          </Button>
        </div>

        {/* List */}
        {loading ? (
          <div className="text-center py-20 text-muted-foreground text-sm">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Film size={48} className="mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground text-sm">
              {recordings.length === 0 ? "No recordings yet. Hit the button above to start!" : "No results found."}
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            <AnimatePresence>
              {filtered.map((rec) => {
                const Icon = sourceIcons[rec.source_type] || Monitor;
                return (
                  <motion.div
                    key={rec.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="card-glass rounded-xl p-4 flex items-center gap-4"
                  >
                    <div className="shrink-0 w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                      <Icon size={18} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{rec.title}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-1"><Clock size={12} /> {formatDuration(rec.duration_ms)}</span>
                        <span>{formatSize(rec.file_size)}</span>
                        <span>{new Date(rec.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button variant="ghost" size="icon" onClick={() => handleDownload(rec)} title="Download">
                        <Download size={16} />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(rec.id)} title="Delete">
                        <Trash2 size={16} className="text-destructive" />
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
};

export default MyRecordings;
