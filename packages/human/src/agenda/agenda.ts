/** SCOPE: one always-present agenda; commitments, sourced make-up debt and temporal goals. */
import { clamp01, dpow } from '../core/index.ts';
import { projectDiminishes } from '../projects/projects.ts';
import type { ActorState, AgendaState, Commitment, NeedId, PsychologicalNeed, Time } from '../run-schema.ts';

type AgendaActor = import('../run-schema.ts').DeepReadonly<Pick<ActorState, 'activity'>>;
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
 * SCOPE (completion time): `completion: 'end'` admits only outcomes ending inside the window and
 * never extends it for an underway activity. It models a host-confirmed receipt, not transfer validation.
 * Absent this option, span overlap and underway protection remain exact.
 *
 * SCOPE (abstention, lane agenda+conscience): an `abstain` commitment (a fast, e.g. "no work after the evening prayer") is kept by
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
export interface GoalTemplate {
  label: string;
  advancedBy: {
    action: string;
    amount: number;
  }[];
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
/** Compare recurrence identity without changing agenda state. @internal */
export const sameChain = (a: Commitment, b: Commitment): boolean =>
  a.chain !== undefined && b.chain !== undefined ? a.kind === b.kind && a.chain === b.chain : sameShape(a, b);
const sameShape = (a: Commitment, b: Commitment): boolean =>
  a.kind === b.kind &&
  (a.violatedBy ?? []).join('|') === (b.violatedBy ?? []).join('|') &&
  a.normId === b.normId &&
  a.completion === b.completion &&
  a.targetId === b.targetId &&
  a.toId === b.toId &&
  a.recurEveryMs === b.recurEveryMs &&
  a.label === b.label &&
  a.until - a.from === b.until - b.from &&
  (a.from - b.from) % (a.recurEveryMs || 1) === 0 &&
  a.actions.join('|') === b.actions.join('|');
const hasSuccessor = (state: AgendaState, c: Commitment): boolean =>
  state.commitments.some((x) => x !== c && x.from > c.from && sameChain(x, c));
/** Closed instances that carry their chain on: kept, broken, or released by an exemption (not by the other party). */
const chainLink = (c: Commitment): boolean =>
  c.status === 'kept' || c.status === 'broken' || (c.status === 'released' && c.exempt !== undefined);
/** Whether an instance still owns a pending duty or a recurrence that can produce its next window. Read-only. */
export const isContinuingCommitment = (state: AgendaState, c: Commitment): boolean =>
  c.status === 'pending' ||
  (c.recurEveryMs !== undefined &&
    c.recurEveryMs > 0 &&
    chainLink(c) &&
    (c.recurUntil === undefined || c.from + c.recurEveryMs <= c.recurUntil) &&
    !hasSuccessor(state, c));
/**
 * Whether an activity that would keep `c` is under way at `now`: begun no later than the window's end
 * (`spanMeetsWindow`), not yet ended, not sleep, and serving `c` (listed in `fulfills` or matching its action and
 * target). Such a commitment stays open past `until` until the activity ends: `onFinished` then keeps it, or the next
 * pass closes it if the activity was cut short (fix 2026-10-03: a prayer begun in its window and finished after it
 * was recorded as missed while the person was seen praying). The will's omission rule uses the same test to keep
 * protecting the duty while it runs (1.9.0). Abstentions are never under way.
 */
export function isUnderWay(p: AgendaActor, c: Commitment, now: Time): boolean {
  const act = p.activity;
  return (
    act !== null &&
    act !== undefined &&
    act.offer.demands.mode !== 'sleep' &&
    c.kind !== 'abstain' &&
    act.startedAt <= c.until &&
    (c.completion !== 'end' || act.endsAt <= c.until) &&
    act.endsAt >= now &&
    ((act.offer.fulfills?.includes(c.id) ?? false) ||
      matchesCommitment(c, act.offer.actionId, act.offer.target))
  );
}
/**
 * Time pressure of a pending commitment, 0..1. Low during the lead-in, rising through the window and
 * saturating at 1 for the final (1 - peakFraction) of it. Zero outside [from - lead, until].
 */
export function commitmentPressure(c: Commitment, now: Time): number {
  const d = AGENDA_DEFAULTS;
  if (now > c.until || now < c.from - d.leadMinutes * 60000) return 0;
  if (now < c.from) return d.leadPressure;
  const span = Math.max(1, c.until - c.from);
  const f = (now - c.from) / span;
  return d.openPressure + (1 - d.openPressure) * clamp01(f / d.peakFraction);
}
/**
 * First minute at which `commitmentPressure(c, ·)` reaches `level` (closed-form inverse of its open-window ramp),
 * or undefined when it never does before `until`. Levels at or below the opening pressure are reached at `from`.
 */
export function pressureReachedAt(c: Commitment, level: number): Time | undefined {
  const d = AGENDA_DEFAULTS;
  if (level > 1) return undefined;
  if (level <= d.leadPressure) return c.from - d.leadMinutes * 60000;
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
export const violatesAbstention = (c: Commitment, action: string, start: Time, end: Time): boolean =>
  c.kind === 'abstain' &&
  c.status === 'pending' &&
  c.exempt === undefined &&
  (c.violatedBy?.includes(action) ?? false) &&
  start < c.until &&
  end > c.from;
/**
 * The single rule for "this activity counts toward that commitment": the activity's span [start, end] overlaps
 * the window [from, until]. `agendaTerms` pulls only toward options that would satisfy it, and `onFinished`
 * keeps by the same rule, so a pull never leads to an activity that cannot keep the commitment.
 * With explicit `completion: 'end'`, only the end minute counts.
 */
export const spanMeetsWindow = (c: Commitment, start: Time, end: Time): boolean =>
  c.completion === 'end' ? end >= c.from && end <= c.until : start <= c.until && end >= c.from;
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
/** HF4 agenda owns every commitment/goal update and allocation. */
export const agendaOwner: import('../run-schema.ts').AgendaOwner = {
  initialize(input, context) {
    const commitments = input.commitments.map((c) => ({
      ...structuredClone(c),
      status: 'pending' as const,
    })) as import('../run-schema.ts').Commitment[];
    const goals = input.goals.map((g) => ({
      ...structuredClone(g),
      status: 'active' as const,
      adoptedAt: context.at,
      lastAdvancedAt: context.at,
    })) as import('../run-schema.ts').Goal[];
    let nextId = 1;
    for (const id of [...commitments, ...goals].map((x) => x.id)) {
      const match = /^[cg](\d+)$/.exec(id);
      if (match?.[1]) nextId = Math.max(nextId, Number(match[1]) + 1);
    }
    return {
      exemptions: structuredClone(input.exemptions),
      commitments,
      goals,
      nextId,
      lastProposalDay: Math.floor(context.at / 86400000) - 1,
      owed: input.owed.map((o) => structuredClone(o)) as import('../run-schema.ts').OwedMakeUp[],
    };
  },
  receive(previous, input, context) {
    const state = structuredClone(previous) as import('../run-schema.ts').AgendaState;
    const events: import('../run-schema.ts').EventData[] = [];
    const d = context.effective.builtins.AGENDA_DEFAULTS;
    const changedCommitment = (
      c: import('../run-schema.ts').Commitment,
      before: import('../run-schema.ts').Commitment['status'] | null,
    ) => events.push({ kind: 'commitment-changed', commitmentId: c.id, before, after: structuredClone(c) });
    const changedGoal = (
      g: import('../run-schema.ts').Goal,
      before: import('../run-schema.ts').Goal['status'] | null,
    ) => events.push({ kind: 'goal-changed', goalId: g.id, before, after: structuredClone(g) });
    const addGoal = (
      data: import('../run-schema.ts').DeepReadonly<import('../run-schema.ts').GoalData>,
      allocate: boolean,
    ) => {
      const id = allocate ? allocateAgendaId(state, 'g') : data.id;
      if (state.goals.some((g) => g.id === id) || state.commitments.some((c) => c.id === id))
        throw new RangeError('Duplicate agenda identity');
      const goal = {
        ...structuredClone(data),
        id,
        status: 'active' as const,
        adoptedAt: context.at,
        lastAdvancedAt: context.at,
      } as import('../run-schema.ts').Goal;
      state.goals.push(goal);
      changedGoal(goal, null);
      return goal;
    };
    if ('kind' in input) {
      if (input.kind === 'exemption') {
        const { kind: _kind, ...premises } = input;
        state.exemptions = structuredClone(premises);
        applyAgendaExemptions(state, context.at, context.catalog, context.effective, events);
      } else if (input.kind === 'dependent-needs') {
        const care = context.effective.builtins.CARE_DEFAULTS;
        const held = context.norms.find((n) => n.normId === 'care-dependents');
        if (held && held.conviction > 0 && context.catalog.some((n) => n.id === held.normId)) {
          const urgent = input.needs.filter((n) => care.needs.includes(n.id) && n.urgency >= care.urgency);
          if (urgent.length) {
            const top = Math.max(...urgent.map((n) => n.urgency));
            const importance = clamp01(
              care.importanceFloor + ((1 - care.importanceFloor) * (top - care.urgency)) / (1 - care.urgency),
            );
            const until = context.at + care.horizon * 60000;
            const old = state.commitments.find(
              (c) =>
                c.status === 'pending' &&
                c.kind === 'duty' &&
                c.normId === 'care-dependents' &&
                c.targetId === input.dependent &&
                c.actions.includes(input.action) &&
                c.until >= context.at,
            );
            if (old) {
              old.until = Math.max(old.until, until);
              old.importance = Math.max(old.importance, importance);
              changedCommitment(old, 'pending');
            } else {
              const c: import('../run-schema.ts').Commitment = {
                id: allocateAgendaId(state, 'c'),
                kind: 'duty',
                actions: [input.action],
                targetId: input.dependent,
                toId: input.dependent,
                from: context.at,
                until,
                importance,
                normId: 'care-dependents',
                status: 'pending',
                label: `care for ${input.dependent}`,
              };
              state.commitments.push(c);
              changedCommitment(c, null);
            }
          }
        }
      } else if (input.kind === 'project-adopt') addGoal(input.goal, true);
      else if (input.kind === 'project-abandon') {
        const g = state.goals.find((g) => g.id === input.goalId && g.status === 'active');
        if (g) {
          g.status = 'abandoned';
          changedGoal(g, 'active');
        }
      } else
        for (const g of state.goals)
          if (g.status === 'active' && g.project?.prospectId === input.prospectId) {
            const high = g.project.peak ?? g.progress;
            if (input.progress > high) {
              g.project.peak = input.progress;
              g.lastAdvancedAt = context.at;
              g.importance = g.baseImportance;
            } else if (g.project.peak === undefined) g.project.peak = g.progress;
            g.progress = input.progress;
            if (g.progress >= 1) g.status = 'achieved';
            changedGoal(g, 'active');
          }
    } else if ('type' in input) {
      switch (input.type) {
        case 'retire-paid-make-ups': {
          const receipts = state.owed.flatMap((owed) => {
            const commitment = state.commitments.find(
              (c) =>
                c.id === owed.scheduledAs &&
                c.makeUpOf === owed.ofId &&
                c.status === 'kept' &&
                c.kind === owed.kind &&
                c.normId === owed.normId &&
                c.exempt === undefined &&
                c.until <= context.at,
            );
            return commitment
              ? [
                  {
                    owed: structuredClone(owed),
                    commitment: structuredClone(commitment),
                    recordedAt: context.at,
                  },
                ]
              : [];
          });
          if (receipts.length) {
            const retired = new Set(receipts.map((r) => r.owed.ofId));
            state.owed = state.owed.filter((o) => !retired.has(o.ofId));
            events.push({ kind: 'make-ups-retired', receipts });
          }
          break;
        }
        case 'commit': {
          const c = {
            ...structuredClone(input.commitment),
            status: 'pending' as const,
          } as import('../run-schema.ts').Commitment;
          if (
            state.commitments.some((c) => c.id === input.commitment.id) ||
            state.goals.some((g) => g.id === c.id)
          )
            throw new RangeError('Duplicate commitment');
          state.commitments.push(c);
          changedCommitment(c, null);
          break;
        }
        case 'release': {
          const c = state.commitments.find((c) => c.id === input.commitmentId && c.status === 'pending');
          if (c) {
            c.status = 'released';
            changedCommitment(c, 'pending');
          }
          break;
        }
        case 'goal':
          addGoal(input.goal, false);
          break;
        case 'abandon-goal': {
          const g = state.goals.find((g) => g.id === input.goalId && g.status === 'active');
          if (g) {
            g.status = 'abandoned';
            changedGoal(g, 'active');
          }
          break;
        }
        case 'adopt-task': {
          const g = state.goals.find(
            (g) => g.status === 'active' && g.project?.prospectId === input.prospectId,
          );
          if (g) {
            const { id: _id, progress: _progress, project: _project, ...task } = structuredClone(input.task);
            Object.assign(g, task);
            changedGoal(g, 'active');
          }
          break;
        }
        case 'retime':
          for (const mapping of input.mappings) {
            const c = state.commitments.find(
              (c) => c.id === mapping.commitmentId && c.status === 'pending' && context.at < c.from,
            );
            if (c) {
              c.from = mapping.start;
              c.until = mapping.end;
              changedCommitment(c, 'pending');
            }
          }
          break;
        case 'make-up': {
          const owed = state.owed.find((o) => o.ofId === input.commitmentId && o.scheduledAs === undefined);
          if (owed) {
            const c: import('../run-schema.ts').Commitment = {
              id: allocateAgendaId(state, 'c'),
              kind: owed.kind,
              actions: [...owed.actions],
              from: input.window.start,
              until: input.window.end,
              importance: 0.8,
              makeUpOf: owed.ofId,
              status: 'pending',
              label: owed.label ? `make-up ${owed.label}` : 'make-up',
              ...(owed.normId !== undefined ? { normId: owed.normId } : {}),
              ...(owed.violatedBy !== undefined ? { violatedBy: [...owed.violatedBy] } : {}),
            };
            state.commitments.push(c);
            owed.scheduledAs = c.id;
            changedCommitment(c, null);
          }
          break;
        }
      }
    } else if (input.status === 'completed') {
      const eligible = (c: import('../run-schema.ts').Commitment) =>
        c.status === 'pending' &&
        c.kind !== 'abstain' &&
        (c.completion === 'end'
          ? input.end >= c.from && input.end <= c.until
          : input.start <= c.until && input.end >= c.from);
      for (const c of state.commitments)
        if (
          c.kind === 'abstain' &&
          c.status === 'pending' &&
          !c.exempt &&
          c.violatedBy?.includes(input.actionId) &&
          input.start < c.until &&
          input.end > c.from
        ) {
          const definition = context.catalog.find((n) => n.id === c.normId);
          if (context.activity?.necessity && definition) {
            c.exempt = { reason: 'necessity', at: context.at };
            if (definition.exemptions.some((e) => e.when === 'illness' && e.makeUp))
              appendAgendaDebt(state, c, 'necessity', context.at, d.maxOwed);
          } else if (c.makeUpOf) {
            c.status = 'released';
            const owed = state.owed.find((o) => o.scheduledAs === c.id);
            if (owed) delete owed.scheduledAs;
          } else {
            c.status = 'broken';
            if (c.normId && context.norms.some((n) => n.normId === c.normId && n.standing === 'obligatory'))
              appendAgendaDebt(state, c, 'broken', context.at, d.maxOwed);
          }
          changedCommitment(c, 'pending');
        }
      const named = state.commitments.filter((c) => eligible(c) && input.fulfills.includes(c.id));
      const kept =
        new Set(input.fulfills).size > 1 && named.length
          ? named
          : state.commitments
              .filter(
                (c) =>
                  eligible(c) &&
                  (input.fulfills.includes(c.id) ||
                    (c.actions.includes(input.actionId) &&
                      (c.targetId === undefined || c.targetId === input.target))),
              )
              .sort((a, b) => a.until - b.until)
              .slice(0, 1);
      for (const c of kept) {
        c.status = 'kept';
        changedCommitment(c, 'pending');
      }
      for (const g of state.goals)
        if (g.status === 'active') {
          const own = g.advancedBy.find((a) => a.action === input.actionId)?.amount ?? 0;
          const amount =
            own > 0
              ? own
              : input.advances.includes(g.id) || (g.project && input.advances.includes(g.project.prospectId))
                ? d.defaultAdvanceAmount
                : 0;
          if (amount <= 0 || g.project?.peak !== undefined) continue;
          g.progress = clamp01(g.progress + amount);
          g.lastAdvancedAt = context.at;
          g.importance = g.baseImportance;
          if (g.progress >= 1) g.status = 'achieved';
          changedGoal(g, 'active');
        }
    }
    return {
      state,
      effects: { terms: [], modifiers: [], appraisals: [] },
      events,
      nextBoundary: null,
      advancedThrough: context.at,
    };
  },
  advance(previous, context) {
    const state = structuredClone(previous) as import('../run-schema.ts').AgendaState;
    const d = context.effective.builtins.AGENDA_DEFAULTS,
      events: import('../run-schema.ts').EventData[] = [];
    const owe = (
      c: import('../run-schema.ts').Commitment,
      reason: import('../run-schema.ts').OwedMakeUp['reason'],
    ) => {
      if (
        c.makeUpOf ||
        !c.normId ||
        !['worship', 'abstain'].includes(c.kind) ||
        !context.norms.some((n) => n.normId === c.normId && n.standing === 'obligatory')
      )
        return;
      let lapseSince: number | undefined;
      if (reason === 'unconscious') {
        const since = context.body.downed?.since ?? context.body.lastDowned?.from ?? c.until;
        const lapse = state.lapse?.since === since ? state.lapse : { since, missed: 0 };
        lapse.missed++;
        state.lapse = lapse;
        if (lapse.missed > d.lapseWaiver) {
          state.owed = state.owed.filter(
            (o) => !(o.reason === 'unconscious' && o.lapseSince === since && o.scheduledAs === undefined),
          );
          return;
        }
        lapseSince = since;
      }
      state.owed.push({
        ofId: c.id,
        kind: c.kind,
        actions: [...c.actions],
        reason,
        at: c.until,
        normId: c.normId,
        ...(c.violatedBy ? { violatedBy: [...c.violatedBy] } : {}),
        ...(c.label ? { label: c.label } : {}),
        ...(lapseSince !== undefined ? { lapseSince } : {}),
      });
      while (state.owed.length > d.maxOwed) {
        const scheduled = state.owed.findIndex((o) => o.scheduledAs !== undefined);
        state.owed.splice(Math.max(0, scheduled), 1);
      }
    };
    for (let work = 0; work < 10000; work++) {
      const due = state.commitments
        .filter(
          (c) =>
            c.until < context.to &&
            ((c.status === 'pending' && !isUnderWay({ activity: context.activity }, c, context.to)) ||
              (c.recurEveryMs !== undefined &&
                chainLink(c) &&
                (c.recurUntil === undefined || c.from + c.recurEveryMs <= c.recurUntil) &&
                !hasSuccessor(state, c))),
        )
        .sort((a, b) => a.until - b.until)[0];
      if (!due) break;
      const c = due,
        before = c.status;
      if (c.status === 'pending') {
        if (c.exempt) c.status = 'released';
        else if (c.kind === 'abstain') c.status = 'kept';
        else if (c.makeUpOf) {
          c.status = 'released';
          const debt = state.owed.find((o) => o.scheduledAs === c.id);
          if (debt) delete debt.scheduledAs;
        } else {
          const body = context.body;
          const excuse =
            (body.downed && body.downed.since <= c.until) ||
            (body.lastDowned && body.lastDowned.from <= c.until && body.lastDowned.to >= c.until)
              ? 'unconscious'
              : body.asleep && body.since <= c.from
                ? 'sleep'
                : body.lastSleep &&
                    body.lastSleep.from <= c.from &&
                    body.lastSleep.to >= c.until - d.wakeGrace * 60000
                  ? 'sleep'
                  : undefined;
          if (c.kind === 'worship' && excuse) {
            c.status = 'released';
            c.exempt = { reason: excuse, at: c.until };
            owe(c, excuse);
          } else {
            c.status = 'broken';
            owe(c, 'missed');
          }
        }
      } else if (c.recurEveryMs !== undefined) {
        const r = c.recurEveryMs;
        let k = Math.max(1, Math.ceil((context.to - c.until) / r) - d.maxCatchUp);
        if (c.recurUntil !== undefined) k = Math.max(1, Math.min(k, Math.floor((c.recurUntil - c.from) / r)));
        const { id: _id, status: _status, exempt: _exempt, ...rest } = c;
        const next = {
          ...structuredClone(rest),
          id: allocateAgendaId(state, 'c'),
          from: c.from + k * r,
          until: c.until + k * r,
          status: 'pending' as const,
        };
        if (!Number.isSafeInteger(next.from) || !Number.isSafeInteger(next.until))
          throw new RangeError('Recurring window exceeds safe time');
        state.commitments.push(next);
        events.push({
          kind: 'commitment-changed',
          commitmentId: next.id,
          before: null,
          after: structuredClone(next),
        });
      }
      if (c.status !== before)
        events.push({ kind: 'commitment-changed', commitmentId: c.id, before, after: structuredClone(c) });
      if (work === 9999) throw new RangeError('Agenda advancement work limit exceeded');
    }
    applyAgendaExemptions(state, context.to, context.catalog, context.effective, events);
    const p = context.effective.builtins.PURPOSE_DEFAULTS;
    for (const g of state.goals)
      if (g.status === 'active') {
        const neglected = Math.max(0, Math.floor((context.to - g.lastAdvancedAt) / 86400000) - p.graceDays);
        g.importance = clamp01(g.baseImportance * dpow(p.decayPerDay, neglected));
        if (g.importance < p.abandonBelow) {
          g.status = 'abandoned';
          events.push({ kind: 'goal-changed', goalId: g.id, before: 'active', after: structuredClone(g) });
        }
      }
    const removable = state.commitments
      .filter((c) => c.status !== 'pending' && !(c.recurEveryMs !== undefined && !hasSuccessor(state, c)))
      .sort((a, b) => a.until - b.until);
    const dropped = new Set(removable.slice(0, Math.max(0, removable.length - d.maxClosedCommitments)));
    state.commitments = state.commitments.filter((c) => !dropped.has(c));
    const closed = state.goals.filter((g) => g.status !== 'active').sort((a, b) => a.adoptedAt - b.adoptedAt);
    const removed = new Set(closed.slice(0, Math.max(0, closed.length - d.maxClosedGoals)));
    state.goals = state.goals.filter((g) => !removed.has(g));
    const boundaries = state.commitments
      .filter((c) => c.status === 'pending' && c.until >= context.to)
      .map((c) => c.until + 1);
    if (state.exemptions.validUntil !== undefined && state.exemptions.validUntil >= context.to)
      boundaries.push(state.exemptions.validUntil + 1);
    const next = boundaries.filter(Number.isSafeInteger).sort((a, b) => a - b)[0] ?? null;
    return {
      state,
      effects: { terms: [], modifiers: [], appraisals: [] },
      events,
      nextBoundary: next,
      advancedThrough: context.to,
    };
  },
  consider(previous, context) {
    const state = structuredClone(previous) as import('../run-schema.ts').AgendaState;
    const d = context.effective.builtins.AGENDA_DEFAULTS,
      day = Math.floor(context.at / 86400000),
      events: import('../run-schema.ts').EventData[] = [];
    if (
      state.lastProposalDay !== day &&
      state.goals.filter((g) => g.status === 'active').length < d.maxActiveGoals
    ) {
      const candidates = context.needs
        .filter(
          (n) =>
            n.urgency > d.proposeUrgency &&
            ['belonging', 'competence', 'meaning', 'esteem'].includes(n.id) &&
            !state.goals.some((g) => g.status === 'active' && g.serves.includes(n.id)),
        )
        .sort((a, b) => b.urgency - a.urgency || (a.id < b.id ? -1 : 1));
      const top = candidates[0];
      if (
        top &&
        (top.id === 'belonging' || top.id === 'competence' || top.id === 'meaning' || top.id === 'esteem')
      ) {
        const template = d.goalTemplates[top.id],
          importance = clamp01(0.4 + 0.4 * top.urgency);
        const goal: import('../run-schema.ts').Goal = {
          id: allocateAgendaId(state, 'g'),
          label: template.label,
          serves: [top.id],
          advancedBy: template.advancedBy.map((a) => ({ ...a })),
          importance,
          baseImportance: importance,
          completionHalfLifeMs: template.completionHalfLifeMs,
          progress: 0,
          status: 'active',
          adoptedAt: context.at,
          lastAdvancedAt: context.at,
        };
        state.goals.push(goal);
        state.lastProposalDay = day;
        events.push({ kind: 'goal-changed', goalId: goal.id, before: null, after: structuredClone(goal) });
      }
    }
    return {
      state,
      events,
      effects: { terms: [], modifiers: [], appraisals: [] },
      nextBoundary: null,
      advancedThrough: context.at,
    };
  },
  validate(state) {
    const issues: import('../run-schema.ts').ValidationIssue[] = [];
    const fail = (path: string) =>
      issues.push({ path, code: 'invalid-schema', message: 'Invalid agenda state' });
    if (
      !Number.isSafeInteger(state.nextId) ||
      state.nextId < 1 ||
      !Number.isSafeInteger(state.lastProposalDay) ||
      new Set([...state.commitments, ...state.goals].map((x) => x.id)).size !==
        state.commitments.length + state.goals.length
    )
      fail('agenda');
    for (const item of [...state.commitments, ...state.goals]) {
      const counter = /^[cg]([0-9]+)$/.exec(item.id)?.[1];
      if (counter !== undefined && Number(counter) >= state.nextId) fail('agenda.nextId');
    }
    for (const c of state.commitments)
      if (
        !c.id ||
        !Number.isSafeInteger(c.from) ||
        !Number.isSafeInteger(c.until) ||
        c.until <= c.from ||
        !Number.isSafeInteger(c.until - c.from) ||
        !Number.isFinite(c.importance) ||
        c.importance < 0 ||
        c.importance > 1 ||
        !['pending', 'kept', 'broken', 'released'].includes(c.status) ||
        (c.recurEveryMs !== undefined && (!Number.isSafeInteger(c.recurEveryMs) || c.recurEveryMs <= 0))
      )
        fail('agenda.commitments');
    for (const g of state.goals)
      if (
        !g.id ||
        !Number.isFinite(g.progress) ||
        g.progress < 0 ||
        g.progress > 1 ||
        !Number.isFinite(g.importance) ||
        g.importance < 0 ||
        g.importance > 1 ||
        !Number.isSafeInteger(g.adoptedAt) ||
        !Number.isSafeInteger(g.lastAdvancedAt) ||
        !Number.isSafeInteger(g.completionHalfLifeMs) ||
        g.completionHalfLifeMs <= 0
      )
        fail('agenda.goals');
    return issues;
  },
  validatePortable(state, obligations) {
    const commitments = obligations.flatMap((o) => (o.kind === 'commitment' ? [o.commitment] : []));
    const owed = obligations.flatMap((o) => (o.kind === 'owed' ? [o.owed] : []));
    const issues = [
      ...agendaOwner.validate({
        commitments,
        owed,
        goals: state.goals,
        nextId: state.agendaAllocation.nextId,
        lastProposalDay: state.agendaAllocation.lastProposalDay,
        exemptions: { traveling: { kind: 'unobserved' }, illnessSeverity: { kind: 'unobserved' } },
      }),
    ];
    const ids = new Set(state.goals.map((g) => g.id));
    for (const obligation of obligations) {
      if (
        obligation.kind === 'commitment' &&
        !state.agendaAllocation.allocated.some(
          (r) => r.kind === 'commitment' && r.id === obligation.commitment.id,
        )
      )
        issues.push({ path: 'obligations', code: 'unknown-id', message: 'Unallocated portable commitment' });
      if (obligation.kind === 'goal' && !ids.has(obligation.goalId))
        issues.push({ path: 'obligations', code: 'unknown-id', message: 'Unknown portable goal' });
    }
    if (
      ids.size !== state.goals.length ||
      !Number.isSafeInteger(state.agendaAllocation.nextId) ||
      state.agendaAllocation.nextId < 1
    )
      issues.push({ path: 'agendaAllocation', code: 'invalid-schema', message: 'Invalid portable agenda' });
    for (const goal of state.goals)
      if (!state.agendaAllocation.allocated.some((r) => r.kind === 'goal' && r.id === goal.id))
        issues.push({ path: 'goals', code: 'unknown-id', message: 'Unallocated portable goal' });
    return issues;
  },
};
function allocateAgendaId(state: import('../run-schema.ts').AgendaState, prefix: 'c' | 'g'): string {
  for (;;) {
    if (!Number.isSafeInteger(state.nextId)) throw new RangeError('Agenda identities exhausted');
    const id = `${prefix}${state.nextId++}`;
    if (!state.commitments.some((c) => c.id === id) && !state.goals.some((g) => g.id === id)) return id;
  }
}
function appendAgendaDebt(
  state: import('../run-schema.ts').AgendaState,
  c: import('../run-schema.ts').Commitment,
  reason: import('../run-schema.ts').OwedMakeUp['reason'],
  at: number,
  max: number,
): void {
  if (c.makeUpOf || state.owed.some((o) => o.ofId === c.id)) return;
  state.owed.push({
    ofId: c.id,
    kind: c.kind,
    actions: [...c.actions],
    reason,
    at,
    ...(c.normId ? { normId: c.normId } : {}),
    ...(c.label ? { label: c.label } : {}),
    ...(c.violatedBy ? { violatedBy: [...c.violatedBy] } : {}),
  });
  while (state.owed.length > max) {
    const index = state.owed.findIndex((o) => o.scheduledAs !== undefined);
    state.owed.splice(Math.max(0, index), 1);
  }
}
function applyAgendaExemptions(
  state: import('../run-schema.ts').AgendaState,
  at: number,
  catalog: import('../run-schema.ts').DeepReadonly<readonly import('../run-schema.ts').SourcedNorm[]>,
  effective: import('../run-schema.ts').EffectiveParameters,
  events: import('../run-schema.ts').EventData[],
): void {
  const premise = state.exemptions;
  if (premise.validUntil !== undefined && at > premise.validUntil) return;
  const d = effective.builtins.EXEMPTION_DEFAULTS;
  const travel = premise.traveling.kind !== 'unobserved' && premise.traveling.value;
  const sick =
    premise.illnessSeverity.kind !== 'unobserved' && premise.illnessSeverity.value >= d.illnessSeverity;
  for (const c of state.commitments) {
    if (
      c.kind !== 'abstain' ||
      c.status !== 'pending' ||
      c.exempt ||
      at > c.until ||
      at < c.from - d.lookahead * 60000
    )
      continue;
    const definition = catalog.find((n) => n.id === c.normId);
    if (c.normId && !definition) continue;
    const reason = (['illness', 'travel'] as const).find(
      (reason) =>
        (reason === 'illness' ? sick : travel) &&
        c.exemptWhen?.includes(reason) &&
        (!definition || definition.exemptions.some((e) => e.when === reason)),
    );
    if (!reason) continue;
    c.exempt = { reason, at };
    if (definition?.exemptions.some((e) => e.when === reason && e.makeUp))
      appendAgendaDebt(state, c, reason, at, effective.builtins.AGENDA_DEFAULTS.maxOwed);
    events.push({
      kind: 'commitment-changed',
      commitmentId: c.id,
      before: 'pending',
      after: structuredClone(c),
    });
  }
}

/** One completion-delay valuation for direct and retained routes. No undiscounted goal branch. */
export function temporalGoalValue(
  p: Pick<import('../run-schema.ts').ActorState, 'projects'> & {
    effective: import('../run-schema.ts').EffectiveParameters;
  },
  g: import('../run-schema.ts').Goal,
  offer: import('../run-schema.ts').Offer,
  now: number,
  completion: number,
  successRate: number,
): number {
  if (g.project && projectDiminishes(p.projects, offer, g.project.prospectId)) return 0;
  const d = p.effective.builtins.AGENDA_DEFAULTS;
  const amount =
    g.advancedBy.find((a) => a.action === offer.actionId)?.amount ??
    (offer.advances.includes(g.id) || (g.project && offer.advances.includes(g.project.prospectId))
      ? d.defaultAdvanceAmount
      : 0);
  const deadline =
    g.deadline === undefined
      ? 1
      : 1 + d.goalDeadlineBoost * clamp01((now - g.adoptedAt) / Math.max(1, g.deadline - g.adoptedAt));
  return amount > 0
    ? g.importance *
        clamp01(amount * d.goalAmountGain) *
        deadline *
        successRate *
        dpow(0.5, Math.max(0, completion - now) / g.completionHalfLifeMs)
    : 0;
}
export function agendaTermsWithGoalEstimates(
  p: Pick<import('../run-schema.ts').ActorState, 'id' | 'agenda' | 'conscience' | 'activity' | 'projects'> & {
    effective: import('../run-schema.ts').EffectiveParameters;
  },
  offer: import('../run-schema.ts').Offer,
  now: number,
  successRate: number,
  overrides?: ReadonlyMap<string, number>,
): import('../run-schema.ts').TermData[] {
  const d = p.effective.builtins.AGENDA_DEFAULTS,
    terms: import('../run-schema.ts').TermData[] = [];
  for (const c of p.agenda.commitments) {
    if (c.status !== 'pending') continue;
    if (c.kind === 'abstain') {
      if (!violatesAbstention(c, offer.actionId, now, now + offer.durationMs)) continue;
      const conviction =
        c.normId === undefined ? 1 : (p.conscience.norms.find((n) => n.normId === c.normId)?.conviction ?? 0);
      const value = -d.abstainScale * c.importance * conviction;
      if (value < 0) terms.push({ source: `abstain:${c.id}`, value });
      continue;
    }
    if (!offer.fulfills.includes(c.id) && !matchesCommitment(c, offer.actionId, offer.target)) continue;
    const activity = p.activity,
      finishing =
        c.completion !== 'end' &&
        activity !== null &&
        activity.offer.id === offer.id &&
        now > c.until &&
        activity.startedAt <= c.until &&
        activity.endsAt > now;
    const pressure = commitmentPressure(c, finishing ? c.until : now);
    if (pressure > 0 && (finishing || spanMeetsWindow(c, now, now + offer.durationMs)))
      terms.push({ source: `commitment:${c.id}`, value: d.commitmentScale * c.importance * pressure });
  }
  for (const g of p.agenda.goals) {
    if (g.status !== 'active' || (g.project && projectDiminishes(p.projects, offer, g.project.prospectId)))
      continue;
    const value =
      overrides?.get(g.id) ?? temporalGoalValue(p, g, offer, now, now + offer.durationMs, successRate);
    if (value > 0) terms.push({ source: `goal:${g.id}`, value });
  }
  return terms;
}
