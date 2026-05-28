"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Calculator, Loader2 } from "lucide-react";
import RangeSlider from "@/components/RangeSlider";
import CustomCheckbox from "@/components/CustomCheckbox";
import WeightSelect from "@/components/WeightSelect";
import { generateSimulation } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useChapters } from "@/hooks/useChapters";

const MATH_CHAPTERS = [
  { key: "algebra", label: "Algebră", color: "blue" },
  { key: "analiza", label: "Analiză Matematică", color: "orange" },
  { key: "geometrie", label: "Geometrie", color: "green" },
  { key: "trigonometrie", label: "Trigonometrie", color: "purple" },
  { key: "admitere", label: "Probleme din subiecte de admitere", color: "rose" },
];

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; dot: string; heading: string; badge: string }> = {
  blue: { bg: "bg-blue-50/60 dark:bg-blue-950/30", border: "border-blue-100 dark:border-blue-900", text: "text-blue-600 dark:text-blue-400", dot: "bg-blue-500", heading: "text-blue-700 dark:text-blue-300", badge: "text-blue-400" },
  orange: { bg: "bg-orange-50/60 dark:bg-orange-950/30", border: "border-orange-100 dark:border-orange-900", text: "text-orange-600 dark:text-orange-400", dot: "bg-orange-500", heading: "text-orange-700 dark:text-orange-300", badge: "text-orange-400" },
  green: { bg: "bg-green-50/60 dark:bg-green-950/30", border: "border-green-100 dark:border-green-900", text: "text-green-600 dark:text-green-400", dot: "bg-green-500", heading: "text-green-700 dark:text-green-300", badge: "text-green-400" },
  purple: { bg: "bg-purple-50/60 dark:bg-purple-950/30", border: "border-purple-100 dark:border-purple-900", text: "text-purple-600 dark:text-purple-400", dot: "bg-purple-500", heading: "text-purple-700 dark:text-purple-300", badge: "text-purple-400" },
  rose: { bg: "bg-rose-50/60 dark:bg-rose-950/30", border: "border-rose-100 dark:border-rose-900", text: "text-rose-600 dark:text-rose-400", dot: "bg-rose-500", heading: "text-rose-700 dark:text-rose-300", badge: "text-rose-400" },
};

