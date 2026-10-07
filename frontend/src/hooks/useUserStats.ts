"use client";

import { useState, useEffect } from "react";
import type { UserStatsResponse } from "@/lib/api";
import { getUserStats } from "@/lib/api";

export function useUserStats(username?: string, days?: number) {
  const [result, setResult] = useState<{
    username: string;
    days?: number;
    stats: UserStatsResponse | null;
  } | null>(null);

  useEffect(() => {
    if (!username) return;

    let cancelled = false;
    getUserStats(username, days).then((stats) => {
      if (!cancelled) setResult({ username, days, stats });
    }).catch((err) => {
      if (!cancelled) {
        console.error("useUserStats error:", err);
        setResult({ username, days, stats: null });
      }
    });

    return () => { cancelled = true; };
  }, [username, days]);

  const ready = result?.username === username && result?.days === days;
  return {
    stats: username && ready ? result?.stats ?? null : null,
    loading: !!username && !ready,
  };
}
