import { expect, it } from 'vitest';
import { actorRuntime } from './actor.ts';
import { flushActors } from './actor-world.ts';
import { publicFixture } from './public-fixture.ts';
import { talk } from './talk.ts';

it('keeps Kian’s authored home dialogue and the daylight talk budget', () => {
  const s = publicFixture(),
    left = s.talks.left;
  expect(talk(s, 'kian', 'home')).toBe(true);
  expect(s.talks.left).toBe(left - 1);
  expect(s.talks.said.at(-1)?.text).toContain('Ada');
  flushActors(s, s.minute);
  actorRuntime(s).verify();
});

it('records the Gate answer as an actual public decision before ranking a successor', () => {
  const s = publicFixture();
  expect(talk(s, 'samira', 'gate')).toBe(true);
  const choice = s.actorEvents.findLast((event) => event.personId === 'samira' && event.record)?.record;
  expect(choice).toBeDefined();
  expect(s.gateWilling.samira).toBe(
    choice?.chosenAction === 'accept-gate-role'
      ? true
      : choice?.chosenAction === 'decline-gate-role'
        ? false
        : undefined,
  );
  const text = s.talks.said.at(-1)?.text ?? '';
  expect(text.includes('said yes')).toBe(choice?.chosenAction === 'accept-gate-role');
  expect(text.includes('said no')).toBe(choice?.chosenAction === 'decline-gate-role');
  actorRuntime(s).verify();
});
