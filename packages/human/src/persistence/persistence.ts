/**
 * SCOPE: opt-in persistence of a started goal, owned only in p.pursuit. Positive goal terms cue
 * continued means (implementation intentions: Gollwitzer 1999; Gollwitzer & Sheeran 2006), while
 * unrelated options pay a switching cost (goal shielding: Shah, Friedman & Kruglanski 2002;
 * task switching: Monsell 2003). Unused activation expires (Altmann & Trafton 2002); short
 * interruptions allow resumption (Ovsiankina 1928). See research/projects-and-persistence.md.
 * Maximum-duration release rests that goal for one bounded interval before pursuit can form again.
 * These are shapes, not fitted values; all coefficients and time bounds are engineering defaults.
 * This is a bounded bias plus a switching cost, not a planner. It chooses no goals, executes no
 * plans, reorders no steps and changes no agenda valuation. It imports no projects, uses no RNG,
 * LLM or faith lens. Needs and fear gate both terms; commitment options never pay the switch cost.
 * Behaviour 2 halves both terms with time since the pursued goal last advanced (or adoption),
 * including after release and re-formation. Absent behaviour retains the 2.14.0 undecaying pull.
 * Without the slice, it adds no state or terms.
 */
import { emotionLevel } from '../affect/index.ts';
import type { ConsiderContext } from '../cognition/index.ts';
import { clamp01, cmpStr, dpow, isNum, isObj, round } from '../core/index.ts';
import type { Minute, PersistenceSpec, Person, Pursuit, PursuitState, Term } from '../types.ts';
import { MAX_MINUTE, PHYSIOLOGICAL_NEEDS } from '../types.ts';

/** Engineering defaults, relative to cognition's need scale 4, pleasure .6 and curiosity .8/.15.
 * Continuation and switching together outweigh mild relaxed distraction; urgency and fear gate both.
 * A pressing commitment has its full agenda term and pays no switching cost.
 */
export const PERSISTENCE_DEFAULTS = {
  continueScale: 0.8,
  switchScale: 0.8,
  cap: 0.8,
  switchMargin: 0.15,
  slackMinutes: 20,
  maxMinutes: 240,
  restMinutes: 20,
  stallHalfLifeMinutes: 30,
} as const;
const KEYS = [
  'continueScale',
  'switchScale',
  'cap',
  'switchMargin',
  'slackMinutes',
  'maxMinutes',
  'restMinutes',
  'stallHalfLifeMinutes',
] as const;
function cleanSpec(input: unknown): PersistenceSpec {
  const out: PersistenceSpec = {};
  if (!isObj(input)) return out;
  for (const key of KEYS) {
    const x = input[key];
    const duration =
      key === 'slackMinutes' ||
      key === 'maxMinutes' ||
      key === 'restMinutes' ||
      key === 'stallHalfLifeMinutes';
    const min = key === 'stallHalfLifeMinutes' ? 1 : 0;
    if (isNum(x) && x >= min && x <= (duration ? 1440 : 1)) out[key] = x;
  }
  return out;
}
const setting = (s: PursuitState, key: (typeof KEYS)[number]): number =>
  s.spec?.[key] ?? PERSISTENCE_DEFAULTS[key];
const identifier = (x: unknown): x is string => typeof x === 'string' && x.length > 0 && x.length <= 512;
const active = (p: Person, id: string) => p.agenda.goals.find((g) => g.id === id && g.status === 'active');

/** Enable or reconfigure, retaining a current pursuit. Invalid overrides use defaults. */
export function enablePersistence(p: Person, spec: PersistenceSpec = {}): PursuitState {
  const out: PursuitState = { behaviour: 2 };
  const clean = cleanSpec(spec);
  if (Object.keys(clean).length) out.spec = clean;
  if (p.pursuit?.current) out.current = { ...p.pursuit.current };
  if (p.pursuit?.rested) out.rested = { ...p.pursuit.rested };
  p.pursuit = out;
  return out;
}

/** A copy of the current pursuit, without pruning, mutation or RNG. */
export function pursuitOf(p: Person): Pursuit | undefined {
  return p.pursuit?.current ? { ...p.pursuit.current } : undefined;
}

/** Drop finished, absent, neglected or overlong pursuits. Interruptions alone do not release. @internal */
export function releasePursuit(p: Person): void {
  const s = p.pursuit;
  if (!s) return;
  if (s.rested && p.now >= s.rested.until) delete s.rested;
  const c = s.current;
  if (!c) return;
  if (!active(p, c.goalId) || p.now - c.lastServedAt >= setting(s, 'slackMinutes')) {
    delete s.current;
    return;
  }
  if (p.now - c.since >= setting(s, 'maxMinutes')) {
    delete s.current;
    s.rested = { goalId: c.goalId, until: Math.min(MAX_MINUTE, p.now + setting(s, 'restMinutes')) };
  }
}

