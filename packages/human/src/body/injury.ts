/**
 * SCOPE (injury depth, 1.6.0): what an injury does beyond pain, kept small. Three capacities (moving,
 * manipulation, sight) read per person from the injured parts; bleeding that drains the health reserve and clots
 * by itself, faster once tended; and a downed state in which a person can only lie where they are.
 *
 * Capacities are read, not stored: each injury impairs a capacity by `affects[c] × severity`, multiplied across
 * injuries (1 = unimpaired). `affects` comes from the injury itself when the host gave one, otherwise from
 * `DEFAULT_PARTS` by exact part name (no substring matching: 'hands and face' impairs nothing). They do not touch
 * the scalar `readBody().capacity`, so existing hosts see no change; they matter only where an offer declares
 * `Affordance.requires` (a `cannot` veto `capacity:<c>` below the floor) or the person opted into derived downing.
 *
 * Bleeding (`Injury.bleeding`, health per day) is set only by the host. It decays exponentially (clotting) with
 * half-life `clotHalfLife`, or `tendedClotHalfLife` once tended; the body integrates the drain exactly per sub-step,
 * so chunking does not change it. `tend` cuts the rate by `tendBleedCut × quality`, marks the injury tended, and a
 * tended injury heals `tendedHeal` times faster.
 *
 * Downed (`BodyState.downed`) is set by the host (`knockDown`, through the composite so the activity is interrupted)
 * or, only for a person with `body.downedBelow` set (`enableDowned`), derived hourly on the tick grid from moving
 * capacity or health below the floor; derived downing lifts when both are back above it (with a small margin). While
 * downed only offers tagged 'floor' or 'rest' or with mode 'sleep' are open (others `cannot`/`downed`), and a
 * command ends. All numbers and the part table are engineering defaults, not medical data. Does not model:
 * anatomy beyond the part name, infection, scars, permanent loss, prosthetics, blood volume, shock, or a doctor's
 * skill (the host folds that into `quality`).
 */
import { clamp01, dexp } from '../core/index.ts';
import type { BodyState, Capacity, Injury, Minute, Person, Unit } from '../types.ts';
import { CAPACITIES, MINUTES_PER_DAY } from '../types.ts';

export const INJURY_DEFAULTS = {
  /** Half-life (min) of an untended bleed: it slows by itself over a day or so. */
  clotHalfLife: 18 * 60,
  /** Half-life (min) of a tended bleed. */
  tendedClotHalfLife: 3 * 60,
  /** Share of the bleed rate a tend at quality 1 stops. */
  tendBleedCut: 0.8,
  /** Healing multiplier on a tended injury. */
  tendedHeal: 1.5,
  /** Below this rate (health/day) a bleed is over and the field is removed. */
  bleedStops: 1e-3,
  /** Margin above the floor a derived downing needs before it lifts. */
  standMargin: 0.05,
};

/**
 * Default impairment per unit severity by exact part name (engineering defaults). A host with its own anatomy passes
 * `affects` on the injury instead.
 */
export const DEFAULT_PARTS: Readonly<Record<string, Partial<Record<Capacity, Unit>>>> = {
  leg: { moving: 0.5 },
  legs: { moving: 0.8 },
  foot: { moving: 0.4 },
  feet: { moving: 0.7 },
  arm: { manipulation: 0.5 },
  arms: { manipulation: 0.8 },
  hand: { manipulation: 0.5 },
  hands: { manipulation: 0.8 },
  shoulder: { manipulation: 0.4 },
  eye: { sight: 0.5 },
  eyes: { sight: 0.9 },
  head: { sight: 0.2, manipulation: 0.1, moving: 0.1 },
  torso: { moving: 0.2, manipulation: 0.2 },
  back: { moving: 0.3, manipulation: 0.2 },
};

/** What one injury impairs per unit severity: its own `affects`, else the part table, else nothing. */
export function injuryAffects(inj: Injury): Partial<Record<Capacity, Unit>> {
  return inj.affects ?? DEFAULT_PARTS[inj.part] ?? {};
}

/** Capacities 0..1 (1 = unimpaired) from the person's injuries. Does not include fatigue or pain (see `readBody`). */
export function readCapacities(p: Person): Record<Capacity, Unit> {
  const out: Record<Capacity, Unit> = { moving: 1, manipulation: 1, sight: 1 };
  if (!p.body.alive) return { moving: 0, manipulation: 0, sight: 0 };
  for (const inj of p.body.injuries) {
    const a = injuryAffects(inj);
    for (const c of CAPACITIES) {
      const k = a[c];
      if (k) out[c] *= 1 - clamp01(k) * clamp01(inj.severity);
    }
  }
  return out;
}

/**
 * Bleeding over one sub-step of `h` minutes: advances every bleed's clotting and returns the health lost (exact
 * integral of the decaying rate). Called by the body's integrator.
 */
export function bleedStep(b: BodyState, h: number, K = INJURY_DEFAULTS): number {
  let loss = 0;
  for (const inj of b.injuries) {
    const r0 = inj.bleeding;
    if (r0 === undefined) continue;
    const k = Math.LN2 / (inj.tendedAt !== undefined ? K.tendedClotHalfLife : K.clotHalfLife);
    const e = dexp(-k * h);
    loss += (r0 * (1 - e)) / k / MINUTES_PER_DAY;
    const r = r0 * e;
    if (r < K.bleedStops) delete inj.bleeding;
    else inj.bleeding = r;
  }
  return loss;
}

/**
 * Tend an injury (or, without `injuryId`, every untended one): cut its bleed by `tendBleedCut × quality` and mark
 * it tended, which also speeds clotting and healing. Re-tending a tended injury cuts the bleed again. Returns how
 * many injuries were tended.
 */
