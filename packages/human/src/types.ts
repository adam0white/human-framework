/**
 * Human Framework v1 — shared contract.
 *
 * Every piece of person state is plain JSON (no classes, no functions, no Maps) so that a
 * snapshot is `structuredClone(person)` and a save is `JSON.stringify(person)`.
 *
 * Time is an integer count of simulated minutes since the host's epoch (minute 0 = 00:00 of day 0).
 * All values documented as 0..1 are clamped to that range by the module that owns them.
 *
 * Ownership rule: each slice of `Person` has exactly one owning module that writes it.
 * Other modules read it. The composite in `person.ts` sequences the modules.
 */

// ---------------------------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------------------------

export type Minute = number;
export type PersonId = string;
export type EntityId = string;
/** A 0..1 quantity. */
export type Unit = number;
/** A -1..1 quantity. */
export type Signed = number;

export const MINUTES_PER_HOUR = 60;
export const MINUTES_PER_DAY = 1440;
export const MINUTES_PER_YEAR = 525_600;

/** Serializable PRNG state (sfc32 or similar 4×uint32). Owned by `core/random`. */
export interface RngState {
  a: number;
  b: number;
  c: number;
  d: number;
}

// ---------------------------------------------------------------------------------------------
// Body — owned by `body/`
// ---------------------------------------------------------------------------------------------

export interface Injury {
  id: string;
  part: string; // free text: 'hand', 'back', ...
  severity: Unit; // pain/impairment contribution
  healRatePerDay: number; // severity lost per day while resting/healthy
  since: Minute;
}

export interface Illness {
  id: string;
  kind: string; // 'cold', 'fever', ...
  severity: Unit;
  /** Positive while worsening, negative while recovering (severity per day). */
  trendPerDay: number;
  contagious: boolean;
  since: Minute;
}

export interface BodyState {
  /** 1 = fully fed, 0 = starving. */
  satiety: Unit;
  /** 1 = fully hydrated. */
  hydration: Unit;
  /** Homeostatic sleep pressure: 0 = just woke rested, 1 = cannot stay awake. */
  sleepPressure: Unit;
  /** Short-term physical exertion fatigue (recovers with rest within hours). */
  exertion: Unit;
  /** Minute-of-day at which this person's circadian alertness peaks (chronotype). */
  circadianPeak: number;
  /** 0 = healthy baseline, 1 = maximal pain. Derived from injuries + illness + deprivation, but stored for perception. */
  pain: Unit;
  /** Overall health reserve; falls with starvation, dehydration, illness; death at 0. */
  health: Unit;
  /** Aerobic/strength fitness; trained by effort, lost by inactivity. Scales exertion cost. */
  fitness: Unit;
  injuries: Injury[];
  illnesses: Illness[];
  /** Accumulated sleep debt in hours (chronic restriction); under-perceived by the person. */
  sleepDebt: number;
  asleep: boolean;
  /** Minute the current sleep or wake period began. */
  since: Minute;
  alive: boolean;
  /** Counter for injury and illness ids (ids stay unique after bounded eviction). */
  nextId: number;
}

/** Instantaneous physiological readout the rest of the mind uses. Computed, never stored. */
export interface BodyReadout {
  hunger: Unit; // 1 - satiety, shaped
  thirst: Unit;
  sleepiness: Unit; // combines sleep pressure and circadian dip
  fatigue: Unit; // combines exertion and sleepiness
  pain: Unit;
  /** 0..1 multiplier on physical and mental performance. */
  capacity: Unit;
  /** Minute-of-day based alertness 0..1. */
  alertness: Unit;
  /**
   * What the person feels, which can differ from the true state (interoception). Chronic sleep restriction
   * is under-perceived; strong focus and emotion mask hunger and pain. Decisions use `perceived`;
   * performance and health use the true values.
   */
  perceived: { hunger: Unit; thirst: Unit; sleepiness: Unit; fatigue: Unit; pain: Unit };
}

