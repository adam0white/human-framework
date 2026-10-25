import { expect, test } from 'vitest';
import * as H from '../src/index.ts';

// Checked by tsc, never executed: v3 deliberately rejects these former public forms.
function rejectedForms(p: H.Person, q: H.Person, routine: H.Routine) {
  // @ts-expect-error Removed composite name.
  H.glimpseOf(p, q, 0);
  // @ts-expect-error Removed composite name.
  H.acquaintWith(p, q, 1, 0);
  // @ts-expect-error Use TRAIT_KEYS.
  H.TRAIT_NAMES;
  // @ts-expect-error Internal enumeration helper is not public.
  H.keysOf({});
  // @ts-expect-error Use sigmoid.
  H.expit(0);
  // @ts-expect-error Time is positional.
  H.glimpse(p, q.id, H.outwardSigns(q), { at: 0 });
  // @ts-expect-error Time is positional.
  H.glimpsePerson(p, q, { at: 0 });
  // @ts-expect-error Time is positional.
  H.hear(p, q.id, 'fear', 0.5, { at: 0 });
  // @ts-expect-error Seed and time are positional.
  H.conceive(p, q, { seed: 1, at: 0 });
  // @ts-expect-error Time precedes the optional retelling knobs.
  H.retell(p, q, { at: 0 });
  // @ts-expect-error No unused time argument.
  H.repent(p, 'breach', 0);
  // @ts-expect-error No unused time argument.
  H.recordRepair(p, q.id, 0);
  // @ts-expect-error Wrap a fixed routine in a callable source.
  H.liveRoutine(p, 1440, routine);
  // @ts-expect-error Capture community in a closure instead of a required third argument.
  const source: H.RoutineSource = (_p: H.Person, _day: number, _c: H.Community) => routine;
  return source;
}
void rejectedForms;

test('v3 exposes Person composites and removes the old exports', () => {
  expect(H.glimpsePerson).toBeTypeOf('function');
  expect(H.acquaintPerson).toBeTypeOf('function');
  for (const key of ['glimpseOf', 'acquaintWith', 'TRAIT_NAMES', 'expit', 'keysOf'])
    expect(Object.hasOwn(H, key)).toBe(false);
});

test('one callable routine source runs at the start of each day in both drivers', () => {
  const day = H.MINUTES_PER_DAY;
  const make = (id: string) =>
    H.createPerson({ id, name: id, seed: 7, bornAt: -30 * H.MINUTES_PER_YEAR, sex: 'male' });
  const p = make('a');
  const calls: string[] = [];
  const source: H.RoutineSource = (person, d) => {
    calls.push(`${person.id}:${d}:${person.now}`);
    return { activities: [] };
  };
  H.liveRoutine(p, 2 * day, source);
  expect(calls).toEqual(['a:0:0', 'a:1:1440']);
  calls.length = 0;
  const c = H.createCommunity([make('b'), make('a')]);
  H.liveCommunity(c, 2 * day, {
    routineFor: (person, d) => {
      calls.push(`clocks:${c.people.map((q) => q.now).join(',')}`);
      return source(person, d);
    },
    onDay: (_c, d) => calls.push(`dawn:${d}`),
  });
  expect(calls).toEqual([
    'dawn:0',
    'clocks:0,0',
    'a:0:0',
    'clocks:1440,0',
    'b:0:0',
    'dawn:1',
    'clocks:1440,1440',
    'a:1:1440',
    'clocks:2880,1440',
    'b:1:1440',
  ]);
});

test.each(['glimpse', 'glimpsePerson', 'hear', 'conceive', 'retell'] as const)(
  'rejects the removed %s options form for untyped callers before mutation',
  (name) => {
    const mother = H.createPerson({
      id: 'm',
      name: 'Mother',
      seed: 7,
      bornAt: -30 * H.MINUTES_PER_YEAR,
      sex: 'female',
    });
    const father = H.createPerson({
      id: 'f',
      name: 'Father',
      seed: 8,
      bornAt: -30 * H.MINUTES_PER_YEAR,
      sex: 'male',
    });
    const before = [H.snapshot(mother), H.snapshot(father)];
    const calls = {
      glimpse: () =>
        Reflect.apply(H.glimpse, undefined, [mother, father.id, H.outwardSigns(father), { at: 0 }]),
      glimpsePerson: () => Reflect.apply(H.glimpsePerson, undefined, [mother, father, { at: 0 }]),
      hear: () => Reflect.apply(H.hear, undefined, [mother, father.id, 'fear', 0.5, { at: 0 }]),
      conceive: () => Reflect.apply(H.conceive, undefined, [mother, father, { seed: 1, at: 0 }]),
      retell: () => Reflect.apply(H.retell, undefined, [mother, father, { at: 0 }]),
    };
    expect(calls[name]).toThrow(TypeError);
    expect([H.snapshot(mother), H.snapshot(father)]).toEqual(before);
  },
);
