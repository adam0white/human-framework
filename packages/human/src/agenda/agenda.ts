/**
 * SCOPE: The agenda holds a person's commitments (promises, duties, appointments, worship windows, jobs)
 * and goals, turns them into utility terms, closes them when kept or broken, recurs periodic ones, and
 * proposes spontaneous purposes when a psychological need goes unserved. Shapes borrowed: deadline
 * pressure rising toward the end of a window (temporal-motivation style, monotone and saturating, not
 * hyperbolic-discounting fitted values), SDT-style needs (belonging, competence, meaning) as the sources
 * of spontaneous goals. Breaking a commitment is reported to the composite, which routes any linked norm
 * through conscience; the agenda itself does not judge. It does not plan multi-step routes, model
 * implementation intentions, or claim calibrated procrastination curves.
 */
import { clamp01, dayOf } from '../core/index.ts';
import type {
  Affordance,
  AgendaState,
  Commitment,
  Goal,
  Minute,
  NeedReading,
  Outcome,
  Person,
  PsychologicalNeed,
  Term,
} from '../types.ts';

export interface GoalTemplate {
  label: string;
  advancedBy: { action: string; amount: number }[];
}

export const AGENDA_DEFAULTS = {
  /** Minutes before a window opens during which a commitment already pulls (to get there). */
  leadMinutes: 60,
  /** Pressure before the window opens, at the start of the window, and in the final fraction of the window. */
  leadPressure: 0.2,
  openPressure: 0.35,
  peakFraction: 0.8,
  commitmentScale: 1,
  /** Per-instance goal amount is multiplied by this before saturating at 1. */
  goalAmountGain: 5,
  /** Amount assumed when a goal is advanced only via `aff.advances`. */
  defaultAdvanceAmount: 0.1,
  /** Max extra deadline pressure on goals (1 = up to doubled). */
  goalDeadlineBoost: 1,
  /**
   * Closed (kept/broken) commitments retained as history. Each tick scans closed recurring commitments for a
   * missing successor, so this bound is also the cost of `advanceAgenda`; 12 keeps about two days of a
   * five-prayer schedule (lowered from 30 in the 2026-10-03 integration pass for throughput).
   */
  maxClosedCommitments: 12,
  maxClosedGoals: 30,
  maxActiveGoals: 8,
  /** Recurring windows already missed during one long advance that are still reported as broken. */
  maxCatchUp: 14,
  proposeUrgency: 0.6,
  goalTemplates: {
    belonging: {
      label: 'make-friend',
      advancedBy: [
        { action: 'chat', amount: 0.1 },
        { action: 'help', amount: 0.15 },
        { action: 'gift', amount: 0.15 },
      ],
    },
    competence: {
      label: 'master-skill',
      advancedBy: [
        { action: 'practice', amount: 0.05 },
        { action: 'work', amount: 0.03 },
      ],
    },
    meaning: {
      label: 'serve',
      advancedBy: [
        { action: 'help', amount: 0.1 },
        { action: 'charity', amount: 0.15 },
        { action: 'worship', amount: 0.1 },
      ],
    },
    esteem: {
      label: 'earn-respect',
      advancedBy: [
        { action: 'work', amount: 0.05 },
        { action: 'help', amount: 0.05 },
      ],
    },
  } as Partial<Record<PsychologicalNeed, GoalTemplate>>,
};

function freeId(state: AgendaState, prefix: 'c' | 'g'): string {
  const taken = (id: string) =>
    state.commitments.some((c) => c.id === id) || state.goals.some((g) => g.id === id);
  let id = `${prefix}${state.nextId++}`;
  while (taken(id)) id = `${prefix}${state.nextId++}`;
  return id;
}

