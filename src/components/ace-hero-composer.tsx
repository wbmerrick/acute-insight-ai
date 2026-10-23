import { useRef, useState } from 'react';
import { CHAT_CSS } from '../pages/intake/chat.css';

/* ────────────────────────────────────────────────────────────────────────────
   Ace hero composer — the live intake entry point at the top of the homepage
   hero. Shares the exact look of the /intake idle composer (CHAT_CSS, scoped
   under .ace-chat). It is stateless beyond its own input: submitting, tapping a
   chip, or tapping Talk hands off to /intake, which opens the full conversation.
   ──────────────────────────────────────────────────────────────────────────── */

const ASSISTANT = 'Ace';
const CHIPS = [
  'Sick — need care today',
  'A new pain or symptom',
  'Follow-up on a condition',
  'Medication refill',
  'Something feels off',
];

export function AceHeroComposer({ onLaunch, onVoice }: {
  onLaunch: (message: string) => void;
  onVoice: () => void;
}) {
  const [input, setInput] = useState('');
  const taRef = useRef<HTMLTextAreaElement>(null);

  const voiceCapable = typeof window !== 'undefined' &&
    !!((window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }).SpeechRecognition ||
       (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition);

  function submit() {
    const t = input.trim();
    if (t) onLaunch(t);
  }
  function autosize(el: HTMLTextAreaElement | null) {
    if (!el) return; el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 140) + 'px';
  }
  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
  }

  const MicIcon = (
    <svg className="ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
  );
  const SendIcon = (
    <svg className="ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
  );

  return (
    <div className="ace-chat">
      <style>{CHAT_CSS}</style>
      <div className="idle-start">
        <div className="idle-composer">
          <form className="composer" onSubmit={(e) => { e.preventDefault(); submit(); }} autoComplete="off" noValidate>
            <p className="intake-hint">Your first messages are free — no account needed to start.</p>
            <label htmlFor="ace-hero-q">Tell {ASSISTANT} what&rsquo;s going on</label>
            <textarea
              id="ace-hero-q" ref={taRef} rows={1} maxLength={2000}
              placeholder="Sore throat since last night"
              value={input}
              onChange={(e) => { setInput(e.target.value); autosize(e.target); }}
              onKeyDown={onKeyDown}
            />
            <div className="comp-row">
              <div className="comp-note">
                <svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
                Please don&rsquo;t include your name or birthdate here
              </div>
              {voiceCapable && (
                <button className="talk-btn" type="button" onClick={onVoice} aria-label={`Talk to ${ASSISTANT}`} title="Talk to Ace">
                  {MicIcon}<span className="talk-label">Talk</span>
                </button>
              )}
              <button className="btn" type="submit" disabled={!input.trim()}>Ask {ASSISTANT}{SendIcon}</button>
            </div>
          </form>
        </div>
        <p className="chip-kicker">Or start with this</p>
        <div className="chips" aria-label="Quick prompts">
          {CHIPS.map((c) => (
            <button key={c} className="chip" type="button" onClick={() => onLaunch(c)}>{c}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
