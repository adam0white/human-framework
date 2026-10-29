import { expect, it } from 'vitest';
import { actorRuntime } from './actor.ts';
import { nightActs } from './night-actions.ts';
import { WatchRun } from './run.ts';

it('offers night requests only after actual reachable postings, without changing actors by reading', () => {
  const run = new WatchRun(7);
  run.input({ k: 'start' });
  run.input({ k: 'lantern', section: 'gate' });
  run.input({ k: 'begin' });
  const before = actorRuntime(run.state).snapshot();
  expect(nightActs(run.state, 'tamar').every((a) => typeof a.label === 'string')).toBe(true);
  expect(actorRuntime(run.state).snapshot()).toEqual(before);
});
