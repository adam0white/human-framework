/**
 * SCOPE: developmental trajectories over years, beyond the core `LifeModifiers`. Each curve has its own shape
 * and none is a single age penalty: reward and sensation seeking rise in early adolescence, peak in the late
 * teens and fall through the twenties while planning and inhibition (`maturity`) keep maturing into the
 * mid-twenties (the dual-systems account; Steinberg 2010, Shulman et al. 2016); processing speed peaks in the
 * early twenties and declines gradually while accumulated knowledge keeps rising into later adulthood (the
 * asynchronous peaks of Hartshorne & Germine 2015, research/empirical-models.md S19); grammar learning stays high
 * until the late teens and then declines (Hartshorne, Tenenbaum & Pinker 2018 report a decline starting about
 * 17); `elderDecline` is a smooth late-life progression for hosts that model frailty. The numbers are engineering
 * curves fitted to those shapes by eye, not calibrated predictions, and cross-sectional age curves mix ageing
 * with cohort effects. Nothing here is a destiny: hosts and experience (schooling, practice, health) remain the
 * main drivers, and individual variation is not modelled.
 */
import { clamp, dexp, dpow, smoothstep } from '../core/index.ts';
import type { LifeStage, Person } from '../types.ts';
import { ageYears, modifiersForAge, stageForAge } from './lifecourse.ts';

export interface DevelopmentProfile {
  ageYears: number;
  stage: LifeStage;
  /** Reward and sensation seeking relative to an adult baseline of 1; peaks around 17. */
  sensationSeeking: number;
  /** Processing speed relative to the young-adult peak (1 around 22). */
  processingSpeed: number;
  /** Accumulated knowledge and vocabulary, 0..1, rising into later adulthood. */
  crystallized: number;
  /** How far into adolescence (0 before 10 and after 23, 1 between about 13 and 19). */
  adolescence: number;
  /** Late-life decline progression, 0 before 60 rising to 1 by 95. */
  elderDecline: number;
}

/** Developmental profile for an age in years. */
export function developmentForAge(age: number): DevelopmentProfile {
  const a = Math.max(0, age);
  const sensationSeeking = clamp(
    1 +
      0.35 * dexp(-dpow((a - 17) / 4.5, 2)) -
      0.15 * smoothstep(30, 70, a) -
      0.1 * (1 - smoothstep(4, 10, a)),
    0.6,
    1.4,
  );
  const processingSpeed = clamp(a < 22 ? 0.45 + 0.55 * smoothstep(3, 22, a) : 1 - 0.006 * (a - 22), 0.4, 1);
  const crystallized = clamp(0.05 + 0.95 * smoothstep(2, 55, a) - 0.004 * Math.max(0, a - 75), 0, 1);
  const adolescence = smoothstep(10, 13, a) * (1 - smoothstep(19, 23, a));
  const elderDecline = smoothstep(60, 95, a);
  return {
    ageYears: age,
    stage: stageForAge(age),
    sensationSeeking,
    processingSpeed,
    crystallized,
    adolescence,
    elderDecline,
  };
}

export function development(p: Person): DevelopmentProfile {
  return developmentForAge(ageYears(p));
}

/**
 * Domains with distinct age curves for learning rate. 'general' is `LifeModifiers.learning`; 'language' is
 * grammar/second-language learning (high until about 17, then declining); 'motor' is new movement skills
 * (fast in childhood, gentle decline from 30); 'knowledge' is facts and know-how (near-flat through adulthood).
 */
export type LearningDomain = 'general' | 'language' | 'motor' | 'knowledge';

/** Learning-rate multiplier for a domain at an age (1 = prime adult general learning). */
export function learningMultiplier(age: number, domain: LearningDomain = 'general'): number {
  const a = Math.max(0, age);
  switch (domain) {
    case 'general':
      return modifiersForAge(a).learning;
    case 'language':
      return clamp(1.4 - 0.8 * smoothstep(17, 40, a), 0.5, 1.4);
    case 'motor':
      return clamp(1 + 0.3 * dexp(-a / 12) - 0.006 * Math.max(0, a - 30), 0.5, 1.3);
    case 'knowledge':
      return clamp(0.75 + 0.25 * smoothstep(3, 16, a) - 0.002 * Math.max(0, a - 60), 0.6, 1);
  }
}
