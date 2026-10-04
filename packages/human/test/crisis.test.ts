import { describe, expect, test } from 'vitest';
import {
  breakHazard,
  command,
  createCommunity,
  createPerson,
  createVillage,
  decide,
  enableBreaks,
  feel,
  inBreak,
  MINUTES_PER_DAY,
  perceive,
  restore,
  seedTie,
  snapshot,
  stepCommunity,
  tick,
  villagerSpec,
  voiceOf,
} from '../src/index.ts';
import type { Affordance, BreakBehaviour, Person } from '../src/types.ts';

const NOON = 12 * 60;
const ids = ['a', 'b', 'c'];
const BEHAVIOURS: BreakBehaviour[] = [
  { id: 'wander', label: 'wanders off', actions: ['wait'], minutes: [180, 240] },
  { id: 'hide', label: 'hides at home', tags: ['rest'], weight: 0.5, minutes: [180, 240] },
];

function villager(id: string, seed: number, opts: Parameters<typeof villagerSpec>[3] = {}): Person {
  return createPerson(villagerSpec(id, id, seed, { now: NOON, others: ids, ...opts }));
}
function offers(p: Person): Affordance[] {
  const others = ids.filter((id) => id !== p.id).map((id) => villager(id, 99));
  return createVillage([p, ...others], { seed: 1 }).affordancesFor(p);
}
/** A person under heavy strain: breaks enabled, stress near the top, grieving. */
function strained(seed: number): Person {
  const p = villager('a', seed, { traits: { emotionality: 0.8 } });
  enableBreaks(p, BEHAVIOURS);
  if (p.affect.crisis) p.affect.crisis.stress = 0.95;
  feel(p, 'grief', 0.9, 'event:death:b', p.now);
  return p;
}
/** Tick hour by hour until a break starts (or `hours` pass). */
function untilBreak(p: Person, hours = 48): boolean {
  for (let h = 0; h < hours && !inBreak(p); h++) tick(p, p.now + 60);
  return inBreak(p) !== undefined;
}

describe('mental breaks', () => {
  test('without enableBreaks nothing changes and no hazard is read', () => {
    const p = villager('a', 1);
    expect(breakHazard(p)).toEqual({ pressure: 0, perHour: 0 });
    tick(p, p.now + MINUTES_PER_DAY);
    expect(p.affect.crisis).toBeUndefined();
  });

  test('a calm person with breaks enabled has no hazard', () => {
    const p = villager('a', 2);
    enableBreaks(p, BEHAVIOURS);
    expect(breakHazard(p).perHour).toBe(0);
  });

  test('strain and grief raise the hazard until a break starts; the break is remembered', () => {
    const p = strained(3);
    expect(breakHazard(p).perHour).toBeGreaterThan(0);
    expect(untilBreak(p)).toBe(true);
    const b = inBreak(p);
    expect(BEHAVIOURS.map((x) => x.id)).toContain(b?.behaviourId);
    expect(p.memory.episodes.some((e) => e.kind === 'break' && e.tags.includes('onset'))).toBe(true);
    expect(p.affect.crisis?.breaks).toBe(1);
  });

  test('during a break only the behaviour is open and no voice reaches him', () => {
    const p = strained(4);
    untilBreak(p);
    const b = inBreak(p);
    const r = decide(p, offers(p), {
      suggestion: { voiceId: 'player', action: 'work-field', strength: 1, insist: true },
    });
    const chosen = offers(p).find((a) => a.id === r.chosenAffordanceId);
    if (b?.behaviourId === 'wander') expect(chosen?.action).toBe('wait');
    else expect(chosen?.tags ?? []).toContain('rest');
    expect(r.suggestion).toMatchObject({ verdict: 'refused', kind: 'cannot', reason: 'break' });
    expect(r.suggestion?.says.length).toBeGreaterThan(0);
    expect(voiceOf(p, 'player')?.refused ?? 0).toBe(0);
    expect(voiceOf(p, 'player')?.pressure ?? 0).toBe(0);
    expect(r.considered.filter((c) => c.vetoed?.reason === 'break').length).toBeGreaterThan(0);
  });

  test('a break ends direct control', () => {
    const p = strained(5);
    command(p, { voiceId: 'player', action: 'work-field', since: p.now, repeat: true });
    untilBreak(p);
    decide(p, offers(p));
    expect(p.will.command).toBeUndefined();
    expect(p.will.lastCommand?.reason).toBe('break');
  });

  test('it ends by itself, sooner with comfort from someone close, and leaves less stress', () => {
    const a = strained(6);
    untilBreak(a);
    const b = structuredClone(a);
    seedTie(b, { otherId: 'b', affection: 0.8, familiarity: 0.8, trust: 0.8 });
    const stress = a.affect.crisis?.stress ?? 0;
    const until = inBreak(a)?.until ?? 0;
    perceive(b, [
      {
        at: b.now,
        channel: 'social',
        kind: 'comfort',
        actorId: 'b',
        targetId: 'a',
        salience: 0.8,
        valence: 0.5,
        summary: 'b sat with me',
      },
    ]);
    expect(inBreak(b)?.until ?? 0).toBeLessThan(until);
    tick(a, until + 60);
    expect(inBreak(a)).toBeUndefined();
    expect(a.affect.crisis?.stress ?? 1).toBeLessThan(stress);
    expect(a.memory.episodes.some((e) => e.kind === 'break' && e.tags.includes('recovered'))).toBe(true);
  });

  test('onset does not depend on how the host chunks its ticks', () => {
    const coarse = strained(7);
    const fine = strained(7);
    tick(coarse, coarse.now + 2 * MINUTES_PER_DAY);
    for (let m = 0; m < 2 * MINUTES_PER_DAY; m += 7) tick(fine, NOON + m + 7);
    tick(fine, coarse.now);
    expect(fine.affect.crisis?.breaks).toBe(coarse.affect.crisis?.breaks);
    expect(fine.affect.crisis?.lastBreakAt).toBe(coarse.affect.crisis?.lastBreakAt);
  });

  test('a break in progress survives save and restore; a malformed crisis is dropped', () => {
    const p = strained(8);
    untilBreak(p);
    const q = restore(JSON.parse(JSON.stringify(snapshot(p))));
    expect(q.affect.crisis).toEqual(p.affect.crisis);
    const bad = JSON.parse(JSON.stringify(snapshot(p)));
    bad.affect.crisis.behaviours = 'x';
    expect(restore(bad).affect.crisis).toBeUndefined();
  });
});

