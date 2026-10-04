/**
 * SCOPE: Discrete emotions from an OCC-lite appraisal (Ortony, Clore & Collins 1988): event desirability
 * gives joy/distress, prospects give hope/fear scaled by likelihood, confirmed prospects give
 * relief/disappointment, own deeds give pride/guilt/shame, others' deeds give anger/gratitude, affection
 * plus a good event gives love, and loss gives grief. Each emotion decays exponentially with a
 * type-specific half-life; a slow mood (valence, arousal) relaxes toward need satisfaction plus the current
 * emotions. Emotions map to action tendencies (Frijda) that `consider()` matches against affordance tags.
 * Traits enter only as coefficients: HEXACO emotionality scales intensity (fear most), agreeableness lowers
 * anger and its confront share, honesty-humility raises guilt. Regulation is a practiced capacity that
 * shortens negative half-lives modestly; guilt is exempt and is cleared by repair through `release`.
 * Prospect matching ("same cause prefix"): a leading `outcome:|event:|prospect:|deed:` segment is stripped
 * from both causes and one remainder must start with the other. Guilt rather than shame is chosen when the
 * cause contains `norm:` or the deed has a target (someone was wronged). Loneliness, boredom and awe have no
 * appraisal rule; the composite injects them with `feel` (e.g. from belonging or leisure urgency). This
 * keeps appraisal and constructed-emotion variants swappable; it does not claim that these sixteen
 * categories or two mood dimensions exhaust emotional experience, nor calibrated intensities or durations.
 */
import { clamp01, clampSigned, decay, dexp } from '../core/index.ts';
import type {
  AffectState,
  AppraisalEvent,
  Emotion,
  EmotionId,
  EntityId,
  Minute,
  Person,
  Signed,
  Unit,
} from '../types.ts';
import { MINUTES_PER_DAY, MINUTES_PER_HOUR } from '../types.ts';

const H = MINUTES_PER_HOUR;
const D = MINUTES_PER_DAY;

export const AFFECT_DEFAULTS = {
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
  substep: 30,
  maxSubsteps: 64,
  /** Readout: felt valence = mood + this * emotion valence. */
  feltEmotionWeight: 0.5,
  /** Regulation training: asymptotic rate per practiced minute. */
  regulationRate: { reflection: 8e-5, worship: 8e-5, rest: 3e-5 },
  regulationCeiling: 0.95,
  /** Immediate soothing: up to this fraction of negative intensity removed, saturating over ~30 min. */
  soothe: { reflection: 0.2, worship: 0.2, rest: 0.15 },
  sootheMinutes: 30,
  initialRegulation: 0.3,
};

export type PracticeKind = 'reflection' | 'worship' | 'rest';

export function createAffect(now: Minute): AffectState {
  return {
    mood: { valence: 0, arousal: AFFECT_DEFAULTS.baselineArousal },
    emotions: [],
    regulation: AFFECT_DEFAULTS.initialRegulation,
    lastUpdated: now,
  };
}

const KIND_PREFIX = /^(outcome|event|prospect|deed):/;
const causeCore = (cause: string): string => cause.replace(KIND_PREFIX, '');
const sameCause = (a: string, b: string): boolean => {
  const x = causeCore(a);
  const y = causeCore(b);
  return x.length > 0 && y.length > 0 && (x.startsWith(y) || y.startsWith(x));
};

const isNegative = (id: EmotionId): boolean => AFFECT_DEFAULTS.negative.includes(id);

function sortEmotions(list: Emotion[]): void {
  list.sort(
    (a, b) =>
      b.intensity - a.intensity ||
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0) ||
      ((a.targetId ?? '') < (b.targetId ?? '') ? -1 : (a.targetId ?? '') > (b.targetId ?? '') ? 1 : 0),
  );
}

function bound(p: Person): void {
  const list = p.affect.emotions;
  sortEmotions(list);
  if (list.length > AFFECT_DEFAULTS.maxEmotions) list.length = AFFECT_DEFAULTS.maxEmotions;
}

