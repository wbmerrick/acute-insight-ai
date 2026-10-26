import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { signOut, useSession } from '@/lib/auth/auth-client';
import { nextIdleState, touch, IDLE_LIMITS, type IdleState } from '@/lib/idle';

/**
 * HIPAA-style automatic logoff. Mount on any page that shows patient data.
 * Warns a minute before, signs out at the limit, and sends the person to
 * /login?idle=1 with their return path so coming back is one step.
 */
export function IdleGuard({ mode = 'clinical' }: { mode?: 'clinical' | 'patient' }) {
  const { isAuthenticated } = useSession();
  const navigate = useNavigate();
  const [warning, setWarning] = useState(false);
  const ref = useRef<IdleState>({ lastActivity: Date.now(), warned: false });
  const { warnMs, logoutMs } = IDLE_LIMITS[mode];

  useEffect(() => {
    if (!isAuthenticated) return;
    const onActivity = () => { ref.current = touch(ref.current, Date.now()); setWarning(false); };
    const events: (keyof WindowEventMap)[] = ['pointerdown', 'pointermove', 'keydown', 'scroll', 'touchstart'];
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    const onVis = () => { if (document.visibilityState === 'visible') tick(); };
    document.addEventListener('visibilitychange', onVis);

    let stopped = false;
    const tick = () => {
      if (stopped) return;
      const r = nextIdleState(ref.current, Date.now(), warnMs, logoutMs);
      ref.current = r.state;
      if (r.action === 'warn') setWarning(true);
      if (r.action === 'logout') {
        stopped = true;
        const from = window.location.pathname + window.location.search;
        void signOut().finally(() => navigate(`/login?idle=1&from=${encodeURIComponent(from)}`, { replace: true }));
      }
    };
    const id = window.setInterval(tick, 5000);
    return () => {
      stopped = true;
      window.clearInterval(id);
      events.forEach((e) => window.removeEventListener(e, onActivity));
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [isAuthenticated, warnMs, logoutMs, navigate]);

  if (!warning) return null;
  return (
    <div role="alert" className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 rounded-2xl px-5 py-3 text-sm flex items-center gap-4" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--warning) / 0.6)', boxShadow: '0 10px 40px rgba(0,0,0,.4)', color: 'hsl(var(--foreground))' }}>
      Still there? You'll be signed out in a minute for security.
      <button type="button" onClick={() => { ref.current = touch(ref.current, Date.now()); setWarning(false); }} className="text-sm font-semibold px-3 py-1.5 rounded-lg" style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}>I'm here</button>
    </div>
  );
}
