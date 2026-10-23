import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { Helmet } from '@dr.pogodin/react-helmet';
import { motion, AnimatePresence } from 'motion/react';
import { useSession, signOut } from '@/lib/auth/auth-client';
import { ProtectedRoute } from '@/lib/auth/auth-client';
import { provider } from 'virtual:content';

// ─── Types ───────────────────────────────────────────────────────────────────

interface PatientProfile {
  dateOfBirth: string | null;
  gender: string | null;
  phone: string | null;
  conditions: string[] | null;
  medications: string[] | null;
  allergies: string[] | null;
}

interface ProviderIntake {
  id: number;
  status: string;
  chiefComplaint: string | null;
  aiSummary: string | null;
  aiFlags: string[] | null;
  appointmentDate: string | null;
  providerName: string | null;
  createdAt: string;
  patientId: string;
  patientName: string | null;
  patientEmail: string;
  profile: PatientProfile | null;
}

// ─── Patient brief card ───────────────────────────────────────────────────────

function PatientBriefCard({
  intake,
  isSelected,
  onClick,
}: {
  intake: ProviderIntake;
  isSelected: boolean;
  onClick: () => void;
}) {
  const date = new Date(intake.createdAt);
  const formatted = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const hasFlags = intake.aiFlags && intake.aiFlags.length > 0;
  const initials = (intake.patientName ?? intake.patientEmail)
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <motion.button
      onClick={onClick}
      className="w-full text-left rounded-2xl p-4 transition-all duration-200"
      style={{
        background: isSelected ? `hsl(var(--primary) / 0.08)` : `hsl(var(--card))`,
        border: `1px solid ${isSelected ? `hsl(var(--primary) / 0.4)` : `hsl(var(--border-subtle) / 0.4)`}`,
        boxShadow: isSelected ? `0 0 20px hsl(var(--primary) / 0.08)` : 'none',
      }}
      whileHover={{ scale: 1.005 }}
      transition={{ duration: 0.12 }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0"
          style={{
            background: hasFlags ? `hsl(var(--destructive) / 0.12)` : `hsl(var(--primary) / 0.12)`,
            color: hasFlags ? `hsl(var(--destructive))` : `hsl(var(--primary))`,
            fontFamily: 'var(--font-heading)',
          }}
        >
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className="text-sm font-semibold text-foreground truncate" style={{ fontFamily: 'var(--font-sans)' }}>
              {intake.patientName ?? intake.patientEmail}
            </span>
            {hasFlags && (
              <span
                className="px-1.5 py-0.5 rounded-full text-xs font-medium shrink-0"
                style={{
                  background: `hsl(var(--destructive) / 0.1)`,
                  color: `hsl(var(--destructive))`,
                }}
              >
                {intake.aiFlags!.length} flag{intake.aiFlags!.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate mb-1" style={{ fontFamily: 'var(--font-sans)' }}>
            {intake.chiefComplaint ?? 'General intake'}
          </p>
          <time
            dateTime={intake.createdAt}
            className="text-xs text-muted-foreground"
            style={{ fontFamily: 'var(--font-sans)' }}
          >
            {formatted}
          </time>
        </div>
      </div>
    </motion.button>
  );
}

// ─── Detail panel ─────────────────────────────────────────────────────────────

function DetailPanel({ intake }: { intake: ProviderIntake }) {
  const date = new Date(intake.createdAt);
  const formatted = date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const initials = (intake.patientName ?? intake.patientEmail)
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <motion.div
      key={intake.id}
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="h-full overflow-y-auto"
    >
      {/* Patient header */}
      <div
        className="rounded-2xl p-6 mb-4"
        style={{
          background: `hsl(var(--card))`,
          border: `1px solid hsl(var(--border-subtle) / 0.5)`,
        }}
      >
        <div className="flex items-center gap-4 mb-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-base font-bold"
            style={{
              background: `hsl(var(--primary) / 0.12)`,
              color: `hsl(var(--primary))`,
              fontFamily: 'var(--font-heading)',
            }}
          >
            {initials}
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
              {intake.patientName ?? 'Unknown Patient'}
            </h2>
            <p className="text-xs text-muted-foreground" style={{ fontFamily: 'var(--font-sans)' }}>
              {intake.patientEmail}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {intake.profile?.dateOfBirth && (
            <div>
              <span className="text-xs font-medium" style={{ color: `hsl(var(--foreground) / 0.5)`, fontFamily: 'var(--font-sans)' }}>
                Date of birth
              </span>
              <p className="text-sm text-foreground mt-0.5" style={{ fontFamily: 'var(--font-sans)' }}>
                {intake.profile.dateOfBirth}
              </p>
            </div>
          )}
          {intake.profile?.gender && (
            <div>
              <span className="text-xs font-medium" style={{ color: `hsl(var(--foreground) / 0.5)`, fontFamily: 'var(--font-sans)' }}>
                Gender
              </span>
              <p className="text-sm text-foreground mt-0.5" style={{ fontFamily: 'var(--font-sans)' }}>
                {intake.profile.gender}
              </p>
            </div>
          )}
          {intake.profile?.phone && (
            <div>
              <span className="text-xs font-medium" style={{ color: `hsl(var(--foreground) / 0.5)`, fontFamily: 'var(--font-sans)' }}>
                Phone
              </span>
              <p className="text-sm text-foreground mt-0.5" style={{ fontFamily: 'var(--font-sans)' }}>
                {intake.profile.phone}
              </p>
            </div>
          )}
          <div>
            <span className="text-xs font-medium" style={{ color: `hsl(var(--foreground) / 0.5)`, fontFamily: 'var(--font-sans)' }}>
              {provider.intakeDateLabel}
            </span>
            <time dateTime={intake.createdAt} className="block text-sm text-foreground mt-0.5" style={{ fontFamily: 'var(--font-sans)' }}>
              {formatted}
            </time>
          </div>
        </div>
      </div>

      {/* Clinical flags */}
      {intake.aiFlags && intake.aiFlags.length > 0 && (
        <div
          className="rounded-2xl p-5 mb-4"
          style={{
            background: `hsl(var(--destructive) / 0.06)`,
            border: `1px solid hsl(var(--destructive) / 0.25)`,
          }}
        >
          <h3
            className="text-xs font-semibold mb-3 flex items-center gap-2"
            style={{ color: `hsl(var(--destructive))`, fontFamily: 'var(--font-sans)' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            {provider.flagsLabel}
          </h3>
          <div className="flex flex-wrap gap-2">
            {intake.aiFlags.map((flag, i) => (
              <span
                key={i}
                className="px-3 py-1 rounded-full text-xs font-medium"
                style={{
                  background: `hsl(var(--destructive) / 0.1)`,
                  color: `hsl(var(--destructive))`,
                  border: `1px solid hsl(var(--destructive) / 0.2)`,
                }}
              >
                {flag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* AI Brief */}
      <div
        className="rounded-2xl p-5 mb-4"
        style={{
          background: `hsl(var(--primary) / 0.05)`,
          border: `1px solid hsl(var(--primary) / 0.2)`,
        }}
      >
        <h3
          className="text-xs font-semibold mb-3 flex items-center gap-2"
          style={{ color: `hsl(var(--primary))`, fontFamily: 'var(--font-sans)' }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2a10 10 0 100 20A10 10 0 0012 2z"/>
            <path d="M12 6v6l4 2"/>
          </svg>
          {provider.patientBriefHeading}
        </h3>

        {intake.chiefComplaint && (
          <div className="mb-3">
            <span className="text-xs font-medium" style={{ color: `hsl(var(--foreground) / 0.5)`, fontFamily: 'var(--font-sans)' }}>
              {provider.complaintsLabel}
            </span>
            <p className="text-sm text-foreground mt-0.5 font-medium" style={{ fontFamily: 'var(--font-sans)' }}>
              {intake.chiefComplaint}
            </p>
          </div>
        )}

        <div>
          <span className="text-xs font-medium" style={{ color: `hsl(var(--foreground) / 0.5)`, fontFamily: 'var(--font-sans)' }}>
            {provider.summaryLabel}
          </span>
          <p className="text-sm text-foreground mt-0.5 leading-relaxed" style={{ fontFamily: 'var(--font-sans)' }}>
            {intake.aiSummary ?? provider.noSummaryText}
          </p>
        </div>
      </div>

      {/* Health profile */}
      {intake.profile && (
        <div
          className="rounded-2xl p-5"
          style={{
            background: `hsl(var(--card))`,
            border: `1px solid hsl(var(--border-subtle) / 0.5)`,
          }}
        >
          <h3
            className="text-xs font-semibold mb-4"
            style={{ color: `hsl(var(--foreground) / 0.5)`, fontFamily: 'var(--font-sans)', letterSpacing: '0.05em' }}
          >
            HEALTH PROFILE
          </h3>
          <div className="flex flex-col gap-3">
            {intake.profile.conditions && intake.profile.conditions.length > 0 && (
              <div>
                <span className="text-xs font-medium" style={{ color: `hsl(var(--foreground) / 0.5)`, fontFamily: 'var(--font-sans)' }}>
                  {provider.conditionsLabel}
                </span>
                <p className="text-sm text-foreground mt-0.5" style={{ fontFamily: 'var(--font-sans)' }}>
                  {intake.profile.conditions.join(', ')}
                </p>
              </div>
            )}
            {intake.profile.medications && intake.profile.medications.length > 0 && (
              <div>
                <span className="text-xs font-medium" style={{ color: `hsl(var(--foreground) / 0.5)`, fontFamily: 'var(--font-sans)' }}>
                  {provider.medicationsLabel}
                </span>
                <p className="text-sm text-foreground mt-0.5" style={{ fontFamily: 'var(--font-sans)' }}>
                  {intake.profile.medications.join(', ')}
                </p>
              </div>
            )}
            {intake.profile.allergies && intake.profile.allergies.length > 0 && (
              <div>
                <span className="text-xs font-medium" style={{ color: `hsl(var(--foreground) / 0.5)`, fontFamily: 'var(--font-sans)' }}>
                  {provider.allergiesLabel}
                </span>
                <p className="text-sm text-foreground mt-0.5" style={{ fontFamily: 'var(--font-sans)' }}>
                  {intake.profile.allergies.join(', ')}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ─── Dashboard content ────────────────────────────────────────────────────────

function DashboardContent() {
  const { user: authUser } = useSession();
  const navigate = useNavigate();
  const [intakes, setIntakes] = useState<ProviderIntake[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ProviderIntake | null>(null);
  const [filter, setFilter] = useState<'all' | 'flagged'>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/provider/intakes');
        if (res.ok) {
          const data: ProviderIntake[] = await res.json();
          setIntakes(data);
          if (data.length > 0) setSelected(data[0]);
        }
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const filtered = intakes.filter((i) => {
    if (filter === 'flagged' && (!i.aiFlags || i.aiFlags.length === 0)) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        (i.patientName ?? '').toLowerCase().includes(q) ||
        i.patientEmail.toLowerCase().includes(q) ||
        (i.chiefComplaint ?? '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const flaggedCount = intakes.filter((i) => i.aiFlags && i.aiFlags.length > 0).length;
  const uniquePatients = new Set(intakes.map((i) => i.patientId)).size;
  const firstName = authUser?.name?.split(' ')[0] ?? 'Provider';

  async function handleSignOut() {
    await signOut();
    navigate('/login');
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: `hsl(var(--background))` }}>
      {/* ── Header ── */}
      <header
        className="sticky top-0 z-40 px-6 py-4 shrink-0"
        style={{
          background: `hsl(var(--card) / 0.9)`,
          borderBottom: `1px solid hsl(var(--border-subtle) / 0.4)`,
          backdropFilter: 'blur(12px)',
        }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
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
            <div
              className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium"
              style={{
                background: `hsl(var(--secondary) / 0.12)`,
                color: `hsl(var(--secondary))`,
                border: `1px solid hsl(var(--secondary) / 0.25)`,
                fontFamily: 'var(--font-sans)',
              }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              {provider.portalLabel}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground hidden sm:block" style={{ fontFamily: 'var(--font-sans)' }}>
              {firstName}
            </span>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
              style={{
                background: `hsl(var(--secondary) / 0.15)`,
                color: `hsl(var(--secondary))`,
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
              {provider.signOutButton}
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        {/* ── Welcome + stats ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-foreground mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
            {provider.welcomeHeading}
          </h1>
          <p className="text-muted-foreground text-sm mb-6" style={{ fontFamily: 'var(--font-sans)' }}>
            {provider.welcomeSubheading}
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <motion.div
              className="rounded-2xl p-5"
              style={{ background: `hsl(var(--primary) / 0.08)`, border: `1px solid hsl(var(--primary) / 0.3)` }}
              whileHover={{ y: -2 }} transition={{ duration: 0.15 }}
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: `hsl(var(--primary) / 0.12)`, color: `hsl(var(--primary))` }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              </div>
              <div className="text-2xl font-bold text-foreground mb-0.5" style={{ fontFamily: 'var(--font-heading)' }}>{intakes.length}</div>
              <div className="text-xs text-muted-foreground" style={{ fontFamily: 'var(--font-sans)' }}>{provider.statsCompletedLabel}</div>
            </motion.div>

            <motion.div
              className="rounded-2xl p-5"
              style={{ background: `hsl(var(--card))`, border: `1px solid hsl(var(--border-subtle) / 0.5)` }}
              whileHover={{ y: -2 }} transition={{ duration: 0.15 }}
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: `hsl(var(--primary) / 0.12)`, color: `hsl(var(--primary))` }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
              </div>
              <div className="text-2xl font-bold text-foreground mb-0.5" style={{ fontFamily: 'var(--font-heading)' }}>{uniquePatients}</div>
              <div className="text-xs text-muted-foreground" style={{ fontFamily: 'var(--font-sans)' }}>{provider.statsPatientsLabel}</div>
            </motion.div>

            <motion.div
              className="rounded-2xl p-5"
              style={{ background: `hsl(var(--card))`, border: `1px solid hsl(var(--border-subtle) / 0.5)` }}
              whileHover={{ y: -2 }} transition={{ duration: 0.15 }}
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: `hsl(var(--primary) / 0.12)`, color: `hsl(var(--primary))` }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              </div>
              <div className="text-2xl font-bold text-foreground mb-0.5" style={{ fontFamily: 'var(--font-heading)' }}>{flaggedCount}</div>
              <div className="text-xs text-muted-foreground" style={{ fontFamily: 'var(--font-sans)' }}>{provider.statsFlagsLabel}</div>
            </motion.div>

            <motion.div
              className="rounded-2xl p-5"
              style={{ background: `hsl(var(--card))`, border: `1px solid hsl(var(--border-subtle) / 0.5)` }}
              whileHover={{ y: -2 }} transition={{ duration: 0.15 }}
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: `hsl(var(--primary) / 0.12)`, color: `hsl(var(--primary))` }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </div>
              <div className="text-2xl font-bold text-foreground mb-0.5" style={{ fontFamily: 'var(--font-heading)' }}>{provider.statsAvgTimeValue}</div>
              <div className="text-xs text-muted-foreground" style={{ fontFamily: 'var(--font-sans)' }}>{provider.statsAvgTimeLabel}</div>
            </motion.div>
          </div>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div
              className="w-8 h-8 rounded-full border-2 animate-spin"
              style={{ borderColor: `hsl(var(--primary))`, borderTopColor: 'transparent' }}
            />
          </div>
        ) : intakes.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-24"
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: `hsl(var(--primary) / 0.08)`, color: `hsl(var(--primary))` }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <h3 className="text-base font-bold text-foreground mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
              {provider.emptyQueueHeading}
            </h3>
            <p className="text-sm text-muted-foreground" style={{ fontFamily: 'var(--font-sans)' }}>
              {provider.emptyQueueSubheading}
            </p>
          </motion.div>
        ) : (
          <div className="flex gap-6 h-[calc(100vh-22rem)]">
            {/* ── Patient list ── */}
            <div className="w-80 shrink-0 flex flex-col gap-3">
              {/* Search */}
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth="2"
                >
                  <circle cx="11" cy="11" r="8"/>
                  <path d="M21 21l-4.35-4.35"/>
                </svg>
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={provider.searchPlaceholder}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all duration-200"
                  style={{
                    background: `hsl(var(--card))`,
                    border: `1px solid hsl(var(--border-subtle) / 0.5)`,
                    color: `hsl(var(--foreground))`,
                    fontFamily: 'var(--font-sans)',
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = `hsl(var(--primary) / 0.5)`)}
                  onBlur={(e) => (e.currentTarget.style.borderColor = `hsl(var(--border-subtle) / 0.5)`)}
                />
              </div>

              {/* Filter tabs */}
              <div
                className="flex gap-1 p-1 rounded-xl"
                style={{ background: `hsl(var(--card))`, border: `1px solid hsl(var(--border-subtle) / 0.4)` }}
              >
                {(['all', 'flagged'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setFilter(tab)}
                    className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all duration-200"
                    style={{
                      fontFamily: 'var(--font-sans)',
                      background: filter === tab ? `hsl(var(--primary))` : 'transparent',
                      color: filter === tab ? `hsl(var(--background))` : `hsl(var(--muted-foreground))`,
                    }}
                  >
                    {tab === 'all' ? provider.allTab : provider.flaggedTab}
                    {tab === 'flagged' && flaggedCount > 0 && (
                      <span className="ml-1.5 opacity-80">({flaggedCount})</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Patient cards */}
              <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1">
                <AnimatePresence>
                  {filtered.map((intake) => (
                    <motion.div
                      key={intake.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      transition={{ duration: 0.15 }}
                    >
                      <PatientBriefCard
                        intake={intake}
                        isSelected={selected?.id === intake.id}
                        onClick={() => setSelected(intake)}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
                {filtered.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-8" style={{ fontFamily: 'var(--font-sans)' }}>
                    No results
                  </p>
                )}
              </div>
            </div>

            {/* ── Detail panel ── */}
            <div className="flex-1 min-w-0">
              <AnimatePresence mode="wait">
                {selected ? (
                  <DetailPanel key={selected.id} intake={selected} />
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="h-full flex items-center justify-center"
                  >
                    <p className="text-sm text-muted-foreground" style={{ fontFamily: 'var(--font-sans)' }}>
                      Select a patient to view their brief
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export default function ProviderDashboardPage() {
  return (
    <>
      <Helmet>
        <title>Provider Dashboard — Acute Insight AI</title>
        <meta name="description" content="Clinician view of AI-summarized patient intake histories." />
        <meta name="robots" content="noindex" />
      </Helmet>
      <ProtectedRoute>
        <DashboardContent />
      </ProtectedRoute>
    </>
  );
}
