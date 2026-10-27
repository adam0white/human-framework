/** SCOPE: HF4 always-present owner. Source equations use immutable run parameters; no legacy continuation. */
import { clamp01, cmpStr, dpow, round } from '../core/index.ts';
export const PERSISTENCE_DEFAULTS = {
  continueScale: 0.8,
  switchScale: 0.8,
  cap: 0.8,
  switchMargin: 0.15,
  slackMinutes: 20,
  maxMinutes: 240,
  restMinutes: 20,
  stallHalfLifeMinutes: 30,
} as const;

/** HF4 pursuit lifetime; activity-start formation remains a separate reached boundary. */
export const persistenceOwner: import('../run-schema.ts').PersistenceOwner = {
  initialize() {
    return {};
  },
  begin(previous, context) {
    const d = context.effective.builtins.PERSISTENCE_DEFAULTS;
    const state = structuredClone(previous) as import('../run-schema.ts').PursuitState;
    if (state.rested && context.at >= state.rested.until) delete state.rested;
    if (
      state.current &&
      (!context.goals.some((g) => g.id === state.current?.goalId && g.status === 'active') ||
        context.at - state.current.lastServedAt >= d.slackMinutes * 60000)
    )
      delete state.current;
    if (state.current && context.at - state.current.since >= d.maxMinutes * 60000) {
      state.rested = { goalId: state.current.goalId, until: context.at + d.restMinutes * 60000 };
      delete state.current;
    }
    const candidates = context.goals
      .filter((g) => g.status === 'active' && g.id !== state.rested?.goalId)
      .map((goal) => ({
        goal,
        value: context.terms
          .filter((t) => t.source === `goal:${goal.id}` && t.value > 0)
          .reduce((sum, t) => sum + t.value, 0),
      }))
      .filter((c) => c.value > 0)
      .sort((a, b) => b.value - a.value || cmpStr(a.goal.id, b.goal.id));
    const best = candidates[0];
    if (best) {
      const current = state.current;
      const currentValue = candidates.find((c) => c.goal.id === current?.goalId)?.value ?? 0;
      if (current && current.goalId !== best.goal.id && round(best.value - currentValue) <= d.switchMargin) {
        if (currentValue > 0) current.lastServedAt = context.at;
      } else
        state.current = {
          goalId: best.goal.id,
          since: current?.goalId === best.goal.id ? current.since : context.at,
          lastServedAt: context.at,
          strength: clamp01(best.goal.importance * (0.4 + 0.6 * context.traits.conscientiousness)),
        };
    }
    return {
      state,
      effects: { terms: [], modifiers: [], appraisals: [] },
      events: [],
      nextBoundary: null,
      advancedThrough: context.at,
    };
  },
  advance(previous, context) {
    const state = structuredClone(previous) as import('../run-schema.ts').PursuitState;
    const d = context.effective.builtins.PERSISTENCE_DEFAULTS;
    if (state.rested && context.to >= state.rested.until) delete state.rested;
    const current = state.current;
    let nextBoundary: number | null = null;
    if (current) {
      const active = context.goals.some((g) => g.id === current.goalId && g.status === 'active');
      const slackAt = current.lastServedAt + d.slackMinutes * 60000;
      const maxAt = current.since + d.maxMinutes * 60000;
      if (!Number.isSafeInteger(slackAt) || !Number.isSafeInteger(maxAt))
        throw new RangeError('Invalid pursuit deadline');
      const first = Math.min(slackAt, maxAt);
      if (!active || context.to >= first) {
        delete state.current;
        if (active && maxAt < slackAt) {
          const until = maxAt + d.restMinutes * 60000;
          if (!Number.isSafeInteger(until)) throw new RangeError('Invalid pursuit rest deadline');
          if (context.to < until) state.rested = { goalId: current.goalId, until };
        }
      } else nextBoundary = first;
    }
    if (state.rested && (nextBoundary === null || state.rested.until < nextBoundary))
      nextBoundary = state.rested.until;
    return {
      state,
      effects: { terms: [], modifiers: [], appraisals: [] },
      events: [],
      nextBoundary,
      advancedThrough: context.to,
    };
  },
  validate(state) {
    const issues: import('../run-schema.ts').ValidationIssue[] = [];
    if (
      state.current &&
      (!state.current.goalId ||
        !Number.isSafeInteger(state.current.since) ||
        !Number.isSafeInteger(state.current.lastServedAt) ||
        state.current.lastServedAt < state.current.since ||
        !Number.isFinite(state.current.strength) ||
        state.current.strength < 0 ||
        state.current.strength > 1)
    )
      issues.push({ path: 'pursuit.current', code: 'invalid-schema', message: 'Invalid pursuit' });
    if (state.rested && (!state.rested.goalId || !Number.isSafeInteger(state.rested.until)))
      issues.push({ path: 'pursuit.rested', code: 'invalid-schema', message: 'Invalid pursuit rest' });
    return issues;
  },
  validatePortable(state, goals, allocated) {
    const issues = [...persistenceOwner.validate(state)];
    for (const id of [state.current?.goalId, state.rested?.goalId])
      if (
        id !== undefined &&
        (!goals.some((g) => g.id === id) || !allocated.some((r) => r.kind === 'goal' && r.id === id))
      )
        issues.push({ path: 'pursuit.goalId', code: 'unknown-id', message: 'Unmapped pursuit goal' });
    return issues;
  },
};

export function persistenceTerms(
  state: import('../run-schema.ts').DeepReadonly<import('../run-schema.ts').PursuitState>,
  terms: import('../run-schema.ts').DeepReadonly<readonly import('../run-schema.ts').TermData[]>,
  context: import('../run-schema.ts').DeepReadonly<{
    at: number;
    goals: readonly import('../run-schema.ts').Goal[];
    needs: readonly import('../run-schema.ts').NeedReading[];
    fear: number;
    defaults: import('../run-schema.ts').Effective_PERSISTENCE_DEFAULTS;
  }>,
): import('../run-schema.ts').TermData[] {
  const c = state.current;
  if (!c) return [];
  const goal = context.goals.find((g) => g.id === c.goalId && g.status === 'active');
  if (!goal) return [];
  const d = context.defaults,
    stall = Math.max(0, context.at - goal.lastAdvancedAt) / 60000,
    attenuation = dpow(0.5, stall / d.stallHalfLifeMinutes);
  let urgency = 0;
  for (const n of context.needs)
    if (['safety', 'food', 'water', 'sleep', 'rest', 'relief'].includes(n.id))
      urgency = Math.max(urgency, n.urgency);
  const gate = (1 - clamp01(urgency)) * (1 - context.fear);
  if (terms.some((t) => t.source === `goal:${c.goalId}` && t.value > 0))
    return [
      {
        source: `pursuit:${c.goalId}`,
        value: round(Math.min(d.cap, d.continueScale * c.strength * gate) * attenuation),
      },
    ];
  if (terms.some((t) => t.source.startsWith('commitment:'))) return [];
  return [
    {
      source: 'pursuit:switch',
      value: -round(Math.min(d.cap, d.switchScale * c.strength * gate) * attenuation),
    },
  ];
}
