import { Link } from 'react-router';
import { Helmet } from '@dr.pogodin/react-helmet';

export default function NotFoundPage() {
  return (
    <>
      <Helmet>
        <title>Page not found — Acute Insight AI</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="min-h-[70vh] flex items-center justify-center pt-24 pb-16 px-6">
        <div className="max-w-xl w-full text-center">
          {/* Flatline that never finds its rhythm */}
          <svg
            viewBox="0 0 480 80"
            className="w-full max-w-md mx-auto mb-8"
            aria-hidden="true"
          >
            <path
              d="M0 40 H150 L160 40 L166 22 L172 58 L178 34 L184 40 H240 L480 40"
              fill="none"
              stroke="hsl(var(--primary) / 0.65)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <text
              x="310"
              y="30"
              fill="hsl(var(--text-dimmer))"
              fontSize="13"
              fontFamily="var(--font-mono)"
            >
              no signal on this lead
            </text>
          </svg>

          <p className="vitals text-sm mb-3" style={{ color: 'hsl(var(--primary))' }}>
            404
          </p>
          <h1 className="display text-foreground mb-4" style={{ fontSize: 'clamp(1.9rem, 4vw, 2.8rem)' }}>
            This page isn't on the monitor.
          </h1>
          <p className="text-base leading-relaxed mb-8" style={{ color: 'hsl(var(--text-dim))' }}>
            The address may have changed, or it never existed. Everything that
            does exist is one click away.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/"
              className="inline-flex items-center justify-center px-6 py-3 rounded-xl text-sm font-semibold bg-primary transition-all duration-200 hover:brightness-110"
              style={{ color: 'hsl(var(--primary-foreground))', fontFamily: 'var(--font-heading)' }}
            >
              Back to the homepage
            </Link>
            <Link
              to="/intake"
              className="inline-flex items-center justify-center px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 hover:border-foreground/40"
              style={{ color: 'hsl(var(--foreground))', border: '1px solid hsl(var(--border-subtle))', fontFamily: 'var(--font-heading)' }}
            >
              Start an intake
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
