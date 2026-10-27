/** A death inside a run ends the spouse's marriage at once; knowing of it, and grief, need received news. */
import { expect, test } from 'vitest';
import { exportRun, replay, step } from '../src/index.ts';
import type { Input } from '../src/run-schema.ts';
import { actor, authoredPerson, MINUTE, need, START, setup } from './support.ts';

test('an actual death widows the living spouse without inventing death knowledge', () => {
  const ada = authoredPerson('ada', 'Ada'),
    bora = authoredPerson('bora', 'Bora', 'male');
  ada.state.bonds = {
    courtships: [],
    marriages: [{ spouseId: 'bora', since: START - 1, mourningDays: 130 }],
  };
  bora.state.bonds = { courtships: [], marriages: [{ spouseId: 'ada', since: START - 1, mourningDays: 4 }] };
  bora.state.relationships = [
    {
      otherId: 'ada',
      affection: 0.9,
      trust: 0.8,
      respect: 0.7,
      familiarity: 1,
      roles: ['spouse'],
      ledger: 0,
      lastInteraction: START,
    },
  ];
  const run = setup([ada, bora, authoredPerson('cem', 'Cem', 'male')]);
  const at = START + 10 * MINUTE;
  need(step(run, { until: at - 1, inputs: [] }));
  const cem = actor(run, 'cem').bonds;
  const death: Input<'lifecycle.received'> = {
    id: 'host:ada-died',
    at,
    source: { type: 'host', id: 'world' },
    kind: 'lifecycle.received',
    payload: {
      type: 'death',
      person: { kind: 'actor', id: 'ada' },
      basis: { evidence: { kind: 'evidence', id: 'ada-death' }, worldRevision: 0 },
    },
  };
  need(step(run, { until: at, inputs: [death] }));
  expect(actor(run).body.alive).toBe(false);
  const widowed = actor(run, 'bora').bonds;
  expect(widowed.marriages[0]).toMatchObject({ spouseId: 'ada', endedAt: at, end: 'widowed' });
  expect(widowed.mourning).toEqual({ forId: 'ada', since: at, until: at + 4 * 86_400_000 });
  expect(actor(run, 'cem').bonds).toStrictEqual(cem);
  // Widowhood is a fact about the bond. Knowing of the death needs news.
  expect(actor(run, 'bora').social.relationships[0]?.deceasedAt).toBeUndefined();
  const news: Input<'death.heard'> = {
    id: 'host:bora-told',
    at: at + MINUTE,
    source: { type: 'host', id: 'world' },
    kind: 'death.heard',
    payload: { person: 'bora', deceased: 'ada', reporter: 'world', evidenceId: 'heard:ada-death' },
  };
  need(step(run, { until: at + MINUTE, inputs: [news] }));
  const heard = actor(run, 'bora');
  expect(heard.social.relationships[0]?.deceasedAt).toBe(at + MINUTE);
  expect(heard.affect.emotions.some((emotion) => emotion.id === 'grief' && emotion.targetId === 'ada')).toBe(
    true,
  );
  expect(heard.memory.episodes.some((episode) => episode.targetId === 'ada' && episode.valence < 0)).toBe(
    true,
  );
  const archive = exportRun(run);
  expect(need(replay(archive)).fullHash).toBe(archive.hashes.full);
});
