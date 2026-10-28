/**
 * Outbound SMS for dispatch — Twilio over plain REST (no SDK).
 *
 * Off until TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_FROM are set; then
 * every send is logged (never the body — bodies are kept PHI-free anyway: an
 * acuity level and a state, never a complaint or a name beyond the clinician's).
 */

export interface SmsSender {
  (to: string, body: string): Promise<boolean>;
}

export function smsAvailable(): boolean {
  return !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM);
}

/** Normalise a US number to E.164; returns null if it can't be. */
export function toE164(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (raw.trim().startsWith('+') && digits.length >= 11 && digits.length <= 15) return `+${digits}`;
  return null;
}

export const sendSms: SmsSender = async (to, body) => {
  if (!smsAvailable()) {
    console.log(JSON.stringify({ event: 'sms.skipped', reason: 'twilio_not_configured', to: mask(to) }));
    return false;
  }
  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const token = process.env.TWILIO_AUTH_TOKEN!;
  const from = process.env.TWILIO_FROM!;
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: to, From: from, Body: body }).toString(),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { code?: number; message?: string };
      // Twilio's error body repeats the destination number — log only the code and a short message.
      console.error(JSON.stringify({ event: 'sms.failed', status: res.status, to: mask(to), code: body.code ?? null, message: (body.message ?? '').replace(/\+?\d{7,}/g, '[number]').slice(0, 120) }));
      return false;
    }
    console.log(JSON.stringify({ event: 'sms.sent', to: mask(to) }));
    return true;
  } catch (err) {
    console.error(JSON.stringify({ event: 'sms.error', to: mask(to), error: err instanceof Error ? err.message : String(err) }));
    return false;
  }
};

function mask(to: string) {
  return to.length > 4 ? `${'*'.repeat(to.length - 4)}${to.slice(-4)}` : '****';
}

// ─── Message shapes (pure, tested) ───────────────────────────────────────────

const ACUITY_WORD: Record<string, string> = {
  urgent: 'Urgent',
  telehealth: 'Telehealth',
  routine: 'Routine',
  selfcare: 'Self-care',
};

export function newVisitText(acuity: string, state: string, base: string): string {
  return `Acute Insight: ${ACUITY_WORD[acuity] ?? 'New'} visit waiting in ${state}. First to accept takes it: ${base}/clinician`;
}

export function acceptedText(clinicianName: string | null, credential: string | null): string {
  const who = clinicianName ? `${clinicianName}${credential ? `, ${credential}` : ''}` : 'A clinician';
  return `Acute Insight: ${who} accepted your visit and will call you at this number shortly. Keep your phone nearby. If you get worse, call 911.`;
}

/**
 * Per-recipient throttle so a busy night doesn't turn into a text storm.
 * In-memory is fine on a single serverless instance for a pilot; it degrades
 * to "maybe one extra text" across cold starts, never to silence.
 */
const lastSent = new Map<string, number>();
export function shouldThrottle(key: string, windowMs: number, now = Date.now()): boolean {
  const prev = lastSent.get(key);
  if (prev !== undefined && now - prev < windowMs) return true;
  lastSent.set(key, now);
  return false;
}
export function _resetThrottle() {
  lastSent.clear();
}
