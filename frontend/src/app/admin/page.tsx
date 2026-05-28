"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Pencil, FileText, Users, Clock, TrendingUp, BookOpen, Loader2, Eye, AlertTriangle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, } from "recharts";
import DataTable, { Column } from "@/components/DataTable";
import { CHAPTER_LABELS } from "@/lib/constants";
import { getStoredUser } from "@/lib/auth";
import { getUsers, getAdminStats, getChapters, getUserStats, deleteUser, promoteUser } from "@/lib/api";
import UserProfileModal from "@/components/admin/UserProfileModal";
import UserEditModal from "@/components/admin/UserEditModal";
import ConfirmActionModal from "@/components/admin/ConfirmActionModal";

interface UserData {
  name: string;
  simulari: number;
  grile: number;
  media: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [users, setUsers] = useState<UserData[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);

  useEffect(() => {
    const user = getStoredUser();
    if (!user || user.role !== "admin") {
      router.replace("/");
    }
  }, [router]);
  const [mounted, setMounted] = useState(false);
  const [chapterData, setChapterData] = useState<{ capitol: string; grile: number }[]>([]);
  const [totalGrile, setTotalGrile] = useState(0);
  const [stats, setStats] = useState<{
    total_users: number;
    total_simulations: number;
    total_grids_solved: number;
    total_grids_generated: number;
    total_study_hours: number;
    avg_score: number;
    avg_elapsed_min: number;
    activity_chart: { zi: string; simulari: number; studenti: number }[];
    easiest_chapter: string | null;
    easiest_correct_count: number;
    hardest_chapter: string | null;
    hardest_wrong_count: number;
  }>({
    total_users: 0,
    total_simulations: 0,
    total_grids_solved: 0,
    total_grids_generated: 0,
    total_study_hours: 0,
    avg_score: 0,
    avg_elapsed_min: 0,
    activity_chart: [],
    easiest_chapter: null as string | null,
    easiest_correct_count: 0,
    hardest_chapter: null as string | null,
    hardest_wrong_count: 0,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await getUsers();
        setUsers(data.users);
      } catch (err) {
        console.error(err);
      } finally {
        setUsersLoading(false);
      }
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getAdminStats();
        setStats(data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchStats();
  }, []);

