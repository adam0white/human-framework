/**
 * SCOPE: Learned competence per named skill and its momentary use. Borrows the power law of practice
 * (Newell & Rosenbloom 1981: learning rate falls with accumulated practice, so gains diminish), desirable
 * difficulty / zone of proximal development (practice pitched slightly above current level teaches most),
 * the finding that errors still carry information (failures teach at a reduced rate), and long-term
 * retention with a floor (Bahrick-style permastore: disuse erodes part of what was gained, not all of it).
 * Stored `level` is learned competence at `lastPracticed`; `skillLevel` applies forgetting since then, and
 * `successChance` applies momentary capacity and outside support without rewriting what was learned.
 * Does NOT claim: fitted human learning curves, or that one scalar per skill captures a real competence.
 *
 * SCOPE (transfer): sparse, explicit transfer only (research/empirical-models.md §2: related vocabulary
 * helps, strength training does not help diplomacy). A host-supplied `SkillTransfer` map names, per source
 * skill, related skills and a 0..1 fraction; practising the source also moves each related skill by that
 * fraction of the same learning exposure, without consuming the related skill's own practice minutes (so
 * its later practice is not slowed by the power law). Transfer is written at practice time, so stored
 * levels are what later practice builds on. Does not claim: measured transfer fractions, negative transfer,
 * or any default family structure; no map means no transfer. The composite applies a map the host passes to
 * `finish` (`opts.transfer`) or declares on its `World` (`World.skillTransfer`, 1.8.0).
 *
 * SCOPE (how practice is done, 1.8.0, all host opt-in through `PracticeConditions`): practice *quality* scales the
 * learning exposure from `qualityLow` (going through the motions) to `qualityHigh` (focused, with feedback), with
 * ordinary practice (0.5) unchanged; the direction follows deliberate practice (Ericsson, Krampe & Tesch-Römer
 * 1993), whose share of performance differences is real but domain-dependent and modest (Macnamara, Hambrick &
 * Oswald 2014: 26 % games, 21 % music, 18 % sports, 4 % education, < 1 % professions). *Instruction* from someone
 * more skilled raises how much practice teaches, by up to `instructionGain` when the teacher is at least
 * `instructionGapScale` above the learner and fully engaged, and not at all from a teacher no better than the
 * learner; the direction follows the tutoring literature (VanLehn 2011: human tutoring about d = 0.79 over no
 * tutoring, well below Bloom's 1984 two sigma), and the size is an engineering choice (v0 guided practice taught
 * twice as fast), not a conversion of d. *Observation* (`learnByWatching`) moves a watcher toward a fraction
 * (`observeCeiling`) of the model's level at `observeRate` of practice's rate, without adding practice minutes, so it
 * teaches the basics and never mastery; the direction follows observational modelling (Bandura 1977; Ashford,
 * Bennett & Davids 2006: larger effects on movement form, d ≈ 0.77, than on outcomes, d ≈ 0.17). Sources:
 * research/long-run-sources.md. Does not claim: calibrated sizes, teaching effects on the teacher, item-level
 * knowledge, or that watching an unskilled model teaches errors.
 *
 * SCOPE (consolidation, 1.8.0, opt-in per person with `enableSkillRetention`): without it, forgetting runs at one
 * half-life between any two sessions, so over decades of daily practice the shrinking power-law gains fall below a
 * day's forgetting and a lifelong farmer plateaus low and then declines (docs/findings.md). With it, the forgetting
 * half-life grows with accumulated practice hours, so well-practised skills barely rust between daily sessions and
 * decay slowly in disuse. This is an overlearning hypothesis: Arthur, Bennett, Stanush & McNelly 1998 (meta-analysis)
 * show decay growing with time of nonuse and moderated by task type, with only weak, data-limited evidence on
 * overlearning. The linear form and `consolidationHours` are engineering assumptions, not a fitted curve. Does not claim: different retention by skill
 * type (closed versus open, physical versus cognitive), or that spacing of sessions matters.
 */
