import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Grid3X3, CornerDownRight, Maximize } from "lucide-react";
import type { OverlayState } from "@/components/studio/OverlayPanel";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface LayoutRect {
  x: number; // 0-1 normalized
  y: number;
  w: number;
  h: number;
}

export interface CompositorLayout {
  screen: LayoutRect;
  camera: LayoutRect;
}

export const DEFAULT_LAYOUT: CompositorLayout = {
  screen: { x: 0, y: 0, w: 1, h: 1 },
  camera: { x: 0.72, y: 0.68, w: 0.25, h: 0.28 },
};

export const CORNER_PRESETS: Record<string, { x: number; y: number }> = {
  "Top left": { x: 0.03, y: 0.04 },
  "Top right": { x: 0.72, y: 0.04 },
  "Bottom left": { x: 0.03, y: 0.68 },
  "Bottom right": { x: 0.72, y: 0.68 },
};

interface CompositorProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  screenVideoRef: React.RefObject<HTMLVideoElement>;
  cameraVideoRef: React.RefObject<HTMLVideoElement>;
  hasScreen: boolean;
  hasCamera: boolean;
  layout: CompositorLayout;
  onLayoutChange: (layout: CompositorLayout) => void;
  width: number;
  height: number;
  interactive?: boolean;
  onFps?: (fps: number) => void;
  overlays?: OverlayState;
}

type DragMode = { key: "screen" | "camera"; type: "move" | "resize"; startX: number; startY: number; rect: LayoutRect } | null;

