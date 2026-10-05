/**
 * The composer (voice.md §6): leaning, options ranked by his own utility, the prefill line, Mention / Urge, Insist
 * with its price, one optional reason, a live telegraph of his answer, then Say it or Say nothing.
 * Keyboard: 1–6 pick an option, M / U strength, I insist, D H S A T reasons, Enter says it, Esc says nothing.
 */
import { memo, useEffect, useRef, useState } from 'react';
import type { Appeal, Draft, Frame, Prefill, Strength, Telegraph } from '../protocol.ts';
import { Icon, STRENGTH_ICON, TONE_ICON, TONE_WORD } from './Icon.tsx';
import { APPEALS, appealLabel, INSIST_PRICE, STRENGTHS, toneClass } from './parts.tsx';

const fromPrefill = (p: Prefill): Draft => ({
  optionId: p.optionId,
  strength: p.strength,
  insist: false,
  ...(p.appeal ? { appeal: p.appeal } : {}),
});

const sameDraft = (a: Draft | null, b: Draft | null) =>
  a === b ||
  (a !== null &&
    b !== null &&
    a.optionId === b.optionId &&
    a.strength === b.strength &&
    a.insist === b.insist &&
    a.appeal === b.appeal);

function TelegraphLine({ telegraph }: { telegraph: Telegraph | null }) {
  if (!telegraph) return <p className="v-telegraph is-empty">Pick something to hear how he’d answer.</p>;
  return (
    <p className={`v-telegraph ${toneClass(telegraph.tone)}`} aria-live="polite">
      {telegraph.tone && (
        <Icon
          name={TONE_ICON[telegraph.tone]}
          label={TONE_WORD[telegraph.tone]}
          className={`v-verdict-icon tone-icon-${telegraph.tone}`}
        />
      )}
      <span className="v-telegraph-kind">{telegraph.text}</span>
      {/* The kind line usually quotes him already; show the quote and counter-offer only when it doesn't. */}
      {telegraph.says && !telegraph.text.includes(telegraph.says) && (
        <span className="v-telegraph-says">“{telegraph.says}”</span>
      )}
      {telegraph.counter && !telegraph.text.includes(telegraph.counter) && (
        <em className="v-telegraph-counter">{telegraph.counter}</em>
      )}
    </p>
  );
}

/** The frame fields the composer reads, passed one by one so `memo` can compare them. */
export type ComposerFields = Pick<Frame, 'composer' | 'options' | 'muted'> & {
  prefill: Frame['prefill'];
  leaning: Frame['leaning'];
  /** What he is doing, for the closed line while he is busy. */
  doingLabel: string | undefined;
};

