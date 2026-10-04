/**
 * SCOPE (impressions, HF 2.0 L6): what one person believes about another — their state (fatigue, pain, fear,
 * mood), their fear of particular places, their HEXACO traits, their ties to third people and their trust in a voice
 * — each held as a running estimate with a weight of evidence, so every readout carries a confidence. Estimates move
 * only through observations the host reports: a glimpse of outward signs (`glimpse`, with a clarity: a lantern-lit
 * face or a figure in the dark), an observed act (`observeAct`: avoiding or approaching a place, staying by someone,
 * heeding or refusing a voice, acts tagged with trait evidence), testimony (`hear`, e.g. a person's own "I'm fine")
 * and acquaintance (`acquaint`: years of history condensed into a few samples, called by the host when people have
 * known each other). Nothing reads the target's true state here: the composite (`impression.ts`) turns a target into
 * outward signs, applying the target's reserve — how much they keep from showing (a proud person hides pain; the
 * default rises as emotionality falls) — and words hide more than faces. Weight decays by kind: state within hours,
 * place fears over weeks, ties and trust over months, a seen skill (`skill:<id>`, opt-in by key) over a year; traits
 * do not decay. Observation error is a deterministic hash
 * of (observer, target, key, minute), scaled by 1 − clarity: no person's RNG is drawn. Shapes borrowed qualitatively:
 * Brunswik's lens model (judgements from cues of varying validity), Funder's realistic accuracy model (accuracy needs
 * relevant, available, detected and used cues; acquaintance raises it), display rules (Ekman & Friesen: people mask
 * pain and fear), and the familiar finding that self-reports of pain understate what observers see in a limp. Every
 * number is an engineering default.
 *
 * Read by: cognition (opt-in, a risky offer shared with people I hold impressions of weighs their believed fear and
 * pain: `companionSteadiness`), and the composite's `imagine` / `predictAs` / `previewCommandAs`, which predict a
 * person's answer from the observer's estimates instead of the truth, so a UI (the player's read) and a villager's
 * judgement of a neighbour use the same function. Without an observation call nothing is written and no decision
 * changes, so existing runs replay byte for byte. Does not model: inference between traits, stereotypes, projection
 * of one's own state, deliberate deception beyond reserve, the target noticing being watched, or gossip about
 * impressions (conversation carries reputation beliefs separately, `social.ts`).
 */
import { clamp, clamp01, decay, latestPerId, newestN, round } from '../core/index.ts';
import type {
  EntityId,
  Impression,
  ImpressionCue,
  Minute,
  Person,
  PersonId,
  Signed,
  StateCue,
  Traits,
  Unit,
} from '../types.ts';
import { MINUTES_PER_DAY } from '../types.ts';

export type CueKind = 'state' | 'place' | 'trait' | 'tie' | 'trust' | 'skill';

export const STATE_CUES: readonly StateCue[] = ['fatigue', 'pain', 'fear', 'mood'];
export const TRAIT_NAMES: readonly (keyof Traits)[] = [
  'honesty',
  'emotionality',
  'extraversion',
  'agreeableness',
  'conscientiousness',
  'openness',
];

