/**
 * The Human side on @adam0white/human-framework (spec §5, §7): six people who decide for themselves inside a host world.
 * The player's orders become standing suggestions (strength, insist, appeal) re-weighed at each of that
 * person's decisions until the job is done, refused, cancelled or lapsed. Verdicts, thoughts, the why panel,
 * the trust meter and the telegraph all read framework records; nothing here decides for a person.
 */
import {
  type Community,
  createCommunity,
  createPerson,
  interruptPerson,
  type Person,
  preview,
  restore as restorePerson,
  type SimEvent,
  type Suggestion,
  snapshot as snapshotPerson,
  stepCommunity,
} from '@adam0white/human-framework';
import { fw, HOST_NORMS, villagerPersonSpec } from './human-cast.ts';
import {
  type Bubble,
  emptyHumanEvents,
  type HumanMetrics,
  type HumanSide,
  type HumanSideEvents,
  type HumanVerdict,
  type MomentId,
  type Prediction,
  type VillagerState,
  type VillagerView,
  type WhyBreakdown,
} from './human-side.ts';
import {
  capital,
  emotionOf,
  needsOf,
  sayLine,
  thoughtText,
  trustOf,
  type VerdictKind,
  verdictKind,
  whyOf,
} from './human-view.ts';
import { ColonyHostWorld, createHostState, type HostState } from './human-world.ts';
import { type GameMap, placeById } from './map.ts';
import type { HumanOrder } from './orders.ts';
import {
  adhanAt,
  JOBS,
  type Minute,
  ORDER_LIFETIME,
  PRAYER_TIMES,
  type SideWorld,
  START_CLOCK,
  type VillagerId,
  type VillagerSpec,
} from './world-types.ts';

/** How long a bubble stays in the view, in sim minutes (the UI adds real-time minimums). */
const BUBBLE_MINUTES = 40;
/** At most one unprompted thought per person per this many minutes. */
const THOUGHT_GAP = 90;
/** Perceived hunger at which a carrier counts as hungry for moment 1. */
const HUNGRY = 0.35;
/** Moment 2 compares two answers to the same job at least this many minutes apart (dawn and dusk). */
const MOMENT2_GAP = 6 * 60;

interface OpenOrder {
  order: HumanOrder;
  /** Framework minute the order reached the person. */
  since: number;
  lastKind: VerdictKind | null;
  /** Counter-offer of the last "not now", so a new reason ("after I drink" then "after Maghrib") is shown. */
  lastCounter?: string;
  /** He has said yes (or complied) to this order at least once. */
  agreed?: boolean;
  /** He has begun the ordered job in a session started after the order reached him. */
  begun?: boolean;
}

interface SideState {
  minute: Minute;
  orders: Record<string, OpenOrder | null>;
  bubbles: Record<string, Bubble>;
  seq: number;
  lastThought: Record<string, Minute>;
  lastAction: Record<string, string | null>;
  /** Orders each person said yes to (moment 2 needs an earlier yes to the same job on another order). */
  assented: Record<string, { action: string; orderId: string; minute: Minute }[]>;
  moments: MomentId[];
  prayersDue: number;
  prayersKept: number;
  dead: string[];
}

interface SideSnapshot {
  s: SideState;
  host: HostState;
  people: Person[];
  community: Omit<Community, 'people'>;
}

const ORDER_TEXT: Record<string, string> = {
  'gather-grain': 'Gather grain',
  'gather-timber': 'Gather timber',
  'fell-cedar': 'Fell the cedar',
  'draw-water': 'Draw water',
  cook: 'Cook',
  build: 'Build',
  'raise-beam': 'Raise the beam',
  'shutter-house': 'Shutter the house',
  eat: 'Eat',
  pray: 'Pray',
  shelter: 'Shelter',
  sleep: 'Sleep',
  rest: 'Rest',
  'carry-injured': 'Carry the injured',
};

