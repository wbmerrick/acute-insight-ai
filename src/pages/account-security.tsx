import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { Helmet } from '@dr.pogodin/react-helmet';
import QRCode from 'qrcode';
import { authClient, useSession, ProtectedRoute } from '@/lib/auth/auth-client';

/** Turn MFA on or off. Enabling: password → scan QR → confirm one code → save backup codes. */
function SecurityContent() {
  const { user } = useSession();
  const enabled = !!(user as { twoFactorEnabled?: boolean } | null)?.twoFactorEnabled;
  const [step, setStep] = useState<'idle' | 'password' | 'scan' | 'done' | 'disable'>('idle');
  const [password, setPassword] = useState('');
  const [uri, setUri] = useState('');
  const [qr, setQr] = useState('');
  const [codes, setCodes] = useState<string[]>([]);
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!uri) return;
    QRCode.toDataURL(uri, { margin: 1, width: 220, color: { dark: '#0b0f14', light: '#ffffff' } }).then(setQr).catch(() => setQr(''));
  }, [uri]);

  async function start(e: FormEvent) {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      const r = await authClient.twoFactor.enable({ password, issuer: 'Acute Insight' });
      if (r.error || !r.data) { setErr(r.error?.message || 'Could not start setup — check your password.'); return; }
      setUri(r.data.totpURI);
      setCodes(r.data.backupCodes);
      setStep('scan');
    } finally {
      setBusy(false);
    }
  }

  async function confirm(e: FormEvent) {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      const r = await authClient.twoFactor.verifyTotp({ code: code.replace(/\s+/g, '') });
      if (r.error) { setErr('That code did not match. Try the current code from your app.'); return; }
      setStep('done');
      window.setTimeout(() => window.location.reload(), 4000);
    } finally {
      setBusy(false);
    }
  }

  async function disable(e: FormEvent) {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      const r = await authClient.twoFactor.disable({ password });
      if (r.error) { setErr(r.error.message || 'Could not turn off — check your password.'); return; }
      window.location.reload();
    } finally {
      setBusy(false);
    }
  }

  const secret = (() => { try { return new URL(uri).searchParams.get('secret') ?? ''; } catch { return ''; } })();
  const field: React.CSSProperties = { background: 'hsl(var(--surface-deeper))', border: '1px solid hsl(var(--border-subtle))', borderRadius: 10, padding: '10px 12px', color: 'hsl(var(--foreground))', fontSize: 14, width: '100%', outline: 'none' };
  const primary: React.CSSProperties = { background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))', border: 0, borderRadius: 10, padding: '10px 16px', fontFamily: 'var(--font-heading)', fontWeight: 600, cursor: 'pointer' };

  return (
    <div className="min-h-screen px-6 py-10" style={{ background: 'hsl(var(--background))' }}>
      <div className="max-w-lg mx-auto">
        <Link to="/portal" className="text-xs" style={{ color: 'hsl(var(--text-dim))' }}>← Back</Link>
        <h1 className="text-2xl font-semibold text-foreground mt-3" style={{ fontFamily: 'var(--font-heading)' }}>Account security</h1>
        <p className="text-sm mt-1 mb-6" style={{ color: 'hsl(var(--text-dim))' }}>Two-step verification adds a code from your phone to your password. Required for clinician and admin accounts before seeing patient records.</p>

        <div className="rounded-2xl p-6" style={{ background: 'hsl(var(--card))', border: `1px solid hsl(${enabled ? 'var(--primary)' : 'var(--border-subtle)'} / 0.45)` }}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Two-step verification</p>
              <p className="text-xs mt-0.5" style={{ color: enabled ? 'hsl(var(--primary))' : 'hsl(var(--text-dim))' }}>{enabled ? 'On — authenticator app' : 'Off'}</p>
            </div>
            {step === 'idle' && (
              enabled
                ? <button type="button" onClick={() => setStep('disable')} className="text-xs px-3 py-1.5 rounded-lg" style={{ color: 'hsl(var(--text-dim))', border: '1px solid hsl(var(--border-subtle) / 0.6)' }}>Turn off</button>
                : <button type="button" onClick={() => setStep('password')} style={primary}>Turn on</button>
            )}
          </div>

          {step === 'password' && (
            <form onSubmit={start} className="mt-5 grid gap-3">
              <label className="text-xs" style={{ color: 'hsl(var(--text-dim))' }}>Confirm your password to begin
                <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ ...field, marginTop: 6 }} autoFocus />
              </label>
              {err && <p className="text-xs" style={{ color: 'hsl(var(--destructive))' }}>{err}</p>}
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => { setStep('idle'); setPassword(''); }} className="text-sm px-3 py-2" style={{ color: 'hsl(var(--text-dim))' }}>Cancel</button>
                <button type="submit" disabled={busy || !password} style={{ ...primary, opacity: busy || !password ? 0.5 : 1 }}>{busy ? 'Working…' : 'Continue'}</button>
              </div>
            </form>
          )}

          {step === 'scan' && (
            <form onSubmit={confirm} className="mt-5 grid gap-4">
              <div>
                <p className="text-sm text-foreground font-medium">1. Scan this with your authenticator app</p>
                <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-dim))' }}>Google Authenticator, 1Password, Authy, Microsoft Authenticator — any TOTP app.</p>
                <div className="mt-3 flex items-start gap-4 flex-wrap">
                  {qr ? <img src={qr} alt="Scan to add Acute Insight to your authenticator" width={220} height={220} className="rounded-xl" /> : <div style={{ width: 220, height: 220 }} />}
                  <div className="text-xs" style={{ color: 'hsl(var(--text-dim))', maxWidth: 220 }}>
                    Can't scan? Enter this key manually:
                    <code className="block mt-1 p-2 rounded break-all text-foreground" style={{ background: 'hsl(var(--surface-deeper))', fontFamily: 'var(--font-mono)' }}>{secret}</code>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-sm text-foreground font-medium">2. Save these backup codes somewhere safe</p>
                <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-dim))' }}>Each works once if you lose your phone. They are shown only now.</p>
                <div className="mt-2 grid grid-cols-2 gap-1 p-3 rounded-lg" style={{ background: 'hsl(var(--surface-deeper))', fontFamily: 'var(--font-mono)', fontSize: 13, color: 'hsl(var(--foreground))' }}>
                  {codes.map((c) => <span key={c}>{c}</span>)}
                </div>
                <button type="button" onClick={() => { void navigator.clipboard?.writeText(codes.join('\n')); }} className="text-xs mt-2 hover:underline" style={{ color: 'hsl(var(--primary))' }}>Copy codes</button>
              </div>
              <div>
                <p className="text-sm text-foreground font-medium">3. Enter the code your app shows now</p>
                <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000" style={{ ...field, marginTop: 6, fontFamily: 'var(--font-mono)', letterSpacing: '0.3em', textAlign: 'center', fontSize: 18 }} />
              </div>
              {err && <p className="text-xs" style={{ color: 'hsl(var(--destructive))' }}>{err}</p>}
              <div className="flex gap-2 justify-end">
                <button type="submit" disabled={busy || code.replace(/\s+/g, '').length !== 6} style={{ ...primary, opacity: busy || code.length < 6 ? 0.5 : 1 }}>{busy ? 'Checking…' : 'Turn on two-step verification'}</button>
              </div>
            </form>
          )}

          {step === 'done' && (
            <p className="text-sm mt-4" style={{ color: 'hsl(var(--primary))' }}>Two-step verification is on. You'll be asked for a code at your next sign-in.</p>
          )}

          {step === 'disable' && (
            <form onSubmit={disable} className="mt-5 grid gap-3">
              <p className="text-xs" style={{ color: 'hsl(var(--warning))' }}>Turning this off removes the second step. Clinician and admin access may be blocked until it's back on.</p>
              <label className="text-xs" style={{ color: 'hsl(var(--text-dim))' }}>Confirm your password
                <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ ...field, marginTop: 6 }} autoFocus />
              </label>
              {err && <p className="text-xs" style={{ color: 'hsl(var(--destructive))' }}>{err}</p>}
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => { setStep('idle'); setPassword(''); }} className="text-sm px-3 py-2" style={{ color: 'hsl(var(--text-dim))' }}>Cancel</button>
                <button type="submit" disabled={busy || !password} className="text-sm px-4 py-2 rounded-lg disabled:opacity-50" style={{ background: 'hsl(var(--destructive) / 0.12)', color: 'hsl(var(--destructive))', border: '1px solid hsl(var(--destructive) / 0.4)' }}>{busy ? 'Working…' : 'Turn off'}</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AccountSecurityPage() {
  return (
    <>
      <Helmet><title>Account security — Acute Insight AI</title><meta name="robots" content="noindex" /></Helmet>
      <ProtectedRoute><SecurityContent /></ProtectedRoute>
    </>
  );
}
