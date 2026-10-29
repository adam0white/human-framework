/** SCOPE: actual public scheduler reaches its caller endpoint using owner kernels. */
import { expect, it } from 'vitest';
import {
  createPerson,
  createRun,
  exportRun,
  readRunHistory,
  replay,
  restoreRun,
  step,
} from '../src/index.ts';
import type { Input, NewbornContext } from '../src/run-schema.ts';
import {
  accepted,
  numericalPerson as authoredNumericalPerson,
  DAY,
  numericalSpec,
  semanticInputs,
  sleepOffer,
} from './run-numerical-fixture.ts';

// Explicit valid authoring for these integration controls; owner numerical fixture is separately reserved.
function numericalPerson(seed: number) {
  const person = authoredNumericalPerson(seed);
  person.state.retention = { ...person.state.retention, trace: 32 };
  return person;
}

it('advances a real authored actor and detaches returned events', () => {
  const run = accepted(createRun(numericalSpec(1)));
  accepted(createPerson(run, numericalPerson(1)));
  const result = accepted(step(run, { until: 60000, inputs: [] }));
  expect(result.at).toBe(60000);
  expect(result.reachedUntil).toBe(true);
  const archive = exportRun(run);
  expect(archive.current.people['numerical-person']?.now).toBe(60000);
  expect(readRunHistory(archive)).toHaveLength(1);
});

it('reaches the first sixteen hours before host settlement is required', () => {
  const spec = numericalSpec(1);
  spec.definitions = {
    ...spec.definitions,
    sources: spec.definitions.sources,
  };
  const run = accepted(createRun(spec));
  accepted(createPerson(run, numericalPerson(1)));
  const result = accepted(step(run, { until: DAY, inputs: semanticInputs() }));
  expect(result.boundary.type).toBe('world-required');
  expect(result.at).toBe(16 * 3600000);
});