  useEffect(() => {
    const fetchChapters = async () => {
      try {
        const data = await getChapters();
        const barData: { capitol: string; grile: number }[] = [];
        let sum = 0;
        Object.entries(data.chapters).forEach(([key, val]: [string, any]) => {
          barData.push({ capitol: CHAPTER_LABELS[key] || key, grile: val.total_grids });
          sum += val.total_grids;
        });
        barData.sort((a, b) => b.grile - a.grile);
        setChapterData(barData);
        setTotalGrile(sum);
      } catch (err) {
        console.error(err);
      }
    };
    fetchChapters();
  }, []);

  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    type: "promote" | "deleteUser";
    target: string;
  } | null>(null);

  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [profileTimeframe, setProfileTimeframe] = useState<number | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    if (!selectedUser) return;
    const fetchProfile = async () => {
      setProfileLoading(true);
      try {
        const data = await getUserStats(selectedUser, profileTimeframe ?? undefined);
        setUserProfile(data);
      } catch (err) {
        console.error(err);
      } finally {
        setProfileLoading(false);
      }
    };
    fetchProfile();
  }, [selectedUser, profileTimeframe]);

  const handleDeleteUser = async (name: string) => {
    try {
      await deleteUser(name);
      setUsers((prev) => prev.filter((u) => u.name !== name));
      setConfirmAction(null);
      setEditingUser(null);
    } catch (err) {
      console.error(err);
      alert("Eroare de rețea la ștergerea utilizatorului.");
    }
  };

  const handlePromoteUser = async (name: string) => {
    try {
      await promoteUser(name);
      alert(`${name} a fost promovat la rol de Administrator!`);
      setConfirmAction(null);
      setEditingUser(null);
    } catch (err) {
      console.error(err);
      alert("Eroare de rețea la promovare.");
    }
  };

  return (
    <div className="flex-1 w-full bg-slate-50 dark:bg-slate-950 min-h-full transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 gap-8">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-gray-100 dark:border-slate-800 p-8">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white text-center mb-6">
              Gestionează utilizatorii
            </h2>
            {usersLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              </div>
            ) : users.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-12">
                Niciun utilizator încă. Datele vor apărea după prima simulare finalizată.
              </p>
            ) : (
              <DataTable
                data={users}
                columns={
                  [
                    { key: "name", title: "Nume", sortable: true },
                    { key: "simulari", title: "Simulări", sortable: true },
                    { key: "grile", title: "Grile", sortable: true },
                    { key: "media", title: "Media", sortable: true },
                  ] as Column<UserData>[]
                }
                pageSize={4}
                renderActions={(row: UserData) => (
                  <div className="flex justify-end gap-1.5">
                    <button
                      onClick={() => { setSelectedUser(row.name); setProfileTimeframe(null); }}
                      className="bg-[#0066ff] hover:bg-blue-700 transition-colors w-7 h-7 rounded-lg flex items-center justify-center text-white shadow-sm"
                      title="Statistici"
                    >
                      <Eye className="w-3.5 h-3.5" strokeWidth={2.5} />
                    </button>
                    <button
                      onClick={() => setEditingUser(row)}
                      className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 shadow-sm"
                      title="Editare"
                    >
                      <Pencil className="w-3.5 h-3.5" strokeWidth={2.5} />
                    </button>
                  </div>
                )}
              />
            )}
          </div>
        </div>
        <div className="mt-10">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
            Statistici Platformă
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 flex items-center gap-4">
              <div className="w-11 h-11 bg-blue-50 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold truncate uppercase tracking-wider">
                  Total utilizatori
                </p>
                <p className="text-2xl font-extrabold text-slate-900 dark:text-white truncate">{stats.total_users}</p>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 flex items-center gap-4">
              <div className="w-11 h-11 bg-green-50 dark:bg-green-900/50 text-green-600 dark:text-green-400 rounded-xl flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold truncate uppercase tracking-wider">
                  Total simulări
                </p>
                <p className="text-2xl font-extrabold text-slate-900 dark:text-white truncate">{stats.total_simulations}</p>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 flex items-center gap-4">
              <div className="w-11 h-11 bg-purple-50 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 rounded-xl flex items-center justify-center shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold truncate uppercase tracking-wider">
                  Total grile
                </p>
                <p className="text-2xl font-extrabold text-slate-900 dark:text-white truncate">{totalGrile.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-10">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 flex items-center gap-4">
              <div className="w-11 h-11 bg-indigo-50 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold truncate uppercase tracking-wider">
                  Timp mediu / simulare
                </p>
                <p className="text-xl font-extrabold text-slate-900 dark:text-white truncate">
                  {stats.avg_elapsed_min}<span className="text-sm font-bold text-slate-400 ml-1">min</span>
                </p>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 flex items-center gap-4">
              <div className="w-11 h-11 bg-amber-50 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold truncate uppercase tracking-wider">
                  Timp / Grilă
                </p>
                <p className="text-xl font-extrabold text-slate-900 dark:text-white truncate">
                  {stats.total_grids_generated > 0 && stats.total_simulations > 0
                    ? Math.round((stats.avg_elapsed_min * 60) / (stats.total_grids_generated / stats.total_simulations))
                    : 0}<span className="text-sm font-bold text-slate-400 ml-1">sec</span>
                </p>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 flex items-center gap-4">
              <div className="w-11 h-11 bg-emerald-50 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold truncate uppercase tracking-wider">
                  Cel mai ușor
                </p>
                <p className="text-lg font-extrabold text-slate-900 dark:text-white capitalize truncate" title={stats.easiest_chapter || "-"}>
                  {stats.easiest_chapter || "-"}
                </p>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 flex items-center gap-4">
              <div className="w-11 h-11 bg-rose-50 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 rounded-xl flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold truncate uppercase tracking-wider">
                  Cel mai greu
                </p>
                <p className="text-lg font-extrabold text-slate-900 dark:text-white capitalize truncate" title={stats.hardest_chapter || "-"}>
                  {stats.hardest_chapter || "-"}
                </p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                Activitate săptămânală
              </h3>
              <div style={{ width: "100%", height: 288 }}>
                {mounted && (
                  <ResponsiveContainer width="100%" height={288}>
                    <LineChart
                      data={stats.activity_chart}
                      margin={{ top: 5, right: 20, left: -20, bottom: 5 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#334155"
                      />
                      <XAxis
                        dataKey="zi"
                        tick={{ fontSize: 12, fill: "#94a3b8" }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 12, fill: "#94a3b8" }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "12px",
                          border: "none",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                          backgroundColor: "var(--background)",
                          color: "var(--foreground)",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="simulari"
                        name="Simulări"
                        stroke="#0066ff"
                        strokeWidth={3}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="studenti"
                        name="Studenți"
                        stroke="#10b981"
                        strokeWidth={3}
                        dot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                Grile disponibile per capitol
              </h3>
              <div style={{ width: "100%", height: 288 }}>
                {mounted && chapterData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chapterData}
                      margin={{ top: 5, right: 20, left: -20, bottom: 5 }}
                      layout="vertical"
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        horizontal={false}
                        stroke="#334155"
                      />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 11, fill: "#94a3b8" }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        dataKey="capitol"
                        type="category"
                        tick={{ fontSize: 11, fill: "#94a3b8" }}
                        tickLine={false}
                        axisLine={false}
                        width={100}
                      />
                      <Tooltip
                        cursor={{ fill: "rgba(255, 255, 255, 0.05)" }}
                        contentStyle={{
                          borderRadius: "12px",
                          border: "none",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                          backgroundColor: "var(--background)",
                          color: "var(--foreground)",
                        }}
                      />
                      <Bar
                        dataKey="grile"
                        name="Grile disponibile"
                        fill="#0066ff"
                        radius={[0, 8, 8, 0]}
                        barSize={20}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      {selectedUser && (
        <UserProfileModal
          selectedUser={selectedUser}
          onClose={() => { setSelectedUser(null); setUserProfile(null); }}
          profileTimeframe={profileTimeframe}
          setProfileTimeframe={setProfileTimeframe}
          profileLoading={profileLoading}
          userProfile={userProfile}
        />
      )}
      {editingUser && !confirmAction && (
        <UserEditModal
          editingUser={editingUser}
          onClose={() => setEditingUser(null)}
          setConfirmAction={setConfirmAction}
        />
      )}
      {confirmAction && (
        <ConfirmActionModal
          confirmAction={confirmAction}
          onClose={() => setConfirmAction(null)}
          onPromote={handlePromoteUser}
          onDelete={handleDeleteUser}
        />
      )}
    </div>
  );
}
