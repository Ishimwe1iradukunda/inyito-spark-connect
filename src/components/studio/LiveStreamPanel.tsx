import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
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
  ExternalLink,
  Monitor,
  Zap,
  Signal,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

/* ------------------------------------------------------------------ */
/*  Platform configs                                                    */
/* ------------------------------------------------------------------ */

const PLATFORMS = [
  {
    id: "youtube",
    name: "YouTube Live",
    icon: "🔴",
    color: "hsl(0 72% 51%)",
    defaultUrl: "rtmp://a.rtmp.youtube.com/live2",
    helpText: "Go to YouTube Studio → Go Live → Stream → Copy 'Stream URL' and 'Stream key'",
    helpLink: "https://studio.youtube.com/channel/UC/livestreaming",
  },
  {
    id: "twitch",
    name: "Twitch",
    icon: "💜",
    color: "hsl(264 100% 64%)",
    defaultUrl: "rtmp://live.twitch.tv/app",
    helpText: "Go to Twitch Dashboard → Settings → Stream → Copy 'Primary Stream key'",
    helpLink: "https://dashboard.twitch.tv/settings/stream",
  },
  {
    id: "facebook",
    name: "Facebook Live",
    icon: "🔵",
    color: "hsl(214 89% 52%)",
    defaultUrl: "rtmps://live-api-s.facebook.com:443/rtmp/",
    helpText: "Go to Facebook → Live Video → Use Stream Key → Copy 'Server URL' and 'Stream Key'",
    helpLink: "https://www.facebook.com/live/producer",
  },
  {
    id: "kick",
    name: "Kick",
    icon: "🟢",
    color: "hsl(142 71% 45%)",
    defaultUrl: "",
    helpText: "Go to Kick Dashboard → Settings → Stream → Copy RTMP URL and Stream Key",
    helpLink: "https://kick.com/dashboard/settings/stream",
  },
  {
    id: "custom",
    name: "Custom RTMP",
    icon: "⚙️",
    color: "hsl(var(--primary))",
    defaultUrl: "",
    helpText: "Enter any RTMP/RTMPS server URL and stream key from your platform",
    helpLink: "",
  },
] as const;

type PlatformId = (typeof PLATFORMS)[number]["id"];

const getPlatform = (id: string) => PLATFORMS.find((p) => p.id === id) || PLATFORMS.find((p) => p.id === "custom")!;

