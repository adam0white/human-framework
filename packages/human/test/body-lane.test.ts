import { describe, expect, test } from 'vitest';
import {
  advanceBody,
  BODY_DEFAULTS,
  consume,
  contagionRoll,
  createBody,
  expose,
  exposureChance,
  fastingDamping,
  nextBodyThreshold,
  readBody,
  sicken,
  transmissionChance,
} from '../src/body/index.ts';
import { createRng } from '../src/core/index.ts';
import { modifiersForAge } from '../src/lifecourse/index.ts';
import type { BodyLoad, BodyState, Person } from '../src/types.ts';
import { MINUTES_PER_DAY, MINUTES_PER_YEAR } from '../src/types.ts';

const DAY = MINUTES_PER_DAY;
const OLDER = modifiersForAge(61);
const REST: BodyLoad = { effort: 0.05, focus: 0.1, mode: 'awake' };
const WORK: BodyLoad = { effort: 0.7, focus: 0.5, mode: 'awake' };
const SLEEP: BodyLoad = { effort: 0, focus: 0, mode: 'sleep' };

function person(now = 7 * 60, body?: Partial<BodyState>, seed = 1): Person {
  return {
    now,
    rng: createRng(seed),
    life: { bornAt: now - 61 * MINUTES_PER_YEAR, sex: 'male' },
    body: createBody(body, now),
  } as unknown as Person;
}

/** Run `minutes` in 60-minute steps; `each` runs before every step (hold a variable, eat, ...). */
function run(p: Person, minutes: number, load: BodyLoad, each?: (p: Person) => void): void {
  for (let t = 0; t < minutes; t += 60) {
    each?.(p);
    const dt = Math.min(60, minutes - t);
    advanceBody(p, dt, load, OLDER);
    p.now += dt;
  }
}

/** One ordinary day: 16 h awake under `load` with meals every 4 h, 8 h sleep. */
function day(p: Person, load: BodyLoad = REST, each?: (p: Person) => void): void {
  for (let t = 0; t < 16 * 60; t += 240) {
    consume(p, { food: 0.5, water: 0.6 });
    run(p, 240, load, each);
  }
  run(p, 8 * 60, SLEEP, each);
}

describe('N2b fasting perception', () => {
  test('hunger damped, ramping over the first week then flat; thirst not damped; truth untouched', () => {
    const p = person(16 * 60, { satiety: 0.25, hydration: 0.3 });
    const plain = readBody(p);
    const d0 = readBody(p, BODY_DEFAULTS, { fasting: true, fastingDays: 0 });
    const d7 = readBody(p, BODY_DEFAULTS, { fasting: true, fastingDays: 7 });
    const d24 = readBody(p, BODY_DEFAULTS, { fasting: true, fastingDays: 24 });
    const off = readBody(p, BODY_DEFAULTS, { fasting: false, fastingDays: 7 });
    expect(off).toEqual(plain);
    expect(d0.perceived.hunger).toBeLessThan(plain.perceived.hunger);
    expect(d7.perceived.hunger).toBeLessThan(d0.perceived.hunger);
    // Fleischmann et al. 2026: day 7 and day 24 did not differ significantly.
    expect(d7.perceived.hunger - d24.perceived.hunger).toBeLessThan(0.02);
    // Thirst rose during Ramadan in the same study: no damping.
    expect(d24.perceived.thirst).toBe(plain.perceived.thirst);
    for (const r of [d0, d7, d24]) {
      expect(r.hunger).toBe(plain.hunger);
      expect(r.capacity).toBe(plain.capacity);
      expect(r.thirst).toBe(plain.thirst);
    }
    expect(fastingDamping(p.body, { fasting: true, fastingDays: 30 }).hunger).toBeCloseTo(
      BODY_DEFAULTS.fastingHungerDamp,
      2,
    );
  });

  test('severe true deprivation breaks through the damping', () => {
    const p = person(16 * 60, { satiety: 0.02 });
    const r = readBody(p, BODY_DEFAULTS, { fasting: true, fastingDays: 20 });
    expect(r.perceived.hunger).toBe(r.hunger);
  });

  test('true satiety still drives capacity and health while fasting', () => {
    // Two identical 30-day fasting months; one is read with the fasting context. The body is the same,
    // and a third person who never refuels loses capacity and health whatever he feels.
    const a = person(4 * 60, { satiety: 0.9, hydration: 0.9 });
    for (let d = 0; d < 3; d++) {
      run(a, 15 * 60, REST); // dawn to sunset without food
      consume(a, { food: 0.7, water: 0.7 });
      run(a, 9 * 60, SLEEP);
    }
    const ctx = { fasting: true, fastingDays: 3 };
    expect(readBody(a, BODY_DEFAULTS, ctx).capacity).toBe(readBody(a).capacity);
    const starving = person(4 * 60, { satiety: 0.3, hydration: 0.9 });
    run(starving, 4 * DAY, REST, (q) => consume(q, { water: 0.05 }));
    const r = readBody(starving, BODY_DEFAULTS, { fasting: true, fastingDays: 10 });
    expect(starving.body.health).toBeLessThan(1);
    expect(r.capacity).toBeLessThan(readBody(a, BODY_DEFAULTS, ctx).capacity);
  });

  test('nextBodyThreshold schedules the hunger interrupt on damped hunger when given the context', () => {
    const p = person(12 * 60, { satiety: 0.5, hydration: 1 });
    const th = { hunger: 0.7, thirst: 0.99, sleepiness: 0.99 };
    const plain = nextBodyThreshold(p, REST, OLDER, th, 720);
    const fasting = nextBodyThreshold(p, REST, OLDER, th, 720, BODY_DEFAULTS, {
      fasting: true,
      fastingDays: 7,
    });
    expect(plain).toBeLessThan(Number.POSITIVE_INFINITY);
    expect(fasting).toBeGreaterThan(plain);
  });
});

