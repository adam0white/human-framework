import { describe, expect, test } from 'vitest';
import {
  begin,
  command,
  createCommunity,
  createPerson,
  createVillage,
  decide,
  finish,
  MINUTES_PER_DAY,
  predict,
  previewCommand,
  readNeeds,
  readPerson,
  releaseCommand,
  restore,
  snapshot,
  stepCommunity,
  villagerSpec,
  voiceOf,
} from '../src/index.ts';
import type { Affordance, Command, Person } from '../src/types.ts';

const NOON = 12 * 60;
const ids = ['a', 'b', 'c'];

function villager(id: string, seed: number, opts: Parameters<typeof villagerSpec>[3] = {}): Person {
  return createPerson(villagerSpec(id, id, seed, { now: NOON, others: ids, ...opts }));
}
function offers(p: Person, foodStock = 30): Affordance[] {
  const others = ids.filter((id) => id !== p.id).map((id) => villager(id, 99));
  return createVillage([p, ...others], { seed: 1, foodStock }).affordancesFor(p);
}
const order = (action: string, extra: Partial<Command> = {}): Command => ({
  voiceId: 'player',
  action,
  since: NOON,
  ...extra,
});
const autonomy = (p: Person) => readNeeds(p, readPerson(p).body).find((n) => n.id === 'autonomy')?.level ?? 0;

describe('commanded control', () => {
  test('a commanded person does the order over his own choice, with a commanded verdict and its price', () => {
    const p = villager('a', 1, { body: { satiety: 0.6 } });
    const own = decide(villager('a', 1, { body: { satiety: 0.6 } }), offers(p));
    expect(own.chosenAction).not.toBe('forage');
    const before = autonomy(p);
    expect(command(p, order('forage'))).toBe(true);
    const r = decide(p, offers(p));
    expect(r.chosenAction).toBe('forage');
    expect(r.suggestion?.verdict).toBe('commanded');
    expect(r.suggestion?.margin).toBeGreaterThan(0);
    expect(r.suggestion?.insteadAffordanceId).toBe(own.chosenAffordanceId);
    expect(r.suggestion?.says.length).toBeGreaterThan(0);
    expect(autonomy(p)).toBeLessThan(before);
    expect(p.memory.episodes.some((e) => e.tags.includes('command') && e.voiceId === 'player')).toBe(true);
  });

  test('other voices are set aside without counters while the command holds', () => {
    const p = villager('a', 2);
    command(p, order('work-field'));
    const r = decide(p, offers(p), { suggestion: { voiceId: 'selin', action: 'chat', strength: 1 } });
    expect(r.chosenAction).toBe('work-field');
    const selin = r.suggestions?.find((s) => s.voiceId === 'selin');
    expect(selin).toMatchObject({ verdict: 'refused', kind: 'cannot', reason: 'commanded' });
    expect(voiceOf(p, 'selin')?.refused ?? 0).toBe(0);
    // predict sees the command too.
    expect(predict(p, offers(p), { voiceId: 'selin', action: 'chat', strength: 1 }).reason).toBe('commanded');
  });

  test('controlled hours cost autonomy, pressure and (with a margin) trust; release stops the charge', () => {
    const p = villager('a', 3, { body: { satiety: 0.7 } });
    command(p, order('forage', { repeat: true }));
    const r = decide(p, offers(p));
    const act = begin(p, offers(p).find((a) => a.id === r.chosenAffordanceId) as Affordance, r);
    expect(act?.suggestion?.verdict).toBe('commanded');
    const a0 = autonomy(p);
    const trust0 = voiceOf(p, 'player')?.trust ?? 0;
    decide(p, offers(p), { now: NOON + 60 }); // a review one hour on: charged for that hour
    expect(autonomy(p)).toBeLessThan(a0);
    expect(voiceOf(p, 'player')?.pressure ?? 0).toBeGreaterThan(0);
    expect(voiceOf(p, 'player')?.trust ?? 1).toBeLessThan(trust0);
    expect(releaseCommand(p)).toBe(true);
    expect(p.will.command).toBeUndefined();
    expect(p.will.lastCommand).toMatchObject({ voiceId: 'player', since: NOON, reason: 'released' });
    // The same command (voice, since) is not restarted.
    expect(command(p, order('forage', { repeat: true }))).toBe(false);
  });

  test('a one-job command ends "done" when its activity completes; a repeat command stays', () => {
    for (const repeat of [false, true]) {
      const p = villager('a', 4);
      command(p, order('work-field', { repeat }));
      const r = decide(p, offers(p));
      const aff = offers(p).find((a) => a.id === r.chosenAffordanceId) as Affordance;
      begin(p, aff, r);
      finish(p, { at: p.now + aff.duration, status: 'completed', action: aff.action, affordanceId: aff.id });
      if (repeat) expect(p.will.command).toBeDefined();
      else expect(p.will.lastCommand?.reason).toBe('done');
    }
  });

  test('no order makes a devout person steal: control ends willNot on the norm', () => {
    const p = villager('a', 5, { devout: true, traits: { honesty: 0.9 } });
    command(p, order('steal-bread'));
    const r = decide(p, offers(p));
    expect(r.chosenAction).not.toBe('steal-bread');
    const res = r.suggestions?.find((s) => s.voiceId === 'player') ?? r.suggestion;
    expect(res?.verdict).toBe('refused');
    expect(res?.kind).toBe('willNot');
    expect(p.will.command).toBeUndefined();
    expect(p.will.lastCommand?.reason).toMatch(/^norm:/);
  });

  test('a pressing bodily need suspends control for the decision; it resumes after', () => {
    const p = villager('a', 6, { body: { satiety: 0.02, hydration: 0.9 } });
    command(p, order('work-field', { repeat: true }));
    const r = decide(p, offers(p));
    expect(r.chosenAction).toBe('eat');
    const res = r.suggestions?.find((s) => s.voiceId === 'player') ?? r.suggestion;
    expect(res).toMatchObject({ verdict: 'refused', kind: 'cannot' });
    expect(res?.reason.startsWith('need:')).toBe(true);
    expect(p.will.command).toBeDefined();
  });

  test('previewCommand reads the outcome without changing the person', () => {
    const p = villager('a', 7, { body: { satiety: 0.6 } });
    const before = JSON.stringify(snapshot(p));
    const pv = previewCommand(p, offers(p), order('forage'));
    expect(pv.holds).toBe(true);
    expect(pv.margin).toBeGreaterThan(0);
    expect(JSON.stringify(snapshot(p))).toBe(before);
  });

  test('a command in force survives save and restore', () => {
    const p = villager('a', 8);
    command(p, order('work-field', { repeat: true }));
    decide(p, offers(p));
    const q = restore(JSON.parse(JSON.stringify(snapshot(p))));
    expect(q.will.command).toEqual(p.will.command);
    const bad = JSON.parse(JSON.stringify(snapshot(p)));
    bad.will.command = { voiceId: 7 };
    expect(restore(bad).will.command).toBeUndefined();
  });
});

