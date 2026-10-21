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
export const DAYS_PER_YEAR = 365;
/** The largest |minute| `restore` accepts: about 1.9 million years, far past any run, far below float trouble. */
export const MAX_MINUTE = 1e12;

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

/** Bodily capacities an injury can impair (1.6.0; see `body/injury.ts`). */
export const CAPACITIES = ['moving', 'manipulation', 'sight'] as const;
export type Capacity = (typeof CAPACITIES)[number];

export interface Injury {
  id: string;
  part: string; // free text: 'hand', 'back', ...
  severity: Unit; // pain/impairment contribution
  healRatePerDay: number; // severity lost per day while resting/healthy
  since: Minute;
  /** Impairment per unit severity by capacity (1.6.0). Absent = `DEFAULT_PARTS[part]`, else none. */
  affects?: Partial<Record<Capacity, Unit>>;
  /** Health lost per day from bleeding right now (1.6.0); clots by itself, faster once tended. Absent = none. */
  bleeding?: number;
  /** Minute the injury was tended (1.6.0, `tend`). */
  tendedAt?: Minute;
}

export interface Illness {
  id: string;
  kind: string; // 'cold', 'fever', ...
  severity: Unit;
  /** Positive while worsening, negative while recovering (severity per day). */
  trendPerDay: number;
  contagious: boolean;
  since: Minute;
  /**
   * A long-standing condition (e.g. hypertension): no immune drift toward recovery; severity relaxes
   * toward `baseline` raised by sleep debt and by the exposures named in `aggravatedBy`. Never evicted
   * or dropped at low severity.
   */
  chronic?: boolean;
  /** Chronic severity absent aggravation (defaults to the severity at onset). */
  baseline?: Unit;
  /** Exposure kinds (keys of `BodyState.exposures`) whose recent load raises this chronic condition. */
  aggravatedBy?: string[];
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
  /**
   * Accumulated exertion (2.6.0, opt-in via `enableFatigueStore`): 0..1, rising slowly with sustained effort and
   * recovering with rest and faster with sleep. Raises felt fatigue and lowers capacity. Absent = no store.
   */
  depletion?: Unit;
  /**
   * Fullness (2.8.0, opt-in via `enableFullness`): when true, eating, drinking or taking relief for a need already
   * past its comfort level costs a little (`full:<need>` term) instead of being free. Absent = no term.
   */
  fullness?: boolean;
  asleep: boolean;
  /** Minute the current sleep or wake period began. */
  since: Minute;
  alive: boolean;
  /** Counter for injury and illness ids (ids stay unique after bounded eviction). */
  nextId: number;
  /** Host-driven exposures (e.g. 'smoke'), see `body.expose`. Absent = none. Bounded by BODY_DEFAULTS.maxExposures. */
  exposures?: Record<string, Exposure>;
  /**
   * Host-declared depletion rates replacing the matching `BODY_DEFAULTS` for this body (integration,
   * 2026-10-03): a scenario tuned on another time scale pins the rates it was built on. Absent = defaults.
   */
  rates?: BodyRates;
  /** The last finished sleep (1.7.0), set on waking; the agenda reads it to excuse a window slept through. */
  lastSleep?: { from: Minute; to: Minute };
  /** The last finished downing (1.7.0), set when it lifts; the agenda reads it for a window that closed in it. */
  lastDowned?: { from: Minute; to: Minute };
  /** Downed (1.6.0): can only lie, rest or sleep where they are. Absent = up. */
  downed?: { since: Minute; reason: string; until?: Minute };
  /** Derived downing floor (1.6.0, `enableDowned`): go down below either. Absent = only the host downs. */
  downedBelow?: { moving?: Unit; health?: Unit };
}
/** Per-minute depletion rates a host may pin per person; see `BodyState.rates`. */
export interface BodyRates {
  satietyPerMinute?: number;
  satietyEffortPerMinute?: number;
  hydrationPerMinute?: number;
  hydrationEffortPerMinute?: number;
}
/** A repeated exposure: a recent load (days-scale decay) and a cumulative dose (years-scale decay). */
export interface Exposure {
  /** Recent load 0..1; aggravates chronic conditions. */
  recent: Unit;
  /** Cumulative dose in host units (e.g. one unit per daily-equivalent); drives illness risk. */
  cumulative: number;
  lastAt: Minute;
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
// Personality, values and understood norms — owned by `person.ts` (traits, values) and `conscience/` (norms)
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

/** The six trait keys in canonical order (the order every loop over traits uses, and the save's key order). */
export const TRAIT_KEYS: readonly (keyof Traits)[] = [
  'honesty',
  'emotionality',
  'extraversion',
  'agreeableness',
  'conscientiousness',
  'openness',
];

/** The ten value keys in canonical order (the order every loop over values uses, and the save's key order). */
export const VALUE_KEYS: readonly ValueId[] = [
  'benevolence',
  'universalism',
  'tradition',
  'conformity',
  'security',
  'achievement',
  'power',
  'hedonism',
  'stimulation',
  'selfDirection',
];

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
  /**
   * Catalogued exemptions from an obligation (e.g. the fast for the ill and the traveller, Qur'an 2:184-185),
   * each with its own provenance. Distinct from the forbidden-norm necessity exception (2:173). `makeUp` = the
   * missed instance is owed later (qada).
   */
  exemptions?: NormExemption[];
}
/** One catalogued condition under which an obligation is not held for a day. */
export interface NormExemption {
  when: 'illness' | 'travel';
  makeUp: boolean;
  sources: { kind: 'revelation' | 'hadith' | 'interpretation' | 'empirical' | 'assumption'; ref: string }[];
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
  /** Mental breaks (1.6.0, `affect/crisis.ts`): present only when the host enabled them with `enableBreaks`. */
  crisis?: CrisisState;
}

/**
 * A break behaviour the host's world can express (1.6.0). During a break of this kind only offers whose action is
 * in `actions`, that carry one of `tags`, or that are tagged `break:<id>` are open to the person.
 */
export interface BreakBehaviour {
  id: string;
  label?: string;
  /** Relative chance of this behaviour at onset (default 1). */
  weight?: number;
  actions?: string[];
  tags?: string[];
  /** Length range in minutes (default `CRISIS_DEFAULTS.minutes`). */
  minutes?: [number, number];
}

export interface CrisisState {
  /** Accumulated strain, 0..1. */
  stress: Unit;
  /** Minute of the last hourly check. */
  checkedAt: Minute;
  break?: { behaviourId: string; since: Minute; until: Minute };
  lastBreakAt?: Minute;
  /** Breaks so far. */
  breaks: number;
  behaviours: BreakBehaviour[];
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
  /** Cue occasions on which a different action was completed (extinction by withholding). */
  withheld?: number;
  /** Last minute a withholding counted (spacing: at most one meaningful withholding per cue occasion). */
  lastWithheldAt?: Minute;
  /**
   * 0..1 susceptibility to cue-reactive urges after abstinence (host-set for dependence-producing actions
   * such as smoking). Absent/0 = no urge spike.
   */
  craving?: Unit;
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
  /** Minute this episode was last brought back by `recallByCue` (refractory period; absent = never cue-recalled). */
  recalledAt?: Minute;
}

