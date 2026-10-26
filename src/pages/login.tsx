import { useState, FormEvent } from 'react';
import { Navigate, useNavigate, useLocation, Link } from 'react-router';
import { Helmet } from '@dr.pogodin/react-helmet';
import { signIn, useSession } from '@/lib/auth/auth-client';
import { toSafeInternalPath } from '@/lib/auth/safe-redirect';
import { login } from 'virtual:content';

export default function LoginPage() {
  const { isAuthenticated, isPending } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const searchFrom = toSafeInternalPath(new URLSearchParams(location.search).get('from'));
  const from: string = (location.state as { from?: Location })?.from?.pathname || searchFrom || '/portal';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) return <Navigate to={from} replace />;

  const idleNotice = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('idle') === '1';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // If MFA kicks in, the client redirects to /2fa?from=… so we land in the right place after.
      if (from && from !== '/portal') window.history.replaceState(null, '', `/login?from=${encodeURIComponent(from)}`);
      const result = await signIn.email({ email, password });
      if (result.error) {
        setError(result.error.message || 'Invalid email or password.');
        return;
      }
      navigate(from, { replace: true });
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (isPending) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: `hsl(var(--background))` }}
      >
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: `hsl(var(--primary))`, borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Sign In — Acute Insight AI</title>
        <meta name="description" content="Sign in to your Acute Insight AI patient portal." />
        <meta name="robots" content="noindex" />
      </Helmet>

      <main
        className="min-h-screen flex items-center justify-center px-4 py-16"
        style={{ background: `hsl(var(--background))` }}
      >
        {/* Background glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
          style={{
            background: `radial-gradient(ellipse 50% 40% at 50% 30%, hsl(var(--primary) / 0.06) 0%, transparent 70%)`,
          }}
        />

        <div className="relative z-10 w-full max-w-md">
          {/* Logo / brand */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 mb-6">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: `hsl(var(--primary) / 0.15)`, border: `1px solid hsl(var(--primary) / 0.3)` }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="2">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                </svg>
              </div>
              <span className="text-sm font-semibold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
                {login.brandName}
              </span>
            </Link>
            <h1
              className="text-3xl font-bold text-foreground mb-2"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              {login.heading}
            </h1>
            <p className="text-muted-foreground text-sm" style={{ fontFamily: 'var(--font-sans)' }}>
              {login.subheading}
            </p>
          </div>

          {/* Card */}
          <div
            className="rounded-2xl p-8"
            style={{
              background: `hsl(var(--card))`,
              border: `1px solid hsl(var(--primary) / 0.15)`,
              boxShadow: `0 0 40px hsl(var(--primary) / 0.06)`,
            }}
          >
            {idleNotice && !error && (
                <p className="text-xs mb-3 px-3 py-2 rounded-lg" style={{ background: 'hsl(var(--warning) / 0.08)', border: '1px solid hsl(var(--warning) / 0.35)', color: 'hsl(var(--foreground))' }}>You were signed out after a period of inactivity. Sign in to pick up where you left off.</p>
              )}
              {error && (
              <div
                className="mb-5 px-4 py-3 rounded-xl text-sm"
                style={{
                  background: `hsl(var(--destructive) / 0.1)`,
                  border: `1px solid hsl(var(--destructive) / 0.3)`,
                  color: `hsl(var(--destructive))`,
                  fontFamily: 'var(--font-sans)',
                }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium mb-2"
                  style={{ fontFamily: 'var(--font-sans)', color: `hsl(var(--foreground) / 0.8)` }}
                >
                  {login.emailLabel}
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200 disabled:opacity-50"
                  style={{
                    background: `hsl(var(--background))`,
                    border: `1px solid hsl(var(--border-subtle) / 0.6)`,
                    color: `hsl(var(--foreground))`,
                    fontFamily: 'var(--font-sans)',
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = `hsl(var(--primary) / 0.6)`)}
                  onBlur={(e) => (e.currentTarget.style.borderColor = `hsl(var(--border-subtle) / 0.6)`)}
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium mb-2"
                  style={{ fontFamily: 'var(--font-sans)', color: `hsl(var(--foreground) / 0.8)` }}
                >
                  {login.passwordLabel}
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200 disabled:opacity-50"
                  style={{
                    background: `hsl(var(--background))`,
                    border: `1px solid hsl(var(--border-subtle) / 0.6)`,
                    color: `hsl(var(--foreground))`,
                    fontFamily: 'var(--font-sans)',
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = `hsl(var(--primary) / 0.6)`)}
                  onBlur={(e) => (e.currentTarget.style.borderColor = `hsl(var(--border-subtle) / 0.6)`)}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-50 mt-1"
                style={{
                  background: `hsl(var(--primary))`,
                  color: `hsl(var(--background))`,
                  fontFamily: 'var(--font-sans)',
                  boxShadow: `0 0 20px hsl(var(--primary) / 0.25)`,
                }}
              >
                {loading ? 'Signing in…' : login.submitButton}
              </button>
              <p className="text-right mt-2">
                <Link to="/forgot-password" className="text-xs hover:underline" style={{ color: 'hsl(var(--text-dim))' }}>Forgot your password?</Link>
              </p>
            </form>

            <p
              className="mt-6 text-center text-sm text-muted-foreground"
              style={{ fontFamily: 'var(--font-sans)' }}
            >
              <span>{login.noAccountText}</span>{' '}
              <Link to="/signup" className="font-medium text-primary hover:underline">
                {login.noAccountLink}
              </Link>
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