it('settles actual sleep requests through the complete 24h run', () => {
  const spec = numericalSpec(1);
  spec.definitions = {
    ...spec.definitions,
    sources: spec.definitions.sources,
  };
  const run = accepted(createRun(spec));
  accepted(createPerson(run, numericalPerson(1)));
  let result = accepted(step(run, { until: DAY, inputs: semanticInputs() }));
  for (let count = 0; result.boundary.type === 'world-required'; count++) {
    if (count > 10) throw new Error('Unexpected request loop');
    const inputs = result.boundary.requests.map((request) => {
      if (request.kind !== 'action') throw new Error('Unexpected communication');
      return {
        id: `settle-${request.id}`,
        at: result.at,
        source: { type: 'host' as const, id: spec.host.id },
        kind: 'action.resolved' as const,
        payload: {
          requestId: request.id,
          requestHash: request.requestHash,
          person: request.person,
          activityId: request.activityId,
          stage: request.stage,
          worldRevision: exportRun(run).current.world.revision,
          disposition: request.stage === 'start' ? ('accepted' as const) : ('completed' as const),
          ...(request.stage === 'start'
            ? {}
            : {
                outcome: {
                  activityId: request.activityId,
                  offerId: request.offerId,
                  actionId: 'sleep',
                  start: 16 * 3600000,
                  end: DAY,
                  status: 'completed' as const,
                  evidenceId: 'actual-sleep',
                  actual: { exposures: [], observedProgress: [] },
                  fulfills: [],
                  advances: [],
                },
              }),
          observations: [],
        },
      };
    });
    result = accepted(step(run, { until: DAY, inputs }));
  }
  expect(result.at).toBe(DAY);
  expect(exportRun(run).current.pending).toHaveLength(0);
  const archive = exportRun(run),
    restored = accepted(restoreRun(archive));
  expect(exportRun(restored)).toEqual(archive);
  const reproduced = accepted(replay(archive));
  expect(reproduced.verified).toBe(true);
  expect(reproduced.fullHash).toBe(archive.hashes.full);
});
it('caller checkpoints preserve the reached physical state and random stream', () => {
  const make = () => {
    const run = accepted(createRun(numericalSpec(3)));
    accepted(createPerson(run, numericalPerson(3)));
    return run;
  };
  const whole = make(),
    chunks = make();
  accepted(step(whole, { until: 6 * 3600000, inputs: [] }));
  for (const until of [12345, 690001, 3600000, 5678901, 6 * 3600000])
    accepted(step(chunks, { until, inputs: [] }));
  const a = exportRun(whole).current.people['numerical-person'],
    b = exportRun(chunks).current.people['numerical-person'];
  if (!a || !b) throw new Error('Missing actor');
  expect(exportRun(chunks).current.events).toEqual(exportRun(whole).current.events);
  expect(a.rng).toEqual(b.rng);
  expect(a.randomIdentity).toEqual(b.randomIdentity);
  for (const key of ['satiety', 'hydration', 'sleepPressure', 'exertion', 'health', 'pain'] as const)
    expect(Math.abs(a.body[key] - b.body[key])).toBeLessThanOrEqual(1e-9);
});
it('chains two issued request receipts and rejects the whole batch atomically', () => {
  const spec = numericalSpec(2);
  spec.definitions = {
    ...spec.definitions,
    sources: [...spec.definitions.sources, { type: 'person', id: 'a' }, { type: 'person', id: 'b' }],
  };
  let run = accepted(createRun(spec));
  const inputs = [];
  for (const id of ['a', 'b']) {
    const person = numericalPerson(2);
    person.id = id;
    accepted(createPerson(run, person));
    const offer = { ...sleepOffer(), id: `sleep-${id}`, person: id, durationMs: 1 };
    inputs.push({
      id: `offer-${id}`,
      at: 0,
      source: { type: 'host' as const, id: spec.host.id },
      kind: 'offers.received' as const,
      payload: { person: id, revision: 1, offers: [offer] },
    });
    inputs.push({
      id: `decide-${id}`,
      at: 0,
      source: { type: 'person' as const, id },
      kind: 'decision.requested' as const,
      payload: { person: id, reason: 'sleep', treatment: 'ordinary' as const, offerRevision: 1 },
    });
  }
  const opening = accepted(step(run, { until: 1, inputs }));
  if (opening.boundary.type !== 'world-required') throw new Error('Missing actual host boundary');
  expect(opening.boundary.requests).toHaveLength(2);
  const responses = opening.boundary.requests.map((request, index) => {
    if (request.kind !== 'action') throw new Error('Expected action');
    return {
      id: `0${index}-receipt`,
      at: 0,
      source: { type: 'host' as const, id: spec.host.id },
      kind: 'action.resolved' as const,
      payload: {
        requestId: request.id,
        requestHash: request.requestHash,
        person: request.person,
        activityId: request.activityId,
        stage: request.stage,
        worldRevision: index,
        disposition: 'accepted' as const,
        observations: [],
        worldChange: {
          expectedRevision: index,
          revision: index + 1,
          put: [],
          remove: [],
          hostState: { settled: index + 1 },
        },
      },
    };
  });
  const before = exportRun(run);
  const bad = structuredClone(responses);
  if (!bad[1]) throw new Error('Missing second receipt');
  bad[1].payload.requestHash = '0'.repeat(64);
  expect(step(run, { until: 1, inputs: bad }).ok).toBe(false);
  expect(exportRun(run)).toEqual(before);
  accepted(step(run, { until: 0, inputs: responses }));
  expect(exportRun(run).current.world.revision).toBe(2);
  run = accepted(restoreRun(exportRun(run)));
  const refresh = {
    id: 'refresh-only-a',
    at: 1,
    source: { type: 'host' as const, id: spec.host.id },
    kind: 'offers.received' as const,
    payload: {
      person: 'a',
      revision: 2,
      offers: [{ ...sleepOffer(), id: 'new-a', person: 'a', durationMs: 1 }],
    },
  };
  const finishing = accepted(step(run, { until: 1, inputs: [refresh] }));
  if (finishing.boundary.type !== 'world-required') throw new Error('Missing actual finish boundary');
  expect(finishing.boundary.requests).toHaveLength(2);
  expect(exportRun(run).current.offers.a?.revision).toBe(2);
  expect(
    finishing.boundary.requests.every((request) => request.kind === 'action' && request.offerRevision === 1),
  ).toBe(true);
  const settlements = finishing.boundary.requests.map((request, index) => {
    if (request.kind !== 'action') throw new Error('Expected finish action');
    return {
      id: `finish-${index}`,
      at: finishing.at,
      source: { type: 'host' as const, id: spec.host.id },
      kind: 'action.resolved' as const,
      payload: {
        requestId: request.id,
        requestHash: request.requestHash,
        person: request.person,
        activityId: request.activityId,
        stage: request.stage,
        worldRevision: 2,
        disposition: 'completed' as const,
        observations: [],
        outcome: {
          activityId: request.activityId,
          offerId: request.offerId,
          actionId: 'sleep',
          start: 0,
          end: finishing.at,
          status: 'completed' as const,
          evidenceId: `finish-evidence-${index}`,
          actual: { exposures: [], observedProgress: [] },
          fulfills: [],
          advances: [],
        },
      },
    };
  });
  const first = settlements[0],
    second = settlements[1];
  if (!first || !second) throw new Error('Missing pair');
  const partial = accepted(step(run, { until: finishing.at + 1, inputs: [first] }));
  expect(partial.at).toBe(finishing.at);
  expect(partial.boundary.type).toBe('world-required');
  const rng = exportRun(run).current.people.a?.rng;
  const waiting = accepted(step(run, { until: finishing.at + 1, inputs: [] }));
  expect(waiting.at).toBe(finishing.at);
  expect(exportRun(run).current.people.a?.rng).toEqual(rng);
  const complete = accepted(step(run, { until: finishing.at, inputs: [second] }));
  expect(complete.boundary.type).toBe('until');
});
it('disposes a previously queued receipt after actual death', () => {
  const spec = numericalSpec(5),
    run = accepted(createRun(spec));
  accepted(createPerson(run, numericalPerson(5)));
  const host = { type: 'host' as const, id: spec.host.id };
  const result = accepted(
    step(run, {
      until: 10,
      inputs: [
        {
          id: 'death',
          at: 5,
          source: host,
          kind: 'lifecycle.received',
          payload: {
            type: 'death',
            person: { kind: 'actor', id: 'numerical-person' },
            basis: { evidence: { kind: 'evidence', id: 'actual-death' }, worldRevision: 0 },
          },
        },
        {
          id: 'later-food',
          at: 6,
          source: host,
          kind: 'body.received',
          payload: {
            person: 'numerical-person',
            evidenceId: 'later-food-evidence',
            receipt: { type: 'consumed', actionReceipt: 'food', received: { food: 0.4 } },
          },
        },
      ],
    }),
  );
  expect(result.at).toBe(10);
  const state = exportRun(run).current;
  expect(state.people['numerical-person']?.body.alive).toBe(false);
  expect(state.receipts.dispositions.find((receipt) => receipt.inputId === 'later-food')?.kind).toBe(
    'inapplicable',
  );
});

