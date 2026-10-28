import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { Helmet } from '@dr.pogodin/react-helmet';
import { motion, AnimatePresence } from 'motion/react';
import { useSession } from '@/lib/auth/auth-client';
import { admin_providers } from 'virtual:content';
import { IdleGuard } from '@/components/idle-guard';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdminUser {
  id: string;
  name: string | null;
  email: string;
  role: string | null;
  isAdmin: boolean | null;
  createdAt: string | null;
}

type RoleAction = 'promote' | 'demote';

// ─── Toast ────────────────────────────────────────────────────────────────────

interface Toast {
  id: number;
  message: string;
  kind: 'success' | 'error';
}

let toastId = 0;

function ToastStack({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-50 pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.22, ease: 'easeOut' as const }}
            className="pointer-events-auto flex items-center gap-3 rounded-2xl px-4 py-3 text-sm shadow-lg"
            style={{
              background: t.kind === 'success' ? `hsl(var(--primary) / 0.12)` : `hsl(var(--destructive) / 0.12)`,
              border: `1px solid ${t.kind === 'success' ? `hsl(var(--primary) / 0.35)` : `hsl(var(--destructive) / 0.35)`}`,
              color: t.kind === 'success' ? `hsl(var(--primary))` : `hsl(var(--destructive))`,
              fontFamily: 'var(--font-sans)',
              minWidth: '260px',
            }}
          >
            {t.kind === 'success' ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            )}
            <span className="flex-1">{t.message}</span>
            <button onClick={() => onDismiss(t.id)} className="opacity-60 hover:opacity-100 transition-opacity" aria-label="Dismiss">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ─── Confirmation dialog ──────────────────────────────────────────────────────

