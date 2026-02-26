import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Type } from "lucide-react";

export interface TextOverlay {
  id: string;
  text: string;
  x: number; // 0-100 percent
  y: number; // 0-100 percent
  fontSize: number;
  color: string;
  fontFamily: string;
  bold: boolean;
}

interface TextOverlayEditorProps {
  overlays: TextOverlay[];
  onChange: (overlays: TextOverlay[]) => void;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
}

const COLORS = [
  { label: "White", value: "#FFFFFF" },
  { label: "Black", value: "#000000" },
  { label: "Blue", value: "#3B82F6" },
  { label: "Red", value: "#EF4444" },
  { label: "Green", value: "#22C55E" },
  { label: "Yellow", value: "#EAB308" },
  { label: "Purple", value: "#A855F7" },
];

const FONTS = [
  "Inter",
  "Georgia",
  "Courier New",
  "Arial Black",
  "Comic Sans MS",
  "Impact",
];

const TextOverlayEditor = ({ overlays, onChange, selectedId, onSelect }: TextOverlayEditorProps) => {
  const addOverlay = () => {
    const newOverlay: TextOverlay = {
      id: crypto.randomUUID(),
      text: "Your text here",
      x: 50,
      y: 50,
      fontSize: 32,
      color: "#FFFFFF",
      fontFamily: "Inter",
      bold: true,
    };
    onChange([...overlays, newOverlay]);
    onSelect?.(newOverlay.id);
  };

  const updateOverlay = (id: string, patch: Partial<TextOverlay>) => {
    onChange(overlays.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  };

  const removeOverlay = (id: string) => {
    onChange(overlays.filter((o) => o.id !== id));
    if (selectedId === id) onSelect?.(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-primary">
          <Type size={14} />
          Text Overlays
        </span>
        <Button variant="secondary" size="sm" className="gap-1.5 text-xs" onClick={addOverlay}>
          <Plus size={12} />
          Add Text
        </Button>
      </div>

      {overlays.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-3">
          No text overlays yet. Click "Add Text" to create one.
        </p>
      )}

      {overlays.map((overlay) => (
        <div
          key={overlay.id}
          className={`card-glass rounded-lg p-3 space-y-2.5 cursor-pointer transition-all ${
            selectedId === overlay.id
              ? "ring-2 ring-primary"
              : "hover:ring-1 hover:ring-muted-foreground/30"
          }`}
          onClick={() => onSelect?.(overlay.id)}
        >
          <div className="flex items-center gap-2">
            <Input
              value={overlay.text}
              onChange={(e) => updateOverlay(overlay.id, { text: e.target.value })}
              className="flex-1 text-xs h-8"
              placeholder="Enter text..."
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                removeOverlay(overlay.id);
              }}
            >
              <Trash2 size={14} />
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Font</Label>
              <Select
                value={overlay.fontFamily}
                onValueChange={(v) => updateOverlay(overlay.id, { fontFamily: v })}
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONTS.map((f) => (
                    <SelectItem key={f} value={f} className="text-xs">
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Color</Label>
              <Select
                value={overlay.color}
                onValueChange={(v) => updateOverlay(overlay.id, { color: v })}
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COLORS.map((c) => (
                    <SelectItem key={c.value} value={c.value} className="text-xs">
                      <span className="flex items-center gap-1.5">
                        <span
                          className="inline-block w-3 h-3 rounded-full border border-border"
                          style={{ backgroundColor: c.value }}
                        />
                        {c.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Size ({overlay.fontSize}px)</Label>
              <Slider
                min={12}
                max={96}
                step={1}
                value={[overlay.fontSize]}
                onValueChange={([v]) => updateOverlay(overlay.id, { fontSize: v })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">X Position ({overlay.x}%)</Label>
              <Slider
                min={0}
                max={100}
                step={1}
                value={[overlay.x]}
                onValueChange={([v]) => updateOverlay(overlay.id, { x: v })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Y Position ({overlay.y}%)</Label>
              <Slider
                min={0}
                max={100}
                step={1}
                value={[overlay.y]}
                onValueChange={([v]) => updateOverlay(overlay.id, { y: v })}
              />
            </div>
          </div>

          {selectedId === overlay.id && (
            <p className="text-[10px] text-muted-foreground italic">
              💡 Drag this overlay directly on the video canvas to reposition
            </p>
          )}
        </div>
      ))}
    </div>
  );
};

export default TextOverlayEditor;