// ---------------------------------------------------------------------------------------------
// Needs — owned by `needs/`
// ---------------------------------------------------------------------------------------------

/** Physiological needs are derived from body each read; psychological needs are stored reservoirs. */
export const PHYSIOLOGICAL_NEEDS = ['food', 'water', 'sleep', 'rest', 'relief'] as const;
export const PSYCHOLOGICAL_NEEDS = [
  'safety',
  'belonging',
  'esteem',
  'autonomy',
  'competence',
  'leisure',
  'meaning',
] as const;
export type PhysiologicalNeed = (typeof PHYSIOLOGICAL_NEEDS)[number];
export type PsychologicalNeed = (typeof PSYCHOLOGICAL_NEEDS)[number];
export type NeedId = PhysiologicalNeed | PsychologicalNeed;

/** Satisfaction level of each psychological need, 1 = fully satisfied. */
export type NeedReservoirs = Record<PsychologicalNeed, Unit>;

export interface NeedReading {
  id: NeedId;
  level: Unit; // satisfaction
  urgency: Unit; // nonlinear: rises steeply as level falls below the person's comfort threshold
}

// ---------------------------------------------------------------------------------------------
// Personality, values and understood norms — owned by `character/` (traits, values) and `conscience/` (norms)
// ---------------------------------------------------------------------------------------------

/** HEXACO, each 0..1 with 0.5 = population mean. */
export interface Traits {
  honesty: Unit; // honesty-humility
  emotionality: Unit;
  extraversion: Unit;
  agreeableness: Unit;
  conscientiousness: Unit;
  openness: Unit;
}

/** Schwartz higher-order value weights, 0..1 importance. */
export interface Values {
  benevolence: Unit; // care for close others
  universalism: Unit; // justice/care for all
  tradition: Unit; // includes religious commitment and practice
  conformity: Unit;
  security: Unit;
  achievement: Unit;
  power: Unit;
  hedonism: Unit;
  stimulation: Unit;
  selfDirection: Unit;
}
export type ValueId = keyof Values;

/**
 * How the person understands a norm's standing. These are the person's understanding, not a ruling.
 * Islamic categories map to: obligatory (fard/wajib), recommended (sunnah/mustahabb), permitted (mubah),
 * disliked (makruh), forbidden (haram). Non-religious hosts may use the same scale for secular norms.
 */
export type NormStanding = 'obligatory' | 'recommended' | 'permitted' | 'disliked' | 'forbidden';

/** A norm as catalogued by the host, with provenance. The framework never invents rulings. */
export interface NormDefinition {
  id: string; // e.g. 'salah', 'honesty', 'theft', 'charity', 'keep-promise'
  label: string;
  /** Default standing for a person who holds the norm, before personal understanding. */
  standing: NormStanding;
  /** Provenance records: revealed text, transmission, interpretation, or engineering assumption. */
  sources?: { kind: 'revelation' | 'hadith' | 'interpretation' | 'empirical' | 'assumption'; ref: string }[];
}

/** One person's held understanding of a norm. */
export interface HeldNorm {
  normId: string;
  standing: NormStanding;
  /** How firmly the person holds this understanding, 0..1. */
  conviction: Unit;
}

/** Per-affordance moral relevance, supplied by the host. */
export interface NormTag {
  normId: string;
  /** 'fulfills' = doing this action honours the norm; 'violates' = doing it breaches the norm. */
  relation: 'fulfills' | 'violates';
}

/** Conscience state — owned by `conscience/`. */
export interface ConscienceState {
  norms: HeldNorm[];
  /** Unresolved breaches the person knows about (guilt sources) awaiting repentance/repair. */
  breaches: {
    id: string;
    normId: string;
    at: Minute;
    victimId?: PersonId;
    weight: Unit;
    repaired: boolean;
  }[];
  /** Counter for breach ids. */
  nextBreach: number;
  /** Private intention records: the stated reason a person held when acting (never visible to observers). */
  intentions: { at: Minute; action: string; intention: string }[];
}