export interface Belief {
  /** Proposition key, e.g. 'stock:well:empty', 'p2:honest', 'place:forest:dangerous'. */
  prop: string;
  /** Log-odds credence. 0 = 50/50. */
  logOdds: number;
  updatedAt: Minute;
  /** Sources that contributed and the direction each claimed (bounded), so `confirm` can recalibrate them. */
  sources: { id: EntityId; value: boolean }[];
  /**
   * Where this person first got the belief (2.10.0, `beliefs/`). Absent unless an incoming claim carried provenance
   * (`PerceptClaim.origin` or `lineage`). First acquisition wins; never read by decisions.
   */
  provenance?: BeliefProvenance;
}

/** Where a belief first came from, as far as the person knows (2.10.0). Owned by `beliefs/`. */
export interface BeliefProvenance {
  /** Who first said it: the first teller of the chain as told, or this person when they saw it themselves. */
  origin: EntityId;
  /** Who this person first heard it from (equal to `origin` when told first-hand or observed). */
  firstFrom: EntityId;
  /** Minute the provenance was acquired. */
  at: Minute;
  /** Opaque host token (at most 64 characters), carried unchanged through relays; HF never parses it. */
  lineage?: string;
}

/** One proposition claim carried by a percept. */
export interface PerceptClaim {
  prop: string;
  value: boolean;
  confidence: Unit;
  /** 2.10.0: who first said it, as the teller passes it on (provenance; never read by decisions). */
  origin?: EntityId;
  /** 2.10.0: opaque host lineage token (at most 64 characters), carried unchanged by `converse`. */
  lineage?: string;
}

/**
 * A report that `sourceId` told the reporter (the percept's `actorId`) that `prop` is `value` (2.10.0). On an attended
 * `told` percept it is checked against what `sourceId` told this person (`beliefs.contradicted`).
 */
export interface ReportedAccount {
  sourceId: EntityId;
  prop: string;
  value: boolean;
}

/** A noted contradiction by one source on one proposition (2.10.0, `beliefs/`); kept so it counts once. */
export interface NotedContradiction {
  sourceId: EntityId;
  prop: string;
  at: Minute;
  /** Testimony weight already applied, 0..1; absent means 1 (heard both accounts directly). */
  weight?: Unit;
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

/**
 * A lasting gist (1.8.0, `memory.enableGists`): several episodes of the same kind, action, people and place folded
 * into one valenced memory that fades over years, not days. It has an episode's fields so recall reads both alike:
 * `id` is `g<n>`, `at` is the minute of the strongest episode folded in (its `summary` is kept), `valence` is the
 * encoding-strength-weighted mean and `salience` decays with `GIST_DEFAULTS` half-lives.
 */
export interface Gist extends Episode {
  /** Episodes folded in. */
  count: number;
  firstAt: Minute;
  lastAt: Minute;
  /** Sum of the encoding strengths folded in (the weight of `valence`). */
  weight: number;
  /** Encoding strength of the episode whose `summary` and `at` are kept. */
  peak: Unit;
}

export interface MemoryState {
  episodes: Episode[]; // bounded; low-salience episodes forgotten first
  beliefs: Belief[];
  expectations: ActionExpectation[];
  /** Trust in each information source (person or channel), 0..1, default 0.5. */
  sourceTrust: Record<EntityId, Unit>;
  nextEpisode: number;
  /** Lasting gists (1.8.0, opt-in via `enableGists`; absent = episodes are simply forgotten). Bounded. */
  gists?: Gist[];
  nextGist?: number;
  /** Contradictions already noted (2.10.0, `beliefs.contradicted`). Absent until one is noted. Bounded. */
  contradictions?: NotedContradiction[];
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
  /**
   * Set by `social.markDeceased`: the minute the other person died. The tie also carries the role 'deceased';
   * affection persists, interaction is impossible, and recall of them is a grief cue.
   */
  deceasedAt?: Minute;
  /** Groups I believe they are in (1.6.0, `meet`). Absent = unknown. */
  groups?: string[];
}

export interface SocialState {
  relationships: Relationship[];
  /** Groups I count myself in and my stance toward outsiders (1.6.0, `joinGroups`). Absent = none. */
  groups?: { memberOf: string[]; outsiderStance?: Signed };
  /**
   * Impressions (HF 2.0 L6, `social/impressions.ts`): what I believe about other people's state, traits, ties and
   * trust, each with how much I have seen. Absent until the host makes the person observe someone.
   */
  impressions?: Impression[];
  /**
   * How much I keep from showing (HF 2.0 L6), 0..1 per state cue: a proud person hides pain. Absent = the default
   * from emotionality (`IMPRESSION_DEFAULTS.reserve`).
   */
  reserve?: Partial<Record<StateCue, Unit>>;
}

/** The state cues an observer can read off a person (HF 2.0 L6). */
export type StateCue = 'fatigue' | 'pain' | 'fear' | 'mood';

/**
 * One belief about another person (HF 2.0 L6). Keys: a state cue ('fatigue', 'pain', 'fear', 'mood'), fear of a
 * place ('fear@<placeId>'), a HEXACO trait ('trait:<name>'), a tie ('tie:<otherId>', closeness -1..1) or trust in a
 * voice ('trust:<voiceId>'). `mean` is the running estimate, `weight` how much has been seen (decays by key kind),
 * `at` the last observation.
 */
export interface ImpressionCue {
  key: string;
  mean: number;
  weight: number;
  at: Minute;
}

export interface Impression {
  targetId: PersonId;
  cues: ImpressionCue[];
  /** Minute of the last observation of any cue. */
  seenAt: Minute;
}

// ---------------------------------------------------------------------------------------------
// Commitments and goals — owned by `agenda/`
// ---------------------------------------------------------------------------------------------

export interface Commitment {
  id: string;
  /** 'abstain' (lane agenda+conscience): kept by NOT completing any `violatedBy` action inside the window. */
  kind: 'promise' | 'duty' | 'appointment' | 'worship' | 'job' | 'abstain';
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
  /**
   * Optional display name, e.g. 'Maghrib'; used in counter-offers ("after I pray Maghrib") and in `reviewLine`
   * ("I didn't keep my call to Mum"), so write it as a noun phrase.
   */
  label?: string;
  /** For kind 'abstain': action ids whose completion inside the window breaks it. */
  violatedBy?: string[];
  /** For kind 'abstain': catalogued conditions under which the person may not hold it that day. */
  exemptWhen?: ('illness' | 'travel')[];
  /**
   * Set when an exemption applied: the commitment is not held and closes as 'released' (its chain still recurs).
   * 'necessity' (review 2026-10-03): broken under the capacity bound / necessity exception, excused, make-up owed.
   * 'sleep' / 'unconscious' (1.7.0): a worship window passed while the person slept through it or was downed; blame
   * is lifted and a make-up is owed (see agenda SCOPE, missed duties).
   */
  exempt?: { reason: 'illness' | 'travel' | 'necessity' | MissedExcuse; at: Minute };
  /** For a make-up (qada) commitment: the id of the exempted instance it makes up. */
  makeUpOf?: string;
  /**
   * Recurrence chain key (e.g. 'salah:fajr'). When both commitments carry one, chain identity is this key alone,
   * so windows retimed by a calendar stay one chain.
   */
  chain?: string;
  /** No successor is spawned whose window would start after this minute (e.g. the end of Ramadan). */
  recurUntil?: Minute;
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
  /** Opt-in expected completion valuation; deadline remains urgency, never a cutoff. */
  temporal?: { halfLifeMinutes: number };
  /** Last minute the goal was advanced (or adopted); neglect is counted from here. */
  lastAdvancedAt?: Minute;
  /** Importance before neglect decay; `revisePurposes` recomputes `importance` from it. */
  baseImportance?: Unit;
}

export interface AgendaState {
  commitments: Commitment[];
  goals: Goal[];
  nextId: number;
  /** Day index of the last spontaneous goal proposal (-1 = never); at most one proposal per day. */
  lastProposalDay: number;
  /** Make-ups owed (qada), bounded; `scheduleMakeUp` turns one into a commitment. */
  owed?: OwedMakeUp[];
  /**
   * The current stretch of worship windows missed while downed (1.7.0): `since` is the downing's start, `missed` the
   * windows closed in it. Once more than `AGENDA_DEFAULTS.lapseWaiver` have closed, that stretch's debt drops.
   */
  lapse?: { since: Minute; missed: number };
}
/** Why a worship window passed unkept without blame (1.7.0): asleep throughout, or downed when it closed. */
export type MissedExcuse = 'sleep' | 'unconscious';
/**
 * An obligation owed later (qada): an exempted instance (illness, travel, necessity), a worship window missed
 * (excused or not), or an obligatory abstention broken.
 */
export interface OwedMakeUp {
  /** Id of the exempted commitment. */
  ofId: string;
  normId?: string;
  kind: Commitment['kind'];
  violatedBy?: string[];
  actions: string[];
  /**
   * 'necessity' added by review 2026-10-03 (see `Commitment.exempt`). 1.7.0: 'sleep' and 'unconscious' (missed
   * without blame), 'missed' (a worship window passed while awake and able, or in a mental break), 'broken' (an
   * obligatory abstention broken).
   */
  reason: 'illness' | 'travel' | 'necessity' | MissedExcuse | 'missed' | 'broken';
  /** For 'unconscious': the start of the downing it fell in (its stretch may be waived, `AgendaState.lapse`). */
  lapseSince?: Minute;
  at: Minute;
  label?: string;
  /** Id of the make-up commitment once scheduled. */
  scheduledAs?: string;
}

// ---------------------------------------------------------------------------------------------
// Will — owned by `will/`
// ---------------------------------------------------------------------------------------------

/** The person's relationship to an external suggesting voice (a host's voice, a manager, a parent). */
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
  /** Seeded from `PersonSpec.voices` (a host's voice, family): never evicted to make room for a new voice. */
  seeded?: boolean;
  /**
   * Good outcomes already credited to this voice per action, as a count that halves every
   * `WILL_DEFAULTS.creditHalfLife` minutes (bounded, `maxCredited`). A repeat of advice that went well at the same
   * action earns less trust (see `learnFromVoice`).
   */
  credited?: { action: string; n: number; at: Minute }[];
  /** Last minute being asked again wore trust down (`WILL_DEFAULTS.wornInterval` apart at most once). */
  lastWornAt?: Minute;
}

