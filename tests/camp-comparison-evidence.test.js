import test from 'node:test';
import assert from 'node:assert/strict';
import { casesFor } from '../src/experiments/camp-story/comparison.js';

// Reserved cases are enumerated for registration only. Never execute them in npm test.
test('candidate evidence keeps registered reserved execution separate', () => {
  assert.deepEqual(casesFor('reserved').map(([name]) => name), ['reserved-inclusive-carried', 'reserved-interrupted-import', 'reserved-late-retained']);
  assert.throws(() => casesFor('other'), /partition/);
});
test('real earned stock-first entry keeps selected kernel world exactly', async () => {
  const [, run] = casesFor('development').find(([name]) => name === 'import-stock-first');
  const record = await run();
  assert.equal(record.exactSelectedKernelEntry, true);
  assert.equal(record.sameZeroTimeAcknowledgment, true);
  assert.equal(record.exactContinuation, true);
});
test('late ferry loss permits paid later camp provision', async () => {
  const [, run] = casesFor('development').find(([name]) => name === 'late-ferry');
  const record = await run();
  assert.equal(record.service.householdsEquipped, 0);
  assert.ok(record.service.campNights > 0);
  assert.equal(record.sameEndingWorld, true);
});
