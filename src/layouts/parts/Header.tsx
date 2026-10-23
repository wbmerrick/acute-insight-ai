import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router';
import { Menu, X } from 'lucide-react';

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
    { label: 'For Patients', href: '/patients' },
    { label: 'For Providers', href: '/providers' },
    { label: 'How It Works', href: '/how-it-works' },
    { label: 'About', href: '/about' },
  ];

  const isActive = (href: string) => location.pathname === href;

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        background: scrolled
          ? `hsl(var(--surface-header) / 0.97)`
          : `hsl(var(--surface-header) / 0.7)`,
        backdropFilter: 'blur(12px)',
        borderBottom: scrolled
          ? `1px solid hsl(var(--border-subtle) / 0.8)`
          : '1px solid transparent',
      }}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <polygon points="16,2 30,26 2,26" fill="none" stroke="hsl(var(--cyan-glow))" strokeWidth="2" strokeLinejoin="round"/>
              <line x1="16" y1="10" x2="16" y2="20" stroke="hsl(var(--cyan-glow))" strokeWidth="1.5"/>
              <circle cx="16" cy="22" r="1.5" fill="hsl(var(--cyan-glow))"/>
            </svg>
            <span
              className="text-xl font-bold tracking-tight text-foreground"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Acute Insight
              <span className="text-primary">.ai</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8" aria-label="Main navigation">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="text-sm font-medium transition-colors duration-200 hover:text-primary"
                style={{
                  color: isActive(link.href)
                    ? 'hsl(var(--primary))'
                    : 'hsl(var(--text-dim))',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/sign-in"
              className="text-sm font-medium px-4 py-2 rounded-lg transition-all duration-200 hover:text-primary hover:border-primary"
              style={{
                color: 'hsl(var(--foreground) / 0.8)',
                border: `1px solid hsl(var(--border-subtle))`,
                fontFamily: 'var(--font-sans)',
              }}
            >
              Sign In
            </Link>
            <Link
              to="/intake"
              className="text-sm font-semibold px-5 py-2 rounded-lg transition-all duration-200 bg-primary hover:brightness-110"
              style={{
                color: 'hsl(var(--background))',
                fontFamily: 'var(--font-sans)',
              }}
            >
              Get Started
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
                style={{ color: isActive(link.href) ? 'hsl(var(--primary))' : 'hsl(var(--foreground) / 0.8)' }}
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
                to="/sign-in"
                className="text-sm font-medium py-2 text-center rounded-lg border border-border text-foreground"
                onClick={() => setMobileOpen(false)}
              >
                Sign In
              </Link>
              <Link
                to="/intake"
                className="text-sm font-semibold py-2 text-center rounded-lg bg-primary"
                style={{ color: 'hsl(var(--background))' }}
                onClick={() => setMobileOpen(false)}
              >
                Get Started
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
