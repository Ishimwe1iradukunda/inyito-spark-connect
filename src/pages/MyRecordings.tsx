import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import NavBar from "@/components/NavBar";
import SiteFooter from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import ShareModal from "@/components/studio/ShareModal";
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
  Share2,
  LayoutGrid,
  LayoutList,
  HardDrive,
  TrendingUp,
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
  const [shareOpen, setShareOpen] = useState(false);
  const [shareTitle, setShareTitle] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Recording | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

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

  const handleDelete = async (rec: Recording) => {
    await supabase.from("recordings").delete().eq("id", rec.id);
    setRecordings((prev) => prev.filter((r) => r.id !== rec.id));
    setDeleteTarget(null);
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

  // Stats
  const totalDuration = recordings.reduce((acc, r) => acc + (r.duration_ms || 0), 0);
  const totalSize = recordings.reduce((acc, r) => acc + (r.file_size || 0), 0);

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

        {/* Stats bar */}
        {recordings.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-3 gap-3 mb-6"
          >
            <div className="card-glass rounded-xl p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp size={16} className="text-primary" />
              </div>
              <div>
                <p className="text-lg font-black text-foreground">{recordings.length}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Recordings</p>
              </div>
            </div>
            <div className="card-glass rounded-xl p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: "hsl(var(--brand-purple) / 0.1)" }}>
                <Clock size={16} style={{ color: "hsl(var(--brand-purple))" }} />
              </div>
              <div>
                <p className="text-lg font-black text-foreground">{formatDuration(totalDuration)}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Time</p>
              </div>
            </div>
            <div className="card-glass rounded-xl p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: "hsl(var(--brand-green) / 0.1)" }}>
                <HardDrive size={16} style={{ color: "hsl(var(--brand-green))" }} />
              </div>
              <div>
                <p className="text-lg font-black text-foreground">{formatSize(totalSize)}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Storage</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Search + View Toggle + New */}
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
          <div className="flex gap-2">
            <div className="flex rounded-lg border border-border overflow-hidden">
              <button
                onClick={() => setViewMode("list")}
                className={`p-2.5 transition-colors ${viewMode === "list" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
              >
                <LayoutList size={16} />
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2.5 transition-colors ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
              >
                <LayoutGrid size={16} />
              </button>
            </div>
            <Button className="gap-2 glow-blue font-bold" onClick={() => navigate("/studio")}>
              <Video size={16} /> New Recording
            </Button>
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="text-center py-20 text-muted-foreground text-sm">Loading...</div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-20"
          >
            <div className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: "hsl(var(--brand-purple) / 0.1)" }}>
              <Film size={36} style={{ color: "hsl(var(--brand-purple))" }} />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">
              {recordings.length === 0 ? "No recordings yet" : "No results found"}
            </h3>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-6">
              {recordings.length === 0
                ? "Head to the studio to create your first recording. It's quick and easy!"
                : "Try adjusting your search terms."}
            </p>
            {recordings.length === 0 && (
              <Button className="gap-2 glow-blue font-bold" onClick={() => navigate("/studio")}>
                <Video size={16} /> Start Recording
              </Button>
            )}
          </motion.div>
        ) : viewMode === "list" ? (
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
                    className="card-glass rounded-xl p-4 flex items-center gap-4 group hover:border-primary/20 transition-colors"
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
                    <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" onClick={() => { setShareTitle(rec.title); setShareOpen(true); }} title="Share">
                        <Share2 size={16} />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDownload(rec)} title="Download">
                        <Download size={16} />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(rec)} title="Delete">
                        <Trash2 size={16} className="text-destructive" />
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <AnimatePresence>
              {filtered.map((rec) => {
                const Icon = sourceIcons[rec.source_type] || Monitor;
                return (
                  <motion.div
                    key={rec.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="card-glass rounded-xl overflow-hidden group hover:border-primary/20 transition-colors"
                  >
                    {/* Thumbnail placeholder */}
                    <div className="aspect-video bg-secondary/50 flex items-center justify-center relative">
                      <Icon size={32} className="text-muted-foreground/30" />
                      <span className="absolute bottom-2 right-2 text-[10px] font-mono bg-background/80 backdrop-blur-sm px-1.5 py-0.5 rounded text-foreground">
                        {formatDuration(rec.duration_ms)}
                      </span>
                    </div>
                    <div className="p-3">
                      <p className="font-semibold text-sm truncate mb-1">{rec.title}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(rec.created_at).toLocaleDateString()} · {formatSize(rec.file_size)}
                        </span>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDownload(rec)}>
                            <Download size={13} />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteTarget(rec)}>
                            <Trash2 size={13} className="text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </main>
      <ShareModal open={shareOpen} onOpenChange={setShareOpen} videoTitle={shareTitle} />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete recording?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "<strong>{deleteTarget?.title}</strong>". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SiteFooter />
    </div>
  );
};

export default MyRecordings;
