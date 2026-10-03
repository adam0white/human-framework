/**
 * SCOPE: a host-side, event-driven driver over a `World` adapter. Each person is processed at their next
 * event (idle now, activity end, or review time), in deterministic (time, person id) order: the person is
 * advanced to that minute, perceives what the world queued for them, finishes an ended activity, then
 * decides. At a review the current activity is re-offered with its inertia, so a challenger must beat it
 * by the person's `switchMargin` to interrupt. The driver holds only host-side bookkeeping (idle timers,
 * last perception time, joint proposals, pending interrupts); all person state stays in `Person`. It returns
 * an event log for the host. This is reference plumbing for tests and small hosts, not a scheduler with any
 * claim about real time use.
 *
 * Joint activities (an offer tagged 'joint' whose `with` names community members): the proposer's choice is not
 * begun at once. The partners are interrupted the same minute and offered a mirror affordance (tag 'joint',
 * `jointId`); each partner's own decision weighs it (social, trust and joint terms). If every partner chooses the
 * mirror, all begin the same minute; if any declines, the proposer re-decides that minute without that offer.
 * Space and travel are host matters: the framework has no spatial model, and travel time is folded into
 * `Affordance.duration` by the host.
 */
import { readBody } from '../body/index.ts';
import { clamp01 } from '../core/index.ts';
import {
  type BeginOptions,
  begin,
  decide,
  finish,
  interrupt,
  perceive,
  predict,
  reviewed,
  tick,
} from '../person.ts';
import { skillLevel, successChance } from '../skills/index.ts';
import type {
  Activity,
  Affordance,
  DecisionRecord,
  Minute,
  Outcome,
  Percept,
  Person,
  PersonId,
  Suggestion,
  SuggestionResolution,
  SuggestionVerdict,
  Unit,
} from '../types.ts';

export const SIM_DEFAULTS = {
  /** Minutes an idle person waits when no option is chosen. */
  idleQuantum: 15,
  /** A perceived percept at or above this salience that targets the person (or is flagged `near`) interrupts. */
  interruptSalience: 0.8,
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
  /** Optional: the partner's version of a joint offer (default `mirrorAffordance`). Keep `jointId` set. */
  mirror?(partner: Person, offer: Affordance, proposal: JointProposal): Affordance;
  /**
   * Optional: options for `begin` when `stepCommunity` starts an activity, e.g. a promise made at begin
   * (carrying the injured). Called with the person at the begin minute; for joint activities the protocol's
   * `jointId` is added on top.
   */
  beginOptions?(p: Person, offer: Affordance, record: DecisionRecord): BeginOptions | undefined;
}

export type SimEventKind =
  | 'decide'
  | 'begin'
  | 'continue'
  | 'finish'
  | 'perceive'
  | 'idle'
  | 'died'
  | 'interrupt'
  | 'propose'
  | 'accept'
  | 'decline';

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
  /** On joint events: the proposal id. */
  jointId?: string;
}

/** A pending or settled joint activity (host-side bookkeeping, plain JSON). */
export interface JointProposal {
  id: string;
  proposerId: PersonId;
  partnerIds: PersonId[];
  /** The proposer's offer as chosen. */
  offer: Affordance;
  /** The proposer's decision, used when the proposal is accepted and the proposer begins. */
  record: DecisionRecord;
  at: Minute;
  accepted: PersonId[];
  /** Decisions of the partners who accepted, used when everyone begins. */
  partnerRecords: Record<PersonId, DecisionRecord>;
  status: 'pending' | 'accepted' | 'declined';
}

