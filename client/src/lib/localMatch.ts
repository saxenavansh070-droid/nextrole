import raw from '../../../nextrole.json';
import type { RoleMatch } from '../types';

type RoleDefinition = { title: string; seniority: string; summary: string; skills: string[] };

/** The same catalogue the server uses, imported straight from nextrole.json. */
const data = raw as unknown as {
  skillCatalog: string[];
  skillRoles: Record<string, string[]>;
  roleCatalog: RoleDefinition[];
};

type LocalResult = { skills: string[]; summary: string; roles: RoleMatch[] };

const REGEX_SPECIALS = /[.*+?^${}()|[\]\\]/g;

function escapeRegExp(value: string): string {
  return value.replace(REGEX_SPECIALS, '\\$&');
}

/**
 * Word-boundary phrase match. Separators (space, -, /) are interchangeable so
 * "CI/CD", "ci-cd", "cicd" and "CI CD" all match the same skill.
 */
function containsPhrase(haystack: string, needle: string): boolean {
  const body = escapeRegExp(needle.toLowerCase()).replace(/[\s/-]+/g, '[\\s/-]*');
  const pattern = new RegExp(`(?<![a-z0-9])${body}(?![a-z0-9])`, 'i');
  return pattern.test(haystack);
}

/**
 * Real-world spellings mapped to their canonical skillCatalog entry.
 * Resumes rarely use catalog-perfect names ("reactjs", "k8s", "postgres"...).
 */
const SKILL_ALIASES: Record<string, string> = {
  js: 'JavaScript', es6: 'JavaScript', ecmascript: 'JavaScript',
  ts: 'TypeScript',
  reactjs: 'React', 'react js': 'React', redux: 'React',
  nextjs: 'Next.js', 'next js': 'Next.js',
  vue: 'Vue.js', vuejs: 'Vue.js', 'vue js': 'Vue.js',
  angularjs: 'Angular',
  nodejs: 'Node.js', 'node js': 'Node.js',
  expressjs: 'Express', 'express js': 'Express',
  spring: 'Spring Boot', 'springframework': 'Spring Boot',
  laravel: 'PHP', rails: 'Ruby', 'ruby on rails': 'Ruby',
  mongo: 'MongoDB',
  postgres: 'PostgreSQL', psql: 'PostgreSQL',
  mariadb: 'MySQL',
  tailwind: 'Tailwind CSS', tailwindcss: 'Tailwind CSS',
  rest: 'REST APIs', 'rest api': 'REST APIs', 'rest apis': 'REST APIs', restful: 'REST APIs',
  cicd: 'CI/CD', 'ci-cd': 'CI/CD', 'ci cd': 'CI/CD', 'continuous integration': 'CI/CD',
  k8s: 'Kubernetes',
  gcp: 'Google Cloud', 'google cloud platform': 'Google Cloud',
  'amazon web services': 'AWS', ec2: 'AWS', s3: 'AWS', cloudformation: 'AWS',
  'azure devops': 'Azure',
  ml: 'Machine Learning', llm: 'Machine Learning',
  'generative ai': 'Prompt Engineering', genai: 'Prompt Engineering',
  chatgpt: 'Prompt Engineering', 'prompt engineering': 'Prompt Engineering',
  sklearn: 'scikit-learn', 'scikit learn': 'scikit-learn',
  keras: 'TensorFlow', jupyter: 'Python',
  opencv: 'Computer Vision',
  powerbi: 'Power BI', 'microsoft excel': 'Excel', 'ms excel': 'Excel', vlookup: 'Excel',
  'google sheets': 'Google Sheets',
  ga4: 'Google Analytics', 'google analytics 4': 'Google Analytics',
  html5: 'HTML', css3: 'CSS',
  ux: 'UI/UX Design', 'ux design': 'UI/UX Design', 'ui design': 'UI/UX Design',
  wireframe: 'Wireframing', wireframes: 'Wireframing',
  prototype: 'Prototyping', prototypes: 'Prototyping',
  'design system': 'Design Systems',
  wcag: 'Accessibility',
  roadmap: 'Roadmaps',
  'product mgmt': 'Product Management',
  'team work': 'Teamwork',
  'verbal communication': 'Communication', 'written communication': 'Communication',
  'financial modelling': 'Financial Modeling',
  'risk analysis': 'Risk Management',
  'customer service': 'Customer Support',
  'tech support': 'Technical Support', helpdesk: 'Technical Support', 'help desk': 'Technical Support',
  'talent acquisition': 'Recruitment', recruiting: 'Recruitment',
  'statistical analysis': 'Statistics',
  'data viz': 'Data Visualization',
  snowflake: 'Data Warehousing', redshift: 'Data Warehousing', bigquery: 'Data Warehousing',
  grafana: 'Monitoring', prometheus: 'Monitoring', datadog: 'Monitoring', splunk: 'Monitoring',
  lambda: 'Serverless',
  'material-ui': 'React',
  'next js app': 'Next.js',
  'microsoft word': 'Word', 'ms word': 'Word',
  'ms powerpoint': 'PowerPoint', 'microsoft powerpoint': 'PowerPoint',
  'motion graphics': 'After Effects', 'video editing': 'Premiere Pro', premiere: 'Premiere Pro',
  'content writer': 'Copywriting', 'content writing': 'Copywriting',
  confluence: 'Documentation',
  'unit tests': 'Unit Testing',
  'distributed systems': 'System Design',
  'problem-solving': 'Problem Solving',
  'business-process-improvement': 'Process Improvement',
};

