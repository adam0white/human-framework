/** Human Framework v1 public surface. */
export const FRAMEWORK_VERSION = '1.0.0';

// `affect.release` is re-exported as `releaseEmotion` (beside `releaseCommitment`); `effectiveHalfLife` stays internal.
export type { CrisisEvent, PracticeKind } from './affect/index.ts';
export {
  AFFECT_DEFAULTS,
  actionTendencies,
  advanceAffect,
  appraise,
  breakAllows,
  breakBehaviour,
  breakHazard,
  CRISIS_DEFAULTS,
  checkCrisis,
  createAffect,
  easeBreak,
  enableBreaks,
  feel,
  inBreak,
  readAffect,
  regulate,
  release as releaseEmotion,
  skipCrisis,
  strain,
  tendencyEmotions,
} from './affect/index.ts';
export type {
  GoalTemplate,
  PrayerCalendar,
  PrayerSchedule,
  PrayerTimes,
  Retimer,
} from './agenda/index.ts';
// `agenda.release` collides with `affect.release`; the agenda one is re-exported under a clearer name.
export {
  AGENDA_DEFAULTS,
  abandonGoal,
  adoptGoal,
  advanceAgenda,
  agendaTerms,
  applyExemptions,
  CARE_DEFAULTS,
  calendarRetimer,
  careDuty,
  commitmentPressure,
  createAgenda,
  DEFAULT_PRAYER_TIMES,
  EID_PRAYER_IMPORTANCE,
  EXEMPTION_DEFAULTS,
  eidPrayer,
  eidWindow,
  fastWindow,
  iftarWindow,
  inMakruhTime,
  MAKRUH_DEFAULTS,
  makruhWindows,
  missedExcuse,
  onFinished,
  owedMakeUps,
  PRAYER_IMPORTANCE,
  PURPOSE_DEFAULTS,
  prayerWindows,
  pressureReachedAt,
  promise,
  proposeGoals,
  RAMADAN_DEFAULTS,
  ramadanFast,
  ramadanMeals,
  release as releaseCommitment,
  retimeCommitments,
  revisePurposes,
  scheduleMakeUp,
  spanMeetsWindow,
  suhoorWindow,
  timesFor,
  violatesAbstention,
} from './agenda/index.ts';
export * from './beliefs/index.ts';
export * from './body/index.ts';
export * from './chronicle/index.ts';
export type { ConsiderContext, DecideContext, Decision, SocialContext } from './cognition/index.ts';
// `cognition.decide` is the raw scorer; the composite's `decide` (person.ts) is the one hosts call.
export {
  COGNITION_DEFAULTS,
  consider,
  decide as scoreAndResolve,
  desperationOf,
  rememberedTerms,
  scoreAll,
  socialContext,
  suggestionTargets,
} from './cognition/index.ts';
export * from './conscience/index.ts';
export * from './conversation/index.ts';
export * from './core/index.ts';
export * from './habits/index.ts';
export * from './lifecourse/index.ts';
export * from './memory/index.ts';
export type { MigrationStep } from './migrate.ts';
export { MIGRATIONS, migratableVersions, migrate } from './migrate.ts';
export * from './narrate/index.ts';
export * from './needs/index.ts';
export * from './person.ts';
export * from './scenarios/index.ts';
export * from './sim/index.ts';
export * from './skills/index.ts';
export * from './social/index.ts';
export * from './types.ts';
export * from './will/index.ts';
