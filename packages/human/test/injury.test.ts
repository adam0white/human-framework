import { describe, expect, test } from 'vitest';
import {
  bleedRate,
  command,
  createCommunity,
  createPerson,
  createVillage,
  decide,
  enableDowned,
  injure,
  isDowned,
  knockDown,
  MINUTES_PER_DAY,
  readBody,
  readCapacities,
  restore,
  snapshot,
  standUp,
  stepCommunity,
  tend,
  tick,
  villagerSpec,
} from '../src/index.ts';
import type { Affordance, Person } from '../src/types.ts';

const NOON = 12 * 60;
const ids = ['a', 'b', 'c'];

function villager(id: string, seed: number): Person {
  return createPerson(villagerSpec(id, id, seed, { now: NOON, others: ids }));
}
function offers(p: Person): Affordance[] {
  const others = ids.filter((id) => id !== p.id).map((id) => villager(id, 99));
  return createVillage([p, ...others], { seed: 1 }).affordancesFor(p);
}

describe('injury depth', () => {
  test('capacities come from the part (exact name) or the injury, and injure writes nothing new', () => {
    const p = villager('a', 1);
    expect(readCapacities(p)).toEqual({ moving: 1, manipulation: 1, sight: 1 });
    const leg = injure(p, { part: 'leg', severity: 0.6, healRatePerDay: 0.1 });
    expect(Object.keys(leg).sort()).toEqual(['healRatePerDay', 'id', 'part', 'severity', 'since']);
    expect(readCapacities(p).moving).toBeCloseTo(0.7, 10);
    injure(p, { part: 'hands and face', severity: 0.5, healRatePerDay: 0.1 });
    expect(readCapacities(p).manipulation).toBe(1);
    injure(p, { part: 'claw', severity: 0.5, healRatePerDay: 0.1, affects: { manipulation: 1 } });
    expect(readCapacities(p).manipulation).toBeCloseTo(0.5, 10);
    // The scalar capacity is untouched by the part table.
    const q = villager('a', 1);
    injure(q, { part: 'leg', severity: 0.6, healRatePerDay: 0.1 });
    injure(q, { part: 'hands and face', severity: 0.5, healRatePerDay: 0.1 });
    injure(q, { part: 'claw', severity: 0.5, healRatePerDay: 0.1 });
    expect(readBody(q).capacity).toBe(readBody(p).capacity);
  });

  test('an offer that requires a capacity is vetoed below it', () => {
    const p = villager('a', 2);
    const walk: Affordance = {
      id: 'walk-far',
      action: 'walk-far',
      label: 'walk to the far field',
      duration: 60,
      effort: 0.2,
      advertises: { leisure: 0.3 },
      requires: { moving: 0.5 },
    };
    // A short list, so both options appear in the decision record (it keeps the top few).
    const few = (x: Person) => [...offers(x).filter((a) => a.id === 'wait'), walk];
    let r = decide(p, few(p));
    expect(r.considered.find((c) => c.affordanceId === 'walk-far')).toBeDefined();
    expect(r.considered.find((c) => c.affordanceId === 'walk-far')?.vetoed).toBeUndefined();
    const q = villager('a', 2);
    injure(q, { part: 'legs', severity: 0.9, healRatePerDay: 0.1 });
    r = decide(q, few(q));
    expect(r.considered.find((c) => c.affordanceId === 'walk-far')?.vetoed).toEqual({
      kind: 'cannot',
      reason: 'capacity:moving',
    });
  });

  test('bleeding drains health and clots; tending cuts it and speeds healing', () => {
    const control = villager('a', 3);
    const open = villager('a', 3);
    const dressed = villager('a', 3);
    for (const p of [open, dressed])
      injure(p, { part: 'leg', severity: 0.5, healRatePerDay: 0.1, bleeding: 0.9 });
    expect(tend(dressed, undefined, 1)).toBe(1);
    expect(bleedRate(dressed)).toBeCloseTo(0.18, 10);
    expect(dressed.body.injuries[0]?.tendedAt).toBe(NOON);
    tick(open, NOON + MINUTES_PER_DAY);
    tick(dressed, NOON + MINUTES_PER_DAY);
    tick(control, NOON + MINUTES_PER_DAY);
    // Against an unhurt control (unfed for the day, so its health falls too): open loses ~0.59, dressed ~0.05.
    expect(control.body.health - open.body.health).toBeGreaterThan(0.5);
    expect(control.body.health - dressed.body.health).toBeLessThan(0.08);
    expect(bleedRate(open)).toBeLessThan(0.9);
    expect(bleedRate(open)).toBeGreaterThan(0);
    expect(dressed.body.injuries[0]?.severity ?? 1).toBeLessThan(open.body.injuries[0]?.severity ?? 0);
  });

  test('the bleed does not depend on how the host chunks its ticks', () => {
    const coarse = villager('a', 4);
    const fine = villager('a', 4);
    for (const p of [coarse, fine])
      injure(p, { part: 'arm', severity: 0.3, healRatePerDay: 0.1, bleeding: 0.5 });
    tick(coarse, NOON + 600);
    for (let m = 60; m <= 600; m += 60) tick(fine, NOON + m);
    expect(fine.body.health).toBeCloseTo(coarse.body.health, 6);
    expect(bleedRate(fine)).toBeCloseTo(bleedRate(coarse), 6);
  });

  test('downed: only lying, resting or sleeping; voices meet "cannot"; a command ends; standing up restores', () => {
    const p = villager('a', 5);
    command(p, { voiceId: 'player', action: 'work-field', since: p.now, repeat: true });
    expect(knockDown(p, { reason: 'struck' })).toBe(true);
    expect(isDowned(p)).toMatchObject({ since: NOON, reason: 'struck' });
    const r = decide(p, offers(p), {
      suggestion: { voiceId: 'friend', action: 'chat', strength: 1, insist: true },
    });
    const open = r.considered.filter((c) => !c.vetoed).map((c) => c.affordanceId);
    expect(open.length).toBeGreaterThan(0);
    for (const id of open) expect(['rest', 'sleep']).toContain(id);
    expect(r.considered.some((c) => c.vetoed?.reason === 'downed')).toBe(true);
    expect(r.suggestion).toMatchObject({ verdict: 'refused', kind: 'cannot', reason: 'downed' });
    expect(p.will.command).toBeUndefined();
    expect(p.will.lastCommand?.reason).toBe('downed');
    expect(p.memory.episodes.some((e) => e.kind === 'downed' && e.tags.includes('down'))).toBe(true);
    expect(standUp(p)).toBe(true);
    expect(isDowned(p)).toBeUndefined();
    const r2 = decide(p, offers(p));
    expect(r2.considered.some((c) => c.vetoed?.reason === 'downed')).toBe(false);
  });

  test('a timed downing lifts on the tick grid', () => {
    const p = villager('a', 6);
    knockDown(p, { until: NOON + 90 });
    tick(p, NOON + 60);
    expect(isDowned(p)).toBeDefined();
    tick(p, NOON + 120);
    expect(isDowned(p)).toBeUndefined();
    expect(p.memory.episodes.some((e) => e.kind === 'downed' && e.tags.includes('up'))).toBe(true);
  });

  test('derived downing is opt-in: below the floor he goes down, above it he gets up', () => {
    const off = villager('a', 7);
    const on = villager('a', 7);
    enableDowned(on, { moving: 0.3 });
    for (const p of [off, on]) injure(p, { part: 'legs', severity: 0.95, healRatePerDay: 0.6 });
    tick(off, NOON + 60);
    tick(on, NOON + 60);
    expect(isDowned(off)).toBeUndefined();
    expect(isDowned(on)).toMatchObject({ reason: 'capacity' });
    tick(on, NOON + 2 * MINUTES_PER_DAY);
    expect(readCapacities(on).moving).toBeGreaterThan(0.35);
    expect(isDowned(on)).toBeUndefined();
  });

  test('new fields survive save and restore; malformed ones are dropped', () => {
    const p = villager('a', 8);
    enableDowned(p, { health: 0.3 });
    injure(p, {
      part: 'claw',
      severity: 0.4,
      healRatePerDay: 0.1,
      bleeding: 0.3,
      affects: { manipulation: 0.7 },
    });
    tend(p);
    knockDown(p, { until: NOON + 60 });
    const q = restore(JSON.parse(JSON.stringify(snapshot(p))));
    expect(q.body).toEqual(p.body);
    const bad = JSON.parse(JSON.stringify(snapshot(p)));
    bad.body.injuries[0].bleeding = 'lots';
    bad.body.injuries[0].affects = { wings: 1 };
    bad.body.downed = { reason: 3 };
    bad.body.downedBelow = 'x';
    const r = restore(bad);
    expect(r.body.injuries[0]?.bleeding).toBeUndefined();
    expect(r.body.injuries[0]?.affects).toBeUndefined();
    expect(r.body.injuries[0]?.tendedAt).toBe(NOON);
    expect(r.body.downed).toBeUndefined();
    expect(r.body.downedBelow).toBeUndefined();
  });
});

