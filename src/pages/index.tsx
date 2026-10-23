import { useRef, useState } from 'react';
import { Link } from 'react-router';
import { Helmet } from '@dr.pogodin/react-helmet';
import { motion, useInView } from 'motion/react';
import { home } from 'virtual:content';

// ─── Animated grid background ───────────────────────────────────────────────
function GridBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <svg
        className="absolute inset-0 w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        style={{ opacity: 0.15 }}
      >
        <defs>
          <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="hsl(var(--primary))" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 600,
          height: 600,
          top: '-20%',
          right: '-10%',
          background: `radial-gradient(circle, hsl(var(--primary) / 0.12) 0%, transparent 70%)`,
        }}
        animate={{ scale: [1, 1.08, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 400,
          height: 400,
          bottom: '10%',
          left: '-5%',
          background: `radial-gradient(circle, hsl(var(--primary) / 0.07) 0%, transparent 70%)`,
        }}
        animate={{ scale: [1, 1.12, 1], opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      />
    </div>
  );
}

// ─── AI Intake Mockup ────────────────────────────────────────────────────────
const DEMO_QUESTIONS = [
  {
    question: 'What brings you in today?',
    chips: ['Chest pain', 'Shortness of breath', 'Fatigue', 'Routine checkup', 'Medication refill'],
  },
  {
    question: 'How long have you had these symptoms?',
    chips: ['Less than 24 hours', '1–3 days', '1–2 weeks', 'More than a month'],
  },
  {
    question: 'Rate your discomfort level:',
    chips: ['Mild (1–3)', 'Moderate (4–6)', 'Severe (7–9)', 'Emergency (10)'],
  },
];

function IntakeMockup() {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedChip, setSelectedChip] = useState<string | null>(null);
  const [displayedText, setDisplayedText] = useState(DEMO_QUESTIONS[0].question);
  const [chipsVisible, setChipsVisible] = useState(true);
  const [progress, setProgress] = useState(33);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const current = DEMO_QUESTIONS[questionIndex];

  function handleChipSelect(chip: string) {
    if (selectedChip) return;
    setSelectedChip(chip);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const next = (questionIndex + 1) % DEMO_QUESTIONS.length;
      setChipsVisible(false);
      setDisplayedText('');
      setSelectedChip(null);
      setProgress(((next + 1) / DEMO_QUESTIONS.length) * 100);
      setQuestionIndex(next);
      // Typewriter for next question
      let i = 0;
      const q = DEMO_QUESTIONS[next].question;
      const interval = setInterval(() => {
        i++;
        setDisplayedText(q.slice(0, i));
        if (i >= q.length) {
          clearInterval(interval);
          setTimeout(() => setChipsVisible(true), 200);
        }
      }, 40);
    }, 800);
  }

  return (
    <div
      className="relative rounded-2xl overflow-hidden"
      style={{
        background: `hsl(var(--card))`,
        border: `1px solid hsl(var(--primary) / 0.25)`,
        boxShadow: `0 0 40px hsl(var(--primary) / 0.12), 0 20px 60px hsl(var(--background) / 0.8)`,
        maxWidth: 440,
        width: '100%',
      }}
    >
      {/* Header bar */}
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{ borderBottom: `1px solid hsl(var(--border-subtle) / 0.5)` }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full bg-primary"
            style={{ boxShadow: `0 0 6px hsl(var(--primary))` }}
          />
          <span className="text-xs font-medium text-primary" style={{ fontFamily: 'var(--font-sans)' }}>
            AI Intake — Active
          </span>
        </div>
        <span className="text-xs text-muted-foreground" style={{ fontFamily: 'var(--font-sans)' }}>
          <span>Step </span>
          <span>{questionIndex + 1}</span>
          <span> of </span>
          <span>{DEMO_QUESTIONS.length}</span>
        </span>
      </div>

      {/* Progress bar */}
      <div className="px-5 pt-4">
        <div className="h-1 rounded-full" style={{ background: `hsl(var(--border-subtle))` }}>
          <motion.div
            className="h-1 rounded-full bg-primary"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="px-5 pt-5 pb-2 min-h-[60px]">
        <p
          className="text-base font-semibold text-foreground"
          style={{ fontFamily: 'var(--font-heading)', minHeight: 28 }}
        >
          <span>{displayedText}</span>
          <motion.span
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.5, repeat: Infinity }}
            className="inline-block w-0.5 h-4 ml-0.5 bg-primary align-middle"
          />
        </p>
      </div>

      {/* Chips */}
      <div className="px-5 pb-6 flex flex-wrap gap-2">
        {chipsVisible &&
          current.chips.map((chip, i) => (
            <motion.button
              key={chip}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.25, ease: 'easeOut' }}
              onClick={() => handleChipSelect(chip)}
              className="px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer"
              style={{
                fontFamily: 'var(--font-sans)',
                background:
                  selectedChip === chip
                    ? `hsl(var(--primary))`
                    : `hsl(var(--primary) / 0.08)`,
                color:
                  selectedChip === chip
                    ? `hsl(var(--background))`
                    : `hsl(var(--primary))`,
                border: `1px solid hsl(var(--primary) / ${selectedChip === chip ? '1' : '0.3'})`,
              }}
            >
              {chip}
            </motion.button>
          ))}
      </div>

      {/* Tap hint */}
      <div
        className="px-5 py-3 flex items-center gap-2"
        style={{ borderTop: `1px solid hsl(var(--border-subtle) / 0.4)` }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="2">
          <path d="M9 11l3 3L22 4"/>
          <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
        </svg>
        <span className="text-xs text-muted-foreground" style={{ fontFamily: 'var(--font-sans)' }}>
          Tap to select — no typing required
        </span>
      </div>
    </div>
  );
}

