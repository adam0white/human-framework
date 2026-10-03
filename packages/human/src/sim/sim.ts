/**
 * SCOPE: a host-side, event-driven driver over a `World` adapter. Each person is processed at their next
 * event (idle now, activity end, or review time), in deterministic (time, person id) order: the person is
 * advanced to that minute, perceives what the world queued for them, finishes an ended activity, then
 * decides. At a review the current activity is re-offered with its inertia, so a challenger must beat it
 * by the person's `switchMargin` to interrupt. The driver holds only host-side bookkeeping (idle timers,
 * last perception time); all person state stays in `Person`. It returns an event log for the host. This
 * is reference plumbing for tests and small hosts, not a scheduler with any claim about real time use.
 */
import { begin, decide, finish, perceive, reviewed, tick } from '../person.ts';
import type {
  Activity,
  Affordance,
  Minute,
  Outcome,
  Percept,
  Person,
  PersonId,
  Suggestion,
  SuggestionVerdict,
} from '../types.ts';

export const SIM_DEFAULTS = {
  /** Minutes an idle person waits when no option is chosen. */
  idleQuantum: 15,
  /** Events kept in the returned log (the simulation itself always runs to `until`). */
  maxEvents: 100_000,
};

export interface World {
  /** The world's clock (the latest minute it has been asked about). */
  now(): Minute;
  affordancesFor(p: Person): Affordance[];
  /** Percepts queued for `p` in (since, until]. */
  perceptsFor(p: Person, since: Minute, until: Minute): Percept[];
  /** World truth about how an activity ended. `reason` says whether the person left it early. */
  resolve(p: Person, activity: Activity, reason: 'ended' | 'interrupted'): Outcome;
}

export type SimEventKind = 'decide' | 'begin' | 'continue' | 'finish' | 'perceive' | 'idle' | 'died';

export interface SimEvent {
  at: Minute;
  personId: PersonId;
  kind: SimEventKind;
  detail: string;
  decisionId?: string;
  affordanceId?: string;
  action?: string;
  verdict?: SuggestionVerdict;
  status?: Outcome['status'];
  /** On 'decide': made while an activity was running (a suggestion then moves no voice counters). */
  review?: boolean;
}

export interface Community {
  people: Person[];
  /** Host-side: when an idle person who found nothing to do will look again. */
  idleUntil: Record<PersonId, Minute>;
  /** Host-side: the last minute each person was handed percepts up to. */
  perceivedUntil: Record<PersonId, Minute>;
}

export interface StepOptions {
  /** Standing suggestions, applied at every decision of that person (resolved quietly at reviews). */
  suggestions?: Record<PersonId, Suggestion>;
  /** Hosts may disable the necessity exception. */
  necessity?: boolean;
  /** Minutes an idle person waits when no option is chosen. */
  idleQuantum?: number;
  /** Stop collecting events beyond this many (the simulation still runs). */
  maxEvents?: number;
}

export function createCommunity(people: Person[]): Community {
  const sorted = [...people].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const idleUntil: Record<PersonId, Minute> = {};
  const perceivedUntil: Record<PersonId, Minute> = {};
  for (const p of sorted) {
    idleUntil[p.id] = p.now;
    perceivedUntil[p.id] = p.now;
  }
  return { people: sorted, idleUntil, perceivedUntil };
}

/** Next minute at which this person needs attention. */
export function nextEventAt(c: Community, p: Person): Minute {
  if (!p.body.alive) return Number.POSITIVE_INFINITY;
  const act = p.activity;
  if (act) return Math.max(p.now, Math.min(act.endsAt, act.reviewAt));
  return Math.max(p.now, c.idleUntil[p.id] ?? p.now);
}

/**
 * Advance the community to `until`, processing person events in (time, id) order. Returns the events.
 */