const DOING: Record<string, string> = {
  'gather-grain': 'Gathering grain',
  'gather-timber': 'Gathering timber',
  'fell-cedar': 'Felling the cedar',
  'draw-water': 'Drawing water',
  drink: 'Drinking',
  cook: 'Cooking',
  build: 'Building',
  'raise-beam': 'Raising the beam',
  'shutter-house': 'Shuttering the house',
  eat: 'Eating',
  shelter: 'Sheltering',
  sleep: 'Asleep',
  rest: 'Resting',
  'tend-injured': 'Tending the injured',
  'take-grain': 'Taking grain',
  wait: 'Lying hurt, waiting for help',
};

export class FrameworkHumanSide implements HumanSide {
  readonly kind = 'framework';
  private seed = 0;
  private specs: readonly VillagerSpec[] = [];
  private host: ColonyHostWorld | null = null;
  private s: SideState = {
    minute: 0,
    orders: {},
    bubbles: {},
    seq: 0,
    lastThought: {},
    lastAction: {},
    assented: {},
    moments: [],
    prayersDue: 0,
    prayersKept: 0,
    dead: [],
  };

  init(seed: number, villagers: readonly VillagerSpec[], world: SideWorld, map: GameMap): void {
    this.seed = seed;
    this.specs = villagers;
    const people = villagers.map((v) => createPerson(villagerPersonSpec(seed, v)));
    const community = createCommunity(people);
    this.host = new ColonyHostWorld(seed, map, world, createHostState(villagers), community);
    // Stagger the first thoughts so six clouds do not open over the map at 05:00 (one may; others when they next change).
    for (const [i, v] of villagers.entries()) {
      this.s.orders[v.id] = null;
      this.s.lastThought[v.id] = -THOUGHT_GAP + 30 * i;
      this.s.lastAction[v.id] = null;
      this.s.assented[v.id] = [];
    }
  }

  /** The host's norm catalog (for model notes and tests). */
  static readonly norms = HOST_NORMS;

  private get world(): ColonyHostWorld {
    if (!this.host) throw new Error('FrameworkHumanSide used before init');
    return this.host;
  }

  private get community(): Community {
    return this.world.community;
  }

  person(id: string): Person {
    const p = this.community.people.find((q) => q.id === id);
    if (!p) throw new Error(`unknown person ${id}`);
    return p;
  }

  private bubble(b: Omit<Bubble, 'id' | 'minute'>, ev: HumanSideEvents): Bubble {
    this.s.seq += 1;
    const full: Bubble = { ...b, id: `h${this.s.seq}`, minute: this.s.minute };
    this.s.bubbles[b.personId] = full;
    ev.bubbles.push(full);
    return full;
  }

  private moment(id: MomentId, personId: VillagerId, line: string, ev: HumanSideEvents): void {
    if (this.s.moments.includes(id)) return;
    this.s.moments.push(id);
    ev.moments.push({ id, minute: this.s.minute, personId, line });
  }

  private suggestions(): Record<string, Suggestion> {
    const out: Record<string, Suggestion> = {};
    for (const [id, o] of Object.entries(this.s.orders)) if (o) out[id] = o.order.suggestion;
    return out;
  }

  private drop(personId: string): void {
    this.s.orders[personId] = null;
    this.world.s.orderKey[personId] = null;
  }

