import { expect, test } from 'vitest';
import { beliefOwner, receiveBeliefEvidence, trustOf } from '../src/beliefs/beliefs.ts';
import { frame, person } from './w2-fixture.ts';

test('received information trust stays separate from social and voice trust', () => {
  const p = person();
  p.actor.memory.sourceTrust.source = 0.8;
  p.actor.social.relationships.push({
    otherId: 'source',
    affection: 0,
    trust: 0.1,
    respect: 0,
    familiarity: 0,
    roles: [],
    ledger: 0,
    lastInteraction: 0,
  });
  p.actor.will.voices.push({
    voiceId: 'source',
    trust: 0.2,
    pressure: 0,
    accepted: 0,
    refused: 0,
    history: [],
  });
  expect(trustOf(p.actor, 'source')).toBe(0.8);
  const state = receiveBeliefEvidence(
    { beliefs: [], sourceTrust: { source: 0.8 }, contradictions: [] },
    {
      kind: 'claims',
      teller: 'source',
      claims: [
        {
          prop: 'fact',
          value: true,
          confidence: 0.9,
          sourceId: 'source',
          evidenceId: 'claim',
          provenance: [],
        },
      ],
      attention: 1,
      evidenceId: 'heard',
    },
    frame(),
  ).state;
  expect(state.beliefs[0]?.logOdds).toBeGreaterThan(0);
  expect(p.actor.social.relationships[0]?.trust).toBe(0.1);
  expect(p.actor.will.voices[0]?.trust).toBe(0.2);
});
test('malformed current belief ranges reject instead of repair', () => {
  expect(
    beliefOwner.validate({
      beliefs: [{ prop: 'fact', logOdds: Infinity, updatedAt: 0, sources: [] }],
      sourceTrust: {},
      contradictions: [],
    }),
  ).not.toEqual([]);
});