// ---------------------------------------------------------------------------------------------
// Affect — owned by `affect/`
// ---------------------------------------------------------------------------------------------

/** OCC-lite emotion types. */
export const EMOTIONS = [
  'joy',
  'distress',
  'hope',
  'fear',
  'relief',
  'disappointment',
  'pride',
  'shame',
  'gratitude',
  'anger',
  'guilt',
  'love',
  'grief',
  'awe',
  'boredom',
  'loneliness',
] as const;
export type EmotionId = (typeof EMOTIONS)[number];

export interface Emotion {
  id: EmotionId;
  intensity: Unit;
  /** Who or what the emotion is about. */
  targetId?: EntityId;
  /** Short machine-readable cause, e.g. 'outcome:fail:farm', 'event:insult:p2'. */
  cause: string;
  since: Minute;
  /** Exponential decay half-life in minutes. */
  halfLife: number;
}

export interface AffectState {
  /** Slow-moving baseline mood (valence, arousal), -1..1 and 0..1. */
  mood: { valence: Signed; arousal: Unit };
  emotions: Emotion[];
  /** Learned emotion-regulation capacity (patience/sabr as a practiced skill), 0..1. */
  regulation: Unit;
  lastUpdated: Minute;
}

// ---------------------------------------------------------------------------------------------
// Skills and habits — owned by `skills/` and `habits/`
// ---------------------------------------------------------------------------------------------

export interface Skill {
  level: Unit;
  /** Lifetime practiced minutes. */
  practice: number;
  lastPracticed: Minute;
}

export interface Habit {
  /** Context cue: minute-of-day bucket and/or place and/or preceding action. */
  cue: { hour?: number; placeId?: EntityId; after?: string };
  action: string;
  strength: Unit;
  repetitions: number;
  lastAt: Minute;
}

// ---------------------------------------------------------------------------------------------
// Memory and beliefs — owned by `memory/` and `beliefs/`
// ---------------------------------------------------------------------------------------------

export interface Episode {
  id: string;
  at: Minute;
  kind: string; // 'outcome', 'social', 'witnessed', 'told', 'suggestion', ...
  action?: string;
  actorId?: EntityId;
  targetId?: EntityId;
  placeId?: EntityId;
  /** -1..1 how good/bad it felt. */
  valence: Signed;
  /** 0..1 how memorable; decays and is boosted by recall. */
  salience: Unit;
  summary: string;
  tags: string[];
  /**
   * The outside voice whose suggestion led to this episode (set on outcomes of assented/complied activities and
   * on insisted-compliance episodes). Read by the distrust rule in `will/`.
   */
  voiceId?: EntityId;
}

export interface Belief {
  /** Proposition key, e.g. 'stock:well:empty', 'p2:honest', 'place:forest:dangerous'. */
  prop: string;
  /** Log-odds credence. 0 = 50/50. */
  logOdds: number;
  updatedAt: Minute;
  /** Sources that contributed and the direction each claimed (bounded), so `confirm` can recalibrate them. */
  sources: { id: EntityId; value: boolean }[];
}

/** Learned expectation of an action's actual result for this person (prediction-error learning). */
export interface ActionExpectation {
  /** Key = action id, optionally narrowed by target: 'eat', 'forage@forest'. */
  key: string;
  /** Running estimate of realized need deltas. */
  needs: Partial<Record<NeedId, number>>;
  successRate: Unit;
  samples: number;
  /** Running valence of how it felt. */
  valence: Signed;
}

export interface MemoryState {
  episodes: Episode[]; // bounded; low-salience episodes forgotten first
  beliefs: Belief[];
  expectations: ActionExpectation[];
  /** Trust in each information source (person or channel), 0..1, default 0.5. */
  sourceTrust: Record<EntityId, Unit>;
  nextEpisode: number;
}

// ---------------------------------------------------------------------------------------------
// Social — owned by `social/`
// ---------------------------------------------------------------------------------------------

