/** SCOPE: G1/Hearsay first-midnight reproduction, reduced from its public-API archive.
 * A calendar boundary asks two people to choose from identically named host offers.
 * Their decision effects must remain distinct; current archives still replay exactly. */
import { expect, test } from 'vitest';
import {
  authoredPerson,
  DAY,
  exampleOffers,
  exampleSpec,
  freshHost,
  need,
  openingInputs,
  serve,
} from '../examples/minimal.ts';
import { createPerson, createRun, exportRun, replay, restoreRun, step } from '../src/index.ts';

test('a shared midnight cause keeps each person’s decision effects distinct', () => {
  const run = need(createRun(exampleSpec()));
  for (const id of ['ada', 'bea']) need(createPerson(run, authoredPerson(id, id)));
  const offers = new Map(['ada', 'bea'].map((person) => [person, exampleOffers(person)]));
  serve(
    run,
    freshHost(),
    offers,
    DAY - 60_000,
    openingInputs([...offers].map(([id, offers]) => ({ id, offers }))),
  );
  const restored = need(restoreRun(exportRun(run)));
  const result = need(step(restored, { until: DAY, inputs: [] }));
  expect(result.at).toBe(DAY);
  expect(
    result.events
      .filter((event) => event.data.kind === 'decision')
      .map((event) => event.person)
      .sort(),
  ).toEqual(['ada', 'bea']);
  const archive = exportRun(restored);
  expect(need(replay(archive)).fullHash).toBe(archive.hashes.full);
});