/* ------------------------------------------------------------------ */
/*  Stream Health Bar                                                   */
/* ------------------------------------------------------------------ */
const StreamHealthBar = ({
  label,
  value,
  max,
  unit,
  color,
}: {
  label: string;
  value: number;
  max: number;
  unit: string;
  color: string;
}) => (
  <div className="space-y-1">
    <div className="flex justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono font-medium">
        {value}
        {unit}
      </span>
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
/*  Destination Card                                                    */
/* ------------------------------------------------------------------ */
const DestinationCard = ({
  config,
  isActive,
  isStreaming,
  onSelect,
  onDelete,
}: {
  config: StreamConfig;
  isActive: boolean;
  isStreaming: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) => {
  const platform = getPlatform(config.platform);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`relative cursor-pointer rounded-xl border-2 p-3 transition-all ${
        isActive
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/40 bg-card/50"
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center gap-3">
        <span className="text-xl">{platform.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{config.title}</p>
          <p className="text-[10px] text-muted-foreground">{platform.name}</p>
        </div>
        <div className="flex items-center gap-1.5">
          {config.stream_url && config.stream_key ? (
            <Badge
              variant="outline"
              className="text-[9px] px-1.5 py-0 border-green-500/40 text-green-500"
            >
              <CheckCircle2 size={8} className="mr-0.5" /> Ready
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="text-[9px] px-1.5 py-0 border-yellow-500/40 text-yellow-500"
            >
              <AlertCircle size={8} className="mr-0.5" /> Setup needed
            </Badge>
          )}
          {!isStreaming && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-destructive/50 hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <Trash2 size={12} />
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

/* ------------------------------------------------------------------ */
/*  Main Panel                                                         */
/* ------------------------------------------------------------------ */
interface LiveStreamPanelProps {
  isStreaming: boolean;
  onGoLive: (config: StreamConfig) => void;
  onStopStream: () => void;
}

const CATEGORIES = [
  "Entertainment",
  "Gaming",
  "Music",
  "Sports",
  "Education",
  "Science & Tech",
  "News & Politics",
  "Howto & Style",
  "People & Blogs",
  "Comedy",
  "Film & Animation",
];

const LiveStreamPanel = ({
  isStreaming,
  onGoLive,
  onStopStream,
}: LiveStreamPanelProps) => {
  const { user } = useAuth();
  const {
    configs,
    activeConfig,
    setActiveConfig,
    loading,
    saveConfig,
    deleteConfig,
  } = useStreamConfig();

  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addingPlatform, setAddingPlatform] = useState(false);

  // Local form state
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState("Entertainment");
  const [formPrivacy, setFormPrivacy] = useState("public");
  const [formStreamUrl, setFormStreamUrl] = useState("");
  const [formStreamKey, setFormStreamKey] = useState("");
  const [formBackupUrl, setFormBackupUrl] = useState("");
  const [formPlatform, setFormPlatform] = useState<string>("youtube");

  // Sync form when active config changes
  const syncForm = useCallback((config: StreamConfig) => {
    setFormTitle(config.title);
    setFormCategory(config.category);
    setFormPrivacy(config.privacy);
    setFormStreamUrl(config.stream_url ?? "");
    setFormStreamKey(config.stream_key ?? "");
    setFormBackupUrl(config.backup_url ?? "");
    setFormPlatform(config.platform);
  }, []);

  useEffect(() => {
    if (activeConfig) syncForm(activeConfig);
  }, [activeConfig, syncForm]);

  const selectConfig = useCallback(
    (config: StreamConfig) => {
      setActiveConfig(config);
      syncForm(config);
    },
    [setActiveConfig, syncForm]
  );

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copied` });
  };

  const handleSave = async () => {
    setSaving(true);
    await saveConfig({
      id: activeConfig?.id,
      title: formTitle || "Untitled Destination",
      category: formCategory,
      privacy: formPrivacy,
      stream_url: formStreamUrl || null,
      stream_key: formStreamKey || null,
      backup_url: formBackupUrl || null,
      platform: formPlatform,
    });
    toast({ title: "Destination saved" });
    setSaving(false);
  };

  const handleAddPlatform = async (platformId: string) => {
    const platform = getPlatform(platformId);
    const config = await saveConfig({
      title: `My ${platform.name} Stream`,
      platform: platformId,
      category: "Entertainment",
      privacy: "public",
      stream_url: platform.defaultUrl || null,
    });
    if (config) selectConfig(config);
    setAddingPlatform(false);
  };

  const handleDelete = async () => {
    if (!activeConfig) return;
    await deleteConfig(activeConfig.id);
    toast({ title: "Destination removed" });
  };

  const handleGoLive = () => {
    if (!formStreamUrl || !formStreamKey) {
      toast({
        title: "Missing credentials",
        description:
          "Paste your RTMP stream URL and stream key from your platform to go live.",
        variant: "destructive",
      });
      return;
    }
    if (activeConfig) onGoLive(activeConfig);
  };

  if (!user) {
    return (
      <div className="card-glass rounded-xl p-6 text-center">
        <Radio className="mx-auto mb-3 text-muted-foreground" size={32} />
        <p className="text-sm text-muted-foreground">
          Sign in to configure live streaming destinations
        </p>
      </div>
    );
  }

  const platform = getPlatform(formPlatform);
  const readyDestinations = configs.filter(
    (c) => c.stream_url && c.stream_key
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-xl ${
              isStreaming ? "bg-destructive/20" : "bg-primary/10"
            }`}
          >
            {isStreaming ? (
              <Signal size={20} className="text-destructive animate-pulse" />
            ) : (
              <Monitor size={20} className="text-primary" />
            )}
          </div>
          <div>
            <h2 className="text-lg font-black">Streaming Hub</h2>
            <p className="text-xs text-muted-foreground">
              Connect your platforms and go live from here
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className={`text-xs ${
            isStreaming
              ? "border-destructive/40 text-destructive"
              : "border-muted-foreground/30"
          }`}
        >
          {isStreaming ? (
            <>
              <Wifi size={10} className="mr-1 animate-pulse" /> Broadcasting
            </>
          ) : (
            <>
              <WifiOff size={10} className="mr-1" /> Offline
            </>
          )}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column: Destinations */}
        <div className="lg:col-span-1 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Zap size={14} className="text-primary" /> Destinations
            </h3>
            <Badge variant="secondary" className="text-[10px]">
              {readyDestinations.length} ready
            </Badge>
          </div>

          {/* Destination list */}
          <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
            <AnimatePresence>
              {configs.map((c) => (
                <DestinationCard
                  key={c.id}
                  config={c}
                  isActive={activeConfig?.id === c.id}
                  isStreaming={isStreaming}
                  onSelect={() => selectConfig(c)}
                  onDelete={() => {
                    deleteConfig(c.id);
                    toast({ title: "Destination removed" });
                  }}
                />
              ))}
            </AnimatePresence>
          </div>

          {/* Add new destination */}
          {!addingPlatform ? (
            <Button
              variant="outline"
              className="w-full gap-2 border-dashed"
              onClick={() => setAddingPlatform(true)}
              disabled={isStreaming}
            >
              <Plus size={14} /> Add Destination
            </Button>
          ) : (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2"
            >
              <p className="text-xs font-medium text-muted-foreground">
                Choose platform:
              </p>
              <div className="grid grid-cols-2 gap-2">
                {PLATFORMS.map((p) => (
                  <Button
                    key={p.id}
                    variant="outline"
                    size="sm"
                    className="gap-2 text-xs justify-start h-9"
                    onClick={() => handleAddPlatform(p.id)}
                  >
                    <span>{p.icon}</span> {p.name}
                  </Button>
                ))}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={() => setAddingPlatform(false)}
              >
                Cancel
              </Button>
            </motion.div>
          )}

          {/* Go Live button */}
          <div className="pt-2">
            <AnimatePresence mode="wait">
              {isStreaming ? (
                <motion.div
                  key="stop"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Button
                    variant="destructive"
                    className="w-full gap-2 font-bold"
                    size="lg"
                    onClick={onStopStream}
                  >
                    <WifiOff size={16} /> End Stream
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="live"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Button
                    className="w-full gap-2 font-bold bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                    size="lg"
                    onClick={handleGoLive}
                    disabled={readyDestinations.length === 0}
                  >
                    <Radio size={16} className="animate-pulse" /> Go Live
                  </Button>
                  {readyDestinations.length === 0 && (
                    <p className="text-[10px] text-muted-foreground text-center mt-1.5">
                      Add a destination and paste credentials to go live
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right Column: Active destination config */}
        <div className="lg:col-span-2">
          {activeConfig ? (
            <Card className="border-border">
              <CardContent className="p-4">
                <Tabs defaultValue="connect" className="w-full">
                  <TabsList className="w-full grid grid-cols-3 mb-4">
                    <TabsTrigger value="connect" className="text-xs gap-1.5">
                      <Link2 size={12} /> Connect
                    </TabsTrigger>
                    <TabsTrigger value="info" className="text-xs gap-1.5">
                      <Settings size={12} /> Stream Info
                    </TabsTrigger>
                    <TabsTrigger value="health" className="text-xs gap-1.5">
                      <Activity size={12} /> Health
                    </TabsTrigger>
                  </TabsList>

                  {/* ---- Connect Tab ---- */}
                  <TabsContent value="connect" className="space-y-4 mt-0">
                    {/* Platform header */}
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                      <span className="text-2xl">{platform.icon}</span>
                      <div className="flex-1">
                        <p className="text-sm font-bold">{platform.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {platform.helpText}
                        </p>
                      </div>
                      {platform.helpLink && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1 text-xs text-primary shrink-0"
                          onClick={() =>
                            window.open(platform.helpLink, "_blank")
                          }
                        >
                          <ExternalLink size={12} /> Open{" "}
                          {platform.id === "custom" ? "" : platform.name}
                        </Button>
                      )}
                    </div>

                    {/* Stream URL */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">
                        Stream URL / Server URL
                      </label>
                      <div className="flex gap-2">
                        <div className="flex-1 flex items-center gap-2 bg-muted/50 border border-border rounded-md px-3 py-2">
                          <Globe
                            size={12}
                            className="text-muted-foreground shrink-0"
                          />
                          <Input
                            className="border-0 bg-transparent h-auto p-0 text-xs font-mono focus-visible:ring-0"
                            placeholder={
                              platform.defaultUrl ||
                              "rtmp://your-server-url/live"
                            }
                            value={formStreamUrl}
                            onChange={(e) => setFormStreamUrl(e.target.value)}
                          />
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="shrink-0 gap-1.5"
                          onClick={() =>
                            handleCopy(formStreamUrl, "Stream URL")
                          }
                          disabled={!formStreamUrl}
                        >
                          <Copy size={12} />
                        </Button>
                      </div>
                    </div>

                    {/* Stream Key */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">
                        Stream Key
                      </label>
                      <div className="flex gap-2">
                        <div className="flex-1 flex items-center gap-2 bg-muted/50 border border-border rounded-md px-3 py-2">
                          <Lock
                            size={12}
                            className="text-muted-foreground shrink-0"
                          />
                          <Input
                            className="border-0 bg-transparent h-auto p-0 text-xs font-mono focus-visible:ring-0"
                            type={showKey ? "text" : "password"}
                            placeholder="Paste your stream key here"
                            value={formStreamKey}
                            onChange={(e) => setFormStreamKey(e.target.value)}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 shrink-0"
                            onClick={() => setShowKey(!showKey)}
                          >
                            {showKey ? (
                              <EyeOff size={10} />
                            ) : (
                              <Eye size={10} />
                            )}
                          </Button>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="shrink-0 gap-1.5"
                          onClick={() =>
                            handleCopy(formStreamKey, "Stream Key")
                          }
                          disabled={!formStreamKey}
                        >
                          <Copy size={12} />
                        </Button>
                      </div>
                      <p className="text-[10px] text-destructive/80 flex items-center gap-1">
                        <Lock size={8} /> Never share your stream key — it
                        controls access to your broadcast.
                      </p>
                    </div>

                    {/* Backup URL (optional) */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">
                        Backup Server URL{" "}
                        <span className="text-muted-foreground/60">
                          (optional)
                        </span>
                      </label>
                      <div className="flex gap-2">
                        <div className="flex-1 flex items-center gap-2 bg-muted/50 border border-border rounded-md px-3 py-2">
                          <Globe
                            size={12}
                            className="text-muted-foreground shrink-0"
                          />
                          <Input
                            className="border-0 bg-transparent h-auto p-0 text-xs font-mono focus-visible:ring-0"
                            placeholder="rtmp://backup-server/live"
                            value={formBackupUrl}
                            onChange={(e) => setFormBackupUrl(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Save */}
                    <Button
                      className="w-full gap-2"
                      onClick={handleSave}
                      disabled={saving}
                    >
                      {saving ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Save size={14} />
                      )}
                      Save Destination
                    </Button>
                  </TabsContent>

                  {/* ---- Stream Info Tab ---- */}
                  <TabsContent value="info" className="space-y-4 mt-0">
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">
                          Stream Title
                        </label>
                        <Input
                          value={formTitle}
                          onChange={(e) => setFormTitle(e.target.value)}
                          className="h-9 text-sm"
                          placeholder="My awesome stream"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">
                          Category
                        </label>
                        <Select
                          value={formCategory}
                          onValueChange={setFormCategory}
                        >
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CATEGORIES.map((c) => (
                              <SelectItem key={c} value={c}>
                                {c}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">
                          Privacy
                        </label>
                        <Select
                          value={formPrivacy}
                          onValueChange={setFormPrivacy}
                        >
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="public">
                              <div className="flex items-center gap-2">
                                <Globe size={12} /> Public
                              </div>
                            </SelectItem>
                            <SelectItem value="unlisted">
                              <div className="flex items-center gap-2">
                                <Link2 size={12} /> Unlisted
                              </div>
                            </SelectItem>
                            <SelectItem value="private">
                              <div className="flex items-center gap-2">
                                <Lock size={12} /> Private
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <Button
                        className="w-full gap-2"
                        onClick={handleSave}
                        disabled={saving}
                      >
                        {saving ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Save size={14} />
                        )}
                        Update Info
                      </Button>
                    </div>

                    {/* Quick stats */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      {[
                        { label: "Viewers", value: "0", icon: Users },
                        { label: "Likes", value: "0", icon: Heart },
                        { label: "Peak", value: "—", icon: Activity },
                        { label: "Chat", value: "0", icon: Radio },
                      ].map(({ label, value, icon: Icon }) => (
                        <div
                          key={label}
                          className="bg-muted/30 rounded-lg p-3 border border-border/50"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Icon size={12} className="text-muted-foreground" />
                            <span className="text-[10px] text-muted-foreground">
                              {label}
                            </span>
                          </div>
                          <span className="text-lg font-bold">{value}</span>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  {/* ---- Health Tab ---- */}
                  <TabsContent value="health" className="space-y-4 mt-0">
                    {/* Connection status */}
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border/50">
                      {isStreaming ? (
                        <CheckCircle2 size={16} className="text-green-500" />
                      ) : (
                        <AlertCircle
                          size={16}
                          className="text-muted-foreground"
                        />
                      )}
                      <div>
                        <p className="text-xs font-medium">
                          {isStreaming ? "Connected & Broadcasting" : "Offline"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {isStreaming
                            ? `Streaming to ${platform.name}`
                            : "Paste your credentials and click Go Live"}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <StreamHealthBar
                        label="Bitrate"
                        value={isStreaming ? 4500 : 0}
                        max={8000}
                        unit=" kbps"
                        color="hsl(var(--primary))"
                      />
                      <StreamHealthBar
                        label="Framerate"
                        value={isStreaming ? 30 : 0}
                        max={60}
                        unit=" fps"
                        color="hsl(142 71% 45%)"
                      />
                      <StreamHealthBar
                        label="Resolution"
                        value={isStreaming ? 1080 : 0}
                        max={2160}
                        unit="p"
                        color="hsl(45 93% 47%)"
                      />
                      <StreamHealthBar
                        label="Dropped Frames"
                        value={0}
                        max={100}
                        unit="%"
                        color="hsl(var(--destructive))"
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border">
              <CardContent className="p-8 flex flex-col items-center justify-center text-center min-h-[300px]">
                <Tv size={48} className="text-muted-foreground/30 mb-4" />
                <h3 className="font-bold text-sm mb-1">No destination selected</h3>
                <p className="text-xs text-muted-foreground max-w-xs">
                  Add a streaming destination like YouTube, Twitch, or any
                  custom RTMP server. Paste your stream URL and key to connect.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default LiveStreamPanel;
