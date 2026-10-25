import { createHash } from 'node:crypto';
import { expect, test } from 'vitest';
import { BLADDER_DEFAULTS } from '../src/body/bladder.ts';
import { DOZE_DEFAULTS } from '../src/body/doze.ts';
import {
  advanceBody,
  consume,
  die,
  enableBladder,
  enableDoze,
  estimateQuantity,
  forecastBody,
  nextBodyThreshold,
  nextDozeCheck,
  readBladder,
  readBody,
  readDoze,
  setDozeContext,
  voidBladder,
} from '../src/body/index.ts';
import { lifeModifiers } from '../src/lifecourse/index.ts';
import { begin, createPerson, decide, finish, interrupt, perceive, skip, tick } from '../src/person.ts';
import { restore, snapshot } from '../src/restore.ts';
import type { Affordance, Person } from '../src/types.ts';

const quiet = { posture: 'reclined', stimulation: 0 } as const;
const rest = { effort: 0, focus: 0, mode: 'awake' } as const;
const work: Affordance = {
  id: 'watch',
  action: 'watch',
  label: 'Watch',
  duration: 180,
  effort: 0.1,
  advertises: {},
};
function person(on = true, seed = 1): Person {
  const p = createPerson({
    id: 'p',
    name: 'P',
    seed,
    bornAt: -30 * 365 * 1440,
    sex: 'female',
    now: 120,
    body: { sleepPressure: 1, sleepDebt: 48, hydration: 1 },
  });
  if (on) {
    enableDoze(p, quiet);
    enableBladder(p);
  }
  return p;
}
function onset(p: Person): number {
  for (let t = p.now + 1; t <= 300; t++) {
    tick(p, t);
    if (p.body.doze?.since !== undefined) return t;
  }
  throw new Error('Fixed restricted fixture did not doze');
}
const alarm = (p: Person) => ({
  at: p.now,
  channel: 'heard' as const,
  kind: 'alarm',
  summary: 'An alarm sounds',
  salience: 1,
  targetId: p.id,
});

test('canonical tick schedule, fractional splits and terminal onset preserve draws and sleep timing', () => {
  const a = person();
  const b = person();
  const c = person();
  tick(a, 240);
  for (let t = 121; t <= 240; t++) tick(b, t);
  for (let t = 120.25; t <= 240; t += 0.25) tick(c, t);
  expect(a).toEqual(b);
  expect(c.rng).toEqual(a.rng);
  expect(c.body.doze).toEqual(a.body.doze);
  expect(c.body.sleepPressure).toBeCloseTo(a.body.sleepPressure, 12);
  const p = person();
  const at = onset(p);
  expect(p.body.since).toBe(at);
  const pressure = p.body.sleepPressure;
  tick(p, at);
  expect(p.body.sleepPressure).toBe(pressure);
  tick(p, at + 1);
  expect(p.body.sleepPressure).toBeLessThan(pressure);
});

test('closed gates, reads and direct body integration do not sample onset', () => {
  const p = person();
  setDozeContext(p, { posture: 'upright', stimulation: 0 });
  const rng = structuredClone(p.rng);
  tick(p, 125);
  expect(p.rng).toEqual(rng);
  setDozeContext(p, { posture: 'reclined', stimulation: 1 });
  tick(p, 130);
  expect(p.rng).toEqual(rng);
  p.body.downed = { since: p.now, reason: 'test' };
  setDozeContext(p, quiet);
  tick(p, 135);
  expect(p.rng).toEqual(rng);
  delete p.body.downed;
  p.body.sleepPressure = 0;
  p.body.sleepDebt = 0;
  tick(p, 136);
  expect(p.rng).toEqual(rng);
  advanceBody(p, 1, rest, lifeModifiers(p));
  expect(p.rng).toEqual(rng);
  const before = snapshot(p);
  readBody(p);
  readDoze(p);
  readBladder(p);
  nextDozeCheck(p);
  forecastBody(p, [{ label: 'rest', duration: 5, load: rest }], lifeModifiers(p));
  nextBodyThreshold(p, rest, lifeModifiers(p), undefined, 20);
  expect(p).toEqual(before);
});

test('only current detectable waking channels wake before attention; repeated input cannot rewrite sleep', () => {
  const p = person();
  onset(p);
  const before = snapshot(p);
  for (const pc of [
    { ...alarm(p), at: p.now - 1 },
    { ...alarm(p), at: p.now + 1 },
    { ...alarm(p), near: false },
    { ...alarm(p), channel: 'told' as const },
    { ...alarm(p), channel: 'saw' as const },
    { ...alarm(p), targetId: 'other' },
  ])
    expect(perceive(p, [pc])).toEqual([]);
  expect(perceive(p, [])).toEqual([]);
  expect(p).toEqual(before);
  perceive(p, [alarm(p)]);
  expect(p.body.asleep).toBe(false);
  expect(p.body.lastSleep).toEqual({ from: p.now, to: p.now });
  const span = structuredClone(p.body.lastSleep);
  perceive(p, [alarm(p)]);
  expect(p.body.lastSleep).toEqual(span);
});

