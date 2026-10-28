/** SCOPE: source OCC appraisal, exact emotion decay and continuously forced mood.
 * No clinical prediction or spiritual assessment. */

import {
  DAILY_NUMERICAL_POLICY,
  dailyPolicy,
  numericalTolerance,
  numericalWidth,
} from '../body/daily-policy.ts';
import {
  clip,
  clock,
  copy,
  copyContinuation,
  evaluateCell,
  freezeData,
  initialWidth,
  integrateCell,
  issue,
  LN2,
  nextPathBoundary,
  numericalIssues,
  output,
  required,
  scalarAt,
  spanBudgetExceeded,
  validateNumbers,
} from '../body/span.ts';
import { dexp, dlog } from '../core/libm.ts';
import { EngineLimitError } from '../core/limit.ts';
import { readEnvironmentTrajectory } from '../environment/environment.ts';
import type * as T from '../run-schema.ts';

type EmotionId = T.EmotionId;
type Signed = T.Signed;
type Unit = T.Unit;
const H = 60,
  D = 1440;
export const AFFECT_DEFAULTS = freezeData({
  maxEmotions: 12,
  dropBelow: 0.02,
  /** Half-lives in minutes. */
  halfLife: {
    joy: 1.5 * H,
    distress: 3 * H,
    hope: 4 * H,
    fear: 2 * H,
    relief: 1 * H,
    disappointment: 6 * H,
    pride: 4 * H,
    shame: 12 * H,
    gratitude: 1 * D,
    anger: 4 * H,
    guilt: 3 * D,
    love: 2 * D,
    grief: 4 * D,
    awe: 1 * H,
    boredom: 1 * H,
    loneliness: 12 * H,
  } satisfies Record<EmotionId, number>,
  /** Valence of each emotion for mood. */
  valence: {
    joy: 1,
    distress: -1,
    hope: 0.5,
    fear: -0.7,
    relief: 0.6,
    disappointment: -0.6,
    pride: 0.7,
    shame: -0.8,
    gratitude: 0.6,
    anger: -0.6,
    guilt: -0.7,
    love: 0.8,
    grief: -1,
    awe: 0.4,
    boredom: -0.3,
    loneliness: -0.6,
  } satisfies Record<EmotionId, Signed>,
  /** Arousal of each emotion for mood. */
  arousal: {
    joy: 0.6,
    distress: 0.5,
    hope: 0.5,
    fear: 0.9,
    relief: 0.3,
    disappointment: 0.3,
    pride: 0.6,
    shame: 0.5,
    gratitude: 0.4,
    anger: 0.9,
    guilt: 0.5,
    love: 0.5,
    grief: 0.3,
    awe: 0.7,
    boredom: 0.1,
    loneliness: 0.3,
  } satisfies Record<EmotionId, Unit>,
  negative: [
    'distress',
    'fear',
    'disappointment',
    'shame',
    'anger',
    'guilt',
    'grief',
    'boredom',
    'loneliness',
  ] as EmotionId[],
  /** Negative emotions whose decay regulation does not speed up (resolved by repair instead). */
  regulationExempt: ['guilt'] as EmotionId[],
  /** Max fractional half-life shortening at regulation 1. */
  regulationShortening: 0.35,
  /** Intensity gain = base + slope * emotionality. */
  gainBase: 0.6,
  gainSlope: 0.8,
  fearGainBase: 0.4,
  fearGainSlope: 1.2,
  /** Merge: max(a, b) + mergeBlend * min(a, b) * (1 - max(a, b)). */
  mergeBlend: 0.25,
  griefFloor: 0.4,
  loveAffection: 0.5,
  /** Mood. */
  moodNeedGain: 1.2,
  moodEmotionGain: 0.8,
  moodValenceHalfLife: 8 * H,
  moodArousalHalfLife: 4 * H,
  baselineArousal: 0.3,
  baselineArousalWeight: 0.5,
  /** Substep cap for mood integration (minutes); long steps use at most `maxSubsteps`. */
  /** Readout: felt valence = mood + this * emotion valence. */
  feltEmotionWeight: 0.5,
  /** Regulation training: asymptotic rate per practiced minute. */
  regulationRate: { reflection: 8e-5, worship: 8e-5, rest: 3e-5 },
  regulationCeiling: 0.95,
  /** Immediate soothing: up to this fraction of negative intensity removed, saturating over ~30 min. */
  soothe: { reflection: 0.2, worship: 0.2, rest: 0.15 },
  sootheMinutes: 30,
  initialRegulation: 0.3,
});
type State = Omit<T.AffectState, 'crisis'>;
export function feltAffect(state: T.DeepReadonly<State>, p: T.DeepReadonly<T.Effective_AFFECT_DEFAULTS>) {
  let v = 0,
    num = p.baselineArousalWeight * p.baselineArousal,
    den = p.baselineArousalWeight;
  for (const e of state.emotions) {
    v += p.valence[e.id] * e.intensity;
    num += p.arousal[e.id] * e.intensity;
    den += e.intensity;
  }
  return {
    valence: clip(state.mood.valence + p.feltEmotionWeight * clip(v, -1, 1), -1, 1),
    arousal: (1 - p.feltEmotionWeight) * state.mood.arousal + p.feltEmotionWeight * clip(num / den),
  };
}
function key(e: T.DeepReadonly<T.Emotion>): string {
  return JSON.stringify([e.id, e.targetId ?? null, e.cause, e.since]);
}
function reanchor(
  s: T.DeepReadonly<State>,
  at: number,
  id: string,
  p: T.DeepReadonly<T.Effective_AFFECT_DEFAULTS>,
  hash: string,
): T.AffectContinuation {
  return {
    clock: clock(at, id, hash),
    materializedAtMs: at,
    acceptedThroughMs: at,
    anchorMood: { ...s.mood },
    emotions: s.emotions.map((e) => ({
      id: key(e),
      intensityAtAnchor: e.intensity,
      effectiveHalfLifeMinutes: Math.max(
        1,
        (e.halfLifeMs / 60000) *
          (1 -
            (p.negative.includes(e.id) && !p.regulationExempt.includes(e.id)
              ? p.regulationShortening * s.regulation
              : 0)),
      ),
      dropBracket: null,
    })),
    regulationAtAnchor: s.regulation,
    needTrajectoryId: id,
    moodOffsetConditionId: id,
    valenceCell: null,
    arousalCell: null,
    valenceError: 0,
    arousalError: 0,
    nextTrialWidthMinutes: initialWidth(Math.min(p.moodValenceHalfLife, p.moodArousalHalfLife)) / 60000,
  };
}
const initialize: T.AffectOwner['initialize'] = (input, ctx) => {
  const state: State = {
    mood: { ...input.mood },
    emotions: copy<T.Emotion[]>(input.emotions),
    regulation: input.regulation,
    lastUpdated: ctx.at,
  };
  return {
    state,
    continuation: reanchor(
      state,
      ctx.at,
      `affect:${ctx.person}:${ctx.at}`,
      ctx.effective.builtins.AFFECT_DEFAULTS,
      ctx.effectiveParametersHash,
    ),
  };
};
const advance: T.AffectOwner['advance'] = (state, ctx) => {
  const p = ctx.effective.builtins.AFFECT_DEFAULTS;
  let c = copyContinuation<T.AffectContinuation>(ctx.continuation);
  const offsetId = ctx.environment.id + (dailyPolicy(ctx.fidelity) ? `:${DAILY_NUMERICAL_POLICY}` : '');
  if (c.needTrajectoryId !== ctx.needs.id || c.moodOffsetConditionId !== offsetId) {
    c = {
      ...reanchor(
        state,
        ctx.from,
        `affect:${ctx.person}:${ctx.from}:${ctx.needs.id}:${offsetId}`,
        p,
        ctx.effectiveParametersHash,
      ),
      needTrajectoryId: ctx.needs.id,
      moodOffsetConditionId: offsetId,
    };
  }
  const emotionAt = (t: number) =>
    state.emotions.map((e) => {
      const anchor = c.emotions.find((x) => x.id === key(e));
      if (!anchor) throw new RangeError('missing retained emotion anchor');
      return {
        ...e,
        intensity:
          anchor.intensityAtAnchor *
          dexp((-LN2 * (t - c.clock.conditionAnchorMs)) / 60000 / anchor.effectiveHalfLifeMinutes),
      };
    });
  let to = c.emotions.some((e) => e.intensityAtAnchor < p.dropBelow) ? ctx.from : ctx.to;
  for (const e of c.emotions) {
    if (e.intensityAtAnchor >= p.dropBelow) {
      const drop =
        c.clock.conditionAnchorMs +
        Math.floor(e.effectiveHalfLifeMinutes * (dlog(e.intensityAtAnchor / p.dropBelow) / LN2) * 60000) +
        1;
      if (drop > ctx.from && drop < to) to = drop;
    }
  }
  const pathsV: T.ScalarTrajectory['segments'][number][] = [],
    pathsA: T.ScalarTrajectory['segments'][number][] = [];
  let at = ctx.from,
    calls = 0,
    ownCells = 0,
    forcedCells = 0,
    mood = { ...state.mood };
  while (at < to) {
    let end = c.acceptedThroughMs;
    if (!c.valenceCell || !c.arousalCell || at >= end) {
      const start = c.valenceCell ? end : c.clock.conditionAnchorMs;
      const y =
        c.valenceCell && c.arousalCell
          ? [evaluateCell(c.valenceCell, end), evaluateCell(c.arousalCell, end)]
          : [c.anchorMood.valence, c.anchorMood.arousal];
      const trial = numericalWidth(c.nextTrialWidthMinutes * 60000, ctx.fidelity, !c.valenceCell),
        width = Math.min(
          trial,
          nextPathBoundary(start, [ctx.needs.satisfaction, ...ctx.body.fields.map((f) => f.path)]) - start,
        );
      if (width < trial) forcedCells++;
      else ownCells++;
      if (start + width > ctx.needs.to) throw new RangeError('NeedTrajectory must cover canonical mood cell');
      const cell = integrateCell(
        start,
        y,
        width,
        (t, y) => {
          const es = emotionAt(t);
          let v = 0,
            n = p.baselineArousalWeight * p.baselineArousal,
            d = p.baselineArousalWeight;
          for (const e of es) {
            v += p.valence[e.id] * e.intensity;
            n += p.arousal[e.id] * e.intensity;
            d += e.intensity;
          }
          const vt = clip(
            (clip(scalarAt(ctx.needs.satisfaction, t)) - 0.5) * p.moodNeedGain +
              readEnvironmentTrajectory(ctx.environment, t, ctx.effective).moodOffset +
              p.moodEmotionGain * clip(v, -1, 1),
            -1,
            1,
          );
          return [
            (LN2 * (vt - (y[0] ?? 0))) / p.moodValenceHalfLife,
            (LN2 * (clip(n / d) - (y[1] ?? 0))) / p.moodArousalHalfLife,
          ];
        },
        numericalTolerance(ctx.fidelity),
      );
      calls += cell.calls;
      if (spanBudgetExceeded(calls, ownCells, forcedCells))
        throw new EngineLimitError('limit-exceeded: affect span');
      c = {
        ...c,
        anchorMood: { valence: required(y[0]), arousal: required(y[1]) },
        acceptedThroughMs: cell.to,
        valenceError: c.valenceError + cell.error,
        arousalError: c.arousalError + cell.error,
        valenceCell: required(cell.cells[0]),
        arousalCell: required(cell.cells[1]),
        nextTrialWidthMinutes: cell.nextWidth / 60000,
        needTrajectoryId: ctx.needs.id,
      };
      end = cell.to;
    }
    const v = required(c.valenceCell),
      a = required(c.arousalCell);
    pathsV.push({ kind: 'quartic', from: v.originMs, to: end, cell: v });
    pathsA.push({ kind: 'quartic', from: a.originMs, to: end, cell: a });
    at = Math.min(to, end);
    mood = { valence: clip(evaluateCell(v, at), -1, 1), arousal: clip(evaluateCell(a, at)) };
  }
  const emotions = emotionAt(to).filter((e) => e.intensity >= p.dropBelow);
  const out: State = {
    mood,
    emotions: copy<T.Emotion[]>(emotions),
    regulation: state.regulation,
    lastUpdated: to,
  };
  c = { ...c, materializedAtMs: to, clock: { ...c.clock, advancedThroughMs: to } };
  if (emotions.length !== state.emotions.length)
    c = reanchor(out, to, `${c.clock.conditionId}:drop:${to}`, p, ctx.effectiveParametersHash);
  const end = Math.max(to, ...pathsV.map((s) => s.to));
  const trajectory: T.AffectTrajectory = {
    id: c.clock.conditionId,
    from: ctx.from,
    to: end,
    valence: {
      from: ctx.from,
      to: end,
      segments: pathsV.length ? pathsV : [{ kind: 'constant', from: ctx.from, to: end, value: mood.valence }],
    },
    arousal: {
      from: ctx.from,
      to: end,
      segments: pathsA.length ? pathsA : [{ kind: 'constant', from: ctx.from, to: end, value: mood.arousal }],
    },
    emotions: state.emotions.map((e) => {
      const a = required(ctx.continuation.emotions.find((x) => x.id === key(e)));
      return {
        identity: {
          kind: e.id,
          ...(e.targetId === undefined ? {} : { target: e.targetId }),
          cause: e.cause,
          since: e.since,
        },
        intensity: {
          from: ctx.from,
          to: end,
          segments: [
            {
              kind: 'exponential',
              from: ctx.from,
              to: end,
              initial:
                a.intensityAtAnchor *
                dexp(
                  (-LN2 * (ctx.from - ctx.continuation.clock.conditionAnchorMs)) /
                    60000 /
                    a.effectiveHalfLifeMinutes,
                ),
              target: 0,
              ratePerMinute: LN2 / a.effectiveHalfLifeMinutes,
            },
          ],
        },
      };
    }),
  };
  return { ...output(out, to), nextBoundary: to < ctx.to ? to : null, continuation: c, trajectory };
};
export function appraiseWithTraits(
  state: T.DeepReadonly<State>,
  ev: T.DeepReadonly<T.AppraisalEvent>,
  traits: T.DeepReadonly<T.Traits>,
  person: string,
  p: T.DeepReadonly<T.Effective_AFFECT_DEFAULTS>,
): State {
  const s = copy<State>(state);
  const gain = p.gainBase + p.gainSlope * clip(traits.emotionality),
    fearGain = p.fearGainBase + p.fearGainSlope * clip(traits.emotionality),
    des = clip(ev.desirability, -1, 1),
    mag = Math.abs(des);
  const add = (id: T.EmotionId, intensity: number, targetId?: string) => {
    if (intensity < p.dropBelow) return;
    const old = s.emotions.find((e) => e.id === id && e.targetId === targetId);
    if (old) {
      const hi = Math.max(old.intensity, intensity),
        lo = Math.min(old.intensity, intensity);
      const before = old.intensity;
      old.intensity = clip(hi + p.mergeBlend * lo * (1 - hi));
      if (intensity >= before) {
        old.cause = ev.cause;
        old.since = ev.at;
      }
      old.halfLifeMs = Math.max(old.halfLifeMs, p.halfLife[id] * 60000);
    } else
      s.emotions.push({
        id,
        intensity: clip(intensity),
        cause: ev.cause,
        since: ev.at,
        halfLifeMs: p.halfLife[id] * 60000,
        ...(targetId === undefined ? {} : { targetId }),
      });
  };
  const other = ev.agentId !== undefined && ev.agentId !== person ? ev.agentId : undefined;
  if (ev.kind === 'prospect') {
    if (des > 0) add('hope', mag * clip(ev.likelihood ?? 0.5) * gain);
    else if (des < 0) add('fear', mag * clip(ev.likelihood ?? 0.5) * fearGain, ev.threatFrom);
  } else if (ev.kind === 'deed') {
    const pw = clip(ev.praiseworthiness ?? 0, -1, 1),
      strength = Math.max(Math.abs(pw), mag);
    if (ev.agentId === person) {
      if (pw > 0) add('pride', strength * gain);
      else if (pw < 0) {
        if (ev.cause.includes('norm:') || ev.targetId !== undefined)
          add('guilt', strength * gain * (0.7 + 0.6 * clip(traits.honesty)), ev.targetId);
        else add('shame', strength * gain);
      }
    } else if (other !== undefined) {
      if (pw < 0 && des < 0) add('anger', strength * gain * (1.3 - 0.6 * clip(traits.agreeableness)), other);
      else if (pw > 0 && des > 0) add('gratitude', strength * gain, other);
      else if (des !== 0) add(des > 0 ? 'joy' : 'distress', mag * gain);
    } else if (des !== 0) add(des > 0 ? 'joy' : 'distress', mag * gain);
  } else {
    for (const e of [...s.emotions]) {
      const a = e.cause.replace(/^(outcome|event|prospect|deed):/, ''),
        b = ev.cause.replace(/^(outcome|event|prospect|deed):/, '');
      if (
        (e.id === 'hope' || e.id === 'fear') &&
        a.length > 0 &&
        b.length > 0 &&
        (a.startsWith(b) || b.startsWith(a))
      ) {
        s.emotions.splice(s.emotions.indexOf(e), 1);
        if (e.id === 'fear' && des > 0) add('relief', Math.max(e.intensity, mag * gain));
        else if (e.id === 'hope' && des < 0) add('disappointment', Math.max(e.intensity, mag * gain));
        else add(des > 0 ? 'joy' : 'distress', e.intensity * 0.5);
      }
    }
    if (ev.loss) add('grief', Math.max(mag, p.griefFloor) * gain, ev.targetId);
    else if (des !== 0) add(des > 0 ? 'joy' : 'distress', mag * gain);
  }
  if (other !== undefined && des > 0 && (ev.affectionToAgent ?? 0) > p.loveAffection)
    add('love', mag * clip(ev.affectionToAgent ?? 0) * gain, other);
  s.emotions.sort((a, b) => b.intensity - a.intensity || (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0));
  s.emotions = s.emotions.slice(0, p.maxEmotions);
  return s;
}
// Traits are actual admitted actor premises; no default trait snapshot.
const appraise: T.AffectOwner['appraise'] = (state, input, ctx) => {
  const traits = ctx.traits;
  const s = appraiseWithTraits(
    state,
    input.appraisal,
    traits,
    ctx.person,
    ctx.effective.builtins.AFFECT_DEFAULTS,
  );
  return {
    ...output(s, ctx.at),
    continuation: reanchor(
      s,
      ctx.at,
      `affect:${ctx.person}:${ctx.at}:${input.id}`,
      ctx.effective.builtins.AFFECT_DEFAULTS,
      ctx.effectiveParametersHash,
    ),
  };
};
const receive: T.AffectOwner['receive'] = (state, input, ctx) => {
  const s = copy<State>(state),
    p = ctx.effective.builtins.AFFECT_DEFAULTS;
  if (input.kind === 'felt') {
    const intensity = clip(input.intensity);
    if (intensity >= p.dropBelow) {
      const old = s.emotions.find((e) => e.id === input.id && e.targetId === input.targetId);
      if (old) {
        const before = old.intensity,
          hi = Math.max(before, intensity),
          lo = Math.min(before, intensity);
        old.intensity = clip(hi + p.mergeBlend * lo * (1 - hi));
        if (intensity >= before) {
          old.cause = input.cause;
          old.since = ctx.at;
        }
        old.halfLifeMs = Math.max(old.halfLifeMs, p.halfLife[input.id] * 60000);
      } else
        s.emotions.push({
          id: input.id,
          intensity,
          cause: input.cause,
          since: ctx.at,
          halfLifeMs: p.halfLife[input.id] * 60000,
          ...(input.targetId === undefined ? {} : { targetId: input.targetId }),
        });
    }
  } else if (input.kind === 'regulated') {
    const minutes = input.durationMs / 60000;
    if (!Number.isFinite(minutes) || minutes < 0) throw new RangeError('invalid settled regulation duration');
    const reg = clip(s.regulation),
      relief = p.soothe[input.practice] * (1 - dexp(-minutes / p.sootheMinutes)) * (0.5 + reg);
    for (const e of s.emotions)
      if (p.negative.includes(e.id) && !p.regulationExempt.includes(e.id))
        e.intensity = clip(e.intensity * (1 - relief));
    s.regulation = clip(
      p.regulationCeiling -
        Math.max(0, p.regulationCeiling - reg) * dexp(-p.regulationRate[input.practice] * minutes),
    );
  } else {
    const f = input.filter;
    for (const e of s.emotions) {
      if ((f.id !== undefined && e.id !== f.id) || (f.targetId !== undefined && e.targetId !== f.targetId))
        continue;
      if (f.causePrefix !== undefined) {
        const a = e.cause.replace(/^(outcome|event|prospect|deed):/, ''),
          b = f.causePrefix.replace(/^(outcome|event|prospect|deed):/, '');
        if (!a || !b || !(a.startsWith(b) || b.startsWith(a))) continue;
      }
      e.intensity = clip(e.intensity * (1 - clip(input.fraction)));
    }
  }
  s.emotions = s.emotions
    .filter((e) => e.intensity >= p.dropBelow)
    .sort(
      (a, b) =>
        b.intensity - a.intensity ||
        (a.id < b.id ? -1 : a.id > b.id ? 1 : 0) ||
        ((a.targetId ?? '') < (b.targetId ?? '') ? -1 : (a.targetId ?? '') > (b.targetId ?? '') ? 1 : 0),
    )
    .slice(0, p.maxEmotions);
  s.lastUpdated = ctx.at;
  return {
    ...output(s, ctx.at),
    continuation: reanchor(
      s,
      ctx.at,
      `affect:${ctx.person}:${ctx.at}:${ctx.causes.join(':')}`,
      p,
      ctx.effectiveParametersHash,
    ),
  };
};
export const affectOwner: T.AffectOwner = {
  initialize,
  tendencies: (state, traits, ctx) => ({
    values: actionTendencies(state, traits, ctx.effective.builtins.AFFECT_DEFAULTS),
    emotions: tendencyEmotions(state),
  }),
  advance,
  appraise,
  receive,
  validate: (s, c) => {
    const issues = validateNumbers({ s, c });
    issues.push(...numericalIssues(c.clock, c.materializedAtMs, c.acceptedThroughMs));
    if (
      s.regulation < 0 ||
      s.regulation > 1 ||
      s.mood.valence < -1 ||
      s.mood.valence > 1 ||
      s.mood.arousal < 0 ||
      s.mood.arousal > 1 ||
      s.emotions.length > AFFECT_DEFAULTS.maxEmotions
    )
      issues.push(issue('affect', 'invalid affect bounds'));
    for (const e of s.emotions)
      if (e.intensity < 0 || e.intensity > 1 || e.halfLifeMs <= 0 || !Number.isSafeInteger(e.since))
        issues.push(issue('affect.emotions', 'invalid emotion'));
    if (new Set(c.emotions.map((e) => e.id)).size !== c.emotions.length)
      issues.push(issue('affect.continuation', 'duplicate emotion anchor'));
    return issues;
  },
};