export const Composer = memo(function Composer({
  composer,
  prefill,
  options,
  leaning,
  muted,
  doingLabel,
  telegraph,
  whyOpen,
  onPredict,
  onSuggest,
  onSayNothing,
}: ComposerFields & {
  telegraph: { draft: Draft; telegraph: Telegraph } | null;
  whyOpen: boolean;
  onPredict: (d: Draft | null) => void;
  onSuggest: (d: Draft) => void;
  onSayNothing: () => void;
}) {
  const open = composer.open && !muted;
  const [draft, setDraft] = useState<Draft | null>(null);
  const [touched, setTouched] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const touchedRef = useRef(touched);
  touchedRef.current = touched;

  const prefillKey = open ? (prefill ? `${prefill.optionId}|${prefill.why}` : 'none') : 'closed';
  const prefillRef = useRef(prefill);
  prefillRef.current = prefill;
  const optionIds = options.map((o) => o.id).join('|');

  // A new prefill (or the composer opening) resets the draft, unless the player is mid-edit on an option
  // that is still on offer.
  // biome-ignore lint/correctness/useExhaustiveDependencies: keyed on the prefill identity only.
  useEffect(() => {
    const d = draftRef.current;
    const stillOffered = d && optionIds.split('|').includes(d.optionId);
    if (prefillKey !== 'closed' && touchedRef.current && stillOffered) return;
    setTouched(false);
    const p = prefillRef.current;
    setDraft(p && prefillKey !== 'closed' ? fromPrefill(p) : null);
  }, [prefillKey]);

  // Drop a draft whose option is no longer on offer.
  useEffect(() => {
    if (draft && !optionIds.split('|').includes(draft.optionId)) setDraft(null);
  }, [optionIds, draft]);

  // Live telegraph, debounced 100 ms.
  useEffect(() => {
    if (!open) {
      onPredict(null);
      return undefined;
    }
    const t = window.setTimeout(() => onPredict(draft), 100);
    return () => window.clearTimeout(t);
  }, [draft, open, onPredict]);

  const edit = (patch: Partial<Draft>) => {
    setTouched(true);
    setDraft((d) => {
      const base: Draft = d ?? { optionId: options[0]?.id ?? '', strength: 'mention', insist: false };
      const next = { ...base, ...patch };
      if ('appeal' in patch && patch.appeal === undefined) delete next.appeal;
      return next;
    });
  };
  const pick = (optionId: string) => edit({ optionId });
  const setStrength = (strength: Strength) => edit({ strength });
  const toggleInsist = () => edit({ insist: !(draftRef.current?.insist ?? false) });
  const toggleAppeal = (a: Appeal) => edit({ appeal: draftRef.current?.appeal === a ? undefined : a });

  const confirm = () => {
    const d = draftRef.current;
    if (!d?.optionId) return;
    onSuggest(d);
    setDraft(null);
    setTouched(true);
    setExpanded(false);
  };
  const sayNothing = () => {
    setDraft(null);
    setTouched(true);
    setExpanded(false);
    onSayNothing();
  };

  // Composer keys, only while it is open.
  const handlers = useRef({
    pick,
    setStrength,
    toggleInsist,
    toggleAppeal,
    confirm,
    sayNothing,
    options,
    whyOpen,
  });
  handlers.current = { pick, setStrength, toggleInsist, toggleAppeal, confirm, sayNothing, options, whyOpen };
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      // Enter and Esc: a focused control in a sheet, card or the tabs keeps its own keys. Anywhere else
      // (the page, the top bar after a click), Enter says it and Esc says nothing. Letters and digits have no
      // other meaning here.
      const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      if (active instanceof HTMLSelectElement || active instanceof HTMLInputElement) return;
      if (active instanceof HTMLTextAreaElement) return;
      const inSheet = active?.closest('.v-why, .v-standing, .v-overlay, .v-tabs');
      if (inSheet && (e.key === 'Enter' || e.key === 'Escape')) return;
      // Game design review (GD4): after a mouse click the clicked option keeps focus, so Enter used to re-pick it
      // and never send. A pressed option, a strength, insist or reason button sends on Enter; an option not yet
      // picked, the peek toggle and the commit buttons keep their own Enter.
      if (e.key === 'Enter' && active instanceof HTMLButtonElement && active.closest('.v-composer')) {
        const sends =
          active.closest('.v-seg, .v-appeals') ||
          active.classList.contains('v-insist') ||
          (active.classList.contains('v-option') && active.getAttribute('aria-pressed') === 'true');
        if (!sends) return;
      }
      const h = handlers.current;
      const k = e.key;
      if (/^[1-6]$/.test(k)) {
        const o = h.options[Number(k) - 1];
        if (o) {
          e.preventDefault();
          h.pick(o.id);
        }
        return;
      }
      const upper = k.toUpperCase();
      if (upper === 'M') h.setStrength('mention');
      else if (upper === 'U') h.setStrength('urge');
      else if (upper === 'I') h.toggleInsist();
      else if (k === 'Enter') {
        // Focus may be on a top-bar button; its click must not fire as well.
        e.preventDefault();
        h.confirm();
        return;
      } else if (k === 'Escape') {
        if (h.whyOpen) return;
        h.sayNothing();
      } else {
        const appeal = APPEALS.find((a) => a.key === upper);
        if (!appeal) return;
        h.toggleAppeal(appeal.id);
      }
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (muted) {
    return (
      <div className="v-composer is-muted" role="status">
        <p className="v-muted-line">You are silent today. Watch.</p>
      </div>
    );
  }

  if (!open) {
    const text =
      composer.reason === 'asleep'
        ? `Asleep${composer.until ? ` until about ${composer.until}` : ''}`
        : composer.reason === 'busy'
          ? `${doingLabel ? capital(doingLabel) : 'Busy'}${composer.until ? ` until ${composer.until}` : ''}`
          : 'He isn’t at a decision right now.';
    return (
      <div className="v-composer is-closed" role="status">
        <p className="v-closed-line">{text}</p>
        <p className="v-closed-sub">You can speak when he is awake and choosing.</p>
      </div>
    );
  }

  const leaningOpt = options.find((o) => o.id === leaning?.optionId) ?? options.find((o) => o.leaning);
  const selected = options.find((o) => o.id === draft?.optionId);
  const shownTelegraph = telegraph && sameDraft(telegraph.draft, draft) ? telegraph.telegraph : null;
  const fromPrefillNow = prefill && !touched && draft && draft.optionId === prefill.optionId;

  return (
    <section className={`v-composer is-open ${expanded ? 'is-expanded' : ''}`} aria-label="Say something">
      <button
        type="button"
        className="v-composer-peek"
        onClick={() => setExpanded((x) => !x)}
        aria-expanded={expanded}
      >
        <span className="v-peek-lean">
          Leaning: <em>{leaningOpt?.label ?? '—'}</em>
        </span>
        <span className="v-peek-cta">{expanded ? 'Close' : 'Say something'}</span>
      </button>

      <div className="v-composer-body">
        {leaningOpt && (
          <p className="v-leaning">
            He’s leaning toward <em>{leaningOpt.label}</em>
            {leaning?.why ? (
              <>
                {' '}
                — <span>{leaning.why}</span>
              </>
            ) : null}
          </p>
        )}

        <fieldset className="v-options" aria-label="What to suggest">
          {options.slice(0, 6).map((o, i) => (
            <button
              key={o.id}
              type="button"
              aria-pressed={draft?.optionId === o.id}
              className={`v-option ${o.leaning ? 'is-leaning' : ''}`}
              onClick={() => pick(o.id)}
            >
              <kbd>{i + 1}</kbd>
              <span className="v-option-label">{o.label}</span>
              {o.leaning && <span className="v-option-lean">his leaning</span>}
            </button>
          ))}
        </fieldset>

        <p className={`v-prefill ${prefill ? '' : 'is-none'}`}>
          {prefill ? (
            <>
              <span className="v-prefill-tag">
                {fromPrefillNow ? (
                  'Prefilled because'
                ) : (
                  <>
                    Prefilled <em>{options.find((o) => o.id === prefill.optionId)?.label ?? 'something'}</em>{' '}
                    because
                  </>
                )}
              </span>{' '}
              {prefill.why}
            </>
          ) : (
            'Nothing here is prefilled. Pick one, or say nothing.'
          )}
        </p>

        <div className="v-how">
          <fieldset className="v-seg" aria-label="How strongly">
            {STRENGTHS.map((s) => (
              <button
                key={s.id}
                type="button"
                aria-pressed={draft?.strength === s.id}
                onClick={() => setStrength(s.id)}
                title={s.hint}
              >
                <Icon name={STRENGTH_ICON[s.id]} />
                {s.label} <kbd>{s.key}</kbd>
              </button>
            ))}
          </fieldset>
          <button
            type="button"
            className={`v-insist ${draft?.insist ? 'is-on' : ''}`}
            aria-pressed={draft?.insist ?? false}
            onClick={toggleInsist}
          >
            <Icon name={STRENGTH_ICON.insist} />
            Insist <kbd>I</kbd>
          </button>
        </div>
        {draft?.insist && <p className="v-insist-price">{INSIST_PRICE}</p>}

        <fieldset className="v-appeals" aria-label="Reason (optional)">
          <span className="v-appeals-label">Reason</span>
          {APPEALS.map((a) => (
            <button
              key={a.id}
              type="button"
              aria-pressed={draft?.appeal === a.id}
              className="v-chip"
              onClick={() => toggleAppeal(a.id)}
            >
              {a.label} <kbd>{a.key}</kbd>
            </button>
          ))}
        </fieldset>

        <div className="v-commit">
          <TelegraphLine telegraph={selected ? shownTelegraph : null} />
          <div className="v-say">
            <button type="button" className="v-btn v-btn-quiet" onClick={sayNothing}>
              Say nothing <kbd>Esc</kbd>
            </button>
            <button type="button" className="v-btn v-btn-primary" onClick={confirm} disabled={!selected}>
              Say it{selected ? `: ${draft?.insist ? 'insist' : draft?.strength} · ${selected.label}` : ''}
              {draft?.appeal ? ` · ${appealLabel(draft.appeal)}` : ''} <kbd>Enter</kbd>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
});

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
