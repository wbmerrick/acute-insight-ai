import { useState, FormEvent } from 'react';
import { Navigate, useNavigate, Link } from 'react-router';
import { Helmet } from '@dr.pogodin/react-helmet';
import { signUp, useSession } from '@/lib/auth/auth-client';
import { signup } from 'virtual:content';

export default function SignupPage() {
  const { isAuthenticated, isPending } = useSession();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) return <Navigate to="/portal" replace />;

  function validatePassword(pwd: string): string | null {
    if (pwd.length < 8) return 'Password must be at least 8 characters';
    if (!/[A-Z]/.test(pwd)) return 'Must include an uppercase letter';
    if (!/[0-9]/.test(pwd)) return 'Must include a number';
    if (!/[!@#$%^&*(),.?":{}|<>_\-+=[\]\\/`~]/.test(pwd)) return 'Must include a special character';
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    const pwdErr = validatePassword(password);
    if (pwdErr) { setError(pwdErr); return; }
    setLoading(true);
    try {
      const result = await signUp.email({ email, password, name });
      if (result.error) {
        setError(result.error.message || 'Could not create account.');
        return;
      }
      navigate('/portal', { replace: true });
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: `hsl(var(--background))` }}>
        <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: `hsl(var(--primary))`, borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Create Account — Acute Insight AI</title>
        <meta name="description" content="Create your Acute Insight AI patient account." />
        <meta name="robots" content="noindex" />
      </Helmet>

      <main
        className="min-h-screen flex items-center justify-center px-4 py-16"
        style={{ background: `hsl(var(--background))` }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
          style={{ background: `radial-gradient(ellipse 50% 40% at 50% 30%, hsl(var(--primary) / 0.06) 0%, transparent 70%)` }}
        />

        <div className="relative z-10 w-full max-w-md">
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
                {signup.brandName}
              </span>
            </Link>
            <h1 className="text-3xl font-bold text-foreground mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
              {signup.heading}
            </h1>
            <p className="text-muted-foreground text-sm" style={{ fontFamily: 'var(--font-sans)' }}>
              {signup.subheading}
            </p>
          </div>

          <div
            className="rounded-2xl p-8"
            style={{
              background: `hsl(var(--card))`,
              border: `1px solid hsl(var(--primary) / 0.15)`,
              boxShadow: `0 0 40px hsl(var(--primary) / 0.06)`,
            }}
          >
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
              {[
                { id: 'name', label: signup.nameLabel, type: 'text', value: name, setter: setName, placeholder: 'Jane Smith', required: false },
                { id: 'email', label: signup.emailLabel, type: 'email', value: email, setter: setEmail, placeholder: 'you@example.com', required: true },
                { id: 'password', label: signup.passwordLabel, type: 'password', value: password, setter: setPassword, placeholder: 'Min 8 chars, A-Z, 0-9, symbol', required: true },
              ].map((field) => (
                <div key={field.id}>
                  <label
                    htmlFor={field.id}
                    className="block text-sm font-medium mb-2"
                    style={{ fontFamily: 'var(--font-sans)', color: `hsl(var(--foreground) / 0.8)` }}
                  >
                    {field.label}
                  </label>
                  <input
                    id={field.id}
                    type={field.type}
                    value={field.value}
                    onChange={(e) => field.setter(e.target.value)}
                    required={field.required}
                    disabled={loading}
                    placeholder={field.placeholder}
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
              ))}

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
                {loading ? 'Creating account…' : signup.submitButton}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground" style={{ fontFamily: 'var(--font-sans)' }}>
              <span>{signup.hasAccountText}</span>{' '}
              <Link to="/login" className="font-medium text-primary hover:underline">
                {signup.hasAccountLink}
              </Link>
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
