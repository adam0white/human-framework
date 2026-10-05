/**
 * Impressions, composite side (HF 2.0 L6; the faculty and its SCOPE are in `social/impressions.ts`). This file is
 * the only place that reads a target's true state for an observer, and it reads only what shows:
 * - `outwardSigns(target)`: perceived fatigue, pain and fear and the felt mood, each reduced by the target's reserve;
 *   a limp (lost moving capacity) shows through any reserve. `selfReport(target)` is the same in words, which hide
 *   more (`IMPRESSION_DEFAULTS.wordsReserve`): "I'm fine".
 * - `glimpseOf(observer, target, at, clarity?)` = `glimpse` of the target's outward signs; `acquaintWith` hands the target's
 *   traits and family ties (public roles) to `acquaint`.
 * - `imagine(observer, target, now)`: the target as the observer pictures them — a copy whose traits, fear, pain,
 *   fatigue, mood, ties and trust in voices are the observer's beliefs (each pulled to the prior by its uncertainty)
 *   and whose private memory (episodes, expectations, beliefs) is unknown and dropped. Agenda, norms, values, skills
 *   and needs are kept as known: hidden values are out of scope.
 * - `predictAs` / `previewCommandAs`: the framework's own `predict` / `previewCommand` run on that picture, with a
 *   confidence, so a host's read of a person and one person's read of another use the same function. Pure:
 *   neither person changes and no randomness is drawn.
 *
 * Does not cover: keeping estimates over time (that is `social/impressions.ts`), detecting deception, or any
 * sign beyond the reserve-reduced outward ones.
 */
import { readAffect } from './affect/index.ts';
import { readCapacities } from './body/index.ts';
import { clamp01, round } from './core/index.ts';
import { predict, previewCommand, readPerson } from './person.ts';
import {
  acquaint,
  believedValue,
  estimate,
  glimpse,
  IMPRESSION_DEFAULTS,
  type OutwardSigns,
  reserveOf,
} from './social/index.ts';
import type {
  Affordance,
  Command,
  Emotion,
  Minute,
  Person,
  PersonId,
  Suggestion,
  SuggestionResolution,
  Unit,
} from './types.ts';
import { TRAIT_KEYS } from './types.ts';
import type { CommandOutcome } from './will/index.ts';

/** Family roles everyone around knows about (acquaintance passes these ties on). */
const PUBLIC_ROLES = ['spouse', 'parent', 'child', 'sibling', 'grandchild', 'grandparent'];

function signsOf(target: Person, hide: (r: Unit) => Unit): OutwardSigns {
  const { body } = readPerson(target);
  const affect = readAffect(target);
  let fear = 0;
  const fearOf: Record<string, Unit> = {};
  for (const e of target.affect.emotions) {
    if (e.id !== 'fear') continue;
    fear += e.intensity;
    if (e.targetId !== undefined) fearOf[e.targetId] = clamp01((fearOf[e.targetId] ?? 0) + e.intensity);
  }
  const limp = 1 - readCapacities(target).moving;
  const fearShown = 1 - hide(reserveOf(target, 'fear'));
  const shownFearOf: Record<string, Unit> = {};
  for (const id of Object.keys(fearOf).sort()) shownFearOf[id] = round((fearOf[id] ?? 0) * fearShown);
  return {
    fatigue: round(body.perceived.fatigue * (1 - hide(reserveOf(target, 'fatigue')))),
    pain: round(Math.max(body.perceived.pain * (1 - hide(reserveOf(target, 'pain'))), 0.6 * limp)),
    fear: round(clamp01(fear) * fearShown),
    mood: round(affect.valence * (1 - hide(reserveOf(target, 'mood')))),
    fearOf: shownFearOf,
  };
}

/** What a clear look at `target` shows: true perceived state reduced by their reserve (a limp always shows). */
export function outwardSigns(target: Person): OutwardSigns {
  return signsOf(target, (r) => r);
}

/** What `target` says of themself: words hide more than faces (`wordsReserve`), and a limp is not mentioned. */
export function selfReport(target: Person): OutwardSigns {
  const s = signsOf(target, (r) => clamp01(r * IMPRESSION_DEFAULTS.wordsReserve));
  const { body } = readPerson(target);
  s.pain = round(
    body.perceived.pain * (1 - clamp01(reserveOf(target, 'pain') * IMPRESSION_DEFAULTS.wordsReserve)),
  );
  return s;
}

/** `observer` looks at `target` at `at` (clarity 0..1: a clear look near by, or a distant figure; default 1). */
export function glimpseOf(observer: Person, target: Person, at: Minute, clarity?: Unit): void;
/** @deprecated since 2.1: pass `at` (and the optional knobs) positionally. Removed in 3.0. */
export function glimpseOf(observer: Person, target: Person, opts: { at: Minute; clarity?: Unit }): void;
export function glimpseOf(
  observer: Person,
  target: Person,
  when: Minute | { at: Minute; clarity?: Unit },
  clarity?: Unit,
): void {
  if (typeof when === 'number') glimpse(observer, target.id, outwardSigns(target), when, clarity);
  else glimpse(observer, target.id, outwardSigns(target), when.at, when.clarity);
}

