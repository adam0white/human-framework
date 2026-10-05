import { describe, expect, test } from 'vitest';
import { createRng } from '../src/core/index.ts';
import {
  advanceNeeds,
  createNeeds,
  meanSatisfaction,
  type NeedsContext,
  needThreshold,
  readNeeds,
  satisfy,
  urgency,
} from '../src/needs/index.ts';
import type { BodyReadout, NeedReading, NeedReservoirs, Person } from '../src/types.ts';
import { PHYSIOLOGICAL_NEEDS, PSYCHOLOGICAL_NEEDS } from '../src/types.ts';
import { fullPerson } from './support.ts';

function body(perceived: Partial<BodyReadout['perceived']> = {}): BodyReadout {
  const pr = { hunger: 0, thirst: 0, sleepiness: 0, fatigue: 0, pain: 0, ...perceived };
  return { ...pr, capacity: 1, alertness: 1, perceived: pr };
}

const alone: NeedsContext = { withOthers: false, activityTags: [], asleep: false };

describe('needs/urgency', () => {
  test('is 1 at empty, ~0 well above threshold, monotone and convex below threshold', () => {
    expect(urgency(0)).toBeCloseTo(1);
    expect(urgency(0.9)).toBeLessThan(0.02);
    expect(urgency(1)).toBe(0);
    let prev = 1;
    for (let l = 0; l <= 1.0001; l += 0.05) {
      const u = urgency(l);
      expect(u).toBeLessThanOrEqual(prev + 1e-12);
      expect(u).toBeGreaterThanOrEqual(0);
      prev = u;
    }
    // Convex: the second half of the deficit adds more than the first half.
    expect(urgency(0) - urgency(0.25)).toBeGreaterThan(urgency(0.25) - urgency(0.5));
  });
  test('higher threshold means more urgency at the same level', () => {
    expect(urgency(0.4, 0.6)).toBeGreaterThan(urgency(0.4, 0.4));
  });
});

describe('needs/readNeeds', () => {
  test('stable order and physiological mapping from perceived body', () => {
    const p = fullPerson();
    const r = readNeeds(p, body({ hunger: 0.7, pain: 0.2 }));
    expect(r.map((x) => x.id)).toEqual([...PHYSIOLOGICAL_NEEDS, ...PSYCHOLOGICAL_NEEDS]);
    expect(r[0]?.level).toBeCloseTo(0.3);
    expect(r.find((x) => x.id === 'relief')?.level).toBeCloseTo(0.8);
  });
  test('reads perceived, not true, body values', () => {
    const p = fullPerson();
    const b = body({ sleepiness: 0.2 });
    b.sleepiness = 0.9;
    expect(readNeeds(p, b).find((x) => x.id === 'sleep')?.level).toBeCloseTo(0.8);
  });
  test('rest does not double-count sleepiness', () => {
    const p = fullPerson();
    const sleepyOnly = readNeeds(p, body({ sleepiness: 0.8, fatigue: 0.4 }));
    const exerted = readNeeds(p, body({ sleepiness: 0, fatigue: 0.8 }));
    const rest = (r: NeedReading[]) => r.find((x) => x.id === 'rest')?.level ?? 0;
    expect(rest(sleepyOnly)).toBeCloseTo(1);
    expect(rest(exerted)).toBeCloseTo(0.2);
  });
  test('traits raise thresholds as coefficients', () => {
    const intro = fullPerson({ traits: { extraversion: 0.1 } });
    const extro = fullPerson({ traits: { extraversion: 0.9 }, needs: {} });
    intro.needs.belonging = 0.35;
    extro.needs.belonging = 0.35;
    const u = (p: Person) => readNeeds(p, body()).find((x) => x.id === 'belonging')?.urgency ?? 0;
    expect(u(extro)).toBeGreaterThan(u(intro));
    expect(needThreshold(fullPerson({ traits: { emotionality: 0.9 } }), 'safety')).toBeGreaterThan(
      needThreshold(fullPerson(), 'safety'),
    );
    expect(needThreshold(fullPerson({ values: { tradition: 0.9 } }), 'meaning')).toBeGreaterThan(
      needThreshold(fullPerson(), 'meaning'),
    );
    expect(needThreshold(fullPerson({ traits: { openness: 0.9 } }), 'leisure')).toBeGreaterThan(
      needThreshold(fullPerson(), 'leisure'),
    );
    expect(needThreshold(fullPerson({ traits: { conscientiousness: 0.9 } }), 'competence')).toBeGreaterThan(
      needThreshold(fullPerson(), 'competence'),
    );
  });
});

