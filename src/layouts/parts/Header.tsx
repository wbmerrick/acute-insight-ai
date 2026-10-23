import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router';
import { Menu, X } from 'lucide-react';

/** The mark: a monitor tile with a lead-II complex running through it. */
export function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect
        x="1.5"
        y="1.5"
        width="29"
        height="29"
        rx="7"
        stroke="hsl(var(--primary))"
        strokeWidth="2"
      />
      <path
        d="M4 19 H10 L12.5 13.5 L16 24 L19.5 8 L22 19 H28"
        stroke="hsl(var(--primary))"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="trace-glow"
      />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span
      className="text-lg md:text-xl font-bold text-foreground"
      style={{ fontFamily: 'var(--font-heading)', fontStretch: '110%', letterSpacing: '-0.01em' }}
    >
      Acute Insight<span className="text-primary">.ai</span>
    </span>
  );
}

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = [
    { label: 'For patients', href: '/patients' },
    { label: 'For providers', href: '/providers' },
    { label: 'How it works', href: '/how-it-works' },
    { label: 'About', href: '/about' },
  ];

  const isActive = (href: string) => location.pathname === href;

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        background: scrolled
          ? `hsl(var(--surface-header) / 0.95)`
          : `hsl(var(--surface-header) / 0.65)`,
        backdropFilter: 'blur(14px)',
        borderBottom: scrolled
          ? `1px solid hsl(var(--border-subtle) / 0.8)`
          : '1px solid transparent',
      }}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-[72px]">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <LogoMark />
            <Wordmark />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-7" aria-label="Main navigation">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="relative text-sm font-medium transition-colors duration-200 hover:text-foreground py-1"
                style={{
                  color: isActive(link.href)
                    ? 'hsl(var(--foreground))'
                    : 'hsl(var(--text-dim))',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                {link.label}
                {isActive(link.href) && (
                  <span
                    className="absolute left-0 right-0 -bottom-0.5 h-0.5 rounded-full"
                    style={{ background: 'hsl(var(--primary))', boxShadow: '0 0 8px hsl(var(--primary) / 0.7)' }}
                  />
                )}
              </Link>
            ))}
          </nav>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm font-medium px-4 py-2 rounded-lg transition-all duration-200 hover:text-foreground hover:border-foreground/30"
              style={{
                color: 'hsl(var(--foreground) / 0.85)',
                border: `1px solid hsl(var(--border-subtle))`,
                fontFamily: 'var(--font-sans)',
              }}
            >
              Sign in
            </Link>
            <Link
              to="/intake"
              className="text-sm font-semibold px-5 py-2 rounded-lg transition-all duration-200 bg-primary hover:brightness-110"
              style={{
                color: 'hsl(var(--primary-foreground))',
                fontFamily: 'var(--font-sans)',
                boxShadow: '0 0 18px hsl(var(--primary) / 0.35)',
              }}
            >
              Start your intake
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden p-2 rounded-lg text-foreground"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          className="md:hidden px-6 pb-6 pt-2"
          style={{
            background: `hsl(var(--surface-header) / 0.98)`,
            borderTop: `1px solid hsl(var(--border-subtle) / 0.6)`,
          }}
        >
          <nav className="flex flex-col gap-4" aria-label="Mobile navigation">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="text-sm font-medium py-2 hover:text-primary transition-colors"
                style={{ color: isActive(link.href) ? 'hsl(var(--primary))' : 'hsl(var(--foreground) / 0.85)' }}
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div
              className="flex flex-col gap-3 pt-2 border-t"
              style={{ borderColor: `hsl(var(--border-subtle) / 0.6)` }}
            >
              <Link
                to="/login"
                className="text-sm font-medium py-2.5 text-center rounded-lg border border-border text-foreground"
                onClick={() => setMobileOpen(false)}
              >
                Sign in
              </Link>
              <Link
                to="/intake"
                className="text-sm font-semibold py-2.5 text-center rounded-lg bg-primary"
                style={{ color: 'hsl(var(--primary-foreground))' }}
                onClick={() => setMobileOpen(false)}
              >
                Start your intake
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
