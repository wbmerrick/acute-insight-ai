import { Link } from 'react-router';
import LegalPage from '@/components/LegalPage';

export default function AccessibilityPage() {
  return (
    <LegalPage
      title="Accessibility"
      description="Where Acute Insight AI stands on accessibility, what we test, and how to tell us when something is in your way."
      updated="October 28, 2026"
    >
      <h2>Our commitment</h2>
      <p>
        Healthcare that is hard to use is healthcare that gets skipped. We aim to meet
        WCAG 2.1 Level AA across the site and the patient and clinician tools, and we
        test for it rather than assume it.
      </p>

      <h2>What we do today</h2>
      <ul>
        <li><strong>Automated checks</strong> — every page is scanned against WCAG 2.1 A and AA rules before release. As of October 28, 2026 there are zero reported violations across all fourteen pages.</li>
        <li><strong>Talk or type</strong> — the intake works by voice or by keyboard; neither is required.</li>
        <li><strong>Keyboard access</strong> — every control is reachable and operable without a mouse, with visible focus.</li>
        <li><strong>Contrast</strong> — text meets the 4.5:1 minimum against its background, including the dim labels.</li>
        <li><strong>Reduced motion</strong> — animations respect your system's reduce-motion setting.</li>
        <li><strong>Plain language</strong> — the patient-facing next step is written to be read once, under stress.</li>
      </ul>

      <h2>Known gaps</h2>
      <ul>
        <li>Automated scans catch roughly a third of real accessibility problems. We have not yet completed a manual audit with screen-reader users.</li>
        <li>The conversation with Ace is in English today. Emergency wording is provided in Spanish; the rest is not yet.</li>
        <li>Voice input depends on your browser's speech recognition and varies by device.</li>
      </ul>

      <h2>Tell us</h2>
      <p>
        If something on this site is in your way, use the{' '}
        <Link to="/providers#early-access">contact form</Link> and tell us the page and
        what happened. A real person reads it. If it blocks you from getting care,
        call your clinician directly — and if it is an emergency, call 911.
      </p>
    </LegalPage>
  );
}
