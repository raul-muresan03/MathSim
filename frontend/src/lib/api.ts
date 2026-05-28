import { API_URL } from "@/lib/constants";
import { getAuthHeaders } from "@/lib/auth";

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${url}`, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed (${res.status})`);
  }
  return res.json();
}

// Auth

export interface LoginResponse {
  role: string;
  username: string;
  access_token: string;
  token_type: string;
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  return request<LoginResponse>("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
}

export interface RegisterResponse {
  message: string;
  role: string;
  username: string;
  access_token: string;
  token_type: string;
}

export async function register(username: string, password: string): Promise<RegisterResponse> {
  return request<RegisterResponse>("/api/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
}

// Public

export interface ChaptersResponse {
  chapters: Record<string, { total_grids: number }>;
}

export async function getChapters(): Promise<ChaptersResponse> {
  return request<ChaptersResponse>("/api/chapters");
}

export async function generateSimulation(config: {
  total_quizzes: number;
  chapters: Record<string, { weight: number }>;
}): Promise<{
  session_id: string;
  total_grids: number;
  grids: { chapter: string; filename: string; grid_ids: string[]; image_url: string }[];
}> {
  return request("/api/simulation/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
}

// Auth-required

export async function gradeSimulation(sessionId: string, answers: { grid_id: string; answer: string }[], elapsed: number): Promise<{
  score: number;
  correct: number;
  total: number;
  details: { grid_id: string; chapter: string; submitted: string; expected: string; is_correct: boolean }[];
}> {
  return request("/api/simulation/grade", {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ session_id: sessionId, answers, elapsed }),
  });
}

// Admin

export interface UserStatsResponse {
  username: string;
  total_simulations: number;
  avg_score: number;
  total_grids: number;
  total_correct: number;
  best_chapter: { chapter: string; correct: number; total: number; accuracy: number } | null;
  worst_chapter: { chapter: string; correct: number; total: number; accuracy: number } | null;
  trend: { sim: string; score: number; date: string }[];
  chapter_breakdown: { chapter: string; correct: number; total: number; accuracy: number }[];
}

export async function getUserStats(username: string, days?: number): Promise<UserStatsResponse> {
  const query = days !== undefined ? `?days=${days}` : "";
  return request<UserStatsResponse>(`/api/users/${username}/stats${query}`);
}

export interface AdminStatsResponse {
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
}

export async function getAdminStats(): Promise<AdminStatsResponse> {
  return request<AdminStatsResponse>("/api/stats");
}

export interface UserListItem {
  name: string;
  simulari: number;
  grile: number;
  media: string;
}

export async function getUsers(limit: number = 50, offset: number = 0): Promise<{ users: UserListItem[]; total: number }> {
  return request<{ users: UserListItem[]; total: number }>(`/api/users?limit=${limit}&offset=${offset}`);
}

export async function promoteUser(username: string): Promise<{ message: string }> {
  return request(`/api/users/${username}/role`, {
    method: "PUT",
    headers: getAuthHeaders(),
  });
}

export async function deleteUser(username: string): Promise<{ message: string }> {
  return request(`/api/users/${username}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
}

export async function deleteAccount(): Promise<{ message: string }> {
  return request("/api/account", {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
}

// AI Chat

export function chatWithAI(username: string, message: string): Promise<Response> {
  return fetch(`${API_URL}/api/ai/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, message }),
  });
}
