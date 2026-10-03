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
 *
 * Conventions added with engine 1.2.0 (all host-side plumbing over faculty APIs):
 * - Conversation: when an activity tagged 'conversation' (or whose action is 'talk'/'call') completes with a
 *   community partner (`targetId` or `with`), `converse` runs both ways at that minute. The listener is ticked to
 *   the minute first, then perceives the testimony and advice (advice percepts carry `Percept.advice`, so standing
 *   advice is remembered); the speaker's own deed tags (lying, backbiting) go through conscience; advice suggestions
 *   are queued host-side (`Community.queued`) for the listener's next fresh decision. `World.converse` may shape
 *   the context (topics, temptations) or veto with `false`.
 * - Several voices: `StepOptions.suggestions` accepts one or several standing suggestions per person; queued
 *   conversation suggestions join them, one per voice (the fresher wins).
 * - Scarcity: `World.scarcityFor` hands the person's material shortfall to every decision.
 * - Days: `World.onDay` fires at a person's first event in each new day (dawn hooks such as exemptions and
 *   prayer-time retiming live there, not in `affordancesFor`).
 * - Contagion (on by default): when an activity with community partners completes, every partner's contagious
 *   illness gets one `contagionRoll` against the finishing person for the activity's minutes, and theirs against
 *   each partner.
 * - Life course (opt in): once per day crossed, `chronicOnsets` and `mortalityEvent` roll on the person's own
 *   stream for the elapsed minutes; a death ends the person through `body.die`.
 */

import { appraise } from '../affect/index.ts';
import { BODY_DEFAULTS, contagionRoll, die, readBody, sicken } from '../body/index.ts';
import { chronicleBetween } from '../chronicle/index.ts';
import { recordDeed } from '../conscience/index.ts';
import { type ConverseContext, converse } from '../conversation/index.ts';
import { clamp01, dayOf } from '../core/index.ts';
import {
  type ChildSpec,
  type ChronicCondition,
  chronicOnsets,
  createChild,
  type HealthExposures,
  mortalityEvent,
} from '../lifecourse/index.ts';
import {
  type BeginOptions,
  begin,
  createPerson,
  decide,
  finish,
  interrupt,
  perceive,
  predict,
  reviewed,
  tick,
} from '../person.ts';
import { skillLevel, successChance } from '../skills/index.ts';
import { seedTie, socialEvent } from '../social/index.ts';
import type {
  Activity,
  Affordance,
  DayRecord,
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
import { MINUTES_PER_DAY } from '../types.ts';

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
  /** Optional: the person's material shortfall now, 0..1 (rent owed against what they earn); fed to every decision. */
  scarcityFor?(p: Person): Unit;
  /** Optional: called at the person's first event of each day (`day` = `dayOf(minute)`), before they perceive. */
  onDay?(p: Person, day: number): void;
  /**
   * Optional: the context for the conversation convention when `activity` (tagged 'conversation', or action
   * 'talk'/'call') completes between `speaker` and `listener`; `false` vetoes it, `undefined` uses `{ at, placeId }`.
   */
  converse?(
    speaker: Person,
    listener: Person,
    activity: Activity,
  ): Partial<ConverseContext> | false | undefined;
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
  | 'decline'
  | 'converse'
  | 'contagion';

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
  /** On 'converse' and 'contagion': the other person. */
  withId?: PersonId;
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
  // --- integration (2026-10-03) ---
  /** Host-side: suggestions heard in conversation, weighed at the next decisions and dropped after a fresh one. */
  queued?: Record<PersonId, Suggestion[]>;
  /** Host-side: the last day each person's `World.onDay` and life-course rolls ran for. */
  dayDone?: Record<PersonId, number>;
}

export interface LifecourseOptions {
  /** Roll `mortalityEvent` once per day crossed (default false). */
  mortality?: boolean;
  /** Roll `chronicOnsets` once per day crossed (default false). */
  chronicOnsets?: boolean;
  /** Extra multiplier on the mortality hazard (testing, compressed time). `mortalityHazard` caps the result at 1/year. */
  multiplier?: number;
  conditions?: readonly ChronicCondition[];
  /** Host-tracked exposures for `chronicOnsets` (smoking, ...). */
  exposures?(p: Person): HealthExposures | undefined;
}

