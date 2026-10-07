"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getStoredUser } from "@/lib/auth";
import { useHydrated } from "@/hooks/useHydrated";

export function useAuth(requiredRole?: string) {
  const router = useRouter();
  const mounted = useHydrated();
  const user = mounted ? getStoredUser() : null;
  const hasAccess = !!user && (!requiredRole || user.role === requiredRole);

  useEffect(() => {
    if (mounted && !hasAccess) {
      router.replace("/");
    }
  }, [mounted, hasAccess, router]);

  return hasAccess ? user : null;
}
