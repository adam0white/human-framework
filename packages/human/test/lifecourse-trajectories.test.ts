import { describe, expect, test } from 'vitest';
import {
  begin,
  CHRONIC_CONDITIONS,
  chronicHazard,
  chronicOnsets,
  chronicRiskPerYear,
  closeDay,
  consume,
  createChild,
  createPerson,
  createRng,
  decide,
  developmentForAge,
  finish,
  learningMultiplier,
  lifeModifiers,
  lifeStage,
  modifiersForAge,
  mortalityEvent,
  mortalityHazard,
  narrateChronicle,
  noteOutcome,
  openDay,
  random,
  sicken,
  tick,
} from '../src/index.ts';
import type { Affordance, Person } from '../src/types.ts';
import { MINUTES_PER_DAY, MINUTES_PER_YEAR } from '../src/types.ts';

const H = 60;

function adult(age: number, seed = 3, traits: Person['traits'] | undefined = undefined): Person {
  const now = 6 * H;
  return createPerson({
    id: `p${seed}`,
    name: 'Ada',
    seed,
    now,
    bornAt: now - age * MINUTES_PER_YEAR,
    sex: 'female',
    ...(traits ? { traits } : {}),
  });
}

describe('development trajectories', () => {
  test('adolescence: sensation seeking peaks in the late teens while maturity is still rising', () => {
    const at = (a: number) => developmentForAge(a);
    expect(at(17).sensationSeeking).toBeGreaterThan(at(10).sensationSeeking);
    expect(at(17).sensationSeeking).toBeGreaterThan(at(30).sensationSeeking);
    expect(at(17).sensationSeeking).toBeGreaterThan(1.25);
    expect(modifiersForAge(17).maturity).toBeLessThan(modifiersForAge(25).maturity);
    expect(at(8).adolescence).toBe(0);
    expect(at(15).adolescence).toBe(1);
    expect(at(25).adolescence).toBe(0);
  });

  test('asynchronous peaks: speed falls after the twenties while knowledge keeps rising', () => {
    const at = (a: number) => developmentForAge(a);
    expect(at(22).processingSpeed).toBe(1);
    expect(at(70).processingSpeed).toBeLessThan(at(30).processingSpeed);
    expect(at(60).crystallized).toBeGreaterThan(at(25).crystallized);
    expect(at(50).elderDecline).toBe(0);
    expect(at(80).elderDecline).toBeGreaterThan(at(70).elderDecline);
    for (let a = 0; a <= 100; a += 5) {
      const d = at(a);
      for (const v of [
        d.sensationSeeking,
        d.processingSpeed,
        d.crystallized,
        d.adolescence,
        d.elderDecline,
      ]) {
        expect(Number.isFinite(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test('learning multipliers by domain: language plateaus to ~17 then declines; general matches LifeModifiers', () => {
    expect(learningMultiplier(10, 'language')).toBe(learningMultiplier(16, 'language'));
    expect(learningMultiplier(30, 'language')).toBeLessThan(learningMultiplier(16, 'language'));
    expect(learningMultiplier(6, 'motor')).toBeGreaterThan(learningMultiplier(50, 'motor'));
    expect(learningMultiplier(40, 'knowledge')).toBe(1);
    expect(learningMultiplier(40)).toBe(modifiersForAge(40).learning);
  });
});

describe('health trajectory and mortality', () => {
  test('chronic hazard rises with age and with exposures; combined risk stays a probability', () => {
    const htn = CHRONIC_CONDITIONS[0];
    if (!htn) throw new Error('catalogue');
    expect(chronicHazard(60, htn)).toBeGreaterThan(chronicHazard(40, htn));
    expect(chronicHazard(40, htn, { smoking: 1 })).toBeCloseTo(2 * chronicHazard(40, htn), 9);
    expect(chronicHazard(40, htn, { fitness: 0.9 })).toBeLessThan(chronicHazard(40, htn));
    for (const age of [0, 30, 60, 90, 150]) {
      const r = chronicRiskPerYear(age, { smoking: 1, sleepDebtHours: 30 });
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThanOrEqual(1);
    }
    for (const c of CHRONIC_CONDITIONS) expect(c.sources[0]?.kind).toBe('assumption');
  });

  test('chronic onsets are deterministic in the rng given and skip held conditions', () => {
    const p = adult(70);
    const roll = (seed: number) => chronicOnsets(p, 10 * MINUTES_PER_YEAR, createRng(seed));
    expect(roll(1)).toEqual(roll(1));
    const onsetSeeds = [1, 2, 3, 4, 5, 6, 7, 8].filter((s) => roll(s).length > 0);
    expect(onsetSeeds.length).toBeGreaterThan(0);
    for (const ill of roll(onsetSeeds[0] ?? 1)) sicken(p, ill);
    const held = new Set(p.body.illnesses.map((i) => i.kind));
    for (const s of [11, 12, 13, 14]) for (const ill of roll(s)) expect(held.has(ill.kind)).toBe(false);
  });

  test('mortality: Gompertz hazard raised by poor health; ~7% die between 20 and 60 under age alone', () => {
    const young = adult(30);
    const old = adult(80);
    expect(mortalityHazard(old).hazardPerYear).toBeGreaterThan(10 * mortalityHazard(young).hazardPerYear);
    const sick = adult(80);
    sick.body.health = 0.3;
    expect(mortalityHazard(sick).hazardPerYear).toBeGreaterThan(mortalityHazard(old).hazardPerYear);
    expect(mortalityEvent(sick, MINUTES_PER_YEAR, createRng(1)).cause).toBe('illness');
    expect(mortalityEvent(old, MINUTES_PER_YEAR, createRng(1)).cause).toBe('age');
    // Monte Carlo against the analytic ∫ h = 0.0005·8/ln2·(2^3.75 − 2^−1.25) ≈ 0.075 (P ≈ 7.2%).
    const rng = createRng(42);
    let died = 0;
    const N = 2000;
    for (let i = 0; i < N; i++) {
      for (let a = 20; a < 60; a++) {
        const p = adult(a + 0.5);
        if (mortalityEvent(p, MINUTES_PER_YEAR, rng).died) {
          died++;
          break;
        }
      }
    }
    expect(died / N).toBeGreaterThan(0.045);
    expect(died / N).toBeLessThan(0.1);
  });
});

describe('createChild', () => {
  test('traits regress toward the mean from the midparent value, with wide noise', () => {
    const high = {
      honesty: 0.9,
      emotionality: 0.9,
      extraversion: 0.9,
      agreeableness: 0.9,
      conscientiousness: 0.9,
      openness: 0.9,
    };
    const low = {
      honesty: 0.1,
      emotionality: 0.1,
      extraversion: 0.1,
      agreeableness: 0.1,
      conscientiousness: 0.1,
      openness: 0.1,
    };
    const a = adult(30, 1, high);
    const b = adult(32, 2, high);
    const c = adult(30, 3, low);
    const d = adult(32, 4, low);
    const kids = (x: Person, y: Person, from: number) =>
      Array.from(
        { length: 400 },
        (_, i) =>
          createChild(x, y, { id: `k${i}`, name: 'K', seed: from + i }).spec.traits?.extraversion ?? 0.5,
      );
    const hi = kids(a, b, 1000);
    const lo = kids(c, d, 5000);
    const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
    const sd = (xs: number[]) => Math.sqrt(mean(xs.map((x) => (x - mean(xs)) ** 2)));
    // Expected mean 0.5 + 0.3 × 0.4 = 0.62: above the population mean, well below the parents.
    expect(mean(hi)).toBeGreaterThan(0.59);
    expect(mean(hi)).toBeLessThan(0.65);
    expect(mean(lo)).toBeGreaterThan(0.35);
    expect(mean(lo)).toBeLessThan(0.41);
    expect(sd(hi)).toBeGreaterThan(0.12);
    // Not a destiny: a fair share of children of high parents score below the population mean.
    expect(hi.filter((x) => x < 0.5).length / hi.length).toBeGreaterThan(0.15);
    for (const x of [...hi, ...lo]) {
      expect(x).toBeGreaterThanOrEqual(0.02);
      expect(x).toBeLessThanOrEqual(0.98);
    }
  });

  test('a child spec is deterministic, starts with no norms, links both parents and creates an infant', () => {
    const a = adult(30, 1);
    const b = adult(31, 2);
    a.conscience.norms = [{ normId: 'salah', standing: 'obligatory', conviction: 0.9 }];
    b.conscience.norms = [];
    const one = createChild(a, b, { id: 'deniz', name: 'Deniz', seed: 9 });
    expect(createChild(a, b, { id: 'deniz', name: 'Deniz', seed: 9 })).toEqual(one);
    expect(one.spec.norms).toEqual([]);
    expect(one.spec.relationships?.map((r) => r.otherId)).toEqual([a.id, b.id]);
    expect(one.parentLinks.map((l) => l.relationship.roles)).toEqual([['child'], ['child']]);
    const exposed = createChild(a, b, { id: 'deniz', name: 'Deniz', seed: 9, normExposure: 0.5 });
    expect(exposed.spec.norms).toEqual([{ normId: 'salah', standing: 'obligatory', conviction: 0.225 }]);
    const child = createPerson(one.spec);
    expect(lifeStage(child)).toBe('infant');
    expect(child.conscience.norms).toEqual([]);
    expect(child.values.tradition).toBe(0.5);
  });
});

describe('aging over forty years (coarse steps)', () => {
  const eat: Affordance = {
    id: 'eat',
    action: 'eat',
    label: 'eat',
    duration: 30,
    effort: 0.1,
    advertises: { food: 0.6, water: 0.3 },
  };
  const work: Affordance = {
    id: 'work',
    action: 'work',
    label: 'work',
    duration: 4 * H,
    effort: 0.4,
    advertises: { competence: 0.2 },
    material: 5,
  };
  const sleep: Affordance = {
    id: 'sleep',
    action: 'sleep',
    label: 'sleep',
    duration: 8 * H,
    effort: 0,
    mode: 'sleep',
    advertises: { sleep: 1 },
  };
  const drink: Affordance = {
    id: 'drink',
    action: 'drink',
    label: 'drink',
    duration: 10,
    effort: 0,
    advertises: { water: 0.6 },
  };
  const rest: Affordance = {
    id: 'rest',
    action: 'rest',
    label: 'rest',
    duration: 60,
    effort: 0,
    advertises: { rest: 0.4 },
  };

  /** Host fast-forward: jump the clock (the composite has no skip; see the integration notes). */
  function fastForward(p: Person, to: number): void {
    p.now = to;
    p.affect.lastUpdated = to;
  }

  /** One ordinary day through the real decision loop, with the chronicle hooks. */
  function liveDay(p: Person): void {
    const end = p.now + MINUTES_PER_DAY;
    while (p.now < end && p.body.alive) {
      const offers = [drink, eat, work, sleep, rest];
      const r = decide(p, offers);
      const aff = offers.find((x) => x.id === r.chosenAffordanceId) ?? rest;
      begin(p, aff, r);
      tick(p, Math.min(end, p.now + aff.duration));
      const outcome = {
        affordanceId: aff.id,
        action: aff.action,
        status: 'completed' as const,
        at: p.now,
        ...(aff.material !== undefined ? { material: aff.material } : {}),
        // The world's effect goes through the outcome, so learned expectations see what eating actually did.
        ...(aff.id === 'eat' ? { needs: { food: 0.6, water: 0.3 } } : {}),
        ...(aff.id === 'drink' ? { needs: { water: 0.6 } } : {}),
      };
      const report = finish(p, outcome);
      noteOutcome(p, outcome, { kept: report?.kept ?? [] });
    }
  }

  test('one person stepped 20 → 60 stays bounded and plausible', () => {
    const p = adult(20, 77);
    const hostRng = createRng(2026);
    openDay(p);
    const hazards: number[] = [];
    const caps: number[] = [];
    let onsets = 0;
    for (let year = 0; year < 40; year++) {
      liveDay(p);
      closeDay(p);
      // Rest of the year in one coarse jump, with opt-in health trajectory and a mortality roll (recorded only).
      const dt = MINUTES_PER_YEAR - MINUTES_PER_DAY;
      for (const ill of chronicOnsets(p, dt, hostRng)) {
        sicken(p, ill);
        onsets++;
      }
      const roll = mortalityEvent(p, dt, hostRng);
      hazards.push(roll.hazardPerYear);
      // Illness and lost health only ever raise the age-only hazard.
      expect(roll.hazardPerYear).toBeGreaterThanOrEqual(lifeModifiers(p).mortalityPerYear);
      fastForward(p, p.now + dt);
      consume(p, { food: 0.8, water: 0.8 }); // the year was lived: he starts the next sampled day after breakfast
      openDay(p);
      const mods = lifeModifiers(p);
      caps.push(mods.maxFitness);
      const b = p.body;
      expect(
        b.alive,
        `year ${year}: ${JSON.stringify(b)} ${JSON.stringify(p.trace.slice(-3).map((r) => r.chosenAction))}`,
      ).toBe(true);
      expect(b.fitness).toBeLessThanOrEqual(mods.maxFitness + 1e-9);
      for (const v of [b.satiety, b.hydration, b.sleepPressure, b.exertion, b.pain, b.health, b.fitness]) {
        expect(Number.isFinite(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
      expect(Number.isFinite(p.affect.mood.valence)).toBe(true);
    }
    expect(Math.round((p.now - p.life.bornAt) / MINUTES_PER_YEAR)).toBe(60);
    expect(lifeStage(p)).toBe('adult');
    // Fitness ceiling falls after 35; the hazard at 59 is far above the hazard at 20.
    expect(caps[caps.length - 1]).toBeLessThan(caps[15] ?? 1);
    expect(hazards[hazards.length - 1]).toBeGreaterThan(5 * (hazards[0] ?? 1));
    expect(hazards[hazards.length - 1]).toBeLessThan(0.05);
    // Chronic onsets are possible but bounded by the catalogue per held condition.
    expect(onsets).toBeLessThan(12);
    // Bounded collections and a bounded save.
    expect(p.memory.episodes.length).toBeLessThanOrEqual(200);
    expect(p.habits.length).toBeLessThanOrEqual(40);
    expect(p.trace.length).toBeLessThanOrEqual(32);
    // Each sampled day runs 06:00 to 06:00, so it closes two calendar days: 80 records, inside the 120 bound.
    expect(p.chronicle?.length).toBe(80);
    expect(JSON.stringify(p).length).toBeLessThan(1_000_000);
    expect(narrateChronicle(p.chronicle ?? [], { person: p }).length).toBeGreaterThan(0);
    expect(random(hostRng)).toBeGreaterThanOrEqual(0);
  });
});
