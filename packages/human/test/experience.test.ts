/** Current owner-law controls from retained elapsed-practice and authored practice-condition cases. */
import { expect, test } from 'vitest';
import { lifecycleOwner } from '../src/lifecourse/lifecourse.ts';
import type { ActorActivity, LearningContext, ObservedOutcome, Offer } from '../src/run-schema.ts';
import { skillsOwner } from '../src/skills/skills.ts';
import { frame } from './lane-fixture.ts';

const MINUTE = 60_000;
const offer: Offer = {
  id: 'craft',
  actionId: 'craft',
  label: 'craft',
  person: 'ada',
  durationMs: 120 * MINUTE,
  participants: [],
  alongside: [],
  demands: {
    effort: 0.1,
    focus: 0.2,
    mode: 'awake',
    requires: {},
    skill: { id: 'craft', difficulty: 0.3, domain: 'motor' },
  },
  tags: [],
  norms: [],
  expected: { needs: {}, followedBy: [], provenance: ['authored-control'] },
  fulfills: [],
  advances: [],
  diminishes: [],
};
const activity: ActorActivity = {
  id: 'activity',
  offer,
  needsAtStart: {},
  startedAt: 0,
  endsAt: offer.durationMs,
  decisionId: 'decision',
  intention: 'craft',
  suggestions: [],
  reviewAt: 30 * MINUTE,
};
function context(at: number): LearningContext {
  const baseFrame = frame(at);
  const life = lifecycleOwner.modifiers({ bornAt: -30 * 365.25 * 86_400_000, sex: 'female' }, baseFrame);
  return {
    ...baseFrame,
    life,
    ageYears: life.ageYears,
    aptitude: {},
    transfers: [],
    traits: {
      honesty: 0.5,
      emotionality: 0.5,
      extraversion: 0.5,
      agreeableness: 0.5,
      conscientiousness: 0.5,
      openness: 0.5,
    },
    skills: [{ id: 'craft', label: 'craft', domain: 'motor' }],
    body: {
      hunger: 0.1,
      thirst: 0.1,
      sleepiness: 0.1,
      fatigue: 0.1,
      pain: 0,
      capacity: 1,
      alertness: 1,
      perceived: { hunger: 0.1, thirst: 0.1, sleepiness: 0.1, fatigue: 0.1, pain: 0 },
    },
  };
}
function outcome(end: number, status: ObservedOutcome['status']): ObservedOutcome {
  return {
    activityId: activity.id,
    offerId: offer.id,
    actionId: offer.actionId,
    start: 0,
    end,
    status,
    evidenceId: 'actual-work',
    actual: { exposures: [], observedProgress: [] },
    fulfills: [],
    advances: [],
  };
}
const state = { craft: { level: 0.2, practicedMs: 0, lastPracticed: 0 } };

test('actual elapsed skilled work still counts when interrupted; planned unworked time does not', () => {
  const receipt = outcome(90 * MINUTE, 'interrupted'),
    learning = context(receipt.end);
  const before = structuredClone({ state, activity, receipt, learning });
  const learned = skillsOwner.learn(state, { kind: 'practice', activity, outcome: receipt }, learning);
  expect(learned.state.craft?.practicedMs).toBe(90 * MINUTE);
  expect(learned.state.craft?.level ?? 0).toBeGreaterThan(state.craft.level);
  expect({ state, activity, receipt, learning }).toStrictEqual(before);
});

test('ordinary practice quality is neutral while higher quality and a better teacher improve actual learning', () => {
  const receipt = outcome(60 * MINUTE, 'completed'),
    learning = context(receipt.end);
  const learn = (practice: ObservedOutcome['actual']['practice']) =>
    skillsOwner.learn(
      state,
      {
        kind: 'practice',
        activity,
        outcome: { ...receipt, actual: { ...receipt.actual, ...(practice ? { practice } : {}) } },
      },
      learning,
    ).state.craft;
  const ordinary = learn(undefined),
    neutral = learn({ quality: 0.5 }),
    careful = learn({ quality: 0.9 });
  const taught = learn({ instruction: { level: 0.9, engagement: 1 } });
  expect(neutral).toStrictEqual(ordinary);
  if (!ordinary || !careful || !taught) throw new Error('Missing actual learned skill');
  expect(careful.level).toBeGreaterThan(ordinary.level);
  expect(taught.level).toBeGreaterThan(ordinary.level);
  expect(careful.practicedMs).toBe(60 * MINUTE);
  expect(taught.practicedMs).toBe(60 * MINUTE);
});
