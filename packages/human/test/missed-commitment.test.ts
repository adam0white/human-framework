/** A promise that lapses breaks at its window's close however the host chunks steps, and costs its maker. */
import { expect, test } from 'vitest';
import { step } from '../src/index.ts';
import { actor, authoredPerson, exampleSpec, MINUTE, need, START, setup } from './support.ts';

const provenance = { kind: 'authored-world' as const, author: 'world', ruleId: 'meet', edition: 'control4' };

function promised() {
  const spec = exampleSpec();
  spec.definitions.norms = [
    {
      id: 'keep-word',
      label: 'Keep your word to a neighbour.',
      standing: 'obligatory',
      sources: [{ kind: 'assumption', ref: 'authored:control-promise' }],
      provenance,
      exemptions: [],
    },
  ];
  const ada = authoredPerson('ada', 'Ada');
  ada.state.heldNorms = [{ normId: 'keep-word', standing: 'obligatory', conviction: 1, provenance }];
  ada.state.agenda.commitments = [
    {
      id: 'meet',
      kind: 'promise',
      actions: ['work'],
      toId: 'bora',
      from: START,
      until: START + MINUTE,
      importance: 0.8,
      normId: 'keep-word',
      label: 'help Bora at the mill',
    },
  ];
  return setup([ada, authoredPerson('bora', 'Bora', 'male')], spec);
}

test('a broken promise lands at until + 1 in one step or many, with its episode, breach and esteem cost', () => {
  const end = START + 3 * 60 * MINUTE,
    whole = promised(),
    chunked = promised();
  need(step(whole, { until: end, inputs: [] }));
  for (const until of [START + 20_000, START + 2 * MINUTE, START + 47 * MINUTE, end])
    need(step(chunked, { until, inputs: [] }));
  const a = actor(whole),
    b = actor(chunked),
    broke = START + MINUTE + 1;
  for (const person of [a, b]) {
    expect(person.agenda.commitments.find((c) => c.id === 'meet')?.status).toBe('broken');
    const missed = person.memory.episodes.filter((episode) => episode.kind === 'missed');
    expect(missed).toHaveLength(1);
    expect(missed[0]).toMatchObject({ at: broke, action: 'work', targetId: 'bora' });
    expect(person.conscience.breaches).toEqual([
      expect.objectContaining({ normId: 'keep-word', at: broke, repaired: false }),
    ]);
  }
  expect(Math.abs(a.needs.esteem - b.needs.esteem)).toBeLessThan(1e-9);
  const distress = (person: typeof a) =>
    person.affect.emotions.find((emotion) => emotion.id === 'distress')?.intensity ?? 0;
  expect(distress(a)).toBeGreaterThan(0);
  expect(Math.abs(distress(a) - distress(b))).toBeLessThan(1e-9);
});
