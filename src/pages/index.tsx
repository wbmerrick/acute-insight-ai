import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { Helmet } from '@dr.pogodin/react-helmet';
import { home } from 'virtual:content';
import HomepageSameAsJsonLd from '@/components/HomepageSameAsJsonLd';

/* ────────────────────────────────────────────────────────────────────────────
   Home — "Telemetry"
   One orchestrated moment: the lead-II trace draws itself across the strip,
   rises where the AI flags, and settles. Everything else holds still.
   ──────────────────────────────────────────────────────────────────────────── */

// ─── The signature: an EKG strip that tells the product story ───────────────
function EkgStrip() {
  // Lead II rhythm, 1440×170 viewBox. Five normal complexes; the fourth runs
  // tall under an amber flag — the moment the AI catches what matters.
  const baseline = 104;
  const complex = (x: number, r = 44) =>
    `L${x} ${baseline} ` + // approach
    `L${x + 10} ${baseline - 7} L${x + 18} ${baseline} ` + // P
    `L${x + 30} ${baseline} L${x + 36} ${baseline + 10} ` + // Q
    `L${x + 44} ${baseline - r} L${x + 52} ${baseline + 16} ` + // R/S
    `L${x + 58} ${baseline} ` +
    `L${x + 78} ${baseline} L${x + 92} ${baseline - 12} L${x + 106} ${baseline} `; // T

  const d =
    `M-10 ${baseline} ` +
    complex(90) +
    complex(330) +
    complex(570) +
    complex(810, 76) + // flagged beat
    complex(1070) +
    `L1300 ${baseline} L1450 ${baseline}`;

  return (
    <div
      aria-hidden="true"
      className="relative w-full overflow-hidden bg-telemetry"
      style={{
        background: `hsl(var(--surface-deeper))`,
        borderTop: `1px solid hsl(var(--border-subtle) / 0.6)`,
        borderBottom: `1px solid hsl(var(--border-subtle) / 0.6)`,
      }}
    >
      <div className="bg-telemetry absolute inset-0" style={{ opacity: 0.5 }} />
      <svg
        viewBox="0 0 1440 170"
        preserveAspectRatio="none"
        className="relative block w-full"
        style={{ height: 'clamp(120px, 14vw, 180px)' }}
      >
        <path
          d={d}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="2.25"
          strokeLinejoin="round"
          strokeLinecap="round"
          pathLength={3200}
          strokeDasharray={3200}
          className="animate-trace trace-glow"
          style={{ ['--trace-length' as string]: 3200 }}
        />
        {/* Flag annotation over the tall complex */}
        <g className="fade-in animate-in" style={{ animationDelay: '2.3s', animationDuration: '0.5s' }}>
          <line
            x1={854}
            y1={baseline - 76}
            x2={854}
            y2={34}
            stroke="hsl(var(--accent) / 0.75)"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
          <rect
            x={866}
            y={16}
            rx={6}
            width={212}
            height={30}
            fill="hsl(var(--surface-deeper) / 0.95)"
            stroke="hsl(var(--accent) / 0.8)"
            strokeWidth="1"
          />
          <text
            x={880}
            y={36}
            fill="hsl(var(--accent))"
            fontSize="14"
            fontFamily="var(--font-mono)"
          >
            flagged · severity 8/10
          </text>
        </g>
      </svg>

      {/* Strip annotations */}
      <div className="absolute left-4 md:left-8 top-3 vitals text-xs" style={{ color: 'hsl(var(--text-dimmer))' }}>
        lead II — intake in progress
      </div>
      <div className="absolute right-4 md:right-8 bottom-3 vitals text-xs" style={{ color: 'hsl(var(--primary) / 0.8)' }}>
        brief ready
      </div>
    </div>
  );
}

// ─── Interactive intake monitor (hero, right) ────────────────────────────────
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
    question: 'How severe is it right now, 1–10?',
    chips: ['Mild (1–3)', 'Moderate (4–6)', 'Severe (7–9)', 'Worst ever (10)'],
  },
];