export interface Community {
  people: Person[];
  /** Host-side: when an idle person who found nothing to do will look again. */
  idleUntil: Record<PersonId, Minute>;
  /** Host-side: the last minute each person was handed percepts up to. */
  perceivedUntil: Record<PersonId, Minute>;
  /** Host-side: forced decisions for idle people (`interruptPerson`), consumed at their next decision. */
  interrupts: Record<PersonId, { at: Minute; reason: string }>;
  /** Host-side: joint proposals (pending and the most recent settled ones) and per-minute exclusions. */
  joint: {
    nextId: number;
    proposals: JointProposal[];
    /** Offers a person may not choose again at minute `at` (a partner just declined them). */
    excluded: Record<PersonId, { at: Minute; ids: string[] }>;
  };
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
  /**
   * Salience at or above which a perceived percept targeting the person (or flagged `near`) interrupts them;
   * false disables. Default `SIM_DEFAULTS.interruptSalience`. Percepts are pulled at each person's own events,
   * so a host wanting an immediate response calls `interruptPerson` when it queues the percept.
   */
  interruptSalience?: number | false;
}

export function createCommunity(people: Person[]): Community {
  const sorted = [...people].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const idleUntil: Record<PersonId, Minute> = {};
  const perceivedUntil: Record<PersonId, Minute> = {};
  for (const p of sorted) {
    idleUntil[p.id] = p.now;
    perceivedUntil[p.id] = p.now;
  }
  return {
    people: sorted,
    idleUntil,
    perceivedUntil,
    interrupts: {},
    joint: { nextId: 0, proposals: [], excluded: {} },
  };
}

/** Settled proposals kept for inspection. */
const MAX_SETTLED_PROPOSALS = 16;

const pendingProposals = (c: Community): JointProposal[] =>
  c.joint.proposals.filter((x) => x.status === 'pending');

/** Whether this person is waiting on a pending joint proposal (as proposer or as a partner who accepted). */
export function awaitingJoint(c: Community, id: PersonId): boolean {
  if (c.joint.proposals.length === 0) return false;
  return pendingProposals(c).some((x) => x.proposerId === id || x.accepted.includes(id));
}

/** Next minute at which this person needs attention. */
export function nextEventAt(c: Community, p: Person): Minute {
  if (!p.body.alive) return Number.POSITIVE_INFINITY;
  if (awaitingJoint(c, p.id)) return Number.POSITIVE_INFINITY;
  const act = p.activity;
  if (act) return Math.max(p.now, Math.min(act.endsAt, act.reviewAt));
  return Math.max(p.now, c.idleUntil[p.id] ?? p.now);
}

/** How this person would answer `suggestion` now, without changing state (UI telegraph; wraps `predict`). */
export function preview(
  p: Person,
  affordances: readonly Affordance[],
  suggestion: Suggestion,
  opts: { necessity?: boolean } = {},
): SuggestionResolution {
  return predict(p, affordances, suggestion, opts);
}

/**
 * Force `p` to re-decide at `at` (not earlier than their own clock): a running activity's review is brought
 * forward (`interrupt` in person.ts); an idle person's next look is moved up and the reason is carried into the
 * decision. Safe to call from inside `World` callbacks during `stepCommunity`.
 */
export function interruptPerson(c: Community, p: Person, at: Minute, reason: string): void {
  if (!p.body.alive) return;
  const when = Math.max(p.now, at);
  if (interrupt(p, when, reason)) return;
  c.idleUntil[p.id] = Math.min(c.idleUntil[p.id] ?? when, when);
  c.interrupts[p.id] = { at: when, reason };
}

/** Whether `aff` starts the joint protocol here: tagged 'joint', not a mirror, with community partners. */
export function isJointOffer(c: Community, p: Person, aff: Affordance): boolean {
  if (aff.jointId !== undefined || !(aff.tags?.includes('joint') ?? false)) return false;
  return (aff.with ?? []).some((id) => id !== p.id && c.people.some((q) => q.id === id));
}

/** Default partner version of a joint offer: same activity, partners swapped, tagged 'joint' with `jointId`. */
export function mirrorAffordance(
  offer: Affordance,
  proposal: JointProposal,
  partnerId: PersonId,
): Affordance {
  const others = [proposal.proposerId, ...proposal.partnerIds].filter((id) => id !== partnerId);
  const tags = offer.tags?.includes('joint') ? [...offer.tags] : [...(offer.tags ?? []), 'joint'];
  const out: Affordance = {
    ...offer,
    id: `${offer.id}:joint:${proposal.proposerId}`,
    advertises: { ...offer.advertises },
    with: others,
    tags,
    jointId: proposal.id,
  };
  // Commitments and goals on the proposer's offer are the proposer's own.
  delete out.fulfills;
  delete out.advances;
  return out;
}

