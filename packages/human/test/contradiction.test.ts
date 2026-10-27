import { expect, test } from 'vitest';
import { receiveBeliefEvidence } from '../src/beliefs/beliefs.ts';
import { frame } from './w2-fixture.ts';

test('incompatible sources are uncertainty; only the same source account can lose trust', () => {
  const ctx = frame();
  const initial = {
    beliefs: [
      {
        prop: 'fact',
        logOdds: 0,
        updatedAt: 0,
        sources: [
          { id: 'one', value: true },
          { id: 'two', value: false },
        ],
      },
    ],
    sourceTrust: { one: 0.8, two: 0.8 },
    contradictions: [],
  };
  expect(
    receiveBeliefEvidence(
      initial,
      { kind: 'contradiction', sourceId: 'one', prop: 'fact', value: true, evidenceId: 'same' },
      ctx,
    ).state,
  ).toEqual(initial);
  const after = receiveBeliefEvidence(
    initial,
    { kind: 'contradiction', sourceId: 'one', prop: 'fact', value: false, evidenceId: 'opposite' },
    ctx,
  ).state;
  expect(after.sourceTrust.one).toBeCloseTo(0.6, 14);
  expect(after.sourceTrust.two).toBe(0.8);
  expect(after.beliefs).toEqual(initial.beliefs);
});
