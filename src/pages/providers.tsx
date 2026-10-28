import { useState } from 'react';
import { Helmet } from '@dr.pogodin/react-helmet';
import { motion } from 'motion/react';
// Link no longer used after the CTA became the early-access form
import { providers } from 'virtual:content';

// ─── Animation variants ───────────────────────────────────────────────────────

// Scroll-triggered entrances removed: content renders immediately.
const fadeUp = { hidden: {}, visible: {} };

const stagger = { hidden: {}, visible: {} };

// ─── Shared section wrapper ───────────────────────────────────────────────────

function sectionClass(tinted = false) {
  return `py-xxl${tinted ? ' ' : ''}`;
}


// ─── Early access request form ───────────────────────────────────────────────
function EarlyAccessSection() {
  const [form, setForm] = useState({ name: '', email: '', organization: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (status === 'sending') return;
    setStatus('sending');
    setError('');
    try {
      const honeypot = (document.getElementById('ea-website') as HTMLInputElement | null)?.value ?? '';
      const res = await fetch('/api/access-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, website: honeypot }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus('error');
        setError((data as { error?: string }).error ?? 'Something went wrong — please try again.');
        return;
      }
      setStatus('done');
    } catch {
      setStatus('error');
      setError('Something went wrong — please try again.');
    }
  }

  const inputStyle: React.CSSProperties = {
    background: 'hsl(var(--surface-deeper) / 0.6)',
    border: '1px solid hsl(var(--border-subtle))',
    color: 'hsl(var(--foreground))',
    fontFamily: 'var(--font-sans)',
  };

  return (
    <section id="early-access" className="py-xxl scroll-mt-24">
      <div className="max-w-content mx-auto px-6">
        <div
          className="rounded-3xl overflow-hidden grid grid-cols-1 lg:grid-cols-2"
          style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--primary) / 0.25)' }}
        >
          <div className="p-8 md:p-12">
            <h2
              className="display mb-4"
              style={{ fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', color: 'hsl(var(--foreground))' }}
            >
              Request early access.
            </h2>
            <p className="text-base leading-relaxed mb-6" style={{ color: 'hsl(var(--text-dim))' }}>
              The beta is small by design. Tell us about your practice and the
              founder will reach out personally — usually within a couple of
              days.
            </p>
            <ul className="flex flex-col gap-2.5">
              {['Free during the clinical beta', 'Web-based — nothing to install', 'Your feedback shapes the roadmap'].map((t) => (
                <li key={t} className="flex items-start gap-2.5 text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <div
            className="p-8 md:p-12"
            style={{ borderTop: '1px solid hsl(var(--border-subtle) / 0.5)' }}
          >
            {status === 'done' ? (
              <div className="h-full flex flex-col justify-center">
                <span
                  className="inline-flex self-start items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold mb-3"
                  style={{ color: 'hsl(var(--primary))', background: 'hsl(var(--primary) / 0.1)', border: '1px solid hsl(var(--primary) / 0.35)' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  Request received
                </span>
                <p className="text-sm leading-relaxed" style={{ color: 'hsl(var(--text-dim))' }}>
                  Thank you — we have your details and will reach out at the
                  email you provided.
                </p>
              </div>
            ) : (
              <form onSubmit={submit} className="flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="flex flex-col gap-1.5 text-sm font-medium" style={{ color: 'hsl(var(--text-dim))' }}>
                    Your name
                    <input
                      required
                      maxLength={160}
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary transition-colors"
                      style={inputStyle}
                      autoComplete="name"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm font-medium" style={{ color: 'hsl(var(--text-dim))' }}>
                    Email
                    <input
                      required
                      type="email"
                      maxLength={255}
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary transition-colors"
                      style={inputStyle}
                      autoComplete="email"
                    />
                  </label>
                </div>
                <label className="flex flex-col gap-1.5 text-sm font-medium" style={{ color: 'hsl(var(--text-dim))' }}>
                  Practice or organization
                  <input
                    maxLength={200}
                    value={form.organization}
                    onChange={(e) => setForm({ ...form, organization: e.target.value })}
                    className="rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary transition-colors"
                    style={inputStyle}
                    autoComplete="organization"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-medium" style={{ color: 'hsl(var(--text-dim))' }}>
                  What would you use it for?
                  <textarea
                    rows={3}
                    maxLength={2000}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className="rounded-lg px-3.5 py-2.5 text-sm outline-none resize-none focus:border-primary transition-colors"
                    style={inputStyle}
                  />
                </label>
                {/* Honeypot — humans never see this */}
                <input
                  id="ea-website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
                />
                {status === 'error' && (
                  <p className="text-sm" style={{ color: 'hsl(var(--destructive))' }}>{error}</p>
                )}
                <button
                  type="submit"
                  disabled={status === 'sending'}
                  className="mt-1 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 bg-primary hover:brightness-110 disabled:opacity-60 self-start"
                  style={{ color: 'hsl(var(--primary-foreground))', fontFamily: 'var(--font-heading)' }}
                >
                  {status === 'sending' ? 'Sending…' : 'Send request'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProvidersPage() {
  const siteUrl = 'https://acuteinsightai.com';
  const url = `${siteUrl}/providers`;
  const title = 'Join Our Provider Network — Acute Insight AI';
  const description =
    'Licensed clinicians: practice telehealth on your schedule. AI-prepared patient briefs, weekly pay, malpractice coverage included. Apply to join Acute Insight AI.';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${url}#webpage`,
    name: title,
    url,
    description,
    isPartOf: { '@id': `${siteUrl}/#website` },
    about: { '@id': `${siteUrl}/#organization` },
  };

  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={url} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={url} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json">
          {JSON.stringify(jsonLd).replace(/</g, '\\u003c')}
        </script>
      </Helmet>

      <main>

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden pt-24 pb-20">
          <div className="absolute inset-0 z-0">
            <img
              src="/airo-assets/images/pages/providers/hero"
              alt="Doctor conducting a telehealth consultation on a laptop"
              className="w-full h-full object-cover"
              width={1200}
              height={600}
              loading="eager"
              fetchPriority="high"
            />
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `linear-gradient(135deg, hsl(var(--background) / 0.96) 45%, hsl(var(--background) / 0.7) 100%)`,
              }}
            />
          </div>

          <div className="relative z-10 max-w-content mx-auto px-6">
            <motion.div initial="hidden" animate="visible" variants={stagger} className="max-w-2xl">
              <motion.p
                variants={fadeUp}
                className="text-xs font-semibold tracking-normal mb-3"
                style={{ color: `hsl(var(--primary))`, fontFamily: 'var(--font-sans)' }}
              >
                {providers.hero.eyebrow}
              </motion.p>
              <motion.h1
                variants={fadeUp}
                className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6"
                style={{ color: `hsl(var(--foreground))`, fontFamily: 'var(--font-heading)' }}
              >
                {providers.hero.heading}
              </motion.h1>
              <motion.p
                variants={fadeUp}
                className="text-lg leading-relaxed mb-8"
                style={{ color: `hsl(var(--muted-foreground))`, fontFamily: 'var(--font-sans)' }}
              >
                {providers.hero.subheading}
              </motion.p>
              <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4">
                <a
                  href="#early-access"
                  className="px-8 py-3 rounded-xl text-sm font-semibold transition-all duration-200 hover:opacity-90 text-center"
                  style={{
                    background: `hsl(var(--primary))`,
                    color: `hsl(var(--background))`,
                    fontFamily: 'var(--font-heading)',
                    textDecoration: 'none',
                  }}
                >
                  {providers.hero.primaryButton}
                </a>
                <a
                  href="#how-it-works"
                  className="px-8 py-3 rounded-xl text-sm font-semibold transition-all duration-200 hover:opacity-80 text-center"
                  style={{
                    background: 'transparent',
                    color: `hsl(var(--foreground))`,
                    border: `1px solid hsl(var(--border-subtle) / 0.5)`,
                    fontFamily: 'var(--font-heading)',
                    textDecoration: 'none',
                  }}
                >
                  {providers.hero.secondaryButton}
                </a>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* ── Stats bar ────────────────────────────────────────────────────── */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={stagger}
          style={{ background: `hsl(var(--card))`, borderTop: `1px solid hsl(var(--border-subtle) / 0.3)`, borderBottom: `1px solid hsl(var(--border-subtle) / 0.3)` }}
        >
          <div className="max-w-content mx-auto px-6 py-10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {providers.stats.map((stat) => (
                <motion.div key={stat.id} variants={fadeUp} className="text-center">
                  <p
                    className="text-3xl font-bold mb-1"
                    style={{ color: `hsl(var(--primary))`, fontFamily: 'var(--font-heading)' }}
                  >
                    {stat.value}
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: `hsl(var(--muted-foreground))`, fontFamily: 'var(--font-sans)' }}
                  >
                    {stat.label}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* ── Benefits ─────────────────────────────────────────────────────── */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
          className={sectionClass()}
        >
          <div className="max-w-content mx-auto px-6">
            <div className="text-center mb-14">
              <motion.p
                variants={fadeUp}
                className="text-xs font-semibold tracking-normal mb-3"
                style={{ color: `hsl(var(--primary))`, fontFamily: 'var(--font-sans)' }}
              >
                {providers.benefits.eyebrow}
              </motion.p>
              <motion.h2
                variants={fadeUp}
                className="text-3xl md:text-4xl font-bold"
                style={{ color: `hsl(var(--foreground))`, fontFamily: 'var(--font-heading)' }}
              >
                {providers.benefits.heading}
              </motion.h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {providers.benefits.items.map((item) => (
                <motion.div
                  key={item.id}
                  variants={fadeUp}
                  className="rounded-2xl p-7"
                  style={{
                    background: `hsl(var(--card))`,
                    border: `1px solid hsl(var(--border-subtle) / 0.3)`,
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-5"
                    style={{ background: `hsl(var(--primary) / 0.1)` }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <h3
                    className="text-base font-bold mb-2"
                    style={{ color: `hsl(var(--foreground))`, fontFamily: 'var(--font-heading)' }}
                  >
                    {item.title}
                  </h3>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: `hsl(var(--muted-foreground))`, fontFamily: 'var(--font-sans)' }}
                  >
                    {item.body}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* ── How It Works ─────────────────────────────────────────────────── */}
        <motion.section
          id="how-it-works"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
          className={sectionClass(true)}
          style={{ background: `hsl(var(--card) / 0.4)` }}
        >
          <div className="max-w-content mx-auto px-6">
            <div className="text-center mb-14">
              <motion.p
                variants={fadeUp}
                className="text-xs font-semibold tracking-normal mb-3"
                style={{ color: `hsl(var(--primary))`, fontFamily: 'var(--font-sans)' }}
              >
                {providers.howItWorks.eyebrow}
              </motion.p>
              <motion.h2
                variants={fadeUp}
                className="text-3xl md:text-4xl font-bold"
                style={{ color: `hsl(var(--foreground))`, fontFamily: 'var(--font-heading)' }}
              >
                {providers.howItWorks.heading}
              </motion.h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {providers.howItWorks.steps.map((step, idx) => (
                <motion.div
                  key={step.id}
                  variants={fadeUp}
                  className="relative rounded-2xl p-7"
                  style={{
                    background: `hsl(var(--background))`,
                    border: `1px solid hsl(var(--border-subtle) / 0.3)`,
                  }}
                >
                  {idx < providers.howItWorks.steps.length - 1 && (
                    <div
                      className="hidden lg:block absolute top-10 left-full w-6 h-px z-10"
                      style={{ background: `hsl(var(--primary) / 0.3)` }}
                    />
                  )}
                  <span
                    aria-hidden="true"
                    className="block text-4xl font-bold mb-4 leading-none"
                    style={{ color: `hsl(var(--primary) / 0.5)`, fontFamily: 'var(--font-heading)' }}
                  >
                    {step.number}
                  </span>
                  <h3
                    className="text-base font-bold mb-2"
                    style={{ color: `hsl(var(--foreground))`, fontFamily: 'var(--font-heading)' }}
                  >
                    {step.title}
                  </h3>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: `hsl(var(--muted-foreground))`, fontFamily: 'var(--font-sans)' }}
                  >
                    {step.body}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* ── Earnings & Flexibility ───────────────────────────────────────── */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
          className={sectionClass()}
        >
          <div className="max-w-content mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
              <div>
                <motion.p
                  variants={fadeUp}
                  className="text-xs font-semibold tracking-normal mb-3"
                  style={{ color: `hsl(var(--primary))`, fontFamily: 'var(--font-sans)' }}
                >
                  {providers.earnings.eyebrow}
                </motion.p>
                <motion.h2
                  variants={fadeUp}
                  className="text-3xl md:text-4xl font-bold mb-5"
                  style={{ color: `hsl(var(--foreground))`, fontFamily: 'var(--font-heading)' }}
                >
                  {providers.earnings.heading}
                </motion.h2>
                <motion.p
                  variants={fadeUp}
                  className="text-base leading-relaxed"
                  style={{ color: `hsl(var(--muted-foreground))`, fontFamily: 'var(--font-sans)' }}
                >
                  {providers.earnings.body}
                </motion.p>
              </div>
              <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {providers.earnings.details.map((detail) => (
                  <div
                    key={detail.id}
                    className="rounded-2xl p-5"
                    style={{
                      background: `hsl(var(--card))`,
                      border: `1px solid hsl(var(--border-subtle) / 0.3)`,
                    }}
                  >
                    <p
                      className="text-sm font-semibold mb-1"
                      style={{ color: `hsl(var(--foreground))`, fontFamily: 'var(--font-heading)' }}
                    >
                      {detail.label}
                    </p>
                    <p
                      className="text-xs leading-snug"
                      style={{ color: `hsl(var(--muted-foreground))`, fontFamily: 'var(--font-sans)' }}
                    >
                      {detail.detail}
                    </p>
                  </div>
                ))}
              </motion.div>
            </div>
          </div>
        </motion.section>

        {/* ── Testimonials (rendered only when real, attributable quotes exist) ── */}
        {providers.testimonials.length > 0 && (
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
          className={sectionClass(true)}
          style={{ background: `hsl(var(--card) / 0.4)` }}
        >
          <div className="max-w-content mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {providers.testimonials.map((t) => (
                <motion.div
                  key={t.id}
                  variants={fadeUp}
                  className="rounded-2xl p-8 flex flex-col gap-5"
                  style={{
                    background: `hsl(var(--background))`,
                    border: `1px solid hsl(var(--border-subtle) / 0.3)`,
                  }}
                >
                  {/* Quote mark */}
                  <svg width="28" height="20" viewBox="0 0 28 20" fill="none">
                    <path
                      d="M0 20V12C0 5.373 4.477 1.12 13.43 0l1.14 2.16C9.617 3.307 7.333 5.84 6.667 9.333H12V20H0zm16 0V12C16 5.373 20.477 1.12 29.43 0l1.14 2.16C25.617 3.307 23.333 5.84 22.667 9.333H28V20H16z"
                      fill="hsl(var(--primary))"
                      fillOpacity="0.25"
                    />
                  </svg>
                  <p
                    className="text-sm leading-relaxed flex-1"
                    style={{ color: `hsl(var(--foreground))`, fontFamily: 'var(--font-sans)' }}
                  >
                    {t.quote}
                  </p>
                  <div>
                    <p
                      className="text-sm font-semibold"
                      style={{ color: `hsl(var(--foreground))`, fontFamily: 'var(--font-heading)' }}
                    >
                      {t.name}
                    </p>
                    <p
                      className="text-xs"
                      style={{ color: `hsl(var(--muted-foreground))`, fontFamily: 'var(--font-sans)' }}
                    >
                      {t.credential}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>
        )}

        {/* ── Requirements ─────────────────────────────────────────────────── */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
          className={sectionClass()}
        >
          <div className="max-w-content mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
              <div>
                <motion.p
                  variants={fadeUp}
                  className="text-xs font-semibold tracking-normal mb-3"
                  style={{ color: `hsl(var(--primary))`, fontFamily: 'var(--font-sans)' }}
                >
                  {providers.requirements.eyebrow}
                </motion.p>
                <motion.h2
                  variants={fadeUp}
                  className="text-3xl md:text-4xl font-bold"
                  style={{ color: `hsl(var(--foreground))`, fontFamily: 'var(--font-heading)' }}
                >
                  {providers.requirements.heading}
                </motion.h2>
              </div>
              <motion.ul variants={stagger} className="flex flex-col gap-3 list-none p-0 m-0">
                {providers.requirements.items.map((item) => (
                  <motion.li
                    key={item.id}
                    variants={fadeUp}
                    className="flex items-start gap-3"
                  >
                    <span
                      className="mt-0.5 shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ background: `hsl(var(--primary) / 0.12)` }}
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                    <span
                      className="text-sm leading-relaxed"
                      style={{ color: `hsl(var(--muted-foreground))`, fontFamily: 'var(--font-sans)' }}
                    >
                      {item.text}
                    </span>
                  </motion.li>
                ))}
              </motion.ul>
            </div>
          </div>
        </motion.section>

        <EarlyAccessSection />

      </main>
    </>
  );
}
