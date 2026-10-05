/**
 * SCOPE: The agenda holds a person's commitments (promises, duties, appointments, worship windows, jobs)
 * and goals, turns them into utility terms, closes them when kept or broken, recurs periodic ones, and
 * proposes spontaneous purposes when a psychological need goes unserved. Shapes borrowed: deadline
 * pressure rising toward the end of a window (temporal-motivation style, monotone and saturating, not
 * hyperbolic-discounting fitted values), SDT-style needs (belonging, competence, meaning) as the sources
 * of spontaneous goals. Breaking a commitment is reported to the composite, which routes any linked norm
 * through conscience; the agenda itself does not judge. It does not plan multi-step routes, model
 * implementation intentions, or claim calibrated procrastination curves.
 *
 * SCOPE (abstention, lane agenda+conscience): an `abstain` commitment (a fast, "no cards after Isha") is kept by
 * not completing any `violatedBy` action whose span overlaps the window, and broken by the first one that does.
 * While open it pushes against violating options with a constant negative term (importance x held conviction);
 * it does not rise with deadline pressure, because the cost of breaking does not grow toward the end. Shape:
 * self-imposed restraint as a standing cost on the tempting option (precommitment, cf. Ariely & Wertenbroch 2002
 * for the qualitative effect only; no fitted values). Interrupted outcomes do not break it (hosts report a
 * partial meal as completed if it should). Exemptions (illness, travel) come from the norm catalog's
 * `exemptions` with their provenance, release that day's instance and record an owed make-up; they are not the
 * necessity exception of Qur'an 2:173. The illness threshold is an engineering stand-in for the person's own
 * judgment that they are ill; the fidya provision of 2:184 and any expiation (kaffara) for deliberate breaking are
 * not modelled (kaffara is disputed: research/fasting-sources.md §1). A deliberately broken obligatory fast is a
 * breach and also leaves a make-up owed (1.7.0; research/decisions.md, fasting-sources.md §1: the day is made up).
 * A break under necessity is excused with a make-up owed (see the necessity-break SCOPE below).
 *
 * SCOPE (missed duties and make-up debt, engine 1.7.0; research/decisions.md, research/capacity-and-excuse-sources.md):
 * the sources keep blame (a breach) apart from debt (qada) (capacity-and-excuse-sources.md §0). When a `worship`
 * window linked to a norm the person holds as obligatory closes unkept, or an obligatory `abstain` is broken, an
 * `OwedMakeUp` is recorded in `agenda.owed` whatever the cause; what the cause decides is the blame:
 * - Asleep throughout (§4: sleep lifts blame, not the debt): the window opened while the person was already
 *   asleep and they woke no earlier than `wakeGrace` minutes before it closed (read from `body.since` and
 *   `body.lastSleep`). Sleep begun inside the open window is not excused: whether the sleeper expected to wake is
 *   not represented, so the framework takes the stricter reading.
 * - Downed when it closed (§2, unconsciousness; `body.downed`, `body.lastDowned`): blame lifted, debt owed, but
 *   once more than `lapseWaiver` (5) windows have closed within one downing, that stretch's debt drops and no more
 *   is added (the Hanafi count by prayer times, kept as the default by decisions.md; Maliki and Shafi'i drop it
 *   sooner, Hanbali never). Downing is involuntary, so going down after the window opened still excuses it.
 * - Excused instances close `released` with `exempt.reason` 'sleep' or 'unconscious', so the composite books no
 *   breach, distress or esteem cost; the chain recurs as for any exemption.
 * - A mental break (`affect/crisis.ts`, reason intact) is not an excuse (§6: the test is retained capacity, and
 *   motivation is irrelevant): the window closes broken, with its breach, and the debt is owed (reason 'missed').
 * - Forgetting lifts blame in the sources (§4) but the framework has no state for having forgotten a duty, and no
 *   state for loss of reason (junun, §1) or intoxication (§3); none of them is detected. Coercion and commands are
 *   not excuses here (§7).
 * A make-up commitment (`makeUpOf`, see `scheduleMakeUp`) that closes unkept, or is broken, carries no blame: qada
 * has no fixed time in the sources, so it closes `released` and its debt is open again for the host to reschedule.
 * The framework never computes whether a prayer or a make-up is accepted.
 */
