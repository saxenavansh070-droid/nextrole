import type { AnalyzeResult, AuthUser, SavedAnalysis } from '../types';

/**
 * Browser-local accounts for the static (GitHub Pages) build.
 *
 * The static app has no server, so sign up / sign in / profile history are
 * kept in this browser's localStorage. Passwords are salted and hashed with
 * WebCrypto SHA-256 - never stored raw. The full Node app uses the real
 * database-backed auth instead; both flows share the same UI and session keys.
 */

type LocalAccount = {
  id: string;
  name: string;
  email: string;
  salt: string;
  passwordHash: string;
  createdAt: string;
};

// Same keys the rest of the app uses for the session (lib/api.ts).
const TOKEN_KEY = 'nextrole.token';
const USER_KEY = 'nextrole.user';
const ACCOUNTS_KEY = 'nextrole.localAccounts';
const ANALYSES_KEY = 'nextrole.localAnalyses';

function readAccounts(): LocalAccount[] {
  try {
    return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) ?? '[]') as LocalAccount[];
  } catch {
    return [];
  }
}

function writeAccounts(accounts: LocalAccount[]): void {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

function randomHex(bytes: number): string {
  const buf = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

function startSession(user: AuthUser): string {
  const token = `${user.id}.${randomHex(16)}`;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  return token;
}

function toAuthUser(account: LocalAccount): AuthUser {
  return { id: account.id, name: account.name, email: account.email };
}

export async function localSignup(input: {
  name: string;
  email: string;
  password: string;
}): Promise<{ token: string; user: AuthUser }> {
  const email = input.email.trim().toLowerCase();
  const accounts = readAccounts();
  if (accounts.some((account) => account.email === email)) {
    throw new Error('An account with this email already exists here. Try signing in instead.');
  }
  const salt = randomHex(12);
  const account: LocalAccount = {
    id: randomHex(8),
    name: input.name.trim(),
    email,
    salt,
    passwordHash: await hashPassword(input.password, salt),
    createdAt: new Date().toISOString(),
  };
  accounts.push(account);
  writeAccounts(accounts);
  const user = toAuthUser(account);
  return { token: startSession(user), user };
}

export async function localSignin(input: {
  email: string;
  password: string;
}): Promise<{ token: string; user: AuthUser }> {
  const email = input.email.trim().toLowerCase();
  const account = readAccounts().find((candidate) => candidate.email === email);
  if (!account) {
    throw new Error('No account with that email on this browser yet - create one first.');
  }
  const candidateHash = await hashPassword(input.password, account.salt);
  if (candidateHash !== account.passwordHash) {
    throw new Error('That password is not correct. Please try again.');
  }
  const user = toAuthUser(account);
  return { token: startSession(user), user };
}

type StoredAnalysis = SavedAnalysis;

function readAnalyses(): Record<string, StoredAnalysis[]> {
  try {
    return JSON.parse(localStorage.getItem(ANALYSES_KEY) ?? '{}') as Record<
      string,
      StoredAnalysis[]
    >;
  } catch {
    return {};
  }
}

/** Saves an analysis to the signed-in local account (no-op when signed out). */
export function saveLocalAnalysis(result: AnalyzeResult & { fileName?: string }): boolean {
  const rawUser = localStorage.getItem(USER_KEY);
  if (!rawUser) return false;
  let user: AuthUser;
  try {
    user = JSON.parse(rawUser) as AuthUser;
  } catch {
    return false;
  }
  const all = readAnalyses();
  const list = all[user.id] ?? [];
  list.unshift({
    id: randomHex(8),
    fileName: result.fileName,
    summary: result.summary,
    skills: result.skills,
    roles: result.roles,
    source: result.source,
    createdAt: new Date().toISOString(),
  });
  all[user.id] = list.slice(0, 50);
  localStorage.setItem(ANALYSES_KEY, JSON.stringify(all));
  return true;
}

export function listLocalAnalyses(userId: string): SavedAnalysis[] {
  return readAnalyses()[userId] ?? [];
}

export function deleteLocalAnalysis(userId: string, analysisId: string): void {
  const all = readAnalyses();
  all[userId] = (all[userId] ?? []).filter((item) => item.id !== analysisId);
  localStorage.setItem(ANALYSES_KEY, JSON.stringify(all));
}