export const IMPRESSION_DEFAULTS = {
  /** Weight half-life by kind, minutes (0 = no decay). */
  halfLife: {
    state: 6 * 60,
    place: 21 * MINUTES_PER_DAY,
    trait: 0,
    tie: 90 * MINUTES_PER_DAY,
    trust: 30 * MINUTES_PER_DAY,
    /** `skill:<id>`: how good someone is at a craft changes over seasons, and what was seen of it lasts. */
    skill: 365 * MINUTES_PER_DAY,
  } as Record<CueKind, number>,
  /** confidence = weight / (weight + priorWeight). */
  priorWeight: 1.5,
  /** Observation error amplitude at clarity 0 (a sample is off by up to ±noise/2 × (1 − clarity)). */
  noise: 0.5,
  /** Prior means by kind (state cues individually). */
  prior: {
    fatigue: 0.2,
    pain: 0,
    fear: 0.1,
    mood: 0,
    place: 0.1,
    trait: 0.5,
    tie: 0,
    trust: 0.5,
    skill: 0.3,
  },
  /** Default reserve: base + emotionalityCoef × (1 − emotionality) for pain and fear; fatigue and mood a little. */
  reserve: { base: 0.1, emotionalityCoef: 0.4, fatigue: 0.1, mood: 0.2 },
  /** Words hide more than faces: a self-report hides reserve × this (capped at 1). */
  wordsReserve: 1.6,
  /** Weight of one act's trait evidence relative to its clarity. */
  actTraitWeight: 0.5,
  /** Trait evidence by act tag: the trait value an act of that kind suggests. Hosts may pass their own table. */
  actTraits: {
    flee: { emotionality: 0.85, conscientiousness: 0.4 },
    freeze: { emotionality: 0.85 },
    steady: { emotionality: 0.3, conscientiousness: 0.7 },
    help: { agreeableness: 0.75, honesty: 0.65 },
    care: { agreeableness: 0.75 },
    anger: { agreeableness: 0.2 },
    refuse: { agreeableness: 0.4 },
    defer: { conscientiousness: 0.45 },
    complain: { emotionality: 0.65 },
  } as Record<string, Partial<Record<keyof Traits, Unit>>>,
  /** One clear acquaintance sample per trait carries weight acquaintWeight × familiarity. */
  acquaintWeight: 3,
  /** Acquaintance error amplitude at familiarity 0. */
  acquaintNoise: 0.35,
  maxImpressions: 32,
  maxCues: 48,
};

/** Outward signs of a person as a perfectly clear observer would read them (reserve already applied). */
export interface OutwardSigns {
  fatigue: Unit;
  pain: Unit;
  fear: Unit;
  mood?: Signed;
  /** Fear shown toward particular places or people (keyed by id). */
  fearOf?: Record<EntityId, Unit>;
}

export interface Estimate {
  value: number;
  /** 0..1: how much has been seen, after decay. */
  confidence: Unit;
  /** Minute of the last observation, absent when nothing has been seen (the value is the prior). */
  seenAt?: Minute;
}

export interface ObservedAct {
  at: Minute;
  /** 0..1, default 1. */
  clarity?: Unit;
  /**
   * Avoided (+1) or approached (−1) `placeId` (under threat): moves the 'fear@<placeId>' estimate toward
   * 0.5 + 0.5 × avoided. 0 is evidence of middling fear, not "no evidence": omit `avoided` when the act says
   * nothing about fear of the place.
   */
  placeId?: EntityId;
  avoided?: Signed;
  /** Closeness shown toward `withId` (−1 turned away .. +1 went to them): moves 'tie:<withId>'. */
  withId?: PersonId;
  toward?: Signed;
  /** Heeded (+1) or refused (−1) `voiceId`: moves 'trust:<voiceId>'. */
  voiceId?: EntityId;
  heeded?: Signed;
  /** Act tags read as trait evidence through `IMPRESSION_DEFAULTS.actTraits` (or `table`). */
  tags?: readonly string[];
}

function cueKind(key: string): CueKind {
  if (key.startsWith('trait:')) return 'trait';
  if (key.startsWith('tie:')) return 'tie';
  if (key.startsWith('trust:')) return 'trust';
  if (key.startsWith('fear@')) return 'place';
  if (key.startsWith('skill:')) return 'skill';
  return 'state';
}

function priorOf(key: string): number {
  const P = IMPRESSION_DEFAULTS.prior;
  const kind = cueKind(key);
  if (kind === 'state') return (P as Record<string, number>)[key] ?? 0;
  return P[kind];
}

function rangeOf(key: string): [number, number] {
  return key === 'mood' || cueKind(key) === 'tie' ? [-1, 1] : [0, 1];
}

/** FNV-1a over a string, as a 0..1 fraction: deterministic observation error with no RNG drawn. */
function hash01(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12;
  return (h >>> 0) / 4294967296;
}

/** How much `p` keeps `cue` from showing (0..1). */
export function reserveOf(p: Person, cue: StateCue): Unit {
  const own = p.social.reserve?.[cue];
  if (own !== undefined) return clamp01(own);
  const R = IMPRESSION_DEFAULTS.reserve;
  if (cue === 'fatigue') return R.fatigue;
  if (cue === 'mood') return R.mood;
  return clamp01(R.base + R.emotionalityCoef * (1 - p.traits.emotionality));
}