// The bundled catalog is only the default; a host with its own catalog passes it (`World.catalog`).
import { DEFAULT_NORMS } from '../conscience/catalog.ts';
import { clamp01, dayOf, dpow, isObj } from '../core/index.ts';
import type {
  Affordance,
  AgendaState,
  Commitment,
  Episode,
  Goal,
  Minute,
  MissedExcuse,
  NeedId,
  NeedReading,
  NormDefinition,
  Outcome,
  OwedMakeUp,
  Person,
  PersonId,
  PsychologicalNeed,
  Term,
} from '../types.ts';
import { MINUTES_PER_DAY } from '../types.ts';

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
  /** Scale of the negative term an open abstention puts on a violating option (x importance x conviction). */
  abstainScale: 1,
  /** Owed make-ups retained (oldest scheduled ones dropped first). */
  maxOwed: 60,
  /**
   * Minutes before a window closes within which waking still counts as having slept through it (engineering
   * default: about the length of one prayer).
   */
  wakeGrace: 10,
  /**
   * Worship windows that may close within one downing before that stretch's debt drops (more than five prayer
   * times: research/capacity-and-excuse-sources.md §2, Hanafi; research/decisions.md keeps it as the default).
   */
  lapseWaiver: 5,
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

/** Copy of a commitment's array fields so no array is shared between state objects. */
function copyArrays<T extends Pick<Commitment, 'actions' | 'violatedBy' | 'exemptWhen'>>(c: T): T {
  return {
    ...c,
    actions: [...c.actions],
    ...(c.violatedBy !== undefined ? { violatedBy: [...c.violatedBy] } : {}),
    ...(c.exemptWhen !== undefined ? { exemptWhen: [...c.exemptWhen] } : {}),
  };
}

/**
 * Spec commitments keep a given id; entries without one get a free `c<n>` id after all given ids are placed, so
 * `prayerWindows()` output can be passed straight into `PersonSpec.commitments`.
 */
/** Restore-time check of `agenda.lapse` (1.7.0), in place: a malformed one is dropped (absent means none). @internal */
export function sanitizeAgenda(a: AgendaState): void {
  const lapse = a.lapse as unknown;
  if (
    lapse !== undefined &&
    !(isObj(lapse) && typeof lapse.since === 'number' && typeof lapse.missed === 'number')
  )
    delete a.lapse;
}

export function createAgenda(
  spec: {
    commitments?: (Omit<Commitment, 'status' | 'id'> & { id?: string })[];
    goals?: Omit<Goal, 'status' | 'progress' | 'adoptedAt'>[];
  },
  now: Minute,
): AgendaState {
  const state: AgendaState = { commitments: [], goals: [], nextId: 1, lastProposalDay: -1 };
  const unnamed: Commitment[] = [];
  for (const c of spec.commitments ?? []) {
    const made: Commitment = {
      ...copyArrays(c),
      id: c.id ?? '',
      importance: clamp01(c.importance),
      status: 'pending',
    };
    state.commitments.push(made);
    if (c.id === undefined) unnamed.push(made);
  }
  for (const c of unnamed) c.id = freeId(state, 'c');
  for (const g of spec.goals ?? []) {
    const importance = clamp01(g.importance);
    state.goals.push({
      ...g,
      serves: [...g.serves],
      advancedBy: g.advancedBy.map((a) => ({ ...a })),
      importance,
      baseImportance: importance,
      progress: 0,
      status: 'active',
      adoptedAt: now,
      lastAdvancedAt: now,
    });
  }
  return state;
}

