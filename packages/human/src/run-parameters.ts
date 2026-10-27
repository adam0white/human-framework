/** SCOPE: immutable run-local effective parameters. Engine source values are
 * copied once, then each run receives a detached frozen record. No host builtin
 * override, mutable global tuning, off sentinel or constructor evidence inference.
 */

import { AFFECT_DEFAULTS } from './affect/affect.ts';
import { CRISIS_DEFAULTS } from './affect/crisis.ts';
import { AGENDA_DEFAULTS, CARE_DEFAULTS, EXEMPTION_DEFAULTS, PURPOSE_DEFAULTS } from './agenda/agenda.ts';
import { MAKRUH_DEFAULTS, RAMADAN_DEFAULTS } from './agenda/prayer.ts';
import { BELIEF_DEFAULTS } from './beliefs/beliefs.ts';
import { BLADDER_DEFAULTS } from './body/bladder.ts';
import { BODY_DEFAULTS } from './body/body.ts';
import { DOZE_DEFAULTS } from './body/doze.ts';
import { INJURY_DEFAULTS } from './body/injury.ts';
import { CHARACTER_DEFAULTS } from './character/character.ts';
import { CHRONICLE_DEFAULTS } from './chronicle/chronicle.ts';
import { COGNITION_DEFAULTS } from './cognition/cognition.ts';
import { CONSCIENCE_DEFAULTS } from './conscience/conscience.ts';
import { CONVERSATION_DEFAULTS } from './conversation/conversation.ts';
import { CURIOSITY_DEFAULTS } from './curiosity/curiosity.ts';
import { ENVIRONMENT_DEFAULTS } from './environment/environment.ts';
import { FAMILY_DEFAULTS } from './family/family.ts';
import { HABIT_DEFAULTS } from './habits/habits.ts';
import { CHRONIC_CONDITIONS, HEALTH_DEFAULTS } from './lifecourse/health.ts';
import { LIFE_DEFAULTS } from './lifecourse/lifecourse.ts';
import { CUE_RECALL_DEFAULTS, GIST_DEFAULTS, MEMORY_DEFAULTS, RETELL_DEFAULTS } from './memory/memory.ts';
import { METHOD_DEFAULTS } from './methods/methods.ts';
import { NEEDS_DEFAULTS } from './needs/needs.ts';
import { PARTNERING_DEFAULTS } from './partnering/partnering.ts';
import { PERSISTENCE_DEFAULTS } from './persistence/persistence.ts';
import { PROJECTS_DEFAULTS } from './projects/projects.ts';
import { PROMPTINGS_DEFAULTS } from './promptings/promptings.ts';
import { FORECAST_DEFAULTS } from './prospection/forecast.ts';
import { PROSPECTION_DEFAULTS } from './prospection/prospection.ts';
import { REVIEW_DEFAULTS } from './review/review.ts';
import { canonicalJson, hashCanonical } from './run-canonical.ts';
import { PERSON_DEFAULTS } from './run-person-priors.ts';
import type {
  DeepReadonly,
  EffectiveBuiltins,
  EffectiveParameters,
  FacultyParameters,
  ParameterProvenance,
  Result,
} from './run-schema.ts';
import { validateData } from './run-validation.ts';
import { SKILL_DEFAULTS } from './skills/skills.ts';
import { GROUP_DEFAULTS } from './social/groups.ts';
import { IMPRESSION_DEFAULTS } from './social/impressions.ts';
import { REPUTATION_DEFAULTS, SOCIAL_DEFAULTS } from './social/social.ts';
import { WILL_DEFAULTS } from './will/will.ts';

