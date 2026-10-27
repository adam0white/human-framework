import { expect, test } from 'vitest';
import { exportRun, step } from '../src/index.ts';
import type { Input } from '../src/run-schema.ts';
import {
  actor,
  authoredPerson,
  exampleOffers,
  exampleSpec,
  need,
  openingInputs,
  START,
  setup,
} from './support.ts';

test('an actual kept voice promise earns trust once without creating an action or drawing choice RNG', () => {
  const run = setup(),
    control = setup();
  const input: Input = {
    id: 'promise:kept',
    at: START,
    source: { type: 'host', id: 'world' },
    kind: 'voice.promise-received',
    payload: {
      person: 'ada',
      evidenceId: 'kept-evidence',
      voiceId: 'player',
      promise: { kept: true, action: 'work' },
    },
  };
  const before = actor(run).will.voices.find((voice) => voice.voiceId === 'player');
  if (!before) throw new Error('Missing authored voice');
  need(step(run, { until: START, inputs: [input] }));
  need(step(control, { until: START, inputs: [] }));
  const current = actor(run),
    unchanged = actor(control);
  const voice = current.will.voices.find((candidate) => candidate.voiceId === 'player');
  if (!voice) throw new Error('Missing received voice');
  expect(voice.trust).toBeGreaterThan(before.trust);
  expect(voice.trust).toBeLessThanOrEqual(1);
  expect(voice.history.at(-1)?.reason).toBe('promise-kept');
  expect(current.rng).toStrictEqual(unchanged.rng);
  expect(current.activity).toStrictEqual(unchanged.activity);
  expect(current.trace).toStrictEqual(unchanged.trace);
  const hash = exportRun(run).hashes.full;
  const duplicate = step(run, { until: START, inputs: [input] });
  expect(duplicate.ok).toBe(false);
  expect(exportRun(run).hashes.full).toBe(hash);
});

test('fullness and a known companion remain distinct always-on terms without supplying physical water', () => {
  const full = authoredPerson('ada', 'Ada'),
    thirsty = authoredPerson('bora', 'Bora', 'male');
  full.state.body.hydration = 1;
  thirsty.state.body.hydration = 0.1;
  full.state.relationships = [
    {
      otherId: 'bora',
      affection: 0.7,
      trust: 0.8,
      respect: 0.5,
      familiarity: 1,
      roles: ['friend'],
      ledger: 0,
      lastInteraction: START,
    },
  ];
  const spec = exampleSpec();
  const base = exampleOffers('ada')[0];
  if (!base) throw new Error('Missing authored offer');
  spec.definitions.actions = [
    ...spec.definitions.actions,
    { id: 'drink', label: 'drink', demands: base.demands, tags: [], norms: [] },
  ];
  const offerA = {
    ...base,
    id: 'drink:a',
    actionId: 'drink',
    label: 'drink',
    alongside: ['bora'],
    expected: { needs: { water: 0.6 }, followedBy: [], provenance: ['authored-control'] },
  };
  const offerB = { ...offerA, id: 'drink:b', person: 'bora', alongside: [] };
  const run = setup([full, thirsty], spec);
  need(
    step(run, {
      until: START,
      inputs: openingInputs([
        { id: 'ada', offers: [base, offerA] },
        { id: 'bora', offers: [{ ...base, person: 'bora' }, offerB] },
      ]),
    }),
  );
  const score = (person: string, offer: string) => {
    const result = actor(run, person)
      .trace.at(-1)
      ?.considered.find((choice) => choice.affordanceId === offer);
    if (!result) throw new Error('Missing actual scored offer');
    return result;
  };
  const a = score('ada', 'drink:a'),
    b = score('bora', 'drink:b');
  expect(a.terms.find((term) => term.source === 'full:water')?.value ?? 0).toBeLessThan(0);
  expect(b.terms.find((term) => term.source === 'full:water')?.value ?? 0).toBe(0);
  expect(a.terms.find((term) => term.source === 'together:bora')?.value ?? 0).toBeGreaterThan(0);
  expect(actor(run).body.hydration).toBe(1);
  expect(actor(run, 'bora').body.hydration).toBe(0.1);
});
