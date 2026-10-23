import LegalPage from '@/components/LegalPage';

export default function SecurityPage() {
  return (
    <LegalPage
      title="Security"
      description="How Acute Insight AI protects patient data today, and what we're completing before general availability."
      updated="October 23, 2026"
    >
      <h2>Our position</h2>
      <p>
        This platform was founded by a practicing hospitalist who works with
        protected health information every day. We would rather tell you
        exactly where we stand than stamp a badge on the footer. Here is where
        we stand.
      </p>

      <h2>In place today</h2>
      <ul>
        <li><strong>Encryption in transit</strong> — TLS on every connection.</li>
        <li><strong>Encryption at rest</strong> — the database is encrypted at rest by our managed infrastructure provider.</li>
        <li>
          <strong>Role-based access</strong> — patients see their own records;
          providers see the intakes submitted to their queue; administration
          is separated. Authorization is enforced server-side on every request.
        </li>
        <li>
          <strong>Locked-down database</strong> — row-level security is
          enabled on every table, and the database is reachable only through
          the application. There is no public data API.
        </li>
        <li>
          <strong>Hardened error handling</strong> — internal details are
          never returned to browsers.
        </li>
        <li>
          <strong>Deterministic safety screening</strong> — emergency-symptom
          detection runs on every intake message in plain code, independent of
          the AI.
        </li>
        <li>
          <strong>No selling, no sharing</strong> — patient data is never
          sold, shared with advertisers, or used for marketing.
        </li>
      </ul>

      <h2>Before general availability</h2>
      <p>
        We are in clinical beta, and we gate real patient use behind the rest
        of the HIPAA technical-safeguard checklist:
      </p>
      <ul>
        <li>Business associate agreements across our hosting and AI infrastructure.</li>
        <li>Audit logging of access to patient records.</li>
        <li>Email verification, password reset, and account-recovery flows.</li>
        <li>Rate limiting and additional abuse controls.</li>
        <li>Independent review of this posture.</li>
      </ul>
      <p>
        Until that checklist is complete, the platform is used for
        demonstration and pilot evaluation — not as a system of record.
      </p>

      <h2>Found something?</h2>
      <p>
        If you believe you've found a vulnerability, we want to hear about it
        and will respond in good faith. Report it through the contact form on
        the providers page, and give us a reasonable window to fix it before
        public disclosure. We won't pursue good-faith research conducted
        within these bounds.
      </p>
    </LegalPage>
  );
}
