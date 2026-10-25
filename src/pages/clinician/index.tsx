import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router';
import { Helmet } from '@dr.pogodin/react-helmet';
import { motion, AnimatePresence } from 'motion/react';
import { useSession, signOut, ProtectedRoute } from '@/lib/auth/auth-client';
import type { ClinicalBrief, Acuity } from '@/lib/clinical-brief';
import { ACUITY_LABEL } from '@/lib/clinical-brief';
import { ProviderNote, acuityMeta } from '@/components/clinical-brief-view';

// ─── Types (mirror /api/dispatch) ────────────────────────────────────────────

interface Me {
  displayName: string | null;
  credential: string | null;
  stateLicenses: string[];
  maxAcuity: Acuity;
  online: boolean;
}

interface QueueItem {
  id: number;
  intakeSessionId: number;
  acuity: Acuity;
  patientState: string;
  chiefComplaint: string | null;
  queuedAt: string | null;
  flagCount: number;
}

interface ActiveVisit {
  id: number;
  intakeSessionId: number;
  acuity: Acuity;
  patientState: string;
  chiefComplaint: string | null;
  status: string;
  queuedAt: string | null;
  acceptedAt: string | null;
  brief: ClinicalBrief | null;
  responses: { question: string; answer: string | string[] }[] | null;
  patientName: string | null;
  patientEmail: string;
  patientPhone: string | null;
  patientDob: string | null;
  conditions: string[] | null;
  medications: string[] | null;
  allergies: string[] | null;
}

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME',
  'MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI',
  'SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
];
const SCOPES: { value: Acuity; label: string; hint: string }[] = [
  { value: 'urgent', label: 'Urgent and below', hint: 'Same-day problems that need a clinician now' },
  { value: 'telehealth', label: 'Telehealth and below', hint: 'Visits that can be handled remotely' },
  { value: 'routine', label: 'Routine only', hint: 'Refills, follow-ups, non-urgent concerns' },
];

function waitLabel(iso: string | null, now: number) {
  if (!iso) return '';
  const m = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) } });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

// ─── Availability panel (the "go online" switch) ─────────────────────────────

