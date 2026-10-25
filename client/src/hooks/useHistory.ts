import { useState, useCallback, useRef } from "react";

export interface HistoryOptions {
  maxHistory?: number;
}

export interface UseHistoryReturn<T> {
  state: T;
  set: (newVal: T | ((prev: T) => T), options?: { skipHistory?: boolean }) => void;
  undo: () => void;
  redo: () => void;
  reset: (newPresent: T) => void;
  clear: () => void;
  canUndo: boolean;
  canRedo: boolean;
  historyLength: {
    past: number;
    future: number;
  };
}

export function useHistory<T>(initialPresent: T, options?: HistoryOptions): UseHistoryReturn<T> {
  const maxHistory = options?.maxHistory ?? 40;

  const [history, setHistory] = useState<{
    past: T[];
    present: T;
    future: T[];
  }>({
    past: [],
    present: initialPresent,
    future: []
  });

  const presentRef = useRef<T>(history.present);
  presentRef.current = history.present;

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  const set = useCallback(
    (newVal: T | ((prev: T) => T), opts?: { skipHistory?: boolean }) => {
      setHistory(current => {
        const resolved = typeof newVal === "function" ? (newVal as (prev: T) => T)(current.present) : newVal;

        if (opts?.skipHistory) {
          return {
            ...current,
            present: resolved
          };
        }

        if (resolved === current.present) {
          return current;
        }

        const newPast = [...current.past, current.present];
        if (newPast.length > maxHistory) {
          newPast.splice(0, newPast.length - maxHistory);
        }

        return {
          past: newPast,
          present: resolved,
          future: []
        };
      });
    },
    [maxHistory]
  );

  const undo = useCallback(() => {
    setHistory(current => {
      if (current.past.length === 0) return current;
      const previous = current.past[current.past.length - 1];
      const newPast = current.past.slice(0, current.past.length - 1);
      return {
        past: newPast,
        present: previous,
        future: [current.present, ...current.future]
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory(current => {
      if (current.future.length === 0) return current;
      const next = current.future[0];
      const newFuture = current.future.slice(1);
      return {
        past: [...current.past, current.present],
        present: next,
        future: newFuture
      };
    });
  }, []);

  const reset = useCallback((newPresent: T) => {
    setHistory({
      past: [],
      present: newPresent,
      future: []
    });
  }, []);

  const clear = useCallback(() => {
    setHistory(current => ({
      past: [],
      present: current.present,
      future: []
    }));
  }, []);

  return {
    state: history.present,
    set,
    undo,
    redo,
    reset,
    clear,
    canUndo,
    canRedo,
    historyLength: {
      past: history.past.length,
      future: history.future.length
    }
  };
}
