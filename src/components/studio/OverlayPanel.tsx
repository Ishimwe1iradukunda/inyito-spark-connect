import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Coffee, Layers, Megaphone, Timer, Users } from "lucide-react";

export interface OverlayState {
  lowerThird: { enabled: boolean; title: string; subtitle: string };
  ticker: { enabled: boolean; text: string };
  countdown: { enabled: boolean; seconds: number; startedAt: number | null; label: string };
  brb: { enabled: boolean; message: string };
  viewers: { enabled: boolean; count: number };
}

export const DEFAULT_OVERLAYS: OverlayState = {
  lowerThird: { enabled: false, title: "Your Name", subtitle: "Host · inyito Studio" },
  ticker: { enabled: false, text: "Welcome to the stream — drop a hello in chat!" },
  countdown: { enabled: false, seconds: 300, startedAt: null, label: "Starting soon" },
  brb: { enabled: false, message: "Be right back" },
  viewers: { enabled: false, count: 0 },
};

interface OverlayPanelProps {
  overlays: OverlayState;
  onChange: (next: OverlayState) => void;
}

const Row = ({
  icon: Icon,
  label,
  enabled,
  onToggle,
  children,
}: {
  icon: React.ElementType;
  label: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  children?: React.ReactNode;
}) => (
  <div className="rounded-md border border-border bg-muted/20 p-2">
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-1.5 text-[11px] font-semibold">
        <Icon size={11} className="text-primary" />
        {label}
      </span>
      <Switch checked={enabled} onCheckedChange={onToggle} />
    </div>
    {enabled && children && <div className="mt-2 space-y-1.5">{children}</div>}
  </div>
);

const OverlayPanel = ({ overlays, onChange }: OverlayPanelProps) => {
  const patch = <K extends keyof OverlayState>(key: K, value: Partial<OverlayState[K]>) =>
    onChange({ ...overlays, [key]: { ...overlays[key], ...value } });

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Layers size={10} className="text-muted-foreground" />
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Stream Overlays</h4>
      </div>

      <Row icon={Megaphone} label="Lower third" enabled={overlays.lowerThird.enabled} onToggle={(v) => patch("lowerThird", { enabled: v })}>
        <Input className="h-7 text-[11px]" value={overlays.lowerThird.title} onChange={(e) => patch("lowerThird", { title: e.target.value })} placeholder="Name" />
        <Input className="h-7 text-[11px]" value={overlays.lowerThird.subtitle} onChange={(e) => patch("lowerThird", { subtitle: e.target.value })} placeholder="Role / topic" />
      </Row>

      <Row icon={Megaphone} label="Ticker" enabled={overlays.ticker.enabled} onToggle={(v) => patch("ticker", { enabled: v })}>
        <Input className="h-7 text-[11px]" value={overlays.ticker.text} onChange={(e) => patch("ticker", { text: e.target.value })} placeholder="Scrolling message" />
      </Row>

      <Row icon={Timer} label="Countdown" enabled={overlays.countdown.enabled} onToggle={(v) => patch("countdown", { enabled: v, startedAt: v ? Date.now() : null })}>
        <Input className="h-7 text-[11px]" value={overlays.countdown.label} onChange={(e) => patch("countdown", { label: e.target.value })} placeholder="Label" />
        <div className="flex items-center gap-2">
          <Input
            type="number"
            className="h-7 w-24 text-[11px]"
            value={overlays.countdown.seconds}
            onChange={(e) => patch("countdown", { seconds: Number(e.target.value) })}
          />
          <span className="text-[10px] text-muted-foreground">seconds</span>
          <Button size="sm" variant="secondary" className="h-7 text-[10px]" onClick={() => patch("countdown", { startedAt: Date.now() })}>
            Restart
          </Button>
        </div>
      </Row>

      <Row icon={Coffee} label="BRB card" enabled={overlays.brb.enabled} onToggle={(v) => patch("brb", { enabled: v })}>
        <Input className="h-7 text-[11px]" value={overlays.brb.message} onChange={(e) => patch("brb", { message: e.target.value })} placeholder="Message" />
      </Row>

      <Row icon={Users} label="Viewer count" enabled={overlays.viewers.enabled} onToggle={(v) => patch("viewers", { enabled: v })}>
        <Input
          type="number"
          className="h-7 w-28 text-[11px]"
          value={overlays.viewers.count}
          onChange={(e) => patch("viewers", { count: Number(e.target.value) })}
        />
      </Row>
    </div>
  );
};

export default OverlayPanel;
