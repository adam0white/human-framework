/**
 * SCOPE (evening self-review, muhasaba, 2.7.0): once a day, from `at` (default 21:00), a person looks back over
 * the commitments the chronicle recorded as kept or broken since their last review, and for each one they broke
 * forms or renews a *resolve*: an if–then intention for that commitment's next occasion (Gollwitzer & Sheeran
 * 2006, research/reconciliation.md E1). While a matching commitment is pending, the resolve adds one bounded term,
 * `review:resolve` (each resolve counted once per option, the sum clamped to ±`resolveScale`; 2.9.0: the term's
 * `ref` is the resolve's key when exactly one resolve weighed in), with the sign of the commitment's own term (toward a duty, away from an abstention's breaking
 * act), scaled by its strength. Strength grows with diminishing gains at each further lapse, relaxes once the
 * commitment is kept, and fades over `halfLifeDays` of disuse. Released and excused commitments (exemptions,
 * sleep, necessity) form no resolve: what was beyond capacity is not held against the person (2:286). The review
 * also runs when the day closes, if the evening passed without it or a lapse came after it.
 *
 * Held readings (`ReviewStyle`): `accounting` is self-accounting as the tradition describes it, naming the lapse
 * with a view to tomorrow (Q 59:18, whose "tomorrow" most exegetes read as the hereafter, so a daily review is an
 * inference; ʿUmar's saying reported by Tirmidhi after 2459, an athar, not a prophetic
 * hadith) and turning back without despair (3:135, 39:53); it forms full resolves and adds no emotion. Reading accounting as
 * non-punishing, like self-compassion after failure raising the motivation to repair (Breines & Chen 2012, E3),
 * is an engineering mapping, not a finding about muhasaba. `ruminating` goes over
 * the lapse abstractly: weaker resolves and a small distress emotion (Watkins 2008, E4: abstract, unconstructive
 * repetitive thought). `none` never reviews. The review reads only chronicle notes and changes no other module's
 * state except that one emotion.
 *
 * Every number is an engineering default, not fitted. Does not claim: divine reckoning or acceptance, a measure of
 * piety, repentance as a ruling (tawba conditions are not modelled), effects on sleep onset (Harvey's model, E6, is
 * not evidence enough), or that review improves outcomes beyond the borrowed if–then shape. It draws no randomness;
 * without `enableReview` nothing here runs and existing runs replay byte for byte.
 *
 * Host notes (2.9.0, docs only). `reviewLine` sets commitment labels into "I didn't keep …" and "Today I kept …",
 * so a label should be a noun phrase ("my call to Mum", "the evening prayer"), not a verb phrase ("calling Mum").
 * A recurring commitment lapses on any day its window passes unlived: a host that skips a day (no service, a
 * fast-forward) should still live, or release, that day's occasions, or the review counts each one as missed.
 */

import { clamp01, dexp, isObj, minuteOfDay, round } from '../core/index.ts';
import { pickLine } from '../narrate/lexicon.ts';
import { labelLine } from '../presentation.ts';
import type {
  ChronicleCommitmentNote,
  DayRecord,
  Minute,
  Person,
  Resolve,
  ReviewRecord,
  ReviewSpec,
  ReviewState,
  ReviewStyle,
  Term,
} from '../types.ts';

export const REVIEW_DEFAULTS = {
  /** Default evening review time, minute of day. */
  at: 21 * 60,
  /** Largest `review:resolve` term at full strength. */
  resolveScale: 0.3,
  /** Share of the remaining headroom a lapse adds, by style. */
  gain: { accounting: 0.5, ruminating: 0.15, none: 0 } as Record<ReviewStyle, number>,
  /** Strength kept after the commitment is kept. */
  keptKeep: 0.6,
  halfLifeDays: 7,
  /** Resolves weaker than this are dropped. */
  dropBelow: 0.05,
  maxResolves: 8,
  maxSeen: 64,
  /** Distress felt per lapse by a ruminating reviewer, capped at `ruminateMax`. */
  ruminatePer: 0.15,
  ruminateMax: 0.45,
};

const STYLES: readonly ReviewStyle[] = ['accounting', 'ruminating', 'none'];

/** Turn on the evening review. Idempotent; a second call updates style, source and time but keeps resolves. */
export function enableReview(p: Person, spec: ReviewSpec = {}): ReviewState {
  const at =
    spec.at !== undefined && Number.isInteger(spec.at) && spec.at >= 0 && spec.at < 1440
      ? spec.at
      : undefined;
  const cur = p.review;
  const st: ReviewState = cur ?? { style: 'accounting', at: REVIEW_DEFAULTS.at, resolves: [] };
  if (spec.style && STYLES.includes(spec.style)) st.style = spec.style;
  if (spec.styleSource !== undefined) st.styleSource = spec.styleSource.slice(0, 96);
  if (at !== undefined) st.at = at;
  p.review = st;
  return st;
}
/** The key a commitment and its chronicle note share: kind, owed-to, and label (else first action). */
export const resolveKey = (c: {
  label?: string | undefined;
  kind: string;
  action?: string | undefined;
  actions?: readonly string[];
  toId?: string | undefined;
}): string => `${c.kind}:${c.toId ?? ''}:${c.label ?? c.action ?? c.actions?.[0] ?? ''}`;

