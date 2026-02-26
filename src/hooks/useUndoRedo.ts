import { useState, useCallback, useRef } from "react";

interface UndoRedoOptions {
  maxHistory?: number;
}

export function useUndoRedo<T>(initialState: T, options: UndoRedoOptions = {}) {
  const { maxHistory = 50 } = options;
  const [present, setPresent] = useState<T>(initialState);
  const pastRef = useRef<T[]>([]);
  const futureRef = useRef<T[]>([]);

  const set = useCallback(
    (newState: T | ((prev: T) => T)) => {
      setPresent((prev) => {
        const next =
          typeof newState === "function"
            ? (newState as (prev: T) => T)(prev)
            : newState;
        pastRef.current = [...pastRef.current.slice(-(maxHistory - 1)), prev];
        futureRef.current = [];
        return next;
      });
    },
    [maxHistory]
  );

  const undo = useCallback(() => {
    setPresent((prev) => {
      if (pastRef.current.length === 0) return prev;
      const previous = pastRef.current[pastRef.current.length - 1];
      pastRef.current = pastRef.current.slice(0, -1);
      futureRef.current = [prev, ...futureRef.current];
      return previous;
    });
  }, []);

  const redo = useCallback(() => {
    setPresent((prev) => {
      if (futureRef.current.length === 0) return prev;
      const next = futureRef.current[0];
      futureRef.current = futureRef.current.slice(1);
      pastRef.current = [...pastRef.current, prev];
      return next;
    });
  }, []);

  const canUndo = pastRef.current.length > 0;
  const canRedo = futureRef.current.length > 0;

  // Force re-render when undo/redo changes the flags
  // We use present as dependency to recalculate canUndo/canRedo
  return { state: present, set, undo, redo, canUndo, canRedo } as const;
}
