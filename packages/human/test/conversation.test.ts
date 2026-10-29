import { expect, it } from 'vitest';
import { CONVERSATION_DEFAULTS, conversationOwner } from '../src/conversation/conversation.ts';
import type { ActorState, EffectiveParameters, FrameContext } from '../src/run-schema.ts';

const effective = { builtins: { CONVERSATION_DEFAULTS } } as EffectiveParameters;
const frame: FrameContext = {
  effective,
  effectiveParametersHash: '0'.repeat(64),
  person: 'a',
  at: 0,
  priorAt: 0,
  phase: 4,
  fidelity: { mode: 'fine' },
  worldRevision: 0,
  causes: ['request'],
};
it('prepares attributed claims without mutating people or delivering evidence', () => {
  const speaker = {
    id: 'a',
    body: { alive: true },
    traits: { honesty: 0.5 },
    values: { benevolence: 0.5 },
    conscience: { norms: [] },
    memory: {
      beliefs: [
        {
          prop: 'bridge:open',
          logOdds: 2,
          updatedAt: 0,
          sources: [],
          provenance: { origin: 'witness', firstFrom: 'witness', acquiredAt: 0 },
        },
      ],
      gists: [],
    },
    social: { relationships: [] },
  } as unknown as ActorState;
  const before = JSON.stringify(speaker);
  const result = conversationOwner.prepare(
    { speaker: 'a', listener: 'b', topicIds: ['bridge'], maxClaims: 2, temptations: [], loyalWarning: false },
    {
      ...frame,
      personIds: ['a', 'b'],
      speaker,
      listenerKnown: {
        social: { relationships: [], groups: { memberOf: [] }, impressions: [], reserve: {} },
        beliefs: { kind: 'unobserved' },
        alive: { kind: 'unobserved' },
        deceased: [],
      },
      norms: [],
    },
  );
  expect(result.claims[0]).toMatchObject({ prop: 'bridge:open', origin: 'witness', deceit: false });
  expect(JSON.stringify(speaker)).toBe(before);
  expect(result.listener).toBe('b');
});
it('retelling chooses strongest eligible gists as detached communication items', () => {
  const gist = {
    id: 'g0',
    at: 0,
    kind: 'outcome',
    action: 'cross',
    valence: -0.8,
    salience: 0.8,
    summary: 'The bridge shook.',
    tags: [],
    count: 1,
    firstAt: 0,
    lastAt: 0,
    weight: 0.8,
    peak: 0.8,
  };
  const speaker = { id: 'a', memory: { gists: [gist] } } as unknown as ActorState;
  const items = conversationOwner.prepareRetelling(
    { teller: 'a', listener: 'b', gistIds: ['g0'] },
    { ...frame, speaker },
  );
  expect(items[0]?.data).toMatchObject({
    kind: 'gist',
    sourceGistId: 'g0',
    gist: { summary: 'The bridge shook.' },
  });
  expect(items[0]?.data).not.toBe(gist);
  const broader = {
    ...speaker,
    memory: {
      gists: [
        { ...gist, id: 'g0', placeId: 'road', salience: 0.8 },
        { ...gist, id: 'g1', placeId: 'road', salience: 0.7 },
        { ...gist, id: 'g2', placeId: 'field', salience: 0.99 },
        { ...gist, id: 'g3', placeId: 'road', salience: 0.6 },
        { ...gist, id: 'g4', placeId: 'road', salience: 0.5 },
      ],
    },
  } as unknown as ActorState;
  const ctx = { ...frame, speaker: broader };
  expect(
    conversationOwner
      .prepareRetelling({ teller: 'a', listener: 'b', placeIds: ['road'], limit: 2 }, ctx)
      .map((x) => x.data.kind === 'gist' && x.data.sourceGistId),
  ).toEqual(['g0', 'g1']);
  expect(conversationOwner.prepareRetelling({ teller: 'a', listener: 'b' }, ctx)).toHaveLength(3);
  expect(conversationOwner.prepareRetelling({ teller: 'a', listener: 'b', gistIds: [] }, ctx)).toEqual([]);
  expect(() =>
    conversationOwner.prepareRetelling({ teller: 'a', listener: 'b', gistIds: ['g0', 'g0'] }, ctx),
  ).toThrow('Duplicate requested gist');
  expect(() =>
    conversationOwner.prepareRetelling({ teller: 'a', listener: 'b', gistIds: ['g9'] }, ctx),
  ).toThrow('Unknown gist');
});

it('withholds a known repeated telling and keeps unknown listener beliefs unknown', () => {
  const speaker = {
    id: 'a',
    body: { alive: true },
    traits: { honesty: 0.5 },
    values: { benevolence: 0.5 },
    conscience: { norms: [] },
    memory: { beliefs: [{ prop: 'bridge:open', logOdds: 2, updatedAt: 0, sources: [] }], gists: [] },
    social: { relationships: [] },
  } as unknown as ActorState;
  const request = {
    speaker: 'a',
    listener: 'b',
    topicIds: [],
    maxClaims: 2,
    temptations: [],
    loyalWarning: false,
  };
  const social = { relationships: [], groups: { memberOf: [] }, impressions: [], reserve: {} };
  const known = {
    social,
    beliefs: {
      kind: 'known' as const,
      value: [{ prop: 'bridge:open', logOdds: 2, updatedAt: 0, sources: [{ id: 'a', value: true }] }],
      evidenceIds: ['heard'],
    },
    alive: { kind: 'unobserved' as const },
    deceased: [],
  };
  expect(
    conversationOwner.prepare(request, {
      ...frame,
      personIds: ['a', 'b'],
      speaker,
      listenerKnown: known,
      norms: [],
    }).claims,
  ).toEqual([]);
  expect(
    conversationOwner.prepare(request, {
      ...frame,
      personIds: ['a', 'b'],
      speaker,
      listenerKnown: { ...known, beliefs: { kind: 'unobserved' } },
      norms: [],
    }).claims,
  ).toHaveLength(1);
});