describe('N12 illness coupled to behaviour', () => {
  const cold = { kind: 'cold', severity: 0.4, trendPerDay: 0.1, contagious: true };

  function course(load: BodyLoad, hold?: (p: Person) => void): number {
    const p = person(7 * 60, { satiety: 0.8, hydration: 0.8 });
    sicken(p, cold);
    for (let d = 0; d < 3; d++) day(p, load, hold);
    return p.body.illnesses.find((i) => i.kind === 'cold')?.severity ?? 0;
  }

  test('rest and food recover faster than fasting-afternoon fuel, heavy work or sleep debt', () => {
    const rested = course(REST);
    const underfed = course(REST, (q) => {
      q.body.satiety = 0.18;
    });
    const working = course(WORK);
    const indebt = course(REST, (q) => {
      q.body.sleepDebt = 16;
    });
    expect(underfed).toBeGreaterThan(rested + 0.02);
    expect(working).toBeGreaterThan(rested);
    expect(indebt).toBeGreaterThan(rested);
  });

  test('chronic hypertension persists near baseline and costs health only slowly', () => {
    const p = person();
    sicken(p, { kind: 'hypertension', severity: 0.3, trendPerDay: 0, contagious: false, chronic: true });
    for (let d = 0; d < 30; d++) day(p);
    const ht = p.body.illnesses.find((i) => i.kind === 'hypertension');
    expect(ht).toBeDefined();
    expect(ht?.baseline).toBe(0.3);
    expect(ht?.severity ?? 0).toBeCloseTo(0.3, 1);
    expect(p.body.health).toBeGreaterThan(0.9);
    // Chronic illness does not block ordinary health recovery.
    const q = person(7 * 60, { health: 0.7 });
    sicken(q, { kind: 'hypertension', severity: 0.3, trendPerDay: 0, contagious: false, chronic: true });
    for (let d = 0; d < 10; d++) day(q);
    expect(q.body.health).toBeGreaterThan(0.7);
  });

  test('exposures and sleep debt aggravate a chronic condition; abstaining lets it fall back', () => {
    const ht = { kind: 'hypertension', severity: 0.3, trendPerDay: 0, contagious: false, chronic: true };
    const smoker = person();
    sicken(smoker, { ...ht, aggravatedBy: ['smoke'] });
    for (let d = 0; d < 14; d++) {
      for (let m = 0; m < 3; m++) expose(smoker, 'smoke');
      day(smoker);
    }
    const peak = smoker.body.illnesses[0]?.severity ?? 0;
    expect(peak).toBeGreaterThan(0.36);
    for (let d = 0; d < 30; d++) day(smoker);
    const after = smoker.body.illnesses[0]?.severity ?? 1;
    expect(after).toBeLessThan(peak - 0.05);
    expect(smoker.body.exposures?.smoke?.cumulative ?? 0).toBeGreaterThan(40); // dose decays over years

    const tired = person();
    sicken(tired, ht);
    for (let d = 0; d < 10; d++)
      day(tired, REST, (q) => {
        q.body.sleepDebt = 16;
      });
    expect(tired.body.illnesses[0]?.severity ?? 0).toBeGreaterThan(0.4);
  });

  test('chronic conditions are not evicted by acute overflow', () => {
    const p = person();
    sicken(p, { kind: 'hypertension', severity: 0.05, trendPerDay: 0, contagious: false, chronic: true });
    for (let i = 0; i < BODY_DEFAULTS.maxIllnesses + 3; i++)
      sicken(p, { kind: `bug${i}`, severity: 0.2 + i * 0.01, trendPerDay: 0.05, contagious: false });
    expect(p.body.illnesses.length).toBe(BODY_DEFAULTS.maxIllnesses);
    expect(p.body.illnesses.some((i) => i.chronic)).toBe(true);
  });

  test('exposureChance rises with cumulative dose and days; absent exposure is 0', () => {
    const p = person();
    expect(exposureChance(p.body, 'smoke', 365, 1e-5)).toBe(0);
    for (let i = 0; i < 100; i++) expose(p, 'smoke');
    const a = exposureChance(p.body, 'smoke', 30, 1e-5);
    const b = exposureChance(p.body, 'smoke', 365, 1e-5);
    expect(a).toBeGreaterThan(0);
    expect(b).toBeGreaterThan(a);
    expect(b).toBeLessThan(1);
    expect(expose(p, 'smoke', Number.NaN)).toBeNull();
  });

  test('exposures stay bounded and nextBodyThreshold does not mutate them', () => {
    const p = person();
    for (let i = 0; i < BODY_DEFAULTS.maxExposures + 5; i++) expose(p, `x${i}`, i + 1);
    expect(Object.keys(p.body.exposures ?? {}).length).toBe(BODY_DEFAULTS.maxExposures);
    const before = JSON.stringify(p.body);
    nextBodyThreshold(p, REST, OLDER);
    expect(JSON.stringify(p.body)).toBe(before);
  });
});

