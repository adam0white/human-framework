/** Actual speech queues once, and hearing comes only from an admitted public attention receipt. */
import { expect, it } from 'vitest';
import { actorRuntime } from './actor.ts';
import { localWarningAccount, localWarningUnavailable } from './local-warning.ts';
import { replay, ruleHash, WatchRun } from './run.ts';

it('keeps a caution pending until HF receives it, then restores and replays its actual hearing account', () => {
  const run = new WatchRun(2026);
  run.input({ k: 'start' });
  run.input({ k: 'lantern', section: 'east' });
  run.input({ k: 'begin' });
  run.step();
  expect(localWarningUnavailable(run.state, 'tamar')).toBeNull();
  expect(run.input({ k: 'local-warning', who: 'tamar' })).toBe(true);
  expect(run.state.localWarning?.receipts.tamar).toMatchObject({ status: 'pending' });
  expect(localWarningAccount(run.state, 'tamar')).toContain('Hearing has not been checked');
  const cold = WatchRun.resume(JSON.parse(run.snapshotText()));
  for (let n = 0; n < 8 && run.state.localWarning?.receipts.tamar?.status === 'pending'; n++) {
    run.step();
    cold.step();
    expect(cold.snapshotText()).toBe(run.snapshotText());
  }
  const receipt = run.state.localWarning?.receipts.tamar;
  expect(receipt?.status).toBe('delivered');
  const events = actorRuntime(run.state).read({
    perspective: { kind: 'host' },
    people: ['tamar'],
    select: ['events'],
  }).events;
  const heard = events.some(
    (event) =>
      event.data.kind === 'observation-attended' &&
      event.data.summary?.includes('Keep an eye on this stretch') &&
      event.data.attention > 0,
  );
  expect(receipt && 'heard' in receipt && receipt.heard).toBe(heard);
  expect(run.state.localWarning?.pending).toEqual([]);
  const full = JSON.parse(JSON.stringify(run.export()));
  expect(ruleHash(replay(full))).toBe(full.end.ruleHash);
  const before = run.snapshotText();
  expect(run.input({ k: 'local-warning', who: 'not-a-watcher' })).toBe(false);
  expect(run.snapshotText()).toBe(before);
  expect(() => WatchRun.resume({ ...run.snapshot(), scenario: 22 })).toThrow(/older version|scenario/i);
});
