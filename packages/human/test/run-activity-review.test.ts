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
import { createPerson, createRun, exportRun, replay } from '../src/index.ts';

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

test('a rising perceived hunger triggers a review before the regular interval', () => {
  const offers = exampleOffers('ada', ['work']).map((o) => ({ ...o, durationMs: 60 * MINUTE }));
  const runTo = (split: boolean) => {
    const run = need(createRun(exampleSpec()));
    const ada = authoredPerson('ada', 'Ada');
    ada.state.body.satiety = 0.31;
    need(createPerson(run, ada));
    const host = freshHost();
    const offerMap = new Map([['ada', offers]]);
    if (split) serve(run, host, offerMap, START + 5 * MINUTE, openingInputs([{ id: 'ada', offers }]));
    serve(run, host, offerMap, START + 20 * MINUTE, split ? [] : openingInputs([{ id: 'ada', offers }]));
    return exportRun(run);
  };
  const archive = runTo(false);
  expect(need(replay(archive)).fullHash).toBe(archive.hashes.full);
  const decisions = archive.current.events.filter((e) => e.data.kind === 'decision');
  expect(decisions.length).toBeGreaterThan(1);
  expect(decisions[1]?.at).toBeGreaterThan(START);
  expect(decisions[1]?.at).toBeLessThan(START + 20 * MINUTE);
  expect(
    runTo(true)
      .current.events.filter((e) => e.data.kind === 'decision')
      .map((e) => e.at),
  ).toEqual(decisions.map((e) => e.at));
  // Dense body output may extend past the host's requested endpoint. A future
  // sleepiness crossing must wait for a later step, not become a reached boundary.
  const short = need(createRun(exampleSpec()));
  const sleepy = authoredPerson('ada', 'Ada');
  sleepy.state.body.sleepPressure = 1;
  sleepy.state.body.circadianPeakMs = START - 350 * MINUTE;
  need(createPerson(short, sleepy));
  serve(
    short,
    freshHost(),
    new Map([['ada', offers]]),
    START + 525000,
    openingInputs([{ id: 'ada', offers }]),
  );
  expect(exportRun(short).current.at).toBe(START + 525000);
});
