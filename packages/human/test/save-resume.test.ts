import { expect, test } from 'vitest';
import { main } from '../examples/community.ts';

test('two same-revision requests settle once and people plus host world continue exactly after restore', () => {
  const result = main();
  expect(result.issuedPairSettled).toBe(true);
  expect(result.currentRevisionChain).toBe(true);
  expect(result.sameContinuation).toBe(true);
  expect(result.replayVerified).toBe(true);
  expect(Object.keys(result.archive.current.people).sort()).toEqual(['ada', 'bora']);
  expect(result.archive.current.pending).toEqual([]);
  expect(result.completed).toBeGreaterThan(1);
  expect(result.archive.current.world.hostState).toMatchObject({ completed: result.completed });
});
