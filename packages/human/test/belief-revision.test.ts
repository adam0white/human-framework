import { describe, expect, test } from 'vitest';
import { BELIEF_DEFAULTS, beliefOwner, receiveBeliefEvidence } from '../src/beliefs/beliefs.ts';

describe('HF4 received beliefs', () => {
  const ctx = { person: 'listener', at: 0, effective: { builtins: { BELIEF_DEFAULTS } } };
  const initial = () => ({ beliefs: [], sourceTrust: { teller: 0.8, reporter: 0.8 }, contradictions: [] });
  const claim = (value: boolean) => ({
    prop: 'bridge-open',
    value,
    confidence: 0.9,
    sourceId: 'teller',
    evidenceId: 'claim',
    provenance: ['source'],
    origin: 'origin',
    lineage: 'chain',
  });
  const claims = (value: boolean) => ({
    kind: 'claims' as const,
    teller: 'teller',
    claims: [claim(value)],
    attention: 0.4,
    evidenceId: 'heard',
  });
  test('attention grades testimony, first provenance survives confirmation, trust recalibrates once', () => {
    const start = initial();
    expect(receiveBeliefEvidence(start, { ...claims(true), attention: 0 }, ctx).state.beliefs).toEqual([]);
    const heard = receiveBeliefEvidence(start, claims(true), ctx).state;
    const full = receiveBeliefEvidence(start, { ...claims(true), attention: 1 }, ctx).state;
    expect(heard.beliefs[0]?.logOdds).toBeGreaterThan(0);
    expect(heard.beliefs[0]?.logOdds).toBeLessThan(full.beliefs[0]?.logOdds ?? 0);
    const confirmed = receiveBeliefEvidence(
      heard,
      { kind: 'confirm', prop: 'bridge-open', value: false, observationId: 'seen', evidenceId: 'saw' },
      ctx,
    ).state;
    expect(confirmed.sourceTrust.teller).toBeCloseTo(0.6, 14);
    expect(confirmed.beliefs[0]?.provenance).toEqual({
      origin: 'origin',
      firstFrom: 'teller',
      at: 0,
      lineage: 'chain',
    });
    expect(
      receiveBeliefEvidence(
        confirmed,
        {
          kind: 'confirm',
          prop: 'bridge-open',
          value: false,
          observationId: 'seen-again',
          evidenceId: 'saw-again',
        },
        ctx,
      ).state.sourceTrust,
    ).toEqual(confirmed.sourceTrust);
    expect(start).toEqual(initial());
    expect(beliefOwner.validate(confirmed)).toEqual([]);
  });
  test('contradiction requires that source account and strongest evidence charges only its difference', () => {
    const heard = receiveBeliefEvidence(initial(), claims(true), ctx).state;
    const report = {
      kind: 'contradiction' as const,
      sourceId: 'teller',
      prop: 'bridge-open',
      value: false,
      reporterId: 'reporter',
      evidenceId: 'report',
    };
    const reported = receiveBeliefEvidence(heard, report, ctx).state;
    expect(reported.sourceTrust.teller).toBeLessThan(0.8);
    expect(receiveBeliefEvidence(reported, report, ctx).state).toEqual(reported);
    const direct = receiveBeliefEvidence(
      reported,
      { kind: 'contradiction', sourceId: 'teller', prop: 'bridge-open', value: false, evidenceId: 'direct' },
      ctx,
    ).state;
    expect(direct.sourceTrust.teller).toBeCloseTo(0.6, 14);
    expect(receiveBeliefEvidence(initial(), report, ctx).state).toEqual(initial());
    expect(direct.beliefs).toEqual(heard.beliefs);
  });
});
