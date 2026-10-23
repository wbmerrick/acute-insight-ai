import { type ReactNode } from 'react';
import { Helmet } from '@dr.pogodin/react-helmet';

/**
 * Shared shell for policy pages. Honest by design: every page carries its
 * last-updated date and, during the clinical beta, a plain-language notice
 * that counsel review precedes general availability.
 */
export default function LegalPage({
  title,
  description,
  updated,
  draft = true,
  children,
}: {
  title: string;
  description: string;
  updated: string;
  draft?: boolean;
  children: ReactNode;
}) {
  return (
    <>
      <Helmet>
        <title>{title} — Acute Insight AI</title>
        <meta name="description" content={description} />
      </Helmet>

      <div className="pt-32 md:pt-40 pb-24">
        <div className="max-w-3xl mx-auto px-6">
          <h1 className="display text-foreground mb-3" style={{ fontSize: 'clamp(2.2rem, 4vw, 3.2rem)' }}>
            {title}
          </h1>
          <p className="vitals text-xs mb-10" style={{ color: 'hsl(var(--text-dimmer))' }}>
            last updated {updated}
          </p>

          {draft && (
            <p
              className="rounded-xl px-5 py-4 mb-10 text-sm leading-relaxed"
              style={{
                background: 'hsl(var(--accent) / 0.07)',
                border: '1px solid hsl(var(--accent) / 0.3)',
                color: 'hsl(var(--text-dim))',
              }}
            >
              Acute Insight AI is in clinical beta. This document describes our
              current practices in plain language; it will be reviewed by
              counsel and may be updated before general availability. If
              anything here is unclear, ask us before using the service.
            </p>
          )}

          <div className="rich-text">{children}</div>
        </div>
      </div>
    </>
  );
}
