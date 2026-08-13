"use client";

import { useSyncExternalStore } from "react";

const KEY = "actingAsEmployeeId";

function subscribe(): () => void {
  return () => {};
}

function getSnapshot(): string | null {
  return window.localStorage.getItem(KEY);
}

function getServerSnapshot(): string | null {
  return null;
}

/**
 * The last-picked "acting as" identity, read via useSyncExternalStore so the
 * server snapshot (always null) and the client's first render agree — no
 * hydration mismatch, and no useEffect+setState cascade to get the real
 * value in afterward. Purely a UI convenience: act()/submitClaim() still
 * re-validate the actor's role server-side regardless of what this suggests.
 */
export function useStoredActorId(): string | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function setStoredActorId(id: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, id);
}
