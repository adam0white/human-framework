/** SCOPE: HF4 always-present owner. Source equations use immutable run parameters; no legacy continuation. */
import { cloneData } from '../core/clone.ts';
import { clamp01, decay, dexp, dlog, sigmoid } from '../core/index.ts';
import { learningMultiplier } from '../lifecourse/development.ts';

const MINUTES_PER_DAY = 1440;
export const SKILL_DEFAULTS = {
  /** Level of an unknown/untrained skill. */
  base: 0.05,
  /** Fraction of gains above `base` that survives indefinite disuse. */
  retentionFloor: 0.6,
  /** Half-life (minutes) of the forgettable part of a gain during non-practice. */
  forgetHalfLife: 180 * MINUTES_PER_DAY,
  /** Initial learning rate per practice hour on (1 - level) with ideal challenge. */
  rate0: 0.02,
  /** Practice hours over which the rate halves (power-law scale). */
  rateScaleHours: 20,
  /** difficulty - level at which practice teaches most (desirable difficulty). */
  challengeOptimum: 0.1,
  /** Width (sd) of the challenge bell in level units. */
  challengeWidth: 0.2,
  /** Learning fraction retained when practice is far too easy or far too hard. */
  challengeFloor: 0.15,
  /** Learning multiplier on failed attempts relative to successes. */
  failureLearning: 0.6,
  /** Logistic slope on (effective skill - difficulty). */
  successSlope: 10,
  /** Logistic offset: at effective skill == difficulty, chance = sigmoid(bias) ≈ 0.73. */
  successBias: 1,
  /** Effective skill multiplier at zero capacity (1 at full capacity). */
  capacityFloor: 0.5,
  /** Effective skill added by full support (tools, help, instruction). */
  supportBonus: 0.15,
  /** Learning multiplier at practice quality 0 and 1 (0.5 → 1). Engineering assumption (see SCOPE). */
  qualityLow: 0.5,
  qualityHigh: 1.5,
  /** Extra learning from a fully engaged teacher at least `instructionGapScale` above the learner (1 = twice). */
  instructionGain: 1,
  instructionGapScale: 0.3,
  /** Observation learns at this fraction of practice's rate, toward `observeCeiling` × the model's level. */
  observeRate: 0.3,
  observeCeiling: 0.6,
  /**
   * Practice hours that double the forgetting half-life through consolidation:
   * half-life = forgetHalfLife × (1 + hours / consolidationHours). Engineering assumption (see SCOPE).
   */
  consolidationHours: 300,
} as const;

