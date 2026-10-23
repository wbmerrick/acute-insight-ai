import { Helmet } from '@dr.pogodin/react-helmet';
import { motion } from 'motion/react';
import { Link } from 'react-router';
import { providers } from 'virtual:content';

// ─── Animation variants ───────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' as const } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

// ─── Shared section wrapper ───────────────────────────────────────────────────

function sectionClass(tinted = false) {
  return `py-xxl${tinted ? ' ' : ''}`;
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
                className="text-xs font-semibold tracking-widest uppercase mb-3"
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
                  href="#apply"
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
                className="text-xs font-semibold tracking-widest uppercase mb-3"
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
                className="text-xs font-semibold tracking-widest uppercase mb-3"
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
                    className="block text-4xl font-bold mb-4 leading-none"
                    style={{ color: `hsl(var(--primary) / 0.2)`, fontFamily: 'var(--font-heading)' }}
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
                  className="text-xs font-semibold tracking-widest uppercase mb-3"
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
                  className="text-xs font-semibold tracking-widest uppercase mb-3"
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

        {/* ── CTA / Application ────────────────────────────────────────────── */}
        <motion.section
          id="apply"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
          className={sectionClass()}
        >
          <div className="max-w-content mx-auto px-6">
            <motion.div
              variants={fadeUp}
              className="rounded-3xl p-12 md:p-16 text-center relative overflow-hidden"
              style={{
                background: `hsl(var(--card))`,
                border: `1px solid hsl(var(--primary) / 0.2)`,
              }}
            >
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: `radial-gradient(ellipse 60% 50% at 50% 100%, hsl(var(--primary) / 0.08), transparent)`,
                }}
              />
              <div className="relative z-10">
                <h2
                  className="text-3xl md:text-4xl font-bold mb-4"
                  style={{ color: `hsl(var(--foreground))`, fontFamily: 'var(--font-heading)' }}
                >
                  {providers.cta.heading}
                </h2>
                <p
                  className="text-base mb-8 max-w-md mx-auto"
                  style={{ color: `hsl(var(--muted-foreground))`, fontFamily: 'var(--font-sans)' }}
                >
                  {providers.cta.subheading}
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    to="/signup"
                    className="px-8 py-3 rounded-xl text-sm font-semibold transition-all duration-200 hover:opacity-90"
                    style={{
                      background: `hsl(var(--primary))`,
                      color: `hsl(var(--background))`,
                      fontFamily: 'var(--font-heading)',
                      textDecoration: 'none',
                    }}
                  >
                    {providers.cta.primaryButton}
                  </Link>
                  <Link
                    to="/about"
                    className="px-8 py-3 rounded-xl text-sm font-semibold transition-all duration-200 hover:opacity-80"
                    style={{
                      background: 'transparent',
                      color: `hsl(var(--foreground))`,
                      border: `1px solid hsl(var(--border-subtle) / 0.5)`,
                      fontFamily: 'var(--font-heading)',
                      textDecoration: 'none',
                    }}
                  >
                    {providers.cta.secondaryButton}
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.section>

      </main>
    </>
  );
}
