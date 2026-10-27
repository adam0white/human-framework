/** SCOPE: 4.0.1 joins validation paths only when an issue is reported. The reported paths are unchanged. */
import { expect, test } from 'vitest';
import { validateNumbers } from '../src/body/span.ts';
import { validateNarrativeJson } from '../src/memory/memory.ts';

test('narrative validation reports each issue at its own nested path', () => {
  const value = JSON.parse('{"episodes":[{"summary":"café","tags":["ok"]},{"n":1}],"x":{"constructor":1}}');
  value.episodes[1].n = Number.NaN;
  expect(validateNarrativeJson(value, 'memory').map((issue) => [issue.path, issue.message])).toEqual([
    ['memory.episodes.0.summary', 'Noncanonical string'],
    ['memory.episodes.1.n', 'Nonfinite number'],
    ['memory.x', 'Reserved property key'],
  ]);
  expect(validateNarrativeJson({ a: 'plain ASCII', b: 'café' })).toEqual([]);
});

test('numerical validation reports a nonfinite number at its nested path', () => {
  expect(validateNumbers({ c: { cells: [1, Number.POSITIVE_INFINITY] } }).map((issue) => issue.path)).toEqual(
    ['state.c.cells.1'],
  );
});