/** One change of trust in a voice, for UI trust meters. */
export interface VoiceTrustEvent {
  at: Minute;
  /** Signed change in trust. */
  delta: number;
  /**
   * Machine-readable cause: 'went-well', 'went-badly', 'harm', 'harm-under-protest', and (review 2026-10-03)
   * 'breach' / 'breach-under-protest' when the pushed act broke a commitment or the person's standards.
   */
  reason: string;
  /** The suggested action whose outcome moved trust. */
  action?: string;
  /** When small same-reason changes were folded into this entry: the minute of the first, and how many. */
  from?: Minute;
  count?: number;
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
  /**
   * Standing advice (N9): suggestions remembered from `told` percepts that named an action. Each entry adds a
   * decaying `suggestion:remembered:<sourceId>` term on later decisions. Bounded (`WILL_DEFAULTS.maxAdvice`),
   * one entry per (source, action). Absent on saves from before the lane; treat as empty.
   */
  advice?: StandingAdvice[];
  /**
   * Direct control by a host voice (1.6.0, see `Command`). Present while the person is commanded; absent otherwise.
   * `chargedAt` is the minute the autonomy cost was last charged up to; `margin` the latest utility gap between
   * what the person would have done and what they were commanded to do.
   */
  command?: Command & {
    startedAt: Minute;
    chargedAt: Minute;
    margin: number;
    /** Whether the latest decision obeyed it (only obeyed time is charged). */
    obeyed?: boolean;
    /** The memory of being commanded has been written (once, when first obeyed). */
    remembered?: boolean;
  };
  /** How the last command ended, so a host re-sending the same command (`since`) does not restart it. */
  lastCommand?: { voiceId: EntityId; since: Minute; endedAt: Minute; reason: string };
}

/**
 * A command (1.6.0): a host voice takes direct control of a person. Unlike a `Suggestion` it is not weighed:
 * while it holds, the person does the commanded offer whatever they would have chosen, at an autonomy cost per
 * controlled hour that grows with how far their own choice preferred something else. It ends on its own (see
 * `will/` command SCOPE) at death, a mental break, being downed, or an act the person will not do (a held norm, a
 * closing duty); a pressing bodily need only suspends it for a decision. Target an affordance id, or an action class.
 */
export interface Command {
  voiceId: EntityId;
  affordanceId?: string;
  action?: string;
  /** The minute the host gave it; it identifies the command (re-sending the same `since` does not restart it). */
  since: Minute;
  /** Keep doing it after the commanded activity finishes (default false: control ends 'done' after one activity). */
  repeat?: boolean;
}

// ---------------------------------------------------------------------------------------------
// Life course — owned by `lifecourse/`
// ---------------------------------------------------------------------------------------------

export type LifeStage = 'infant' | 'child' | 'adolescent' | 'adult' | 'elder';

/** Slow trait and value change (1.8.0) — owned by `character/`. */
export interface CharacterState {
  /** Traits and values when change was enabled; drift stays within `CHARACTER_DEFAULTS.maxDrift` of them. */
  baseTraits: Traits;
  baseValues: Values;
  /** Year being accumulated (`floor(day / 365)`). */
  year: number;
  /** The year's experience so far: days, summed mood, commitments kept and broken, minutes with others, distinct actions. */
  acc: { days: number; mood: number; kept: number; broken: number; social: number; variety: number };
  /** Minute maturation has been applied up to. */
  agedTo: Minute;
  /** Each trait's current offset from its maturation path due to experience; it decays toward 0 year by year. */
  experience: Partial<Record<keyof Traits, number>>;
}

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
  /**
   * Set by `begin` when the chosen act was possible only because necessity / the capacity bound lifted a
   * conscience veto (eating forbidden food, or drinking during the fast, in extremity). `finish` then records no
   * breach for it and excuses a broken abstention with a make-up owed.
   */
  necessity?: boolean;
  /**
   * Every assented/complied voice resolution behind this activity (several voices may have pushed the chosen
   * option). `finish` calls `learnFromVoice` once per entry. `suggestion` remains the credited one.
   */
  suggestions?: SuggestionResolution[];
}

