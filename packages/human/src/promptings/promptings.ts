/**
 * SCOPE (promptings and turning away, 2.4.0): a *prompt* is a pull toward an option that the person's own held
 * norms or goals oppose, strong enough to be noticed. This module records prompts, lets the person turn from them
 * by a practised response, and keeps a prompt apart from assent: only an assented act reaches `conscience/
 * recordDeed`, so a prompt is never a breach (Bukhari 5269, research/reconciliation.md §3). It is opt-in
 * (`enablePromptings`, or `PersonSpec.enable.promptings`); without it nothing here runs and existing runs replay
 * byte for byte. It draws no randomness.
 *
 * Detection reads an option's traced terms and changes none of them: the pull is the sum of positive `habit`,
 * `emotion:*`, `need:*` and `promptings:echo` terms (every positive term on an offer tagged `temptation`); it is a
 * prompt when the pull reaches `noticeAt` while a `norm:*` or `goal:*` term on the same option is negative.
 * Abstention windows are not detected (they veto, and carry no term). A person with a response gets one extra
 * term, `promptings:turn` = -turnMax × practice, on that option; it is bounded and absent at survival desperation,
 * so a desperate bodily need still wins (2:286). Each prompt is recorded once per decision point (a review that
 * keeps the running activity records nothing) as `assented` (chosen), `turned` (not chosen, a response practised)
 * or `passed` (not chosen, no response). Practice grows with diminishing gains once per decision point where the
 * response was used (more when it held; a vetoed option earns none, since the will blocked it), and halves over `practiceHalfLifeDays` of disuse.
 *
 * Held readings (reconciliation.md §5): `whisper`, `inclination`, `intrusion` and `none` give identical decisions
 * and differ only in the vocabulary of `promptingLine`. `fault` (the scrupulous reading, which both the tradition
 * and clinicians reject) adds a small guilt emotion at the prompt itself, from the person's own understanding;
 * that guilt is an emotion, never a breach, so it changes decisions only where an offer acts through guilt's
 * tendencies. With a host-set `echoRate` > 0, `fault` also gains a recurrence pull on that action
 * (`promptings:echo`), decaying over days: a labelled assumption from contested suppression-rebound evidence
 * (P3), off by default. No reading earns a hidden bonus.
 *
 * Borrowed shapes: everyday desire, conflict and resistance (P1, P2); suppression rebound and redirection (P3,
 * P13); practised if–then responses (P5). Every number is an engineering default, not fitted. Does not claim: the
 * source of any thought, a measure of faith, spiritual rank, reward for resisting (H4 is acknowledged as a held
 * belief and never computed), clinical OCD, or a cessation rate. The lenses (`promptingsReading`, `nafsReading`)
 * only describe existing state; they store and compute nothing new about the person.
 */
import { clamp01, dexp, isObj, round } from '../core/index.ts';
import type {
  Minute,
  Person,
  PromptingReading,
  PromptingRecord,
  PromptingResponse,
  PromptingResponseKind,
  PromptingsSpec,
  PromptingsState,
  Term,
  Unit,
} from '../types.ts';
import { MINUTES_PER_DAY } from '../types.ts';

export const PROMPTINGS_DEFAULTS = {
  /** Pull (utility units) from which a pull against a held norm or goal is noticed. */
  noticeAt: 0.15,
  /** Largest turning-away term at full practice (utility units). */
  turnMax: 0.8,
  /** No turning-away term at or above this desperation (same scale as will's survival desperation). */
  survivalDesperation: 0.75,
  /** Practice gained at a prompt where the response held (× (1 - practice)). */
  gainTurned: 0.12,
  /** Practice gained at a prompt where the response was tried but the person assented. */
  gainAttempt: 0.04,
  /** Practice halves over this many days without use. */
  practiceHalfLifeDays: 60,
  /** Guilt intensity at a prompt under the `fault` reading. */
  faultGuilt: 0.15,
  /** Recurrence pull at echo level 1 (utility units); only reached when a host sets `echoRate` > 0. */
  echoScale: 0.5,
  echoHalfLifeDays: 3,
  maxRecent: 64,
  maxResponses: 8,
  maxEcho: 32,
} as const;