/** Set (merge) how much `p` keeps each cue from showing; `undefined` values remove an override. */
export function setReserve(p: Person, reserve: Partial<Record<StateCue, Unit | undefined>>): void {
  const out: Partial<Record<StateCue, Unit>> = { ...(p.social.reserve ?? {}) };
  for (const cue of STATE_CUES) {
    if (!(cue in reserve)) continue;
    const v = reserve[cue];
    if (v === undefined) delete out[cue];
    else out[cue] = clamp01(v);
  }
  if (Object.keys(out).length === 0) delete p.social.reserve;
  else p.social.reserve = out;
}

function impressionFor(p: Person, targetId: PersonId, create: boolean, now: Minute): Impression | undefined {
  const list = p.social.impressions;
  const found = list?.find((i) => i.targetId === targetId);
  if (found || !create) return found;
  const imp: Impression = { targetId, cues: [], seenAt: now };
  const next = [...(list ?? []), imp];
  if (next.length > IMPRESSION_DEFAULTS.maxImpressions) {
    // Forget the person least recently seen (never the one just added).
    let worst = 0;
    for (let i = 1; i < next.length - 1; i++)
      if ((next[i]?.seenAt ?? 0) < (next[worst]?.seenAt ?? 0)) worst = i;
    next.splice(worst, 1);
  }
  p.social.impressions = next;
  return imp;
}

function decayedWeight(c: ImpressionCue, now: Minute): number {
  const hl = IMPRESSION_DEFAULTS.halfLife[cueKind(c.key)];
  if (hl <= 0 || now <= c.at) return c.weight;
  return decay(c.weight, now - c.at, hl);
}

/** Fold one sample into a cue. */
function sample(imp: Impression, key: string, value: number, weight: number, at: Minute): void {
  if (!(weight > 0) || !Number.isFinite(value)) return;
  const [lo, hi] = rangeOf(key);
  const v = clamp(value, lo, hi);
  let c = imp.cues.find((x) => x.key === key);
  if (!c) {
    c = { key, mean: v, weight: 0, at };
    imp.cues.push(c);
    if (imp.cues.length > IMPRESSION_DEFAULTS.maxCues) {
      let worst = 0;
      for (let i = 1; i < imp.cues.length - 1; i++) {
        const a = imp.cues[i] as ImpressionCue;
        const b = imp.cues[worst] as ImpressionCue;
        if (decayedWeight(a, at) < decayedWeight(b, at)) worst = i;
      }
      imp.cues.splice(worst, 1);
    }
  }
  const w0 = decayedWeight(c, at);
  const w = w0 + weight;
  c.mean = round(clamp((c.mean * w0 + v * weight) / w, lo, hi));
  c.weight = round(w);
  c.at = Math.max(c.at, at);
  imp.seenAt = Math.max(imp.seenAt, at);
}

function erred(observer: Person, targetId: PersonId, key: string, at: Minute, value: number, clarity: Unit) {
  const e = (hash01(`${observer.id}|${targetId}|${key}|${at}`) - 0.5) * IMPRESSION_DEFAULTS.noise;
  return value + e * (1 - clamp01(clarity));
}

/**
 * A look at someone's outward signs (from the composite's `outwardSigns`). `clarity` 0..1 scales both the weight of
 * the evidence and how true it is (a figure in the dark tells little and tells it wrong).
 */
export function glimpse(
  observer: Person,
  targetId: PersonId,
  signs: OutwardSigns,
  opts: { at: Minute; clarity?: Unit },
): void {
  if (targetId === observer.id) return;
  const clarity = clamp01(opts.clarity ?? 1);
  if (clarity <= 0) return;
  const imp = impressionFor(observer, targetId, true, opts.at) as Impression;
  const put = (key: string, v: number) =>
    sample(imp, key, erred(observer, targetId, key, opts.at, v, clarity), clarity, opts.at);
  put('fatigue', signs.fatigue);
  put('pain', signs.pain);
  put('fear', signs.fear);
  if (signs.mood !== undefined) put('mood', signs.mood);
  if (signs.fearOf)
    for (const id of Object.keys(signs.fearOf).sort()) put(`fear@${id}`, signs.fearOf[id] ?? 0);
}