// ---------------------------------------------------------------------------------------------
// The person
// ---------------------------------------------------------------------------------------------

export const PERSON_SCHEMA = 'human/person@1';
/**
 * Current: 2.3.0 (2026-10-17): optional temporal goals and received consequences.
 * 2.2.0 (2026-10-14): method evidence grades each action independently.
 * Successful alternatives no longer count as failures of another action. Person state shape is unchanged.
 * 2.1.0 saves migrate by stamping the version.
 *
 * 2.1.0 (2026-10-10): optional acquired conditional methods and explicit received cue contexts.
 * Normal cognition reads learned method evidence only on offers carrying the matching context.
 * Existing hosts with no method state keep their previous decisions; 2.0.0 saves migrate by stamping the version.
 *
 * Earlier engines (oldest first):
 * 1.1.0 (2026-10-03): joint activities, omission/distrust rules, reactance, voice history.
 * 1.2.0 (2026-10-03): several voices per decision, standing advice, abstentions and fasting perception,
 * illness coupled to rest and food, habit ease and extinction, cue recall, chronicle, lexicon. Acute-illness and
 * habit-eased scores differ from 1.1.0 for the same inputs, so saves from earlier engines do not restore.
 * 1.3.0 (2026-10-03): a commitment begun inside its window stays open until its activity ends, shared habit
 * refractory, trust worn by pressing a declined suggestion, diminishing trust from repeated good outcomes; voice
 * history entries gain `from`/`count` (see docs/framework.md).
 * 1.4.0 (2026-10-03): standing advice that keeps a commitment is heard until done once per occasion
 * (`Suggestion.since`, `Community.standingDone`). Person saves are unchanged in shape but decisions under standing
 * advice differ, so 1.3.0 saves do not restore.
 * 1.5.0 (2026-10-04): standing advice is heard for the running activity. Person shape unchanged.
 * 1.6.0 (2026-10-04): `restore` migrates 1.4.0 and 1.5.0 saves (`migrate`); commanded control, mental breaks,
 * per-part capacities with bleeding and a downed state, and insider/outsider ties with threat percepts. All new
 * person state is optional and absent until used, and none of it changes a run that does not use it.
 * 1.7.0 (2026-10-04), research/decisions.md as defaults: Fajr ends at sunrise (`PrayerTimes.sunrise`), missed
 * obligatory worship and broken obligatory fasts leave a make-up debt, sleep and unconsciousness lift the blame
 * (`missedExcuse`), the Eid prayer norm and window, disliked times. New optional state: `body.lastSleep`,
 * `body.lastDowned`, `agenda.lapse`, `OwedMakeUp.lapseSince`.
 * 1.8.0 (2026-10-04): optional `family` (aptitudes, pregnancy, upbringing, attachment), `bonds` (courtship, marriage,
 * widowhood) and `ambient` (environment percepts) slices; long-run state: `memory.gists`, `chronicleYears`,
 * `character` (slow trait and value change) and `skillRetention` (consolidation). All absent until a host uses them;
 * a run that does not use them is unchanged, and 1.7.0 saves restore by a version stamp.
 * 1.9.0 (2026-10-04): the omission rule protects a duty while an activity begun inside its window runs past the end,
 * and an activity that would cover a closing stretch is reviewed when the stretch begins (`isUnderWay`,
 * `dutyReviewAt`). Person shape unchanged.
 */
export const ENGINE_VERSION = '2.10.0';

// ---------------------------------------------------------------------------------------------
// Family, bonds and ambient (1.8.0, optional slices)
// ---------------------------------------------------------------------------------------------

/** A pregnancy carried by this person (host-driven; see `family/`). */
export interface Pregnancy {
  fatherId: PersonId;
  conceivedAt: Minute;
  dueAt: Minute;
  /** Seed for the child's stream (passed to `createChild`). */
  seed: number;
}

/** Upbringing and inherited learning tendencies. Owned by `family/`. */
export interface FamilyState {
  /** Learning multipliers per skill id (1 = population average), inherited at birth. */
  aptitudes?: Record<string, number>;
  pregnancy?: Pregnancy;
  /** Security of attachment to caregivers, 0..1 (moves most in early childhood). */
  attachment?: Unit;
  /** Minutes of upbringing exposure accumulated (readout only). */
  raisedMinutes?: number;
}

/** A courtship in progress, seen from this person's side. */
export interface Courtship {
  withId: PersonId;
  since: Minute;
  /** Mutual warmth built by courting, 0..1 (decays without meetings). */
  warmth: Unit;
  /** Appeal of the other as last assessed (`partnering.attraction`), 0..1. */
  appeal: Unit;
  meetings: number;
  lastAt: Minute;
  engagedAt?: Minute;
}

export interface Marriage {
  spouseId: PersonId;
  since: Minute;
  endedAt?: Minute;
  end?: 'widowed';
  /** Waiting period in days this person observes if widowed, fixed at the wedding from the host's custom. */
  mourningDays?: number;
}

/** Courtship, marriage and widowhood. Owned by `partnering/`. */
export interface BondsState {
  courtships: Courtship[];
  marriages: Marriage[];
  /** A waiting period after a spouse's death, when the person's understanding includes one. */
  mourning?: { forId: PersonId; since: Minute; until: Minute };
}

/** What the surroundings are like, as the host perceives them for this person. */
export interface AmbientPercept {
  /** Cold stress 0..1 (0 = comfortable). */
  cold?: Unit;
  /** Darkness 0..1 (night without light). */
  dark?: Unit;
  /** Felt density of people 0..1. */
  crowding?: Unit;
  /** Beauty (+1) to squalor (−1). */
  beauty?: Signed;
  /** Pleasant (+1) to foul (−1) weather. */
  weather?: Signed;
  /** Hours of daylight today (season); omitted = no seasonal effect. */
  dayLength?: number;
  outdoors?: boolean;
}

/** The current surroundings. Owned by `environment/`. */
export interface AmbientState {
  /** What the host perceives of the surroundings (2.0.0: renamed from `now`, which elsewhere is a minute). */
  percept: AmbientPercept;
  /** Minute these surroundings began. */
  since: Minute;
}

/** A received categorical observation; missing values never stand for a negative observation. */
export interface MethodCue {
  cue: string;
  value: string;
}

export interface MethodRule {
  id: string;
  action: string;
  conditions: MethodCue[];
  evidence: {
    id: string;
    sourceId: string;
    at: Minute;
    attention: Unit;
    outcome: 'success' | 'failure';
  }[];
}

/** Optional conditional action learning. Owned by methods/, not a host answer table. */
export interface MethodsState {
  rules: MethodRule[];
  /** Last 256 acquired example ids, independent of rule/evidence eviction. */
  recentDemonstrations: string[];
  context?: { id: string; at: Minute; cues: MethodCue[] };
}

/** Exact current-action identity; omitted target/place match only omitted values. */
export interface ConsequenceAction {
  action: string;
  targetId?: EntityId;
  placeId?: EntityId;
}