function mirrorFor(world: World, partner: Person, proposal: JointProposal): Affordance {
  const m =
    world.mirror?.(partner, proposal.offer, proposal) ??
    mirrorAffordance(proposal.offer, proposal, partner.id);
  return m.jointId === proposal.id ? m : { ...m, jointId: proposal.id };
}

const personById = (c: Community, id: PersonId): Person | undefined => c.people.find((q) => q.id === id);

function settle(c: Community, proposal: JointProposal, status: 'accepted' | 'declined'): void {
  proposal.status = status;
  const settled = c.joint.proposals.filter((x) => x.status !== 'pending');
  const excess = settled.length - MAX_SETTLED_PROPOSALS;
  if (excess > 0) {
    const drop = new Set(settled.slice(0, excess));
    c.joint.proposals = c.joint.proposals.filter((x) => !drop.has(x));
  }
}

/**
 * Register a joint proposal for `proposer`'s chosen `offer` and interrupt every partner at the proposer's minute
 * so they answer it then. Partners who are dead or already waiting on another proposal decline at once.
 * The proposer does not begin until `acceptJoint` settles it.
 */
export function proposeJoint(
  c: Community,
  proposer: Person,
  offer: Affordance,
  record: DecisionRecord,
): JointProposal {
  const partnerIds = [
    ...new Set((offer.with ?? []).filter((id) => id !== proposer.id && personById(c, id))),
  ].sort();
  const proposal: JointProposal = {
    id: `j${c.joint.nextId++}`,
    proposerId: proposer.id,
    partnerIds,
    offer: { ...offer, advertises: { ...offer.advertises } },
    record,
    at: proposer.now,
    accepted: [],
    partnerRecords: {},
    status: 'pending',
  };
  const busy = partnerIds.some((id) => {
    const q = personById(c, id);
    return !q?.body.alive || awaitingJoint(c, id);
  });
  c.joint.proposals.push(proposal);
  if (busy) {
    declineJoint(c, proposal, proposer);
    return proposal;
  }
  for (const id of partnerIds) {
    const q = personById(c, id);
    if (q) interruptPerson(c, q, proposer.now, `joint:${proposal.id}`);
  }
  return proposal;
}

/**
 * The partner declined (or could not answer): settle as declined, exclude the offer for the proposer at this
 * minute, and force the proposer to re-decide now.
 */
export function declineJoint(c: Community, proposal: JointProposal, proposer?: Person): void {
  if (proposal.status !== 'pending') return;
  settle(c, proposal, 'declined');
  const p = proposer ?? personById(c, proposal.proposerId);
  if (!p) return;
  const now = Math.max(p.now, proposal.at);
  const ex = c.joint.excluded[p.id];
  if (ex && ex.at === now) ex.ids.push(proposal.offer.id);
  else c.joint.excluded[p.id] = { at: now, ids: [proposal.offer.id] };
  interruptPerson(c, p, now, `declined:${proposal.id}`);
}

/**
 * A partner chose the mirror. When every partner has accepted, everyone begins the same minute: running
 * activities are resolved as interrupted first, then the proposer begins the offer and each partner their
 * mirror. Returns the activities begun (empty while other partners have yet to answer).
 */
