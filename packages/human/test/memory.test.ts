import { describe, expect, test } from 'vitest';
import { createRng } from '../src/core/index.ts';
import {
  advanceMemory,
  createMemory,
  expectationKey,
  expectedEffect,
  learnOutcome,
  MEMORY_DEFAULTS,
  recall,
  remember,
} from '../src/memory/index.ts';
import type { Affordance, Outcome, Person } from '../src/types.ts';
import { MINUTES_PER_DAY } from '../src/types.ts';

function person(): Person {
  return {
    id: 'p1',
    now: 0,
    rng: createRng(1),
    memory: createMemory(),
    social: { relationships: [] },
  } as unknown as Person;
}

const eat: Affordance = {
  id: 'a1',
  action: 'eat',
  label: 'Eat',
  targetId: 'stew',
  duration: 30,
  effort: 0.1,
  advertises: { food: 0.6 },
};
const done = (status: Outcome['status'] = 'completed'): Outcome => ({
  affordanceId: 'a1',
  action: 'eat',
  targetId: 'stew',
  status,
  at: 0,
});

describe('memory/episodes', () => {
  test('ids, default salience rises with |valence|, bounded with weakest evicted', () => {
    const p = person();
    const calm = remember(p, { at: 0, kind: 'outcome', valence: 0, summary: '', tags: [] });
    const vivid = remember(p, { at: 0, kind: 'outcome', valence: -0.9, summary: '', tags: [] });
    expect(calm.id).toBe('e0');
    expect(vivid.id).toBe('e1');
    expect(vivid.salience).toBeGreaterThan(calm.salience);
    for (let i = 0; i < 250; i++) {
      p.now = i;
      remember(p, { at: i, kind: 'told', valence: 0, salience: 0.1, summary: '', tags: [] });
    }
    expect(p.memory.episodes.length).toBe(MEMORY_DEFAULTS.maxEpisodes);
    expect(p.memory.episodes.some((e) => e.id === 'e1')).toBe(true);
  });

  test('decay is closed form and slower for emotional episodes', () => {
    const a = person();
    const b = person();
    for (const p of [a, b]) {
      remember(p, { at: 0, kind: 'outcome', valence: 0, salience: 0.8, summary: '', tags: [] });
      remember(p, { at: 0, kind: 'outcome', valence: 1, salience: 0.8, summary: '', tags: [] });
    }
    advanceMemory(a, 600);
    for (let i = 0; i < 600; i++) advanceMemory(b, 1);
    for (let i = 0; i < 2; i++) {
      expect(a.memory.episodes[i]?.salience).toBeCloseTo(b.memory.episodes[i]?.salience ?? 0, 9);
    }
    advanceMemory(a, 3 * MINUTES_PER_DAY);
    const [neutral, strong] = a.memory.episodes;
    expect(strong?.salience ?? 0).toBeGreaterThan((neutral?.salience ?? 0) * 1.5);
  });

  test('recall ranks by match × salience × recency, deterministic, boosts salience', () => {
    const p = person();
    remember(p, {
      at: 0,
      kind: 'social',
      action: 'talk',
      actorId: 'p2',
      valence: 0.2,
      salience: 0.5,
      summary: '',
      tags: ['market'],
    });
    remember(p, {
      at: 0,
      kind: 'social',
      action: 'talk',
      actorId: 'p3',
      valence: 0.2,
      salience: 0.5,
      summary: '',
      tags: [],
    });
    remember(p, { at: 0, kind: 'outcome', action: 'farm', valence: 0, salience: 0.9, summary: '', tags: [] });
    p.now = 10;
    const hits = recall(p, { action: 'talk', actorId: 'p2' });
    expect(hits[0]?.id).toBe('e0');
    expect(hits.map((e) => e.id)).not.toContain('e2');
    expect(hits[0]?.salience).toBeGreaterThan(0.5);
    // Equal scores break by id (older first).
    const q = person();
    remember(q, { at: 0, kind: 'x', action: 'talk', valence: 0, salience: 0.5, summary: '', tags: [] });
    remember(q, { at: 0, kind: 'x', action: 'talk', valence: 0, salience: 0.5, summary: '', tags: [] });
    expect(recall(q, { action: 'talk', limit: 1 })[0]?.id).toBe('e0');
  });
});