/** A received conditional opportunity, never another person's consent or an actual outcome. */
export interface ReceivedConsequence {
  id: string;
  revision: number;
  trigger: ConsequenceAction;
  successor: ConsequenceAction & {
    duration: number;
    effort: Unit;
    focus?: Unit;
    materialCost?: number;
  };
  availableFrom: Minute;
  /** Latest permitted successor completion, inclusive. */
  availableUntil: Minute;
  expiresAt: Minute;
  /** P(access | trigger completes successfully), not consent. */
  chance: Unit;
  confidence: Unit;
}

export interface ConsequenceRevision {
  sourceId: EntityId;
  id: string;
  revision: number;
  receivedAt: Minute;
}

export interface RetainedConsequence extends ReceivedConsequence {
  sourceId: EntityId;
  channel: 'told';
  receivedAt: Minute;
  /** Own completed trigger; does not establish access or goal progress. */
  triggeredAt?: Minute;
}

/** Optional person-owned received knowledge. Deduplication lasts only within bounded revision memory. */
export interface ProspectionState {
  entries: RetainedConsequence[];
  revisions: ConsequenceRevision[];
}

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
  /** Acquired conditional method evidence and current received cues; absent until used. */
  methods?: MethodsState;
  /** Received future consequences, absent until attended testimony supplies them. */
  prospection?: ProspectionState;
  /** Noticed promptings and practised turnings-away (2.4.0, opt-in via `enablePromptings`). Owned by `promptings/`. */
  promptings?: PromptingsState;
  /** Intrinsic exploration and varied repetition. Owned by `curiosity/`; absent unless enabled. */
  curiosity?: CuriosityState;
  /** Evening self-review and its resolves (2.7.0, opt-in via `enableReview`). Owned by `review/`. */
  review?: ReviewState;
  /** Practice consolidation (1.8.0, opt-in via `enableSkillRetention`). Owned by `skills/`. */
  skillRetention?: { consolidationHours: number };
  habits: Habit[];
  memory: MemoryState;
  social: SocialState;
  agenda: AgendaState;
  will: WillState;
  activity: Activity | null;
  /** Bounded ring of recent decisions for explanation UI. */
  trace: DecisionRecord[];
  nextDecision: number;
  /** Consolidated day records, oldest first, bounded (`CHRONICLE_DEFAULTS.maxDays`). Owned by `chronicle/`. */
  chronicle?: DayRecord[];
  /** The open day's accumulator (plain JSON, survives saves mid-day). Owned by `chronicle/`. */
  chronicleDay?: ChronicleDay;
  /** Year summaries, oldest first (1.8.0, opt-in via `enableYearbook`; absent = dropped days leave nothing). */
  chronicleYears?: YearRecord[];
  /**
   * Slow trait and value change (1.8.0, opt-in via `enableCharacterChange`). Owned by `character/`, which is then the
   * only writer of `traits` and `values` after birth. Absent: they stay as set at birth.
   */
  character?: CharacterState;
  /** Host phrase pack and names for narration (N6). Read by `narrate/`; written only by the host. */
  lexicon?: Lexicon;
  /** Aptitudes, pregnancy, upbringing and attachment (1.8.0). Owned by `family/`. */
  family?: FamilyState;
  /** Courtship, marriage and widowhood (1.8.0). Owned by `partnering/`. */
  bonds?: BondsState;
  /** Current surroundings (1.8.0). Owned by `environment/`. */
  ambient?: AmbientState;
  /** Per-person bounds on record slices (2.0.0); absent means the module defaults. Written by `setRetention`. */
  retention?: Retention;
}

/**
 * Per-person bounds on the slices a host may not read (2.0.0). The defaults suit a person lived day by day; a host
 * that lives people sparsely over decades (a few detailed days a year) can keep saves small and the yearbook timely.
 * Neither bound changes a decision: the trace is explanation only, and the chronicle's own reader (a fast's streak)
 * looks back at most a month of consecutive days.
 */
export interface Retention {
  /** Decision records kept in `trace`, 0..`PERSON_DEFAULTS.maxTrace` (default the maximum); 0 keeps none. */
  trace?: number;
  /**
   * Day records more than this many days older than the newest leave the chronicle (and fold into the yearbook when
   * it is on), as well as those beyond `CHRONICLE_DEFAULTS.maxDays`. At least 31. Absent: the count bound only.
   */
  chronicleDays?: number;
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
  /** Received method context this offer belongs to; absent = no method term. */
  methodContext?: string;
  targetId?: EntityId;
  placeId?: EntityId;
  /** Other people taking part. */
  with?: PersonId[];
  /**
   * People already taking this course (2.8.0): a partner moving on, a companion leaving for home. Choosing it keeps
   * the person with them, a `together:<id>` term from closeness (`cognition` SCOPE). Unlike `with`, it says who is
   * going this way, not who would take part. Absent = no term, exactly as before.
   */
  alongside?: PersonId[];
  /** Minutes the activity occupies (including travel if the host folds it in). */
  duration: number;
  /** Physical exertion 0..1. */
  effort: Unit;
  /** Mental load 0..1. */
  focus?: Unit;
  /** 'sleep' makes the body sleep for the duration. */
  mode?: 'awake' | 'sleep';
  /**
   * The skill this activity practises. `domain` (1.8.0, optional) picks the age curve for its learning rate
   * (`lifecourse.learningMultiplier`); absent means the general curve (`LifeModifiers.learning`), as before.
   */
  skill?: { id: string; difficulty: Unit; domain?: LearningDomain };
  /** Advertised need deltas over the whole activity (positive = satisfies). */
  advertises: Partial<Record<NeedId, number>>;
  /** Free tags: 'work', 'leisure', 'social', 'worship', 'risky', 'outdoors', ... */
  tags?: string[];
  norms?: NormTag[];
  /**
   * Commitment ids this would fulfil if completed. Listing two or more keeps every listed one that is pending and
   * in window, and no other (2.9.0), not even an earlier-ending match by action; listing one keeps the
   * earliest-ending match, explicit or by action, as before.
   */
  fulfills?: string[];
  /** Goal ids this advances. */
  advances?: string[];
  /** Probability of harm and its severity, as advertised. */
  risk?: { chance: Unit; severity: Unit; kind: string };
  /**
   * Exertion the person knows must follow this act (2.5.0): the way back down, carrying the load home. The
   * person forecasts their own body through the act and these spans (`prospection/` forecast) and weighs being
   * spent during them. Absent = no forecast, exactly as before.
   */
  followedBy?: FollowOn[];
  /**
   * Readout thresholds for this offer's forecast (2.8.0), for hosts whose people live higher on a readout (a
   * night keeper at sleepiness 0.7). `comfortAt` is where the forecast starts to weigh and `spentAt` where it
   * weighs fully; either absent, or a pair that is not 0 ≤ comfortAt < spentAt ≤ 1, falls back to
   * `FORECAST_DEFAULTS`. Ignored without `followedBy`.
   */
  forecastAt?: { comfortAt?: Unit; spentAt?: Unit };
  /** Set on a partner's mirror offer by the joint protocol in `sim/` (the proposal id). */
  jointId?: string;
  /** Material gain/cost in host units (e.g. coins). Valued via security/achievement/power values. */
  material?: number;
  /** Minimum bodily capacities needed (1.6.0); below any, the offer is vetoed `cannot`/`capacity:<c>`. */
  requires?: Partial<Record<Capacity, Unit>>;
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
  claims?: PerceptClaim[];
  /** Norms the observed act honoured or violated (for judging others). */
  norms?: NormTag[];
  /**
   * A threat (1.6.0): harm of `severity` that may come (`chance`, default 0.7) from `sourceId` (default the actor;
   * a person or a place) to `aboutId` (default the perceiver). Becomes fear by how much `aboutId` matters to the
   * perceiver, aimed at the source (see the social/groups SCOPE).
   */
  threat?: { severity: Unit; chance?: Unit; sourceId?: EntityId; aboutId?: PersonId };
  summary: string;
  /**
   * Host flag for `sim/` interrupts. true: this percept is near the person (the framework has no spatial model),
   * so a salient one forces re-decision even if it does not target them. false: never interrupts.
   */
  near?: boolean;
  /**
   * Advice carried by testimony (N9): actions the speaker urged ("see the doctor this week"). On an attended
   * `told` percept, `will.rememberAdvice` stores each as standing advice from `actorId`.
   */
  advice?: { action: string; affordanceId?: string; strength?: Unit }[];
  /**
   * Observational learning (1.8.0): the person watched someone practise `skill` at `level` for `minutes`. On an
   * attended percept the watcher learns a little toward the model (`skills.learnByWatching`). Absent: nothing is learned.
   */
  demonstrates?: { skill: string; level: Unit; minutes: number; domain?: LearningDomain };
  /** At most four additions/withdrawals combined; attended external testimony to this person or a broadcast. */
  consequences?: readonly ReceivedConsequence[];
  withdrawConsequences?: readonly { id: string; revision: number }[];
  /**
   * 2.10.0: on a percept of my own act (`actorId` is the perceiver), the people I saw see it. Each one's believed
   * regard of me moves (`social/impressions.ts`, `noteKnownBy`). Someone present but not listed changes nothing.
   * The first 8 are read.
   */
  witnesses?: readonly PersonId[];
  /** 2.10.0: on a `told` percept, accounts the teller says another source gave them (at most four). */
  reports?: readonly ReportedAccount[];
}

