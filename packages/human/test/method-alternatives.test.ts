import { expect, test } from 'vitest';
import { methodOwner } from '../src/methods/methods.ts';
import { frame } from './w2-fixture.ts';

test('a successful alternative is not failure evidence; voice trust and source trust remain separate inputs', () => {
  const ctx = {
    ...frame(),
    available: true,
    sourceTrust: [{ sourceId: 'teacher', trust: 0.1 }],
    voices: [{ voiceId: 'teacher', trust: 0.9, pressure: 0, accepted: 0, refused: 0, history: [] }],
    action: 'north',
    contextId: 'job',
  };
  const state = {
    context: { id: 'job', at: 0, cues: [{ cue: 'route', value: 'open' }] },
    recentDemonstrations: ['example'],
    rules: [
      {
        id: 'method',
        action: 'south',
        conditions: [{ cue: 'route', value: 'open' }],
        evidence: [{ id: 'example', sourceId: 'teacher', at: 0, attention: 1, outcome: 'success' as const }],
      },
    ],
  };
  expect(methodOwner.evidence(state, ctx).support).toBe(0);
  const south = methodOwner.evidence(state, { ...ctx, action: 'south' });
  expect(south.support).toBeCloseTo(0.3, 14);
  expect(methodOwner.evidence(state, { ...ctx, action: 'south', voices: [] }).support).toBeCloseTo(
    0.1 / 3,
    14,
  );
});