function ConfirmDialog({
  targetUser,
  action,
  onConfirm,
  onCancel,
  loading,
}: {
  targetUser: AdminUser;
  action: RoleAction;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const isPromote = action === 'promote';

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4"
      style={{ background: `hsl(var(--overlay-backdrop) / 0.75)`, backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.2, ease: 'easeOut' as const }}
        className="rounded-3xl p-6 max-w-sm w-full"
        style={{
          background: `hsl(var(--card))`,
          border: `1px solid hsl(var(--border-subtle) / 0.4)`,
          boxShadow: `0 24px 64px hsl(var(--shadow-deep) / 0.6)`,
        }}
      >
        {/* Icon */}
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
          style={{
            background: isPromote ? `hsl(var(--primary) / 0.1)` : `hsl(var(--destructive) / 0.1)`,
            border: `1px solid ${isPromote ? `hsl(var(--primary) / 0.25)` : `hsl(var(--destructive) / 0.25)`}`,
          }}
        >
          {isPromote ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <line x1="19" y1="8" x2="19" y2="14"/>
              <line x1="22" y1="11" x2="16" y2="11"/>
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--destructive))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <line x1="22" y1="11" x2="16" y2="11"/>
            </svg>
          )}
        </div>

        <h3 className="text-base font-bold mb-1" style={{ color: `hsl(var(--foreground))`, fontFamily: 'var(--font-heading)' }}>
          {isPromote ? admin_providers.dialogPromoteTitle : admin_providers.dialogDemoteTitle}
        </h3>
        <p className="text-sm mb-5 leading-relaxed" style={{ color: `hsl(var(--muted-foreground))`, fontFamily: 'var(--font-sans)' }}>
          {isPromote ? (
            <>
              <span className="font-medium" style={{ color: `hsl(var(--foreground))` }}>
                {targetUser.name ?? targetUser.email}
              </span>
              {' '}{admin_providers.dialogPromoteBody}
            </>
          ) : (
            <>
              <span className="font-medium" style={{ color: `hsl(var(--foreground))` }}>
                {targetUser.name ?? targetUser.email}
              </span>
              {' '}{admin_providers.dialogDemoteBody}
            </>
          )}
        </p>

        <div className="flex gap-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-opacity hover:opacity-70 disabled:opacity-40"
            style={{
              background: `hsl(var(--muted))`,
              color: `hsl(var(--muted-foreground))`,
              fontFamily: 'var(--font-sans)',
            }}
          >
            {admin_providers.dialogCancel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-40"
            style={{
              background: isPromote ? `hsl(var(--primary))` : `hsl(var(--destructive))`,
              color: `hsl(var(--background))`,
              fontFamily: 'var(--font-heading)',
            }}
          >
            {loading
              ? admin_providers.dialogSaving
              : isPromote
              ? admin_providers.dialogGrantAccess
              : admin_providers.dialogRemoveAccess}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Role badge ───────────────────────────────────────────────────────────────

function RoleBadge({ role, isAdmin }: { role: string | null; isAdmin: boolean | null }) {
  if (isAdmin) {
    return (
      <span
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
        style={{
          background: `hsl(var(--secondary) / 0.12)`,
          color: `hsl(var(--secondary))`,
          border: `1px solid hsl(var(--secondary) / 0.3)`,
          fontFamily: 'var(--font-sans)',
        }}
      >
        <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
        {admin_providers.badgeAdmin}
      </span>
    );
  }
  if (role === 'provider') {
    return (
      <span
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
        style={{
          background: `hsl(var(--primary) / 0.1)`,
          color: `hsl(var(--primary))`,
          border: `1px solid hsl(var(--primary) / 0.25)`,
          fontFamily: 'var(--font-sans)',
        }}
      >
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
        </svg>
        {admin_providers.badgeProvider}
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
      style={{
        background: `hsl(var(--muted))`,
        color: `hsl(var(--muted-foreground))`,
        fontFamily: 'var(--font-sans)',
      }}
    >
      {admin_providers.badgePatient}
    </span>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────


// ─── Early-access requests panel ─────────────────────────────────────────────
interface AccessRequestRow {
  id: number;
  name: string;
  email: string;
  organization: string | null;
  message: string | null;
  status: string | null;
  createdAt: string | null;
}

function AccessRequestsPanel() {
  const [rows, setRows] = useState<AccessRequestRow[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/access-requests');
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as AccessRequestRow[];
        if (!cancelled) setRows(data);
      } catch {
        if (!cancelled) setError('Could not load access requests.');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <section
      className="mt-10 rounded-2xl overflow-hidden"
      style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border-subtle) / 0.6)' }}
    >
      <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid hsl(var(--border-subtle) / 0.5)' }}>
        <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
          Early-access requests
        </h2>
        <span className="vitals text-xs" style={{ color: 'hsl(var(--text-dimmer))' }}>
          {rows ? `${rows.length} total` : '—'}
        </span>
      </div>

      {error && (
        <p className="px-6 py-5 text-sm" style={{ color: 'hsl(var(--destructive))' }}>{error}</p>
      )}
      {!error && rows === null && (
        <p className="px-6 py-5 text-sm" style={{ color: 'hsl(var(--text-dim))' }}>Loading…</p>
      )}
      {!error && rows !== null && rows.length === 0 && (
        <p className="px-6 py-5 text-sm" style={{ color: 'hsl(var(--text-dim))' }}>
          No requests yet. They land here the moment someone submits the form
          on the providers page.
        </p>
      )}
      {!error && rows !== null && rows.length > 0 && (
        <div className="overflow-x-auto" tabIndex={0}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid hsl(var(--border-subtle) / 0.5)' }}>
                {['Received', 'Name', 'Email', 'Practice', 'Note'].map((h) => (
                  <th key={h} className="text-left font-semibold px-6 py-3" style={{ color: 'hsl(var(--text-dim))' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} style={{ borderBottom: '1px solid hsl(var(--border-subtle) / 0.3)' }}>
                  <td className="px-6 py-3 whitespace-nowrap vitals text-xs" style={{ color: 'hsl(var(--text-dimmer))' }}>
                    {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-6 py-3 font-medium text-foreground">{r.name}</td>
                  <td className="px-6 py-3" style={{ color: 'hsl(var(--text-dim))' }}>
                    <a href={'mailto:' + r.email} className="hover:text-primary transition-colors">{r.email}</a>
                  </td>
                  <td className="px-6 py-3" style={{ color: 'hsl(var(--text-dim))' }}>{r.organization ?? '—'}</td>
                  <td className="px-6 py-3 max-w-[320px]" style={{ color: 'hsl(var(--text-dim))' }}>
                    <span className="line-clamp-2">{r.message ?? '—'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}



// ─── Provider–patient assignments ────────────────────────────────────────────

interface Assignment { id: number; providerId: string; providerName: string | null; providerEmail: string; patientId: string; patientName: string | null; patientEmail: string; createdAt: string | null }

function AssignmentsPanel() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [rows, setRows] = useState<Assignment[] | null>(null);
  const [scope, setScope] = useState<'all' | 'assigned'>('all');
  const [providerId, setProviderId] = useState('');
  const [patientId, setPatientId] = useState('');
  const [err, setErr] = useState('');

  async function load() {
    try {
      const [u, a] = await Promise.all([fetch('/api/admin/users'), fetch('/api/admin/assignments')]);
      if (u.ok) setUsers((await u.json()) as AdminUser[]);
      if (a.ok) { const d = (await a.json()) as { scope: 'all' | 'assigned'; assignments: Assignment[] }; setScope(d.scope); setRows(d.assignments); }
    } catch { setErr('Could not load assignments.'); }
  }
  useEffect(() => { void load(); }, []);

  async function change(remove: boolean, pId = providerId, ptId = patientId) {
    setErr('');
    const r = await fetch('/api/admin/assignments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ providerId: pId, patientId: ptId, remove }) });
    if (!r.ok) { const d = (await r.json().catch(() => ({}))) as { error?: string }; setErr(d.error || 'Failed'); return; }
    await load();
  }

  const providers = users.filter((u) => u.role === 'provider' || u.isAdmin);
  const patients = users.filter((u) => u.role !== 'provider' && !u.isAdmin);
  const sel: React.CSSProperties = { background: 'hsl(var(--surface-deeper))', border: '1px solid hsl(var(--border-subtle))', borderRadius: 10, padding: '8px 10px', color: 'hsl(var(--foreground))', fontSize: 14, minWidth: 220 };

  return (
    <section className="mt-10 rounded-2xl overflow-hidden" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border-subtle) / 0.6)' }}>
      <div className="px-6 py-4" style={{ borderBottom: '1px solid hsl(var(--border-subtle) / 0.5)' }}>
        <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>Provider–patient assignments</h2>
        <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-dim))' }}>
          {scope === 'assigned'
            ? 'Scope is ASSIGNED: a provider sees only patients assigned here, plus patients whose dispatched visit they accepted. Admins see all.'
            : 'Scope is ALL (single-practice mode): every provider sees every intake. Set PROVIDER_SCOPE=assigned to enforce the assignments below.'}
        </p>
      </div>
      <div className="px-6 py-4 flex flex-wrap items-end gap-3" style={{ borderBottom: '1px solid hsl(var(--border-subtle) / 0.3)' }}>
        <label className="grid gap-1 text-xs" style={{ color: 'hsl(var(--text-dim))' }}>Provider
          <select value={providerId} onChange={(e) => setProviderId(e.target.value)} style={sel}><option value="">—</option>{providers.map((u) => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}</select>
        </label>
        <label className="grid gap-1 text-xs" style={{ color: 'hsl(var(--text-dim))' }}>Patient
          <select value={patientId} onChange={(e) => setPatientId(e.target.value)} style={sel}><option value="">—</option>{patients.map((u) => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}</select>
        </label>
        <button type="button" disabled={!providerId || !patientId} onClick={() => void change(false)} className="text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50" style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))', fontFamily: 'var(--font-heading)' }}>Assign</button>
        {err && <span className="text-xs" style={{ color: 'hsl(var(--destructive))' }}>{err}</span>}
      </div>
      {rows === null ? <p className="px-6 py-5 text-sm" style={{ color: 'hsl(var(--text-dim))' }}>Loading…</p> : rows.length === 0 ? (
        <p className="px-6 py-5 text-sm" style={{ color: 'hsl(var(--text-dim))' }}>No assignments yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead><tr style={{ borderBottom: '1px solid hsl(var(--border-subtle) / 0.5)' }}>{['Provider', 'Patient', 'Since', ''].map((h) => <th key={h} className="text-left font-semibold px-6 py-3" style={{ color: 'hsl(var(--text-dim))' }}>{h}</th>)}</tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={{ borderBottom: '1px solid hsl(var(--border-subtle) / 0.3)' }}>
                <td className="px-6 py-3 text-foreground">{r.providerName || r.providerEmail}</td>
                <td className="px-6 py-3 text-foreground">{r.patientName || r.patientEmail}</td>
                <td className="px-6 py-3 vitals text-xs" style={{ color: 'hsl(var(--text-dimmer))' }}>{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—'}</td>
                <td className="px-6 py-3 text-right"><button type="button" onClick={() => void change(true, r.providerId, r.patientId)} className="text-xs hover:underline" style={{ color: 'hsl(var(--text-dim))' }}>Remove</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

// ─── Audit trail ─────────────────────────────────────────────────────────────

interface AuditRow {
  id: number;
  actorUserId: string | null;
  actorRole: string | null;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  patientUserId: string | null;
  ip: string | null;
  meta: Record<string, unknown> | null;
  createdAt: string | null;
}

function AuditPanel() {
  const [rows, setRows] = useState<AuditRow[] | null>(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/audit');
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as AuditRow[];
        if (!cancelled) setRows(data);
      } catch {
        if (!cancelled) setError('Could not load the audit trail.');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const shown = (rows ?? []).filter((r) => !filter || r.action.includes(filter) || (r.patientUserId ?? '').includes(filter) || (r.actorUserId ?? '').includes(filter));
  const short = (id: string | null) => (id ? id.slice(0, 8) : '—');

  return (
    <section className="mt-10 rounded-2xl overflow-hidden" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border-subtle) / 0.6)' }}>
      <div className="px-6 py-4 flex items-center justify-between gap-3 flex-wrap" style={{ borderBottom: '1px solid hsl(var(--border-subtle) / 0.5)' }}>
        <div>
          <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>Audit trail</h2>
          <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-dim))' }}>Who touched which record. Append-only; ids and actions, never clinical text. Last 100.</p>
        </div>
        <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter by action or id…" className="rounded-lg px-3 py-1.5 text-sm text-foreground outline-none" style={{ background: 'hsl(var(--surface-deeper))', border: '1px solid hsl(var(--border-subtle))', minWidth: 220 }} />
      </div>
      {error && <p className="px-6 py-5 text-sm" style={{ color: 'hsl(var(--destructive))' }}>{error}</p>}
      {!error && rows === null && <p className="px-6 py-5 text-sm" style={{ color: 'hsl(var(--text-dim))' }}>Loading…</p>}
      {!error && rows !== null && shown.length === 0 && <p className="px-6 py-5 text-sm" style={{ color: 'hsl(var(--text-dim))' }}>No events{filter ? ' match' : ' yet'}.</p>}
      {!error && shown.length > 0 && (
        <div className="overflow-x-auto" tabIndex={0}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid hsl(var(--border-subtle) / 0.5)' }}>
                {['When', 'Action', 'Actor', 'Role', 'Resource', 'Patient', 'IP', 'Details'].map((h) => (
                  <th key={h} className="text-left font-semibold px-4 py-3" style={{ color: 'hsl(var(--text-dim))' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id} style={{ borderBottom: '1px solid hsl(var(--border-subtle) / 0.3)' }}>
                  <td className="px-4 py-2 whitespace-nowrap vitals text-xs" style={{ color: 'hsl(var(--text-dimmer))' }}>{r.createdAt ? new Date(r.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—'}</td>
                  <td className="px-4 py-2 font-medium text-foreground vitals text-xs">{r.action}</td>
                  <td className="px-4 py-2 vitals text-xs" style={{ color: 'hsl(var(--text-dim))' }} title={r.actorUserId ?? ''}>{short(r.actorUserId)}</td>
                  <td className="px-4 py-2 text-xs" style={{ color: 'hsl(var(--text-dim))' }}>{r.actorRole ?? '—'}</td>
                  <td className="px-4 py-2 vitals text-xs" style={{ color: 'hsl(var(--text-dim))' }}>{r.resourceType ? `${r.resourceType} #${r.resourceId ?? ''}` : '—'}</td>
                  <td className="px-4 py-2 vitals text-xs" style={{ color: 'hsl(var(--text-dim))' }} title={r.patientUserId ?? ''}>{short(r.patientUserId)}</td>
                  <td className="px-4 py-2 vitals text-xs" style={{ color: 'hsl(var(--text-dimmer))' }}>{r.ip ?? '—'}</td>
                  <td className="px-4 py-2 vitals text-xs max-w-[260px] truncate" style={{ color: 'hsl(var(--text-dimmer))' }}>{r.meta ? Object.entries(r.meta).map(([k, v]) => `${k}=${String(v)}`).join(' ') : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function AdminProvidersPage() {
  const { session: sessionData, isPending } = useSession();
  const navigate = useNavigate();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [filtered, setFiltered] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'patient' | 'provider'>('all');
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const [pendingAction, setPendingAction] = useState<{ user: AdminUser; action: RoleAction } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [toasts, setToasts] = useState<Toast[]>([]);

  // ── Auth guard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isPending) return;
    if (!sessionData?.user) { navigate('/login'); return; }
    const u = sessionData.user as unknown as AdminUser;
    if (!u.isAdmin) { navigate('/'); return; }
  }, [sessionData, isPending, navigate]);

  // ── Fetch users ─────────────────────────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    setFetchError('');
    try {
      const res = await fetch('/api/admin/users');
      if (!res.ok) throw new Error('Failed to load users');
      const data = await res.json() as AdminUser[];
      setUsers(data);
    } catch {
      setFetchError(admin_providers.errorLoadUsers);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // ── Filter ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      users.filter((u) => {
        const matchesSearch =
          !q ||
          (u.name ?? '').toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q);
        const matchesRole =
          roleFilter === 'all' ||
          (roleFilter === 'provider' && u.role === 'provider') ||
          (roleFilter === 'patient' && u.role !== 'provider');
        return matchesSearch && matchesRole;
      })
    );
  }, [users, search, roleFilter]);

  // ── Toast helpers ───────────────────────────────────────────────────────────
  function addToast(message: string, kind: 'success' | 'error') {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, kind }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }

  function dismissToast(id: number) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  // ── Role change ─────────────────────────────────────────────────────────────
  async function confirmRoleChange() {
    if (!pendingAction) return;
    setActionLoading(true);
    const { user: target, action } = pendingAction;
    const newRole = action === 'promote' ? 'provider' : 'patient';
    try {
      const res = await fetch(`/api/admin/users/${target.id}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) {
        const err = await res.json() as { error?: string };
        throw new Error(err.error ?? 'Failed');
      }
      setUsers((prev) =>
        prev.map((u) => (u.id === target.id ? { ...u, role: newRole } : u))
      );
      addToast(
        action === 'promote'
          ? `${target.name ?? target.email} ${admin_providers.toastPromoted}`
          : `${target.name ?? target.email} ${admin_providers.toastDemoted}`,
        'success'
      );
    } catch (err) {
      addToast(err instanceof Error ? err.message : admin_providers.toastRoleFailed, 'error');
    } finally {
      setActionLoading(false);
      setPendingAction(null);
    }
  }

  // ── Counts ──────────────────────────────────────────────────────────────────
  const providerCount = users.filter((u) => u.role === 'provider').length;
  const patientCount = users.filter((u) => u.role !== 'provider' && !u.isAdmin).length;
  const adminCount = users.filter((u) => !!u.isAdmin).length;

  // ── Loading / unauthed state ─────────────────────────────────────────────────
  if (isPending || !sessionData?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: `hsl(var(--background))` }}>
        <div
          className="w-6 h-6 rounded-full border-2 animate-spin"
          style={{ borderColor: `hsl(var(--primary) / 0.2)`, borderTopColor: `hsl(var(--primary))` }}
        />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{admin_providers.pageTitle}</title>
        <meta name="description" content="Admin panel for managing provider role assignments on Acute Insight AI." />
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="min-h-screen" style={{ background: `hsl(var(--background))` }}>
        {/* Top bar */}
        <header
          className="sticky top-0 z-30 flex items-center justify-between px-6 py-4"
          style={{
            background: `hsl(var(--background) / 0.9)`,
            borderBottom: `1px solid hsl(var(--border-subtle) / 0.3)`,
            backdropFilter: 'blur(12px)',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: `hsl(var(--primary) / 0.12)`, border: `1px solid hsl(var(--primary) / 0.25)` }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-bold leading-none" style={{ color: `hsl(var(--foreground))`, fontFamily: 'var(--font-heading)' }}>
                {admin_providers.headerTitle}
              </h1>
              <p className="text-xs mt-0.5" style={{ color: `hsl(var(--muted-foreground))`, fontFamily: 'var(--font-sans)' }}>
                {admin_providers.headerSubtitle}
              </p>
            </div>
          </div>

          <a
            href="/provider"
            className="text-xs px-3 py-1.5 rounded-xl transition-opacity hover:opacity-70"
            style={{
              background: `hsl(var(--card))`,
              color: `hsl(var(--muted-foreground))`,
              border: `1px solid hsl(var(--border-subtle) / 0.4)`,
              fontFamily: 'var(--font-sans)',
            }}
          >
            {admin_providers.navProviderDashboard}
          </a>
        </header>

        <main className="max-w-5xl mx-auto px-4 py-8">
          {/* Page heading */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-8"
          >
            <h2 className="text-2xl font-bold mb-1" style={{ color: `hsl(var(--foreground))`, fontFamily: 'var(--font-heading)' }}>
              {admin_providers.heading}
            </h2>
            <p className="text-sm" style={{ color: `hsl(var(--muted-foreground))`, fontFamily: 'var(--font-sans)' }}>
              {admin_providers.subheading}
            </p>
          </motion.div>

          {/* Stat cards */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6"
          >
            {([
              {
                label: admin_providers.statTotalLabel,
                value: users.length,
                accent: false,
                icon: (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                ),
              },
              {
                label: admin_providers.statProvidersLabel,
                value: providerCount,
                accent: true,
                icon: (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                  </svg>
                ),
              },
              {
                label: admin_providers.statPatientsLabel,
                value: patientCount,
                accent: false,
                icon: (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                ),
              },
            ] as const).map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl p-4"
                style={{
                  background: `hsl(var(--card))`,
                  border: `1px solid hsl(var(--border-subtle) / 0.3)`,
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  {stat.icon}
                  <span className="text-xs" style={{ color: `hsl(var(--muted-foreground))`, fontFamily: 'var(--font-sans)' }}>
                    {stat.label}
                  </span>
                </div>
                <p
                  className="text-2xl font-bold"
                  style={{
                    color: stat.accent ? `hsl(var(--primary))` : `hsl(var(--foreground))`,
                    fontFamily: 'var(--font-heading)',
                  }}
                >
                  {stat.value}
                </p>
              </div>
            ))}
          </motion.div>

          {/* Search + filter bar */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="flex flex-col sm:flex-row gap-3 mb-4"
          >
            {/* Search input */}
            <div
              className="flex items-center gap-2 flex-1 rounded-2xl px-4 py-2.5"
              style={{
                background: `hsl(var(--card))`,
                border: `1px solid hsl(var(--border-subtle) / 0.4)`,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="text"
                placeholder={admin_providers.searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-transparent text-sm outline-none"
                style={{ color: `hsl(var(--foreground))`, fontFamily: 'var(--font-sans)' }}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="opacity-50 hover:opacity-100 transition-opacity"
                  aria-label="Clear search"
                  style={{ color: `hsl(var(--muted-foreground))` }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              )}
            </div>

            {/* Role filter tabs */}
            <div
              className="flex rounded-2xl p-1 gap-1"
              style={{ background: `hsl(var(--card))`, border: `1px solid hsl(var(--border-subtle) / 0.4)` }}
            >
              {(['all', 'provider', 'patient'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setRoleFilter(f)}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-150"
                  style={{
                    background: roleFilter === f ? `hsl(var(--primary))` : 'transparent',
                    color: roleFilter === f ? `hsl(var(--background))` : `hsl(var(--muted-foreground))`,
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  {f === 'all'
                    ? `${admin_providers.filterAll} (${users.length})`
                    : f === 'provider'
                    ? `${admin_providers.filterProviders} (${providerCount})`
                    : `${admin_providers.filterPatients} (${patientCount})`}
                </button>
              ))}
            </div>
          </motion.div>

          {/* User table */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            className="rounded-3xl overflow-hidden"
            style={{
              background: `hsl(var(--card))`,
              border: `1px solid hsl(var(--border-subtle) / 0.3)`,
            }}
          >
            {/* Column headers */}
            <div
              className="grid grid-cols-[1fr_1fr_120px_130px] gap-4 px-5 py-3 text-xs font-semibold uppercase tracking-wide"
              style={{
                color: `hsl(var(--muted-foreground))`,
                borderBottom: `1px solid hsl(var(--border-subtle) / 0.25)`,
                fontFamily: 'var(--font-sans)',
              }}
            >
              <span>{admin_providers.colName}</span>
              <span>{admin_providers.colEmail}</span>
              <span>{admin_providers.colRole}</span>
              <span className="text-right">{admin_providers.colAction}</span>
            </div>

            {/* Body */}
            {loadingUsers ? (
              <div className="flex flex-col gap-3 p-5">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-10 rounded-xl animate-pulse"
                    style={{ background: `hsl(var(--muted) / 0.5)` }}
                  />
                ))}
              </div>
            ) : fetchError ? (
              <div className="flex flex-col items-center gap-3 py-12 px-5">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--destructive))" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <p className="text-sm" style={{ color: `hsl(var(--muted-foreground))`, fontFamily: 'var(--font-sans)' }}>
                  {fetchError}
                </p>
                <button
                  onClick={fetchUsers}
                  className="text-xs px-4 py-2 rounded-xl transition-opacity hover:opacity-70"
                  style={{ background: `hsl(var(--primary))`, color: `hsl(var(--background))`, fontFamily: 'var(--font-sans)' }}
                >
                  {admin_providers.retryButton}
                </button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 px-5">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <p className="text-sm" style={{ color: `hsl(var(--muted-foreground))`, fontFamily: 'var(--font-sans)' }}>
                  {admin_providers.noUsersFound}
                </p>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {filtered.map((u, i) => {
                  const isCurrentUser = u.id === (sessionData.user as unknown as AdminUser).id;
                  const isProvider = u.role === 'provider';

                  return (
                    <motion.div
                      key={u.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.15, delay: i * 0.02 }}
                      className="grid grid-cols-[1fr_1fr_120px_130px] gap-4 items-center px-5 py-3.5"
                      style={{
                        borderBottom:
                          i < filtered.length - 1
                            ? `1px solid hsl(var(--border-subtle) / 0.15)`
                            : 'none',
                      }}
                    >
                      {/* Name + avatar */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold"
                          style={{
                            background: u.isAdmin
                              ? `hsl(var(--secondary) / 0.12)`
                              : isProvider
                              ? `hsl(var(--primary) / 0.1)`
                              : `hsl(var(--muted))`,
                            color: u.isAdmin
                              ? `hsl(var(--secondary))`
                              : isProvider
                              ? `hsl(var(--primary))`
                              : `hsl(var(--muted-foreground))`,
                            fontFamily: 'var(--font-heading)',
                          }}
                        >
                          {(u.name ?? u.email).charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p
                            className="text-sm font-medium truncate"
                            style={{ color: `hsl(var(--foreground))`, fontFamily: 'var(--font-sans)' }}
                          >
                            {u.name ?? '—'}
                            {isCurrentUser && (
                              <span className="ml-1.5 text-xs" style={{ color: `hsl(var(--muted-foreground))` }}>
                                {admin_providers.labelYou}
                              </span>
                            )}
                          </p>
                          {u.createdAt && (
                            <p
                              className="text-xs truncate"
                              style={{ color: `hsl(var(--muted-foreground))`, fontFamily: 'var(--font-sans)' }}
                            >
                              Joined{' '}
                              {new Date(u.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                year: 'numeric',
                              })}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Email */}
                      <p
                        className="text-sm truncate"
                        style={{ color: `hsl(var(--muted-foreground))`, fontFamily: 'var(--font-sans)' }}
                      >
                        {u.email}
                      </p>

                      {/* Role badge */}
                      <div>
                        <RoleBadge role={u.role} isAdmin={u.isAdmin} />
                      </div>

                      {/* Action button */}
                      <div className="flex justify-end">
                        {u.isAdmin || isCurrentUser ? (
                          <span
                            className="text-xs"
                            style={{ color: `hsl(var(--text-dimmer))`, fontFamily: 'var(--font-sans)' }}
                          >
                            {isCurrentUser ? admin_providers.labelYou : admin_providers.labelAdmin}
                          </span>
                        ) : isProvider ? (
                          <button
                            onClick={() => setPendingAction({ user: u, action: 'demote' })}
                            className="text-xs px-3 py-1.5 rounded-xl font-medium transition-all duration-150 hover:opacity-80"
                            style={{
                              background: `hsl(var(--destructive) / 0.1)`,
                              color: `hsl(var(--destructive))`,
                              border: `1px solid hsl(var(--destructive) / 0.25)`,
                              fontFamily: 'var(--font-sans)',
                            }}
                          >
                            {admin_providers.actionRemoveAccess}
                          </button>
                        ) : (
                          <button
                            onClick={() => setPendingAction({ user: u, action: 'promote' })}
                            className="text-xs px-3 py-1.5 rounded-xl font-medium transition-all duration-150 hover:opacity-80"
                            style={{
                              background: `hsl(var(--primary) / 0.1)`,
                              color: `hsl(var(--primary))`,
                              border: `1px solid hsl(var(--primary) / 0.25)`,
                              fontFamily: 'var(--font-sans)',
                            }}
                          >
                            {admin_providers.actionMakeProvider}
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}

            {/* Footer row */}
            {!loadingUsers && !fetchError && filtered.length > 0 && (
              <div
                className="px-5 py-3 text-xs"
                style={{
                  color: `hsl(var(--muted-foreground))`,
                  borderTop: `1px solid hsl(var(--border-subtle) / 0.2)`,
                  fontFamily: 'var(--font-sans)',
                }}
              >
                Showing {filtered.length} of {users.length} users
                {adminCount > 0 &&
                  ` · ${adminCount} admin${adminCount > 1 ? 's' : ''} ${admin_providers.footerAdminNote}`}
              </div>
            )}
          </motion.div>

          <AccessRequestsPanel />
          <AssignmentsPanel />
          <AuditPanel />
          <IdleGuard mode="clinical" />
        </main>
      </div>

      {/* Confirmation dialog */}
      <AnimatePresence>
        {pendingAction && (
          <ConfirmDialog
            targetUser={pendingAction.user}
            action={pendingAction.action}
            onConfirm={confirmRoleChange}
            onCancel={() => setPendingAction(null)}
            loading={actionLoading}
          />
        )}
      </AnimatePresence>

      {/* Toast notifications */}
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
