import { createHash } from 'node:crypto';
import { describe, expect, test } from 'vitest';
import {
  runUpbringingControl,
  upbringingFixture,
  upbringingRoutine,
} from '../examples/upbringing-warmth-control.ts';
import {
  attachmentOf,
  communityState,
  createCommunity,
  ENGINE_VERSION,
  liveCommunity,
  raise,
  restore,
  seedTie,
  snapshot,
} from '../src/index.ts';
import { MINUTES_PER_DAY as DAY, MINUTES_PER_YEAR as YEAR } from '../src/types.ts';

const model = { model: 'warmth-through-25' } as const;
const hash = (x: unknown) => createHash('sha256').update(JSON.stringify(x)).digest('hex');
// Goldens were measured at engine2.23; every other snapshot leaf remains exact.
const legacySnapshot = (p: Parameters<typeof snapshot>[0]) => {
  const saved = snapshot(p);
  expect(saved.engine).toBe(ENGINE_VERSION);
  saved.engine = '2.23.0';
  return saved;
};
const copy = <T>(x: T): T => JSON.parse(JSON.stringify(x));
const conviction = (p: ReturnType<typeof upbringingFixture>['child']) =>
  p.conscience.norms.find((n) => n.normId === 'lying')?.conviction ?? 0;

function direct(warmth: number, age = 18) {
  const f = upbringingFixture(age, warmth);
  const rng = copy(f.child.rng);
  const response = raise(f.child, { caregivers: [f.carer] }, YEAR, model);
  expect(f.child.rng).toEqual(rng);
  return { ...f, response };
}

function routine(age: number, roles: string[], mode = true) {
  const f = upbringingFixture(age, 0.8, roles);
  liveCommunity(f.community, DAY, {
    routineFor: upbringingRoutine,
    ...(mode ? { upbringing: model } : {}),
  });
  return f;
}