export interface StepOptions {
  /** Standing suggestions, applied at every decision of that person (resolved quietly at reviews); one or several voices. */
  suggestions?: Record<PersonId, Suggestion | readonly Suggestion[]>;
  /** Contagion rolls between people who just shared an activity (default true). */
  contagion?: boolean;
  /** Life-course rolls (mortality, chronic onsets); default off. */
  lifecourse?: LifecourseOptions;
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
    queued: {},
    dayDone: {},
  };
}

/** Add a person to a community (a newborn, an arrival); keeps the id order the driver relies on. */
export function addPerson(c: Community, p: Person): void {
  if (c.people.some((q) => q.id === p.id)) return;
  c.people = [...c.people, p].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  c.idleUntil[p.id] = p.now;
  c.perceivedUntil[p.id] = p.now;
}

/**
 * A child of `a` and `b` is born into the community: `createChild` draws the spec, the person is created, the
 * parents' ties to the child are added through `social/`, and the child joins the community. Returns the child.
 */
export function birth(c: Community, a: Person, b: Person, spec: ChildSpec): Person {
  const { spec: childSpec, parentLinks } = createChild(a, b, spec);
  const child = createPerson(childSpec);
  for (const link of parentLinks) {
    const parent = link.parentId === a.id ? a : link.parentId === b.id ? b : personById(c, link.parentId);
    if (!parent) continue;
    seedTie(parent, { ...link.relationship, otherId: child.id });
  }
  addPerson(c, child);
  return child;
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

/** Community members the activity was with (its `with` and `targetId`), alive, other than `p`. */
function partnersOf(c: Community, p: Person, act: Activity): Person[] {
  const ids = new Set<PersonId>(act.affordance.with ?? []);
  if (act.targetId !== undefined) ids.add(act.targetId);
  const out: Person[] = [];
  for (const id of [...ids].sort()) {
    if (id === p.id) continue;
    const q = personById(c, id);
    if (q?.body.alive) out.push(q);
  }
  return out;
}

/**
 * Whether the just-finished activity `act` put its owner physically with `q` (contagion needs contact). Remote
 * activities (`call`, or tagged `remote`) never do, nor does a partner who is asleep (the same convention as
 * conversation: a one-sided visit is not contact). When both sides name a place (the activity's `placeId` and
 * the place of `q`'s current activity), they must match; when either is unknown the driver assumes co-presence.
 */
export function sharesPlace(q: Person, act: Pick<Activity, 'action' | 'affordance'>): boolean {
  if (act.action === 'call' || (act.affordance.tags?.includes('remote') ?? false)) return false;
  const here = act.affordance.placeId;
  if (q.body.asleep) return false;
  const qAct = q.activity;
  if (qAct && (qAct.action === 'call' || (qAct.affordance.tags?.includes('remote') ?? false))) return false;
  const there = qAct?.affordance.placeId;
  return here === undefined || there === undefined || here === there;
}

/** Whether an activity is a conversation under the driver's convention. */
export function isConversation(act: Pick<Activity, 'action' | 'affordance'>): boolean {
  return (
    (act.affordance.tags?.includes('conversation') ?? false) || act.action === 'talk' || act.action === 'call'
  );
}

/**
 * One direction of the conversation convention: `speaker` tells `listener` what `converse` chooses; the listener
 * perceives the testimony and advice (advice percepts carry `Percept.advice`), advice suggestions are queued for
 * the listener's next fresh decision, both relationships move, and the speaker's own deed tags go through
 * conscience.
 */
function converseOneWay(
  c: Community,
  speaker: Person,
  listener: Person,
  ctx: ConverseContext,
  log: (e: SimEvent) => void,
): void {
  const r = converse(speaker, listener, ctx);
  const percepts: Percept[] = [...r.told];
  for (const a of r.advice) {
    const entry: NonNullable<Percept['advice']>[number] = {
      action: a.action,
      strength: a.suggestion.strength,
    };
    if (a.suggestion.affordanceId !== undefined) entry.affordanceId = a.suggestion.affordanceId;
    a.percept.advice = [...(a.percept.advice ?? []), entry];
    percepts.push(a.percept);
  }
  if (percepts.length > 0) perceive(listener, percepts);
  if (r.advice.length > 0) {
    c.queued ??= {};
    const q = c.queued[listener.id] ?? [];
    c.queued[listener.id] = q;
    for (const a of r.advice) {
      const i = q.findIndex((s) => s.voiceId === a.suggestion.voiceId);
      if (i >= 0) q.splice(i, 1);
      q.push(a.suggestion);
    }
  }
  for (const ev of r.socialEvents.speaker) socialEvent(speaker, ev);
  for (const ev of r.socialEvents.listener) socialEvent(listener, ev);
  if (r.norms.length > 0) {
    const deed: Affordance = {
      id: `talk:${listener.id}:${ctx.at}`,
      action: 'talk',
      label: `talk with ${listener.name}`,
      duration: 0,
      effort: 0,
      advertises: {},
      targetId: listener.id,
      norms: r.norms,
    };
    for (const ev of recordDeed(speaker, deed, 'talk', ctx.at, true).appraisal) appraise(speaker, ev);
  }
  if (r.claims.length > 0 || r.advice.length > 0) {
    const parts: string[] = [];
    if (r.claims.length > 0) parts.push(`${r.claims.length} claim${r.claims.length === 1 ? '' : 's'}`);
    if (r.advice.length > 0) parts.push(`advice: ${r.advice.map((a) => a.action).join(', ')}`);
    if (r.deceit) parts.push('a lie');
    if (r.claims.some((x) => x.backbiting)) parts.push('backbiting');
    log({
      at: ctx.at,
      personId: speaker.id,
      kind: 'converse',
      detail: `told ${listener.name}: ${parts.join('; ')}`,
      withId: listener.id,
    });
  }
}

function converseBoth(
  c: Community,
  world: World,
  p: Person,
  q: Person,
  act: Activity,
  t: Minute,
  log: (e: SimEvent) => void,
): void {
  if (q.now < t) tick(q, t);
  // Non-joint conversation offers assume the partner is available; nobody talks with someone asleep.
  if (!q.body.alive || q.body.asleep) return;
  for (const [speaker, listener] of [
    [p, q],
    [q, p],
  ] as const) {
    const shaped = world.converse?.(speaker, listener, act);
    if (shaped === false) continue;
    const ctx: ConverseContext = { at: t, ...shaped };
    if (ctx.placeId === undefined && act.affordance.placeId !== undefined)
      ctx.placeId = act.affordance.placeId;
    converseOneWay(c, speaker, listener, ctx, log);
  }
}

/** Contagion both ways for the minutes `p` and `q` just spent together. */
function contagionBetween(p: Person, q: Person, act: Activity, t: Minute, log: (e: SimEvent) => void): void {
  const minutes = Math.max(0, t - act.startedAt);
  if (minutes <= 0) return;
  for (const [target, source] of [
    [p, q],
    [q, p],
  ] as const) {
    for (const ill of [...source.body.illnesses]) {
      if (!ill.contagious) continue;
      const caught = contagionRoll(target, ill, minutes, BODY_DEFAULTS);
      if (caught)
        log({
          at: t,
          personId: target.id,
          kind: 'contagion',
          detail: `caught ${caught.kind} from ${source.name}`,
          withId: source.id,
        });
    }
  }
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
  const contagion = opts.contagion ?? true;
  c.queued ??= {};
  c.dayDone ??= {};
  const decideOpts = (p: Person, reason: string | undefined) => {
    const o: Parameters<typeof decide>[2] = {};
    // Voices: queued conversation advice first (fresher), then the host's standing suggestions; one per voice.
    // At reviews they still weigh in, but `decide` resolves them quietly (no counters, pressure or autonomy
    // cost), so one request is not re-counted as many verdicts.
    const standing = opts.suggestions?.[p.id];
    const merged: Suggestion[] = [];
    const seen = new Set<string>();
    for (const s of [
      ...(c.queued?.[p.id] ?? []),
      ...(standing ? (Array.isArray(standing) ? standing : [standing]) : []),
    ]) {
      if (seen.has(s.voiceId)) continue;
      seen.add(s.voiceId);
      merged.push(s);
    }
    const [first, ...rest] = merged;
    if (first) o.suggestion = first;
    if (rest.length > 0) o.suggestions = rest;
    const scarcity = world.scarcityFor?.(p);
    if (scarcity !== undefined && scarcity > 0) o.scarcity = scarcity;
    if (opts.necessity !== undefined) o.necessity = opts.necessity;
    const forced = reason ?? c.interrupts[p.id]?.reason;
    if (forced !== undefined && !p.activity) o.interrupt = forced;
    return o;
  };

  // Pairs whose shared activity already ran its conversation and contagion at `pairMinute` (both partners
  // finishing the same joint activity at the same minute would otherwise run them twice).
  let pairMinute = Number.NEGATIVE_INFINITY;
  const pairsDone = new Set<string>();

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
    // First event of a new day: life-course rolls for the days crossed, then the host's day hook.
    const day = dayOf(t);
    const lastDay = c.dayDone[p.id];
    if (lastDay === undefined || day > lastDay) {
      c.dayDone[p.id] = day;
      const lc = opts.lifecourse;
      if (lc && lastDay !== undefined && p.body.alive) {
        const dt = (day - lastDay) * MINUTES_PER_DAY;
        if (lc.chronicOnsets) {
          const onsetOpts: Parameters<typeof chronicOnsets>[3] = {};
          if (lc.conditions) onsetOpts.conditions = lc.conditions;
          const ex = lc.exposures?.(p);
          if (ex) onsetOpts.exposures = ex;
          for (const ill of chronicOnsets(p, dt, p.rng, onsetOpts)) sicken(p, ill);
        }
        if (lc.mortality) {
          const roll = mortalityEvent(
            p,
            dt,
            p.rng,
            lc.multiplier !== undefined ? { multiplier: lc.multiplier } : {},
          );
          if (roll.died) die(p);
        }
      }
      if (p.body.alive) world.onDay?.(p, day);
    }
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
      if (outcome.status === 'completed') {
        if (pairMinute !== t) {
          pairMinute = t;
          pairsDone.clear();
        }
        for (const q of partnersOf(c, p, act)) {
          const key = p.id < q.id ? `${p.id}|${q.id}` : `${q.id}|${p.id}`;
          if (pairsDone.has(key)) continue;
          pairsDone.add(key);
          if (isConversation(act)) converseBoth(c, world, p, q, act, t, log);
          if (contagion && sharesPlace(q, act)) contagionBetween(p, q, act, t, log);
        }
      }
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
    // Conversation advice is weighed until the next fresh decision, then it has been heard.
    if (!act) delete c.queued[p.id];
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

export interface SilentRun {
  from: Minute;
  to: Minute;
  events: SimEvent[];
  /** Each person's day records for the run (closed days only). */
  chronicles: Record<PersonId, DayRecord[]>;
}

/**
 * Headless epilogue (N16): run the community `days` days with one voice muted, i.e. its standing suggestions
 * dropped, so a chronicle of the muted period can be diffed against the played one (`diffChronicle`). Everything
 * else about the run is the ordinary driver. Suggestions heard in conversation are not muted: those voices are
 * other people, not the player.
 */
export function runSilent(
  c: Community,
  world: World,
  days: number,
  opts: StepOptions & { mutedVoiceId?: PersonId } = {},
): SilentRun {
  const from = Math.min(...c.people.map((p) => p.now));
  const to = from + Math.max(0, days) * MINUTES_PER_DAY;
  const { mutedVoiceId, ...step } = opts;
  if (mutedVoiceId !== undefined && step.suggestions) {
    const kept: NonNullable<StepOptions['suggestions']> = {};
    for (const [id, s] of Object.entries(step.suggestions)) {
      const list = (Array.isArray(s) ? s : [s]).filter((x) => x.voiceId !== mutedVoiceId);
      if (list.length > 0) kept[id] = list;
    }
    step.suggestions = kept;
  }
  const events = stepCommunity(c, world, to, step);
  const chronicles: Record<PersonId, DayRecord[]> = {};
  for (const p of c.people)
    chronicles[p.id] = chronicleBetween(p.chronicle ?? [], dayOf(from), dayOf(to) - 1);
  return { from, to, events, chronicles };
}
