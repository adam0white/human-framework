import { expect, test } from 'vitest';
import { socialOwner } from '../src/social/social.ts';
import { person, socialContext } from './w2-fixture.ts';

test('received social events mutate only social state; role merge preserves an existing tie', () => {
  const p = person(),
    c = socialContext(p),
    original = structuredClone(p.actor);
  const helped = socialOwner.receive(
    p.actor.social,
    {
      kind: 'event',
      data: {
        person: 'person',
        evidenceId: 'help',
        other: 'friend',
        event: { kind: 'help', byMe: false, magnitude: 1 },
      },
    },
    c,
  );
  expect(helped.state.relationships[0]?.affection).toBeGreaterThan(0);
  const prior = helped.state.relationships[0];
  if (!prior) throw new Error('Missing tie');
  const merged = socialOwner.receive(
    helped.state,
    { kind: 'spouse-role', other: 'friend', receiptId: 'wedding' },
    c,
  ).state.relationships[0];
  expect(merged?.roles).toContain('spouse');
  expect(merged?.trust).toBe(prior.trust);
  expect(merged?.affection).toBe(prior.affection);
  expect(p.actor).toEqual(original);
  expect(helped.rng).toEqual(p.cursor);
});
