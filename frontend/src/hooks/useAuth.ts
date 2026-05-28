"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getStoredUser } from "@/lib/auth";

export function useAuth(requiredRole?: string) {
  const router = useRouter();
  const [user, setUser] = useState<{ username: string; role: string } | null>(null);

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored || (requiredRole && stored.role !== requiredRole)) {
      router.replace("/");
      return;
    }
    setUser(stored);
  }, [router, requiredRole]);

  return user;
}
