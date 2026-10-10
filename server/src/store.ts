import fs from 'node:fs';
import { Types } from 'mongoose';
import { dataPath } from './data';
import type { AnalysisSource, RoleMatch } from './types';

/**
 * File-backed persistence inside the single `nextrole.json` data file.
 *
 * Used whenever MongoDB is not configured/connected, so sign-in, saved
 * analyses, and profile history keep working out of the box. When MongoDB is
 * available the Mongo models are used instead and this store stays untouched.
 *
 * Runtime data lives under the top-level `store` key:
 *   { "store": { "users": [...], "analyses": [...] } }
 */

export interface StoredUser {
  id: string;
  googleId?: string;
  name: string;
  email: string;
  picture?: string;
  passwordHash?: string;
  createdAt: string;
}

export interface StoredAnalysis {
  id: string;
  userId: string;
  fileName?: string;
  skills: string[];
  summary: string;
  roles: RoleMatch[];
  source: AnalysisSource;
  createdAt: string;
}

interface StoreShape {
  users?: StoredUser[];
  analyses?: StoredAnalysis[];
}

const MAX_ANALYSES = 100;

function readStore(): StoreShape {
  try {
    const parsed = JSON.parse(fs.readFileSync(dataPath, 'utf-8')) as { store?: StoreShape };
    return parsed.store ?? {};
  } catch (cause) {
    console.warn('[store] could not read nextrole.json store:', cause);
    return {};
  }
}

function writeStore(store: StoreShape): void {
  try {
    const file = JSON.parse(fs.readFileSync(dataPath, 'utf-8')) as Record<string, unknown>;
    file.store = store;
    const payload = `${JSON.stringify(file, null, 2)}\n`;

    // Windows (OneDrive, antivirus, the dev server) can hold short-lived read
    // locks on nextrole.json: rename needs delete access and fails with EPERM,
    // so retry with backoff and fall back to a direct overwrite.
    let lastError: unknown;
    for (let attempt = 0; attempt < 5; attempt++) {
      if (attempt > 0) {
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 80 * attempt);
      }

      const tmp = `${dataPath}.tmp`;
      try {
        fs.writeFileSync(tmp, payload, 'utf-8');
        fs.renameSync(tmp, dataPath); // atomic replace when possible
        return;
      } catch (cause) {
        lastError = cause;
        try {
          fs.unlinkSync(tmp);
        } catch {
          // Leftover tmp is harmless; next write reuses the name.
        }
      }

      try {
        fs.writeFileSync(dataPath, payload, 'utf-8'); // lock-tolerant fallback
        return;
      } catch (cause) {
        lastError = cause;
      }
    }
    throw lastError;
  } catch (cause) {
    console.warn('[store] could not write nextrole.json store:', cause);
  }
}

function newId(): string {
  return new Types.ObjectId().toString();
}

/** Finds (or creates) a user by Google id or email address. */
export function upsertUser(profile: {
  googleId?: string;
  name: string;
  email: string;
  picture?: string;
  passwordHash?: string;
}): StoredUser {
  const store = readStore();
  const users = store.users ?? [];
  const email = profile.email.trim().toLowerCase();
  const existing = users.find(
    (user) =>
      (profile.googleId && user.googleId === profile.googleId) ||
      user.email.toLowerCase() === email,
  );

  if (existing) {
    existing.name = profile.name;
    existing.email = profile.email;
    if (profile.picture !== undefined) existing.picture = profile.picture;
    if (profile.googleId) existing.googleId = profile.googleId;
    if (profile.passwordHash && !existing.passwordHash) existing.passwordHash = profile.passwordHash;
    writeStore(store);
    return existing;
  }

  const created: StoredUser = {
    id: newId(),
    ...(profile.googleId ? { googleId: profile.googleId } : {}),
    name: profile.name,
    email: profile.email,
    ...(profile.picture ? { picture: profile.picture } : {}),
    ...(profile.passwordHash ? { passwordHash: profile.passwordHash } : {}),
    createdAt: new Date().toISOString(),
  };
  users.push(created);
  store.users = users;
  writeStore(store);
  return created;
}

/** Finds a user by email address (used by password sign-in). */
export function findUserByEmail(email: string): StoredUser | undefined {
  const target = email.trim().toLowerCase();
  return (readStore().users ?? []).find((user) => user.email.toLowerCase() === target);
}

/** Stores (or replaces) a password hash for an existing user. */
export function setUserPasswordHash(userId: string, passwordHash: string): void {
  const store = readStore();
  const user = (store.users ?? []).find((entry) => entry.id === userId);
  if (!user) return;
  user.passwordHash = passwordHash;
  writeStore(store);
}

/** Saves an analysis for a user; newest first, capped at MAX_ANALYSES. */
export function saveAnalysis(
  userId: string,
  input: {
    fileName?: string;
    skills: string[];
    summary: string;
    roles: RoleMatch[];
    source: AnalysisSource;
  },
): StoredAnalysis {
  const store = readStore();
  const created: StoredAnalysis = {
    id: newId(),
    userId,
    ...(input.fileName ? { fileName: input.fileName } : {}),
    skills: input.skills,
    summary: input.summary,
    roles: input.roles,
    source: input.source,
    createdAt: new Date().toISOString(),
  };
  const analyses = store.analyses ?? [];
  analyses.unshift(created);
  store.analyses = analyses.slice(0, MAX_ANALYSES);
  writeStore(store);
  return created;
}

/** Lists a user's saved analyses, newest first. */
export function listAnalyses(userId: string): StoredAnalysis[] {
  const analyses = readStore().analyses ?? [];
  return analyses
    .filter((analysis) => analysis.userId === userId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 30);
}

/** Deletes one analysis owned by the user. Returns true when removed. */
export function deleteAnalysis(userId: string, id: string): boolean {
  const store = readStore();
  const analyses = store.analyses ?? [];
  const next = analyses.filter((analysis) => !(analysis.id === id && analysis.userId === userId));
  if (next.length === analyses.length) return false;
  store.analyses = next;
  writeStore(store);
  return true;
}
