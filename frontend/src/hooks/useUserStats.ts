"use client";

import { useState, useEffect } from "react";
import type { UserStatsResponse } from "@/lib/api";
import { getUserStats } from "@/lib/api";

export function useUserStats(username?: string, days?: number) {
  const [stats, setStats] = useState<UserStatsResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!username) {
      setStats(null);
      return;
    }

    let cancelled = false;
    const fetchStats = async () => {
      setLoading(true);
      try {
        const data = await getUserStats(username, days);
        if (!cancelled) setStats(data);
      } catch (err) {
        console.error("useUserStats error:", err);
        if (!cancelled) setStats(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchStats();

    return () => { cancelled = true; };
  }, [username, days]);

  return { stats, loading };
}
