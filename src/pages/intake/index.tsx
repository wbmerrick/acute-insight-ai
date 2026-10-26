import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router';
import { Helmet } from '@dr.pogodin/react-helmet';
import { useSession } from '@/lib/auth/auth-client';
import { CHAT_CSS } from './chat.css';
import type { Disposition } from '@/lib/clinical-brief';
import { DispositionCard } from '@/components/clinical-brief-view';
import { RequestClinician } from '@/components/request-clinician';

/* ────────────────────────────────────────────────────────────────────────────
   Acute Insight intake — conversational chat, modeled on iSpry's "Spry" chat:
   streaming replies, voice (tap-to-talk input + spoken replies), quick-prompt
   chips, a 2-message guest gate, and control-token cards. Assistant: "Ace".
   Palette is Acute Insight's; everything else mirrors iSpry.
   ──────────────────────────────────────────────────────────────────────────── */

const ASSISTANT = 'Ace';
const GUEST_TURNS = 2;

const CHIPS = [
  'Sick — need care today',
  'A new pain or symptom',
  'Follow-up on a condition',
  'Medication refill',
  'Something feels off',
];

// Client-side emergency pre-screen (mirrors iSpry) so a dangerous message shows
// the 911 card instantly, before any network round-trip.
const MEDICAL_EMERGENCY_RE =
  /chest (pain|pressure|tight|hurts)|crushing chest|heart attack|can'?t breathe|cannot breathe|trouble breathing|difficulty breathing|hard to breathe|short(ness)? of breath|stroke|face droop|slurred speech|overdose|poison|unconscious|passed out|fainted|fainting|seizure|severe bleeding|coughing up blood|anaphyla|throat (is )?(closing|swelling)|airway/i;
const CRISIS_RE =
  /suicid|kill myself|end my life|ending it all|self[- ]?harm|want to die|hurt myself|cut myself|homicid|kill (him|her|them|someone|people)/i;

function isCrisis(t: string) { return CRISIS_RE.test(t); }
function isEmergency(t: string) { return MEDICAL_EMERGENCY_RE.test(t) || CRISIS_RE.test(t); }

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}
// Minimal, safe markdown → HTML (paragraphs, bullet lists, **bold**).
function fmt(text: string) {
  const lines = esc(text).split(/\n/);
  let out = '', inList = false;
  let para: string[] = [];
  const flush = () => { if (para.length) { out += '<p>' + para.join('<br>') + '</p>'; para = []; } };
  lines.forEach((l) => {
    const t = l.trim();
    const m = t.match(/^[-*]\s+(.*)/);
    if (m) { flush(); if (!inList) { out += '<ul>'; inList = true; } out += '<li>' + m[1] + '</li>'; return; }
    if (inList) { out += '</ul>'; inList = false; }
    if (!t) { flush(); return; }
    para.push(t);
  });
  flush(); if (inList) out += '</ul>';
  return out.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}
