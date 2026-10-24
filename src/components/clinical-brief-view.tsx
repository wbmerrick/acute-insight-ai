import type { Acuity, ClinicalBrief, Disposition } from '@/lib/clinical-brief';

/* ────────────────────────────────────────────────────────────────────────────
   Presentational views for a ClinicalBrief — shared by the /demo showcase, the
   patient complete screen (DispositionCard), and the provider dashboard
   (ProviderNote). One look everywhere.
   ──────────────────────────────────────────────────────────────────────────── */

export function acuityMeta(level: Acuity): { tag: string; h: string } {
  switch (level) {
    case 'emergency': return { tag: 'Emergency', h: 'var(--destructive)' };
    case 'urgent': return { tag: 'Urgent', h: 'var(--warning)' };
    case 'telehealth': return { tag: 'Telehealth', h: 'var(--primary)' };
    case 'routine': return { tag: 'Routine', h: 'var(--primary)' };
    case 'selfcare': return { tag: 'Self-care', h: 'var(--primary)' };
  }
}

const likelihoodMeta: Record<string, { label: string; h: string }> = {
  higher: { label: 'Higher', h: 'var(--warning)' },
  possible: { label: 'Possible', h: 'var(--primary)' },
  consider: { label: 'Consider', h: 'var(--text-dim)' },
};

export function DispositionCard({ disposition: d }: { disposition: Disposition }) {
  const m = acuityMeta(d.level);
  return (
    <div className="rounded-2xl p-6" style={{ background: 'hsl(var(--card))', border: `1px solid hsl(${m.h} / 0.4)`, boxShadow: `0 0 40px hsl(${m.h} / 0.08)` }}>
      <div className="flex items-center gap-2.5 mb-4">
        <span className="w-2 h-2 rounded-full" style={{ background: `hsl(${m.h})`, boxShadow: `0 0 8px hsl(${m.h})` }} />
        <span className="font-mono text-xs tracking-widest uppercase" style={{ color: `hsl(${m.h})` }}>{m.tag} · next step</span>
      </div>
      <h4 className="text-foreground font-bold mb-1" style={{ fontFamily: 'var(--font-heading)', fontSize: '1.35rem' }}>{d.label}</h4>
      {d.timeframe && <p className="font-mono text-xs mb-4" style={{ color: 'hsl(var(--text-dimmer))' }}>Recommended timeframe: {d.timeframe}</p>}
      {d.rationale && <p className="text-[15px] leading-relaxed mb-4" style={{ color: 'hsl(var(--text-dim))' }}>{d.rationale}</p>}
      {d.safetyNet && (
        <div className="rounded-xl p-4 flex gap-3" style={{ background: 'hsl(var(--destructive) / 0.07)', border: '1px solid hsl(var(--destructive) / 0.28)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--destructive))" strokeWidth="2" className="shrink-0 mt-0.5"><path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /></svg>
          <p className="text-sm leading-relaxed" style={{ color: 'hsl(var(--foreground) / 0.9)' }}><span className="font-semibold" style={{ color: 'hsl(var(--destructive))' }}>Safety net: </span>{d.safetyNet}</p>
        </div>
      )}
    </div>
  );
}

function NoteBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="font-mono text-[11px] tracking-widest uppercase mb-2" style={{ color: 'hsl(var(--primary))' }}>{label}</div>
      <div className="text-[14.5px] leading-relaxed" style={{ color: 'hsl(var(--text-dim))' }}>{children}</div>
    </div>
  );
}

