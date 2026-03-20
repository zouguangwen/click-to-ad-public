import { useSyncExternalStore, useCallback } from "react";

const KEY = "dev-mode";

const listeners = new Set<() => void>();

function getSnapshot(): boolean {
  return localStorage.getItem(KEY) === "true";
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function notify() {
  listeners.forEach((cb) => cb());
}

export function useDevMode(): [boolean, () => void] {
  const devMode = useSyncExternalStore(subscribe, getSnapshot, () => false);

  const toggle = useCallback(() => {
    const next = !getSnapshot();
    if (next) {
      localStorage.setItem(KEY, "true");
    } else {
      localStorage.removeItem(KEY);
    }
    notify();
  }, []);

  return [devMode, toggle];
}
