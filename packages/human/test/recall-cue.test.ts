import { expect, it } from 'vitest';
import {
  CUE_RECALL_DEFAULTS,
  GIST_DEFAULTS,
  MEMORY_DEFAULTS,
  receiveMemoryCue,
} from '../src/memory/memory.ts';
import type { EffectiveParameters, MemoryContext, MemoryOwnedState } from '../src/run-schema.ts';

const effective = {
  builtins: { MEMORY_DEFAULTS, GIST_DEFAULTS, CUE_RECALL_DEFAULTS },
} as unknown as EffectiveParameters;
const ctx: MemoryContext = {
  effective,
  effectiveParametersHash: '0'.repeat(64),
  person: 'a',
  at: 86400000,
  priorAt: 0,
  phase: 2,
  fidelity: { mode: 'fine' },
  worldRevision: 0,
  causes: ['cue'],
  allocations: [],
};
const state = (): MemoryOwnedState => ({
  nextEpisode: 1,
  nextGist: 0,
  gists: [],
  expectations: [],
  episodes: [
    {
      id: 'e0',
      at: 0,
      kind: 'outcome',
      placeId: 'bridge',
      valence: -0.8,
      salience: 0.8,
      summary: 'The bridge shook.',
      tags: [],
    },
  ],
});
it('recalls a matching emotional place without strengthening ordinary memories', () => {
  const s = state(),
    out = receiveMemoryCue(s, { placeId: 'bridge', deceased: [], emotionality: 0.5 }, ctx);
  expect(out.state.episodes[0]?.recalledAt).toBe(ctx.at);
  expect(out.state.episodes[0]?.salience).toBe(0.8);
  expect(out.effects.appraisals[0]?.appraisal.desirability).toBeLessThan(0);
  expect(s.episodes[0]?.recalledAt).toBeUndefined();
  expect(
    receiveMemoryCue(out.state, { placeId: 'bridge', deceased: [], emotionality: 0.5 }, ctx).effects
      .appraisals,
  ).toEqual([]);
});
it('hour alone supplies no specific cue and weak ordinary memories do not intrude', () => {
  expect(receiveMemoryCue(state(), { deceased: [], emotionality: 0.5 }, ctx).effects.appraisals).toEqual([]);
  const s = state();
  const episode = s.episodes[0];
  if (!episode) throw new Error('Missing episode');
  episode.valence = 0.3;
  expect(
    receiveMemoryCue(s, { placeId: 'bridge', deceased: [], emotionality: 0.5 }, ctx).effects.appraisals,
  ).toEqual([]);
});
it('a warm memory of someone held deceased is reappraised as loss', () => {
  const s = state();
  const episode = s.episodes[0];
  if (!episode) throw new Error('Missing episode');
  episode.valence = 0.8;
  episode.targetId = 'mother';
  const out = receiveMemoryCue(s, { personId: 'mother', deceased: ['mother'], emotionality: 0.5 }, ctx);
  expect(out.affectReceipts[0]).toMatchObject({ kind: 'felt', id: 'grief', targetId: 'mother' });
  expect(out.state.episodes[0]?.salience).toBeGreaterThan(0.8);
});
