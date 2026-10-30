import { expect, it } from 'vitest';
import { replay, ruleHash, WatchRun } from './run.ts';

it('exports a complete current actor archive alongside the mounted game input log', () => {
  const run = new WatchRun(7);
  run.input({ k: 'start' });
  run.input({ k: 'begin' });
  run.step();
  const file = JSON.parse(JSON.stringify(run.export()));
  expect(file.end.actors.archive.archive.format).toBe('hf-run');
  expect(ruleHash(replay(file))).toBe(file.end.ruleHash);
});