export function createAgenda(
  spec: {
    commitments?: Omit<Commitment, 'status'>[];
    goals?: Omit<Goal, 'status' | 'progress' | 'adoptedAt'>[];
  },
  now: Minute,
): AgendaState {
  const state: AgendaState = { commitments: [], goals: [], nextId: 1 };
  for (const c of spec.commitments ?? []) {
    state.commitments.push({
      ...c,
      actions: [...c.actions],
      importance: clamp01(c.importance),
      status: 'pending',
    });
  }
  for (const g of spec.goals ?? []) {
    state.goals.push({
      ...g,
      serves: [...g.serves],
      advancedBy: g.advancedBy.map((a) => ({ ...a })),
      importance: clamp01(g.importance),
      progress: 0,
      status: 'active',
      adoptedAt: now,
    });
  }
  return state;
}

export function promise(p: Person, c: Omit<Commitment, 'id' | 'status'>): Commitment {
  const made: Commitment = {
    ...c,
    actions: [...c.actions],
    importance: clamp01(c.importance),
    id: freeId(p.agenda, 'c'),
    status: 'pending',
  };
  p.agenda.commitments.push(made);
  return made;
}

/** Release a pending commitment (the other party let it go). Released commitments do not recur. */
export function release(p: Person, id: string): boolean {
  const c = p.agenda.commitments.find((x) => x.id === id);
  if (c?.status !== 'pending') return false;
  c.status = 'released';
  return true;
}

const sameChain = (a: Commitment, b: Commitment): boolean =>
  a.kind === b.kind &&
  a.normId === b.normId &&
  a.targetId === b.targetId &&
  a.toId === b.toId &&
  a.recurEvery === b.recurEvery &&
  a.until - a.from === b.until - b.from &&
  (a.from - b.from) % (a.recurEvery || 1) === 0 &&
  a.actions.join('|') === b.actions.join('|');

const hasSuccessor = (state: AgendaState, c: Commitment): boolean =>
  state.commitments.some((x) => x !== c && x.from > c.from && sameChain(x, c));

const needsSpawn = (state: AgendaState, c: Commitment, now: Minute): boolean =>
  c.recurEvery !== undefined &&
  c.recurEvery > 0 &&
  (c.status === 'kept' || c.status === 'broken') &&
  c.until < now &&
  !hasSuccessor(state, c);

/**
 * Close commitments whose window has passed (pending -> broken) and recur periodic ones. Events are
 * processed in chronological order of window end, so one long advance yields the same commitments and
 * ids as many short ones. After a very long gap, only the last `maxCatchUp` missed windows per chain are
 * materialised and reported.
 */
export function advanceAgenda(p: Person, now: Minute): { broken: Commitment[]; recurred: Commitment[] } {
  const state = p.agenda;
  const broken: Commitment[] = [];
  const recurred: Commitment[] = [];
  for (;;) {
    let next: Commitment | undefined;
    for (const c of state.commitments) {
      const due = (c.status === 'pending' && c.until < now) || needsSpawn(state, c, now);
      if (due && (next === undefined || c.until < next.until)) next = c;
    }
    if (!next) break;
    if (next.status === 'pending') {
      next.status = 'broken';
      broken.push(next);
      continue;
    }
    const r = next.recurEvery ?? 0;
    const live = Math.ceil((now - next.until) / r);
    const k = Math.max(1, live - AGENDA_DEFAULTS.maxCatchUp);
    const { id: _id, status: _status, ...rest } = next;
    const successor: Commitment = {
      ...rest,
      actions: [...next.actions],
      from: next.from + k * r,
      until: next.until + k * r,
      id: freeId(state, 'c'),
      status: 'pending',
    };
    state.commitments.push(successor);
    recurred.push(successor);
  }
  pruneClosed(state);
  return { broken, recurred };
}

/**
 * Drop the oldest closed commitments beyond `maxClosedCommitments`. A closed recurring commitment without a
 * successor yet (kept early, window still open) is the only link to its chain, so it is never dropped.
 */
