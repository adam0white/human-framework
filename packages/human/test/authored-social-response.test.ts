/** Authored policies travel with the existing communication/social evidence inputs. */
import { expect, test } from 'vitest';
import { exportRun, inspect, replay, restoreRun, step } from '../src/index.ts';
import type { Input } from '../src/run-schema.ts';
import { actor, authoredPerson, need, START, setup } from './support.ts';

test('a per-conversation confidence threshold preserves the default and distinct authored policies', () => {
  function claims(confidentMin?: number) {
    const ada = authoredPerson('ada', 'Ada');
    ada.state.beliefs = [
      { prop: 'bridge:open', logOdds: Math.log(0.68 / 0.32), updatedAt: START, sources: [] },
      { prop: 'path:open', logOdds: Math.log(0.72 / 0.28), updatedAt: START, sources: [] },
    ];
    const run = setup([ada, authoredPerson('bora', 'Bora')]);
    const result = need(
      step(run, {
        until: START,
        inputs: [
          {
            id: 'conversation',
            at: START,
            source: { type: 'host', id: 'world' },
            kind: 'conversation.requested',
            payload: {
              speaker: 'ada',
              listener: 'bora',
              topicIds: [],
              maxClaims: 3,
              temptations: [],
              loyalWarning: false,
              ...(confidentMin === undefined ? {} : { confidentMin }),
            },
          },
        ],
      }),
    );
    if (result.boundary.type !== 'world-required') throw new Error('Missing communication boundary');
    const request = result.boundary.requests.find((item) => item.kind === 'communication');
    if (request?.kind !== 'communication') throw new Error('Missing actual communication');
    const archive = exportRun(run);
    expect(need(replay(archive)).fullHash).toBe(archive.hashes.full);
    return request.items.flatMap((item) => (item.data.kind === 'claim' ? [item.data.told.prop] : [])).sort();
  }
  expect(claims(0.15)).toStrictEqual(['bridge:open', 'path:open']);
  expect(claims()).toStrictEqual(['path:open']);
  expect(claims(0.2)).toStrictEqual(['path:open']);
  expect(claims(0.25)).toStrictEqual([]);
});

const basis = { author: 'world', ruleId: 'response-to-comparison', edition: 'control1' };
function response(id = 'social', evidenceId = 'comparison'): Input<'social.received'> {
  return {
    id,
    at: START,
    source: { type: 'host', id: 'world' },
    kind: 'social.received',
    payload: {
      person: 'ada',
      other: 'bora',
      evidenceId,
      event: { kind: 'insult', byMe: false, magnitude: 0.25 },
      sourceTrustResponse: { sourceId: 'bora', multiplier: 0.8, basis: { ...basis } },
    },
  };
}
function residents() {
  const ada = authoredPerson('ada', 'Ada');
  ada.state.sourceTrust = [{ sourceId: 'bora', trust: 0.73 }];
  return setup([ada, authoredPerson('bora', 'Bora')]);
}

test('actual social evidence changes source trust once without an invented belief and replays with authored basis', () => {
  const run = residents(),
    isolated = residents(),
    plain = residents(),
    input = response();
  const beforeBeliefs = actor(run).memory.beliefs;
  need(step(run, { until: START, inputs: [input] }));
  const socialOnly = response();
  delete socialOnly.payload.sourceTrustResponse;
  need(step(plain, { until: START, inputs: [socialOnly] }));
  expect(actor(plain).memory.sourceTrust.bora).toBe(0.73);
  expect(actor(plain).social).toStrictEqual(actor(run).social);
  expect(actor(run).memory.sourceTrust.bora).toBeCloseTo(0.584, 14);
  expect(actor(run).memory.beliefs).toStrictEqual(beforeBeliefs);
  expect(actor(isolated).memory.sourceTrust.bora).toBe(0.73);
  const archive = exportRun(run);
  expect(archive.current.events.some((event) => event.data.kind === 'source-trust-responded')).toBe(true);
  const other = need(
    inspect(run, {
      perspective: { kind: 'person', observer: 'bora' },
      people: ['ada'],
      select: ['events', 'sourceTrust'],
    }),
  );
  expect(other.people[0]?.parts).toContainEqual({ select: 'sourceTrust', value: { kind: 'unobserved' } });
  expect(other.events.some((event) => event.data.kind === 'source-trust-responded')).toBe(false);
  if (!input.payload.sourceTrustResponse) throw new Error('Missing authored response');
  input.payload.sourceTrustResponse.multiplier = 0;
  expect(exportRun(run)).toStrictEqual(archive);
  expect(need(replay(archive)).fullHash).toBe(archive.hashes.full);
  const restored = need(restoreRun(JSON.parse(JSON.stringify(archive))));
  const duplicate = response('same-evidence');
  duplicate.at = START + 1;
  expect(step(restored, { until: START + 1, inputs: [duplicate] }).ok).toBe(false);
  expect(exportRun(restored)).toStrictEqual(archive);
});

test('a duplicate response late in a batch rolls back both relationship and trust changes', () => {
  const run = residents(),
    before = exportRun(run);
  expect(step(run, { until: START, inputs: [response('first'), response('second')] }).ok).toBe(false);
  expect(exportRun(run)).toStrictEqual(before);
  // A refused batch has not consumed its input or evidence IDs.
  need(step(run, { until: START, inputs: [response('first')] }));
  expect(actor(run).memory.sourceTrust.bora).toBeCloseTo(0.584, 14);
});

test('malformed policies and unknown or self sources refuse atomically', () => {
  const run = residents(),
    before = exportRun(run);
  for (const multiplier of [-0.1, 1.1, Number.NaN]) {
    const input = response();
    Object.assign(input.payload.sourceTrustResponse ?? {}, { multiplier });
    expect(step(run, { until: START, inputs: [input] }).ok).toBe(false);
  }
  for (const sourceId of ['missing', 'ada', 'self']) {
    const input = response();
    Object.assign(input.payload.sourceTrustResponse ?? {}, { sourceId });
    expect(step(run, { until: START, inputs: [input] }).ok).toBe(false);
  }
  for (const confidentMin of [-0.1, 0.51, Number.NaN]) {
    expect(
      step(run, {
        until: START,
        inputs: [
          {
            id: 'conversation',
            at: START,
            source: { type: 'host', id: 'world' },
            kind: 'conversation.requested',
            payload: {
              speaker: 'ada',
              listener: 'bora',
              topicIds: [],
              maxClaims: 3,
              temptations: [],
              loyalWarning: false,
              confidentMin,
            },
          },
        ],
      }).ok,
    ).toBe(false);
  }
  expect(exportRun(run)).toStrictEqual(before);
});