describe('needs/advanceNeeds', () => {
  test('belonging falls alone (faster for extraverts) and recovers with others', () => {
    const intro = fullPerson({ traits: { extraversion: 0.1 } });
    const extro = fullPerson({ traits: { extraversion: 0.9 } });
    advanceNeeds(intro, 12 * 60, alone);
    advanceNeeds(extro, 12 * 60, alone);
    expect(intro.needs.belonging).toBeLessThan(0.7);
    expect(extro.needs.belonging).toBeLessThan(intro.needs.belonging);
    const before = extro.needs.belonging;
    advanceNeeds(extro, 120, { withOthers: true, activityTags: ['chat'], asleep: false });
    expect(extro.needs.belonging).toBeGreaterThan(before + 0.2);
  });
  test('a full day alone brings an average person near the belonging threshold', () => {
    const p = fullPerson();
    advanceNeeds(p, 24 * 60, alone);
    expect(p.needs.belonging).toBeGreaterThan(0.3);
    expect(p.needs.belonging).toBeLessThan(0.55);
  });
  test('work drains leisure, leisure restores it, worship restores meaning', () => {
    const p = fullPerson();
    advanceNeeds(p, 8 * 60, { withOthers: false, activityTags: ['work'], asleep: false });
    expect(p.needs.leisure).toBeLessThan(0.4);
    advanceNeeds(p, 90, { withOthers: false, activityTags: ['leisure'], asleep: false });
    expect(p.needs.leisure).toBeGreaterThan(0.6);
    p.needs.meaning = 0.3;
    advanceNeeds(p, 30, { withOthers: false, activityTags: ['worship'], asleep: false });
    expect(p.needs.meaning).toBeGreaterThan(0.4);
  });
  test('drifts toward set points', () => {
    const p = fullPerson({ needs: { autonomy: 0.1, safety: 0.2, competence: 0.9, esteem: 0.1 } });
    advanceNeeds(p, 10 * 24 * 60, { withOthers: true, activityTags: [], asleep: false });
    expect(p.needs.autonomy).toBeCloseTo(0.7, 2);
    expect(p.needs.safety).toBeCloseTo(0.8, 2);
    expect(p.needs.competence).toBeCloseTo(0.5, 1);
    expect(p.needs.esteem).toBeCloseTo(0.5, 1);
  });
  test('little changes while asleep', () => {
    const awake = fullPerson();
    const asleep = fullPerson();
    advanceNeeds(awake, 480, alone);
    advanceNeeds(asleep, 480, { ...alone, asleep: true });
    expect(0.7 - asleep.needs.belonging).toBeLessThan(0.25 * (0.7 - awake.needs.belonging));
  });
  test('closed form: 1 x 600 min equals 600 x 1 min', () => {
    const a = fullPerson({ needs: { autonomy: 0.2, meaning: 0.9 } });
    const b = fullPerson({ needs: { autonomy: 0.2, meaning: 0.9 } });
    const ctx: NeedsContext = { withOthers: false, activityTags: ['work'], asleep: false };
    advanceNeeds(a, 600, ctx);
    for (let i = 0; i < 600; i++) advanceNeeds(b, 1, ctx);
    for (const id of PSYCHOLOGICAL_NEEDS) expect(a.needs[id]).toBeCloseTo(b.needs[id], 9);
  });
  test('deterministic and bounded', () => {
    const a = fullPerson();
    const b = fullPerson();
    for (const p of [a, b]) {
      advanceNeeds(p, 1e7, alone);
      satisfy(p, { belonging: 5, meaning: -5, leisure: Number.NaN });
    }
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    for (const id of PSYCHOLOGICAL_NEEDS) {
      expect(a.needs[id]).toBeGreaterThanOrEqual(0);
      expect(a.needs[id]).toBeLessThanOrEqual(1);
    }
    expect(a.needs.belonging).toBe(1);
    expect(a.needs.meaning).toBe(0);
    expect(a.rng).toEqual(createRng(1));
  });
});

describe('needs/createNeeds and meanSatisfaction', () => {
  test('createNeeds clamps overrides', () => {
    const n: NeedReservoirs = createNeeds({ safety: 2 });
    expect(n.safety).toBe(1);
  });
  test('well-satisfied person reads as plain mean; empty reads as 1', () => {
    const r: NeedReading[] = [
      { id: 'food', level: 0.9, urgency: 0 },
      { id: 'water', level: 0.7, urgency: 0 },
    ];
    expect(meanSatisfaction(r)).toBeCloseTo(0.8);
    expect(meanSatisfaction([])).toBe(1);
  });
  test('headless control: one near-empty need dominates, unlike a plain linear mean', () => {
    const p = fullPerson({
      needs: {
        safety: 0.9,
        belonging: 0.9,
        esteem: 0.9,
        autonomy: 0.9,
        competence: 0.9,
        leisure: 0.9,
        meaning: 0.9,
      },
    });
    const r = readNeeds(p, body({ thirst: 0.95 }));
    const plain = r.reduce((s, x) => s + x.level, 0) / r.length;
    const weighted = meanSatisfaction(r);
    expect(plain).toBeGreaterThan(0.85);
    expect(weighted).toBeLessThan(plain - 0.25);
    // Control: linear urgency (1 - level) gives a much weaker pull for the same thirst.
    const linear = r.map((x) => ({ ...x, urgency: 1 - x.level }));
    expect(meanSatisfaction(linear)).toBeGreaterThan(weighted);
  });
});
