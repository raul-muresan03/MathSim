"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useHydrated } from "@/hooks/useHydrated";

type Theme = "light" | "dark";

const ThemeContext = createContext<{
  theme: Theme;
  toggleTheme: () => void;
}>({
  theme: "light",
  toggleTheme: () => { },
});

export function useTheme() {
  return useContext(ThemeContext);
}

export default function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const mounted = useHydrated();
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);
  const theme = selectedTheme ?? (mounted
    ? (localStorage.getItem("theme") as Theme | null)
      ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    : "light");

  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme, mounted]);

  const toggleTheme = () => {
    setSelectedTheme(theme === "dark" ? "light" : "dark");
  };

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