/** Merge one emotion into state (max-ish), without bounding. Returns the stored emotion. */
function merge(
  p: Person,
  id: EmotionId,
  intensity: Unit,
  cause: string,
  at: Minute,
  targetId?: EntityId,
): Emotion | null {
  const i = clamp01(intensity);
  if (i < AFFECT_DEFAULTS.dropBelow) return null;
  const list = p.affect.emotions;
  const existing = list.find((e) => e.id === id && e.targetId === targetId);
  if (existing) {
    const hi = Math.max(existing.intensity, i);
    const lo = Math.min(existing.intensity, i);
    if (i >= existing.intensity) {
      existing.cause = cause;
      existing.since = at;
    }
    existing.intensity = clamp01(hi + AFFECT_DEFAULTS.mergeBlend * lo * (1 - hi));
    existing.halfLife = Math.max(existing.halfLife, AFFECT_DEFAULTS.halfLife[id]);
    return existing;
  }
  const e: Emotion = { id, intensity: i, cause, since: at, halfLife: AFFECT_DEFAULTS.halfLife[id] };
  if (targetId !== undefined) e.targetId = targetId;
  list.push(e);
  return e;
}

/**
 * Directly add an emotion that appraisal does not produce (loneliness, boredom, awe), merged and bounded
 * the same way. Intensity is used as given (callers scale it).
 */
export function feel(
  p: Person,
  id: EmotionId,
  intensity: Unit,
  cause: string,
  at: Minute = p.affect.lastUpdated,
  targetId?: EntityId,
): Emotion | null {
  const e = merge(p, id, intensity, cause, at, targetId);
  bound(p);
  return e && p.affect.emotions.includes(e) ? { ...e } : null;
}

/**
 * OCC-lite appraisal. Mutates `p.affect.emotions` (merge, consume confirmed prospects, bound to 12) and
 * returns copies of the emotions created or updated that survived bounding.
 */
export function appraise(p: Person, ev: AppraisalEvent): Emotion[] {
  const A = AFFECT_DEFAULTS;
  const t = p.traits;
  const gain = A.gainBase + A.gainSlope * clamp01(t.emotionality);
  const fearGain = A.fearGainBase + A.fearGainSlope * clamp01(t.emotionality);
  const des = clampSigned(ev.desirability);
  const mag = Math.abs(des);
  const touched: Emotion[] = [];
  const add = (id: EmotionId, intensity: number, targetId?: EntityId) => {
    const e = merge(p, id, intensity, ev.cause, ev.at, targetId);
    if (e && !touched.includes(e)) touched.push(e);
  };
  const otherAgent = ev.agentId !== undefined && ev.agentId !== p.id ? ev.agentId : undefined;

  if (ev.kind === 'prospect') {
    const likelihood = clamp01(ev.likelihood ?? 0.5);
    if (des > 0) add('hope', mag * likelihood * gain);
    else if (des < 0) add('fear', mag * likelihood * fearGain, ev.threatFrom);
  } else if (ev.kind === 'deed') {
    const pw = clampSigned(ev.praiseworthiness ?? 0);
    const strength = Math.max(Math.abs(pw), mag);
    if (ev.agentId === p.id) {
      if (pw > 0) add('pride', strength * gain);
      else if (pw < 0) {
        const normRelated = ev.cause.includes('norm:') || ev.targetId !== undefined;
        if (normRelated) add('guilt', strength * gain * (0.7 + 0.6 * clamp01(t.honesty)), ev.targetId);
        else add('shame', strength * gain);
      }
    } else if (otherAgent !== undefined) {
      if (pw < 0 && des < 0)
        add('anger', strength * gain * (1.3 - 0.6 * clamp01(t.agreeableness)), otherAgent);
      else if (pw > 0 && des > 0) add('gratitude', strength * gain, otherAgent);
      else if (des !== 0) add(des > 0 ? 'joy' : 'distress', mag * gain);
    } else if (des !== 0) {
      add(des > 0 ? 'joy' : 'distress', mag * gain);
    }
  } else {
    // outcome / event: resolve matching prospects first.
    const list = p.affect.emotions;
    for (let i = list.length - 1; i >= 0; i--) {
      const e = list[i];
      if (!e || (e.id !== 'hope' && e.id !== 'fear') || !sameCause(e.cause, ev.cause)) continue;
      list.splice(i, 1);
      if (e.id === 'fear' && des > 0) add('relief', Math.max(e.intensity, mag * gain));
      else if (e.id === 'hope' && des < 0) add('disappointment', Math.max(e.intensity, mag * gain));
      else if (e.id === 'hope' && des > 0) add('joy', e.intensity * 0.5);
      else if (e.id === 'fear' && des < 0) add('distress', e.intensity * 0.5);
    }
    if (ev.loss) add('grief', Math.max(mag, A.griefFloor) * gain, ev.targetId);
    else if (des > 0) add('joy', mag * gain);
    else if (des < 0) add('distress', mag * gain);
  }

  if (otherAgent !== undefined && des > 0 && (ev.affectionToAgent ?? 0) > A.loveAffection) {
    add('love', mag * clamp01(ev.affectionToAgent ?? 0) * gain, otherAgent);
  }

  bound(p);
  return touched.filter((e) => p.affect.emotions.includes(e)).map((e) => ({ ...e }));
}

