"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Loader2, AlertTriangle, Clock } from "lucide-react";
import { API_URL, CHAPTER_LABELS } from "@/lib/constants";
import { gradeSimulation } from "@/lib/api";

const CHAPTER_COLORS: Record<string, string> = {
  algebra: "bg-blue-500",
  analiza: "bg-orange-500",
  geometrie: "bg-green-500",
  trigonometrie: "bg-purple-500",
  admitere: "bg-rose-500",
};

interface GridItem {
  chapter: string;
  filename: string;
  grid_ids: string[];
  image_url: string;
}

interface SessionData {
  session_id: string;
  total_grids: number;
  grids: GridItem[];
  timer?: number;
}

const ANSWER_OPTIONS = ["A", "B", "C", "D", "E"];

export default function QuizPlayerPage() {
  const router = useRouter();
  const [session, setSession] = useState<SessionData | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const raw = localStorage.getItem("toolgrile_session");
    if (!raw) {
      router.push("/student");
      return;
    }
    try {
      const data: SessionData = JSON.parse(raw);
      if (!data.session_id || !data.grids?.length) {
        throw new Error("Invalid session");
      }
      setSession(data);
    } catch {
      localStorage.removeItem("toolgrile_session");
      router.push("/student");
    }
  }, [router]);

  useEffect(() => {
    const timer = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (session?.timer && !isSubmitting) {
      const totalSeconds = session.timer * 60;
      if (elapsed >= totalSeconds) {
        handleSubmit(true);
      }
    }
  }, [elapsed, session, isSubmitting]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isSubmitting) return;
      e.preventDefault();
      e.returnValue = "";
    };

    const handleInternalNavigation = (e: MouseEvent) => {
      if (isSubmitting) return;
      
      const target = e.target as HTMLElement;
      const link = target.closest("a");
      
      if (link && link.href && !link.href.includes("/student/quiz")) {
        const confirmExit = window.confirm("Ești sigur că vrei să părăsești simularea? Progresul nesalvat va fi pierdut.");
        if (!confirmExit) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("click", handleInternalNavigation, true);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("click", handleInternalNavigation, true);
    };
  }, [isSubmitting]);

  if (!session) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-200 dark:bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const grid = session.grids[currentIndex];
  const totalImages = session.grids.length;

  const answeredCount = Object.keys(answers).length;
  const totalQuestions = session.grids.reduce((s, g) => s + g.grid_ids.length, 0);

  const allCurrentAnswered = grid.grid_ids.every((id) => answers[id]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const handleAnswer = (gridId: string, answer: string) => {
    setAnswers((prev) => ({ ...prev, [gridId]: answer }));
  };

  const handleSubmit = async (force: boolean = false) => {
    if (!force && answeredCount < totalQuestions) {
      const confirmEnd = window.confirm(
        `Mai ai ${totalQuestions - answeredCount} întrebări fără răspuns. Ești sigur că vrei să finalizezi simularea?`
      );
      if (!confirmEnd) return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const results: any = await gradeSimulation(
        session.session_id,
        Object.entries(answers).map(([grid_id, answer]) => ({ grid_id, answer })),
        elapsed,
      );
      results.elapsed = elapsed;
      localStorage.setItem("toolgrile_results", JSON.stringify(results));
      localStorage.removeItem("toolgrile_session");
      router.push("/student/results");
    } catch (err: any) {
      setError(err.message || "Nu s-a putut contacta serverul.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 w-full bg-gray-200 dark:bg-slate-950 min-h-full transition-colors duration-300">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Simulare
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              {answeredCount} din {totalQuestions} răspunsuri completate
            </p>
          </div>
          {session.timer ? (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border shadow-sm transition-colors ${
              (session.timer * 60 - elapsed) < 300 && (session.timer * 60 - elapsed) > 0
                ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
            }`}>
              <Clock className={`w-4 h-4 ${
                (session.timer * 60 - elapsed) < 300 && (session.timer * 60 - elapsed) > 0
                  ? "text-red-500 dark:text-red-400 animate-pulse"
                  : "text-slate-400"
              }`} />
              <span className={`text-sm font-bold tabular-nums ${
                (session.timer * 60 - elapsed) < 300 && (session.timer * 60 - elapsed) > 0
                  ? "text-red-600 dark:text-red-400"
                  : "text-slate-700 dark:text-slate-300"
              }`}>
                {formatTime(Math.max(0, session.timer * 60 - elapsed))}
              </span>
            </div>
          ) : null}
        </div>

        <div className="w-full bg-slate-300 dark:bg-slate-800 rounded-full h-2 mb-8">
          <div
            className="bg-[#0066ff] h-2 rounded-full transition-all duration-500"
            style={{ width: `${(answeredCount / totalQuestions) * 100}%` }}
          />
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden transition-colors duration-300">

          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <span className="text-sm font-extrabold text-slate-400 dark:text-slate-500">
                {currentIndex + 1} / {totalImages}
              </span>
              <span className={`text-[11px] font-bold text-white px-2.5 py-1 rounded-full ${CHAPTER_COLORS[grid.chapter] || "bg-slate-500"}`}>
                {CHAPTER_LABELS[grid.chapter] || grid.chapter}
              </span>
            </div>
            <div className="text-xs font-bold text-slate-400 dark:text-slate-500">
              {grid.grid_ids.length > 1
                ? `Grilele ${grid.grid_ids.join(", ")}`
                : `Grila ${grid.grid_ids[0]}`}
            </div>
          </div>

          <div className="p-4 sm:p-6 flex justify-center bg-slate-50 dark:bg-slate-950/50">
            <img
              src={`${API_URL}${grid.image_url}`}
              alt={`Grila ${grid.grid_ids.join(", ")}`}
              className="max-w-full h-auto rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm"
              draggable={false}
            />
          </div>

          <div className="px-6 py-5 space-y-4 border-t border-slate-100 dark:border-slate-800">
            {grid.grid_ids.map((gridId) => (
              <div key={gridId} className="flex flex-col sm:flex-row sm:items-center gap-3">
                {grid.grid_ids.length > 1 && (
                  <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400 w-16 shrink-0">
                    Nr. {gridId}
                  </span>
                )}
                <div className="flex gap-2 flex-wrap">
                  {ANSWER_OPTIONS.map((opt) => {
                    const isSelected = answers[gridId] === opt;
                    return (
                      <button
                        key={opt}
                        onClick={() => handleAnswer(gridId, opt)}
                        className={`w-12 h-12 rounded-xl text-sm font-extrabold transition-all duration-200 border-2 ${isSelected
                          ? "bg-[#0066ff] border-[#0066ff] text-white shadow-md scale-105"
                          : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                          }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between mt-8">
          <button
            onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            disabled={currentIndex === 0}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            <ChevronLeft className="w-4 h-4" />
            Înapoi
          </button>

          {currentIndex < totalImages - 1 ? (
            <button
              onClick={() => setCurrentIndex((i) => Math.min(totalImages - 1, i + 1))}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-[#0066ff] hover:bg-blue-700 transition-colors shadow-sm"
            >
              Următoarea
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => handleSubmit(false)}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-8 py-2.5 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSubmitting ? "Se corectează..." : "Finalizează simularea"}
            </button>
          )}
        </div>

        <div className="flex gap-1.5 justify-center mt-8 flex-wrap">
          {session.grids.map((g, i) => {
            const allAnswered = g.grid_ids.every((id) => answers[id]);
            const isCurrent = i === currentIndex;
            return (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`w-8 h-8 rounded-lg text-[11px] font-bold transition-all ${isCurrent
                  ? "bg-[#0066ff] text-white shadow-md scale-110"
                  : allAnswered
                    ? "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                    : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                  }`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>

        {error && (
          <div className="mt-6 flex items-center gap-2 justify-center bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm font-medium px-4 py-3 rounded-xl">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

      </div>
    </div>
  );
}
