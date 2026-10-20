import { describe, expect, test } from 'vitest';
import {
  createCommunity,
  createPerson,
  die,
  isDeceasedTie,
  type Person,
  seedTie,
  snapshot,
  tellDeath,
} from '../src/index.ts';

const person = (id: string, now: number) =>
  createPerson({ id, name: id, seed: 1, now, bornAt: -10000000, sex: 'female' });
function community(lateAt = 100) {
  const dead = person('dead', 50);
  die(dead);
  const before = person('before', 40);
  const late = person('late', lateAt);
  for (const p of [before, late])
    seedTie(p, { otherId: dead.id, affection: 0.8, familiarity: 1, roles: ['friend'] });
  return { dead, before, late, c: createCommunity([dead, before, late]) };
}
function deathTie(p: Person) {
  const tie = p.social.relationships.find((r) => r.otherId === 'dead');
  if (!tie) throw new Error('missing test tie');
  return tie;
}

describe('tellDeath late listeners', () => {
  test('the existing default already permits late delivery and matches explicit now mode exactly', () => {
    const a = community();
    const b = community();
    tellDeath(a.c, a.dead, 50);
    tellDeath(b.c, b.dead, 50, { late: 'now' });
    expect(a.c.people.map(snapshot)).toEqual(b.c.people.map(snapshot));
    expect(a.late.now).toBe(100);
    expect(isDeceasedTie(deathTie(a.late))).toBe(true);
    expect(deathTie(a.late)?.deceasedAt).toBe(100);
    expect(a.late.memory.episodes.some((e) => e.at === 100 && e.summary === 'dead died')).toBe(true);
  });

  test('explicit strict mode throws before any listener is changed', () => {
    const { c, dead } = community();
    const before = c.people.map(snapshot);
    expect(() => tellDeath(c, dead, 50, { late: 'throw' })).toThrow(/listener late/);
    expect(c.people.map(snapshot)).toEqual(before);
  });

  test('strict mode accepts listeners at or before the death minute without changing their clock', () => {
    const { c, dead, before, late } = community(50);
    tellDeath(c, dead, 50, { late: 'throw' });
    expect(before.now).toBe(40);
    // Existing perception clamps faculty time to now; tellDeath passes the declared receipt minute.
    expect(isDeceasedTie(deathTie(before))).toBe(true);
    expect(late.now).toBe(50);
    expect(deathTie(late)?.deceasedAt).toBe(50);
  });

  test('strict mode ignores untied or dead people even if their clocks are ahead', () => {
    const { c, dead, late } = community();
    late.social.relationships = [];
    const deceased = person('already-dead', 200);
    seedTie(deceased, { otherId: dead.id });
    die(deceased);
    c.people.push(deceased);
    expect(() => tellDeath(c, dead, 50, { late: 'throw' })).not.toThrow();
  });
});
