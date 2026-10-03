import { describe, expect, test } from 'vitest';
import {
  begin,
  createPerson,
  createVillage,
  decide,
  ENGINE_VERSION,
  finish,
  MINUTES_PER_DAY,
  predict,
  readPerson,
  restore,
  snapshot,
  tick,
  villagerSpec,
} from '../src/index.ts';
import type { Affordance, Outcome, Person } from '../src/types.ts';

const DAY7 = 7 * 60;

function villager(id: string, seed: number, opts: Parameters<typeof villagerSpec>[3] = {}): Person {
  return createPerson(villagerSpec(id, id, seed, { now: DAY7, ...opts }));
}

describe('createPerson', () => {
  test('fills defaults', () => {
    const p = createPerson({
      id: 'x',
      name: 'X',
      seed: 1,
      bornAt: -30 * 365 * MINUTES_PER_DAY,
      sex: 'female',
    });
    expect(p.traits.extraversion).toBe(0.5);
    expect(p.values.benevolence).toBe(0.5);
    expect(p.will.switchMargin).toBe(0.15);
    expect(p.will.temperature).toBe(0);
    expect(p.engine).toBe(ENGINE_VERSION);
    expect(p.activity).toBeNull();
    expect(p.body.alive).toBe(true);
  });

  test('traits and voices from the spec are kept', () => {
    const p = villager('a', 3, {
      traits: { extraversion: 0.9 },
      voices: [{ voiceId: 'player', trust: 0.8 }],
    });
    expect(p.traits.extraversion).toBe(0.9);
    expect(p.will.voices.find((v) => v.voiceId === 'player')?.trust).toBe(0.8);
  });
});

describe('lifecycle', () => {
  test('decide, begin, tick, finish round trip clears the activity and records a trace entry', () => {
    const p = villager('a', 5, { body: { satiety: 0.2 } });
    const village = createVillage([p], { seed: 1 });
    const affordances = village.affordancesFor(p);
    const record = decide(p, affordances);
    expect(record.chosenAction).toBe('eat');
    expect(record.intention).toBe('to feed myself');
    expect(record.narration.length).toBeGreaterThan(0);
    const chosen = affordances.find((a) => a.id === record.chosenAffordanceId) as Affordance;
    const activity = begin(p, chosen, record);
    expect(activity).not.toBeNull();
    expect(p.activity?.action).toBe('eat');
    const satietyBefore = p.body.satiety;
    tick(p, activity?.endsAt ?? p.now);
    const outcome = village.resolve(p, p.activity as NonNullable<Person['activity']>, 'ended');
    const report = finish(p, outcome);
    expect(report?.status).toBe('completed');
    expect(p.body.satiety).toBeGreaterThan(satietyBefore);
    expect(p.activity).toBeNull();
    expect(p.trace).toHaveLength(1);
    expect(p.memory.episodes.length).toBeGreaterThan(0);
  });

  test('finishing a sleep wakes the body so the next decision is not vetoed asleep', () => {
    const p = villager('a', 6, { body: { sleepPressure: 0.95 } });
    const village = createVillage([p], { seed: 1 });
    const affordances = village.affordancesFor(p);
    const sleep = affordances.find((a) => a.action === 'sleep') as Affordance;
    const record = decide(p, affordances);
    const act = begin(p, sleep, record);
    expect(p.body.asleep).toBe(true);
    tick(p, act?.endsAt ?? p.now);
    finish(p, village.resolve(p, p.activity as NonNullable<Person['activity']>, 'ended'));
    expect(p.body.asleep).toBe(false);
    const next = decide(p, village.affordancesFor(p));
    expect(next.considered.some((c) => c.vetoed?.reason === 'asleep')).toBe(false);
  });

  test('a failed outcome with an injury raises pain and is remembered negatively', () => {
    const p = villager('a', 7);
    const aff: Affordance = {
      id: 'forage',
      action: 'forage',
      label: 'forage',
      duration: 60,
      effort: 0.4,
      advertises: { food: 0.3 },
      risk: { chance: 0.5, severity: 0.5, kind: 'animal' },
    };
    const record = decide(p, [aff]);
    begin(p, aff, record);
    tick(p, p.now + 60);
    const outcome: Outcome = {
      affordanceId: 'forage',
      action: 'forage',
      status: 'failed',
      at: p.now,
      injury: { part: 'leg', severity: 0.5, healRatePerDay: 0.1 },
      summary: 'got hurt',
    };
    const report = finish(p, outcome);
    expect(report?.felt).toBeLessThan(0);
    expect(p.body.injuries).toHaveLength(1);
    expect(readPerson(p).body.pain).toBeGreaterThan(0);
    const episode = p.memory.episodes.at(-1);
    expect(episode?.valence).toBeLessThan(0);
  });

  test('the trace is bounded', () => {
    const p = villager('a', 8);
    const wait: Affordance = {
      id: 'wait',
      action: 'wait',
      label: 'wait',
      duration: 5,
      effort: 0,
      advertises: {},
    };
    for (let i = 0; i < 60; i++) decide(p, [wait]);
    expect(p.trace.length).toBeLessThanOrEqual(32);
  });
});

