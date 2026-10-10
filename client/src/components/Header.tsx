import { Link, useLocation } from 'react-router-dom';
import { Download } from 'lucide-react';
import { content } from '../lib/content';
import { STATIC_MODE } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import LogoMark from './LogoMark';

// Direct download for the desktop installer (GitHub Release asset).
const INSTALL_URL =
  'https://github.com/saxenavansh070-droid/nextrole/releases/download/v1.0.0/NextRole-Setup-1.0.0.exe';

export default function Header() {
  const { user, signOut } = useAuth();
  const { pathname } = useLocation();

  // Each section is highlighted only on its own pages: Home ("/") is the
  // landing interface, Explore roles covers /roles and its detail pages.
  const isActive = (path: string) =>
    path === '/' ? pathname === '/' : pathname === path || pathname.startsWith(`${path}/`);

  return (
    <header className="sticky top-0 z-40 border-b border-black/10 bg-cream/90 backdrop-blur-sm">
      <div className="mx-auto flex h-[68px] max-w-[1240px] items-center justify-between gap-4 px-5 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5" aria-label="nextrole home">
          <LogoMark />
          <span className="text-[19px] leading-none tracking-tight">
            <span className="font-extrabold text-ink">next</span>
            <span className="font-medium text-moss">role</span>
          </span>
        </Link>

        <nav className="hidden h-full items-stretch gap-8 md:flex" aria-label="Main">
          {content.nav.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={[
                '-mb-px flex items-center border-b-2 pb-0.5 text-[15px] transition-colors',
                isActive(item.path)
                  ? 'border-clay font-semibold text-ink'
                  : 'border-transparent text-fern hover:text-ink',
              ].join(' ')}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {/* One-click installer - only meaningful on the hosted web app. */}
          {STATIC_MODE && (
            <a
              href={INSTALL_URL}
              download=""
              className="hidden items-center gap-1.5 rounded-lg border border-forest/25 px-3.5 py-2 text-[14px] font-semibold text-forest transition hover:bg-forest hover:text-white sm:flex"
            >
              <Download size={15} />
              {content.actions.installDesktop}
            </a>
          )}
          {user ? (
              <>
                <Link
                  to="/profile"
                  className="hidden max-w-[180px] truncate text-[14px] font-medium text-fern hover:text-ink sm:block"
                  title={user.email}
                >
                  {user.name}
                </Link>
                <button
                  type="button"
                  onClick={signOut}
                  className="rounded-lg border border-black/10 px-3.5 py-2 text-[14px] font-semibold text-ink transition hover:bg-black/5"
                >
                  {content.actions.signOut}
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/signin"
                  className="px-1 text-[15px] font-medium text-ink transition hover:opacity-70"
                >
                  {content.actions.signIn}
                </Link>
                <Link
                  to="/signup"
                  className="rounded-lg bg-forest px-4 py-2.5 text-[14px] font-semibold text-white transition hover:bg-forest-deep"
                >
                  {content.actions.createAccount}
                </Link>
              </>
            )}
          </div>
      </div>

      {/* Mobile nav row */}
      <nav className="flex items-stretch gap-6 border-t border-black/5 px-5 sm:px-6 md:hidden" aria-label="Mobile">
        {content.nav.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={[
              'flex-1 border-b-2 py-2.5 text-center text-[14px] transition-colors',
              isActive(item.path)
                ? 'border-clay font-semibold text-ink'
                : 'border-transparent text-fern',
            ].join(' ')}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