// ─── Fade-up section wrapper ─────────────────────────────────────────────────
function FadeUp({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.4, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── CTA Button ──────────────────────────────────────────────────────────────
function CtaButton({ to, variant, children }: { to: string; variant: 'primary' | 'ghost'; children: React.ReactNode }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Link
      to={to}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200"
      style={{
        fontFamily: 'var(--font-sans)',
        ...(variant === 'primary'
          ? {
              background: `hsl(var(--primary))`,
              color: `hsl(var(--background))`,
              boxShadow: hovered ? `0 0 24px hsl(var(--primary) / 0.4)` : `0 0 12px hsl(var(--primary) / 0.2)`,
              transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
              filter: hovered ? 'brightness(1.1)' : 'brightness(1)',
            }
          : {
              background: 'transparent',
              color: hovered ? `hsl(var(--primary))` : `hsl(var(--foreground) / 0.8)`,
              border: `1px solid ${hovered ? `hsl(var(--primary))` : `hsl(var(--border-subtle))`}`,
              transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
            }),
      }}
    >
      {children}
    </Link>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────
export default function HomePage() {
  const siteUrl = 'https://acuteinsight.ai';

  return (
    <>
      <Helmet>
        <title>Acute Insight AI — Healthcare That Thinks Ahead</title>
        <meta
          name="description"
          content="AI-powered patient intake for telehealth. Smart multiple-choice questions reduce friction, improve compliance, and deliver instant provider briefings."
        />
        <link rel="canonical" href={siteUrl} />
        <meta property="og:title" content="Acute Insight AI — Healthcare That Thinks Ahead" />
        <meta property="og:description" content="AI-powered patient intake for telehealth. Smart multiple-choice questions reduce friction, improve compliance, and deliver instant provider briefings." />
        <meta property="og:url" content={siteUrl} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      <main>
        {/* ── HERO ──────────────────────────────────────────────────────── */}
        <section
          id="hero"
          className="relative min-h-screen flex items-center pt-20"
          style={{ background: `hsl(var(--background))` }}
        >
          <GridBackground />
          <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 py-20 w-full">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              {/* Left: copy */}
              <div>
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                >
                  <div
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-6"
                    style={{
                      background: `hsl(var(--primary) / 0.1)`,
                      border: `1px solid hsl(var(--primary) / 0.25)`,
                      color: `hsl(var(--primary))`,
                      fontFamily: 'var(--font-sans)',
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-primary"
                      style={{ boxShadow: `0 0 6px hsl(var(--primary))` }}
                    />
                    <span>{home.hero.badge}</span>
                  </div>
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}
                  className="text-5xl lg:text-6xl xl:text-7xl font-bold leading-[1.05] text-foreground mb-6"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  <span>{home.hero.headline1}</span>
                  <br />
                  <span>{home.hero.headline2} </span>
                  <span
                    className="text-primary"
                    style={{ textShadow: `0 0 30px hsl(var(--primary) / 0.4)` }}
                  >
                    {home.hero.headlineAccent}
                  </span>
                  <br />
                  <span>{home.hero.headline3}</span>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
                  className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-lg"
                  style={{ fontFamily: 'var(--font-sans)' }}
                >
                  {home.hero.subhead}
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.3, ease: 'easeOut' }}
                  className="flex flex-wrap gap-4"
                >
                  <CtaButton to="/intake" variant="primary">
                    <span>{home.hero.ctaPrimary}</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </CtaButton>
                  <CtaButton to="/#providers" variant="ghost">
                    <span>{home.hero.ctaSecondary}</span>
                  </CtaButton>
                </motion.div>

                {/* Stats row */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                  className="flex flex-wrap gap-8 mt-12 pt-8"
                  style={{ borderTop: `1px solid hsl(var(--border-subtle) / 0.5)` }}
                >
                  {home.hero.stats.map((s) => (
                    <div key={s.id}>
                      <div
                        className="text-2xl font-bold text-primary"
                        style={{ fontFamily: 'var(--font-heading)' }}
                      >
                        {s.value}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5" style={{ fontFamily: 'var(--font-sans)' }}>
                        {s.label}
                      </div>
                    </div>
                  ))}
                </motion.div>
              </div>

              {/* Right: mockup */}
              <motion.div
                initial={{ opacity: 0, x: 32 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.25, ease: 'easeOut' }}
                className="flex justify-center lg:justify-end"
              >
                <IntakeMockup />
              </motion.div>
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ──────────────────────────────────────────────── */}
        <section
          id="how-it-works"
          className="py-24"
          style={{ background: `hsl(var(--surface-deeper))` }}
        >
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <FadeUp>
              <div className="text-center mb-16">
                <p
                  className="text-xs font-semibold uppercase tracking-widest text-primary mb-3"
                  style={{ fontFamily: 'var(--font-sans)' }}
                >
                  {home.howItWorks.eyebrow}
                </p>
                <h2
                  className="text-4xl lg:text-5xl font-bold text-foreground mb-4"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  {home.howItWorks.headline}
                </h2>
                <p className="text-muted-foreground max-w-xl mx-auto" style={{ fontFamily: 'var(--font-sans)' }}>
                  {home.howItWorks.subhead}
                </p>
              </div>
            </FadeUp>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {home.howItWorks.steps.map((card, i) => (
                <FadeUp key={card.id} delay={i * 0.1}>
                  <motion.div
                    className="relative rounded-2xl p-8 h-full"
                    style={{
                      background: `hsl(var(--card))`,
                      border: `1px solid hsl(var(--border-subtle) / 0.6)`,
                    }}
                    whileHover={{
                      y: -4,
                      boxShadow: `0 12px 40px hsl(var(--primary) / 0.15)`,
                      borderColor: `hsl(var(--primary) / 0.4)`,
                    }}
                    transition={{ duration: 0.2 }}
                  >
                    <div
                      className="text-5xl font-bold mb-6 leading-none"
                      style={{
                        fontFamily: 'var(--font-heading)',
                        color: `hsl(var(--primary) / 0.2)`,
                      }}
                    >
                      {card.step}
                    </div>
                    <h3
                      className="text-xl font-bold text-foreground mb-1"
                      style={{ fontFamily: 'var(--font-heading)' }}
                    >
                      {card.title}
                    </h3>
                    <p
                      className="text-xs font-semibold text-primary mb-3 uppercase tracking-wider"
                      style={{ fontFamily: 'var(--font-sans)' }}
                    >
                      {card.subtitle}
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed" style={{ fontFamily: 'var(--font-sans)' }}>
                      {card.description}
                    </p>
                  </motion.div>
                </FadeUp>
              ))}
            </div>
          </div>
        </section>

        {/* ── FEATURES ──────────────────────────────────────────────────── */}
        <section
          id="patients"
          className="py-24"
          style={{ background: `hsl(var(--background))` }}
        >
          <div className="max-w-5xl mx-auto px-6 lg:px-8">
            <FadeUp>
              <p
                className="text-xs font-semibold uppercase tracking-widest text-primary mb-3"
                style={{ fontFamily: 'var(--font-sans)' }}
              >
                {home.features.eyebrow}
              </p>
              <h2
                className="text-4xl lg:text-5xl font-bold text-foreground mb-16"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {home.features.headline}
              </h2>
            </FadeUp>

            {home.features.rows.map((row, i) => (
              <FadeUp key={row.id} delay={0.05}>
                <div
                  className={`flex flex-col ${i % 2 !== 0 ? 'md:flex-row-reverse' : 'md:flex-row'} items-center gap-10 py-12`}
                  style={{ borderBottom: `1px solid hsl(var(--border-subtle) / 0.4)` }}
                >
                  <div className="flex-1 text-center md:text-left">
                    <div
                      className="text-6xl lg:text-7xl font-bold leading-none mb-2"
                      style={{
                        fontFamily: 'var(--font-heading)',
                        color: `hsl(var(--primary))`,
                        textShadow: `0 0 40px hsl(var(--primary) / 0.3)`,
                      }}
                    >
                      {row.stat}
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3
                      className="text-xl font-bold text-foreground mb-3"
                      style={{ fontFamily: 'var(--font-heading)' }}
                    >
                      {row.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed" style={{ fontFamily: 'var(--font-sans)' }}>
                      {row.description}
                    </p>
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
        </section>

        {/* ── TRUST BAR ─────────────────────────────────────────────────── */}
        <section
          style={{
            background: `hsl(var(--card))`,
            borderTop: `1px solid hsl(var(--border-subtle) / 0.5)`,
            borderBottom: `1px solid hsl(var(--border-subtle) / 0.5)`,
          }}
        >
          <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
            <div className="flex flex-wrap items-center justify-center gap-10">
              {[
                { icon: '🩺', label: 'Physician-Founded' },
                { icon: '🔒', label: 'Encrypted in Transit' },
                { icon: '🔐', label: 'Never Sold or Shared' },
                { icon: '⚠️', label: 'Emergency-Aware Intake' },
                { icon: '⚡', label: 'Instant Provider Briefs' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-primary" style={{ fontFamily: 'var(--font-sans)' }}>
                    {item.icon}
                  </span>
                  <span className="text-sm font-medium text-muted-foreground" style={{ fontFamily: 'var(--font-sans)' }}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── PROVIDERS ─────────────────────────────────────────────────── */}
        <section
          id="providers"
          className="py-24"
          style={{ background: `hsl(var(--surface-deeper))` }}
        >
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <FadeUp>
                <p
                  className="text-xs font-semibold uppercase tracking-widest text-primary mb-3"
                  style={{ fontFamily: 'var(--font-sans)' }}
                >
                  {home.providers.eyebrow}
                </p>
                <h2
                  className="text-4xl lg:text-5xl font-bold text-foreground mb-6"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  <span>{home.providers.headline1}</span>
                  <br />
                  <span className="text-primary">{home.providers.headlineAccent}</span>
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-8 max-w-lg" style={{ fontFamily: 'var(--font-sans)' }}>
                  {home.providers.subhead}
                </p>
                <ul className="flex flex-col gap-4 mb-8">
                  {home.providers.benefits.map((item) => (
                    <li key={item.id} className="flex items-start gap-3">
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                        style={{ background: `hsl(var(--primary) / 0.15)` }}
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="3">
                          <path d="M20 6L9 17l-5-5"/>
                        </svg>
                      </div>
                      <span className="text-sm text-muted-foreground" style={{ fontFamily: 'var(--font-sans)' }}>
                        {item.text}
                      </span>
                    </li>
                  ))}
                </ul>
                <CtaButton to="/providers" variant="primary">
                  <span>{home.providers.cta}</span>
                </CtaButton>
              </FadeUp>

              {/* Provider summary card */}
              <FadeUp delay={0.15}>
                <motion.div
                  className="rounded-2xl p-6"
                  style={{
                    background: `hsl(var(--card))`,
                    border: `1px solid hsl(var(--primary) / 0.2)`,
                    boxShadow: `0 0 40px hsl(var(--primary) / 0.08)`,
                  }}
                  whileHover={{ boxShadow: `0 0 60px hsl(var(--primary) / 0.15)` }}
                >
                  <div
                    className="flex items-center justify-between mb-4 pb-4"
                    style={{ borderBottom: `1px solid hsl(var(--border-subtle) / 0.5)` }}
                  >
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5" style={{ fontFamily: 'var(--font-sans)' }}>
                        Patient Summary
                      </p>
                      <p className="text-sm font-semibold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
                        J. Martinez, 54 — Intake Complete
                      </p>
                    </div>
                    <div
                      className="px-2 py-1 rounded-md text-xs font-medium text-primary"
                      style={{ background: `hsl(var(--primary) / 0.1)` }}
                    >
                      Ready
                    </div>
                  </div>
                  <div className="flex flex-col gap-3">
                    {[
                      { label: 'Chief Complaint', value: 'Chest tightness × 3 days', highlight: false },
                      { label: 'Relevant History', value: 'HTN, T2DM, former smoker', highlight: false },
                      { label: 'Current Medications', value: 'Metformin 1000mg, Lisinopril 10mg', highlight: false },
                      { label: 'AI Flag', value: '⚠ Possible cardiac — prioritize ECG', highlight: true },
                    ].map((row) => (
                      <div key={row.label} className="flex flex-col gap-0.5">
                        <span className="text-xs text-muted-foreground" style={{ fontFamily: 'var(--font-sans)' }}>
                          {row.label}
                        </span>
                        <span
                          className="text-sm font-medium"
                          style={{
                            fontFamily: 'var(--font-sans)',
                            color: row.highlight ? `hsl(var(--primary))` : `hsl(var(--foreground))`,
                          }}
                        >
                          {row.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </FadeUp>
            </div>
          </div>
        </section>

        {/* ── DUAL CTA ──────────────────────────────────────────────────── */}
        <section
          className="py-24 relative overflow-hidden"
          style={{ background: `hsl(var(--background))` }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            aria-hidden="true"
            style={{
              background: `radial-gradient(ellipse 60% 50% at 50% 50%, hsl(var(--primary) / 0.06) 0%, transparent 70%)`,
            }}
          />
          <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Patient CTA */}
              <FadeUp>
                <div
                  className="rounded-2xl p-10"
                  style={{
                    background: `hsl(var(--card))`,
                    border: `1px solid hsl(var(--primary) / 0.25)`,
                  }}
                >
                  <p
                    className="text-xs font-semibold uppercase tracking-widest text-primary mb-3"
                    style={{ fontFamily: 'var(--font-sans)' }}
                  >
                    {home.ctaSection.patients.eyebrow}
                  </p>
                  <h3
                    className="text-3xl font-bold text-foreground mb-4"
                    style={{ fontFamily: 'var(--font-heading)' }}
                  >
                    <span>{home.ctaSection.patients.headline1}</span>
                    <br />
                    <span>{home.ctaSection.patients.headline2}</span>
                  </h3>
                  <p className="text-muted-foreground mb-8 leading-relaxed" style={{ fontFamily: 'var(--font-sans)' }}>
                    {home.ctaSection.patients.body}
                  </p>
                  <CtaButton to="/intake" variant="primary">
                    <span>{home.ctaSection.patients.cta}</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </CtaButton>
                </div>
              </FadeUp>

              {/* Provider CTA */}
              <FadeUp delay={0.1}>
                <div
                  className="rounded-2xl p-10"
                  style={{
                    background: `hsl(var(--card))`,
                    border: `1px solid hsl(var(--border-subtle) / 0.6)`,
                  }}
                >
                  <p
                    className="text-xs font-semibold uppercase tracking-widest mb-3"
                    style={{ fontFamily: 'var(--font-sans)', color: `hsl(var(--text-dim))` }}
                  >
                    {home.ctaSection.clinicians.eyebrow}
                  </p>
                  <h3
                    className="text-3xl font-bold text-foreground mb-4"
                    style={{ fontFamily: 'var(--font-heading)' }}
                  >
                    <span>{home.ctaSection.clinicians.headline1}</span>
                    <br />
                    <span>{home.ctaSection.clinicians.headline2}</span>
                  </h3>
                  <p className="text-muted-foreground mb-8 leading-relaxed" style={{ fontFamily: 'var(--font-sans)' }}>
                    {home.ctaSection.clinicians.body}
                  </p>
                  <CtaButton to="/providers" variant="ghost">
                    <span>{home.ctaSection.clinicians.cta}</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </CtaButton>
                </div>
              </FadeUp>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
