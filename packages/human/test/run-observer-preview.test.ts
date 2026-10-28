/** SCOPE: detached public preview uses held knowledge and cannot book a live act. */
import { expect, it } from 'vitest';
import { createPerson, createRun, exportRun, inspect, preview } from '../src/run.ts';
import {
  accepted,
  numericalPerson as authoredNumericalPerson,
  numericalSpec,
} from './run-numerical-fixture.ts';

// Explicit valid authoring for these integration controls; owner numerical fixture is separately reserved.
function numericalPerson(seed: number) {
  const person = authoredNumericalPerson(seed);
  person.state.retention = { ...person.state.retention, trace: 32 };
  return person;
}

it('keeps the live archive unchanged and omits hidden target simulation', () => {
  const make = (satiety: number) => {
    const spec = numericalSpec(4);
    const run = accepted(createRun(spec));
    const self = numericalPerson(4);
    self.id = 'self';
    accepted(createPerson(run, self));
    const other = numericalPerson(4);
    other.id = 'other';
    other.state.body.satiety = satiety;
    accepted(createPerson(run, other));
    return run;
  };
  const first = make(0.1),
    second = make(0.9),
    before = exportRun(first);
  const query = {
    perspective: { kind: 'person' as const, observer: 'self' },
    person: 'self',
    until: 60000,
    inputs: [],
    bodyForecast: [
      { label: 'wait', durationMs: 60000, load: { effort: 0.1, focus: 0, mode: 'awake' as const } },
    ],
  };
  const prediction = accepted(preview(first, query));
  expect(prediction).toEqual(accepted(preview(first, query)));
  expect(prediction).toEqual(accepted(preview(second, query)));
  expect(exportRun(first)).toEqual(before);
  expect(prediction.hypothetical).toBe(true);
  expect(JSON.stringify(prediction)).not.toContain('"other"');
});

it('composes actual lifecycle readers while a person cannot request target truth', () => {
  const run = accepted(createRun(numericalSpec(8)));
  const self = numericalPerson(8);
  self.id = 'self';
  accepted(createPerson(run, self));
  const before = exportRun(run);
  const host = accepted(
    inspect(run, {
      perspective: { kind: 'host' },
      people: ['self'],
      select: ['summary'],
      lifecycle: { kind: 'host', query: { kind: 'age', person: 'self', at: 0 } },
    }),
  );
  expect(host.lifecycle?.perspective.kind).toBe('host');
  if (!host.lifecycle || !('value' in host.lifecycle)) throw new Error('Missing actual host lifecycle');
  expect(host.lifecycle.value).toBe(30);
  const held = accepted(
    inspect(run, {
      perspective: { kind: 'person', observer: 'self' },
      people: ['self'],
      select: [],
      lifecycle: {
        kind: 'person',
        query: { kind: 'held-kin', person: 'self', other: { kind: 'entity', id: 'unseen' } },
      },
    }),
  );
  if (!held.lifecycle || !('unknowns' in held.lifecycle)) throw new Error('Missing held-evidence view');
  expect(held.lifecycle.unknowns).toEqual([{ kind: 'entity', id: 'unseen' }]);
  expect(
    inspect(run, {
      perspective: { kind: 'person', observer: 'self' },
      people: ['self'],
      select: [],
      lifecycle: { kind: 'host', query: { kind: 'age', person: 'self', at: 0 } },
    }).ok,
  ).toBe(false);
  expect(exportRun(run)).toEqual(before);
});

it('reads held source trust for host and self while another observer gets no hidden trust', () => {
  const run = accepted(createRun(numericalSpec(8)));
  const self = numericalPerson(8);
  self.id = 'self';
  self.state.sourceTrust = [{ sourceId: 'numerical-host', trust: 0.7 }];
  accepted(createPerson(run, self));
  const other = numericalPerson(8);
  other.id = 'other';
  accepted(createPerson(run, other));
  const before = exportRun(run);
  for (const perspective of [{ kind: 'host' } as const, { kind: 'person', observer: 'self' } as const]) {
    const read = accepted(inspect(run, { perspective, people: ['self'], select: ['sourceTrust'] }));
    expect(read.people[0]?.parts).toEqual([{ select: 'sourceTrust', value: { 'numerical-host': 0.7 } }]);
  }
  const read = accepted(
    inspect(run, {
      perspective: { kind: 'person', observer: 'other' },
      people: ['self'],
      select: ['sourceTrust'],
    }),
  );
  expect(read.people[0]?.parts).toEqual([{ select: 'sourceTrust', value: { kind: 'unobserved' } }]);
  expect(exportRun(run)).toEqual(before);
});

it('previews structured conditional body spans with an exertion control and no live mutation', () => {
  const run = accepted(createRun(numericalSpec(8)));
  const self = numericalPerson(8);
  self.id = 'self';
  self.state.body.sleepPressure = 0.1;
  self.state.body.sleepDebtHours = 0;
  accepted(createPerson(run, self));
  const before = exportRun(run);
  const query = {
    perspective: { kind: 'person' as const, observer: 'self' },
    person: 'self',
    until: 0,
    inputs: [],
    bodyForecast: [
      { label: 'climb', durationMs: 600_000, load: { effort: 0.9, focus: 0.1, mode: 'awake' as const } },
      { label: 'errands', durationMs: 600_000, load: { effort: 0.5, focus: 0.1, mode: 'awake' as const } },
    ],
  };
  const work = accepted(preview(run, query));
  const rest = accepted(
    preview(run, {
      ...query,
      bodyForecast: query.bodyForecast.map((s) => ({ ...s, load: { ...s.load, effort: 0 } })),
    }),
  );
  expect(work.bodyForecast).toMatchObject({
    person: 'self',
    from: 0,
    spans: [
      { label: 'climb', endsAt: 600_000, basis: 'conditional-load-projection' },
      { label: 'errands', endsAt: 1_200_000, basis: 'conditional-load-projection' },
    ],
  });
  expect(work.bodyForecast?.spans[1]?.worst).toBeGreaterThan(rest.bodyForecast?.spans[1]?.worst ?? 1);
  expect(preview(run, { ...query, bodyForecast: Array(5).fill(query.bodyForecast[0]) })).toMatchObject({
    ok: false,
    error: { code: 'limit-exceeded' },
  });
  expect(
    preview(run, {
      ...query,
      bodyForecast: [{ label: 'invalid', durationMs: -1, load: { effort: 0, focus: 0, mode: 'awake' } }],
    }),
  ).toMatchObject({
    ok: false,
    error: { code: 'invalid-schema' },
  });
  expect(exportRun(run)).toEqual(before);
});