  step(untilMinute: Minute, orders: readonly HumanOrder[]): HumanSideEvents {
    const ev = emptyHumanEvents();
    const world = this.world;
    const m = untilMinute - 1;
    const t = fw(m);
    this.s.minute = m;
    world.clock = t;
    world.events = { injuries: [], carried: [], beams: [], finished: [] };

    const adhan = adhanAt(m);
    const prayer = adhan ? (PRAYER_TIMES.find((x) => x.id === adhan)?.label ?? adhan) : null;
    world.minute(m, prayer);
    if (adhan) {
      this.s.prayersDue += this.specs.filter((v) => v.prays && this.person(v.id).body.alive).length;
    }

    // The role goal is a standing vocation, not a task that ends: the host renews it each dawn.
    if (m > 0 && (fw(m) - START_CLOCK) % 1440 === 0) {
      for (const p of this.community.people) {
        for (const g of p.agenda.goals) {
          if (g.id !== 'role') continue;
          g.progress = 0;
          g.status = 'active';
        }
      }
    }

    for (const o of orders) {
      const p = this.person(o.personId);
      // `since` marks the advice as new: without it the framework counts an earlier completion of the same action
      // (her noon pot) as already satisfying it and never weighs it (the 2026-10-07 export, D2 16:00).
      this.s.orders[o.personId] = {
        order: { ...o, suggestion: { ...o.suggestion, since: t } },
        since: t,
        lastKind: null,
      };
      world.s.orderKey[o.personId] = o.rollKey;
      interruptPerson(this.community, p, t, `order:${o.orderId}`);
    }

    const live = this.suggestions();
    // An order is done by a job begun after it was given, not by finishing what he was already doing.
    world.onOrderDone = (id, action, startedAt) => {
      const open = this.s.orders[id];
      if (open?.order.action === action && startedAt >= open.since) delete live[id];
    };
    const events = stepCommunity(this.community, world, t, { suggestions: live });
    world.onOrderDone = null;
    this.readEvents(events, ev);
    this.readHost(ev);
    for (const [id, o] of Object.entries(this.s.orders)) {
      const act = o && !o.begun ? this.person(id).activity : undefined;
      if (o && act?.action === o.order.action && act.startedAt >= o.since) o.begun = true;
    }

    for (const p of this.community.people) {
      if (p.body.alive || this.s.dead.includes(p.id)) continue;
      this.s.dead.push(p.id);
      world.world.deaths += 1;
      ev.deaths.push(p.id as VillagerId);
      this.drop(p.id);
    }
    world.prune();
    this.s.minute = untilMinute;
    return ev;
  }

  private readEvents(events: readonly SimEvent[], ev: HumanSideEvents): void {
    for (const e of events) {
      const id = e.personId as VillagerId;
      if (e.kind === 'finish' && e.action === 'pray' && e.status === 'completed') {
        if (this.specs.find((v) => v.id === id)?.prays) this.s.prayersKept += 1;
        continue;
      }
      if (e.kind !== 'decide' || !e.decisionId) continue;
      const p = this.person(id);
      const record = p.trace.find((r) => r.id === e.decisionId);
      if (!record) continue;
      const open = this.s.orders[id];
      // The player's resolution: the credited one, or among the voices when a villager's advice was also weighed.
      const r =
        record.suggestion?.voiceId === 'player'
          ? record.suggestion
          : record.suggestions?.find((x) => x.voiceId === 'player');
      if (open && r && r.voiceId === 'player' && record.at >= open.since) {
        const kind = verdictKind(r);
        const counter = r.counterOffer?.label ?? (kind === 'notNow' ? r.says : undefined);
        if (kind === open.lastKind && (kind !== 'notNow' || counter === open.lastCounter)) continue;
        if (kind === 'notNow' && r.reason.startsWith('need:') && open.agreed) {
          // A drink or a meal in the middle of a job he already said yes to is a pause, not a new answer: the card
          // keeps its verdict (no flip to "not now" and back to "yes"); the pause shows as a thought.
          if (this.s.minute - (this.s.lastThought[id] ?? -THOUGHT_GAP) >= 30) {
            this.s.lastThought[id] = this.s.minute;
            this.bubble({ personId: id, kind: 'thought', text: sayLine(r), decisionId: record.id }, ev);
          }
          if (record.chosenAction) this.s.lastAction[id] = record.chosenAction;
          continue;
        }
        if (kind === 'cannot' && r.reason === 'unavailable' && open.lastKind !== null) {
          // The job went away after a yes (someone else shuttered, the beam is up): the card settles.
          ev.completed.push({ orderId: open.order.orderId, personId: id });
          this.drop(id);
          continue;
        }
        const says = sayLine(r);
        const verdict: HumanVerdict = {
          orderId: open.order.orderId,
          personId: id,
          kind,
          says,
          reason: r.reason,
          decisionId: record.id,
          ...(counter ? { counterOffer: counter } : {}),
        };
        (open.lastKind === null ? ev.verdicts : ev.updates).push(verdict);
        open.lastKind = kind;
        if (kind === 'assent' || kind === 'complied') open.agreed = true;
        if (counter) open.lastCounter = counter;
        else delete open.lastCounter;
        this.bubble(
          {
            personId: id,
            kind,
            text: says,
            orderId: open.order.orderId,
            decisionId: record.id,
            ...(r.counterOffer ? { counterOffer: r.counterOffer.label } : {}),
            ...(kind === 'complied' ? { orderText: ORDER_TEXT[open.order.action] ?? open.order.action } : {}),
          },
          ev,
        );
        this.judgeVerdict(id, open.order, kind, r.reason, verdict, ev);
        if (kind === 'cannot' || kind === 'willNot') this.drop(id);
        if (record.chosenAction) this.s.lastAction[id] = record.chosenAction;
        continue;
      }
      if (open && !r && open.lastKind === null && record.at >= open.since) {
        // The job is not on offer to them now, so the framework does not hear the order: answer it here (Classic's
        // "could not (reason)") instead of leaving the card silent until it lapses. A "not now" keeps the order
        // standing, so it is heard and weighed once the job is on offer again.
        const no = this.world.notOffered(p, open.order.action);
        const verdict: HumanVerdict = {
          orderId: open.order.orderId,
          personId: id,
          kind: no.kind,
          says: no.says,
          reason: 'unavailable',
          decisionId: record.id,
          ...(no.counterOffer ? { counterOffer: no.counterOffer } : {}),
        };
        ev.verdicts.push(verdict);
        open.lastKind = no.kind;
        if (no.counterOffer) open.lastCounter = no.counterOffer;
        this.bubble(
          {
            personId: id,
            kind: no.kind,
            text: no.says,
            orderId: open.order.orderId,
            decisionId: record.id,
            ...(no.counterOffer ? { counterOffer: no.counterOffer } : {}),
          },
          ev,
        );
        if (no.kind === 'cannot') this.drop(id);
        if (record.chosenAction) this.s.lastAction[id] = record.chosenAction;
        continue;
      }
      // Unprompted: a thought cloud only when the chosen action changes.
      if (
        record.review &&
        (record.chosenAffordanceId === null || record.chosenAffordanceId === p.activity?.affordanceId)
      )
        continue;
      const action = record.chosenAction;
      const prev = this.s.lastAction[id] ?? null;
      this.s.lastAction[id] = action;
      if (!action || action === prev) continue;
      const last = this.s.lastThought[id] ?? -THOUGHT_GAP;
      if (this.s.minute - last < THOUGHT_GAP) continue;
      const cur = this.s.bubbles[id];
      if (cur && cur.kind !== 'thought' && this.s.minute - cur.minute < BUBBLE_MINUTES) continue;
      this.s.lastThought[id] = this.s.minute;
      this.bubble({ personId: id, kind: 'thought', text: thoughtText(p, record), decisionId: record.id }, ev);
    }
  }