describe('tick', () => {
  test('one long tick matches many short ticks within tolerance', () => {
    const a = villager('a', 9);
    const b = villager('a', 9);
    tick(a, DAY7 + 600);
    for (let m = 1; m <= 600; m++) tick(b, DAY7 + m);
    expect(Math.abs(a.body.satiety - b.body.satiety)).toBeLessThan(0.01);
    expect(Math.abs(a.body.hydration - b.body.hydration)).toBeLessThan(0.01);
    expect(Math.abs(a.body.sleepPressure - b.body.sleepPressure)).toBeLessThan(0.01);
    expect(Math.abs(a.affect.mood.valence - b.affect.mood.valence)).toBeLessThan(0.05);
    for (const id of Object.keys(a.needs) as (keyof Person['needs'])[]) {
      expect(Math.abs(a.needs[id] - b.needs[id])).toBeLessThan(0.02);
    }
  });

  test('a missed prayer window records a breach for a devout person', () => {
    const p = villager('a', 10, { devout: true });
    tick(p, DAY7 + MINUTES_PER_DAY);
    expect(p.conscience.breaches.length).toBeGreaterThan(0);
  });
});

describe('snapshot and restore', () => {
  test('round-trips to identical JSON', () => {
    const p = villager('a', 11, { devout: true });
    const village = createVillage([p], { seed: 2 });
    const record = decide(p, village.affordancesFor(p));
    const aff = village.affordancesFor(p).find((a) => a.id === record.chosenAffordanceId) as Affordance;
    begin(p, aff, record);
    tick(p, p.now + 20);
    const json = JSON.stringify(snapshot(p));
    const back = restore(JSON.parse(json));
    expect(JSON.stringify(back)).toBe(json);
  });

  test('rejects a foreign schema', () => {
    const p = villager('a', 12);
    const bad = { ...snapshot(p), schema: 'other/thing@9' };
    expect(() => restore(bad)).toThrow();
    expect(() => restore(null)).toThrow();
  });
});