const catalogue = new Set(data.skillCatalog.map((skill) => skill.toLowerCase()));

/** Every catalog skill present in the resume, including alias spellings. */
function findSkills(text: string): string[] {
  const found: string[] = [];
  const seen = new Set<string>();

  const add = (skill: string) => {
    const key = skill.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    found.push(skill);
  };

  for (const skill of data.skillCatalog) {
    if (containsPhrase(text, skill)) add(skill);
  }

  for (const [alias, canonical] of Object.entries(SKILL_ALIASES)) {
    if (!catalogue.has(canonical.toLowerCase())) continue;
    if (seen.has(canonical.toLowerCase())) continue;
    if (containsPhrase(text, alias)) add(canonical);
  }

  return found;
}

/** Resume phrases that point strongly at a specific role in the library. */
const TITLE_HINTS: { pattern: RegExp; role: string; label: string }[] = [
  { pattern: /\b(front[\s-]?end|frontend|web developer|webdev|web designer)\b/i, role: 'Frontend Engineer', label: 'front-end development' },
  { pattern: /\b(back[\s-]?end|backend|api developer|server[\s-]?side)\b/i, role: 'Backend Engineer', label: 'back-end development' },
  { pattern: /\b(full[\s-]?stack|fullstack|mean stack|mern|web application developer)\b/i, role: 'Full-Stack Developer', label: 'full-stack development' },
  { pattern: /\b(ui[\s/.]?ux|user experience|product designer|ux designer|ui designer)\b/i, role: 'UI/UX Designer', label: 'UI/UX design' },
  { pattern: /\b(product manager|product owner|product management|roadmap)\b/i, role: 'Product Manager', label: 'product management' },
  { pattern: /\b(data analyst|reporting analyst|bi analyst|business intelligence|dashboard)\b/i, role: 'Data Analyst', label: 'data analysis' },
  { pattern: /\b(data scientist|predictive model|statistical model|machine learning|deep learning|ai engineer|mlops|nlp|computer vision)\b/i, role: 'Data Scientist', label: 'data science / ML' },
  { pattern: /\b(devops|sre|site reliability|infrastructure engineer|platform engineer|ci\/cd|kubernetes|terraform)\b/i, role: 'DevOps Engineer', label: 'DevOps' },
  { pattern: /\b(cloud engineer|cloud architect|cloud infrastructure|aws|azure|google cloud)\b/i, role: 'Cloud Engineer', label: 'cloud engineering' },
  { pattern: /\b(android|ios|mobile developer|mobile app|flutter|react native)\b/i, role: 'Mobile App Developer', label: 'mobile development' },
  { pattern: /\b(quality assurance|\bqa\b|test automation|automation engineer|sdet|software tester|test cases|test plans)\b/i, role: 'QA / Test Automation Engineer', label: 'QA / test automation' },
  { pattern: /\b(cyber ?security|information security|infosec|soc analyst|penetration|vulnerability|threat)\b/i, role: 'Cybersecurity Analyst', label: 'security' },
  { pattern: /\b(database admin|\bdba\b|data engineer|etl|data warehouse|database design|schema)\b/i, role: 'Database Administrator', label: 'databases / data engineering' },
  { pattern: /\b(engineering manager|tech lead|team lead|head of engineering|\bcto\b|vp engineering|principal engineer)\b/i, role: 'Engineering Manager', label: 'engineering leadership' },
  { pattern: /\b(technical writer|documentation specialist|docs writer|knowledge base)\b/i, role: 'Technical Writer', label: 'technical writing' },
  { pattern: /\b(digital marketing|marketing manager|campaign|sem|ppc|adwords)\b/i, role: 'Digital Marketing Specialist', label: 'digital marketing' },
  { pattern: /\b(content strategist|content marketing|content calendar|editorial)\b/i, role: 'Content Strategist', label: 'content strategy' },
  { pattern: /\b(growth|performance marketing|conversion rate|a\/b test|funnel)\b/i, role: 'Growth Marketer', label: 'growth marketing' },
  { pattern: /\b(sales|\bsdr\b|business development|\bbdr\b|account executive|pipeline|cold call|revenue)\b/i, role: 'Sales Development Representative', label: 'sales' },
  { pattern: /\b(customer success|account manager|client success|renewal|onboarding)\b/i, role: 'Customer Success Manager', label: 'customer success' },
  { pattern: /\b(recruiter|talent acquisition|sourcer|technical recruiter|hiring)\b/i, role: 'Recruiter / Talent Acquisition', label: 'recruiting' },
  { pattern: /\b(financial analyst|finance|investment|equity research|financial model|budget)\b/i, role: 'Financial Analyst', label: 'finance' },
  { pattern: /\b(project manager|program manager|delivery manager|scrum master|\bpmp\b)\b/i, role: 'Project Manager', label: 'project management' },
  { pattern: /\b(hr\b|human resources|people ops|payroll|employee relations|generalist)\b/i, role: 'HR Generalist', label: 'HR' },
  { pattern: /\b(video editor|videographer|motion graphics|youtube|reels)\b/i, role: 'Video Editor', label: 'video editing' },
  { pattern: /\b(graphic designer|visual designer|brand designer|illustrator|poster|logo)\b/i, role: 'Graphic Designer', label: 'graphic design' },
  { pattern: /\b(operations manager|logistics|supply chain|ops manager|inventory|procurement)\b/i, role: 'Operations Manager', label: 'operations' },
  { pattern: /\b(business analyst|requirements gathering|process improvement|systems analyst|stakeholder)\b/i, role: 'Business Analyst', label: 'business analysis' },
  { pattern: /\b(technical support|it support|support engineer|customer support|helpdesk|troubleshoot)\b/i, role: 'Technical Support Specialist', label: 'technical support' },
];