it('records offscreen conception and maternal delivery without inventing actors', () => {
  const spec = numericalSpec(6);
  const run = accepted(createRun(spec));
  accepted(createPerson(run, numericalPerson(6)));
  const source = { type: 'host' as const, id: spec.host.id };
  accepted(
    step(run, {
      until: 1,
      inputs: [
        {
          id: 'conception',
          at: 0,
          source,
          kind: 'lifecycle.received',
          payload: {
            type: 'conception',
            mother: { kind: 'actor', id: 'numerical-person' },
            father: { kind: 'identified', entity: { kind: 'entity', id: 'offscreen-father' } },
            offspring: { kind: 'entity', id: 'offscreen-child' },
            pregnancyId: 'pregnancy',
            basis: { evidence: { kind: 'evidence', id: 'conception-proof' }, worldRevision: 0 },
          },
        },
      ],
    }),
  );
  const pregnant = exportRun(run).current;
  expect(pregnant.people['numerical-person']?.family.pregnancy?.id).toBe('pregnancy');
  expect(pregnant.lifecycle.streams[0]?.uniformDraws).toBe(14);
  expect(pregnant.lifecycle.entities.map((entity) => entity.id)).toContain('offscreen-father');
  accepted(
    step(run, {
      until: 3,
      inputs: [
        {
          id: 'birth',
          at: 2,
          source,
          kind: 'lifecycle.received',
          payload: {
            type: 'birth',
            child: { kind: 'reference', child: { kind: 'entity', id: 'offscreen-child' } },
            delivery: {
              kind: 'open-pregnancy',
              mother: { kind: 'actor', id: 'numerical-person' },
              pregnancyId: 'pregnancy',
            },
            basis: { evidence: { kind: 'evidence', id: 'delivery-proof' }, worldRevision: 0 },
          },
        },
      ],
    }),
  );
  const state = exportRun(run).current;
  expect(Object.keys(state.people)).toEqual(['numerical-person']);
  expect(state.people['numerical-person']?.family.pregnancy).toBeUndefined();
  expect(
    state.people['numerical-person']?.memory.episodes.some(
      (episode) => episode.targetId === 'offscreen-child',
    ),
  ).toBe(true);
  expect(state.receipts.allocated.some((receipt) => receipt.reference.kind === 'episode')).toBe(true);
});

