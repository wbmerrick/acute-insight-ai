import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { Helmet } from '@dr.pogodin/react-helmet';
import { motion } from 'motion/react';
import { useSession, signOut } from '@/lib/auth/auth-client';
import { ProtectedRoute } from '@/lib/auth/auth-client';
import { portal } from 'virtual:content';
import type { ClinicalBrief } from '@/lib/clinical-brief';
import { acuityMeta } from '@/components/clinical-brief-view';
import { RequestClinician } from '@/components/request-clinician';
import { VerifyEmailNudge } from '@/components/verify-email-nudge';
import { IdleGuard } from '@/components/idle-guard';
import { DataRights } from '@/components/data-rights';

// ─── Types ───────────────────────────────────────────────────────────────────

interface IntakeSession {
  id: number;
  status: string;
  chiefComplaint: string | null;
  aiSummary: string | null;
  aiFlags: string[] | null;
  aiBrief: ClinicalBrief | null;
  appointmentDate: string | null;
  providerName: string | null;
  createdAt: string;
  visit: {
    id: number;
    status: 'pending_payment' | 'queued' | 'accepted' | 'completed' | 'cancelled';
    state: string;
    paymentStatus: string | null;
    amountCents: number | null;
    acceptedAt: string | null;
    completedAt: string | null;
    clinicianName: string | null;
    clinicianCredential: string | null;
  } | null;
}

interface Checkin {
  id: number;
  intakeSessionId: number;
  reason: string;
  dueAt: string;
  status: 'scheduled' | 'sent' | 'answered' | 'escalated' | 'expired';
  outcome: 'better' | 'same' | 'worse' | null;
  chiefComplaint: string | null;
  intakeCreatedAt: string | null;
  providerName: string | null;
  escalationNote: string | null;
}

interface PatientProfile {
  dateOfBirth: string | null;
  gender: string | null;
  phone: string | null;
  conditions: string[] | null;
  medications: string[] | null;
  allergies: string[] | null;
}

// ─── Stat card ───────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, accent = false }: { label: string; value: string | number; icon: React.ReactNode; accent?: boolean }) {
  return (
    <motion.div
      className="rounded-2xl p-5"
      style={{
        background: accent ? `hsl(var(--primary) / 0.08)` : `hsl(var(--card))`,
        border: `1px solid ${accent ? `hsl(var(--primary) / 0.3)` : `hsl(var(--border-subtle) / 0.5)`}`,
      }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: `hsl(var(--primary) / 0.12)`, color: `hsl(var(--primary))` }}
        >
          {icon}
        </div>
      </div>
      <div
        className="text-2xl font-bold text-foreground mb-0.5"
        style={{ fontFamily: 'var(--font-heading)' }}
      >
        {value}
      </div>
      <div className="text-xs text-muted-foreground" style={{ fontFamily: 'var(--font-sans)' }}>
        {label}
      </div>
    </motion.div>
  );
}

// ─── Intake row ──────────────────────────────────────────────────────────────