/** Form from the begun option's already-rounded goal terms, including route credit. @internal */
export function beginPursuit(p: Person, terms: readonly Term[]): void {
  const s = p.pursuit;
  if (!s) return;
  releasePursuit(p);
  const candidates = p.agenda.goals
    .filter((g) => g.status === 'active' && identifier(g.id) && g.id !== s.rested?.goalId)
    .map((goal) => ({
      goal,
      value: terms
        .filter((t) => t.source === `goal:${goal.id}` && t.value > 0)
        .reduce((v, t) => v + t.value, 0),
    }))
    .filter((x) => x.value > 0)
    .sort((a, b) => b.value - a.value || cmpStr(a.goal.id, b.goal.id));
  const best = candidates[0];
  if (!best) return;
  const current = s.current;
  const currentValue = candidates.find((x) => x.goal.id === current?.goalId)?.value ?? 0;
  if (
    current &&
    best.goal.id !== current.goalId &&
    round(best.value - currentValue) <= setting(s, 'switchMargin')
  ) {
    if (currentValue > 0) current.lastServedAt = p.now;
    return;
  }
  s.current = {
    goalId: best.goal.id,
    since: current?.goalId === best.goal.id ? current.since : p.now,
    lastServedAt: p.now,
    strength: clamp01(best.goal.importance * (0.4 + 0.6 * p.traits.conscientiousness)),
  };
}

/** Read already-pushed goal/commitment terms under the actual perceived needs. @internal */
export function persistenceTerms(
  p: Person,
  terms: readonly Term[],
  ctx: Pick<ConsiderContext, 'needs'>,
): Term[] {
  const s = p.pursuit;
  const c = s?.current;
  if (!s || !c) return [];
  const goal = active(p, c.goalId);
  if (!goal) return [];
  const stall = Math.max(0, p.now - (goal.lastAdvancedAt ?? goal.adoptedAt));
  const decay = s.behaviour === 2 ? dpow(0.5, stall / setting(s, 'stallHalfLifeMinutes')) : 1;
  let urgency = 0;
  for (const n of ctx.needs)
    if (n.id === 'safety' || (PHYSIOLOGICAL_NEEDS as readonly string[]).includes(n.id))
      urgency = Math.max(urgency, n.urgency);
  const gate = (1 - clamp01(urgency)) * (1 - emotionLevel(p, 'fear'));
  if (terms.some((t) => t.source === `goal:${c.goalId}` && t.value > 0))
    return [
      {
        source: `pursuit:${c.goalId}`,
        value: round(Math.min(setting(s, 'cap'), setting(s, 'continueScale') * c.strength * gate) * decay),
      },
    ];
  if (terms.some((t) => t.source.startsWith('commitment:'))) return [];
  return [
    {
      source: 'pursuit:switch',
      value: -round(Math.min(setting(s, 'cap'), setting(s, 'switchScale') * c.strength * gate) * decay),
    },
  ];
}

const minute = (x: unknown, now: Minute): x is number => isNum(x) && Math.abs(x) <= MAX_MINUTE && x <= now;
/** Conservative restore: malformed settings or pursuit drop the optional slice. @internal */
export function sanitizePursuit(input: unknown, now: Minute): PursuitState | undefined {
  if (!isObj(input) || (input.spec !== undefined && !isObj(input.spec))) return undefined;
  if (input.behaviour !== undefined && input.behaviour !== 2) return undefined;
  const out: PursuitState = {};
  if (input.behaviour === 2) out.behaviour = 2;
  if (input.spec !== undefined) {
    const spec = cleanSpec(input.spec);
    if (Object.keys(spec).length !== Object.keys(input.spec).length) return undefined;
    if (Object.keys(spec).length) out.spec = spec;
  }
  const c = input.current;
  if (c !== undefined) {
    if (
      !isObj(c) ||
      !identifier(c.goalId) ||
      !minute(c.since, now) ||
      !minute(c.lastServedAt, now) ||
      c.lastServedAt < c.since ||
      !isNum(c.strength) ||
      c.strength < 0 ||
      c.strength > 1
    )
      return undefined;
    out.current = { goalId: c.goalId, since: c.since, lastServedAt: c.lastServedAt, strength: c.strength };
  }
  const r = input.rested;
  if (r !== undefined) {
    if (
      !isObj(r) ||
      !identifier(r.goalId) ||
      !isNum(r.until) ||
      Math.abs(r.until) > MAX_MINUTE ||
      // A later reconfiguration may shorten restMinutes without shortening an existing interval.
      r.until > now + 1440
    )
      return undefined;
    out.rested = { goalId: r.goalId, until: r.until };
  }
  return out;
}
