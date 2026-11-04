/** SCOPE: detached public preview uses held knowledge and cannot book a live act. */
import { expect, it } from 'vitest';
import { createPerson, createRun, exportRun, inspect, preview, step } from '../src/run.ts';
import type { PreviewQuery } from '../src/run-schema.ts';
import {
  accepted,
  numericalPerson as authoredNumericalPerson,
  HOST,
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
    before = exportRun(first),
    beforeSecond = exportRun(second);
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
  expect(exportRun(second)).toEqual(beforeSecond);
  expect(prediction.hypothetical).toBe(true);
  expect(JSON.stringify(prediction)).not.toContain('"other"');

  // SCOPE: another person's physical projection is conditional on held fatigue,
  // never on the target's body, motives, ambient, continuation, or random state.
  const held = (seed: number, satiety: number, fatigue = 0.9, reports = 149, weight = 1, now = 0) => {
    const spec = numericalSpec(seed);
    spec.start = now;
    spec.definitions.sources = [HOST, { type: 'person', id: 'self' }, { type: 'person', id: 'other' }];
    const run = accepted(createRun(spec));
    const observer = numericalPerson(4);
    observer.id = 'self';
    observer.identity.birthAt += now;
    observer.state.body.since = now;
    observer.state.body.doze.basis.at = now;
    accepted(createPerson(run, observer));
    const target = numericalPerson(seed);
    target.id = 'other';
    target.identity.birthAt += now;
    target.state.body.since = now;
    target.state.body.doze.basis.at = now;
    target.state.body.satiety = satiety;
    target.state.body.sleepPressure = satiety;
    target.state.needs.safety = satiety;
    accepted(createPerson(run, target));
    // 149 reports retain a strong cue after the ordinary testimony weighting.
    // Assert its actual public confidence; confidence is not a latent error radius.
    accepted(
      step(run, {
        until: now,
        inputs: [
          {
            id: 'target-ambient',
            at: now,
            source: HOST,
            kind: 'ambient.received' as const,
            payload: {
              person: 'other',
              evidenceId: 'target-ambient',
              environment: {
                contextId: 'room',
                readings: { cold: satiety, dark: satiety },
                basis: {
                  kind: 'received' as const,
                  evidenceId: 'target-ambient',
                  at: now,
                  validUntil: now + 86400001,
                },
              },
            },
          },
          ...Array.from({ length: reports }, (_, i) => ({
            id: `fatigue-report-${i}`,
            at: now,
            source: HOST,
            kind: 'person.reported' as const,
            payload: {
              person: 'self',
              target: 'other',
              teller: 'self',
              evidenceId: `fatigue-report-${i}`,
              key: 'fatigue' as const,
              value: fatigue,
              weight,
            },
          })),
        ],
      }),
    );
    return run;
  };
  const observed = held(4, 0.1);
  const variant = held(9, 0.9);
  const condition = accepted(
    inspect(observed, {
      perspective: { kind: 'person', observer: 'self' },
      people: ['other'],
      select: ['condition'],
    }),
  );
  expect(condition.people[0]?.parts[0]).toMatchObject({
    value: { cues: expect.arrayContaining([{ key: 'fatigue', value: 0.9, confidence: 0.989, seenAt: 0 }]) },
  });
  const otherQuery = { ...query, person: 'other' };
  const declaredSpan = otherQuery.bodyForecast[0];
  if (!declaredSpan) throw new Error('Missing declared span');
  const queryUnchanged = (run: typeof observed) => {
    const archive = JSON.stringify(exportRun(run));
    const result = preview(run, otherQuery);
    expect(JSON.stringify(exportRun(run))).toBe(archive);
    return result;
  };
  const otherResult = queryUnchanged(observed);
  expect(otherResult.ok).toBe(true);
  if (!otherResult.ok) throw new Error(JSON.stringify(otherResult.error));
  expect(otherResult.value).toMatchObject({
    at: 0,
    hypothetical: true,
    possibilities: [],
    bodyForecast: {
      kind: 'observer-conditional',
      evidence: { key: 'fatigue', fatigueValue: 0.9, confidence: 0.989, seenAt: 0, ageMs: 0 },
      projection: expect.any(Object),
    },
  });
  expect(JSON.stringify(queryUnchanged(observed))).toBe(JSON.stringify(otherResult));
  expect(JSON.stringify(queryUnchanged(variant))).toBe(JSON.stringify(otherResult));
  const forecast = otherResult.value.bodyForecast;
  if (forecast?.kind !== 'observer-conditional') throw new Error('Missing observer union');
  if (forecast.projection.status === 'available') {
    expect(forecast.projection.samples).toHaveLength(2);
    for (const sample of forecast.projection.samples) expect(sample.initial.fatigue).toBe(0.9);
  } else expect(forecast.projection.reason).toMatch(/^unrepresentable-/);

  const check = (run: typeof observed, q: PreviewQuery = otherQuery) => {
    const archive = JSON.stringify(exportRun(run));
    const result = preview(run, q);
    expect(JSON.stringify(exportRun(run))).toBe(archive);
    expect(preview(run, q)).toEqual(result);
    expect(JSON.stringify(exportRun(run))).toBe(archive);
    return result;
  };
  const positive = held(4, 0.1, 1);
  const positiveResult = accepted(check(positive));
  if (
    positiveResult.bodyForecast?.kind !== 'observer-conditional' ||
    positiveResult.bodyForecast.projection.status !== 'available'
  )
    throw new Error('Fatigue 1 must project');
  expect(positiveResult.bodyForecast.projection.samples.map((sample) => sample.name)).toEqual([
    'lower-pressure',
    'higher-pressure',
  ]);
  for (const sample of positiveResult.bodyForecast.projection.samples) {
    expect(sample.initial.fatigue).toBe(1);
    expect(sample.initial.exertion).toBe(1);
  }
  const workResult = accepted(
    check(positive, {
      ...otherQuery,
      bodyForecast: [
        { label: 'explicit work', durationMs: 60000, load: { effort: 1, focus: 0, mode: 'awake' } },
      ],
    }),
  );
  if (
    workResult.bodyForecast?.kind !== 'observer-conditional' ||
    workResult.bodyForecast.projection.status !== 'available'
  )
    throw new Error('Missing work samples');
  expect(workResult.bodyForecast.projection.samples.map((sample) => sample.spans[0]?.endpoint)).not.toEqual(
    positiveResult.bodyForecast.projection.samples.map((sample) => sample.spans[0]?.endpoint),
  );
  expect(accepted(check(held(9, 0.9, 1)))).toEqual(positiveResult);
  expect(accepted(check(first)).bodyForecast).toMatchObject({
    kind: 'observer-conditional',
    projection: { status: 'unavailable', reason: 'unseen' },
  });
  expect(accepted(check(held(4, 0.1, 0.1))).bodyForecast).toMatchObject({
    projection: { status: 'unavailable', reason: 'unrepresentable-exertion' },
  });
  expect(accepted(check(held(4, 0.1, 1, 1, 0.001))).bodyForecast).toMatchObject({
    projection: { status: 'unavailable', reason: 'weak-evidence' },
  });
  expect(check(positive, { ...otherQuery, until: 60001 })).toMatchObject({
    ok: false,
    error: { code: 'invalid-admission' },
  });
  expect(check(positive, { ...otherQuery, bodyForecast: [{ ...declaredSpan, label: ' ' }] })).toMatchObject({
    ok: false,
    error: { code: 'invalid-admission' },
  });
  expect(
    check(positive, {
      ...otherQuery,
      bodyForecast: [declaredSpan, declaredSpan],
      until: 120000,
    }),
  ).toMatchObject({ ok: false, error: { code: 'invalid-admission' } });
  expect(check(positive, { ...otherQuery, select: ['affect'] })).toMatchObject({
    ok: false,
    error: { code: 'invalid-admission' },
  });
  expect(check(positive, { ...otherQuery, fidelity: { mode: 'fine' } })).toMatchObject({
    ok: false,
    error: { code: 'invalid-admission' },
  });
  expect(
    check(positive, {
      ...otherQuery,
      bodyForecast: [{ ...declaredSpan, durationMs: 0 }],
      until: 0,
    }),
  ).toMatchObject({ ok: false, error: { code: 'invalid-admission' } });
  expect(
    check(positive, {
      ...otherQuery,
      bodyForecast: [{ ...declaredSpan, load: { effort: Number.NaN, focus: 0, mode: 'awake' } }],
    }),
  ).toMatchObject({ ok: false, error: { code: 'invalid-schema' } });
  // This valid full-horizon request does not necessarily exhaust the work caps.
  const long = accepted(
    check(positive, {
      ...otherQuery,
      until: 86400000,
      bodyForecast: [
        { label: 'long work', durationMs: 86400000, load: { effort: 1, focus: 0, mode: 'awake' } },
      ],
    }),
  );
  expect(long.bodyForecast).toMatchObject({
    kind: 'observer-conditional',
    projection: { status: 'available' },
  });
  expect(
    check(positive, {
      ...otherQuery,
      until: 86400001,
      bodyForecast: [
        { label: 'over horizon', durationMs: 86400001, load: { effort: 1, focus: 0, mode: 'awake' } },
      ],
    }),
  ).toMatchObject({ ok: false, error: { code: 'limit-exceeded' } });
  const aged = held(4, 0.1, 1);
  const elapsed = accepted(step(aged, { until: 43200001, inputs: [] }));
  expect(elapsed.at).toBe(43200001);
  const stale = accepted(check(aged, { ...otherQuery, until: 43260001 }));
  expect(stale.bodyForecast).toMatchObject({
    evidence: { seenAt: 0, ageMs: 43200001 },
    projection: { status: 'unavailable', reason: 'stale-evidence' },
  });
  // A large legal epoch exposes readout rounding kinks. It exhausts shared fit
  // work honestly; no production cap, tolerance or sample prior changes for this fixture.
  const epoch = 2 ** 52;
  const numericalStress = held(4, 0.1, 1, 149, 1, epoch);
  expect(
    check(numericalStress, {
      ...otherQuery,
      until: epoch + 86400000,
      bodyForecast: [
        {
          label: 'numerical epoch stress',
          durationMs: 86400000,
          load: { effort: 1, focus: 0, mode: 'awake' },
        },
      ],
    }),
  ).toMatchObject({
    ok: false,
    error: { code: 'limit-exceeded', message: 'limit-exceeded: observer body fits' },
  });
  // Public testimony always timestamps a cue. Unknown-age cannot be authored through
  // this route; do not corrupt private state to manufacture that policy fixture.
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
    kind: 'conditional-body',
    person: 'self',
    from: 0,
    spans: [
      { label: 'climb', endsAt: 600_000, basis: 'conditional-load-projection' },
      { label: 'errands', endsAt: 1_200_000, basis: 'conditional-load-projection' },
    ],
  });
  if (work.bodyForecast?.kind !== 'conditional-body' || rest.bodyForecast?.kind !== 'conditional-body')
    throw new Error('Missing self body forecast');
  expect(work.bodyForecast.spans[1]?.worst).toBeGreaterThan(rest.bodyForecast.spans[1]?.worst ?? 1);
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