// ─── Dispatch status for one intake (the patient's side of the marketplace) ──
function VisitStatus({ intake, onChanged }: { intake: IntakeSession; onChanged?: () => void }) {
  const [open, setOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const disp = intake.aiBrief?.disposition;
  const v = intake.visit;
  if (!disp || disp.level === 'emergency') return null;
  const who = v?.clinicianName ? `${v.clinicianName}${v.clinicianCredential ? `, ${v.clinicianCredential}` : ''}` : 'A clinician';
  const pill = (text: string, h: string, pulse = false) => (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: `hsl(${h} / 0.1)`, color: `hsl(${h})`, border: `1px solid hsl(${h} / 0.3)`, fontFamily: 'var(--font-sans)' }}>
      <span className={pulse ? 'animate-pulse' : ''} style={{ width: 6, height: 6, borderRadius: 99, background: 'currentColor' }} />
      {text}
    </span>
  );
  if (!v) {
    return (
      <div className="mt-2">
        {!open ? (
          <button type="button" onClick={() => setOpen(true)} className="text-xs font-semibold hover:underline" style={{ color: 'hsl(var(--primary))', fontFamily: 'var(--font-sans)' }}>
            Connect with a clinician about this
          </button>
        ) : (
          <div className="mt-2 max-w-xl"><RequestClinician intakeId={intake.id} disposition={disp} /></div>
        )}
      </div>
    );
  }
  return (
    <div className="mt-2">
      {v.status === 'pending_payment' && (
        <div className="mt-1 max-w-xl"><RequestClinician intakeId={intake.id} disposition={disp} /></div>
      )}
      {v.status === 'queued' && (
        <span className="inline-flex items-center gap-3 flex-wrap">
          {pill(`Waiting for a clinician in ${v.state}`, 'var(--warning)', true)}
          {v.paymentStatus === 'authorized' && v.amountCents ? (
            <span className="text-xs" style={{ color: 'hsl(var(--text-dimmer))' }}>${v.amountCents / 100} held, charged only on accept</span>
          ) : null}
          <button
            type="button"
            disabled={cancelling}
            onClick={async () => {
              setCancelling(true);
              try { await fetch(`/api/dispatch/visits/${v.id}/cancel`, { method: 'POST' }); onChanged?.(); } finally { setCancelling(false); }
            }}
            className="text-xs hover:underline"
            style={{ color: 'hsl(var(--text-dim))' }}
          >
            Cancel request
          </button>
        </span>
      )}
      {v.status === 'accepted' && pill(`${who} accepted — expect a call`, 'var(--primary)')}
      {v.status === 'completed' && pill(`Visit completed with ${who}`, 'var(--primary)')}
      {v.status === 'cancelled' && pill('Request cancelled — nothing charged', 'var(--text-dim)')}
    </div>
  );
}

