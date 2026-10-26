import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Helmet } from '@dr.pogodin/react-helmet';
import { authClient } from '@/lib/auth/auth-client';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') ?? '';
  const invalid = params.get('error') === 'INVALID_TOKEN' || !token;
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr('');
    if (pw.length < 8) return setErr('Use at least 8 characters.');
    if (pw !== pw2) return setErr("Those don't match.");
    setBusy(true);
    try {
      const r = await authClient.resetPassword({ newPassword: pw, token });
      if (r.error) { setErr('This link is no longer valid. Request a new one.'); return; }
      navigate('/login?reset=1', { replace: true });
    } finally {
      setBusy(false);
    }
  }
  const field: React.CSSProperties = { background: 'hsl(var(--surface-deeper))', border: '1px solid hsl(var(--border-subtle))', borderRadius: 12, padding: '12px 14px', color: 'hsl(var(--foreground))', width: '100%', outline: 'none' };
  return (
    <>
      <Helmet><title>Choose a new password — Acute Insight AI</title><meta name="robots" content="noindex" /></Helmet>
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: 'hsl(var(--background))' }}>
        <form onSubmit={submit} className="w-full max-w-sm rounded-2xl p-7 grid gap-3" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border-subtle) / 0.5)' }}>
          <h1 className="text-xl font-semibold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>Choose a new password</h1>
          {invalid ? (
            <p className="text-sm" style={{ color: 'hsl(var(--text-dim))' }}>This reset link is missing or expired. <Link to="/forgot-password" className="hover:underline" style={{ color: 'hsl(var(--primary))' }}>Request a new one</Link>.</p>
          ) : (
            <>
              <input type="password" autoComplete="new-password" required value={pw} onChange={(e) => setPw(e.target.value)} placeholder="New password" style={field} autoFocus />
              <input type="password" autoComplete="new-password" required value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="Repeat it" style={field} />
              {err && <p className="text-xs" style={{ color: 'hsl(var(--destructive))' }}>{err}</p>}
              <button type="submit" disabled={busy} className="w-full py-3 rounded-xl font-semibold disabled:opacity-50" style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))', fontFamily: 'var(--font-heading)' }}>{busy ? 'Saving…' : 'Save password'}</button>
            </>
          )}
        </form>
      </div>
    </>
  );
}
