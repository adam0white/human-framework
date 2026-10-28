/** G10 control: retelling is delivered only to the recipient named in a resolved host boundary, and replays. */
import { expect, test } from 'vitest';
import { exportRun, replay, step } from '../src/index.ts';
import type { CommunicationRequest, DeepReadonly, Input, StepResult } from '../src/run-schema.ts';
import {
  actionRequest,
  actor,
  authoredPerson,
  DAY,
  exampleOffers,
  exampleSpec,
  MINUTE,
  need,
  openingInputs,
  resolutionInput,
  START,
  setup,
} from './support.ts';

function communication(result: DeepReadonly<StepResult>): DeepReadonly<CommunicationRequest> {
  if (result.boundary.type !== 'world-required') throw new Error('Missing communication boundary');
  const [request, ...rest] = result.boundary.requests;
  if (!request || rest.length || request.kind !== 'communication') throw new Error('Expected one request');
  return request;
}

const flood = 'The river flooded the lower road.';

function retellingControl() {
  const teller = authoredPerson('ada', 'Ada');
  teller.biography = [
    {
      id: 'e0',
      at: START - 200 * DAY,
      kind: 'event',
      actorId: 'ada',
      valence: -0.7,
      salience: 0.9,
      summary: flood,
      tags: ['flood'],
      basis: { kind: 'authored', author: 'test' },
      provenance: ['test'],
    },
  ];
  const run = setup([teller, authoredPerson('bora', 'Bora', 'male'), authoredPerson('cem', 'Cem', 'male')]);
  need(step(run, { until: START + 1, inputs: [] }));
  const told = actor(run).memory.gists.find((gist) => gist.summary === flood);
  if (!told) throw new Error('The authored episode did not fold into a gist');
  const listenerBefore = actor(run, 'bora').memory.gists.length;
  const unaddressedBefore = structuredClone(actor(run, 'cem').memory.gists);
  const ask: Input<'retelling.requested'> = {
    id: 'host:retell',
    at: START + 2,
    source: { type: 'host', id: 'world' },
    kind: 'retelling.requested',
    payload: { teller: 'ada', listener: 'bora', gistIds: [told.id] },
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
  expect(told.tags).not.toContain('told');
  expect(actor(run, 'cem').memory.gists).toEqual(unaddressedBefore);
  expect(heard[0]?.salience ?? 0).toBeLessThan(told.salience);
  expect(actor(run).memory.gists).toStrictEqual(tellerGists);
  const archive = exportRun(run);
  expect(step(run, { until: START + 2, inputs: [resolved] }).ok).toBe(false);
  expect(exportRun(run).hashes.full).toBe(archive.hashes.full);
  expect(need(replay(archive)).fullHash).toBe(archive.hashes.full);
}

function deathControl() {
  const ada = authoredPerson('ada', 'Ada');
  const bora = authoredPerson('bora', 'Bora', 'male');
  bora.state.bonds = { courtships: [], marriages: [{ spouseId: 'ada', since: START - 1, mourningDays: 4 }] };
  bora.state.relationships = [
    {
      otherId: 'ada',
      affection: 0.9,
      trust: 0.8,
      respect: 0.7,
      familiarity: 1,
      roles: ['spouse'],
      ledger: 0,
      lastInteraction: START,
    },
  ];
  const run = setup([ada, bora]);
  const offers = exampleOffers('bora', ['work']).map((o) => ({
    ...o,
    participants: ['ada'],
    tags: ['joint'],
    durationMs: 60 * MINUTE,
  }));
  const start = need(step(run, { until: START, inputs: openingInputs([{ id: 'bora', offers }]) }));
  const request = actionRequest(start, 'start', 'bora');
  need(
    step(run, {
      until: START,
      inputs: [resolutionInput(request, 0, { disposition: 'accepted', observations: [] })],
    }),
  );
  const at = START + MINUTE;
  const death: Input<'lifecycle.received'> = {
    id: 'death',
    at,
    source: { type: 'host', id: 'world' },
    kind: 'lifecycle.received',
    payload: {
      type: 'death',
      person: { kind: 'actor', id: 'ada' },
      basis: { evidence: { kind: 'evidence', id: 'death-evidence' }, worldRevision: 0 },
    },
  };
  const interrupted = need(step(run, { until: at, inputs: [death] }));
  const release = actionRequest(interrupted, 'interrupt', 'bora');
  expect(actor(run, 'bora').activity?.interrupt?.reason).toBe('participant-unavailable');
  expect(actor(run, 'bora').bonds.marriages[0]).toMatchObject({ end: 'widowed', endedAt: at });
  expect(actor(run, 'bora').social.relationships[0]?.deceasedAt).toBeUndefined();
  const outcome = {
    activityId: release.activityId,
    offerId: release.offerId,
    actionId: 'work',
    start: START,
    end: at,
    status: 'interrupted' as const,
    evidenceId: 'released',
    actual: { exposures: [], observedProgress: [] },
    fulfills: [],
    advances: [],
  };
  need(
    step(run, {
      until: at,
      inputs: [resolutionInput(release, 0, { disposition: 'interrupted', observations: [], outcome })],
    }),
  );
  expect(actor(run, 'bora').activity).toBeNull();
  const news: Input<'death.heard'> = {
    id: 'news',
    at: at + 1,
    source: { type: 'host', id: 'world' },
    kind: 'death.heard',
    payload: { person: 'bora', deceased: 'ada', reporter: 'world', evidenceId: 'news-evidence' },
  };
  need(step(run, { until: at + 1, inputs: [news] }));
  expect(actor(run, 'bora').social.relationships[0]?.deceasedAt).toBe(at + 1);
  expect(actor(run, 'bora').affect.emotions.some((e) => e.id === 'grief' && e.targetId === 'ada')).toBe(true);
  const archive = exportRun(run);
  expect(need(replay(archive)).fullHash).toBe(archive.hashes.full);
}

function claimControl() {
  const run = setup([
    authoredPerson('ada', 'Ada'),
    authoredPerson('bora', 'Bora'),
    authoredPerson('cem', 'Cem'),
  ]);
  const fact: Input<'fact.confirmed'> = {
    id: 'ada-sees',
    at: START,
    source: { type: 'host', id: 'world' },
    kind: 'fact.confirmed',
    payload: {
      person: 'ada',
      prop: 'bridge-open',
      value: true,
      evidenceId: 'ada-evidence',
      observationId: 'ada-observation',
    },
  };
  need(step(run, { until: START, inputs: [fact] }));
  const ask: Input<'conversation.requested'> = {
    id: 'ask',
    at: START + 1,
    source: { type: 'host', id: 'world' },
    kind: 'conversation.requested',
    payload: {
      speaker: 'ada',
      listener: 'bora',
      topicIds: ['bridge-open'],
      maxClaims: 1,
      temptations: [],
      loyalWarning: false,
    },
  };
  const request = communication(need(step(run, { until: START + 1, inputs: [ask] })));
  const claim = request.items.find((item) => item.data.kind === 'claim');
  if (!claim) throw new Error('Missing claim');
  expect(actor(run, 'bora').memory.beliefs).toEqual([]);
  const receipt: Input<'communication.resolved'> = {
    id: 'receipt',
    at: START + 1,
    source: { type: 'host', id: 'world' },
    kind: 'communication.resolved',
    payload: {
      requestId: request.id,
      requestHash: request.requestHash,
      worldRevision: request.worldRevision,
      speaker: 'ada',
      emittedItemIds: [claim.id],
      received: [{ recipient: 'bora', evidenceId: 'bora-heard', attention: 1, itemIds: [claim.id] }],
    },
  };
  need(step(run, { until: START + 1, inputs: [receipt] }));
  const belief = actor(run, 'bora').memory.beliefs.find((b) => b.prop === 'bridge-open');
  expect(belief?.logOdds).toBeGreaterThan(0);
  expect(belief?.sources).toMatchObject([{ id: 'ada', value: true }]);
  expect(belief?.provenance).toMatchObject({ origin: 'ada', firstFrom: 'ada' });
  expect(actor(run, 'cem').memory.beliefs).toEqual([]);
  const contradiction: Input<'contradiction.received'> = {
    id: 'contradiction',
    at: START + 2,
    source: { type: 'host', id: 'world' },
    kind: 'contradiction.received',
    payload: {
      person: 'bora',
      sourceId: 'ada',
      prop: 'bridge-open',
      value: false,
      evidenceId: 'contradiction-evidence',
    },
  };
  need(step(run, { until: START + 2, inputs: [contradiction] }));
  expect(actor(run, 'bora').memory.contradictions).toMatchObject([
    { sourceId: 'ada', prop: 'bridge-open', weight: 1 },
  ]);
  const withdrawal: Input<'testimony.withdrawn'> = {
    id: 'withdrawal',
    at: START + 3,
    source: { type: 'host', id: 'world' },
    kind: 'testimony.withdrawn',
    payload: { person: 'bora', sourceId: 'ada', prop: 'bridge-open', evidenceId: 'withdrawal-evidence' },
  };
  need(step(run, { until: START + 3, inputs: [withdrawal] }));
  const withdrawn = actor(run, 'bora').memory.beliefs.find((b) => b.prop === 'bridge-open');
  expect(withdrawn?.logOdds).toBeCloseTo(0, 12);
  expect(withdrawn?.sources).toEqual([]);
  const correction: Input<'fact.confirmed'> = {
    id: 'bora-sees',
    at: START + 4,
    source: { type: 'host', id: 'world' },
    kind: 'fact.confirmed',
    payload: {
      person: 'bora',
      prop: 'bridge-open',
      value: false,
      evidenceId: 'bora-evidence',
      observationId: 'bora-observation',
    },
  };
  need(step(run, { until: START + 4, inputs: [correction] }));
  const corrected = actor(run, 'bora').memory.beliefs.find((b) => b.prop === 'bridge-open');
  expect(corrected?.logOdds).toBeLessThan(0);
  expect(corrected?.sources).toEqual([{ id: 'bora', value: false }]);
  const second: Input<'testimony.received'> = {
    id: 'second',
    at: START + 5,
    source: { type: 'host', id: 'world' },
    kind: 'testimony.received',
    payload: {
      person: 'bora',
      teller: 'ada',
      evidenceId: 'second-evidence',
      claims: [
        {
          prop: 'bridge-open',
          value: true,
          confidence: 0.9,
          sourceId: 'ada',
          evidenceId: 'second-claim',
          provenance: [],
        },
      ],
    },
  };
  need(step(run, { until: START + 5, inputs: [second] }));
  need(
    step(run, {
      until: START + 6,
      inputs: [
        {
          ...withdrawal,
          id: 'withdrawal-second',
          at: START + 6,
          payload: { ...withdrawal.payload, evidenceId: 'withdrawal-second-evidence' },
        },
      ],
    }),
  );
  const direct = actor(run, 'bora').memory.beliefs.find((b) => b.prop === 'bridge-open');
  expect(direct?.logOdds).toBeCloseTo(corrected?.logOdds ?? 0, 6);
  expect(direct?.sources).toEqual([{ id: 'bora', value: false }]);
  const beforeRefusal = exportRun(run);
  expect(
    step(run, {
      until: START + 7,
      inputs: [
        {
          ...withdrawal,
          id: 'untracked',
          at: START + 7,
          payload: { ...withdrawal.payload, sourceId: 'bora', evidenceId: 'untracked-evidence' },
        },
      ],
    }).ok,
  ).toBe(false);
  expect(exportRun(run)).toStrictEqual(beforeRefusal);
  const archive = exportRun(run);
  expect(need(replay(archive)).fullHash).toBe(archive.hashes.full);
}

function openingDeathControl() {
  const run = setup([authoredPerson('ada', 'Ada'), authoredPerson('bora', 'Bora')]);
  const offers = exampleOffers('bora', ['work']).map((o) => ({
    ...o,
    participants: ['ada'],
    tags: ['joint'],
  }));
  const death: Input<'lifecycle.received'> = {
    id: 'death-at-opening',
    at: START,
    source: { type: 'host', id: 'world' },
    kind: 'lifecycle.received',
    payload: {
      type: 'death',
      person: { kind: 'actor', id: 'ada' },
      basis: { evidence: { kind: 'evidence', id: 'opening-death' }, worldRevision: 0 },
    },
  };
  const result = need(
    step(run, { until: START, inputs: [...openingInputs([{ id: 'bora', offers }]), death] }),
  );
  expect(result.boundary.type).not.toBe('world-required');
  expect(actor(run, 'bora').activity).toBeNull();
  const archive = exportRun(run);
  expect(need(replay(archive)).fullHash).toBe(archive.hashes.full);
}

function physicalDeathControl() {
  const ada = authoredPerson('ada', 'Ada');
  ada.state.body.health = 0.9;
  const bora = authoredPerson('bora', 'Bora');
  bora.state.bonds = { courtships: [], marriages: [{ spouseId: 'ada', since: START - 1, mourningDays: 4 }] };
  const spec = exampleSpec();
  spec.definitions.calendar.days = Array.from({ length: 6 }, (_, i) => ({
    dayIndex: i,
    start: i * DAY,
    windows: [],
  }));
  const run = setup([ada, bora], spec);
  const offers = exampleOffers('bora', ['work']).map((offer) => ({
    ...offer,
    participants: ['ada'],
    tags: ['joint'],
    durationMs: 5 * DAY,
  }));
  const opening = need(step(run, { until: START, inputs: openingInputs([{ id: 'bora', offers }]) }));
  need(
    step(run, {
      until: START,
      inputs: [
        resolutionInput(actionRequest(opening, 'start', 'bora'), 0, {
          disposition: 'accepted',
          observations: [],
        }),
      ],
    }),
  );
  const result = need(step(run, { until: START + 5 * DAY, inputs: [] }));
  const release = actionRequest(result, 'interrupt', 'bora');
  expect(release.person).toBe('bora');
  expect(actor(run, 'bora').activity?.interrupt?.reason).toBe('participant-unavailable');
  expect(actor(run, 'ada').body.alive).toBe(false);
  expect(actor(run, 'bora').bonds.marriages[0]?.end).toBe('widowed');
  expect(
    actor(run, 'bora').social.relationships.find((tie) => tie.otherId === 'ada')?.deceasedAt,
  ).toBeUndefined();
  const archive = exportRun(run);
  expect(need(replay(archive)).fullHash).toBe(archive.hashes.full);
}

function clippedWithdrawalControl(newEvidence = false) {
  const bora = authoredPerson('bora', 'Bora');
  bora.state.sourceTrust = [
    { sourceId: 'ada', trust: 1 },
    { sourceId: 'cem', trust: 1 },
  ];
  const run = setup([authoredPerson('ada', 'Ada'), bora, authoredPerson('cem', 'Cem')]);
  for (const [i, sourceId, value] of [
    [0, 'ada', true],
    [1, 'cem', false],
  ] as const) {
    need(
      step(run, {
        until: START + i,
        inputs: [
          {
            id: `claim-${i}`,
            at: START + i,
            source: { type: 'host', id: 'world' },
            kind: 'testimony.received',
            payload: {
              person: 'bora',
              teller: sourceId,
              evidenceId: `evidence-${i}`,
              claims: [
                {
                  prop: 'clipped',
                  sourceId,
                  value,
                  confidence: 1,
                  evidenceId: `account-${i}`,
                  provenance: [],
                },
              ],
            },
          },
        ],
      }),
    );
  }
  for (const [i, sourceId] of ['ada', 'cem'].entries()) {
    need(
      step(run, {
        until: START + 2 + i * 2,
        inputs: [
          {
            id: `withdraw-${sourceId}`,
            at: START + 2 + i * 2,
            source: { type: 'host', id: 'world' },
            kind: 'testimony.withdrawn',
            payload: {
              person: 'bora',
              sourceId,
              prop: 'clipped',
              evidenceId: `withdraw-evidence-${sourceId}`,
            },
          },
        ],
      }),
    );
    if (newEvidence && i === 0) {
      need(
        step(run, {
          until: START + 3,
          inputs: [
            {
              id: 'fresh-claim',
              at: START + 3,
              source: { type: 'host', id: 'world' },
              kind: 'testimony.received',
              payload: {
                person: 'bora',
                teller: 'ada',
                evidenceId: 'fresh-evidence',
                claims: [
                  {
                    prop: 'clipped',
                    sourceId: 'ada',
                    value: true,
                    confidence: 0.9,
                    evidenceId: 'fresh-account',
                    provenance: [],
                  },
                ],
              },
            },
          ],
        }),
      );
      expect(actor(run, 'bora').memory.beliefs.find((b) => b.prop === 'clipped')?.logOdds).toBeCloseTo(
        -6 + Math.log(9),
        6,
      );
    }
  }
  if (newEvidence) {
    need(
      step(run, {
        until: START + 5,
        inputs: [
          {
            id: 'withdraw-fresh',
            at: START + 5,
            source: { type: 'host', id: 'world' },
            kind: 'testimony.withdrawn',
            payload: {
              person: 'bora',
              sourceId: 'ada',
              prop: 'clipped',
              evidenceId: 'withdraw-fresh-evidence',
            },
          },
        ],
      }),
    );
  }
  expect(actor(run, 'bora').memory.beliefs.find((b) => b.prop === 'clipped')?.logOdds).toBeCloseTo(0, 8);
  const archive = exportRun(run);
  expect(need(replay(archive)).fullHash).toBe(archive.hashes.full);
}

test('communication resolves retelling, contradiction and withdrawal', () => {
  retellingControl();
  claimControl();
  clippedWithdrawalControl();
  clippedWithdrawalControl(true);
});

test('death releases joint work at the run boundary', () => {
  deathControl();
  openingDeathControl();
  physicalDeathControl();
});
