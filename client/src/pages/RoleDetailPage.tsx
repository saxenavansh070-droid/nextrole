import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Upload } from 'lucide-react';
import { fetchLibraryRoles, getLastResult } from '../lib/api';
import { content } from '../lib/content';
import { slugify } from '../lib/slug';
import type { LibraryRole } from '../types';

/**
 * One role, opened from any role card: shows every skill the role needs and -
 * when a resume has been analysed on this device - which of them you already
 * have and which are still to learn.
 */
export default function RoleDetailPage() {
  const copy = content.pages.roleDetail;
  const { slug } = useParams<{ slug: string }>();
  const [roles, setRoles] = useState<LibraryRole[]>(content.roleCatalog);
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

  const role = roles.find((candidate) => slugify(candidate.title) === slug);
  const matchedRole = lastResult?.roles.find((candidate) => slugify(candidate.title) === slug);

  const ownedSkills = useMemo(() => {
    const owned = new Set<string>();
    for (const skill of lastResult?.skills ?? []) owned.add(skill.toLowerCase());
    return owned;
  }, [lastResult]);

  if (!role) {
    return (
      <div className="mx-auto max-w-[820px] px-5 py-16 sm:px-6">
        <div className="rounded-2xl border-2 border-dashed border-black/15 bg-white/60 px-6 py-14 text-center">
          <p className="text-[18px] font-bold text-ink">{copy.notFound}</p>
          <Link
            to="/roles"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-forest px-5 py-3 text-[14.5px] font-bold text-white transition hover:bg-forest-deep"
          >
            <ArrowLeft size={16} />
            {copy.notFoundCta}
          </Link>
        </div>
      </div>
    );
  }

  const has = role.skills.filter((skill) => ownedSkills.has(skill.toLowerCase()));
  const missing = role.skills.filter((skill) => !ownedSkills.has(skill.toLowerCase()));
  const coverage = role.skills.length > 0 ? Math.round((has.length / role.skills.length) * 100) : 0;

  return (
    <div className="mx-auto max-w-[900px] px-5 py-12 sm:px-6">
      <Link
        to="/roles"
        className="inline-flex items-center gap-2 text-[14px] font-semibold text-moss transition hover:text-ink"
      >
        <ArrowLeft size={15} />
        {copy.backToRoles}
      </Link>

      {/* Role header */}
      <div className="mt-6 rounded-2xl border border-black/10 bg-white p-6 shadow-[0_1px_2px_rgba(17,55,42,0.04)] sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-3">
              <span className="h-px w-7 bg-clay" aria-hidden="true" />
              <span className="text-[11.5px] font-semibold uppercase tracking-[0.16em] text-moss">
                {content.hero.eyebrow}
              </span>
            </div>
            <h1 className="mt-3 text-[clamp(26px,3.6vw,38px)] font-extrabold tracking-[-0.03em] text-ink">
              {role.title}
            </h1>
            <p className="mt-1.5 text-[14px] font-semibold text-moss">{role.seniority}</p>
          </div>
          {matchedRole && (
            <span className="rounded-full bg-clay-100 px-3.5 py-1.5 text-[13.5px] font-bold text-clay-deep">
              {matchedRole.matchPercent}
              {content.roles.matchSuffix}
            </span>
          )}
        </div>
        <p className="mt-4 text-[15.5px] leading-relaxed text-fern">{role.summary}</p>
        {matchedRole?.why && (
          <p className="mt-4 rounded-xl bg-bone px-4 py-3 text-[14px] leading-relaxed text-fern">
            {matchedRole.why}
          </p>
        )}
      </div>

      {/* Skills required */}
      <section className="mt-6 rounded-2xl border border-black/10 bg-white p-6 shadow-[0_1px_2px_rgba(17,55,42,0.04)] sm:p-7">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-moss">
          {copy.skillsTitle}
        </p>
        <p className="mt-1 text-[13.5px] text-moss">{copy.skillsNote}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {role.skills.map((skill) => {
            const owned = ownedSkills.has(skill.toLowerCase());
            return (
              <span
                key={skill}
                className={[
                  'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium',
                  owned
                    ? 'bg-[#e7f1d9] text-[#2f6b3f]'
                    : 'border border-black/10 bg-sand text-fern',
                ].join(' ')}
                title={lastResult ? (owned ? undefined : copy.skillsTitle) : undefined}
              >
                {owned && <Check size={13} strokeWidth={3} className="shrink-0" />}
                {skill}
              </span>
            );
          })}
        </div>

        {/* Fit summary against your resume */}
        <div className="mt-6 rounded-xl bg-bone p-5">
          {lastResult ? (
            <>
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-[15px] font-bold text-ink">
                  {copy.youHave} <span className="text-clay">{has.length}</span> {copy.of}{' '}
                  {role.skills.length} {copy.skillsSuffix}
                </p>
                <p className="text-[14px] font-bold text-clay">{coverage}%</p>
              </div>
              <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-black/10">
                <div
                  className="h-full rounded-full bg-forest transition-[width] duration-500"
                  style={{ width: `${coverage}%` }}
                  role="progressbar"
                  aria-valuenow={coverage}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={copy.fitTitle}
                />
              </div>
              {missing.length > 0 && (
                <p className="mt-3 text-[13.5px] leading-relaxed text-fern">
                  <span className="font-semibold text-ink">{missing.join(', ')}</span>
                </p>
              )}
            </>
          ) : (
            <p className="text-[14.5px] leading-relaxed text-fern">{copy.uploadPrompt}</p>
          )}
        </div>

        <Link
          to="/"
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-clay px-5 py-3 text-[14.5px] font-bold text-white transition hover:bg-clay-deep"
        >
          <Upload size={16} />
          {copy.cta}
        </Link>
      </section>
    </div>
  );
}