/** Effective half-life of an emotion under the person's current regulation. */
export function effectiveHalfLife(p: Person, e: Emotion): number {
  const A = AFFECT_DEFAULTS;
  const shorten =
    isNegative(e.id) && !A.regulationExempt.includes(e.id)
      ? A.regulationShortening * clamp01(p.affect.regulation)
      : 0;
  return Math.max(1, e.halfLife * (1 - shorten));
}

function emotionValence(emotions: readonly Emotion[]): Signed {
  let v = 0;
  for (const e of emotions) v += AFFECT_DEFAULTS.valence[e.id] * e.intensity;
  return clampSigned(v);
}

function emotionArousal(emotions: readonly Emotion[]): Unit {
  const A = AFFECT_DEFAULTS;
  let num = A.baselineArousalWeight * A.baselineArousal;
  let den = A.baselineArousalWeight;
  for (const e of emotions) {
    num += e.intensity * A.arousal[e.id];
    den += e.intensity;
  }
  return clamp01(num / den);
}

/** `skip`'s side of affect: after `advanceAffect` over the gap, affect is current as of `to`. */
export function skipAffect(p: Person, to: Minute): void {
  p.affect.lastUpdated = to;
}

/**
 * Advance affect by `dt` minutes. Emotion decay is exact; mood relaxes toward
 * (needSatisfaction - 0.5) * gain + emotion valence over substeps (≤ 30 min, at most 64), so step-size
 * consistency is exact without emotions and approximate with them. Advances `lastUpdated` by `dt`. `maxSteps` caps the
 * substeps below `AFFECT_DEFAULTS.maxSubsteps` (1.8.0: routine days use a few per day, trading the mood path within
 * the day for speed; the decay of each emotion stays exact).
 */
export function advanceAffect(
  p: Person,
  dt: number,
  needSatisfaction: Unit,
  moodOffset?: Signed,
  maxSteps?: number,
): void {
  if (dt <= 0) return;
  const A = AFFECT_DEFAULTS;
  const a = p.affect;
  const cap =
    maxSteps === undefined ? A.maxSubsteps : Math.max(1, Math.min(A.maxSubsteps, Math.floor(maxSteps)));
  const steps = Math.min(cap, Math.max(1, Math.ceil(dt / A.substep)));
  const h = dt / steps;
  let needTerm = (clamp01(needSatisfaction) - 0.5) * A.moodNeedGain;
  // An outside offset on the mood target (1.8.0: the surroundings, `environment/`); added only when given.
  if (moodOffset !== undefined && moodOffset !== 0 && Number.isFinite(moodOffset)) needTerm += moodOffset;
  const halfLives = a.emotions.map((e) => effectiveHalfLife(p, e));
  for (let s = 0; s < steps; s++) {
    const before = a.emotions.map((e) => e.intensity);
    a.emotions.forEach((e, i) => {
      e.intensity = decay(e.intensity, h, halfLives[i] ?? e.halfLife);
    });
    // Mood target uses the emotions averaged over the substep (midpoint of start/end intensities).
    const mid = a.emotions.map((e, i) => ({ ...e, intensity: ((before[i] ?? 0) + e.intensity) / 2 }));
    const vTarget = clampSigned(needTerm + A.moodEmotionGain * emotionValence(mid));
    const arTarget = emotionArousal(mid);
    a.mood.valence = clampSigned(decay(a.mood.valence, h, A.moodValenceHalfLife, vTarget));
    a.mood.arousal = clamp01(decay(a.mood.arousal, h, A.moodArousalHalfLife, arTarget));
  }
  a.emotions = a.emotions.filter((e) => e.intensity >= A.dropBelow);
  sortEmotions(a.emotions);
  a.lastUpdated += dt;
}

/** Felt state: mood shifted by current emotions, plus the three strongest emotions (copies). */
export function readAffect(p: Person): { valence: Signed; arousal: Unit; dominant: Emotion[] } {
  const A = AFFECT_DEFAULTS;
  const a = p.affect;
  const sorted = a.emotions.map((e) => ({ ...e }));
  sortEmotions(sorted);
  const ev = emotionValence(a.emotions);
  const ea = emotionArousal(a.emotions);
  return {
    valence: clampSigned(a.mood.valence + A.feltEmotionWeight * ev),
    arousal: clamp01(0.5 * a.mood.arousal + 0.5 * ea),
    dominant: sorted.slice(0, 3),
  };
}

