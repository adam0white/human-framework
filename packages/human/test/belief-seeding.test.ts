import { expect, test } from 'vitest';
import { beliefOwner } from '../src/beliefs/beliefs.ts';
import { frame } from './w2-fixture.ts';

test('authored beliefs and information trust copy without becoming observations', () => {
  const input = {
    beliefs: [{ prop: 'bridge', logOdds: 1, updatedAt: -60000, sources: [{ id: 'teacher', value: true }] }],
    sourceTrust: [{ sourceId: 'teacher', trust: 0.7 }],
  };
  const original = structuredClone(input);
  const state = beliefOwner.initialize(input, frame());
  expect(state).toEqual({ beliefs: input.beliefs, sourceTrust: { teacher: 0.7 }, contradictions: [] });
  state.beliefs[0]?.sources.push({ id: 'other', value: false });
  expect(input).toEqual(original);
});
