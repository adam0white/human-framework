/** Custom character words use the ordinary belief, relationship and speech owners. */
import { expect, test } from 'vitest';
import { createPerson, createRun, exportRun, replay, restoreRun, step } from '../src/index.ts';
import type { Input, Run } from '../src/run-schema.ts';
import { actor, authoredPerson, exampleSpec, need, START } from './support.ts';

const vocabulary = [{ id: 'nosy', affection: -0.03, trust: -0.03, respect: -0.03 }];
function residents(authored: boolean, rows = structuredClone(vocabulary)) {
  const spec = exampleSpec(42);
  if (authored) Object.assign(spec.definitions, { reputationTraits: rows });
  const observer = authoredPerson('ada', 'Ada');
  observer.state.relationships = [
    {
      otherId: 'bora',
      affection: 0.8,
      trust: 0.5,
      respect: 0.1,
      familiarity: 0.2,
      roles: [],
      ledger: 0,
      lastInteraction: START,
    },
  ];
  observer.state.sourceTrust = [{ sourceId: 'cem', trust: 0.8 }];
  const people = [observer, authoredPerson('bora', 'Bora'), authoredPerson('cem', 'Cem')];
  spec.definitions.sources = [
    ...spec.definitions.sources,
    ...people.map((p) => ({ type: 'person' as const, id: p.id })),
  ];
  const run = need(createRun(spec));
  for (const person of people) need(createPerson(run, person));
  return run;
}
function testimony(trait = 'nosy'): Input<'testimony.received'> {
  return {
    id: 'testimony',
    at: START,
    source: { type: 'host', id: 'world' },
    kind: 'testimony.received',
    payload: {
      person: 'ada',
      teller: 'cem',
      evidenceId: 'heard',
      claims: [
        {
          prop: `bora:${trait}`,
          value: true,
          confidence: 0.9,
          sourceId: 'cem',
          evidenceId: 'claim',
          provenance: ['heard'],
        },
      ],
    },
  };
}
function tie(run: Run) {
  const value = actor(run).social.relationships.find((t) => t.otherId === 'bora');
  if (!value) throw new Error('Missing actual relationship');
  return value;
}

test('authored hearsay moves relationships, correction moves them back, and a concurrent default run stays unchanged', () => {
  const rows = structuredClone(vocabulary);
  const custom = residents(true, rows),
    plain = residents(false),
    builtin = residents(true);
  const row = rows[0];
  if (!row) throw new Error('Missing authored trait');
  row.affection = row.trust = row.respect = 0;
  const before = structuredClone(tie(custom));
  need(step(custom, { until: START, inputs: [testimony()] }));
  need(step(plain, { until: START, inputs: [testimony()] }));
  need(step(builtin, { until: START, inputs: [testimony('stingy')] }));
  expect(actor(custom).memory.beliefs).toStrictEqual(actor(plain).memory.beliefs);
  expect(tie(plain)).toStrictEqual(before);
  expect(tie(custom).trust).toBeLessThan(before.trust);
  expect(tie(custom).affection).toBeLessThan(before.affection);
  expect(tie(custom).respect).toBeLessThan(before.respect);
  expect(tie(builtin).trust).toBeLessThan(before.trust);
  const lowered = structuredClone(tie(custom));
  const correction: Input<'fact.confirmed'> = {
    id: 'correction',
    at: START + 1,
    source: { type: 'host', id: 'world' },
    kind: 'fact.confirmed',
    payload: { person: 'ada', prop: 'bora:nosy', value: false, evidenceId: 'seen', observationId: 'actual' },
  };
  need(step(custom, { until: START + 1, inputs: [correction] }));
  for (const key of ['affection', 'trust', 'respect'] as const)
    expect(Math.abs(tie(custom)[key] - before[key])).toBeLessThan(Math.abs(lowered[key] - before[key]));
  expect(actor(custom).memory.beliefs.find((b) => b.prop === 'bora:nosy')?.logOdds).toBeLessThan(0);
  const archive = exportRun(custom);
  expect(need(replay(archive)).fullHash).toBe(archive.hashes.full);
  expect(exportRun(need(restoreRun(JSON.parse(JSON.stringify(archive))))).hashes.full).toBe(
    archive.hashes.full,
  );
  expect(tie(plain)).toStrictEqual(before);
});