/**
 * Domains with distinct age curves for learning rate (`lifecourse.learningMultiplier`). 'general' is
 * `LifeModifiers.learning`; 'language' is grammar and second-language learning; 'motor' is new movement skills;
 * 'knowledge' is facts and know-how.
 */
export type LearningDomain = 'general' | 'language' | 'motor' | 'knowledge';

/**
 * How a stretch of practice went, as input to learning (1.8.0, host opt-in on `Outcome.practice`). Absent fields
 * leave learning exactly as without them.
 */
export interface PracticeConditions {
  /**
   * Deliberate-practice quality 0..1 (focused, with feedback and correction, versus going through the motions).
   * 0.5 is ordinary practice and changes nothing; see `SKILL_DEFAULTS.qualityLow`/`qualityHigh`.
   */
  quality?: Unit;
  /**
   * Guidance from someone more skilled while practising: the teacher's level in this skill and how engaged the
   * guidance was (0..1, default 1). It raises how much this practice teaches, not only how well it goes
   * (`skills.PracticeConditions`). `instructionFrom(teacher, skill)` builds it.
   */
  instruction?: { level: Unit; engagement?: Unit; teacherId?: EntityId };
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
  /**
   * Commitment ids this outcome keeps (defaults to the activity's `Affordance.fulfills`). With two or more listed,
   * every listed one pending and in window is kept, and no other (2.9.0); with one, one completion keeps the
   * earliest-ending match.
   */
  fulfills?: string[];
  /** Goal ids this outcome advances (defaults to the activity's `Affordance.advances`). */
  advances?: string[];
  /**
   * Host-defined exposures this outcome caused (e.g. one dose of a substance: `{ kind: 'smoke' }`); `finish` records each
   * through `body.expose`, which aggravates chronic conditions listing the kind and feeds `exposureChance`.
   */
  exposures?: { kind: string; amount?: number }[];
  /** How the practice went, for learning (1.8.0): quality and instruction. Absent: learning as before. */
  practice?: PracticeConditions;
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
  /**
   * Standing suggestions (`StepOptions.suggestions`): the minute the voice gave it. Only a completion of its action
   * after this minute satisfies it (see the standing-advice SCOPE in `sim/`), so advice given again is heard afresh.
   * Unset: any completion counts.
   */
  since?: Minute;
}

/**
 * - assented: does it willingly.
 * - complied: does it under protest (only after `insist`).
 * - deferred: not now — does something more pressing first; counter-offer says when.
 * - modified: does a near alternative serving the same aim (counter-offer is the alternative).
 * - refused: cannot (capacity) or will not (norm veto / broken trust).
 * - commanded: does it because a host has direct control (1.6.0, `Command`); not a suggestion's verdict.
 */
export type SuggestionVerdict = 'assented' | 'complied' | 'deferred' | 'modified' | 'refused' | 'commanded';
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
  /** The voice insisted. An insisted suggestion earns no trust when it goes well (2026-10-03). */
  insisted?: boolean;
  /** For commanded: how far the person's own choice out-scored the commanded option (≥ 0, utility units). */
  margin?: number;
}

/** One contribution to an option's utility. */
export interface Term {
  /** 'need:food', 'norm:salah', 'commitment:c3', 'commitment' (promise inertia of the running activity),
   *  'goal:g1', 'habit', 'emotion:fear:risky' (emotion id, then the tag it acts through), 'effort', 'risk',
   *  'suggestion:player', 'social:p2', 'expectation', 'autonomy' (reactance to a pushing voice),
   *  'promptings:turn' (a practised turning-away), 'forecast:body' (expected
   *  bodily state during `followedBy` spans), 'promptings:echo' (recurrence under the `fault` reading),
   *  'review:resolve' (a resolve from the evening review) */
  source: string;
  value: number;
  /**
   * What a generic source refers to (2.9.0), so `source` stays stable for hosts that match it exactly. Set on
   * `review:resolve` to the resolve's key (`Resolve.key`) when exactly one resolve weighed in; absent when several
   * did. Absent on every other term.
   */
  ref?: string;
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
  /** Made with `DecideOptions.reconsider` (2.8.0): the running activity had no inertia bonus. */
  reconsider?: true;
  /**
   * One resolution per voice that suggested something in this decision, in voice-id order (N1). `suggestion` is
   * the credited voice's resolution (same object), or the only one when a single voice spoke.
   */
  suggestions?: SuggestionResolution[];
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
  /** Ids are optional (lane agenda+conscience): `createAgenda` assigns free ids to entries without one. */
  commitments?: (Omit<Commitment, 'status' | 'id'> & { id?: string })[];
  goals?: Omit<Goal, 'status' | 'progress' | 'adoptedAt'>[];
  voices?: { voiceId: EntityId; trust?: Unit }[];
  /** Host phrase pack and names for narration; `createPerson` copies it to `Person.lexicon`. */
  lexicon?: Lexicon;
  /** Inherited aptitudes and attachment (1.8.0); `createPerson` copies it to `Person.family`. */
  family?: Pick<FamilyState, 'aptitudes' | 'attachment'>;
  /** Per-person bounds (2.0.0); `createPerson` applies them with `setRetention`. */
  retention?: Retention;
  /**
   * Long-run faculties to turn on at creation (2.1): the same as calling `enableGists`, `enableYearbook`,
   * `enableCharacterChange` and `enableSkillRetention` right after `createPerson`. Each is off when absent.
   */
  enable?: {
    gists?: boolean;
    yearbook?: boolean;
    character?: boolean;
    skillRetention?: boolean;
    /** Accumulated exertion (2.6.0): the same as `enableFatigueStore(p)` after creation. */
    fatigueStore?: boolean;
    /** Fullness (2.8.0): the same as `enableFullness(p)` after creation. */
    fullness?: boolean;
    /** Promptings and turning away (2.4.0): the same as `enablePromptings(p, spec)` after creation. */
    promptings?: PromptingsSpec;
    /** Enable intrinsic exploration and play, using engineering defaults or bounded overrides. */
    curiosity?: boolean | CuriositySpec;
    /** Evening self-review (2.7.0): the same as `enableReview(p, spec)` after creation. */
    review?: ReviewSpec;
  };
}

