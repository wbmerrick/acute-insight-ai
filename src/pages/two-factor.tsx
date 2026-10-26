import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router';
import { Helmet } from '@dr.pogodin/react-helmet';
import { authClient } from '@/lib/auth/auth-client';

/**
 * Second step of sign-in for accounts with MFA on. better-auth redirects here
 * after the password is accepted; the session only exists once the code checks out.
 */
export default function TwoFactorPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const from = params.get('from') || '/portal';
  const [code, setCode] = useState('');
  const [useBackup, setUseBackup] = useState(false);
  const [trust, setTrust] = useState(true);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      const clean = code.replace(/\s+/g, '');
      const r = useBackup
        ? await authClient.twoFactor.verifyBackupCode({ code: clean, trustDevice: trust })
        : await authClient.twoFactor.verifyTotp({ code: clean, trustDevice: trust });
      if (r.error) {
        setErr(useBackup ? 'That backup code did not work.' : 'That code did not work. Codes change every 30 seconds — try the current one.');
        return;
      }
      navigate(from, { replace: true });
    } catch {
      setErr('Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  }

  const input: React.CSSProperties = { background: 'hsl(var(--surface-deeper))', border: '1px solid hsl(var(--border-subtle))', borderRadius: 12, padding: '12px 14px', color: 'hsl(var(--foreground))', fontSize: 20, letterSpacing: useBackup ? '0.05em' : '0.3em', textAlign: 'center', fontFamily: 'var(--font-mono)', width: '100%', outline: 'none' };

  return (
    <>
      <Helmet><title>Verify it's you — Acute Insight AI</title><meta name="robots" content="noindex" /></Helmet>
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: 'hsl(var(--background))' }}>
        <form onSubmit={submit} className="w-full max-w-sm rounded-2xl p-7" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border-subtle) / 0.5)' }}>
          <h1 className="text-xl font-semibold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>Verify it's you</h1>
          <p className="text-sm mt-1 mb-5" style={{ color: 'hsl(var(--text-dim))' }}>
            {useBackup ? 'Enter one of your backup codes. Each works once.' : 'Enter the 6-digit code from your authenticator app.'}
          </p>
          <input
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value)}
            inputMode={useBackup ? 'text' : 'numeric'}
            autoComplete="one-time-code"
            placeholder={useBackup ? 'xxxxx-xxxxx' : '000000'}
            maxLength={useBackup ? 16 : 6}
            style={input}
          />
          <label className="flex items-center gap-2 text-xs mt-3" style={{ color: 'hsl(var(--text-dim))' }}>
            <input type="checkbox" checked={trust} onChange={(e) => setTrust(e.target.checked)} /> Trust this device for 30 days
          </label>
          {err && <p className="text-xs mt-3" style={{ color: 'hsl(var(--destructive))' }}>{err}</p>}
          <button type="submit" disabled={busy || code.replace(/\s+/g, '').length < 6} className="w-full mt-4 py-3 rounded-xl font-semibold disabled:opacity-50" style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))', fontFamily: 'var(--font-heading)' }}>
            {busy ? 'Checking…' : 'Continue'}
          </button>
          <div className="flex justify-between mt-4 text-xs" style={{ color: 'hsl(var(--text-dim))' }}>
            <button type="button" onClick={() => { setUseBackup((v) => !v); setCode(''); setErr(''); }} className="hover:underline">{useBackup ? 'Use authenticator app' : 'Use a backup code'}</button>
            <Link to="/login" className="hover:underline">Start over</Link>
          </div>
        </form>
      </div>
    </>
  );
}