describe('injury scenario (headless): a deep cut, dressed or left open, over three days', () => {
  function run(dressed: boolean) {
    const people = ids.map((id, k) => createPerson(villagerSpec(id, id, k + 1, { others: ids, now: NOON })));
    const a = people[0] as Person;
    enableDowned(a, { moving: 0.2, health: 0.3 });
    injure(a, { part: 'leg', severity: 0.6, healRatePerDay: 0.1, bleeding: 0.9 });
    const world = createVillage(people, { seed: 3 });
    const c = createCommunity(people);
    const events = stepCommunity(c, world, NOON + 60);
    if (dressed) tend(a, undefined, 0.8);
    events.push(...stepCommunity(c, world, NOON + 3 * MINUTES_PER_DAY));
    return { a, events };
  }

  test('left open he goes down and lies there; dressed he stays on his feet; the run replays exactly', () => {
    const open = run(false);
    const dressed = run(true);
    expect(dressed.a.body.alive).toBe(true);
    expect(dressed.a.body.health).toBeGreaterThan(0.8);
    expect(dressed.a.memory.episodes.some((e) => e.kind === 'downed')).toBe(false);
    const down = open.a.memory.episodes.find((e) => e.kind === 'downed' && e.tags.includes('down'));
    expect(down).toBeDefined();
    expect(down?.tags).toContain('health');
    // Once down, everything he began was lying, resting or sleeping until he got up (or the run ended).
    const up = open.a.memory.episodes.find((e) => e.kind === 'downed' && e.tags.includes('up'));
    const begun = open.events.filter(
      (e) =>
        e.personId === 'a' && e.kind === 'begin' && e.at > (down?.at ?? 0) && e.at < (up?.at ?? Infinity),
    );
    expect(begun.length).toBeGreaterThan(0);
    for (const e of begun) expect(['rest', 'sleep']).toContain(e.action);
    expect(JSON.stringify(snapshot(run(false).a))).toBe(JSON.stringify(snapshot(open.a)));
  });
});