export function tend(p: Person, injuryId?: string, quality: Unit = 1): number {
  if (!p.body.alive) return 0;
  const q = clamp01(quality);
  let n = 0;
  for (const inj of p.body.injuries) {
    if (injuryId !== undefined ? inj.id !== injuryId : inj.tendedAt !== undefined) continue;
    if (inj.bleeding !== undefined) {
      const r = inj.bleeding * (1 - INJURY_DEFAULTS.tendBleedCut * q);
      if (r < INJURY_DEFAULTS.bleedStops) delete inj.bleeding;
      else inj.bleeding = r;
    }
    inj.tendedAt = p.now;
    n += 1;
  }
  return n;
}

/** Total bleed rate (health per day) right now, for UI. */
export function bleedRate(p: Person): number {
  let r = 0;
  for (const inj of p.body.injuries) r += inj.bleeding ?? 0;
  return r;
}

/** Whether the person is downed (and since when, why, until when). */
export function isDowned(p: Person): BodyState['downed'] {
  return p.body.downed;
}

/**
 * Opt a person into derived downing: on the tick grid they go down when moving capacity or health falls below the
 * floor and get up when both recover. `undefined` turns it off (a downing already in force stays until it lifts).
 */
export function enableDowned(p: Person, floor: { moving?: Unit; health?: Unit } | undefined): void {
  if (!floor || (floor.moving === undefined && floor.health === undefined)) {
    delete p.body.downedBelow;
    return;
  }
  const out: { moving?: Unit; health?: Unit } = {};
  if (floor.moving !== undefined) out.moving = clamp01(floor.moving);
  if (floor.health !== undefined) out.health = clamp01(floor.health);
  p.body.downedBelow = out;
}

/** Body-level setter (the composite's `knockDown` also interrupts the activity). */
export function setDowned(p: Person, reason: string, until?: Minute): boolean {
  if (!p.body.alive) return false;
  p.body.downed = until !== undefined ? { since: p.now, reason, until } : { since: p.now, reason };
  return true;
}

/** Body-level clear. Returns whether the person was downed. */
export function clearDowned(p: Person): boolean {
  if (!p.body.downed) return false;
  liftDowned(p.body, p.now);
  return true;
}

/** Lift the downing and remember its span (`lastDowned`, read by the agenda for missed worship windows). */
function liftDowned(b: Person['body'], now: Minute): void {
  if (b.downed) b.lastDowned = { from: b.downed.since, to: now };
  delete b.downed;
}

/** Derived downing below the floor, or undefined (no floor set, or above it with `margin`). */
function belowFloor(p: Person, margin: number): string | undefined {
  const f = p.body.downedBelow;
  if (!f) return undefined;
  if (f.health !== undefined && p.body.health < f.health + margin) return 'health';
  if (f.moving !== undefined && readCapacities(p).moving < f.moving + margin) return 'capacity';
  return undefined;
}

/**
 * Hourly downing bookkeeping (the composite calls it on the tick grid): a timed downing ends at `until`; a derived
 * one lifts once above the floor; a person with a floor goes down below it. Returns what changed.
 */
export function checkDowned(p: Person, now: Minute): { kind: 'down' | 'up'; reason: string } | undefined {
  const b = p.body;
  if (!b.alive) return undefined;
  const d = b.downed;
  if (d) {
    if (d.until !== undefined) {
      if (now < d.until) return undefined;
      liftDowned(b, now);
      return { kind: 'up', reason: d.reason };
    }
    if ((d.reason === 'health' || d.reason === 'capacity') && b.downedBelow) {
      if (belowFloor(p, INJURY_DEFAULTS.standMargin) !== undefined) return undefined;
      liftDowned(b, now);
      return { kind: 'up', reason: d.reason };
    }
    return undefined;
  }
  const reason = belowFloor(p, 0);
  if (!reason) return undefined;
  b.downed = { since: now, reason };
  return { kind: 'down', reason };
}

/** Whether a downed person can still take an offer: lying, resting or sleeping where they are. */
export function downedAllows(aff: { tags?: readonly string[]; mode?: string }): boolean {
  if (aff.mode === 'sleep') return true;
  const tags = aff.tags ?? [];
  return tags.includes('floor') || tags.includes('rest');
}

const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const isObj = (x: unknown): x is Record<string, unknown> =>
  typeof x === 'object' && x !== null && !Array.isArray(x);

/** Restore-time check of the 1.6.0 injury and downing fields: malformed ones are dropped, never filled. */
export function sanitizeInjuries(b: BodyState): void {
  if (!Array.isArray(b.injuries)) {
    b.injuries = [];
    return;
  }
  b.injuries = b.injuries.filter((i) => isObj(i) && isNum(i.severity));
  for (const i of b.injuries) {
    const raw = i as unknown as Record<string, unknown>;
    if (raw.bleeding !== undefined && !(isNum(raw.bleeding) && raw.bleeding >= 0)) delete i.bleeding;
    if (raw.tendedAt !== undefined && !isNum(raw.tendedAt)) delete i.tendedAt;
    if (raw.affects !== undefined) {
      const a = raw.affects;
      if (
        !isObj(a) ||
        !Object.entries(a).every(([k, v]) => (CAPACITIES as readonly string[]).includes(k) && isNum(v))
      )
        delete i.affects;
    }
  }
  const d = b.downed as unknown;
  if (
    d !== undefined &&
    !(isObj(d) && isNum(d.since) && typeof d.reason === 'string' && (d.until === undefined || isNum(d.until)))
  )
    delete b.downed;
  const f = b.downedBelow as unknown;
  if (
    f !== undefined &&
    !(isObj(f) && (f.moving === undefined || isNum(f.moving)) && (f.health === undefined || isNum(f.health)))
  )
    delete b.downedBelow;
}
