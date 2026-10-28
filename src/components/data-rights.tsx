import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { signOut } from '@/lib/auth/auth-client';

/** Your data, your account: download everything, or delete it. */
export function DataRights({ email }: { email: string }) {
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState('');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function del() {
    setBusy(true); setErr('');
    try {
      const r = await fetch('/api/patient/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirmEmail: confirm }) });
      const d = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) { setErr(d.error || 'Could not delete your account'); return; }
      await signOut().catch(() => {});
      navigate('/?deleted=1', { replace: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl p-6 mt-6" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border-subtle) / 0.4)' }}>
      <h3 className="text-base font-semibold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>Your data</h3>
      <p className="text-sm mt-1 mb-4" style={{ color: 'hsl(var(--text-dim))' }}>Everything we hold about you is yours. Download it any time, or delete your account and all of it.</p>
      <div className="flex flex-wrap gap-3 items-center">
        <a href="/api/patient/export" download className="text-sm font-semibold px-4 py-2 rounded-lg" style={{ background: 'hsl(var(--primary) / 0.12)', color: 'hsl(var(--primary))', border: '1px solid hsl(var(--primary) / 0.35)', fontFamily: 'var(--font-heading)' }}>
          Download my data
        </a>
        <Link to="/account/security" className="text-sm px-4 py-2 rounded-lg" style={{ color: 'hsl(var(--text-dim))', border: '1px solid hsl(var(--border-subtle) / 0.5)' }}>Two-step verification</Link>
        {!open && (
          <button type="button" onClick={() => setOpen(true)} className="text-sm ml-auto hover:underline" style={{ color: 'hsl(var(--destructive))' }}>Delete my account</button>
        )}
      </div>
      {open && (
        <div className="mt-5 pt-5 grid gap-3" style={{ borderTop: '1px solid hsl(var(--destructive) / 0.3)' }}>
          <p className="text-sm text-foreground">This permanently deletes your account, every intake, and your visit history. It can't be undone. If a clinician has accepted a visit with you, finish that first.</p>
          <label className="text-xs" style={{ color: 'hsl(var(--text-dim))' }}>Type <span className="text-foreground" style={{ fontFamily: 'var(--font-mono)' }}>{email}</span> to confirm
            <input value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" className="mt-1 w-full rounded-lg px-3 py-2 text-sm text-foreground outline-none" style={{ background: 'hsl(var(--surface-deeper))', border: '1px solid hsl(var(--border-subtle))' }} />
          </label>
          {err && <p className="text-xs" style={{ color: 'hsl(var(--destructive))' }}>{err}</p>}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => { setOpen(false); setConfirm(''); setErr(''); }} className="text-sm px-3 py-2" style={{ color: 'hsl(var(--text-dim))' }}>Keep my account</button>
            <button type="button" disabled={busy || confirm.trim().toLowerCase() !== email.toLowerCase()} onClick={() => void del()} className="text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-40" style={{ background: 'hsl(var(--destructive))', color: '#fff', fontFamily: 'var(--font-heading)' }}>
              {busy ? 'Deleting…' : 'Delete everything'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
