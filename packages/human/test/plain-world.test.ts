import { expect, test } from 'vitest';
import { runPlainWorldControl } from '../examples/plain-world-control.ts';

test('one always-on renderer preserves host prose and perspective reads preserve the full archive and RNG', () => {
  expect(runPlainWorldControl()).toEqual({
    unchangedModelState: true,
    unchangedRng: true,
    preservedHostProse: true,
  });
});
