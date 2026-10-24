import { expect, it } from 'vitest';
import { WatchRun } from './run.ts';
import { endWinter } from './season.ts';

it('a completed blessed lesson is answered once at the thaw', () => {
  const run = new WatchRun(1);
  run.input({ k: 'start' });
  const s = run.state;
  s.pairings.push({ who: 'kian', with: 'tamar', until: s.minute, from: 0.25 });
  endWinter(s);
  expect(s.pairings[0]?.told).toBe(true);
  const lines = s.chronicle.filter((l) => l.who === 'kian' && /sling lessons/.test(l.text));
  expect(lines).toHaveLength(1);
  expect(lines[0]?.text).toMatch(/with Tamar/);
});
