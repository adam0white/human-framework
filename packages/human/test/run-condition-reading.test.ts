/** SCOPE: G4 condition projections and observer-bounded answer forecasts. */
import { expect, it } from 'vitest';
import { createPerson, createRun, exportRun, inspect, preview, replay, step } from '../src/run.ts';
import { accepted, HOST, numericalPerson, numericalSpec, sleepOffer } from './run-numerical-fixture.ts';

function setup(pain = 0.8, seed = 7) {
  const spec = numericalSpec(seed);
  spec.definitions.skills = [{ id: 'cooking', label: 'Cooking', domain: 'general' }];
  spec.definitions.actions = [
    ...spec.definitions.actions,
    {
      id: 'cook',
      label: 'Cook',
      demands: {
        effort: 0.1,
        focus: 0.1,
        mode: 'awake',
        requires: {},
        skill: { id: 'cooking', difficulty: 0.8, domain: 'general' },
      },
      tags: [],
      norms: [],
    },
  ];
  spec.definitions.sources = [HOST, { type: 'person', id: 'chef' }, { type: 'person', id: 'cook' }];
  const run = accepted(createRun(spec));
  for (const id of ['chef', 'cook']) {
    const person = numericalPerson(seed);
    person.id = id;
    person.state.body.pain = id === 'cook' ? pain : 0;
    person.state.reserve = { pain: 0.5 };
    person.state.beliefs = [{ prop: 'work-reliable', logOdds: 0, updatedAt: 0, sources: [] }];
    accepted(createPerson(run, person));
  }
  return run;
}

it('projects reserve-filtered signs and spoken condition; held readings carry prior and decayed confidence', () => {
  const run = setup();
  const before = exportRun(run);
  const host = accepted(
    inspect(run, {
      perspective: { kind: 'host' },
      people: ['cook'],
      select: ['condition', 'needs', 'beliefs'],
    }),
  );
  expect(host.people[0]?.parts[2]).toEqual({
    select: 'beliefs',
    value: [{ prop: 'work-reliable', credence: 0.5, updatedAt: 0, sources: [] }],
  });
  const part = host.people[0]?.parts[0];
  if (part?.select !== 'condition' || !('outwardSigns' in part.value)) throw new Error('Missing condition');
  expect(part.value.outwardSigns.pain).toBeGreaterThan(part.value.selfReport.pain);
  const query = {
    perspective: { kind: 'person' as const, observer: 'chef' },
    people: ['cook'],
    select: ['condition' as const],
  };
  const prior = accepted(inspect(run, query));
  expect(prior.people[0]?.parts[0]).toMatchObject({
    value: { cues: expect.arrayContaining([{ key: 'pain', value: 0, confidence: 0 }]) },
  });
  expect(exportRun(run)).toEqual(before);
  accepted(
    step(run, {
      until: 0,
      inputs: [
        {
          id: 'look',
          at: 0,
          source: HOST,
          kind: 'person.glimpsed',
          payload: {
            person: 'chef',
            evidenceId: 'look',
            target: 'cook',
            signs: part.value.outwardSigns,
            clarity: 1,
          },
        },
        {
          id: 'assessment',
          at: 0,
          source: HOST,
          kind: 'person.reported',
          payload: {
            person: 'chef',
            evidenceId: 'assessment',
            target: 'cook',
            key: 'trait:goodhands:warm',
            value: 0.8,
            weight: 1,
            teller: 'chef',
          },
        },
      ],
    }),
  );
  expect(host.people[0]?.parts[1]).toMatchObject({
    select: 'needs',
    value: expect.arrayContaining([{ id: 'autonomy', level: 0.5, urgency: expect.any(Number) }]),
  });
  const held = accepted(inspect(run, query));
  expect(held.people[0]?.parts[0]).toMatchObject({
    value: {
      cues: expect.arrayContaining([
        expect.objectContaining({ key: 'pain', confidence: expect.any(Number) }),
      ]),
    },
  });
  const heldPart = held.people[0]?.parts[0];
  if (heldPart?.select !== 'condition' || !('cues' in heldPart.value)) throw new Error('Missing held cues');
  expect(heldPart.value.cues).toContainEqual(
    expect.objectContaining({ key: 'trait:goodhands:warm', value: 0.8 }),
  );
  const confidence = heldPart.value.cues.find((c) => c.key === 'pain')?.confidence ?? 0;
  expect(confidence).toBeGreaterThan(0);
  accepted(step(run, { until: 60000, inputs: [] }));
  const later = accepted(inspect(run, query)).people[0]?.parts[0];
  if (later?.select !== 'condition' || !('cues' in later.value)) throw new Error('Missing later cues');
  expect(later.value.cues.find((c) => c.key === 'pain')?.confidence).toBeLessThan(confidence);
  expect(JSON.stringify(held)).not.toContain('selfReport');
  expect(accepted(replay(exportRun(run))).verified).toBe(true);
});

