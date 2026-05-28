export interface StoredUser {
  role: string;
  username: string;
  access_token: string;
}

const AUTH_COOKIE = "auth_token";
const COOKIE_MAX_AGE = 60 * 60 * 8;

function setCookie(name: string, value: string): void {
  document.cookie = `${name}=${value}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

function removeCookie(name: string): void {
  document.cookie = `${name}=; path=/; max-age=0`;
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
  setCookie(AUTH_COOKIE, user.access_token);
}

export function clearAuth(): void {
  localStorage.removeItem("currentUser");
  removeCookie(AUTH_COOKIE);
}

export function getAuthHeaders(): Record<string, string> {
  const user = getStoredUser();
  if (!user) return { "Content-Type": "application/json" };
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${user.access_token}`,
  };
}