/**
 * The `review:resolve` terms for an option, read from its already-traced `commitment:*` and `abstain:*` terms.
 * Pure; empty when review is off or no resolve matches.
 */
export function reviewTerms(p: Person, terms: readonly Term[]): Term[] {
  const st = p.review;
  if (!st || st.resolves.length === 0) return [];
  let value = 0;
  const used = new Set<string>();
  let only: string | undefined;
  for (const t of terms) {
    const m = /^(commitment|abstain):(.+)$/.exec(t.source);
    if (!m || t.value === 0) continue;
    const c = p.agenda.commitments.find((x) => x.id === m[2]);
    if (!c) continue;
    const r = st.resolves.find((x) => x.key === resolveKey(c));
    if (!r || used.has(r.key)) continue;
    used.add(r.key);
    only = r.key;
    value += Math.sign(t.value) * REVIEW_DEFAULTS.resolveScale * r.strength;
  }
  const max = REVIEW_DEFAULTS.resolveScale;
  value = Math.max(-max, Math.min(max, value));
  if (value === 0) return [];
  const term: Term = { source: 'review:resolve', value: round(value) };
  // Name the resolve when exactly one weighed in (2.9.0, The Pass): "he turned from the jar, as he said he would".
  if (used.size === 1 && only !== undefined) term.ref = only;
  return [term];
}

const fade = (s: number, days: number): number =>
  days <= 0 ? s : s * dexp((-Math.LN2 * days) / REVIEW_DEFAULTS.halfLifeDays);

/**
 * Review now if it is due: at or after `at` on a day not yet reviewed, or when `closed` (the day just closed)
 * was never reviewed. Reads the notes of `recent` (the latest closed day records) and the open day. Returns the
 * record, or undefined when nothing ran. Distress for a ruminating reviewer is returned for the composite to feel.
 */
