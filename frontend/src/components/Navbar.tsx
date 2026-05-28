"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  LogIn,
  User,
  Trash2,
  AlertTriangle,
  FileText,
  BarChart3,
  CheckSquare,
  Sun,
  Moon,
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { useTheme } from "@/components/ThemeProvider";
import { getStoredUser, clearAuth } from "@/lib/auth";
import { getUserStats } from "@/lib/api";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ username: string, role: string } | null>(null);
  const [userStats, setUserStats] = useState<any>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
        setTimeout(() => setIsDeleteConfirmOpen(false), 200);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    const user = getStoredUser();
    if (user) {
      setCurrentUser(user);
    } else {
      setCurrentUser(null);
    }
  }, [pathname]);

  useEffect(() => {
    if (currentUser?.username && pathname !== "/admin") {
      getUserStats(currentUser.username)
        .then(data => setUserStats(data))
        .catch(err => console.error(err));
    }
  }, [currentUser, pathname]);

  const isLoggedIn = !!currentUser;

  return (
    <nav className="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 sticky top-0 z-50 shadow-sm transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link href="/" className="flex-shrink-0 flex items-center gap-2">
              <span className="font-bold text-xl text-blue-600 dark:text-blue-400">ToolGrile</span>
            </Link>
          </div>
          <div className="hidden sm:flex sm:items-center sm:gap-3">
            <button
              onClick={toggleTheme}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Toggle dark mode"
            >
              {theme === "dark" ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>

            {isLoggedIn ? (
              <div className="flex items-center gap-3">
                {pathname === "/" && (
                  <Link
                    href={currentUser?.role === "admin" ? "/admin" : "/student"}
                    className="inline-flex items-center gap-2 px-6 py-2 border border-transparent text-sm font-semibold rounded-full text-white bg-[#0066ff] hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors shadow-sm cursor-pointer"
                  >
                    {currentUser?.role === "admin" ? "Dashboard Admin" : "Generează Simularea"}
                  </Link>
                )}
                <div className="relative" ref={menuRef}>
                  <div
                    className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => {
                      setIsUserMenuOpen(!isUserMenuOpen);
                      setIsDeleteConfirmOpen(false);
                    }}
                  >
                    <span className="font-bold text-slate-900 dark:text-slate-100 text-lg select-none">
                      {currentUser ? currentUser.username : "Utilizator"}
                    </span>
                    <div className="w-10 h-10 bg-blue-400 dark:bg-blue-500 rounded-full flex items-center justify-center text-blue-900 dark:text-white shadow-sm">
                      <User className="w-6 h-6" />
                    </div>
                  </div>
                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-3 w-72 bg-white dark:bg-slate-800 rounded-[1.25rem] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] dark:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] border border-slate-100 dark:border-slate-700 overflow-hidden z-50">
                      {!isDeleteConfirmOpen ? (
                        <div>
                          <div className="bg-blue-50/50 dark:bg-blue-950/50 px-5 py-4 border-b border-blue-100/50 dark:border-blue-800/50">
                            <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-0.5">
                              Autentificat ca
                            </p>
                            <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                              {currentUser?.role === "admin"
                                ? "Administrator"
                                : "Student ToolGrile"}
                            </p>
                          </div>
                          <div className="px-5 py-4 space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 bg-blue-50 dark:bg-blue-900/50 rounded-lg flex items-center justify-center">
                                  <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                </div>
                                <span className="text-[13px] font-bold text-slate-700 dark:text-slate-300">
                                  Simulări generate
                                </span>
                              </div>
                              <span className="font-extrabold text-slate-900 dark:text-slate-100 text-[15px]">
                                {userStats?.total_simulations || 0}
                              </span>
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 bg-green-50 dark:bg-green-900/50 rounded-lg flex items-center justify-center">
                                  <CheckSquare className="w-4 h-4 text-green-600 dark:text-green-400" />
                                </div>
                                <span className="text-[13px] font-bold text-slate-700 dark:text-slate-300">
                                  Grile rezolvate
                                </span>
                              </div>
                              <span className="font-extrabold text-slate-900 dark:text-slate-100 text-[15px]">
                                {userStats?.total_grids || 0}
                              </span>
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 bg-purple-50 dark:bg-purple-900/50 rounded-lg flex items-center justify-center">
                                  <BarChart3 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                </div>
                                <span className="text-[13px] font-bold text-slate-700 dark:text-slate-300">
                                  Media simulărilor
                                </span>
                              </div>
                              <span className="font-extrabold text-purple-600 dark:text-purple-400 text-[15px]">
                                {userStats?.avg_score ? (userStats.avg_score * 10).toFixed(0) : "0"}%
                              </span>
                            </div>
                          </div>
                          <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
                            <Link
                              href="/student/stats"
                              onClick={() => setIsUserMenuOpen(false)}
                              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-[#0066ff] dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-xl transition-colors"
                            >
                              <BarChart3 className="w-4 h-4" />
                              Statisticile Mele
                            </Link>
                          </div>

                          <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
                            <button
                              onClick={() => {
                                clearAuth();
                                window.location.href = "/";
                              }}
                              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-xl transition-colors"
                            >
                              <LogIn className="w-4 h-4 rotate-180" />
                              Deconectare
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="px-5 py-6 text-center">
                          <div className="w-14 h-14 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle
                              className="w-7 h-7"
                              strokeWidth={2.5}
                            />
                          </div>
                          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                            Ești sigur?
                          </h3>
                          <p className="text-[13px] leading-relaxed text-slate-500 dark:text-slate-400 mb-6 px-2 font-medium">
                            Acțiunea este ireversibilă. Toate datele tale și
                            istoricul simulărilor vor fi șterse permanent!
                          </p>
                          <div className="flex gap-3">
                            <button
                              onClick={() => setIsDeleteConfirmOpen(false)}
                              className="flex-1 px-4 py-2.5 text-sm font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl transition-colors"
                            >
                              Anulează
                            </button>
                            <button
                              onClick={() => {
                                alert("Cerere de ștergere trimisă!");
                                setIsUserMenuOpen(false);
                                setIsDeleteConfirmOpen(false);
                              }}
                              className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors shadow-sm"
                            >
                              Confirmă
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-5 py-2 text-sm font-bold rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Autentificare
                </Link>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 px-6 py-2 border border-transparent text-sm font-bold rounded-full text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors shadow-sm cursor-pointer"
                >
                  Înregistrare
                </Link>
              </div>
            )}
          </div>
          <div className="-mr-2 flex items-center sm:hidden gap-2">
            <button
              onClick={toggleTheme}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Toggle dark mode"
            >
              {theme === "dark" ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={() => setIsOpen(!isOpen)}
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            >
              <span className="sr-only">Deschide meniul principal</span>
              {isOpen ? (
                <X className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="block h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>
      <div className={cn("sm:hidden", isOpen ? "block" : "hidden")}>
        <div className="pt-2 pb-3 space-y-1">
          <Link
            href="/login"
            className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-blue-600 dark:text-blue-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:border-gray-300"
            onClick={() => setIsOpen(false)}
          >
            <div className="flex items-center gap-2">
              <LogIn className="h-5 w-5" />
              Autentificare
            </div>
          </Link>
        </div>
      </div>
    </nav>
  );
}
