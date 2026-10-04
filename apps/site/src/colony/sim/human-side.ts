/**
 * The Human side's adapter contract. The engine (game.ts) owns the clock, the order book and both worlds;
 * a HumanSide owns the six people and acts as the framework's *host world* for them: it offers
 * affordances, folds travel into durations (see `pathLength` in map.ts), resolves outcomes with
 * `scenarioRoll` (world-types.ts) and writes results into the `SideWorld` it was given. The engine reads
 * that world for the scoreboard and applies world-level weather to it each minute (`applyWorldMinute`).
 *
 * The game runs the framework adapter (human.ts). `PlaceholderHumanSide` (apps/site/test/colony/placeholder-human.fixture.ts) mirrors
 * Classic and is kept only as a test fixture for the order book and the Classic engine. Keep @human/framework
 * imports inside the adapter so the engine stays framework-free.
 */
import type { GameMap, PlaceId } from './map.ts';
import type { HumanOrder } from './orders.ts';
import type { ActionId, Minute, Role, SideWorld, VillagerId, VillagerSpec } from './world-types.ts';

// ---------------------------------------------------------------------------------------------
// View model (what the UI draws)
// ---------------------------------------------------------------------------------------------

/**
 * Bubble kinds and their colours (spec §5): assent green, cannot grey, notNow amber (always with a
 * counter-offer), willNot red, complied amber-struck (order text struck through, then "…fine."), thought
 * = a smaller cloud with unprompted narration, shown only when the chosen action changes.
 */
export type BubbleKind = 'assent' | 'cannot' | 'notNow' | 'willNot' | 'complied' | 'thought';

export interface Bubble {
  /** Unique and stable; the UI keys its real-time minimums (400 ms dots, 2.5 s line) on it. */
  id: string;
  personId: VillagerId;
  kind: BubbleKind;
  /** `SuggestionResolution.says` for verdicts; `DecisionRecord.narration` for thoughts. */
  text: string;
  /** For notNow / modified: `counterOffer.label`, shown in italics ("after I eat"). */
  counterOffer?: string;
  /** For complied: the order text that gets struck through. */
  orderText?: string;
  orderId?: string;
  /** Pass to `why()` to explain this bubble. */
  decisionId?: string;
  /** Sim minute the bubble was emitted. */
  minute: Minute;
}

export interface NeedBar {
  id: string;
  label: string;
  /** 0..1, 1 = fully satisfied. */
  value: number;
  /** Past its interrupt threshold. */
  urgent?: boolean;
}

export interface EmotionView {
  /** 'calm', 'fear', 'gratitude', ... */
  label: string;
  /** −1..1 */
  valence: number;
  /** 0..1 */
  intensity: number;
  /** Who or what the emotion is about, if anyone. */
  target?: string;
}

export interface TrustEvent {
  minute: Minute;
  /** Signed change in trust caused by this event. */
  delta: number;
  /** "Pushed into the squall", "Good call on the beam". */
  label: string;
}

/** Trust in the player's voice: a relation, never a quality of the person. */
export interface TrustView {
  /** 0..1 (`VoiceRelation.trust`). */
  value: number;
  /** Last three events that moved trust, newest first. */
  history: TrustEvent[];
}

export type VillagerState =
  | 'idle'
  | 'walking'
  | 'working'
  | 'eating'
  | 'praying'
  | 'sheltering'
  | 'resting'
  | 'asleep'
  | 'carrying'
  | 'carried'
  | 'down'
  | 'dead';

export interface VillagerView {
  id: VillagerId;
  name: string;
  role: Role;
  /** Tile coordinates (integers; the renderer interpolates between frames). */
  x: number;
  y: number;
  state: VillagerState;
  action: ActionId | null;
  placeId: PlaceId | null;
  /** Current action label: "Gathering timber", "Walking to the well", "Praying Maghrib". */
  label: string;
  /** 0..100 */
  hp: number;
  needs: NeedBar[];
  emotion: EmotionView | null;
  trust: TrustView;
  /** The bubble to show now (the UI enforces real-time minimums on top of this). */
  bubble: Bubble | null;
  /** Working under protest after an insisted order (`Activity.protest`). */
  protest: boolean;
  carrying: VillagerId | null;
  carriedBy: VillagerId | null;
  /** Latest decision, for "why?" on a villager without a bubble. */
  lastDecisionId: string | null;
}

/** Term families colour the why-bars (spec §5): needs ochre, norms indigo, commitments rust, ... */
export type TermFamily =
  | 'need'
  | 'norm'
  | 'commitment'
  | 'emotion'
  | 'social'
  | 'effort'
  | 'suggestion'
  | 'habit'
  | 'goal'
  | 'other';

export interface WhyTerm {
  /** Framework `Term.source`, e.g. 'need:food', 'norm:salah', 'suggestion:player'. */
  source: string;
  /** Readable label: "hunger", "Maghrib is due", "your order". */
  label: string;
  value: number;
  family: TermFamily;
}

