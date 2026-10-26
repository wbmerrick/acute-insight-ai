import { useState } from 'react';
import { authClient, useSession } from '@/lib/auth/auth-client';

/** Portal nudge for unverified addresses. Resend is a no-op until a sender is configured, so it's honest about that. */
export function VerifyEmailNudge() {
  const { user } = useSession();
  const [state, setState] = useState<'idle' | 'sent' | 'error'>('idle');
  const u = user as { email?: string; emailVerified?: boolean } | null;
  if (!u || u.emailVerified) return null;
  async function resend() {
    if (!u?.email) return;
    const r = await authClient.sendVerificationEmail({ email: u.email, callbackURL: '/portal?verified=1' }).catch(() => ({ error: true }));
    setState(r && 'error' in r && r.error ? 'error' : 'sent');
  }
  return (
    <div className="rounded-2xl px-5 py-3.5 mb-6 flex items-center justify-between gap-4 flex-wrap text-sm" style={{ background: 'hsl(var(--warning) / 0.07)', border: '1px solid hsl(var(--warning) / 0.35)' }}>
      <span className="text-foreground">Confirm your email so we can reach you about your visits.</span>
      {state === 'sent' ? (
        <span className="text-xs" style={{ color: 'hsl(var(--text-dim))' }}>Sent — check your inbox.</span>
      ) : (
        <button type="button" onClick={() => void resend()} className="text-xs font-semibold hover:underline" style={{ color: 'hsl(var(--warning))' }}>{state === 'error' ? 'Try again' : 'Resend confirmation'}</button>
      )}
    </div>
  );
}
