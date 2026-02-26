import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Palette, Film, Loader2 } from "lucide-react";
import { useTemplates, type TemplateRow } from "@/hooks/useTemplates";
import { type VideoFilters, DEFAULT_FILTERS } from "./FiltersPanel";
import { type TransitionConfig, DEFAULT_TRANSITIONS } from "./TransitionsPanel";
import { type TextOverlay } from "./TextOverlayEditor";
import { useState } from "react";

interface TemplatesQuickPanelProps {
  onApplyFilters: (filters: VideoFilters) => void;
  onApplyTransitions: (transitions: TransitionConfig) => void;
  onApplyOverlays: (overlays: TextOverlay[]) => void;
}

const TemplatesQuickPanel = ({
  onApplyFilters,
  onApplyTransitions,
  onApplyOverlays,
}: TemplatesQuickPanelProps) => {
  const { data: templates = [], isLoading } = useTemplates();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const filtered = filter === "all" ? templates : templates.filter((t) => t.type === filter);

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
      <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
        <Sparkles size={14} />
        Quick Templates
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
