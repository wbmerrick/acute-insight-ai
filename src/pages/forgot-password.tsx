import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { Helmet } from '@dr.pogodin/react-helmet';
import { authClient } from '@/lib/auth/auth-client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      // Always report success — never confirm whether an address has an account.
      await authClient.requestPasswordReset({ email, redirectTo: '/reset-password' }).catch(() => {});
      setSent(true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Helmet><title>Reset password — Acute Insight AI</title><meta name="robots" content="noindex" /></Helmet>
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: 'hsl(var(--background))' }}>
        <form onSubmit={submit} className="w-full max-w-sm rounded-2xl p-7" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border-subtle) / 0.5)' }}>
          <h1 className="text-xl font-semibold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>Reset your password</h1>
          {sent ? (
            <p className="text-sm mt-2" style={{ color: 'hsl(var(--text-dim))' }}>If there's an account for that address, a reset link is on its way. It works for one hour.</p>
          ) : (
            <>
              <p className="text-sm mt-1 mb-5" style={{ color: 'hsl(var(--text-dim))' }}>Enter your email and we'll send a link to choose a new one.</p>
              <input type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="w-full rounded-xl px-4 py-3 text-foreground outline-none" style={{ background: 'hsl(var(--surface-deeper))', border: '1px solid hsl(var(--border-subtle))' }} />
              <button type="submit" disabled={busy || !email} className="w-full mt-4 py-3 rounded-xl font-semibold disabled:opacity-50" style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))', fontFamily: 'var(--font-heading)' }}>{busy ? 'Sending…' : 'Send reset link'}</button>
            </>
          )}
          <p className="text-xs mt-4"><Link to="/login" className="hover:underline" style={{ color: 'hsl(var(--text-dim))' }}>Back to sign in</Link></p>
        </form>
      </div>
    </>
  );
}
