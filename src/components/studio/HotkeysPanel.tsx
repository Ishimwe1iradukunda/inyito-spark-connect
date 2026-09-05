import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { HOTKEY_LABELS, eventToCombo, type HotkeyAction } from "@/hooks/useHotkeys";
import { Keyboard, RotateCcw } from "lucide-react";

interface HotkeysPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bindings: Record<HotkeyAction, string>;
  onBindingChange: (action: HotkeyAction, combo: string) => void;
  onReset: () => void;
}

const HotkeysPanel = ({ open, onOpenChange, bindings, onBindingChange, onReset }: HotkeysPanelProps) => {
  const [listening, setListening] = useState<HotkeyAction | null>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard size={16} /> Keyboard shortcuts
          </DialogTitle>
          <DialogDescription>Click a shortcut, then press the keys you want to use.</DialogDescription>
        </DialogHeader>

        <div className="max-h-[55vh] space-y-1 overflow-y-auto pr-1">
          {(Object.keys(HOTKEY_LABELS) as HotkeyAction[]).map((action) => (
            <div key={action} className="flex items-center justify-between rounded-md border border-border bg-muted/20 px-3 py-2">
              <span className="text-xs">{HOTKEY_LABELS[action]}</span>
              <Button
                variant={listening === action ? "default" : "secondary"}
                size="sm"
                className="h-7 min-w-[110px] font-mono text-[10px]"
                onClick={() => setListening(action)}
                onKeyDown={(e) => {
                  if (listening !== action) return;
                  e.preventDefault();
                  if (["Control", "Meta", "Shift", "Alt"].includes(e.key)) return;
                  if (e.key === "Escape") {
                    setListening(null);
                    return;
                  }
                  onBindingChange(action, eventToCombo(e));
                  setListening(null);
                }}
              >
                {listening === action ? "Press keys…" : bindings[action]}
              </Button>
            </div>
          ))}
        </div>

        <div className="flex justify-between pt-2">
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={onReset}>
            <RotateCcw size={12} /> Reset to defaults
          </Button>
          <Button size="sm" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HotkeysPanel;
