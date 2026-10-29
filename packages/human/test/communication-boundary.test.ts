/** Retold gist crosses the same host boundary as an action: a request, then a resolution. No automatic hearing. */
import { expect, test } from 'vitest';
import { exportRun, replay, step } from '../src/index.ts';
import type { CommunicationRequest, DeepReadonly, Input, StepResult } from '../src/run-schema.ts';
import { actor, authoredPerson, DAY, need, START, setup } from './support.ts';

function communication(result: DeepReadonly<StepResult>): DeepReadonly<CommunicationRequest> {
  if (result.boundary.type !== 'world-required') throw new Error('Missing communication boundary');
  const [request, ...rest] = result.boundary.requests;
  if (!request || rest.length || request.kind !== 'communication') throw new Error('Expected one request');
  return request;
}

const flood = 'The river flooded the lower road.';

test('a retold gist reaches the listener only through communication.resolved, once', () => {
  const teller = authoredPerson('ada', 'Ada');
  teller.biography = [
    {
      id: 'e0',
      at: START - 200 * DAY,
      kind: 'event',
      actorId: 'ada',
      placeId: 'road',
      valence: -0.7,
      salience: 0.9,
      summary: flood,
      tags: ['flood'],
      basis: { kind: 'authored', author: 'test' },
      provenance: ['test'],
    },
  ];
  const run = setup([authoredPerson('road', 'Road'), teller, authoredPerson('bora', 'Bora', 'male')]);
  need(step(run, { until: START + 1, inputs: [] }));
  const told = actor(run).memory.gists.find((gist) => gist.summary === flood);
  if (!told) throw new Error('The authored episode did not fold into a gist');
  const listenerBefore = actor(run, 'bora').memory.gists.length;
  for (const limit of [-1, 1.5, 4]) {
    const invalid = step(run, {
      until: START + 2,
      inputs: [
        {
          id: `bad:${limit}`,
          at: START + 2,
          source: { type: 'host', id: 'world' },
          kind: 'retelling.requested',
          payload: { teller: 'ada', listener: 'bora', limit },
        },
      ],
    });
    expect(invalid.ok).toBe(false);
    if (!invalid.ok) expect(invalid.error.path).toContain('payload.limit');
  }

  const ask: Input<'retelling.requested'> = {
    id: 'host:retell',
    at: START + 2,
    source: { type: 'host', id: 'world' },
    kind: 'retelling.requested',
    payload: { teller: 'ada', listener: 'bora', placeIds: ['road'], limit: 1 },
  };
  const request = communication(need(step(run, { until: START + 2, inputs: [ask] })));
  expect(request.speaker).toBe('ada');
  expect(request.recipients).toEqual(['bora']);
  expect(request.items.map((item) => item.data.kind)).toEqual(['gist']);
  // Issued is not heard.
  expect(actor(run, 'bora').memory.gists).toHaveLength(listenerBefore);
  const tellerGists = actor(run).memory.gists;
  const resolved: Input<'communication.resolved'> = {
    id: 'host:heard',
    at: request.boundaryAt,
    source: { type: 'host', id: 'world' },
    kind: 'communication.resolved',
    payload: {
      requestId: request.id,
      requestHash: request.requestHash,
      worldRevision: request.worldRevision,
      speaker: 'ada',
      emittedItemIds: request.items.map((item) => item.id),
      received: [
        {
          recipient: 'bora',
          evidenceId: 'heard:flood',
          attention: 1,
          itemIds: request.items.map((item) => item.id),
        },
      ],
    },
  };
  need(step(run, { until: START + 2, inputs: [resolved] }));
  const heard = actor(run, 'bora').memory.gists.filter((gist) => gist.summary === flood);
  expect(heard).toHaveLength(1);
  expect(heard[0]?.tags[0]).toBe('told');
  expect(heard[0]?.salience ?? 0).toBeLessThan(told.salience);
  expect(actor(run).memory.gists).toStrictEqual(tellerGists);
  const settled = exportRun(run);
  expect(step(run, { until: START + 2, inputs: [resolved] }).ok).toBe(false);
  expect(exportRun(run).hashes.full).toBe(settled.hashes.full);
  for (const [index, [id, payload]] of (
    [
      ['empty', { teller: 'ada', listener: 'bora', gistIds: [] }],
      ['zero', { teller: 'ada', listener: 'bora', limit: 0 }],
    ] as const
  ).entries()) {
    const empty = need(
      step(run, {
        until: START + 3 + index,
        inputs: [
          {
            id,
            at: START + 3 + index,
            source: { type: 'host', id: 'world' },
            kind: 'retelling.requested',
            payload,
          },
        ],
      }),
    );
    expect(empty.boundary.type).toBe('until');
  }
  const archive = exportRun(run);
  expect(need(replay(archive)).fullHash).toBe(archive.hashes.full);
});
