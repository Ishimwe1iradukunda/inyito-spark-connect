import { useState, useCallback } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Monitor,
  Camera,
  Image,
  Type,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  GripVertical,
  Layers,
  Copy,
  Pencil,
  Check,
  X,
  MonitorPlay,
  Video,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export type SourceKind = "display" | "camera" | "image" | "text" | "browser";

export interface SceneSource {
  id: string;
  kind: SourceKind;
  label: string;
  visible: boolean;
  locked: boolean;
  volume?: number; // 0-100
  config?: Record<string, any>;
}

export interface Scene {
  id: string;
  name: string;
  sources: SceneSource[];
}

const SOURCE_ICONS: Record<SourceKind, React.ElementType> = {
  display: Monitor,
  camera: Camera,
  image: Image,
  text: Type,
  browser: MonitorPlay,
};

const SOURCE_LABELS: Record<SourceKind, string> = {
  display: "Display Capture",
  camera: "Video Capture",
  image: "Image",
  text: "Text (GDI+)",
  browser: "Browser Source",
};

/* ------------------------------------------------------------------ */
/*  Source Row                                                          */
/* ------------------------------------------------------------------ */

const SourceRow = ({
  source,
  onToggleVisibility,
  onToggleLock,
  onDelete,
}: {
  source: SceneSource;
  onToggleVisibility: () => void;
  onToggleLock: () => void;
  onDelete: () => void;
}) => {
  const Icon = SOURCE_ICONS[source.kind];
  return (
    <Reorder.Item
      value={source}
      className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-xs group transition-colors ${
        source.visible ? "bg-muted/40" : "bg-muted/20 opacity-60"
      }`}
    >
      <GripVertical size={10} className="text-muted-foreground/40 cursor-grab active:cursor-grabbing shrink-0" />
      <Icon size={12} className="text-primary shrink-0" />
      <span className="flex-1 truncate font-medium">{source.label}</span>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onToggleVisibility}>
          {source.visible ? <Eye size={10} /> : <EyeOff size={10} />}
        </Button>
        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onToggleLock}>
          {source.locked ? <Lock size={10} /> : <Unlock size={10} />}
        </Button>
        <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive/60 hover:text-destructive" onClick={onDelete}>
          <Trash2 size={10} />
        </Button>
      </div>
    </Reorder.Item>
  );
};

/* ------------------------------------------------------------------ */
/*  Main Component                                                      */
/* ------------------------------------------------------------------ */

interface SceneManagerProps {
  scenes: Scene[];
  activeSceneId: string;
  onScenesChange: (scenes: Scene[]) => void;
  onActiveSceneChange: (id: string) => void;
}

const SceneManager = ({ scenes, activeSceneId, onScenesChange, onActiveSceneChange }: SceneManagerProps) => {
  const [editingSceneId, setEditingSceneId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [addingSource, setAddingSource] = useState(false);

  const activeScene = scenes.find((s) => s.id === activeSceneId);

  const addScene = useCallback(() => {
    const id = `scene-${Date.now()}`;
    const newScene: Scene = {
      id,
      name: `Scene ${scenes.length + 1}`,
      sources: [],
    };
    onScenesChange([...scenes, newScene]);
    onActiveSceneChange(id);
  }, [scenes, onScenesChange, onActiveSceneChange]);

  const duplicateScene = useCallback(
    (sceneId: string) => {
      const src = scenes.find((s) => s.id === sceneId);
      if (!src) return;
      const id = `scene-${Date.now()}`;
      const dup: Scene = {
        id,
        name: `${src.name} (Copy)`,
        sources: src.sources.map((s) => ({ ...s, id: `src-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` })),
      };
      onScenesChange([...scenes, dup]);
      onActiveSceneChange(id);
    },
    [scenes, onScenesChange, onActiveSceneChange]
  );

  const deleteScene = useCallback(
    (sceneId: string) => {
      if (scenes.length <= 1) return;
      const filtered = scenes.filter((s) => s.id !== sceneId);
      onScenesChange(filtered);
      if (activeSceneId === sceneId) onActiveSceneChange(filtered[0].id);
    },
    [scenes, activeSceneId, onScenesChange, onActiveSceneChange]
  );

  const startRename = (scene: Scene) => {
    setEditingSceneId(scene.id);
    setEditName(scene.name);
  };

  const confirmRename = () => {
    if (!editingSceneId) return;
    onScenesChange(scenes.map((s) => (s.id === editingSceneId ? { ...s, name: editName || s.name } : s)));
    setEditingSceneId(null);
  };

  const addSource = useCallback(
    (kind: SourceKind) => {
      if (!activeScene) return;
      const source: SceneSource = {
        id: `src-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        kind,
        label: SOURCE_LABELS[kind],
        visible: true,
        locked: false,
        volume: kind === "camera" || kind === "display" ? 100 : undefined,
      };
      onScenesChange(
        scenes.map((s) => (s.id === activeSceneId ? { ...s, sources: [...s.sources, source] } : s))
      );
      setAddingSource(false);
    },
    [activeScene, activeSceneId, scenes, onScenesChange]
  );

  const updateSource = useCallback(
    (sourceId: string, patch: Partial<SceneSource>) => {
      onScenesChange(
        scenes.map((s) =>
          s.id === activeSceneId
            ? { ...s, sources: s.sources.map((src) => (src.id === sourceId ? { ...src, ...patch } : src)) }
            : s
        )
      );
    },
    [activeSceneId, scenes, onScenesChange]
  );

  const deleteSource = useCallback(
    (sourceId: string) => {
      onScenesChange(
        scenes.map((s) =>
          s.id === activeSceneId ? { ...s, sources: s.sources.filter((src) => src.id !== sourceId) } : s
        )
      );
    },
    [activeSceneId, scenes, onScenesChange]
  );

  const reorderSources = useCallback(
    (newOrder: SceneSource[]) => {
      onScenesChange(scenes.map((s) => (s.id === activeSceneId ? { ...s, sources: newOrder } : s)));
    },
    [activeSceneId, scenes, onScenesChange]
  );

  return (
    <div className="grid grid-cols-2 gap-3 h-full">
      {/* Scenes List */}
      <div className="flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Layers size={10} /> Scenes
          </h4>
          <div className="flex gap-0.5">
            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={addScene}>
              <Plus size={10} />
            </Button>
          </div>
        </div>
        <div className="flex-1 space-y-1 overflow-y-auto max-h-[160px] pr-1">
          <AnimatePresence>
            {scenes.map((scene) => (
              <motion.div
                key={scene.id}
                layout
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs cursor-pointer transition-all group ${
                  scene.id === activeSceneId
                    ? "bg-primary/15 border border-primary/30 text-foreground font-semibold"
                    : "bg-muted/30 border border-transparent hover:border-border text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => onActiveSceneChange(scene.id)}
              >
                <Video size={10} className={scene.id === activeSceneId ? "text-primary" : "text-muted-foreground"} />
                {editingSceneId === scene.id ? (
                  <div className="flex items-center gap-1 flex-1">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-5 text-[10px] px-1 py-0 border-primary/40"
                      autoFocus
                      onKeyDown={(e) => e.key === "Enter" && confirmRename()}
                    />
                    <Button variant="ghost" size="icon" className="h-4 w-4" onClick={confirmRename}>
                      <Check size={8} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => setEditingSceneId(null)}>
                      <X size={8} />
                    </Button>
                  </div>
                ) : (
                  <>
                    <span className="flex-1 truncate">{scene.name}</span>
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-4 w-4" onClick={(e) => { e.stopPropagation(); startRename(scene); }}>
                        <Pencil size={7} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-4 w-4" onClick={(e) => { e.stopPropagation(); duplicateScene(scene.id); }}>
                        <Copy size={7} />
                      </Button>
                      {scenes.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 text-destructive/60 hover:text-destructive"
                          onClick={(e) => { e.stopPropagation(); deleteScene(scene.id); }}
                        >
                          <Trash2 size={7} />
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Sources List */}
      <div className="flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Monitor size={10} /> Sources
          </h4>
          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setAddingSource(!addingSource)}>
            <Plus size={10} />
          </Button>
        </div>

        {/* Add source dropdown */}
        <AnimatePresence>
          {addingSource && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-2 space-y-1"
            >
              {(Object.keys(SOURCE_ICONS) as SourceKind[]).map((kind) => {
                const Icon = SOURCE_ICONS[kind];
                return (
                  <Button
                    key={kind}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start gap-2 h-7 text-[10px]"
                    onClick={() => addSource(kind)}
                  >
                    <Icon size={10} /> {SOURCE_LABELS[kind]}
                  </Button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sources */}
        <div className="flex-1 overflow-y-auto max-h-[160px] pr-1">
          {activeScene && activeScene.sources.length > 0 ? (
            <Reorder.Group axis="y" values={activeScene.sources} onReorder={reorderSources} className="space-y-1">
              {activeScene.sources.map((src) => (
                <SourceRow
                  key={src.id}
                  source={src}
                  onToggleVisibility={() => updateSource(src.id, { visible: !src.visible })}
                  onToggleLock={() => updateSource(src.id, { locked: !src.locked })}
                  onDelete={() => deleteSource(src.id)}
                />
              ))}
            </Reorder.Group>
          ) : (
            <div className="text-center py-4 text-muted-foreground/50">
              <p className="text-[10px]">No sources</p>
              <p className="text-[9px]">Click + to add</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SceneManager;