// Spoken form: drop tokens, expand numbers a TTS voice mangles.
function forSpeech(text: string) {
  return String(text || '')
    .replace(/\s*\[(EMERGENCY|READY)\]\s*/gi, ' ')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/[_`#]/g, '')
    .replace(/^\s*[-*\d]+[.)]\s+/gm, '')
    .replace(/\b988\b/g, 'nine eight eight')
    .replace(/\b911\b/g, 'nine one one')
    .replace(/\s+/g, ' ')
    .trim();
}

interface Turn { role: 'user' | 'assistant'; content: string; }
type SpeechRecognitionLike = {
  lang: string; interimResults: boolean; continuous: boolean;
  onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((ev: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void; stop: () => void;
};

// ─── Inline account modal (guest → account, better-auth) ──────────────────────
function AccountModal({ onClose, onAuthed }: { onClose: () => void; onAuthed: () => void }) {
  const [mode, setMode] = useState<'create' | 'signin'>('create');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setError('');
    try {
      const url = mode === 'create' ? '/api/auth/sign-up/email' : '/api/auth/sign-in/email';
      const body = mode === 'create' ? { name, email, password } : { email, password };
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error((d as { message?: string }).message || 'That didn’t work. Check your details and try again.');
      }
      onAuthed();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  const field: React.CSSProperties = {
    background: 'hsl(var(--background))', border: '1px solid hsl(var(--border-subtle))',
    color: 'hsl(var(--foreground))', borderRadius: 10, padding: '10px 12px', fontFamily: 'var(--font-sans)', fontSize: 15,
  };
  return (
    <div
      role="dialog" aria-modal="true" aria-label="Create your account"
      style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'hsl(var(--surface-deeper) / 0.78)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ width: '100%', maxWidth: 440, background: 'hsl(var(--card))', border: '1px solid hsl(var(--primary) / 0.3)', borderRadius: 20, padding: 28, boxShadow: 'var(--shadow-xl)' }}>
        <h2 className="display" style={{ fontSize: 24, color: 'hsl(var(--foreground))', marginBottom: 6 }}>
          {mode === 'create' ? 'Create your free account' : 'Welcome back'}
        </h2>
        <p style={{ color: 'hsl(var(--text-dim))', fontSize: 14, lineHeight: 1.6, marginBottom: 18 }}>
          {mode === 'create'
            ? 'Your first messages stay in this chat. An account lets you keep going and send your intake to a provider.'
            : 'Sign in to continue your intake.'}
        </p>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {mode === 'create' && (
            <input style={field} placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={160} autoComplete="name" />
          )}
          <input style={field} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={255} autoComplete="email" />
          <input style={field} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete={mode === 'create' ? 'new-password' : 'current-password'} />
          {error && <p style={{ color: 'hsl(var(--destructive))', fontSize: 13 }}>{error}</p>}
          <button type="submit" disabled={busy} style={{ textAlign: 'center', cursor: busy ? 'not-allowed' : 'pointer', background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))', border: 0, borderRadius: 12, padding: '12px 0', fontFamily: 'var(--font-heading)', fontWeight: 600, opacity: busy ? 0.6 : 1 }}>
            {busy ? 'One moment…' : mode === 'create' ? 'Create account & continue' : 'Sign in & continue'}
          </button>
        </form>
        <p style={{ marginTop: 14, fontSize: 13, color: 'hsl(var(--text-dimmer))' }}>
          {mode === 'create' ? 'Already have an account? ' : 'New here? '}
          <button onClick={() => { setMode(mode === 'create' ? 'signin' : 'create'); setError(''); }} style={{ background: 'none', border: 'none', color: 'hsl(var(--primary))', cursor: 'pointer', padding: 0, font: 'inherit' }}>
            {mode === 'create' ? 'Sign in' : 'Create one'}
          </button>
        </p>
      </div>
    </div>
  );
}

// ─── Complete screen ──────────────────────────────────────────────────────────
function CompleteScreen({ onReset, onPortal, disposition, intakeId, escalation }: { onReset: () => void; onPortal: () => void; disposition?: Disposition | null; intakeId?: number | null; escalation?: { escalated: boolean; note: string | null } | null }) {
  return (
    <div className="ace-chat" style={{ maxWidth: 620, margin: '0 auto' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'hsl(var(--primary) / 0.12)', border: '1px solid hsl(var(--primary) / 0.3)' }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
        </div>
        <h1 className="display" style={{ fontSize: 'clamp(1.8rem,3.5vw,2.4rem)', color: 'hsl(var(--foreground))', marginBottom: 12 }}>Intake submitted.</h1>
        <p style={{ color: 'hsl(var(--text-dim))', lineHeight: 1.7, marginBottom: disposition ? 24 : 28, fontFamily: 'var(--font-sans)' }}>
          Your provider will review your brief before your visit. You can see this intake any time in your portal.
        </p>
      </div>
      {escalation?.escalated && disposition && disposition.level !== 'emergency' && (
        <div style={{ marginBottom: 20, padding: '14px 16px', borderRadius: 14, background: 'hsl(var(--warning) / 0.08)', border: '1px solid hsl(var(--warning) / 0.4)' }}>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'hsl(var(--foreground))' }}>
            <span style={{ fontWeight: 600, color: 'hsl(var(--warning))' }}>Your provider has been flagged. </span>
            {escalation.note ?? 'This check-in was escalated.'} Connect with a clinician below if you'd like to be seen now.
          </p>
        </div>
      )}
      {escalation && !escalation.escalated && disposition && (
        <p style={{ textAlign: 'center', fontSize: 13, color: 'hsl(var(--text-dim))', marginBottom: 20 }}>Check-in recorded on your timeline. No escalation needed based on what you shared.</p>
      )}
      {disposition && (
        <div style={{ marginBottom: 28 }}>
          <p style={{ textAlign: 'center', font: '12px var(--font-mono)', color: 'hsl(var(--text-dimmer))', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Your suggested next step</p>
          <DispositionCard disposition={disposition} />
          <p style={{ textAlign: 'center', fontSize: 12, color: 'hsl(var(--text-dimmer))', marginTop: 10, lineHeight: 1.5 }}>A suggestion based on what you shared — not a diagnosis. Your provider decides your care.</p>
        </div>
      )}
      {disposition && intakeId && disposition.level !== 'emergency' && (
        <div style={{ marginBottom: 28 }}>
          <RequestClinician intakeId={intakeId} disposition={disposition} />
        </div>
      )}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button onClick={onPortal} style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))', border: 0, borderRadius: 12, padding: '12px 24px', fontFamily: 'var(--font-heading)', fontWeight: 600, cursor: 'pointer' }}>Go to my portal</button>
        <button onClick={onReset} style={{ background: 'transparent', color: 'hsl(var(--foreground))', border: '1px solid hsl(var(--border-subtle))', borderRadius: 12, padding: '12px 24px', fontFamily: 'var(--font-heading)', fontWeight: 600, cursor: 'pointer' }}>Start another intake</button>
      </div>
    </div>
  );
}

// ─── The chat ─────────────────────────────────────────────────────────────────
function AceChat({ hasAccount, onNeedAccount, intakeId, onComplete, onPortal, initialMessage, autoStartVoice, checkin }: {
  hasAccount: boolean;
  onNeedAccount: () => void;
  intakeId: number | null;
  onComplete: (disposition?: Disposition, checkin?: { escalated: boolean; note: string | null } | null) => void;
  onPortal: () => void;
  initialMessage?: string;      // handed off from the homepage hero composer
  autoStartVoice?: boolean;     // homepage "Talk" → start listening on arrival
  checkin?: { id: number; outcome?: 'better' | 'same' | 'worse' }; // answering a companion check-in
}) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [streaming, setStreaming] = useState<string | null>(null); // active assistant text
  const [typing, setTyping] = useState(false);
  const [input, setInput] = useState('');
  const [threadOpen, setThreadOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [locked, setLocked] = useState(false);
  const [emergency, setEmergency] = useState<{ crisis: boolean } | null>(null);
  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [voiceReplies, setVoiceReplies] = useState(() => {
    try { return localStorage.getItem('ace_voice') !== '0'; } catch { return true; }
  });
  const [listening, setListening] = useState(false);
  const [voiceLine, setVoiceLine] = useState<{ mode: string; text: string } | null>(null);

  const turnsRef = useRef<Turn[]>([]);
  const msgsRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speakGen = useRef(0);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const listenActiveRef = useRef(false);
  const pendingTranscript = useRef('');
  const hasAccountRef = useRef(hasAccount);
  hasAccountRef.current = hasAccount;
  const intakeIdRef = useRef(intakeId);
  intakeIdRef.current = intakeId;
  const voiceRepliesRef = useRef(voiceReplies);
  voiceRepliesRef.current = voiceReplies;

  const SR = typeof window !== 'undefined'
    ? ((window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike }).SpeechRecognition ||
       (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike }).webkitSpeechRecognition)
    : undefined;
  const voiceCapable = !!SR;

  const scrollDown = useCallback(() => {
    const el = msgsRef.current; if (el) el.scrollTop = el.scrollHeight;
  }, []);
  useEffect(scrollDown, [turns, streaming, typing, scrollDown]);

  function guestPatientTurns() {
    return turnsRef.current.filter((m) => m.role === 'user').length;
  }

  function stopSpeaking() {
    speakGen.current += 1;
    if (audioRef.current) { try { audioRef.current.onended = null; audioRef.current.pause(); } catch { /* */ } audioRef.current = null; }
    if (typeof window !== 'undefined' && window.speechSynthesis) { try { speechSynthesis.cancel(); } catch { /* */ } }
  }

  function pickBrowserVoice(): SpeechSynthesisVoice | null {
    if (typeof window === 'undefined' || !window.speechSynthesis) return null;
    const voices = speechSynthesis.getVoices() || [];
    const prefer = [/samantha/i, /jenny/i, /aria/i, /natural/i, /google us english/i, /female/i];
    for (const re of prefer) {
      const hit = voices.find((v) => re.test(v.name) && /^en/i.test(v.lang || ''));
      if (hit) return hit;
    }
    return voices.find((v) => /^en(-|_)?US/i.test(v.lang || '')) || null;
  }
  function speakBrowser(text: string, gen: number) {
    return new Promise<boolean>((resolve) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) { resolve(false); return; }
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US'; u.rate = 1.15; u.pitch = 1.05;
      const v = pickBrowserVoice(); if (v) u.voice = v;
      u.onend = () => resolve(gen === speakGen.current);
      u.onerror = () => resolve(false);
      try { speechSynthesis.speak(u); } catch { resolve(false); }
    });
  }
  async function speakReply(text: string) {
    if (!voiceRepliesRef.current) return;
    const clean = forSpeech(text);
    if (!clean) return;
    stopSpeaking();
    const gen = speakGen.current;
    setVoiceLine({ mode: 'speaking', text: `${ASSISTANT} is speaking` });
    try {
      const r = await fetch('/api/speak', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: clean.slice(0, 700) }) });
      if (!r.ok) throw new Error('tts');
      const blob = await r.blob();
      if (!blob || !blob.size || gen !== speakGen.current) throw new Error('empty');
      const url = URL.createObjectURL(blob);
      await new Promise<void>((resolve) => {
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => { URL.revokeObjectURL(url); audioRef.current = null; resolve(); };
        audio.onerror = () => { URL.revokeObjectURL(url); audioRef.current = null; resolve(); };
        const p = audio.play();
        if (p && p.catch) p.catch(() => resolve());
      });
    } catch {
      await speakBrowser(clean, gen); // server voice unavailable → browser voice
    } finally {
      if (gen === speakGen.current) setVoiceLine(null);
    }
  }

  function stopListening(sendIt: boolean) {
    listenActiveRef.current = false;
    setListening(false);
    const said = pendingTranscript.current.trim();
    if (recRef.current) {
      try { recRef.current.onresult = null; recRef.current.onerror = null; recRef.current.onend = null; recRef.current.stop(); } catch { /* */ }
      recRef.current = null;
    }
    pendingTranscript.current = '';
    if (sendIt && said) { void ask(said, true); }
    else if (!sendIt) setVoiceLine(null);
  }
  function startListening() {
    if (!SR || busy || locked) return;
    stopSpeaking();
    pendingTranscript.current = '';
    listenActiveRef.current = true;
    setListening(true);
    setThreadOpen(true);
    setVoiceLine({ mode: 'listening', text: "Listening — tap Send when you're done" });
    try {
      const rec = new SR();
      rec.lang = 'en-US'; rec.interimResults = true; rec.continuous = true;
      rec.onresult = (ev) => {
        let t = '';
        for (let i = 0; i < ev.results.length; i++) t += ev.results[i][0].transcript;
        pendingTranscript.current = t.trim();
        setInput(pendingTranscript.current);
      };
      rec.onerror = (ev) => {
        if (ev && (ev.error === 'not-allowed' || ev.error === 'service-not-allowed')) {
          setVoiceLine(null); setListening(false); listenActiveRef.current = false;
        }
      };
      rec.onend = () => { recRef.current = null; listenActiveRef.current = false; setListening(false); };
      recRef.current = rec; rec.start();
    } catch {
      listenActiveRef.current = false; setListening(false); setVoiceLine(null);
    }
  }
  function toggleTalk() {
    if (locked) return;
    if (listenActiveRef.current) { stopListening(true); return; }
    stopSpeaking();
    startListening();
  }

  function toggleSpeaker() {
    setVoiceReplies((v) => {
      const next = !v;
      try { localStorage.setItem('ace_voice', next ? '1' : '0'); } catch { /* */ }
      if (!next) stopSpeaking();
      return next;
    });
  }

  function pushTurn(t: Turn) {
    turnsRef.current = [...turnsRef.current, t];
    setTurns(turnsRef.current);
  }

  const ask = useCallback(async function ask(text: string, fromVoice?: boolean) {
    void fromVoice;
    text = (text || '').trim();
    if (!text || busy || locked) return;

    // Instant emergency card, before any network call.
    if (isEmergency(text)) {
      if (listenActiveRef.current) stopListening(false);
      stopSpeaking();
      setThreadOpen(true);
      pushTurn({ role: 'user', content: text });
      const crisis = isCrisis(text);
      setEmergency({ crisis });
      setLocked(true);
      setInput('');
      const spoken = crisis
        ? 'Please call or text nine eight eight now. If you are in immediate danger, call nine one one.'
        : 'What you described may need emergency care now. Please call nine one one or go to the nearest emergency room.';
      void speakReply(spoken);
      return;
    }

    // Guest gate.
    if (!hasAccountRef.current && guestPatientTurns() >= GUEST_TURNS) {
      onNeedAccount();
      return;
    }

    if (listenActiveRef.current) stopListening(false);
    stopSpeaking();
    setThreadOpen(true);
    pushTurn({ role: 'user', content: text });
    setInput('');
    setBusy(true);
    setTyping(true);
    setError('');

    let full = '';
    try {
      const res = await fetch('/api/intake/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: turnsRef.current.map((t) => ({ role: t.role === 'user' ? 'patient' : 'ai', content: t.content })), intakeId: intakeIdRef.current }),
      });
      if (res.status === 401) { setTyping(false); setBusy(false); turnsRef.current = turnsRef.current.slice(0, -1); setTurns(turnsRef.current); onNeedAccount(); return; }
      if (res.status === 429) throw new Error('rate');
      if (!res.ok || !res.body) throw new Error('bad');
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      setTyping(false);
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        full += dec.decode(value, { stream: true });
        const shown = full.replace(/\s*\[(EMERGENCY|READY)\]\s*/gi, '\n').trim();
        setStreaming(shown);
      }
      if (!full.trim()) throw new Error('empty');

      const cleaned = full.replace(/\s*\[(EMERGENCY|READY)\]\s*/gi, '\n').trim();
      setStreaming(null);
      pushTurn({ role: 'assistant', content: cleaned });

      if (/\[EMERGENCY\]/i.test(full)) {
        const userBlob = turnsRef.current.filter((m) => m.role === 'user').map((m) => m.content).join('\n');
        setEmergency({ crisis: isCrisis(userBlob) });
        setLocked(true);
      } else if (/\[READY\]/i.test(full)) {
        setReady(true);
      }
      void speakReply(full);
    } catch (e) {
      setTyping(false);
      setStreaming(null);
      const msg = e instanceof Error && e.message === 'rate'
        ? `${ASSISTANT} is getting a lot of requests right now. Please wait a moment and try again. If this is urgent, call 911.`
        : `${ASSISTANT} couldn't respond just now. Please try again in a moment. If this is urgent, call 911.`;
      setError(msg);
      // roll back the user turn so a retry doesn't double-count
      turnsRef.current = turnsRef.current.slice(0, -1);
      setTurns(turnsRef.current);
    } finally {
      setBusy(false);
      setTimeout(() => taRef.current?.focus(), 50);
    }
  }, [busy, locked, onNeedAccount]);

  async function submitIntake() {
    if (submitting) return;
    const id = intakeIdRef.current;
    if (!id) { onNeedAccount(); return; }
    setSubmitting(true); setError('');
    try {
      const patientTurns = turnsRef.current.filter((m) => m.role === 'user');
      const aiTurns = turnsRef.current.filter((m) => m.role === 'assistant');
      const responses = patientTurns.map((m, i) => ({
        questionId: `chat_turn_${i + 1}`,
        question: aiTurns[i]?.content ?? 'Follow-up',
        answer: m.content,
      }));
      const chiefComplaint = patientTurns[0]?.content ?? 'General concern (chat intake)';
      const res = await fetch(`/api/intake/${id}/complete`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responses, chiefComplaint, checkinId: checkin?.id, outcome: checkin?.outcome }),
      });
      if (!res.ok) throw new Error('submit');
      const data = (await res.json().catch(() => ({}))) as { disposition?: Disposition; checkin?: { escalated: boolean; note: string | null } | null };
      onComplete(data.disposition, data.checkin ?? null);
    } catch {
      setError('Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function startOver() {
    stopSpeaking(); stopListening(false);
    turnsRef.current = []; setTurns([]);
    setStreaming(null); setTyping(false); setInput('');
    setThreadOpen(false); setBusy(false); setLocked(false);
    setEmergency(null); setReady(false); setError('');
    setVoiceLine(null);
    setTimeout(() => taRef.current?.focus(), 50);
  }

  function autosize(el: HTMLTextAreaElement | null) {
    if (!el) return; el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 140) + 'px';
  }
  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void ask(input); }
  }

  // Hand-off from the homepage hero: send the first message (or open the mic)
  // exactly once when the chat mounts.
  const firedInitial = useRef(false);
  useEffect(() => {
    if (firedInitial.current) return;
    if (!initialMessage?.trim() && !autoStartVoice) return;
    // Guard is set inside the timer, not before it, so a StrictMode mount→
    // cleanup→mount cycle (which clears the first timer) still fires exactly once.
    const t = setTimeout(() => {
      if (firedInitial.current) return;
      firedInitial.current = true;
      if (initialMessage && initialMessage.trim()) void ask(initialMessage.trim());
      else if (autoStartVoice) startListening();
    }, 90);
    return () => clearTimeout(t);
  }, [initialMessage, autoStartVoice, ask]);

  const guestLeft = GUEST_TURNS - guestPatientTurns();
  const hint = hasAccount
    ? "Tell Ace what's going on — no need to include your name or birthdate here."
    : guestLeft <= 0
      ? 'Create an account to keep going — your first messages stay in this chat.'
      : `${guestLeft === 1 ? 'One more message' : 'Two messages'} before an account. Leave out your name and birthdate.`;

  const MicIcon = (
    <svg className="ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
  );
  const SendIcon = (
    <svg className="ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
  );

  return (
    <div className="ace-chat">
      <style>{CHAT_CSS}</style>

      {/* Idle hero composer + chips */}
      {!threadOpen && (
        <div className="idle-start">
          <div className="idle-composer">
            <form className="composer" onSubmit={(e) => { e.preventDefault(); void ask(input); }} autoComplete="off" noValidate>
              <p className="intake-hint" aria-live="polite">{hint}</p>
              <label htmlFor="ace-q-idle">Tell {ASSISTANT} what&rsquo;s going on</label>
              <textarea
                id="ace-q-idle" ref={taRef} rows={1} maxLength={2000}
                placeholder="Sore throat since last night"
                value={input}
                onChange={(e) => { setInput(e.target.value); autosize(e.target); }}
                onKeyDown={onKeyDown}
                disabled={busy}
                autoFocus
              />
              <div className="comp-row">
                <div className="comp-note">
                  <svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
                  Please don&rsquo;t include your name or birthdate here
                </div>
                {voiceCapable && (
                  <button className={`talk-btn${listening ? ' rec' : ''}`} type="button" onClick={toggleTalk} disabled={busy} aria-label={`Talk to ${ASSISTANT}`} title="Tap to talk, tap again to send">
                    {MicIcon}<span className="talk-label">{listening ? 'Send' : 'Talk'}</span>
                  </button>
                )}
                <button className="btn" type="submit" disabled={busy || !input.trim()}>Ask {ASSISTANT}{SendIcon}</button>
              </div>
            </form>
          </div>
          <p className="chip-kicker">Or start with this</p>
          <div className="chips" aria-label="Quick prompts">
            {CHIPS.map((c) => (
              <button key={c} className="chip" type="button" onClick={() => void ask(c)}>{c}</button>
            ))}
          </div>
        </div>
      )}

      {/* Chat shell */}
      {threadOpen && (
        <div className="chat-shell on">
          <div className="thread">
            <div className="thread-head">
              <div className="who">
                <svg className="ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
                {ASSISTANT} | AI intake
              </div>
              <button className="btn-ghost" type="button" onClick={startOver} style={{ minHeight: 40, padding: '0 16px', fontSize: 14 }}>Start over</button>
            </div>
            <div className="msgs" ref={msgsRef} role="log" aria-live="off" aria-label={`Conversation with ${ASSISTANT}`}>
              {turns.map((m, i) => (
                <div key={i} className={`msg ${m.role === 'user' ? 'u' : 'a'}`}>
                  <span className="sr">{m.role === 'user' ? 'You said: ' : `${ASSISTANT} said: `}</span>
                  <span dangerouslySetInnerHTML={{ __html: fmt(m.content) }} />
                </div>
              ))}
              {typing && (
                <div className="msg a"><span className="typing" role="img" aria-label={`${ASSISTANT} is typing`}><i /><i /><i /></span></div>
              )}
              {streaming !== null && (
                <div className="msg a"><span dangerouslySetInnerHTML={{ __html: fmt(streaming) }} /></div>
              )}

              {emergency && (
                <div className="emerg" role="alert">
                  <span className="mono" style={{ color: 'hsl(var(--destructive))' }}>{ASSISTANT} | Safety check</span>
                  <h2>{emergency.crisis ? 'Please get crisis help now.' : 'This needs emergency care now.'}</h2>
                  <p style={{ color: 'hsl(var(--text-dim))', margin: 0, lineHeight: 1.6 }}>
                    {emergency.crisis
                      ? 'Call or text 988 (Suicide & Crisis Lifeline) now. If you are in immediate danger, call 911. Do not wait for an online visit.'
                      : 'Please call 911 or go to the nearest emergency room. Do not wait for an online visit.'}
                  </p>
                  <div className="row">
                    {emergency.crisis
                      ? (<><a className="btn btn-red" href="tel:988">Call or text 988</a><a className="btn btn-ghost" href="tel:911">Call 911</a></>)
                      : (<a className="btn btn-red" href="tel:911">Call 911</a>)}
                  </div>
                </div>
              )}

              {ready && !emergency && (
                <div className="ready">
                  <span className="mono" style={{ color: 'hsl(var(--primary))' }}>Intake ready</span>
                  <h2>Send this to your provider?</h2>
                  <p style={{ color: 'hsl(var(--text-dim))', margin: 0, lineHeight: 1.6 }}>
                    {ASSISTANT} has what it needs. Submit and your provider gets a structured brief with anything important flagged.
                  </p>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button className="btn" type="button" onClick={submitIntake} disabled={submitting}>{submitting ? 'Submitting…' : 'Submit intake'}</button>
                    <button className="btn-ghost" type="button" onClick={() => setReady(false)}>Add something first</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {!locked && (
            <div className="chat-dock">
              {voiceLine && (
                <div className={`voice-line on ${voiceLine.mode}`} role="status" aria-live="polite">
                  <span className="dot" aria-hidden="true" />{voiceLine.text}
                </div>
              )}
              {error && <p style={{ color: 'hsl(var(--destructive))', font: '13px var(--font-sans)', margin: 0 }}>{error}</p>}
              <form className="composer" onSubmit={(e) => { e.preventDefault(); void ask(input); }} autoComplete="off" noValidate>
                <label htmlFor="ace-q">Message {ASSISTANT}</label>
                <textarea
                  id="ace-q" ref={taRef} rows={1} maxLength={2000}
                  placeholder={voiceCapable ? 'Tap Talk to speak, or type a reply' : 'Type your reply'}
                  value={input}
                  onChange={(e) => { setInput(e.target.value); autosize(e.target); }}
                  onKeyDown={onKeyDown}
                  disabled={busy}
                />
                <div className="comp-row">
                  <div className="comp-note">
                    <svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
                    Please don&rsquo;t include your name or birthdate
                  </div>
                  <button className={`icon-btn${voiceReplies ? ' speak-on' : ''}`} type="button" onClick={toggleSpeaker} aria-pressed={voiceReplies} aria-label={voiceReplies ? `${ASSISTANT} voice on` : `${ASSISTANT} voice muted`} title={voiceReplies ? `${ASSISTANT} voice on` : `${ASSISTANT} voice muted`}>
                    {voiceReplies
                      ? (<svg className="ic" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 10v4h4l5 4V6L8 10H4z" /><path d="M16.5 8.5a5 5 0 0 1 0 7" /><path d="M18.5 6a8 8 0 0 1 0 12" /></svg>)
                      : (<svg className="ic" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 10v4h4l5 4V6L8 10H4z" /><path d="M16 9l6 6M22 9l-6 6" /></svg>)}
                  </button>
                  {voiceCapable && (
                    <button className={`talk-btn${listening ? ' rec' : ''}`} type="button" onClick={toggleTalk} disabled={busy} aria-label={`Talk to ${ASSISTANT}`} title="Tap to talk, tap again to send">
                      {MicIcon}<span className="talk-label">{listening ? 'Send' : 'Talk'}</span>
                    </button>
                  )}
                  <button className="btn" type="submit" disabled={busy || !input.trim()}>Ask {ASSISTANT}{SendIcon}</button>
                </div>
              </form>
            </div>
          )}

          {locked && (
            <div className="chat-dock">
              <button className="btn-ghost" type="button" onClick={onPortal}>Go to my portal</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
function IntakeFlow() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSession();
  const [phase, setPhase] = useState<'chat' | 'complete'>('chat');
  const [intakeId, setIntakeId] = useState<number | null>(null);
  const [disposition, setDisposition] = useState<Disposition | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  // First message / voice intent handed off from the homepage hero composer.
  // Captured once so a re-render or "Start over" doesn't replay it.
  const handoff = useRef<{ firstMessage?: string; voice?: boolean; checkinId?: number; outcome?: 'better' | 'same' | 'worse' }>(
    (location.state as { firstMessage?: string; voice?: boolean; checkinId?: number; outcome?: 'better' | 'same' | 'worse' } | null) ?? {},
  );
  const checkinCtx = resetKey === 0 && handoff.current.checkinId ? { id: handoff.current.checkinId, outcome: handoff.current.outcome } : undefined;
  const [escalation, setEscalation] = useState<{ escalated: boolean; note: string | null } | null>(null);
  const initialMessage = resetKey === 0 ? handoff.current.firstMessage : undefined;
  const autoStartVoice = resetKey === 0 ? handoff.current.voice : undefined;

  const startedRef = useRef(false);
  const startIntake = useCallback(async () => {
    try {
      const res = await fetch('/api/intake/start', { method: 'POST' });
      if (res.ok) { const d = (await res.json()) as { id: number }; setIntakeId(d.id); }
    } catch { /* guest can still chat; session reserved after account */ }
  }, []);

  // Signed-in visitors get an intake session reserved up front.
  useEffect(() => {
    if (user && !startedRef.current) { startedRef.current = true; void startIntake(); }
  }, [user, startIntake]);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'hsl(var(--background))' }}>
      <header className="sticky top-0 z-40 px-6 py-4 shrink-0" style={{ background: 'hsl(var(--card) / 0.85)', borderBottom: '1px solid hsl(var(--border-subtle) / 0.4)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'hsl(var(--primary) / 0.12)', border: '1px solid hsl(var(--primary) / 0.3)' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
            </div>
            <span className="text-sm font-semibold text-foreground hidden sm:block" style={{ fontFamily: 'var(--font-heading)' }}>Acute Insight AI</span>
          </Link>
          <button onClick={() => navigate('/portal')} className="text-xs text-muted-foreground hover:text-foreground transition-colors" style={{ fontFamily: 'var(--font-sans)' }}>My portal</button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center px-6 py-10">
        <div className="w-full max-w-3xl">
          {phase === 'complete' ? (
            <CompleteScreen
              disposition={disposition}
              intakeId={intakeId}
              escalation={escalation}
              onReset={() => { setDisposition(null); setEscalation(null); setPhase('chat'); setResetKey((k) => k + 1); void startIntake(); }}
              onPortal={() => navigate('/portal')}
            />
          ) : (
            <>
              <div className="text-center mb-8 max-w-xl mx-auto">
                <h1 className="display text-foreground mb-3" style={{ fontSize: 'clamp(2.2rem,5vw,3.4rem)' }}>Just ask.</h1>
                <p className="text-base md:text-lg" style={{ color: 'hsl(var(--text-dim))', lineHeight: 1.6 }}>
                  Talk or type with Ace, your AI intake assistant. Your provider reviews a structured brief before your visit.
                </p>
              </div>
              <AceChat
                key={resetKey}
                hasAccount={!!user}
                intakeId={intakeId}
                initialMessage={initialMessage}
                autoStartVoice={autoStartVoice}
                onNeedAccount={() => setShowModal(true)}
                checkin={checkinCtx}
                onComplete={(d, c) => { setDisposition(d ?? null); setEscalation(c ?? null); setPhase('complete'); }}
                onPortal={() => navigate('/portal')}
              />
            </>
          )}
        </div>
      </main>

      {showModal && (
        <AccountModal
          onClose={() => setShowModal(false)}
          onAuthed={async () => { setShowModal(false); await startIntake(); }}
        />
      )}
    </div>
  );
}

export default function IntakePage() {
  return (
    <>
      <Helmet>
        <title>Patient intake — Acute Insight AI</title>
        <meta name="description" content="Talk or type with Ace, Acute Insight's AI intake assistant. Your provider reviews a structured brief before your visit." />
        <meta name="robots" content="noindex" />
      </Helmet>
      <IntakeFlow />
    </>
  );
}
