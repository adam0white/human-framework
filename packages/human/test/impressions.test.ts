import { expect, test } from 'vitest';
import { estimate } from '../src/social/impressions.ts';
import { socialOwner } from '../src/social/social.ts';
import { person, socialContext } from './w2-fixture.ts';

test('noisy received signs replay exactly without actor RNG; unobserved traits retain zero confidence', () => {
  const p = person(),
    c = socialContext(p),
    input = {
      kind: 'glimpse' as const,
      data: {
        person: 'person',
        evidenceId: 'look',
        target: 'other',
        signs: { fatigue: 0.8, pain: 0.5, fear: 0.1 },
        clarity: 0.4,
      },
    };
  const first = socialOwner.receive(p.actor.social, input, c);
  const again = socialOwner.receive(p.actor.social, input, c);
  expect(first).toEqual(again);
  expect(first.rng).toEqual(p.cursor);
  p.actor.social = first.state;
  expect(estimate(p.actor, 'other', 'fatigue', 0).confidence).toBeGreaterThan(0);
  expect(estimate(p.actor, 'other', 'trait:honesty', 0).confidence).toBe(0);
  expect(
    socialOwner
      .receive(p.actor.social, { ...input, data: { ...input.data, target: 'not-seen', clarity: 0 } }, c)
      .state.impressions.some((i) => i.targetId === 'not-seen'),
  ).toBe(false);
});