function pruneClosed(state: AgendaState): void {
  const removable = state.commitments
    .filter(
      (c) =>
        c.status !== 'pending' &&
        !(
          c.recurEvery !== undefined &&
          c.recurEvery > 0 &&
          c.status !== 'released' &&
          !hasSuccessor(state, c)
        ),
    )
    .sort((a, b) => a.until - b.until);
  const excess = removable.length - AGENDA_DEFAULTS.maxClosedCommitments;
  if (excess > 0) {
    const drop = new Set(removable.slice(0, excess));
    state.commitments = state.commitments.filter((c) => !drop.has(c));
  }
  const closedGoals = state.goals
    .filter((g) => g.status !== 'active')
    .sort((a, b) => a.adoptedAt - b.adoptedAt);
  const goalExcess = closedGoals.length - AGENDA_DEFAULTS.maxClosedGoals;
  if (goalExcess > 0) {
    const drop = new Set(closedGoals.slice(0, goalExcess));
    state.goals = state.goals.filter((g) => !drop.has(g));
  }
}

/**
 * Time pressure of a pending commitment, 0..1. Low during the lead-in, rising through the window and
 * saturating at 1 for the final (1 - peakFraction) of it. Zero outside [from - lead, until].
 */
export function commitmentPressure(c: Commitment, now: Minute): number {
  const d = AGENDA_DEFAULTS;
  if (now > c.until || now < c.from - d.leadMinutes) return 0;
  if (now < c.from) return d.leadPressure;
  const span = Math.max(1, c.until - c.from);
  const f = (now - c.from) / span;
  return d.openPressure + (1 - d.openPressure) * clamp01(f / d.peakFraction);
}

const matchesCommitment = (c: Commitment, action: string, targetId: string | undefined): boolean =>
  c.actions.includes(action) && (c.targetId === undefined || c.targetId === targetId);

/**
 * The single rule for "this activity counts toward that commitment": the activity's span [start, end] overlaps
 * the window [from, until]. `agendaTerms` pulls only toward options that would satisfy it, and `onFinished`
 * keeps by the same rule, so a pull never leads to an activity that cannot keep the commitment.
 */
export const spanMeetsWindow = (c: Commitment, start: Minute, end: Minute): boolean =>
  start <= c.until && end >= c.from;

function goalAmount(g: Goal, aff: Affordance): number {
  const own = g.advancedBy.find((a) => a.action === aff.action);
  if (own) return own.amount;
  return aff.advances?.includes(g.id) ? AGENDA_DEFAULTS.defaultAdvanceAmount : 0;
}

function deadlinePressure(g: Goal, now: Minute): number {
  if (g.deadline === undefined) return 1;
  const span = Math.max(1, g.deadline - g.adoptedAt);
  return 1 + AGENDA_DEFAULTS.goalDeadlineBoost * clamp01((now - g.adoptedAt) / span);
}

export function agendaTerms(p: Person, aff: Affordance, now: Minute): Term[] {
  const d = AGENDA_DEFAULTS;
  const terms: Term[] = [];
  for (const c of p.agenda.commitments) {
    if (c.status !== 'pending') continue;
    const explicit = aff.fulfills?.includes(c.id) ?? false;
    if (!explicit && !matchesCommitment(c, aff.action, aff.targetId)) continue;
    const pressure = commitmentPressure(c, now);
    if (pressure <= 0 || !spanMeetsWindow(c, now, now + Math.max(0, aff.duration))) continue;
    terms.push({ source: `commitment:${c.id}`, value: d.commitmentScale * c.importance * pressure });
  }
  for (const g of p.agenda.goals) {
    if (g.status !== 'active') continue;
    const amount = goalAmount(g, aff);
    if (amount <= 0) continue;
    const value = g.importance * clamp01(amount * d.goalAmountGain) * deadlinePressure(g, now);
    terms.push({ source: `goal:${g.id}`, value });
  }
  return terms;
}