const READINGS: readonly PromptingReading[] = ['whisper', 'inclination', 'intrusion', 'fault', 'none'];
const KINDS: readonly PromptingResponseKind[] = ['refuge', 'redirect', 'leave'];
const halve = (value: number, minutes: number, halfLifeDays: number): number =>
  minutes <= 0 ? value : value * dexp((-Math.LN2 * minutes) / (halfLifeDays * MINUTES_PER_DAY));

/**
 * Turn the slice on, or reconfigure it: recent records and echo are kept, and a response whose id is already held
 * keeps its practice and last use (the spec's `practice` only seeds new responses). Returns the state.
 */
export function enablePromptings(p: Person, spec: PromptingsSpec = {}): PromptingsState {
  const prev = p.promptings;
  const responses: PromptingResponse[] = [];
  for (const r of spec.responses ?? []) {
    if (!isObj(r) || typeof r.id !== 'string' || r.id === '' || !KINDS.includes(r.kind)) continue;
    if (responses.some((x) => x.id === r.id) || responses.length >= PROMPTINGS_DEFAULTS.maxResponses)
      continue;
    const held = prev?.responses.find((x) => x.id === r.id);
    const seed = Number.isFinite(r.practice) ? clamp01(r.practice as number) : 0.1;
    responses.push(
      held ? { ...held, kind: r.kind } : { id: r.id, kind: r.kind, practice: seed, lastUsedAt: p.now },
    );
  }
  const state: PromptingsState = {
    reading: spec.reading && READINGS.includes(spec.reading) ? spec.reading : 'none',
    responses,
    recent: prev?.recent ?? [],
    echo: prev?.echo ?? {},
    echoRate: Number.isFinite(spec.echoRate) ? clamp01(spec.echoRate as number) : 0,
  };
  if (spec.readingSource !== undefined) state.readingSource = spec.readingSource;
  p.promptings = state;
  return state;
}

/** Practice of a response at `now`, after disuse decay. Pure. */
export function practiceAt(r: PromptingResponse, now: Minute): Unit {
  return clamp01(halve(r.practice, now - r.lastUsedAt, PROMPTINGS_DEFAULTS.practiceHalfLifeDays));
}

/** The response a person would use now: highest practice, ties by id. */
function bestResponse(s: PromptingsState, now: Minute): { r: PromptingResponse; practice: Unit } | undefined {
  let best: { r: PromptingResponse; practice: Unit } | undefined;
  for (const r of s.responses) {
    const practice = practiceAt(r, now);
    if (!best || practice > best.practice || (practice === best.practice && r.id < best.r.id))
      best = { r, practice };
  }
  return best;
}

const isPull = (source: string, tagged: boolean): boolean =>
  tagged ||
  source === 'habit' ||
  source === 'promptings:echo' ||
  source.startsWith('emotion:') ||
  source.startsWith('need:');

/** Whether an option's terms carry a noticed prompt: its strongest pull and the opposing term. Pure. */
export function promptIn(
  terms: readonly Term[],
  tags: readonly string[] | undefined,
): { source: string; opposedBy: string } | undefined {
  const tagged = tags?.includes('temptation') ?? false;
  let pull = 0;
  let top: Term | undefined;
  let opposed: Term | undefined;
  for (const t of terms) {
    if (t.source === 'promptings:turn') continue;
    if (t.value > 0 && isPull(t.source, tagged)) {
      pull += t.value;
      if (!top || t.value > top.value) top = t;
    } else if (
      t.value < 0 &&
      (t.source.startsWith('norm:') || t.source.startsWith('goal:')) &&
      (!opposed || t.value < opposed.value)
    )
      opposed = t;
  }
  if (!top || !opposed || pull < PROMPTINGS_DEFAULTS.noticeAt) return undefined;
  return { source: tagged && !isPull(top.source, false) ? 'host' : top.source, opposedBy: opposed.source };
}

