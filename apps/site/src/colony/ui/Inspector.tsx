import { useEffect, useRef } from 'react';
import type { Frame } from '../sim/game.ts';
import type { TermFamily, TrustView, WhyBreakdown, WhyOption } from '../sim/human-side.ts';
import { type VillagerId, villagerById } from '../sim/world-types.ts';
import { saysIt } from './Pane.tsx';
import { Portrait, ROLE_LABEL } from './parts.tsx';

const FAMILY_VAR: Record<TermFamily, string> = {
  need: 'var(--fam-need)',
  norm: 'var(--fam-norm)',
  commitment: 'var(--fam-commitment)',
  emotion: 'var(--fam-emotion)',
  social: 'var(--fam-social)',
  effort: 'var(--fam-effort)',
  suggestion: 'var(--fam-suggestion)',
  habit: 'var(--fam-habit)',
  goal: 'var(--fam-commitment)',
  other: 'var(--fam-effort)',
};

const FAMILY_LABEL: Record<TermFamily, string> = {
  need: 'needs',
  norm: 'norms',
  commitment: 'commitments',
  emotion: 'emotion',
  social: 'social',
  effort: 'effort / risk',
  suggestion: 'your voice',
  habit: 'habit',
  goal: 'goals',
  other: 'other',
};

const VERDICT_LABEL: Record<string, string> = {
  assent: 'Assented',
  notNow: 'Not now',
  complied: 'Complied under protest',
  cannot: 'Cannot',
  willNot: 'Will not',
};

/** Terms that round to zero say nothing ("belonging 0.00"); they are left out of bars and lists. */
const visible = (o: WhyOption) => o.terms.filter((t) => Math.abs(t.value) >= 0.005);

function OptionBar({ option, scale }: { option: WhyOption; scale: number }) {
  const terms = visible(option);
  const pos = terms.filter((t) => t.value > 0);
  const neg = terms.filter((t) => t.value < 0);
  const pct = (v: number) => `${((Math.abs(v) / scale) * 50).toFixed(2)}%`;
  return (
    <li className={`why-option ${option.chosen ? 'is-chosen' : ''}`}>
      <div className="why-option-head">
        <span>
          {option.chosen && <span className="chosen-dot" title="chosen" />}
          {option.label}
        </span>
        <span className="why-utility">{option.utility.toFixed(2)}</span>
      </div>
      {option.vetoed && (
        <p className={`veto veto-${option.vetoed.kind}`}>
          {option.vetoed.kind === 'willNot' ? 'Will not' : 'Cannot'}: {option.vetoed.reason}
        </p>
      )}
      <div
        className="why-bar"
        role="img"
        aria-label={terms.map((t) => `${t.label} ${t.value.toFixed(2)}`).join(', ')}
      >
        <div className="why-neg">
          {neg.map((t) => (
            <span
              key={t.source}
              style={{ width: pct(t.value), background: FAMILY_VAR[t.family] }}
              title={`${t.label} ${t.value.toFixed(2)}`}
            />
          ))}
        </div>
        <div className="why-zero" />
        <div className="why-pos">
          {pos.map((t) => (
            <span
              key={t.source}
              style={{ width: pct(t.value), background: FAMILY_VAR[t.family] }}
              title={`${t.label} +${t.value.toFixed(2)}`}
            />
          ))}
        </div>
      </div>
      <p className="why-terms">
        {terms.map((t) => (
          <span key={t.source}>
            <i style={{ background: FAMILY_VAR[t.family] }} />
            {t.label} {t.value > 0 ? '+' : ''}
            {t.value.toFixed(2)}
          </span>
        ))}
      </p>
    </li>
  );
}

