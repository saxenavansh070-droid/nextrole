import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ChevronDown, Upload } from 'lucide-react';
import { fetchLibraryRoles, getLastResult } from '../lib/api';
import { content } from '../lib/content';
import { slugify } from '../lib/slug';
import type { LibraryRole } from '../types';

export default function RolesPage() {
  const copy = content.pages.roles;
  const detailCopy = content.pages.roleDetail;
  const [roles, setRoles] = useState<LibraryRole[]>(content.roleCatalog);
  const [query, setQuery] = useState('');
  const [selectedTitle, setSelectedTitle] = useState('');
  const lastResult = useMemo(() => getLastResult(), []);

  useEffect(() => {
    let cancelled = false;
    fetchLibraryRoles()
      .then((data) => {
        if (!cancelled && data.roles.length > 0) setRoles(data.roles);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedRole = roles.find((role) => role.title === selectedTitle) ?? null;

  // Match percentages from the latest resume analysis, keyed by role slug.
  const matchBySlug = useMemo(() => {
    const map = new Map<string, number>();
    for (const match of lastResult?.roles ?? []) {
      map.set(slugify(match.title), match.matchPercent);
    }
    return map;
  }, [lastResult]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = !q
      ? roles
      : roles.filter(
          (role) =>
            role.title.toLowerCase().includes(q) ||
            role.summary.toLowerCase().includes(q) ||
            role.skills.some((skill) => skill.toLowerCase().includes(q)),
        );
    // Once a resume has been analysed, the roles it matched float to the top.
    if (matchBySlug.size === 0) return base;
    return [...base].sort((a, b) => {
      const aMatch = matchBySlug.get(slugify(a.title)) ?? -1;
      const bMatch = matchBySlug.get(slugify(b.title)) ?? -1;
      return bMatch - aMatch;
    });
  }, [roles, query, matchBySlug]);

  const ownedSkills = useMemo(() => {
    const owned = new Set<string>();
    for (const skill of lastResult?.skills ?? []) owned.add(skill.toLowerCase());
    return owned;
  }, [lastResult]);

  const selectedHave = selectedRole
    ? selectedRole.skills.filter((skill) => ownedSkills.has(skill.toLowerCase()))
    : [];

  return (
    <div className="mx-auto max-w-[1240px] px-5 py-12 sm:px-6">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-3">
            <span className="h-px w-7 bg-clay" aria-hidden="true" />
            <span className="text-[11.5px] font-semibold uppercase tracking-[0.16em] text-moss">
              {content.hero.eyebrow}
            </span>
          </div>
          <h1 className="mt-4 text-[clamp(30px,4vw,42px)] font-extrabold tracking-[-0.03em] text-ink">
            {copy.title}
          </h1>
          <p className="mt-3 max-w-[560px] text-[15.5px] leading-relaxed text-fern">
            {copy.subtitle}
          </p>
          <p className="mt-4 text-[13px] text-moss">
            <span className="font-bold text-clay">{filtered.length}</span> {copy.countSuffix}
          </p>
          {matchBySlug.size > 0 && (
            <p className="mt-1.5 text-[12.5px] font-medium text-clay-deep">{copy.resumeSortHint}</p>
          )}
        </div>

        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={copy.searchPlaceholder}
          className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-[14.5px] text-ink placeholder:text-moss focus:border-clay focus:outline-none focus:ring-2 focus:ring-clay/25 sm:w-[320px]"
        />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((role) => (
          <Link
            key={role.title}
            to={`/roles/${slugify(role.title)}`}
            className="group flex flex-col rounded-xl border border-black/10 bg-white p-5 shadow-[0_1px_2px_rgba(17,55,42,0.04)] transition hover:-translate-y-0.5 hover:border-clay/50 hover:shadow-[0_16px_30px_-22px_rgba(17,55,42,0.6)]"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-[17px] font-bold leading-snug text-ink group-hover:text-clay-deep">
                {role.title}
              </h2>
              <div className="flex shrink-0 flex-col items-end gap-1">
                {matchBySlug.get(slugify(role.title)) !== undefined && (
                  <span className="rounded-md bg-clay px-2 py-1 text-[11px] font-bold text-white">
                    {matchBySlug.get(slugify(role.title))}% match
                  </span>
                )}
                <span className="rounded-md bg-sand px-2 py-1 text-[11px] font-semibold text-fern">
                  {role.seniority}
                </span>
              </div>
            </div>
            <p className="mt-2.5 flex-1 text-[13.5px] leading-relaxed text-fern">{role.summary}</p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {role.skills.slice(0, 6).map((skill) => (
                <span
                  key={skill}
                  className="rounded-md bg-clay-100 px-2 py-1 text-[11px] font-medium text-clay-deep"
                >
                  {skill}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="mt-10 rounded-xl border-2 border-dashed border-black/15 bg-white/40 px-6 py-14 text-center">
          <p className="text-[16px] font-bold text-ink">No roles match “{query}”.</p>
          <p className="mt-1.5 text-[13.5px] text-moss">Try a skill like React, SQL, or Figma.</p>
        </div>
      )}

      {/* ---- Role explorer: pick a role, see exactly what it takes ---- */}
      <section className="mt-10 rounded-2xl border border-black/10 bg-white p-6 shadow-[0_1px_2px_rgba(17,55,42,0.04)] sm:p-7">
        <div className="flex items-center gap-3">
          <span className="h-px w-7 bg-clay" aria-hidden="true" />
          <span className="text-[11.5px] font-semibold uppercase tracking-[0.16em] text-moss">
            {copy.selectLabel}
          </span>
        </div>
        <p className="mt-2 text-[14px] text-fern">{copy.pickerHint}</p>

        <div className="relative mt-4 max-w-[440px]">
          <select
            aria-label={copy.selectLabel}
            value={selectedTitle}
            onChange={(event) => setSelectedTitle(event.target.value)}
            className="w-full appearance-none rounded-xl border border-black/10 bg-cream px-4 py-3 pr-11 text-[15px] font-semibold text-ink focus:border-clay focus:outline-none focus:ring-2 focus:ring-clay/25"
          >
            <option value="">{copy.selectPlaceholder}</option>
            {roles.map((role) => (
              <option key={role.title} value={role.title}>
                {role.title}
              </option>
            ))}
          </select>
          <ChevronDown
            size={18}
            className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-moss"
            aria-hidden="true"
          />
        </div>

        {selectedRole && (
          <div className="mt-5 rounded-xl bg-bone p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-[20px] font-extrabold tracking-[-0.02em] text-ink">
                  {selectedRole.title}
                </h2>
                <p className="mt-0.5 text-[13px] font-semibold text-moss">
                  {selectedRole.seniority}
                </p>
              </div>
              <Link
                to={`/roles/${slugify(selectedRole.title)}`}
                className="rounded-lg bg-forest px-4 py-2 text-[13.5px] font-bold text-white transition hover:bg-forest-deep"
              >
                {copy.viewDetails}
              </Link>
            </div>

            <p className="mt-3 text-[14.5px] leading-relaxed text-fern">
              {selectedRole.summary}
            </p>

            <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-moss">
              {detailCopy.skillsTitle}
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {selectedRole.skills.map((skill) => {
                const owned = ownedSkills.has(skill.toLowerCase());
                return (
                  <span
                    key={skill}
                    className={[
                      'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium',
                      lastResult && owned
                        ? 'bg-[#e7f1d9] text-[#2f6b3f]'
                        : 'border border-black/10 bg-white text-fern',
                    ].join(' ')}
                  >
                    {lastResult && owned && <Check size={13} strokeWidth={3} className="shrink-0" />}
                    {skill}
                  </span>
                );
              })}
            </div>

            {lastResult ? (
              <p className="mt-4 text-[13.5px] text-fern">
                <span className="font-bold text-clay">
                  {detailCopy.youHave} {selectedHave.length} {detailCopy.of}{' '}
                  {selectedRole.skills.length}
                </span>{' '}
                {detailCopy.skillsSuffix}
                {selectedHave.length > 0 && (
                  <>
                    {' '}
                    - {selectedHave.join(', ')}
                  </>
                )}
              </p>
            ) : (
              <p className="mt-4 flex items-center gap-2 text-[13.5px] text-fern">
                <Upload size={14} className="shrink-0 text-clay" />
                {detailCopy.uploadPrompt}
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