/**
 * Extra terms for one option (cognition calls this before summing): the echo pull under `fault`, then the
 * turning-away term when the option carries a prompt. Pure apart from reads; empty without the slice.
 */
export function promptingTerms(
  p: Person,
  action: string,
  terms: readonly Term[],
  tags: readonly string[] | undefined,
  now: Minute,
  desperation: number,
): Term[] {
  const s = p.promptings;
  if (!s) return [];
  const out: Term[] = [];
  const e = Object.hasOwn(s.echo, action) ? s.echo[action] : undefined;
  if (e && s.reading === 'fault') {
    const level = halve(e.level, now - e.at, PROMPTINGS_DEFAULTS.echoHalfLifeDays);
    const v = round(PROMPTINGS_DEFAULTS.echoScale * level);
    if (v > 0) out.push({ source: 'promptings:echo', value: v });
  }
  if (desperation >= PROMPTINGS_DEFAULTS.survivalDesperation) return out;
  const best = bestResponse(s, now);
  if (!best || best.practice <= 0) return out;
  if (!promptIn([...terms, ...out], tags)) return out;
  const v = round(-PROMPTINGS_DEFAULTS.turnMax * best.practice);
  if (v < 0) out.push({ source: 'promptings:turn', value: v });
  return out;
}

/** A prompt found at a decision point, handed from cognition to the composite. */
export interface PromptingSeen {
  affordanceId: string;
  action: string;
  source: string;
  opposedBy: string;
  /** Whether a turning-away term was applied. */
  turnApplied: boolean;
}

/** What `notePromptings` did, for the composite (the `fault` guilt goes through affect). */
export interface PromptingsNoted {
  records: PromptingRecord[];
  /** Guilt intensity to feel at the prompt (only under `fault`); 0 otherwise. */
  guilt: Unit;
}

/**
 * Record the prompts of one decision point and learn from them. `chosenId` is the chosen affordance (null when
 * nothing was chosen). The only writer of `p.promptings` after `enablePromptings`.
 */
export function notePromptings(
  p: Person,
  seen: readonly PromptingSeen[],
  chosenId: string | null,
  now: Minute,
): PromptingsNoted {
  const s = p.promptings;
  const noted: PromptingsNoted = { records: [], guilt: 0 };
  if (!s || seen.length === 0) return noted;
  const D = PROMPTINGS_DEFAULTS;
  const best = bestResponse(s, now);
  // One practice gain per decision point, however many options carried a prompt: the larger one if any held.
  let gain = 0;
  for (const x of seen) {
    const assented = x.affordanceId === chosenId;
    const used = x.turnApplied && best !== undefined;
    const rec: PromptingRecord = {
      at: now,
      action: x.action,
      affordanceId: x.affordanceId,
      source: x.source,
      opposedBy: x.opposedBy,
      outcome: assented ? 'assented' : used ? 'turned' : 'passed',
    };
    if (used && best) {
      rec.responseId = best.r.id;
      gain = Math.max(gain, assented ? D.gainAttempt : D.gainTurned);
    }
    s.recent.push(rec);
    noted.records.push(rec);
    if (s.reading === 'fault') {
      noted.guilt = Math.max(noted.guilt, D.faultGuilt);
      if (s.echoRate > 0) {
        const prev = Object.hasOwn(s.echo, x.action) ? s.echo[x.action] : undefined;
        const level = prev ? halve(prev.level, now - prev.at, D.echoHalfLifeDays) : 0;
        s.echo[x.action] = { level: round(clamp01(level + s.echoRate * (1 - level))), at: now };
      }
    }
  }
  if (best && gain > 0) {
    const practice = practiceAt(best.r, now);
    best.r.practice = round(clamp01(practice + gain * (1 - practice)));
    best.r.lastUsedAt = now;
  }
  if (s.recent.length > D.maxRecent) s.recent.splice(0, s.recent.length - D.maxRecent);
  const keys = Object.keys(s.echo);
  if (keys.length > D.maxEcho) {
    keys.sort((a, b) => (s.echo[a]?.at ?? 0) - (s.echo[b]?.at ?? 0) || (a < b ? -1 : 1));
    for (const k of keys.slice(0, keys.length - D.maxEcho)) delete s.echo[k];
  }
  return noted;
}

