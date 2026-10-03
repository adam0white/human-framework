/**
 * The lockstep engine: one clock, one order book, two worlds. Each sim minute it applies due orders to
 * both sides at the same boundary, applies world weather to both worlds, steps Classic, steps the
 * HumanSide, and settles cards. No DOM and no wall clock: the worker decides how many minutes to advance.
 */
import { ClassicSim, classicLabel, unitState } from './classic.ts';
import type {
  BubbleKind,
  HumanSide,
  HumanSideFactory,
  MomentId,
  Prediction,
  VillagerState,
  VillagerView,
  WhyBreakdown,
} from './human-side.ts';
import { MAP } from './map.ts';
import {
  type ChipState,
  fanOut,
  inferAction,
  type Order,
  OrderBook,
  type OrderCard,
  type OrderInput,
} from './orders.ts';
import {
  applyWorldMinute,
  at,
  createSideWorld,
  darkness,
  END_MINUTE,
  formatClock,
  HOUSE_STAGES,
  type Minute,
  type Resources,
  type Role,
  type SideWorld,
  VILLAGERS,
  type VillagerId,
  type Weather,
  weatherAt,
} from './world-types.ts';

export const SCENARIO_VERSION = 'colony-scenario@1';
export const DEFAULT_SEED = 20261003;

export interface UnitView {
  id: VillagerId;
  name: string;
  role: Role;
  x: number;
  y: number;
  state: VillagerState;
  label: string;
  hunger: number;
  hp: number;
  rush: boolean;
  carrying: VillagerId | null;
  carriedBy: VillagerId | null;
}

export interface WorldView {
  resources: Resources;
  houseStage: number;
  shuttered: boolean;
  cedarFelled: boolean;
  injuries: number;
  deaths: number;
}

export interface SideScore {
  meals: number;
  housePct: number;
  injuries: number;
  alive: number;
}

export interface Scoreboard {
  classic: SideScore;
  human: SideScore & { prayersKept: number; prayersDue: number; morale: number; trust: number };
}

/** Director nudges (spec §7): suggested orders on the clock; the player can issue or swipe them away. */
export interface Nudge {
  id: string;
  minute: Minute;
  until: Minute;
  text: string;
  order: OrderInput;
  /** Pre-highlight the Insist toggle once (moment 5). */
  insistHint?: boolean;
}

export const NUDGES: readonly Nudge[] = [
  {
    // Moment 2 needs the dawn yes to compare with the dusk answer.
    id: 'dawn-site',
    minute: at(1, 5, 30),
    until: at(1, 6, 30),
    text: 'First light. Send Yusuf to the building site?',
    order: { personId: 'yusuf', placeId: 'site' },
  },
  {
    id: 'cedar',
    minute: at(1, 8, 0),
    until: at(1, 9, 0),
    text: 'Idris could take the big cedar — three timber in one go.',
    order: { personId: 'idris', placeId: 'cedar' },
  },
  {
    id: 'cook-forest',
    minute: at(1, 10, 45),
    until: at(1, 11, 45),
    text: 'Timber is short. Maryam is free until noon.',
    order: { personId: 'maryam', placeId: 'forest' },
  },
  {
    id: 'dusk-site',
    minute: at(1, 18, 25),
    until: at(1, 19, 25),
    text: 'Light’s going. Send Yusuf back to the site?',
    order: { personId: 'yusuf', placeId: 'site' },
  },
  {
    id: 'squall-tariq',
    minute: at(1, 21, 35),
    until: at(1, 22, 35),
    text: 'Timber is short; Tariq is awake.',
    order: { personId: 'tariq', placeId: 'forest' },
    insistHint: true,
  },
  {
    // Moment 5: the morning after the squall, the same order again.
    id: 'tariq-again',
    minute: at(2, 7, 0),
    until: at(2, 8, 0),
    text: 'Morning. Timber is still short. Send Tariq to the forest?',
    order: { personId: 'tariq', placeId: 'forest' },
  },
  {
    id: 'storm-shutter',
    minute: at(2, 16, 5),
    until: at(2, 18, 0),
    text: 'The sky is darkening. Someone should shutter the house.',
    order: { personId: 'yusuf', placeId: 'site' },
  },
];

export interface MomentRecord {
  id: MomentId;
  minute: Minute;
  personId: VillagerId;
  line: string;
}

/** One player action at the sim minute it was applied: with the seed, enough to replay a run (`replay`). */
export type LogEntry =
  | { minute: Minute; kind: 'order'; input: OrderInput }
  | { minute: Minute; kind: 'cancel'; orderId: string }
  | { minute: Minute; kind: 'dismiss'; nudgeId: string };

export interface EndSummary {
  scoreboard: Scoreboard;
  /** Headless solo control: Human people, same seed, no orders. */
  solo: Scoreboard['human'];
  moments: MomentRecord[];
  orders: number;
}