export function acceptJoint(
  c: Community,
  world: World,
  proposal: JointProposal,
  partner: Person,
  partnerRecord: DecisionRecord,
  log: (e: SimEvent) => void = () => {},
): Activity[] {
  if (proposal.status !== 'pending' || !proposal.partnerIds.includes(partner.id)) return [];
  if (!proposal.accepted.includes(partner.id)) proposal.accepted.push(partner.id);
  proposal.partnerRecords[partner.id] = partnerRecord;
  if (proposal.accepted.length < proposal.partnerIds.length) return [];
  settle(c, proposal, 'accepted');
  const proposer = personById(c, proposal.proposerId);
  const participants: { person: Person; offer: Affordance; record: DecisionRecord }[] = [];
  if (proposer) participants.push({ person: proposer, offer: proposal.offer, record: proposal.record });
  for (const id of proposal.partnerIds) {
    const q = personById(c, id);
    const rec = proposal.partnerRecords[id];
    if (q && rec) participants.push({ person: q, offer: mirrorFor(world, q, proposal), record: rec });
  }
  const at = Math.max(...participants.map((x) => x.person.now));
  const begun: Activity[] = [];
  for (const { person, offer, record } of participants) {
    if (person.now < at) tick(person, at);
    const act = person.activity;
    if (act) {
      const outcome = world.resolve(person, act, at >= act.endsAt ? 'ended' : 'interrupted');
      finish(person, outcome);
      log({
        at,
        personId: person.id,
        kind: 'finish',
        detail: `${act.action} ${outcome.status}`,
        affordanceId: act.affordanceId,
        action: act.action,
        status: outcome.status,
      });
    }
    const started = begin(person, offer, record, {
      ...world.beginOptions?.(person, offer, record),
      jointId: proposal.id,
    });
    if (started) {
      begun.push(started);
      log({
        at,
        personId: person.id,
        kind: 'begin',
        detail: `${offer.label} (joint ${proposal.id})`,
        decisionId: record.id,
        affordanceId: offer.id,
        action: offer.action,
        jointId: proposal.id,
      });
    }
  }
  return begun;
}

/**
 * Chance that `lead` succeeds at a skilled task with `partners` helping: `successChance` with
 * support = Σ partner skill × partner capacity / max(difficulty, 0.1), clamped to 0..1.
 */
export function jointSuccessChance(
  lead: Person,
  partners: readonly Person[],
  skillId: string,
  difficulty: Unit,
): Unit {
  let support = 0;
  for (const q of partners) {
    if (q.id === lead.id || !q.body.alive) continue;
    support += skillLevel(q, skillId) * readBody(q).capacity;
  }
  support = clamp01(support / Math.max(0.1, clamp01(difficulty)));
  return successChance(lead, skillId, difficulty, readBody(lead).capacity, support);
}

/** Whether a perceived percept interrupts `p` (salient and targeting them or flagged near; `near: false` never). */
export function interrupts(p: Person, pc: Percept, salience: number): boolean {
  if (pc.near === false || pc.salience < salience) return false;
  return pc.targetId === p.id || pc.near === true;
}

/**
 * Advance the community to `until`, processing person events in (time, id) order. Returns the events.
 */
