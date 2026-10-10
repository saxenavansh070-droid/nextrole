import { data } from '../data';
import { env } from '../env';
import type { AnalysisResult, RoleMatch } from '../types';

const MAX_INPUT_CHARS = 14_000;

function buildSystemPrompt(): string {
  const skills = data.skillCatalog.join(', ');
  const roles = data.roleCatalog.map((role) => role.title).join(', ');

  return `You are "Next Role", a precise career-matching engine.
Read the resume the user sends and return STRICT JSON only - no markdown fences, no commentary.

JSON shape:
{
  "skills": string[],
  "summary": string,
  "roles": [
    {
      "title": string,
      "seniority": string,
      "matchPercent": number,
      "summary": string,
      "why": string,
      "skills": string[]
    }
  ]
}

Rules:
- "skills": 6-14 real skills evidenced in the resume. Use these exact spellings when possible: ${skills}
- "summary": one line, max 220 characters, describing the person's profile in plain language.
- "roles": 5 to 7 roles, best match first. Prefer titles from this list: ${roles}
- "seniority": one of "Entry", "Entry-Mid", "Mid", "Mid-Senior", "Senior".
- "matchPercent": integer 50-98, an honest fit for THIS person.
- "summary" of a role: max 180 characters describing the role.
- "why": max 220 characters, citing concrete evidence from this resume.
- "skills": 3-6 of the person's skills that the role needs.
- Never invent employers, dates, degrees, or years of experience.
- If the resume is not a career document, still return valid JSON with the closest roles.`;
}

function toStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
}

function asText(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback;
}

function normalizeRole(value: unknown): RoleMatch | null {
  if (!value || typeof value !== 'object') return null;
  const source = value as Record<string, unknown>;
  const title = asText(source.title);
  if (!title) return null;

  const raw = Number(source.matchPercent);
  const matchPercent = Number.isFinite(raw)
    ? Math.min(98, Math.max(40, Math.round(raw)))
    : 60;

  return {
    title: title.slice(0, 90),
    matchPercent,
    seniority: asText(source.seniority, 'Mid').slice(0, 30),
    summary: asText(source.summary).slice(0, 220),
    why: asText(source.why).slice(0, 320),
    skills: toStrings(source.skills).slice(0, 6),
  };
}

function parseGrokContent(raw: string): AnalysisResult | null {
  if (!raw) return null;
  const stripped = raw.replace(/```[a-z]*/gi, '').trim();
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  const jsonText = start >= 0 && end > start ? stripped.slice(start, end + 1) : stripped;

  try {
    const parsed = JSON.parse(jsonText) as Partial<AnalysisResult>;
    const roles = (Array.isArray(parsed.roles) ? parsed.roles : [])
      .map(normalizeRole)
      .filter((role): role is RoleMatch => role !== null)
      .sort((a, b) => b.matchPercent - a.matchPercent)
      .slice(0, 8);

    if (roles.length === 0) return null;

    return {
      skills: toStrings(parsed.skills).slice(0, 16),
      summary: asText(parsed.summary).slice(0, 300),
      roles,
    };
  } catch {
    return null;
  }
}

/**
 * Calls the xAI Grok API (OpenAI-compatible chat completions).
 * Returns null when unconfigured, rate-limited, or malformed so callers can fall back.
 */
export async function analyzeWithGrok(resumeText: string): Promise<AnalysisResult | null> {
  if (!env.grokApiKey) return null;

  try {
    const response = await fetch(env.grokApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.grokApiKey}`,
      },
      body: JSON.stringify({
        model: env.grokModel,
        temperature: 0.3,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: buildSystemPrompt() },
          { role: 'user', content: `RESUME:\n${resumeText.slice(0, MAX_INPUT_CHARS)}` },
        ],
      }),
      signal: AbortSignal.timeout(45_000),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      console.warn(`[grok] ${response.status}: ${detail.slice(0, 300)}`);
      return null;
    }

    const body = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return parseGrokContent(body.choices?.[0]?.message?.content ?? '');
  } catch (cause) {
    console.warn('[grok] request failed:', cause instanceof Error ? cause.message : cause);
    return null;
  }
}
