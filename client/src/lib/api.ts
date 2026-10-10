import type { AnalyzeResponse, AnalyzeResult, AuthUser, LibraryRole, SavedAnalysis } from '../types';
import {
  deleteLocalAnalysis,
  listLocalAnalyses,
  localSignin as browserSignin,
  localSignup as browserSignup,
  saveLocalAnalysis,
} from './localAuth';

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api';

/** True for the static (GitHub Pages) build: analysis runs in the browser. */
export const STATIC_MODE = import.meta.env.VITE_STATIC === '1';

const TOKEN_KEY = 'nextrole.token';
const USER_KEY = 'nextrole.user';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function setSession(token: string | null, user: AuthUser | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  else localStorage.removeItem(USER_KEY);
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function unwrap<T>(res: Response): Promise<T> {
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new Error(data.error ?? `Request failed with status ${res.status}`);
  }
  return data;
}

/** Upload a resume file (PDF, DOCX, TXT) as raw bytes. */
export async function analyzeFile(file: File): Promise<AnalyzeResponse> {
  if (STATIC_MODE) {
    const { analyzeInBrowser } = await import('./staticAnalyze');
    const result = await analyzeInBrowser(file);
    // Keep profile history for signed-in local accounts.
    result.saved = saveLocalAnalysis(result);
    return result;
  }
  const res = await fetch(`${API_BASE}/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'X-Filename': encodeURIComponent(file.name),
      ...authHeaders(),
    },
    body: file,
  });
  return unwrap<AnalyzeResponse>(res);
}

/** Analyse pasted resume text. */
export async function analyzeText(text: string): Promise<AnalyzeResponse> {
  if (STATIC_MODE) {
    const { analyzeInBrowser } = await import('./staticAnalyze');
    const result = await analyzeInBrowser(text);
    result.saved = saveLocalAnalysis(result);
    return result;
  }
  const res = await fetch(`${API_BASE}/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify({ text }),
  });
  return unwrap<AnalyzeResponse>(res);
}

export async function googleSignIn(credential: string): Promise<{ token: string; user: AuthUser }> {
  const res = await fetch(`${API_BASE}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential }),
  });
  return unwrap<{ token: string; user: AuthUser }>(res);
}

/** Password sign-in / sign-up with email (works with no external setup). */
export async function localSignIn(input: {
  mode: 'signin' | 'signup';
  name?: string;
  email: string;
  password: string;
}): Promise<{ token: string; user: AuthUser }> {
  // Static build: secure salted-hash accounts kept in this browser.
  if (STATIC_MODE) {
    return input.mode === 'signup'
      ? browserSignup({ name: input.name ?? '', email: input.email, password: input.password })
      : browserSignin({ email: input.email, password: input.password });
  }
  const res = await fetch(`${API_BASE}/auth/local`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return unwrap<{ token: string; user: AuthUser }>(res);
}

export type LastResult = AnalyzeResult & { fileName?: string };

// The latest analysis is kept ONLY in memory for the current visit.
// Match percentages must never be shown before a resume has actually been
// uploaded or pasted, so nothing is persisted across page reloads.
let lastResultCache: LastResult | null = null;

// Drop any results persisted by older versions of the app so stale
// percentages disappear immediately for returning users.
try {
  localStorage.removeItem('nextrole.lastResult');
} catch {
  // Storage unavailable (private mode) - nothing to clear.
}

/** Most recent analysis of this visit (null until a resume is analysed). */
export function getLastResult(): LastResult | null {
  return lastResultCache;
}

export function setLastResult(result: LastResult): void {
  lastResultCache = result;
}

export async function fetchLibraryRoles(): Promise<{ roles: LibraryRole[] }> {
  const res = await fetch(`${API_BASE}/roles`);
  return unwrap<{ roles: LibraryRole[] }>(res);
}

export async function fetchProfile(): Promise<{ analyses: SavedAnalysis[]; count: number }> {
  if (STATIC_MODE) {
    const user = getStoredUser();
    const analyses = user ? listLocalAnalyses(user.id) : [];
    return { analyses, count: analyses.length };
  }
  const res = await fetch(`${API_BASE}/profile`, { headers: authHeaders() });
  return unwrap<{ analyses: SavedAnalysis[]; count: number }>(res);
}

/** False only when the server explicitly rejects the stored token. */
export async function validateSession(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/profile`, { headers: authHeaders() });
    if (res.ok) return true;
    return res.status !== 401 && res.status !== 403;
  } catch {
    return true; // Network problem: keep the session, do not sign out.
  }
}

export async function deleteAnalysis(id: string): Promise<{ ok: boolean }> {
  if (STATIC_MODE) {
    const user = getStoredUser();
    if (user) deleteLocalAnalysis(user.id, id);
    return { ok: true };
  }
  const res = await fetch(`${API_BASE}/profile/analysis/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return unwrap<{ ok: boolean }>(res);
}
