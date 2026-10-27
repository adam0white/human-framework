import { expect, test } from 'vitest';
import { createPerson, createRun, exportRun } from '../src/index.ts';
import { authoredPerson, exampleSpec, need } from './support.ts';

/** Reorder object keys only; arrays and primitive values retain their meaning. */
function reversedJson(value: unknown): string {
  return JSON.stringify(value, (_key, item) =>
    item !== null && typeof item === 'object' && !Array.isArray(item)
      ? Object.fromEntries(Object.entries(item).reverse())
      : item,
  );
}

test('current archive hashes ignore object insertion order and change for meaningful authored state', () => {
  const spec = exampleSpec(),
    person = authoredPerson('ada', 'Ada');
  const ordinary = need(createRun(spec));
  need(createPerson(ordinary, person));
  const reordered = need(createRun(JSON.parse(reversedJson(spec))));
  need(createPerson(reordered, JSON.parse(reversedJson(person))));
  expect(exportRun(reordered).hashes).toStrictEqual(exportRun(ordinary).hashes);
  const changed = need(createRun(spec)),
    different = structuredClone(person);
  different.state.traits.honesty = 0.9;
  need(createPerson(changed, different));
  expect(exportRun(changed).hashes.current).not.toBe(exportRun(ordinary).hashes.current);
  expect(exportRun(changed).hashes.full).not.toBe(exportRun(ordinary).hashes.full);
});