const signed = (n: number) => clip(n, -1, 1);
const TENDENCY_WEIGHTS: Record<string, readonly (readonly [EmotionId, number])[]> = {
  risky: [
    ['fear', -1],
    ['anger', 0.3],
  ],
  social: [
    ['loneliness', 0.8],
    ['love', 0.5],
    ['joy', 0.3],
    ['shame', -0.5],
    ['grief', -0.2],
  ],
  confront: [
    ['anger', 0.9],
    ['fear', -0.3],
  ],
  repair: [
    ['guilt', 0.9],
    ['shame', 0.2],
  ],
  worship: [
    ['guilt', 0.5],
    ['grief', 0.3],
    ['gratitude', 0.3],
    ['awe', 0.4],
  ],
  novel: [
    ['boredom', 0.8],
    ['joy', 0.2],
    ['fear', -0.3],
  ],
  rest: [
    ['distress', 0.4],
    ['grief', 0.6],
  ],
  comfort: [
    ['distress', 0.6],
    ['grief', 0.5],
    ['fear', 0.3],
  ],
};

/** Clamped summed intensity per emotion, with love counted only when untargeted (see TENDENCY_WEIGHTS). */
function tendencyInputs(p: T.DeepReadonly<State>): (id: EmotionId) => number {
  const sum: Partial<Record<EmotionId, number>> = {};
  for (const e of p.emotions) {
    if (e.id === 'love' && e.targetId !== undefined) continue;
    sum[e.id] = (sum[e.id] ?? 0) + e.intensity;
  }
  return (id) => clip(sum[id] ?? 0);
}

