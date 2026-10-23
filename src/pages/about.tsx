import { Helmet } from '@dr.pogodin/react-helmet';
import { motion } from 'motion/react';
import { Link } from 'react-router';
import { about } from 'virtual:content';

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

export default function AboutPage() {
  const siteUrl = 'https://acuteinsightai.com';
  const url = `${siteUrl}/about`;
  const title = 'About — Acute Insight AI';
  const description = 'Learn about our mission, how the AI intake works, our privacy approach, and the physician behind Acute Insight AI.';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
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
        <section className="relative overflow-hidden pt-24 pb-16">
          <div className="absolute inset-0 z-0">
            <img
              src="/airo-assets/images/pages/about/hero"
              alt="Doctor conducting a telehealth video consultation"
              className="w-full h-full object-cover"
              width={1200}
              height={600}
              loading="eager"
              fetchPriority="high"
            />
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: `linear-gradient(135deg, hsl(var(--background) / 0.95) 40%, hsl(var(--background) / 0.75) 100%)` }}
            />
          </div>
          <div className="relative z-10 max-w-content mx-auto px-6">
            <motion.div initial="hidden" animate="visible" variants={stagger} className="max-w-2xl">
              <motion.p
                variants={fadeUp}
                className="text-xs font-semibold tracking-widest uppercase mb-3"
                style={{ color: `hsl(var(--primary))`, fontFamily: 'var(--font-sans)' }}
              >
                {about.hero.eyebrow}
              </motion.p>
              <motion.h1
                variants={fadeUp}
                className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6"
                style={{ color: `hsl(var(--foreground))`, fontFamily: 'var(--font-heading)' }}
              >
                {about.hero.heading}
              </motion.h1>
              <motion.p
                variants={fadeUp}
                className="text-lg leading-relaxed"
                style={{ color: `hsl(var(--muted-foreground))`, fontFamily: 'var(--font-sans)' }}
              >
                {about.hero.subheading}
              </motion.p>
            </motion.div>
          </div>
        </section>

        {/* ── Mission ──────────────────────────────────────────────────────── */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
          className="py-xxl"
        >
          <div className="max-w-content mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
              <div>
                <motion.h2
                  variants={fadeUp}
                  className="text-3xl md:text-4xl font-bold mb-6"
                  style={{ color: `hsl(var(--foreground))`, fontFamily: 'var(--font-heading)' }}
                >
                  {about.mission.heading}
                </motion.h2>
                <div className="flex flex-col gap-4">
                  {about.mission.body.map((p) => (
                    <motion.p
                      key={p.id}
                      variants={fadeUp}
                      className="text-base leading-relaxed"
                      style={{ color: `hsl(var(--muted-foreground))`, fontFamily: 'var(--font-sans)' }}
                    >
                      {p.text}
                    </motion.p>
                  ))}
                </div>
              </div>
              <motion.div variants={fadeUp} className="grid grid-cols-1 gap-4">
                <div
                  className="rounded-2xl p-6 flex items-center gap-6"
                  style={{ background: `hsl(var(--card))`, border: `1px solid hsl(var(--border-subtle) / 0.3)` }}
                >
                  <span className="text-4xl font-bold shrink-0" style={{ color: `hsl(var(--primary))`, fontFamily: 'var(--font-heading)' }}>
                    {about.mission.stat1Value}
                  </span>
                  <span className="text-sm" style={{ color: `hsl(var(--muted-foreground))`, fontFamily: 'var(--font-sans)' }}>
                    {about.mission.stat1Label}
                  </span>
                </div>
                <div
                  className="rounded-2xl p-6 flex items-center gap-6"
                  style={{ background: `hsl(var(--card))`, border: `1px solid hsl(var(--border-subtle) / 0.3)` }}
                >
                  <span className="text-4xl font-bold shrink-0" style={{ color: `hsl(var(--primary))`, fontFamily: 'var(--font-heading)' }}>
                    {about.mission.stat2Value}
                  </span>
                  <span className="text-sm" style={{ color: `hsl(var(--muted-foreground))`, fontFamily: 'var(--font-sans)' }}>
                    {about.mission.stat2Label}
                  </span>
                </div>
                <div
                  className="rounded-2xl p-6 flex items-center gap-6"
                  style={{ background: `hsl(var(--card))`, border: `1px solid hsl(var(--border-subtle) / 0.3)` }}
                >
                  <span className="text-4xl font-bold shrink-0" style={{ color: `hsl(var(--primary))`, fontFamily: 'var(--font-heading)' }}>
                    {about.mission.stat3Value}
                  </span>
                  <span className="text-sm" style={{ color: `hsl(var(--muted-foreground))`, fontFamily: 'var(--font-sans)' }}>
                    {about.mission.stat3Label}
                  </span>
                </div>
              </motion.div>
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
          style={{ background: `hsl(var(--card) / 0.4)` }}
        >
          <div className="max-w-content mx-auto px-6">
            <div className="text-center mb-14">
              <motion.p
                variants={fadeUp}
                className="text-xs font-semibold tracking-widest uppercase mb-3"
                style={{ color: `hsl(var(--primary))`, fontFamily: 'var(--font-sans)' }}
              >
                {about.howItWorks.eyebrow}
              </motion.p>
              <motion.h2
                variants={fadeUp}
                className="text-3xl md:text-4xl font-bold"
                style={{ color: `hsl(var(--foreground))`, fontFamily: 'var(--font-heading)' }}
              >
                {about.howItWorks.heading}
              </motion.h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {about.howItWorks.steps.map((step, idx) => (
                <motion.div
                  key={step.id}
                  variants={fadeUp}
                  className="relative rounded-2xl p-8"
                  style={{ background: `hsl(var(--background))`, border: `1px solid hsl(var(--border-subtle) / 0.3)` }}
                >
                  {idx < about.howItWorks.steps.length - 1 && (
                    <div
                      className="hidden md:block absolute top-12 left-full w-8 h-px z-10"
                      style={{ background: `hsl(var(--primary) / 0.3)` }}
                    />
                  )}
                  <span
                    className="block text-5xl font-bold mb-4 leading-none"
                    style={{ color: `hsl(var(--primary) / 0.2)`, fontFamily: 'var(--font-heading)' }}
                  >
                    {step.number}
                  </span>
                  <h3
                    className="text-lg font-bold mb-3"
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

        {/* ── AI Technology ────────────────────────────────────────────────── */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
          className="py-xxl"
        >
          <div className="max-w-content mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
              {/* Capabilities grid */}
              <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-2 gap-4 order-2 lg:order-1">
                {about.ai.capabilities.map((cap) => (
                  <div
                    key={cap.id}
                    className="rounded-2xl p-5"
                    style={{ background: `hsl(var(--primary) / 0.06)`, border: `1px solid hsl(var(--primary) / 0.2)` }}
                  >
                    <p
                      className="text-sm font-semibold mb-1"
                      style={{ color: `hsl(var(--primary))`, fontFamily: 'var(--font-heading)' }}
                    >
                      {cap.label}
                    </p>
                    <p
                      className="text-xs leading-relaxed"
                      style={{ color: `hsl(var(--muted-foreground))`, fontFamily: 'var(--font-sans)' }}
                    >
                      {cap.detail}
                    </p>
                  </div>
                ))}
              </motion.div>
              {/* Copy */}
              <div className="order-1 lg:order-2">
                <motion.p
                  variants={fadeUp}
                  className="text-xs font-semibold tracking-widest uppercase mb-3"
                  style={{ color: `hsl(var(--primary))`, fontFamily: 'var(--font-sans)' }}
                >
                  {about.ai.eyebrow}
                </motion.p>
                <motion.h2
                  variants={fadeUp}
                  className="text-3xl md:text-4xl font-bold mb-6"
                  style={{ color: `hsl(var(--foreground))`, fontFamily: 'var(--font-heading)' }}
                >
                  {about.ai.heading}
                </motion.h2>
                <div className="flex flex-col gap-4">
                  {about.ai.body.map((p) => (
                    <motion.p
                      key={p.id}
                      variants={fadeUp}
                      className="text-base leading-relaxed"
                      style={{ color: `hsl(var(--muted-foreground))`, fontFamily: 'var(--font-sans)' }}
                    >
                      {p.text}
                    </motion.p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* ── HIPAA / Compliance ───────────────────────────────────────────── */}
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
                <motion.p
                  variants={fadeUp}
                  className="text-xs font-semibold tracking-widest uppercase mb-3"
                  style={{ color: `hsl(var(--primary))`, fontFamily: 'var(--font-sans)' }}
                >
                  {about.hipaa.eyebrow}
                </motion.p>
                <motion.h2
                  variants={fadeUp}
                  className="text-3xl md:text-4xl font-bold mb-4"
                  style={{ color: `hsl(var(--foreground))`, fontFamily: 'var(--font-heading)' }}
                >
                  {about.hipaa.heading}
                </motion.h2>
                <motion.p
                  variants={fadeUp}
                  className="text-base leading-relaxed"
                  style={{ color: `hsl(var(--muted-foreground))`, fontFamily: 'var(--font-sans)' }}
                >
                  {about.hipaa.body}
                </motion.p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {about.hipaa.badges.map((badge) => (
                  <motion.div
                    key={badge.id}
                    variants={fadeUp}
                    className="rounded-2xl p-5 flex flex-col gap-2"
                    style={{ background: `hsl(var(--background))`, border: `1px solid hsl(var(--primary) / 0.25)` }}
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                    <p
                      className="text-sm font-semibold"
                      style={{ color: `hsl(var(--foreground))`, fontFamily: 'var(--font-heading)' }}
                    >
                      {badge.label}
                    </p>
                    <p
                      className="text-xs leading-snug"
                      style={{ color: `hsl(var(--muted-foreground))`, fontFamily: 'var(--font-sans)' }}
                    >
                      {badge.detail}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.section>

        {/* ── Team ─────────────────────────────────────────────────────────── */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
          className="py-xxl"
        >
          <div className="max-w-content mx-auto px-6">
            <div className="text-center mb-14">
              <motion.p
                variants={fadeUp}
                className="text-xs font-semibold tracking-widest uppercase mb-3"
                style={{ color: `hsl(var(--primary))`, fontFamily: 'var(--font-sans)' }}
              >
                {about.team.eyebrow}
              </motion.p>
              <motion.h2
                variants={fadeUp}
                className="text-3xl md:text-4xl font-bold mb-4"
                style={{ color: `hsl(var(--foreground))`, fontFamily: 'var(--font-heading)' }}
              >
                {about.team.heading}
              </motion.h2>
              <motion.p
                variants={fadeUp}
                className="text-base max-w-xl mx-auto"
                style={{ color: `hsl(var(--muted-foreground))`, fontFamily: 'var(--font-sans)' }}
              >
                {about.team.subheading}
              </motion.p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {about.team.members.map((member) => (
                <motion.div
                  key={member.id}
                  variants={fadeUp}
                  className="rounded-2xl p-8"
                  style={{ background: `hsl(var(--card))`, border: `1px solid hsl(var(--border-subtle) / 0.3)` }}
                >
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center mb-5 text-xl font-bold"
                    style={{ background: `hsl(var(--primary) / 0.12)`, color: `hsl(var(--primary))`, fontFamily: 'var(--font-heading)' }}
                  >
                    {member.name.charAt(0)}
                  </div>
                  <p
                    className="text-base font-bold mb-0.5"
                    style={{ color: `hsl(var(--foreground))`, fontFamily: 'var(--font-heading)' }}
                  >
                    {member.name}
                  </p>
                  <p
                    className="text-xs font-semibold mb-4"
                    style={{ color: `hsl(var(--primary))`, fontFamily: 'var(--font-sans)' }}
                  >
                    {member.role}
                  </p>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: `hsl(var(--muted-foreground))`, fontFamily: 'var(--font-sans)' }}
                  >
                    {member.bio}
                  </p>
                </motion.div>
              ))}
            </div>
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
                <h2
                  className="text-3xl md:text-4xl font-bold mb-4"
                  style={{ color: `hsl(var(--foreground))`, fontFamily: 'var(--font-heading)' }}
                >
                  {about.cta.heading}
                </h2>
                <p
                  className="text-base mb-8 max-w-md mx-auto"
                  style={{ color: `hsl(var(--muted-foreground))`, fontFamily: 'var(--font-sans)' }}
                >
                  {about.cta.subheading}
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    to="/signup"
                    className="px-8 py-3 rounded-xl text-sm font-semibold transition-all duration-200 hover:opacity-90"
                    style={{ background: `hsl(var(--primary))`, color: `hsl(var(--background))`, fontFamily: 'var(--font-heading)', textDecoration: 'none' }}
                  >
                    {about.cta.primaryButton}
                  </Link>
                  <a
                    href="#how-it-works"
                    className="px-8 py-3 rounded-xl text-sm font-semibold transition-all duration-200 hover:opacity-80"
                    style={{ background: 'transparent', color: `hsl(var(--foreground))`, border: `1px solid hsl(var(--border-subtle) / 0.5)`, fontFamily: 'var(--font-heading)', textDecoration: 'none' }}
                  >
                    {about.cta.secondaryButton}
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
