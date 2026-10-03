import { describe, expect, test } from 'vitest';
import {
  advanceBeliefs,
  attend,
  BELIEF_DEFAULTS,
  believe,
  confirm,
  credence,
  trustOf,
} from '../src/beliefs/index.ts';
import { createRng } from '../src/core/index.ts';
import { createMemory } from '../src/memory/index.ts';
import type { Percept, Person } from '../src/types.ts';

function person(): Person {
  return {
    id: 'p1',
    now: 0,
    rng: createRng(1),
    memory: createMemory(),
    social: {
      relationships: [
        {
          otherId: 'kid',
          affection: 0.9,
          trust: 0.8,
          respect: 0.5,
          familiarity: 1,
          roles: ['child'],
          ledger: 0,
          lastInteraction: 0,
        },
      ],
    },
  } as unknown as Person;
}

const percept = (kind: string, salience: number, extra: Partial<Percept> = {}): Percept => ({
  at: 0,
  channel: 'saw',
  kind,
  salience,
  summary: kind,
  ...extra,
});

describe('beliefs/attention', () => {
  const many = [
    percept('weather', 0.2),
    percept('chat', 0.3),
    percept('fact', 0.25),
    percept('gift', 0.35),
    percept('help', 0.4),
    percept('fact', 0.1),
  ];
  test('fatigue narrows capacity and drops low-salience percepts first', () => {
    const p = person();
    const rested = attend(p, many, { focus: 0, fatigue: 0, fear: 0 });
    const tired = attend(p, many, { focus: 0, fatigue: 0.9, fear: 0 });
    expect(rested).toHaveLength(6);
    expect(tired).toHaveLength(2);
    expect(tired.map((x) => x.kind)).toEqual(['help', 'gift']);
  });
  test('must-keep percepts survive beyond capacity; relevance reorders', () => {
    const p = person();
    const ps = [
      ...many,
      percept('alarm', 0.95),
      percept('insult', 0.1, { targetId: 'p1', valence: -0.7 }),
      percept('fall', 0.2, { targetId: 'kid' }),
      percept('theft', 0.1),
    ];
    const out = attend(p, ps, { focus: 1, fatigue: 1, fear: 1 });
    const kinds = out.map((x) => x.kind);
    expect(kinds).toContain('alarm');
    expect(kinds).toContain('insult');
    expect(out.length).toBe(4); // 2 must-keep + capacity 2
    expect(kinds).toContain('theft'); // fear raises threat relevance
    expect(kinds).toContain('fall'); // loved one
  });
  test('deterministic ordering', () => {
    const p = person();
    const ps = [percept('a', 0.5), percept('b', 0.5), percept('c', 0.5)];
    expect(attend(p, ps, { focus: 1, fatigue: 1, fear: 0 }).map((x) => x.kind)).toEqual(['a', 'b']);
  });
});