/**
 * The emotion contributing most (by |coefficient × intensity|) to each non-zero tag tendency, so utility terms
 * can name it ('emotion:fear:risky'). Ties break by emotion id.
 */
export function tendencyEmotions(p: T.DeepReadonly<State>): Record<string, EmotionId> {
  const g = tendencyInputs(p);
  const out: Record<string, EmotionId> = {};
  for (const [tag, weights] of Object.entries(TENDENCY_WEIGHTS)) {
    let best: { id: EmotionId; v: number } | undefined;
    for (const [id, w] of weights) {
      const v = Math.abs(w * g(id));
      if (v > 0 && (!best || v > best.v || (v === best.v && id < best.id))) best = { id, v };
    }
    if (best) out[tag] = best.id;
  }
  return out;
}

/**
 * Action tendencies keyed by affordance tag ('risky', 'social', 'confront', 'repair', 'worship', 'novel',
 * 'rest', 'comfort') plus per-target keys 'approach:<id>', 'avoid:<id>', 'confront:<id>', 'repair:<id>'.
 * Values are clamped to -1..1.
 */
function actionTendencies(
  p: T.DeepReadonly<State>,
  traits: T.DeepReadonly<T.Traits>,
  effective: T.DeepReadonly<T.Effective_AFFECT_DEFAULTS>,
): Record<string, number> {
  const g = tendencyInputs(p);
  const fear = g('fear');
  const out: Record<string, number> = {};
  for (const [tag, weights] of Object.entries(TENDENCY_WEIGHTS)) {
    let v = 0;
    for (const [id, w] of weights) v += w * g(id);
    out[tag] = v;
  }
  // Share of anger that becomes confrontation rather than avoidance (coefficient, not a branch).
  const confrontShare = clip(0.5 + 0.8 * (0.5 - clip(traits.agreeableness)) - 0.5 * fear);
  const targeted = p.emotions.filter((e) => e.targetId !== undefined);
  targeted.sort(
    (a, b) =>
      b.intensity - a.intensity ||
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0) ||
      ((a.targetId ?? '') < (b.targetId ?? '') ? -1 : (a.targetId ?? '') > (b.targetId ?? '') ? 1 : 0),
  );
  const bump = (key: string, v: number) => {
    out[key] = (out[key] ?? 0) + v;
  };
  for (const e of targeted) {
    const id = e.targetId as T.EntityId;
    const i = e.intensity;
    switch (e.id) {
      case 'anger':
        bump(`confront:${id}`, i * confrontShare);
        bump(`avoid:${id}`, i * (1 - confrontShare));
        break;
      case 'gratitude':
      case 'love':
        bump(`approach:${id}`, i);
        break;
      case 'fear':
      case 'shame':
        bump(`avoid:${id}`, i);
        break;
      case 'guilt':
        bump(`repair:${id}`, i);
        bump(`approach:${id}`, 0.3 * i);
        break;
      case 'grief':
        break;
      default:
        bump(`approach:${id}`, 0.3 * effective.valence[e.id] * i);
    }
  }
  for (const k of Object.keys(out)) out[k] = signed(out[k] ?? 0);
  return out;
}