describe('control scenario (headless): a villager drafted to the field for a day', () => {
  function run(controlled: boolean) {
    const people = ids.map((id, k) => createPerson(villagerSpec(id, id, k + 1, { others: ids })));
    const world = createVillage(people, { seed: 3 });
    const c = createCommunity(people);
    const start = people[0]?.now ?? 0;
    const opts = controlled
      ? { controlled: { a: { voiceId: 'player', action: 'work-field', since: start, repeat: true } } }
      : {};
    const events = stepCommunity(c, world, start + MINUTES_PER_DAY, opts);
    const a = c.people.find((p) => p.id === 'a') as Person;
    return { a, events };
  }

  test('controlled, he works the field far more, eats when he must, and pays in autonomy and trust', () => {
    const free = run(false);
    const drafted = run(true);
    const fieldStarts = (events: ReturnType<typeof run>['events']) =>
      events.filter((e) => e.personId === 'a' && e.kind === 'begin' && e.action === 'work-field').length;
    expect(fieldStarts(drafted.events)).toBeGreaterThan(fieldStarts(free.events));
    expect(drafted.events.some((e) => e.personId === 'a' && e.kind === 'begin' && e.action === 'eat')).toBe(
      true,
    );
    expect(autonomy(drafted.a)).toBeLessThan(autonomy(free.a));
    expect(voiceOf(drafted.a, 'player')?.trust ?? 1).toBeLessThan(voiceOf(free.a, 'player')?.trust ?? 0.5);
    expect(drafted.a.body.alive).toBe(true);
    // Deterministic: the same controlled run twice is identical.
    expect(JSON.stringify(snapshot(run(true).a))).toBe(JSON.stringify(snapshot(drafted.a)));
  });

  test('dropping the entry from `controlled` releases him', () => {
    const people = ids.map((id, k) => createPerson(villagerSpec(id, id, k + 1, { others: ids })));
    const world = createVillage(people, { seed: 3 });
    const c = createCommunity(people);
    const start = people[0]?.now ?? 0;
    const cmd = { voiceId: 'player', action: 'work-field', since: start, repeat: true };
    stepCommunity(c, world, start + 120, { controlled: { a: cmd } });
    const a = c.people.find((p) => p.id === 'a') as Person;
    expect(a.will.command).toBeDefined();
    const events = stepCommunity(c, world, start + 240, { controlled: {} });
    expect(a.will.command).toBeUndefined();
    expect(events.some((e) => e.kind === 'release' && e.personId === 'a')).toBe(true);
  });
});