export interface Relationship {
  otherId: PersonId;
  /** Liking / warmth, -1..1. */
  affection: Signed;
  /** Expectation the other will act in my interest and honestly, 0..1. */
  trust: Unit;
  /** Esteem for competence/character, -1..1. */
  respect: Signed;
  /** How well I know them, 0..1. Grows with interaction, decays slowly. */
  familiarity: Unit;
  /** Named roles: 'spouse', 'parent', 'child', 'sibling', 'friend', 'colleague', 'neighbor', 'leader', ... */
  roles: string[];
  /** Balance of favours: positive = they owe me. */
  ledger: number;
  lastInteraction: Minute;
}

export interface SocialState {
  relationships: Relationship[];
}

// ---------------------------------------------------------------------------------------------
// Commitments and goals — owned by `agenda/`
// ---------------------------------------------------------------------------------------------

export interface Commitment {
  id: string;
  kind: 'promise' | 'duty' | 'appointment' | 'worship' | 'job';
  /** Who the commitment is owed to (person id, 'self', or a norm/god reference handled by conscience). */
  toId?: EntityId;
  /** Action ids whose completion fulfils it. */
  actions: string[];
  targetId?: EntityId;
  /** Window in which fulfilment counts. */
  from: Minute;
  until: Minute;
  /** Linked norm (e.g. 'keep-promise', 'salah'); breaking it is recorded as a breach. */
  normId?: string;
  importance: Unit;
  status: 'pending' | 'kept' | 'broken' | 'released';
  /** Optional recurrence: re-create after it closes (e.g. daily prayer windows). */
  recurEvery?: number;
  /** Optional display name, e.g. 'Maghrib'; used in counter-offers ("after I pray Maghrib"). */
  label?: string;
}

export interface Goal {
  id: string;
  label: string;
  /** Which need/value the goal serves. */
  serves: (NeedId | ValueId)[];
  /** Progress 0..1, advanced by outcomes of the listed actions. */
  progress: Unit;
  /** Actions that advance it and how much per completed instance. */
  advancedBy: { action: string; amount: number }[];
  importance: Unit;
  status: 'active' | 'achieved' | 'abandoned';
  adoptedAt: Minute;
  deadline?: Minute;
}

export interface AgendaState {
  commitments: Commitment[];
  goals: Goal[];
  nextId: number;
  /** Day index of the last spontaneous goal proposal (-1 = never); at most one proposal per day. */
  lastProposalDay: number;
}

// ---------------------------------------------------------------------------------------------
// Will — owned by `will/`
// ---------------------------------------------------------------------------------------------

/** The person's relationship to an external suggesting voice (the player, a manager, a parent). */
export interface VoiceRelation {
  voiceId: EntityId;
  /** Learned trust that this voice's suggestions serve me, 0..1. */
  trust: Unit;
  /** Recent pressure: how often this voice pushed against my own preference (decays). */
  pressure: Unit;
  accepted: number;
  refused: number;
  /** The last few events that moved `trust`, oldest first (bounded, `WILL_DEFAULTS.maxVoiceHistory`). */
  history: VoiceTrustEvent[];
}

/** One change of trust in a voice, for UI trust meters. */
export interface VoiceTrustEvent {
  at: Minute;
  /** Signed change in trust. */
  delta: number;
  /** Machine-readable cause: 'went-well', 'went-badly', 'harm', 'harm-under-protest'. */
  reason: string;
  /** The suggested action whose outcome moved trust. */
  action?: string;
}

/**
 * No single "willpower fuel" is modelled (rejected in research/empirical-models.md §6). Acting against an
 * impulse emerges from competing terms, real fatigue costs, habits and precommitments.
 */
export interface WillState {
  voices: VoiceRelation[];
  /**
   * Precommitments the person made for themselves (e.g. "no work after Isha", "walk instead of eat when bored"):
   * a bonus or penalty on matching actions inside a daily window.
   */
  precommitments: {
    id: string;
    action: string;
    bias: number;
    fromMinuteOfDay: number;
    toMinuteOfDay: number;
  }[];
  /**
   * Hysteresis: options must beat the current activity by this utility margin to interrupt it.
   * Default ≈ 0.15.
   */
  switchMargin: number;
  /** Softmax temperature. 0 = argmax (default, explainable); >0 adds per-person variability. */
  temperature: number;
}

