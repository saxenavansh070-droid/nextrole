import fs from 'node:fs';
import path from 'node:path';

export interface RoleDefinition {
  title: string;
  seniority: string;
  summary: string;
  skills: string[];
}

export interface NextRoleData {
  title: string;
  brand: { name: string; mark: string; tagline: string };
  experience: {
    errors: { empty: string; tooShort: string; server: string };
  };
  skillCatalog: string[];
  skillRoles: Record<string, string[]>;
  roleCatalog: RoleDefinition[];
}

/**
 * All application data lives in a single file: `nextrole.json` at the project root.
 * It is read at runtime (dev and production builds resolve the same path).
 */
const candidates = [
  path.resolve(__dirname, '..', '..', 'nextrole.json'),
  path.resolve(process.cwd(), 'nextrole.json'),
  path.resolve(process.cwd(), '..', 'nextrole.json'),
];

function resolvePath(): string {
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error('nextrole.json not found. Expected it at the project root.');
}

/** Absolute path of the single data file. */
export const dataPath = resolvePath();

export const data: NextRoleData = JSON.parse(fs.readFileSync(dataPath, 'utf-8')) as NextRoleData;