describe('crisis scenario (headless): a villager in a bad stretch over three days', () => {
  // The host renews the loss each noon (a funeral, then the mourning days), so the strain is sustained, as a
  // bad stretch is; a calm villager beside him is the control.
  function run(strainedA: boolean) {
    const people = ids.map((id, k) => createPerson(villagerSpec(id, id, k + 1, { others: ids, now: NOON })));
    for (const p of people) enableBreaks(p, BEHAVIOURS);
    const a = people[0] as Person;
    const b = people[1] as Person;
    if (strainedA && a.affect.crisis) a.affect.crisis.stress = 0.9;
    const world = createVillage(people, { seed: 3 });
    const c = createCommunity(people);
    const events: ReturnType<typeof stepCommunity> = [];
    for (let day = 0; day < 3; day++) {
      if (strainedA) feel(a, 'grief', 0.9, 'event:death:c', a.now);
      events.push(...stepCommunity(c, world, NOON + (day + 1) * MINUTES_PER_DAY));
    }
    return { a, b, events };
  }

  test('he breaks and recovers, acting the break out; the calm villager does not; the run replays exactly', () => {
    const { a, b, events } = run(true);
    expect(a.affect.crisis?.breaks ?? 0).toBeGreaterThanOrEqual(1);
    expect(b.affect.crisis?.breaks).toBe(0);
    expect(a.memory.episodes.some((e) => e.kind === 'break' && e.tags.includes('recovered'))).toBe(true);
    // While a break ran, every option he began belonged to it (or was a bodily need at the edge).
    const onset = a.memory.episodes.find((e) => e.kind === 'break' && e.tags.includes('onset'));
    expect(onset).toBeDefined();
    const from = onset?.at ?? 0;
    const begun = events.filter(
      (e) => e.personId === 'a' && e.kind === 'begin' && e.at >= from && e.at < from + 180,
    );
    expect(begun.length).toBeGreaterThan(0);
    for (const e of begun) expect(['wait', 'rest', 'sleep', 'eat', 'drink']).toContain(e.action);
    expect(a.body.alive).toBe(true);
    expect(JSON.stringify(snapshot(run(true).a))).toBe(JSON.stringify(snapshot(a)));
  });
});
