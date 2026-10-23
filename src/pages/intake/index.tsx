import { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router';
import { Helmet } from '@dr.pogodin/react-helmet';
import { motion, AnimatePresence } from 'motion/react';
import { ProtectedRoute } from '@/lib/auth/auth-client';
import { intake } from 'virtual:content';

// ─── Complete screen ──────────────────────────────────────────────────────────

function CompleteScreen({ onReset }: { onReset: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="flex flex-col items-center text-center max-w-md mx-auto"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.15, type: 'spring', stiffness: 200, damping: 15 }}
        className="w-20 h-20 rounded-3xl flex items-center justify-center mb-8"
        style={{
          background: `hsl(var(--primary) / 0.1)`,
          border: `1px solid hsl(var(--primary) / 0.3)`,
          boxShadow: `0 0 40px hsl(var(--primary) / 0.15)`,
        }}
      >
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5">
          <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
      </motion.div>

      <h2 className="text-3xl font-bold text-foreground mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
        {intake.completeHeading}
      </h2>
      <p className="text-muted-foreground mb-10 leading-relaxed" style={{ fontFamily: 'var(--font-sans)' }}>
        {intake.completeSubheading}
      </p>

      <div className="flex flex-col gap-3 w-full">
        <Link
          to="/portal"
          className="w-full py-4 rounded-2xl text-base font-semibold text-center transition-all duration-200"
          style={{
            background: `hsl(var(--primary))`,
            color: `hsl(var(--background))`,
            fontFamily: 'var(--font-heading)',
            boxShadow: `0 0 24px hsl(var(--primary) / 0.25)`,
          }}
        >
          {intake.completePortalButton}
        </Link>
        <button
          onClick={onReset}
          className="w-full py-3 rounded-2xl text-sm font-medium transition-all duration-200"
          style={{
            background: `hsl(var(--card))`,
            color: `hsl(var(--foreground))`,
            border: `1px solid hsl(var(--border-subtle) / 0.5)`,
            fontFamily: 'var(--font-sans)',
          }}
        >
          {intake.completeNewButton}
        </button>
      </div>
    </motion.div>
  );
}

// ─── Chat message types ───────────────────────────────────────────────────────

interface ChatMessage {
  role: 'ai' | 'patient';
  content: string;
}

// ─── Chat flow ────────────────────────────────────────────────────────────────

