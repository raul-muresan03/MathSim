"use client";

import { useState, useEffect, useCallback } from "react";
import { getChapters } from "@/lib/api";

export function useChapters() {
  const [gridsByChapter, setGridsByChapter] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const fetchChapters = useCallback(async () => {
    try {
      const data = await getChapters();
      const counts: Record<string, number> = {};
      Object.entries(data.chapters).forEach(([key, val]) => {
        counts[key] = val.total_grids;
      });
      setGridsByChapter(counts);
    } catch (err) {
      console.error("useChapters error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChapters();
  }, [fetchChapters]);

  return { gridsByChapter, loading };
}
