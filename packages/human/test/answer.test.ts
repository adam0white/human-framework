/** Advice uses the ordinary reconsideration path, including during an activity. No answerNow wrapper. */
import { expect, test } from 'vitest';
import { exportRun, preview, step } from '../src/index.ts';
import type { Input } from '../src/run-schema.ts';
import {
  actionRequest,
  actor,
  authoredPerson,
  exampleOffers,
  exampleSpec,
  MINUTE,
  need,
  openingInputs,
  resolutionInput,
  START,
  setup,
} from './support.ts';

function running() {
  const person = authoredPerson('ada', 'Ada'),
    spec = exampleSpec();
  const provenance = {
    kind: 'authored-world' as const,
    author: 'world',
    ruleId: 'damaged-equipment',
    edition: 'control4',
  };
  spec.definitions.norms = [
    {
      id: 'unsafe-work',
      label: 'Do not operate the damaged equipment.',
      standing: 'forbidden',
      sources: [{ kind: 'assumption', ref: 'authored:control-workshop' }],
      provenance,
      exemptions: [],
    },
  ];
  person.state.heldNorms = [{ normId: 'unsafe-work', standing: 'forbidden', conviction: 1, provenance }];
  const base = exampleOffers('ada', ['rest', 'work']);
  const restBase = base.find((offer) => offer.actionId === 'rest'),
    workBase = base.find((offer) => offer.actionId === 'work');
  if (!restBase || !workBase) throw new Error('Missing authored offers');
  const rest = { ...restBase, durationMs: 120 * MINUTE },
    work = { ...workBase, norms: [{ normId: 'unsafe-work', relation: 'violates' as const }] };
  const run = setup([person], spec);
  const start = actionRequest(
    need(step(run, { until: START, inputs: openingInputs([{ id: 'ada', offers: [rest, work] }]) })),
    'start',
  );
  expect(start.offerId).toBe(rest.id);
  need(
    step(run, {
      until: START,
      inputs: [resolutionInput(start, 0, { disposition: 'accepted', observations: [] })],
    }),
  );
  return { run, activityId: start.activityId, work };
}

test('received advice can be refused while rest continues, without another choice draw; preview stays detached', () => {
  const { run, activityId, work } = running(),
    control = running().run;
  const at = START + MINUTE;
  const input: Input<'suggestion.received'> = {
    id: 'voice:unsafe-request',
    at,
    source: { type: 'voice', id: 'player' },
    kind: 'suggestion.received',
    payload: {
      person: 'ada',
      received: {
        kind: 'ordinary',
        suggestion: {
          adviceId: 'unsafe-advice',
          voiceId: 'player',
          affordanceId: work.id,
          strength: 1,
          insist: true,
        },
      },
    },
  };
  const before = exportRun(run);
  const hint = need(
    preview(run, { perspective: { kind: 'host' }, person: 'ada', until: at, inputs: [input] }),
  );
  expect(exportRun(run)).toStrictEqual(before);
  const predicted = hint.possibilities.find((event) => event.data.kind === 'suggestion-resolved');
  if (predicted?.data.kind !== 'suggestion-resolved') throw new Error('Missing predicted response');
  need(step(run, { until: at, inputs: [input] }));
  need(step(control, { until: at, inputs: [] }));
  const response = exportRun(run).current.events.find((event) => event.data.kind === 'suggestion-resolved');
  if (response?.data.kind !== 'suggestion-resolved') throw new Error('Missing actual response');
  expect(response.data.resolution.verdict).toBe('refused');
  expect(response.data.resolution).toStrictEqual(predicted.data.resolution);
  expect(actor(run).activity?.id).toBe(activityId);
  expect(actor(run).rng).toStrictEqual(actor(control).rng);
  expect(actor(run).will.voices.find((voice) => voice.voiceId === 'player')?.refused).toBe(1);
  const hash = exportRun(run).hashes.full;
  expect(step(run, { until: at, inputs: [input] }).ok).toBe(false);
  expect(exportRun(run).hashes.full).toBe(hash);
});
