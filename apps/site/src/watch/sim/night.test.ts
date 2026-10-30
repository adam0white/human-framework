import { expect, it } from 'vitest';
import { actorRuntime } from './actor.ts';
import { applyInput, bellLoudness, litSection, newGame, planNight, stepMinute } from './night.ts';

it('keeps goal time stopped, enforces posting before night, and moves the lantern through darkness', () => {
  const s = newGame(7),
    at = s.minute;
  stepMinute(s);
  expect(s.minute).toBe(at);
  applyInput(s, { k: 'start' });
  expect(applyInput(s, { k: 'post', watcher: 'kian', post: 'gate-1' })).toBe(true);
  applyInput(s, { k: 'begin' });
  expect(applyInput(s, { k: 'post', watcher: 'tamar', post: 'east-1' })).toBe(false);
  expect(applyInput(s, { k: 'lantern', section: 'east' })).toBe(true);
  expect(litSection(s)).toBeNull();
  expect(bellLoudness(s, 'kian')).toBeGreaterThan(0);
  actorRuntime(s).verify();
});
it('keeps the warning and physical wave plan seeded', () => {
  const a = newGame(7),
    b = newGame(7);
  planNight(a);
  planNight(b);
  expect(a.spawns).toEqual(b.spawns);
  expect(a.warning).toBe(b.warning);
});
