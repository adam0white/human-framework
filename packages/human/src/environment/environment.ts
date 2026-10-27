import { freezeData } from '../body/span.ts';
import { keyOf, Memo } from '../core/memo.ts';
import { hashCanonical } from '../run-canonical.ts';
/** SCOPE: actual received surroundings. Missing observations remain unknown;
 * coefficient magnitudes are engineering priors (research/family-environment-sources.md). */

import { clip, copy, output, validateNumbers } from '../body/span.ts';
import { readCharacterTrajectory } from '../character/character.ts';
import type * as T from '../run-schema.ts';
export const ENVIRONMENT_DEFAULTS = freezeData({
  coldMood: 0.08,
  darkMood: 0.03,
  shortDayMood: 0.06,
  /** Day length (hours) with no seasonal effect, and the length at which it is full. */
  longDayHours: 12,
  shortDayHours: 6,
  weatherMood: 0.04,
  indoorWeather: 0.4,
  beautyMood: 0.06,
  crowdingMood: 0.06,
  crowdingTolerance: 0.4,
  crowdingToleranceExtraversion: 0.3,
  coldMetabolism: 0.15,
  coldRecovery: 1,
  coldSleep: 0.3,
  darkWake: 0.15,
  crowdingAutonomyPerHour: 0.02,
  squalorSafetyPerHour: 0.02,
  beautyLeisurePerHour: 0.01,
  aweBeauty: 0.7,
  aweIntensity: 0.4,
});

export function ambientMood(
  a: T.DeepReadonly<T.AmbientPercept>,
  traits: T.DeepReadonly<T.Traits>,
  asleep: boolean,
  p: T.DeepReadonly<T.Effective_ENVIRONMENT_DEFAULTS>,
): number {
  const tol = clip(p.crowdingTolerance + p.crowdingToleranceExtraversion * traits.extraversion),
    excess = tol >= 1 ? 0 : clip(((a.crowding ?? 0) - tol) / (1 - tol));
  const short =
    a.dayLengthHours === undefined
      ? 0
      : clip((p.longDayHours - a.dayLengthHours) / (p.longDayHours - p.shortDayHours));
  return clip(
    -p.coldMood * (a.cold ?? 0) -
      (asleep ? 0 : p.darkMood * (a.dark ?? 0)) -
      p.shortDayMood * short * (0.5 + traits.emotionality) +
      p.weatherMood * (a.weather ?? 0) * (a.outdoors ? 1 : p.indoorWeather) +
      p.beautyMood * (a.beauty ?? 0) -
      p.crowdingMood * excess,
    -1,
    1,
  );
}
export function ambientNeedRates(
  a: T.DeepReadonly<T.AmbientPercept>,
  traits: T.DeepReadonly<T.Traits>,
  p: T.DeepReadonly<T.Effective_ENVIRONMENT_DEFAULTS>,
): Partial<Record<T.PsychologicalNeed, number>> {
  const tol = clip(p.crowdingTolerance + p.crowdingToleranceExtraversion * traits.extraversion),
    excess = tol >= 1 ? 0 : clip(((a.crowding ?? 0) - tol) / (1 - tol)),
    beauty = a.beauty ?? 0;
  return {
    autonomy: (-p.crowdingAutonomyPerHour * excess) / 60,
    safety: beauty < 0 ? (p.squalorSafetyPerHour * beauty) / 60 : 0,
    leisure: beauty > 0 ? (p.beautyLeisurePerHour * beauty) / 60 : 0,
  };
}
/** Evaluate the same immutable received premises at the solver's actual sample time. */
export function readEnvironmentTrajectory(
  path: T.DeepReadonly<T.EnvironmentTrajectory>,
  at: number,
  effective: T.DeepReadonly<{ builtins: Pick<T.EffectiveBuiltins, 'ENVIRONMENT_DEFAULTS'> }>,
): { moodOffset: number; needsPerMinute: Partial<Record<T.PsychologicalNeed, number>> } {
  const { traits } = readCharacterTrajectory(path.character, at);
  const p = effective.builtins.ENVIRONMENT_DEFAULTS;
  return {
    moodOffset: ambientMood(path.percept, traits, path.asleep, p),
    needsPerMinute: ambientNeedRates(path.percept, traits, p),
  };
}
const environmentPaths = new Memo<T.EnvironmentTrajectory>(256);
function buildEnvironmentTrajectory(
  state: Parameters<T.EnvironmentOwner['trajectory']>[0],
  ctx: Parameters<T.EnvironmentOwner['trajectory']>[1],
): T.EnvironmentTrajectory {
  return freezeData({
    id: hashCanonical(
      'environment-path',
      state,
      ctx.character.id,
      ctx.asleep,
      ctx.effectiveParametersHash,
      ctx.effective.builtins.ENVIRONMENT_DEFAULTS,
    ),
    character: copy<T.CharacterTrajectory>(ctx.character),
    percept: copy<T.AmbientPercept>(state.percept),
    asleep: ctx.asleep,
  });
}
export const environmentOwner: T.EnvironmentOwner = {
  trajectory: (state, ctx) =>
    environmentPaths.get(
      JSON.stringify([
        state,
        keyOf(ctx.character),
        ctx.asleep,
        ctx.effectiveParametersHash,
        ctx.effective.builtins.ENVIRONMENT_DEFAULTS,
      ]),
      () => buildEnvironmentTrajectory(state, ctx),
    ),
  forcing: (state, ctx) => ({
    moodOffset: ambientMood(
      state.percept,
      ctx.traits,
      ctx.asleep,
      ctx.effective.builtins.ENVIRONMENT_DEFAULTS,
    ),
    needsPerMinute: ambientNeedRates(state.percept, ctx.traits, ctx.effective.builtins.ENVIRONMENT_DEFAULTS),
  }),
  initialize: (ctx) => ({ percept: {}, contextId: null, basis: null, since: ctx.at }),
  receive: (state, input, ctx) => {
    const affectReceipts: Extract<T.AffectEndpoint, { kind: 'felt' }>[] = [];
    if (input.kind === 'received') {
      const seen = copy<T.AmbientPercept>(input.evidence.readings),
        p = ctx.effective.builtins.ENVIRONMENT_DEFAULTS;
      if (ctx.alive && (seen.beauty ?? 0) >= p.aweBeauty && (state.percept.beauty ?? 0) < p.aweBeauty)
        affectReceipts.push({
          kind: 'felt',
          id: 'awe',
          intensity: p.aweIntensity * (seen.beauty ?? 0),
          cause: 'event:beauty',
        });
      return {
        ...output(
          {
            percept: seen,
            contextId: input.evidence.contextId,
            basis: copy<T.ContextBasis>(input.evidence.basis),
            since: ctx.at,
          },
          ctx.at,
        ),
        affectReceipts,
      };
    }
    if (input.kind === 'expired') {
      if (
        state.contextId !== input.contextId ||
        state.basis?.at !== input.basisAt ||
        state.basis.validUntil === undefined ||
        ctx.at < state.basis.validUntil
      )
        throw new RangeError('stale or premature ambient expiry');
    } else if (state.contextId !== input.contextId)
      throw new RangeError('ambient departure context mismatch');
    return {
      ...output({ percept: {}, contextId: null, basis: null, since: ctx.at }, ctx.at),
      affectReceipts,
    };
  },
  validate: (s) => validateNumbers(s),
};
