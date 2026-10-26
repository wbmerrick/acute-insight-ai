import { Link } from 'react-router';
import { useSession } from '@/lib/auth/auth-client';

/** Nudge (or, when enforced, the reason you're blocked) for clinician/admin accounts without MFA. */
export function MfaBanner({ blocked = false }: { blocked?: boolean }) {
  const { user } = useSession();
  const enabled = !!(user as { twoFactorEnabled?: boolean } | null)?.twoFactorEnabled;
  if (enabled) return null;
  const h = blocked ? 'var(--destructive)' : 'var(--warning)';
  return (
    <div className="rounded-2xl px-5 py-4 mb-6 flex items-center justify-between gap-4 flex-wrap" style={{ background: `hsl(${h} / 0.08)`, border: `1px solid hsl(${h} / 0.4)` }}>
      <div>
        <p className="text-sm font-semibold text-foreground">{blocked ? 'Two-step verification is required to view patient records' : 'Turn on two-step verification'}</p>
        <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-dim))' }}>Patient data behind a password alone isn't enough. It takes two minutes with any authenticator app.</p>
      </div>
      <Link to="/account/security" className="text-sm font-semibold px-4 py-2 rounded-lg" style={{ background: `hsl(${h})`, color: 'hsl(var(--background))', fontFamily: 'var(--font-heading)' }}>Set it up</Link>
    </div>
  );
}