test('awake begin is blocked, voluntary sleep transfers, finish preserves doze, exact work end wins', () => {
  const p = person();
  onset(p);
  expect(begin(p, work, decide(p, [work]))).toBeNull();
  const since = p.body.since;
  const sleep = { ...work, mode: 'sleep' as const };
  expect(begin(p, sleep, decide(p, [sleep]))).not.toBeNull();
  expect(p.body.doze?.since).toBeUndefined();
  expect(p.body.since).toBe(since);
  const q = person();
  const at = onset(q);
  const r = person();
  const short = { ...work, duration: at - r.now };
  begin(r, short, decide(r, [short]));
  // Align the onset stream after decision setup; the end boundary must not draw.
  r.rng = structuredClone(person().rng);
  tick(r, at - 1);
  const rng = structuredClone(r.rng);
  tick(r, at);
  expect(r.rng).toEqual(rng);
  expect(r.body.asleep).toBe(false);
});

test('bladder counts ingested water once even at full hydration; only awake void drains stored fill', () => {
  const p = person(false);
  enableBladder(p);
  consume(p, { water: 1 });
  expect(p.body.bladder).toEqual({ fill: 0, pending: 0.5 });
  advanceBody(p, 45, rest, lifeModifiers(p));
  expect(p.body.bladder?.pending).toBeCloseTo(0.25, 12);
  expect(readBladder(p)?.urgency).toBeCloseTo(0.295, 12);
  const fill = p.body.bladder?.fill;
  consume(p, { relief: 1, water: -1 });
  expect(p.body.bladder?.fill).toBe(fill);
  const pending = p.body.bladder?.pending;
  consume(p, { water: Number.NaN });
  expect(p.body.bladder?.pending).toBe(pending);
  expect(voidBladder(p)).toBe(true);
  expect(readBladder(p)?.urgency).toBe(0);
  advanceBody(p, 10, { ...rest, mode: 'sleep' }, lifeModifiers(p));
  expect(readBladder(p)?.urgency).toBeGreaterThan(0);
  expect(voidBladder(p)).toBe(false);
  const a = person(false);
  enableBladder(a);
  consume(a, { water: 1 });
  const b = snapshot(a);
  advanceBody(a, 600, rest, lifeModifiers(a));
  for (let i = 0; i < 600; i++) advanceBody(b, 1, rest, lifeModifiers(b));
  expect(a.body.bladder?.fill).toBe(1);
  expect(b.body.bladder?.fill).toBe(1);
  expect(a.body.bladder?.pending).toBeCloseTo(b.body.bladder?.pending ?? -1, 12);
});

test('explicit estimates validate before drawing and separate truth error from awareness', () => {
  const p = person(false);
  const rng = structuredClone(p.rng);
  expect(estimateQuantity(p, { truth: 10, difficulty: 0 })).toEqual({ value: 10, confidence: 1 });
  estimateQuantity(p, { truth: 0, difficulty: 1 });
  for (const input of [
    { truth: -1, difficulty: 1 },
    { truth: 1, difficulty: Number.NaN },
    { truth: Number.MAX_VALUE, difficulty: 1 },
  ])
    expect(() => estimateQuantity(p, input)).toThrow(RangeError);
  expect(p.rng).toEqual(rng);
  const rested = snapshot(p);
  rested.body.sleepPressure = 0;
  rested.body.sleepDebt = 0;
  const tired = estimateQuantity(p, { truth: 10, difficulty: 1 });
  const fresh = estimateQuantity(rested, { truth: 10, difficulty: 1 });
  expect(Math.abs(tired.value - 10)).toBeGreaterThan(Math.abs(fresh.value - 10));
  expect(tired.confidence).toBeGreaterThan(1 - (0.05 + 0.45 * readBody(p).sleepiness));
  // Equal true sleepiness with different debt awareness: offset the pressure contribution.
  const a = person(false);
  a.body.sleepPressure = 0.4;
  a.body.sleepDebt = 8;
  const b = snapshot(a);
  b.body.sleepDebt = 0;
  b.body.sleepPressure += (readBody(a).sleepiness - readBody(b).sleepiness) / 0.7;
  expect(readBody(a).sleepiness).toBeCloseTo(readBody(b).sleepiness, 14);
  const x = estimateQuantity(a, { truth: 10, difficulty: 1 });
  const y = estimateQuantity(b, { truth: 10, difficulty: 1 });
  expect(x.value).toBeCloseTo(y.value, 14);
  expect(x.confidence).toBeGreaterThan(y.confidence);
});