// ---------------------------------------------------------------------------------------------
// Life course — owned by `lifecourse/`
// ---------------------------------------------------------------------------------------------

export type LifeStage = 'infant' | 'child' | 'adolescent' | 'adult' | 'elder';

export interface LifeCourse {
  /** Birth minute relative to host epoch (negative for people born before minute 0). */
  bornAt: Minute;
  sex: 'female' | 'male';
}

// ---------------------------------------------------------------------------------------------
// Activity — owned by `person.ts`
// ---------------------------------------------------------------------------------------------

export interface Activity {
  affordanceId: string;
  action: string;
  targetId?: EntityId;
  /**
   * Snapshot of the offer being carried out, so `tick` (tags, participants, place) and `finish` (skill, norms,
   * advertisement) work from saved state alone. Added 2026-10-03 by the integration pass.
   */
  affordance: Affordance;
  /**
   * Need satisfaction levels when the activity began. `finish` measures the realized sleep/rest change from
   * these, since the host cannot know the body's delta. Added 2026-10-03 by the integration pass.
   */
  needsAtStart: Partial<Record<NeedId, Unit>>;
  startedAt: Minute;
  endsAt: Minute;
  effort: Unit;
  focus: Unit;
  /** Body mode while doing it. */
  mode: 'awake' | 'sleep';
  /** The decision that produced it, for explanation. */
  decisionId: string;
  /** Snapshot of the private intention. */
  intention: string;
  /** Whether a suggestion was involved and how it resolved. */
  suggestion?: SuggestionResolution;
  /** True when done under protest after insisting; hosts may reduce quality/speed. */
  protest?: boolean;
  /** Re-decide no later than this minute even if the activity continues (interrupt check). */
  reviewAt: Minute;
  /**
   * Cached result of `nextBodyThreshold` at begin or the last review: the absolute minute at which a perceived
   * need is predicted to cross its interrupt threshold, or undefined when none does within the horizon. Hosts
   * that step every minute read this instead of recomputing.
   */
  thresholdAt?: Minute;
  /** Commitment created by `begin(..., { promise })` for this activity; it adds commitment inertia at review. */
  commitmentId?: string;
  /** Joint-activity proposal id when this activity was begun through the joint protocol in `sim/`. */
  jointId?: string;
  /** Set by `interrupt()`: why the next review was brought forward. Cleared when the review is handled. */
  interrupt?: { at: Minute; reason: string };
}

// ---------------------------------------------------------------------------------------------
// The person
// ---------------------------------------------------------------------------------------------

export const PERSON_SCHEMA = 'human/person@1';
/** 1.1.0 (2026-10-03): joint activities, omission/distrust rules, reactance, voice history; saves from 1.0.0 do not restore. */
export const ENGINE_VERSION = '1.1.0';

export interface Person {
  schema: typeof PERSON_SCHEMA;
  /** Engine version that last wrote this state. */
  engine: string;
  id: PersonId;
  name: string;
  /** Simulation minute this person's state is current at. */
  now: Minute;
  rng: RngState;
  life: LifeCourse;
  body: BodyState;
  needs: NeedReservoirs;
  traits: Traits;
  values: Values;
  conscience: ConscienceState;
  affect: AffectState;
  skills: Record<string, Skill>;
  habits: Habit[];
  memory: MemoryState;
  social: SocialState;
  agenda: AgendaState;
  will: WillState;
  activity: Activity | null;
  /** Bounded ring of recent decisions for explanation UI. */
  trace: DecisionRecord[];
  nextDecision: number;
}

// ---------------------------------------------------------------------------------------------
// Host contract: affordances, percepts and outcomes
// ---------------------------------------------------------------------------------------------

