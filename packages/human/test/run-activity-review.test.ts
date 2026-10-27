/** SCOPE: activity review cadence. A person who goes on with a long activity is asked again every review
 * interval until it ends, as 3.x `reviewed` did; reviews are marked as reviews, not fresh decisions. */
import { expect, test } from 'vitest';
import {
  authoredPerson,
  exampleOffers,
  exampleSpec,
  freshHost,
  MINUTE,
  need,
  openingInputs,
  START,
  serve,
} from '../examples/minimal.ts';
import { createPerson, createRun, exportRun } from '../src/index.ts';

test('a four-hour activity is reviewed every half hour until it ends', () => {
  const run = need(createRun(exampleSpec()));
  need(createPerson(run, authoredPerson('ada', 'Ada')));
  const offers = exampleOffers('ada', ['work']).map((o) => ({ ...o, durationMs: 240 * MINUTE }));
  serve(
    run,
    freshHost(),
    new Map([['ada', offers]]),
    START + 240 * MINUTE,
    openingInputs([{ id: 'ada', offers }]),
  );
  const decisions = exportRun(run).current.events.flatMap((e) =>
    e.data.kind === 'decision'
      ? [{ minute: (e.at - START) / MINUTE, review: e.data.decision.review === true }]
      : [],
  );
  expect(decisions.map((d) => d.minute)).toEqual([0, 30, 60, 90, 120, 150, 180, 210]);
  expect(decisions.map((d) => d.review)).toEqual([false, true, true, true, true, true, true, true]);
});
