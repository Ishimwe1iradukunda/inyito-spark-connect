import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useStreamConfig, type StreamConfig } from "@/hooks/useStreamConfig";
import { useAuth } from "@/contexts/AuthContext";
import {
  Radio,
  Copy,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Save,
  Globe,
  Lock,
  Users,
  Activity,
  Settings,
  Heart,
  Wifi,
  WifiOff,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Link2,
  Tv,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

/* ------------------------------------------------------------------ */
/*  Stream Health Indicator                                             */
/* ------------------------------------------------------------------ */
const StreamHealthBar = ({ label, value, max, unit, color }: {
  label: string; value: number; max: number; unit: string; color: string;
}) => (
  <div className="space-y-1">
    <div className="flex justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono font-medium">{value}{unit}</span>
    </div>
    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min((value / max) * 100, 100)}%` }}
        transition={{ duration: 0.6 }}
      />
    </div>
  </div>
);

/* ------------------------------------------------------------------ */
/*  Main Panel                                                         */
/* ------------------------------------------------------------------ */
interface LiveStreamPanelProps {
  isStreaming: boolean;
  onGoLive: (config: StreamConfig) => void;
  onStopStream: () => void;
}

const CATEGORIES = [
  "Entertainment", "Gaming", "Music", "Sports", "Education",
  "Science & Tech", "News & Politics", "Howto & Style",
  "People & Blogs", "Comedy", "Film & Animation",
];

const LiveStreamPanel = ({ isStreaming, onGoLive, onStopStream }: LiveStreamPanelProps) => {
  const { user } = useAuth();
  const { configs, activeConfig, setActiveConfig, loading, saveConfig, deleteConfig } = useStreamConfig();

  const [showKey, setShowKey] = useState(false);
  const [dualStream, setDualStream] = useState(false);
  const [saving, setSaving] = useState(false);

  // Local form state
  const [formTitle, setFormTitle] = useState(activeConfig?.title ?? "");
  const [formCategory, setFormCategory] = useState(activeConfig?.category ?? "Entertainment");
  const [formPrivacy, setFormPrivacy] = useState(activeConfig?.privacy ?? "public");
  const [formStreamUrl, setFormStreamUrl] = useState(activeConfig?.stream_url ?? "");
  const [formStreamKey, setFormStreamKey] = useState(activeConfig?.stream_key ?? "");
  const [formBackupUrl, setFormBackupUrl] = useState(activeConfig?.backup_url ?? "");
  const [formPlatform, setFormPlatform] = useState(activeConfig?.platform ?? "youtube");

  // Sync form when active config changes
  const selectConfig = useCallback((config: StreamConfig) => {
    setActiveConfig(config);
    setFormTitle(config.title);
    setFormCategory(config.category);
    setFormPrivacy(config.privacy);
    setFormStreamUrl(config.stream_url ?? "");
    setFormStreamKey(config.stream_key ?? "");
    setFormBackupUrl(config.backup_url ?? "");
    setFormPlatform(config.platform);
  }, [setActiveConfig]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copied`, description: "Paste it into your streaming software." });
  };

  const handleSave = async () => {
    setSaving(true);
    await saveConfig({
      id: activeConfig?.id,
      title: formTitle || "Untitled Stream",
      category: formCategory,
      privacy: formPrivacy,
      stream_url: formStreamUrl || null,
      stream_key: formStreamKey || null,
      backup_url: formBackupUrl || null,
      platform: formPlatform,
    });
    toast({ title: "Stream settings saved" });
    setSaving(false);
  };

  const handleNewConfig = async () => {
    const config = await saveConfig({
      title: "New Stream Config",
      platform: "youtube",
      category: "Entertainment",
      privacy: "public",
    });
    if (config) selectConfig(config);
  };

  const handleDelete = async () => {
    if (!activeConfig) return;
    await deleteConfig(activeConfig.id);
    toast({ title: "Configuration deleted" });
  };

  const handleGoLive = () => {
    if (!formStreamUrl && !formStreamKey) {
      toast({ title: "Missing stream URL", description: "Please enter your RTMP stream URL.", variant: "destructive" });
      return;
    }
    if (activeConfig) onGoLive(activeConfig);
  };

  if (!user) {
    return (
      <div className="card-glass rounded-xl p-6 text-center">
        <Radio className="mx-auto mb-3 text-muted-foreground" size={32} />
        <p className="text-sm text-muted-foreground">Sign in to configure live streaming</p>
      </div>
    );
  }

  const privacyIcon = formPrivacy === "public" ? Globe : formPrivacy === "unlisted" ? Link2 : Lock;
  const PrivacyIcon = privacyIcon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-glass rounded-2xl overflow-hidden border border-border"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card/50">
        <div className="flex items-center gap-3">
          <div className={`p-1.5 rounded-lg ${isStreaming ? "bg-destructive/20" : "bg-primary/10"}`}>
            {isStreaming ? (
              <Wifi size={18} className="text-destructive animate-pulse" />
            ) : (
              <Tv size={18} className="text-primary" />
            )}
          </div>
          <div>
            <h3 className="font-bold text-sm">Live Stream</h3>
            <p className="text-[10px] text-muted-foreground">
              {isStreaming ? "Broadcasting live" : "Configure your stream"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Config selector */}
          {configs.length > 0 && (
            <Select value={activeConfig?.id ?? ""} onValueChange={(id) => {
              const c = configs.find((x) => x.id === id);
              if (c) selectConfig(c);
            }}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue placeholder="Select config" />
              </SelectTrigger>
              <SelectContent>
                {configs.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-xs">
                    {c.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleNewConfig}>
            <Plus size={14} />
          </Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row">
        {/* Left: Settings Tabs */}
        <div className="flex-1 p-4">
          <Tabs defaultValue="settings" className="w-full">
            <TabsList className="w-full grid grid-cols-3 mb-4">
              <TabsTrigger value="settings" className="text-xs gap-1.5">
                <Settings size={12} /> Stream settings
              </TabsTrigger>
              <TabsTrigger value="analytics" className="text-xs gap-1.5">
                <Activity size={12} /> Analytics
              </TabsTrigger>
              <TabsTrigger value="health" className="text-xs gap-1.5">
                <Heart size={12} /> Stream health
              </TabsTrigger>
            </TabsList>

            {/* ---- Stream Settings ---- */}
            <TabsContent value="settings" className="space-y-5 mt-0">
              {/* Dual Stream Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Dual stream</span>
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-primary/30 text-primary">
                      New
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Automatically generate a vertical cropped version for the Shorts feed.{" "}
                    <a href="#" className="text-primary hover:underline">Learn more</a>
                  </p>
                </div>
                <Switch checked={dualStream} onCheckedChange={setDualStream} />
              </div>

              {/* Platform */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Platform</label>
                <Select value={formPlatform} onValueChange={setFormPlatform}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="youtube">YouTube</SelectItem>
                    <SelectItem value="twitch">Twitch</SelectItem>
                    <SelectItem value="facebook">Facebook Live</SelectItem>
                    <SelectItem value="custom">Custom RTMP</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Stream URL */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Stream URL</label>
                <div className="flex gap-2">
                  <div className="flex-1 flex items-center gap-2 bg-muted/50 border border-border rounded-md px-3 py-2">
                    <Lock size={12} className="text-muted-foreground shrink-0" />
                    <Input
                      className="border-0 bg-transparent h-auto p-0 text-xs font-mono focus-visible:ring-0"
                      placeholder="rtmp://a.rtmp.youtube.com/live2"
                      value={formStreamUrl}
                      onChange={(e) => setFormStreamUrl(e.target.value)}
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 gap-1.5"
                    onClick={() => handleCopy(formStreamUrl, "Stream URL")}
                    disabled={!formStreamUrl}
                  >
                    <Copy size={12} /> Copy
                  </Button>
                </div>
              </div>

              {/* Stream Key */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Stream Key</label>
                <div className="flex gap-2">
                  <div className="flex-1 flex items-center gap-2 bg-muted/50 border border-border rounded-md px-3 py-2">
                    <Lock size={12} className="text-muted-foreground shrink-0" />
                    <Input
                      className="border-0 bg-transparent h-auto p-0 text-xs font-mono focus-visible:ring-0"
                      type={showKey ? "text" : "password"}
                      placeholder="Enter your stream key"
                      value={formStreamKey}
                      onChange={(e) => setFormStreamKey(e.target.value)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 shrink-0"
                      onClick={() => setShowKey(!showKey)}
                    >
                      {showKey ? <EyeOff size={10} /> : <Eye size={10} />}
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 gap-1.5"
                    onClick={() => handleCopy(formStreamKey, "Stream Key")}
                    disabled={!formStreamKey}
                  >
                    <Copy size={12} /> Copy
                  </Button>
                </div>
              </div>

              {/* Backup server URL */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Backup server URL</label>
                <div className="flex gap-2">
                  <div className="flex-1 flex items-center gap-2 bg-muted/50 border border-border rounded-md px-3 py-2">
                    <Lock size={12} className="text-muted-foreground shrink-0" />
                    <Input
                      className="border-0 bg-transparent h-auto p-0 text-xs font-mono focus-visible:ring-0"
                      placeholder="rtmp://b.rtmp.youtube.com/live2?backup=1"
                      value={formBackupUrl}
                      onChange={(e) => setFormBackupUrl(e.target.value)}
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 gap-1.5"
                    onClick={() => handleCopy(formBackupUrl, "Backup URL")}
                    disabled={!formBackupUrl}
                  >
                    <Copy size={12} /> Copy
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  YouTube also supports RTMPS for secure connections.{" "}
                  <a href="#" className="text-primary hover:underline">Learn more</a>
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 pt-2">
                <Button className="gap-2 flex-1" onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Save Settings
                </Button>
                {activeConfig && (
                  <Button variant="ghost" size="icon" className="text-destructive/70 hover:text-destructive" onClick={handleDelete}>
                    <Trash2 size={14} />
                  </Button>
                )}
              </div>
            </TabsContent>

            {/* ---- Analytics ---- */}
            <TabsContent value="analytics" className="mt-0">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Viewers waiting", value: "0", icon: Users },
                    { label: "Likes", value: "0", icon: Heart },
                    { label: "Peak viewers", value: "—", icon: Activity },
                    { label: "Chat messages", value: "0", icon: Radio },
                  ].map(({ label, value, icon: Icon }) => (
                    <div key={label} className="bg-muted/30 rounded-lg p-3 border border-border/50">
                      <div className="flex items-center gap-2 mb-1">
                        <Icon size={12} className="text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">{label}</span>
                      </div>
                      <span className="text-lg font-bold">{value}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground text-center">
                  {isStreaming
                    ? "Analytics update in real-time while streaming."
                    : "Start streaming to see live analytics."}
                </p>
              </div>
            </TabsContent>

            {/* ---- Stream Health ---- */}
            <TabsContent value="health" className="mt-0">
              <div className="space-y-4">
                {/* Connection status */}
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border/50">
                  {isStreaming ? (
                    <CheckCircle2 size={16} className="text-green-500" />
                  ) : (
                    <AlertCircle size={16} className="text-muted-foreground" />
                  )}
                  <div>
                    <p className="text-xs font-medium">
                      {isStreaming ? "Connected" : "Not connected"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {isStreaming
                        ? "Stream is healthy and broadcasting"
                        : "Start sending video to your streaming software to go live"}
                    </p>
                  </div>
                </div>

                {/* Health metrics */}
                <div className="space-y-3">
                  <StreamHealthBar label="Bitrate" value={isStreaming ? 4500 : 0} max={8000} unit=" kbps" color="hsl(var(--primary))" />
                  <StreamHealthBar label="Framerate" value={isStreaming ? 30 : 0} max={60} unit=" fps" color="hsl(142 71% 45%)" />
                  <StreamHealthBar label="Resolution" value={isStreaming ? 1080 : 0} max={2160} unit="p" color="hsl(45 93% 47%)" />
                  <StreamHealthBar label="Dropped frames" value={0} max={100} unit="%" color="hsl(var(--destructive))" />
                </div>

                <p className="text-[10px] text-muted-foreground text-center">
                  Stream health is monitored in real-time during broadcast.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right: Stream Info Card */}
        <div className="w-full lg:w-64 border-t lg:border-t-0 lg:border-l border-border p-4 bg-card/30 space-y-4">
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Title</label>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className="h-8 text-sm font-semibold"
                placeholder="Stream title"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Category</label>
              <Select value={formCategory} onValueChange={setFormCategory}>
                <SelectTrigger className="h-8 text-sm font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Privacy</label>
              <Select value={formPrivacy} onValueChange={setFormPrivacy}>
                <SelectTrigger className="h-8 text-sm font-semibold">
                  <div className="flex items-center gap-2">
                    <PrivacyIcon size={14} />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public"><div className="flex items-center gap-2"><Globe size={12} /> Public</div></SelectItem>
                  <SelectItem value="unlisted"><div className="flex items-center gap-2"><Link2 size={12} /> Unlisted</div></SelectItem>
                  <SelectItem value="private"><div className="flex items-center gap-2"><Lock size={12} /> Private</div></SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground">Viewers waiting</p>
                <p className="text-xl font-bold">0</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground">Likes</p>
                <p className="text-xl font-bold">0</p>
              </div>
            </div>
          </div>

          {/* Go Live / Stop button */}
          <AnimatePresence mode="wait">
            {isStreaming ? (
              <motion.div key="stop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Button
                  variant="destructive"
                  className="w-full gap-2 font-bold"
                  size="lg"
                  onClick={onStopStream}
                >
                  <WifiOff size={16} />
                  End Stream
                </Button>
              </motion.div>
            ) : (
              <motion.div key="live" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Button
                  className="w-full gap-2 font-bold bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                  size="lg"
                  onClick={handleGoLive}
                >
                  <Radio size={16} className="animate-pulse" />
                  Go Live
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

export default LiveStreamPanel;
