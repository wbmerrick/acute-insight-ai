import { useEffect, useRef, useState } from 'react';
import type { Disposition } from '@/lib/clinical-brief';

/* ────────────────────────────────────────────────────────────────────────────
   Patient side of dispatch — the "request a ride" moment after an intake.
   Non-emergency only (the server refuses emergency briefs). Asks for the
   state the patient is physically in (licensure) and a phone number, then
   shows honest live status: how many licensed clinicians are online in that
   state, and who accepted.
   ──────────────────────────────────────────────────────────────────────────── */

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME',
  'MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI',
  'SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
];

interface VisitStatus {
  id: number;
  status: 'queued' | 'accepted' | 'completed' | 'cancelled';
  patientState: string;
  queuedAt: string | null;
  acceptedAt: string | null;
  clinicianName: string | null;
  clinicianCredential: string | null;
  cliniciansOnlineInState: number;
}

const card: React.CSSProperties = {
  background: 'hsl(var(--card))',
  border: '1px solid hsl(var(--primary) / 0.35)',
  borderRadius: 16,
  padding: 20,
  boxShadow: '0 0 40px hsl(var(--primary) / 0.06)',
};
const input: React.CSSProperties = {
  background: 'hsl(var(--surface-deeper))',
  border: '1px solid hsl(var(--border-subtle))',
  borderRadius: 10,
  padding: '10px 12px',
  color: 'hsl(var(--foreground))',
  fontSize: 14,
  width: '100%',
  outline: 'none',
};

export function RequestClinician({ intakeId, disposition }: { intakeId: number; disposition: Disposition }) {
  const [profile, setProfile] = useState<{ state: string; phone: string } | null>(null);
  const [state, setState] = useState('');
  const [phone, setPhone] = useState('');
  const [visit, setVisit] = useState<VisitStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const pollRef = useRef<number | null>(null);

  // Prefill from the patient profile when we have it.
  useEffect(() => {
    let cancelled = false;
    fetch('/api/patient/profile')
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { profile?: { state?: string | null; phone?: string | null } | null } | null) => {
        if (cancelled) return;
        const p = { state: d?.profile?.state ?? '', phone: d?.profile?.phone ?? '' };
        setProfile(p);
        setState(p.state);
        setPhone(p.phone);
      })
      .catch(() => { if (!cancelled) setProfile({ state: '', phone: '' }); });
    return () => { cancelled = true; };
  }, []);

  // Poll the visit while waiting.
  useEffect(() => {
    if (!visit || visit.status === 'completed' || visit.status === 'cancelled') return;
    const tick = async () => {
      try {
        const r = await fetch(`/api/dispatch/visits/${visit.id}`);
        if (r.ok) setVisit((await r.json()) as VisitStatus);
      } catch { /* retry next tick */ }
    };
    pollRef.current = window.setInterval(() => void tick(), 4000);
    return () => { if (pollRef.current) window.clearInterval(pollRef.current); };
  }, [visit]);

  async function request() {
    setBusy(true);
    setErr('');
    try {
      const r = await fetch('/api/dispatch/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intakeId, state, phone }),
      });
      const d = (await r.json().catch(() => ({}))) as { visitId?: number; error?: string };
      if (!r.ok || !d.visitId) throw new Error(d.error || 'Could not request a clinician');
      const s = await fetch(`/api/dispatch/visits/${d.visitId}`);
      if (s.ok) setVisit((await s.json()) as VisitStatus);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not request a clinician');
    } finally {
      setBusy(false);
    }
  }

  if (disposition.level === 'emergency') return null;

  // ── Waiting / accepted ──
  if (visit) {
    const who = visit.clinicianName ? `${visit.clinicianName}${visit.clinicianCredential ? `, ${visit.clinicianCredential}` : ''}` : 'A clinician';
    return (
      <div style={card}>
        {visit.status === 'queued' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span className="animate-spin rounded-full" style={{ width: 16, height: 16, border: '2px solid hsl(var(--primary) / 0.25)', borderTopColor: 'hsl(var(--primary))' }} />
              <h3 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 17, color: 'hsl(var(--foreground))' }}>Finding a clinician in {visit.patientState}</h3>
            </div>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'hsl(var(--text-dim))' }}>
              {visit.cliniciansOnlineInState > 0
                ? `${visit.cliniciansOnlineInState} licensed clinician${visit.cliniciansOnlineInState === 1 ? ' is' : 's are'} online in your state. The first to accept will call you at ${phone || 'your number'}. You can leave this page — your portal shows the same status.`
                : `No clinician licensed in ${visit.patientState} is online right now. Your request stays in the queue and your portal will show when someone accepts. If anything gets worse, use the safety net above.`}
            </p>
          </>
        )}
        {visit.status === 'accepted' && (
          <>
            <h3 style={{ margin: '0 0 6px', fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 17, color: 'hsl(var(--primary))' }}>{who} accepted your visit</h3>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'hsl(var(--text-dim))' }}>
              They have your brief and will call you at <span style={{ color: 'hsl(var(--foreground))' }}>{phone || 'the number on your profile'}</span>. Keep your phone nearby.
            </p>
          </>
        )}
        {visit.status === 'completed' && (
          <>
            <h3 style={{ margin: '0 0 6px', fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 17, color: 'hsl(var(--foreground))' }}>Visit complete</h3>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'hsl(var(--text-dim))' }}>{who} marked this visit complete. It is saved in your timeline.</p>
          </>
        )}
      </div>
    );
  }

  // ── Request form ──
  return (
    <div style={card}>
      <h3 style={{ margin: '0 0 4px', fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 17, color: 'hsl(var(--foreground))' }}>Connect with a clinician now</h3>
      <p style={{ margin: '0 0 14px', fontSize: 14, lineHeight: 1.6, color: 'hsl(var(--text-dim))' }}>
        Your brief goes to licensed clinicians who are online in your state. The first to accept calls you.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 10, marginBottom: 12 }}>
        <label style={{ display: 'grid', gap: 4, fontSize: 12, color: 'hsl(var(--text-dim))' }}>
          State you're in
          <select value={state} onChange={(e) => setState(e.target.value)} style={input} aria-label="State you are in">
            <option value="">—</option>
            {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label style={{ display: 'grid', gap: 4, fontSize: 12, color: 'hsl(var(--text-dim))' }}>
          Phone to call you at
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(731) 555-0100" inputMode="tel" style={input} />
        </label>
      </div>
      {err && <p style={{ margin: '0 0 10px', fontSize: 12, color: 'hsl(var(--destructive))' }}>{err}</p>}
      <button
        type="button"
        disabled={busy || profile === null || !state || !phone.trim()}
        onClick={() => void request()}
        style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))', border: 0, borderRadius: 12, padding: '12px 22px', fontFamily: 'var(--font-heading)', fontWeight: 600, cursor: 'pointer', opacity: busy || !state || !phone.trim() ? 0.5 : 1 }}
      >
        {busy ? 'Requesting…' : 'Request a clinician'}
      </button>
      <p style={{ margin: '10px 0 0', fontSize: 12, lineHeight: 1.5, color: 'hsl(var(--text-dimmer))' }}>
        Licensure rules mean only clinicians licensed where you are can take your visit. If your symptoms get worse while you wait, follow the safety net above.
      </p>
    </div>
  );
}