/**
 * An action the host offers to a person right now (Sims-style advertisement). The advertisement is
 * the host's honest description of typical effects; the person's own learned expectation may differ.
 */
export interface Affordance {
  /** Unique within one decision. */
  id: string;
  /** Verb/action class shared across offers: 'eat', 'sleep', 'farm', 'talk', 'pray', 'steal', ... */
  action: string;
  label: string;
  targetId?: EntityId;
  placeId?: EntityId;
  /** Other people taking part. */
  with?: PersonId[];
  /** Minutes the activity occupies (including travel if the host folds it in). */
  duration: number;
  /** Physical exertion 0..1. */
  effort: Unit;
  /** Mental load 0..1. */
  focus?: Unit;
  /** 'sleep' makes the body sleep for the duration. */
  mode?: 'awake' | 'sleep';
  skill?: { id: string; difficulty: Unit };
  /** Advertised need deltas over the whole activity (positive = satisfies). */
  advertises: Partial<Record<NeedId, number>>;
  /** Free tags: 'work', 'leisure', 'social', 'worship', 'risky', 'outdoors', ... */
  tags?: string[];
  norms?: NormTag[];
  /** Commitment ids this would fulfil if completed. */
  fulfills?: string[];
  /** Goal ids this advances. */
  advances?: string[];
  /** Probability of harm and its severity, as advertised. */
  risk?: { chance: Unit; severity: Unit; kind: string };
  /** Set on a partner's mirror offer by the joint protocol in `sim/` (the proposal id). */
  jointId?: string;
  /** Material gain/cost in host units (e.g. coins). Valued via security/achievement/power values. */
  material?: number;
}

/** Something a person perceives. Hosts emit percepts; attention decides which are encoded. */
export interface Percept {
  at: Minute;
  /**
   * How it reached the person: seen, heard, told (testimony), felt (bodily), the result of an action
   * ('outcome', e.g. percepts attached to an `Outcome`), or a direct social interaction ('social').
   */
  channel: 'saw' | 'heard' | 'told' | 'felt' | 'outcome' | 'social';
  kind: string; // 'help', 'insult', 'gift', 'theft', 'death', 'weather', 'fact', 'request', 'thanks', ...
  actorId?: EntityId;
  targetId?: EntityId;
  placeId?: EntityId;
  /** Host-judged intrinsic valence for the target, -1..1. */
  valence?: Signed;
  /** Base salience before attention, 0..1. */
  salience: Unit;
  /** Proposition claims carried by the percept (e.g. a rumour). */
  claims?: { prop: string; value: boolean; confidence: Unit }[];
  /** Norms the observed act honoured or violated (for judging others). */
  norms?: NormTag[];
  summary: string;
  /**
   * Host flag for `sim/` interrupts. true: this percept is near the person (the framework has no spatial model),
   * so a salient one forces re-decision even if it does not target them. false: never interrupts.
   */
  near?: boolean;
}

/** What actually happened when an activity ended. Hosts own world truth. */
export interface Outcome {
  affordanceId: string;
  action: string;
  targetId?: EntityId;
  status: 'completed' | 'failed' | 'interrupted';
  /** Minute the activity actually ended. */
  at: Minute;
  /** Realized need deltas from world effects (e.g. food eaten). Body exertion is computed by the framework. */
  needs?: Partial<Record<NeedId, number>>;
  material?: number;
  /** Harm suffered. */
  injury?: Omit<Injury, 'id' | 'since'>;
  illness?: Omit<Illness, 'id' | 'since'>;
  /** Extra percepts produced by this outcome (e.g. 'thanks' from the helped person). */
  percepts?: Percept[];
  summary?: string;
  /**
   * How well it was done, 0..1 (1 = as advertised). Defaults to `PERSON_DEFAULTS.protestQuality` for work done
   * under protest and 1 otherwise. Lower quality lowers felt valence and therefore learned expectations.
   */
  quality?: Unit;
  /** Commitment ids this outcome keeps (defaults to the activity's `Affordance.fulfills`). */
  fulfills?: string[];
  /** Goal ids this outcome advances (defaults to the activity's `Affordance.advances`). */
  advances?: string[];
}

