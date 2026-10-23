import LegalPage from '@/components/LegalPage';
import { Link } from 'react-router';

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      description="What Acute Insight AI collects, how it's used to prepare your pre-visit brief, and the choices you have."
      updated="October 23, 2026"
    >
      <h2>The short version</h2>
      <p>
        You tell us your story so your own clinician can walk into your visit
        prepared. That is the only reason this service collects health
        information. We never sell it, never share it with advertisers, and
        never use it for marketing. Access is limited by role: your intake is
        visible to you and to the care team reviewing it.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Account information</strong> — your name, email address, and
          password (stored as a cryptographic hash, never readable by us).
        </li>
        <li>
          <strong>Health information you choose to enter</strong> — your
          intake responses: symptoms, history, medications, allergies, and the
          optional health profile you keep in your portal.
        </li>
        <li>
          <strong>Basic technical records</strong> — logs needed to run and
          secure the service, such as sign-in timestamps and error reports.
          We keep these lean and do not build advertising profiles.
        </li>
      </ul>

      <h2>How your information is used</h2>
      <ul>
        <li>To guide your intake conversation and organize your responses into a structured brief for your provider.</li>
        <li>To flag information that may need your provider's attention (for example, high severity ratings).</li>
        <li>To operate, secure, and improve the service itself.</li>
      </ul>
      <p>
        When AI-assisted intake is enabled, the text you type during an intake
        is processed by our AI service provider (Anthropic) to generate the
        next question and the provider brief. That processing is governed by
        commercial terms that prohibit using your data to train their models.
        Diagnosis and treatment are never made by the AI — those decisions
        stay with your clinician.
      </p>

      <h2>What we never do</h2>
      <ul>
        <li>Sell your information, to anyone, for any reason.</li>
        <li>Share your health information with advertisers or data brokers.</li>
        <li>Use your health information for marketing.</li>
      </ul>

      <h2>Security</h2>
      <p>
        Your data is encrypted in transit (TLS) and encrypted at rest by our
        database infrastructure. Access inside the product is role-based, and
        our database is configured so it is reachable only through the
        application — not through any public data API. The full picture,
        including what we are still building before general availability, is
        on our <Link to="/security">Security</Link> page.
      </p>

      <h2>Retention and your choices</h2>
      <ul>
        <li>You can view your intake history in your portal at any time.</li>
        <li>
          You can request an export or deletion of your account and data, and
          we will honor it. During the beta, send the request through the{' '}
          <Link to="/providers#early-access">contact form</Link> or tell your
          participating provider.
        </li>
      </ul>

      <h2>Cookies</h2>
      <p>
        We use a session cookie to keep you signed in and basic analytics to
        understand site usage. We do not use advertising cookies. You can
        decline non-essential cookies in the consent banner.
      </p>

      <h2>Who this service is for</h2>
      <p>
        Acute Insight AI is for adults 18 and older. A parent or guardian may
        complete an intake on behalf of a minor patient where their provider
        has arranged it.
      </p>

      <h2>Changes</h2>
      <p>
        If this policy changes in a way that matters, we will say so plainly
        on this page and update the date above.
      </p>
    </LegalPage>
  );
}
