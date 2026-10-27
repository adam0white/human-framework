/** SCOPE: body branches decided at the cell anchor. The fed gate and the health floor are discrete branches of
 * the body's right-hand side; a cell ends where one changes, so a person can drain through being fed and can
 * starve to death at any step size instead of wedging the run. */
import { expect, test } from 'vitest';
import { authoredPerson, DAY, exampleSpec, need, START } from '../examples/minimal.ts';
import { createPerson, createRun, exportRun, step } from '../src/index.ts';
import { accepted, HOUR, numericalPerson, numericalSpec, PERSON } from './run-numerical-fixture.ts';

test('a person below full health drains through the fed threshold without stalling', () => {
  const run = accepted(createRun(numericalSpec(1)));
  const person = numericalPerson(1);
  person.state.body.health = 0.9;
  accepted(createPerson(run, person));
  for (let h = 1; h <= 24; h++) accepted(step(run, { until: h * HOUR, inputs: [] }));
  expect(exportRun(run).current.people[PERSON]?.body.satiety).toBeLessThan(0.3);
}, 60_000);

test('an acute illness whose trend falls to its floor keeps the run advancing', () => {
  const run = accepted(createRun(numericalSpec(1)));
  const person = numericalPerson(1);
  person.state.body.health = 0.9;
  person.state.body.illnesses = [
    { id: 'flu', kind: 'flu', severity: 0.35, trendPerDay: -0.29, contagious: false, since: 0 },
  ];
  accepted(createPerson(run, person));
  for (let h = 1; h <= 24; h++) accepted(step(run, { until: h * HOUR, inputs: [] }));
  expect(exportRun(run).current.people[PERSON]?.body.illnesses[0]?.trendPerDay).toBeGreaterThanOrEqual(-0.3);
}, 60_000);

test('an injured person keeps the run advancing', () => {
  const run = accepted(createRun(numericalSpec(1)));
  const person = numericalPerson(1);
  person.state.body.injuries = [
    { id: 'cut', part: 'arm', severity: 0.2, healRatePerDay: 0.5, since: 0, bleeding: 0.05 },
  ];
  accepted(createPerson(run, person));
  for (let h = 1; h <= 24; h++) accepted(step(run, { until: h * HOUR, inputs: [] }));
  expect(exportRun(run).current.at).toBe(24 * HOUR);
}, 60_000);

test('a person with no food starves to death at the same time under any step size', () => {
  const deathAt = (chunk: number) => {
    const spec = exampleSpec();
    spec.definitions.calendar.days = Array.from({ length: 6 }, (_, i) => ({
      dayIndex: i,
      start: i * DAY,
      windows: [],
    }));
    const run = need(createRun(spec));
    need(createPerson(run, authoredPerson('ada', 'Ada')));
    for (let at = START + chunk; at <= START + 5 * DAY; at += chunk)
      for (const e of need(step(run, { until: at, inputs: [] })).events)
        if (e.data.kind === 'body-change' && e.data.change.kind === 'died') return e.at;
    return null;
  };
  const hourly = deathAt(HOUR);
  expect(hourly).not.toBeNull();
  expect(deathAt(5 * DAY)).toBe(hourly);
}, 60_000);