/** A known span of exertion after an act (see `Affordance.followedBy`). */
export interface FollowOn {
  label?: string;
  /** Minutes. */
  duration: number;
  effort: Unit;
  focus?: Unit;
}

// ---------------------------------------------------------------------------------------------
// Promptings (2.4.0, `promptings/`)
// ---------------------------------------------------------------------------------------------

/**
 * How a person understands their own unwanted inner pulls (a held reading, set by the host, with provenance).
 * `whisper`, `inclination` and `intrusion` share mechanics and differ only in vocabulary; `fault` (the scrupulous
 * reading) adds guilt at the prompt itself; `none` is neutral vocabulary. See research/reconciliation.md §5.
 */
export type PromptingReading = 'whisper' | 'inclination' | 'intrusion' | 'fault' | 'none';

/** A practised turning-away: seeking refuge, redirecting attention, or simply leaving the thought. */
export type PromptingResponseKind = 'refuge' | 'redirect' | 'leave';

export interface PromptingResponse {
  id: string;
  kind: PromptingResponseKind;
  /** Skill-like practice 0..1 as of `lastUsedAt`; it decays slowly with disuse. */
  practice: Unit;
  lastUsedAt: Minute;
  /**
   * What this response was learned for (2.9.0): an action, an offer tag, or the opposing norm or goal (`n1`,
   * `norm:n1` or `goal:g1`). A cued response serves only prompts it matches; a response without a cue serves every
   * prompt that no cued response matches. A norm or goal cue matches only the prompt's strongest opposing term.
   * Cues longer than 200 characters are ignored.
   */
  cue?: string;
}

export interface PromptingRecord {
  at: Minute;
  action: string;
  affordanceId: string;
  /** The strongest pull: 'habit', 'emotion:*', 'need:*', 'promptings:echo' or 'host' (a `temptation` tag). */
  source: string;
  /** The opposing term: 'norm:x' or 'goal:g'. */
  opposedBy: string;
  outcome: 'passed' | 'turned' | 'assented';
  /** The response that was practised at this prompt, if any. */
  responseId?: string;
}

export interface PromptingsState {
  reading: PromptingReading;
  /** Provenance of the reading (upbringing, a teacher, a book id), as for held norms. */
  readingSource?: string;
  responses: PromptingResponse[];
  /** Recent prompts, oldest first, bounded (`PROMPTINGS_DEFAULTS.maxRecent`). */
  recent: PromptingRecord[];
  /** Recurrence per action under the `fault` reading (an off-by-default assumption; see `echoRate`). */
  echo: Record<string, { level: Unit; at: Minute }>;
  /** Echo gained per prompt under `fault`. Default 0: the recurrence term is a host-set assumption (P3 contested). */
  echoRate: number;
  /** Days over which disused practice halves (2.9.0, host-set); absent = `PROMPTINGS_DEFAULTS.practiceHalfLifeDays`. */
  practiceHalfLifeDays?: number;
}

/**
 * How a person reviews a day (2.7.0, a held reading): `accounting` (muhasaba: name the lapse and resolve for its
 * next occasion), `ruminating` (go over it abstractly: weaker resolve, some distress) or `none` (no review).
 */
export type ReviewStyle = 'accounting' | 'ruminating' | 'none';

/** A resolve formed in review: an if-then intention for the next occasion of a missed commitment. */
export interface Resolve {
  /** The commitment's label, else its first action, else its kind. */
  key: string;
  label?: string;
  kind: string;
  strength: Unit;
  /** Day the resolve was formed or last renewed. */
  day: number;
}

/** What the person concluded in their latest review. */
export interface ReviewRecord {
  day: number;
  missed: string[];
  kept: string[];
  resolved: string[];
}

/** Owned by `review/`. */
export interface ReviewState {
  style: ReviewStyle;
  styleSource?: string;
  /** Minute of the day from which the evening review can run (default 21:00). */
  at: number;
  /** Last day reviewed. */
  lastDay?: number;
  resolves: Resolve[];
  last?: ReviewRecord;
  /** Commitment ids already reviewed (bounded). */
  seen?: string[];
}

/** What a host hands `enableReview`. */
export interface ReviewSpec {
  style?: ReviewStyle;
  styleSource?: string;
  at?: number;
}

