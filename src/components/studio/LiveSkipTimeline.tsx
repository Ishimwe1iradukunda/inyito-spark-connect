import { type SkipRegion } from "./SkipMarkerButton";

interface Props {
  duration: number;
  skipRegions: SkipRegion[];
  currentTime: number;
}

function formatTime(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const m = String(Math.floor(totalSec / 60)).padStart(2, "0");
  const s = String(totalSec % 60).padStart(2, "0");
  return `${m}:${s}`;
}

export default function LiveSkipTimeline({ duration, skipRegions, currentTime }: Props) {
  if (duration <= 0) return null;

  const totalMs = Math.max(duration, 1000);

  return (
    <div className="w-full max-w-4xl mx-auto mb-4">
      <div className="card-glass rounded-xl p-3">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
            Skip Markers
          </p>
          <p className="text-[10px] text-muted-foreground">
            {skipRegions.length} region{skipRegions.length !== 1 ? "s" : ""} marked
          </p>
        </div>

        {/* Timeline bar */}
        <div className="relative h-8 bg-secondary rounded-lg overflow-hidden">
          {/* Keep regions (green) — the bar itself is the base */}
          
          {/* Skip regions (red) */}
          {skipRegions.map((region, i) => {
            const startPct = (region.startMs / totalMs) * 100;
            const endMs = region.endMs ?? currentTime;
            const widthPct = ((endMs - region.startMs) / totalMs) * 100;
            return (
              <div
                key={i}
                className="absolute top-0 bottom-0 bg-destructive/40 border-x border-destructive/60"
                style={{
                  left: `${startPct}%`,
                  width: `${Math.max(widthPct, 0.5)}%`,
                }}
              >
                <span className="absolute top-0.5 left-0.5 text-[8px] font-mono text-destructive-foreground/80">
                  {formatTime(region.startMs)}
                </span>
              </div>
            );
          })}

          {/* Playhead */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-primary z-10"
            style={{ left: `${(currentTime / totalMs) * 100}%` }}
          />
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-1.5">
          <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
            <div className="w-2.5 h-2.5 rounded-sm bg-secondary border border-border" />
            Keep
          </div>
          <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
            <div className="w-2.5 h-2.5 rounded-sm bg-destructive/40" />
            Skip
          </div>
        </div>
      </div>
    </div>
  );
}
