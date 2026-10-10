import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import { content } from '../lib/content';

const googleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ?? '';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Mode = 'signin' | 'signup';

export default function SignInPage({ initialMode = 'signin' }: { initialMode?: Mode }) {
  const copy = content.pages.signin;
  const { user, signInWithGoogle, signInLocal } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (user) {
    return <Navigate to="/profile" replace />;
  }

  const signingUp = mode === 'signup';

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
  }

  function handleLocalSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;

    if (!EMAIL_PATTERN.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Your password must be at least 6 characters long.');
      return;
    }
    if (signingUp && name.trim().length < 2) {
      setError('Please enter your name.');
      return;
    }

    setBusy(true);
    setError(null);
    signInLocal({
      mode,
      ...(signingUp ? { name: name.trim() } : {}),
      email: email.trim().toLowerCase(),
      password,
    })
      .then(() => navigate(signingUp ? '/profile' : '/profile'))
      .catch((cause: unknown) =>
        setError(cause instanceof Error ? cause.message : 'Sign in failed.'),
      )
      .finally(() => setBusy(false));
  }

  return (
    <div className="mx-auto flex max-w-[560px] flex-col items-center px-5 py-16 text-center sm:px-6">
      <span className="grid h-12 w-12 place-items-center rounded-xl bg-forest text-[18px] font-bold text-leaf">
        {content.brand.mark}
      </span>

      <div className="mt-5 flex items-center gap-3">
        <span className="h-px w-6 bg-clay" aria-hidden="true" />
        <span className="text-[11.5px] font-semibold uppercase tracking-[0.16em] text-moss">
          {content.hero.eyebrow}
        </span>
        <span className="h-px w-6 bg-clay" aria-hidden="true" />
      </div>

      <h1 className="mt-4 text-[clamp(30px,4.5vw,40px)] font-extrabold tracking-[-0.03em] text-ink">
        {signingUp ? copy.signupTitle : copy.title}
      </h1>
      <p className="mt-3 text-[15.5px] leading-relaxed text-fern">
        {signingUp ? copy.signupSubtitle : copy.subtitle}
      </p>

      <div className="mt-8 w-full rounded-2xl border border-black/10 bg-white p-7 text-left shadow-[0_1px_2px_rgba(17,55,42,0.04)]">
        {/* Google OAuth - appears automatically once VITE_GOOGLE_CLIENT_ID is set */}
        {googleClientId &&
          (busy ? (
            <div className="flex justify-center py-2">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-black/10 border-t-clay" />
            </div>
          ) : (
            <div className="flex justify-center">
              <GoogleLogin
                theme="outline"
                size="large"
                text="continue_with"
                width={300}
                onSuccess={(credentialResponse) => {
                  const credential = credentialResponse.credential;
                  if (!credential) {
                    setError('Google did not return a credential. Please try again.');
                    return;
                  }
                  setBusy(true);
                  setError(null);
                  signInWithGoogle(credential)
                    .then(() => navigate('/profile'))
                    .catch((cause: unknown) =>
                      setError(cause instanceof Error ? cause.message : 'Sign in failed.'),
                    )
                    .finally(() => setBusy(false));
                }}
                onError={() => setError('Google sign-in failed. Please try again.')}
              />
            </div>
          ))}

        {googleClientId && (
          <div className="mt-5 flex items-center gap-3" aria-hidden="true">
            <span className="h-px flex-1 bg-black/10" />
            <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-moss">
              {copy.or}
            </span>
            <span className="h-px flex-1 bg-black/10" />
          </div>
        )}

        {/* Password sign-in / sign-up */}
        <form onSubmit={handleLocalSubmit} className="mt-4 space-y-3">
          {signingUp && (
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-fern" htmlFor="auth-name">
                {copy.namePlaceholder}
              </label>
              <input
                id="auth-name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={copy.namePlaceholder}
                className="w-full rounded-xl border border-black/10 bg-cream px-4 py-3 text-[14.5px] text-ink placeholder:text-moss focus:border-clay focus:outline-none focus:ring-2 focus:ring-clay/25"
              />
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-fern" htmlFor="auth-email">
              {copy.emailPlaceholder}
            </label>
            <input
              id="auth-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={copy.emailPlaceholder}
              className="w-full rounded-xl border border-black/10 bg-cream px-4 py-3 text-[14.5px] text-ink placeholder:text-moss focus:border-clay focus:outline-none focus:ring-2 focus:ring-clay/25"
            />
          </div>
          <div>
            <label
              className="mb-1.5 block text-[13px] font-semibold text-fern"
              htmlFor="auth-password"
            >
              {copy.passwordPlaceholder}
            </label>
            <input
              id="auth-password"
              type="password"
              autoComplete={signingUp ? 'new-password' : 'current-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={copy.passwordPlaceholder}
              className="w-full rounded-xl border border-black/10 bg-cream px-4 py-3 text-[14.5px] text-ink placeholder:text-moss focus:border-clay focus:outline-none focus:ring-2 focus:ring-clay/25"
            />
            <p className="mt-1.5 text-[12px] text-moss">{copy.passwordHint}</p>
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-forest px-4 py-3 text-[15px] font-bold text-white transition hover:bg-forest-deep disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? '...' : signingUp ? copy.signupCta : copy.signinCta}
          </button>
          <p className="text-[12.5px] leading-snug text-moss">{copy.localNote}</p>
        </form>

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-lg border border-clay/40 bg-clay-100 px-3 py-2 text-[13px] text-clay-deep"
          >
            {error}
          </p>
        )}

        {/* Switch between sign in and sign up */}
        <p className="mt-5 text-[13.5px] text-fern">
          {signingUp ? copy.toSignin : copy.toSignup}{' '}
          <button
            type="button"
            onClick={() => switchMode(signingUp ? 'signin' : 'signup')}
            className="font-bold text-clay underline underline-offset-2 hover:text-clay-deep"
          >
            {signingUp ? copy.signinCta : copy.signupCta}
          </button>
        </p>

        <p className="mt-6 text-[13px] leading-relaxed text-moss">{copy.note}</p>
        <p className="mt-2 text-[13px] text-moss">{copy.noAccount}</p>
      </div>
    </div>
  );
}
