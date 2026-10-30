import type { Input, PersonAuthoring } from '@adam0white/human-framework';
import { expect, it } from 'vitest';
import { actorAt, actorRuntime } from './actor.ts';
import { flushActors } from './actor-world.ts';
import { minuteMs } from './hf4.ts';
import { winterStories } from './life.ts';
import { publicFixture } from './public-fixture.ts';

function history(people: PersonAuthoring[]): void {
  const parent = people.find((p) => p.id === 'samira');
  if (!parent) throw new Error('Missing parent');
  parent.biography = [
    {
      id: 'e0',
      at: minuteMs(1800 - 200 * 1440),
      kind: 'event',
      actorId: 'samira',
      placeId: 'east',
      valence: -0.7,
      salience: 0.9,
      summary: 'The east wall broke while Samira stood there.',
      tags: ['wall'],
      basis: { kind: 'authored', author: 'Watch household history' },
      provenance: ['watch:opening-world-history'],
    },
  ];
}
function settlements(s: ReturnType<typeof publicFixture>) {
  return actorRuntime(s)
    .read({ perspective: { kind: 'host' }, people: [], select: ['events'] })
    .events.filter((e) => e.data.kind === 'communication-settled');
}
it('admits actual winter testimony only for an awake household physically together', () => {
  const s = publicFixture(1800, history);
  winterStories(s);
  expect(
    settlements(s).some(
      (e) => e.data.kind === 'communication-settled' && e.data.received.some((r) => r.recipient === 'lena'),
    ),
  ).toBe(true);
  actorRuntime(s).verify();
});
it('does not move an absent parent into a story gathering or claim delivery', () => {
  const s = publicFixture(1800, history);
  s.place.samira = 'east-1';
  winterStories(s);
  expect(
    settlements(s).flatMap((e) => (e.data.kind === 'communication-settled' ? e.data.received : [])),
  ).toEqual([]);
  actorRuntime(s).verify();
});
it('settles a real speech request without a received audience when no host gathering exists', () => {
  const s = publicFixture(1800, history);
  // HF 4.11 faculty selection; no private gist identity is read by the host.
  s.actors.queued.push({
    id: 'watch:test:unavailable-audience',
    at: actorAt(s),
    source: { type: 'host', id: 'watch' },
    kind: 'retelling.requested',
    payload: { teller: 'samira', listener: 'lena', placeIds: ['east'], limit: 2 },
  } as unknown as Input);
  flushActors(s, s.minute);
  expect(settlements(s)).toHaveLength(1);
  expect(settlements(s)[0]?.data).toMatchObject({ kind: 'communication-settled', received: [] });
  actorRuntime(s).verify();
});

it('does not claim a sleeping parent spoke to the household', () => {
  const s = publicFixture(1800, (people) => {
    history(people);
    const parent = people.find((p) => p.id === 'samira');
    if (!parent) throw new Error('Missing parent');
    parent.state.body.asleep = true;
  });
  winterStories(s);
  expect(
    settlements(s).flatMap((e) => (e.data.kind === 'communication-settled' ? e.data.received : [])),
  ).toEqual([]);
  actorRuntime(s).verify();
});
