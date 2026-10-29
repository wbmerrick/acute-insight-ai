import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Step-up re-authentication, client side.
 *
 * Sensitive endpoints (data export/delete, role changes, audit export,
 * licensure changes) answer 403 { code: 'reauth_required' } when the session
 * hasn't confirmed the password recently. `sensitiveFetch` catches that, opens
 * the password prompt rendered by <ReauthHost/> (mounted once in RootLayout),
 * POSTs /api/auth/reauth, and retries the original request exactly once.
 * `downloadSensitive` does the same for file downloads, which can't be plain
 * <a href> anchors once the endpoint can ask for a password.
 */

type Resolver = (ok: boolean) => void;
let openPrompt: ((resolve: Resolver) => void) | null = null;
let pending: Promise<boolean> | null = null;

/** Ask the user to confirm their password. Resolves true once /api/auth/reauth succeeds. */
export function requestReauth(): Promise<boolean> {
  if (!openPrompt) {
    console.warn('ReauthHost is not mounted; cannot prompt for password');
    return Promise.resolve(false);
  }
  // Collapse concurrent callers (e.g. two polls hitting the gate) into one prompt.
  if (!pending) {
    pending = new Promise<boolean>((resolve) => openPrompt!((ok) => resolve(ok))).finally(() => {
      pending = null;
    });
  }
  return pending;
}

async function isReauthRequired(res: Response): Promise<boolean> {
  if (res.status !== 403) return false;
  const data = (await res.clone().json().catch(() => null)) as { code?: string } | null;
  return data?.code === 'reauth_required';
}

/**
 * fetch() that handles the reauth handshake: on 403 reauth_required it prompts
 * for the password and retries once. Anything else passes through untouched.
 * The body must be re-sendable (a string or undefined — which is all this app uses).
 */
export async function sensitiveFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const res = await fetch(input, init);
  if (await isReauthRequired(res)) {
    const confirmed = await requestReauth();
    if (confirmed) return fetch(input, init);
  }
  return res;
}

/** Download a sensitive file (export endpoints) through the reauth handshake. Throws with the server's message on failure. */
export async function downloadSensitive(url: string, fallbackName: string): Promise<void> {
  const res = await sensitiveFetch(url);
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string; code?: string } | null;
    if (data?.code === 'reauth_required') throw new Error('Password confirmation needed to download this');
    throw new Error(data?.error || `Download failed (${res.status})`);
  }
  const blob = await res.blob();
  const cd = res.headers.get('content-disposition') ?? '';
  const name = /filename="([^"]+)"/.exec(cd)?.[1] ?? fallbackName;
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
}

/** Mounted once (RootLayout). Renders nothing until a sensitive call asks for the password. */
export function ReauthHost() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const resolver = useRef<Resolver | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    openPrompt = (resolve) => {
      resolver.current = resolve;
      setPassword('');
      setErr('');
      setBusy(false);
      setOpen(true);
    };
    return () => {
      openPrompt = null;
    };
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  const finish = useCallback((ok: boolean) => {
    setOpen(false);
    resolver.current?.(ok);
    resolver.current = null;
  }, []);

  const confirm = useCallback(async () => {
    if (!password || busy) return;
    setBusy(true);
    setErr('');
    try {
      const res = await fetch('/api/auth/reauth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setErr(data.error || 'Could not confirm your password');
        setBusy(false);
        return;
      }
      finish(true);
    } catch {
      setErr('Could not reach the server');
      setBusy(false);
    }
  }, [password, busy, finish]);

  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Confirm your password"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'hsl(222 47% 4% / 0.72)' }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') finish(false);
      }}
    >
      <div className="w-full max-w-sm rounded-2xl p-6" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border-subtle))' }}>
        <h2 className="text-base font-semibold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
          Confirm it&apos;s you
        </h2>
        <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-dim))' }}>
          This action is sensitive. Enter your password to continue.
        </p>
        <form
          className="mt-4 grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void confirm();
          }}
        >
          <input
            ref={inputRef}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            placeholder="Your password"
            className="w-full rounded-lg px-3 py-2 text-sm text-foreground outline-none"
            style={{ background: 'hsl(var(--surface-deeper))', border: '1px solid hsl(var(--border-subtle))' }}
          />
          {err && (
            <p className="text-xs" role="alert" style={{ color: 'hsl(var(--destructive))' }}>
              {err}
            </p>
          )}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => finish(false)} className="text-sm px-3 py-2" style={{ color: 'hsl(var(--text-dim))' }}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || !password}
              className="text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-40"
              style={{ background: 'hsl(var(--primary))', color: 'hsl(222 47% 6%)', fontFamily: 'var(--font-heading)' }}
            >
              {busy ? 'Checking…' : 'Confirm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
