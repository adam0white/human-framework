import { expect, it } from 'vitest';
import { REVIEW_DEFAULTS, reviewEvidence, reviewOwner, reviewTerms } from '../src/review/review.ts';
import type {
  AgendaState,
  ChronicleDay,
  EffectiveParameters,
  FrameContext,
  ReviewState,
} from '../src/run-schema.ts';

const effective = { builtins: { REVIEW_DEFAULTS } } as EffectiveParameters;
const ctx: FrameContext = {
  effective,
  effectiveParametersHash: '0'.repeat(64),
  person: 'a',
  at: 75600000,
  priorAt: 0,
  phase: 5,
  fidelity: { mode: 'fine' },
  worldRevision: 0,
  causes: ['review'],
};
const empty = (): ReviewState => ({ style: 'accounting', atMsOfDay: 75600000, resolves: [], seen: [] });
const open: ChronicleDay = {
  day: 0,
  baseline: { habits: {}, trust: {}, illnesses: {}, openBreaches: [] },
  kept: [],
  broken: [{ id: 'c', kind: 'duty', label: 'my call' }],
  released: [],
  actions: [],
  verdicts: [],
  material: 0,
  moodSum: 0,
  moodSamples: 0,
  decisions: 0,
  socialMs: 0,
};
it('forms a resolve from a lived open-day lapse once and leaves releases alone', () => {
  const s = empty(),
    result = reviewEvidence(s, { ...ctx, days: [], open });
  expect(result.state.resolves[0]).toMatchObject({ key: 'duty::my call', strength: 0.5 });
  expect(reviewEvidence(result.state, { ...ctx, days: [], open }).events).toEqual([]);
  expect(s.resolves).toEqual([]);
  const released = { ...open, broken: [], released: open.broken };
  expect(reviewEvidence(empty(), { ...ctx, days: [], open: released }).state.resolves).toEqual([]);
});
it('none retains evidence without performing a review', () => {
  const s = empty();
  s.style = 'none';
  expect(reviewEvidence(s, { ...ctx, days: [], open }).events).toEqual([]);
});
it('rejects duplicate resolves without repair', () => {
  const s = empty();
  s.resolves = [
    { key: 'x', kind: 'duty', strength: 0.5, day: 0 },
    { key: 'x', kind: 'duty', strength: 0.5, day: 0 },
  ];
  expect(reviewOwner.validate(s)).toContainEqual(expect.objectContaining({ code: 'duplicate-id' }));
});
it('returns ruminating distress as its source intensity without appraisal scaling', () => {
  const s = empty();
  s.style = 'ruminating';
  const result = reviewEvidence(s, { ...ctx, days: [], open });
  expect(result).toMatchObject({ affectReceipts: [{ kind: 'felt', id: 'distress', intensity: 0.15 }] });
  expect(result.effects.appraisals).toEqual([]);
});
it('resolve terms match occurrence-independent kind/person/label and count once', () => {
  const s = empty();
  s.resolves = [{ key: 'duty::my call', kind: 'duty', strength: 1, day: 0 }];
  const agenda = {
    commitments: [{ id: 'new-occurrence', kind: 'duty', label: 'my call', actions: ['call'] }],
  } as unknown as AgendaState;
  expect(
    reviewTerms(s, agenda, [
      { source: 'commitment:new-occurrence', value: 1 },
      { source: 'commitment:new-occurrence', value: 1 },
    ]),
  ).toEqual([{ source: 'review:resolve', value: 0.3, ref: 'duty::my call' }]);
});