/** Vocabulary for one prompt under a held reading (narration only; it changes nothing). */
export function promptingLine(
  reading: PromptingReading,
  outcome: PromptingRecord['outcome'],
  kind?: PromptingResponseKind,
): string {
  if (outcome === 'assented')
    return reading === 'whisper'
      ? 'a whisper came and was followed'
      : reading === 'inclination'
        ? 'the pull of the self won'
        : 'an urge came and was acted on';
  const how =
    outcome === 'turned'
      ? kind === 'refuge'
        ? 'sought refuge and '
        : kind === 'redirect'
          ? 'turned to something else and '
          : ''
      : '';
  switch (reading) {
    case 'whisper':
      return `a whisper came; ${how}let it pass`;
    case 'inclination':
      return `the self pulled; ${how}held back`;
    case 'intrusion':
      return `a thought came, not who I am; ${how}let it go`;
    case 'fault':
      return `a thought came and felt like wrongdoing; ${how}let it pass`;
    default:
      return `an urge came; ${how}it passed`;
  }
}

/** Read-only summary of recent prompts (a lens; computes nothing new about the person). */
export interface PromptingsReadingView {
  reading: PromptingReading;
  readingSource?: string;
  prompts: number;
  turned: number;
  passed: number;
  assented: number;
  responses: { id: string; kind: PromptingResponseKind; practice: Unit }[];
  /** Vocabulary for the last few prompts, newest last. */
  lines: string[];
}

export function promptingsReading(p: Person, now: Minute = p.now): PromptingsReadingView | undefined {
  const s = p.promptings;
  if (!s) return undefined;
  const count = (o: PromptingRecord['outcome']) => s.recent.filter((r) => r.outcome === o).length;
  const kindOf = (id?: string) => s.responses.find((r) => r.id === id)?.kind;
  const view: PromptingsReadingView = {
    reading: s.reading,
    prompts: s.recent.length,
    turned: count('turned'),
    passed: count('passed'),
    assented: count('assented'),
    responses: s.responses.map((r) => ({ id: r.id, kind: r.kind, practice: round(practiceAt(r, now)) })),
    lines: s.recent.slice(-5).map((r) => promptingLine(s.reading, r.outcome, kindOf(r.responseId))),
  };
  if (s.readingSource !== undefined) view.readingSource = s.readingSource;
  return view;
}

/**
 * The nafs lens (reconciliation.md §3): the three Qur'anic descriptions of one self, each with the evidence in
 * existing state that matches it. Descriptions, not a level, a ladder or three agents; several can hold at once,
 * and none says anything about rank before God. Inputs are passed in by the composite (open-breach weight and
 * felt guilt from conscience and affect), so this module reads nothing it does not own. Guilt that the `fault` reading
 * feels at a prompt is excluded, so the scrupulous reading is not mapped onto self-reproach (75:2). These mappings
 * from state to description are engineering conventions (C), not interpretations of the verses.
 */
export interface NafsPattern {
  name: 'urging' | 'reproaching' | 'at rest';
  /** Qur'anic description it borrows (12:53 ammara, 75:2 lawwama, 89:27 mutmaʾinna). */
  ref: string;
  evident: boolean;
  evidence: string;
}