export function ProviderNote({ brief }: { brief: ClinicalBrief }) {
  const dm = acuityMeta(brief.disposition.level);
  const n = brief.note;
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--primary) / 0.28)', boxShadow: '0 0 50px hsl(var(--primary) / 0.08)' }}>
      <div className="px-6 py-4 flex items-center justify-between flex-wrap gap-2" style={{ borderBottom: '1px solid hsl(var(--border-subtle))', background: 'hsl(var(--surface-deeper))' }}>
        <div className="flex items-center gap-2.5">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
          <span className="font-mono text-xs tracking-wide" style={{ color: 'hsl(var(--text-dim))' }}>PROVIDER VIEW · pre-visit brief</span>
        </div>
        <span className="font-mono text-[11px] px-2.5 py-1 rounded-md uppercase tracking-wider" style={{ color: `hsl(${dm.h})`, background: `hsl(${dm.h} / 0.12)`, border: `1px solid hsl(${dm.h} / 0.35)` }}>{dm.tag}</span>
      </div>

      <div className="p-6 flex flex-col gap-6">
        {brief.flags.length > 0 && (
          <div className="rounded-xl p-4" style={{ background: 'hsl(var(--warning) / 0.08)', border: '1px solid hsl(var(--warning) / 0.3)' }}>
            <div className="font-mono text-[11px] tracking-widest uppercase mb-2 flex items-center gap-2" style={{ color: 'hsl(var(--warning))' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><path d="M4 22v-7" /></svg>
              Flagged for you
            </div>
            <ul className="flex flex-col gap-1.5">
              {brief.flags.map((f, i) => (
                <li key={i} className="text-sm flex gap-2" style={{ color: 'hsl(var(--foreground) / 0.92)' }}><span style={{ color: 'hsl(var(--warning))' }}>›</span>{f}</li>
              ))}
            </ul>
          </div>
        )}

        {n.plan.length > 0 && (
          <NoteBlock label="Plan">
            <ul className="flex flex-col gap-1.5">
              {n.plan.map((p, i) => (<li key={i} className="flex gap-2"><span style={{ color: 'hsl(var(--primary))' }}>›</span><span>{p}</span></li>))}
            </ul>
          </NoteBlock>
        )}
        {n.assessment && <NoteBlock label="Assessment">{n.assessment}</NoteBlock>}
        {n.objective.length > 0 && (
          <NoteBlock label="Objective — to obtain at visit">
            <ul className="flex flex-wrap gap-x-5 gap-y-1.5">
              {n.objective.map((o, i) => (<li key={i} className="flex gap-2"><span style={{ color: 'hsl(var(--text-dimmer))' }}>·</span>{o}</li>))}
            </ul>
          </NoteBlock>
        )}
        {n.hpi && <NoteBlock label="HPI">{n.hpi}</NoteBlock>}

        {brief.differential.length > 0 && (
          <div>
            <div className="font-mono text-[11px] tracking-widest uppercase mb-3" style={{ color: 'hsl(var(--primary))' }}>Differential — for your review</div>
            <div className="flex flex-col gap-2.5">
              {brief.differential.map((d, i) => {
                const lm = likelihoodMeta[d.likelihood] ?? likelihoodMeta.consider;
                return (
                  <div key={i} className="flex items-start gap-3 rounded-lg p-3" style={{ background: 'hsl(var(--surface-deeper))', border: '1px solid hsl(var(--border-subtle))' }}>
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded shrink-0 mt-0.5 uppercase tracking-wide" style={{ color: `hsl(${lm.h})`, background: `hsl(${lm.h} / 0.12)`, border: `1px solid hsl(${lm.h} / 0.3)` }}>{lm.label}</span>
                    <div>
                      <div className="text-sm font-semibold text-foreground">{d.condition}</div>
                      {d.rationale && <div className="text-[13px] mt-0.5" style={{ color: 'hsl(var(--text-dimmer))' }}>{d.rationale}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {brief.workup.length > 0 && (
          <div>
            <div className="font-mono text-[11px] tracking-widest uppercase mb-3" style={{ color: 'hsl(var(--primary))' }}>Suggested workup</div>
            <div className="flex flex-col gap-2">
              {brief.workup.map((w, i) => (
                <div key={i} className="flex items-baseline justify-between gap-4 pb-2" style={{ borderBottom: i < brief.workup.length - 1 ? '1px solid hsl(var(--border-subtle) / 0.6)' : 'none' }}>
                  <span className="text-sm text-foreground">{w.item}</span>
                  {w.rationale && <span className="text-[12px] text-right shrink-0" style={{ color: 'hsl(var(--text-dimmer))', maxWidth: '55%' }}>{w.rationale}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="px-6 py-3.5 flex items-center gap-2.5" style={{ borderTop: '1px solid hsl(var(--border-subtle))', background: 'hsl(var(--surface-deeper))' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--text-dimmer))" strokeWidth="2" className="shrink-0"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>
        <p className="text-[12px] leading-snug" style={{ color: 'hsl(var(--text-dimmer))' }}>
          AI-prepared draft from the patient’s own words. The clinician reviews, edits, and decides — Acute Insight does not diagnose, order, or prescribe.
        </p>
      </div>
    </div>
  );
}