const Compositor = ({
  canvasRef,
  screenVideoRef,
  cameraVideoRef,
  hasScreen,
  hasCamera,
  layout,
  onLayoutChange,
  width,
  height,
  interactive = true,
  onFps,
  overlays,
}: CompositorProps) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [showGuides, setShowGuides] = useState(true);
  const [selected, setSelected] = useState<"screen" | "camera" | null>(null);
  const dragRef = useRef<DragMode>(null);
  const layoutRef = useRef(layout);
  layoutRef.current = layout;
  const overlaysRef = useRef(overlays);
  overlaysRef.current = overlays;

  /* ---------------- Draw loop ---------------- */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let frames = 0;
    let last = performance.now();

    const roundRect = (x: number, y: number, w: number, h: number, r: number) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    };

    const draw = () => {
      const L = layoutRef.current;
      ctx.fillStyle = "#0a0a0f";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const sv = screenVideoRef.current;
      if (sv && sv.readyState >= 2) {
        const r = L.screen;
        ctx.drawImage(sv, r.x * canvas.width, r.y * canvas.height, r.w * canvas.width, r.h * canvas.height);
      }

      const cv = cameraVideoRef.current;
      if (cv && cv.readyState >= 2) {
        const r = L.camera;
        const x = r.x * canvas.width;
        const y = r.y * canvas.height;
        const w = r.w * canvas.width;
        const h = r.h * canvas.height;
        ctx.save();
        roundRect(x, y, w, h, Math.min(24, w * 0.08));
        ctx.clip();
        ctx.drawImage(cv, x, y, w, h);
        ctx.restore();
        ctx.strokeStyle = "hsl(213,94%,54%)";
        ctx.lineWidth = 3;
        roundRect(x, y, w, h, Math.min(24, w * 0.08));
        ctx.stroke();
      }

      /* ---- Stream overlays ---- */
      const O = overlaysRef.current;
      if (O) {
        const W = canvas.width;
        const H = canvas.height;
        const u = H / 720; // scale unit

        if (O.lowerThird.enabled) {
          const x = 60 * u;
          const y = H - 190 * u;
          const w = 520 * u;
          const h = 96 * u;
          ctx.save();
          ctx.fillStyle = "rgba(10,10,18,0.78)";
          roundRect(x, y, w, h, 10 * u);
          ctx.fill();
          ctx.fillStyle = "hsl(213,94%,54%)";
          ctx.fillRect(x, y, 6 * u, h);
          ctx.fillStyle = "#ffffff";
          ctx.font = `bold ${28 * u}px system-ui, sans-serif`;
          ctx.fillText(O.lowerThird.title, x + 24 * u, y + 42 * u);
          ctx.fillStyle = "rgba(255,255,255,0.72)";
          ctx.font = `${18 * u}px system-ui, sans-serif`;
          ctx.fillText(O.lowerThird.subtitle, x + 24 * u, y + 72 * u);
          ctx.restore();
        }

        if (O.viewers.enabled) {
          const label = `${O.viewers.count.toLocaleString()} watching`;
          ctx.save();
          ctx.font = `bold ${18 * u}px system-ui, sans-serif`;
          const tw = ctx.measureText(label).width;
          const w = tw + 56 * u;
          const x = W - w - 40 * u;
          const y = 36 * u;
          ctx.fillStyle = "rgba(10,10,18,0.75)";
          roundRect(x, y, w, 38 * u, 19 * u);
          ctx.fill();
          ctx.fillStyle = "#ef4444";
          ctx.beginPath();
          ctx.arc(x + 22 * u, y + 19 * u, 7 * u, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#ffffff";
          ctx.fillText(label, x + 38 * u, y + 25 * u);
          ctx.restore();
        }

        if (O.ticker.enabled && O.ticker.text) {
          const h = 46 * u;
          const y = H - h;
          ctx.save();
          ctx.fillStyle = "rgba(10,10,18,0.85)";
          ctx.fillRect(0, y, W, h);
          ctx.fillStyle = "hsl(213,94%,54%)";
          ctx.fillRect(0, y, W, 3 * u);
          ctx.font = `${20 * u}px system-ui, sans-serif`;
          ctx.fillStyle = "#ffffff";
          const text = `${O.ticker.text}     •     `;
          const tw = ctx.measureText(text).width;
          const offset = ((performance.now() / 22) % tw);
          for (let i = -1; i * tw < W + tw; i++) {
            ctx.fillText(text, i * tw - offset, y + 30 * u);
          }
          ctx.restore();
        }

        if (O.countdown.enabled && O.countdown.startedAt) {
          const left = Math.max(0, O.countdown.seconds - Math.floor((Date.now() - O.countdown.startedAt) / 1000));
          const mm = String(Math.floor(left / 60)).padStart(2, "0");
          const ss = String(left % 60).padStart(2, "0");
          ctx.save();
          ctx.textAlign = "center";
          ctx.fillStyle = "rgba(255,255,255,0.85)";
          ctx.font = `bold ${24 * u}px system-ui, sans-serif`;
          ctx.fillText(O.countdown.label, W / 2, H / 2 - 50 * u);
          ctx.fillStyle = "#ffffff";
          ctx.font = `bold ${86 * u}px system-ui, sans-serif`;
          ctx.fillText(`${mm}:${ss}`, W / 2, H / 2 + 40 * u);
          ctx.restore();
        }

        if (O.brb.enabled) {
          ctx.save();
          ctx.fillStyle = "rgba(6,6,12,0.92)";
          ctx.fillRect(0, 0, W, H);
          ctx.textAlign = "center";
          ctx.fillStyle = "#ffffff";
          ctx.font = `bold ${64 * u}px system-ui, sans-serif`;
          ctx.fillText(O.brb.message, W / 2, H / 2);
          ctx.fillStyle = "rgba(255,255,255,0.6)";
          ctx.font = `${22 * u}px system-ui, sans-serif`;
          ctx.fillText("Stay tuned — we'll be back shortly", W / 2, H / 2 + 48 * u);
          ctx.restore();
        }
      }

      frames++;
      const now = performance.now();
      if (now - last >= 1000) {
        onFps?.(Math.round((frames * 1000) / (now - last)));
        frames = 0;
        last = now;
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [canvasRef, screenVideoRef, cameraVideoRef, width, height, onFps]);

  /* ---------------- Pointer interaction ---------------- */
  const startDrag = useCallback(
    (key: "screen" | "camera", type: "move" | "resize") => (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setSelected(key);
      dragRef.current = { key, type, startX: e.clientX, startY: e.clientY, rect: { ...layoutRef.current[key] } };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    []
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const drag = dragRef.current;
      const box = wrapRef.current?.getBoundingClientRect();
      if (!drag || !box) return;
      const dx = (e.clientX - drag.startX) / box.width;
      const dy = (e.clientY - drag.startY) / box.height;
      const r = drag.rect;
      const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
      const next: LayoutRect =
        drag.type === "move"
          ? { ...r, x: clamp(r.x + dx, -0.2, 1 - r.w + 0.2), y: clamp(r.y + dy, -0.2, 1 - r.h + 0.2) }
          : { ...r, w: clamp(r.w + dx, 0.08, 1.2), h: clamp(r.h + dy, 0.08, 1.2) };
      onLayoutChange({ ...layoutRef.current, [drag.key]: next });
    },
    [onLayoutChange]
  );

  const endDrag = useCallback(() => {
    dragRef.current = null;
  }, []);

  const snapCamera = (corner: keyof typeof CORNER_PRESETS) => {
    const c = CORNER_PRESETS[corner];
    const cur = layoutRef.current.camera;
    onLayoutChange({ ...layoutRef.current, camera: { ...cur, x: c.x, y: corner.startsWith("Top") ? c.y : 1 - cur.h - 0.04 } });
  };

  const boxStyle = (r: LayoutRect): React.CSSProperties => ({
    left: `${r.x * 100}%`,
    top: `${r.y * 100}%`,
    width: `${r.w * 100}%`,
    height: `${r.h * 100}%`,
  });

  const rows: { key: "screen" | "camera"; label: string; show: boolean }[] = [
    { key: "screen", label: "Display", show: hasScreen },
    { key: "camera", label: "Camera", show: hasCamera },
  ];

  return (
    <div className="w-full h-full flex flex-col">
      <div ref={wrapRef} className="relative flex-1 min-h-0" onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerCancel={endDrag}>
        <canvas ref={canvasRef} className="w-full h-full object-contain bg-black rounded-lg" />

        {/* Safe-area guides */}
        {showGuides && (
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-[5%] border border-primary/25 rounded-sm" />
            <div className="absolute inset-[10%] border border-dashed border-primary/15" />
            <div className="absolute left-1/3 top-0 bottom-0 w-px bg-foreground/10" />
            <div className="absolute left-2/3 top-0 bottom-0 w-px bg-foreground/10" />
            <div className="absolute top-1/3 left-0 right-0 h-px bg-foreground/10" />
            <div className="absolute top-2/3 left-0 right-0 h-px bg-foreground/10" />
          </div>
        )}

        {/* Interactive source boxes */}
        {interactive &&
          rows
            .filter((r) => r.show)
            .map(({ key, label }) => (
              <div
                key={key}
                onPointerDown={startDrag(key, "move")}
                style={boxStyle(layout[key])}
                className={`absolute cursor-move rounded-md transition-colors ${
                  selected === key ? "border-2 border-primary" : "border border-primary/30 hover:border-primary/70"
                }`}
              >
                <span className="absolute -top-5 left-0 text-[9px] font-bold uppercase tracking-wider text-primary bg-background/80 px-1 rounded">
                  {label}
                </span>
                <div
                  onPointerDown={startDrag(key, "resize")}
                  className="absolute -bottom-1.5 -right-1.5 h-3.5 w-3.5 rounded-sm bg-primary cursor-nwse-resize"
                />
              </div>
            ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1.5 pt-2">
        <Button variant={showGuides ? "secondary" : "ghost"} size="sm" className="h-7 gap-1 text-[10px]" onClick={() => setShowGuides((v) => !v)}>
          <Grid3X3 size={10} /> Guides
        </Button>
        {hasCamera && (
          <>
            <span className="text-[10px] text-muted-foreground ml-1">Snap camera:</span>
            {Object.keys(CORNER_PRESETS).map((c) => (
              <Button key={c} variant="ghost" size="sm" className="h-7 text-[10px] px-2" onClick={() => snapCamera(c)}>
                <CornerDownRight size={10} className="mr-1" />
                {c}
              </Button>
            ))}
          </>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 text-[10px] ml-auto"
          onClick={() => onLayoutChange(DEFAULT_LAYOUT)}
        >
          <Maximize size={10} /> Reset layout
        </Button>
      </div>
    </div>
  );
};

export default Compositor;