/** Roles that fit almost any background - surfaced when a resume has little signal. */
const WARM_TITLES = new Set([
  'Customer Success Manager',
  'HR Generalist',
  'Project Manager',
  'Business Analyst',
  'Technical Support Specialist',
  'Recruiter / Talent Acquisition',
  'Operations Manager',
  'Technical Writer',
]);

type Candidate = {
  role: RoleDefinition;
  matched: string[];
  hints: string[];
  percent: number;
};

/** "5 years of experience", "3+ yrs experience" ... */
function inferYears(text: string): number | null {
  const match = text.match(/(\d{1,2})\s*\+?\s*(?:years?|yrs?)\s*(?:of)?\s*(?:experience|exp)/i);
  if (match) return Number(match[1]);
  const alt = text.match(/(?:experience|exp)\D{0,20}(\d{1,2})\s*\+?\s*(?:years?|yrs?)/i);
  return alt ? Number(alt[1]) : null;
}

/**
 * Offline matcher used when no Grok API key is configured (or when the API
 * fails). Scores the role catalog from nextrole.json against the skills AND
 * job-title language found in the resume - and always returns a ranked list
 * with the closest-fitting role first.
 */
export function matchLocally(resumeText: string): LocalResult {
  const foundSkills = findSkills(resumeText);
  const foundSet = new Set(foundSkills.map((skill) => skill.toLowerCase()));

  // Roles implied by individual skills (skillRoles map in nextrole.json).
  const implied = new Map<string, string[]>();
  for (const skill of foundSkills) {
    for (const title of data.skillRoles[skill] ?? []) {
      const list = implied.get(title) ?? [];
      list.push(skill);
      implied.set(title, list);
    }
  }

  // Strong role signals from titles/phrases in the resume.
  const hints = new Map<string, string[]>();
  for (const hint of TITLE_HINTS) {
    const match = resumeText.match(hint.pattern);
    if (!match) continue;
    const list = hints.get(hint.role) ?? [];
    list.push(match[0].trim());
    hints.set(hint.role, list);
  }

  const candidates: Candidate[] = [];

  for (const role of data.roleCatalog) {
    const direct = role.skills.filter((skill) => foundSet.has(skill.toLowerCase()));
    const directSet = new Set(direct.map((skill) => skill.toLowerCase()));
    const viaSkills = (implied.get(role.title) ?? []).filter(
      (skill) => !directSet.has(skill.toLowerCase()),
    );
    const hintWords = hints.get(role.title) ?? [];
    if (direct.length === 0 && viaSkills.length === 0 && hintWords.length === 0) continue;
    const percent = Math.min(97, 56 + direct.length * 9 + viaSkills.length * 4 + hintWords.length * 7);
    candidates.push({ role, matched: [...direct, ...viaSkills], hints: hintWords, percent });
  }

  candidates.sort(
    (a, b) =>
      b.percent - a.percent ||
      b.hints.length - a.hints.length ||
      b.matched.length - a.matched.length,
  );

  const top = candidates.slice(0, 6);

  // Never leave the panel empty: pad with broader suggestions.
  if (top.length < 6) {
    const used = new Set(top.map((entry) => entry.role.title));
    const noSignal = hints.size === 0;
    const pool = noSignal
      ? [...data.roleCatalog].sort(
          (a, b) =>
            Number(WARM_TITLES.has(b.title)) - Number(WARM_TITLES.has(a.title)) ||
            b.skills.length - a.skills.length,
        )
      : [...data.roleCatalog].sort((a, b) => b.skills.length - a.skills.length);
    for (const role of pool) {
      if (used.has(role.title)) continue;
      top.push({
        role,
        matched: [],
        hints: [],
        percent: Math.max(42, 54 - top.length * 2),
      });
      used.add(role.title);
      if (top.length >= 6) break;
    }
  }

  // With no clear career signal, lead with roles that fit almost any background.
  if (hints.size === 0 && foundSkills.length <= 4) {
    top.sort(
      (a, b) =>
        Number(WARM_TITLES.has(b.role.title)) - Number(WARM_TITLES.has(a.role.title)) ||
        b.percent - a.percent,
    );
  }

  const roles: RoleMatch[] = top.map(({ role, matched, hints: hintWords, percent }) => {
    let why: string;
    if (matched.length > 0 && hintWords.length > 0) {
      why = `Your experience lines up through ${matched.slice(0, 4).join(', ')}, and your resume mentions ${hintWords[0]}. ${role.summary}`;
    } else if (matched.length > 0) {
      why = `Your experience lines up through ${matched.slice(0, 4).join(', ')}. ${role.summary}`;
    } else if (hintWords.length > 0) {
      why = `Your resume points at this role through ${hintWords.slice(0, 2).join(' and ')}. ${role.summary}`;
    } else {
      why = `A broader move worth exploring alongside your current experience. ${role.summary}`;
    }
    return {
      title: role.title,
      matchPercent: percent,
      seniority: role.seniority,
      summary: role.summary,
      why,
      skills: matched.length > 0 ? matched.slice(0, 6) : role.skills.slice(0, 4),
    };
  });

  const years = inferYears(resumeText);
  const topHint = [...hints.entries()].sort((a, b) => b[1].length - a[1].length)[0];

  let summary: string;
  if (foundSkills.length > 0) {
    summary = `We found ${foundSkills.length} skills in your resume, including ${foundSkills
      .slice(0, 5)
      .join(', ')}.`;
    if (years !== null) summary += ` About ${years} ${years === 1 ? 'year' : 'years'} of experience noted.`;
    if (topHint) summary += ` Strongest signal: ${topHint[0]}.`;
  } else if (topHint) {
    summary = `Your resume reads strongest as ${topHint[0]}${
      years !== null ? `, with about ${years} ${years === 1 ? 'year' : 'years'} of experience` : ''
    }. We could not spot named skills, so matches below lean on that.`;
  } else {
    summary =
      'We read your experience but could not spot named skills, so the matches below are broader suggestions.';
  }

  return { skills: foundSkills.slice(0, 16), summary, roles };
}