  /** Moments 2, 3 and 5 are verdicts (spec §7). */
  private judgeVerdict(
    id: VillagerId,
    order: HumanOrder,
    kind: VerdictKind,
    reason: string,
    v: HumanVerdict,
    ev: HumanSideEvents,
  ): void {
    const list = this.s.assented[id] ?? [];
    if (kind === 'assent') {
      list.push({ action: order.action, orderId: order.orderId, minute: this.s.minute });
      this.s.assented[id] = list;
    }
    const earlier = list.find(
      (a) =>
        a.action === order.action && a.orderId !== order.orderId && this.s.minute - a.minute >= MOMENT2_GAP,
    );
    if (id === 'yusuf' && kind === 'notNow' && /pray/i.test(v.counterOffer ?? '') && earlier) {
      this.moment(2, id, `Same man, same job: yes in the morning, “${v.counterOffer}” at dusk.`, ev);
    }
    if (id === 'maryam' && kind === 'willNot' && reason === 'norm:abandon-dependents') {
      this.moment(3, id, 'Maryam will not leave the meal undone.', ev);
    }
    if (id === 'tariq' && kind === 'willNot' && reason === 'distrust') {
      this.moment(5, id, `Tariq refuses: “${v.says}”`, ev);
    }
  }

  /** Host-side happenings: injuries, carries (moment 1), the beam (moment 4), finished orders. */
  private readHost(ev: HumanSideEvents): void {
    const he = this.world.events;
    ev.injuries.push(...he.injuries);
    for (const c of he.carried) {
      if (c.hunger >= HUNGRY) {
        const name = (x: string) => this.person(x).name.replace(/^Hajja /, '');
        this.moment(1, c.carrier, `${name(c.carrier)} carried ${name(c.victim)} home before eating.`, ev);
      }
    }
    for (const b of he.beams) {
      if (b.ok && b.partners.length > 0) {
        const name = (x: string) => this.person(x).name;
        this.moment(
          4,
          b.lead,
          `${name(b.lead)} and ${b.partners.map(name).join(', ')} raised the beam together.`,
          ev,
        );
      }
    }
    for (const f of he.finished) {
      if (f.status === 'interrupted') continue;
      const open = this.s.orders[f.personId];
      if (!open || open.order.action !== f.action || f.startedAt < open.since) continue;
      ev.completed.push({ orderId: open.order.orderId, personId: f.personId });
      this.drop(f.personId);
    }
  }

