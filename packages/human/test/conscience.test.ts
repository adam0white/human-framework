import { describe, expect, test } from 'vitest';
import {
  CONSCIENCE_DEFAULTS,
  conscienceOwner,
  receiveConscienceEvidence,
} from '../src/conscience/conscience.ts';
import type { ActorActivity, ConscienceState, ObservedOutcome } from '../src/run-schema.ts';

describe('HF4 owned conscience', () => {
  const context = {
    person: 'person',
    at: 0,
    phase: 4 as const,
    effective: { builtins: { CONSCIENCE_DEFAULTS } },
  };
  const state = (): ConscienceState => ({
    norms: [
      {
        normId: 'harm-others',
        standing: 'forbidden',
        conviction: 0.8,
        provenance: { kind: 'authored-world', author: 'author', ruleId: 'harm-others', edition: 'one' },
      },
    ],
    breaches: [],
    intentions: [],
    nextBreach: 0,
  });
  const activity: ActorActivity = {
    id: 'activity',
    offer: {
      id: 'offer',
      actionId: 'harm',
      label: 'harm',
      person: 'person',
      durationMs: 60000,
      target: 'victim',
      participants: [],
      alongside: [],
      demands: { effort: 0, focus: 0, mode: 'awake', requires: {} },
      tags: [],
      norms: [{ normId: 'harm-others', relation: 'violates' }],
      expected: { needs: {}, followedBy: [], provenance: [] },
      fulfills: [],
      advances: [],
      diminishes: [],
    },
    needsAtStart: {},
    startedAt: -60000,
    endsAt: 0,
    decisionId: 'decision',
    intention: 'act',
    suggestions: [],
    reviewAt: 0,
  };
  const outcome: ObservedOutcome = {
    activityId: 'activity',
    offerId: 'offer',
    actionId: 'harm',
    target: 'victim',
    start: -60000,
    end: 0,
    status: 'completed',
    evidenceId: 'outcome',
    actual: { exposures: [], observedProgress: [] },
    fulfills: [],
    advances: [],
  };
  test('a held breach creates one attributed appraisal; victim repair remains required', () => {
    const initial = state();
    const recorded = receiveConscienceEvidence(initial, { kind: 'act', activity, outcome }, context);
    expect(recorded.state.breaches[0]).toMatchObject({ weight: 0.8, victimId: 'victim', repaired: false });
    expect(recorded.effects.appraisals[0]).toMatchObject({
      from: 'conscience',
      to: 'affect',
      cause: 'outcome',
      appraisal: { agentId: 'person', targetId: 'victim', praiseworthiness: -0.8 },
    });
    const id = recorded.state.breaches[0]?.id;
    if (!id) throw new Error('Missing breach');
    const repented = receiveConscienceEvidence(
      recorded.state,
      { kind: 'repent', data: { person: 'person', deedId: id } },
      context,
    ).state;
    expect(repented.breaches[0]?.repaired).toBe(false);
    const repaired = receiveConscienceEvidence(
      repented,
      {
        kind: 'repair',
        data: { person: 'person', evidenceId: 'repair', victim: 'victim', actionReceipt: 'amends' },
      },
      context,
    ).state;
    expect(repaired.breaches[0]?.repaired).toBe(true);
    expect(conscienceOwner.validate(repaired)).toEqual([]);
    expect(initial).toEqual(state());
  });
  test('interrupted harm has the source partial weight; received interpretation retains provenance', () => {
    const interrupted = receiveConscienceEvidence(
      state(),
      { kind: 'act', activity, outcome: { ...outcome, status: 'interrupted' } },
      context,
    ).state;
    expect(interrupted.breaches[0]?.weight).toBe(0.4);
    const updated = receiveConscienceEvidence(
      state(),
      {
        kind: 'interpretation',
        data: {
          person: 'person',
          evidenceId: 'interpretation',
          normId: 'harm-others',
          standing: 'forbidden',
          conviction: 0.6,
          provenance: { kind: 'authored-world', author: 'teacher', ruleId: 'harm-rule', edition: 'two' },
        },
      },
      context,
    ).state;
    expect(updated.norms[0]?.provenance).toEqual({
      kind: 'authored-world',
      author: 'teacher',
      ruleId: 'harm-rule',
      edition: 'two',
    });
  });
  test('emitted communication uses the same held deed law without physical receipts', () => {
    const initial = state();
    const before = structuredClone(initial);
    const speech = receiveConscienceEvidence(
      initial,
      {
        kind: 'communication-deed',
        requestId: 'speech',
        evidenceId: 'emitted',
        target: 'victim',
        norms: activity.offer.norms,
        intention: 'tell',
      },
      context,
    );
    const physical = receiveConscienceEvidence(initial, { kind: 'act', activity, outcome }, context);
    expect(speech.state.breaches).toEqual(physical.state.breaches);
    expect(speech.state.intentions).toEqual([{ at: 0, action: 'communicate', intention: 'tell' }]);
    expect(speech.effects.appraisals[0]).toMatchObject({
      cause: 'emitted',
      appraisal: { targetId: 'victim', praiseworthiness: -0.8 },
    });
    expect(speech.state.norms).toEqual(before.norms);
    expect(initial).toEqual(before);
  });
});
