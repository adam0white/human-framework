/** Retained inverse-pressure regression. Other review findings map to their faculty controls in TESTCASE-FATES. */
import { expect, test } from 'vitest';
import { commitmentPressure, pressureReachedAt } from '../src/agenda/agenda.ts';
import type { Commitment } from '../src/run-schema.ts';

test('pressureReachedAt inverts commitmentPressure inside the millisecond window', () => {
  const minute = 60_000;
  const commitment: Commitment = {
    id: 'duty',
    kind: 'job',
    actions: ['care'],
    from: 960 * minute,
    until: 1140 * minute,
    importance: 1,
    status: 'pending',
  };
  const before = structuredClone(commitment);
  const at = pressureReachedAt(commitment, 0.9);
  if (at === undefined) throw new Error('Missing reachable pressure boundary');
  expect(Number.isSafeInteger(at)).toBe(true);
  expect(commitmentPressure(commitment, at)).toBeGreaterThanOrEqual(0.9);
  expect(commitmentPressure(commitment, at - 1)).toBeLessThan(0.9);
  expect(pressureReachedAt(commitment, 1.1)).toBeUndefined();
  expect(commitment).toStrictEqual(before);
});
