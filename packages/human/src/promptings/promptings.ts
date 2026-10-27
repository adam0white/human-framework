/** SCOPE: noticed pulls, learned responses and fault-reading recurrence. The .1 echo
 * prior is contested engineering (research/reconciliation.md), not a religious claim.
 * Reading none and empty responses are ordinary state. No RNG, invented norm or acceptance.
 */

import { dexp } from '../core/libm.ts';
import { validateNarrativeFields, validateNarrativeJson } from '../memory/memory.ts';
import type {
  DeepReadonly,
  FrameContext,
  NoticedPrompt,
  PromptingsOwner,
  PromptingsState,
  Term,
  TermData,
  ValidationIssue,
} from '../run-schema.ts';
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

const unit = (x: number) => Math.max(0, Math.min(1, x));
const round = (x: number) => Math.round(x * 1e9) / 1e9;
const fade = (x: number, ms: number, days: number) =>
  x * dexp((-Math.LN2 * Math.max(0, ms)) / (days * 86400000));
export interface PromptContext {
  action: string;
  tags: readonly string[];
  opposedBy: string;
}
export function responseCueMatches(cue: string, at: PromptContext): boolean {
  return (
    cue === at.action ||
    cue === at.opposedBy ||
    at.tags.includes(cue) ||
    cue === at.opposedBy.slice(at.opposedBy.indexOf(':') + 1)
  );
}
export function practiceAt(
  r: DeepReadonly<PromptingsState['responses'][number]>,
  at: number,
  days = 60,
): number {
  return fade(r.practice, at - r.lastUsedAt, days);
}
function bestResponse(s: DeepReadonly<PromptingsState>, now: number, at: PromptContext, days: number) {
  const order = (
    a: DeepReadonly<PromptingsState['responses'][number]>,
    b: DeepReadonly<PromptingsState['responses'][number]>,
  ) => practiceAt(b, now, days) - practiceAt(a, now, days) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  return (
    [...s.responses].filter((r) => r.cue !== undefined && responseCueMatches(r.cue, at)).sort(order)[0] ??
    [...s.responses].filter((r) => r.cue === undefined).sort(order)[0]
  );
}
export function promptIn<S extends string>(
  terms: readonly { readonly source: S; readonly value: number }[],
  tags: readonly string[] = [],
): { source: S | 'host'; opposedBy: string } | undefined {
  let pull = 0,
    top: { readonly source: S; readonly value: number } | undefined,
    opposed: { readonly source: S; readonly value: number } | undefined;
  const tagged = tags.includes('temptation');
  const isPull = (source: string) =>
    source === 'habit' ||
    source === 'promptings:echo' ||
    source.startsWith('emotion:') ||
    source.startsWith('need:');
  for (const t of terms) {
    if (t.source === 'promptings:turn') continue;
    if (t.value > 0 && (tagged || isPull(t.source))) {
      pull += t.value;
      if (!top || t.value > top.value) top = t;
    } else if (
      t.value < 0 &&
      (t.source.startsWith('norm:') || t.source.startsWith('goal:')) &&
      (!opposed || t.value < opposed.value)
    )
      opposed = t;
  }
  return top && opposed && pull >= PROMPTINGS_DEFAULTS.noticeAt
    ? { source: tagged && !isPull(top.source) ? 'host' : top.source, opposedBy: opposed.source }
    : undefined;
}
/** Pure cognition input; C0/W2 must route tags/desperation before deciding. */
export function promptingTerms(
  s: DeepReadonly<PromptingsState>,
  input: {
    action: string;
    terms: readonly DeepReadonly<Term>[];
    tags: readonly string[];
    desperation: number;
  },
  context: DeepReadonly<FrameContext>,
): TermData[] {
  const out: TermData[] = [],
    K = context.effective.builtins.PROMPTINGS_DEFAULTS;
  const echo = Object.hasOwn(s.echo, input.action) ? s.echo[input.action] : undefined;
  if (s.reading === 'fault' && echo) {
    const value = round(K.echoScale * fade(echo.level, context.at - echo.at, K.echoHalfLifeDays));
    if (value > 0) out.push({ source: 'promptings:echo', value });
  }
  if (input.desperation >= K.survivalDesperation) return out;
  const prompt = promptIn([...input.terms, ...out], input.tags);
  if (!prompt) return out;
  const best = bestResponse(
    s,
    context.at,
    { ...input, opposedBy: prompt.opposedBy },
    context.effective.promptings.practiceHalfLifeDays,
  );
  if (best) {
    const value = round(
      -K.turnMax * practiceAt(best, context.at, context.effective.promptings.practiceHalfLifeDays),
    );
    if (value < 0) out.push({ source: 'promptings:turn', value });
  }
  return out;
}
function validate(s: DeepReadonly<PromptingsState>): ValidationIssue[] {
  const issues: ValidationIssue[] = validateNarrativeJson(s);
  issues.push(
    ...validateNarrativeFields(
      s,
      ['reading', 'readingSource', 'responses', 'recent', 'echo'],
      ['reading', 'responses', 'recent', 'echo'],
      'promptings',
    ),
  );
  const bad = (path: string, message: string, code: ValidationIssue['code'] = 'invalid-schema') =>
    issues.push({ path, code, message });
  if (
    !s ||
    !['whisper', 'inclination', 'intrusion', 'fault', 'none'].includes(s.reading) ||
    !Array.isArray(s.responses) ||
    !Array.isArray(s.recent) ||
    !s.echo ||
    typeof s.echo !== 'object' ||
    Array.isArray(s.echo)
  )
    return [{ path: 'promptings', code: 'invalid-schema', message: 'Invalid required prompting state' }];
  if (s.responses.length > 8 || s.recent.length > 64 || Object.keys(s.echo).length > 32)
    bad('promptings', 'Retention bound exceeded', 'limit-exceeded');
  if (s.readingSource !== undefined && typeof s.readingSource !== 'string')
    bad('readingSource', 'Invalid source');
  const ids = new Set<string>();
  for (const r of s.responses) {
    if (!r || typeof r !== 'object') {
      bad('responses', 'Invalid response');
      continue;
    }
    issues.push(
      ...validateNarrativeFields(
        r,
        ['id', 'kind', 'practice', 'lastUsedAt', 'cue'],
        ['id', 'kind', 'practice', 'lastUsedAt'],
        'response',
      ),
    );
    if (ids.has(r.id)) bad('responses', 'Duplicate response', 'duplicate-id');
    ids.add(r.id);
    if (
      typeof r.id !== 'string' ||
      !r.id ||
      (r.cue !== undefined && typeof r.cue !== 'string') ||
      !['refuge', 'redirect', 'leave'].includes(r.kind) ||
      !Number.isFinite(r.practice) ||
      r.practice < 0 ||
      r.practice > 1 ||
      !Number.isSafeInteger(r.lastUsedAt)
    )
      bad('responses', 'Invalid response');
  }
  for (const [id, e] of Object.entries(s.echo))
    if (
      !e ||
      typeof e !== 'object' ||
      !id ||
      !Number.isFinite(e.level) ||
      e.level < 0 ||
      e.level > 1 ||
      !Number.isSafeInteger(e.at)
    )
      bad('echo', 'Invalid echo');
  for (const r of s.recent)
    if (
      !r ||
      typeof r !== 'object' ||
      !Number.isSafeInteger(r.at) ||
      !r.action ||
      !r.affordanceId ||
      !['passed', 'turned', 'assented'].includes(r.outcome)
    )
      bad('recent', 'Invalid prompting record');
  return issues;
}
function checked(s: DeepReadonly<PromptingsState>): PromptingsState {
  const issues = validate(s);
  if (issues.length) throw new RangeError(issues[0]!.message);
  return structuredClone(s) as PromptingsState;
}
export const promptingsOwner: PromptingsOwner = {
  initialize(input) {
    const s: PromptingsState = {
      ...structuredClone(input),
      responses: structuredClone(input.responses) as PromptingsState['responses'],
      recent: [],
      echo: {},
    };
    return checked(s);
  },
  validate,
  terms(state, context) {
    const terms = promptingTerms(
      state,
      {
        action: context.offer.actionId,
        terms: context.terms,
        tags: context.offer.tags,
        desperation: context.desperation,
      },
      context,
    );
    const seen = promptIn([...context.terms, ...terms], context.offer.tags);
    if (!seen) return { terms, noticed: null };
    const best = bestResponse(
      state,
      context.at,
      { action: context.offer.actionId, tags: context.offer.tags, opposedBy: seen.opposedBy },
      context.effective.promptings.practiceHalfLifeDays,
    );
    const noticed: NoticedPrompt = {
      offerId: context.offer.id,
      action: context.offer.actionId,
      source: seen.source,
      opposedBy: seen.opposedBy as NoticedPrompt['opposedBy'],
      tags: [...context.offer.tags],
      turnApplied: terms.some((t) => t.source === 'promptings:turn' && t.value < 0),
    };
    if (noticed.turnApplied && best) noticed.responseId = best.id;
    return { terms, noticed };
  },
  advance(state, context) {
    checked(state);
    const base = context.continuation;
    if (context.from < base.anchor.at || context.to < context.from)
      throw new RangeError('Prompting clock rewound');
    // Practice and echo retain their encoding clocks and are read lazily. Materialization cannot compound decay.
    return {
      state: checked(base.state),
      effects: { terms: [], modifiers: [], appraisals: [] },
      events: [],
      nextBoundary: null,
      advancedThrough: context.to,
      continuation: { anchor: { ...base.anchor }, state: checked(base.state) },
    };
  },
  receive(state, input, context) {
    const s = checked(state),
      K = context.effective.builtins.PROMPTINGS_DEFAULTS;
    const events: ReturnType<PromptingsOwner['receive']>['events'][number][] = [];
    const gains = new Map<string, number>();
    let guilt = 0;
    const ids = new Set<string>();
    for (const noticed of input.noticed) {
      if (ids.has(noticed.offerId)) throw new RangeError('Duplicate prompting notice');
      ids.add(noticed.offerId);
      const option = input.decision.considered.find((o) => o.affordanceId === noticed.offerId);
      if (!option || option.action !== noticed.action)
        throw new RangeError('Prompt notice does not match decision');
      const seen = promptIn(option.terms, noticed.tags);
      if (!seen || seen.source !== noticed.source || seen.opposedBy !== noticed.opposedBy)
        throw new RangeError('Unqualified prompting notice');
      const best =
        noticed.responseId === undefined ? undefined : s.responses.find((r) => r.id === noticed.responseId);
      if (
        noticed.turnApplied &&
        (!best ||
          !responseCueMatches(best.cue ?? noticed.action, {
            action: noticed.action,
            tags: noticed.tags,
            opposedBy: noticed.opposedBy,
          }))
      )
        throw new RangeError('Prompt response mismatch');
      const used = noticed.turnApplied && best !== undefined,
        assented = input.decision.chosenAffordanceId === noticed.offerId;
      const record: PromptingsState['recent'][number] = {
        at: context.at,
        action: noticed.action,
        affordanceId: noticed.offerId,
        source: noticed.source,
        opposedBy: noticed.opposedBy,
        outcome: assented ? 'assented' : used ? 'turned' : 'passed',
      };
      if (used && best) {
        record.responseId = best.id;
        gains.set(best.id, Math.max(gains.get(best.id) ?? 0, assented ? K.gainAttempt : K.gainTurned));
      }
      s.recent.push(record);
      events.push({ kind: 'prompting', record });
      if (s.reading === 'fault') {
        guilt = Math.max(guilt, K.faultGuilt);
        const old = Object.hasOwn(s.echo, noticed.action) ? s.echo[noticed.action] : undefined;
        const level = old ? fade(old.level, context.at - old.at, K.echoHalfLifeDays) : 0;
        s.echo[noticed.action] = {
          level: round(unit(level + context.effective.promptings.echoRate * (1 - level))),
          at: context.at,
        };
      }
    }
    for (const [id, gain] of gains) {
      const r = s.responses.find((r) => r.id === id)!;
      const value = practiceAt(r, context.at, context.effective.promptings.practiceHalfLifeDays);
      r.practice = round(unit(value + gain * (1 - value)));
      r.lastUsedAt = context.at;
    }
    s.recent = s.recent.slice(-K.maxRecent);
    const keys = Object.keys(s.echo).sort((a, b) => s.echo[a]!.at - s.echo[b]!.at || (a < b ? -1 : 1));
    for (const key of keys.slice(0, Math.max(0, keys.length - K.maxEcho))) delete s.echo[key];
    return {
      state: s,
      effects: {
        terms: [],
        modifiers: [],
        appraisals: [],
      },
      affectReceipts: guilt
        ? [
            {
              kind: 'felt' as const,
              id: 'guilt' as const,
              intensity: guilt,
              cause: `prompting:${input.decision.id}`,
            },
          ]
        : [],
      events,
      nextBoundary: null,
      advancedThrough: context.at,
    };
  },
};
Object.freeze(PROMPTINGS_DEFAULTS);
