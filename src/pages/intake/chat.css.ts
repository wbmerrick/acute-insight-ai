/**
 * Chat styles ported from iSpry's chat, scoped under `.ace-chat` and remapped
 * to Acute Insight's "Telemetry" color tokens. Structure/behavior are identical
 * to iSpry; only the palette differs.
 *
 * Token map (iSpry → Acute): --acc lime → --primary green; --ink → --primary-
 * foreground; --tx → --foreground; --mut2 → --text-dimmer; --line/--line2 →
 * --border-subtle; assistant bubble/shell → --card; dock → --surface-deeper;
 * --red → --destructive. Fonts → Acute's sans/mono.
 */
export const CHAT_CSS = `
.ace-chat{width:100%;display:flex;flex-direction:column;align-items:center}
.ace-chat .sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}

.ace-chat .idle-start{width:100%;max-width:900px;display:flex;flex-direction:column;align-items:center;gap:14px}
.ace-chat .idle-start.hide{display:none}
.ace-chat .idle-composer{width:100%;max-width:900px;text-align:left;background:hsl(var(--card));border:1px solid hsl(var(--primary) / .28);border-radius:28px;padding:20px 16px 14px 26px;display:flex;flex-direction:column;gap:12px;transition:border-color .2s,box-shadow .25s;box-shadow:0 0 0 0 hsl(var(--primary) / 0),var(--shadow-lg)}
.ace-chat .idle-composer:focus-within{border-color:hsl(var(--primary));box-shadow:0 0 0 8px hsl(var(--primary) / .12),var(--shadow-xl)}

.ace-chat .composer{background:transparent;border:0;border-radius:0;padding:0;display:flex;flex-direction:column;gap:12px;width:100%}
.ace-chat .composer label{color:hsl(var(--text-dimmer));font-size:12px;font-family:var(--font-mono)}
.ace-chat .composer textarea{width:100%;resize:none;background:transparent;border:0;color:hsl(var(--foreground));font:clamp(17px,2.2vw,20px)/1.4 var(--font-sans);padding:0 8px 0 0;min-height:34px;max-height:140px;outline:none}
.ace-chat .composer textarea::placeholder{color:hsl(var(--text-dimmer))}
.ace-chat .composer textarea:focus-visible{outline:2px solid hsl(var(--primary));outline-offset:3px}
.ace-chat .intake-hint{margin:0;padding:0 8px 2px 0;font:12px var(--font-mono);color:hsl(var(--text-dimmer));min-height:16px}
.ace-chat .intake-hint.err{color:hsl(var(--destructive))}

.ace-chat .comp-row{display:flex;align-items:center;gap:10px}
.ace-chat .comp-note{display:flex;align-items:center;gap:8px;flex:1;font:12px var(--font-mono);color:hsl(var(--text-dimmer))}

.ace-chat .btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:48px;padding:0 20px;border-radius:999px;border:0;background:hsl(var(--primary));color:hsl(var(--primary-foreground));font:600 15px var(--font-heading);cursor:pointer;transition:filter .15s;box-shadow:0 0 18px hsl(var(--primary) / .35)}
.ace-chat .btn:hover{filter:brightness(1.08)}
.ace-chat .btn:disabled{opacity:.5;cursor:not-allowed;box-shadow:none}
.ace-chat .btn-ghost{background:transparent;color:hsl(var(--foreground));border:1px solid hsl(var(--border-subtle));box-shadow:none}
.ace-chat .btn-ghost:hover{border-color:hsl(var(--foreground) / .4);filter:none}
.ace-chat .btn-red{background:hsl(var(--destructive));color:#fff;box-shadow:none}

.ace-chat .icon-btn{width:48px;height:48px;border-radius:24px;border:1px solid hsl(var(--border-subtle));background:transparent;color:hsl(var(--foreground));display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0}
.ace-chat .icon-btn:hover{background:hsl(var(--card))}
.ace-chat .icon-btn.speak-on{border-color:hsl(var(--primary) / .5);color:hsl(var(--primary))}
.ace-chat .icon-btn.speaking{background:hsl(var(--primary) / .14);border-color:hsl(var(--primary));color:hsl(var(--primary))}

.ace-chat .talk-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:48px;padding:0 18px;border-radius:999px;border:1px solid hsl(var(--border-subtle));background:transparent;color:hsl(var(--foreground));font:600 15px var(--font-sans);cursor:pointer;transition:background .15s,border-color .15s,color .15s}
.ace-chat .talk-btn:hover{background:hsl(var(--card))}
.ace-chat .talk-btn.rec{background:hsl(var(--destructive));border-color:hsl(var(--destructive));color:#fff}
.ace-chat .talk-btn:disabled{opacity:.45;cursor:not-allowed}
.ace-chat .talk-btn .talk-label{letter-spacing:.02em}

.ace-chat .voice-line{display:none;align-items:center;gap:8px;min-height:20px;font:13px var(--font-mono);letter-spacing:.06em;text-transform:uppercase;color:hsl(var(--text-dimmer))}
.ace-chat .voice-line.on{display:flex}
.ace-chat .voice-line .dot{width:8px;height:8px;border-radius:4px;background:hsl(var(--primary))}
.ace-chat .voice-line.listening .dot{background:hsl(var(--destructive));animation:acePulse 1.2s infinite}
.ace-chat .voice-line.speaking .dot{animation:acePulse 1.6s infinite}

.ace-chat .chip-kicker{margin:4px 0 0;color:hsl(var(--primary));font:12px var(--font-mono);text-transform:uppercase;letter-spacing:.08em}
.ace-chat .chips{display:flex;flex-wrap:wrap;justify-content:center;gap:10px;width:100%}
.ace-chat .chip{min-height:44px;padding:0 18px;border-radius:22px;border:1px solid hsl(var(--border-subtle));background:hsl(var(--card) / .75);color:hsl(var(--foreground));font:15px var(--font-sans);cursor:pointer;transition:border-color .15s,background .15s}
.ace-chat .chip:hover{border-color:hsl(var(--primary));background:hsl(var(--primary) / .08)}

.ace-chat .chat-shell{display:none;width:100%;max-width:900px;flex-direction:column;gap:0;text-align:left;background:hsl(var(--card));border:1px solid hsl(var(--primary) / .28);border-radius:28px;overflow:hidden;box-shadow:0 0 44px hsl(var(--primary) / .1),var(--shadow-lg)}
.ace-chat .chat-shell.on{display:flex}
.ace-chat .thread{display:flex;width:100%;padding:20px 20px 8px;text-align:left;flex-direction:column;gap:14px}
.ace-chat .thread-head{display:flex;align-items:center;justify-content:space-between;gap:12px;color:hsl(var(--text-dimmer))}
.ace-chat .thread-head .who{display:flex;align-items:center;gap:10px;font:13px var(--font-mono)}
.ace-chat .thread-head .who .ic{color:hsl(var(--primary))}
.ace-chat .msgs{display:flex;flex-direction:column;gap:14px;max-height:min(52vh,560px);min-height:140px;overflow-y:auto;padding-right:4px;scroll-behavior:smooth}
.ace-chat .msg{max-width:86%;padding:14px 18px;border-radius:20px;font-size:16px;line-height:1.55;white-space:normal;word-wrap:break-word}
.ace-chat .msg.u{align-self:flex-end;background:hsl(var(--primary));color:hsl(var(--primary-foreground));border-bottom-right-radius:6px}
.ace-chat .msg.a{align-self:flex-start;background:hsl(var(--surface-deeper));border:1px solid hsl(var(--border-subtle));border-bottom-left-radius:6px;color:hsl(var(--foreground))}
.ace-chat .msg.a ul{margin:8px 0;padding-left:20px}
.ace-chat .msg.a li{margin:3px 0}
.ace-chat .msg p{margin:0 0 8px}.ace-chat .msg p:last-child{margin:0}
.ace-chat .typing{display:inline-flex;gap:6px;align-items:center;height:20px}
.ace-chat .typing i{width:8px;height:8px;border-radius:4px;background:hsl(var(--primary));animation:aceDot 1.1s infinite}
.ace-chat .typing i:nth-child(2){animation-delay:.15s}.ace-chat .typing i:nth-child(3){animation-delay:.3s}

.ace-chat .chat-dock{border-top:1px solid hsl(var(--border-subtle));padding:16px 18px 18px;background:hsl(var(--surface-deeper));display:flex;flex-direction:column;gap:12px}

.ace-chat .emerg,.ace-chat .ready,.ace-chat .member-card{align-self:stretch;background:hsl(var(--surface-deeper));border:1px solid hsl(var(--border-subtle));border-radius:18px;padding:16px 18px;display:flex;flex-direction:column;gap:10px}
.ace-chat .emerg{border-color:hsl(var(--destructive) / .5)}
.ace-chat .emerg h2{font:700 18px var(--font-heading);color:hsl(var(--destructive));margin:0}
.ace-chat .ready h2{font:700 18px var(--font-heading);color:hsl(var(--foreground));margin:0}
.ace-chat .emerg .row{display:flex;gap:10px;flex-wrap:wrap}
.ace-chat .emerg .mono,.ace-chat .ready .mono{font:12px var(--font-mono);text-transform:uppercase;letter-spacing:.08em}

@keyframes acePulse{0%,100%{opacity:1}50%{opacity:.35}}
@keyframes aceDot{0%,100%{transform:translateY(0);opacity:.4}50%{transform:translateY(-4px);opacity:1}}
@media (max-width:640px){
  .ace-chat .comp-note{display:none}
  .ace-chat .comp-row{justify-content:flex-end}
  .ace-chat .msg{max-width:94%}
  .ace-chat .idle-composer{padding:16px 12px 12px 18px;border-radius:22px}
  .ace-chat .chat-shell{border-radius:22px}
  .ace-chat .chat-dock{padding:14px}
}
@media (prefers-reduced-motion: reduce){
  .ace-chat .typing i,.ace-chat .voice-line .dot{animation:none}
}
`;