export function stepCommunity(c: Community, world: World, until: Minute, opts: StepOptions = {}): SimEvent[] {
  const events: SimEvent[] = [];
  const quantum = Math.max(1, opts.idleQuantum ?? SIM_DEFAULTS.idleQuantum);
  const maxEvents = opts.maxEvents ?? SIM_DEFAULTS.maxEvents;
  const log = (e: SimEvent) => {
    if (events.length < maxEvents) events.push(e);
  };
  const decideOpts = (p: Person) => {
    const o: Parameters<typeof decide>[2] = {};
    const s = opts.suggestions?.[p.id];
    // At reviews the standing suggestion still weighs in, but `decide` resolves it quietly (no counters,
    // pressure or autonomy cost), so one request is not re-counted as many verdicts.
    if (s) o.suggestion = s;
    if (opts.necessity !== undefined) o.necessity = opts.necessity;
    return o;
  };

  for (;;) {
    let next: Person | undefined;
    let t = Number.POSITIVE_INFINITY;
    for (const p of c.people) {
      const at = nextEventAt(c, p);
      if (at < t) {
        t = at;
        next = p;
      }
    }
    if (!next || t > until) break;
    const p = next;
    tick(p, t);
    if (!p.body.alive) {
      log({ at: t, personId: p.id, kind: 'died', detail: `${p.name} died` });
      continue;
    }

    const since = c.perceivedUntil[p.id] ?? t;
    const percepts = world.perceptsFor(p, since, t);
    c.perceivedUntil[p.id] = t;
    if (percepts.length > 0) {
      const attended = perceive(p, percepts);
      log({
        at: t,
        personId: p.id,
        kind: 'perceive',
        detail: `${attended.length}/${percepts.length} percepts`,
      });
    }

    let act = p.activity;
    if (act && t >= act.endsAt) {
      const outcome = world.resolve(p, act, 'ended');
      const report = finish(p, outcome);
      const ev: SimEvent = {
        at: t,
        personId: p.id,
        kind: 'finish',
        detail: outcome.summary ?? `${act.action} ${outcome.status}`,
        affordanceId: act.affordanceId,
        action: act.action,
      };
      if (report) ev.status = report.status;
      log(ev);
      act = p.activity;
    }

    const affordances = world.affordancesFor(p);
    const record = decide(p, affordances, decideOpts(p));
    const dev: SimEvent = {
      at: t,
      personId: p.id,
      kind: 'decide',
      detail: record.narration,
      decisionId: record.id,
    };
    if (record.chosenAffordanceId !== null) dev.affordanceId = record.chosenAffordanceId;
    if (record.chosenAction !== null) dev.action = record.chosenAction;
    if (record.suggestion) dev.verdict = record.suggestion.verdict;
    if (act) dev.review = true;
    log(dev);

    if (act) {
      // Review of a running activity.
      if (record.chosenAffordanceId === null || record.chosenAffordanceId === act.affordanceId) {
        reviewed(p);
        log({ at: t, personId: p.id, kind: 'continue', detail: act.action, affordanceId: act.affordanceId });
        continue;
      }
      const outcome = world.resolve(p, act, 'interrupted');
      finish(p, outcome);
      log({
        at: t,
        personId: p.id,
        kind: 'finish',
        detail: `${act.action} interrupted`,
        affordanceId: act.affordanceId,
        action: act.action,
        status: outcome.status,
      });
    }
    const chosen = affordances.find((a) => a.id === record.chosenAffordanceId);
    if (!chosen) {
      c.idleUntil[p.id] = t + quantum;
      log({ at: t, personId: p.id, kind: 'idle', detail: 'nothing chosen' });
      continue;
    }
    const started = begin(p, chosen, record);
    if (!started) {
      c.idleUntil[p.id] = t + quantum;
      continue;
    }
    log({
      at: t,
      personId: p.id,
      kind: 'begin',
      detail: `${chosen.label} (${record.intention})`,
      decisionId: record.id,
      affordanceId: chosen.id,
      action: chosen.action,
    });
  }

  for (const p of c.people) if (p.now < until) tick(p, until);
  return events;
}