it('materializes an inherited newborn with authored social premises and a separate genetic stream', () => {
  const spec = numericalSpec(7);
  spec.definitions.sources = [
    ...spec.definitions.sources,
    { type: 'person', id: 'mother' },
    { type: 'person', id: 'father' },
  ];
  const mother = numericalPerson(7),
    father = numericalPerson(7);
  mother.id = 'mother';
  father.id = 'father';
  father.identity.sex = 'male';
  const { body, needs, reserve, retention, affect, promptings, review } = numericalPerson(7).state;
  const context: NewbornContext = { body, needs, reserve, retention, affect, promptings, review };
  const relationships = [
    {
      otherId: 'mother',
      affection: 0.8,
      trust: 0.7,
      respect: 0.6,
      familiarity: 0.5,
      roles: ['parent'],
      ledger: 0,
      lastInteraction: 0,
    },
  ] satisfies NonNullable<NewbornContext['relationships']>;
  const voices = [{ voiceId: 'mother', trust: 0.75 }];
  const make = () => {
    const run = accepted(createRun(spec));
    accepted(createPerson(run, mother));
    accepted(createPerson(run, father));
    return run;
  };
  const birth = (initial: NewbornContext): Input => ({
    id: 'newborn',
    at: 0,
    source: { type: 'host', id: spec.host.id },
    kind: 'lifecycle.received',
    payload: {
      type: 'birth',
      child: {
        kind: 'create',
        newborn: {
          kind: 'two-parent-derived',
          id: 'child',
          identity: { name: 'Child' },
          sex: { kind: 'draw' },
          parents: [
            { kind: 'actor', id: 'mother' },
            { kind: 'actor', id: 'father' },
          ],
          context: initial,
        },
      },
      delivery: { kind: 'not-recorded' },
      basis: { evidence: { kind: 'evidence', id: 'birth-proof' }, worldRevision: 0 },
    },
  });
  const run = make(),
    empty = make();
  accepted(step(run, { until: 0, inputs: [birth({ ...context, relationships, voices })] }));
  accepted(step(empty, { until: 0, inputs: [birth(context)] }));
  const archive = exportRun(run),
    state = archive.current,
    child = state.people.child,
    emptyState = exportRun(empty).current;
  expect(child?.life.bornAt).toBe(0);
  expect(child?.social.relationships).toEqual(relationships);
  expect(child?.will.voices).toMatchObject(voices);
  expect(emptyState.people.child?.social.relationships).toEqual([]);
  expect(emptyState.people.child?.will.voices).toEqual([]);
  expect(child?.traits).toEqual(emptyState.people.child?.traits);
  expect(child?.family.aptitudes).toEqual(emptyState.people.child?.family.aptitudes);
  expect(child?.values).toEqual(emptyState.people.child?.values);
  expect(Object.values(child?.values ?? {})).toEqual(Array(10).fill(0.5));
  expect(state.lifecycle.origins).toEqual(emptyState.lifecycle.origins);
  expect(state.lifecycle.origins.find((origin) => origin.person === 'child')?.origin.kind).toBe(
    'two-parent-derived',
  );
  const stream = state.lifecycle.streams.find((stream) => stream.identity.kind === 'inheritance');
  expect(stream?.uniformDraws).toBe(25);
  expect(stream?.status).toBe('completed');
  expect(state.lifecycle.streams).toEqual(emptyState.lifecycle.streams);
  expect(state.people.mother).toEqual(emptyState.people.mother);
  expect(state.people.father).toEqual(emptyState.people.father);

  const restored = accepted(restoreRun(JSON.parse(JSON.stringify(archive))));
  expect(exportRun(restored)).toEqual(archive);
  const reproduced = accepted(replay(archive));
  expect(reproduced.verified).toBe(true);
  expect(reproduced.fullHash).toBe(archive.hashes.full);
  accepted(step(run, { until: 1, inputs: [] }));
  accepted(step(restored, { until: 1, inputs: [] }));
  expect(exportRun(restored)).toEqual(exportRun(run));

  // The ordinary addPerson admission path refuses undeclared ties and voices atomically.
  for (const invalid of [
    { ...context, relationships: relationships.map((tie) => ({ ...tie, otherId: 'missing-person' })) },
    { ...context, voices: [{ voiceId: 'missing-voice', trust: 0.75 }] },
  ]) {
    const refused = make(),
      before = exportRun(refused);
    const result = step(refused, { until: 0, inputs: [birth(invalid)] });
    expect(result.ok).toBe(false);
    expect(exportRun(refused)).toEqual(before);
  }
});

