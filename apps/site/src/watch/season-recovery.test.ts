import { expect, it } from 'vitest';
import { canRestoreSeason } from './season-recovery.ts';
import { WatchRun } from './sim/run.ts';
import type { PageInfo } from './store.ts';

it('never infers shared-cast recovery ownership from an ordinary local page', () => {
  const page: PageInfo = {
    id: 'c:1:winter',
    chronicle: 'c',
    kind: 'season',
    seed: 7,
    year: 1,
    when: 'winter',
    savedAt: 0,
  };
  const snapshot = new WatchRun(7).snapshot();
  expect(canRestoreSeason(page, snapshot)).toBe(false);
  expect(canRestoreSeason(page, { ...snapshot, fileOrigin: true })).toBe(false);
});
