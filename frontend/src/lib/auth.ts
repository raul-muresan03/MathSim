export interface StoredUser {
  role: string;
  username: string;
  access_token: string;
}

export function getStoredUser(): StoredUser | null {
  try {
    const raw = localStorage.getItem("currentUser");
    if (!raw) return null;
    const user = JSON.parse(raw);
    if (!user.access_token || !user.username || !user.role) return null;
    return user;
  } catch {
    return null;
  }
}

export function setStoredUser(user: StoredUser): void {
  localStorage.setItem("currentUser", JSON.stringify(user));
}

export function clearAuth(): void {
  localStorage.removeItem("currentUser");
}

export function getAuthHeaders(): Record<string, string> {
  const user = getStoredUser();
  if (!user) return { "Content-Type": "application/json" };
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${user.access_token}`,
  };
}
