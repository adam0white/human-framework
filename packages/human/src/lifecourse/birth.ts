/**
 * SCOPE: a newborn's creation spec from two parents. Temperament tendencies (HEXACO traits) are drawn as
 * regression toward the population mean from the midparent value plus noise: child = 0.5 + h·(midparent − 0.5)
 * + N(0, σ·√(1 − h²/2)), the standard quantitative-genetics midparent regression with slope h (here an additive
 * share of about 0.3, below the ~0.4 broad heritability twin studies report for personality, F2 in
 * research/family-environment-sources.md, and between the twin .47 and family-study .22 figures there; parent-child
 * personality correlations are only about .15, F5). Heritability is a population variance statistic
 * (research/empirical-models.md §7, S18): it says nothing fixed about one child,
 * so the result is a loose tendency with wide noise, never a destiny, and it says nothing about worth. Values
 * start near the household's midpoint only through an optional, separate `valueTransmission` (exposure, not
 * inheritance). Norm understanding is not inherited: the child starts holding no norms, because understanding is
 * learned and the framework assigns no religious obligation by age; a host may opt in to household exposure.
 * Randomness comes from a stream seeded by `spec.seed`, so no parent's RNG is consumed.
 *
 * SCOPE (aptitudes, 1.8.0): an opt-in `aptitudes` list of skill ids draws a learning multiplier per skill (1 =
 * average) on a log scale by the same midparent regression, slope 0.5 by default (the mean twin heritability
 * across traits is 0.49, F1; using it for learning aptitude is an engineering assumption), sd 0.25 in log units.
 * Parents without a recorded aptitude count as average. The draws come after every other draw, so a child spec
 * without `aptitudes` is unchanged. Physical inheritance (height, build, health) is not modelled.
 */
import { clamp, createRng, dexp, dlog, normal, random } from '../core/index.ts';
import type { HeldNorm, Person, PersonSpec, Relationship, Traits, Values } from '../types.ts';

export interface ChildSpec {
  id: string;
  name: string;
  seed: number;
  /** Birth minute (default: parent A's `now`). */
  bornAt?: number;
  /** Simulation minute the spec is current at (default: `bornAt`). */
  now?: number;
  /** Default: drawn 50/50 from the child's stream. */
  sex?: 'female' | 'male';
  /** Midparent regression slope for traits (default 0.3). */
  heritability?: number;
  /** Population standard deviation of a trait on the 0..1 scale (default 0.15). */
  traitSd?: number;
  /** Household exposure slope for values (default 0: values start at the population mean). */
  valueTransmission?: number;
  /** Copy the parents' held norms at this fraction of their mean conviction (default: none held). */
  normExposure?: number;
  /** Skill ids to draw inherited learning aptitudes for (1.8.0; default none). */
  aptitudes?: readonly string[];
  /** Midparent regression slope for aptitudes on the log scale (default 0.5). */
  aptitudeHeritability?: number;
  /** Population sd of log aptitude (default 0.25). */
  aptitudeSd?: number;
  /** Explicit overrides. */
  traits?: Partial<Traits>;
  values?: Partial<Values>;
}

export interface ChildBirth {
  spec: PersonSpec;
  /** Relationships each parent should add toward the child (the composite applies them through `social/`). */
  parentLinks: { parentId: string; relationship: Partial<Relationship> & { otherId: string } }[];
}

const TRAITS: (keyof Traits)[] = [
  'honesty',
  'emotionality',
  'extraversion',
  'agreeableness',
  'conscientiousness',
  'openness',
];
const VALUES: (keyof Values)[] = [
  'benevolence',
  'universalism',
  'tradition',
  'conformity',
  'security',
  'achievement',
  'power',
  'hedonism',
  'stimulation',
  'selfDirection',
];

/** Creation spec for a child of `a` and `b`. Pure apart from the child's own seeded stream. */
export function createChild(a: Person, b: Person, spec: ChildSpec): ChildBirth {
  const rng = createRng(spec.seed);
  const h = clamp(spec.heritability ?? 0.3, 0, 1);
  const sd = Math.max(0, spec.traitSd ?? 0.15);
  const residual = sd * Math.sqrt(Math.max(0, 1 - (h * h) / 2));
  const sex = spec.sex ?? (random(rng) < 0.5 ? 'female' : 'male');
  const bornAt = spec.bornAt ?? a.now;

  const traits: Partial<Traits> = {};
  for (const k of TRAITS) {
    const mid = (a.traits[k] + b.traits[k]) / 2;
    traits[k] = clamp(0.5 + h * (mid - 0.5) + normal(rng, 0, residual), 0.02, 0.98);
  }
  const vt = clamp(spec.valueTransmission ?? 0, 0, 1);
  const values: Partial<Values> = {};
  if (vt > 0) {
    for (const k of VALUES) {
      const mid = (a.values[k] + b.values[k]) / 2;
      values[k] = clamp(0.5 + vt * (mid - 0.5) + normal(rng, 0, sd), 0.02, 0.98);
    }
  }

  const norms: HeldNorm[] = [];
  if (spec.normExposure !== undefined && spec.normExposure > 0) {
    const ids = [...new Set([...a.conscience.norms, ...b.conscience.norms].map((n) => n.normId))].sort();
    for (const id of ids) {
      const held = [...a.conscience.norms, ...b.conscience.norms].filter((n) => n.normId === id);
      const top = held.reduce((x, y) => (y.conviction > x.conviction ? y : x));
      const meanConviction = held.reduce((s, n) => s + n.conviction, 0) / 2;
      norms.push({
        normId: id,
        standing: top.standing,
        conviction: clamp(meanConviction * spec.normExposure, 0, 1),
      });
    }
  }

  // Aptitudes last, so a spec without them draws exactly what it did before 1.8.0.
  let aptitudes: Record<string, number> | undefined;
  if (spec.aptitudes && spec.aptitudes.length > 0) {
    const ha = clamp(spec.aptitudeHeritability ?? 0.5, 0, 1);
    const sda = Math.max(0, spec.aptitudeSd ?? 0.25);
    const res = sda * Math.sqrt(Math.max(0, 1 - (ha * ha) / 2));
    const logOf = (p: Person, id: string) => {
      const v = p.family?.aptitudes?.[id];
      return typeof v === 'number' && v > 0 && Number.isFinite(v) ? dlog(v) : 0;
    };
    aptitudes = {};
    for (const id of [...new Set(spec.aptitudes)].sort()) {
      const mid = (logOf(a, id) + logOf(b, id)) / 2;
      aptitudes[id] = clamp(dexp(ha * mid + normal(rng, 0, res)), 0.25, 4);
    }
  }

  const childSpec: PersonSpec = {
    id: spec.id,
    name: spec.name,
    seed: spec.seed,
    now: spec.now ?? bornAt,
    bornAt,
    sex,
    traits: { ...traits, ...spec.traits },
    values: { ...values, ...spec.values },
    norms,
    relationships: [a, b].map((parent) => ({
      otherId: parent.id,
      roles: ['parent'],
      affection: 0.5,
      trust: 0.8,
      familiarity: 0.3,
    })),
    voices: [a, b].map((parent) => ({ voiceId: parent.id, trust: 0.8 })),
  };
  if (aptitudes) childSpec.family = { aptitudes };
  const parentLinks = [a, b].map((parent) => ({
    parentId: parent.id,
    relationship: { otherId: spec.id, roles: ['child'], affection: 0.7, trust: 0.5, familiarity: 0.3 },
  }));
  return { spec: childSpec, parentLinks };
}
