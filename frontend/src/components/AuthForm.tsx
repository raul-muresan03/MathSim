"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { API_URL } from "@/lib/constants";
import { setStoredUser } from "@/lib/auth";

type AuthMode = "login" | "register";

const AUTH_CONFIG: Record<AuthMode, {
  endpoint: string;
  subtitle: string;
  loadingText: string;
  buttonText: string;
  defaultError: string;
  footerText: string;
  footerLinkText: string;
  footerHref: string;
}> = {
  login: {
    endpoint: "/api/login",
    subtitle: "Autentifică-te pentru a continua",
    loadingText: "Se autentifică...",
    buttonText: "Autentificare",
    defaultError: "Username sau parolă incorectă.",
    footerText: "Nu ai cont?",
    footerLinkText: "Creează unul",
    footerHref: "/register",
  },
  register: {
    endpoint: "/api/register",
    subtitle: "Creează un cont pentru a continua",
    loadingText: "Se creează contul...",
    buttonText: "Înregistrare",
    defaultError: "Eroare la crearea contului.",
    footerText: "Ai deja cont?",
    footerLinkText: "Autentifică-te",
    footerHref: "/login",
  },
};

export default function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const config = AUTH_CONFIG[mode];

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ username?: string; password?: string; form?: string }>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    const newErrors: { username?: string; password?: string; form?: string } = {};

    if (!username.trim()) {
      newErrors.username = "Câmpul username este obligatoriu.";
    }
    if (!password.trim()) {
      newErrors.password = "Câmpul de parolă este obligatoriu.";
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}${config.endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        setErrors({ form: errorData.detail || config.defaultError });
        setIsLoading(false);
        return;
      }

      const data = await response.json();
      setStoredUser(data);

      if (data.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/student");
      }
    } catch {
      setErrors({ form: "Eroare de conexiune la server." });
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <div className="max-w-[420px] w-full bg-white dark:bg-slate-900 rounded-2xl shadow-xl dark:shadow-slate-950/50 overflow-hidden border border-slate-100 dark:border-slate-800 flex flex-col p-8 sm:p-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2 tracking-tight">ToolGrile</h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {config.subtitle}
          </p>
        </div>

        <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
          {errors.form && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-bold p-3 rounded-xl border border-red-100 dark:border-red-800/50 text-center">
              {errors.form}
            </div>
          )}

          <div>
            <label className="block text-[13px] font-bold text-slate-700 dark:text-slate-300 mb-1.5" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setErrors((prev) => ({ ...prev, username: undefined, form: undefined }));
              }}
              className={`w-full px-4 py-2.5 border rounded-xl text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800/50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all ${errors.username ? "border-red-400 bg-red-50/50 dark:bg-red-900/20" : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"}`}
              placeholder="ex: student_utcn"
            />
            {errors.username && (
              <p className="text-red-500 dark:text-red-400 text-xs font-bold mt-1.5">
                {errors.username}
              </p>
            )}
          </div>

          <div>
            <label className="block text-[13px] font-bold text-slate-700 dark:text-slate-300 mb-1.5" htmlFor="password">
              Parola
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setErrors((prev) => ({ ...prev, password: undefined, form: undefined }));
              }}
              className={`w-full px-4 py-2.5 border rounded-xl text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800/50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all ${errors.password ? "border-red-400 bg-red-50/50 dark:bg-red-900/20" : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"}`}
              placeholder="••••••••"
            />
            {errors.password && (
              <p className="text-red-500 dark:text-red-400 text-xs font-bold mt-1.5">
                {errors.password}
              </p>
            )}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center bg-[#0066ff] text-white font-bold text-[14px] rounded-xl py-3 px-4 hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? config.loadingText : config.buttonText}
            </button>
          </div>

          <div className="text-center mt-6">
            <p className="text-[13px] text-slate-500 dark:text-slate-400 font-medium">
              {config.footerText}{" "}
              <Link href={config.footerHref} className="text-[#0066ff] dark:text-blue-400 font-bold hover:underline">
                {config.footerLinkText}
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