import { clamp01, decay, dexp, dlog, isNum, isObj, sigmoid } from '../core/index.ts';
import {
  type EntityId,
  MINUTES_PER_DAY,
  type Minute,
  type Person,
  type PracticeConditions,
  type Skill,
  type Unit,
} from '../types.ts';

export const SKILL_DEFAULTS = {
  /** Level of an unknown/untrained skill. */
  base: 0.05,
  /** Fraction of gains above `base` that survives indefinite disuse. */
  retentionFloor: 0.6,
  /** Half-life (minutes) of the forgettable part of a gain during non-practice. */
  forgetHalfLife: 180 * MINUTES_PER_DAY,
  /** Initial learning rate per practice hour on (1 - level) with ideal challenge. */
  rate0: 0.02,
  /** Practice hours over which the rate halves (power-law scale). */
  rateScaleHours: 20,
  /** difficulty - level at which practice teaches most (desirable difficulty). */
  challengeOptimum: 0.1,
  /** Width (sd) of the challenge bell in level units. */
  challengeWidth: 0.2,
  /** Learning fraction retained when practice is far too easy or far too hard. */
  challengeFloor: 0.15,
  /** Learning multiplier on failed attempts relative to successes. */
  failureLearning: 0.6,
  /** Logistic slope on (effective skill - difficulty). */
  successSlope: 10,
  /** Logistic offset: at effective skill == difficulty, chance = sigmoid(bias) ≈ 0.73. */
  successBias: 1,
  /** Effective skill multiplier at zero capacity (1 at full capacity). */
  capacityFloor: 0.5,
  /** Effective skill added by full support (tools, help, instruction). */
  supportBonus: 0.15,
  /** Learning multiplier at practice quality 0 and 1 (0.5 → 1). Engineering assumption (see SCOPE). */
  qualityLow: 0.5,
  qualityHigh: 1.5,
  /** Extra learning from a fully engaged teacher at least `instructionGapScale` above the learner (1 = twice). */
  instructionGain: 1,
  instructionGapScale: 0.3,
  /** Observation learns at this fraction of practice's rate, toward `observeCeiling` × the model's level. */
  observeRate: 0.3,
  observeCeiling: 0.6,
  /**
   * Practice hours that double the forgetting half-life when consolidation is on (1.8.0, `enableSkillRetention`):
   * half-life = forgetHalfLife × (1 + hours / consolidationHours). Engineering assumption (see SCOPE).
   */
  consolidationHours: 300,
} as const;

type SkillHolder = Pick<Person, 'skills' | 'now' | 'skillRetention'>;

/** Source skill id -> related skill id -> fraction (0..1) of the source's learning exposure that transfers. */
export type SkillTransfer = Record<string, Record<string, Unit>>;

/** Symmetric transfer map from families (every member transfers `fraction` to every other member). */
export function skillFamilies(families: Record<string, readonly string[]>, fraction: Unit): SkillTransfer {
  const out: SkillTransfer = {};
  const f = clamp01(fraction);
  for (const fam of Object.keys(families).sort()) {
    const members = families[fam] ?? [];
    for (const a of members) {
      for (const b of members) {
        if (a === b) continue;
        const row = out[a] ?? {};
        out[a] = row;
        row[b] = Math.max(row[b] ?? 0, f);
      }
    }
  }
  return out;
}

/**
 * Turn on practice consolidation for this person (1.8.0, idempotent; see the SCOPE on consolidation). Without it the
 * forgetting half-life is the same however long a skill was practised.
 */
export function enableSkillRetention(p: Pick<Person, 'skillRetention'>): void {
  p.skillRetention ??= { consolidationHours: SKILL_DEFAULTS.consolidationHours };
}

/** Restore-time check of `skillRetention` (1.8.0): undefined (off) unless `consolidationHours` is finite. @internal */
export function sanitizeSkillRetention(x: unknown): Person['skillRetention'] {
  return isObj(x) && isNum(x.consolidationHours) ? (x as Person['skillRetention']) : undefined;
}

/** Forgetting half-life of a skill (minutes): longer the more it was practised, when consolidation is on. */
function halfLifeOf(s: Skill, retention: Person['skillRetention']): number {
  const d = SKILL_DEFAULTS;
  if (!retention) return d.forgetHalfLife;
  return d.forgetHalfLife * (1 + s.practice / 60 / Math.max(1, retention.consolidationHours));
}