/** `observer` has known `target` for a long time (familiarity 0..1): traits and family ties, condensed. */
export function acquaintWith(observer: Person, target: Person, familiarity: Unit, at: Minute): void {
  const ties: Record<PersonId, number> = {};
  for (const r of target.social.relationships)
    if (r.roles.some((x) => PUBLIC_ROLES.includes(x))) ties[r.otherId] = r.affection;
  acquaint(observer, target.id, familiarity, { traits: target.traits, ties }, at);
}

/** How sure the observer is of the things that drive an answer: traits and the state cues, 0..1. */
export function impressionConfidence(observer: Person, targetId: PersonId, now: Minute): Unit {
  let t = 0;
  for (const name of TRAIT_KEYS) t += estimate(observer, targetId, `trait:${name}`, now).confidence;
  let s = 0;
  for (const cue of ['fatigue', 'pain', 'fear'] as const)
    s += estimate(observer, targetId, cue, now).confidence;
  return round(0.5 * (t / TRAIT_KEYS.length) + 0.5 * (s / 3));
}

/**
 * `target` as `observer` pictures them at `now` (see the file comment). A fresh object: neither person changes.
 */
export function imagine(observer: Person, target: Person, now: Minute): Person {
  const m = structuredClone(target);
  const id = target.id;
  for (const name of TRAIT_KEYS)
    m.traits[name] = round(clamp01(believedValue(observer, id, `trait:${name}`, now)));
  m.memory.episodes = [];
  m.memory.expectations = [];
  m.memory.beliefs = [];
  delete m.social.impressions;

  // Emotions: only the fear the observer believes in, in general and toward places.
  const fears: Emotion[] = [];
  const general = believedValue(observer, id, 'fear', now);
  if (general > 0.01)
    fears.push({ id: 'fear', intensity: round(general), cause: 'impression', since: now, halfLife: 240 });
  for (const c of observer.social.impressions?.find((i) => i.targetId === id)?.cues ?? []) {
    if (!c.key.startsWith('fear@')) continue;
    const v = believedValue(observer, id, c.key, now);
    if (v > 0.01)
      fears.push({
        id: 'fear',
        intensity: round(v),
        targetId: c.key.slice('fear@'.length),
        cause: 'impression',
        since: now,
        halfLife: 240,
      });
  }
  m.affect.emotions = fears;
  m.affect.mood.valence = round(believedValue(observer, id, 'mood', now));
  delete m.affect.crisis;

  // Pain and fatigue: the true sources scaled to the believed level (a pain no one has seen is not imagined).
  const truth = readPerson(target).body.perceived;
  const pain = believedValue(observer, id, 'pain', now);
  if (truth.pain > 0.02) {
    const k = Math.min(3, pain / truth.pain);
    for (const inj of m.body.injuries) inj.severity = round(clamp01(inj.severity * k));
  } else if (pain > 0.05) {
    m.body.injuries.push({
      id: 'imagined',
      part: 'unknown',
      severity: round(pain),
      healRatePerDay: 0,
      since: now,
    });
  }
  const fatigue = believedValue(observer, id, 'fatigue', now);
  if (truth.fatigue > 0.02) {
    const k = Math.min(3, fatigue / truth.fatigue);
    m.body.exertion = round(clamp01(m.body.exertion * k));
    m.body.sleepPressure = round(clamp01(m.body.sleepPressure * k));
  }

  // Ties and trust in voices: what the observer believes (an unseen tie reads as the prior).
  for (const r of m.social.relationships)
    r.affection = round(believedValue(observer, id, `tie:${r.otherId}`, now));
  for (const v of m.will.voices) v.trust = round(believedValue(observer, id, `trust:${v.voiceId}`, now));
  return m;
}

export interface ImpressionPrediction {
  resolution: SuggestionResolution;
  /** How sure the observer is (`impressionConfidence`). */
  confidence: Unit;
}

/** How `observer` expects `target` to answer `suggestion` (pure; see `imagine`). */
export function predictAs(
  observer: Person,
  target: Person,
  affordances: readonly Affordance[],
  suggestion: Suggestion,
  opts: { necessity?: boolean; others?: readonly Suggestion[]; scarcity?: Unit; now?: Minute } = {},
): ImpressionPrediction {
  const now = opts.now ?? target.now;
  const { now: _now, ...rest } = opts;
  const model = imagine(observer, target, now);
  return {
    resolution: predict(model, affordances, suggestion, rest),
    confidence: impressionConfidence(observer, target.id, now),
  };
}

/** Whether `observer` expects a command on `target` to hold and at what price (pure; see `imagine`). */
export function previewCommandAs(
  observer: Person,
  target: Person,
  affordances: readonly Affordance[],
  cmd: Command,
  now: Minute = target.now,
): { outcome: CommandOutcome; confidence: Unit } {
  const model = imagine(observer, target, now);
  return {
    outcome: previewCommand(model, affordances, cmd),
    confidence: impressionConfidence(observer, target.id, now),
  };
}
