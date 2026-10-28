/** SCOPE: uncalibrated crisis onset, generic restricted assent and source recovery.
 * No invented world action, psychiatric diagnosis or spontaneous comfort. */

import { numericalTolerance, numericalWidth } from '../body/daily-policy.ts';
import {
  advanceHazard,
  arm,
  clip,
  clock,
  copy,
  copyContinuation,
  draw,
  evaluateCell,
  freezeData,
  hazardIssues,
  initialWidth,
  integrateCell,
  issue,
  LN2,
  newHazard,
  nextPathBoundary,
  numericalIssues,
  output,
  rebaseHazard,
  required,
  scalarAt,
  spanBudgetExceeded,
  validateNumbers,
} from '../body/span.ts';
import { readCharacterTrajectory } from '../character/character.ts';
import { EngineLimitError } from '../core/limit.ts';
import type * as T from '../run-schema.ts';
export const CRISIS_DEFAULTS = freezeData({
  /** Felt valence below which mood pressure starts. */
  breakMood: -0.35,
  /** Stress above which stress pressure starts. */
  breakStress: 0.6,
  /** Hazard per hour at full pressure and average emotionality (h = base × pressure × (0.5 + emotionality)). */
  baseHazard: 0.15,
  stressHalfLife: 1440,
  /** Stress gained per day at mood valence -1 (linear in how negative the mood is). */
  stressMoodRate: 0.6,
  /** Default break length range in minutes. */
  minutes: [120, 360] as readonly [number, number],
  /** No new break for this long after one ends. */
  refractory: 12 * 60,
  /** Share of stress kept when a break ends. */
  afterBreakStress: 0.5,
  /** Behaviours kept per person. */
  maxBehaviours: 16,
  /** Stress per controlled hour against one's will (× the command margin, capped at 1). */
  commandStrainPerHour: 0.05,
  /** Stress per unit of injury severity. */
  injuryStrain: 0.3,
});

