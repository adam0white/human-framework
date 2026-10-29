/** SCOPE: Public controls reduced from G1/Hearsay midnight and Watch daily failures.
 * Shared causes must keep different people's and successive decisions' effects distinct.
 * Current archives must continue and replay exactly. */
import { expect, test } from 'vitest';
import {
  authoredPerson,
  DAY,
  exampleOffers,
  exampleSpec,
  freshHost,
  MINUTE,
  need,
  openingInputs,
  restoredHost,
  START,
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

test('successive routine opportunities keep decision effects distinct after a continuation', () => {
  const offer = exampleOffers('ada')[0];
  if (!offer) throw new Error('The public example must provide an offer');
  offer.expected.needs = { belonging: 0.3 };
  const spec = exampleSpec();
  spec.definitions = {
    ...spec.definitions,
    routines: [
      {
        id: 'daily',
        entries: [1, 2].map((minute) => ({
          id: `opportunity:${minute}`,
          at: START + minute * MINUTE,
          chance: 1,
          offer,
        })),
      },
    ],
  };
  const run = need(createRun(spec));
  need(createPerson(run, authoredPerson('ada', 'Ada')));
  const offers = new Map([['ada', [offer]]]);
  const first = serve(
    run,
    freshHost(),
    offers,
    START + MINUTE,
    openingInputs([{ id: 'ada', offers: [offer] }]),
  );
  const saved = exportRun(run);
  const restored = need(restoreRun(saved));
  const second = serve(restored, restoredHost(saved), offers, START + 2 * MINUTE);
  const decisionForRoutine = (result: typeof first) =>
    result.events.find((event) => event.data.kind === 'decision' && event.causeIds.includes('daily'));
  const before = decisionForRoutine(first),
    after = decisionForRoutine(second);
  expect(before).toBeDefined();
  expect(after).toBeDefined();
  expect(after?.id).not.toBe(before?.id);
  // One uninterrupted run and the restored continuation make the same decisions and receipts.
  serve(run, restoredHost(saved), offers, START + 2 * MINUTE);
  const archive = exportRun(restored);
  expect(exportRun(run).hashes.full).toBe(archive.hashes.full);
  expect(need(replay(archive)).fullHash).toBe(archive.hashes.full);
});
