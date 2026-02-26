import { useRef, useCallback, useState } from "react";
import type { TextOverlay } from "./TextOverlayEditor";

interface CanvasOverlayProps {
  overlays: TextOverlay[];
  selectedOverlayId: string | null;
  currentTime: number;
  trimStart: number;
  trimEnd: number;
  onSelectOverlay: (id: string | null) => void;
  onMoveOverlay: (id: string, x: number, y: number) => void;
}

const CanvasOverlay = ({
  overlays,
  selectedOverlayId,
  currentTime,
  trimStart,
  trimEnd,
  onSelectOverlay,
  onMoveOverlay,
}: CanvasOverlayProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<string | null>(null);

  const isOutsideTrim = currentTime < trimStart || currentTime > trimEnd;

  const getRelativePos = useCallback(
    (e: React.PointerEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return { x: 50, y: 50 };
      const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
      return { x, y };
    },
    []
  );

  const hitTest = useCallback(
    (px: number, py: number): string | null => {
      // Simple hit-test: check if click is within ~5% of any overlay center
      for (let i = overlays.length - 1; i >= 0; i--) {
        const o = overlays[i];
        const dx = Math.abs(px - o.x);
        const dy = Math.abs(py - o.y);
        if (dx < 8 && dy < 5) return o.id;
      }
      return null;
    },
    [overlays]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      const pos = getRelativePos(e);
      const hit = hitTest(pos.x, pos.y);
      if (hit) {
        setDragging(hit);
        onSelectOverlay(hit);
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      } else {
        onSelectOverlay(null);
      }
    },
    [getRelativePos, hitTest, onSelectOverlay]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      const pos = getRelativePos(e);
      onMoveOverlay(dragging, pos.x, pos.y);
    },
    [dragging, getRelativePos, onMoveOverlay]
  );

  const handlePointerUp = useCallback(() => {
    setDragging(null);
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-10"
      style={{ cursor: dragging ? "grabbing" : "default" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Selection boxes for overlays */}
      {overlays.map((o) => (
        <div
          key={o.id}
          className={`absolute pointer-events-none transition-all duration-100 ${
            selectedOverlayId === o.id
              ? "border-2 border-primary rounded bg-primary/10"
              : "border border-transparent hover:border-muted-foreground/30"
          }`}
          style={{
            left: `${o.x - 6}%`,
            top: `${o.y - 3}%`,
            width: "12%",
            height: "6%",
            transform: "translate(0, 0)",
          }}
        />
      ))}

      {/* Outside trim dimming */}
      {isOutsideTrim && (
        <div className="absolute inset-0 bg-background/60 flex items-center justify-center pointer-events-none">
          <span className="text-sm font-semibold text-muted-foreground bg-card/80 px-4 py-2 rounded-lg border border-border backdrop-blur-sm">
            Outside trim range
          </span>
        </div>
      )}
    </div>
  );
};

export default CanvasOverlay;
