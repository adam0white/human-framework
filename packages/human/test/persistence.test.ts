import { expect, test } from 'vitest';
import type { Affordance, Person, ReceivedConsequence } from '../src/index.ts';
import * as hf from '../src/index.ts';
import { optInContinuation } from './opt-in-continuation-fixture.ts';
import { persistenceContinuation } from './persistence-continuation-fixture.ts';

function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error('Missing test fixture');
  return value;
}
const goal = (p: Person, i = 0) => required(p.agenda.goals[i]);

const offer = (action: string, extra: Partial<Affordance> = {}): Affordance => ({
  id: action,
  action,
  label: action,
  duration: 1,
  effort: 0.05,
  advertises: {},
  ...extra,
});
const work = offer('work');
const pastime = offer('pastime', { material: 2 });
function maintain(p: Person): void {
  p.body.satiety = p.body.hydration = 1;
  p.body.sleepPressure = p.body.exertion = 0;
  for (const n of hf.PSYCHOLOGICAL_NEEDS) p.needs[n] = 1;
  p.needs.safety = 1;
  p.affect.emotions = [];
}
function person(on = true): Person {
  const p = hf.createPerson({
    id: 'p',
    name: 'P',
    seed: 7,
    now: 600,
    bornAt: -30 * 365 * 1440,
    sex: 'female',
    enable: { persistence: on, curiosity: true },
    goals: [
      {
        id: 'task',
        label: 'Task',
        serves: ['achievement'],
        importance: 0.6,
        advancedBy: [{ action: 'work', amount: 0.1 }],
      },
    ],
  });
  maintain(p);
  return p;
}
function terms(p: Person, a: Affordance) {
  const r = hf.readPerson(p);
  return hf.consider(p, a, {
    ...r,
    now: p.now,
    mods: hf.lifeModifiers(p),
    tendencies: {},
    habit: { now: p.now },
  }).terms;
}
function start(p: Person, a = work): void {
  hf.begin(p, a, hf.decide(p, [a]));
}
function finish(p: Person, a = work): void {
  hf.finish(p, { affordanceId: a.id, action: a.action, status: 'completed', at: p.now + a.duration });
}
const pursuitTerms = (p: Person, a: Affordance) => terms(p, a).filter((t) => t.source.startsWith('pursuit:'));

test('a begun goal cues later means, taxes idle and pastime, and beats relaxed novelty', () => {
  const p = person();
  expect(hf.pursuitOf(p)).toBeUndefined();
  start(p);
  finish(p);
  maintain(p);
  expect(pursuitTerms(p, work)[0]?.source).toBe('pursuit:task');
  expect(pursuitTerms(p, pastime)[0]?.value).toBeLessThan(0);
  expect(pursuitTerms(p, offer('rest'))[0]?.source).toBe('pursuit:switch');
  expect(hf.decide(p, [work, pastime]).chosenAffordanceId).toBe(work.id);
  const before = hf.snapshot(p);
  const read = hf.pursuitOf(p);
  if (read) read.strength = 0;
  terms(p, work);
  expect(hf.snapshot(p)).toEqual(before);
});

test('hunger interrupts for food; a short meal leaves the pursuit for resumption', () => {
  const p = person();
  start(p);
  finish(p);
  maintain(p);
  p.body.satiety = 0;
  const meal = offer('eat', { advertises: { food: 1 }, duration: 5 });
  const d = hf.decide(p, [work, meal]);
  expect(d.chosenAffordanceId).toBe(meal.id);
  hf.begin(p, meal, d);
  finish(p, meal);
  maintain(p);
  expect(hf.pursuitOf(p)?.goalId).toBe('task');
  expect(hf.decide(p, [work, pastime]).chosenAffordanceId).toBe(work.id);
});

test('an open pressing commitment wins and its option pays no switch cost', () => {
  const p = person();
  start(p);
  finish(p);
  maintain(p);
  const c = hf.promise(p, {
    kind: 'promise',
    label: 'Visit',
    actions: ['visit'],
    from: p.now - 8,
    until: p.now + 2,
    importance: 1,
  });
  const duty = offer('visit', { fulfills: [c.id] });
  expect(terms(p, duty).some((t) => t.source === `commitment:${c.id}`)).toBe(true);
  expect(pursuitTerms(p, duty)).toEqual([]);
  expect(hf.decide(p, [work, duty]).chosenAffordanceId).toBe(duty.id);
  start(p, duty);
  finish(p, duty);
  expect(hf.pursuitOf(p)?.goalId).toBe('task');
});

