import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { deleteAnalysis, fetchProfile } from '../lib/api';
import { content } from '../lib/content';
import type { SavedAnalysis } from '../types';

export default function ProfilePage() {
  const copy = content.pages.profile;
  const { user, token } = useAuth();
  const [analyses, setAnalyses] = useState<SavedAnalysis[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchProfile();
      setAnalyses(data.analyses);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load your profile.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function remove(id: string) {
    try {
      await deleteAnalysis(id);
      setAnalyses((current) => current.filter((item) => item.id !== id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not remove that analysis.');
    }
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-[720px] px-5 py-20 text-center sm:px-6">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-clay-100 text-[18px] font-bold text-clay">
          {content.brand.mark}
        </span>
        <h1 className="mt-5 text-[clamp(28px,4vw,38px)] font-extrabold tracking-[-0.03em] text-ink">
          {copy.title}
        </h1>
        <p className="mt-3 text-[15.5px] text-fern">{copy.signInPrompt}</p>
        <Link
          to="/signin"
          className="mt-6 inline-block rounded-lg bg-forest px-5 py-3 text-[14.5px] font-semibold text-white transition hover:bg-forest-deep"
        >
          {content.actions.signIn}
        </Link>
      </div>
    );
  }

  const latest = analyses[0];

  return (
    <div className="mx-auto max-w-[1240px] px-5 py-12 sm:px-6">
      <div className="flex items-center gap-3">
        <span className="h-px w-7 bg-clay" aria-hidden="true" />
        <span className="text-[11.5px] font-semibold uppercase tracking-[0.16em] text-moss">
          {content.hero.eyebrow}
        </span>
      </div>

      <div className="mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-[clamp(30px,4vw,42px)] font-extrabold tracking-[-0.03em] text-ink">
            {copy.title}
          </h1>
          <p className="mt-2.5 text-[15.5px] text-fern">{copy.subtitle}</p>
        </div>
        <p className="text-[13.5px] text-moss">
          <span className="font-bold text-clay">{analyses.length}</span> {copy.analysesFound}
        </p>
      </div>

      <div className="mt-7 grid gap-5 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        {/* Account card */}
        <aside className="rounded-2xl bg-forest p-6 text-white">
          <div className="flex items-center gap-3">
            {user.picture ? (
              <img
                src={user.picture}
                alt=""
                className="h-11 w-11 rounded-full border border-white/30"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="grid h-11 w-11 place-items-center rounded-full bg-clay text-[16px] font-bold">
                {user.name.charAt(0).toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-[16px] font-bold leading-tight">{user.name}</p>
              <p className="truncate text-[12.5px] text-white/60">{user.email}</p>
            </div>
          </div>

          {latest && (
            <div className="mt-5 rounded-xl bg-white/10 p-4">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-white/55">
                {copy.topRole}
              </p>
              <p className="mt-1.5 text-[17px] font-bold leading-tight">
                {latest.roles[0]?.title ?? '—'}
              </p>
              {latest.roles[0] && (
                <p className="mt-0.5 text-[12.5px] text-leaf">
                  {latest.roles[0].matchPercent}
                  {content.roles.matchSuffix}
                </p>
              )}
            </div>
          )}

          <Link
            to="/"
            className="mt-5 block rounded-lg bg-clay px-4 py-2.5 text-center text-[14px] font-bold text-white transition hover:bg-clay-deep"
          >
            {copy.openHome}
          </Link>
        </aside>

        {/* History */}
        <section>
          <h2 className="text-[17px] font-bold text-ink">{copy.historyTitle}</h2>

          {error && (
            <p className="mt-3 rounded-lg border border-clay/40 bg-clay-100 px-3 py-2 text-[13px] text-clay-deep">
              {error}
            </p>
          )}

          {loading && (
            <div className="mt-4 space-y-3">
              {[0, 1].map((row) => (
                <div key={row} className="h-24 animate-pulse rounded-xl bg-bone" />
              ))}
            </div>
          )}

          {!loading && analyses.length === 0 && (
            <div className="mt-4 rounded-xl border-2 border-dashed border-black/15 bg-white/40 px-6 py-12 text-center">
              <p className="text-[16px] font-bold text-ink">{copy.emptyTitle}</p>
              <p className="mt-1.5 text-[13.5px] text-moss">{copy.emptyText}</p>
              <Link
                to="/"
                className="mt-5 inline-block rounded-lg bg-forest px-4 py-2.5 text-[14px] font-semibold text-white transition hover:bg-forest-deep"
              >
                {copy.openHome}
              </Link>
            </div>
          )}

          {!loading && analyses.length > 0 && (
            <div className="mt-4 space-y-3.5">
              {analyses.map((item) => (
                <article key={item.id} className="rounded-xl border border-black/10 bg-white p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-[15.5px] font-bold text-ink">
                        {item.roles[0]?.title ?? content.roles.title}
                        {item.roles[0] && (
                          <span className="ml-2 rounded-full bg-clay-100 px-2 py-0.5 text-[11.5px] font-bold text-clay-deep">
                            {item.roles[0].matchPercent}
                            {content.roles.matchSuffix}
                          </span>
                        )}
                      </p>
                      <p className="mt-1 text-[12.5px] text-moss">
                        {new Date(item.createdAt).toLocaleString()} · {item.roles.length}{' '}
                        {content.roles.found}
                        {item.fileName ? ` · ${item.fileName}` : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(item.id)}
                      className="shrink-0 rounded-lg border border-black/10 px-3 py-1.5 text-[12.5px] font-semibold text-fern transition hover:bg-black/5"
                    >
                      {copy.deleteOne}
                    </button>
                  </div>

                  {item.summary && (
                    <p className="mt-3 text-[13.5px] leading-relaxed text-fern">{item.summary}</p>
                  )}

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {item.skills.slice(0, 10).map((skill) => (
                      <span
                        key={skill}
                        className="rounded-md bg-sand px-2 py-1 text-[11.5px] font-medium text-fern"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
