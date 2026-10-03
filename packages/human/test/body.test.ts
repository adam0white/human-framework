import { describe, expect, test } from 'vitest';
import {
  advanceBody,
  BODY_DEFAULTS,
  circadianAlertness,
  consume,
  createBody,
  injure,
  nextBodyThreshold,
  readBody,
  sicken,
} from '../src/body/index.ts';
import { createRng } from '../src/core/index.ts';
import { modifiersForAge } from '../src/lifecourse/index.ts';
import type { BodyLoad, BodyState, Person } from '../src/types.ts';
import { MINUTES_PER_YEAR } from '../src/types.ts';

const ADULT = modifiersForAge(30);
const REST: BodyLoad = { effort: 0.1, focus: 0.2, mode: 'awake' };
const WORK: BodyLoad = { effort: 0.7, focus: 0.5, mode: 'awake' };
const SLEEP: BodyLoad = { effort: 0, focus: 0, mode: 'sleep' };

function person(now = 7 * 60, body?: Partial<BodyState>): Person {
  return {
    now,
    rng: createRng(1),
    life: { bornAt: now - 30 * MINUTES_PER_YEAR, sex: 'female' },
    body: createBody(body, now),
  } as unknown as Person;
}

/** Advance body and clock together in `chunk`-minute calls. */
function run(p: Person, minutes: number, load: BodyLoad, chunk = minutes): void {
  for (let t = 0; t < minutes; t += chunk) {
    const dt = Math.min(chunk, minutes - t);
    advanceBody(p, dt, load, ADULT);
    p.now += dt;
  }
}

/** Like run, but eats and drinks every 3 h while awake (`food`/`water` per meal). */
function live(p: Person, minutes: number, load: BodyLoad, food = 0.5, water = 0.6): void {
  for (let t = 0; t < minutes; t += 180) {
    if (load.mode === 'awake') consume(p, { food, water });
    run(p, Math.min(180, minutes - t), load, 60);
  }
}

function sleepDay(p: Person, sleepHours: number): void {
  live(p, (24 - sleepHours) * 60, REST);
  run(p, sleepHours * 60, SLEEP, 60);
}