// ---------------------------------------------------------------------------------------------
// Decision, suggestion and explanation
// ---------------------------------------------------------------------------------------------

/** A push from an external voice. Not a command. */
export interface Suggestion {
  voiceId: EntityId;
  /** Either a specific affordance or any affordance of an action class. */
  affordanceId?: string;
  action?: string;
  /** How hard the voice pushes, 0..1. */
  strength: Unit;
  /**
   * Insisting converts a refusable "not now" into compliance under protest: the person does it, but with
   * reduced quality/speed (host reads `Activity.protest`), an autonomy drop, voice pressure, and a memory.
   * Insisting never overrides `cannot` or `willNot`.
   */
  insist?: boolean;
  /** Optional reason the voice gives; recognised keys raise persuasion when they match the person's motives. */
  appeal?: NeedId | ValueId | 'duty';
}

/**
 * - assented: does it willingly.
 * - complied: does it under protest (only after `insist`).
 * - deferred: not now — does something more pressing first; counter-offer says when.
 * - modified: does a near alternative serving the same aim (counter-offer is the alternative).
 * - refused: cannot (capacity) or will not (norm veto / broken trust).
 */
export type SuggestionVerdict = 'assented' | 'complied' | 'deferred' | 'modified' | 'refused';
/** Refusal class for UI: grey = cannot, amber = notNow, red = willNot. */
export type RefusalKind = 'cannot' | 'notNow' | 'willNot';

export interface SuggestionResolution {
  voiceId: EntityId;
  verdict: SuggestionVerdict;
  kind?: RefusalKind;
  /** For deferred: what they'll do first. For modified: the alternative they picked. */
  insteadAffordanceId?: string;
  /** e.g. { affordanceId, label: 'after I eat' } — what the person offers instead. */
  counterOffer?: { affordanceId?: string; label: string };
  /** Machine-readable dominant reason, e.g. 'need:food', 'norm:theft', 'capacity', 'autonomy', 'distrust'. */
  reason: string;
  /** Human-readable sentence in the person's voice. */
  says: string;
  /**
   * When choice is stochastic (`will.temperature > 0`): the probability that the suggested option is chosen,
   * so a telegraph can say "probably" instead of a verdict the draw may contradict. Added 2026-10-03.
   */
  likelihood?: Unit;
  /** For a distrust refusal: the remembered episode that broke trust (quote its summary in UI). */
  episodeId?: string;
  /** For an omission refusal or deferral: the closing commitment the person will not miss. */
  commitmentId?: string;
}

/** One contribution to an option's utility. */
export interface Term {
  /** 'need:food', 'norm:salah', 'commitment:c3', 'commitment' (promise inertia of the running activity),
   *  'goal:g1', 'habit', 'emotion:fear:risky' (emotion id, then the tag it acts through), 'effort', 'risk',
   *  'suggestion:player', 'social:p2', 'expectation', 'autonomy' (reactance to a pushing voice) */
  source: string;
  value: number;
}

export interface Considered {
  affordanceId: string;
  action: string;
  /** The affordance's label, copied so UIs need no lookup. */
  label?: string;
  utility: number;
  terms: Term[];
  /**
   * Hard block (cannot or will not under any push), with reason. `omission` names the closing obligatory
   * commitment this option would make the person miss (see `will/` omission rule).
   */
  vetoed?: { kind: 'cannot' | 'willNot'; reason: string; omission?: string };
  /** The host's advertised need deltas and the person's believed deltas, for legibility. */
  advertised?: Partial<Record<NeedId, number>>;
  believed?: Partial<Record<NeedId, number>>;
  /** Episode ids that shaped this option (memory made visible in narration). */
  recalled?: string[];
}

