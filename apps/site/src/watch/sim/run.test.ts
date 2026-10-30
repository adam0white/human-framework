import { expect, it } from 'vitest';
import { actorRuntime } from './actor.ts';
import { WATCH_OLD_SAVE } from './hf4.ts';
import { endState, replay, ruleHash, WatchRun } from './run.ts';
import { installActorViews } from './state.ts';

it('plays an actual mounted night to dawn and reproduces its whole input-log hash', () => {
  const run = new WatchRun(7);
  run.input({ k: 'start' });
  run.input({ k: 'post', watcher: 'tamar', post: `${run.state.warned}-1` });
  run.input({ k: 'lantern', section: run.state.warned });
  run.input({ k: 'begin' });
  for (let guard = 0; guard < 1000 && run.state.phase === 'night'; guard++) run.step();
  expect(run.state.phase).toBe('dawn');
  expect(run.state.history).toHaveLength(1);
  expect(run.state.dawn?.voices.length).toBeGreaterThan(0);
  const file = JSON.parse(JSON.stringify(run.export()));
  expect(ruleHash(replay(file))).toBe(file.end.ruleHash);
  expect(endState(replay(file)).fullHash).toBe(file.end.fullHash);
  actorRuntime(run.state).verify();
}, 180000);

it('keeps the rule hash independent of prose while actual stock changes move it', () => {
  const run = new WatchRun(7);
  run.input({ k: 'start' });
  run.input({ k: 'begin' });
  run.step();
  const exported = run.export(),
    state = installActorViews(structuredClone(run.state));
  state.warning = 'The scout words the same warning differently.';
  expect(ruleHash(state)).toBe(exported.end.ruleHash);
  expect(endState(state).fullHash).not.toBe(exported.end.fullHash);
  state.grain -= 1;
  expect(ruleHash(state)).not.toBe(exported.end.ruleHash);
});

it('refuses older saves and exports with the exact start-fresh message', () => {
  const run = new WatchRun(7),
    snapshot = run.snapshot();
  expect(() => WatchRun.resume({ ...snapshot, scenario: 13 })).toThrow(WATCH_OLD_SAVE);
  expect(() => replay({ ...run.export(), scenario: 13 })).toThrow(WATCH_OLD_SAVE);
});
