import { expect, test } from 'vitest';
import { socialOwner } from '../src/social/social.ts';
import { person, socialContext } from './w2-fixture.ts';

test('received groups shape new ties without inventing group knowledge for absent people', () => {
  const p = person();
  const state = socialOwner.receive(
    p.actor.social,
    {
      kind: 'groups',
      data: {
        person: 'person',
        evidenceId: 'groups',
        self: ['household'],
        others: [
          { person: 'inside', groups: ['household'] },
          { person: 'outside', groups: ['village'] },
        ],
      },
    },
    socialContext(p),
  ).state;
  expect(state.relationships.find((r) => r.otherId === 'inside')?.trust).toBe(0.6);
  expect(state.relationships.find((r) => r.otherId === 'outside')?.trust).toBe(0.4);
  expect(state.relationships.some((r) => r.otherId === 'unseen')).toBe(false);
  expect(socialOwner.validate(state)).toEqual([]);
});
