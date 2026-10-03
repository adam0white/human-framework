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
  clockOf,
  createSideWorld,
  DAY3_END,
  darkness,
  END_MINUTE,
  formatClock,
  HOUSE_STAGES,
  type Minute,
  nextStageCost,
  type Resources,
  type Role,
  type SideWorld,
  SQUALL_END,
  SQUALL_START,
  STOREROOM_STAGES,
  STORM_END,
  STORM_START,
  siteOpen,
  VILLAGERS,
  type VillagerId,
  WARNING_AT,
  type Weather,
  weatherAt,
} from './world-types.ts';

export const SCENARIO_VERSION = 'colony-scenario@2';
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

export type ProjectKind = 'house' | 'storeroom';

export interface WorldView {
  resources: Resources;
  houseStage: number;
  /** 0..1 toward the next stage of the open project. */
  houseProgress: number;
  /** The project open at the site: the house, or the Day-3 store-room once the house is done. */
  project: { kind: ProjectKind; stage: number; stages: number };
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

// ---------------------------------------------------------------------------------------------
// Goals (v2 plan §1, §12)
// ---------------------------------------------------------------------------------------------

export type GoalId = 'roof' | 'stock' | 'lives' | 'project';
export type GoalStatus = 'open' | 'met' | 'failed';
export interface GoalSide {
  value: number;
  status: GoalStatus;
}
export interface GoalView {
  id: GoalId;
  label: string;
  target: string;
  deadlineMinute: Minute;
  classic: GoalSide;
  human: GoalSide;
}

/** Day-2 goals are judged at the storm (roof, stock) and at the end of the run (lives). */
export const GOAL_JUDGE = STORM_START;
/** Meals in store at the storm for the `stock` goal: supper plus breakfast for six. */
export const STOCK_GOAL = 12;
/** Day-3 goals (v2 plan §12): the project and 6 meals by 19:30, all alive at Day 4 05:00. */
export const DAY3_JUDGE = at(3, 18, 0);
export const DAY3_STOCK_GOAL = 12;

export interface TimelineMarker {
  minute: Minute;
  kind: 'day' | 'squall' | 'warning' | 'storm' | 'end';
  label: string;
  until?: Minute;
}

/** Director nudges (spec §7, v2 plan §7): suggested orders on the clock, each with the risk it carries. */
export interface Nudge {
  id: string;
  minute: Minute;
  until: Minute;
  text: string;
  /** One sentence, shown under the text: why, and what it may cost. */
  reason: string;
  order: OrderInput;
  /** Toggles the composer pre-sets when the player uses the card (still editable). */
  prefill?: { rush?: boolean; insist?: boolean };
}

export const NUDGES: readonly Nudge[] = [
  {
    // Moment 2 needs the dawn yes to compare with the dusk answer.
    id: 'dawn-site',
    minute: at(1, 5, 30),
    until: at(1, 6, 30),
    text: 'First light. Send Yusuf to the house?',
    reason: 'He is your best builder and walls are cheap now.',
    order: { personId: 'yusuf', placeId: 'site' },
  },
  {
    id: 'cedar',
    minute: at(1, 8, 0),
    until: at(1, 9, 0),
    text: 'Idris could take the big cedar: three timber at once.',
    reason: 'Fast timber, but the cedar can hurt whoever fells it.',
    order: { personId: 'idris', placeId: 'cedar' },
  },
  {
    id: 'cook-forest',
    minute: at(1, 10, 45),
    until: at(1, 11, 45),
    text: 'Timber is short. Maryam is free until noon.',
    reason: 'Timber now, but the pot sits cold while she is gone.',
    order: { personId: 'maryam', placeId: 'forest' },
  },
  {
    id: 'dusk-site',
    minute: at(1, 18, 25),
    until: at(1, 19, 25),
    text: 'Light’s going. Send Yusuf back to the house?',
    reason: 'One more wall before dark, if he is not spent.',
    order: { personId: 'yusuf', placeId: 'site' },
  },
  {
    id: 'squall-tariq',
    minute: at(1, 21, 35),
    until: at(1, 22, 35),
    text: 'Timber is short; Tariq is awake.',
    reason: 'It is night and a squall is blowing. Forcing him may cost his trust.',
    order: { personId: 'tariq', placeId: 'forest' },
    prefill: { insist: true },
  },
  {
    // Moment 5: the morning after the squall, the same order again.
    id: 'tariq-again',
    minute: at(2, 7, 0),
    until: at(2, 8, 0),
    text: 'Morning. Timber is still short. Send Tariq to the forest?',
    reason: 'He remembers last night.',
    order: { personId: 'tariq', placeId: 'forest' },
  },
  {
    id: 'roof-hands-1',
    minute: at(2, 9, 0),
    until: at(2, 10, 0),
    text: 'The roof needs hands. Rush Samira to the house?',
    reason: 'Roof stages are slow; a rushed helper speeds them up.',
    order: { personId: 'samira', placeId: 'site' },
    prefill: { rush: true },
  },
  {
    id: 'roof-hands-2',
    minute: at(2, 9, 30),
    until: at(2, 10, 30),
    text: 'And Danyal?',
    reason: 'The well can wait an hour.',
    order: { personId: 'danyal', placeId: 'site' },
    prefill: { rush: true },
  },
  {
    // Plan §7 had 15:00–16:00, but before the warning the Human cook is only offered below `cookBelow`, so a village
    // on track answered "not on offer". From the warning she cooks for the storm, so the card follows it, half an
    // hour after the warning pause so the two do not stack.
    id: 'storm-pot',
    minute: at(2, 16, 30),
    until: at(2, 17, 30),
    text: 'The storm will put the fire out. Maryam, cook a pot to keep?',
    reason: 'Nobody can cook from 19:00 until 03:00.',
    order: { personId: 'maryam', placeId: 'kitchen' },
  },
  {
    // From 18:00 an order to an unfinished house shutters it (orders.ts), so the card shows when its order does that.
    id: 'storm-shutter',
    minute: at(2, 18, 0),
    until: at(2, 19, 0),
    text: 'The roof will not be on before the storm. Shutter the house?',
    reason: 'An unshuttered, unfinished house loses stages in the storm. Shuttering stops the roof work.',
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
  | { minute: Minute; kind: 'order'; input: OrderInput; nudgeId?: string }
  | { minute: Minute; kind: 'cancel'; orderId: string }
  | { minute: Minute; kind: 'dismiss'; nudgeId: string }
  | { minute: Minute; kind: 'continue' };

export interface CharacterOutcome {
  prayersKept: number;
  prayersDue: number;
  morale: number;
  trust: number;
}

export interface EndSummary {
  scoreboard: Scoreboard;
  /** Headless solo control: Human people, same seed, no orders. */
  solo: Scoreboard['human'];
  moments: MomentRecord[];
  orders: number;
  /** Which report this is: the Day-2 end, or the end of "Another day". */
  day: 2 | 3;
  /** Final goals of that day, both sides. */
  goals: GoalView[];
  /** The Solo control's Human result for the same goals, in the same order. */
  soloGoals: GoalSide[];
  /** Human-only character outcomes (not goals; Classic has no such concept). */
  character: CharacterOutcome;
  /** The orders given in the reported span, with each side's final answer (game design review GD2). */
  cards: OrderCard[];
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
  /** 2880, or 4320 after "Another day". */
  endMinute: Minute;
  /** "Day 1 of 2". `current` is the clock's day (3 at the Day-2 end). */
  day: { current: number; total: number };
  timeline: { end: Minute; markers: TimelineMarker[] };
  /** The goals of the current day (Day-2 goals, or the Day-3 goals after "Another day"), live. */
  goals: GoalView[];
  /** The run has ended after Day 2 and "Another day" is on offer. */
  canContinue: boolean;
}

/** What one stepped minute produced, for the worker's auto-pause rules (v2 plan §6). */
export interface StepEvents {
  /** The minute that was stepped. */
  minute: Minute;
  /** Human verdict chips on player cards that changed this minute. */
  verdicts: { orderId: string; personId: VillagerId; kind: Exclude<BubbleKind, 'thought'>; says: string }[];
  moments: MomentRecord[];
}

const VERDICT_CHIP: Record<Exclude<BubbleKind, 'thought'>, ChipState> = {
  assent: 'assent',
  notNow: 'notNow',
  complied: 'complied',
  cannot: 'cannot',
  willNot: 'willNot',
};

/** Per-side records the goals are judged from (first minute reached, value at the judging minute). */
interface SideRecord {
  roofAt: Minute | null;
  houseAtStorm: number | null;
  stockAtStorm: number | null;
  firstDeath: Minute | null;
  projectAt: Minute | null;
  projectDay3: number | null;
  stockDay3: number | null;
}

const newRecord = (): SideRecord => ({
  roofAt: null,
  houseAtStorm: null,
  stockAtStorm: null,
  firstDeath: null,
  projectAt: null,
  projectDay3: null,
  stockDay3: null,
});

function projectOf(w: SideWorld): WorldView['project'] {
  return w.storeroom !== null
    ? { kind: 'storeroom', stage: w.storeroom, stages: STOREROOM_STAGES }
    : { kind: 'house', stage: w.house.stage, stages: HOUSE_STAGES };
}

function worldView(w: SideWorld, progress: number): WorldView {
  return {
    resources: { ...w.resources },
    houseStage: w.house.stage,
    houseProgress: siteOpen(w) ? Math.max(0, Math.min(0.99, progress)) : 0,
    project: projectOf(w),
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

const status = (met: boolean, failed: boolean): GoalStatus => (met ? 'met' : failed ? 'failed' : 'open');

export class ColonyGame {
  readonly seed: number;
  minute: Minute = 0;
  /** End of the run: `END_MINUTE`, raised to `DAY3_END` by `continueDay`. */
  endMinute: Minute = END_MINUTE;
  readonly book = new OrderBook();
  readonly classicWorld: SideWorld = createSideWorld();
  readonly humanWorld: SideWorld = createSideWorld();
  readonly classic: ClassicSim;
  readonly human: HumanSide;
  readonly moments: MomentRecord[] = [];
  /** Player actions in the order applied (see `LogEntry`). */
  readonly log: LogEntry[] = [];
  /** What the last stepped minute produced (auto-pause input). */
  lastStep: StepEvents = { minute: -1, verdicts: [], moments: [] };
  /** Suggestion ids the last `issue` settled (the playback resumes when one of them caused the pause). */
  lastSettled: string[] = [];
  private dismissed = new Set<string>();
  private readonly factory: HumanSideFactory;
  private readonly rec = { classic: newRecord(), human: newRecord() };
  /** Goals frozen at the Day-2 end (kept for the Day-2 report after "Another day"). */
  private day2Goals: GoalView[] | null = null;
  /** The Solo control, built on first use and continued with this game. */
  private soloGame: ColonyGame | null = null;

  constructor(seed: number, factory: HumanSideFactory) {
    this.seed = seed;
    this.factory = factory;
    this.classic = new ClassicSim(seed, VILLAGERS, this.classicWorld);
    this.human = factory();
    this.human.init(seed, VILLAGERS, this.humanWorld, MAP);
  }

  get ended(): boolean {
    return this.minute >= this.endMinute;
  }

  /** The run has ended after Day 2 and can go on for one more day. */
  get canContinue(): boolean {
    return this.ended && this.endMinute === END_MINUTE;
  }

  /**
   * "Another day" (v2 plan §12, as shipped): clear weather, no moments or nudges, and one goal on both sides, the
   * store-room at the site. A side whose house is below 10 finishes the house first; its store-room opens the
   * minute the roof is on.
   */
  continueDay(): boolean {
    if (!this.canContinue) return false;
    this.day2Goals = this.goals();
    this.log.push({ minute: this.minute, kind: 'continue' });
    this.endMinute = DAY3_END;
    this.openStorerooms();
    return true;
  }

  /** On Day 3, open the store-room on each side whose house is finished. */
  private openStorerooms(): void {
    if (this.endMinute <= END_MINUTE) return;
    for (const w of [this.classicWorld, this.humanWorld]) {
      if (w.house.stage >= HOUSE_STAGES && w.storeroom === null) {
        w.storeroom = 0;
        w.house.progress = 0;
      }
    }
  }

  private inferCtx() {
    return {
      minute: this.minute,
      house: this.humanWorld.house,
      cedarFelled: this.humanWorld.cedarFelled,
      storeroom: this.humanWorld.storeroom,
    };
  }

  /**
   * Stamp an order at the current minute; it applies to both sides at the next step. `nudgeId` names the suggestion
   * it came from: that card is settled and keys the shared scenario rolls. Without it, a visible card with the same
   * person and place is settled instead.
   */
  issue(input: OrderInput, nudgeId?: string): Order | null {
    this.lastSettled = [];
    if (this.ended) return null;
    this.log.push({
      minute: this.minute,
      kind: 'order',
      input: structuredClone(input),
      ...(nudgeId ? { nudgeId } : {}),
    });
    const action = inferAction(input.placeId, this.inferCtx());
    // A card's order keys the shared scenario rolls (the cedar) by the card's minute, so the seeded outcome the
    // card was written for does not depend on how quickly the player taps it. Its lifetime still runs from now.
    let rollKey = this.minute;
    const visible = this.visibleNudges();
    const named = nudgeId ? visible.find((n) => n.id === nudgeId) : undefined;
    const settle = named
      ? [named]
      : visible.filter((n) => n.order.personId === input.personId && n.order.placeId === input.placeId);
    for (const n of settle) {
      this.dismissed.add(n.id);
      rollKey = n.minute;
    }
    this.lastSettled = settle.map((n) => n.id);
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
    until?: Minute,
  ): ColonyGame {
    const g = new ColonyGame(seed, factory);
    let i = 0;
    for (;;) {
      // Entries first: a `continue` is stamped at the Day-2 end, when the game has already ended.
      for (; i < log.length && (log[i]?.minute ?? Infinity) <= g.minute; i++) {
        const e = log[i];
        if (!e) continue;
        if (e.kind === 'order') g.issue(e.input, e.nudgeId);
        else if (e.kind === 'cancel') g.cancel(e.orderId);
        else if (e.kind === 'dismiss') g.dismissNudge(e.nudgeId);
        else g.continueDay();
      }
      if (g.ended || g.minute >= (until ?? g.endMinute)) break;
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
    const step: StepEvents = { minute: m, verdicts: [], moments: [] };
    this.openStorerooms();
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
      const state = VERDICT_CHIP[v.kind];
      if (card.human.state !== state)
        step.verdicts.push({ orderId: v.orderId, personId: v.personId, kind: v.kind, says: v.says });
      this.book.setChip(v.orderId, 'human', {
        state,
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
    step.moments.push(...he.moments);

    this.minute = m + 1;
    // A lapse withdraws the Human side's standing suggestion (the re-issue of spec §3); a card whose job is under
    // way does not lapse. Classic received its command once and obeys it to the end, so a lapse does not stop it.
    for (const id of this.book.lapse(this.minute, (c) => this.human.working(c.order.id)))
      this.human.cancel(id);
    this.record();
    this.lastStep = step;
  }

  /** Update the goal records after a step (first minute a target is reached, values at the judging minutes). */
  private record(): void {
    const sides = [
      { r: this.rec.classic, w: this.classicWorld },
      { r: this.rec.human, w: this.humanWorld },
    ];
    for (const { r, w } of sides) {
      if (r.roofAt === null && w.house.stage >= HOUSE_STAGES) r.roofAt = this.minute;
      if (this.minute === GOAL_JUDGE) {
        r.stockAtStorm = w.resources.meals;
        r.houseAtStorm = w.house.stage;
      }
      if (r.firstDeath === null && w.deaths > 0) r.firstDeath = this.minute;
      if (this.endMinute > END_MINUTE) {
        if (r.projectAt === null && (w.storeroom ?? 0) >= STOREROOM_STAGES) r.projectAt = this.minute;
        if (this.minute === DAY3_JUDGE) {
          r.stockDay3 = w.resources.meals;
          r.projectDay3 = w.storeroom ?? 0;
        }
      }
    }
  }

  private alive(): { classic: number; human: number } {
    return {
      classic: this.classic.units.filter((u) => !u.dead).length,
      human: this.human.metrics().alive,
    };
  }

  /**
   * Goals with live values and status (v2 plan §1; Day 3: §12). By default the current day's; `day: 2` after
   * "Another day" returns the Day-2 goals as they stood at the Day-2 end.
   */
  goals(day: 2 | 3 = this.endMinute > END_MINUTE ? 3 : 2): GoalView[] {
    if (day === 3) return this.goalsDay3();
    if (this.day2Goals) return this.day2Goals;
    const alive = this.alive();
    const m = this.minute;
    const side = (k: 'classic' | 'human') => {
      const r = this.rec[k];
      const w = k === 'classic' ? this.classicWorld : this.humanWorld;
      const roofMet = r.roofAt !== null && r.roofAt <= GOAL_JUDGE;
      const stock = r.stockAtStorm ?? w.resources.meals;
      return {
        roof: {
          // After 19:00 a missed roof keeps showing the 19:00 stage: the goal does not change after it.
          value: r.houseAtStorm !== null && !roofMet ? r.houseAtStorm : w.house.stage,
          status: status(roofMet, m >= GOAL_JUDGE),
        },
        stock: {
          value: stock,
          status: r.stockAtStorm === null ? 'open' : status(stock >= STOCK_GOAL, true),
        },
        lives: {
          value: alive[k],
          status: status(r.firstDeath === null && m >= END_MINUTE, r.firstDeath !== null),
        },
      } satisfies Record<string, GoalSide>;
    };
    const c = side('classic');
    const h = side('human');
    return [
      {
        id: 'roof',
        label: 'Roof before the storm',
        target: `house ${HOUSE_STAGES}/${HOUSE_STAGES}`,
        deadlineMinute: GOAL_JUDGE,
        classic: c.roof,
        human: h.roof,
      },
      {
        id: 'stock',
        label: 'Storm stock',
        target: `≥ ${STOCK_GOAL} meals in store`,
        deadlineMinute: GOAL_JUDGE,
        classic: c.stock,
        human: h.stock,
      },
      {
        id: 'lives',
        label: 'Everyone lives',
        target: `${VILLAGERS.length} alive`,
        deadlineMinute: END_MINUTE,
        classic: c.lives,
        human: h.lives,
      },
    ];
  }

  private goalsDay3(): GoalView[] {
    const alive = this.alive();
    const m = this.minute;
    const side = (k: 'classic' | 'human') => {
      const r = this.rec[k];
      const w = k === 'classic' ? this.classicWorld : this.humanWorld;
      const projectMet = r.projectAt !== null && r.projectAt <= DAY3_JUDGE;
      const stock = r.stockDay3 ?? w.resources.meals;
      return {
        project: {
          // A missed store-room keeps showing the stage it had at the deadline.
          value: projectMet ? STOREROOM_STAGES : (r.projectDay3 ?? w.storeroom ?? 0),
          status: status(projectMet, m >= DAY3_JUDGE),
        },
        stock: {
          value: stock,
          status: r.stockDay3 === null ? 'open' : status(stock >= DAY3_STOCK_GOAL, true),
        },
        lives: {
          value: alive[k],
          status: status(r.firstDeath === null && m >= DAY3_END, r.firstDeath !== null),
        },
      } satisfies Record<string, GoalSide>;
    };
    const c = side('classic');
    const h = side('human');
    return [
      {
        id: 'project',
        label: 'Build the store-room',
        target: `store-room ${STOREROOM_STAGES}/${STOREROOM_STAGES} (an unfinished house first)`,
        deadlineMinute: DAY3_JUDGE,
        classic: c.project,
        human: h.project,
      },
      {
        id: 'stock',
        label: 'Meals at nightfall',
        target: `≥ ${DAY3_STOCK_GOAL} meals in store`,
        deadlineMinute: DAY3_JUDGE,
        classic: c.stock,
        human: h.stock,
      },
      {
        id: 'lives',
        label: 'Everyone lives',
        target: `${VILLAGERS.length} alive`,
        deadlineMinute: DAY3_END,
        classic: c.lives,
        human: h.lives,
      },
    ];
  }

  timeline(): Frame['timeline'] {
    const markers: TimelineMarker[] = [
      { minute: at(2, 5, 0), kind: 'day', label: 'Day 2' },
      { minute: SQUALL_START, kind: 'squall', label: 'Squall', until: SQUALL_END },
      { minute: WARNING_AT, kind: 'warning', label: 'Sky darkens' },
      { minute: STORM_START, kind: 'storm', label: 'Storm', until: STORM_END },
    ];
    if (this.endMinute > END_MINUTE) {
      markers.push({ minute: END_MINUTE, kind: 'day', label: 'Day 3' });
      markers.push({ minute: this.endMinute, kind: 'end', label: 'Day 4 dawn' });
    } else markers.push({ minute: END_MINUTE, kind: 'end', label: 'Day 3 dawn' });
    return { end: this.endMinute, markers };
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
    const done = (w: SideWorld) => w.house.stage >= HOUSE_STAGES || w.house.shuttered;
    const roofed = done(this.classicWorld) && done(this.humanWorld);
    return NUDGES.filter(
      (n) =>
        !this.dismissed.has(n.id) &&
        this.minute >= n.minute &&
        this.minute < n.until &&
        !(n.id === 'storm-shutter' && roofed),
    );
  }

  /** Classic progress toward the next stage: the furthest-along builder's job (Classic builds whole stages). */
  private classicProgress(): number {
    const w = this.classicWorld;
    const work = nextStageCost(w).work;
    let best = 0;
    for (const u of this.classic.units) {
      const t = u.task;
      if (!t?.started || t.phase !== 'work' || (t.action !== 'build' && t.action !== 'raise-beam')) continue;
      best = Math.max(best, 1 - t.remaining / Math.max(1, work));
    }
    return best;
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
      classicWorld: worldView(this.classicWorld, this.classicProgress()),
      humanWorld: worldView(this.humanWorld, this.humanWorld.house.progress),
      scoreboard: this.scoreboard(),
      cards: structuredClone(this.book.cards),
      nudges: this.visibleNudges(),
      moments: [...this.moments],
      humanKind: this.human.kind,
      ended: this.ended,
      endMinute: this.endMinute,
      day: { current: clockOf(this.minute).day, total: this.endMinute > END_MINUTE ? 3 : 2 },
      timeline: this.timeline(),
      goals: this.goals(),
      canContinue: this.canContinue,
    };
  }

  why(personId: VillagerId, decisionId?: string): WhyBreakdown | null {
    return this.human.why(personId, decisionId);
  }

  predict(input: OrderInput): Prediction {
    const action = inferAction(input.placeId, this.inferCtx());
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

  /** The Solo control (same seed, no orders), advanced to this game's end and continued with it. */
  solo(): ColonyGame {
    if (!this.soloGame) this.soloGame = new ColonyGame(this.seed, this.factory);
    const s = this.soloGame;
    s.advance(END_MINUTE - s.minute);
    if (this.endMinute > END_MINUTE && s.endMinute === END_MINUTE) s.continueDay();
    s.advance(this.endMinute - s.minute);
    return s;
  }

  /** End-of-run summary, including the headless solo control (same seed, no orders). */
  summary(): EndSummary {
    const solo = this.solo();
    const metrics = this.human.metrics();
    return {
      scoreboard: this.scoreboard(),
      solo: solo.scoreboard().human,
      moments: [...this.moments],
      orders: this.book.cards.length,
      day: this.endMinute > END_MINUTE ? 3 : 2,
      goals: this.goals(),
      soloGoals: solo.goals().map((g) => g.human),
      character: {
        prayersKept: metrics.prayersKept,
        prayersDue: metrics.prayersDue,
        morale: metrics.morale,
        trust: metrics.trust,
      },
      cards: this.book.cards
        .filter((c) =>
          this.endMinute > END_MINUTE ? c.order.issuedAt >= END_MINUTE : c.order.issuedAt < END_MINUTE,
        )
        .map((c) => structuredClone(c)),
    };
  }
}