  cancel(orderId: string): void {
    for (const [id, o] of Object.entries(this.s.orders)) {
      if (o?.order.orderId !== orderId) continue;
      // The person re-weighs without it at their next review (a lapse does not yank anyone off a job).
      this.drop(id);
    }
  }

  working(orderId: string): boolean {
    for (const [id, o] of Object.entries(this.s.orders)) {
      if (o?.order.orderId !== orderId || !o.begun) continue;
      const act = this.person(id).activity;
      // At the job now: no limit. Paused for a drink, a meal or a prayer: up to twice the order lifetime.
      if (act?.action === o.order.action) return true;
      return fw(this.s.minute) - o.since < 2 * ORDER_LIFETIME;
    }
    return false;
  }

  // --- view ---------------------------------------------------------------------------------------

  view(): VillagerView[] {
    const world = this.world;
    const t = fw(this.s.minute);
    return this.specs.map((v) => {
      const p = this.person(v.id);
      const pos = world.posAt(v.id, t);
      const trip = world.s.trip[v.id] ?? null;
      const cas = world.s.down[v.id] ?? null;
      const act = p.activity;
      const walking = world.walking(v.id, t);
      let state: VillagerState = 'idle';
      let label = 'Idle';
      if (!p.body.alive) {
        state = 'dead';
        label = 'Dead';
      } else if (cas?.carriedBy) {
        state = 'carried';
        label = `Carried by ${this.person(cas.carriedBy).name.replace(/^Hajja /, '')}`;
      } else if (cas) {
        state = 'down';
        label = DOING.wait ?? 'Hurt';
      } else if (p.body.asleep && !(act && walking && trip?.placeId)) {
        // The framework marks a sleeper asleep when the sleep begins; on this host he still walks home first.
        state = 'asleep';
        label = 'Asleep';
      } else if (act && trip?.carry) {
        state = 'carrying';
        const name = this.person(trip.carry.victim).name.replace(/^Hajja /, '');
        label =
          t - trip.startedAt < world.travel(trip.from, trip.carry.at)
            ? `Going to ${name}`
            : `Carrying ${name} home`;
      } else if (act && walking && trip?.placeId) {
        state = 'walking';
        label = `Walking to ${placeById(trip.placeId).label.split(' ·')[0]}`;
      } else if (act) {
        const a = act.action;
        state =
          a === 'eat' || a === 'drink'
            ? 'eating'
            : a === 'pray'
              ? 'praying'
              : a === 'shelter'
                ? 'sheltering'
                : a === 'rest' || a === 'tend-injured'
                  ? 'resting'
                  : 'working';
        label =
          a === 'pray'
            ? capital(act.affordance.label.replace(/^pray/, 'praying'))
            : (DOING[a] ?? capital(act.affordance.label));
        if ((world.s.recovering[v.id] ?? 0) > t && a === 'rest') label = 'Recovering at home';
      }
      const b = this.s.bubbles[v.id];
      const live = b && this.s.minute - b.minute <= BUBBLE_MINUTES ? b : null;
      const carrying =
        trip?.carry && world.s.down[trip.carry.victim]?.carriedBy === v.id ? trip.carry.victim : null;
      const last = p.trace[p.trace.length - 1];
      const view: VillagerView = {
        id: v.id,
        name: v.name,
        role: v.role,
        x: pos.x,
        y: pos.y,
        state,
        action: act && act.action in JOBS ? (act.action as VillagerView['action']) : null,
        placeId: trip?.placeId ?? null,
        label,
        hp: Math.round(p.body.health * 100),
        needs: needsOf(p),
        emotion: emotionOf(p),
        trust: trustOf(p),
        bubble: live,
        protest: act?.protest === true,
        carrying,
        carriedBy: cas?.carriedBy ?? null,
        lastDecisionId: last?.id ?? null,
      };
      return view;
    });
  }

