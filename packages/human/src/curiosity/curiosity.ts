/**
 * SCOPE: opt-in intrinsic exploration and play. Uncertainty draws a relaxed person toward unfamiliar
 * offers; falling prediction error rewards learning; recent action kinds invite variation in target or
 * place. Shapes, not fitted values: learning progress (Oudeyer, Kaplan & Hafner 2007), information gaps
 * (Loewenstein 1994; Kidd & Hayden 2015; Gottlieb et al. 2013), effectance and competence (White 1959;
 * Deci & Ryan), relaxed repetition with variation (Burghardt 2005), openness (DeYoung), childhood
 * exploration (Gopnik 2020). See research/curiosity-and-play.md. All coefficients are engineering defaults.
 * This owns only p.curiosity. It neither adopts projects nor plans, reads no host novelty tags, and
 * implements no faith lens, LLM or RNG. Without the slice it adds no state, terms or reward.
 */
import { emotionLevel } from '../affect/index.ts';
import type { ConsiderContext } from '../cognition/index.ts';
import { clamp01, isNum, isObj, round } from '../core/index.ts';
import { lifeModifiers } from '../lifecourse/index.ts';
import { expectationKey, expectedEffect } from '../memory/index.ts';
import { satisfy } from '../needs/index.ts';
import { readPerson } from '../person.ts';
import type {
  Affordance,
  CuriosityAct,
  CuriosityReading,
  CuriositySpec,
  CuriosityState,
  Minute,
  Outcome,
  Person,
  Term,
} from '../types.ts';
import { MAX_MINUTE, PHYSIOLOGICAL_NEEDS } from '../types.ts';

/** Engineering defaults: unknown .8 exceeds mild effort (.1 base) and learned pleasure (.6 scale).
 * Need relief uses cognition's scale 4; urgency and fear also suppress this entire drive.
 */
export const CURIOSITY_DEFAULTS = {
  unknownScale: 0.8,
  progressScale: 2,
  varyScale: 0.15,
  recentMinutes: 60,
  rewardMax: 0.03,
  fastAlpha: 0.5,
  slowAlpha: 0.15,
  maxKeys: 32,
  maxRecent: 8,
} as const;
const SPEC_KEYS = ['unknownScale', 'progressScale', 'varyScale', 'recentMinutes', 'rewardMax'] as const;
function cleanSpec(input: unknown): CuriositySpec {
  const out: CuriositySpec = {};
  if (!isObj(input)) return out;
  for (const key of SPEC_KEYS) {
    const x = input[key];
    const max = key === 'recentMinutes' ? 1440 : CURIOSITY_DEFAULTS[key];
    if (isNum(x) && x >= 0 && x <= max) out[key] = x;
  }
  return out;
}
const setting = (s: CuriosityState, key: (typeof SPEC_KEYS)[number]): number =>
  s.spec?.[key] ?? CURIOSITY_DEFAULTS[key];

/** Enable or reconfigure; retain the bounded history. Invalid overrides use defaults. */
export function enableCuriosity(p: Person, spec: CuriositySpec = {}): CuriosityState {
  const out: CuriosityState = { errors: p.curiosity?.errors ?? [], recent: p.curiosity?.recent ?? [] };
  const clean = cleanSpec(spec);
  if (Object.keys(clean).length) out.spec = clean;
  p.curiosity = out;
  return out;
}

type Context = Pick<ConsiderContext, 'needs' | 'mods' | 'now'>;
function reading(p: Person, aff: Affordance, ctx: Context): CuriosityReading {
  const s = p.curiosity;
  if (!s) return { unknown: 0, progress: 0, vary: 0, drive: 0 };
  let urgency = 0;
  for (const n of ctx.needs)
    if (n.id === 'safety' || (PHYSIOLOGICAL_NEEDS as readonly string[]).includes(n.id))
      urgency = Math.max(urgency, n.urgency);
  const drive =
    (1 - clamp01(urgency)) *
    (1 - emotionLevel(p, 'fear')) *
    (0.25 + 0.75 * p.traits.openness) *
    (1.25 - 0.5 * ctx.mods.maturity);
  const error = s.errors.find((e) => e.key === expectationKey(aff));
  const recent = s.recent.filter(
    (r) => r.at <= ctx.now && ctx.now - r.at <= setting(s, 'recentMinutes') && r.action === aff.action,
  );
  const identical = recent.some((r) => r.targetId === aff.targetId && r.placeId === aff.placeId);
  return {
    unknown: clamp01(1 - expectedEffect(p, aff).confidence),
    progress: error ? clamp01(error.slow - error.fast) : 0,
    vary: !identical && recent.length > 0 ? 1 : 0,
    drive,
  };
}

/** Read raw signals and drive without mutation or RNG. `now` changes only the recent-act window. */
export function curiosityOf(p: Person, aff: Affordance, now: Minute = p.now): CuriosityReading {
  if (!p.curiosity) return { unknown: 0, progress: 0, vary: 0, drive: 0 };
  return reading(p, aff, { now, needs: readPerson(p).needs, mods: lifeModifiers(p) });
}

