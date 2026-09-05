import { useCallback, useEffect, useState } from "react";

export type HotkeyAction =
  | "toggleRecord"
  | "pauseResume"
  | "toggleStream"
  | "muteMic"
  | "transition"
  | "scene1"
  | "scene2"
  | "scene3"
  | "scene4"
  | "scene5";

export const HOTKEY_LABELS: Record<HotkeyAction, string> = {
  toggleRecord: "Start / Stop recording",
  pauseResume: "Pause / Resume",
  toggleStream: "Start / Stop stream",
  muteMic: "Mute / Unmute mic",
  transition: "Transition preview to program",
  scene1: "Switch to scene 1",
  scene2: "Switch to scene 2",
  scene3: "Switch to scene 3",
  scene4: "Switch to scene 4",
  scene5: "Switch to scene 5",
};

export const DEFAULT_HOTKEYS: Record<HotkeyAction, string> = {
  toggleRecord: "Ctrl+Shift+R",
  pauseResume: "Ctrl+Shift+P",
  toggleStream: "Ctrl+Shift+L",
  muteMic: "Ctrl+Shift+M",
  transition: "Ctrl+Shift+T",
  scene1: "Ctrl+1",
  scene2: "Ctrl+2",
  scene3: "Ctrl+3",
  scene4: "Ctrl+4",
  scene5: "Ctrl+5",
};

const STORAGE_KEY = "studio.hotkeys.v1";

export function eventToCombo(e: KeyboardEvent | React.KeyboardEvent): string {
  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push("Ctrl");
  if (e.shiftKey) parts.push("Shift");
  if (e.altKey) parts.push("Alt");
  const key = e.key.length === 1 ? e.key.toUpperCase() : e.key;
  if (!["Control", "Meta", "Shift", "Alt"].includes(key)) parts.push(key);
  return parts.join("+");
}

export function useHotkeys(handlers: Partial<Record<HotkeyAction, () => void>>, enabled = true) {
  const [bindings, setBindings] = useState<Record<HotkeyAction, string>>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? { ...DEFAULT_HOTKEYS, ...JSON.parse(raw) } : DEFAULT_HOTKEYS;
    } catch {
      return DEFAULT_HOTKEYS;
    }
  });

  const setBinding = useCallback((action: HotkeyAction, combo: string) => {
    setBindings((prev) => {
      const next = { ...prev, [action]: combo };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const resetBindings = useCallback(() => {
    setBindings(DEFAULT_HOTKEYS);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      const combo = eventToCombo(e);
      const entry = (Object.entries(bindings) as [HotkeyAction, string][]).find(([, c]) => c === combo);
      if (!entry) return;
      const fn = handlers[entry[0]];
      if (!fn) return;
      e.preventDefault();
      fn();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [bindings, handlers, enabled]);

  return { bindings, setBinding, resetBindings };
}
