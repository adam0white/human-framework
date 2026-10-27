/** The single preview path uses the same received context and forecast terms as an actual decision. */
import { expect, test } from 'vitest';
import { exportRun, preview, step } from '../src/index.ts';
import type { Input } from '../src/run-schema.ts';
import {
  actor,
  authoredPerson,
  exampleOffers,
  MINUTE,
  need,
  openingInputs,
  START,
  setup,
} from './support.ts';

test('host preview and actual decision carry the same known cold context without mutating the previewed run', () => {
  const person = authoredPerson('ada', 'Ada');
  person.state.body.sleepPressure = 0.8;
  person.state.body.exertion = 0.8;
  const run = setup([person]);
  const base = exampleOffers('ada', ['work'])[0];
  if (!base) throw new Error('Missing authored offer');
  const work = {
    ...base,
    durationMs: 120 * MINUTE,
    expected: {
      ...base.expected,
      followedBy: [{ label: 'more work', durationMs: 480 * MINUTE, effort: 0.8, focus: 0.4 }],
    },
  };
  const inputs: Input[] = [
    {
      id: 'host:cold',
      at: START,
      source: { type: 'host', id: 'world' },
      kind: 'ambient.received',
      payload: {
        person: 'ada',
        evidenceId: 'cold:received',
        environment: {
          contextId: 'outside',
          readings: { cold: 1, dark: 1, outdoors: true },
          basis: { kind: 'received', evidenceId: 'cold:received', at: START },
        },
      },
    },
    ...openingInputs([{ id: 'ada', offers: [work] }]),
  ];
  const before = exportRun(run),
    authored = structuredClone(inputs);
  const hint = need(
    preview(run, {
      perspective: { kind: 'host' },
      person: 'ada',
      until: START,
      inputs,
    }),
  );
  expect(exportRun(run)).toStrictEqual(before);
  expect(inputs).toStrictEqual(authored);
  const projected = hint.possibilities.find((event) => event.data.kind === 'decision');
  if (projected?.data.kind !== 'decision') throw new Error('Missing projected actual decision');
  need(step(run, { until: START, inputs }));
  const decision = actor(run).trace.at(-1);
  if (!decision) throw new Error('Missing actual decision');
  expect(projected.data.decision.considered).toStrictEqual(decision.considered);
  expect(
    decision.considered[0]?.terms.find((term) => term.source === 'forecast:body')?.value ?? 0,
  ).toBeLessThan(0);
  expect(actor(run).ambient.percept.cold).toBe(1);
  expect(hint.boundary.type).toBe('world-required');
});
