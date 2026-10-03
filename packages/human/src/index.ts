/** Human Framework v1 public surface. */
export const FRAMEWORK_VERSION = '1.0.0-dev';

export * from './affect/index.ts';
export type { GoalTemplate, PrayerTimes } from './agenda/index.ts';
// `agenda.release` collides with `affect.release`; the agenda one is re-exported under a clearer name.
export {
  AGENDA_DEFAULTS,
  abandonGoal,
  adoptGoal,
  advanceAgenda,
  agendaTerms,
  commitmentPressure,
  createAgenda,
  DEFAULT_PRAYER_TIMES,
  onFinished,
  PRAYER_IMPORTANCE,
  prayerWindows,
  promise,
  proposeGoals,
  release as releaseCommitment,
} from './agenda/index.ts';
export * from './beliefs/index.ts';
export * from './body/index.ts';
export type { ConsiderContext, DecideContext, Decision, SocialContext } from './cognition/index.ts';
// `cognition.decide` is the raw scorer; the composite's `decide` (person.ts) is the one hosts call.
export {
  COGNITION_DEFAULTS,
  consider,
  decide as scoreAndResolve,
  desperationOf,
  scoreAll,
  socialContext,
  suggestionTargets,
} from './cognition/index.ts';
export * from './conscience/index.ts';
export * from './core/index.ts';
export * from './habits/index.ts';
export * from './lifecourse/index.ts';
export * from './memory/index.ts';
export * from './narrate/index.ts';
export * from './needs/index.ts';
export * from './person.ts';
export * from './scenarios/index.ts';
export * from './sim/index.ts';
export * from './skills/index.ts';
export * from './social/index.ts';
export * from './types.ts';
export * from './will/index.ts';