function IntakeMonitor() {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedChip, setSelectedChip] = useState<string | null>(null);
  const [displayedText, setDisplayedText] = useState(DEMO_QUESTIONS[0].question);
  const [chipsVisible, setChipsVisible] = useState(true);
  const [briefReady, setBriefReady] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const current = DEMO_QUESTIONS[questionIndex];

  function typeQuestion(next: number) {
    let i = 0;
    const q = DEMO_QUESTIONS[next].question;
    const interval = setInterval(() => {
      i++;
      setDisplayedText(q.slice(0, i));
      if (i >= q.length) {
        clearInterval(interval);
        setTimeout(() => setChipsVisible(true), 150);
      }
    }, 28);
  }

  function handleChipSelect(chip: string) {
    if (selectedChip || briefReady) return;
    setSelectedChip(chip);
    timerRef.current = setTimeout(() => {
      if (questionIndex === DEMO_QUESTIONS.length - 1) {
        setBriefReady(true);
        timerRef.current = setTimeout(() => {
          setBriefReady(false);
          setSelectedChip(null);
          setChipsVisible(false);
          setDisplayedText('');
          setQuestionIndex(0);
          typeQuestion(0);
        }, 3600);
        return;
      }
      const next = questionIndex + 1;
      setChipsVisible(false);
      setDisplayedText('');
      setSelectedChip(null);
      setQuestionIndex(next);
      typeQuestion(next);
    }, 650);
  }

  return (
    <div
      className="relative rounded-2xl overflow-hidden w-full"
      style={{
        background: `hsl(var(--card))`,
        border: `1px solid hsl(var(--primary) / 0.3)`,
        boxShadow: `0 0 44px hsl(var(--primary) / 0.14), var(--shadow-xl)`,
        maxWidth: 460,
      }}
    >
      {/* Channel header */}
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{ borderBottom: `1px solid hsl(var(--border-subtle) / 0.6)`, background: `hsl(var(--surface-deeper) / 0.6)` }}
      >
        <div className="flex items-center gap-2.5">
          <span
            className="w-2 h-2 rounded-full bg-primary"
            style={{ boxShadow: '0 0 8px hsl(var(--primary))', animation: 'fadeIn 1s ease-in-out infinite alternate' }}
          />
          <span className="vitals text-xs" style={{ color: 'hsl(var(--primary))' }}>
            intake · live demo
          </span>
        </div>
        <span className="vitals text-xs" style={{ color: 'hsl(var(--text-dimmer))' }}>
          {briefReady ? '3 / 3' : `${questionIndex + 1} / ${DEMO_QUESTIONS.length}`}
        </span>
      </div>

      {/* Body */}
      <div className="p-5 md:p-6" style={{ minHeight: 240 }}>
        {briefReady ? (
          <div className="flex flex-col items-start gap-3 fade-in animate-in">
            <span
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold"
              style={{
                color: 'hsl(var(--primary))',
                background: 'hsl(var(--primary) / 0.1)',
                border: '1px solid hsl(var(--primary) / 0.35)',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Brief ready
            </span>
            <p className="text-sm leading-relaxed" style={{ color: 'hsl(var(--text-dim))' }}>
              Structured and sent to your provider: complaint, timeline,
              severity, meds, allergies, history — with anything serious
              flagged on top.
            </p>
          </div>
        ) : (
          <>
            <p
              className="text-lg font-semibold mb-5 text-foreground"
              style={{ fontFamily: 'var(--font-heading)', minHeight: 56 }}
            >
              {displayedText}
              <span className="animate-cursor" style={{ color: 'hsl(var(--primary))' }}>▍</span>
            </p>
            <div
              className="flex flex-wrap gap-2 transition-opacity duration-200"
              style={{ opacity: chipsVisible ? 1 : 0 }}
            >
              {current.chips.map((chip) => {
                const selected = selectedChip === chip;
                return (
                  <button
                    key={chip}
                    onClick={() => handleChipSelect(chip)}
                    className="px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150"
                    style={{
                      background: selected ? 'hsl(var(--primary))' : 'hsl(var(--primary) / 0.07)',
                      color: selected ? 'hsl(var(--primary-foreground))' : 'hsl(var(--foreground))',
                      border: `1px solid ${selected ? 'hsl(var(--primary))' : 'hsl(var(--primary) / 0.3)'}`,
                    }}
                  >
                    {chip}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Footer note */}
      <div
        className="px-5 py-2.5 text-xs"
        style={{
          borderTop: `1px solid hsl(var(--border-subtle) / 0.5)`,
          color: 'hsl(var(--text-dimmer))',
        }}
      >
        Tap to answer — it adapts to what you say. Try it.
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const { hero, howItWorks, features, providers, ctaSection } = home;

  return (
    <>
      <Helmet>
        <title>Acute Insight AI — Healthcare that thinks ahead</title>
        <meta
          name="description"
          content="AI-guided patient intake, built by a practicing physician. Tell your story once; your provider walks in already briefed."
        />
      </Helmet>
      <HomepageSameAsJsonLd />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative pt-32 md:pt-40 pb-16 md:pb-20 overflow-hidden">
        <div className="bg-telemetry absolute inset-0 pointer-events-none" style={{ opacity: 0.35 }} aria-hidden="true" />
        <div
          className="absolute pointer-events-none"
          aria-hidden="true"
          style={{
            width: 720,
            height: 720,
            top: '-25%',
            right: '-12%',
            background: `radial-gradient(circle, hsl(var(--primary) / 0.09) 0%, transparent 68%)`,
          }}
        />
        <div className="relative max-w-content mx-auto px-6 grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-12 lg:gap-10 items-center">
          <div>
            <p
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium mb-7"
              style={{
                color: 'hsl(var(--primary))',
                background: `hsl(var(--primary) / 0.08)`,
                border: `1px solid hsl(var(--primary) / 0.25)`,
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-primary" style={{ boxShadow: '0 0 6px hsl(var(--primary))' }} />
              {hero.badge}
            </p>

            <h1
              className="display text-foreground mb-6"
              style={{ fontSize: 'clamp(2.9rem, 6.4vw, 5.1rem)' }}
            >
              Healthcare that thinks ahead.
            </h1>

            <p
              className="text-lg md:text-xl leading-relaxed mb-9 max-w-xl"
              style={{ color: 'hsl(var(--text-dim))' }}
            >
              {hero.subhead}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-10">
              <Link
                to="/intake"
                className="inline-flex items-center justify-center px-7 py-3.5 rounded-xl text-base font-semibold transition-all duration-200 bg-primary hover:brightness-110"
                style={{
                  color: 'hsl(var(--primary-foreground))',
                  fontFamily: 'var(--font-heading)',
                  boxShadow: '0 0 28px hsl(var(--primary) / 0.4)',
                }}
              >
                {hero.ctaPrimary}
              </Link>
              <Link
                to="/providers"
                className="inline-flex items-center justify-center px-7 py-3.5 rounded-xl text-base font-semibold transition-all duration-200 hover:border-foreground/40"
                style={{
                  color: 'hsl(var(--foreground))',
                  border: `1px solid hsl(var(--border-subtle))`,
                  fontFamily: 'var(--font-heading)',
                }}
              >
                {hero.ctaSecondary}
              </Link>
            </div>

            {/* Honest design facts, flowsheet-style */}
            <dl
              className="grid grid-cols-3 max-w-md divide-x"
              style={{ borderColor: 'hsl(var(--border-subtle) / 0.6)' }}
            >
              {hero.stats.map((s: { id: string; value: string; label: string }, i: number) => (
                <div key={s.id} className={i === 0 ? 'pr-4' : 'px-4'}>
                  <dt className="sr-only">{s.label}</dt>
                  <dd>
                    <span
                      className="block text-lg font-bold text-foreground"
                      style={{ fontFamily: 'var(--font-heading)', fontStretch: '108%' }}
                    >
                      {s.value}
                    </span>
                    <span className="block text-xs mt-0.5 leading-snug" style={{ color: 'hsl(var(--text-dimmer))' }}>
                      {s.label}
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="flex lg:justify-end">
            <IntakeMonitor />
          </div>
        </div>
      </section>

      {/* ── SIGNATURE STRIP ──────────────────────────────────────────────── */}
      <EkgStrip />

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section className="py-xxxl">
        <div className="max-w-content mx-auto px-6">
          <div className="max-w-2xl mb-14">
            <h2 className="display text-foreground mb-4" style={{ fontSize: 'clamp(2rem, 3.6vw, 2.9rem)' }}>
              {howItWorks.headline}
            </h2>
            <p className="text-base md:text-lg leading-relaxed" style={{ color: 'hsl(var(--text-dim))' }}>
              {howItWorks.subhead}
            </p>
          </div>

          <ol className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8">
            {howItWorks.steps.map((step: { id: string; step: string; title: string; subtitle: string; description: string }) => (
              <li key={step.id} className="relative pl-5" style={{ borderLeft: `2px solid hsl(var(--primary) / 0.45)` }}>
                <span className="vitals block text-sm mb-3" style={{ color: 'hsl(var(--primary))' }}>
                  {step.step}
                </span>
                <h3
                  className="text-xl font-bold text-foreground mb-1"
                  style={{ fontFamily: 'var(--font-heading)', fontStretch: '108%' }}
                >
                  {step.title}
                </h3>
                <p className="text-sm font-medium mb-3" style={{ color: 'hsl(var(--text-dimmer))' }}>
                  {step.subtitle}
                </p>
                <p className="text-sm leading-relaxed" style={{ color: 'hsl(var(--text-dim))' }}>
                  {step.description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── THE BRIEF — EKG paper ────────────────────────────────────────── */}
      <section className="bg-ekg-paper relative">
        <div className="max-w-content mx-auto px-6 py-xxxl grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-12 lg:gap-16 items-start">
          <div className="lg:sticky lg:top-28">
            <h2
              className="display mb-5"
              style={{ fontSize: 'clamp(2rem, 3.6vw, 2.9rem)', color: 'hsl(var(--paper-ink))' }}
            >
              The brief your provider receives.
            </h2>
            <p className="text-base md:text-lg leading-relaxed mb-6" style={{ color: 'hsl(var(--paper-muted))' }}>
              Every intake becomes a structured clinical summary — the story,
              organized the way clinicians think, with anything serious flagged
              before the visit starts. No chart-digging. No repeating yourself.
            </p>
            <ul className="flex flex-col gap-2.5">
              {['Chief complaint and history, in clinical order', 'Medications and allergies, captured once', 'Red flags surfaced on top — never buried'].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm font-medium" style={{ color: 'hsl(var(--paper-ink))' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--paper-red))" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* The printed strip */}
          <div
            className="relative rounded-sm px-6 md:px-8 py-7"
            style={{
              background: 'hsl(var(--paper) / 0.65)',
              border: `1px solid hsl(var(--paper-edge))`,
              boxShadow: '0 10px 30px hsl(201 32% 13% / 0.12)',
              fontFamily: 'var(--font-mono)',
              color: 'hsl(var(--paper-ink))',
            }}
          >
            <p
              className="absolute right-5 top-5 rotate-6 px-2 py-0.5 text-xs font-semibold rounded-sm"
              style={{ color: 'hsl(var(--paper-red))', border: '1.5px solid hsl(var(--paper-red) / 0.8)' }}
            >
              EXAMPLE — demo data
            </p>

            <p className="text-xs mb-5" style={{ color: 'hsl(var(--paper-muted))' }}>
              ACUTE INSIGHT · pre-visit brief · patient: T. Sample
            </p>

            <div className="text-[13px] leading-[1.75] space-y-4">
              <p>
                <strong>CC:</strong> Burning with urination × 2 days.
              </p>
              <p>
                <strong>HPI:</strong> Sudden onset dysuria with urinary
                frequency, severity 5/10. Mild suprapubic discomfort. Denies
                fever, flank pain, hematuria. No prior episode this year.
              </p>
              <p>
                <strong>Meds:</strong> Lisinopril 20 mg daily · Metformin
                1000 mg BID
                <br />
                <strong>Allergies:</strong> Penicillin (rash)
                <br />
                <strong>PMH:</strong> Hypertension · Type 2 diabetes
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <strong>Flags:</strong>
                <span className="px-2 py-0.5 rounded-sm text-xs font-semibold" style={{ border: '1.5px solid hsl(var(--paper-red) / 0.75)', color: 'hsl(var(--paper-red))' }}>
                  Diabetic — infection risk
                </span>
                <span className="px-2 py-0.5 rounded-sm text-xs font-semibold" style={{ border: '1.5px solid hsl(var(--paper-red) / 0.75)', color: 'hsl(var(--paper-red))' }}>
                  On ACE inhibitor
                </span>
              </div>
            </div>

            <p className="mt-6 pt-4 text-xs" style={{ borderTop: '1px dashed hsl(var(--paper-grid-bold))', color: 'hsl(var(--paper-muted))' }}>
              Organized by Acute Insight AI. Diagnosis and plan stay with your
              clinician.
            </p>
          </div>
        </div>
      </section>

      {/* ── FEATURES — flowsheet rows ────────────────────────────────────── */}
      <section className="py-xxxl">
        <div className="max-w-content mx-auto px-6">
          <h2 className="display text-foreground mb-12 max-w-2xl" style={{ fontSize: 'clamp(2rem, 3.6vw, 2.9rem)' }}>
            {features.headline}
          </h2>

          <div style={{ borderTop: `1px solid hsl(var(--border-subtle) / 0.7)` }}>
            {features.rows.map((row: { id: string; stat: string; title: string; description: string }) => (
              <div
                key={row.id}
                className="grid grid-cols-1 md:grid-cols-[180px_1fr_1.6fr] gap-2 md:gap-8 py-7 items-baseline transition-colors duration-200 hover:bg-card/40"
                style={{ borderBottom: `1px solid hsl(var(--border-subtle) / 0.7)` }}
              >
                <span className="vitals text-sm" style={{ color: 'hsl(var(--primary))' }}>
                  {row.stat}
                </span>
                <h3 className="text-lg md:text-xl font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)', fontStretch: '106%' }}>
                  {row.title}
                </h3>
                <p className="text-sm md:text-[15px] leading-relaxed" style={{ color: 'hsl(var(--text-dim))' }}>
                  {row.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOR CLINICIANS ───────────────────────────────────────────────── */}
      <section
        className="py-xxxl"
        style={{ background: `hsl(var(--card) / 0.5)`, borderTop: `1px solid hsl(var(--border-subtle) / 0.5)`, borderBottom: `1px solid hsl(var(--border-subtle) / 0.5)` }}
      >
        <div className="max-w-content mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="display text-foreground mb-5" style={{ fontSize: 'clamp(2rem, 3.6vw, 2.9rem)' }}>
              {providers.headline1} {providers.headlineAccent}
            </h2>
            <p className="text-base md:text-lg leading-relaxed mb-8" style={{ color: 'hsl(var(--text-dim))' }}>
              {providers.subhead}
            </p>
            <Link
              to="/providers#early-access"
              className="inline-flex items-center justify-center px-7 py-3.5 rounded-xl text-base font-semibold transition-all duration-200 bg-primary hover:brightness-110"
              style={{ color: 'hsl(var(--primary-foreground))', fontFamily: 'var(--font-heading)', boxShadow: '0 0 24px hsl(var(--primary) / 0.35)' }}
            >
              {providers.cta}
            </Link>
          </div>

          <ul className="flex flex-col gap-4">
            {providers.benefits.map((b: { id: string; text: string }) => (
              <li
                key={b.id}
                className="flex items-start gap-3 rounded-xl px-5 py-4"
                style={{ background: `hsl(var(--card))`, border: `1px solid hsl(var(--border-subtle) / 0.6)` }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span className="text-sm md:text-[15px] font-medium text-foreground">{b.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────────────────── */}
      <section className="py-xxxl">
        <div className="max-w-content mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-0 md:divide-x" style={{ borderColor: 'hsl(var(--border-subtle) / 0.6)' }}>
          <div className="md:pr-12">
            <p className="vitals text-xs mb-4" style={{ color: 'hsl(var(--text-dimmer))' }}>
              {ctaSection.patients.eyebrow}
            </p>
            <h2 className="display text-foreground mb-4" style={{ fontSize: 'clamp(1.7rem, 2.8vw, 2.3rem)' }}>
              {ctaSection.patients.headline1} {ctaSection.patients.headline2}
            </h2>
            <p className="text-sm md:text-base leading-relaxed mb-6" style={{ color: 'hsl(var(--text-dim))' }}>
              {ctaSection.patients.body}
            </p>
            <Link
              to="/intake"
              className="inline-flex items-center justify-center px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 bg-primary hover:brightness-110"
              style={{ color: 'hsl(var(--primary-foreground))', fontFamily: 'var(--font-heading)' }}
            >
              {ctaSection.patients.cta}
            </Link>
          </div>
          <div className="md:pl-12">
            <p className="vitals text-xs mb-4" style={{ color: 'hsl(var(--text-dimmer))' }}>
              {ctaSection.clinicians.eyebrow}
            </p>
            <h2 className="display text-foreground mb-4" style={{ fontSize: 'clamp(1.7rem, 2.8vw, 2.3rem)' }}>
              {ctaSection.clinicians.headline1} {ctaSection.clinicians.headline2}
            </h2>
            <p className="text-sm md:text-base leading-relaxed mb-6" style={{ color: 'hsl(var(--text-dim))' }}>
              {ctaSection.clinicians.body}
            </p>
            <Link
              to="/providers#early-access"
              className="inline-flex items-center justify-center px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 hover:border-foreground/40"
              style={{ color: 'hsl(var(--foreground))', border: `1px solid hsl(var(--border-subtle))`, fontFamily: 'var(--font-heading)' }}
            >
              {ctaSection.clinicians.cta}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
