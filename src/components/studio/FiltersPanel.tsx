import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Palette, RotateCcw } from "lucide-react";

export interface VideoFilters {
  brightness: number; // 0-200, default 100
  contrast: number;   // 0-200, default 100
  saturation: number; // 0-200, default 100
  blur: number;       // 0-10, default 0
  sepia: number;      // 0-100, default 0
  grayscale: number;  // 0-100, default 0
  hueRotate: number;  // 0-360, default 0
}

export const DEFAULT_FILTERS: VideoFilters = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  blur: 0,
  sepia: 0,
  grayscale: 0,
  hueRotate: 0,
};

export function filtersToCSS(f: VideoFilters): string {
  return [
    `brightness(${f.brightness}%)`,
    `contrast(${f.contrast}%)`,
    `saturate(${f.saturation}%)`,
    `blur(${f.blur}px)`,
    `sepia(${f.sepia}%)`,
    `grayscale(${f.grayscale}%)`,
    `hue-rotate(${f.hueRotate}deg)`,
  ].join(" ");
}

const PRESETS: { label: string; filters: Partial<VideoFilters> }[] = [
  { label: "None", filters: {} },
  { label: "Warm", filters: { sepia: 30, brightness: 110, saturation: 120 } },
  { label: "Cool", filters: { hueRotate: 200, brightness: 105, saturation: 90 } },
  { label: "B&W", filters: { grayscale: 100, contrast: 120 } },
  { label: "Vintage", filters: { sepia: 50, contrast: 85, brightness: 110 } },
  { label: "Vivid", filters: { saturation: 160, contrast: 115, brightness: 105 } },
];

interface FiltersPanelProps {
  filters: VideoFilters;
  onChange: (filters: VideoFilters) => void;
}

const FiltersPanel = ({ filters, onChange }: FiltersPanelProps) => {
  const update = (key: keyof VideoFilters, value: number) =>
    onChange({ ...filters, [key]: value });

  const applyPreset = (preset: Partial<VideoFilters>) =>
    onChange({ ...DEFAULT_FILTERS, ...preset });

  const sliders: { key: keyof VideoFilters; label: string; min: number; max: number; unit: string }[] = [
    { key: "brightness", label: "Brightness", min: 0, max: 200, unit: "%" },
    { key: "contrast", label: "Contrast", min: 0, max: 200, unit: "%" },
    { key: "saturation", label: "Saturation", min: 0, max: 200, unit: "%" },
    { key: "sepia", label: "Sepia", min: 0, max: 100, unit: "%" },
    { key: "grayscale", label: "Grayscale", min: 0, max: 100, unit: "%" },
    { key: "hueRotate", label: "Hue Rotate", min: 0, max: 360, unit: "°" },
    { key: "blur", label: "Blur", min: 0, max: 10, unit: "px" },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-primary">
          <Palette size={14} />
          Filters & Effects
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 text-xs"
          onClick={() => onChange(DEFAULT_FILTERS)}
        >
          <RotateCcw size={12} />
          Reset
        </Button>
      </div>

      {/* Presets */}
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <Button
            key={p.label}
            variant="secondary"
            size="sm"
            className="text-xs h-7 px-2.5"
            onClick={() => applyPreset(p.filters)}
          >
            {p.label}
          </Button>
        ))}
      </div>

      {/* Sliders */}
      <div className="space-y-2.5">
        {sliders.map(({ key, label, min, max, unit }) => (
          <div key={key} className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] text-muted-foreground">{label}</Label>
              <span className="text-[10px] font-mono text-muted-foreground">
                {filters[key]}{unit}
              </span>
            </div>
            <Slider
              min={min}
              max={max}
              step={key === "blur" ? 0.1 : 1}
              value={[filters[key]]}
              onValueChange={([v]) => update(key, v)}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default FiltersPanel;