test('an attended fear percept closes both pursuit terms without releasing it', () => {
  const p = person();
  start(p);
  finish(p);
  maintain(p);
  hf.perceive(p, [
    {
      at: p.now,
      channel: 'saw',
      kind: 'threat',
      salience: 1,
      summary: 'Danger',
      threat: { severity: 1, chance: 1 },
    },
  ]);
  expect(hf.emotionLevel(p, 'fear')).toBe(1);
  expect(pursuitTerms(p, work)).toEqual([]);
  expect(pursuitTerms(p, pastime)).toEqual([]);
  expect(hf.pursuitOf(p)).toBeDefined();
});

test('slack releases inactivity; repeated service preserves since until max time', () => {
  const p = person();
  start(p);
  finish(p);
  hf.tick(p, 619);
  expect(hf.pursuitOf(p)).toBeDefined();
  hf.tick(p, 620);
  expect(hf.pursuitOf(p)).toBeUndefined();
  const q = person();
  hf.enablePersistence(q, { slackMinutes: 20, maxMinutes: 30 });
  start(q);
  finish(q);
  hf.tick(q, 610);
  start(q);
  finish(q);
  hf.tick(q, 620);
  start(q);
  finish(q);
  expect(hf.pursuitOf(q)?.since).toBe(600);
  hf.tick(q, 630);
  expect(hf.pursuitOf(q)).toBeUndefined();
});

test('finish releases achieved goals; tick releases abandoned or removed goals', () => {
  const p = person();
  start(p);
  const g = goal(p);
  g.progress = 0.95;
  finish(p);
  expect(g.status).toBe('achieved');
  expect(hf.pursuitOf(p)).toBeUndefined();
  const q = person();
  start(q);
  goal(q).status = 'abandoned';
  hf.tick(q, q.now);
  expect(hf.pursuitOf(q)).toBeUndefined();
  const r = person();
  start(r);
  r.agenda.goals = [];
  hf.tick(r, r.now + 1);
  expect(hf.pursuitOf(r)).toBeUndefined();
});

test('maximum duration rests only that goal across restore until the refractory interval ends', () => {
  const p = person();
  hf.enablePersistence(p, { maxMinutes: 2 });
  start(p);
  finish(p);
  start(p);
  finish(p);
  expect(hf.pursuitOf(p)).toBeUndefined();
  const saved = hf.snapshot(p);
  const q = hf.restore(JSON.parse(JSON.stringify(saved)));
  expect(q).toEqual(p);
  const ordinaryTerms = terms(q, work).filter((t) => t.source.startsWith('goal:'));
  start(q);
  expect(hf.pursuitOf(q)).toBeUndefined();
  expect(terms(q, work).filter((t) => t.source.startsWith('goal:'))).toEqual(ordinaryTerms);
  expect(q.pursuit).toMatchObject({ rested: { goalId: 'task', until: 622 } });
  hf.enablePersistence(q, { maxMinutes: 2, restMinutes: 1 });
  expect(hf.restore(hf.snapshot(q)).pursuit).toEqual(q.pursuit);
  q.agenda.goals.push({
    ...structuredClone(goal(q)),
    id: 'other',
    advancedBy: [{ action: 'other', amount: 0.1 }],
  });
  start(q, offer('other'));
  expect(hf.pursuitOf(q)?.goalId).toBe('other');
  const resumed = hf.restore(saved);
  hf.tick(resumed, 621);
  start(resumed);
  expect(hf.pursuitOf(resumed)).toBeUndefined();
  hf.tick(resumed, 622);
  start(resumed);
  expect(hf.pursuitOf(resumed)).toMatchObject({ goalId: 'task', since: 622 });
  expect(resumed.pursuit).not.toHaveProperty('rested');
  const invalid = JSON.parse(JSON.stringify(saved));
  invalid.pursuit.rested = { goalId: 'task', until: 1e12 };
  expect(hf.restore(invalid).pursuit).toBeUndefined();
});

test('goal switching compares goal terms on the begun option with a strict margin; ties use id', () => {
  const p = person();
  start(p);
  finish(p);
  const g = goal(p);
  p.agenda.goals.push({
    ...structuredClone(g),
    id: 'b',
    importance: 0.2,
    advancedBy: [{ action: 'other', amount: 0.1 }],
  });
  const other = offer('other');
  start(p, other);
  finish(p, other);
  expect(hf.pursuitOf(p)?.goalId).toBe('task');
  goal(p, 1).importance = 0.8;
  start(p, other);
  expect(hf.pursuitOf(p)?.goalId).toBe('b');
  const q = person();
  q.agenda.goals.push({ ...structuredClone(goal(q)), id: 'a' });
  start(q);
  expect(hf.pursuitOf(q)?.goalId).toBe('a');
});