describe('body', () => {
  test('createBody uses healthy defaults and clamps overrides', () => {
    const b = createBody({ satiety: 2, fitness: 0.9 }, 100);
    expect(b.satiety).toBe(1);
    expect(b.fitness).toBe(0.9);
    expect(b.hydration).toBe(0.85);
    expect(b.alive).toBe(true);
    expect(b.since).toBe(100);
    expect(b.injuries).toEqual([]);
  });

  test('one 600-minute step matches 600 one-minute steps', () => {
    for (const load of [REST, WORK, SLEEP]) {
      const a = person();
      const b = person();
      injure(a, { part: 'hand', severity: 0.4, healRatePerDay: 0.3 });
      injure(b, { part: 'hand', severity: 0.4, healRatePerDay: 0.3 });
      sicken(a, { kind: 'cold', severity: 0.3, trendPerDay: 0.1, contagious: true });
      sicken(b, { kind: 'cold', severity: 0.3, trendPerDay: 0.1, contagious: true });
      run(a, 600, load, 600);
      run(b, 600, load, 1);
      for (const k of [
        'satiety',
        'hydration',
        'sleepPressure',
        'exertion',
        'fitness',
        'health',
        'sleepDebt',
        'pain',
      ] as const) {
        expect(Math.abs(a.body[k] - b.body[k]), `${load.mode}/${load.effort} ${k}`).toBeLessThan(0.01);
      }
      expect(a.body.injuries[0]?.severity).toBeCloseTo(b.body.injuries[0]?.severity ?? -1, 2);
      expect(a.body.illnesses[0]?.severity).toBeCloseTo(b.body.illnesses[0]?.severity ?? -1, 2);
    }
  });

  test('is deterministic and stays JSON-plain', () => {
    const a = person();
    const b = person();
    run(a, 2000, WORK, 37);
    run(b, 2000, WORK, 37);
    expect(JSON.stringify(a.body)).toBe(JSON.stringify(b.body));
    expect(JSON.parse(JSON.stringify(a.body))).toEqual(a.body);
  });

  test('hungry after ~9-10 h awake at rest (recalibrated 2026-10-03), effort speeds both', () => {
    // Measured on the recalibrated linear rates: hunger 0.7 at ~554 min, thirst 0.7 at ~596 min from a fresh body.
    // The pre-1.2.0 ordering (thirst before hunger at rest) was lost in the recalibration; see docs/findings.md.
    const p = person();
    const tHunger = nextBodyThreshold(p, REST, ADULT, { hunger: 0.7, thirst: 2, sleepiness: 2 }, 1440);
    const tThirst = nextBodyThreshold(p, REST, ADULT, { hunger: 2, thirst: 0.7, sleepiness: 2 }, 1440);
    expect(tHunger).toBeGreaterThan(8.5 * 60);
    expect(tHunger).toBeLessThan(10.5 * 60);
    expect(tThirst).toBeGreaterThan(9 * 60);
    expect(tThirst).toBeLessThan(11 * 60);
    const tWork = nextBodyThreshold(p, WORK, ADULT, { hunger: 0.7, thirst: 2, sleepiness: 2 }, 1440);
    expect(tWork).toBeLessThan(tHunger);
    const tWorkThirst = nextBodyThreshold(p, WORK, ADULT, { hunger: 2, thirst: 0.7, sleepiness: 2 }, 1440);
    expect(tWorkThirst).toBeLessThan(tThirst);
  });

  test('a host may pin a body’s depletion rates: doubled rates reach hunger in about half the time', () => {
    const slow = person();
    const fast = person(7 * 60, {
      rates: {
        satietyPerMinute: 2 * BODY_DEFAULTS.satietyPerMinute,
        hydrationPerMinute: 2 * BODY_DEFAULTS.hydrationPerMinute,
      },
    });
    const tSlow = nextBodyThreshold(slow, REST, ADULT, { hunger: 0.7, thirst: 2, sleepiness: 2 }, 1440);
    const tFast = nextBodyThreshold(fast, REST, ADULT, { hunger: 0.7, thirst: 2, sleepiness: 2 }, 1440);
    expect(tFast).toBeGreaterThan(tSlow * 0.45);
    expect(tFast).toBeLessThan(tSlow * 0.55);
    // Garbage entries are dropped at creation; an all-garbage block leaves no field behind.
    const junk = person(7 * 60, { rates: { satietyPerMinute: Number.NaN, hydrationPerMinute: -1 } });
    expect(junk.body.rates).toBeUndefined();
    const rate = nextBodyThreshold(junk, REST, ADULT, { hunger: 0.7, thirst: 2, sleepiness: 2 }, 1440);
    expect(rate).toBe(tSlow);
  });

  test('two-process sleep: pressure ~0.75 after 16 h awake, restored by 8 h sleep', () => {
    const p = person(7 * 60);
    run(p, 16 * 60, REST, 60);
    expect(p.body.sleepPressure).toBeGreaterThan(0.7);
    expect(p.body.sleepPressure).toBeLessThan(0.8);
    expect(p.body.sleepDebt).toBeLessThan(0.1);
    run(p, 8 * 60, SLEEP, 60);
    expect(p.body.sleepPressure).toBeLessThan(0.25);
    expect(p.body.asleep).toBe(true);
    expect(p.body.since).toBe(7 * 60 + 16 * 60);
  });

  test('sleepiness peaks overnight; circadian trough before dawn and mild post-lunch dip', () => {
    const peak = 960;
    expect(circadianAlertness(4 * 60, peak)).toBeLessThan(0.1);
    expect(circadianAlertness(16 * 60, peak)).toBeGreaterThan(0.95);
    expect(circadianAlertness(14 * 60, peak)).toBeLessThan(circadianAlertness(12 * 60 + 30, peak) + 0.05);
    const p = person(7 * 60);
    const morning = readBody(p).sleepiness;
    run(p, 20 * 60, REST, 30); // to 03:00
    expect(readBody(p).sleepiness).toBeGreaterThan(morning + 0.3);
    expect(readBody(p).sleepiness).toBeGreaterThan(0.8);
  });

  test('chronic short sleep builds debt that is under-perceived and impairs capacity', () => {
    const rested = person(7 * 60);
    const short = person(7 * 60);
    for (let d = 0; d < 7; d++) {
      sleepDay(rested, 8);
      sleepDay(short, 5);
    }
    expect(rested.body.sleepDebt).toBeLessThan(1);
    expect(short.body.sleepDebt).toBeGreaterThan(5);
    const r = readBody(short);
    expect(r.perceived.sleepiness).toBeLessThan(r.sleepiness);
    expect(r.capacity).toBeLessThan(readBody(rested).capacity);
    // Debt grows roughly linearly with days of restriction, not saturating after one night.
    const mid = person(7 * 60);
    for (let d = 0; d < 3; d++) sleepDay(mid, 5);
    expect(short.body.sleepDebt).toBeGreaterThan(mid.body.sleepDebt * 1.8);
    // Extra sleep repays slowly.
    const before = short.body.sleepDebt;
    sleepDay(short, 10);
    expect(short.body.sleepDebt).toBeLessThan(before);
    expect(short.body.sleepDebt).toBeGreaterThan(before - 4);
  });

  test('exertion rises with effort, less for the fit, and recovers faster asleep', () => {
    const unfit = person(7 * 60, { fitness: 0.1 });
    const fit = person(7 * 60, { fitness: 0.9 });
    run(unfit, 120, WORK);
    run(fit, 120, WORK);
    expect(fit.body.exertion).toBeLessThan(unfit.body.exertion);
    expect(unfit.body.exertion).toBeGreaterThan(0.5);
    const a = structuredClone(unfit);
    const b = structuredClone(unfit);
    run(a, 60, REST);
    run(b, 60, SLEEP);
    expect(b.body.exertion).toBeLessThan(a.body.exertion);
  });

  test('fitness trains with sustained effort, detrains with inactivity, capped by maxFitness', () => {
    const active = person();
    const idle = person();
    const hard: BodyLoad = { effort: 0.9, focus: 0.3, mode: 'awake' };
    for (let d = 0; d < 30; d++) {
      live(active, 60, hard);
      live(active, 1380, REST);
      live(idle, 1440, REST);
    }
    expect(active.body.fitness).toBeGreaterThan(0.55);
    expect(idle.body.fitness).toBeLessThan(0.5);
    const capped = person(0, { fitness: 0.9 });
    advanceBody(capped, 60, hard, modifiersForAge(80));
    expect(capped.body.fitness).toBeLessThanOrEqual(modifiersForAge(80).maxFitness);
  });

  test('injuries heal faster asleep; pain follows injuries and relief fades', () => {
    const awake = person();
    const asleep = person();
    injure(awake, { part: 'back', severity: 0.6, healRatePerDay: 0.2 });
    injure(asleep, { part: 'back', severity: 0.6, healRatePerDay: 0.2 });
    expect(readBody(awake).pain).toBeGreaterThan(0.5);
    run(awake, 480, REST);
    run(asleep, 480, SLEEP);
    expect(asleep.body.injuries[0]?.severity ?? 0).toBeLessThan(awake.body.injuries[0]?.severity ?? 1);
    const before = awake.body.pain;
    consume(awake, { relief: 0.4 });
    expect(awake.body.pain).toBeCloseTo(before - 0.4, 5);
    run(awake, 120, REST);
    expect(awake.body.pain).toBeGreaterThan(before - 0.15);
    const healed = person();
    const inj = injure(healed, { part: 'toe', severity: 0.1, healRatePerDay: 1 });
    expect(inj.id).toMatch(/^injury:/);
    run(healed, 1440, REST);
    expect(healed.body.injuries).toHaveLength(0);
  });

  test('illness course worsens then recovers; starvation slows recovery', () => {
    const fed = person();
    const starving = person(7 * 60, { satiety: 0, hydration: 0.9 });
    for (const q of [fed, starving])
      sicken(q, { kind: 'fever', severity: 0.3, trendPerDay: 0.2, contagious: false });
    run(fed, 720, REST);
    expect(fed.body.illnesses[0]?.severity ?? 0).toBeGreaterThan(0.3);
    for (let d = 0; d < 6; d++) sleepDay(fed, 8);
    expect(fed.body.illnesses.length === 0 || (fed.body.illnesses[0]?.severity ?? 0) < 0.15).toBe(true);
    run(starving, 720, REST);
    expect(starving.body.illnesses[0]?.severity ?? 0).toBeGreaterThan(fed.body.illnesses[0]?.severity ?? 0);
  });

  test('ids stay unique after healing removes an injury', () => {
    const p = person();
    injure(p, { part: 'a', severity: 0.001 + 1e-9, healRatePerDay: 10 });
    injure(p, { part: 'b', severity: 0.5, healRatePerDay: 0 });
    advanceBody(p, 15, REST, ADULT);
    const c = injure(p, { part: 'c', severity: 0.5, healRatePerDay: 0 });
    const ids = p.body.injuries.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain(c.id);
  });

  test('deprivation: dehydration kills faster than starvation; bounded values throughout', () => {
    const dry = person(0, { hydration: 0 });
    const hungry = person(0, { satiety: 0 });
    let dryDeath = -1;
    let hungryDeath = -1;
    for (let d = 1; d <= 40; d++) {
      live(dry, 1440, REST, 0.5, 0);
      live(hungry, 1440, REST, 0, 0.6);
      for (const q of [dry, hungry]) {
        for (const k of ['satiety', 'hydration', 'sleepPressure', 'exertion', 'pain', 'health'] as const) {
          expect(q.body[k]).toBeGreaterThanOrEqual(0);
          expect(q.body[k]).toBeLessThanOrEqual(1);
        }
      }
      if (!dry.body.alive && dryDeath < 0) dryDeath = d;
      if (!hungry.body.alive && hungryDeath < 0) hungryDeath = d;
    }
    expect(dryDeath).toBeGreaterThan(1);
    expect(dryDeath).toBeLessThan(6);
    expect(hungryDeath).toBeGreaterThan(dryDeath + 7);
    expect(readBody(dry).capacity).toBe(0);
  });

  test('nextBodyThreshold agrees with stepping, ignores already-crossed needs, does not mutate', () => {
    const p = person(7 * 60);
    const snapshot = JSON.stringify(p.body);
    const t = nextBodyThreshold(p, WORK, ADULT);
    expect(JSON.stringify(p.body)).toBe(snapshot);
    expect(Number.isFinite(t)).toBe(true);
    const q = structuredClone(p);
    run(q, t - 1, WORK, 1);
    const pre = readBody(q).perceived;
    run(q, 1, WORK, 1);
    const post = readBody(q).perceived;
    const hit = (r: typeof pre) => r.hunger >= 0.7 || r.thirst >= 0.7 || r.sleepiness >= 0.85;
    expect(hit(pre)).toBe(false);
    expect(hit(post)).toBe(true);
    const hungry = person(7 * 60, { satiety: 0.1 });
    expect(nextBodyThreshold(hungry, REST, ADULT)).toBeGreaterThan(0);
    expect(nextBodyThreshold(person(), REST, ADULT, undefined, 10)).toBe(Number.POSITIVE_INFINITY);
  });

  test('headless control: sub-stepped integration beats naive Euler on one long step', () => {
    // Naive alternative: S += dt * (1 - S) / tau once over 16 h overshoots badly.
    const p = person(7 * 60);
    const dt = 16 * 60;
    advanceBody(p, dt, REST, ADULT);
    const naive = Math.min(1, 0.2 + (dt * (1 - 0.2)) / 825);
    const exact = 1 - 0.8 * Math.exp(-dt / 825);
    expect(Math.abs(p.body.sleepPressure - exact)).toBeLessThan(1e-9);
    expect(Math.abs(naive - exact)).toBeGreaterThan(0.2);
  });
});