test('mid-doze pending intake restores exactly; forecast, skip, death and malformed slices preserve ownership', () => {
  const p = person();
  consume(p, { water: 1 });
  onset(p);
  const q = restore(JSON.parse(JSON.stringify(snapshot(p))));
  expect(q).toEqual(p);
  const before = snapshot(p);
  forecastBody(p, [{ label: 'rest', duration: 20, load: rest }], lifeModifiers(p));
  nextBodyThreshold(p, rest, lifeModifiers(p), undefined, 20);
  expect(p).toEqual(before);
  for (const r of [p, q]) {
    tick(r, r.now + 5);
    perceive(r, [alarm(r)]);
    estimateQuantity(r, { truth: 5, difficulty: 1 });
    consume(r, { water: 0.5 });
    tick(r, r.now + 10);
  }
  expect(q).toEqual(p);
  const z = person();
  onset(z);
  const bladder = structuredClone(z.body.bladder);
  skip(z, 1000);
  expect(z.body.doze?.since).toBe(1000);
  expect(z.body.bladder).toEqual(bladder);
  die(z);
  expect(z.body.doze?.since).toBeUndefined();
  expect(nextDozeCheck(z)).toBe(Infinity);
  expect(voidBladder(z)).toBe(false);
  const raw = snapshot(person());
  raw.body.doze = { context: quiet, since: raw.now + 1 };
  raw.body.bladder = { fill: 2, pending: 9 };
  const fixed = restore(raw);
  expect(fixed.body.doze).toEqual({ context: quiet });
  expect(fixed.body.bladder).toEqual({ fill: 1, pending: 4 });
  (raw.body as unknown as Record<string, unknown>).doze = { context: [] };
  (raw.body as unknown as Record<string, unknown>).bladder = { fill: 0, pending: Infinity };
  const dropped = restore(raw);
  expect(dropped.body.doze).toBeUndefined();
  expect(dropped.body.bladder).toBeUndefined();
});

test('absent opt-in matches published 2.20 with only the engine stamp normalized', () => {
  const p = person(false);
  tick(p, 180);
  consume(p, { water: 0.4, food: 0.2 });
  tick(p, 300);
  expect(Object.hasOwn(p.body, 'doze')).toBe(false);
  expect(Object.hasOwn(p.body, 'bladder')).toBe(false);
  expect(
    createHash('sha256')
      .update(JSON.stringify({ ...p, engine: '2.17.0' }))
      .digest('hex'),
  ).toBe('fabbd25f68fd8ee36e7f470cea3e3e58063b9785a936abfb77ee68101e4bdc34');
});

test('creation and runtime opt-ins match without draws; enable is idempotent and fractional restore does not sample', () => {
  const a = person();
  const b = createPerson({
    id: 'p',
    name: 'P',
    seed: 1,
    bornAt: -30 * 365 * 1440,
    sex: 'female',
    now: 120,
    body: { sleepPressure: 1, sleepDebt: 48, hydration: 1 },
    enable: { doze: quiet, bladder: true },
  });
  expect(a).toEqual(b);
  onset(a);
  const before = snapshot(a);
  enableDoze(a, { posture: 'upright', stimulation: 1 });
  enableBladder(a);
  expect(a).toEqual(before);
  const p = person();
  tick(p, 120.5);
  const rng = structuredClone(p.rng);
  const q = restore(JSON.parse(JSON.stringify(p)));
  expect(q).toEqual(p);
  expect(q.rng).toEqual(rng);
  expect(nextDozeCheck(q)).toBe(121);
  const asleep = person();
  advanceBody(asleep, 0, { ...rest, mode: 'sleep' }, lifeModifiers(asleep));
  // A real voluntary sleep activity keeps its legacy mode through tick.
  const sleep = { ...work, mode: 'sleep' as const };
  begin(asleep, sleep, decide(asleep, [sleep]));
  const afterBegin = structuredClone(asleep.rng);
  tick(asleep, 125);
  expect(asleep.rng).toEqual(afterBegin);
  expect(asleep.body.doze?.since).toBeUndefined();
});

test('unresolved doze stops work load and practice, preserves prior interrupt, and stays stopped after an alarm', () => {
  const p = person();
  const skilled = {
    ...work,
    effort: 1,
    focus: 1,
    tags: ['exercise'],
    skill: { id: 'watch', difficulty: 0.5 },
  };
  begin(p, skilled, decide(p, [skilled]));
  interrupt(p, p.now, 'host:stop');
  const at = onset(p);
  expect(p.activity?.interrupt?.reason).toBe('host:stop');
  const stopped = snapshot(p);
  stopped.activity = null;
  tick(p, at + 10);
  tick(stopped, at + 10);
  expect(p.body).toEqual(stopped.body);
  expect(p.needs).toEqual(stopped.needs);
  perceive(p, [alarm(p)]);
  perceive(stopped, [alarm(stopped)]);
  tick(p, at + 20);
  tick(stopped, at + 20);
  expect(p.body).toEqual(stopped.body);
  expect(p.needs).toEqual(stopped.needs);
  finish(p, { at: p.now, action: skilled.action, affordanceId: skilled.id, status: 'interrupted' });
  expect(p.skills.watch?.practice).toBe(at - 120);
});

test('new body defaults cannot be mutated outside saved state', () => {
  expect(Object.isFrozen(DOZE_DEFAULTS)).toBe(true);
  expect(Object.isFrozen(BLADDER_DEFAULTS)).toBe(true);
});