  why(personId: VillagerId, decisionId?: string): WhyBreakdown | null {
    const p = this.person(personId);
    const record = decisionId
      ? p.trace.find((r) => r.id === decisionId)
      : ([...p.trace].reverse().find((r) => !r.review || r.suggestion) ?? p.trace[p.trace.length - 1]);
    if (!record) return null;
    return whyOf(p, record, trustOf(p));
  }

  predict(order: Omit<HumanOrder, 'orderId'>): Prediction {
    const p = this.person(order.personId);
    const base = { personId: order.personId, action: order.action };
    if (!p.body.alive) return { ...base, kind: 'cannot', text: 'Can’t: dead' };
    const affs = this.world.affordancesFor(p);
    const r = preview(p, affs, order.suggestion);
    const no = r.reason === 'unavailable' ? this.world.notOffered(p, order.action) : null;
    const kind = no?.kind ?? verdictKind(r);
    const reason = no?.short ?? readableReason(r.reason);
    const text =
      kind === 'assent'
        ? 'Likely yes'
        : kind === 'complied'
          ? `Under protest: ${reason}`
          : kind === 'notNow'
            ? `Later: ${r.counterOffer?.label ?? reason}`
            : kind === 'cannot'
              ? `Can’t: ${reason}`
              : `Will refuse: ${reason}`;
    return { ...base, kind, text, ...(r.likelihood !== undefined ? { likelihood: r.likelihood } : {}) };
  }

  metrics(): HumanMetrics {
    const people = this.community.people;
    const alive = people.filter((p) => p.body.alive);
    const trusts = this.specs.map((v) => trustOf(this.person(v.id)).value);
    const morale =
      alive.length === 0 ? 0 : alive.reduce((s, p) => s + p.affect.mood.valence, 0) / alive.length;
    return {
      prayersKept: this.s.prayersKept,
      prayersDue: this.s.prayersDue,
      morale: Math.round(morale * 100) / 100,
      trust: trusts.reduce((a, b) => a + b, 0) / Math.max(1, trusts.length),
      alive: alive.length,
    };
  }

  /** Moments fired so far (tests). */
  firedMoments(): readonly MomentId[] {
    return this.s.moments;
  }

  snapshot(): unknown {
    const { people, ...community } = this.community;
    const snap: SideSnapshot = {
      s: structuredClone(this.s),
      host: structuredClone(this.world.s),
      people: people.map(snapshotPerson),
      community: structuredClone(community),
    };
    return snap;
  }

  restore(snapshot: unknown): void {
    const snap = structuredClone(snapshot) as SideSnapshot;
    const people = snap.people.map((x) => restorePerson(x));
    const community: Community = { ...snap.community, people };
    const old = this.world;
    this.host = new ColonyHostWorld(this.seed, old.map, old.world, snap.host, community);
    this.s = snap.s;
  }
}

function readableReason(reason: string): string {
  if (reason.startsWith('need:'))
    return (
      { food: 'hungry', water: 'thirsty', sleep: 'tired', rest: 'worn out' }[reason.slice(5)] ??
      reason.slice(5)
    );
  if (reason.startsWith('norm:')) return reason.slice(5).replace(/-/g, ' ');
  if (reason.startsWith('commitment:')) return 'something is due';
  if (reason.startsWith('skill:')) return 'doesn’t know how';
  if (reason === 'distrust') return 'doesn’t trust you';
  return reason.replace(/-/g, ' ');
}

export const createFrameworkHumanSide = (): HumanSide => new FrameworkHumanSide();