function anchor(
  state: T.DeepReadonly<T.CrisisState>,
  at: number,
  id: string,
  hash: string,
): T.CrisisContinuation {
  return {
    clock: clock(at, id, hash),
    stressAtAnchor: state.stress,
    acceptedThroughMs: at,
    materializedAtMs: at,
    nextTrialWidthMinutes: initialWidth(1440) / 60000,
    stressCell: null,
    stressError: 0,
    hazard: newHazard({ kind: 'crisis', channelId: 'onset' }, at, id, hash),
    recovery: state.active
      ? {
          behaviourId: state.active.repertoireId,
          sinceMs: state.active.since,
          remainingWorkMinutesAtAnchor: (state.active.until - at) / 60000,
          anchorMs: at,
          sleepRate: 1,
          lastComfortReceiptId: null,
        }
      : null,
    lastBreakAtMs: state.lastBreakAt ?? null,
    refractoryUntilMs: state.lastBreakAt === undefined ? null : state.lastBreakAt + 720 * 60000,
    breaks: state.breaks,
  };
}
export function trajectoryFeltValence(
  mood: T.DeepReadonly<T.AffectTrajectory>,
  at: number,
  p: T.DeepReadonly<T.Effective_AFFECT_DEFAULTS>,
): number {
  const v = mood.emotions.reduce((s, e) => s + p.valence[e.identity.kind] * scalarAt(e.intensity, at), 0);
  return clip(scalarAt(mood.valence, at) + p.feltEmotionWeight * clip(v, -1, 1), -1, 1);
}
const initialize: T.CrisisOwner['initialize'] = (ctx) => {
  const repertoire = copy<T.BreakBehaviour[]>(ctx.effective.fixedPriors.crisisRepertoire);
  if (!repertoire.length || repertoire.reduce((s, b) => s + Math.max(0, b.weight ?? 1), 0) <= 0)
    throw new RangeError('positive crisis repertoire required');
  const state: T.CrisisState = { stress: 0, checkedAt: ctx.at, breaks: 0, repertoire };
  return {
    state,
    continuation: anchor(state, ctx.at, `crisis:${ctx.person}:${ctx.at}`, ctx.effectiveParametersHash),
  };
};
const advance: T.CrisisOwner['advance'] = (state, ctx) => {
  const p = ctx.effective.builtins.CRISIS_DEFAULTS;
  if (!Number.isFinite(ctx.commandStrainRatePerMinute) || ctx.commandStrainRatePerMinute < 0)
    throw new RangeError('invalid actual command forcing');
  let c = copyContinuation<T.CrisisContinuation>(ctx.continuation),
    s = copy<T.CrisisState>(state),
    to = ctx.to;
  const conditionId = JSON.stringify([
    'crisis',
    ctx.mood.id,
    ctx.body.conditionId,
    ctx.asleep,
    ctx.alive,
    ctx.commandStrainRatePerMinute,
  ]);
  if (c.clock.conditionId !== conditionId) {
    c = {
      ...c,
      clock: clock(ctx.from, conditionId, ctx.effectiveParametersHash),
      stressAtAnchor: state.stress,
      stressCell: null,
      acceptedThroughMs: ctx.from,
      materializedAtMs: ctx.from,
    };
  }
  // Eligibility changes at a semantic clock, never inside a numerical cell.
  const refractory = c.refractoryUntilMs !== null && ctx.from < c.refractoryUntilMs;
  const eligibilityEnd = refractory ? required(c.refractoryUntilMs) : Infinity;
  to = Math.min(to, eligibilityEnd);
  // Emotionality changes onset intensity, never the stress derivative.
  const hazardId = JSON.stringify([conditionId, ctx.character.id, refractory]);
  if (c.hazard.clock.conditionId !== hazardId)
    c = { ...c, hazard: rebaseHazard(c.hazard, ctx.from, hazardId, ctx.effectiveParametersHash) };
  const rate = ctx.asleep ? 2 : 1;
  if (c.recovery && c.recovery.sleepRate !== rate) {
    const r = c.recovery;
    c = {
      ...c,
      recovery: {
        ...r,
        remainingWorkMinutesAtAnchor: Math.max(
          0,
          r.remainingWorkMinutesAtAnchor - ((ctx.from - r.anchorMs) / 60000) * r.sleepRate,
        ),
        anchorMs: ctx.from,
        sleepRate: rate,
      },
    };
  }
  if (c.recovery && s.active)
    s.active.until =
      c.recovery.anchorMs +
      Math.ceil((c.recovery.remainingWorkMinutesAtAnchor / c.recovery.sleepRate) * 60000);
  if (c.recovery)
    to = Math.min(
      to,
      c.recovery.anchorMs + Math.ceil((c.recovery.remainingWorkMinutesAtAnchor / rate) * 60000),
    );
  let at = ctx.from,
    calls = 0,
    ownCells = 0,
    forcedCells = 0;
  const stressCells: T.ScalarCell[] = [];
  while (at < to) {
    let cell = c.stressCell,
      end = c.acceptedThroughMs;
    if (!cell || at >= end) {
      const start = cell ? end : c.clock.conditionAnchorMs;
      const y = cell ? evaluateCell(cell, end) : c.stressAtAnchor;
      const trial = numericalWidth(c.nextTrialWidthMinutes * 60000, ctx.fidelity, !cell),
        width = Math.min(
          trial,
          nextPathBoundary(start, [
            ctx.mood.valence,
            ctx.mood.arousal,
            ...ctx.mood.emotions.map((e) => e.intensity),
          ]) - start,
        );
      if (width < trial) forcedCells++;
      else ownCells++;
      if (start + width > ctx.mood.to) throw new RangeError('mood path must cover canonical stress cell');
      const r = integrateCell(
        start,
        [y],
        width,
        (t, y) => {
          const q =
            (-LN2 * (y[0] ?? 0)) / p.stressHalfLife +
            (p.stressMoodRate *
              Math.max(0, -trajectoryFeltValence(ctx.mood, t, ctx.effective.builtins.AFFECT_DEFAULTS))) /
              1440 +
            ctx.commandStrainRatePerMinute;
          return [(y[0] ?? 0) >= 1 && q > 0 ? 0 : q];
        },
        numericalTolerance(ctx.fidelity),
      );
      calls += r.calls;
      if (spanBudgetExceeded(calls, ownCells, forcedCells))
        throw new EngineLimitError('limit-exceeded: stress span');
      cell = required(r.cells[0]);
      end = r.to;
      c = {
        ...c,
        stressAtAnchor: y,
        stressCell: cell,
        acceptedThroughMs: end,
        stressError: c.stressError + r.error,
        nextTrialWidthMinutes: r.nextWidth / 60000,
      };
    }
    stressCells.push(cell);
    at = Math.min(to, end);
    s.stress = clip(evaluateCell(cell, at));
  }
  const stressAt = (t: number) => {
    const cell = stressCells.find((c) => t >= c.originMs && t <= c.originMs + c.rightOffsetMinutes * 60000);
    return cell ? clip(evaluateCell(cell, t)) : state.stress;
  };
  const lambda = (t: number) => {
    if (!ctx.alive || ctx.asleep || state.active || refractory) return 0;
    const v = trajectoryFeltValence(ctx.mood, t, ctx.effective.builtins.AFFECT_DEFAULTS);
    const pressure = Math.max(
      clip((p.breakMood - v) / (1 + p.breakMood)),
      clip((stressAt(t) - p.breakStress) / (1 - p.breakStress)),
    );
    return (
      (p.baseHazard *
        ctx.effective.crisis.hazardScale *
        pressure *
        (0.5 + readCharacterTrajectory(ctx.character, t).traits.emotionality)) /
      60
    );
  };
  const h = advanceHazard(
    c.hazard,
    ctx.from,
    to,
    lambda,
    Math.min(ctx.mood.to, c.acceptedThroughMs || ctx.mood.to, eligibilityEnd),
    (t) =>
      Math.min(
        eligibilityEnd,
        nextPathBoundary(t, [
          ctx.mood.valence,
          ctx.mood.arousal,
          ...ctx.mood.emotions.map((e) => e.intensity),
        ]),
        ...stressCells
          .filter((c) => c.originMs <= t && c.originMs + c.rightOffsetMinutes * 60000 > t)
          .map((c) => c.originMs + c.rightOffsetMinutes * 60000),
      ),
  );
  to = h.at;
  s.stress = stressAt(to);
  s.checkedAt = to;
  c = { ...c, hazard: h.hazard, materializedAtMs: to, clock: { ...c.clock, advancedThroughMs: to } };
  const events: T.EventData[] = [];
  if (
    c.recovery &&
    to >= c.recovery.anchorMs + Math.ceil((c.recovery.remainingWorkMinutesAtAnchor / rate) * 60000)
  ) {
    events.push({ kind: 'crisis', change: 'recovered', repertoireId: c.recovery.behaviourId });
    delete s.active;
    s.lastBreakAt = to;
    s.stress *= p.afterBreakStress;
    const hazard = c.hazard;
    c = {
      ...anchor(s, to, `${c.clock.conditionId}:recovered:${to}`, ctx.effectiveParametersHash),
      hazard: {
        ...hazard,
        clock: clock(to, c.clock.conditionId, ctx.effectiveParametersHash),
        activeIntegralCell: null,
        anchorIntegral: hazard.activeIntegralCell
          ? evaluateCell(hazard.activeIntegralCell, to)
          : hazard.acceptedIntegral,
        acceptedIntegral: hazard.activeIntegralCell
          ? evaluateCell(hazard.activeIntegralCell, to)
          : hazard.acceptedIntegral,
        acceptedThroughMs: to,
      },
      refractoryUntilMs: to + p.refractory * 60000,
    };
  }
  return {
    ...output(s, to),
    events,
    nextBoundary: h.boundary?.at ?? (to < ctx.to ? to : null),
    continuation: c,
    randomBoundary: h.boundary,
  };
};
const commitHazard: T.CrisisOwner['commitHazard'] = (state, boundary, ctx) => {
  let c = copy<T.CrisisContinuation>(ctx.continuation),
    s = copy<T.CrisisState>(state),
    rng = copy<T.ActorRandomCursor>(ctx.rng);
  if (
    !ctx.alive ||
    ctx.asleep ||
    s.active ||
    (c.refractoryUntilMs !== null && ctx.at < c.refractoryUntilMs) ||
    boundary.at !== ctx.at
  )
    throw new RangeError('ineligible crisis boundary');
  const p = ctx.effective.builtins.CRISIS_DEFAULTS;
  const felt = trajectoryFeltValence(ctx.mood, ctx.at, ctx.effective.builtins.AFFECT_DEFAULTS);
  if (
    Math.max(
      clip((p.breakMood - felt) / (1 + p.breakMood)),
      clip((s.stress - p.breakStress) / (1 - p.breakStress)),
    ) <= 0 &&
    !(
      c.hazard.clock.conditionAnchorMs < ctx.at &&
      (c.hazard.activeIntegralCell
        ? evaluateCell(c.hazard.activeIntegralCell, ctx.at)
        : c.hazard.acceptedIntegral) > c.hazard.anchorIntegral
    )
  )
    throw new RangeError('closed crisis pressure');
  if (boundary.operation === 'allocate') {
    if (c.hazard.threshold) throw new RangeError('duplicate crisis budget');
    const a = arm(c.hazard, rng, ctx.at);
    c = { ...c, hazard: a.hazard };
    return { ...output(s, ctx.at), continuation: c, rng: a.rng };
  }
  if (!c.hazard.threshold) throw new RangeError('missing crisis budget');
  const reached = c.hazard.activeIntegralCell
    ? evaluateCell(c.hazard.activeIntegralCell, ctx.at)
    : c.hazard.acceptedIntegral;
  if (reached < c.hazard.threshold.exponentialBudget) throw new RangeError('unreached crisis threshold');
  let d = draw(rng);
  rng = d.rng;
  const total = s.repertoire.reduce((n, b) => n + Math.max(0, b.weight ?? 1), 0);
  let weight = d.value * total;
  let pick = required(s.repertoire.at(-1));
  for (const b of s.repertoire) {
    weight -= Math.max(0, b.weight ?? 1);
    if (weight < 0) {
      pick = b;
      break;
    }
  }
  d = draw(rng);
  rng = d.rng;
  const range = pick.durationRangeMs.map((x) => x / 60000);
  const duration = Math.max(
    1,
    Math.round(required(range[0]) + d.value * Math.max(0, required(range[1]) - required(range[0]))),
  );
  s = {
    ...s,
    breaks: s.breaks + 1,
    active: { repertoireId: pick.id, since: ctx.at, until: ctx.at + duration * 60000 },
  };
  const episode = c.hazard.episodeOrdinal + 1;
  c = anchor(s, ctx.at, `crisis:${ctx.person}:${ctx.at}`, ctx.effectiveParametersHash);
  c = { ...c, hazard: { ...c.hazard, episodeOrdinal: episode } };
  return {
    ...output(s, ctx.at),
    continuation: c,
    rng,
    events: [{ kind: 'crisis', change: 'onset', repertoireId: pick.id, until: required(s.active).until }],
  };
};
export const crisisOwner: T.CrisisOwner = {
  initialize,
  inBreak: (state) => state.active !== undefined,
  allows: (state, offer) => breakAllows(state, offer),
  advance,
  commitHazard,
  receive: (state, input, ctx) => {
    const s = copy<T.CrisisState>(state);
    let c = copy<T.CrisisContinuation>(ctx.continuation);
    if (input.kind === 'strain') {
      if (!Number.isFinite(input.amount) || input.amount < 0) throw new RangeError('invalid strain');
      s.stress = clip(s.stress + input.amount);
    } else if (s.active && c.recovery && ctx.at < s.active.until) {
      const r = c.recovery;
      const remaining = Math.max(
        0,
        r.remainingWorkMinutesAtAnchor - ((ctx.at - r.anchorMs) / 60000) * r.sleepRate,
      );
      // SCOPE G9: halve actual remaining time on the run's millisecond clock.
      // A whole-minute minimum could extend a break with less than a minute left.
      const easedMs = Math.max(1, Math.round(((remaining / r.sleepRate) * 60000) / 2));
      s.active.until = Math.min(s.active.until, ctx.at + easedMs);
      c = {
        ...c,
        recovery: {
          ...r,
          anchorMs: ctx.at,
          remainingWorkMinutesAtAnchor: ((s.active.until - ctx.at) / 60000) * r.sleepRate,
          lastComfortReceiptId: input.receiptId,
        },
      };
    }
    const h = c.hazard;
    const integral = h.activeIntegralCell ? evaluateCell(h.activeIntegralCell, ctx.at) : h.acceptedIntegral;
    c = {
      ...c,
      clock: clock(ctx.at, `crisis:${ctx.person}:${ctx.at}:${input.receiptId}`, ctx.effectiveParametersHash),
      stressAtAnchor: s.stress,
      acceptedThroughMs: ctx.at,
      materializedAtMs: ctx.at,
      stressCell: null,
      hazard: {
        ...h,
        clock: clock(ctx.at, h.clock.conditionId, ctx.effectiveParametersHash),
        anchorIntegral: integral,
        acceptedIntegral: integral,
        activeIntegralCell: null,
        acceptedThroughMs: ctx.at,
        materializedAtMs: ctx.at,
      },
    };
    return { ...output(s, ctx.at), continuation: c };
  },
  validate: (s, c) => {
    const issues = validateNumbers({ s, c });
    issues.push(
      ...numericalIssues(c.clock, c.materializedAtMs, c.acceptedThroughMs),
      ...hazardIssues(c.hazard),
    );
    if (
      s.stress < 0 ||
      s.stress > 1 ||
      !s.repertoire.length ||
      s.repertoire.some((b) => b.weight < 0) ||
      s.repertoire.reduce((n, b) => n + b.weight, 0) <= 0 ||
      !Number.isSafeInteger(s.breaks) ||
      s.breaks < 0
    )
      issues.push(issue('crisis', 'invalid stress/repertoire/counter'));
    if (
      s.active &&
      (s.active.until < s.active.since || !s.repertoire.some((b) => b.id === required(s.active).repertoireId))
    )
      issues.push(issue('crisis.active', 'invalid active repertoire/time'));
    return issues;
  },
};
export const breakAllows = (
  state: T.DeepReadonly<T.CrisisState>,
  offer: T.DeepReadonly<T.Offer>,
): boolean => {
  if (!state.active) return true;
  const b = state.repertoire.find((x) => x.id === required(state.active).repertoireId);
  return (
    !!b &&
    (b.actions?.includes(offer.actionId) === true || b.tags?.some((t) => offer.tags.includes(t)) === true)
  );
};
