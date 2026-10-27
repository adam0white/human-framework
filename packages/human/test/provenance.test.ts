import { expect, test } from 'vitest';
import { receiveBeliefEvidence } from '../src/beliefs/beliefs.ts';
import { frame } from './w2-fixture.ts';

test('first known origin survives relays and confirmation; absent origin stays absent', () => {
  const ctx = frame(),
    empty = { beliefs: [], sourceTrust: {}, contradictions: [] };
  const claim = {
    prop: 'fact',
    value: true,
    confidence: 0.8,
    sourceId: 'teller',
    evidenceId: 'claim',
    provenance: ['received'],
    origin: 'first',
    lineage: 'chain',
  };
  const first = receiveBeliefEvidence(
    empty,
    { kind: 'claims', teller: 'teller', claims: [claim], attention: 1, evidenceId: 'heard' },
    ctx,
  ).state;
  const second = receiveBeliefEvidence(
    first,
    {
      kind: 'claims',
      teller: 'relay',
      claims: [{ ...claim, origin: 'later', sourceId: 'relay' }],
      attention: 1,
      evidenceId: 'heard-again',
    },
    ctx,
  ).state;
  expect(second.beliefs[0]?.provenance).toEqual(first.beliefs[0]?.provenance);
  expect(second.beliefs[0]?.provenance?.origin).toBe('first');
  const { origin: _origin, lineage: _lineage, ...plain } = claim;
  expect(
    receiveBeliefEvidence(
      empty,
      { kind: 'claims', teller: 'teller', claims: [plain], attention: 1, evidenceId: 'plain' },
      ctx,
    ).state.beliefs[0]?.provenance,
  ).toBeUndefined();
});
