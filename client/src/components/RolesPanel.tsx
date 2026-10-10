import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { content } from '../lib/content';
import { slugify } from '../lib/slug';
import type { AnalyzeResult, AnalyzeStatus, RoleMatch } from '../types';

type RolesPanelProps = {
  status: AnalyzeStatus;
  result: AnalyzeResult | null;
};

function RoleCard({ role }: { role: RoleMatch }) {
  return (
    <Link
      to={`/roles/${slugify(role.title)}`}
      className="block rounded-xl border border-black/10 bg-white p-5 shadow-[0_1px_2px_rgba(17,55,42,0.04)] transition hover:border-clay/50 hover:shadow-[0_10px_26px_-18px_rgba(17,55,42,0.5)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate text-[17px] font-bold text-ink">{role.title}</h3>
          <p className="mt-0.5 text-[12.5px] font-medium text-moss">{role.seniority}</p>
        </div>
        <span className="shrink-0 rounded-full bg-clay-100 px-2.5 py-1 text-[12px] font-bold text-clay-deep">
          {role.matchPercent}
          {content.roles.matchSuffix}
        </span>
      </div>

      <p className="mt-3 text-[14px] leading-relaxed text-fern">{role.why}</p>

      {role.skills.length > 0 && (
        <div className="mt-3.5 flex flex-wrap gap-1.5">
          {role.skills.map((skill) => (
            <span
              key={skill}
              className="rounded-md bg-sand px-2 py-1 text-[11.5px] font-medium text-fern"
            >
              {skill}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}

export default function RolesPanel({ status, result }: RolesPanelProps) {
  const copy = content.roles;
  const loading = status === 'loading';
  const ready = status === 'ready' && result !== null;
  const count = ready ? result.roles.length : 0;

  return (
    <section aria-label={copy.title}>
      <div className="flex items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-clay text-[12px] font-semibold text-clay">
            {copy.step}
          </span>
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-moss">
              {copy.label}
            </p>
            <p className="text-[21px] font-bold leading-tight text-ink">{copy.title}</p>
          </div>
        </div>
        <p className="shrink-0 text-right leading-none">
          <span className="text-[30px] font-extrabold text-clay">{count}</span>{' '}
          <span className="text-[13px] text-moss">{copy.found}</span>
        </p>
      </div>

      {/* Idle notice bar */}
      {!loading && !ready && (
        <div className="mt-5 flex items-center gap-3 rounded-lg bg-bone px-4 py-3.5">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-clay text-white">
            <Plus size={13} strokeWidth={3} />
          </span>
          <p className="text-[13.5px] leading-snug text-fern">{copy.notice}</p>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="mt-4 rounded-xl border border-black/10 bg-white/60 p-5">
          <p className="text-[14px] font-semibold text-ink">{copy.loadingTitle}</p>
          <div className="mt-4 space-y-3">
            {[0, 1, 2].map((row) => (
              <div key={row} className="animate-pulse space-y-2.5 rounded-lg bg-sand p-4">
                <div className="h-3.5 w-1/3 rounded bg-clay-100" />
                <div className="h-3 w-2/3 rounded bg-black/5" />
                <div className="h-3 w-1/2 rounded bg-black/5" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !ready && (
        <div className="mt-4 grid min-h-[300px] place-items-center rounded-xl border-2 border-dashed border-black/15 bg-white/40 px-6 py-10 text-center">
          <div>
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-clay-100 text-[18px] font-bold text-clay">
              {content.brand.mark}
            </span>
            <p className="mt-4 text-[17px] font-bold text-ink">{copy.emptyTitle}</p>
            <p className="mt-1.5 text-[13.5px] text-moss">{copy.emptyText}</p>
          </div>
        </div>
      )}

      {/* Results */}
      {ready && result && (
        <div className="mt-5">
          {result.summary && (
            <div className="rounded-xl border border-black/10 bg-white p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-moss">
                {copy.summaryLabel}
              </p>
              <p className="mt-1.5 text-[15px] leading-relaxed text-ink">{result.summary}</p>
            </div>
          )}

          {result.skills.length > 0 && (
            <div className="mt-4 rounded-xl border border-black/10 bg-white p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-moss">
                {copy.skillsLabel}
              </p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {result.skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-md bg-sand px-2 py-1 text-[12px] font-medium text-fern"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 space-y-3.5">
            {result.roles.map((role) => (
              <RoleCard key={`${role.title}-${role.matchPercent}`} role={role} />
            ))}
          </div>

          {result.source === 'local' && (
            <p className="mt-4 text-[12.5px] text-moss">{copy.sourceLocal}</p>
          )}
        </div>
      )}
    </section>
  );
}