it('admits multiple kin scopes for one current fact revision without duplicate scope authorities', () => {
  const spec = numericalSpec(9),
    run = accepted(createRun(spec));
  accepted(createPerson(run, numericalPerson(9)));
  const basis = { evidence: { kind: 'evidence' as const, id: 'kin-proof' }, worldRevision: 0 };
  const people = [
    { kind: 'entity' as const, id: 'older' },
    { kind: 'entity' as const, id: 'younger' },
  ] as const;
  const scope = {
    id: 'scope',
    people,
    at: 0,
    kinRevision: 1,
    premiseIds: ['parent-proof'],
    degrees: 'source-two-step' as const,
    completeness: 'complete-for-source-degrees' as const,
    basis: basis.evidence,
  };
  const source = { type: 'host' as const, id: spec.host.id };
  accepted(
    step(run, {
      until: 0,
      inputs: [
        {
          id: '0-kin',
          at: 0,
          source,
          kind: 'lifecycle.received',
          payload: {
            type: 'kin-premise',
            basis,
            scope,
            premises: [
              { id: 'parent-proof', from: people[0], to: people[1], role: 'parent', basis: basis.evidence },
            ],
          },
        },
        {
          id: '1-scope',
          at: 0,
          source,
          kind: 'lifecycle.received',
          payload: { type: 'kin-premise', basis, scope: { ...scope, id: 'second-scope' }, premises: [] },
        },
        {
          id: '2-reassert',
          at: 0,
          source,
          kind: 'lifecycle.received',
          payload: { type: 'kin-premise', basis, scope, premises: [] },
        },
      ],
    }),
  );
  const archive = exportRun(run);
  expect(archive.current.lifecycle.kinScopes).toHaveLength(2);
  expect(archive.current.lifecycle.kinRevision).toBe(1);
  expect(exportRun(accepted(restoreRun(archive)))).toEqual(archive);
});

it('routes actual belief revisions into reputation once per changed credence', () => {
  const make = () => {
    const spec = numericalSpec(10);
    spec.definitions = {
      ...spec.definitions,
      sources: [...spec.definitions.sources, { type: 'person', id: 'target' }],
    };
    const run = accepted(createRun(spec)),
      person = numericalPerson(10);
    person.state.relationships = [
      {
        otherId: 'target',
        affection: 0.3,
        trust: 0.3,
        respect: 0.3,
        familiarity: 1,
        roles: ['neighbor'],
        ledger: 0,
        lastInteraction: 0,
      },
    ];
    accepted(createPerson(run, person));
    const target = numericalPerson(10);
    target.id = 'target';
    accepted(createPerson(run, target));
    return { run, spec };
  };
  const first = make(),
    second = make();
  const fact = (id: string, value: boolean) => ({
    id,
    at: 0,
    source: { type: 'host' as const, id: first.spec.host.id },
    kind: 'fact.confirmed' as const,
    payload: {
      person: 'numerical-person',
      evidenceId: `evidence-${id}`,
      observationId: `observation-${id}`,
      prop: 'target:honest',
      value,
    },
  });
  accepted(step(first.run, { until: 0, inputs: [fact('0-true', true)] }));
  const trust = (run: Parameters<typeof exportRun>[0]) =>
    exportRun(run).current.people['numerical-person']?.social.relationships.find(
      (tie) => tie.otherId === 'target',
    )?.trust;
  expect(trust(first.run)).toBeGreaterThan(0.3);
  const result = accepted(
    step(second.run, {
      until: 0,
      inputs: [fact('0-true', true), fact('1-again', true), fact('2-false', false)],
    }),
  );
  expect(trust(second.run)).toBeLessThan(trust(first.run) ?? 0);
  expect(result.events.filter((event) => event.data.kind === 'belief-revised')).toHaveLength(2);
  expect(accepted(replay(exportRun(second.run))).verified).toBe(true);
});

it('installs authored routine opportunities on real construction and replays their reached draw', () => {
  const spec = numericalSpec(11),
    offer = { ...sleepOffer(), id: 'scheduled-sleep', person: 'numerical-person', durationMs: 1 };
  spec.definitions = {
    ...spec.definitions,
    routines: [{ id: 'daily', entries: [{ id: 'opportunity', at: 1, chance: 1, offer }] }],
  };
  let run = accepted(createRun(spec));
  accepted(createPerson(run, numericalPerson(11)));
  expect(exportRun(run).current.routines[0]?.source).toEqual({ kind: 'definition', id: 'daily' });
  run = accepted(restoreRun(exportRun(run)));
  const result = accepted(
    step(run, {
      until: 1,
      inputs: [
        {
          id: 'actual-offers',
          at: 1,
          source: { type: 'host', id: spec.host.id },
          kind: 'offers.received',
          payload: { person: 'numerical-person', revision: 1, offers: [offer] },
        },
      ],
    }),
  );
  expect(result.boundary.type).toBe('world-required');
  expect(exportRun(run).current.queue.some((event) => event.data.kind === 'routine-opportunity')).toBe(false);
  expect(accepted(replay(exportRun(run))).verified).toBe(true);
});