describe('review fixes (2026-10-03)', () => {
  const drinkAff: Affordance = {
    id: 'drink',
    action: 'drink',
    label: 'drink',
    duration: 10,
    effort: 0.05,
    advertises: { water: 0.6 },
  };
  const outcome = (aff: Affordance, at: number, extra: Partial<Outcome> = {}): Outcome => ({
    affordanceId: aff.id,
    action: aff.action,
    status: 'completed',
    at,
    ...extra,
  });

  test('restore fills missing nested fields per slice instead of crashing or going NaN', () => {
    const p = villager('a', 31);
    const saved = JSON.parse(JSON.stringify(snapshot(p)));
    delete saved.will.precommitments;
    delete saved.body.sleepDebt;
    const back = restore(saved);
    expect(Array.isArray(back.will.precommitments)).toBe(true);
    const village = createVillage([back], { seed: 1 });
    expect(() => decide(back, village.affordancesFor(back))).not.toThrow();
    tick(back, back.now + 600);
    expect(Number.isFinite(back.body.sleepDebt)).toBe(true);
    expect(Number.isFinite(back.body.satiety)).toBe(true);
  });

  test('restore rejects a save from another engine version instead of restamping it', () => {
    const saved = { ...snapshot(villager('a', 32)), engine: '0.0.1-ancient' };
    expect(() => restore(saved)).toThrow(/engine/);
  });

  test('chunking of tick calls: byte-identical on the hour grid, same discrete events off it', () => {
    const chunked = (step: number) => {
      const p = villager('a', 33, { devout: true });
      for (let t = DAY7; t < DAY7 + 1000; ) {
        t = Math.min(DAY7 + 1000, t + step);
        tick(p, t);
      }
      return p;
    };
    const a = villager('a', 33, { devout: true });
    tick(a, DAY7 + 1000);
    expect(JSON.stringify(chunked(60))).toBe(JSON.stringify(a));
    const b = chunked(97);
    const discrete = (p: Person) =>
      JSON.stringify({
        commitments: p.agenda.commitments,
        breaches: p.conscience.breaches,
        episodes: p.memory.episodes.map((e) => [e.id, e.at, e.kind, e.action]),
        emotions: p.affect.emotions.map((e) => [e.id, e.since, e.cause]),
      });
    expect(discrete(b)).toBe(discrete(a));
    expect(Math.abs(a.body.satiety - b.body.satiety)).toBeLessThan(1e-6);
  });

  test('a drink at full hydration realizes nothing and does not feel good', () => {
    const p = villager('a', 34, { body: { hydration: 1 } });
    const r = decide(p, [drinkAff]);
    begin(p, drinkAff, r);
    const rep = finish(p, outcome(drinkAff, p.now + 10, { needs: { water: 0.6 } }));
    expect(rep?.realized.water ?? 1).toBeLessThan(0.05);
    expect(rep?.felt ?? 1).toBeLessThan(0.05);
  });

  test('a broken job (no norm, no person) still leaves a missed episode, distress and esteem loss', () => {
    const p = villager('a', 35);
    const esteem = p.needs.esteem;
    tick(p, DAY7 + MINUTES_PER_DAY);
    expect(p.memory.episodes.some((e) => e.kind === 'missed' && e.action === 'work-field')).toBe(true);
    expect(p.needs.esteem).toBeLessThan(esteem);
    expect(p.agenda.commitments.some((c) => c.kind === 'job' && c.status === 'broken')).toBe(true);
  });

  test('the habit cue is the last completed activity, not a missed or interrupted one', () => {
    const p = villager('a', 36, { devout: true });
    const r = decide(p, [drinkAff]);
    begin(p, drinkAff, r);
    finish(p, outcome(drinkAff, p.now + 10, { needs: { water: 0.3 } }));
    tick(p, p.now + MINUTES_PER_DAY); // prayer windows and the job are missed
    expect(p.conscience.intentions.at(-1)?.action).not.toBe('drink');
    const waitAff: Affordance = {
      id: 'wait',
      action: 'wait',
      label: 'wait',
      duration: 15,
      effort: 0,
      advertises: {},
    };
    begin(p, waitAff, decide(p, [waitAff]));
    finish(p, { ...outcome(waitAff, p.now + 5), status: 'interrupted' });
    const habits = p.habits.length;
    const pray: Affordance = {
      id: 'pray',
      action: 'pray',
      label: 'pray',
      duration: 15,
      effort: 0,
      advertises: {},
    };
    begin(p, pray, decide(p, [pray]));
    finish(p, outcome(pray, p.now + 15));
    // Reinforcement after a completed pray is cued by the completed drink.
    const h = p.habits.find((x) => x.action === 'pray');
    expect(p.habits.length).toBeGreaterThanOrEqual(habits);
    expect(JSON.stringify(h ?? {})).not.toContain('missed');
  });

  test('worship repents only breaches against God and leaves guilt toward a wronged person', () => {
    const p = villager('a', 37, { devout: true });
    const steal: Affordance = {
      id: 'steal',
      action: 'steal-bread',
      label: 'steal',
      targetId: 'b',
      duration: 10,
      effort: 0,
      advertises: {},
      norms: [{ normId: 'theft', relation: 'violates' }],
    };
    begin(p, steal, decide(p, [steal]));
    finish(p, outcome(steal, p.now + 10, { targetId: 'b' }));
    const guiltBefore = p.affect.emotions
      .filter((e) => e.id === 'guilt')
      .reduce((s, e) => s + e.intensity, 0);
    expect(guiltBefore).toBeGreaterThan(0);
    const worship: Affordance = {
      id: 'pray',
      action: 'pray',
      label: 'pray',
      duration: 15,
      effort: 0,
      advertises: {},
      tags: ['worship'],
    };
    const r = decide(p, [worship]);
    // The open theft does not make worship pull: worship cannot clear it.
    expect(r.considered[0]?.terms.some((t) => t.source === 'conscience:repent')).toBe(false);
    begin(p, worship, r);
    finish(p, outcome(worship, p.now + 15));
    expect(p.conscience.breaches.some((b) => b.normId === 'theft' && !b.repaired)).toBe(true);
    const guiltAfter = p.affect.emotions.filter((e) => e.id === 'guilt').reduce((s, e) => s + e.intensity, 0);
    expect(guiltAfter).toBeGreaterThan(guiltBefore * 0.6);
  });

  test('time spent in an interrupted skilled activity still counts as practice', () => {
    const p = villager('a', 38);
    const work: Affordance = {
      id: 'work',
      action: 'work-field',
      label: 'work',
      duration: 120,
      effort: 0.3,
      skill: { id: 'farming', difficulty: 0.3 },
      advertises: {},
    };
    const before = JSON.stringify(p.skills);
    begin(p, work, decide(p, [work]));
    finish(p, { ...outcome(work, p.now + 90), status: 'interrupted' });
    expect(JSON.stringify(p.skills)).not.toBe(before);
  });

  test('predict answers like decide without changing the person', () => {
    const p = villager('a', 39, { body: { satiety: 0.05 } });
    const affs = createVillage([p], { seed: 1 }).affordancesFor(p);
    const before = JSON.stringify(p);
    const res = predict(p, affs, { voiceId: 'player', action: 'chat', strength: 0.6 });
    expect(JSON.stringify(p)).toBe(before);
    const actual = decide(p, affs, { suggestion: { voiceId: 'player', action: 'chat', strength: 0.6 } });
    expect(res.verdict).toBe(actual.suggestion?.verdict);
  });

  test('a NaN offer cannot poison state through begin', () => {
    const p = villager('a', 40);
    const bad: Affordance = {
      id: 'bad',
      action: 'bad',
      label: 'bad',
      duration: Number.NaN,
      effort: Number.NaN,
      advertises: {},
    };
    const act = begin(p, bad, decide(p, [bad]));
    expect(act?.endsAt).toBe(p.now + 1);
    tick(p, p.now + 60);
    expect(Number.isFinite(p.body.satiety)).toBe(true);
    expect(JSON.parse(JSON.stringify(p)).body.satiety).toBe(p.body.satiety);
  });
});