test('begin without a considered entry recomputes direct and planned goal credit without RNG', () => {
  const p = person();
  const record = hf.decide(p, [pastime]);
  const rng = structuredClone(p.rng);
  hf.begin(p, work, record);
  expect(hf.pursuitOf(p)?.goalId).toBe('task');
  expect(p.rng).toEqual(rng);
  const q = person();
  hf.enablePlanning(q, { depth: 3 });
  goal(q).temporal = { halfLifeMinutes: 120 };
  hf.seedConsequences(q, 'host', [claim('one', 'prepare', 'work')]);
  const d = hf.decide(q, [pastime]);
  const before = structuredClone(q.rng);
  hf.begin(q, offer('prepare'), d);
  expect(hf.pursuitOf(q)?.goalId).toBe('task');
  expect(q.rng).toEqual(before);
});

test('JSON round trip preserves pursuit and continuation; restore rejects malformed or future state', () => {
  const p = person();
  hf.enablePersistence(p, { slackMinutes: 25 });
  start(p);
  finish(p);
  const saved = hf.snapshot(p);
  const q = hf.restore(JSON.parse(JSON.stringify(saved)));
  expect(q).toEqual(p);
  start(p);
  finish(p);
  start(q);
  finish(q);
  expect(hf.fingerprint(q)).toBe(hf.fingerprint(p));
  const bad = hf.snapshot(p);
  required(required(bad.pursuit).current).lastServedAt = p.now + 1;
  expect(hf.restore(bad).pursuit).toBeUndefined();
  const invalid = hf.snapshot(p);
  required(invalid.pursuit).spec = { maxMinutes: Number.NaN };
  expect(hf.restore(invalid).pursuit).toBeUndefined();
});

function claim(id: string, trigger: string, successor: string, revision = 0): ReceivedConsequence {
  return {
    id,
    revision,
    trigger: { action: trigger },
    successor: { action: successor, duration: 1, effort: 0.05 },
    availableFrom: 600,
    availableUntil: 1000,
    expiresAt: 1100,
    chance: 1,
    confidence: 1,
  };
}
/** Separable 90-minute headless arm for the lead's projects-control. Both arms begin one first step.
 * The host offers only the available step plus a pleasant distraction. Only put advances its temporal goal.
 * Bodily and psychological needs are held met to isolate persistence. No projects faculty is used.
 */
export function persistenceChainControl(on: boolean): number {
  const p = person(on);
  hf.enablePlanning(p, { depth: 3 });
  const g = goal(p);
  g.importance = 0.8;
  g.advancedBy = [{ action: 'put', amount: 1 / 30 }];
  g.temporal = { halfLifeMinutes: 120 };
  let stage = 0;
  let completed = 0;
  const actions = ['prepare', 'take', 'put'];
  const seed = () =>
    hf.seedConsequences(p, 'host', [
      claim('one', 'prepare', 'take', completed),
      claim('two', 'take', 'put', completed),
    ]);
  seed();
  for (let minute = 0; minute < 90; minute++) {
    maintain(p);
    const step = offer(required(actions[stage]));
    const d = hf.decide(p, minute === 0 ? [step] : [step, pastime]);
    const chosen = d.chosenAffordanceId === step.id ? step : pastime;
    hf.begin(p, chosen, d);
    finish(p, chosen);
    if (chosen === step) {
      stage += 1;
      if (stage === 3) {
        completed += 1;
        stage = 0;
        seed();
      }
    }
  }
  return completed;
}

test('headless three-step temporal chains finish more often with persistence over 90 minutes', () => {
  const off = persistenceChainControl(false);
  const on = persistenceChainControl(true);
  console.log('Persistence chain control (90 minutes):', { on, off });
  expect(on).toBeGreaterThan(off);
});

test('without persistence the main opt-in continuation digests are unchanged', () => {
  expect([1, 2, 3].map((seed) => optInContinuation(hf, seed))).toEqual([
    { digest: '7af56da16d1b3414', refs: 1 },
    { digest: 'bc43cc68ccab7d8a', refs: 1 },
    { digest: 'f39ac2679ae3d0f8', refs: 1 },
  ]);
  expect(persistenceContinuation(hf)).toBe(
    '7fc0b68a3d24307fe45c1853b31ad4f6835452c016b25378593fdf84d6244b0e',
  );
  expect(person(false).pursuit).toBeUndefined();
});