it('forecasts another person from held evidence and never from their hidden body or target RNG', () => {
  const first = setup(0.1),
    second = setup(0.9, 19);
  const offers = [
    {
      ...sleepOffer(),
      id: 'cook-now',
      actionId: 'cook',
      label: 'Cook',
      durationMs: 60000,
      person: 'cook',
      demands: {
        ...sleepOffer().demands,
        mode: 'awake' as const,
        skill: { id: 'cooking', difficulty: 0.8, domain: 'general' as const },
      },
      expected: { needs: { competence: 1 }, followedBy: [], provenance: ['authored-cooking-control'] },
    },
  ];
  const query = {
    perspective: { kind: 'person' as const, observer: 'chef' },
    person: 'cook',
    until: 60000,
    inputs: [
      {
        id: 'offers',
        at: 0,
        source: HOST,
        kind: 'offers.received' as const,
        payload: { person: 'cook', revision: 1, offers },
      },
      {
        id: 'answer',
        at: 0,
        source: HOST,
        kind: 'decision.requested' as const,
        payload: {
          person: 'cook',
          reason: 'hypothetical request',
          treatment: 'ordinary' as const,
          offerRevision: 1,
        },
      },
    ],
  };
  const before = exportRun(first);
  const answer = accepted(preview(first, query));
  expect(answer).toEqual(accepted(preview(second, query)));
  expect(answer.impression?.cues).toContainEqual({ key: 'pain', value: 0, confidence: 0 });
  expect(answer.possibilities.some((event) => event.data.kind === 'decision')).toBe(true);
  const self = accepted(preview(first, { ...query, perspective: { kind: 'person', observer: 'cook' } }));
  expect(self.possibilities.some((event) => event.data.kind === 'decision')).toBe(true);
  expect(
    preview(first, {
      ...query,
      perspective: { kind: 'person', observer: 'cook' },
      inputs: [
        {
          id: 'forged',
          at: 0,
          source: { type: 'host', id: 'wrong' },
          kind: 'decision.requested',
          payload: { person: 'cook', reason: 'forged', treatment: 'ordinary', offerRevision: 1 },
        },
      ],
    }).ok,
  ).toBe(false);
  expect(exportRun(first)).toEqual(before);
  accepted(
    step(second, {
      until: 0,
      inputs: [
        {
          id: 'heard',
          at: 0,
          source: HOST,
          kind: 'person.reported',
          payload: {
            person: 'chef',
            evidenceId: 'heard',
            target: 'cook',
            key: 'skill:cooking',
            value: 1,
            weight: 1,
            teller: 'cook',
          },
        },
      ],
    }),
  );
  const informed = accepted(preview(second, query));
  expect(informed.impression).not.toEqual(answer.impression);
  expect(informed.possibilities).not.toEqual(answer.possibilities);
  expect(answer.possibilities.find((event) => event.data.kind === 'decision')?.data).toMatchObject({
    decision: { chosenAction: null },
  });
  expect(informed.possibilities.find((event) => event.data.kind === 'decision')?.data).toMatchObject({
    decision: { chosenAction: 'cook' },
  });
  expect(
    preview(first, {
      ...query,
      bodyForecast: [{ label: 'leak', durationMs: 1, load: { effort: 0, focus: 0, mode: 'awake' } }],
    }).ok,
  ).toBe(false);
});

it('headless control keeps real choice settlement and replay separate from the observer forecast', () => {
  const run = setup();
  const query = {
    perspective: { kind: 'person' as const, observer: 'chef' },
    person: 'cook',
    until: 60000,
    inputs: [],
  };
  const before = exportRun(run);
  accepted(preview(run, query));
  expect(exportRun(run)).toEqual(before);
  accepted(
    step(run, {
      until: 0,
      inputs: [
        {
          id: 'real-offers',
          at: 0,
          source: HOST,
          kind: 'offers.received',
          payload: { person: 'cook', revision: 1, offers: [{ ...sleepOffer(), person: 'cook' }] },
        },
      ],
    }),
  );
  const archive = exportRun(run);
  expect(accepted(replay(JSON.parse(JSON.stringify(archive)))).fullHash).toBe(archive.hashes.full);
});
