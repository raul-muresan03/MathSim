"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

// Keep browser-only values out of the server render and first hydration render.
export function useHydrated() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