export function stepCommunity(c: Community, world: World, until: Minute, opts: StepOptions = {}): SimEvent[] {
  const events: SimEvent[] = [];
  const quantum = Math.max(1, opts.idleQuantum ?? SIM_DEFAULTS.idleQuantum);
  const maxEvents = opts.maxEvents ?? SIM_DEFAULTS.maxEvents;
  const salience = opts.interruptSalience ?? SIM_DEFAULTS.interruptSalience;
  // Communities created before joint support (plain JSON from an older host) get the new bookkeeping.
  c.interrupts ??= {};
  c.joint ??= { nextId: 0, proposals: [], excluded: {} };
  const log = (e: SimEvent) => {
    if (events.length < maxEvents) events.push(e);
  };
  const decideOpts = (p: Person, reason: string | undefined) => {
    const o: Parameters<typeof decide>[2] = {};
    const s = opts.suggestions?.[p.id];
    // At reviews the standing suggestion still weighs in, but `decide` resolves it quietly (no counters,
    // pressure or autonomy cost), so one request is not re-counted as many verdicts.
    if (s) o.suggestion = s;
    if (opts.necessity !== undefined) o.necessity = opts.necessity;
    const forced = reason ?? c.interrupts[p.id]?.reason;
    if (forced !== undefined && !p.activity) o.interrupt = forced;
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
      for (const x of pendingProposals(c))
        if (x.proposerId === p.id) settle(c, x, 'declined');
        else if (x.partnerIds.includes(p.id)) declineJoint(c, x);
      continue;
    }

    const since = c.perceivedUntil[p.id] ?? t;
    const percepts = world.perceptsFor(p, since, t);
    c.perceivedUntil[p.id] = t;
    let perceptReason: string | undefined;
    if (percepts.length > 0) {
      const attended = perceive(p, percepts);
      log({
        at: t,
        personId: p.id,
        kind: 'perceive',
        detail: `${attended.length}/${percepts.length} percepts`,
      });
      if (salience !== false) {
        const hit = attended.find((pc) => interrupts(p, pc, salience));
        if (hit) {
          perceptReason = `percept:${hit.kind}`;
          interruptPerson(c, p, t, perceptReason);
          log({ at: t, personId: p.id, kind: 'interrupt', detail: `percept:${hit.kind}` });
        }
      }
    }

    let act = p.activity;
    // An interrupt on an activity that ends at this event still reaches the next decision.
    perceptReason ??= act?.interrupt?.reason;
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

    // Offers: the world's, plus mirrors of joint proposals awaiting this person's answer, minus offers a partner
    // just declined (this minute only).
    const asked = pendingProposals(c).filter(
      (x) => x.partnerIds.includes(p.id) && !x.accepted.includes(p.id),
    );
    const mirrors = new Map<string, JointProposal>();
    let affordances = world.affordancesFor(p);
    for (const x of asked) {
      const m = mirrorFor(world, p, x);
      mirrors.set(m.id, x);
      affordances = [...affordances.filter((a) => a.id !== m.id), m];
    }
    const ex = c.joint.excluded[p.id];
    if (ex) {
      if (ex.at === t) affordances = affordances.filter((a) => !ex.ids.includes(a.id));
      else delete c.joint.excluded[p.id];
    }
    const record = decide(p, affordances, decideOpts(p, perceptReason));
    delete c.interrupts[p.id];
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

    // Answer every joint proposal put to this person: the chosen mirror accepts, the rest decline.
    const acceptedProposal =
      record.chosenAffordanceId !== null ? mirrors.get(record.chosenAffordanceId) : undefined;
    for (const x of asked) {
      if (x === acceptedProposal) continue;
      declineJoint(c, x);
      log({ at: t, personId: p.id, kind: 'decline', detail: `declined ${x.offer.label}`, jointId: x.id });
    }
    if (acceptedProposal) {
      log({
        at: t,
        personId: p.id,
        kind: 'accept',
        detail: `joins ${acceptedProposal.offer.label}`,
        jointId: acceptedProposal.id,
      });
      acceptJoint(c, world, acceptedProposal, p, record, log);
      continue;
    }

    const chosen = affordances.find((a) => a.id === record.chosenAffordanceId);
    const continuing =
      act !== null && (record.chosenAffordanceId === null || record.chosenAffordanceId === act.affordanceId);
    if (act && continuing) {
      reviewed(p);
      log({ at: t, personId: p.id, kind: 'continue', detail: act.action, affordanceId: act.affordanceId });
      continue;
    }
    if (chosen && isJointOffer(c, p, chosen)) {
      // The running activity (if any) continues until the partners answer.
      const proposal = proposeJoint(c, p, chosen, record);
      log({
        at: t,
        personId: p.id,
        kind: proposal.status === 'declined' ? 'decline' : 'propose',
        detail: `${chosen.label} with ${proposal.partnerIds.join(', ')}`,
        affordanceId: chosen.id,
        action: chosen.action,
        jointId: proposal.id,
      });
      continue;
    }
    if (act) {
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
    if (!chosen) {
      c.idleUntil[p.id] = t + quantum;
      log({ at: t, personId: p.id, kind: 'idle', detail: 'nothing chosen' });
      continue;
    }
    const started = begin(p, chosen, record, world.beginOptions?.(p, chosen, record));
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
