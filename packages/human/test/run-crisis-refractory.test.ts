/** SCOPE: a reached public crisis, recovery and renewed eligibility, plus a
 * headless chunking/replay control. Authored grief is not a clinical prediction. */
import { expect, it } from 'vitest';
import * as api from '../src/run.ts';
import { accepted, HOUR, numericalPerson, numericalSpec, PERSON } from './run-numerical-fixture.ts';

function timeline(chunk: number) {
  const run = accepted(api.createRun(numericalSpec(1)));
  const person = numericalPerson(1);
  person.state.affect.mood.valence = -1;
  person.state.affect.emotions = [
    { id: 'grief', intensity: 1, cause: 'authored-loss', since: 0, halfLifeMs: 7 * 24 * HOUR },
  ];
  person.state.body.sleepPressure = 0.1;
  person.state.body.sleepDebtHours = 0;
  person.state.body.doze.context = { posture: 'upright', stimulation: 1 };
  accepted(api.createPerson(run, person));
  const events = [];
  for (let until = chunk; until <= 48 * HOUR; until += chunk) {
    const result = accepted(api.step(run, { until, inputs: [] }));
    expect(result.reachedUntil).toBe(true);
    events.push(...result.events);
  }
  const archive = api.exportRun(run);
  const replayed = accepted(api.replay(archive));
  expect(replayed.fullHash).toBe(archive.hashes.full);
  const restored = accepted(api.restoreRun(archive));
  expect(api.exportRun(restored).hashes.full).toBe(archive.hashes.full);
  return { events, state: archive.current };
}

it('advances past the refractory end and preserves reached crisis events across chunks', () => {
  const whole = timeline(48 * HOUR);
  const split = timeline(HOUR);
  const crises = whole.events.filter((event) => event.data.kind === 'crisis');
  expect(crises.map((event) => event.data.kind === 'crisis' && event.data.change)).toEqual([
    'onset',
    'recovered',
    'onset',
    'recovered',
  ]);
  expect(split.events).toEqual(whole.events);
  expect(split.state.people[PERSON]?.rng).toEqual(whole.state.people[PERSON]?.rng);
  expect(split.state.people[PERSON]?.randomIdentity).toEqual(whole.state.people[PERSON]?.randomIdentity);
});