export interface WhyOption {
  affordanceId: string;
  action: string;
  /** Readable label ("Build at the site"); the framework stores ids only (spec §10 gap 7). */
  label: string;
  utility: number;
  chosen: boolean;
  vetoed?: { kind: 'cannot' | 'willNot'; reason: string };
  terms: WhyTerm[];
}

export interface WhyBreakdown {
  personId: VillagerId;
  decisionId: string;
  minute: Minute;
  narration: string;
  intention: string;
  /** Present when the decision answered one of your orders. */
  verdict?: { kind: Exclude<BubbleKind, 'thought'>; says: string; reason: string; counterOffer?: string };
  /** Top three considered options, chosen first. */
  options: WhyOption[];
  /** Advertised vs believed need deltas for the chosen option. */
  deltas: { need: string; advertised: number; believed: number }[];
  /** Quoted recalled episodes ("the squall, last night"). */
  recalled: string[];
  trust: TrustView;
}

/** Telegraph before commit (`predictResponse`): "Likely yes" / "Later: hungry" / "Will refuse: unsafe". */
export interface Prediction {
  personId: VillagerId;
  action: ActionId;
  kind: Exclude<BubbleKind, 'thought'>;
  text: string;
  /** When choice is stochastic: probability the suggested option is chosen. */
  likelihood?: number;
}

export interface HumanMetrics {
  prayersKept: number;
  prayersDue: number;
  /** Mean mood valence, −1..1. */
  morale: number;
  /** Mean trust in the player's voice, 0..1. */
  trust: number;
  alive: number;
}

export interface HumanVerdict {
  orderId: string;
  personId: VillagerId;
  kind: Exclude<BubbleKind, 'thought'>;
  says: string;
  reason: string;
  counterOffer?: string;
  decisionId?: string;
}

export type MomentId = 1 | 2 | 3 | 4 | 5;

export interface HumanSideEvents {
  /** First response to each order (acknowledged within one sim minute of the order). */
  verdicts: HumanVerdict[];
  /** Later verdict changes for an open card: a deferral that is now being done, a protest, a lapse. */
  updates: HumanVerdict[];
  /** Orders whose job finished (the card settles on this side). */
  completed: { orderId: string; personId: VillagerId }[];
  /** New bubbles emitted this step (verdict lines and thoughts). */
  bubbles: Bubble[];
  injuries: { personId: VillagerId; kind: 'collapse' | 'injury' | 'weather'; minute: Minute }[];
  deaths: VillagerId[];
  /** The five witnessed moments of spec §7, when detected. */
  moments: { id: MomentId; minute: Minute; personId: VillagerId; line: string }[];
}

export function emptyHumanEvents(): HumanSideEvents {
  return { verdicts: [], updates: [], completed: [], bubbles: [], injuries: [], deaths: [], moments: [] };
}

// ---------------------------------------------------------------------------------------------
// The adapter
// ---------------------------------------------------------------------------------------------

export interface HumanSide {
  /** 'placeholder' until the framework adapter lands, then 'framework'. Shown in the UI footer. */
  readonly kind: string;

  /**
   * Create the six people from `villagers` with person RNGs derived from `seed`. `world` is this side's
   * mutable world (resources, house, cedar, injuries, deaths, well user): read it to build affordances
   * and write job results into it. `map` is the shared grid for pathing. The clock starts at minute 0.
   */
  init(seed: number, villagers: readonly VillagerSpec[], world: SideWorld, map: GameMap): void;

  /**
   * Advance to `untilMinute` (the engine passes exactly the current minute + 1). `orders` are the cards
   * stamped for this boundary, already carrying the spec's Suggestion (strength 0.6 / 0.9 on rush,
   * insist, appeal). The adapter re-issues an open order's suggestion at each of that person's decisions
   * until completed, cancelled or lapsed (spec §3 "Order lifetime"). The engine has already applied world
   * weather for this minute. Must be deterministic: no wall clock, no Math.random.
   */
  step(untilMinute: Minute, orders: readonly HumanOrder[]): HumanSideEvents;

  /** Withdraw an order's suggestion; the person re-decides. Also called when a card lapses. */
  cancel(orderId: string): void;

  /**
   * True once the person has begun the ordered job in a session started after the order reached them, until the
   * order completes or is dropped (a drink or a prayer in between does not end it). The engine does not lapse
   * such a card mid-job (spec §3: a card persists until assented-and-completed); a pause away from the job is
   * covered only up to an adapter-chosen limit.
   */
  working(orderId: string): boolean;

  /** Current villager views, in VILLAGERS order. */
  view(): VillagerView[];

  /** Explain a decision (default: the person's latest). Null if nothing to explain yet. */
  why(personId: VillagerId, decisionId?: string): WhyBreakdown | null;

  /** Pure telegraph of how this person would answer an order now; consumes no RNG. */
  predict(order: Omit<HumanOrder, 'orderId'>): Prediction;

  /** Scoreboard numbers only the Human side has. */
  metrics(): HumanMetrics;

  /** Plain-JSON snapshot of the side (people via `snapshot()`), excluding the world. */
  snapshot(): unknown;
  restore(snapshot: unknown): void;
}

export type HumanSideFactory = () => HumanSide;
