import { expect, it } from 'vitest';
import { actorEvidence, actorInput, actorRuntime } from './actor.ts';
import { flushActors } from './actor-world.ts';
import { publicFixture, requirePerson } from './public-fixture.ts';

it('admits actual acknowledged support through public voice evidence', () => {
  const s = publicFixture(),
    before = requirePerson(s, 'kian').will.voices;
  const e = actorEvidence(s, 'kian', 'home-conversation');
  actorInput(s, 'voice.evidence-received', {
    ...e,
    voiceId: 'keeper',
    evidence: {
      id: e.evidenceId,
      occurredAt: actorRuntime(s).time(),
      action: 'talk',
      kind: 'support',
      effect: 'acknowledged',
    },
  });
  expect(requirePerson(s, 'kian').will.voices).toEqual(before);
  flushActors(s, s.minute);
  const events = actorRuntime(s).read({
    perspective: { kind: 'host' },
    people: ['kian'],
    select: ['events'],
  }).events;
  expect(events.some((e) => e.data.kind === 'voice-evidence')).toBe(true);
  actorRuntime(s).verify();
});
