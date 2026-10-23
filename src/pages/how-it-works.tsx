import { Helmet } from '@dr.pogodin/react-helmet';
import { Link } from 'react-router';
import { motion } from 'motion/react';
import { how_it_works } from 'virtual:content';

// ─── Shared arrow icon ────────────────────────────────────────────────────────

function ArrowRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/>
      <polyline points="12 5 19 12 12 19"/>
    </svg>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HowItWorksPage() {
  return (
    <>
      <Helmet>
        <title>{how_it_works.meta.title}</title>
        <meta name="description" content={how_it_works.meta.description} />
        <link rel="canonical" href="https://acuteinsight.ai/how-it-works" />
        <meta property="og:title" content={how_it_works.meta.title} />
        <meta property="og:description" content={how_it_works.meta.description} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      <main>
        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section
          className="relative pt-32 pb-20 px-6 text-center overflow-hidden"
          style={{ background: `hsl(var(--background))` }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(ellipse 60% 40% at 50% 0%, hsl(var(--primary) / 0.08) 0%, transparent 70%)`,
            }}
          />
          <div className="relative max-w-3xl mx-auto">
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="text-xs font-semibold tracking-wide mb-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full"
              style={{
                color: `hsl(var(--primary))`,
                background: `hsl(var(--primary) / 0.08)`,
                border: `1px solid hsl(var(--primary) / 0.2)`,
                fontFamily: 'var(--font-sans)',
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: `hsl(var(--primary))` }} />
              <span>{how_it_works.hero.eyebrow}</span>
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.06 }}
              className="text-4xl md:text-5xl font-bold mb-5 leading-tight"
              style={{ color: `hsl(var(--foreground))`, fontFamily: 'var(--font-heading)' }}
            >
              {how_it_works.hero.heading}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.12 }}
              className="text-lg leading-relaxed max-w-2xl mx-auto"
              style={{ color: `hsl(var(--text-dim))`, fontFamily: 'var(--font-sans)' }}
            >
              {how_it_works.hero.subheading}
            </motion.p>
          </div>
        </section>

        {/* ── Patient workflow ──────────────────────────────────────────────── */}
        <section className="py-20 px-6" style={{ background: `hsl(var(--background))` }}>
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
              {/* Left: copy */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, ease: 'easeOut' as const }}
                className="lg:sticky lg:top-28"
              >
                <p
                  className="text-xs font-semibold tracking-wide mb-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full"
                  style={{
                    color: `hsl(var(--primary))`,
                    background: `hsl(var(--primary) / 0.08)`,
                    border: `1px solid hsl(var(--primary) / 0.2)`,
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  <span>{how_it_works.patientSection.eyebrow}</span>
                </p>
                <h2
                  className="text-3xl md:text-4xl font-bold mb-4 leading-tight"
                  style={{ color: `hsl(var(--foreground))`, fontFamily: 'var(--font-heading)' }}
                >
                  {how_it_works.patientSection.heading}
                </h2>
                <p
                  className="text-base leading-relaxed mb-8"
                  style={{ color: `hsl(var(--text-dim))`, fontFamily: 'var(--font-sans)' }}
                >
                  {how_it_works.patientSection.subheading}
                </p>
                <Link
                  to="/patients"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200 hover:brightness-110"
                  style={{
                    background: `hsl(var(--primary))`,
                    color: `hsl(var(--background))`,
                    fontFamily: 'var(--font-heading)',
                  }}
                >
                  <span>{how_it_works.patientSection.cta.label}</span>
                  <ArrowRight />
                </Link>
              </motion.div>

              {/* Right: step cards — inlined */}
              <div className="flex flex-col gap-4">
                {how_it_works.patientSection.steps.map((step, i) => (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.08, ease: 'easeOut' as const }}
                    className="rounded-3xl p-6 flex gap-5"
                    style={{
                      background: `hsl(var(--card))`,
                      border: `1px solid hsl(var(--border-subtle) / 0.35)`,
                    }}
                  >
                    <div
                      className="shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-bold"
                      style={{
                        background: `hsl(var(--primary) / 0.1)`,
                        color: `hsl(var(--primary))`,
                        border: `1px solid hsl(var(--primary) / 0.25)`,
                        fontFamily: 'var(--font-heading)',
                      }}
                    >
                      {step.number}
                    </div>
                    <div>
                      <h4
                        className="text-base font-bold mb-1.5"
                        style={{ color: `hsl(var(--foreground))`, fontFamily: 'var(--font-heading)' }}
                      >
                        {step.title}
                      </h4>
                      <p
                        className="text-sm leading-relaxed"
                        style={{ color: `hsl(var(--text-dim))`, fontFamily: 'var(--font-sans)' }}
                      >
                        {step.body}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Divider */}
        <div className="max-w-6xl mx-auto px-6">
          <div className="h-px w-full" style={{ background: `hsl(var(--border-subtle) / 0.25)` }} />
        </div>

        {/* ── Provider workflow ─────────────────────────────────────────────── */}
        <section className="py-20 px-6" style={{ background: `hsl(var(--background))` }}>
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
              {/* Left: step cards — inlined */}
              <div className="flex flex-col gap-4 order-2 lg:order-1">
                {how_it_works.providerSection.steps.map((step, i) => (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.08, ease: 'easeOut' as const }}
                    className="rounded-3xl p-6 flex gap-5"
                    style={{
                      background: `hsl(var(--card))`,
                      border: `1px solid hsl(var(--border-subtle) / 0.35)`,
                    }}
                  >
                    <div
                      className="shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-bold"
                      style={{
                        background: `hsl(var(--secondary) / 0.12)`,
                        color: `hsl(var(--secondary))`,
                        border: `1px solid hsl(var(--secondary) / 0.25)`,
                        fontFamily: 'var(--font-heading)',
                      }}
                    >
                      {step.number}
                    </div>
                    <div>
                      <h4
                        className="text-base font-bold mb-1.5"
                        style={{ color: `hsl(var(--foreground))`, fontFamily: 'var(--font-heading)' }}
                      >
                        {step.title}
                      </h4>
                      <p
                        className="text-sm leading-relaxed"
                        style={{ color: `hsl(var(--text-dim))`, fontFamily: 'var(--font-sans)' }}
                      >
                        {step.body}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Right: copy */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, ease: 'easeOut' as const }}
                className="lg:sticky lg:top-28 order-1 lg:order-2"
              >
                <p
                  className="text-xs font-semibold tracking-wide mb-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full"
                  style={{
                    color: `hsl(var(--secondary))`,
                    background: `hsl(var(--secondary) / 0.08)`,
                    border: `1px solid hsl(var(--secondary) / 0.2)`,
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                  </svg>
                  <span>{how_it_works.providerSection.eyebrow}</span>
                </p>
                <h2
                  className="text-3xl md:text-4xl font-bold mb-4 leading-tight"
                  style={{ color: `hsl(var(--foreground))`, fontFamily: 'var(--font-heading)' }}
                >
                  {how_it_works.providerSection.heading}
                </h2>
                <p
                  className="text-base leading-relaxed mb-8"
                  style={{ color: `hsl(var(--text-dim))`, fontFamily: 'var(--font-sans)' }}
                >
                  {how_it_works.providerSection.subheading}
                </p>
                <Link
                  to="/providers"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200 hover:brightness-110"
                  style={{
                    background: `hsl(var(--secondary))`,
                    color: `hsl(var(--secondary-foreground))`,
                    fontFamily: 'var(--font-heading)',
                  }}
                >
                  <span>{how_it_works.providerSection.cta.label}</span>
                  <ArrowRight />
                </Link>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ── Key features bento grid ───────────────────────────────────────── */}
        <section
          className="py-20 px-6"
          style={{ background: `hsl(var(--surface-dark) / 0.4)` }}
        >
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="text-center mb-12"
            >
              <p
                className="text-xs font-semibold tracking-wide mb-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full"
                style={{
                  color: `hsl(var(--primary))`,
                  background: `hsl(var(--primary) / 0.08)`,
                  border: `1px solid hsl(var(--primary) / 0.2)`,
                  fontFamily: 'var(--font-sans)',
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: `hsl(var(--primary))` }} />
                <span>{how_it_works.featuresSection.eyebrow}</span>
              </p>
              <h2
                className="text-3xl md:text-4xl font-bold"
                style={{ color: `hsl(var(--foreground))`, fontFamily: 'var(--font-heading)' }}
              >
                {how_it_works.featuresSection.heading}
              </h2>
            </motion.div>

            {/* Feature cards — inlined */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {how_it_works.featuresSection.features.map((feat, i) => (
                <motion.div
                  key={feat.id}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.07, ease: 'easeOut' as const }}
                  className="rounded-3xl p-6"
                  style={{
                    background: `hsl(var(--card))`,
                    border: `1px solid hsl(var(--border-subtle) / 0.35)`,
                  }}
                >
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center mb-4"
                    style={{
                      background: feat.icon === 'emergency' ? `hsl(var(--accent) / 0.1)` : `hsl(var(--primary) / 0.08)`,
                      border: `1px solid ${feat.icon === 'emergency' ? `hsl(var(--accent) / 0.25)` : `hsl(var(--primary) / 0.2)`}`,
                    }}
                  >
                    {feat.icon === 'ai' && (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/>
                        <circle cx="9" cy="14" r="1" fill="hsl(var(--primary))"/>
                        <circle cx="15" cy="14" r="1" fill="hsl(var(--primary))"/>
                      </svg>
                    )}
                    {feat.icon === 'emergency' && (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--accent))" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                      </svg>
                    )}
                    {feat.icon === 'hipaa' && (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                        <polyline points="9 12 11 14 15 10"/>
                      </svg>
                    )}
                    {feat.icon === 'modes' && (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                        <rect x="3" y="14" width="7" height="7" rx="1"/><path d="M17.5 14v7M14 17.5h7"/>
                      </svg>
                    )}
                    {feat.icon === 'flags' && (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
                        <line x1="4" y1="22" x2="4" y2="15"/>
                      </svg>
                    )}
                    {feat.icon === 'history' && (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="12 8 12 12 14 14"/>
                        <path d="M3.05 11a9 9 0 1 0 .5-4.5"/>
                        <polyline points="3 3 3 9 9 9"/>
                      </svg>
                    )}
                  </div>
                  <h4
                    className="text-base font-bold mb-2"
                    style={{ color: `hsl(var(--foreground))`, fontFamily: 'var(--font-heading)' }}
                  >
                    {feat.title}
                  </h4>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: `hsl(var(--text-dim))`, fontFamily: 'var(--font-sans)' }}
                  >
                    {feat.body}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Bottom CTA ────────────────────────────────────────────────────── */}
        <section
          className="py-24 px-6 text-center relative overflow-hidden"
          style={{ background: `hsl(var(--background))` }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(ellipse 50% 60% at 50% 100%, hsl(var(--primary) / 0.07) 0%, transparent 70%)`,
            }}
          />
          <div className="relative max-w-2xl mx-auto">
            <motion.h2
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="text-3xl md:text-4xl font-bold mb-4"
              style={{ color: `hsl(var(--foreground))`, fontFamily: 'var(--font-heading)' }}
            >
              {how_it_works.ctaSection.heading}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.06 }}
              className="text-base mb-8 leading-relaxed"
              style={{ color: `hsl(var(--text-dim))`, fontFamily: 'var(--font-sans)' }}
            >
              {how_it_works.ctaSection.subheading}
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.12 }}
              className="flex flex-col sm:flex-row gap-3 justify-center"
            >
              <Link
                to="/patients"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 hover:brightness-110"
                style={{
                  background: `hsl(var(--primary))`,
                  color: `hsl(var(--background))`,
                  fontFamily: 'var(--font-heading)',
                }}
              >
                <span>{how_it_works.ctaSection.patientCta.label}</span>
              </Link>
              <Link
                to="/providers"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 hover:opacity-80"
                style={{
                  background: `hsl(var(--card))`,
                  color: `hsl(var(--foreground))`,
                  border: `1px solid hsl(var(--border-subtle) / 0.5)`,
                  fontFamily: 'var(--font-heading)',
                }}
              >
                <span>{how_it_works.ctaSection.providerCta.label}</span>
              </Link>
            </motion.div>
          </div>
        </section>
      </main>
    </>
  );
}