/** What someone was seen to do: place fear, ties, trust in a voice and trait evidence (see `ObservedAct`). */
export function observeAct(
  observer: Person,
  targetId: PersonId,
  act: ObservedAct,
  table: Record<string, Partial<Record<keyof Traits, Unit>>> = IMPRESSION_DEFAULTS.actTraits,
): void {
  if (targetId === observer.id) return;
  const clarity = clamp01(act.clarity ?? 1);
  if (clarity <= 0) return;
  const imp = impressionFor(observer, targetId, true, act.at) as Impression;
  const put = (key: string, v: number, w = clarity) =>
    sample(imp, key, erred(observer, targetId, key, act.at, v, clarity), w, act.at);
  if (act.placeId !== undefined && act.avoided !== undefined)
    put(`fear@${act.placeId}`, 0.5 + 0.5 * clamp(act.avoided, -1, 1));
  if (act.withId !== undefined && act.toward !== undefined && act.withId !== targetId)
    put(`tie:${act.withId}`, clamp(act.toward, -1, 1));
  if (act.voiceId !== undefined && act.heeded !== undefined)
    put(`trust:${act.voiceId}`, 0.5 + 0.5 * clamp(act.heeded, -1, 1));
  for (const tag of [...new Set(act.tags ?? [])].sort()) {
    const traits = table[tag];
    if (!traits) continue;
    for (const t of TRAIT_NAMES) {
      const v = traits[t];
      if (v !== undefined) put(`trait:${t}`, v, clarity * IMPRESSION_DEFAULTS.actTraitWeight);
    }
  }
}

/** Testimony about someone (their own words, or another's): `value` on `key`, weighted (e.g. by trust in the teller). */
export function hear(
  observer: Person,
  targetId: PersonId,
  key: string,
  value: number,
  opts: { at: Minute; weight?: Unit },
): void {
  if (targetId === observer.id) return;
  const w = clamp01(opts.weight ?? 0.5);
  if (w <= 0) return;
  const imp = impressionFor(observer, targetId, true, opts.at) as Impression;
  sample(imp, key, value, w, opts.at);
}

/**
 * Years of history condensed (host call, e.g. at the start of a run for people who already know each other): one
 * sample per trait from `traits` with an error that shrinks with familiarity, at weight
 * `acquaintWeight × familiarity`, and one sample per known tie of the target (`ties`, closeness −1..1).
 */
export function acquaint(
  observer: Person,
  targetId: PersonId,
  familiarity: Unit,
  facts: { traits: Traits; ties?: Record<PersonId, Signed> },
  at: Minute,
): void {
  if (targetId === observer.id) return;
  const f = clamp01(familiarity);
  if (f <= 0) return;
  const A = IMPRESSION_DEFAULTS;
  const imp = impressionFor(observer, targetId, true, at) as Impression;
  for (const t of TRAIT_NAMES) {
    const key = `trait:${t}`;
    const e = (hash01(`${observer.id}|${targetId}|${key}|acquaint`) - 0.5) * A.acquaintNoise * (1 - f);
    sample(imp, key, facts.traits[t] + e, A.acquaintWeight * f, at);
  }
  for (const id of Object.keys(facts.ties ?? {}).sort()) {
    if (id === observer.id || id === targetId) continue;
    sample(imp, `tie:${id}`, facts.ties?.[id] ?? 0, 2 * f, at);
  }
}

/** The observer's estimate of `key` about `targetId` at `now` (the prior with confidence 0 when nothing is known). */
export function estimate(observer: Person, targetId: PersonId, key: string, now: Minute): Estimate {
  const c = observer.social.impressions
    ?.find((i) => i.targetId === targetId)
    ?.cues.find((x) => x.key === key);
  if (!c) return { value: priorOf(key), confidence: 0 };
  const w = decayedWeight(c, now);
  return { value: c.mean, confidence: round(w / (w + IMPRESSION_DEFAULTS.priorWeight)), seenAt: c.at };
}

/** The estimate pulled toward the prior by its uncertainty: what to act on when unsure. */
export function believedValue(observer: Person, targetId: PersonId, key: string, now: Minute): number {
  const e = estimate(observer, targetId, key, now);
  const prior = priorOf(key);
  return prior + (e.value - prior) * e.confidence;
}

