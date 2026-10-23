import { Helmet } from '@dr.pogodin/react-helmet';
import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';
import { Link } from 'react-router';
import { patients } from 'virtual:content';

// ─── Animation variants ───────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' as const } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PatientsPage() {
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState(patients.conditions.categories[0].id);

  const siteUrl = 'https://acuteinsightai.com';
  const url = `${siteUrl}/patients`;
  const title = 'For Patients — Acute Insight AI';
  const description =
    'Complete an adaptive AI intake in minutes so your provider walks into your visit already understanding your story. Free during the clinical beta.';

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
              src="/airo-assets/images/pages/patients/hero"
              alt="Patient using a telehealth app at home"
              className="w-full h-full object-cover"
              width={1200}
              height={600}
              loading="eager"
              fetchPriority="high"
            />
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: `linear-gradient(135deg, hsl(var(--background) / 0.96) 45%, hsl(var(--background) / 0.7) 100%)` }}
            />
          </div>
          <div className="relative z-10 max-w-content mx-auto px-6">
            <motion.div initial="hidden" animate="visible" variants={stagger} className="max-w-2xl">
              <motion.p
                variants={fadeUp}
                className="text-xs font-semibold tracking-widest uppercase mb-3"
                style={{ color: `hsl(var(--primary))`, fontFamily: 'var(--font-sans)' }}
              >
                {patients.hero.eyebrow}
              </motion.p>
              <motion.h1
                variants={fadeUp}
                className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6"
                style={{ color: `hsl(var(--foreground))`, fontFamily: 'var(--font-heading)' }}
              >
                {patients.hero.heading}
              </motion.h1>
              <motion.p
                variants={fadeUp}
                className="text-lg leading-relaxed mb-8"
                style={{ color: `hsl(var(--muted-foreground))`, fontFamily: 'var(--font-sans)' }}
              >
                {patients.hero.subheading}
              </motion.p>
              <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4">
                <Link
                  to="/signup"
                  className="px-8 py-3 rounded-xl text-sm font-semibold transition-all duration-200 hover:opacity-90 text-center"
                  style={{ background: `hsl(var(--primary))`, color: `hsl(var(--background))`, fontFamily: 'var(--font-heading)', textDecoration: 'none' }}
                >
                  {patients.hero.primaryButton}
                </Link>
                <a
                  href="#how-it-works"
                  className="px-8 py-3 rounded-xl text-sm font-semibold transition-all duration-200 hover:opacity-80 text-center"
                  style={{ background: 'transparent', color: `hsl(var(--foreground))`, border: `1px solid hsl(var(--border-subtle) / 0.5)`, fontFamily: 'var(--font-heading)', textDecoration: 'none' }}
                >
                  {patients.hero.secondaryButton}
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
              {patients.stats.map((stat) => (
                <motion.div key={stat.id} variants={fadeUp} className="text-center">
                  <p className="text-3xl font-bold mb-1" style={{ color: `hsl(var(--primary))`, fontFamily: 'var(--font-heading)' }}>
                    {stat.value}
                  </p>
                  <p className="text-xs" style={{ color: `hsl(var(--muted-foreground))`, fontFamily: 'var(--font-sans)' }}>
                    {stat.label}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* ── Conditions treated ───────────────────────────────────────────── */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
          className="py-xxl"
        >
          <div className="max-w-content mx-auto px-6">
            <div className="text-center mb-12">
              <motion.p variants={fadeUp} className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: `hsl(var(--primary))`, fontFamily: 'var(--font-sans)' }}>
                {patients.conditions.eyebrow}
              </motion.p>
              <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-bold mb-4" style={{ color: `hsl(var(--foreground))`, fontFamily: 'var(--font-heading)' }}>
                {patients.conditions.heading}
              </motion.h2>
              <motion.p variants={fadeUp} className="text-base max-w-xl mx-auto" style={{ color: `hsl(var(--muted-foreground))`, fontFamily: 'var(--font-sans)' }}>
                {patients.conditions.subheading}
              </motion.p>
            </div>

            {/* Category tabs */}
            <motion.div variants={fadeUp} className="flex flex-wrap gap-2 justify-center mb-8" role="group" aria-label="Condition categories">
              {patients.conditions.categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200"
                  style={{
                    background: activeCategory === cat.id ? `hsl(var(--primary))` : `hsl(var(--card))`,
                    color: activeCategory === cat.id ? `hsl(var(--background))` : `hsl(var(--muted-foreground))`,
                    border: `1px solid ${activeCategory === cat.id ? 'transparent' : 'hsl(var(--border-subtle) / 0.3)'}`,
                    fontFamily: 'var(--font-heading)',
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </motion.div>

            {/* Condition chips — rendered for all categories, visibility toggled by CSS */}
            <motion.div variants={fadeUp}>
              {patients.conditions.categories.map((cat) => (
                <div
                  key={cat.id}
                  className={activeCategory === cat.id ? 'block' : 'hidden'}
                >
                  <div className="flex flex-wrap gap-3 justify-center">
                    {cat.items.map((item) => (
                      <span
                        key={item.id}
                        className="px-4 py-2 rounded-xl text-sm"
                        style={{
                          background: `hsl(var(--card))`,
                          color: `hsl(var(--foreground))`,
                          border: `1px solid hsl(var(--border-subtle) / 0.3)`,
                          fontFamily: 'var(--font-sans)',
                        }}
                      >
                        {item.name}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </motion.section>

        {/* ── Benefits ─────────────────────────────────────────────────────── */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
          className="py-xxl"
          style={{ background: `hsl(var(--card) / 0.4)` }}
        >
          <div className="max-w-content mx-auto px-6">
            <div className="text-center mb-14">
              <motion.p variants={fadeUp} className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: `hsl(var(--primary))`, fontFamily: 'var(--font-sans)' }}>
                {patients.benefits.eyebrow}
              </motion.p>
              <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-bold" style={{ color: `hsl(var(--foreground))`, fontFamily: 'var(--font-heading)' }}>
                {patients.benefits.heading}
              </motion.h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {patients.benefits.items.map((item) => (
                <motion.div
                  key={item.id}
                  variants={fadeUp}
                  className="rounded-2xl p-7"
                  style={{ background: `hsl(var(--background))`, border: `1px solid hsl(var(--border-subtle) / 0.3)` }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-5"
                    style={{ background: `hsl(var(--primary) / 0.1)` }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <h3 className="text-base font-bold mb-2" style={{ color: `hsl(var(--foreground))`, fontFamily: 'var(--font-heading)' }}>
                    {item.title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: `hsl(var(--muted-foreground))`, fontFamily: 'var(--font-sans)' }}>
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
          className="py-xxl"
        >
          <div className="max-w-content mx-auto px-6">
            <div className="text-center mb-14">
              <motion.p variants={fadeUp} className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: `hsl(var(--primary))`, fontFamily: 'var(--font-sans)' }}>
                {patients.howItWorks.eyebrow}
              </motion.p>
              <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-bold" style={{ color: `hsl(var(--foreground))`, fontFamily: 'var(--font-heading)' }}>
                {patients.howItWorks.heading}
              </motion.h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {patients.howItWorks.steps.map((step, idx) => (
                <motion.div
                  key={step.id}
                  variants={fadeUp}
                  className="relative rounded-2xl p-8"
                  style={{ background: `hsl(var(--card))`, border: `1px solid hsl(var(--border-subtle) / 0.3)` }}
                >
                  {idx < patients.howItWorks.steps.length - 1 && (
                    <div className="hidden md:block absolute top-12 left-full w-8 h-px z-10" style={{ background: `hsl(var(--primary) / 0.3)` }} />
                  )}
                  <span className="block text-5xl font-bold mb-4 leading-none" style={{ color: `hsl(var(--primary) / 0.2)`, fontFamily: 'var(--font-heading)' }}>
                    {step.number}
                  </span>
                  <h3 className="text-lg font-bold mb-3" style={{ color: `hsl(var(--foreground))`, fontFamily: 'var(--font-heading)' }}>
                    {step.title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: `hsl(var(--muted-foreground))`, fontFamily: 'var(--font-sans)' }}>
                    {step.body}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* ── Cost & Insurance ─────────────────────────────────────────────── */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
          className="py-xxl"
          style={{ background: `hsl(var(--card) / 0.4)` }}
        >
          <div className="max-w-content mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
              <div>
                <motion.p variants={fadeUp} className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: `hsl(var(--primary))`, fontFamily: 'var(--font-sans)' }}>
                  {patients.cost.eyebrow}
                </motion.p>
                <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-bold mb-5" style={{ color: `hsl(var(--foreground))`, fontFamily: 'var(--font-heading)' }}>
                  {patients.cost.heading}
                </motion.h2>
                <motion.p variants={fadeUp} className="text-base leading-relaxed" style={{ color: `hsl(var(--muted-foreground))`, fontFamily: 'var(--font-sans)' }}>
                  {patients.cost.body}
                </motion.p>
              </div>
              <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {patients.cost.details.map((detail) => (
                  <div
                    key={detail.id}
                    className="rounded-2xl p-5"
                    style={{ background: `hsl(var(--background))`, border: `1px solid hsl(var(--border-subtle) / 0.3)` }}
                  >
                    <p className="text-sm font-semibold mb-1" style={{ color: `hsl(var(--foreground))`, fontFamily: 'var(--font-heading)' }}>
                      {detail.label}
                    </p>
                    <p className="text-xs leading-snug" style={{ color: `hsl(var(--muted-foreground))`, fontFamily: 'var(--font-sans)' }}>
                      {detail.detail}
                    </p>
                  </div>
                ))}
              </motion.div>
            </div>
          </div>
        </motion.section>

        {/* ── Testimonials (rendered only when real, attributable quotes exist) ── */}
        {patients.testimonials.length > 0 && (
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
          className="py-xxl"
        >
          <div className="max-w-content mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {patients.testimonials.map((t) => (
                <motion.div
                  key={t.id}
                  variants={fadeUp}
                  className="rounded-2xl p-8 flex flex-col gap-5"
                  style={{ background: `hsl(var(--card))`, border: `1px solid hsl(var(--border-subtle) / 0.3)` }}
                >
                  <svg width="28" height="20" viewBox="0 0 28 20" fill="none">
                    <path d="M0 20V12C0 5.373 4.477 1.12 13.43 0l1.14 2.16C9.617 3.307 7.333 5.84 6.667 9.333H12V20H0zm16 0V12C16 5.373 20.477 1.12 29.43 0l1.14 2.16C25.617 3.307 23.333 5.84 22.667 9.333H28V20H16z" fill="hsl(var(--primary))" fillOpacity="0.25" />
                  </svg>
                  <p className="text-sm leading-relaxed flex-1" style={{ color: `hsl(var(--foreground))`, fontFamily: 'var(--font-sans)' }}>
                    {t.quote}
                  </p>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: `hsl(var(--foreground))`, fontFamily: 'var(--font-heading)' }}>
                      {t.name}
                    </p>
                    <p className="text-xs" style={{ color: `hsl(var(--muted-foreground))`, fontFamily: 'var(--font-sans)' }}>
                      {t.location}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>
        )}

        {/* ── Privacy & security ───────────────────────────────────────────── */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
          className="py-xxl"
          style={{ background: `hsl(var(--card) / 0.4)` }}
        >
          <div className="max-w-content mx-auto px-6">
            <div
              className="rounded-3xl p-10 md:p-14"
              style={{ background: `hsl(var(--card))`, border: `1px solid hsl(var(--border-subtle) / 0.3)` }}
            >
              <div className="max-w-2xl mb-10">
                <motion.p variants={fadeUp} className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: `hsl(var(--primary))`, fontFamily: 'var(--font-sans)' }}>
                  {patients.privacy.eyebrow}
                </motion.p>
                <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-bold mb-4" style={{ color: `hsl(var(--foreground))`, fontFamily: 'var(--font-heading)' }}>
                  {patients.privacy.heading}
                </motion.h2>
                <motion.p variants={fadeUp} className="text-base leading-relaxed" style={{ color: `hsl(var(--muted-foreground))`, fontFamily: 'var(--font-sans)' }}>
                  {patients.privacy.body}
                </motion.p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {patients.privacy.badges.map((badge) => (
                  <motion.div
                    key={badge.id}
                    variants={fadeUp}
                    className="rounded-2xl p-5 flex flex-col gap-2"
                    style={{ background: `hsl(var(--background))`, border: `1px solid hsl(var(--primary) / 0.25)` }}
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                    <p className="text-sm font-semibold" style={{ color: `hsl(var(--foreground))`, fontFamily: 'var(--font-heading)' }}>
                      {badge.label}
                    </p>
                    <p className="text-xs leading-snug" style={{ color: `hsl(var(--muted-foreground))`, fontFamily: 'var(--font-sans)' }}>
                      {badge.detail}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.section>

        {/* ── FAQ ──────────────────────────────────────────────────────────── */}
        <motion.section
          id="faq"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
          className="py-xxl"
        >
          <div className="max-w-content mx-auto px-6">
            <div className="text-center mb-14">
              <motion.p variants={fadeUp} className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: `hsl(var(--primary))`, fontFamily: 'var(--font-sans)' }}>
                {patients.faq.eyebrow}
              </motion.p>
              <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-bold" style={{ color: `hsl(var(--foreground))`, fontFamily: 'var(--font-heading)' }}>
                {patients.faq.heading}
              </motion.h2>
            </div>
            <motion.div variants={stagger} className="max-w-2xl mx-auto flex flex-col gap-3">
              {patients.faq.items.map((item) => (
                <motion.div
                  key={item.id}
                  variants={fadeUp}
                  className="rounded-2xl overflow-hidden"
                  style={{ border: `1px solid hsl(var(--border-subtle) / 0.3)` }}
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === item.id ? null : item.id)}
                    className="w-full flex items-center justify-between gap-4 p-6 text-left transition-colors duration-200"
                    style={{
                      background: openFaq === item.id ? `hsl(var(--card))` : `hsl(var(--background))`,
                      color: `hsl(var(--foreground))`,
                      fontFamily: 'var(--font-heading)',
                    }}
                    aria-expanded={openFaq === item.id}
                  >
                    <span className="text-sm font-semibold">{item.question}</span>
                    <span
                      className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-transform duration-200"
                      style={{
                        background: `hsl(var(--primary) / 0.12)`,
                        transform: openFaq === item.id ? 'rotate(45deg)' : 'rotate(0deg)',
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </span>
                  </button>
                  <AnimatePresence initial={false}>
                    {openFaq === item.id && (
                      <motion.div
                        key="answer"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1, transition: { duration: 0.25, ease: 'easeOut' as const } }}
                        exit={{ height: 0, opacity: 0, transition: { duration: 0.2, ease: 'easeIn' as const } }}
                        style={{ overflow: 'hidden' }}
                      >
                        <p
                          className="px-6 pb-6 text-sm leading-relaxed"
                          style={{ color: `hsl(var(--muted-foreground))`, fontFamily: 'var(--font-sans)' }}
                        >
                          {item.answer}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </motion.section>

        {/* ── CTA ──────────────────────────────────────────────────────────── */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
          className="py-xxl"
        >
          <div className="max-w-content mx-auto px-6">
            <motion.div
              variants={fadeUp}
              className="rounded-3xl p-12 md:p-16 text-center relative overflow-hidden"
              style={{ background: `hsl(var(--card))`, border: `1px solid hsl(var(--primary) / 0.2)` }}
            >
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: `radial-gradient(ellipse 60% 50% at 50% 100%, hsl(var(--primary) / 0.08), transparent)` }}
              />
              <div className="relative z-10">
                <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: `hsl(var(--foreground))`, fontFamily: 'var(--font-heading)' }}>
                  {patients.cta.heading}
                </h2>
                <p className="text-base mb-8 max-w-md mx-auto" style={{ color: `hsl(var(--muted-foreground))`, fontFamily: 'var(--font-sans)' }}>
                  {patients.cta.subheading}
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    to="/signup"
                    className="px-8 py-3 rounded-xl text-sm font-semibold transition-all duration-200 hover:opacity-90"
                    style={{ background: `hsl(var(--primary))`, color: `hsl(var(--background))`, fontFamily: 'var(--font-heading)', textDecoration: 'none' }}
                  >
                    {patients.cta.primaryButton}
                  </Link>
                  <a
                    href="#faq"
                    className="px-8 py-3 rounded-xl text-sm font-semibold transition-all duration-200 hover:opacity-80"
                    style={{ background: 'transparent', color: `hsl(var(--foreground))`, border: `1px solid hsl(var(--border-subtle) / 0.5)`, fontFamily: 'var(--font-heading)', textDecoration: 'none' }}
                  >
                    {patients.cta.secondaryButton}
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.section>

      </main>
    </>
  );
}
