import { freezeData } from '../body/span.ts';
/** SCOPE: source age curves. Each coefficient is an engineering prior, not a population prediction. */

import {
  advanceHazard,
  ageYearsAt,
  arm,
  clip as clamp,
  clock,
  copy,
  evaluateCell,
  hazardIssues,
  issue,
  newHazard,
  nextPathBoundary,
  output,
  rebaseHazard,
  scalarAt,
  smooth as smoothstep,
  validateNumbers,
  YEAR,
} from '../body/span.ts';
import { dexp, dpow } from '../core/libm.ts';
import { widowhoodMortality } from '../partnering/partnering.ts';
import type * as T from '../run-schema.ts';
import type { DeepReadonly, Effective_LIFE_DEFAULTS, LifeModifiers, LifeStage } from '../run-schema.ts';
import { chronicHazard } from './health.ts';
export const LIFE_DEFAULTS = freezeData({
  /** Gompertz hazard at the reference age, per year. */
  gompertzBase: 0.0005,
  gompertzRefAge: 30,
  /** Years for the age-only hazard to double. */
  gompertzDoublingYears: 8,
  /** Fractional maxFitness lost per year after the plateau. */
  fitnessDeclinePerYear: 0.008,
  fitnessPlateauEnd: 35,
  /** Fractional recovery lost per year after 30. */
  recoveryDeclinePerYear: 0.008,
});

export function stageForAge(age: number): LifeStage {
  if (age < 2) return 'infant';
  if (age < 12) return 'child';
  if (age < 18) return 'adolescent';
  if (age < 65) return 'adult';
  return 'elder';
}

/** Modifiers for a given age in years. 1 = prime adult for each multiplier. */
export function modifiersForAge(
  age: number,
  params: DeepReadonly<Effective_LIFE_DEFAULTS> = LIFE_DEFAULTS,
): LifeModifiers {
  const a = Math.max(0, age);
  const metabolism = 1 + 0.5 * dexp(-a / 6) - 0.15 * smoothstep(50, 80, a);
  const recovery = clamp(
    1.1 - 0.1 * smoothstep(15, 30, a) - params.recoveryDeclinePerYear * Math.max(0, a - 30),
    0.4,
    1.2,
  );
  const learning = clamp(0.9 + 0.5 * dexp(-a / 10) - 0.003 * Math.max(0, a - 30), 0.5, 1.5);
  const maturity = 0.1 + 0.9 * smoothstep(2, 25, a);
  const maxFitness = clamp(
    a < 20
      ? 0.3 + 0.7 * smoothstep(0, 20, a)
      : 1 - params.fitnessDeclinePerYear * Math.max(0, a - params.fitnessPlateauEnd),
    0.15,
    1,
  );
  const mortalityPerYear = Math.min(
    1,
    params.gompertzBase * dpow(2, (a - params.gompertzRefAge) / params.gompertzDoublingYears),
  );
  return {
    ageYears: age,
    stage: stageForAge(age),
    metabolism,
    recovery,
    learning,
    maturity,
    maxFitness,
    mortalityPerYear,
  };
}