function IntakeRow({ intake, onCheckIn, onChanged }: { intake: IntakeSession; onCheckIn?: (intake: IntakeSession) => void; onChanged?: () => void }) {
  const date = new Date(intake.createdAt);
  const formatted = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const isComplete = intake.status === 'complete';
  const disp = intake.aiBrief?.disposition ?? null;
  const dm = disp ? acuityMeta(disp.level) : null;

  return (
    <div
      className="flex items-start gap-4 py-4"
      style={{ borderBottom: `1px solid hsl(var(--border-subtle) / 0.3)` }}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
        style={{
          background: isComplete ? `hsl(var(--primary) / 0.1)` : `hsl(var(--muted))`,
          color: isComplete ? `hsl(var(--primary))` : `hsl(var(--muted-foreground))`,
        }}
      >
        {isComplete ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 6v6l4 2"/>
          </svg>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="text-sm font-semibold text-foreground" style={{ fontFamily: 'var(--font-sans)' }}>
            {intake.chiefComplaint || 'General intake'}
          </span>
          <span
            className="px-2 py-0.5 rounded-full text-xs font-medium"
            style={{
              background: isComplete ? `hsl(var(--primary) / 0.1)` : `hsl(var(--muted))`,
              color: isComplete ? `hsl(var(--primary))` : `hsl(var(--muted-foreground))`,
            }}
          >
            {isComplete ? 'Complete' : 'In progress'}
          </span>
          {disp && dm && (
            <span
              className="px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide"
              style={{ fontFamily: 'var(--font-mono)', background: `hsl(${dm.h} / 0.12)`, color: `hsl(${dm.h})`, border: `1px solid hsl(${dm.h} / 0.3)` }}
            >
              {dm.tag}
            </span>
          )}
        </div>
        {disp?.label && (
          <p className="text-xs mb-1" style={{ color: 'hsl(var(--text-dim))', fontFamily: 'var(--font-sans)' }}>
            Suggested next step: {disp.label}
          </p>
        )}
        {intake.aiSummary && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-1" style={{ fontFamily: 'var(--font-sans)' }}>
            {intake.aiSummary}
          </p>
        )}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs text-muted-foreground" style={{ fontFamily: 'var(--font-sans)' }}>
            <time dateTime={intake.createdAt}>{formatted}</time>
          </span>
          {intake.providerName && (
            <span className="text-xs text-muted-foreground" style={{ fontFamily: 'var(--font-sans)' }}>
              · {intake.providerName}
            </span>
          )}
        </div>
        {intake.aiFlags && intake.aiFlags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {intake.aiFlags.map((flag, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded-full text-xs"
                style={{
                  background: `hsl(var(--destructive) / 0.08)`,
                  color: `hsl(var(--destructive))`,
                  border: `1px solid hsl(var(--destructive) / 0.2)`,
                }}
              >
                ⚠ {flag}
              </span>
            ))}
          </div>
        )}
        {isComplete && disp && <VisitStatus intake={intake} onChanged={onChanged} />}
        {isComplete && onCheckIn && (
          <button
            type="button"
            onClick={() => onCheckIn(intake)}
            className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold hover:underline"
            style={{ color: 'hsl(var(--primary))', fontFamily: 'var(--font-sans)' }}
          >
            Check in with Ace about this
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Portal content ──────────────────────────────────────────────────────────

function PortalContent() {
  const { user } = useSession();
  const navigate = useNavigate();
  const [intakes, setIntakes] = useState<IntakeSession[]>([]);
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [deleteMode, setDeleteMode] = useState<'delete' | 'deidentify'>('delete');
  const [pendingCheckin, setPendingCheckin] = useState<Checkin | null>(null);
  const [checkinDone, setCheckinDone] = useState<'better' | 'escalated' | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'profile'>('overview');

  useEffect(() => {
    async function load() {
      try {
        const [intakesRes, profileRes, checkinRes] = await Promise.all([
          fetch('/api/patient/intakes'),
          fetch('/api/patient/profile'),
          fetch('/api/companion/checkins'),
        ]);
        if (intakesRes.ok) setIntakes(await intakesRes.json());
        if (checkinRes.ok) {
          const d = (await checkinRes.json()) as { pending: Checkin | null };
          setPendingCheckin(d.pending);
        }
        if (profileRes.ok) {
          const data = await profileRes.json();
          setProfile(data.profile);
          if (data.deleteMode === 'deidentify') setDeleteMode('deidentify');
        }
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  async function reloadIntakes() {
    try {
      const r = await fetch('/api/patient/intakes');
      if (r.ok) setIntakes(await r.json());
    } catch { /* ignore */ }
  }

  // While a visit is waiting or accepted, keep the timeline live without a reload.
  const hasLiveVisit = intakes.some((i) => i.visit && (i.visit.status === 'queued' || i.visit.status === 'accepted'));
  useEffect(() => {
    if (!hasLiveVisit) return;
    const t = window.setInterval(async () => {
      try {
        const r = await fetch('/api/patient/intakes');
        if (r.ok) setIntakes(await r.json());
      } catch { /* retry next tick */ }
    }, 8000);
    return () => window.clearInterval(t);
  }, [hasLiveVisit]);

  const completedIntakes = intakes.filter((i) => i.status === 'complete');
  const firstName = user?.name?.split(' ')[0] ?? 'Patient';

  async function handleSignOut() {
    await signOut();
    navigate('/login');
  }

  // Companion check-in: hand the thread back to Ace with the prior visit as context.
  function checkIn(intake: IntakeSession) {
    const when = new Date(intake.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    const cc = (intake.chiefComplaint || 'my last visit').replace(/\s+/g, ' ').trim().slice(0, 140);
    navigate('/intake', { state: { firstMessage: `I'm checking in about my visit from ${when}, when I reported: "${cc}".` } });
  }
  const lastCompleted = completedIntakes[0] ?? null;

  // Ace's scheduled check-in: one tap, then (for same/worse) straight into Ace with the context attached.
  async function answerCheckin(c: Checkin, outcome: 'better' | 'same' | 'worse') {
    try {
      const r = await fetch(`/api/companion/checkins/${c.id}/answer`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ outcome }) });
      if (!r.ok) return;
    } catch { return; }
    if (outcome === 'better') { setCheckinDone('better'); setPendingCheckin(null); return; }
    const when = c.intakeCreatedAt ? new Date(c.intakeCreatedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : 'my last visit';
    const cc = (c.chiefComplaint || 'my last visit').replace(/\s+/g, ' ').trim().slice(0, 140);
    const feel = outcome === 'worse' ? "I'm feeling worse" : "I'm about the same";
    navigate('/intake', {
      state: {
        firstMessage: `Checking in about my visit from ${when}, when I reported: "${cc}". ${feel} since then.`,
        checkinId: c.id,
        outcome,
      },
    });
  }

  return (
    <div
      className="min-h-screen"
      style={{ background: `hsl(var(--background))` }}
    >
      {/* ── Portal header ── */}
      <header
        className="sticky top-0 z-40 px-6 py-4"
        style={{
          background: `hsl(var(--card) / 0.9)`,
          borderBottom: `1px solid hsl(var(--border-subtle) / 0.4)`,
          backdropFilter: 'blur(12px)',
        }}
      >
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: `hsl(var(--primary) / 0.15)`, border: `1px solid hsl(var(--primary) / 0.3)` }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="2">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                </svg>
              </div>
            </Link>
            <span
              className="text-xs font-medium text-muted-foreground hidden sm:block"
              style={{ fontFamily: 'var(--font-sans)' }}
            >
              {portal.portalLabel}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
              style={{
                background: `hsl(var(--primary) / 0.15)`,
                color: `hsl(var(--primary))`,
                fontFamily: 'var(--font-heading)',
              }}
            >
              {firstName[0]?.toUpperCase()}
            </div>
            <button
              onClick={handleSignOut}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              style={{ fontFamily: 'var(--font-sans)' }}
            >
              {portal.signOutButton}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* ── Welcome ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="mb-8"
        >
          <h1
            className="text-3xl font-bold text-foreground mb-1"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            {portal.welcomeHeading}, {firstName}
          </h1>
          <p className="text-muted-foreground text-sm" style={{ fontFamily: 'var(--font-sans)' }}>
            {portal.welcomeSubheading}
          </p>
        </motion.div>

        {/* ── Tabs ── */}
        <div
          className="flex gap-1 mb-8 p-1 rounded-xl w-fit"
          style={{ background: `hsl(var(--card))`, border: `1px solid hsl(var(--border-subtle) / 0.4)` }}
        >
          {(['overview', 'history', 'profile'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all duration-200"
              style={{
                fontFamily: 'var(--font-sans)',
                background: activeTab === tab ? `hsl(var(--primary))` : 'transparent',
                color: activeTab === tab ? `hsl(var(--background))` : `hsl(var(--muted-foreground))`,
              }}
            >
              {tab === 'overview' ? portal.overviewTab : tab === 'history' ? portal.historyTab : portal.profileTab}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div
              className="w-8 h-8 rounded-full border-2 animate-spin"
              style={{ borderColor: `hsl(var(--primary))`, borderTopColor: 'transparent' }}
            />
          </div>
        ) : (
          <>
            {/* ── Overview tab ── */}
            {activeTab === 'overview' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.25 }}
              >
                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <StatCard
                    label="Total intakes"
                    value={intakes.length}
                    accent
                    icon={
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                      </svg>
                    }
                  />
                  <StatCard
                    label="Completed"
                    value={completedIntakes.length}
                    icon={
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                        <polyline points="22 4 12 14.01 9 11.01"/>
                      </svg>
                    }
                  />
                  <StatCard
                    label="Conditions tracked"
                    value={profile?.conditions?.length ?? 0}
                    icon={
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                      </svg>
                    }
                  />
                  <StatCard
                    label="Medications"
                    value={profile?.medications?.length ?? 0}
                    icon={
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0016.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 002 8.5c0 2.3 1.5 4.05 3 5.5l7 7z"/>
                      </svg>
                    }
                  />
                </div>

                <VerifyEmailNudge />
                {/* Ace's scheduled check-in (due now) */}
                {pendingCheckin && (
                  <motion.div
                    className="rounded-2xl p-6 mb-6"
                    style={{ background: `hsl(var(--card))`, border: `1px solid hsl(var(--warning) / 0.45)`, boxShadow: `0 0 36px hsl(var(--warning) / 0.08)` }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <p className="text-[11px] uppercase tracking-widest mb-2" style={{ fontFamily: 'var(--font-mono)', color: 'hsl(var(--warning))' }}>
                      Ace is checking in
                    </p>
                    <h3 className="text-base font-bold text-foreground mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
                      How are you doing since {pendingCheckin.intakeCreatedAt ? new Date(pendingCheckin.intakeCreatedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : 'your visit'}?
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4" style={{ fontFamily: 'var(--font-sans)' }}>
                      You {pendingCheckin.providerName ? `saw ${pendingCheckin.providerName}` : 'came in'} for “{(pendingCheckin.chiefComplaint || 'a visit').slice(0, 90)}”. One tap is enough — if it's not better, Ace will ask a few questions and flag your provider if needed.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {([['better', 'Better', 'var(--primary)'], ['same', 'About the same', 'var(--warning)'], ['worse', 'Worse', 'var(--destructive)']] as const).map(([v, label, h]) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => void answerCheckin(pendingCheckin, v)}
                          className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                          style={{ background: `hsl(${h} / 0.12)`, color: `hsl(${h})`, border: `1px solid hsl(${h} / 0.45)`, fontFamily: 'var(--font-sans)' }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs mt-3" style={{ color: 'hsl(var(--text-dimmer))' }}>If this is an emergency, call 911 — don't wait for Ace.</p>
                  </motion.div>
                )}
                {checkinDone === 'better' && (
                  <div className="rounded-2xl p-4 mb-6 text-sm" style={{ background: 'hsl(var(--primary) / 0.08)', border: '1px solid hsl(var(--primary) / 0.3)', color: 'hsl(var(--foreground))' }}>
                    Glad you're better. Logged on your timeline — your provider can see it.
                  </div>
                )}

                {/* Companion check-in — since your last visit */}
                {!pendingCheckin && lastCompleted && (
                  <motion.div
                    className="rounded-2xl p-6 mb-6"
                    style={{ background: `hsl(var(--card))`, border: `1px solid hsl(var(--primary) / 0.3)`, boxShadow: `0 0 36px hsl(var(--primary) / 0.06)` }}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <p className="text-[11px] uppercase tracking-widest mb-2" style={{ fontFamily: 'var(--font-mono)', color: 'hsl(var(--primary))' }}>
                      Since your last visit
                    </p>
                    <h3 className="text-base font-bold text-foreground mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
                      How are you doing since {new Date(lastCompleted.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}?
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4" style={{ fontFamily: 'var(--font-sans)' }}>
                      You came in for “{(lastCompleted.chiefComplaint || 'a visit').slice(0, 90)}{(lastCompleted.chiefComplaint || '').length > 90 ? '…' : ''}”. Ace can check in, note what’s changed, update your record, and flag anything your provider should see.
                    </p>
                    <button
                      type="button"
                      onClick={() => checkIn(lastCompleted)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
                      style={{ background: `hsl(var(--primary))`, color: `hsl(var(--background))`, fontFamily: 'var(--font-sans)', boxShadow: `0 0 16px hsl(var(--primary) / 0.25)` }}
                    >
                      Check in with Ace
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                    </button>
                  </motion.div>
                )}

                {/* Start intake CTA */}
                <motion.div
                  className="rounded-2xl p-6 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  style={{
                    background: `hsl(var(--primary) / 0.07)`,
                    border: `1px solid hsl(var(--primary) / 0.25)`,
                  }}
                  whileHover={{ boxShadow: `0 0 30px hsl(var(--primary) / 0.1)` }}
                >
                  <div>
                  <h3
                    className="text-base font-bold text-foreground mb-1"
                    style={{ fontFamily: 'var(--font-heading)' }}
                  >
                    {portal.startIntakeHeading}
                  </h3>
                  <p className="text-sm text-muted-foreground" style={{ fontFamily: 'var(--font-sans)' }}>
                    {portal.startIntakeSubheading}
                  </p>
                  </div>
                  <Link
                    to="/intake"
                    className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
                    style={{
                      background: `hsl(var(--primary))`,
                      color: `hsl(var(--background))`,
                      fontFamily: 'var(--font-sans)',
                      boxShadow: `0 0 16px hsl(var(--primary) / 0.25)`,
                    }}
                  >
                    {portal.startIntakeButton}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </Link>
                </motion.div>

                {/* Recent intakes */}
                <div
                  className="rounded-2xl p-6"
                  style={{
                    background: `hsl(var(--card))`,
                    border: `1px solid hsl(var(--border-subtle) / 0.5)`,
                  }}
                >
                  <h2
                    className="text-base font-bold text-foreground mb-4"
                    style={{ fontFamily: 'var(--font-heading)' }}
                  >
                    {portal.recentIntakesHeading}
                  </h2>
                  {intakes.length === 0 ? (
                    <div className="py-10 text-center">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
                        style={{ background: `hsl(var(--primary) / 0.08)`, color: `hsl(var(--primary))` }}
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/>
                          <line x1="16" y1="13" x2="8" y2="13"/>
                          <line x1="16" y1="17" x2="8" y2="17"/>
                        </svg>
                      </div>
                      <p className="text-sm text-muted-foreground" style={{ fontFamily: 'var(--font-sans)' }}>
                        {portal.noIntakesText}
                      </p>
                    </div>
                  ) : (
                    <div>
                      {intakes.slice(0, 5).map((intake) => (
                        <IntakeRow key={intake.id} intake={intake} onCheckIn={checkIn} onChanged={() => void reloadIntakes()} />
                      ))}
                      {intakes.length > 5 && (
                        <button
                          onClick={() => setActiveTab('history')}
                          className="mt-3 text-xs font-medium text-primary hover:underline"
                          style={{ fontFamily: 'var(--font-sans)' }}
                        >
                          View all {intakes.length} intakes →
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ── History tab ── */}
            {activeTab === 'history' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.25 }}
              >
                <div
                  className="rounded-2xl p-6"
                  style={{
                    background: `hsl(var(--card))`,
                    border: `1px solid hsl(var(--border-subtle) / 0.5)`,
                  }}
                >
                  <div className="flex items-center justify-between mb-6">
                    <h2
                      className="text-base font-bold text-foreground"
                      style={{ fontFamily: 'var(--font-heading)' }}
                    >
                      {portal.historyHeading}
                    </h2>
                    <span className="text-xs text-muted-foreground" style={{ fontFamily: 'var(--font-sans)' }}>
                      {intakes.length} total
                    </span>
                  </div>
                  <p className="text-sm -mt-4 mb-6" style={{ color: 'hsl(var(--text-dim))', fontFamily: 'var(--font-sans)' }}>
                    Your living record — every intake, its suggested next step, and what was flagged. Check in with Ace on any of them.
                  </p>
                  {intakes.length === 0 ? (
                    <div className="py-10 text-center">
                      <p className="text-sm text-muted-foreground" style={{ fontFamily: 'var(--font-sans)' }}>
                        No intake history yet.
                      </p>
                    </div>
                  ) : (
                    intakes.map((intake) => <IntakeRow key={intake.id} intake={intake} onCheckIn={checkIn} onChanged={() => void reloadIntakes()} />)
                  )}
                </div>
              </motion.div>
            )}

            {/* ── Profile tab ── */}
            {activeTab === 'profile' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.25 }}
              >
                <ProfileTab profile={profile} userEmail={user?.email ?? ''} userName={user?.name ?? ''} />
                <DataRights email={user?.email ?? ''} deleteMode={deleteMode} />
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Profile tab ─────────────────────────────────────────────────────────────

function ProfileTab({ profile, userEmail, userName }: { profile: PatientProfile | null; userEmail: string; userName: string }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    dateOfBirth: profile?.dateOfBirth ?? '',
    gender: profile?.gender ?? '',
    phone: profile?.phone ?? '',
    conditions: (profile?.conditions ?? []).join(', '),
    medications: (profile?.medications ?? []).join(', '),
    allergies: (profile?.allergies ?? []).join(', '),
  });

  async function handleSave() {
    setSaving(true);
    try {
      await fetch('/api/patient/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dateOfBirth: form.dateOfBirth || null,
          gender: form.gender || null,
          phone: form.phone || null,
          conditions: form.conditions ? form.conditions.split(',').map((s) => s.trim()).filter(Boolean) : [],
          medications: form.medications ? form.medications.split(',').map((s) => s.trim()).filter(Boolean) : [],
          allergies: form.allergies ? form.allergies.split(',').map((s) => s.trim()).filter(Boolean) : [],
        }),
      });
      setSaved(true);
      setEditing(false);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  const fields = [
    { key: 'dateOfBirth' as const, label: 'Date of birth', type: 'date' },
    { key: 'gender' as const, label: 'Gender', type: 'text' },
    { key: 'phone' as const, label: 'Phone number', type: 'tel' },
    { key: 'conditions' as const, label: 'Chronic conditions', type: 'text', hint: 'Comma-separated, e.g. Hypertension, Type 2 Diabetes' },
    { key: 'medications' as const, label: 'Current medications', type: 'text', hint: 'Comma-separated, e.g. Metformin 1000mg, Lisinopril 10mg' },
    { key: 'allergies' as const, label: 'Allergies', type: 'text', hint: 'Comma-separated, e.g. Penicillin, Sulfa drugs' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Account info */}
      <div
        className="rounded-2xl p-6"
        style={{
          background: `hsl(var(--card))`,
          border: `1px solid hsl(var(--border-subtle) / 0.5)`,
        }}
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold mb-4"
          style={{
            background: `hsl(var(--primary) / 0.12)`,
            color: `hsl(var(--primary))`,
            fontFamily: 'var(--font-heading)',
          }}
        >
          {userName?.[0]?.toUpperCase() ?? '?'}
        </div>
        <h3 className="text-base font-bold text-foreground mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
          {userName || 'Patient'}
        </h3>
        <p className="text-sm text-muted-foreground mb-4" style={{ fontFamily: 'var(--font-sans)' }}>
          {userEmail}
        </p>
        <div
          className="px-3 py-1.5 rounded-full text-xs font-medium w-fit"
          style={{
            background: `hsl(var(--primary) / 0.1)`,
            color: `hsl(var(--primary))`,
            fontFamily: 'var(--font-sans)',
          }}
        >
          {portal.accountLabel}
        </div>
      </div>

      {/* Health profile */}
      <div
        className="lg:col-span-2 rounded-2xl p-6"
        style={{
          background: `hsl(var(--card))`,
          border: `1px solid hsl(var(--border-subtle) / 0.5)`,
        }}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-base font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
            {portal.profileHeading}
          </h3>
          <div className="flex items-center gap-2">
            {saved && (
              <span className="text-xs text-primary" style={{ fontFamily: 'var(--font-sans)' }}>
                Saved ✓
              </span>
            )}
            {editing ? (
              <>
                <button
                  onClick={() => setEditing(false)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg"
                  style={{ fontFamily: 'var(--font-sans)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all duration-200 disabled:opacity-50"
                  style={{
                    background: `hsl(var(--primary))`,
                    color: `hsl(var(--background))`,
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="text-xs font-medium text-primary hover:underline"
                style={{ fontFamily: 'var(--font-sans)' }}
              >
                Edit
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {fields.map((field) => (
            <div key={field.key} className={field.key === 'conditions' || field.key === 'medications' || field.key === 'allergies' ? 'sm:col-span-2' : ''}>
              <label
                className="block text-xs font-medium mb-1.5"
                style={{ fontFamily: 'var(--font-sans)', color: `hsl(var(--foreground) / 0.6)` }}
              >
                {field.label}
              </label>
              {editing ? (
                <>
                  <input
                    type={field.type}
                    value={form[field.key]}
                    onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl text-sm outline-none transition-all duration-200"
                    style={{
                      background: `hsl(var(--background))`,
                      border: `1px solid hsl(var(--border-subtle) / 0.6)`,
                      color: `hsl(var(--foreground))`,
                      fontFamily: 'var(--font-sans)',
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = `hsl(var(--primary) / 0.6)`)}
                    onBlur={(e) => (e.currentTarget.style.borderColor = `hsl(var(--border-subtle) / 0.6)`)}
                  />
                  {field.hint && (
                    <p className="text-xs text-muted-foreground mt-1" style={{ fontFamily: 'var(--font-sans)' }}>
                      {field.hint}
                    </p>
                  )}
                </>
              ) : (
                <p
                  className="text-sm text-foreground"
                  style={{ fontFamily: 'var(--font-sans)' }}
                >
                  {form[field.key] || <span className="text-muted-foreground italic">Not set</span>}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Export with ProtectedRoute ───────────────────────────────────────────────

export default function PatientPortalPage() {
  return (
    <>
      <Helmet>
        <title>Patient Portal — Acute Insight AI</title>
        <meta name="description" content="Your Acute Insight AI patient portal — view intake history, health records, and upcoming visits." />
        <meta name="robots" content="noindex" />
      </Helmet>
      <ProtectedRoute>
        <PortalContent />
        <IdleGuard mode="patient" />
      </ProtectedRoute>
    </>
  );
}
