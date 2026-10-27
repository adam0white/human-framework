/** SCOPE: the necessity exception (Qur'an 2:173) as the person understands it. A firmly held prohibition on
 * forbidden food vetoes eating it; at survival desperation the veto lifts and the act is done under necessity,
 * which conscience and agenda read. A fed person still refuses. */
import { expect, test } from 'vitest';
import { step } from '../src/index.ts';
import {
  actionRequest,
  actor,
  authoredPerson,
  exampleOffers,
  exampleSpec,
  need,
  openingInputs,
  resolutionInput,
  START,
  setup,
} from './support.ts';

function choose(satiety: number) {
  const person = authoredPerson('ada', 'Ada'),
    spec = exampleSpec();
  const provenance = {
    kind: 'authored-world' as const,
    author: 'world',
    ruleId: 'forbidden-food',
    edition: 'control4',
  };
  spec.definitions.actions = [
    ...spec.definitions.actions,
    {
      id: 'eat',
      label: 'eat',
      demands: { effort: 0, focus: 0, mode: 'awake', requires: {} },
      tags: [],
      norms: [{ normId: 'forbidden-food', relation: 'violates' }],
    },
  ];
  spec.definitions.norms = [
    {
      id: 'forbidden-food',
      label: 'Do not eat forbidden food.',
      standing: 'forbidden',
      sources: [{ kind: 'assumption', ref: 'authored:control-necessity' }],
      provenance,
      exemptions: [],
    },
  ];
  person.state.heldNorms = [{ normId: 'forbidden-food', standing: 'forbidden', conviction: 1, provenance }];
  person.state.body.satiety = satiety;
  const [wait, base] = exampleOffers('ada', ['wait', 'work']);
  if (!wait || !base) throw new Error('Missing authored offers');
  const eat = {
    ...base,
    id: 'eat',
    actionId: 'eat',
    label: 'eat',
    demands: { ...base.demands, effort: 0 },
    norms: [{ normId: 'forbidden-food', relation: 'violates' as const }],
    expected: { ...base.expected, needs: { food: 0.6 } },
  };
  const run = setup([person], spec);
  const request = actionRequest(
    need(step(run, { until: START, inputs: openingInputs([{ id: 'ada', offers: [wait, eat] }]) })),
    'start',
  );
  need(
    step(run, {
      until: START,
      inputs: [resolutionInput(request, 0, { disposition: 'accepted', observations: [] })],
    }),
  );
  return { offerId: request.offerId, activity: actor(run).activity };
}

test('a starving person eats forbidden food under necessity; a fed one refuses it', () => {
  const starving = choose(0);
  expect(starving.offerId).toBe('eat');
  expect(starving.activity?.necessity).toBe(true);
  expect(choose(0.8).offerId).toBe('wait');
});
