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
 * or any default family structure; no map means no transfer.
 */
import { clamp01, decay, sigmoid } from '../core/index.ts';
import { MINUTES_PER_DAY, type Minute, type Person, type Skill, type Unit } from '../types.ts';

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
} as const;

type SkillHolder = Pick<Person, 'skills' | 'now'>;

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

function retained(s: Skill, now: Minute): Unit {
  const d = SKILL_DEFAULTS;
  const gained = Math.max(0, s.level - d.base);
  const floor = d.base + d.retentionFloor * gained;
  const elapsed = Math.max(0, now - s.lastPracticed);
  return clamp01(decay(s.level, elapsed, d.forgetHalfLife, Math.min(floor, s.level)));
}

/** Learned competence with forgetting applied up to `p.now`. Unknown skill -> base (0.05). */
export function skillLevel(p: SkillHolder, id: string): Unit {
  const s = p.skills[id];
  return s ? retained(s, p.now) : SKILL_DEFAULTS.base;
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
  return d.challengeFloor + (1 - d.challengeFloor) * Math.exp(-0.5 * z * z);
}

/** Integrated learning exposure for practice from h0 to h1 hours (power-law rate k0 / (1 + h/scale)). */
function exposure(h0: number, h1: number): number {
  const d = SKILL_DEFAULTS;
  return d.rate0 * d.rateScaleHours * Math.log((1 + h1 / d.rateScaleHours) / (1 + h0 / d.rateScaleHours));
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
): { before: Unit; after: Unit } {
  const d = SKILL_DEFAULTS;
  const existing = p.skills[id];
  const before = existing ? retained(existing, now) : d.base;
  const priorMinutes = existing?.practice ?? 0;
  const mins = Math.max(0, minutes);
  const k =
    Math.max(0, learning) *
    challengeFactor(before, clamp01(difficulty)) *
    (succeeded ? 1 : d.failureLearning) *
    exposure(priorMinutes / 60, (priorMinutes + mins) / 60);
  const after = clamp01(1 - (1 - before) * Math.exp(-k));
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
      const rb = ex ? retained(ex, now) : d.base;
      p.skills[r] = {
        level: clamp01(1 - (1 - rb) * Math.exp(-f * k)),
        practice: ex?.practice ?? 0,
        lastPracticed: Math.max(now, ex?.lastPracticed ?? now),
      };
    }
  }
  return { before, after };
}

/** Practice minutes an ideally-pitched learner would need to reach `level` from base (used for seeding). */
function practiceFor(level: Unit): number {
  const d = SKILL_DEFAULTS;
  if (level <= d.base) return 0;
  const need = Math.log((1 - d.base) / Math.max(1e-6, 1 - level));
  return Math.min(1e9, d.rateScaleHours * (Math.exp(need / (d.rate0 * d.rateScaleHours)) - 1) * 60);
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