export function TrustMeter({ trust }: { trust: TrustView }) {
  return (
    <div className="trust">
      <div className="trust-head">
        <span>Trust in you</span>
        <strong>{Math.round(trust.value * 100)}%</strong>
      </div>
      <div className="trust-track">
        <span style={{ width: `${trust.value * 100}%` }} />
      </div>
      {trust.history.length === 0 ? (
        <p className="muted small">Nothing has moved it yet.</p>
      ) : (
        <ul className="trust-history">
          {trust.history.slice(0, 3).map((e) => (
            <li key={`${e.minute}-${e.label}`}>
              <span className={e.delta >= 0 ? 'up' : 'down'}>
                {e.delta >= 0 ? '+' : ''}
                {Math.round(e.delta * 100)}
              </span>
              {e.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Inspector(props: {
  personId: VillagerId;
  decisionId?: string;
  why: WhyBreakdown | null;
  frame: Frame | null;
  onClose(): void;
}) {
  const v = villagerById(props.personId);
  const hv = props.frame?.human.find((h) => h.id === props.personId);
  const cu = props.frame?.classic.find((u) => u.id === props.personId);
  const why =
    props.why?.personId === props.personId &&
    (props.decisionId === undefined || props.why.decisionId === props.decisionId)
      ? props.why
      : null;
  const sheet = useRef<HTMLElement>(null);
  // Move focus into the sheet and give it back to where it came from on close.
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    sheet.current?.focus();
    return () => opener?.focus?.();
  }, []);
  const scale = Math.max(
    0.5,
    ...(why?.options ?? []).map((o) =>
      Math.max(
        o.terms.filter((t) => t.value > 0).reduce((s, t) => s + t.value, 0),
        -o.terms.filter((t) => t.value < 0).reduce((s, t) => s + t.value, 0),
      ),
    ),
  );
  const families = [...new Set((why?.options ?? []).flatMap((o) => visible(o).map((t) => t.family)))];
  return (
    <div className="sheet-backdrop">
      <button type="button" className="sheet-scrim" aria-label="Close" onClick={props.onClose} />
      <aside
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={`Why: ${v?.name ?? ''}`}
        tabIndex={-1}
        ref={sheet}
      >
        <header className="sheet-head">
          <Portrait id={props.personId} size={44} />
          <div>
            <h2>{v?.name}</h2>
            <p className="muted">
              {ROLE_LABEL[v?.role ?? 'cook']}, {v?.age}. {v?.line}
            </p>
          </div>
          <button type="button" className="icon-x" aria-label="Close" onClick={props.onClose}>
            ×
          </button>
        </header>

        <section className="sheet-now">
          <div>
            <span className="kicker">Human, now</span>
            <p>{hv?.label ?? '—'}</p>
          </div>
          <div>
            <span className="kicker">Classic, now</span>
            <p>{cu ? `${cu.label} · hunger ${cu.hunger} · hp ${cu.hp}` : '—'}</p>
          </div>
        </section>

        {hv && (
          <section className="needs">
            {hv.needs.map((n) => (
              <div className={`need ${n.urgent ? 'is-urgent' : ''}`} key={n.id}>
                <span>{n.label}</span>
                <span className="need-track">
                  <span style={{ width: `${Math.round(n.value * 100)}%` }} />
                </span>
              </div>
            ))}
            {hv.emotion && (
              <p className="emotion">
                Feels <b>{hv.emotion.label}</b>
                {hv.emotion.target ? ` about ${hv.emotion.target}` : ''}
              </p>
            )}
          </section>
        )}

        <section className="why">
          <h3>Why?</h3>
          {!why ? (
            <p className="muted">Reading the decision…</p>
          ) : (
            <>
              {why.verdict && (
                <p className={`verdict-line verdict-${why.verdict.kind}`}>
                  <b>{VERDICT_LABEL[why.verdict.kind]}</b> “{why.verdict.says}”
                  {why.verdict.counterOffer && !saysIt(why.verdict.says, why.verdict.counterOffer) && (
                    <em> {why.verdict.counterOffer}</em>
                  )}
                </p>
              )}
              <p className="narration">{why.narration}</p>
              <ol className="why-options">
                {why.options.slice(0, 3).map((o) => (
                  <OptionBar key={o.affordanceId} option={o} scale={scale} />
                ))}
              </ol>
              {families.length > 0 && (
                <p className="legend">
                  {families.map((f) => (
                    <span key={f}>
                      <i style={{ background: FAMILY_VAR[f] }} />
                      {FAMILY_LABEL[f]}
                    </span>
                  ))}
                </p>
              )}
              {why.deltas.length > 0 && (
                <table className="deltas">
                  <thead>
                    <tr>
                      <th>Need</th>
                      <th>Advertised</th>
                      <th>Believed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {why.deltas.map((d) => (
                      <tr key={d.need}>
                        <td>{d.need}</td>
                        <td>{d.advertised.toFixed(2)}</td>
                        <td>{d.believed.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {why.recalled.map((r) => (
                <blockquote key={r}>remembers: {r}</blockquote>
              ))}
            </>
          )}
        </section>

        <section>{hv && <TrustMeter trust={hv.trust} />}</section>
      </aside>
    </div>
  );
}