function ChatFlow({
  intakeId,
  onComplete,
  onBack,
}: {
  intakeId: number;
  onComplete: () => void;
  onBack: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading] = useState(false);
  const [aiTyping, setAiTyping] = useState(false);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [emergency, setEmergency] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Fetch the opening AI message on mount
  useEffect(() => {
    async function fetchWelcome() {
      setAiTyping(true);
      try {
        const res = await fetch('/api/intake/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: [], intakeId }),
        });
        const data = await res.json() as { reply: string; done: boolean };
        setMessages([{ role: 'ai', content: data.reply }]);
      } catch {
        setMessages([{ role: 'ai', content: 'Hello! What brings you in today? Please describe your main concern.' }]);
      } finally {
        setAiTyping(false);
        // Put the cursor where the patient needs it, immediately.
        setTimeout(() => inputRef.current?.focus(), 80);
      }
    }
    fetchWelcome();
  }, [intakeId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, aiTyping]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading || aiTyping) return;

    const newMessages: ChatMessage[] = [...messages, { role: 'patient', content: text }];
    setMessages(newMessages);
    setInput('');
    setAiTyping(true);
    setError('');

    try {
      const res = await fetch('/api/intake/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, intakeId }),
      });
      const data = await res.json() as { reply: string; done: boolean; emergency?: boolean };

      // Simulate a brief typing delay for realism
      await new Promise((r) => setTimeout(r, 600));

      setMessages((prev) => [...prev, { role: 'ai', content: data.reply }]);
      if (data.done) setDone(true);
      if (data.emergency) setEmergency(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setAiTyping(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  async function handleSubmit() {
    if (submitting) return;
    setSubmitting(true);
    setError('');
    try {
      // Convert chat transcript to Q&A pairs for the complete endpoint
      const qaPairs = messages
        .filter((m) => m.role === 'patient')
        .map((m, i) => ({
          questionId: `chat_turn_${i + 1}`,
          question: messages.filter((msg) => msg.role === 'ai')[i]?.content ?? 'Follow-up',
          answer: m.content,
        }));

      // Extract chief complaint from first patient message
      const firstPatient = messages.find((m) => m.role === 'patient');
      const chiefComplaint = firstPatient?.content ?? 'General concern (chat intake)';

      const res = await fetch(`/api/intake/${intakeId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responses: qaPairs, chiefComplaint }),
      });
      if (!res.ok) throw new Error('Submit failed');
      onComplete();
    } catch {
      setError('Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex flex-col w-full rounded-2xl overflow-hidden"
      style={{
        height: 'calc(100vh - 128px)',
        maxHeight: 820,
        minHeight: 480,
        background: `hsl(var(--card))`,
        border: `1px solid hsl(var(--primary) / 0.28)`,
        boxShadow: `0 0 44px hsl(var(--primary) / 0.1), var(--shadow-lg)`,
      }}
    >
      {/* Chat header — pinned */}
      <div
        className="flex items-center gap-3 px-5 py-3.5 shrink-0"
        style={{ borderBottom: `1px solid hsl(var(--border-subtle) / 0.5)`, background: `hsl(var(--surface-deeper) / 0.5)` }}
      >
        <button
          onClick={onBack}
          className="p-2 rounded-xl transition-colors duration-150 hover:opacity-70"
          style={{ background: `hsl(var(--background))`, border: `1px solid hsl(var(--border-subtle) / 0.5)`, color: `hsl(var(--foreground))` }}
          aria-label="Back to portal"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `hsl(var(--primary) / 0.12)`, border: `1px solid hsl(var(--primary) / 0.25)` }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold leading-tight" style={{ color: `hsl(var(--foreground))`, fontFamily: 'var(--font-heading)' }}>
            AI intake assistant
          </p>
          <p className="text-xs" style={{ color: `hsl(var(--muted-foreground))`, fontFamily: 'var(--font-sans)' }}>
            Private to you and your care team
          </p>
        </div>
        <span className="hidden sm:flex items-center gap-1.5 vitals text-xs" style={{ color: 'hsl(var(--primary))' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-primary" style={{ boxShadow: '0 0 6px hsl(var(--primary))' }} />
          live
        </span>
      </div>

      {/* Message list — the only scrolling region */}
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-4 px-5 py-5">
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex ${msg.role === 'patient' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'ai' && (
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mr-2 mt-0.5"
                  style={{ background: `hsl(var(--primary) / 0.12)`, border: `1px solid hsl(var(--primary) / 0.2)` }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="2">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                  </svg>
                </div>
              )}
              <div
                className="max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap"
                style={{
                  background: msg.role === 'patient'
                    ? `hsl(var(--primary))`
                    : `hsl(var(--card))`,
                  color: msg.role === 'patient'
                    ? `hsl(var(--background))`
                    : `hsl(var(--foreground))`,
                  border: msg.role === 'ai' ? `1px solid hsl(var(--border-subtle) / 0.3)` : 'none',
                  borderRadius: msg.role === 'patient' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                {msg.content}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        {aiTyping && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start items-end gap-2"
          >
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: `hsl(var(--primary) / 0.12)`, border: `1px solid hsl(var(--primary) / 0.2)` }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="2">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
              </svg>
            </div>
            <div
              className="rounded-2xl px-4 py-3 flex items-center gap-1"
              style={{
                background: `hsl(var(--card))`,
                border: `1px solid hsl(var(--border-subtle) / 0.3)`,
                borderRadius: '18px 18px 18px 4px',
              }}
            >
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: `hsl(var(--muted-foreground))` }}
                  animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                  transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.2 }}
                />
              ))}
            </div>
          </motion.div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Footer region — pinned below the transcript */}
      <div
        className="shrink-0 px-5 pt-3 pb-4"
        style={{ borderTop: `1px solid hsl(var(--border-subtle) / 0.5)`, background: `hsl(var(--surface-deeper) / 0.4)` }}
      >
      {/* Emergency banner */}
      {emergency && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl px-4 py-3 mb-3 flex items-start gap-3"
          style={{ background: `hsl(var(--destructive) / 0.1)`, border: `1px solid hsl(var(--destructive) / 0.4)` }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--destructive))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <div>
            <p className="text-xs font-semibold mb-0.5" style={{ color: `hsl(var(--destructive))`, fontFamily: 'var(--font-heading)' }}>
              Possible emergency detected
            </p>
            <a href="tel:911" className="text-xs underline" style={{ color: `hsl(var(--destructive))`, fontFamily: 'var(--font-sans)' }}>
              Call 911 now
            </a>
          </div>
        </motion.div>
      )}

      {/* Error */}
      {error && (
        <p className="text-xs mb-2" style={{ color: `hsl(var(--destructive))`, fontFamily: 'var(--font-sans)' }}>
          {error}
        </p>
      )}

      {/* Input area */}
      {!done ? (
        <div
          className="flex items-end gap-2 rounded-2xl p-2"
          style={{ background: `hsl(var(--background))`, border: `1px solid hsl(var(--primary) / 0.3)` }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message… (Enter to send, Shift+Enter for new line)"
            rows={2}
            disabled={loading || aiTyping}
            className="flex-1 bg-transparent text-sm outline-none resize-none px-2 py-1"
            style={{ color: `hsl(var(--foreground))`, fontFamily: 'var(--font-sans)' }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading || aiTyping}
            className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-150 disabled:opacity-40"
            style={{
              background: input.trim() ? `hsl(var(--primary))` : `hsl(var(--muted))`,
              color: input.trim() ? `hsl(var(--background))` : `hsl(var(--muted-foreground))`,
            }}
            aria-label="Send message"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-3"
        >
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-4 rounded-2xl text-base font-semibold transition-all duration-200 disabled:opacity-60"
            style={{
              background: `hsl(var(--primary))`,
              color: `hsl(var(--background))`,
              fontFamily: 'var(--font-heading)',
              boxShadow: `0 0 24px hsl(var(--primary) / 0.3)`,
            }}
          >
            {submitting ? 'Submitting…' : 'Submit intake'}
          </button>
          <button
            onClick={sendMessage}
            disabled={!input.trim() || aiTyping}
            className="text-sm underline underline-offset-2 transition-opacity hover:opacity-70"
            style={{ color: `hsl(var(--muted-foreground))`, fontFamily: 'var(--font-sans)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Add something first
          </button>
        </motion.div>
      )}
      </div>
    </motion.div>
  );
}

// ─── Main flow — conversational, chat-first ────────────────────────────────────

function IntakeFlow() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<'loading' | 'chat' | 'complete'>('loading');
  const [intakeId, setIntakeId] = useState<number | null>(null);
  const [error, setError] = useState('');

  const startIntake = useCallback(async () => {
    setError('');
    setPhase('loading');
    try {
      const res = await fetch('/api/intake/start', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to start');
      const data = (await res.json()) as { id: number };
      setIntakeId(data.id);
      setPhase('chat');
    } catch {
      setError(intake.errorLabel);
    }
  }, []);

  useEffect(() => {
    startIntake();
  }, [startIntake]);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: `hsl(var(--background))` }}>
      {/* Header */}
      <header
        className="sticky top-0 z-40 px-6 py-4 shrink-0"
        style={{
          background: `hsl(var(--card) / 0.85)`,
          borderBottom: `1px solid hsl(var(--border-subtle) / 0.4)`,
          backdropFilter: 'blur(12px)',
        }}
      >
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: `hsl(var(--primary) / 0.12)`, border: `1px solid hsl(var(--primary) / 0.3)` }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-foreground hidden sm:block" style={{ fontFamily: 'var(--font-heading)' }}>
              Acute Insight AI
            </span>
          </Link>
          <button
            onClick={() => navigate('/portal')}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            style={{ fontFamily: 'var(--font-sans)' }}
          >
            My portal
          </button>
        </div>
      </header>

      {/* Main content */}
      <main
        className={`flex-1 flex px-6 ${
          phase === 'chat' ? 'items-stretch justify-center py-6' : 'items-center justify-center py-12'
        }`}
      >
        <div className={`w-full ${phase === 'chat' ? 'max-w-3xl flex' : 'max-w-2xl'}`}>
          <AnimatePresence mode="wait">
            {phase === 'loading' && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center text-center gap-5 mx-auto"
              >
                {error ? (
                  <>
                    <p className="text-base" style={{ color: `hsl(var(--destructive))`, fontFamily: 'var(--font-sans)' }}>
                      {error}
                    </p>
                    <button
                      onClick={startIntake}
                      className="px-6 py-3 rounded-xl text-sm font-semibold bg-primary transition-all duration-200 hover:brightness-110"
                      style={{ color: `hsl(var(--primary-foreground))`, fontFamily: 'var(--font-heading)' }}
                    >
                      Try again
                    </button>
                  </>
                ) : (
                  <>
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center"
                      style={{ background: `hsl(var(--primary) / 0.1)`, border: `1px solid hsl(var(--primary) / 0.25)` }}
                    >
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="trace-glow">
                        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                      </svg>
                    </div>
                    <p className="text-sm" style={{ color: `hsl(var(--text-dim))`, fontFamily: 'var(--font-sans)' }}>
                      Starting your intake…
                    </p>
                  </>
                )}
              </motion.div>
            )}

            {phase === 'chat' && intakeId !== null && (
              <ChatFlow
                key="chat"
                intakeId={intakeId}
                onComplete={() => setPhase('complete')}
                onBack={() => navigate('/portal')}
              />
            )}

            {phase === 'complete' && (
              <CompleteScreen key="complete" onReset={startIntake} />
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export default function IntakePage() {
  return (
    <>
      <Helmet>
        <title>Patient Intake — Acute Insight AI</title>
        <meta name="description" content="Complete your pre-visit intake questionnaire. AI-guided, private, and done in minutes." />
        <meta name="robots" content="noindex" />
      </Helmet>
      <ProtectedRoute>
        <IntakeFlow />
      </ProtectedRoute>
    </>
  );
}
