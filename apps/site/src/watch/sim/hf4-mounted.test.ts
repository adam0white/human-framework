import { expect, it } from 'vitest';
import { actorRuntime } from './actor.ts';
import { endState, replay, ruleHash, WatchRun } from './run.ts';

it('cold-restores a live mounted watch and replays the whole admitted input log', () => {
  const run = new WatchRun(7);
  run.input({ k: 'start' });
  run.input({ k: 'begin' });
  for (let n = 0; n < 8; n++) run.step();
  const snap = JSON.parse(run.snapshotText());
  const restored = WatchRun.resume(snap);
  expect(restored.snapshotText()).toBe(run.snapshotText());
  restored.step();
  run.step();
  expect(ruleHash(restored.state)).toBe(ruleHash(run.state));
  expect(endState(restored.state).fullHash).toBe(endState(run.state).fullHash);
  const exported = run.export();
  expect(ruleHash(replay(exported))).toBe(exported.end.ruleHash);
  actorRuntime(run.state).verify();
}, 30000);
