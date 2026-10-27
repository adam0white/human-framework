import { expect, test } from 'vitest';
import { noteKnownBy, regardOf } from '../src/social/impressions.ts';
import { person } from './w2-fixture.ts';

test('believed regard requires seen or trusted told evidence and never copies another mind', () => {
  const p = person();
  expect(regardOf(p.actor, 'other', 0).confidence).toBe(0);
  expect(
    noteKnownBy(p.actor, { otherId: 'other', via: 'told', act: { kind: 'harm', targetId: 'other' }, at: 0 }),
  ).toBeUndefined();
  expect(regardOf(p.actor, 'other', 0).confidence).toBe(0);
  noteKnownBy(p.actor, { otherId: 'other', via: 'seen', act: { kind: 'harm', targetId: 'other' }, at: 0 });
  expect(regardOf(p.actor, 'other', 0).value).toBeLessThan(0);
  expect(p.actor.social.relationships).toEqual([]);
});