/** HF4 learning and retention. Practice durations are milliseconds in state, minutes in equations. */
export const skillsOwner: import('../run-schema.ts').SkillsOwner = {
  initialize(input, context) {
    return {
      skills: Object.fromEntries(
        input.map((s) => [
          s.id,
          { level: s.level, practicedMs: s.practicedMs, lastPracticed: s.lastPracticed },
        ]),
      ),
      skillRetention: { consolidationHours: context.effective.builtins.SKILL_DEFAULTS.consolidationHours },
    };
  },
  advance(_state, context) {
    // Levels remain anchored at lastPracticed. Rust is read at use, never compounded at call targets.
    return {
      state: cloneData(context.continuation.state) as Record<string, import('../run-schema.ts').Skill>,
      continuation: cloneData(
        context.continuation,
      ) as import('../run-schema.ts').DeliberationContinuation['skills'],
      consolidationHours: context.consolidationHours,
      effects: { terms: [], modifiers: [], appraisals: [] },
      events: [],
      nextBoundary: null,
      advancedThrough: context.to,
    };
  },
  learn(previous, input, context) {
    const state = cloneData(previous) as Record<string, import('../run-schema.ts').Skill>;
    const d = context.effective.builtins.SKILL_DEFAULTS;
    const witness = input.kind === 'witness';
    const skill = witness ? input.data.skill : input.activity.offer.demands.skill?.id;
    if (skill !== undefined) {
      const existing = state[skill];
      const prior = existing?.practicedMs ?? 0;
      const gained = Math.max(0, (existing?.level ?? d.base) - d.base);
      const floor = d.base + d.retentionFloor * gained;
      const before = existing
        ? clamp01(
            decay(
              existing.level,
              Math.max(0, context.at - existing.lastPracticed) / 60000,
              d.forgetHalfLife * (1 + prior / 3600000 / Math.max(1, d.consolidationHours)),
              Math.min(floor, existing.level),
            ),
          )
        : d.base;
      const rawDuration = witness ? input.data.durationMs : input.outcome.end - input.outcome.start;
      if (!Number.isSafeInteger(rawDuration) || rawDuration < 0)
        throw new RangeError('Invalid learning duration');
      const minutes = rawDuration / 60000;
      const domain = witness ? input.data.domain : (input.activity.offer.demands.skill?.domain ?? 'general');
      const learning =
        Math.max(0, learningMultiplier(context.ageYears, domain)) * (context.aptitude[skill] ?? 1);
      const hours = prior / 3600000;
      const exposure =
        d.rate0 *
        d.rateScaleHours *
        dlog((1 + (hours + minutes / 60) / d.rateScaleHours) / (1 + hours / d.rateScaleHours));
      let after = before;
      let practiceExposure = 0;
      if (witness) {
        const ceiling = d.observeCeiling * clamp01(input.data.modelLevel);
        if (ceiling > before && minutes > 0)
          after = clamp01(before + (ceiling - before) * (1 - dexp(-learning * d.observeRate * exposure)));
      } else {
        const demand = input.activity.offer.demands.skill;
        const gap = (demand?.difficulty ?? before) - before;
        const z = (gap - d.challengeOptimum) / d.challengeWidth;
        const challenge = d.challengeFloor + (1 - d.challengeFloor) * dexp(-0.5 * z * z);
        let k =
          learning * challenge * (input.outcome.status === 'completed' ? 1 : d.failureLearning) * exposure;
        const practice = input.outcome.actual.practice;
        if (practice?.quality !== undefined) {
          const q = clamp01(practice.quality);
          k *=
            q <= 0.5
              ? d.qualityLow + (1 - d.qualityLow) * (q / 0.5)
              : 1 + (d.qualityHigh - 1) * ((q - 0.5) / 0.5);
        }
        if (practice?.instruction)
          k *=
            1 +
            d.instructionGain *
              clamp01(practice.instruction.engagement ?? 1) *
              clamp01((clamp01(practice.instruction.level) - before) / d.instructionGapScale);
        after = clamp01(1 - (1 - before) * dexp(-k));
        practiceExposure = k;
      }
      if (!witness || after > before)
        state[skill] = {
          level: after,
          practicedMs: witness ? prior : prior + rawDuration,
          lastPracticed: Math.max(context.at, existing?.lastPracticed ?? context.at),
        };
      if (!witness && practiceExposure > 0)
        for (const transfer of [...context.transfers]
          .filter((t) => t.from === skill)
          .sort((a, b) => (a.to < b.to ? -1 : a.to > b.to ? 1 : 0))) {
          const held = state[transfer.to];
          const gained = Math.max(0, (held?.level ?? d.base) - d.base);
          const floor = d.base + d.retentionFloor * gained;
          const level = held
            ? clamp01(
                decay(
                  held.level,
                  Math.max(0, context.at - held.lastPracticed) / 60000,
                  d.forgetHalfLife * (1 + held.practicedMs / 3600000 / Math.max(1, d.consolidationHours)),
                  Math.min(floor, held.level),
                ),
              )
            : d.base;
          state[transfer.to] = {
            level: clamp01(1 - (1 - level) * dexp(-clamp01(transfer.fraction) * practiceExposure)),
            practicedMs: held?.practicedMs ?? 0,
            lastPracticed: Math.max(context.at, held?.lastPracticed ?? context.at),
          };
        }
    }
    return {
      state,
      effects: { terms: [], modifiers: [], appraisals: [] },
      events: [],
      nextBoundary: null,
      advancedThrough: context.at,
    };
  },
  successChance(state, input, context) {
    const d = context.effective.builtins.SKILL_DEFAULTS;
    const cap = clamp01(input.capacity);
    const effective =
      skillLevel({ ...state, effective: context.effective }, input.skill) *
        (d.capacityFloor + (1 - d.capacityFloor) * cap) +
      d.supportBonus * clamp01(input.support);
    return clamp01(sigmoid(d.successSlope * (effective - clamp01(input.difficulty)) + d.successBias));
  },
  validate(state) {
    const issues: import('../run-schema.ts').ValidationIssue[] = [];
    for (const [id, s] of Object.entries(state))
      if (
        !id ||
        !Number.isFinite(s.level) ||
        s.level < 0 ||
        s.level > 1 ||
        !Number.isSafeInteger(s.practicedMs) ||
        s.practicedMs < 0 ||
        !Number.isSafeInteger(s.lastPracticed)
      )
        issues.push({ path: `skills.${id}`, code: 'invalid-schema', message: 'Invalid skill state' });
    return issues;
  },
};

/** Pure retained competence. The stored level remains anchored at actual practice. */
export function skillLevel(
  p: Pick<import('../run-schema.ts').ActorState, 'skills' | 'now' | 'skillRetention'> & {
    effective: import('../run-schema.ts').EffectiveParameters;
  },
  id: string,
): number {
  const d = p.effective.builtins.SKILL_DEFAULTS,
    s = p.skills[id];
  if (!s) return d.base;
  const gained = Math.max(0, s.level - d.base),
    floor = Math.min(s.level, d.base + d.retentionFloor * gained);
  return clamp01(
    decay(
      s.level,
      Math.max(0, p.now - s.lastPracticed) / 60000,
      d.forgetHalfLife * (1 + s.practicedMs / 3600000 / Math.max(1, p.skillRetention.consolidationHours)),
      floor,
    ),
  );
}