export function reviewIfDue(
  p: Person,
  now: Minute,
  recent: readonly DayRecord[],
  closed?: DayRecord,
): { record: ReviewRecord; distress: number } | undefined {
  const st = p.review;
  if (!st || st.style === 'none') return undefined;
  const today = Math.floor(now / 1440);
  const seenNow = new Set(st.seen ?? []);
  const lateLapse = closed?.broken.some((n) => !seenNow.has(n.id)) ?? false;
  let day: number;
  if (closed && (st.lastDay === undefined || st.lastDay < closed.day || lateLapse))
    day = Math.max(closed.day, st.lastDay ?? closed.day);
  else if (minuteOfDay(now) >= st.at && (st.lastDay === undefined || st.lastDay < today)) day = today;
  else return undefined;
  const seen = new Set(st.seen ?? []);
  const notes = (kind: 'kept' | 'broken'): ChronicleCommitmentNote[] => {
    const out: ChronicleCommitmentNote[] = [];
    for (const r of closed && !recent.includes(closed) ? [...recent, closed] : recent)
      for (const n of r[kind]) if (!seen.has(n.id)) out.push(n);
    const open = p.chronicleDay;
    if (open && open.day <= day) for (const n of open[kind]) if (!seen.has(n.id)) out.push(n);
    return out;
  };
  const broken = notes('broken');
  const kept = notes('kept');
  const elapsed = st.lastDay === undefined ? 0 : day - st.lastDay;
  for (const r of st.resolves) r.strength = round(fade(r.strength, elapsed));
  const gain = REVIEW_DEFAULTS.gain[st.style];
  const missed: string[] = [];
  const resolved: string[] = [];
  for (const n of broken) {
    const key = resolveKey(n);
    const name = n.label ?? n.action ?? n.kind;
    if (!missed.includes(name)) missed.push(name);
    let r: Resolve | undefined = st.resolves.find((x) => x.key === key);
    if (!r) {
      r = { key, kind: n.kind, strength: 0, day };
      if (n.label !== undefined) r.label = n.label;
      st.resolves.push(r);
    }
    r.strength = round(clamp01(r.strength + gain * (1 - r.strength)));
    r.day = day;
    if (!resolved.includes(name)) resolved.push(name);
  }
  const keptNames: string[] = [];
  for (const n of kept) {
    const key = resolveKey(n);
    const name = n.label ?? n.action ?? n.kind;
    if (!keptNames.includes(name)) keptNames.push(name);
    const r = st.resolves.find((x) => x.key === key);
    if (r && !broken.some((b) => resolveKey(b) === key))
      r.strength = round(r.strength * REVIEW_DEFAULTS.keptKeep);
  }
  st.resolves = st.resolves
    .filter((r) => r.strength >= REVIEW_DEFAULTS.dropBelow)
    .sort((a, b) => b.strength - a.strength || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
    .slice(0, REVIEW_DEFAULTS.maxResolves);
  const ids = [...(st.seen ?? []), ...broken.map((n) => n.id), ...kept.map((n) => n.id)];
  st.seen = ids.slice(-REVIEW_DEFAULTS.maxSeen);
  st.lastDay = day;
  const record: ReviewRecord = {
    day,
    missed,
    kept: keptNames,
    resolved: st.style === 'accounting' ? resolved : [],
  };
  st.last = record;
  const distress =
    st.style === 'ruminating'
      ? Math.min(REVIEW_DEFAULTS.ruminateMax, REVIEW_DEFAULTS.ruminatePer * missed.length)
      : 0;
  return { record, distress };
}

/** The person's own words for their latest review, or undefined when they hold no review. */
export function reviewLine(
  p: Person,
  options: { variety?: boolean; cause?: 'ordered' | 'interrupted' } = {},
): string | undefined {
  const st = p.review;
  const r = st?.last;
  if (!st || st.style === 'none' || !r) return undefined;
  const list = (items: string[]) => {
    const xs = items.map((item) => labelLine(item, p.lexicon));
    return xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`;
  };
  if (r.missed.length === 0) return r.kept.length > 0 ? `Today I kept ${list(r.kept)}.` : undefined;
  if (options.cause) {
    const cause = options.cause === 'ordered' ? 'following an order' : 'being interrupted';
    const next =
      options.cause === 'ordered'
        ? 'Next time I will say what the order would put aside.'
        : 'Next time I will make room to return to it.';
    return pickLine('review.cause', `${p.id}:${r.day}`, { cause, missed: list(r.missed), next }, p.lexicon);
  }
  if (p.lexicon?.plainEnglish || (options.variety ?? p.lexicon?.variety)) {
    return pickLine(`review.${st.style}`, `${p.id}:${r.day}`, { missed: list(r.missed) }, p.lexicon);
  }
  if (st.style === 'ruminating') return `I keep going back over ${list(r.missed)}.`;
  return `I didn't keep ${list(r.missed)}. Next time I'll be ready when it comes.`;
}

/** Restore guard: drop malformed fields, keep valid resolves. */
export function sanitizeReview(x: unknown, now?: Minute): ReviewState | undefined {
  if (!isObj(x)) return undefined;
  const style = STYLES.includes(x.style as ReviewStyle) ? (x.style as ReviewStyle) : 'accounting';
  const at =
    Number.isInteger(x.at) && (x.at as number) >= 0 && (x.at as number) < 1440
      ? (x.at as number)
      : REVIEW_DEFAULTS.at;
  const resolves: Resolve[] = [];
  if (Array.isArray(x.resolves))
    for (const r of x.resolves) {
      if (!isObj(r) || typeof r.key !== 'string' || typeof r.kind !== 'string') continue;
      if (typeof r.strength !== 'number' || !Number.isFinite(r.strength) || !Number.isInteger(r.day))
        continue;
      const out: Resolve = {
        key: r.key.slice(0, 96),
        kind: r.kind.slice(0, 32),
        strength: clamp01(r.strength),
        day: r.day as number,
      };
      if (typeof r.label === 'string') out.label = r.label.slice(0, 96);
      if (!resolves.some((y) => y.key === out.key)) resolves.push(out);
      if (resolves.length >= REVIEW_DEFAULTS.maxResolves) break;
    }
  const st: ReviewState = { style, at, resolves };
  if (typeof x.styleSource === 'string') st.styleSource = x.styleSource.slice(0, 96);
  if (Number.isInteger(x.lastDay) && (now === undefined || (x.lastDay as number) <= Math.floor(now / 1440)))
    st.lastDay = x.lastDay as number;
  if (Array.isArray(x.seen))
    st.seen = x.seen.filter((s): s is string => typeof s === 'string').slice(-REVIEW_DEFAULTS.maxSeen);
  const l = x.last;
  if (isObj(l) && Number.isInteger(l.day)) {
    const strs = (v: unknown) =>
      Array.isArray(v) ? v.filter((s): s is string => typeof s === 'string').slice(0, 24) : [];
    st.last = {
      day: l.day as number,
      missed: strs(l.missed),
      kept: strs(l.kept),
      resolved: strs(l.resolved),
    };
  }
  return st;
}
