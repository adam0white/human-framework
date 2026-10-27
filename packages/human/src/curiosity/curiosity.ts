/** SCOPE: HF4 always-present owner. Source equations use immutable run parameters; no legacy continuation. */
import { cloneData } from '../core/clone.ts';
import { clamp01 } from '../core/index.ts';

const PHYSIOLOGICAL_NEEDS = ['food', 'water', 'sleep', 'rest', 'relief'] as const;
export const CURIOSITY_DEFAULTS = {
  unknownScale: 0.8,
  progressScale: 2,
  varyScale: 0.15,
  recentMinutes: 60,
  rewardMax: 0.03,
  fastAlpha: 0.5,
  slowAlpha: 0.15,
  maxKeys: 32,
  maxRecent: 8,
} as const;

/** HF4 learning uses frozen pre-outcome premises and returns an owned need receipt. */
export const curiosityOwner: import('../run-schema.ts').CuriosityOwner = {
  initialize() {
    return { errors: [], recent: [] };
  },
  learn(previous, input, context) {
    const state = cloneData(previous) as import('../run-schema.ts').CuriosityState;
    const d = context.effective.builtins.CURIOSITY_DEFAULTS;
    let needReward: import('../run-schema.ts').NeedRewardReceipt | null = null;
    if (input.outcome.status !== 'interrupted') {
      const offer = input.activity.offer;
      const key = offer.target === undefined ? offer.actionId : `${offer.actionId}@${offer.target}`;
      const error = clamp01(
        (Math.abs((input.outcome.status === 'completed' ? 1 : 0) - input.expected.successRate) +
          Math.abs(context.felt - input.expected.valence) / 2) /
          2,
      );
      let entry = state.errors.find((e) => e.key === key);
      if (!entry) {
        if (state.errors.length >= d.maxKeys) {
          let oldest = 0;
          for (let i = 1; i < state.errors.length; i++)
            if ((state.errors[i]?.lastAt ?? 0) < (state.errors[oldest]?.lastAt ?? 0)) oldest = i;
          state.errors.splice(oldest, 1);
        }
        entry = { key, fast: error, slow: error, n: 1, lastAt: context.at };
        state.errors.push(entry);
      } else {
        entry.fast = clamp01(entry.fast + d.fastAlpha * (error - entry.fast));
        entry.slow = clamp01(entry.slow + d.slowAlpha * (error - entry.slow));
        entry.n = Math.min(Number.MAX_SAFE_INTEGER, entry.n + 1);
        entry.lastAt = context.at;
      }
      const act: import('../run-schema.ts').CuriosityAct = { action: offer.actionId, at: context.at };
      if (offer.target !== undefined) act.targetId = offer.target;
      if (offer.place !== undefined) act.placeId = offer.place;
      state.recent.push(act);
      state.recent = state.recent.slice(-d.maxRecent);
      let urgency = 0;
      for (const n of context.before.needs)
        if (n.id === 'safety' || (PHYSIOLOGICAL_NEEDS as readonly string[]).includes(n.id))
          urgency = Math.max(urgency, n.urgency);
      const drive =
        (1 - clamp01(urgency)) *
        (1 - context.before.fear) *
        (0.25 + 0.75 * context.before.traits.openness) *
        (1.25 - 0.5 * context.before.life.maturity);
      const reward = Math.min(d.rewardMax, d.rewardMax * Math.max(0, entry.slow - entry.fast) * drive);
      if (reward > 0)
        needReward = {
          kind: 'curiosity-reward',
          evidenceId: input.outcome.evidenceId,
          leisure: reward / 2,
          competence: reward / 2,
        };
    }
    return {
      state,
      needReward,
      effects: { terms: [], modifiers: [], appraisals: [] },
      events: [],
      nextBoundary: null,
      advancedThrough: context.at,
    };
  },
  validate(state) {
    const issues: import('../run-schema.ts').ValidationIssue[] = [];
    const fail = (path: string) =>
      issues.push({ path, code: 'invalid-schema', message: 'Invalid curiosity state' });
    if (
      state.errors.length > CURIOSITY_DEFAULTS.maxKeys ||
      state.recent.length > CURIOSITY_DEFAULTS.maxRecent ||
      new Set(state.errors.map((e) => e.key)).size !== state.errors.length
    )
      fail('curiosity');
    for (const e of state.errors)
      if (
        !e.key ||
        !Number.isFinite(e.fast) ||
        e.fast < 0 ||
        e.fast > 1 ||
        !Number.isFinite(e.slow) ||
        e.slow < 0 ||
        e.slow > 1 ||
        !Number.isSafeInteger(e.n) ||
        e.n < 1 ||
        !Number.isSafeInteger(e.lastAt)
      )
        fail('curiosity.errors');
    for (const r of state.recent) if (!r.action || !Number.isSafeInteger(r.at)) fail('curiosity.recent');
    return issues;
  },
};

export function curiosityTerms(
  state: import('../run-schema.ts').DeepReadonly<import('../run-schema.ts').CuriosityState>,
  offer: import('../run-schema.ts').DeepReadonly<import('../run-schema.ts').Offer>,
  context: import('../run-schema.ts').DeepReadonly<
    import('../run-schema.ts').CuriosityLearningPremises & {
      at: number;
      expected: import('../run-schema.ts').ExpectedEffect;
      defaults: import('../run-schema.ts').Effective_CURIOSITY_DEFAULTS;
    }
  >,
): import('../run-schema.ts').TermData[] {
  const d = context.defaults,
    key = offer.target === undefined ? offer.actionId : `${offer.actionId}@${offer.target}`;
  let urgency = 0;
  for (const n of context.needs)
    if (n.id === 'safety' || (PHYSIOLOGICAL_NEEDS as readonly string[]).includes(n.id))
      urgency = Math.max(urgency, n.urgency);
  const drive =
    (1 - clamp01(urgency)) *
    (1 - context.fear) *
    (0.25 + 0.75 * context.traits.openness) *
    (1.25 - 0.5 * context.life.maturity);
  const error = state.errors.find((e) => e.key === key),
    recent = state.recent.filter(
      (r) =>
        r.at <= context.at && context.at - r.at <= d.recentMinutes * 60000 && r.action === offer.actionId,
    );
  const identical = recent.some((r) => r.targetId === offer.target && r.placeId === offer.place);
  const readings = {
    unknown: clamp01(1 - context.expected.confidence),
    progress: error ? clamp01(error.slow - error.fast) : 0,
    vary: !identical && recent.length > 0 ? 1 : 0,
  };
  return (['unknown', 'progress', 'vary'] as const).map((key) => ({
    source: `curiosity:${key}`,
    value: Math.round(Math.min(d[`${key}Scale`], d[`${key}Scale`] * readings[key] * drive) * 1e9) / 1e9,
  }));
}