export function nafsPatterns(p: Person, inputs: { guiltLoad: Unit; guilt: Unit }): NafsPattern[] {
  const recent = p.promptings?.recent ?? [];
  const assentedAgainstNorm = recent.filter(
    (r) => r.outcome === 'assented' && r.opposedBy.startsWith('norm:'),
  );
  const letPass = recent.filter((r) => r.outcome !== 'assented').length;
  const reproach = inputs.guiltLoad > 0 || inputs.guilt > 0.05;
  return [
    {
      name: 'urging',
      ref: 'Qur’an 12:53',
      evident: assentedAgainstNorm.length > 0,
      evidence: `${assentedAgainstNorm.length} recent prompts followed against a held norm`,
    },
    {
      name: 'reproaching',
      ref: 'Qur’an 75:2',
      evident: reproach,
      evidence: `open-breach weight ${round(inputs.guiltLoad, 2)}, felt guilt ${round(inputs.guilt, 2)}`,
    },
    {
      name: 'at rest',
      ref: 'Qur’an 89:27',
      evident: letPass > 0 && assentedAgainstNorm.length === 0 && !reproach,
      evidence: `${letPass} recent prompts let pass, none followed against a norm, no felt reproach`,
    },
  ];
}

const unit = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x) && x >= 0 && x <= 1;
const minute = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const str = (x: unknown): x is string => typeof x === 'string' && x !== '' && x.length <= 200;

/** Validate a saved slice; a malformed slice is dropped (undefined), malformed entries are skipped. */
export function sanitizePromptings(input: unknown, now: Minute): PromptingsState | undefined {
  if (!isObj(input) || !Array.isArray(input.responses) || !Array.isArray(input.recent) || !isObj(input.echo))
    return undefined;
  if (typeof input.reading !== 'string' || !READINGS.includes(input.reading as PromptingReading))
    return undefined;
  const D = PROMPTINGS_DEFAULTS;
  const responses: PromptingResponse[] = [];
  for (const r of input.responses.slice(0, D.maxResponses)) {
    if (!isObj(r) || !str(r.id) || !KINDS.includes(r.kind as PromptingResponseKind) || !unit(r.practice))
      continue;
    if (!minute(r.lastUsedAt) || r.lastUsedAt > now || responses.some((x) => x.id === r.id)) continue;
    responses.push({
      id: r.id,
      kind: r.kind as PromptingResponseKind,
      practice: r.practice,
      lastUsedAt: r.lastUsedAt,
    });
  }
  const recent: PromptingRecord[] = [];
  for (const r of input.recent.slice(-D.maxRecent)) {
    if (!isObj(r) || !minute(r.at) || r.at > now || !str(r.action) || !str(r.affordanceId)) continue;
    if (!str(r.source) || !str(r.opposedBy)) continue;
    if (r.outcome !== 'passed' && r.outcome !== 'turned' && r.outcome !== 'assented') continue;
    const rec: PromptingRecord = {
      at: r.at,
      action: r.action,
      affordanceId: r.affordanceId,
      source: r.source,
      opposedBy: r.opposedBy,
      outcome: r.outcome,
    };
    if (str(r.responseId)) rec.responseId = r.responseId;
    recent.push(rec);
  }
  const echo: PromptingsState['echo'] = {};
  for (const k of Object.keys(input.echo).slice(0, D.maxEcho)) {
    if (k === '__proto__' || !str(k)) continue;
    const e = input.echo[k];
    if (!isObj(e) || !unit(e.level) || !minute(e.at) || e.at > now) continue;
    echo[k] = { level: e.level, at: e.at };
  }
  const rate = input.echoRate;
  const out: PromptingsState = {
    reading: input.reading as PromptingReading,
    responses,
    recent,
    echo,
    echoRate: typeof rate === 'number' && Number.isFinite(rate) && rate >= 0 ? Math.min(1, rate) : 0,
  };
  if (str(input.readingSource)) out.readingSource = input.readingSource;
  return out;
}
