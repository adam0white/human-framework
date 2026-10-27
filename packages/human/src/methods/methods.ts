/** SCOPE: HF4 always-present owner. Source equations use immutable run parameters; no legacy continuation. */
import { clamp01, cmpStr, decay, isObj } from '../core/index.ts';
import type { MethodCue } from '../run-schema.ts';

const MINUTES_PER_DAY = 1440;
export const METHOD_DEFAULTS = {
  maxRules: 24,
  maxConditions: 8,
  maxCues: 24,
  maxEvidence: 16,
  maxRecentDemonstrations: 256,
  maxIdentifierLength: 96,
  maxValueLength: 128,
  contextMinutes: 120,
  evidenceHalfLife: 180 * MINUTES_PER_DAY,
  /** Two fully attended ordinary examples raise support to 0.5 before source trust. */
  evidencePrior: 2,
  utilityScale: 1.2,
};
const validId = (x: unknown): x is string =>
  typeof x === 'string' &&
  x.length > 0 &&
  x.length <= METHOD_DEFAULTS.maxIdentifierLength &&
  x !== '__proto__' &&
  x !== 'constructor' &&
  x !== 'prototype';
const validValue = (x: unknown): x is string =>
  typeof x === 'string' && x.length > 0 && x.length <= METHOD_DEFAULTS.maxValueLength;

function cleanCues(input: unknown, maximum: number): MethodCue[] | undefined {
  if (!Array.isArray(input) || input.length === 0 || input.length > maximum) return undefined;
  const out: MethodCue[] = [];
  for (const c of input) {
    if (!isObj(c) || !validId(c.cue) || !validValue(c.value)) return undefined;
    // Ambiguous duplicate observations do not silently choose the last value.
    if (out.some((v) => v.cue === c.cue)) return undefined;
    out.push({ cue: c.cue, value: c.value });
  }
  return out.sort((a, b) => cmpStr(a.cue, b.cue));
}

/** HF4 owner: received evidence only. Static world facts never enter this store. */
export const methodOwner: import('../run-schema.ts').MethodOwner = {
  initialize() {
    return { rules: [], recentDemonstrations: [] };
  },
  receive: receiveMethodEvidence,
  evidence(state, context) {
    const result: ReturnType<import('../run-schema.ts').MethodOwner['evidence']> = {
      support: 0,
      terms: [],
      matched: [],
    };
    const d = context.effective.builtins.METHOD_DEFAULTS;
    const current = state.context;
    if (
      !context.available ||
      !current ||
      current.id !== context.contextId ||
      context.at < current.at ||
      context.at - current.at > d.contextMinutes * 60000
    )
      return result;
    const matched: { id: string; action: string; sourceId: string; support: number }[] = [];
    for (const rule of state.rules) {
      if (!rule.conditions.every((c) => current.cues.some((v) => v.cue === c.cue && v.value === c.value)))
        continue;
      for (const sourceId of [...new Set(rule.evidence.map((e) => e.sourceId))].sort(cmpStr)) {
        let positive = 0,
          negative = 0;
        for (const e of rule.evidence)
          if (e.sourceId === sourceId && e.at <= context.at) {
            const w = decay(e.attention, (context.at - e.at) / 60000, d.evidenceHalfLife);
            if (e.outcome === 'success') positive += w;
            else negative += w;
          }
        const trust =
          context.voices.find((v) => v.voiceId === sourceId)?.trust ??
          context.sourceTrust.find((v) => v.sourceId === sourceId)?.trust ??
          context.effective.builtins.BELIEF_DEFAULTS.defaultTrust;
        matched.push({
          id: rule.id,
          action: rule.action,
          sourceId,
          support: (clamp01(trust) * (positive - negative)) / (positive + negative + d.evidencePrior),
        });
      }
    }
    const own = matched.filter((m) => m.action === context.action).reduce((sum, m) => sum + m.support, 0);
    const support = own / Math.max(1, Math.abs(own));
    return {
      support,
      matched,
      terms: matched
        .filter((m) => m.action === context.action && m.support !== 0)
        .map((m) => ({
          source: `method:${m.id}:${m.sourceId}`,
          value: d.utilityScale * m.support * (own === 0 ? 0 : support / own),
        })),
    };
  },
  validate(state) {
    const issues: import('../run-schema.ts').ValidationIssue[] = [];
    const fail = (path: string) =>
      issues.push({ path, code: 'invalid-schema', message: 'Invalid method evidence' });
    if (
      state.rules.length > METHOD_DEFAULTS.maxRules ||
      state.recentDemonstrations.length > METHOD_DEFAULTS.maxRecentDemonstrations
    )
      fail('methods');
    if (new Set(state.recentDemonstrations).size !== state.recentDemonstrations.length)
      fail('methods.recentDemonstrations');
    for (const [i, rule] of state.rules.entries()) {
      if (
        !validId(rule.id) ||
        !validId(rule.action) ||
        !cleanCues(rule.conditions, METHOD_DEFAULTS.maxConditions) ||
        rule.evidence.length > METHOD_DEFAULTS.maxEvidence
      )
        fail(`methods.rules.${i}`);
      for (const evidence of rule.evidence)
        if (
          !validId(evidence.id) ||
          !validId(evidence.sourceId) ||
          !Number.isSafeInteger(evidence.at) ||
          !Number.isFinite(evidence.attention) ||
          evidence.attention < 0 ||
          evidence.attention > 1 ||
          !['success', 'failure'].includes(evidence.outcome)
        )
          fail(`methods.rules.${i}.evidence`);
    }
    if (
      state.context &&
      (!validId(state.context.id) ||
        !Number.isSafeInteger(state.context.at) ||
        !cleanCues(state.context.cues, METHOD_DEFAULTS.maxCues))
    )
      fail('methods.context');
    return issues;
  },
};

