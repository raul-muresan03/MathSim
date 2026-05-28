import { X, Loader2, TrendingUp, AlertTriangle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import { CHAPTER_LABELS, TIMEFRAME_OPTIONS } from "@/lib/constants";
import type { UserStatsResponse } from "@/lib/api";

interface UserProfileModalProps {
  selectedUser: string;
  onClose: () => void;
  profileTimeframe: number | null;
  setProfileTimeframe: (val: number | null) => void;
  profileLoading: boolean;
  userProfile: UserStatsResponse | null;
}

export default function UserProfileModal({
  selectedUser,
  onClose,
  profileTimeframe,
  setProfileTimeframe,
  profileLoading,
  userProfile,
}: UserProfileModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black/40 dark:bg-black/60 z-50 flex items-center justify-center px-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-[1.5rem] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-transparent dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-blue-50/50 dark:bg-blue-950/50 px-6 py-5 border-b border-blue-100/50 dark:border-blue-800/50 flex items-center justify-between sticky top-0 z-10">
          <div>
            <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-0.5">
              Profil Student
            </p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">
              {selectedUser}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex gap-2 flex-wrap">
            {TIMEFRAME_OPTIONS.map((opt) => (
              <button
                key={opt.label}
                onClick={() => setProfileTimeframe(opt.value)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                  profileTimeframe === opt.value
                    ? "bg-[#0066ff] text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {profileLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          </div>
        ) : userProfile ? (
          <div className="px-6 py-5 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl text-center">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Simulări</p>
                <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{userProfile.total_simulations}</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl text-center">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Media</p>
                <p className="text-2xl font-extrabold text-slate-900 dark:text-white">
                  {userProfile.avg_score}<span className="text-sm text-slate-400">/10</span>
                </p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl text-center">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Grile totale</p>
                <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{userProfile.total_grids}</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl text-center">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Corecte</p>
                <p className="text-2xl font-extrabold text-green-600 dark:text-green-400">{userProfile.total_correct}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {userProfile.best_chapter && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 p-4 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <span className="text-xs font-bold text-green-700 dark:text-green-400 uppercase tracking-wider">
                      Cel mai bun capitol
                    </span>
                  </div>
                  <p className="text-lg font-extrabold text-slate-900 dark:text-white">
                    {CHAPTER_LABELS[userProfile.best_chapter.chapter] || userProfile.best_chapter.chapter}
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-400 font-bold">
                    {userProfile.best_chapter.accuracy}% acuratețe ({userProfile.best_chapter.correct}/{userProfile.best_chapter.total})
                  </p>
                </div>
              )}
              {userProfile.worst_chapter && userProfile.chapter_breakdown.length > 1 && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 p-4 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                    <span className="text-xs font-bold text-red-700 dark:text-red-400 uppercase tracking-wider">
                      Cel mai slab capitol
                    </span>
                  </div>
                  <p className="text-lg font-extrabold text-slate-900 dark:text-white">
                    {CHAPTER_LABELS[userProfile.worst_chapter.chapter] || userProfile.worst_chapter.chapter}
                  </p>
                  <p className="text-sm text-red-600 dark:text-red-400 font-bold">
                    {userProfile.worst_chapter.accuracy}% acuratețe ({userProfile.worst_chapter.correct}/{userProfile.worst_chapter.total})
                  </p>
                </div>
              )}
            </div>

            {userProfile.trend && userProfile.trend.length > 1 && (
              <div className="bg-slate-50 dark:bg-slate-800 p-5 rounded-xl">
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4">Evoluția notelor</h4>
                <div style={{ width: "100%", height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={userProfile.trend} margin={{ top: 5, right: 15, left: -25, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                      <XAxis dataKey="sim" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                      <YAxis domain={[0, 10]} tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                      <RechartsTooltip
                        contentStyle={{
                          borderRadius: "12px",
                          border: "none",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                          backgroundColor: "var(--background)",
                          color: "var(--foreground)"
                        }}
                        formatter={(value) => [`${value}/10`, "Notă"]}
                        labelFormatter={(label) => {
                          const item = userProfile.trend.find((t) => t.sim === label);
                          return item ? `${label} (${item.date})` : label;
                        }}
                      />
                      <Line type="monotone" dataKey="score" stroke="#0066ff" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {userProfile.chapter_breakdown && userProfile.chapter_breakdown.length > 0 && (
              <div className="bg-slate-50 dark:bg-slate-800 p-5 rounded-xl">
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Acuratețe per capitol</h4>
                <div className="space-y-3">
                  {userProfile.chapter_breakdown.map((ch) => (
                    <div key={ch.chapter}>
                      <div className="flex justify-between text-xs font-bold mb-1">
                        <span className="text-slate-600 dark:text-slate-400">
                          {CHAPTER_LABELS[ch.chapter] || ch.chapter}
                        </span>
                        <span className="text-slate-900 dark:text-white">
                          {ch.accuracy}% ({ch.correct}/{ch.total})
                        </span>
                      </div>
                      <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            ch.accuracy >= 70 ? "bg-green-500" : ch.accuracy >= 40 ? "bg-yellow-500" : "bg-red-500"
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
          <div className="flex items-center justify-center py-16">
            <p className="text-sm text-slate-400">Nu s-au găsit date.</p>
          </div>
        )}
      </div>
    </div>
  );
}
