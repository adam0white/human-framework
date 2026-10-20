import { describe, expect, test } from 'vitest';
import {
  BELIEF_DEFAULTS,
  believe,
  confirm,
  createPerson,
  credence,
  perceive,
  seedBelief,
  seedSourceTrust,
  trustOf,
} from '../src/index.ts';

function person() {
  return createPerson({ id: 'me', name: 'Me', seed: 5, bornAt: -10000, sex: 'female', now: 90 });
}

describe('authored source trust', () => {
  test('clamps, replaces, and changes only the source trust store', () => {
    const p = person();
    const before = structuredClone(p);
    expect(seedSourceTrust(p, 'speaker', 2)).toBe(1);
    expect(trustOf(p, 'speaker')).toBe(1);
    expect(seedSourceTrust(p, 'speaker', -2)).toBe(0);
    seedSourceTrust(p, 'speaker', 0.8);
    before.memory.sourceTrust.speaker = 0.8;
    expect(p).toEqual(before);
  });

  test('rejects nonfinite trust and self ids before mutation', () => {
    const p = person();
    const before = structuredClone(p);
    for (const trust of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])
      expect(() => seedSourceTrust(p, 'speaker', trust)).toThrow(/finite/);
    for (const id of ['self', p.id]) expect(() => seedSourceTrust(p, id, 0.5)).toThrow(/self/);
    expect(p).toEqual(before);
    expect(trustOf(p, 'self')).toBe(BELIEF_DEFAULTS.selfTrust);
    expect(trustOf(p, p.id)).toBe(BELIEF_DEFAULTS.selfTrust);
  });

  test('supports a source id named __proto__ without changing the record prototype', () => {
    const p = person();
    const prototype = Object.getPrototypeOf(p.memory.sourceTrust);
    seedSourceTrust(p, '__proto__', 0.8);
    expect(trustOf(p, '__proto__')).toBe(0.8);
    expect(Object.hasOwn(p.memory.sourceTrust, '__proto__')).toBe(true);
    expect(Object.getPrototypeOf(p.memory.sourceTrust)).toBe(prototype);
  });

  test('perceive testimony reads source trust independently of the other trust stores', () => {
    const low = person();
    const high = person();
    seedSourceTrust(low, 'speaker', 0);
    seedSourceTrust(high, 'speaker', 1);
    for (const p of [low, high])
      perceive(p, [
        {
          at: p.now,
          channel: 'told',
          kind: 'fact',
          salience: 1,
          summary: 'The door is open',
          actorId: 'speaker',
          claims: [{ prop: 'door:open', value: true, confidence: 0.9 }],
        },
      ]);
    expect(credence(low, 'door:open')).toBe(0.5);
    expect(credence(high, 'door:open')).toBeCloseTo(0.9, 9);
  });
});

describe('authored belief', () => {
  test('sets probability of the stated value and only changes beliefs', () => {
    const p = person();
    const before = structuredClone(p);
    const belief = seedBelief(p, 'door:open', { value: false, credence: 0.8 });
    expect(credence(p, 'door:open')).toBeCloseTo(0.2, 9);
    expect(belief.updatedAt).toBe(90);
    expect(belief.sources).toEqual([]);
    before.memory.beliefs = [structuredClone(belief)];
    expect(p).toEqual(before);
    seedBelief(p, 'door:open', { value: true, credence: 0.8 });
    expect(credence(p, 'door:open')).toBeCloseTo(0.8, 9);
    seedBelief(p, 'door:open', { value: false, credence: 0.2 });
    expect(credence(p, 'door:open')).toBeCloseTo(0.8, 9);
  });

  test('replaces confidence, time and sources without trust or reputation learning', () => {
    const p = person();
    seedSourceTrust(p, 'speaker', 0);
    believe(p, 'speaker:honest', false, 0.9, 'other', 40);
    const before = structuredClone(p);
    const b = seedBelief(p, 'speaker:honest', {
      value: true,
      credence: 0.9,
      source: 'speaker',
      at: 12,
    });
    expect(credence(p, 'speaker:honest')).toBeCloseTo(0.9, 9);
    expect(b.sources).toEqual([{ id: 'speaker', value: true }]);
    expect(b.updatedAt).toBe(12);
    expect(p.memory.beliefs).toHaveLength(1);
    before.memory.beliefs = [structuredClone(b)];
    expect(p).toEqual(before);
    seedBelief(p, 'speaker:honest', { value: false, credence: 0.5 });
    expect(b.sources).toEqual([]);
    expect(credence(p, 'speaker:honest')).toBe(0.5);
  });

  test('named sources are judged on later confirmation', () => {
    const p = person();
    seedSourceTrust(p, 'speaker', 0.8);
    seedBelief(p, 'door:open', { value: false, credence: 0.9, source: 'speaker' });
    expect(confirm(p, 'door:open', true, 90)).toEqual(['speaker']);
    expect(trustOf(p, 'speaker')).toBeCloseTo(0.6, 9);
  });

  test('an omitted source does not add the observation discount to later testimony', () => {
    const authored = person();
    const observed = person();
    seedBelief(authored, 'door:open', { value: true, credence: 0.9 });
    seedBelief(observed, 'door:open', { value: true, credence: 0.9, source: 'self' });
    const initial = authored.memory.beliefs[0]?.logOdds ?? 0;
    for (const p of [authored, observed]) believe(p, 'door:open', false, 0.9, 'speaker', 90);
    const authoredChange = initial - (authored.memory.beliefs[0]?.logOdds ?? 0);
    const observedChange = initial - (observed.memory.beliefs[0]?.logOdds ?? 0);
    expect(authoredChange).toBeGreaterThan(observedChange);
  });

  test('clamps both probability endpoints and caps log-odds in either direction', () => {
    const p = person();
    for (const value of [false, true]) {
      for (const probability of [-2, 0, 1, 2]) {
        const b = seedBelief(p, 'door:open', { value, credence: probability });
        const positive = value === probability >= 1;
        expect(b.logOdds).toBe((positive ? 1 : -1) * BELIEF_DEFAULTS.maxLogOdds);
      }
    }
  });

  test('rejects nonfinite credence or time before creating or replacing a belief', () => {
    const p = person();
    seedBelief(p, 'held', { value: true, credence: 0.8 });
    const before = structuredClone(p);
    for (const prop of ['held', 'new']) {
      for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
        expect(() => seedBelief(p, prop, { value: true, credence: bad })).toThrow(/finite/);
        expect(() => seedBelief(p, prop, { value: true, credence: 0.8, at: bad })).toThrow(/finite/);
      }
    }
    expect(p).toEqual(before);
  });

  test('uses ordinary weakest, oldest, lexical eviction and keeps the inserted belief', () => {
    const p = person();
    for (let i = 0; i < BELIEF_DEFAULTS.maxBeliefs - 2; i++)
      seedBelief(p, `strong${i}`, { value: true, credence: 0.9 });
    seedBelief(p, 'weak-b', { value: true, credence: 0.6, at: 1 });
    seedBelief(p, 'weak-a', { value: true, credence: 0.6, at: 1 });
    seedBelief(p, 'new-weakest', { value: true, credence: 0.5 });
    expect(p.memory.beliefs).toHaveLength(BELIEF_DEFAULTS.maxBeliefs);
    expect(p.memory.beliefs.some((b) => b.prop === 'weak-a')).toBe(false);
    expect(p.memory.beliefs.some((b) => b.prop === 'new-weakest')).toBe(true);
    seedBelief(p, 'new-strong', { value: true, credence: 0.9 });
    expect(p.memory.beliefs.some((b) => b.prop === 'new-weakest')).toBe(false);
  });
});