/**
 * Apply a finished activity. Only completed outcomes count. One completion keeps the earliest-ending
 * matching pending commitment whose window the activity's span [startedAt, outcome.at] overlaps (see
 * `spanMeetsWindow`; `startedAt` defaults to `outcome.at`); goals advance by their listed amount.
 * `Outcome` carries no `fulfills`/`advances`, so matching is by action (and target) only.
 */
export function onFinished(
  p: Person,
  outcome: Outcome,
  startedAt: Minute = outcome.at,
): { kept: Commitment[]; advanced: Goal[]; achieved: Goal[] } {
  const kept: Commitment[] = [];
  const advanced: Goal[] = [];
  const achieved: Goal[] = [];
  if (outcome.status !== 'completed') return { kept, advanced, achieved };
  let best: Commitment | undefined;
  for (const c of p.agenda.commitments) {
    if (c.status !== 'pending' || !matchesCommitment(c, outcome.action, outcome.targetId)) continue;
    if (!spanMeetsWindow(c, Math.min(startedAt, outcome.at), outcome.at)) continue;
    if (!best || c.until < best.until) best = c;
  }
  if (best) {
    best.status = 'kept';
    kept.push(best);
  }
  for (const g of p.agenda.goals) {
    if (g.status !== 'active') continue;
    const step = g.advancedBy.find((a) => a.action === outcome.action);
    if (!step || step.amount <= 0) continue;
    g.progress = clamp01(g.progress + step.amount);
    advanced.push(g);
    if (g.progress >= 1) {
      g.status = 'achieved';
      achieved.push(g);
    }
  }
  return { kept, advanced, achieved };
}

export function adoptGoal(
  p: Person,
  g: Omit<Goal, 'id' | 'status' | 'progress' | 'adoptedAt'>,
  now: Minute,
): Goal {
  const goal: Goal = {
    ...g,
    serves: [...g.serves],
    advancedBy: g.advancedBy.map((a) => ({ ...a })),
    importance: clamp01(g.importance),
    id: freeId(p.agenda, 'g'),
    status: 'active',
    progress: 0,
    adoptedAt: now,
  };
  p.agenda.goals.push(goal);
  return goal;
}

export function abandonGoal(p: Person, id: string): boolean {
  const g = p.agenda.goals.find((x) => x.id === id);
  if (g?.status !== 'active') return false;
  g.status = 'abandoned';
  return true;
}

/**
 * Spontaneous purposes: when an unserved psychological need is urgent, adopt a generic goal for the most
 * urgent one. At most one per day (derived from template-labelled goals adopted today) and at most
 * `maxActiveGoals` active goals.
 */
export function proposeGoals(p: Person, needs: NeedReading[], now: Minute): Goal[] {
  const d = AGENDA_DEFAULTS;
  const templates = d.goalTemplates;
  const labels = new Set(Object.values(templates).map((t) => t?.label));
  const today = dayOf(now);
  const goals = p.agenda.goals;
  if (goals.some((g) => labels.has(g.label) && dayOf(g.adoptedAt) === today)) return [];
  if (goals.filter((g) => g.status === 'active').length >= d.maxActiveGoals) return [];
  const candidates = needs
    .filter((n) => n.urgency > d.proposeUrgency && templates[n.id as PsychologicalNeed] !== undefined)
    .filter((n) => !goals.some((g) => g.status === 'active' && g.serves.includes(n.id)))
    .sort((a, b) => b.urgency - a.urgency || (a.id < b.id ? -1 : 1));
  const top = candidates[0];
  if (!top) return [];
  const template = templates[top.id as PsychologicalNeed];
  if (!template) return [];
  return [
    adoptGoal(
      p,
      {
        label: template.label,
        serves: [top.id],
        advancedBy: template.advancedBy,
        importance: clamp01(0.4 + 0.4 * top.urgency),
      },
      now,
    ),
  ];
}
