/** SCOPE: authored elderly widowhood across its early-mortality boundary,
 * with public whole/hourly stepping and current-version replay. Not a population prediction. */
import { expect, it } from 'vitest';
import * as api from '../src/run.ts';
import { accepted, DAY, HOUR, numericalPerson, numericalSpec, PERSON } from './run-numerical-fixture.ts';

function timeline(chunk: number) {
  const spec = numericalSpec(1);
  const start = 182 * DAY - HOUR;
  spec.start = start;
  spec.definitions.calendar.days = [
    { dayIndex: 181, start: 181 * DAY, windows: [] },
    { dayIndex: 182, start: 182 * DAY, windows: [] },
  ];
  const run = accepted(api.createRun(spec));
  const person = numericalPerson(1);
  person.identity.birthAt = Math.round(-113.7 * 365.25 * DAY);
  const endedAt = 123;
  person.state.bonds.marriages = [
    { spouseId: 'late-spouse', since: endedAt - 10 * 365.25 * DAY, endedAt, end: 'widowed' },
  ];
  accepted(api.createPerson(run, person));
  const events = [];
  for (let until = chunk; until <= 4 * HOUR; until += chunk) {
    const result = accepted(api.step(run, { until: start + until, inputs: [] }));
    expect(result.reachedUntil).toBe(true);
    events.push(...result.events);
  }
  const archive = api.exportRun(run);
  expect(accepted(api.replay(archive)).fullHash).toBe(archive.hashes.full);
  expect(api.exportRun(accepted(api.restoreRun(archive))).hashes.full).toBe(archive.hashes.full);
  const life = archive.current.continuations.find((c) => c.person === PERSON)?.life;
  return { events, state: archive.current, life };
}

it('crosses the day-182 widowhood boundary without stalling and preserves events and RNG across chunks', () => {
  const whole = timeline(4 * HOUR);
  const hourly = timeline(HOUR);
  const wholeMortality = whole.life?.hazards.find((h) => h.key.kind === 'mortality');
  const hourlyMortality = hourly.life?.hazards.find((h) => h.key.kind === 'mortality');
  expect(wholeMortality).toBeDefined();
  expect(hourlyMortality).toBeDefined();
  expect(hourlyMortality?.acceptedIntegral).toBeCloseTo(wholeMortality?.acceptedIntegral ?? NaN, 12);
  expect(hourly.events).toEqual(whole.events);
  expect(hourly.state.people[PERSON]?.rng).toEqual(whole.state.people[PERSON]?.rng);
  expect(hourly.state.people[PERSON]?.randomIdentity).toEqual(whole.state.people[PERSON]?.randomIdentity);
});
