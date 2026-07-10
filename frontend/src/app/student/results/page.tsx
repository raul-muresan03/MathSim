"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Trophy, CheckCircle2, XCircle, Clock, Eye, X, RotateCcw, Home, ChevronDown, ChevronUp } from "lucide-react";
import { API_URL } from "@/lib/constants";

interface ResultDetail {
  grid_id: string;
  chapter: string;
  filename: string;
  submitted: string;
  expected: string;
  is_correct: boolean;
}

interface ResultsData {
  score: number;
  correct: number;
  total: number;
  details: ResultDetail[];
  elapsed?: number;
}

export default function ResultsPage() {
  const router = useRouter();
  const [results, setResults] = useState<ResultsData | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem("mathsim_results");
    if (!raw) {
      router.push("/student");
      return;
    }
    try {
      setResults(JSON.parse(raw));
    } catch {
      router.push("/student");
    }
  }, [router]);

  useEffect(() => {
    if (previewImage) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [previewImage]);

  if (!results) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-200 dark:bg-slate-950">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const percentage = results.total > 0 ? Math.round((results.correct / results.total) * 100) : 0;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m} min ${sec} sec`;
  };

  let scoreColor = "text-red-500 dark:text-red-400";
  let scoreBg = "bg-red-50 dark:bg-red-950/30";
  let scoreBorder = "border-red-200 dark:border-red-800";
  let scoreLabel = "Necesită pregătire";

  if (results.score >= 9) {
    scoreColor = "text-emerald-600 dark:text-emerald-400";
    scoreBg = "bg-emerald-50 dark:bg-emerald-950/30";
    scoreBorder = "border-emerald-200 dark:border-emerald-800";
    scoreLabel = "Excelent!";
  } else if (results.score >= 7) {
    scoreColor = "text-blue-600 dark:text-blue-400";
    scoreBg = "bg-blue-50 dark:bg-blue-950/30";
    scoreBorder = "border-blue-200 dark:border-blue-800";
    scoreLabel = "Bine!";
  } else if (results.score >= 5) {
    scoreColor = "text-amber-600 dark:text-amber-400";
    scoreBg = "bg-amber-50 dark:bg-amber-950/30";
    scoreBorder = "border-amber-200 dark:border-amber-800";
    scoreLabel = "Promovat";
  }

  return (
    <div className="flex-1 w-full bg-gray-200 dark:bg-slate-950 min-h-full transition-colors duration-300">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-16">

        <div className={`${scoreBg} border ${scoreBorder} rounded-3xl p-8 sm:p-10 text-center mb-8`}>
          <div className="w-16 h-16 mx-auto mb-4 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center shadow-sm">
            <Trophy className={`w-8 h-8 ${scoreColor}`} />
          </div>
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
            {scoreLabel}
          </p>
          <p className={`text-6xl sm:text-7xl font-black ${scoreColor} tabular-nums mb-2`}>
            {results.score}
          </p>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
            din 10
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 text-center border border-slate-100 dark:border-slate-800 shadow-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto mb-2" />
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{results.correct}</p>
            <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase">Corecte</p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 text-center border border-slate-100 dark:border-slate-800 shadow-sm">
            <XCircle className="w-5 h-5 text-red-500 mx-auto mb-2" />
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{results.total - results.correct}</p>
            <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase">Greșite</p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 text-center border border-slate-100 dark:border-slate-800 shadow-sm">
            <Clock className="w-5 h-5 text-blue-500 mx-auto mb-2" />
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{percentage}%</p>
            <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase">Acuratețe</p>
          </div>
        </div>

        {results.elapsed !== undefined && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 text-center border border-slate-100 dark:border-slate-800 shadow-sm mb-8">
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
              Timp total: <span className="font-extrabold text-slate-900 dark:text-white">{formatTime(results.elapsed)}</span>
            </p>
          </div>
        )}

        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full flex items-center justify-between bg-white dark:bg-slate-900 rounded-2xl px-6 py-4 border border-slate-100 dark:border-slate-800 shadow-sm mb-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
            Detalii pe grile ({results.correct}/{results.total})
          </span>
          {showDetails
            ? <ChevronUp className="w-4 h-4 text-slate-400" />
            : <ChevronDown className="w-4 h-4 text-slate-400" />
          }
        </button>

        {showDetails && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden mb-8">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {results.details.map((d, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between px-5 py-3 ${
                    d.is_correct
                      ? "bg-emerald-50/50 dark:bg-emerald-950/20"
                      : "bg-red-50/50 dark:bg-red-950/20"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {d.is_correct
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      : <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                    }
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      Grila {d.grid_id}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className={`font-bold ${d.is_correct ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                      {d.submitted || "—"}
                    </span>
                    {!d.is_correct && (
                      <>
                        <span className="text-slate-400 dark:text-slate-500 font-medium">
                          → {d.expected}
                        </span>
                        {d.chapter && d.filename && (
                          <button
                            onClick={() => setPreviewImage(`${API_URL}/api/grid/${d.chapter}/${d.filename}`)}
                            className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Vezi grila"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-4 justify-center">
          <button
            onClick={() => {
              localStorage.removeItem("mathsim_results");
              router.push("/student");
            }}
            className="flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold text-white bg-[#0066ff] hover:bg-blue-700 transition-colors shadow-lg"
          >
            <RotateCcw className="w-4 h-4" />
            Simulare nouă
          </button>
          <button
            onClick={() => {
              localStorage.removeItem("mathsim_results");
              router.push("/");
            }}
            className="flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
          >
            <Home className="w-4 h-4" />
            Acasă
          </button>
        </div>

      </div>

      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setPreviewImage(null)}
        >
          <button
            onClick={() => setPreviewImage(null)}
            className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={previewImage}
            alt="Previzualizare grilă"
            className="max-w-full max-h-[90vh] rounded-xl shadow-2xl bg-white"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