/**
 * Action tendencies keyed by affordance tag ('risky', 'social', 'confront', 'repair', 'worship', 'novel',
 * 'rest', 'comfort') plus per-target keys 'approach:<id>', 'avoid:<id>', 'confront:<id>', 'repair:<id>'.
 * Values are clamped to -1..1.
 */
/**
 * Coefficients of each emotion on each tag tendency. 'love' here is untargeted love only: love toward a
 * particular person already pulls through `approach:<id>`, so the same feeling is not counted twice
 * (review 2026-10-03).
 */
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
function tendencyInputs(p: Person): (id: EmotionId) => number {
  const sum: Partial<Record<EmotionId, number>> = {};
  for (const e of p.affect.emotions) {
    if (e.id === 'love' && e.targetId !== undefined) continue;
    sum[e.id] = (sum[e.id] ?? 0) + e.intensity;
  }
  return (id) => clamp01(sum[id] ?? 0);
}

/**
 * The emotion contributing most (by |coefficient × intensity|) to each non-zero tag tendency, so utility terms
 * can name it ('emotion:fear:risky'). Ties break by emotion id.
 */
export function tendencyEmotions(p: Person): Record<string, EmotionId> {
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

export function actionTendencies(p: Person): Record<string, number> {
  const g = tendencyInputs(p);
  const fear = g('fear');
  const out: Record<string, number> = {};
  for (const [tag, weights] of Object.entries(TENDENCY_WEIGHTS)) {
    let v = 0;
    for (const [id, w] of weights) v += w * g(id);
    out[tag] = v;
  }
  // Share of anger that becomes confrontation rather than avoidance (coefficient, not a branch).
  const confrontShare = clamp01(0.5 + 0.8 * (0.5 - clamp01(p.traits.agreeableness)) - 0.5 * fear);
  const targeted = p.affect.emotions.filter((e) => e.targetId !== undefined);
  sortEmotions(targeted);
  const bump = (key: string, v: number) => {
    out[key] = (out[key] ?? 0) + v;
  };
  for (const e of targeted) {
    const id = e.targetId as EntityId;
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
        bump(`approach:${id}`, 0.3 * AFFECT_DEFAULTS.valence[e.id] * i);
    }
  }
  for (const k of Object.keys(out)) out[k] = clampSigned(out[k] ?? 0);
  return out;
}

/**
 * Practice of reflection, worship or rest. Trains `regulation` asymptotically toward a ceiling
 * (patience as a practiced capacity) and immediately soothes active negative emotions a little (guilt
 * excepted: it is resolved by repair via `release`). This is one modeled effect of these practices; it
 * makes no claim that worship's value or purpose is emotion regulation.
 */
export function regulate(p: Person, minutes: number, practiceKind: PracticeKind): void {
  if (minutes <= 0) return;
  const A = AFFECT_DEFAULTS;
  const a = p.affect;
  const reg = clamp01(a.regulation);
  const relief = A.soothe[practiceKind] * (1 - dexp(-minutes / A.sootheMinutes)) * (0.5 + reg);
  for (const e of a.emotions) {
    if (isNegative(e.id) && !A.regulationExempt.includes(e.id))
      e.intensity = clamp01(e.intensity * (1 - relief));
  }
  a.emotions = a.emotions.filter((e) => e.intensity >= A.dropBelow);
  const ceiling = A.regulationCeiling;
  const gap = Math.max(0, ceiling - reg);
  a.regulation = clamp01(ceiling - gap * dexp(-A.regulationRate[practiceKind] * minutes));
}

/**
 * Reduce (fraction 1 = remove) emotions matching a filter, e.g. guilt toward a victim after repair, or
 * anger after forgiveness. Returns how many emotions were affected.
 */
export function release(
  p: Person,
  filter: { id?: EmotionId; targetId?: EntityId; causePrefix?: string },
  fraction: Unit = 1,
): number {
  const f = clamp01(fraction);
  let n = 0;
  for (const e of p.affect.emotions) {
    if (filter.id !== undefined && e.id !== filter.id) continue;
    if (filter.targetId !== undefined && e.targetId !== filter.targetId) continue;
    if (filter.causePrefix !== undefined && !sameCause(e.cause, filter.causePrefix)) continue;
    e.intensity = clamp01(e.intensity * (1 - f));
    n++;
  }
  p.affect.emotions = p.affect.emotions.filter((e) => e.intensity >= AFFECT_DEFAULTS.dropBelow);
  return n;
}
