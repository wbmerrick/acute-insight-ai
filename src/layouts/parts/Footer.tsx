import { Link } from 'react-router';
import { LogoMark, Wordmark } from './Header';

const columns: { heading: string; links: { label: string; to: string }[] }[] = [
  {
    heading: 'Platform',
    links: [
      { label: 'For patients', to: '/patients' },
      { label: 'For providers', to: '/providers' },
      { label: 'Start an intake', to: '/intake' },
      { label: 'Patient portal', to: '/portal' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About', to: '/about' },
      { label: 'How it works', to: '/how-it-works' },
      { label: 'Request early access', to: '/providers#early-access' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Privacy policy', to: '/privacy' },
      { label: 'Terms of use', to: '/terms' },
      { label: 'Security', to: '/security' },
    ],
  },
];

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer style={{ background: `hsl(var(--surface-deeper))` }}>
      {/* Trace divider: flatline that carries one complex, then settles */}
      <div aria-hidden="true" className="overflow-hidden">
        <svg
          viewBox="0 0 1440 40"
          preserveAspectRatio="none"
          className="w-full h-10 block"
        >
          <path
            d="M0 20 H600 L615 20 L622 6 L630 34 L638 12 L645 20 H1440"
            fill="none"
            stroke="hsl(var(--primary) / 0.5)"
            strokeWidth="1.5"
          />
        </svg>
      </div>

      <div className="max-w-content mx-auto px-6 pb-10 pt-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10 md:gap-8 mb-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link to="/" className="inline-flex items-center gap-2.5 mb-4">
              <LogoMark size={26} />
              <Wordmark />
            </Link>
            <p
              className="text-sm leading-relaxed max-w-xs"
              style={{ color: 'hsl(var(--text-dim))' }}
            >
              AI-guided intake that lets patients tell their story once — and
              lets their clinician walk in already briefed.
            </p>
            <p
              className="mt-5 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{
                color: 'hsl(var(--primary))',
                background: `hsl(var(--primary) / 0.08)`,
                border: `1px solid hsl(var(--primary) / 0.22)`,
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full bg-primary"
                style={{ boxShadow: '0 0 6px hsl(var(--primary) / 0.9)' }}
              />
              Physician-founded · Clinical beta
            </p>
          </div>

          {/* Link columns */}
          {columns.map((col) => (
            <div key={col.heading}>
              <h4
                className="text-sm font-semibold mb-4 text-foreground"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {col.heading}
              </h4>
              <ul className="flex flex-col gap-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      className="text-sm transition-colors duration-200 hover:text-primary"
                      style={{ color: 'hsl(var(--text-dim))' }}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div
          className="flex flex-col md:flex-row items-center justify-between gap-4 pt-7"
          style={{ borderTop: `1px solid hsl(var(--border-subtle) / 0.5)` }}
        >
          <p className="text-xs" style={{ color: `hsl(var(--text-dimmer))` }}>
            © {currentYear} Acute Insight AI. All rights reserved.
          </p>
          <p className="text-xs text-center md:text-right" style={{ color: `hsl(var(--text-dimmer))` }}>
            Not for emergencies — if this is urgent, call 911. Your data is
            encrypted in transit and never sold or shared.
          </p>
        </div>
      </div>
    </footer>
  );
}