describe('memory/expectations', () => {
  test('converge toward realized outcomes with clamped steps', () => {
    const p = person();
    learnOutcome(p, eat, done(), { food: 0.1 }, -0.5);
    const first = p.memory.expectations.find((x) => x.key === 'eat@stew');
    expect(first?.needs.food).toBeCloseTo(0.6 - MEMORY_DEFAULTS.maxStep, 9);
    expect(p.memory.expectations.map((x) => x.key).sort()).toEqual(['eat', 'eat@stew']);
    for (let i = 0; i < 40; i++) learnOutcome(p, eat, done(), { food: 0.1 }, -0.5);
    const x = p.memory.expectations.find((e) => e.key === 'eat@stew');
    expect(x?.needs.food).toBeCloseTo(0.1, 2);
    expect(x?.samples).toBe(41);
    const eff = expectedEffect(p, eat);
    expect(eff.confidence).toBeCloseTo(41 / 44, 9);
    expect(eff.needs.food ?? 1).toBeLessThan(0.15);
    expect(eff.valence).toBeLessThan(-0.4);
  });

  test('success rate tracks failures; interrupted outcomes are ignored', () => {
    const p = person();
    learnOutcome(p, eat, done('interrupted'), { food: 0.05 }, 0);
    expect(p.memory.expectations).toHaveLength(0);
    for (let i = 0; i < 20; i++) learnOutcome(p, eat, done('failed'), {}, -0.3);
    expect(expectedEffect(p, eat).successRate).toBeLessThan(0.2);
  });

  test('falls back from action@target to action, then to advertisement', () => {
    const p = person();
    expect(expectedEffect(p, eat)).toMatchObject({ samples: 0, confidence: 0, needs: { food: 0.6 } });
    learnOutcome(p, eat, done(), { food: 0.2 }, 0);
    const other = { ...eat, targetId: 'bread' };
    expect(expectationKey(other)).toBe('eat@bread');
    expect(expectedEffect(p, other).samples).toBe(1);
  });

  test('expectedEffect cites salient emotional episodes without mutating memory', () => {
    const p = person();
    remember(p, {
      at: 0,
      kind: 'outcome',
      action: 'eat',
      targetId: 'stew',
      valence: -0.8,
      summary: 'sick',
      tags: [],
    });
    remember(p, {
      at: 0,
      kind: 'outcome',
      action: 'eat',
      targetId: 'stew',
      valence: 0.1,
      summary: 'fine',
      tags: [],
    });
    remember(p, {
      at: 0,
      kind: 'outcome',
      action: 'eat',
      targetId: 'bread',
      valence: 0.9,
      summary: 'great',
      tags: [],
    });
    const before = JSON.stringify(p.memory);
    expect(expectedEffect(p, eat).recalled).toEqual(['e0']);
    expect(JSON.stringify(p.memory)).toBe(before);
  });

  test('expectation bound evicts least-sampled, never the one just learned', () => {
    const p = person();
    for (let i = 0; i < 200; i++) {
      learnOutcome(p, { ...eat, action: `act${i}`, targetId: undefined }, done(), {}, 0);
    }
    expect(p.memory.expectations.length).toBe(MEMORY_DEFAULTS.maxExpectations);
    expect(p.memory.expectations.some((x) => x.key === 'act199')).toBe(true);
  });

  test('headless control: learner beats advertisement-only predictor on a lying advert', () => {
    const p = person();
    const realized = 0.15;
    for (let i = 0; i < 10; i++) learnOutcome(p, eat, done(), { food: realized }, 0);
    const learnedErr = Math.abs((expectedEffect(p, eat).needs.food ?? 0) - realized);
    const advertErr = Math.abs(0.6 - realized);
    expect(learnedErr).toBeLessThan(advertErr * 0.4);
  });
});

describe('loss eviction protection is bounded (review 2026-10-03)', () => {
  test('daily grave visits cannot crowd every ordinary episode out', () => {
    const p = person();
    for (let i = 0; i < MEMORY_DEFAULTS.maxEpisodes + 20; i++) {
      p.now = i * 60;
      remember(p, {
        at: p.now,
        kind: 'outcome',
        action: 'visit-grave',
        valence: -0.3,
        summary: 'grave',
        tags: ['grave'],
      });
    }
    p.now += 60;
    const fresh = remember(p, {
      at: p.now,
      kind: 'outcome',
      action: 'eat',
      valence: 0.2,
      summary: 'ate',
      tags: ['completed'],
    });
    expect(p.memory.episodes.some((e) => e.id === fresh.id)).toBe(true);
    expect(p.memory.episodes.length).toBe(MEMORY_DEFAULTS.maxEpisodes);
  });
});