describe('opt-in warmth through young adulthood (Q30/Q31/Q32)', () => {
  test('zero warmth follows responsiveness while omitted and absent care retain their boundary', () => {
    const cold = upbringingFixture(0, 0);
    const tiny = upbringingFixture(0, 1e-8);
    const omitted = upbringingFixture(0, 0);
    const absent = upbringingFixture(0, 0);
    const rng = copy(cold.child.rng);
    raise(cold.child, { caregivers: [cold.carer] }, YEAR, model);
    raise(tiny.child, { caregivers: [tiny.carer] }, YEAR, model);
    raise(omitted.child, { caregivers: [omitted.carer] }, YEAR);
    raise(absent.child, { caregivers: [] }, YEAR, model);
    // Existing formula at warmth 0 and mood +1 gives responsiveness 0.3.
    expect(attachmentOf(cold.child)).toBeCloseTo(0.45, 14);
    expect(attachmentOf(cold.child)).toBeLessThan(attachmentOf(tiny.child));
    expect(attachmentOf(omitted.child)).toBe(0.6);
    expect(attachmentOf(absent.child)).toBe(0.6);
    expect(cold.child.rng).toEqual(rng);
  });

  test('low warmth does not slow attachment response to unresponsive caregiving', () => {
    const opted = upbringingFixture(0, 0.1);
    const legacy = upbringingFixture(0, 0.1);
    raise(opted.child, { caregivers: [opted.carer] }, YEAR, model);
    raise(legacy.child, { caregivers: [legacy.carer] }, YEAR);
    expect(attachmentOf(opted.child)).toBe(attachmentOf(legacy.child));
    expect(attachmentOf(opted.child)).toBeLessThan(0.52);
  });
  test('zero teaches nothing; tiny warmth has tiny norm and returned effects; attachment follows responsiveness', () => {
    const zero = direct(0);
    const tiny = direct(1e-8);
    const ordinary = direct(0.8);
    expect(zero.child.values.tradition).toBe(0.2);
    expect(conviction(zero.child)).toBe(0.2);
    expect(attachmentOf(zero.child)).toBeLessThan(attachmentOf(tiny.child));
    expect(zero.response).toBe(0);
    expect(zero.child.family?.raisedMinutes).toBe(YEAR);
    expect(conviction(tiny.child)).toBeGreaterThan(0.2);
    expect(conviction(tiny.child) - 0.2).toBeLessThan(1e-8);
    expect(attachmentOf(tiny.child)).toBeLessThan(0.6);
    expect(tiny.response).toBeGreaterThan(0);
    expect(tiny.response).toBeLessThan(1e-8);
    expect(conviction(ordinary.child)).toBeGreaterThan(conviction(tiny.child));
    expect(attachmentOf(ordinary.child)).toBeGreaterThan(0.6);
    expect(ordinary.child.conscience.norms[0]?.standing).toBe('forbidden');
  });

  test('routine guardians teach; unrelated, dead and self caregivers do not; roles count once', () => {
    const guardian = routine(18, ['guardian']);
    expect(guardian.child.family?.raisedMinutes).toBe(240);
    expect(guardian.child.values.tradition).toBeGreaterThan(0.2);
    expect(routine(18, []).child.family?.raisedMinutes).toBeUndefined();
    const dual = routine(18, ['parent', 'guardian']).child;
    expect(dual.values).toEqual(guardian.child.values);
    expect(dual.family).toEqual(guardian.child.family);
    expect(dual.conscience).toEqual(guardian.child.conscience);
    expect(dual.rng).toEqual(guardian.child.rng);
    const f = upbringingFixture();
    f.carer.body.alive = false;
    seedTie(f.child, { otherId: f.child.id, roles: ['guardian'], affection: 1 });
    liveCommunity(f.community, DAY, { routineFor: upbringingRoutine, upbringing: model });
    expect(f.child.family?.raisedMinutes).toBeUndefined();
    const before = snapshot(f.child);
    expect(raise(f.child, { caregivers: [f.carer, f.child] }, YEAR, model)).toBe(0);
    expect(f.child.values).toEqual(before.values);
    expect(f.child.conscience).toEqual(before.conscience);
    expect(f.child.family?.raisedMinutes).toBe(YEAR);
    const cold = upbringingFixture(18, 0);
    liveCommunity(cold.community, DAY, { routineFor: upbringingRoutine, upbringing: model });
    expect(cold.child.values.tradition).toBe(0.2); // child-to-guardian affection does not supply warmth
    const tiny = upbringingFixture(18, 1e-8);
    liveCommunity(tiny.community, DAY, { routineFor: upbringingRoutine, upbringing: model });
    expect(conviction(tiny.child) - conviction(cold.child)).toBeLessThan(1e-8);
    expect(attachmentOf(cold.child)).toBeLessThan(attachmentOf(tiny.child));
    expect(conviction(guardian.child)).toBeGreaterThan(conviction(tiny.child));
    expect(tiny.child.rng).toEqual(cold.child.rng);
  });

  test('direct and routine influence continue across 18, taper toward 25 and stop at 25', () => {
    const before18 = direct(0.8, 18 - 1e-6);
    const at18 = direct(0.8, 18);
    const at24 = direct(0.8, 24);
    const near25 = direct(0.8, 25 - 1e-6);
    const at25 = direct(0.8, 25);
    expect(before18.response - at18.response).toBeLessThan(1e-6);
    expect(at18.child.values.tradition).toBeGreaterThan(at24.child.values.tradition);
    expect(at24.child.values.tradition).toBeGreaterThan(0.2);
    expect(near25.response).toBeLessThan(1e-6);
    expect(attachmentOf(near25.child)).toBeCloseTo(0.6, 7);
    expect(at25.response).toBe(0);
    expect(at25.child.values.tradition).toBe(0.2);
    expect(conviction(at25.child)).toBe(0.2);
    expect(attachmentOf(at25.child)).toBe(0.6);
    expect(at25.child.family?.raisedMinutes).toBe(YEAR);
    expect(routine(17, ['parent']).child.family?.raisedMinutes).toBe(240);
    expect(routine(18, ['guardian']).child.family?.raisedMinutes).toBe(240);
    expect(routine(24, ['guardian']).child.family?.raisedMinutes).toBe(240);
    expect(routine(25, ['parent']).child.family?.raisedMinutes).toBeUndefined();
    expect(routine(18, ['parent'], false).child.family?.raisedMinutes).toBeUndefined();
  });

  test('duplicate direct caregiver IDs do not change relative influence in new mode', () => {
    const a = upbringingFixture();
    const b = upbringingFixture();
    const other = upbringingFixture(18, 0.2).carer;
    other.id = 'other';
    other.values.tradition = 0.1;
    const one = raise(a.child, { caregivers: [a.carer, other] }, YEAR, model);
    const two = raise(b.child, { caregivers: [b.carer, b.carer, copy(other)] }, YEAR, model);
    expect(two).toBe(one);
    expect(b.child).toEqual(a.child);
  });

  test('host-pinned options resume exactly; restoring a person does not infer the model', () => {
    const a = upbringingFixture();
    liveCommunity(a.community, DAY, { routineFor: upbringingRoutine, upbringing: model });
    const saved = copy({
      people: a.community.people.map(snapshot),
      state: communityState(a.community),
      upbringing: model,
    });
    const resumed = createCommunity(saved.people.map(restore), saved.state);
    const omitted = createCommunity(saved.people.map(restore), copy(saved.state));
    liveCommunity(a.community, 3 * DAY, { routineFor: upbringingRoutine, upbringing: model });
    liveCommunity(resumed, 3 * DAY, { routineFor: upbringingRoutine, upbringing: saved.upbringing });
    liveCommunity(omitted, 3 * DAY, { routineFor: upbringingRoutine });
    expect(resumed.people.map(snapshot)).toEqual(a.community.people.map(snapshot));
    expect(communityState(resumed)).toEqual(communityState(a.community));
    expect(omitted.people.find((p) => p.id === 'child')?.family?.raisedMinutes).toBe(240);
    const child = restore(snapshot(a.child));
    const control = copy(a.child);
    const r1 = raise(child, { caregivers: [a.carer] }, YEAR, saved.upbringing);
    const r2 = raise(control, { caregivers: [a.carer] }, YEAR, model);
    expect(r1).toBe(r2);
    expect(child).toEqual(control);
  });

  test('omitted options retain captured pre-change full-state and response hashes', () => {
    const a = upbringingFixture(18, 1e-8);
    const response = raise(a.child, { caregivers: [a.carer] }, YEAR);
    expect(hash({ response, people: [a.child, a.carer].map(legacySnapshot) })).toBe(
      '673a89a3f45894a49d9f4d7ebda8bbf2090eedccc2452c2f39eb8c73ab9e6412',
    );
    const b = upbringingFixture(17, 0.8, ['parent']);
    liveCommunity(b.community, 4 * DAY, { routineFor: upbringingRoutine });
    expect(hash({ people: b.community.people.map(legacySnapshot), state: communityState(b.community) })).toBe(
      '3a49f56bd8b0d200b11d76735cb69711b0f2c5212e905785c8b92ee4d1e2c2f0',
    );
    const resumedFixture = upbringingFixture(17, 0.8, ['parent']);
    liveCommunity(resumedFixture.community, 2 * DAY, { routineFor: upbringingRoutine });
    const resumed = createCommunity(
      resumedFixture.community.people.map((p) => restore(copy(snapshot(p)))),
      copy(communityState(resumedFixture.community)),
    );
    liveCommunity(resumed, 4 * DAY, { routineFor: upbringingRoutine });
    expect(resumed.people.map(snapshot)).toEqual(b.community.people.map(snapshot));
    expect(communityState(resumed)).toEqual(communityState(b.community));
  });

  test('headless control', runUpbringingControl);
});