function copy<T>(value: T): T {
  return JSON.parse(canonicalJson(value)) as T;
}
function freeze<T>(value: T): DeepReadonly<T> {
  const stack: unknown[] = [value];
  while (stack.length) {
    const item = stack.pop();
    if (item !== null && typeof item === 'object') {
      stack.push(...Object.values(item));
      Object.freeze(item);
    }
  }
  return value as DeepReadonly<T>;
}
function required<T>(value: T | undefined): T {
  if (value === undefined) throw new TypeError('missing engine prior');
  return value;
}
function template<L extends string>(key: 'belonging' | 'competence' | 'meaning' | 'esteem', label: L) {
  const prior = AGENDA_DEFAULTS.goalTemplates[key];
  if (!prior || prior.label !== label) throw new TypeError('source purpose template mismatch');
  return {
    label,
    advancedBy: prior.advancedBy,
    completionHalfLifeMs: 7200000 as const,
    provenance: {
      kind: 'assumption' as const,
      ref: 'engineering:hf4-proposeGoals-ruling23-unfitted' as const,
    },
  };
}
// Snapshot private engine values before any caller can receive the HF4 root surface.
// Current exports are transitional source3 constants; HF4 exposes no mutable defaults.
const ENGINE_BUILTINS = freeze(
  copy({
    AFFECT_DEFAULTS,
    CRISIS_DEFAULTS,
    AGENDA_DEFAULTS: {
      ...AGENDA_DEFAULTS,
      goalTemplates: {
        belonging: template('belonging', 'make-friend'),
        competence: template('competence', 'master-skill'),
        meaning: template('meaning', 'serve'),
        esteem: template('esteem', 'earn-respect'),
      },
    },
    EXEMPTION_DEFAULTS,
    PURPOSE_DEFAULTS,
    CARE_DEFAULTS,
    RAMADAN_DEFAULTS,
    MAKRUH_DEFAULTS,
    BELIEF_DEFAULTS,
    BLADDER_DEFAULTS,
    BODY_DEFAULTS: {
      satietyPerMinute: BODY_DEFAULTS.satietyPerMinute,
      satietyEffortPerMinute: BODY_DEFAULTS.satietyEffortPerMinute,
      hydrationPerMinute: BODY_DEFAULTS.hydrationPerMinute,
      hydrationEffortPerMinute: BODY_DEFAULTS.hydrationEffortPerMinute,
      sleepMetabolism: BODY_DEFAULTS.sleepMetabolism,
      wakeTau: BODY_DEFAULTS.wakeTau,
      sleepTau: BODY_DEFAULTS.sleepTau,
      debtPerHourAbove: BODY_DEFAULTS.debtPerHourAbove,
      debtThreshold: BODY_DEFAULTS.debtThreshold,
      debtRepayPerHour: BODY_DEFAULTS.debtRepayPerHour,
      repayThreshold: BODY_DEFAULTS.repayThreshold,
      maxSleepDebt: BODY_DEFAULTS.maxSleepDebt,
      exertionGain: BODY_DEFAULTS.exertionGain,
      exertionRiseHalfLife: BODY_DEFAULTS.exertionRiseHalfLife,
      exertionRecoverHalfLife: BODY_DEFAULTS.exertionRecoverHalfLife,
      exertionRecoverHalfLifeAsleep: BODY_DEFAULTS.exertionRecoverHalfLifeAsleep,
      depletionPerHour: BODY_DEFAULTS.depletionPerHour,
      depletionFloor: BODY_DEFAULTS.depletionFloor,
      depletionRestHalfLife: BODY_DEFAULTS.depletionRestHalfLife,
      depletionSleepHalfLife: BODY_DEFAULTS.depletionSleepHalfLife,
      depletionFatigueWeight: BODY_DEFAULTS.depletionFatigueWeight,
      trainingEffort: BODY_DEFAULTS.trainingEffort,
      detrainHalfLife: BODY_DEFAULTS.detrainHalfLife,
      fitnessFloor: BODY_DEFAULTS.fitnessFloor,
      trainingRatio: BODY_DEFAULTS.trainingRatio,
      starvationPerDay: BODY_DEFAULTS.starvationPerDay,
      dehydrationPerDay: BODY_DEFAULTS.dehydrationPerDay,
      illnessHealthPerDay: BODY_DEFAULTS.illnessHealthPerDay,
      healthRecoveryPerDay: BODY_DEFAULTS.healthRecoveryPerDay,
      immuneResponsePerDay: BODY_DEFAULTS.immuneResponsePerDay,
      minIllnessTrend: BODY_DEFAULTS.minIllnessTrend,
      illnessStressPerDay: BODY_DEFAULTS.illnessStressPerDay,
      painHalfLife: BODY_DEFAULTS.painHalfLife,
      maxInjuries: BODY_DEFAULTS.maxInjuries,
      maxIllnesses: BODY_DEFAULTS.maxIllnesses,
      sleepinessPressureWeight: BODY_DEFAULTS.sleepinessPressureWeight,
      sleepinessCircadianWeight: BODY_DEFAULTS.sleepinessCircadianWeight,
      sleepinessDebtWeight: BODY_DEFAULTS.sleepinessDebtWeight,
      debtUnderperception: BODY_DEFAULTS.debtUnderperception,
      painAdaptation: BODY_DEFAULTS.painAdaptation,
      fastingHungerDamp: BODY_DEFAULTS.fastingHungerDamp,
      fastingThirstDamp: BODY_DEFAULTS.fastingThirstDamp,
      fastingOnsetShare: BODY_DEFAULTS.fastingOnsetShare,
      fastingAdaptDays: BODY_DEFAULTS.fastingAdaptDays,
      fastingBreakthrough: BODY_DEFAULTS.fastingBreakthrough,
      underfedFrom: BODY_DEFAULTS.underfedFrom,
      underfedFull: BODY_DEFAULTS.underfedFull,
      underfedDriftLoss: BODY_DEFAULTS.underfedDriftLoss,
      underfedWorsenPerDay: BODY_DEFAULTS.underfedWorsenPerDay,
      restEffort: BODY_DEFAULTS.restEffort,
      restDriftBonus: BODY_DEFAULTS.restDriftBonus,
      heavyEffort: BODY_DEFAULTS.heavyEffort,
      heavyEffortDriftLoss: BODY_DEFAULTS.heavyEffortDriftLoss,
      debtDriftRange: BODY_DEFAULTS.debtDriftRange,
      debtDriftLoss: BODY_DEFAULTS.debtDriftLoss,
      chronicHalfLife: BODY_DEFAULTS.chronicHalfLife,
      chronicDebtGain: BODY_DEFAULTS.chronicDebtGain,
      chronicExposureGain: BODY_DEFAULTS.chronicExposureGain,
      chronicHealthPerDay: BODY_DEFAULTS.chronicHealthPerDay,
      chronicPainWeight: BODY_DEFAULTS.chronicPainWeight,
      maxExposures: BODY_DEFAULTS.maxExposures,
      exposureRecentGain: BODY_DEFAULTS.exposureRecentGain,
      exposureRecentHalfLife: BODY_DEFAULTS.exposureRecentHalfLife,
      exposureCumulativeHalfLife: BODY_DEFAULTS.exposureCumulativeHalfLife,
      transmissionPerMinute: BODY_DEFAULTS.transmissionPerMinute,
      contractedSeverity: BODY_DEFAULTS.contractedSeverity,
      contractedTrendPerDay: BODY_DEFAULTS.contractedTrendPerDay,
    },
    DOZE_DEFAULTS,
    INJURY_DEFAULTS,
    CHARACTER_DEFAULTS,
    CHRONICLE_DEFAULTS,
    COGNITION_DEFAULTS,
    CONSCIENCE_DEFAULTS,
    CONVERSATION_DEFAULTS: {
      ...CONVERSATION_DEFAULTS,
      standingWeight: {
        forbidden: required(CONVERSATION_DEFAULTS.standingWeight.forbidden),
        disliked: required(CONVERSATION_DEFAULTS.standingWeight.disliked),
        permitted: required(CONVERSATION_DEFAULTS.standingWeight.permitted),
        recommended: required(CONVERSATION_DEFAULTS.standingWeight.recommended),
        obligatory: required(CONVERSATION_DEFAULTS.standingWeight.obligatory),
      },
    },
    CURIOSITY_DEFAULTS,
    ENVIRONMENT_DEFAULTS,
    FAMILY_DEFAULTS,
    HABIT_DEFAULTS,
    HEALTH_DEFAULTS,
    LIFE_DEFAULTS,
    MEMORY_DEFAULTS: {
      ...MEMORY_DEFAULTS,
      kindSalience: {
        outcome: required(MEMORY_DEFAULTS.kindSalience.outcome),
        social: required(MEMORY_DEFAULTS.kindSalience.social),
        witnessed: required(MEMORY_DEFAULTS.kindSalience.witnessed),
        told: required(MEMORY_DEFAULTS.kindSalience.told),
        suggestion: required(MEMORY_DEFAULTS.kindSalience.suggestion),
      },
    },
    GIST_DEFAULTS,
    CUE_RECALL_DEFAULTS,
    METHOD_DEFAULTS,
    NEEDS_DEFAULTS,
    PARTNERING_DEFAULTS,
    PERSISTENCE_DEFAULTS,
    PERSON_DEFAULTS: {
      idleLoad: PERSON_DEFAULTS.idleLoad,
      reviewInterval: PERSON_DEFAULTS.reviewInterval,
      comfortCloseness: PERSON_DEFAULTS.comfortCloseness,
      sleepReviewInterval: PERSON_DEFAULTS.sleepReviewInterval,
      interruptThresholds: PERSON_DEFAULTS.interruptThresholds,
      maxTrace: PERSON_DEFAULTS.maxTrace,
      lonelinessFrom: PERSON_DEFAULTS.lonelinessFrom,
      boredomFrom: PERSON_DEFAULTS.boredomFrom,
      moodEmotionGain: PERSON_DEFAULTS.moodEmotionGain,
      feltBase: PERSON_DEFAULTS.feltBase,
      feltGain: PERSON_DEFAULTS.feltGain,
      failedPenalty: PERSON_DEFAULTS.failedPenalty,
      missedDistress: PERSON_DEFAULTS.missedDistress,
      missedEsteemCost: PERSON_DEFAULTS.missedEsteemCost,
      voiceHarmGain: PERSON_DEFAULTS.voiceHarmGain,
      voiceHarmUrgency: PERSON_DEFAULTS.voiceHarmUrgency,
      participationMagnitude: PERSON_DEFAULTS.participationMagnitude,
      protestQuality: PERSON_DEFAULTS.protestQuality,
      qualityPenalty: PERSON_DEFAULTS.qualityPenalty,
      promiseSlack: PERSON_DEFAULTS.promiseSlack,
      nightFrom: PERSON_DEFAULTS.nightFrom,
      nightTo: PERSON_DEFAULTS.nightTo,
    },
    PROJECTS_DEFAULTS,
    PROMPTINGS_DEFAULTS,
    FORECAST_DEFAULTS,
    PROSPECTION_DEFAULTS,
    REVIEW_DEFAULTS,
    SKILL_DEFAULTS,
    GROUP_DEFAULTS,
    IMPRESSION_DEFAULTS: {
      ...IMPRESSION_DEFAULTS,
      actTraits: {
        flee: {
          emotionality: required(IMPRESSION_DEFAULTS.actTraits.flee?.emotionality),
          conscientiousness: required(IMPRESSION_DEFAULTS.actTraits.flee?.conscientiousness),
        },
        freeze: { emotionality: required(IMPRESSION_DEFAULTS.actTraits.freeze?.emotionality) },
        steady: {
          emotionality: required(IMPRESSION_DEFAULTS.actTraits.steady?.emotionality),
          conscientiousness: required(IMPRESSION_DEFAULTS.actTraits.steady?.conscientiousness),
        },
        help: {
          agreeableness: required(IMPRESSION_DEFAULTS.actTraits.help?.agreeableness),
          honesty: required(IMPRESSION_DEFAULTS.actTraits.help?.honesty),
        },
        care: { agreeableness: required(IMPRESSION_DEFAULTS.actTraits.care?.agreeableness) },
        anger: { agreeableness: required(IMPRESSION_DEFAULTS.actTraits.anger?.agreeableness) },
        refuse: { agreeableness: required(IMPRESSION_DEFAULTS.actTraits.refuse?.agreeableness) },
        defer: { conscientiousness: required(IMPRESSION_DEFAULTS.actTraits.defer?.conscientiousness) },
        complain: { emotionality: required(IMPRESSION_DEFAULTS.actTraits.complain?.emotionality) },
      },
    },
    SOCIAL_DEFAULTS: {
      ...SOCIAL_DEFAULTS,
      roleBaselines: {
        spouse: required(SOCIAL_DEFAULTS.roleBaselines.spouse),
        parent: required(SOCIAL_DEFAULTS.roleBaselines.parent),
        child: required(SOCIAL_DEFAULTS.roleBaselines.child),
        sibling: required(SOCIAL_DEFAULTS.roleBaselines.sibling),
        grandparent: required(SOCIAL_DEFAULTS.roleBaselines.grandparent),
        grandchild: required(SOCIAL_DEFAULTS.roleBaselines.grandchild),
        friend: required(SOCIAL_DEFAULTS.roleBaselines.friend),
        colleague: required(SOCIAL_DEFAULTS.roleBaselines.colleague),
        neighbor: required(SOCIAL_DEFAULTS.roleBaselines.neighbor),
        leader: required(SOCIAL_DEFAULTS.roleBaselines.leader),
      },
    },
    REPUTATION_DEFAULTS,
    WILL_DEFAULTS,
    RETELL_DEFAULTS: { share: 0.6 as const, limit: 3 as const, minSalience: 0.1 as const },
  } satisfies EffectiveBuiltins),
);
if (RETELL_DEFAULTS.share !== 0.6 || RETELL_DEFAULTS.limit !== 3 || RETELL_DEFAULTS.minSalience !== 0.1) {
  throw new TypeError('source retelling prior mismatch');
}
const ENGINE_CONDITIONS = freeze(
  copy([...CHRONIC_CONDITIONS].sort((a, b) => (a.kind < b.kind ? -1 : a.kind > b.kind ? 1 : 0))),
);
export type DerivedParameters = {
  effective: EffectiveParameters;
  provenance: readonly ParameterProvenance[];
  hash: string;
};

