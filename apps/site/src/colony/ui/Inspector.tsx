import { useEffect, useRef, useState } from 'react';
import type { TermFamily, TrustView, WhyBreakdown, WhyOption } from '../sim/human-side.ts';
import { type VillagerId, villagerById } from '../sim/world-types.ts';
import { ConstructionReadout } from './Construction.tsx';
import { type Frame, NO_CONCEPT } from './contract.ts';
import { namedDescription, needDescription, trustDescription } from './descriptions.ts';
import { Icon, NoConcept } from './Icon.tsx';
import { saysIt } from './Pane.tsx';
import { Portrait, ROLE_LABEL, shortName } from './parts.tsx';
import { wellWords as settingWords } from './words.ts';

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
  norm: 'beliefs about right and wrong',
  commitment: 'commitments',
  emotion: 'emotion',
  social: 'social',
  effort: 'effort and danger',
  suggestion: 'your voice',
  habit: 'habit',
  goal: 'goals',
  other: 'other',
};

const VERDICT_LABEL: Record<string, string> = {
  assent: 'Agreed',
  notNow: 'Not now',
  complied: 'Complied under protest',
  cannot: 'Cannot',
  willNot: 'Will not',
};

/** Terms that round to zero say nothing ("belonging 0.00"); they are left out of bars and lists. */
const visible = (o: WhyOption) => o.terms.filter((t) => Math.abs(t.value) >= 0.005);

function OptionBar({ option }: { option: WhyOption }) {
  const terms = visible(option);
  return (
    <li className={`why-option ${option.chosen ? 'is-chosen' : ''}`}>
      <div className="why-option-head">
        <span>
          {option.chosen ? 'Chose: ' : 'Considered: '}
          {settingWords(option.label)}
        </span>
      </div>
      {option.vetoed && (
        <p className={`veto veto-${option.vetoed.kind}`}>
          {option.vetoed.kind === 'willNot' ? 'Will not' : 'Cannot'}: {settingWords(option.vetoed.reason)}
        </p>
      )}
      <p className="why-terms">
        {terms.map((t) => (
          <span key={t.source}>
            <i style={{ background: FAMILY_VAR[t.family] }} />
            {settingWords(t.label)}: {t.value > 0 ? 'draws them toward this' : 'holds them back'}
          </span>
        ))}
      </p>
    </li>
  );
}

