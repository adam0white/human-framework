import { expect, test } from 'vitest';
import { exportRun, step } from '../src/index.ts';
import type { Input, PerceptData } from '../src/run-schema.ts';
import {
  actor,
  exampleOffers,
  freshHost,
  MINUTE,
  need,
  openingInputs,
  START,
  serve,
  setup,
} from './support.ts';

function evidence(id: string, at: number): Input {
  const percept: PerceptData = {
    id,
    occurredAt: at,
    channel: 'saw',
    kind: 'host-note',
    salience: 1,
    summary: id,
    claims: [],
    norms: [],
    advice: [],
    consequences: [],
    withdrawConsequences: [],
    witnesses: [],
    reports: [],
    provenance: ['world'],
  };
  return {
    id,
    at,
    source: { type: 'host', id: 'world' },
    kind: 'observation.received',
    payload: { person: 'ada', evidenceId: `evidence:${id}`, percepts: [percept] },
  };
}

test('ordinary queued inputs remain behind their time and canonical order ignores caller array order', () => {
  const until = START + 2 * MINUTE;
  const notes = ['ä', 'a', 'B'].map((id) => evidence(id, until));
  const callerBefore = structuredClone(notes);
  const run = setup(),
    other = setup();
  const offers = exampleOffers('ada');
  const opening = openingInputs([{ id: 'ada', offers }]);
  const first = need(step(run, { until, inputs: [...opening, ...notes] }));
  const second = need(step(other, { until, inputs: [...notes].reverse().concat([...opening].reverse()) }));
  expect(first.at).toBe(START);
  expect(first.boundary.type).toBe('world-required');
  expect(actor(run).memory.episodes.some((episode) => ['ä', 'a', 'B'].includes(episode.summary))).toBe(false);
  serve(run, freshHost(), new Map([['ada', offers]]), until, [], first);
  serve(other, freshHost(), new Map([['ada', offers]]), until, [], second);
  expect(notes).toStrictEqual(callerBefore);
  const archive = exportRun(run);
  expect(
    archive.history
      .flatMap((transaction) => transaction.inputs)
      .filter((input) => ['ä', 'a', 'B'].includes(input.id))
      .map((input) => input.id),
  ).toEqual(['B', 'a', 'ä']);
  const received = actor(run).memory.episodes.filter((episode) => ['ä', 'a', 'B'].includes(episode.summary));
  expect(received).toHaveLength(3);
  expect(received.every((episode) => episode.at === until)).toBe(true);
  expect(exportRun(run).hashes.full).toBe(exportRun(other).hashes.full);
});

test('a duplicate identity rejects the complete batch and does not reserve its valid input', () => {
  const run = setup(),
    clean = setup();
  const input = evidence('one', START);
  const before = exportRun(run),
    caller = structuredClone(input);
  const invalid = step(run, { until: START, inputs: [input, input] });
  expect(invalid.ok).toBe(false);
  if (invalid.ok) throw new Error('Duplicate input was admitted');
  expect(invalid.error.code).toBe('duplicate-id');
  expect(exportRun(run).hashes.full).toBe(before.hashes.full);
  expect(input).toStrictEqual(caller);
  need(step(run, { until: START, inputs: [input] }));
  need(step(clean, { until: START, inputs: [input] }));
  expect(exportRun(run).hashes.full).toBe(exportRun(clean).hashes.full);
});