/** Cognition uses the actual decision context, including perceived needs. Fixed term order. */
export function curiosityTerms(p: Person, aff: Affordance, ctx: Context): Term[] {
  const s = p.curiosity;
  if (!s) return [];
  const r = reading(p, aff, ctx);
  return (['unknown', 'progress', 'vary'] as const).map((key) => ({
    source: `curiosity:${key}`,
    value: round(Math.min(setting(s, `${key}Scale`), setting(s, `${key}Scale`) * r[key] * r.drive)),
  }));
}

/** Called before memory learns this outcome. Needs owner applies the small, bounded reward. */
export function noteCuriosity(p: Person, aff: Affordance, outcome: Outcome, felt: number): void {
  const s = p.curiosity;
  if (!s || outcome.status === 'interrupted') return;
  const before = curiosityOf(p, aff);
  const expected = expectedEffect(p, aff);
  const error = clamp01(
    (Math.abs((outcome.status === 'completed' ? 1 : 0) - expected.successRate) +
      Math.abs(felt - expected.valence) / 2) /
      2,
  );
  const key = expectationKey(aff);
  let entry = s.errors.find((e) => e.key === key);
  if (!entry) {
    if (s.errors.length >= CURIOSITY_DEFAULTS.maxKeys) {
      let oldest = 0;
      let oldestAt = s.errors[0]?.lastAt ?? p.now;
      for (const [i, held] of s.errors.entries()) {
        if (held.lastAt < oldestAt) {
          oldest = i;
          oldestAt = held.lastAt;
        }
      }
      s.errors.splice(oldest, 1);
    }
    entry = { key, fast: error, slow: error, n: 1, lastAt: p.now };
    s.errors.push(entry);
  } else {
    entry.fast = clamp01(entry.fast + CURIOSITY_DEFAULTS.fastAlpha * (error - entry.fast));
    entry.slow = clamp01(entry.slow + CURIOSITY_DEFAULTS.slowAlpha * (error - entry.slow));
    entry.n = Math.min(Number.MAX_SAFE_INTEGER, entry.n + 1);
    entry.lastAt = p.now;
  }
  const act: CuriosityAct = { action: aff.action, at: p.now };
  if (aff.targetId !== undefined) act.targetId = aff.targetId;
  if (aff.placeId !== undefined) act.placeId = aff.placeId;
  s.recent.push(act);
  if (s.recent.length > CURIOSITY_DEFAULTS.maxRecent) s.recent.shift();
  const progress = Math.max(0, entry.slow - entry.fast);
  const reward = Math.min(
    setting(s, 'rewardMax'),
    setting(s, 'rewardMax') * (before.unknown + progress) * before.drive,
  );
  satisfy(p, { leisure: reward / 2, competence: reward / 2 });
}

const str = (x: unknown): x is string => typeof x === 'string' && x.length > 0 && x.length <= 512;
const unit = (x: unknown): x is number => isNum(x) && x >= 0 && x <= 1;
const minute = (x: unknown, now: number): x is number => isNum(x) && Math.abs(x) <= MAX_MINUTE && x <= now;
/** Conservative restore: drop malformed or ambiguous slices; skip malformed entries and bound lists. */
export function sanitizeCuriosity(input: unknown, now: Minute): CuriosityState | undefined {
  if (!isObj(input) || !Array.isArray(input.errors) || !Array.isArray(input.recent)) return undefined;
  if (input.spec !== undefined && !isObj(input.spec)) return undefined;
  const out: CuriosityState = { errors: [], recent: [] };
  if (input.spec !== undefined) {
    const spec = cleanSpec(input.spec);
    if (Object.keys(spec).length !== Object.keys(input.spec).length) return undefined;
    if (Object.keys(spec).length) out.spec = spec;
  }
  const seen = new Set<string>();
  for (const e of input.errors.slice(0, CURIOSITY_DEFAULTS.maxKeys)) {
    if (
      !isObj(e) ||
      !str(e.key) ||
      !unit(e.fast) ||
      !unit(e.slow) ||
      !minute(e.lastAt, now) ||
      !Number.isSafeInteger(e.n) ||
      (e.n as number) < 1
    )
      continue;
    if (seen.has(e.key)) return undefined;
    seen.add(e.key);
    out.errors.push({ key: e.key, fast: e.fast, slow: e.slow, n: e.n as number, lastAt: e.lastAt });
  }
  for (const r of input.recent.slice(-CURIOSITY_DEFAULTS.maxRecent)) {
    if (!isObj(r) || !str(r.action) || !minute(r.at, now)) continue;
    if ((r.targetId !== undefined && !str(r.targetId)) || (r.placeId !== undefined && !str(r.placeId)))
      continue;
    const act: CuriosityAct = { action: r.action, at: r.at };
    if (r.targetId !== undefined) act.targetId = r.targetId as string;
    if (r.placeId !== undefined) act.placeId = r.placeId as string;
    out.recent.push(act);
  }
  return out;
}