export function promise(p: Person, c: Omit<Commitment, 'id' | 'status'>): Commitment {
  const made: Commitment = {
    ...copyArrays(c),
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
  a.chain !== undefined && b.chain !== undefined ? a.kind === b.kind && a.chain === b.chain : sameShape(a, b);

const sameShape = (a: Commitment, b: Commitment): boolean =>
  a.kind === b.kind &&
  (a.violatedBy ?? []).join('|') === (b.violatedBy ?? []).join('|') &&
  a.normId === b.normId &&
  a.targetId === b.targetId &&
  a.toId === b.toId &&
  a.recurEvery === b.recurEvery &&
  a.label === b.label &&
  a.until - a.from === b.until - b.from &&
  (a.from - b.from) % (a.recurEvery || 1) === 0 &&
  a.actions.join('|') === b.actions.join('|');

const hasSuccessor = (state: AgendaState, c: Commitment): boolean =>
  state.commitments.some((x) => x !== c && x.from > c.from && sameChain(x, c));

/** Closed instances that carry their chain on: kept, broken, or released by an exemption (not by the other party). */
const chainLink = (c: Commitment): boolean =>
  c.status === 'kept' || c.status === 'broken' || (c.status === 'released' && c.exempt !== undefined);

const needsSpawn = (state: AgendaState, c: Commitment, now: Minute): boolean =>
  c.recurEvery !== undefined &&
  c.recurEvery > 0 &&
  chainLink(c) &&
  (c.recurUntil === undefined || c.from + c.recurEvery <= c.recurUntil) &&
  c.until < now &&
  !hasSuccessor(state, c);

/**
 * Whether an activity that would keep `c` is under way at `now`: begun no later than the window's end
 * (`spanMeetsWindow`), not yet ended, not sleep, and serving `c` (listed in `fulfills` or matching its action and
 * target). Such a commitment stays open past `until` until the activity ends: `onFinished` then keeps it, or the next
 * pass closes it if the activity was cut short (fix 2026-10-03: a prayer begun in its window and finished after it
 * was recorded as missed while the player watched him pray). The will's omission rule uses the same test to keep
 * protecting the duty while it runs (1.9.0). Abstentions are never under way.
 */
export function isUnderWay(p: Person, c: Commitment, now: Minute): boolean {
  const act = p.activity;
  return (
    act !== null &&
    act !== undefined &&
    act.mode !== 'sleep' &&
    c.kind !== 'abstain' &&
    act.startedAt <= c.until &&
    act.endsAt >= now &&
    ((act.affordance.fulfills?.includes(c.id) ?? false) || matchesCommitment(c, act.action, act.targetId))
  );
}

/**
 * Close commitments whose window has passed and recur periodic ones. A pending ordinary commitment closes
 * broken; a pending abstention closes kept (nothing violated it); an exempted instance closes released. Events
 * are processed in chronological order of window end, so one long advance yields the same commitments and
 * ids as many short ones. After a very long gap, only the last `maxCatchUp` missed windows per chain are
 * materialised and reported.
 */
export function advanceAgenda(
  p: Person,
  now: Minute,
): {
  broken: Commitment[];
  recurred: Commitment[];
  kept: Commitment[];
  released: Commitment[];
  excused: Commitment[];
} {
  const state = p.agenda;
  const broken: Commitment[] = [];
  const excused: Commitment[] = [];
  const recurred: Commitment[] = [];
  const kept: Commitment[] = [];
  const released: Commitment[] = [];
  for (;;) {
    let next: Commitment | undefined;
    for (const c of state.commitments) {
      const due =
        (c.status === 'pending' && c.until < now && !isUnderWay(p, c, now)) || needsSpawn(state, c, now);
      if (due && (next === undefined || c.until < next.until)) next = c;
    }
    if (!next) break;
    if (next.status === 'pending') {
      if (next.exempt !== undefined) {
        next.status = 'released';
        released.push(next);
      } else if (next.kind === 'abstain') {
        next.status = 'kept';
        kept.push(next);
      } else if (next.makeUpOf !== undefined) {
        reopenMakeUp(state, next);
        released.push(next);
      } else {
        const excuse = next.kind === 'worship' ? missedExcuse(p, next) : undefined;
        if (excuse !== undefined) {
          next.exempt = { reason: excuse, at: next.until };
          next.status = 'released';
          released.push(next);
          excused.push(next);
        } else {
          next.status = 'broken';
          broken.push(next);
        }
        oweFor(p, next, excuse ?? 'missed', next.until);
      }
      continue;
    }
    const r = next.recurEvery ?? 0;
    const live = Math.ceil((now - next.until) / r);
    let k = Math.max(1, live - AGENDA_DEFAULTS.maxCatchUp);
    if (next.recurUntil !== undefined)
      k = Math.max(1, Math.min(k, Math.floor((next.recurUntil - next.from) / r)));
    const { id: _id, status: _status, exempt: _exempt, ...rest } = next;
    const successor: Commitment = {
      ...copyArrays(rest),
      from: next.from + k * r,
      until: next.until + k * r,
      id: freeId(state, 'c'),
      status: 'pending',
    };
    state.commitments.push(successor);
    recurred.push(successor);
  }
  pruneClosed(state);
  return { broken, recurred, kept, released, excused };
}

/**
 * Why a worship window that closed unkept carries no blame, if it does (see the missed-duties SCOPE): the person
 * was downed when it closed, or asleep from before it opened until at most `wakeGrace` minutes before it closed.
 */
export function missedExcuse(p: Person, c: Commitment): MissedExcuse | undefined {
  // Agenda-only callers (tests, light hosts) may pass a person without a body: nothing is excused then.
  const b = p.body as Person['body'] | undefined;
  if (!b) return undefined;
  const end = c.until;
  if (b.downed && b.downed.since <= end) return 'unconscious';
  if (b.lastDowned && b.lastDowned.from <= end && b.lastDowned.to >= end) return 'unconscious';
  if (b.asleep && b.since <= c.from) return 'sleep';
  const s = b.lastSleep;
  if (s && s.from <= c.from && s.to >= end - AGENDA_DEFAULTS.wakeGrace) return 'sleep';
  return undefined;
}

/**
 * Record the make-up owed for `c` (see the missed-duties SCOPE): only a `worship` or `abstain` commitment linked to a
 * norm the person holds as obligatory, and never for a make-up itself. An 'unconscious' miss counts toward the
 * downing's stretch, which is waived once more than `lapseWaiver` windows have closed in it.
 */
function oweFor(p: Person, c: Commitment, reason: OwedMakeUp['reason'], at: Minute): void {
  if (c.normId === undefined || c.makeUpOf !== undefined) return;
  if (c.kind !== 'worship' && c.kind !== 'abstain') return;
  const held = (p.conscience as Person['conscience'] | undefined)?.norms.find((n) => n.normId === c.normId);
  if (held?.standing !== 'obligatory') return;
  const state = p.agenda;
  let lapseSince: Minute | undefined;
  if (reason === 'unconscious') {
    const since = p.body?.downed?.since ?? p.body?.lastDowned?.from ?? at;
    const lapse = state.lapse?.since === since ? state.lapse : { since, missed: 0 };
    lapse.missed += 1;
    state.lapse = lapse;
    if (lapse.missed > AGENDA_DEFAULTS.lapseWaiver) {
      if (state.owed)
        state.owed = state.owed.filter(
          (o) => !(o.reason === 'unconscious' && o.lapseSince === since && o.scheduledAs === undefined),
        );
      return;
    }
    lapseSince = since;
  }
  const entry: OwedMakeUp = {
    ofId: c.id,
    kind: c.kind,
    actions: [...c.actions],
    reason,
    at,
    normId: c.normId,
    ...(c.violatedBy !== undefined ? { violatedBy: [...c.violatedBy] } : {}),
    ...(c.label !== undefined ? { label: c.label } : {}),
    ...(lapseSince !== undefined ? { lapseSince } : {}),
  };
  if (state.owed === undefined) state.owed = [];
  state.owed.push(entry);
  boundOwed(state);
}

/** A make-up that closed unkept or was broken: released without blame, its debt open again. */
function reopenMakeUp(state: AgendaState, c: Commitment): void {
  c.status = 'released';
  const entry = state.owed?.find((o) => o.scheduledAs === c.id);
  if (entry) delete entry.scheduledAs;
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
        !(c.recurEvery !== undefined && c.recurEvery > 0 && chainLink(c) && !hasSuccessor(state, c)),
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

/**
 * First minute at which `commitmentPressure(c, ·)` reaches `level` (closed-form inverse of its open-window ramp),
 * or undefined when it never does before `until`. Levels at or below the opening pressure are reached at `from`.
 */
export function pressureReachedAt(c: Commitment, level: number): Minute | undefined {
  const d = AGENDA_DEFAULTS;
  if (level > 1) return undefined;
  if (level <= d.leadPressure) return c.from - d.leadMinutes;
  if (level <= d.openPressure) return c.from;
  const span = Math.max(1, c.until - c.from);
  const f = (d.peakFraction * (level - d.openPressure)) / (1 - d.openPressure);
  const at = Math.ceil(c.from + f * span);
  return at <= c.until ? at : undefined;
}

/** Whether completing `action` (at `targetId`) would keep commitment `c` by action match (abstentions never match). */
export const matchesCommitment = (c: Commitment, action: string, targetId: string | undefined): boolean =>
  c.kind !== 'abstain' && c.actions.includes(action) && (c.targetId === undefined || c.targetId === targetId);

/**
 * Whether an activity spanning [start, end] would break abstention `c`: a listed violating action whose span
 * overlaps the window's interior (eating that runs past dawn breaks the fast; eating that starts at maghrib does
 * not). Exempted instances are never violated.
 */
export const violatesAbstention = (c: Commitment, action: string, start: Minute, end: Minute): boolean =>
  c.kind === 'abstain' &&
  c.status === 'pending' &&
  c.exempt === undefined &&
  (c.violatedBy?.includes(action) ?? false) &&
  start < c.until &&
  end > c.from;

/**
 * Conviction with which the person holds the commitment's linked norm: 1 for a norm-free self-commitment, 0 when
 * the linked norm is not held (the commitment then exerts no pull).
 */
function heldConviction(p: Person, c: Commitment): number {
  if (c.normId === undefined) return 1;
  return p.conscience?.norms.find((n) => n.normId === c.normId)?.conviction ?? 0;
}

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
    if (c.kind === 'abstain') {
      if (!violatesAbstention(c, aff.action, now, now + Math.max(0, aff.duration))) continue;
      const value = -d.abstainScale * c.importance * heldConviction(p, c);
      if (value < 0) terms.push({ source: `abstain:${c.id}`, value });
      continue;
    }
    const explicit = aff.fulfills?.includes(c.id) ?? false;
    if (!explicit && !matchesCommitment(c, aff.action, aff.targetId)) continue;
    // Carrying on with the running activity that is keeping a commitment whose window has just closed (it began
    // inside it, see `advanceAgenda`) still keeps it, at the pressure of the window's last minute; switching away
    // would miss it.
    const act = p.activity;
    const finishing =
      act !== null &&
      act !== undefined &&
      act.affordanceId === aff.id &&
      now > c.until &&
      act.startedAt <= c.until &&
      act.endsAt > now;
    const pressure = commitmentPressure(c, finishing ? c.until : now);
    if (pressure <= 0 || !(finishing || spanMeetsWindow(c, now, now + Math.max(0, aff.duration)))) continue;
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
 * SCOPE (necessity break, review 2026-10-03): an abstention broken by an act that was possible only because the
 * capacity bound / necessity lifted the veto (drinking in extremity during the fast) is excused rather than
 * broken: the instance is marked `exempt: {reason: 'necessity'}` (closes as released) and, when the norm's catalog
 * entry owes a make-up for illness, the same make-up is owed. Treating a break in extremity like the illness
 * exemption of Qur'an 2:184 ("whoever of you is ill ... an equal number of days after", checked on quran.com
 * 2026-10-03) is an interpretation by analogy, recorded as such; it does not model fidya or expiation. A
 * deliberate break without necessity remains a breach and owes a make-up (1.7.0, see the missed-duties SCOPE).
 */
function excuseUnderNecessity(
  p: Person,
  c: Commitment,
  at: Minute,
  catalog: readonly NormDefinition[],
): boolean {
  if (c.normId === undefined) return false;
  // A norm the person's catalog does not hold is not excused: there is no entry to read an excuse from.
  const def = catalog.find((n) => n.id === c.normId);
  if (!def) return false;
  c.exempt = { reason: 'necessity', at };
  const makeUp = def.exemptions?.find((e) => e.when === 'illness')?.makeUp ?? false;
  if (!makeUp) return true;
  const entry: OwedMakeUp = {
    ofId: c.id,
    kind: c.kind,
    actions: [...c.actions],
    reason: 'necessity',
    at,
    normId: c.normId,
    ...(c.violatedBy !== undefined ? { violatedBy: [...c.violatedBy] } : {}),
    ...(c.label !== undefined ? { label: c.label } : {}),
  };
  if (p.agenda.owed === undefined) p.agenda.owed = [];
  p.agenda.owed.push(entry);
  boundOwed(p.agenda);
  return true;
}

/**
 * Apply a finished activity. Only completed outcomes count. A completed violating action breaks every open
 * abstention whose window its span overlaps (returned as `broken`; the composite routes them like missed
 * commitments, with a breach when a norm is linked). One completion keeps the earliest-ending
 * matching pending commitment whose window the activity's span [startedAt, outcome.at] overlaps (see
 * `spanMeetsWindow`; `startedAt` defaults to `outcome.at`); goals advance by their listed amount.
 * Matching is by action (and target), or explicitly by `outcome.fulfills` / `outcome.advances` (the composite
 * defaults these to the activity's `Affordance.fulfills` / `advances`), mirroring `agendaTerms`.
 */
export function onFinished(
  p: Person,
  outcome: Outcome,
  startedAt: Minute = outcome.at,
  opts: { necessity?: boolean; catalog?: readonly NormDefinition[] } = {},
): { kept: Commitment[]; advanced: Goal[]; achieved: Goal[]; broken: Commitment[]; excused: Commitment[] } {
  const kept: Commitment[] = [];
  const advanced: Goal[] = [];
  const achieved: Goal[] = [];
  const broken: Commitment[] = [];
  const excused: Commitment[] = [];
  if (outcome.status !== 'completed') return { kept, advanced, achieved, broken, excused };
  const start = Math.min(startedAt, outcome.at);
  for (const c of p.agenda.commitments) {
    if (!violatesAbstention(c, outcome.action, start, outcome.at)) continue;
    if (opts.necessity && excuseUnderNecessity(p, c, outcome.at, opts.catalog ?? DEFAULT_NORMS)) {
      excused.push(c);
      continue;
    }
    if (c.makeUpOf !== undefined) {
      reopenMakeUp(p.agenda, c);
      continue;
    }
    c.status = 'broken';
    broken.push(c);
    oweFor(p, c, 'broken', outcome.at);
  }
  let best: Commitment | undefined;
  for (const c of p.agenda.commitments) {
    if (c.status !== 'pending' || c.kind === 'abstain') continue;
    const explicit = outcome.fulfills?.includes(c.id) ?? false;
    if (!explicit && !matchesCommitment(c, outcome.action, outcome.targetId)) continue;
    if (!spanMeetsWindow(c, Math.min(startedAt, outcome.at), outcome.at)) continue;
    if (!best || c.until < best.until) best = c;
  }
  if (best) {
    best.status = 'kept';
    kept.push(best);
  }
  for (const g of p.agenda.goals) {
    if (g.status !== 'active') continue;
    const own = g.advancedBy.find((a) => a.action === outcome.action)?.amount ?? 0;
    const amount =
      own > 0 ? own : outcome.advances?.includes(g.id) ? AGENDA_DEFAULTS.defaultAdvanceAmount : 0;
    if (amount <= 0) continue;
    g.progress = clamp01(g.progress + amount);
    g.lastAdvancedAt = outcome.at;
    if (g.baseImportance !== undefined) g.importance = g.baseImportance;
    advanced.push(g);
    if (g.progress >= 1) {
      g.status = 'achieved';
      achieved.push(g);
    }
  }
  return { kept, advanced, achieved, broken, excused };
}

export function adoptGoal(
  p: Person,
  g: Omit<Goal, 'id' | 'status' | 'progress' | 'adoptedAt'>,
  now: Minute,
): Goal {
  const importance = clamp01(g.importance);
  const goal: Goal = {
    ...g,
    serves: [...g.serves],
    advancedBy: g.advancedBy.map((a) => ({ ...a })),
    importance,
    baseImportance: importance,
    id: freeId(p.agenda, 'g'),
    status: 'active',
    progress: 0,
    adoptedAt: now,
    lastAdvancedAt: now,
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
  const today = dayOf(now);
  const goals = p.agenda.goals;
  if (p.agenda.lastProposalDay === today) return [];
  if (goals.filter((g) => g.status === 'active').length >= d.maxActiveGoals) return [];
  const candidates = needs
    .filter((n) => n.urgency > d.proposeUrgency && templates[n.id as PsychologicalNeed] !== undefined)
    .filter((n) => !goals.some((g) => g.status === 'active' && g.serves.includes(n.id)))
    .sort((a, b) => b.urgency - a.urgency || (a.id < b.id ? -1 : 1));
  const top = candidates[0];
  if (!top) return [];
  const template = templates[top.id as PsychologicalNeed];
  if (!template) return [];
  p.agenda.lastProposalDay = today;
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

// ---------------------------------------------------------------------------------------------
// Calendar retiming (N7)
// ---------------------------------------------------------------------------------------------

/** A host function giving a chained commitment's window on its day, or undefined to leave it unchanged. */
export type Retimer = (c: Commitment) => { from: Minute; until: Minute } | undefined;

/**
 * Move pending commitments that have not opened yet (`now < from`) to the window the host's calendar gives for
 * their day. Recurrence copies a fixed period, so a calendar whose times drift (prayer times move about a minute a
 * day over a month) is applied here; chain identity uses `Commitment.chain`, so a retimed window still counts as
 * its predecessor's successor. Returns the commitments that moved.
 */
export function retimeCommitments(p: Person, now: Minute, retime: Retimer): Commitment[] {
  const moved: Commitment[] = [];
  for (const c of p.agenda.commitments) {
    if (c.status !== 'pending' || c.chain === undefined || now >= c.from) continue;
    const w = retime(c);
    if (!w || !(w.until > w.from) || (w.from === c.from && w.until === c.until)) continue;
    c.from = w.from;
    c.until = w.until;
    moved.push(c);
  }
  return moved;
}

// ---------------------------------------------------------------------------------------------
// Exemptions and make-ups (N2)
// ---------------------------------------------------------------------------------------------

export const EXEMPTION_DEFAULTS = {
  /**
   * Illness severity at which the person counts themselves ill for an exemption. Engineering stand-in for the
   * person's own judgment; Qur'an 2:184-185 names illness without a threshold.
   */
  illnessSeverity: 0.3,
  /** An instance is eligible from this many minutes before its window opens until it closes. */
  lookahead: 6 * 60,
};

/**
 * Release today's instance of each exemptable abstention when a catalogued condition holds, and record the make-up
 * owed. Eligible: a pending, not-yet-exempt `abstain` commitment whose window is open or opens within `lookahead`,
 * listing the condition in `exemptWhen`, and (when it names a norm) whose catalog entry lists that condition in
 * `exemptions`. Illness is read from the person's true illnesses (max severity) unless the host passes
 * `illnessSeverity` (e.g. the person's perceived illness). The exempted instance stays pending, so it pulls
 * nothing and vetoes nothing, and closes as 'released' while its chain recurs.
 * The exemption is a permission; a host modelling a person who fasts anyway does not call this.
 */
export function applyExemptions(
  p: Person,
  now: Minute,
  ctx: { traveling?: boolean; illnessSeverity?: number; catalog?: readonly NormDefinition[] } = {},
): { exempted: Commitment[]; owed: OwedMakeUp[] } {
  const catalog = ctx.catalog ?? DEFAULT_NORMS;
  const severity =
    ctx.illnessSeverity ?? (p.body?.illnesses ?? []).reduce((m, ill) => Math.max(m, ill.severity), 0);
  const conditions: ('illness' | 'travel')[] = [];
  if (severity >= EXEMPTION_DEFAULTS.illnessSeverity) conditions.push('illness');
  if (ctx.traveling) conditions.push('travel');
  const exempted: Commitment[] = [];
  const owed: OwedMakeUp[] = [];
  if (conditions.length === 0) return { exempted, owed };
  for (const c of p.agenda.commitments) {
    if (c.kind !== 'abstain' || c.status !== 'pending' || c.exempt !== undefined) continue;
    if (now > c.until || now < c.from - EXEMPTION_DEFAULTS.lookahead) continue;
    const def = c.normId !== undefined ? catalog.find((n) => n.id === c.normId) : undefined;
    if (c.normId !== undefined && !def) continue;
    const reason = conditions.find(
      (w) =>
        (c.exemptWhen?.includes(w) ?? false) &&
        (def === undefined || (def.exemptions ?? []).some((e) => e.when === w)),
    );
    if (reason === undefined) continue;
    c.exempt = { reason, at: now };
    exempted.push(c);
    const makeUp = def?.exemptions?.find((e) => e.when === reason)?.makeUp ?? false;
    if (!makeUp) continue;
    const entry: OwedMakeUp = {
      ofId: c.id,
      kind: c.kind,
      actions: [...c.actions],
      reason,
      at: now,
      ...(c.normId !== undefined ? { normId: c.normId } : {}),
      ...(c.violatedBy !== undefined ? { violatedBy: [...c.violatedBy] } : {}),
      ...(c.label !== undefined ? { label: c.label } : {}),
    };
    if (p.agenda.owed === undefined) p.agenda.owed = [];
    p.agenda.owed.push(entry);
    owed.push(entry);
  }
  boundOwed(p.agenda);
  return { exempted, owed };
}

function boundOwed(state: AgendaState): void {
  const owed = state.owed;
  if (!owed) return;
  while (owed.length > AGENDA_DEFAULTS.maxOwed) {
    const i = owed.findIndex((o) => o.scheduledAs !== undefined);
    owed.splice(i >= 0 ? i : 0, 1);
  }
}

/** Make-ups still owed and not yet scheduled. */
export const owedMakeUps = (p: Person): OwedMakeUp[] =>
  (p.agenda.owed ?? []).filter((o) => o.scheduledAs === undefined);

/**
 * Turn an owed make-up into a one-off commitment over the window the host chooses (the framework sets no date or
 * deadline for qada). The make-up keeps the original's kind, actions, violating actions and norm, and does not
 * recur or carry exemptions forward (the host may call `applyExemptions` again on its day only if it adds them).
 */
export function scheduleMakeUp(
  p: Person,
  ofId: string,
  window: { from: Minute; until: Minute },
  opts: { importance?: number; exemptWhen?: ('illness' | 'travel')[]; actions?: string[] } = {},
): Commitment | undefined {
  const entry = (p.agenda.owed ?? []).find((o) => o.ofId === ofId && o.scheduledAs === undefined);
  if (!entry || !(window.until > window.from)) return undefined;
  const made = promise(p, {
    kind: entry.kind,
    actions: opts.actions ?? entry.actions,
    from: window.from,
    until: window.until,
    importance: opts.importance ?? 0.8,
    makeUpOf: ofId,
    label: entry.label !== undefined ? `make-up ${entry.label}` : 'make-up',
    ...(entry.normId !== undefined ? { normId: entry.normId } : {}),
    ...(entry.violatedBy !== undefined ? { violatedBy: entry.violatedBy } : {}),
    ...(opts.exemptWhen !== undefined ? { exemptWhen: opts.exemptWhen } : {}),
  });
  entry.scheduledAs = made.id;
  return made;
}

// ---------------------------------------------------------------------------------------------
// Purpose revision (N14)
// ---------------------------------------------------------------------------------------------

export const PURPOSE_DEFAULTS = {
  /** Days without progress before importance starts to fall. */
  graceDays: 3,
  /** Importance multiplier per further neglected day. */
  decayPerDay: 0.85,
  /** Below this importance an active goal is abandoned. */
  abandonBelow: 0.1,
};

/**
 * SCOPE: purposes the person keeps not acting on fade and are finally let go. Neglect is whole days since the goal
 * was last advanced (or adopted), a stand-in for "repeatedly deferred": the agenda does not see the will's
 * deferrals. After `graceDays`, importance falls geometrically from the importance it had when last engaged, and
 * advancing the goal restores it. Below `abandonBelow` the goal is abandoned and an episode draft is returned for
 * the composite to `remember` (so narration can say what was given up). Shape: goal disengagement as gradual
 * withdrawal of commitment from goals that receive no progress (qualitative; decay rate, grace and floor are
 * engineering defaults, not fitted). It does not model reengagement with a replacement goal, rumination, or the
 * distress of abandoning, beyond the episode's mildly negative valence.
 * Closed form in `now`, so calling it at any grid gives the same result.
 */
export function revisePurposes(
  p: Person,
  now: Minute,
): { abandoned: Goal[]; episodes: Omit<Episode, 'id' | 'salience'>[] } {
  const d = PURPOSE_DEFAULTS;
  const abandoned: Goal[] = [];
  const episodes: Omit<Episode, 'id' | 'salience'>[] = [];
  for (const g of p.agenda.goals) {
    if (g.status !== 'active') continue;
    g.baseImportance ??= g.importance;
    const since = g.lastAdvancedAt ?? g.adoptedAt;
    const neglected = Math.max(0, Math.floor((now - since) / MINUTES_PER_DAY) - d.graceDays);
    g.importance = clamp01(g.baseImportance * dpow(d.decayPerDay, neglected));
    if (g.importance >= d.abandonBelow) continue;
    g.status = 'abandoned';
    abandoned.push(g);
    episodes.push({
      at: now,
      kind: 'abandoned',
      actorId: p.id,
      valence: -0.3 * g.baseImportance,
      summary: `gave up on ${g.label}`,
      tags: ['abandoned', 'goal', g.label, ...g.serves],
    });
  }
  return { abandoned, episodes };
}

// ---------------------------------------------------------------------------------------------
// Dependent care (N15)
// ---------------------------------------------------------------------------------------------

export const CARE_DEFAULTS = {
  /** A dependent's need at this urgency or more becomes the caregiver's duty. */
  urgency: 0.6,
  /** Minutes the caregiver has to meet it (window length; renewed while the need stays urgent). */
  horizon: 60,
  /** Importance at threshold urgency, rising to 1 at urgency 1. Engineering default. */
  importanceFloor: 0.6,
  action: 'care',
  /** Needs that a dependent cannot meet alone by default. */
  needs: ['food', 'water', 'sleep', 'relief', 'safety'] as NeedId[],
};

/**
 * SCOPE: a dependent's urgent needs become a caregiver's duty: one pending `duty` commitment per dependent
 * (normId 'care-dependents', owed to and targeting the dependent), renewed and raised while a need stays urgent.
 * Missing it closes broken and, through the composite's missed-commitment path, a breach with the dependent as
 * the wronged party. Shape: caregiving as obligation triggered by the dependent's state rather than by the
 * caregiver's own needs; the threshold and horizon are engineering defaults. It does not model attachment, the
 * caregiver noticing (the host decides who is told), or how the care is given (the host's `care` affordance).
 */
export function careDuty(
  caregiver: Person,
  dependent: { id: PersonId; needs: readonly NeedReading[] },
  now: Minute,
  opts: { action?: string; horizon?: number; needs?: readonly NeedId[] } = {},
): Commitment | undefined {
  const d = CARE_DEFAULTS;
  const watched = opts.needs ?? d.needs;
  const urgent = dependent.needs.filter((n) => watched.includes(n.id) && n.urgency >= d.urgency);
  if (urgent.length === 0) return undefined;
  const top = Math.max(...urgent.map((n) => n.urgency));
  const importance = clamp01(
    d.importanceFloor + (1 - d.importanceFloor) * ((top - d.urgency) / (1 - d.urgency)),
  );
  const until = now + (opts.horizon ?? d.horizon);
  const action = opts.action ?? d.action;
  const open = caregiver.agenda.commitments.find(
    (c) =>
      c.status === 'pending' &&
      c.kind === 'duty' &&
      c.normId === 'care-dependents' &&
      c.targetId === dependent.id &&
      c.actions.includes(action) &&
      c.until >= now,
  );
  if (open) {
    open.until = Math.max(open.until, until);
    open.importance = Math.max(open.importance, importance);
    return open;
  }
  return promise(caregiver, {
    kind: 'duty',
    actions: [action],
    toId: dependent.id,
    targetId: dependent.id,
    from: now,
    until,
    normId: 'care-dependents',
    importance,
    label: `care for ${dependent.id}`,
  });
}