export function receiveMethodEvidence(
  previous: import('../run-schema.ts').DeepReadonly<import('../run-schema.ts').MethodsState>,
  input: import('../run-schema.ts').DeepReadonly<import('../run-schema.ts').MethodInput>,
  context: {
    at: number;
    available: boolean;
    effective: {
      builtins: {
        METHOD_DEFAULTS: import('../run-schema.ts').DeepReadonly<
          import('../run-schema.ts').Effective_METHOD_DEFAULTS
        >;
      };
    };
  },
): import('../run-schema.ts').OwnerOutput<import('../run-schema.ts').MethodsState> {
  const state = structuredClone(previous) as import('../run-schema.ts').MethodsState;
  const defaults = context.effective.builtins.METHOD_DEFAULTS;
  if (input.kind === 'context-left') {
    if (state.context?.id === input.contextId) delete state.context;
  } else if (input.kind === 'cues') {
    delete state.context;
    if (context.available)
      state.context = {
        id: input.contextId,
        at: context.at,
        cues: input.cues.map((c) => ({ ...c })).sort((a, b) => cmpStr(a.cue, b.cue)),
      };
  } else {
    const data = input.data;
    const received = state.context;
    if (
      context.available &&
      received &&
      received.id === data.contextId &&
      context.at >= received.at &&
      context.at - received.at <= defaults.contextMinutes * 60000 &&
      Number.isFinite(data.receivedAttention) &&
      data.receivedAttention > 0 &&
      data.receivedAttention <= 1 &&
      data.conditions.length > 0 &&
      data.conditions.every((c) => received.cues.some((v) => v.cue === c.cue && v.value === c.value)) &&
      !state.recentDemonstrations.includes(data.demonstrationId) &&
      !state.rules.some((r) => r.evidence.some((e) => e.id === data.demonstrationId))
    ) {
      const conditions = data.conditions.map((c) => ({ ...c })).sort((a, b) => cmpStr(a.cue, b.cue));
      let rule = state.rules.find(
        (r) => r.action === data.action && JSON.stringify(r.conditions) === JSON.stringify(conditions),
      );
      if (!rule) {
        rule = { id: data.methodId, action: data.action, conditions, evidence: [] };
        state.rules.push(rule);
        if (state.rules.length > defaults.maxRules) state.rules.shift();
      }
      rule.evidence.push({
        id: data.demonstrationId,
        sourceId: data.teacher,
        at: context.at,
        attention: data.receivedAttention,
        outcome: data.outcome,
      });
      if (rule.evidence.length > defaults.maxEvidence) rule.evidence.shift();
      state.recentDemonstrations.push(data.demonstrationId);
      if (state.recentDemonstrations.length > defaults.maxRecentDemonstrations)
        state.recentDemonstrations.shift();
    }
  }
  return {
    state,
    effects: { terms: [], modifiers: [], appraisals: [] },
    events: [],
    nextBoundary: null,
    advancedThrough: context.at,
  };
}
