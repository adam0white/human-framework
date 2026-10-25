import { expect, test } from 'vitest';
import { runPlainWorldControl } from '../examples/plain-world-control.ts';

test('world narration is opt-in and preserves model state, RNG and authored summaries', () => {
  expect(runPlainWorldControl()).toEqual({
    unchangedModelState: true,
    unchangedRng: true,
    preservedHostProse: true,
  });
});
