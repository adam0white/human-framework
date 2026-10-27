import { expect, test } from 'vitest';
import { main } from '../examples/word-and-witness-control.ts';

test('received witnesses and attributed reports shape repair without revealing an unreported witness', () => {
  const result = main();
  expect(result.sawWitnessChanged).toBe(true);
  expect(result.secretWitnessReceived).toBe(true);
  expect(result.unseenWitnessStayedUnknown).toBe(true);
  expect(result.onlyRecipientTrustChanged).toBe(true);
  if (typeof result.beforeB !== 'number' || typeof result.afterB !== 'number')
    throw new Error('Missing actual trust readings');
  expect(result.afterB).toBeLessThan(result.beforeB);
  expect(result.unchangedC).toBe(result.beforeC);
  expect(result.provenance).toMatchObject({ origin: 'd', firstFrom: 'd', lineage: 'example-chain' });
  expect(result.repairPull).toBeGreaterThan(0);
  expect(result.replayVerified).toBe(true);
  expect(JSON.parse(JSON.stringify(result))).toStrictEqual(result);
});