export default function StudentDashboard() {
  const router = useRouter();
  const user = useAuth();
  const { gridsByChapter, loading: chaptersLoading } = useChapters();
  const [numQuizzes, setNumQuizzes] = useState(30);
  const [isLoading, setIsLoading] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chapterCounts, setChapterCounts] = useState<Record<string, number>>({});
  const [timerOption, setTimerOption] = useState<number>(0);
  const [customTimer, setCustomTimer] = useState<string>("60");

  const [selectedChapters, setSelectedChapters] = useState<Record<string, boolean>>(
    MATH_CHAPTERS.reduce((acc, ch) => ({ ...acc, [ch.key]: false }), {}),
  );

  const [chapterWeights, setChapterWeights] = useState<Record<string, string>>(
    MATH_CHAPTERS.reduce((acc, ch) => ({ ...acc, [ch.key]: "1.0" }), {}),
  );

  useEffect(() => {
    if (!chaptersLoading) {
      setChapterCounts(gridsByChapter);
      setIsPageLoading(false);
    }
  }, [gridsByChapter, chaptersLoading]);

  const estimations = useMemo(() => {
    const results: { key: string; label: string; color: string; count: number }[] = [];

    const selected = MATH_CHAPTERS.filter((ch) => selectedChapters[ch.key]);
    if (selected.length === 0) return results;

    const totalWeight = selected.reduce(
      (s, ch) => s + parseFloat(chapterWeights[ch.key] || "1"),
      0,
    );

    if (totalWeight > 0) {
      selected.forEach((ch) => {
        const w = parseFloat(chapterWeights[ch.key] || "1");
        results.push({
          key: ch.key,
          label: ch.label,
          color: ch.color,
          count: Math.round((w / totalWeight) * numQuizzes),
        });
      });
    }

    return results;
  }, [selectedChapters, chapterWeights, numQuizzes]);

  const totalEstimated = estimations.reduce((s, e) => s + e.count, 0);

  const hasSelection = MATH_CHAPTERS.some((ch) => selectedChapters[ch.key]);

  if (isPageLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-200 dark:bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const handleGenerate = async () => {
    if (!hasSelection) {
      setError("Selectează cel puțin un capitol.");
      return;
    }

    setIsLoading(true);
    setError(null);

    const chaptersPayload: Record<string, { weight: number }> = {};
    MATH_CHAPTERS.forEach((ch) => {
      if (selectedChapters[ch.key]) {
        chaptersPayload[ch.key] = {
          weight: parseFloat(chapterWeights[ch.key] || "1.0"),
        };
      }
    });

    try {
      const data = await generateSimulation({
        total_quizzes: numQuizzes,
        chapters: chaptersPayload,
      });

      const actualTimer = timerOption === -1 ? parseInt(customTimer) || 0 : timerOption;
      const sessionData = { ...data, timer: actualTimer > 0 ? actualTimer : undefined };
      localStorage.setItem("mathsim_session", JSON.stringify(sessionData));
      router.push(`/student/quiz`);
    } catch (err) {
      const message = err instanceof Error ? err.message : undefined;
      setError(message || "Nu s-a putut contacta serverul.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 w-full bg-gray-200 dark:bg-slate-950 min-h-full transition-colors duration-300">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-[34px] font-extrabold text-[#0066ff] dark:text-blue-400 tracking-tight mb-1">
            Configurează simularea
          </h1>
          <p className="text-[17px] text-gray-500 dark:text-slate-400">
            Alege capitolele și ponderile pentru a genera un test unic de matematică.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-6 sm:p-8 mb-8 transition-colors duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">
                Selectează capitolele și ponderile
              </h2>
              <div className="space-y-4">
                {MATH_CHAPTERS.map((ch) => (
                  <CustomCheckbox
                    key={ch.key}
                    label={
                      <span>
                        {ch.label}{" "}
                        <span className="text-[10px] text-slate-400 font-normal">
                          ({chapterCounts[ch.key] || 0} disponibile)
                        </span>
                      </span>
                    }
                    checked={selectedChapters[ch.key] || false}
                    onChange={(val) =>
                      setSelectedChapters({ ...selectedChapters, [ch.key]: val })
                    }
                    renderWeights={
                      selectedChapters[ch.key] && (
                        <WeightSelect
                          label="Pondere"
                          value={chapterWeights[ch.key]}
                          onChange={(val) =>
                            setChapterWeights({ ...chapterWeights, [ch.key]: val })
                          }
                        />
                      )
                    }
                  />
                ))}
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800 p-5 rounded-xl border border-slate-100 dark:border-slate-700">
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-4 text-center lg:text-left">
                Număr Total Grile
              </h3>
              <div className="space-y-4">
                <RangeSlider
                  label="Matematică"
                  min={5}
                  max={100}
                  step={5}
                  value={numQuizzes}
                  onChange={(val) => setNumQuizzes(val)}
                  unit="grile"
                />
              </div>

              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-4 mt-8 text-center lg:text-left">
                Timp limită
              </h3>
              <div className="flex flex-col gap-3">
                <select
                  value={timerOption}
                  onChange={(e) => setTimerOption(Number(e.target.value))}
                  className="w-full px-4 py-2.5 border rounded-xl text-slate-900 dark:text-white bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sm font-bold shadow-sm focus:ring-2 focus:ring-blue-500/50 outline-none transition-all cursor-pointer"
                >
                  <option value={0}>Fără limită</option>
                  <option value={30}>30 minute</option>
                  <option value={60}>60 minute</option>
                  <option value={90}>90 minute</option>
                  <option value={120}>120 minute</option>
                  <option value={180}>180 minute (Standard Admitere)</option>
                  <option value={-1}>Personalizat...</option>
                </select>

                {timerOption === -1 && (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      value={customTimer}
                      onChange={(e) => setCustomTimer(e.target.value)}
                      className="flex-1 px-4 py-2.5 border rounded-xl text-slate-900 dark:text-white bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/50"
                      placeholder="Ex: 45"
                    />
                    <span className="text-sm font-bold text-slate-500 dark:text-slate-400">minute</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {estimations.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-6 sm:p-8 mb-12 transition-colors duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 bg-blue-50 dark:bg-blue-900/50 rounded-xl flex items-center justify-center">
                <Calculator className="w-5 h-5 text-[#0066ff] dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Estimare distribuție grile
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Total estimat:{" "}
                  <span className="font-extrabold text-[#0066ff] dark:text-blue-400">
                    {totalEstimated} grile
                  </span>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {estimations.map((est) => {
                const c = COLOR_MAP[est.color];
                return (
                  <div
                    key={est.key}
                    className={`flex items-center justify-between rounded-xl px-4 py-3 border ${c.bg} ${c.border}`}
                  >
                    <p className="text-[13px] font-bold text-slate-800 dark:text-slate-200 truncate mr-3">
                      {est.label}
                    </p>
                    <span className={`text-lg font-extrabold shrink-0 ${c.text}`}>
                      ~{est.count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {error && (
          <div className="max-w-md mx-auto mb-6 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm font-medium px-4 py-3 rounded-xl text-center">
            {error}
          </div>
        )}

        <div className="flex justify-center pb-10">
          <button
            onClick={handleGenerate}
            disabled={isLoading || !hasSelection}
            className="bg-[#0066ff] hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold text-[16px] px-12 py-3.5 rounded-full shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 disabled:hover:translate-y-0 disabled:hover:shadow-lg flex items-center gap-2"
          >
            {isLoading && <Loader2 className="w-5 h-5 animate-spin" />}
            {isLoading ? "Se generează..." : "Generează simularea"}
          </button>
        </div>
      </div>
    </div>
  );
}
