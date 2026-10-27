import { describe, expect, test } from 'vitest';

const cues = [
  { cue: 'route', value: 'north' },
  { cue: 'signal', value: 'clear' },
];

// Internal HF4 port control. No root 3.x API establishes these expectations.
import { METHOD_DEFAULTS, methodOwner, receiveMethodEvidence } from '../src/methods/methods.ts';

describe('HF4 method reception', () => {
  const context = (at = 0) => ({ at, available: true, effective: { builtins: { METHOD_DEFAULTS } } });
  const empty = () => ({ rules: [], recentDemonstrations: [] });
  const observations = { kind: 'cues' as const, evidenceId: 'seen', contextId: 'job', cues };
  const demonstration = {
    kind: 'demonstration' as const,
    data: {
      person: 'learner',
      evidenceId: 'heard',
      demonstrationId: 'demo',
      methodId: 'route',
      contextId: 'job',
      conditions: cues,
      action: 'send-north',
      teacher: 'teacher',
      outcome: 'success' as const,
      receivedAttention: 0.4,
    },
  };
  test('unknown conjunction and missing attention acquire nothing; received evidence is deduplicated', () => {
    expect(receiveMethodEvidence(empty(), demonstration, context()).state.rules).toEqual([]);
    const received = receiveMethodEvidence(empty(), observations, context()).state;
    const snapshot = structuredClone(received);
    expect(
      receiveMethodEvidence(
        received,
        { ...demonstration, data: { ...demonstration.data, receivedAttention: 0 } },
        context(),
      ).state.rules,
    ).toEqual([]);
    const learned = receiveMethodEvidence(received, demonstration, context()).state;
    expect(learned.rules[0]?.evidence).toEqual([
      { id: 'demo', sourceId: 'teacher', at: 0, attention: 0.4, outcome: 'success' },
    ]);
    expect(receiveMethodEvidence(learned, demonstration, context()).state).toEqual(learned);
    expect(received).toEqual(snapshot);
    expect(methodOwner.validate(learned)).toEqual([]);
  });
  test('context departure matches identity; stale or unavailable examples do not learn', () => {
    const received = receiveMethodEvidence(empty(), observations, context()).state;
    expect(
      receiveMethodEvidence(received, { kind: 'context-left', contextId: 'other' }, context()).state,
    ).toEqual(received);
    expect(
      receiveMethodEvidence(received, { kind: 'context-left', contextId: 'job' }, context()).state.context,
    ).toBeUndefined();
    expect(receiveMethodEvidence(received, demonstration, context(121 * 60000)).state.rules).toEqual([]);
    expect(
      receiveMethodEvidence(received, demonstration, { ...context(), available: false }).state.rules,
    ).toEqual([]);
  });
  test('malformed current evidence rejects without repair', () => {
    expect(methodOwner.validate({ rules: [], recentDemonstrations: ['same', 'same'] })).not.toEqual([]);
    expect(
      methodOwner.validate({ rules: [], recentDemonstrations: [], context: { id: 'job', at: 0.5, cues } }),
    ).not.toEqual([]);
  });
});
