import LegalPage from '@/components/LegalPage';
import { Link } from 'react-router';

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of use"
      description="The plain-language terms for using Acute Insight AI during its clinical beta."
      updated="October 23, 2026"
    >
      <h2>What this service is — and isn't</h2>
      <p>
        Acute Insight AI is a pre-visit intake tool. It gathers and organizes
        the history you report so your own clinician can review it before your
        visit. It does <strong>not</strong> provide medical advice, diagnosis,
        or treatment, and nothing it generates is a medical opinion. All
        clinical decisions are made by your clinician.
      </p>

      <h2>Not for emergencies</h2>
      <p>
        If you think you may be having a medical emergency, call 911 or go to
        the nearest emergency department now. The intake screens for
        emergency-level symptoms and will tell you the same thing — but do not
        wait for it. If you are having thoughts of harming yourself, call or
        text the 988 Suicide &amp; Crisis Lifeline.
      </p>

      <h2>Using the service</h2>
      <ul>
        <li>You must be 18 or older to create an account.</li>
        <li>Answer honestly — your clinician relies on what you report.</li>
        <li>Keep your sign-in credentials to yourself; you are responsible for activity on your account.</li>
        <li>
          Don't misuse the service: no attempting to access other people's
          information, probing or disrupting the system, or using it for
          anything unlawful.
        </li>
      </ul>

      <h2>AI-assisted intake</h2>
      <p>
        Parts of the intake conversation and the provider brief are generated
        by artificial intelligence. AI can make mistakes. Your clinician
        reviews the brief, and you should correct anything at your visit that
        doesn't match what you meant. How your information is handled is
        described in the <Link to="/privacy">privacy policy</Link>.
      </p>

      <h2>Clinical beta</h2>
      <p>
        The service is in active development. Features may change, and
        availability is not guaranteed. We work hard to keep your data safe
        and the service reliable, but during the beta the service is provided
        "as is," without warranties of any kind.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the fullest extent the law allows, Acute Insight AI and its
        operators are not liable for indirect, incidental, or consequential
        damages arising from use of the service. Nothing in these terms limits
        liability where the law does not allow it to be limited.
      </p>

      <h2>Your content</h2>
      <p>
        Your health information remains yours. You give us only the limited
        rights needed to operate the service as described in the privacy
        policy — nothing more.
      </p>

      <h2>Governing law</h2>
      <p>
        These terms are governed by the laws of the State of Tennessee,
        without regard to conflict-of-law rules.
      </p>

      <h2>Changes and contact</h2>
      <p>
        We may update these terms as the service evolves; material changes
        will be noted on this page. Questions? Reach us through the{' '}
        <Link to="/providers#early-access">contact form</Link>.
      </p>
    </LegalPage>
  );
}