describe('contagion', () => {
  const flu = { kind: 'flu', severity: 0.5, trendPerDay: 0.1, contagious: true };

  test('transmissionChance rises with contact minutes and severity; 0 if not contagious', () => {
    expect(transmissionChance({ ...flu, contagious: false }, 600)).toBe(0);
    expect(transmissionChance(flu, 0)).toBe(0);
    const short = transmissionChance(flu, 15);
    const long = transmissionChance(flu, 120);
    expect(long).toBeGreaterThan(short);
    expect(transmissionChance({ ...flu, severity: 1 }, 15)).toBeGreaterThan(short);
    expect(transmissionChance(flu, 60)).toBeCloseTo(1 - Math.exp(-0.12), 6);
  });

  test('contagionRoll is seeded, matches the chance in aggregate and does not re-infect', () => {
    const pr = transmissionChance(flu, 60);
    let hits = 0;
    for (let s = 1; s <= 2000; s++) if (contagionRoll(person(0, undefined, s), flu, 60)) hits++;
    expect(Math.abs(hits / 2000 - pr)).toBeLessThan(0.03);
    const a = person(0, undefined, 7);
    const b = person(0, undefined, 7);
    expect(contagionRoll(a, flu, 600) === null).toBe(contagionRoll(b, flu, 600) === null);
    const ill = person();
    sicken(ill, flu);
    const rng = { ...ill.rng };
    expect(contagionRoll(ill, flu, 10_000)).toBeNull();
    expect(ill.rng).toEqual(rng);
  });
});