export interface Frame {
  minute: Minute;
  clock: string;
  weather: Weather;
  darkness: number;
  classic: UnitView[];
  human: VillagerView[];
  classicWorld: WorldView;
  humanWorld: WorldView;
  scoreboard: Scoreboard;
  cards: OrderCard[];
  nudges: Nudge[];
  /** Moments fired so far, in order (the UI captions each new one). */
  moments: MomentRecord[];
  humanKind: string;
  ended: boolean;
}

const VERDICT_CHIP: Record<Exclude<BubbleKind, 'thought'>, ChipState> = {
  assent: 'assent',
  notNow: 'notNow',
  complied: 'complied',
  cannot: 'cannot',
  willNot: 'willNot',
};

function worldView(w: SideWorld): WorldView {
  return {
    resources: { ...w.resources },
    houseStage: w.house.stage,
    shuttered: w.house.shuttered,
    cedarFelled: w.cedarFelled,
    injuries: w.injuries,
    deaths: w.deaths,
  };
}

function sideScore(w: SideWorld, alive: number): SideScore {
  return {
    meals: w.resources.meals,
    housePct: Math.round((100 * w.house.stage) / HOUSE_STAGES),
    injuries: w.injuries,
    alive,
  };
}

export class ColonyGame {
  readonly seed: number;
  minute: Minute = 0;
  readonly book = new OrderBook();
  readonly classicWorld: SideWorld = createSideWorld();
  readonly humanWorld: SideWorld = createSideWorld();
  readonly classic: ClassicSim;
  readonly human: HumanSide;
  readonly moments: MomentRecord[] = [];
  /** Player actions in the order applied (see `LogEntry`). */
  readonly log: LogEntry[] = [];
  private dismissed = new Set<string>();
  private readonly factory: HumanSideFactory;

  constructor(seed: number, factory: HumanSideFactory) {
    this.seed = seed;
    this.factory = factory;
    this.classic = new ClassicSim(seed, VILLAGERS, this.classicWorld);
    this.human = factory();
    this.human.init(seed, VILLAGERS, this.humanWorld, MAP);
  }

  get ended(): boolean {
    return this.minute >= END_MINUTE;
  }

  /** Stamp an order at the current minute; it applies to both sides at the next step. */
  issue(input: OrderInput): Order | null {
    if (this.ended) return null;
    this.log.push({ minute: this.minute, kind: 'order', input: structuredClone(input) });
    const action = inferAction(input.placeId, {
      minute: this.minute,
      house: this.humanWorld.house,
      cedarFelled: this.humanWorld.cedarFelled,
    });
    // Issuing a card's order settles that card only, not later cards with the same person and place.
    // A card's order keys the shared scenario rolls (the cedar) by the card's minute, so the seeded outcome the
    // card was written for does not depend on how quickly the player taps it. Its lifetime still runs from now.
    let rollKey = this.minute;
    for (const n of this.visibleNudges()) {
      if (n.order.personId !== input.personId || n.order.placeId !== input.placeId) continue;
      this.dismissed.add(n.id);
      rollKey = n.minute;
    }
    return this.book.issue(input, this.minute, action, rollKey);
  }

  cancel(orderId: string): void {
    if (this.ended) return;
    this.log.push({ minute: this.minute, kind: 'cancel', orderId });
    if (!this.book.cancel(orderId)) return;
    this.classic.cancel(orderId);
    this.human.cancel(orderId);
  }

  dismissNudge(id: string): void {
    if (this.ended) return;
    this.log.push({ minute: this.minute, kind: 'dismiss', nudgeId: id });
    this.dismissed.add(id);
  }

  /** Re-run a seed and a player log from the start (determinism check and shareable runs). */
  static replay(
    seed: number,
    factory: HumanSideFactory,
    log: readonly LogEntry[],
    until = END_MINUTE,
  ): ColonyGame {
    const g = new ColonyGame(seed, factory);
    let i = 0;
    while (g.minute < until && !g.ended) {
      for (; i < log.length && (log[i]?.minute ?? Infinity) <= g.minute; i++) {
        const e = log[i];
        if (!e) continue;
        if (e.kind === 'order') g.issue(e.input);
        else if (e.kind === 'cancel') g.cancel(e.orderId);
        else g.dismissNudge(e.nudgeId);
      }
      g.advance(1);
    }
    return g;
  }

  /** Simulate `minutes` sim minutes (stops at the end of the run). */
  advance(minutes: number): void {
    for (let i = 0; i < minutes && !this.ended; i++) this.stepMinute();
  }

