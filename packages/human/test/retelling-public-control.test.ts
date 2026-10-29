/** Public-only gameplay control: the host never reads a person's private gist IDs. */
import { expect, test } from 'vitest';
import { exportRun, replay, restoreRun, step } from '../src/index.ts';
import type { CommunicationRequest, DeepReadonly, Input, StepResult } from '../src/run-schema.ts';
import { authoredPerson, DAY, need, START, setup } from './support.ts';

function request(result: DeepReadonly<StepResult>): DeepReadonly<CommunicationRequest> {
  if (result.boundary.type !== 'world-required') throw new Error('Missing communication boundary');
  const [item, ...rest] = result.boundary.requests;
  if (!item || rest.length || item.kind !== 'communication') throw new Error('Expected one communication');
  return item;
}
function heard(
  req: DeepReadonly<CommunicationRequest>,
  recipient: string,
  id: string,
): Input<'communication.resolved'> {
  return {
    id,
    at: req.boundaryAt,
    source: { type: 'host', id: 'world' },
    kind: 'communication.resolved',
    payload: {
      requestId: req.id,
      requestHash: req.requestHash,
      worldRevision: req.worldRevision,
      speaker: req.speaker,
      emittedItemIds: req.items.map((x) => x.id),
      received: [{ recipient, evidenceId: `${id}:heard`, attention: 1, itemIds: req.items.map((x) => x.id) }],
    },
  };
}
test('a publicly requested retelling can be heard and retold again, with cold replay', () => {
  const ada = authoredPerson('ada', 'Ada');
  ada.biography = [
    {
      id: 'e0',
      at: START - 200 * DAY,
      kind: 'event',
      actorId: 'ada',
      valence: -0.7,
      salience: 0.9,
      summary: 'The river flooded the road.',
      tags: ['flood'],
      basis: { kind: 'authored', author: 'test' },
      provenance: ['test'],
    },
  ];
  const run = setup([ada, authoredPerson('bora', 'Bora'), authoredPerson('cem', 'Cem')]);
  need(step(run, { until: START + 1, inputs: [] }));
  const first = request(
    need(
      step(run, {
        until: START + 2,
        inputs: [
          {
            id: 'first',
            at: START + 2,
            source: { type: 'host', id: 'world' },
            kind: 'retelling.requested',
            payload: { teller: 'ada', listener: 'bora', limit: 2 },
          },
        ],
      }),
    ),
  );
  expect(first.items).toHaveLength(1);
  need(step(run, { until: START + 2, inputs: [heard(first, 'bora', 'first-heard')] }));
  const second = request(
    need(
      step(run, {
        until: START + 3,
        inputs: [
          {
            id: 'second',
            at: START + 3,
            source: { type: 'host', id: 'world' },
            kind: 'retelling.requested',
            payload: { teller: 'bora', listener: 'cem', limit: 2 },
          },
        ],
      }),
    ),
  );
  expect(second.items).toHaveLength(1);
  expect(second.items[0]?.data.kind).toBe('gist');
  if (second.items[0]?.data.kind !== 'gist') throw new Error('Missing retold gist');
  expect(second.items[0].data.gist.summary).toContain('river flooded');
  need(step(run, { until: START + 3, inputs: [heard(second, 'cem', 'second-heard')] }));
  const archive = exportRun(run);
  expect(need(replay(archive)).fullHash).toBe(archive.hashes.full);
  expect(exportRun(need(restoreRun(archive))).hashes.full).toBe(archive.hashes.full);
});
