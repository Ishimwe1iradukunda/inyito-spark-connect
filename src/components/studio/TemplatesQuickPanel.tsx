import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, Palette, Film, Loader2, Save } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTemplates, useSaveTemplate, type TemplateRow } from "@/hooks/useTemplates";
import { useAuth } from "@/contexts/AuthContext";
import { type VideoFilters, DEFAULT_FILTERS } from "./FiltersPanel";
import { type TransitionConfig, DEFAULT_TRANSITIONS } from "./TransitionsPanel";
import { type TextOverlay } from "./TextOverlayEditor";
import { useState } from "react";
import { toast } from "sonner";

interface TemplatesQuickPanelProps {
  onApplyFilters: (filters: VideoFilters) => void;
  onApplyTransitions: (transitions: TransitionConfig) => void;
  onApplyOverlays: (overlays: TextOverlay[]) => void;
  currentFilters: VideoFilters;
  currentTransitions: TransitionConfig;
  currentOverlays: TextOverlay[];
}

const TemplatesQuickPanel = ({
  onApplyFilters,
  onApplyTransitions,
  onApplyOverlays,
  currentFilters,
  currentTransitions,
  currentOverlays,
}: TemplatesQuickPanelProps) => {
  const { user } = useAuth();
  const { data: templates = [], isLoading } = useTemplates();
  const saveTemplate = useSaveTemplate();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveTitle, setSaveTitle] = useState("");
  const [saveDescription, setSaveDescription] = useState("");
  const [saveCategory, setSaveCategory] = useState("general");
  const [saveType, setSaveType] = useState("filter_preset");

  const filtered = filter === "all" ? templates : templates.filter((t) => t.type === filter);

  const handleSave = async () => {
    if (!saveTitle.trim()) return;
    const config: any = { filters: currentFilters, transitions: currentTransitions };
    if (currentOverlays.length > 0) {
      config.overlays = currentOverlays.map((o) => ({
        text: o.text, x: o.x, y: o.y, fontSize: o.fontSize,
        color: o.color, fontFamily: o.fontFamily, bold: o.bold,
      }));
    }
    try {
      await saveTemplate.mutateAsync({
        title: saveTitle.trim(),
        description: saveDescription.trim() || undefined,
        category: saveCategory,
        type: saveType,
        config,
      });
      toast.success("Template saved!");
      setSaveOpen(false);
      setSaveTitle("");
      setSaveDescription("");
    } catch (err: any) {
      toast.error(err.message || "Failed to save template");
    }
  };

  const applyTemplate = (template: TemplateRow) => {
    setActiveId(template.id);
    const config = template.config;

    if (config.filters) {
      onApplyFilters({ ...DEFAULT_FILTERS, ...config.filters });
    }
    if (config.transitions) {
      onApplyTransitions({ ...DEFAULT_TRANSITIONS, ...config.transitions });
    }
    if (config.overlays && config.overlays.length > 0) {
      const overlays: TextOverlay[] = config.overlays.map((o: any, i: number) => ({
        id: `tpl-${template.id}-${i}`,
        text: o.text || "Text",
        x: o.x ?? 50,
        y: o.y ?? 50,
        fontSize: o.fontSize ?? 32,
        color: o.color ?? "#ffffff",
        fontFamily: o.fontFamily ?? "Inter",
        bold: o.bold ?? false,
      }));
      onApplyOverlays(overlays);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="animate-spin text-muted-foreground" size={20} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
          <Sparkles size={14} />
          Quick Templates
        </div>
        {user && (
          <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary" size="sm" className="gap-1.5 text-xs h-7">
                <Save size={12} />
                Save Current
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Save as Template</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 pt-2">
                <div className="space-y-1">
                  <Label className="text-xs">Title</Label>
                  <Input value={saveTitle} onChange={(e) => setSaveTitle(e.target.value)} placeholder="My Preset" className="h-9" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Description (optional)</Label>
                  <Input value={saveDescription} onChange={(e) => setSaveDescription(e.target.value)} placeholder="A short description..." className="h-9" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Type</Label>
                    <Select value={saveType} onValueChange={setSaveType}>
                      <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="filter_preset">Filter Preset</SelectItem>
                        <SelectItem value="video_template">Video Template</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Category</Label>
                    <Select value={saveCategory} onValueChange={setSaveCategory}>
                      <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["general", "cinematic", "social", "creative", "retro", "minimal"].map((c) => (
                          <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button className="w-full" onClick={handleSave} disabled={!saveTitle.trim() || saveTemplate.isPending}>
                  {saveTemplate.isPending ? <Loader2 size={14} className="animate-spin mr-2" /> : <Save size={14} className="mr-2" />}
                  Save Template
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filter */}
      <div className="flex gap-1.5">
        {[
          { value: "all", label: "All" },
          { value: "filter_preset", label: "Filters", icon: Palette },
          { value: "video_template", label: "Templates", icon: Film },
        ].map(({ value, label }) => (
          <Button
            key={value}
            variant={filter === value ? "default" : "secondary"}
            size="sm"
            className="text-xs h-6 px-2"
            onClick={() => setFilter(value)}
          >
            {label}
          </Button>
        ))}
      </div>

      {/* Template grid */}
      <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
        {filtered.map((t) => (
          <button
            key={t.id}
            className={`text-left p-2 rounded-lg border transition-all text-xs ${
              activeId === t.id
                ? "border-primary bg-primary/10"
                : "border-border bg-secondary/30 hover:border-primary/40"
            }`}
            onClick={() => applyTemplate(t)}
          >
            <div className="flex items-center gap-1.5 mb-0.5">
              {t.type === "video_template" ? (
                <Film size={10} className="text-muted-foreground shrink-0" />
              ) : (
                <Palette size={10} className="text-muted-foreground shrink-0" />
              )}
              <span className="font-medium truncate">{t.title}</span>
            </div>
            <Badge variant="outline" className="text-[8px] px-1 py-0 capitalize">
              {t.category}
            </Badge>
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-[10px] text-muted-foreground text-center py-4">No templates found</p>
      )}
    </div>
  );
};

export default TemplatesQuickPanel;