  private stepMinute(): void {
    const m = this.minute;
    applyWorldMinute(this.classicWorld, m);
    applyWorldMinute(this.humanWorld, m);

    const due = this.book.takeDue();
    const humanOrders = [];
    for (const o of due) {
      const { classic, human } = fanOut(o);
      const noop = this.classic.noopReason(o.personId);
      this.classic.apply(classic);
      this.book.setChip(
        o.id,
        'classic',
        noop ? { state: 'noop', label: noop } : { state: 'ok', label: 'on it' },
      );
      humanOrders.push(human);
    }

    const ce = this.classic.step(m);
    for (const c of ce.completed)
      this.book.setChip(c.orderId, 'classic', { state: 'ok', label: 'done', settled: true });
    for (const n of ce.noop) {
      const card = this.book.card(n.orderId);
      if (card && card.classic.state !== 'noop')
        this.book.setChip(n.orderId, 'classic', { state: 'noop', label: n.reason });
    }

    const he = this.human.step(m + 1, humanOrders);
    for (const v of [...he.verdicts, ...he.updates]) {
      const card = this.book.card(v.orderId);
      if (!card) continue;
      this.book.setChip(v.orderId, 'human', {
        state: VERDICT_CHIP[v.kind],
        label: v.counterOffer ?? v.says,
        ...(card.human.settled ? { settled: true } : {}),
      });
    }
    for (const c of he.completed) {
      const card = this.book.card(c.orderId);
      if (!card) continue;
      // A yes or a "not now" that was then carried out shows as done; "under protest" stays visible.
      const done = card.human.state === 'assent' || card.human.state === 'notNow';
      this.book.setChip(c.orderId, 'human', {
        ...card.human,
        ...(done ? { state: 'done' as const } : {}),
        settled: true,
      });
    }
    this.moments.push(...he.moments);

    this.minute = m + 1;
    // A lapse withdraws the Human side's standing suggestion (the re-issue of spec §3); a card whose job is under
    // way does not lapse. Classic received its command once and obeys it to the end, so a lapse does not stop it.
    for (const id of this.book.lapse(this.minute, (c) => this.human.working(c.order.id)))
      this.human.cancel(id);
  }

  scoreboard(): Scoreboard {
    const metrics = this.human.metrics();
    return {
      classic: sideScore(this.classicWorld, this.classic.units.filter((u) => !u.dead).length),
      human: {
        ...sideScore(this.humanWorld, metrics.alive),
        prayersKept: metrics.prayersKept,
        prayersDue: metrics.prayersDue,
        morale: metrics.morale,
        trust: metrics.trust,
      },
    };
  }

  visibleNudges(): Nudge[] {
    return NUDGES.filter(
      (n) => !this.dismissed.has(n.id) && this.minute >= n.minute && this.minute < n.until,
    );
  }

  frame(): Frame {
    return {
      minute: this.minute,
      clock: formatClock(this.minute),
      weather: weatherAt(this.minute),
      darkness: darkness(this.minute),
      classic: this.classic.units.map((u) => ({
        id: u.id,
        name: u.name,
        role: u.role,
        x: u.x,
        y: u.y,
        state: unitState(u),
        label: classicLabel(this.classic, u),
        hunger: Math.round(u.hunger),
        hp: Math.round(u.hp),
        rush: u.task?.rush ?? false,
        carrying: u.carrying,
        carriedBy: u.carriedBy,
      })),
      human: this.human.view(),
      classicWorld: worldView(this.classicWorld),
      humanWorld: worldView(this.humanWorld),
      scoreboard: this.scoreboard(),
      cards: structuredClone(this.book.cards),
      nudges: this.visibleNudges(),
      moments: [...this.moments],
      humanKind: this.human.kind,
      ended: this.ended,
    };
  }

  why(personId: VillagerId, decisionId?: string): WhyBreakdown | null {
    return this.human.why(personId, decisionId);
  }

  predict(input: OrderInput): Prediction {
    const action = inferAction(input.placeId, {
      minute: this.minute,
      house: this.humanWorld.house,
      cedarFelled: this.humanWorld.cedarFelled,
    });
    const { human } = fanOut({
      id: 'preview',
      issuedAt: this.minute,
      rollKey: this.minute,
      personId: input.personId,
      placeId: input.placeId,
      action,
      rush: input.rush ?? false,
      insist: input.insist ?? false,
      ...(input.appeal ? { appeal: input.appeal } : {}),
    });
    const { orderId: _drop, ...rest } = human;
    return this.human.predict(rest);
  }

  /** End-of-run summary, including the headless solo control (same seed, no orders). */
  summary(): EndSummary {
    const solo = new ColonyGame(this.seed, this.factory);
    solo.advance(END_MINUTE);
    return {
      scoreboard: this.scoreboard(),
      solo: solo.scoreboard().human,
      moments: [...this.moments],
      orders: this.book.cards.length,
    };
  }
}
