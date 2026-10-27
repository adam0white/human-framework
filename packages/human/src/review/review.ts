/** SCOPE: daily self-review of lived commitment evidence. Released/excused occasions
 * do not form resolves. Coefficients are engineering; muhasaba interpretation and its
 * limits are in research/reconciliation.md §7. No acceptance, diagnosis, RNG or repair.
 */

import { cloneData } from '../core/clone.ts';
import { dexp } from '../core/libm.ts';
import { validateNarrativeFields, validateNarrativeJson } from '../memory/memory.ts';
import type {
  AgendaState,
  ChronicleDay,
  DayRecord,
  DeepReadonly,
  FrameContext,
  ReviewOwner,
  ReviewState,
  ReviewStyle,
  Term,
  ValidationIssue,
} from '../run-schema.ts';
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

const round = (x: number) => Math.round(x * 1e9) / 1e9;
export const resolveKey = (c: {
  kind: string;
  toId?: string;
  label?: string;
  action?: string;
  actions?: readonly string[];
}) => `${c.kind}:${c.toId ?? ''}:${c.label ?? c.action ?? c.actions?.[0] ?? ''}`;
export function reviewTerms(
  state: DeepReadonly<ReviewState>,
  agenda: DeepReadonly<AgendaState>,
  terms: readonly DeepReadonly<Term>[],
): Term[] {
  let value = 0;
  const used = new Set<string>();
  for (const t of terms) {
    const m = /^(commitment|abstain):(.+)$/.exec(t.source);
    if (!m || t.value === 0) continue;
    const c = agenda.commitments.find((c) => c.id === m[2]);
    if (!c) continue;
    const r = state.resolves.find((r) => r.key === resolveKey(c));
    if (!r || used.has(r.key)) continue;
    used.add(r.key);
    value += Math.sign(t.value) * REVIEW_DEFAULTS.resolveScale * r.strength;
  }
  value = round(Math.max(-REVIEW_DEFAULTS.resolveScale, Math.min(REVIEW_DEFAULTS.resolveScale, value)));
  if (!value) return [];
  const term: Term = { source: 'review:resolve', value };
  if (used.size === 1) term.ref = [...used][0]!;
  return [term];
}
function validate(s: DeepReadonly<ReviewState>): ValidationIssue[] {
  const issues: ValidationIssue[] = validateNarrativeJson(s);
  issues.push(
    ...validateNarrativeFields(
      s,
      ['style', 'styleSource', 'atMsOfDay', 'lastDay', 'resolves', 'last', 'seen'],
      ['style', 'atMsOfDay', 'resolves', 'seen'],
      'review',
    ),
  );
  const bad = (path: string, message: string, code: ValidationIssue['code'] = 'invalid-schema') =>
    issues.push({ path, code, message });
  if (
    !s ||
    !['accounting', 'ruminating', 'none'].includes(s.style) ||
    !Number.isSafeInteger(s.atMsOfDay) ||
    s.atMsOfDay < 0 ||
    s.atMsOfDay >= 86400000 ||
    !Array.isArray(s.resolves) ||
    !Array.isArray(s.seen)
  )
    return [{ path: 'review', code: 'invalid-schema', message: 'Invalid required review state' }];
  if (s.resolves.length > 8 || s.seen.length > 64)
    bad('review', 'Retention bound exceeded', 'limit-exceeded');
  const keys = new Set<string>();
  for (const r of s.resolves) {
    if (!r || typeof r !== 'object') {
      bad('resolves', 'Invalid resolve');
      continue;
    }
    issues.push(
      ...validateNarrativeFields(
        r,
        ['key', 'kind', 'strength', 'day', 'label'],
        ['key', 'kind', 'strength', 'day'],
        'resolve',
      ),
    );
    if (keys.has(r.key)) bad('resolves', 'Duplicate resolve', 'duplicate-id');
    keys.add(r.key);
    if (
      typeof r.key !== 'string' ||
      typeof r.kind !== 'string' ||
      (r.label !== undefined && typeof r.label !== 'string') ||
      !r.key ||
      !r.kind ||
      !Number.isFinite(r.strength) ||
      r.strength < 0 ||
      r.strength > 1 ||
      !Number.isSafeInteger(r.day)
    )
      bad('resolves', 'Invalid resolve');
  }
  if (s.styleSource !== undefined && typeof s.styleSource !== 'string') bad('styleSource', 'Invalid source');
  if (!s.seen.every((x) => typeof x === 'string' && x.length > 0)) bad('seen', 'Invalid note identity');
  if (new Set(s.seen).size !== s.seen.length) bad('seen', 'Duplicate seen identity', 'duplicate-id');
  if (s.lastDay !== undefined && !Number.isSafeInteger(s.lastDay)) bad('lastDay', 'Invalid review day');
  if (
    s.last &&
    (!Number.isSafeInteger(s.last.day) ||
      ![s.last.missed, s.last.kept, s.last.resolved].every(
        (xs) => Array.isArray(xs) && xs.every((x) => typeof x === 'string'),
      ))
  )
    bad('last', 'Invalid review record');
  return issues;
}
function checked(s: DeepReadonly<ReviewState>): ReviewState {
  const issues = validate(s);
  if (issues.length) throw new RangeError(issues[0]!.message);
  return cloneData(s) as ReviewState;
}
/** Closed evidence port including the current day; requested for C0 schema routing. */
export function reviewEvidence(
  state: DeepReadonly<ReviewState>,
  context: DeepReadonly<FrameContext & { days: readonly DayRecord[]; open: ChronicleDay | null }>,
): ReturnType<ReviewOwner['review']> {
  const s = checked(state),
    K = context.effective.builtins.REVIEW_DEFAULTS,
    today = Math.floor(context.at / 86400000),
    ms = context.at - today * 86400000;
  const out: ReturnType<ReviewOwner['review']> = {
    state: s,
    effects: { terms: [], modifiers: [], appraisals: [] },
    events: [],
    nextBoundary: today * 86400000 + s.atMsOfDay + (ms >= s.atMsOfDay ? 86400000 : 0),
    advancedThrough: context.at,
    affectReceipts: [],
  };
  if (s.style === 'none') {
    out.nextBoundary = null;
    return Object.assign(out, { affectReceipts: [] });
  }
  const seen = new Set(s.seen);
  const closed = context.days.filter(
    (d) => d.day <= today && (s.lastDay === undefined || d.day >= s.lastDay),
  );
  const notes = [...closed, ...(context.open && context.open.day <= today ? [context.open] : [])];
  const late = closed.some((d) => d.broken.some((n) => !seen.has(n.id)));
  if (!(ms >= s.atMsOfDay && (s.lastDay === undefined || s.lastDay < today)) && !late)
    return Object.assign(out, { affectReceipts: [] });
  const day = today,
    broken = notes.flatMap((d) => d.broken).filter((n) => !seen.has(n.id)),
    kept = notes.flatMap((d) => d.kept).filter((n) => !seen.has(n.id));
  const unique = <T extends { id: string }>(xs: readonly T[]) => [
    ...new Map(xs.map((x) => [x.id, x])).values(),
  ];
  const elapsed = s.lastDay === undefined ? 0 : Math.max(0, day - s.lastDay);
  for (const r of s.resolves) r.strength = round(r.strength * dexp((-Math.LN2 * elapsed) / K.halfLifeDays));
  const missed: string[] = [],
    resolved: string[] = [],
    keptNames: string[] = [];
  for (const n of unique(broken)) {
    const key = resolveKey(n),
      name = n.label ?? n.action ?? n.kind;
    if (!missed.includes(name)) missed.push(name);
    let r = s.resolves.find((x) => x.key === key);
    if (!r) {
      r = { key, kind: n.kind, strength: 0, day };
      if (n.label !== undefined) r.label = n.label;
      s.resolves.push(r);
    }
    r.strength = round(r.strength + K.gain[s.style] * (1 - r.strength));
    r.day = day;
    if (!resolved.includes(name)) resolved.push(name);
  }
  for (const n of unique(kept)) {
    const key = resolveKey(n),
      name = n.label ?? n.action ?? n.kind;
    if (!keptNames.includes(name)) keptNames.push(name);
    const r = s.resolves.find((x) => x.key === key);
    if (r && !broken.some((b) => resolveKey(b) === key)) r.strength = round(r.strength * K.keptKeep);
  }
  s.resolves = s.resolves
    .filter((r) => r.strength >= K.dropBelow)
    .sort((a, b) => b.strength - a.strength || (a.key < b.key ? -1 : 1))
    .slice(0, K.maxResolves);
  s.seen = [...new Set([...s.seen, ...broken.map((n) => n.id), ...kept.map((n) => n.id)])].slice(-K.maxSeen);
  s.lastDay = day;
  s.last = { day, missed, kept: keptNames, resolved: s.style === 'accounting' ? resolved : [] };
  out.events = [{ kind: 'review', record: cloneData(s.last) }];
  const affectReceipts: import('../run-schema.ts').AffectEndpoint[] =
    s.style === 'ruminating' && missed.length
      ? [
          {
            kind: 'felt',
            id: 'distress',
            intensity: Math.min(K.ruminateMax, K.ruminatePer * missed.length),
            cause: 'review',
          },
        ]
      : [];
  return Object.assign(out, { affectReceipts });
}
export const reviewOwner: ReviewOwner = {
  initialize(input) {
    return checked({ ...cloneData(input), resolves: [], seen: [] });
  },
  validate,
  terms(state, terms, context) {
    const agenda = context.agenda;
    return reviewTerms(state, agenda, terms) as ReturnType<ReviewOwner['terms']>;
  },
  review(state, context) {
    return reviewEvidence(state, context);
  },
};
Object.freeze(REVIEW_DEFAULTS.gain);
Object.freeze(REVIEW_DEFAULTS);
