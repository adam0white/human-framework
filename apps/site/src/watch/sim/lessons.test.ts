import { expect, it } from 'vitest';
import { actorRuntime } from './actor.ts';
import { DAY } from './config.ts';
import { publicFixture } from './public-fixture.ts';
import { endWinter, SPRING_DAY } from './season.ts';

it('answers an authored completed lesson with one line at the actual thaw boundary', () => {
  // Opening premise: the final minute of winter and a recorded completed pairing.
  // This tests the thaw response, not ninety days of life or the teaching process.
  const s = publicFixture(SPRING_DAY * DAY - 1);
  s.pairings.push({ who: 'kian', with: 'tamar', until: s.minute, from: 0.25 });
  endWinter(s);
  expect(s.minute).toBe(SPRING_DAY * DAY);
  expect(s.phase).toBe('thaw');
  expect(s.pairings[0]?.told).toBe(true);
  const lines = s.chronicle.filter((l) => l.who === 'kian' && /sling lessons/.test(l.text));
  expect(lines).toHaveLength(1);
  expect(lines[0]?.text).toMatch(/with Tamar/);
  actorRuntime(s).verify();
});