function AvailabilityPanel({ me, onChange }: { me: Me; onChange: (m: Me) => void }) {
  const [editing, setEditing] = useState(me.stateLicenses.length === 0);
  const [draft, setDraft] = useState<Me>(me);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => setDraft(me), [me]);

  async function save(patch: Partial<Me>) {
    setSaving(true);
    setErr('');
    try {
      const updated = await api<Me>('/api/dispatch/me', { method: 'PUT', body: JSON.stringify(patch) });
      onChange(updated);
      return true;
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not save');
      return false;
    } finally {
      setSaving(false);
    }
  }

  const canGoOnline = me.stateLicenses.length > 0;

  return (
    <div className="rounded-2xl p-5" style={{ background: 'hsl(var(--card))', border: `1px solid hsl(var(--border-subtle) / 0.4)` }}>
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs" style={{ fontFamily: 'var(--font-mono)', color: 'hsl(var(--text-dimmer))', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Availability
          </p>
          <h2 className="text-lg font-semibold text-foreground mt-1" style={{ fontFamily: 'var(--font-heading)' }}>
            {me.online ? 'You are online' : 'You are offline'}
          </h2>
          <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-dim))' }}>
            {me.online
              ? `Taking ${SCOPES.find((s) => s.value === me.maxAcuity)?.label.toLowerCase() ?? ''} in ${me.stateLicenses.join(', ')}.`
              : canGoOnline
                ? `Licensed in ${me.stateLicenses.join(', ')}. Go online to see the queue.`
                : 'Add your state licenses before going online.'}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={me.online}
          aria-label={me.online ? 'Go offline' : 'Go online'}
          disabled={saving || (!me.online && !canGoOnline)}
          onClick={() => void save({ online: !me.online })}
          className="shrink-0 relative rounded-full transition-colors disabled:opacity-40"
          style={{ width: 64, height: 36, background: me.online ? 'hsl(var(--primary))' : 'hsl(var(--surface-deeper))', border: `1px solid ${me.online ? 'hsl(var(--primary))' : 'hsl(var(--border-subtle))'}` }}
        >
          <span
            className="absolute top-1 rounded-full transition-all"
            style={{ left: me.online ? 32 : 4, width: 26, height: 26, background: me.online ? 'hsl(var(--primary-foreground))' : 'hsl(var(--text-dim))' }}
          />
        </button>
      </div>

      {err && <p className="text-xs mt-3" style={{ color: 'hsl(var(--destructive))' }}>{err}</p>}

      <div className="mt-4 pt-4" style={{ borderTop: `1px solid hsl(var(--border-subtle) / 0.3)` }}>
        {!editing ? (
          <div className="flex flex-wrap items-center gap-2 text-xs" style={{ color: 'hsl(var(--text-dim))' }}>
            <span className="text-foreground font-medium">{me.displayName || 'Set your display name'}</span>
            {me.credential && <span>· {me.credential}</span>}
            <span>· Scope: {SCOPES.find((s) => s.value === me.maxAcuity)?.label}</span>
            <button type="button" onClick={() => setEditing(true)} className="ml-auto underline-offset-2 hover:underline" style={{ color: 'hsl(var(--primary))' }}>
              Edit
            </button>
          </div>
        ) : (
          <form
            className="grid gap-4"
            onSubmit={async (e) => {
              e.preventDefault();
              const ok = await save({ displayName: draft.displayName ?? '', credential: draft.credential ?? undefined, stateLicenses: draft.stateLicenses, maxAcuity: draft.maxAcuity });
              if (ok) setEditing(false);
            }}
          >
            <div className="grid sm:grid-cols-[1fr_120px] gap-3">
              <label className="grid gap-1 text-xs" style={{ color: 'hsl(var(--text-dim))' }}>
                Display name (what the patient sees)
                <input
                  value={draft.displayName ?? ''}
                  onChange={(e) => setDraft({ ...draft, displayName: e.target.value })}
                  placeholder="Dr. Merrick"
                  className="rounded-lg px-3 py-2 text-sm text-foreground outline-none"
                  style={{ background: 'hsl(var(--surface-deeper))', border: `1px solid hsl(var(--border-subtle))` }}
                />
              </label>
              <label className="grid gap-1 text-xs" style={{ color: 'hsl(var(--text-dim))' }}>
                Credential
                <select
                  value={draft.credential ?? ''}
                  onChange={(e) => setDraft({ ...draft, credential: e.target.value || null })}
                  className="rounded-lg px-3 py-2 text-sm text-foreground outline-none"
                  style={{ background: 'hsl(var(--surface-deeper))', border: `1px solid hsl(var(--border-subtle))` }}
                >
                  <option value="">—</option>
                  {['MD', 'DO', 'NP', 'PA'].map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
            </div>

            <div>
              <p className="text-xs mb-2" style={{ color: 'hsl(var(--text-dim))' }}>
                State licenses — you will only see patients physically in these states
              </p>
              <div className="flex flex-wrap gap-1.5">
                {US_STATES.map((s) => {
                  const on = draft.stateLicenses.includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setDraft({ ...draft, stateLicenses: on ? draft.stateLicenses.filter((x) => x !== s) : [...draft.stateLicenses, s].sort() })}
                      className="rounded-md px-2 py-1 text-xs font-medium transition-colors"
                      style={{
                        fontFamily: 'var(--font-mono)',
                        background: on ? 'hsl(var(--primary) / 0.15)' : 'hsl(var(--surface-deeper))',
                        color: on ? 'hsl(var(--primary))' : 'hsl(var(--text-dim))',
                        border: `1px solid ${on ? 'hsl(var(--primary) / 0.5)' : 'hsl(var(--border-subtle) / 0.5)'}`,
                      }}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-xs mb-2" style={{ color: 'hsl(var(--text-dim))' }}>Scope — the highest acuity you will accept</p>
              <div className="grid sm:grid-cols-3 gap-2">
                {SCOPES.map((s) => {
                  const on = draft.maxAcuity === s.value;
                  return (
                    <button
                      key={s.value}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setDraft({ ...draft, maxAcuity: s.value })}
                      className="text-left rounded-xl px-3 py-2.5 transition-colors"
                      style={{ background: on ? 'hsl(var(--primary) / 0.1)' : 'hsl(var(--surface-deeper))', border: `1px solid ${on ? 'hsl(var(--primary) / 0.5)' : 'hsl(var(--border-subtle) / 0.5)'}` }}
                    >
                      <span className="block text-sm font-medium text-foreground">{s.label}</span>
                      <span className="block text-xs mt-0.5" style={{ color: 'hsl(var(--text-dim))' }}>{s.hint}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              {me.stateLicenses.length > 0 && (
                <button type="button" onClick={() => { setDraft(me); setEditing(false); }} className="text-sm px-4 py-2 rounded-lg" style={{ color: 'hsl(var(--text-dim))' }}>
                  Cancel
                </button>
              )}
              <button type="submit" disabled={saving} className="text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50" style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))', fontFamily: 'var(--font-heading)' }}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Queue card ──────────────────────────────────────────────────────────────

function QueueCard({ item, now, busy, onAccept }: { item: QueueItem; now: number; busy: boolean; onAccept: () => void }) {
  const m = acuityMeta(item.acuity);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="rounded-2xl p-4"
      style={{ background: 'hsl(var(--card))', border: `1px solid ${m.h} / 0.35)`, boxShadow: item.acuity === 'urgent' ? `0 0 0 1px hsl(${m.h} / 0.15)` : 'none' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider" style={{ fontFamily: 'var(--font-mono)', background: `hsl(${m.h} / 0.14)`, color: `hsl(${m.h})`, border: `1px solid hsl(${m.h} / 0.4)` }}>
              {ACUITY_LABEL[item.acuity]}
            </span>
            <span className="text-xs" style={{ fontFamily: 'var(--font-mono)', color: 'hsl(var(--text-dimmer))' }}>{item.patientState}</span>
            <span className="text-xs" style={{ color: 'hsl(var(--text-dimmer))' }}>waiting {waitLabel(item.queuedAt, now)}</span>
          </div>
          <p className="text-sm font-semibold text-foreground mt-2 truncate" style={{ fontFamily: 'var(--font-heading)' }}>
            {item.chiefComplaint || 'No chief complaint recorded'}
          </p>
          {item.flagCount > 0 && (
            <p className="text-xs mt-1" style={{ color: 'hsl(var(--destructive))' }}>
              {item.flagCount} flag{item.flagCount === 1 ? '' : 's'} in the brief
            </p>
          )}
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={onAccept}
          className="shrink-0 text-sm font-semibold px-4 py-2 rounded-xl disabled:opacity-50"
          style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))', fontFamily: 'var(--font-heading)' }}
        >
          Accept
        </button>
      </div>
    </motion.div>
  );
}

// ─── Active visit: brief + patient contact + complete ───────────────────────

function ActiveVisitPanel({ visit, now, onDone }: { visit: ActiveVisit; now: number; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [showAnswers, setShowAnswers] = useState(false);
  const m = acuityMeta(visit.acuity);

  async function act(path: 'complete' | 'release') {
    setBusy(true);
    setErr('');
    try {
      await api(`/api/dispatch/visits/${visit.id}/${path}`, { method: 'POST' });
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid gap-4">
      <div className="rounded-2xl p-5" style={{ background: 'hsl(var(--card))', border: `1px solid hsl(${m.h} / 0.4)` }}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider" style={{ fontFamily: 'var(--font-mono)', background: `hsl(${m.h} / 0.14)`, color: `hsl(${m.h})`, border: `1px solid hsl(${m.h} / 0.4)` }}>
                {ACUITY_LABEL[visit.acuity]}
              </span>
              <span className="text-xs" style={{ color: 'hsl(var(--text-dimmer))' }}>{waitLabel(visit.acceptedAt, now) === 'just now' ? 'accepted just now' : `accepted ${waitLabel(visit.acceptedAt, now)} ago`}</span>
            </div>
            <h2 className="text-xl font-semibold text-foreground mt-2" style={{ fontFamily: 'var(--font-heading)' }}>
              {visit.patientName || visit.patientEmail}
            </h2>
            <p className="text-sm" style={{ color: 'hsl(var(--text-dim))' }}>{visit.chiefComplaint}</p>
          </div>
          <div className="text-sm grid gap-1" style={{ color: 'hsl(var(--text-dim))' }}>
            <span>
              Call: {visit.patientPhone ? <a href={`tel:${visit.patientPhone}`} className="text-foreground font-medium">{visit.patientPhone}</a> : <span style={{ color: 'hsl(var(--warning))' }}>no phone on file</span>}
            </span>
            <span>Email: <a href={`mailto:${visit.patientEmail}`} className="text-foreground">{visit.patientEmail}</a></span>
            <span>State: <span className="text-foreground" style={{ fontFamily: 'var(--font-mono)' }}>{visit.patientState}</span>{visit.patientDob && <> · DOB {visit.patientDob}</>}</span>
          </div>
        </div>

        {(visit.conditions?.length || visit.medications?.length || visit.allergies?.length) ? (
          <div className="grid sm:grid-cols-3 gap-3 mt-4 pt-4 text-xs" style={{ borderTop: `1px solid hsl(var(--border-subtle) / 0.3)`, color: 'hsl(var(--text-dim))' }}>
            <div><span className="text-foreground font-medium">Conditions</span><br />{visit.conditions?.join(', ') || '—'}</div>
            <div><span className="text-foreground font-medium">Medications</span><br />{visit.medications?.join(', ') || '—'}</div>
            <div><span className="text-foreground font-medium">Allergies</span><br />{visit.allergies?.join(', ') || 'None recorded'}</div>
          </div>
        ) : null}

        {err && <p className="text-xs mt-3" style={{ color: 'hsl(var(--destructive))' }}>{err}</p>}

        <div className="flex gap-2 justify-end mt-4">
          <button type="button" disabled={busy} onClick={() => void act('release')} className="text-sm px-4 py-2 rounded-lg disabled:opacity-50" style={{ color: 'hsl(var(--text-dim))', border: `1px solid hsl(var(--border-subtle) / 0.5)` }}>
            Return to queue
          </button>
          <button type="button" disabled={busy} onClick={() => void act('complete')} className="text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50" style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))', fontFamily: 'var(--font-heading)' }}>
            {busy ? 'Working…' : 'Mark visit complete'}
          </button>
        </div>
      </div>

      {visit.brief ? (
        <ProviderNote brief={visit.brief} />
      ) : (
        <p className="text-sm" style={{ color: 'hsl(var(--text-dim))' }}>No brief was stored for this intake.</p>
      )}

      {visit.responses && visit.responses.length > 0 && (
        <div className="rounded-2xl p-4" style={{ background: 'hsl(var(--card))', border: `1px solid hsl(var(--border-subtle) / 0.4)` }}>
          <button type="button" onClick={() => setShowAnswers((v) => !v)} className="text-sm font-medium text-foreground w-full text-left flex items-center justify-between">
            Patient's own words ({visit.responses.length})
            <span style={{ color: 'hsl(var(--text-dimmer))' }}>{showAnswers ? '−' : '+'}</span>
          </button>
          {showAnswers && (
            <div className="grid gap-3 mt-3 text-sm">
              {visit.responses.map((r, i) => (
                <div key={i}>
                  <p className="text-xs" style={{ color: 'hsl(var(--text-dimmer))' }}>{r.question}</p>
                  <p className="text-foreground">{Array.isArray(r.answer) ? r.answer.join(', ') : r.answer}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

const POLL_MS = 5000;

function ClinicianContent() {
  const { user: authUser } = useSession();
  const navigate = useNavigate();
  const [me, setMe] = useState<Me | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [active, setActive] = useState<ActiveVisit[]>([]);
  const [acceptingId, setAcceptingId] = useState<number | null>(null);
  const [toast, setToast] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const pollRef = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await api<{ online: boolean; queue: QueueItem[]; active: ActiveVisit[] }>('/api/dispatch/queue');
      setQueue(data.queue);
      setActive(data.active);
      setNow(Date.now());
    } catch {
      /* transient — next poll retries */
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const m = await api<Me>('/api/dispatch/me');
        if (!cancelled) setMe(m);
      } catch (e) {
        if (!cancelled && e instanceof Error && /access required/i.test(e.message)) setForbidden(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!me) return;
    void refresh();
    pollRef.current = window.setInterval(() => void refresh(), POLL_MS);
    return () => { if (pollRef.current) window.clearInterval(pollRef.current); };
  }, [me, refresh]);

  async function accept(item: QueueItem) {
    setAcceptingId(item.id);
    setToast('');
    try {
      await api(`/api/dispatch/visits/${item.id}/accept`, { method: 'POST' });
      await refresh();
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Could not accept');
      setQueue((q) => q.filter((x) => x.id !== item.id));
    } finally {
      setAcceptingId(null);
    }
  }

  const firstName = authUser?.name?.split(' ')[0] ?? 'Clinician';

  if (forbidden) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6 text-center" style={{ background: 'hsl(var(--background))' }}>
        <h1 className="text-xl font-semibold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>Clinician access required</h1>
        <p className="text-sm max-w-sm" style={{ color: 'hsl(var(--text-dim))' }}>This account is a patient account. Ask an admin to grant clinician access, then come back here to go online.</p>
        <Link to="/portal" className="text-sm mt-2" style={{ color: 'hsl(var(--primary))' }}>Back to my portal</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'hsl(var(--background))' }}>
      <header className="sticky top-0 z-40 px-6 py-4 shrink-0" style={{ background: 'hsl(var(--card) / 0.9)', borderBottom: `1px solid hsl(var(--border-subtle) / 0.4)`, backdropFilter: 'blur(12px)' }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'hsl(var(--primary) / 0.15)', border: '1px solid hsl(var(--primary) / 0.3)' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
              </div>
            </Link>
            <span className="text-sm font-semibold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>Dispatch</span>
            {me && (
              <span className="hidden sm:inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full" style={{ fontFamily: 'var(--font-mono)', color: me.online ? 'hsl(var(--primary))' : 'hsl(var(--text-dim))', background: me.online ? 'hsl(var(--primary) / 0.1)' : 'hsl(var(--surface-deeper))', border: `1px solid ${me.online ? 'hsl(var(--primary) / 0.4)' : 'hsl(var(--border-subtle) / 0.5)'}` }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'currentColor' }} />
                {me.online ? 'online' : 'offline'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <Link to="/provider" className="text-xs hover:text-foreground transition-colors" style={{ color: 'hsl(var(--text-dim))' }}>All intakes</Link>
            <span className="text-xs hidden sm:block" style={{ color: 'hsl(var(--text-dim))' }}>{firstName}</span>
            <button onClick={async () => { await signOut(); navigate('/login'); }} className="text-xs hover:text-foreground transition-colors" style={{ color: 'hsl(var(--text-dim))' }}>
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        {!me ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'hsl(var(--primary))' }} />
          </div>
        ) : (
          <div className="grid lg:grid-cols-[380px_1fr] gap-6 items-start">
            <div className="grid gap-5">
              <AvailabilityPanel me={me} onChange={(m) => { setMe(m); void refresh(); }} />

              <div>
                <div className="flex items-baseline justify-between mb-3">
                  <h3 className="text-sm font-semibold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>Waiting for a clinician</h3>
                  <span className="text-xs" style={{ fontFamily: 'var(--font-mono)', color: 'hsl(var(--text-dimmer))' }}>{me.online ? `${queue.length} in your states` : '—'}</span>
                </div>
                {toast && <p className="text-xs mb-3" style={{ color: 'hsl(var(--warning))' }}>{toast}</p>}
                <div className="grid gap-3">
                  <AnimatePresence initial={false}>
                    {me.online && queue.map((item) => (
                      <QueueCard key={item.id} item={item} now={now} busy={acceptingId === item.id} onAccept={() => void accept(item)} />
                    ))}
                  </AnimatePresence>
                  {me.online && queue.length === 0 && (
                    <div className="rounded-2xl p-6 text-center" style={{ border: `1px dashed hsl(var(--border-subtle) / 0.5)` }}>
                      <p className="text-sm text-foreground">No one waiting in {me.stateLicenses.join(', ')} right now.</p>
                      <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-dim))' }}>New requests appear here within a few seconds. Highest acuity first.</p>
                    </div>
                  )}
                  {!me.online && (
                    <div className="rounded-2xl p-6 text-center" style={{ border: `1px dashed hsl(var(--border-subtle) / 0.5)` }}>
                      <p className="text-sm" style={{ color: 'hsl(var(--text-dim))' }}>Go online to see who is waiting.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div>
              {active.length === 0 ? (
                <div className="rounded-2xl p-10 text-center" style={{ background: 'hsl(var(--card))', border: `1px solid hsl(var(--border-subtle) / 0.4)` }}>
                  <p className="text-base font-semibold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>No active visit</p>
                  <p className="text-sm mt-2 max-w-md mx-auto" style={{ color: 'hsl(var(--text-dim))' }}>
                    Accept a request and the full brief opens here: plan first, then assessment, the patient's words, and how to reach them.
                  </p>
                </div>
              ) : (
                <div className="grid gap-8">
                  {active.map((v) => <ActiveVisitPanel key={v.id} visit={v} now={now} onDone={() => void refresh()} />)}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ClinicianPage() {
  return (
    <>
      <Helmet>
        <title>Dispatch — Acute Insight AI</title>
        <meta name="description" content="Go online, see who is waiting in your states, accept a visit with the brief already written." />
        <meta name="robots" content="noindex" />
      </Helmet>
      <ProtectedRoute>
        <ClinicianContent />
      </ProtectedRoute>
    </>
  );
}
