"use client";

import { useState, useEffect } from "react";
import { getChapters } from "@/lib/api";

export function useChapters() {
  const [gridsByChapter, setGridsByChapter] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getChapters().then((data) => {
      if (cancelled) return;
      setGridsByChapter(Object.fromEntries(
        Object.entries(data.chapters).map(([key, value]) => [key, value.total_grids]),
      ));
      setLoading(false);
    }).catch((err) => {
      if (!cancelled) {
        console.error("useChapters error:", err);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  return { gridsByChapter, loading };
}