describe('beliefs/credence and trust', () => {
  test('defaults and trust ordering of update strength', () => {
    const p = person();
    expect(credence(p, 'x')).toBe(0.5);
    expect(trustOf(p, 'p1')).toBe(BELIEF_DEFAULTS.selfTrust);
    expect(trustOf(p, 'stranger')).toBe(0.5);
    p.memory.sourceTrust.friend = 0.95;
    p.memory.sourceTrust.crank = 0.1;
    believe(p, 'a', true, 0.9, 'friend', 0);
    believe(p, 'b', true, 0.9, 'stranger', 0);
    believe(p, 'c', true, 0.9, 'crank', 0);
    expect(credence(p, 'a')).toBeGreaterThan(credence(p, 'b'));
    expect(credence(p, 'b')).toBeGreaterThan(0.5);
    expect(credence(p, 'c')).toBeGreaterThanOrEqual(0.5); // low trust never flips the claim
    believe(p, 'd', false, 0.9, 'friend', 0);
    expect(credence(p, 'd')).toBeLessThan(0.5);
  });

  test('log-odds capped and sources bounded; repeats are discounted', () => {
    const p = person();
    for (let i = 0; i < 50; i++) believe(p, 'x', true, 1, `s${i}`, i);
    const b = p.memory.beliefs[0];
    expect(Math.abs(b?.logOdds ?? 0)).toBeLessThanOrEqual(BELIEF_DEFAULTS.maxLogOdds);
    expect(b?.sources.length).toBe(BELIEF_DEFAULTS.maxSources);
    const q = person();
    believe(q, 'y', true, 0.9, 'gossip', 0);
    const one = q.memory.beliefs[0]?.logOdds ?? 0;
    believe(q, 'y', true, 0.9, 'gossip', 1);
    const two = q.memory.beliefs[0]?.logOdds ?? 0;
    expect(two - one).toBeLessThan(one);
    expect(q.memory.beliefs[0]?.sources).toEqual([{ id: 'gossip', value: true }]);
  });

  test('a lying source loses trust and later moves credence less than an honest one', () => {
    const p = person();
    for (let i = 0; i < 4; i++) {
      const prop = `fact${i}`;
      believe(p, prop, true, 0.9, 'honest', i);
      believe(p, prop, false, 0.9, 'liar', i);
      confirm(p, prop, true, i);
    }
    expect(trustOf(p, 'honest')).toBeGreaterThan(0.6);
    expect(trustOf(p, 'liar')).toBeLessThan(0.25);
    // Asymmetry: one wrong claim costs more than one right claim earns.
    const q = person();
    believe(q, 'f', true, 0.9, 'a', 0);
    believe(q, 'f', false, 0.9, 'b', 0);
    confirm(q, 'f', true, 0);
    expect(0.5 - trustOf(q, 'b')).toBeGreaterThan(trustOf(q, 'a') - 0.5);
    // Second confirmation does not judge the same claims again.
    confirm(q, 'f', true, 1);
    expect(trustOf(q, 'b')).toBeCloseTo(0.375, 9);
    believe(p, 'new1', true, 0.9, 'honest', 10);
    believe(p, 'new2', true, 0.9, 'liar', 10);
    expect(credence(p, 'new1') - 0.5).toBeGreaterThan(5 * (credence(p, 'new2') - 0.5));
  });

  test('confirm sets firm credence without weakening a stronger same-side belief', () => {
    const p = person();
    confirm(p, 'well:empty', false, 0);
    expect(p.memory.beliefs[0]?.logOdds).toBe(-BELIEF_DEFAULTS.confirmLogOdds);
    const held = p.memory.beliefs[0];
    if (held) held.logOdds = -5.5;
    confirm(p, 'well:empty', false, 1);
    expect(p.memory.beliefs[0]?.logOdds).toBe(-5.5);
  });

  test('drift toward 0 is slow and closed form', () => {
    const a = person();
    const b = person();
    for (const p of [a, b]) confirm(p, 'x', true, 0);
    advanceBeliefs(a, 600);
    for (let i = 0; i < 600; i++) advanceBeliefs(b, 1);
    expect(a.memory.beliefs[0]?.logOdds).toBeCloseTo(b.memory.beliefs[0]?.logOdds ?? 0, 9);
    advanceBeliefs(a, 7 * 1440);
    expect(credence(a, 'x')).toBeGreaterThan(0.95);
    advanceBeliefs(a, 365 * 1440);
    expect(credence(a, 'x')).toBeLessThan(0.6);
  });

  test('belief store bounded at 300', () => {
    const p = person();
    for (let i = 0; i < 320; i++) believe(p, `q${i}`, true, 0.8, 'friend', i);
    expect(p.memory.beliefs.length).toBe(BELIEF_DEFAULTS.maxBeliefs);
    expect(p.memory.beliefs.some((b) => b.prop === 'q319')).toBe(true);
  });

  test('headless control: trust-weighted believer ends closer to truth than a naive averager', () => {
    const naive = (claims: boolean[]) => claims.filter(Boolean).length / claims.length;
    const p = person();
    for (let i = 0; i < 5; i++) {
      believe(p, `t${i}`, true, 0.9, 'honest', i);
      believe(p, `t${i}`, false, 0.9, 'liar', i);
      confirm(p, `t${i}`, true, i);
    }
    believe(p, 'target', true, 0.9, 'honest', 10);
    believe(p, 'target', false, 0.9, 'liar', 10);
    expect(credence(p, 'target')).toBeGreaterThan(naive([true, false]) + 0.1);
  });
});
