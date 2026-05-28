"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, TrendingUp, Loader2, BookOpen } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import AIChat from "@/components/AIChat";
import { API_URL, CHAPTER_LABELS, TIMEFRAME_OPTIONS } from "@/lib/constants";
import { getStoredUser } from "@/lib/auth";

export default function StudentStatsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<{ username: string; role: string } | null>(null);
  const [profileTimeframe, setProfileTimeframe] = useState<number | null>(30);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    const user = getStoredUser();
    if (!user) {
      router.replace("/");
      return;
    }
    setCurrentUser(user);
  }, [router]);

  useEffect(() => {
    if (!currentUser?.username) return;

    let isMounted = true;
    const fetchProfile = async () => {
      setProfileLoading(true);
      try {
        const query = profileTimeframe !== null ? `?days=${profileTimeframe}` : "";
        const res = await fetch(`${API_URL}/api/users/${currentUser.username}/stats${query}`);
        if (!res.ok) throw new Error("Failed to fetch profile stats");
        const data = await res.json();
        if (isMounted) {
          setUserProfile(data);
        }
      } catch (err) {
        console.error("Error fetching profile stats:", err);
        if (isMounted) setUserProfile(null);
      } finally {
        if (isMounted) setProfileLoading(false);
      }
    };
    fetchProfile();
    return () => { isMounted = false; };
  }, [currentUser, profileTimeframe]);

  if (!currentUser) return null;

  return (
    <div className="flex-1 w-full bg-slate-50 dark:bg-slate-950 min-h-full transition-colors duration-300">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-[#0066ff] dark:text-blue-400 tracking-tight mb-2">
              Statisticile Mele
            </h1>
            <p className="text-lg text-slate-500 dark:text-slate-400">
              Urmărește-ți progresul, mediile și acuratețea pe fiecare capitol.
            </p>
          </div>
          <div className="flex bg-white dark:bg-slate-900 rounded-xl p-1 shadow-sm border border-slate-200 dark:border-slate-800 self-start">
            {TIMEFRAME_OPTIONS.map((opt) => (
              <button
                key={opt.label}
                onClick={() => setProfileTimeframe(opt.value)}
                className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${profileTimeframe === opt.value
                  ? "bg-[#0066ff] text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {profileLoading ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-16 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : userProfile ? (
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-gray-100 dark:border-slate-800 p-6 md:p-10 space-y-8 transition-colors duration-300">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              <div className="bg-slate-50 dark:bg-slate-800 p-5 rounded-2xl text-center border border-slate-100 dark:border-slate-700">
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-1">Simulări</p>
                <p className="text-3xl font-extrabold text-[#0066ff] dark:text-blue-400">{userProfile.total_simulations}</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 p-5 rounded-2xl text-center border border-slate-100 dark:border-slate-700">
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-1">Media</p>
                <p className="text-3xl font-extrabold text-slate-900 dark:text-white">
                  {userProfile.avg_score}<span className="text-lg text-slate-400">/10</span>
                </p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 p-5 rounded-2xl text-center border border-slate-100 dark:border-slate-700">
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-1">Grile rezolvate</p>
                <p className="text-3xl font-extrabold text-slate-900 dark:text-white">{userProfile.total_grids}</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 p-5 rounded-2xl text-center border border-slate-100 dark:border-slate-700">
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-1">Răspunsuri Corecte</p>
                <p className="text-3xl font-extrabold text-green-600 dark:text-green-400">{userProfile.total_correct}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {userProfile.best_chapter && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 p-6 rounded-2xl">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <span className="text-xs font-bold text-green-700 dark:text-green-400 uppercase tracking-wider">Cel mai bun capitol</span>
                  </div>
                  <p className="text-xl font-extrabold text-slate-900 dark:text-white mb-1">
                    {CHAPTER_LABELS[userProfile.best_chapter.chapter] || userProfile.best_chapter.chapter}
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-400 font-bold">
                    {userProfile.best_chapter.accuracy}% acuratețe ({userProfile.best_chapter.correct}/{userProfile.best_chapter.total})
                  </p>
                </div>
              )}
              {userProfile.worst_chapter && userProfile.chapter_breakdown.length > 1 && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 p-6 rounded-2xl">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                    <span className="text-xs font-bold text-red-700 dark:text-red-400 uppercase tracking-wider">Cel mai greu capitol</span>
                  </div>
                  <p className="text-xl font-extrabold text-slate-900 dark:text-white mb-1">
                    {CHAPTER_LABELS[userProfile.worst_chapter.chapter] || userProfile.worst_chapter.chapter}
                  </p>
                  <p className="text-sm text-red-600 dark:text-red-400 font-bold">
                    {userProfile.worst_chapter.accuracy}% acuratețe ({userProfile.worst_chapter.correct}/{userProfile.worst_chapter.total})
                  </p>
                </div>
              )}
            </div>

            {userProfile.trend && userProfile.trend.length > 1 && (
              <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-6">Evoluția notelor</h3>
                <div style={{ width: "100%", height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={userProfile.trend} margin={{ top: 5, right: 15, left: -25, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                      <XAxis dataKey="sim" tick={{ fontSize: 12, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                      <YAxis domain={[0, 10]} tick={{ fontSize: 12, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", backgroundColor: "var(--background)", color: "var(--foreground)" }}
                        formatter={(value: any) => [`${value}/10`, "Notă"]}
                        labelFormatter={(label: any) => {
                          const item = userProfile.trend.find((t: any) => t.sim === label);
                          return item ? `${label} (${item.date})` : label;
                        }}
                      />
                      <Line type="monotone" dataKey="score" stroke="#0066ff" strokeWidth={4} dot={{ r: 5 }} activeDot={{ r: 8 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {userProfile.chapter_breakdown && userProfile.chapter_breakdown.length > 0 && (
              <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-6">Acuratețe per capitol</h3>
                <div className="space-y-5">
                  {userProfile.chapter_breakdown.map((ch: any) => (
                    <div key={ch.chapter}>
                      <div className="flex justify-between text-sm font-bold mb-2">
                        <span className="text-slate-700 dark:text-slate-300">{CHAPTER_LABELS[ch.chapter] || ch.chapter}</span>
                        <span className="text-slate-900 dark:text-white">{ch.accuracy}% <span className="text-slate-500 font-normal ml-1">({ch.correct}/{ch.total})</span></span>
                      </div>
                      <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${ch.accuracy >= 70 ? "bg-green-500" : ch.accuracy >= 40 ? "bg-amber-500" : "bg-red-500"
                            }`}
                          style={{ width: `${ch.accuracy}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-gray-100 dark:border-slate-800 p-16 text-center">
            <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Nu există suficiente date</h3>
            <p className="text-slate-500 dark:text-slate-400">
              Completează câteva simulări pentru a-ți putea vizualiza statisticile.
            </p>
          </div>
        )}
      </div>

      <AIChat username={currentUser?.username} />
    </div>
  );
}
