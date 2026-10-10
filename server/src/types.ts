export type RoleMatch = {
  title: string;
  matchPercent: number;
  seniority: string;
  summary: string;
  why: string;
  skills: string[];
};

export type AnalysisResult = {
  skills: string[];
  summary: string;
  roles: RoleMatch[];
};

export type AnalysisSource = 'grok' | 'local';