export interface DecisionRecord {
  id: string;
  at: Minute;
  chosenAffordanceId: string | null;
  chosenAction: string | null;
  /** Top options, sorted by utility, bounded. */
  considered: Considered[];
  suggestion?: SuggestionResolution;
  /** Private intention (why they act), e.g. "to feed my children", "for Allah", "to avoid trouble". */
  intention: string;
  /** Templated first-person narration of the choice. */
  narration: string;
  /** True when made while an activity was running (a review), so UIs can filter routine re-checks. */
  review?: boolean;
  /** Why this decision was brought forward, when `interrupt()` forced it (e.g. 'percept:injury'). */
  interrupt?: string;
}

// ---------------------------------------------------------------------------------------------
// Creation spec
// ---------------------------------------------------------------------------------------------

export interface PersonSpec {
  id: PersonId;
  name: string;
  seed: number;
  now?: Minute;
  bornAt: Minute;
  sex: 'female' | 'male';
  traits?: Partial<Traits>;
  values?: Partial<Values>;
  norms?: HeldNorm[];
  skills?: Record<string, Unit>;
  body?: Partial<Omit<BodyState, 'injuries' | 'illnesses' | 'nextId'>>;
  needs?: Partial<NeedReservoirs>;
  relationships?: (Partial<Relationship> & { otherId: PersonId })[];
  commitments?: Omit<Commitment, 'status'>[];
  goals?: Omit<Goal, 'status' | 'progress' | 'adoptedAt'>[];
  voices?: { voiceId: EntityId; trust?: Unit }[];
}

// ---------------------------------------------------------------------------------------------
// Cross-module argument types (modules never import each other; the composite passes these)
// ---------------------------------------------------------------------------------------------

/** What the body is doing over an interval. */
export interface BodyLoad {
  effort: Unit;
  focus: Unit;
  mode: 'awake' | 'sleep';
}

/** Age-dependent multipliers from `lifecourse/`, consumed by body, skills, affect and will. 1 = prime adult. */
export interface LifeModifiers {
  ageYears: number;
  stage: LifeStage;
  metabolism: number;
  recovery: number;
  learning: number;
  /** Developmental maturity of planning/inhibition (child < 1, adult 1). Scales habit/impulse vs long-term terms. */
  maturity: number;
  maxFitness: Unit;
  /** Annual mortality hazard from age alone (hosts may ignore). */
  mortalityPerYear: number;
}

/** Input to OCC-lite appraisal. */
export interface AppraisalEvent {
  at: Minute;
  /** 'outcome' (my action's result), 'event' (something happened), 'prospect' (might happen), 'deed' (someone's act judged against norms) */
  kind: 'outcome' | 'event' | 'prospect' | 'deed';
  /** Desirability for me, -1..1 (goal/need congruence). */
  desirability: Signed;
  /** For prospects: likelihood 0..1. */
  likelihood?: Unit;
  /** For deeds: praiseworthiness -1..1 (from norm judgement). */
  praiseworthiness?: Signed;
  /** Who acted: own id, another person id, or undefined (no agent, e.g. weather). */
  agentId?: EntityId;
  targetId?: EntityId;
  /** My affection toward the agent (-1..1), so the appraiser can produce gratitude/anger/love. */
  affectionToAgent?: Signed;
  /** Loss of a loved person or thing (grief). */
  loss?: boolean;
  /** For deeds judged against a norm: which norm. */
  normId?: string;
  cause: string;
}

export type SocialEventKind =
  | 'help'
  | 'harm'
  | 'gift'
  | 'insult'
  | 'thanks'
  | 'apology'
  | 'forgive'
  | 'promise-kept'
  | 'promise-broken'
  | 'chat'
  | 'conflict'
  | 'praise'
  | 'deceit-discovered'
  | 'shared-work';

/** A social interaction as experienced by the person whose state is updated. */
export interface SocialEvent {
  at: Minute;
  kind: SocialEventKind;
  /** The other party (who acted toward me, or whom I acted toward). */
  otherId: PersonId;
  /** True when I was the actor. */
  byMe: boolean;
  magnitude: Unit;
}