/** What a host hands `enablePromptings`. */
export interface PromptingsSpec {
  reading?: PromptingReading;
  readingSource?: string;
  /** `cue` (2.9.0): what the response was learned for; see `PromptingResponse.cue`. */
  responses?: { id: string; kind: PromptingResponseKind; practice?: Unit; cue?: string }[];
  echoRate?: number;
  /**
   * Days over which disused practice halves (2.9.0), for hosts whose time runs short (a one-week game). Applies to
   * every response of the person, including disuse since a response's last use. Absent = 60 days, as before.
   * Read on every `enablePromptings` call: re-enabling without it returns the person to the default. Values outside
   * (0, 36500] are ignored.
   */
  practiceHalfLifeDays?: number;
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
  /** For prospects (1.6.0): the source of a threat; the fear is aimed at it (an `avoid:<id>` tendency). */
  threatFrom?: EntityId;
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

/** A suggestion the person still remembers after the voice fell silent (N9). Owned by `will/`. */
export interface StandingAdvice {
  /** Who said it (a voice id or a person id; trust is read from the voice relation, else source trust). */
  sourceId: EntityId;
  action: string;
  affordanceId?: string;
  /** How strongly it was urged, 0..1. */
  strength: Unit;
  /** How memorable the telling was (the percept's salience), 0..1. */
  salience: Unit;
  /** Minute it was told; weight halves every `WILL_DEFAULTS.adviceHalfLife`. */
  at: Minute;
}

/** Which voice prevailed in a decision with several voices, and why (for narration). From `will.conflictBetweenVoices`. */
export interface VoiceConflict {
  /** The voice credited with the chosen option, or null when the person went their own way. */
  creditedVoiceId: EntityId | null;
  chosenAffordanceId: string | null;
  /** Dominant term of the chosen option ('need:food', 'suggestion:ana', 'norm:salah', ...). */
  reason: string;
  voices: {
    voiceId: EntityId;
    verdict: SuggestionVerdict;
    /** That voice's own suggestion term on its best target (0 when vetoed or unavailable). */
    term: number;
    targetAffordanceId?: string;
    targetUtility?: number;
  }[];
}

/**
 * A host phrase pack for narration (N6). Plain JSON, keyed templates, no i18n framework: a locale pack replaces
 * the English templates key by key (`EN_LINES` in `narrate/` lists every key). Templates may use `{name}`-style
 * slots documented next to each key.
 */
export interface Lexicon {
  /** Informational locale tag, e.g. 'en', 'tr'. */
  locale?: string;
  /** Display names by entity id: { ana: 'Ana', ben: 'Ben' }. */
  names?: Record<EntityId, string>;
  /** Role nouns by relationship role, without a possessive: { child: 'daughter', landlord: 'landlord' }. */
  roles?: Record<string, string>;
  /** 'name' (default) says "Aylin" when a name is known; 'role' says "my daughter" when a role is known. */
  prefer?: 'name' | 'role';
  /** Replace the template list for a key. */
  lines?: Record<string, string[]>;
  /** Append to the template list for a key (after `lines` is applied). */
  extend?: Record<string, string[]>;
  /** Verb forms by action id for chronicle narration. Missing forms are derived from `base` (or the id). */
  actions?: Record<string, { base?: string; past?: string; gerund?: string }>;
}

/** A commitment as the chronicle keeps it (copied at the time, so later pruning does not lose it). */
export interface ChronicleCommitmentNote {
  id: string;
  kind: string;
  label?: string;
  action?: string;
  toId?: EntityId;
  /** Kept while carrying out an activity a voice had suggested (assented or complied). */
  prompted?: boolean;
  voiceId?: EntityId;
}

/** Completed actions of one kind in a day, and how many of them a voice had suggested. */
/**
 * A life-level summary of one year (1.8.0, `chronicle.enableYearbook`): day records that leave the bounded chronicle,
 * and routine days summarized by `liveRoutine`, fold into the record of their year (`floor(day / 365)`). Bounded:
 * fixed-size tallies per year and at most `CHRONICLE_DEFAULTS.maxYears` years.
 */
export interface YearRecord {
  year: number;
  /** Days folded in (lived and summarized). */
  days: number;
  /** Of those, days summarized by a routine stretch rather than lived. */
  routineDays: number;
  /** Mean, lowest and highest daily mood valence. */
  mood: Signed;
  moodLow: Signed;
  moodHigh: Signed;
  kept: number;
  broken: number;
  released: number;
  breaches: number;
  repairs: number;
  material: number;
  decisions: number;
  /** Most frequent actions (days done), most frequent first, at most 4 × `CHRONICLE_DEFAULTS.yearActions`. */
  actions: { action: string; days: number }[];
  /** The year's strongest episodes by |valence| × salience, at most `CHRONICLE_DEFAULTS.yearEpisodes`. */
  episodes: { id: string; day: number; summary: string; valence: Signed; salience: Unit }[];
  /** Illness onsets (kinds), at most `CHRONICLE_DEFAULTS.yearIllnesses`. */
  illness: string[];
  /** Whether the person was alive at the end of the last day folded in. */
  alive: boolean;
}

export interface ChronicleActionTally {
  action: string;
  done: number;
  prompted: number;
  /** Prompted completions by voice id. */
  by: Record<EntityId, number>;
}

/** Suggestion verdicts of one shape in a day (voice, verdict, reason, action). */
export interface ChronicleVerdictTally {
  voiceId: EntityId;
  verdict: SuggestionVerdict;
  kind?: RefusalKind;
  reason: string;
  action?: string;
  count: number;
}

/** The slice of state a day record diffs against: habit strengths by `action@cue`, voice trust, illness, open breaches. */
export interface ChronicleState {
  habits: Record<string, Unit>;
  trust: Record<EntityId, Unit>;
  illnesses: Record<string, { kind: string; severity: Unit }>;
  openBreaches: string[];
}

/** The open day's accumulator, written by the `chronicle/` note functions the composite calls. */
export interface ChronicleDay {
  day: number;
  /** State when the day opened (the previous record's end state, or a snapshot taken at open). */
  baseline: ChronicleState;
  kept: ChronicleCommitmentNote[];
  broken: ChronicleCommitmentNote[];
  released: ChronicleCommitmentNote[];
  actions: ChronicleActionTally[];
  verdicts: ChronicleVerdictTally[];
  material: number;
  moodSum: number;
  moodSamples: number;
  decisions: number;
}

/** One consolidated day of a life (N3). Owned by `chronicle/`. */
export interface DayRecord {
  day: number;
  kept: ChronicleCommitmentNote[];
  broken: ChronicleCommitmentNote[];
  released: ChronicleCommitmentNote[];
  keptByKind: Record<string, number>;
  brokenByKind: Record<string, number>;
  /** Labels (or action ids) of worship commitments kept, missed, and kept only after a voice suggested it. */
  prayers: { kept: string[]; missed: string[]; prompted: string[] };
  actions: ChronicleActionTally[];
  /** Habit strengths that crossed a threshold (`CHRONICLE_DEFAULTS.habitThresholds`) today. */
  habits: { key: string; action: string; from: Unit; to: Unit; level: Unit; direction: 'up' | 'down' }[];
  /** Trust changes per voice larger than `CHRONICLE_DEFAULTS.trustEpsilon`. */
  trust: { voiceId: EntityId; from: Unit; to: Unit; delta: number }[];
  /** The most salient episodes of the day. */
  episodes: {
    id: string;
    summary: string;
    valence: Signed;
    salience: Unit;
    action?: string;
    targetId?: EntityId;
  }[];
  breaches: { id: string; normId: string; victimId?: PersonId }[];
  repairs: { id: string; normId: string; victimId?: PersonId }[];
  /** Net material from outcomes (host units). */
  material: number;
  illness: { onset: string[]; recovered: string[]; worse: string[]; better: string[] };
  /** Mean mood valence over the day's samples. */
  mood: Signed;
  verdicts: ChronicleVerdictTally[];
  decisions: number;
  alive: boolean;
  /**
   * End-of-day state the next record diffs against. Kept on the newest record only (`appendDay` strips it from
   * older ones, review 2026-10-03: a full snapshot per day grew a community's saves to megabytes).
   */
  state?: ChronicleState;
}

/** Engineering overrides for intrinsic motivation; scales are capped at their defaults. */
export interface CuriositySpec {
  unknownScale?: number;
  progressScale?: number;
  varyScale?: number;
  recentMinutes?: number;
  rewardMax?: number;
}
/** Prediction-error history for the same key used by memory expectations. */
export interface CuriosityError {
  key: string;
  fast: Unit;
  slow: Unit;
  n: number;
  lastAt: Minute;
}
/** A completed or failed act, retained only for bounded repetition with variation. */
export interface CuriosityAct {
  action: string;
  targetId?: EntityId;
  placeId?: EntityId;
  at: Minute;
}
/** Optional JSON state owned by curiosity/. */
export interface CuriosityState {
  spec?: CuriositySpec;
  errors: CuriosityError[];
  recent: CuriosityAct[];
}
/** Raw bounded signals and their common drive; no RNG or mutation. */
export interface CuriosityReading {
  unknown: Unit;
  progress: Unit;
  vary: Unit;
  drive: number;
}