const initialize: T.LifecycleOwner['initialize'] = (input, ctx) => {
  const state: T.LifeCourse = { bornAt: input.birthAt, sex: input.sex };
  const catalog = [...ctx.effective.fixedPriors.chronicConditions].sort((a, b) =>
    a.kind < b.kind ? -1 : a.kind > b.kind ? 1 : 0,
  );
  const id = `life:${ctx.person}:${ctx.at}`;
  return {
    state,
    continuation: {
      clock: clock(ctx.at, id, ctx.effectiveParametersHash),
      birthAtMs: input.birthAt,
      catalogOrder: catalog.map((c) => c.kind),
      hazards: [
        ...catalog.map((c) =>
          newHazard({ kind: 'chronic', channelId: c.kind }, ctx.at, id, ctx.effectiveParametersHash),
        ),
        newHazard({ kind: 'mortality', channelId: 'mortality' }, ctx.at, id, ctx.effectiveParametersHash),
      ],
      bodyTrajectoryId: id,
      physicalReceiptIds: [],
      pending: [],
    },
  };
};
const advance: T.LifecycleOwner['advance'] = (state, ctx) => {
  let c = copy<T.LifeContinuation>(ctx.continuation);
  const conditionId = JSON.stringify([
    'life',
    ctx.body.id,
    ctx.smoking.kind,
    ctx.smoking.kind === 'unobserved' ? null : ctx.smoking.value,
    [...ctx.heldConditionKinds].sort(),
    ctx.bonds.marriages.map((m) => [m.spouseId, m.endedAt ?? null, m.end ?? null]),
  ]);
  if (c.clock.conditionId !== conditionId)
    c = {
      ...c,
      clock: clock(ctx.from, conditionId, ctx.effectiveParametersHash),
      hazards: c.hazards.map((h) => rebaseHazard(h, ctx.from, conditionId, ctx.effectiveParametersHash)),
    };
  const frozen = [...ctx.effective.fixedPriors.chronicConditions].sort((a, b) =>
    a.kind < b.kind ? -1 : a.kind > b.kind ? 1 : 0,
  );
  const given = [...ctx.conditions].sort((a, b) => (a.kind < b.kind ? -1 : a.kind > b.kind ? 1 : 0));
  if (JSON.stringify(frozen) !== JSON.stringify(given))
    throw new RangeError('fixed chronic catalog mismatch');
  const body = (component: T.BodyComponent, t: number) => {
    const f = ctx.body.fields.find((f) => f.field.component === component && f.field.recordId === null);
    if (!f) throw new RangeError(`missing life body trajectory ${component}`);
    return scalarAt(f.path, t);
  };
  const severity = (t: number) =>
    ctx.body.fields
      .filter((f) => f.field.component === 'illness-severity')
      .reduce((n, f) => n + scalarAt(f.path, t), 0);
  const lambda = (key: T.HazardKey, t: number) => {
    if (!ctx.alive) return 0;
    if (key.kind === 'chronic') {
      if (ctx.heldConditionKinds.includes(key.channelId)) return 0;
      const condition = frozen.find((c) => c.kind === key.channelId);
      if (!condition) throw new RangeError('unknown chronic channel');
      const exposure: T.Exposures = {
        sleepDebtHours: body('sleep-debt-hours', t),
        fitness: body('fitness', t),
      };
      if (ctx.smoking.kind !== 'unobserved') exposure.smoking = ctx.smoking.value;
      return (
        chronicHazard(
          ageYearsAt(state.bornAt, ctx.from) + (t - ctx.from) / YEAR,
          condition,
          exposure,
          ctx.effective.builtins.HEALTH_DEFAULTS,
        ) /
        (YEAR / 60000)
      );
    }
    const p = ctx.effective.builtins.HEALTH_DEFAULTS;
    return (
      Math.min(
        1,
        modifiersForAge(
          ageYearsAt(state.bornAt, ctx.from) + (t - ctx.from) / YEAR,
          ctx.effective.builtins.LIFE_DEFAULTS,
        ).mortalityPerYear *
          (1 + p.healthMortality * (1 - body('health', t)) + p.illnessMortality * severity(t)) *
          widowhoodMortality(ctx.bonds, state.sex, t, ctx.effective.builtins.PARTNERING_DEFAULTS),
      ) /
      (YEAR / 60000)
    );
  };
  let stop = ctx.to,
    boundary: T.HazardBoundary | null = null;
  for (const h of c.hazards) {
    const r = advanceHazard(
      h,
      ctx.from,
      ctx.to,
      (t) => lambda(h.key, t),
      ctx.body.to,
      (t) =>
        nextPathBoundary(
          t,
          ctx.body.fields.map((f) => f.path),
        ),
    );
    if (r.boundary && (r.at < stop || (r.at === stop && boundary === null))) {
      stop = r.at;
      boundary = r.boundary;
    }
  }
  const hazards = c.hazards.map(
    (h) =>
      advanceHazard(
        h,
        ctx.from,
        stop,
        (t) => lambda(h.key, t),
        ctx.body.to,
        (t) =>
          nextPathBoundary(
            t,
            ctx.body.fields.map((f) => f.path),
          ),
      ).hazard,
  );
  c = { ...c, hazards, clock: { ...c.clock, advancedThroughMs: stop }, bodyTrajectoryId: ctx.body.id };
  return {
    ...output(copy<T.LifeCourse>(state), stop),
    continuation: c,
    randomBoundary: boundary,
    nextBoundary: boundary?.at ?? null,
    bodyReceipts: [],
  };
};
const commitHazard: T.LifecycleOwner['commitHazard'] = (state, boundary, ctx) => {
  let c = copy<T.LifeContinuation>(ctx.continuation),
    rng = copy<T.ActorRandomCursor>(ctx.rng);
  const i = c.hazards.findIndex(
      (h) => h.key.kind === boundary.key.kind && h.key.channelId === boundary.key.channelId,
    ),
    h = c.hazards[i];
  if (
    !h ||
    !ctx.alive ||
    boundary.at !== ctx.at ||
    (h.key.kind === 'chronic' && ctx.heldConditionKinds.includes(h.key.channelId))
  )
    throw new RangeError('ineligible life hazard');
  const bodyReceipts: ReturnType<T.LifecycleOwner['commitHazard']>['bodyReceipts'][number][] = [];
  let replacement: T.HazardContinuation;
  if (boundary.operation === 'allocate') {
    if (h.threshold) throw new RangeError('duplicate life budget');
    const a = arm(h, rng, ctx.at);
    rng = a.rng;
    replacement = a.hazard;
  } else {
    if (!h.threshold) throw new RangeError('missing life budget');
    const reached = h.activeIntegralCell ? evaluateCell(h.activeIntegralCell, ctx.at) : h.acceptedIntegral;
    if (reached < h.threshold.exponentialBudget) throw new RangeError('unreached life threshold');
    replacement = {
      ...newHazard(h.key, ctx.at, c.clock.conditionId, ctx.effectiveParametersHash),
      episodeOrdinal: h.episodeOrdinal + 1,
    };
    if (h.key.kind === 'chronic') {
      const condition = ctx.effective.fixedPriors.chronicConditions.find((c) => c.kind === h.key.channelId);
      if (!condition) throw new RangeError('unknown fixed chronic condition');
      bodyReceipts.push({
        kind: 'illness-onset',
        illness: {
          kind: condition.kind,
          severity: condition.severity,
          trendPerDay: 0,
          contagious: false,
          chronic: true,
          baseline: condition.severity,
        },
      });
    } else bodyReceipts.push({ kind: 'mortality-discovered', at: ctx.at });
  }
  c = {
    ...c,
    hazards: c.hazards.map((x, j) => (j === i ? replacement : x)),
    clock: { ...c.clock, advancedThroughMs: ctx.at },
  };
  return { ...output(copy<T.LifeCourse>(state), ctx.at), continuation: c, rng, bodyReceipts };
};
export const lifecycleOwner: T.LifecycleOwner = {
  initialize,
  modifiers: (state, ctx) =>
    modifiersForAge(ageYearsAt(state.bornAt, ctx.at), ctx.effective.builtins.LIFE_DEFAULTS),
  advance,
  commitHazard,
  receive: (state, _input, ctx) => ({
    ...output(copy<T.LifeCourse>(state), ctx.at),
    rng: copy<T.ActorRandomCursor>(ctx.rng),
  }),
  validate: (s, c) => {
    const issues = validateNumbers({ s, c });
    if (!Number.isSafeInteger(s.bornAt) || c.birthAtMs !== s.bornAt)
      issues.push(issue('life.birth', 'birth clock mismatch'));
    if (new Set(c.hazards.map((h) => JSON.stringify(h.key))).size !== c.hazards.length)
      issues.push(issue('life.hazards', 'duplicate hazard'));
    for (const h of c.hazards) issues.push(...hazardIssues(h));
    return issues;
  },
};