export interface ImpressionReadout {
  targetId: PersonId;
  /** Minute of the last observation of anything, absent when the observer holds no impression. */
  seenAt?: Minute;
  cues: ({ key: string } & Estimate)[];
}

/** Every cue the observer holds about `targetId`, sorted by key (read-only). */
export function impressionOf(observer: Person, targetId: PersonId, now: Minute): ImpressionReadout {
  const imp = observer.social.impressions?.find((i) => i.targetId === targetId);
  if (!imp) return { targetId, cues: [] };
  const cues = [...imp.cues]
    .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
    .map((c) => ({ key: c.key, ...estimate(observer, targetId, c.key, now) }));
  return { targetId, seenAt: imp.seenAt, cues };
}

/** Whether `p` holds any impression of `targetId`. */
function hasImpression(p: Person, targetId: PersonId): boolean {
  return p.social.impressions?.some((i) => i.targetId === targetId) ?? false;
}

/**
 * How steady `p` believes `otherId` to be in danger, −1..1 scaled by confidence (0 when nothing is known): calm
 * and unhurt reads positive, frightened or hurt negative. Cognition weighs it on risky offers shared with them.
 */
export function companionSteadiness(p: Person, otherId: PersonId, now: Minute): Signed {
  if (!hasImpression(p, otherId)) return 0;
  const fear = estimate(p, otherId, 'fear', now);
  const pain = estimate(p, otherId, 'pain', now);
  const emo = estimate(p, otherId, 'trait:emotionality', now);
  const conf = (fear.confidence + pain.confidence + emo.confidence) / 3;
  if (conf <= 0) return 0;
  const shaky = 0.5 * fear.value + 0.3 * pain.value + 0.4 * (emo.value - 0.5);
  return round(clamp((0.25 - shaky) * 2, -1, 1) * conf);
}

/**
 * Drop malformed impressions or reserve on restore (absent means none), and hold the rest to the live bounds: every
 * cue needs a finite mean and minute and a finite weight ≥ 0 (else its impression is dropped); a mean outside its
 * key's range is clamped; a repeated target or cue key keeps the one seen latest; past `maxImpressions` impressions
 * or `maxCues` cues the most recently seen are kept, in saved order. A save the engine wrote is already within this.
 */
export function sanitizeImpressions(social: Person['social']): void {
  const r = social.reserve as unknown;
  if (r !== undefined) {
    const ok =
      typeof r === 'object' &&
      r !== null &&
      !Array.isArray(r) &&
      Object.entries(r as Record<string, unknown>).every(
        ([k, v]) => (STATE_CUES as readonly string[]).includes(k) && Number.isFinite(v),
      );
    if (!ok) delete social.reserve;
  }
  const list = social.impressions as unknown;
  if (list === undefined) return;
  if (!Array.isArray(list)) {
    delete social.impressions;
    return;
  }
  const good = list.filter(
    (i): i is Impression =>
      typeof i === 'object' &&
      i !== null &&
      typeof i.targetId === 'string' &&
      Number.isFinite(i.seenAt) &&
      Array.isArray(i.cues) &&
      i.cues.every(
        (c: unknown) =>
          typeof c === 'object' &&
          c !== null &&
          typeof (c as ImpressionCue).key === 'string' &&
          Number.isFinite((c as ImpressionCue).mean) &&
          Number.isFinite((c as ImpressionCue).weight) &&
          (c as ImpressionCue).weight >= 0 &&
          Number.isFinite((c as ImpressionCue).at),
      ),
  );
  const A = IMPRESSION_DEFAULTS;
  for (const imp of good) {
    for (const c of imp.cues) {
      const [lo, hi] = rangeOf(c.key);
      if (c.mean < lo || c.mean > hi) c.mean = clamp(c.mean, lo, hi);
    }
    const cues = latestPerId(
      imp.cues,
      (c) => c.key,
      (c) => c.at,
    );
    imp.cues = newestN(cues, A.maxCues, (c) => c.at);
  }
  const one = latestPerId(
    good,
    (i) => i.targetId,
    (i) => i.seenAt,
  );
  const kept = newestN(one, A.maxImpressions, (i) => i.seenAt);
  if (kept.length === 0) delete social.impressions;
  else social.impressions = kept;
}