export function TrustMeter({ trust, name }: { trust: TrustView; name?: string }) {
  return (
    <div className="trust">
      <p>
        {name ? `${name}’s trust in you:` : 'This person’s trust in you:'}{' '}
        <strong>
          {name ? namedDescription(trustDescription(trust.value), name) : trustDescription(trust.value)}
        </strong>
      </p>
      {trust.history.length === 0 ? (
        <p className="muted small">No retained trust change is shown.</p>
      ) : (
        <ul className="trust-history">
          {trust.history.slice(0, 3).map((e) => (
            <li key={`${e.minute}-${e.label}`}>
              <span className={e.delta >= 0 ? 'up' : 'down'}>{e.delta >= 0 ? 'Reassured' : 'Less sure'}</span>
              {settingWords(e.label)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Meter({ label, value, max = 100 }: { label: string; value: number; max?: number }) {
  const fraction = value / max;
  const words = fraction < 0.35 ? 'low' : fraction < 0.7 ? 'moderate' : 'high';
  return (
    <div className="need">
      <span>{settingWords(label)}</span>
      <span className="need-description">{words}</span>
    </div>
  );
}

/**
 * The inspector (item 11): a modal `<dialog>`. The left column is everything a Classic unit has; the right
 * column is the Human person. For each row the Human has and Classic lacks, the Classic cell says so.
 */
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
  const [showWhy, setShowWhy] = useState(false);
  const why =
    props.why?.personId === props.personId &&
    (props.decisionId === undefined || props.why.decisionId === props.decisionId)
      ? props.why
      : null;
  const dialog = useRef<HTMLDialogElement>(null);
  const { onClose } = props;
  useEffect(() => {
    const d = dialog.current;
    if (!d) return undefined;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!d.open) d.showModal();
    const onCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    d.addEventListener('cancel', onCancel);
    return () => {
      d.removeEventListener('cancel', onCancel);
      if (d.open) d.close();
      opener?.focus?.();
    };
  }, [onClose]);
  const families = [...new Set((why?.options ?? []).flatMap((o) => visible(o).map((t) => t.family)))];
  return (
    <dialog
      className="sheet inspector"
      ref={dialog}
      aria-label={settingWords(`Inspect ${v?.name ?? ''}`)}
      onClick={(e) => {
        // A click on the backdrop lands on the dialog element itself.
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={() => undefined}
    >
      <header className="sheet-head">
        <Portrait id={props.personId} size={44} />
        <div>
          <h2>{settingWords(v?.name)}</h2>
          <p className="muted">
            {ROLE_LABEL[v?.role ?? 'cook']}, {v?.age}. {v?.line}
          </p>
        </div>
        <button type="button" className="icon-x" aria-label="Close" onClick={onClose}>
          ×
        </button>
      </header>

      <div className="inspector-cols">
        <section className="inspector-classic" aria-label="Classic unit">
          <span className="kicker">Classic unit</span>
          <p className="inspector-now">
            {cu?.label ?? '–'}
            {cu?.rush && <span className="flag">rush</span>}
          </p>
          {props.frame && (
            <ConstructionReadout world={props.frame.classicWorld} side="Classic" personId={props.personId} />
          )}
          {cu && (
            <div className="needs">
              <Meter label="Hunger" value={cu.hunger} />
              <Meter label="HP" value={cu.hp} />
            </div>
          )}
          <p className="inspector-caption">
            That is all a Classic unit has.{' '}
            <span className="no-concept-mark">
              <Icon name="none" />
            </span>{' '}
            = {settingWords(NO_CONCEPT.toLowerCase())}.
          </p>
          <dl className="no-concept-list">
            {['Needs', 'Emotion', 'Trust in you', 'Why', 'Memories'].map((row) => (
              <div key={row}>
                <dt>{settingWords(row)}</dt>
                <dd>
                  <NoConcept text={NO_CONCEPT} />
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="inspector-human" aria-label="Human person">
          <span className="kicker">Human person</span>
          <p className="inspector-now">
            {hv?.label ?? '–'}{' '}
            <button
              type="button"
              className="why-info"
              aria-label="Why this decision"
              aria-expanded={showWhy}
              onClick={() => setShowWhy(!showWhy)}
            >
              i
            </button>
          </p>
          {props.frame && (
            <ConstructionReadout world={props.frame.humanWorld} side="Human" personId={props.personId} />
          )}
          {hv && (
            <div className="needs">
              {[...hv.needs]
                .sort(
                  (a, b) =>
                    (b.id === 'injury' && b.value < 1 ? 1 : 0) - (a.id === 'injury' && a.value < 1 ? 1 : 0),
                )
                .map((n) => (
                  <div className={`need ${n.urgent ? 'is-urgent' : ''}`} key={n.id}>
                    <span>{settingWords(n.label)}</span>
                    <span className="need-description">
                      {namedDescription(needDescription(n.id, n.value), shortName(props.personId))}
                    </span>
                  </div>
                ))}
              <p className="emotion">
                {shortName(props.personId)} feels <b>{hv.emotion?.label ?? 'calm'}</b>
                {settingWords(hv.emotion?.target ? ` about ${hv.emotion.target}` : '')}
              </p>
            </div>
          )}
          {hv && <TrustMeter trust={hv.trust} name={shortName(props.personId)} />}

          {showWhy && (
            <section className="why">
              <h3>Why</h3>
              {!why ? (
                <p className="muted">Reading the decision…</p>
              ) : (
                <>
                  {why.verdict && (
                    <p className={`verdict-line verdict-${why.verdict.kind}`}>
                      <b>{settingWords(VERDICT_LABEL[why.verdict.kind])}</b> “{settingWords(why.verdict.says)}
                      ”
                      {why.verdict.counterOffer && !saysIt(why.verdict.says, why.verdict.counterOffer) && (
                        <em> {settingWords(why.verdict.counterOffer)}</em>
                      )}
                    </p>
                  )}
                  <p className="narration">
                    {settingWords(why.narration).replace('the villager', shortName(props.personId))}
                  </p>
                  <ol className="why-options">
                    {why.options.slice(0, 3).map((o) => (
                      <OptionBar key={o.affordanceId} option={o} />
                    ))}
                  </ol>
                  {families.length > 0 && (
                    <p className="legend">
                      {families.map((f) => (
                        <span key={f}>
                          <i style={{ background: FAMILY_VAR[f] }} />
                          {settingWords(FAMILY_LABEL[f])}
                        </span>
                      ))}
                    </p>
                  )}
                  {why.deltas.length > 0 && (
                    <table className="deltas">
                      <thead>
                        <tr>
                          <th>Need</th>
                          <th>Possible effect</th>
                          <th>Expected effect</th>
                        </tr>
                      </thead>
                      <tbody>
                        {why.deltas.map((d) => (
                          <tr key={d.need}>
                            <td>{settingWords(d.need)}</td>
                            <td>
                              {d.advertised > 0 ? 'May help' : d.advertised < 0 ? 'May strain' : 'No change'}
                            </td>
                            <td>
                              {d.believed > 0
                                ? 'Expects relief'
                                : d.believed < 0
                                  ? 'Expects strain'
                                  : 'Expects no change'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  <h3>Memories</h3>
                  {why.recalled.length === 0 ? (
                    <p className="muted small">
                      {shortName(props.personId)} recalled no memories for this decision.
                    </p>
                  ) : (
                    why.recalled.map((r) => <blockquote key={r}>Remembers {settingWords(r)}</blockquote>)
                  )}
                </>
              )}
            </section>
          )}
        </section>
      </div>
    </dialog>
  );
}
