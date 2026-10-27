import { expect, it } from 'vitest';
import { PROMPTINGS_DEFAULTS, promptingsOwner, promptingTerms } from '../src/promptings/promptings.ts';
import type { EffectiveParameters, FrameContext, PromptingsState } from '../src/run-schema.ts';

const effective = {
  builtins: { PROMPTINGS_DEFAULTS },
  promptings: { practiceHalfLifeDays: 60, echoRate: 0.1 },
} as EffectiveParameters;
const ctx: FrameContext = {
  effective,
  effectiveParametersHash: '0'.repeat(64),
  person: 'a',
  at: 0,
  priorAt: 0,
  phase: 4,
  fidelity: { mode: 'fine' },
  worldRevision: 0,
  causes: ['d'],
};
const state = (): PromptingsState => ({ reading: 'fault', responses: [], recent: [], echo: {} });
it('records only a noticed pull opposed by a held norm or goal and applies fault echo', () => {
  const s = state();
  const decision = {
    id: 'd',
    at: 0,
    chosenAffordanceId: 'o',
    chosenAction: 'gossip',
    intention: '',
    considered: [
      {
        affordanceId: 'o',
        action: 'gossip',
        utility: 0.1,
        terms: [
          { source: 'habit', value: 0.4 },
          { source: 'norm:backbiting', value: -0.3 },
        ],
      },
    ],
  };
  const noticed = [
    {
      offerId: 'o',
      action: 'gossip',
      source: 'habit' as const,
      opposedBy: 'norm:backbiting' as const,
      tags: [],
      turnApplied: false,
    },
  ];
  const result = promptingsOwner.receive(s, { decision, activity: null, noticed }, ctx);
  expect(result.state.echo.gossip?.level).toBe(0.1);
  expect(result.events[0]).toMatchObject({
    kind: 'prompting',
    record: { outcome: 'assented', opposedBy: 'norm:backbiting' },
  });
  expect(s.echo).toEqual({});
  const first = decision.considered[0];
  if (!first) throw new Error('Missing considered option');
  first.terms.pop();
  expect(
    promptingsOwner.receive(state(), { decision, activity: null, noticed: [] }, ctx).state.recent,
  ).toEqual([]);
});
it('uses matching cued practice and leaves survival decisions free of turning terms', () => {
  const s = state();
  s.responses = [
    { id: 'wrong', kind: 'leave', practice: 1, lastUsedAt: 0, cue: 'steal' },
    { id: 'right', kind: 'redirect', practice: 0.5, lastUsedAt: 0, cue: 'gossip' },
  ];
  const terms = [
    { source: 'habit', value: 0.4 },
    { source: 'norm:backbiting', value: -0.3 },
  ];
  expect(promptingTerms(s, { action: 'gossip', terms, tags: [], desperation: 0 }, ctx)).toContainEqual({
    source: 'promptings:turn',
    value: -0.4,
  });
  expect(promptingTerms(s, { action: 'gossip', terms, tags: [], desperation: 0.8 }, ctx)).toEqual([]);
});
it('returns fault guilt as an exact feeling receipt rather than a moral appraisal', () => {
  const s = state(),
    decision = {
      id: 'd',
      at: 0,
      chosenAffordanceId: 'o',
      chosenAction: 'gossip',
      intention: '',
      considered: [
        {
          affordanceId: 'o',
          action: 'gossip',
          utility: 0.1,
          terms: [
            { source: 'habit', value: 0.4 },
            { source: 'norm:backbiting', value: -0.3 },
          ],
        },
      ],
    };
  const result = promptingsOwner.receive(
    s,
    {
      decision,
      activity: null,
      noticed: [
        {
          offerId: 'o',
          action: 'gossip',
          source: 'habit',
          opposedBy: 'norm:backbiting',
          tags: [],
          turnApplied: false,
        },
      ],
    },
    ctx,
  );
  expect(result).toMatchObject({ affectReceipts: [{ kind: 'felt', id: 'guilt', intensity: 0.15 }] });
  expect(result.effects.appraisals).toEqual([]);
});

import type { Offer } from '../src/run-schema.ts';

it('keeps the source host attribution for a temptation-tagged material pull', () => {
  const offer = { id: 'o', actionId: 'steal', tags: ['temptation'] } as unknown as Offer;
  const result = promptingsOwner.terms(state(), {
    ...ctx,
    offer,
    terms: [
      { source: 'material', value: 0.4 },
      { source: 'norm:honesty', value: -0.3 },
    ],
    desperation: 0,
  });
  expect(result.noticed).toMatchObject({ source: 'host', opposedBy: 'norm:honesty' });
});
