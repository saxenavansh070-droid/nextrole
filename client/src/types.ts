export type RoleMatch = {
  title: string;
  matchPercent: number;
  seniority: string;
  summary: string;
  why: string;
  skills: string[];
};

export type AnalyzeResult = {
  skills: string[];
  summary: string;
  roles: RoleMatch[];
  source: 'grok' | 'local';
};

export type AnalyzeResponse = AnalyzeResult & {
  ok: boolean;
  saved: boolean;
  fileName?: string;
  error?: string;
};

export type AnalyzeStatus = 'idle' | 'loading' | 'ready' | 'error';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  picture?: string;
};

export type SavedAnalysis = {
  id: string;
  fileName?: string;
  summary: string;
  skills: string[];
  roles: RoleMatch[];
  source: 'grok' | 'local';
  createdAt: string;
};

export type LibraryRole = {
  title: string;
  seniority: string;
  summary: string;
  skills: string[];
};