function retained(s: Skill, now: Minute, retention?: Person['skillRetention']): Unit {
  const d = SKILL_DEFAULTS;
  const gained = Math.max(0, s.level - d.base);
  const floor = d.base + d.retentionFloor * gained;
  const elapsed = Math.max(0, now - s.lastPracticed);
  return clamp01(decay(s.level, elapsed, halfLifeOf(s, retention), Math.min(floor, s.level)));
}

/** Learned competence with forgetting applied up to `p.now`. Unknown skill -> base (0.05). */
export function skillLevel(p: SkillHolder, id: string): Unit {
  const s = p.skills[id];
  return s ? retained(s, p.now, p.skillRetention) : SKILL_DEFAULTS.base;
}

/**
 * Chance of succeeding at a task of `difficulty`: sigmoid(slope * (effective - difficulty) + bias), where
 * effective = level * lerp(capacityFloor, 1, capacity) + supportBonus * support. Low capacity
 * (fatigue, pain, illness) lowers performance without lowering learned level.
 */
export function successChance(
  p: SkillHolder,
  id: string,
  difficulty: Unit,
  capacity: Unit,
  support = 0,
): Unit {
  const d = SKILL_DEFAULTS;
  const cap = clamp01(capacity);
  const effective =
    skillLevel(p, id) * (d.capacityFloor + (1 - d.capacityFloor) * cap) + d.supportBonus * clamp01(support);
  return clamp01(sigmoid(d.successSlope * (effective - clamp01(difficulty)) + d.successBias));
}

/** 0..1 bell centred slightly above current level, with a floor. */
export function challengeFactor(level: Unit, difficulty: Unit): Unit {
  const d = SKILL_DEFAULTS;
  const z = (difficulty - level - d.challengeOptimum) / d.challengeWidth;
  return d.challengeFloor + (1 - d.challengeFloor) * dexp(-0.5 * z * z);
}

/** Integrated learning exposure for practice from h0 to h1 hours (power-law rate k0 / (1 + h/scale)). */
function exposure(h0: number, h1: number): number {
  const d = SKILL_DEFAULTS;
  return d.rate0 * d.rateScaleHours * dlog((1 + h1 / d.rateScaleHours) / (1 + h0 / d.rateScaleHours));
}

/** Learning multiplier for practice quality (1 when absent or 0.5). */
function qualityFactor(quality: Unit | undefined): number {
  if (quality === undefined) return 1;
  const d = SKILL_DEFAULTS;
  const q = clamp01(quality);
  return q <= 0.5
    ? d.qualityLow + (1 - d.qualityLow) * (q / 0.5)
    : 1 + (d.qualityHigh - 1) * ((q - 0.5) / 0.5);
}

/** Learning multiplier from a teacher's guidance for a learner at `learner` (1 when absent or no better). */
function instructionFactor(instruction: PracticeConditions['instruction'], learner: Unit): number {
  if (!instruction) return 1;
  const d = SKILL_DEFAULTS;
  const gap = clamp01((clamp01(instruction.level) - learner) / d.instructionGapScale);
  return 1 + d.instructionGain * clamp01(instruction.engagement ?? 1) * gap;
}

/** Instruction from `teacher` in skill `id` (their current level, with rust), for `Outcome.practice.instruction`. */
export function instructionFrom(
  teacher: SkillHolder & { id?: EntityId },
  id: string,
  engagement: Unit = 1,
): NonNullable<PracticeConditions['instruction']> {
  const out: NonNullable<PracticeConditions['instruction']> = { level: skillLevel(teacher, id), engagement };
  if (teacher.id !== undefined) out.teacherId = teacher.id;
  return out;
}

/**
 * Practise for `minutes`. Gain follows dL/dt = learning * k(practice) * challenge * outcome * (1 - L), integrated
 * in closed form so one long session ≈ many short ones. Forgetting since last practice is applied first.
 * With `transfer`, each related skill r gains L_r <- 1 - (1 - L_r) e^{-fraction × k} (see SCOPE, transfer).
 */