test('custom negative claims receive the same speech classification as builtins', () => {
  function claim(custom: boolean, listener = 'cem', loyalWarning = false) {
    const run = residents(custom);
    need(step(run, { until: START, inputs: [testimony()] }));
    const result = need(
      step(run, {
        until: START + 1,
        inputs: [
          {
            id: 'conversation',
            at: START + 1,
            source: { type: 'host', id: 'world' },
            kind: 'conversation.requested',
            payload: {
              speaker: 'ada',
              listener,
              topicIds: ['bora:nosy'],
              maxClaims: 2,
              temptations: [],
              loyalWarning,
            },
          },
        ],
      }),
    );
    if (result.boundary.type !== 'world-required') throw new Error('Missing actual host boundary');
    const request = result.boundary.requests.find((r) => r.kind === 'communication');
    if (request?.kind !== 'communication') throw new Error('Missing actual communication request');
    return request.items.find((item) => item.data.kind === 'claim')?.data;
  }
  expect(claim(true)).toMatchObject({ kind: 'claim', private: { about: 'bora', backbiting: true } });
  expect(claim(false)).toMatchObject({ kind: 'claim', private: { backbiting: false } });
  expect(claim(true, 'bora', true)).toMatchObject({
    kind: 'claim',
    private: { about: 'bora', backbiting: false },
  });
  expect(claim(false, 'bora', true)).toBeUndefined();
});

test('a trait proposition about a nonperson does not create a tie or a character claim', () => {
  const run = residents(true);
  const input = testimony();
  const heard = input.payload.claims[0];
  if (!heard) throw new Error('Missing testimony claim');
  heard.prop = 'door:nosy';
  need(step(run, { until: START, inputs: [input] }));
  expect(actor(run).social.relationships.some((r) => r.otherId === 'door')).toBe(false);
  const result = need(
    step(run, {
      until: START + 1,
      inputs: [
        {
          id: 'talk-door',
          at: START + 1,
          source: { type: 'host', id: 'world' },
          kind: 'conversation.requested',
          payload: {
            speaker: 'ada',
            listener: 'cem',
            topicIds: ['door:nosy'],
            maxClaims: 2,
            temptations: [],
            loyalWarning: false,
          },
        },
      ],
    }),
  );
  if (result.boundary.type !== 'world-required') throw new Error('Missing boundary');
  const request = result.boundary.requests.find((r) => r.kind === 'communication');
  if (request?.kind !== 'communication') throw new Error('Missing communication');
  const claim = request.items.find((item) => item.data.kind === 'claim');
  expect(claim?.data).toMatchObject({ kind: 'claim', private: { prop: 'door:nosy', backbiting: false } });
  if (claim?.data.kind !== 'claim') throw new Error('Missing claim');
  expect(claim.data.private.about).toBeUndefined();
});

test('headless control replays a valid social response and character claim', () => {
  const run = residents(true);
  need(
    step(run, {
      until: START,
      inputs: [
        testimony(),
        {
          id: 'social',
          at: START,
          source: { type: 'host', id: 'world' },
          kind: 'social.received',
          payload: {
            person: 'ada',
            other: 'cem',
            evidenceId: 'interaction',
            event: { kind: 'insult', byMe: false, magnitude: 0.25 },
            sourceTrustResponse: {
              sourceId: 'cem',
              multiplier: 0.8,
              basis: { author: 'world', ruleId: 'response', edition: 'control' },
            },
          },
        },
      ],
    }),
  );
  expect(tie(run).trust).toBeLessThan(0.5);
  expect(actor(run).memory.sourceTrust.cem).toBeCloseTo(0.64);
  const archive = exportRun(run);
  expect(exportRun(need(restoreRun(archive)))).toStrictEqual(archive);
  expect(need(replay(archive)).fullHash).toBe(archive.hashes.full);
});

test('malformed reputation authoring refuses before run construction', () => {
  for (const rows of [
    [...vocabulary, ...vocabulary],
    [{ id: 'honest', affection: 0, trust: 0, respect: 0 }],
    [{ id: 'nosy', affection: Number.NaN, trust: 0, respect: 0 }],
    [{ id: 'nosy', affection: 0, trust: 1.1, respect: 0 }],
    [{ id: 'nosy:very', affection: 0, trust: 0, respect: 0 }],
  ]) {
    const spec = exampleSpec();
    Object.assign(spec.definitions, { reputationTraits: rows });
    expect(createRun(spec).ok).toBe(false);
  }
});
