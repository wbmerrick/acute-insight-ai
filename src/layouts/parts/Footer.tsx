import { Link } from 'react-router';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      style={{
        background: `hsl(var(--surface-deeper))`,
        borderTop: `1px solid hsl(var(--border-subtle) / 0.6)`,
        fontFamily: 'var(--font-sans)',
      }}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <polygon points="16,2 30,26 2,26" fill="none" stroke="hsl(var(--cyan-glow))" strokeWidth="2" strokeLinejoin="round"/>
                <line x1="16" y1="10" x2="16" y2="20" stroke="hsl(var(--cyan-glow))" strokeWidth="1.5"/>
                <circle cx="16" cy="22" r="1.5" fill="hsl(var(--cyan-glow))"/>
              </svg>
              <span className="text-lg font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
                Acute Insight<span className="text-primary">.ai</span>
              </span>
            </Link>
            <p className="text-sm leading-relaxed mb-6 text-muted-foreground">
              AI-powered patient intake that thinks ahead — reducing friction, improving care.
            </p>
            {/* Trust badge */}
            <div
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-primary"
              style={{
                background: `hsl(var(--primary) / 0.08)`,
                border: `1px solid hsl(var(--primary) / 0.2)`,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              Physician-Founded · Clinical Beta
            </div>
          </div>

          {/* Platform */}
          <div>
            <h4
              className="text-xs font-semibold mb-4 uppercase tracking-widest text-primary"
            >
              Platform
            </h4>
            <ul className="flex flex-col gap-3">
              {[
                { label: 'For Patients', to: '/patients' },
                { label: 'For Providers', to: '/providers' },
                { label: 'AI Intake', to: '/#how-it-works' },
                { label: 'How It Works', to: '/#how-it-works' },
              ].map((item) => (
                <li key={item.label}>
                  <Link
                    to={item.to}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors duration-200"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-xs font-semibold mb-4 uppercase tracking-widest text-primary">
              Company
            </h4>
            <ul className="flex flex-col gap-3">
              {[
                { label: 'About', to: '/about' },
                { label: 'Blog', to: '/#' },
                { label: 'Careers', to: '/#' },
                { label: 'Contact', to: '/#' },
              ].map((item) => (
                <li key={item.label}>
                  <Link
                    to={item.to}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors duration-200"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-xs font-semibold mb-4 uppercase tracking-widest text-primary">
              Legal
            </h4>
            <ul className="flex flex-col gap-3">
              {['Privacy Policy', 'Terms of Use', 'Security'].map((item) => (
                <li key={item}>
                  <Link
                    to="/#"
                    className="text-sm text-muted-foreground hover:text-primary transition-colors duration-200"
                  >
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8"
          style={{ borderTop: `1px solid hsl(var(--border-subtle) / 0.5)` }}
        >
          <p className="text-xs" style={{ color: `hsl(var(--text-dimmer))` }}>
            © {currentYear} Acute Insight AI. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            {['Encrypted in transit', 'Never sold or shared'].map((badge) => (
              <span key={badge} className="text-xs" style={{ color: `hsl(var(--text-dimmer))` }}>
                {badge}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
