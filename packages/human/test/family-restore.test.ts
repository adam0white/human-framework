import { describe, expect, test } from 'vitest';
import { conceive, createPerson, deliver, restore, snapshot, tick } from '../src/index.ts';

function pregnantPerson() {
  const person = createPerson({
    id: 'mother',
    name: 'Mother',
    seed: 31,
    now: 360,
    bornAt: -14_000_000,
    sex: 'female',
    family: { aptitudes: { smith: 1.25 }, attachment: 0.7 },
  });
  conceive(person, 'father', 19, person.now);
  return person;
}

describe('family restore', () => {
  test.each(['conceivedAt', 'dueAt', 'seed'] as const)(
    'drops a pregnancy with non-finite %s and retains usable family fields',
    (field) => {
      for (const value of [NaN, Infinity, -Infinity]) {
        // Mutate the structured snapshot: JSON.stringify would replace these with null.
        const saved = snapshot(pregnantPerson());
        const pregnancy = saved.family?.pregnancy;
        if (!pregnancy) throw new Error('fixture must have a pregnancy');
        pregnancy[field] = value;
        expect(restore(saved).family).toEqual({ aptitudes: { smith: 1.25 }, attachment: 0.7 });
        saved.family = { pregnancy };
        expect(restore(saved).family).toBeUndefined();
      }
    },
  );

  test('an engine-produced pregnancy restores and continues exactly through birth', () => {
    const original = pregnantPerson();
    const saved = snapshot(original);
    const restored = restore(JSON.parse(JSON.stringify(saved)));
    expect(snapshot(restored)).toEqual(saved);
    const dueAt = original.family?.pregnancy?.dueAt;
    if (dueAt === undefined) throw new Error('fixture must have a due date');
    // A headless uninterrupted/restored control, including body effects and birth memory.
    tick(original, original.now + 120);
    tick(restored, restored.now + 120);
    expect(deliver(restored, { id: 'child' }, dueAt)).toEqual(deliver(original, { id: 'child' }, dueAt));
    expect(snapshot(restored)).toEqual(snapshot(original));
  });
});