export function practise(
  p: SkillHolder,
  id: string,
  minutes: number,
  difficulty: Unit,
  succeeded: boolean,
  learning: number,
  now: Minute,
  transfer?: SkillTransfer,
  conditions?: PracticeConditions,
): { before: Unit; after: Unit } {
  const d = SKILL_DEFAULTS;
  const existing = p.skills[id];
  const before = existing ? retained(existing, now, p.skillRetention) : d.base;
  const priorMinutes = existing?.practice ?? 0;
  const mins = Math.max(0, minutes);
  let k =
    Math.max(0, learning) *
    challengeFactor(before, clamp01(difficulty)) *
    (succeeded ? 1 : d.failureLearning) *
    exposure(priorMinutes / 60, (priorMinutes + mins) / 60);
  // Only multiply when conditions are given, so a run without them keeps its exact bits.
  if (conditions) k *= qualityFactor(conditions.quality) * instructionFactor(conditions.instruction, before);
  const after = clamp01(1 - (1 - before) * dexp(-k));
  p.skills[id] = {
    level: after,
    practice: priorMinutes + mins,
    lastPracticed: Math.max(now, existing?.lastPracticed ?? now),
  };
  const related = transfer?.[id];
  if (related && k > 0) {
    for (const r of Object.keys(related).sort()) {
      const f = clamp01(related[r] ?? 0);
      if (r === id || f <= 0) continue;
      const ex = p.skills[r];
      const rb = ex ? retained(ex, now, p.skillRetention) : d.base;
      p.skills[r] = {
        level: clamp01(1 - (1 - rb) * dexp(-f * k)),
        practice: ex?.practice ?? 0,
        lastPracticed: Math.max(now, ex?.lastPracticed ?? now),
      };
    }
  }
  return { before, after };
}

/**
 * Learn by watching someone practise skill `id` at `modelLevel` for `minutes` (observational learning; see SCOPE).
 * The watcher moves toward `observeCeiling × modelLevel` at `observeRate` of what the same minutes of their own
 * practice would teach at ideal challenge. Practice minutes are not added (so their later practice is not slowed by
 * the power law); the stored level is re-anchored at `now` (rust counts from here). Watching someone no better than
 * that ceiling teaches nothing.
 */
export function learnByWatching(
  p: SkillHolder,
  id: string,
  minutes: number,
  modelLevel: Unit,
  learning: number,
  now: Minute,
): { before: Unit; after: Unit } {
  const d = SKILL_DEFAULTS;
  const existing = p.skills[id];
  const before = existing ? retained(existing, now, p.skillRetention) : d.base;
  const ceiling = d.observeCeiling * clamp01(modelLevel);
  const mins = Math.max(0, minutes);
  if (ceiling <= before || mins <= 0) return { before, after: before };
  const prior = existing?.practice ?? 0;
  const k = Math.max(0, learning) * d.observeRate * exposure(prior / 60, (prior + mins) / 60);
  const after = clamp01(before + (ceiling - before) * (1 - dexp(-k)));
  p.skills[id] = {
    level: after,
    practice: prior,
    lastPracticed: Math.max(now, existing?.lastPracticed ?? now),
  };
  return { before, after };
}

/** Practice minutes an ideally-pitched learner would need to reach `level` from base (used for seeding). */
function practiceFor(level: Unit): number {
  const d = SKILL_DEFAULTS;
  if (level <= d.base) return 0;
  const need = dlog((1 - d.base) / Math.max(1e-6, 1 - level));
  return Math.min(1e9, d.rateScaleHours * (dexp(need / (d.rate0 * d.rateScaleHours)) - 1) * 60);
}

/** Build a skills record from initial levels; practice minutes are back-filled so returns keep diminishing. */
export function seedSkills(levels: Record<string, Unit>, now: Minute): Record<string, Skill> {
  const out: Record<string, Skill> = {};
  for (const [id, raw] of Object.entries(levels)) {
    const level = clamp01(raw);
    out[id] = { level, practice: Math.round(practiceFor(level)), lastPracticed: now };
  }
  return out;
}