export function buildParameters(input?: unknown): Result<DeepReadonly<DerivedParameters>> {
  const admitted = validateData('RunTuning', input === undefined ? {} : input);
  if (!admitted.ok) return admitted;
  const tuning = admitted.value;
  const practiceHalfLifeDays = tuning.promptings?.practiceHalfLifeDays ?? 60;
  const effective: FacultyParameters = {
    builtins: {
      ...copy(ENGINE_BUILTINS),
      PROMPTINGS_DEFAULTS: {
        ...copy(ENGINE_BUILTINS.PROMPTINGS_DEFAULTS),
        practiceHalfLifeDays,
      },
    },
    fixedPriors: {
      downing: { moving: 0.2, health: 0.3 },
      crisisRepertoire: [
        { id: 'unable-to-continue', weight: 1, actions: [], tags: [], durationRangeMs: [7200000, 21600000] },
      ],
      chronicConditions: copy(ENGINE_CONDITIONS),
      inheritance: {
        traitSlope: 0.3,
        traitSd: 0.15,
        aptitudeLogSlope: 0.5,
        aptitudeLogSd: 0.25,
        traitClamp: [0.02, 0.98],
        aptitudeClamp: [0.25, 4],
      },
    },
    planning: { depth: tuning.planning?.depth ?? 4, presentBias: tuning.planning?.presentBias ?? 1 },
    assent: { minStrength: tuning.assent?.minStrength ?? 0.7, pressure: tuning.assent?.pressure ?? 0.1 },
    doze: { hazardScale: tuning.doze?.hazardScale ?? 1 },
    crisis: { hazardScale: tuning.crisis?.hazardScale ?? 1 },
    promptings: { practiceHalfLifeDays, echoRate: tuning.promptings?.echoRate ?? 0.1 },
  };
  const provenance: ParameterProvenance[] = Object.keys(ENGINE_BUILTINS).map((key) => ({
    path: { kind: 'builtin', record: key as keyof EffectiveBuiltins },
    source: { kind: 'assumption', ref: `engineering:hf4/source/${key}` },
    status: 'source-engineering',
  }));
  // Family contact uses an explicitly named delivery-time model snapshot, never
  // an invented observation of the caregiver's hidden historical state.
  provenance.push({
    path: { kind: 'builtin', record: 'FAMILY_DEFAULTS' },
    source: { kind: 'assumption', ref: 'engineering:hf4-family-current-at-delivery-summary-proxy' },
    status: 'provisional-unfitted',
  });
  for (const field of ['downing', 'crisisRepertoire', 'chronicConditions', 'inheritance'] as const)
    provenance.push({
      path: { kind: 'fixed-prior', field },
      source: {
        kind: 'assumption',
        ref: field === 'downing' ? 'engineering:hf4-provisional-unfitted' : `engineering:hf4/source/${field}`,
      },
      status: field === 'downing' ? 'provisional-unfitted' : 'source-engineering',
    });
  for (const field of ['planning', 'assent', 'doze', 'crisis', 'promptings'] as const)
    provenance.push({
      path: { kind: 'tuning', field },
      source: {
        kind: 'assumption',
        ref: Object.hasOwn(tuning, field)
          ? 'authored:hf4-run-tuning'
          : 'engineering:hf4-provisional-unfitted',
      },
      status: Object.hasOwn(tuning, field) ? 'authored-tuning' : 'provisional-unfitted',
    });
  return {
    ok: true,
    value: freeze({
      effective,
      provenance,
      hash: hashCanonical('hf-run4/parameters', effective, provenance),
    }),
  };
}
