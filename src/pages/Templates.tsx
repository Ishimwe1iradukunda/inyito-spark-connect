import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import NavBar from "@/components/NavBar";
import SiteFooter from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Palette, Film, Loader2, ArrowRight } from "lucide-react";
import { useTemplates, useTemplateCategories, type TemplateRow } from "@/hooks/useTemplates";

const CATEGORY_COLORS: Record<string, string> = {
  cinematic: "bg-brand-purple/20 text-brand-purple border-brand-purple/30",
  social: "bg-brand-blue/20 text-brand-blue border-brand-blue/30",
  retro: "bg-brand-orange/20 text-brand-orange border-brand-orange/30",
  creative: "bg-brand-green/20 text-brand-green border-brand-green/30",
  minimal: "bg-muted text-muted-foreground border-border",
  general: "bg-muted text-muted-foreground border-border",
};

const FilterPreview = ({ config }: { config: any }) => {
  const f = config?.filters;
  if (!f) return null;
  return (
    <div
      className="w-full h-full bg-gradient-to-br from-brand-blue/40 via-brand-purple/30 to-brand-gold/20 rounded-lg"
      style={{
        filter: `brightness(${f.brightness}%) contrast(${f.contrast}%) saturate(${f.saturation}%) sepia(${f.sepia}%) grayscale(${f.grayscale}%) hue-rotate(${f.hueRotate}deg) blur(${Math.min(f.blur, 2)}px)`,
      }}
    />
  );
};

const TemplateCard = ({ template, onClick }: { template: TemplateRow; onClick: () => void }) => {
  const isVideo = template.type === "video_template";
  const colorClass = CATEGORY_COLORS[template.category] || CATEGORY_COLORS.general;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ duration: 0.2 }}
      className="group relative rounded-xl border border-border bg-card overflow-hidden cursor-pointer hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all"
      onClick={onClick}
    >
      {/* Preview area */}
      <div className="aspect-video relative overflow-hidden bg-secondary/30">
        <FilterPreview config={template.config} />
        <div className="absolute inset-0 flex items-center justify-center">
          {isVideo ? (
            <Film size={28} className="text-foreground/40 group-hover:text-primary transition-colors" />
          ) : (
            <Palette size={28} className="text-foreground/40 group-hover:text-primary transition-colors" />
          )}
        </div>
        {template.config?.transitions && (template.config.transitions.inType !== "none" || template.config.transitions.outType !== "none") && (
          <div className="absolute top-2 right-2">
            <Sparkles size={14} className="text-brand-gold" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 space-y-1.5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground truncate">{template.title}</h3>
          <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${colorClass}`}>
            {template.category}
          </Badge>
        </div>
        {template.description && (
          <p className="text-[11px] text-muted-foreground line-clamp-2">{template.description}</p>
        )}
        <Button variant="ghost" size="sm" className="w-full gap-1.5 text-xs mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
          Apply in Studio <ArrowRight size={12} />
        </Button>
      </div>
    </motion.div>
  );
};

const Templates = () => {
  const navigate = useNavigate();
  const { data: templates = [], isLoading } = useTemplates();
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const filteredByType = typeFilter === "all" ? templates : templates.filter((t) => t.type === typeFilter);
  const categories = useTemplateCategories(filteredByType);
  const filtered = categoryFilter === "all" ? filteredByType : filteredByType.filter((t) => t.category === categoryFilter);

  const handleApply = (template: TemplateRow) => {
    // Navigate to studio with template ID in state
    navigate("/studio", { state: { templateId: template.id, templateConfig: template.config, templateType: template.type } });
  };

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <h1 className="text-3xl sm:text-4xl font-black text-foreground mb-3">
            Template Library
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Browse filter presets, animated video styles, and effects — apply any template to your recordings with one click.
          </p>
        </motion.div>

        {/* Type tabs */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <Tabs value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setCategoryFilter("all"); }}>
            <TabsList>
              <TabsTrigger value="all" className="gap-1.5 text-xs">
                <Sparkles size={14} /> All
              </TabsTrigger>
              <TabsTrigger value="filter_preset" className="gap-1.5 text-xs">
                <Palette size={14} /> Filter Presets
              </TabsTrigger>
              <TabsTrigger value="video_template" className="gap-1.5 text-xs">
                <Film size={14} /> Video Templates
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Category pills */}
          <div className="flex flex-wrap gap-1.5">
            {categories.map((cat) => (
              <Button
                key={cat}
                variant={categoryFilter === cat ? "default" : "outline"}
                size="sm"
                className="text-xs h-7 px-2.5 capitalize"
                onClick={() => setCategoryFilter(cat)}
              >
                {cat}
              </Button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-muted-foreground" size={32} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            No templates found for this filter.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((t) => (
              <TemplateCard key={t.id} template={t} onClick={() => handleApply(t)} />
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
};

export default Templates;
