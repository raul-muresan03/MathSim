export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const CHAPTER_LABELS: Record<string, string> = {
  algebra: "Algebră",
  analiza: "Analiză Matematică",
  geometrie: "Geometrie",
  trigonometrie: "Trigonometrie",
  admitere: "Admitere",
};

export const TIMEFRAME_OPTIONS = [
  { label: "30 zile", value: 30 },
  { label: "Tot", value: null },
];
