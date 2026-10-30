import { expect, it } from 'vitest';
import { actorRuntime } from './actor.ts';
import { WatchRun } from './run.ts';
import { buildFrame } from './view.ts';

it('reads the mounted watcher account without exposing exact live condition readings', () => {
  const run = new WatchRun(7);
  run.input({ k: 'start' });
  run.input({ k: 'begin' });
  run.step();
  const before = actorRuntime(run.state).snapshot();
  const frame = buildFrame(run.state, 0, false);
  expect(JSON.stringify(frame)).not.toMatch(/"(?:fatigue|health|stress|confidence)":0\.\d/);
  expect(actorRuntime(run.state).snapshot()).toEqual(before);
});
