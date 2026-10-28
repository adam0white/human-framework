import type { PortableAdmission, PortableCalendar, PortablePerson } from './portable-person.ts';
/** SCOPE: HF4 canonical data-only run contracts and exact internal owner ports.
 * Source implementation authorization: C0 at d87c7b2. No callable implementation,
 * registry, constructor side effect or legacy compatibility path is installed here.
 * C0 owns schema amendments. W1 continuation records remain candidate until joint
 * minimal-field agreement; their validation and numerical proof are runtime work.
 */
// Derived from source-backed C0 prep. Historical source references below remain provenance.
// Current source base d87c7b2; owner runtime implementation and acceptance remain separate.
export type Id = string; // nonempty NFC string; reject reserved prototype keys
export type PersonId = Id;
export type InputId = Id;
export type RequestId = Id;
export type EventId = Id;
export type Hash = string; // lowercase SHA-256 hex
// Integer milliseconds from an authored simulation epoch, not Date.now().
export type Time = number; // signed safe integer
export type Unit = number; // finite [0,1]
export type Signed = number; // finite [-1,1]
export type Json = null | boolean | number | string | readonly Json[] | { readonly [key: string]: Json };
export type Result<T> = { ok: true; value: T } | { ok: false; error: ContractError };
export type ContractError = {
  code:
    | 'invalid-schema'
    | 'unknown-id'
    | 'duplicate-id'
    | 'past-input'
    | 'closed-time'
    | 'request-mismatch'
    | 'already-resolved'
    | 'world-revision'
    | 'invalid-admission'
    | 'unsupported-archive'
    | 'hash-mismatch'
    | 'limit-exceeded';
  path: string;
  message: string;
};
declare const runBrand: unique symbol;
export type Run = { readonly [runBrand]: true };
export type Source =
  | { type: 'host'; id: Id }
  | { type: 'voice'; id: Id }
  | { type: 'person'; id: PersonId }
  | { type: 'shelf'; id: Id };

export type RunSpec = {
  id: Id;
  seed: number;
  start: Time;
  host: { id: Id; edition: Id; schema: Id };
  definitions: Definitions;
  tuning?: RunTuning;
  lifecycle: InitialLifecycle;
  world: WorldSnapshot;
};
export type Fidelity = { mode: 'fine' } | { mode: 'daily'; dayMs: 86400000; anchor: Time };
export type Definitions = {
  actions: readonly ActionDefinition[];
  norms: readonly SourcedNorm[];
  marriageCustoms: readonly MarriageCustomData[];
  skills: readonly SkillDefinition[];
  skillTransfers: readonly { from: Id; to: Id; fraction: Unit }[];
  methods: readonly MethodDefinition[];
  calendar: CalendarDefinition;
  routines: readonly RoutineDefinition[];
  lexicon: Lexicon;
  sources: readonly Source[];
  /** Additional character words; builtin traits remain active and cannot be replaced. */
  reputationTraits?: readonly ReputationTraitDefinition[];
};
/** Relationship deltas per unit of credence change in `<person>:<id>`. Engineering vocabulary, not moral worth. */
export type ReputationTraitDefinition = { id: Id; affection: Signed; trust: Signed; respect: Signed };
export type WorldSnapshot = { revision: number; facts: readonly WorldFact[]; hostState: Json };
export type WorldFact = {
  id: Id;
  subject: Id;
  predicate: Id;
  value: Json;
  at: Time;
  provenance: { source: Id; evidenceId: Id };
};
export type WorldChange = {
  expectedRevision: number;
  revision: number;
  put: readonly WorldFact[];
  remove: readonly Id[];
  hostState: Json;
};
export type EffectiveParameters = DeepReadonly<FacultyParameters>;
export type RunTuning = {
  will?: { temperature?: Unit };
  cognition?: { needScale?: number; effortScale?: number };
  planning?: { depth?: 2 | 3 | 4 | 5; presentBias?: Unit };
  assent?: { minStrength?: Unit; pressure?: Unit };
  doze?: { hazardScale?: number };
  crisis?: { hazardScale?: number };
  promptings?: { practiceHalfLifeDays?: number; echoRate?: number };
};

export type PersonAuthoring = {
  id: PersonId;
  identity: { name: string; birthAt: Time; sex: LifeCourse['sex']; castId?: Id };
  biography: readonly AuthoredEpisode[];
  origin: { kind: 'authored'; basis: EvidenceRef; traits: TraitBasis };
  state: AuthoredPersonState; // validated facet data, no clock/RNG/enable overrides
  admission?: PersonaAdmission;
  portable?: PortableAdmission;
};
export type AuthoredPersonState = {
  traits: Traits;
  body: InitialBody;
  needs: InitialNeeds;
  skills: readonly InitialSkill[];
  heldNorms: readonly HeldNorm[];
  beliefs: readonly InitialBelief[];
  consequences: readonly AuthoredConsequences[];
  sourceTrust: readonly InitialSourceTrust[];
  context: { scarcity: Knowledge<Unit>; smoking: Knowledge<Unit> };
  relationships: readonly InitialRelationship[];
  voices: readonly InitialVoice[];
  agenda: InitialAgenda;
  family: InitialFamily;
  groups: readonly Id[];
  values: Values;
  reserve: Reserve;
  retention: Retention;
  habits: readonly Habit[];
  expectations: readonly ActionExpectation[];
  affect: InitialAffect;
  promptings: InitialPromptings;
  review: InitialReview;
  bonds: InitialBonds;
};

export type Input<K extends keyof Payloads = keyof Payloads> = {
  [P in K]: { id: InputId; at: Time; source: SourceFor<P>; kind: P; payload: Payloads[P] };
}[K];
export type PersonEvidence = { person: PersonId; evidenceId: Id };
export type Claim = {
  prop: Id;
  value: boolean;
  confidence: Unit;
  sourceId: Id;
  evidenceId: Id;
  provenance: readonly Id[];
  origin?: Id;
  lineage?: string;
};
export type Cue = { cue: Id; value: string };
export type Payloads = {
  'world.changed': WorldChange;
  'offers.received': { person: PersonId; revision: number; offers: readonly Offer[] };
  'observation.received': PersonEvidence & { percepts: readonly PerceptData[] };
  'ambient.received': PersonEvidence & { environment: AmbientEvidence };
  'ambient.left': { person: PersonId; contextId: Id };
  'context.received': PersonEvidence & {
    context: { kind: 'scarcity'; value: Unit } | { kind: 'smoking-exposure'; value: Unit };
  };
  'agenda.received': PersonEvidence & { evidence: AgendaEvidence };
  'suggestion.received': { person: PersonId; received: ReceivedSuggestion };
  'advice.withdrawn': { person: PersonId; voiceId: Id; adviceId: Id };
  'coercion.received': { person: PersonId; voiceId: Id; orderId: Id; offerId: Id; repeat: boolean };
  'coercion.withdrawn': { person: PersonId; orderId: Id; reason: string };
  'decision.requested': {
    person: PersonId;
    reason: string;
    treatment: 'ordinary' | 'reconsider';
    offerRevision: number;
  };
  'activity.interrupted': { person: PersonId; activityId: Id; reason: string };
  'action.resolved': ActionResolution;
  'communication.resolved': CommunicationResolution;
  'testimony.received': PersonEvidence & { teller: Id; claims: readonly Claim[] };
  /** Host evidence that a named source has withdrawn its account; untracked contributions are refused. */
  'testimony.withdrawn': PersonEvidence & { sourceId: Id; prop: Id };
  'conversation.requested': {
    speaker: PersonId;
    listener: PersonId;
    topicIds: readonly Id[];
    maxClaims: number;
    /** Minimum distance from 0.5 for a held belief to be offered; absent uses the builtin 0.2. */
    confidentMin?: number;
    temptations: readonly { prop: Id; value: boolean; gain: Unit }[];
    loyalWarning: boolean;
  };
  'retelling.requested': {
    teller: PersonId;
    listener: PersonId;
    gistIds: readonly Id[];
    placeIds?: readonly Id[];
  };
  'contradiction.received': PersonEvidence & { sourceId: Id; prop: Id; value: boolean; reporterId?: Id };
  'fact.confirmed': PersonEvidence & { prop: Id; value: boolean; observationId: Id };
  'social.received': PersonEvidence & {
    other: Id;
    event: SocialEventData;
    sourceTrustResponse?: SourceTrustResponse;
  };
  'person.glimpsed': PersonEvidence & { target: PersonId; signs: OutwardSigns; clarity: Unit };
  'person.reported': PersonEvidence & {
    target: PersonId;
    key: ImpressionKey;
    value: number;
    weight: Unit;
    teller: Id;
  };
  'act.witnessed': PersonEvidence & { actor: PersonId; act: ObservedActData };
  'acquaintance.received': PersonEvidence & {
    target: PersonId;
    familiarity: Unit;
    known: readonly KnownPersonFact[];
  };
  'groups.received': PersonEvidence & {
    self: readonly Id[];
    others: readonly { person: PersonId; groups: readonly Id[] }[];
  };
  'method.cues': PersonEvidence & { contextId: Id; cues: readonly Cue[] };
  'method.context-left': { person: PersonId; contextId: Id };
  'method.demonstrated': PersonEvidence & {
    demonstrationId: Id;
    methodId: Id;
    contextId: Id;
    conditions: readonly Cue[];
    action: Id;
    teacher: Id;
    outcome: 'success' | 'failure';
    receivedAttention: Unit;
  };
  'skill.witnessed': PersonEvidence & {
    teacher: Id;
    skill: Id;
    durationMs: number;
    modelLevel: Unit;
    domain: LearningDomain;
  };
  'quantity.observed': PersonEvidence & { truth: number; difficulty: Unit };
  'body.received': PersonEvidence & { receipt: BodyReceipt };
  'family.contact': FamilyContactReceipt;
  'lifecycle.received': LifecycleReceipt;
  'death.heard': PersonEvidence & { deceased: PersonId; reporter: Id };
  'agenda.requested': { person: PersonId; request: AgendaRequest };
  'norm.interpretation-received': PersonEvidence & {
    normId: Id;
    standing: HeldNorm['standing'];
    conviction: Unit;
    provenance: NormProvenance;
  };
  'practice.requested': { person: PersonId; practice: PracticeKind; durationMs: number };
  'repair.received': PersonEvidence & { victim: Id; actionReceipt: Id };
  'repentance.requested': { person: PersonId; deedId: Id };
  'consequences.received': PersonEvidence & {
    sourceId: Id;
    claims: readonly ReceivedConsequence[];
    withdrawals: readonly { id: Id; revision: number }[];
  };
  'review.requested': { person: PersonId; reason: string };
  'voice.evidence-received': PersonEvidence & { voiceId: Id; evidence: VoiceEvidence };
  /** Learn a response at the input time, with source-authored initial practice. */
  'prompting.response-learned': {
    person: PersonId;
    response: { id: Id; kind: PromptingResponseKind; practice: Unit; cue?: string };
  };
  /** Change the person's held review style; source is the input source. */
  'review.style-changed': { person: PersonId; style: ReviewStyle };
  'voice.promise-received': PersonEvidence & { voiceId: Id; promise: VoicePromiseData };
  'routine.authored': { person: PersonId; scheduleId: Id; entries: readonly RoutineEntry[] };
  'routine.withdrawn': { person: PersonId; scheduleId: Id };
  'chapter.elapsed': { chapterId: Id; fromWallMs: number; untilWallMs: number };
  'person.arrived': { authored: PersonAuthoring; arrivalEvidenceId: Id };
};

export type BodyReceipt =
  | { type: 'consumed'; actionReceipt: Id; received: ConsumedAmounts }
  | { type: 'exerted'; actionReceipt: Id; costs: ExertionAmounts }
  | { type: 'injured'; injury: InjuryEvidence }
  | { type: 'illness'; illness: IllnessEvidence }
  | { type: 'exposed'; agent: Id; amount: number; exposureId: Id }
  | { type: 'treated'; injuryId: Id; quality: Unit; actionReceipt: Id }
  | { type: 'fallen'; cause: string; observedUntil?: Time }
  | { type: 'stood'; actionReceipt: Id }
  | { type: 'voided'; actionReceipt: Id }
  | PhysicalContactReceipt;
export type AgendaRequest =
  | { type: 'commit'; commitment: CommitmentData }
  | { type: 'release'; commitmentId: Id; authority: Id }
  | { type: 'goal'; goal: GoalData }
  | { type: 'abandon-goal'; goalId: Id }
  | { type: 'adopt-task'; prospectId: Id; task: GoalData }
  | { type: 'precommit'; precommitment: PrecommitmentData }
  | { type: 'release-precommitment'; precommitmentId: Id }
  | { type: 'make-up'; commitmentId: Id; window: { start: Time; end: Time } }
  | { type: 'retime'; mappings: readonly { commitmentId: Id; start: Time; end: Time }[] }
  | { type: 'retire-paid-make-ups' };
export type LifecycleReceipt = Lifecycle;

export type StepBatch = { until: Time; fidelity?: Fidelity; inputs: readonly Input[] }; // default fine
export type ActionRequest = {
  kind: 'action';
  id: RequestId;
  person: PersonId;
  activityId: Id;
  offerId: Id;
  offerRevision: number;
  issuedAt: Time;
  boundaryAt: Time;
  stage: 'start' | 'finish' | 'interrupt';
  worldRevision: number;
  requestHash: Hash;
  participants: readonly PersonId[];
};
export type ActionResolution = {
  requestId: RequestId;
  requestHash: Hash;
  person: PersonId;
  activityId: Id;
  stage: ActionRequest['stage'];
  worldRevision: number;
  disposition: 'accepted' | 'rejected' | 'completed' | 'failed' | 'interrupted';
  worldChange?: WorldChange;
  outcome?: ObservedOutcome;
  observations: readonly { person: PersonId; percepts: readonly PerceptData[] }[];
};
export type StepResult = {
  at: Time;
  reachedUntil: boolean;
  events: readonly RunEvent[];
  boundary: { type: 'world-required'; requests: readonly HostRequest[] } | { type: 'until' };
  nextAt: Time | null;
};
export type RunEvent = {
  id: EventId;
  at: Time;
  phase: Phase;
  person?: PersonId;
  causeIds: readonly Id[];
  data: EventData;
  narration: readonly RenderedLine[];
  wording?: { key: string; occurrence: number; index: number };
};

export type Phase = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type FacultyEffects = {
  terms: readonly TermEffect[];
  modifiers: readonly ModifierEffect[];
  appraisals: readonly AppraisalEffect[];
};
// Internal only. Each owner supplies concrete closed leaf unions, not dynamic dispatch.

export type Perspective = { kind: 'person'; observer: PersonId } | { kind: 'host' };
export type InspectQuery = {
  portable?: { person: PersonId; castId: Id; castRevision: Id };
  lifecycle?: LifecycleQuery;
  perspective: Perspective;
  people: readonly PersonId[];
  select: readonly (
    | 'summary'
    | 'skills'
    | 'body'
    | 'condition'
    | 'needs'
    | 'beliefs'
    | 'sourceTrust'
    | 'promptings'
    | 'review'
    | 'advice'
    | 'traits'
    | 'heldNorms'
    | 'relationships'
    | 'methods'
    | 'agenda'
    | 'events'
    | 'persona'
    | 'calendar'
    | 'chapter'
  )[];
  method?: { person: PersonId; action: Id; contextId: Id };
  skill?: { person: PersonId; skill: Id; difficulty: Unit; support?: Unit };
  afterEvent?: EventId;
  diagnostic?: 'full-hash';
};
export type SkillReading = { id: Id; competence: Unit; practicedMs: DurationMs; lastPracticed: Time };
export type SkillSuccess = {
  person: PersonId;
  skill: Id;
  competence: Unit;
  capacity: Unit;
  successChance: Unit;
};
export type Inspection = {
  lifecycle?: LifecycleInspection;
  at: Time;
  perspective: Perspective;
  people: readonly PersonView[];
  events: readonly VisibleEvent[];
  method?: MethodEvidence;
  skill?: SkillSuccess;
  fullHash?: Hash;
};
export type BodyForecastLoad = {
  label: string;
  durationMs: DurationMs;
  load: BodyLoad;
};
export type PreviewQuery = {
  /** Conditional declared loads, starting at the live run time; bounded by the body owner. */
  bodyForecast?: readonly BodyForecastLoad[];
  perspective: Perspective;
  person: PersonId;
  until: Time;
  fidelity?: Fidelity;
  inputs: readonly Input[];
};
export type ImpressionReading = {
  targetId: PersonId;
  cues: readonly { key: string; value: number; confidence: Unit; seenAt?: Time }[];
};
export type ConditionReading = { outwardSigns: OutwardSigns; selfReport: OutwardSigns };
export type PreviewResult = {
  /** Observer-held cues, including zero-confidence priors for missing condition cues. */
  impression?: ImpressionReading;
  bodyForecast?: { person: PersonId; from: Time; spans: readonly BodyForecastSpan[] };
  at: Time;
  hypothetical: true;
  perspective: Perspective;
  possibilities: readonly VisibleEvent[];
  boundary: PreviewBoundary;
  knowledgeLimit: readonly string[];
};
export type RenderedLine = { eventId: EventId; audience: Perspective; text: string; variantId: Id };

// Pure projection schemas. These are not alternate simulation paths.
export type ChapterClock = { seed: number; wallAtMs: number; slot: number; remainderMs: number };
export type ChapterProjection = { clock: ChapterClock; slots: readonly ChapterSlot[]; skipped: number };
// hourly quantization, <=24 slots per preparation, remainder retained

export type PersonaAdmission = {
  envelope: PortablePersonEnvelope;
  preparation: { id: Id; chapter: ChapterProjection };
};

export type RunArchive = {
  format: 'hf-run';
  version: 5;
  engine: { package: string; build: Hash; schema: Hash };
  host: { id: Id; edition: Id; schema: Id };
  initial: {
    spec: RunSpec;
    effective: EffectiveParameters;
    parameterProvenance: readonly ParameterProvenance[];
    people: readonly PersonAuthoring[];
  };
  history: readonly AcceptedTransaction[];
  /** Complete actor snapshot; duplicated event/receipt journals retain their newest 64 entries.
   * Complete accepted inputs remain in history. Restore reconstructs full private journals by replay. */
  current: RunState;
  hashes: { initial: Hash; history: Hash; current: Hash; full: Hash };
};
export type AcceptedTransaction = {
  ordinal: number;
  until: Time;
  inputs: readonly Input[];
  fidelity: Fidelity;
  reachedAt: Time;
  cursor: SchedulerCursor;
  boundary: StepResult['boundary'];
  eventHash?: Hash;
  stateHash?: Hash;
};
export type RunState = {
  at: Time;
  cursor: SchedulerCursor;
  ownerClocks: readonly OwnerClock[];
  world: WorldSnapshot;
  people: Readonly<Record<PersonId, ActorState>>;
  community: CommunityState;
  offers: Readonly<Record<PersonId, ReceivedOfferBook>>;
  routines: readonly ActiveRoutine[];
  rng: RunRngState;
  wording: Readonly<Record<string, WordingSequence>>;
  queue: readonly ScheduledEvent[];
  pending: readonly HostRequest[];
  receipts: ReceiptLedger;
  effects: readonly ScheduledEffect[];
  events: readonly RunEvent[];
  counters: RunCounters;
  lifecycle: LifecycleArchive;
  continuations: readonly ActorContinuation[];
  chapter: Readonly<Record<Id, ChapterClock>>;
};
export type ReplayResult = {
  run: Run;
  verified: true;
  fullHash: Hash;
  transactions: number;
  hostEdition: Id;
};

export type RunHandle = string;
export type WireArgs = {
  createRun: { spec: RunSpec };
  createPerson: { run: RunHandle; spec: PersonAuthoring };
  step: { run: RunHandle; batch: StepBatch };
  inspect: { run: RunHandle; query: InspectQuery };
  preview: { run: RunHandle; query: PreviewQuery };
  exportRun: { run: RunHandle };
  restoreRun: { archive: RunArchive };
  replay: { archive: RunArchive };
};
export type WireValues = {
  createRun: { run: RunHandle };
  createPerson: PersonId;
  step: StepResult;
  inspect: Inspection;
  preview: PreviewResult;
  exportRun: RunArchive;
  restoreRun: { run: RunHandle };
  replay: { run: RunHandle; verified: true; fullHash: Hash; transactions: number; hostEdition: Id };
};

export type PortablePersonEnvelope = {
  format: 'hf-person';
  version: 4;
  engine: { package: string; schema: Hash };
  identity: { castId: Id; revision: Id; parentRevision: Id | null };
  origin: { host: Id; edition: Id; at: Time; epoch: CalendarDefinition };
  mapping: PersonaMapping;
  calendar: CalendarMapping;
  person: PersonaProjection;
  chapter: ChapterProjection;
  hash: Hash;
};

export type NormProvenance =
  | { kind: 'religious'; researchRef: Id; interpretationRef: Id }
  | { kind: 'authored-world'; author: Id; ruleId: Id; edition: Id };

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:520; narrowed for 4.0.
export interface ActionExpectation {
  key: string;

  needs: Partial<Record<NeedId, number>>;
  successRate: Unit;
  samples: number;

  valence: Signed;
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:366; narrowed for 4.0.
export interface AffectState {
  mood: { valence: Signed; arousal: Unit };
  emotions: Emotion[];
  regulation: Unit;
  lastUpdated: Time;
  crisis: CrisisState;
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:715; narrowed for 4.0.
export interface AgendaState {
  exemptions: ExemptionPremises;
  commitments: Commitment[];
  goals: Goal[];
  nextId: number;

  lastProposalDay: number;

  owed: OwedMakeUp[];

  lapse?: { since: Time; missed: number };
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:1069; narrowed for 4.0.
export interface AmbientPercept {
  cold?: Unit;

  dark?: Unit;

  crowding?: Unit;

  beauty?: Signed;

  weather?: Signed;

  dayLengthHours?: number;
  outdoors?: boolean;
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:1086; narrowed for 4.0.
export interface AmbientState {
  percept: AmbientPercept;
  contextId: Id | null;
  basis: ContextBasis | null;

  since: Time;
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:1830; narrowed for 4.0.
export interface AppraisalEvent {
  at: Time;

  kind: 'outcome' | 'event' | 'prospect' | 'deed';

  desirability: Signed;

  likelihood?: Unit;

  praiseworthiness?: Signed;

  agentId?: EntityId;
  targetId?: EntityId;

  affectionToAgent?: Signed;

  loss?: boolean;

  normId?: string;
  cause: string;

  threatFrom?: EntityId;
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:462; narrowed for 4.0.
export interface Belief {
  prop: string;

  logOdds: number;
  updatedAt: Time;

  sources: { id: EntityId; value: boolean; contribution?: number }[];
  /** Untracked/evicted applied evidence; retained so clipping cannot invent evidence on withdrawal. */
  withdrawalBase?: number;

  provenance?: BeliefProvenance;
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:478; narrowed for 4.0.
export interface BeliefProvenance {
  origin: EntityId;

  firstFrom: EntityId;

  at: Time;

  lineage?: string;
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:92; narrowed for 4.0.
export interface BladderState {
  fill: Unit;
  pending: number;
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:1809; narrowed for 4.0.
export interface BodyLoad {
  effort: Unit;
  focus: Unit;
  mode: 'awake' | 'sleep';
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:168; narrowed for 4.0.
export interface BodyReadout {
  hunger: Unit;
  thirst: Unit;
  sleepiness: Unit;
  fatigue: Unit;
  pain: Unit;

  capacity: Unit;

  alertness: Unit;

  perceived: { hunger: Unit; thirst: Unit; sleepiness: Unit; fatigue: Unit; pain: Unit };
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:96; narrowed for 4.0.
export interface BodyState {
  doze: DozeState;
  bladder: BladderState;
  satiety: Unit;
  hydration: Unit;
  sleepPressure: Unit;
  exertion: Unit;
  circadianPeakMs: DurationMs;
  pain: Unit;
  health: Unit;
  fitness: Unit;
  injuries: Injury[];
  illnesses: Illness[];
  sleepDebtHours: number;
  depletion: Unit;
  asleep: boolean;
  since: Time;
  alive: boolean;
  nextId: number;
  exposures: Record<Id, Exposure>;
  lastSleep?: TimeSpan;
  lastDowned?: TimeSpan;
  downed?: { since: Time; reason: string; until?: Time };
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:1061; narrowed for 4.0.
export interface BondsState {
  courtships: Courtship[];
  marriages: Marriage[];

  mourning?: { forId: PersonId; since: Time; until: Time };
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:381; narrowed for 4.0.
export interface BreakBehaviour {
  id: Id;
  label?: string;
  weight: number;
  actions: Id[];
  tags: Id[];
  durationRangeMs: [DurationMs, DurationMs];
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:47; narrowed for 4.0.
export type Capacity = 'moving' | 'manipulation' | 'sight';

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:886; narrowed for 4.0.
export interface CharacterState {
  baseTraits: Traits;
  baseValues: Values;

  year: number;

  acc: { days: number; mood: number; kept: number; broken: number; socialMs: DurationMs; variety: number };

  agedTo: Time;

  experience: Partial<Record<keyof Traits, number>>;
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:1989; narrowed for 4.0.
export interface ChronicleActionTally {
  action: string;
  done: number;
  prompted: number;

  by: Record<EntityId, number>;
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:1945; narrowed for 4.0.
export interface ChronicleCommitmentNote {
  id: string;
  kind: string;
  label?: string;
  action?: string;
  toId?: EntityId;

  prompted?: boolean;
  voiceId?: EntityId;
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:2016; narrowed for 4.0.
export interface ChronicleDay {
  day: number;

  baseline: ChronicleState;
  kept: ChronicleCommitmentNote[];
  broken: ChronicleCommitmentNote[];
  released: ChronicleCommitmentNote[];
  actions: ChronicleActionTally[];
  verdicts: ChronicleVerdictTally[];
  material: number;
  moodSum: number;
  moodSamples: number;
  socialMs: DurationMs; // completed participation, charged once at settlement
  decisions: number;
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:2008; narrowed for 4.0.
export interface ChronicleState {
  habits: Record<Id, Unit>;
  trust: Record<EntityId, Unit>;
  illnesses: Record<Id, { kind: string; severity: Unit }>;
  openBreaches: string[];
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:1998; narrowed for 4.0.
export interface ChronicleVerdictTally {
  voiceId: EntityId;
  verdict: SuggestionVerdict;
  kind?: RefusalKind;
  reason: string;
  action?: string;
  count: number;
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:869; narrowed for 4.0.
export interface Command {
  voiceId: EntityId;
  affordanceId?: string;
  action?: string;

  since: Time;

  repeat?: boolean;
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:638; narrowed for 4.0.
export interface Commitment {
  id: string;

  kind: 'promise' | 'duty' | 'appointment' | 'worship' | 'job' | 'abstain';

  toId?: EntityId;

  actions: string[];
  targetId?: EntityId;

  from: Time;
  until: Time;
  completion?: 'end'; // actual completion must occur inside the window

  normId?: string;
  importance: Unit;
  status: 'pending' | 'kept' | 'broken' | 'released';

  recurEveryMs?: DurationMs;

  label?: string;

  violatedBy?: string[];

  firm?: true;

  exemptWhen?: ('illness' | 'travel')[];

  exempt?: { reason: 'illness' | 'travel' | 'necessity' | MissedExcuse; at: Time };

  makeUpOf?: string;

  chain?: string;

  recurUntil?: Time;
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:312; narrowed for 4.0.
export interface ConscienceState {
  norms: HeldNorm[];

  breaches: {
    id: string;
    normId: string;
    at: Time;
    victimId?: PersonId;
    weight: Unit;
    repaired: boolean;
  }[];

  nextBreach: number;

  intentions: { at: Time; action: string; intention: string }[];
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:1121; narrowed for 4.0.
export interface ConsequenceAction {
  action: string;
  targetId?: EntityId;
  placeId?: EntityId;
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:1151; narrowed for 4.0.
export interface ConsequenceRevision {
  sourceId: EntityId;
  id: string;
  revision: number;
  receivedAt: Time;
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:1568; narrowed for 4.0.
export interface Considered {
  affordanceId: string;
  action: string;

  label?: string;
  utility: number;
  terms: Term[];

  vetoed?: { kind: 'cannot' | 'willNot'; reason: string; omission?: string };

  advertised?: Partial<Record<NeedId, number>>;
  believed?: Partial<Record<NeedId, number>>;

  recalled?: string[];
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:1039; narrowed for 4.0.
export interface Courtship {
  withId: PersonId;
  since: Time;

  warmth: Unit;

  appeal: Unit;
  meetings: number;
  lastAt: Time;
  engagedAt?: Time;
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:392; narrowed for 4.0.
export interface CrisisState {
  stress: Unit;
  checkedAt: Time;
  active?: { repertoireId: Id; since: Time; until: Time };
  lastBreakAt?: Time;
  breaks: number;
  repertoire: BreakBehaviour[];
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:2089; narrowed for 4.0.
export interface CuriosityAct {
  action: string;
  targetId?: EntityId;
  placeId?: EntityId;
  at: Time;
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:2081; narrowed for 4.0.
export interface CuriosityError {
  key: string;
  fast: Unit;
  slow: Unit;
  n: number;
  lastAt: Time;
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:2096; narrowed for 4.0.
export interface CuriosityState {
  errors: CuriosityError[];
  recent: CuriosityAct[];
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:2032; narrowed for 4.0.
export interface DayRecord {
  day: number;
  kept: ChronicleCommitmentNote[];
  broken: ChronicleCommitmentNote[];
  released: ChronicleCommitmentNote[];
  keptByKind: Partial<Record<Commitment['kind'], number>>;
  brokenByKind: Partial<Record<Commitment['kind'], number>>;

  prayers: { kept: string[]; missed: string[]; prompted: string[] };
  actions: ChronicleActionTally[];

  habits: { key: string; action: string; from: Unit; to: Unit; level: Unit; direction: 'up' | 'down' }[];

  trust: { voiceId: EntityId; from: Unit; to: Unit; delta: number }[];

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

  material: number;
  illness: { onset: string[]; recovered: string[]; worse: string[]; better: string[] };

  mood: Signed;
  verdicts: ChronicleVerdictTally[];
  decisions: number;
  alive: boolean;

  state?: ChronicleState;
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:1587; narrowed for 4.0.
export interface DecisionRecord {
  id: string;
  at: Time;
  chosenAffordanceId: string | null;
  chosenAction: string | null;

  considered: Considered[];
  suggestion?: SuggestionResolution;

  intention: string;

  review?: boolean;

  interrupt?: string;

  reconsider?: true;

  suggestions?: SuggestionResolution[];
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:83; narrowed for 4.0.
export interface DozeContext {
  posture: 'upright' | 'seated' | 'reclined';

  stimulation: Unit;
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:88; narrowed for 4.0.
export interface DozeState {
  context: DozeContext;
  basis: ContextBasis;
  since?: Time;
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:354; narrowed for 4.0.
export interface Emotion {
  id: EmotionId;
  intensity: Unit;

  targetId?: EntityId;

  cause: string;
  since: Time;

  halfLifeMs: DurationMs;
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:352; narrowed for 4.0.
export type EmotionId =
  | 'joy'
  | 'distress'
  | 'hope'
  | 'fear'
  | 'relief'
  | 'disappointment'
  | 'pride'
  | 'shame'
  | 'gratitude'
  | 'anger'
  | 'guilt'
  | 'love'
  | 'grief'
  | 'awe'
  | 'boredom'
  | 'loneliness';

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:20; narrowed for 4.0.
export type EntityId = string;

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:437; narrowed for 4.0.
export interface Episode {
  id: string;
  at: Time;
  kind: string;
  action?: string;
  actorId?: EntityId;
  targetId?: EntityId;
  placeId?: EntityId;

  valence: Signed;

  salience: Unit;
  summary: string;

  addressedSummary?: string;
  tags: string[];

  voiceId?: EntityId;

  recalledAt?: Time;
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:159; narrowed for 4.0.
export interface Exposure {
  recent: Unit;

  cumulative: number;
  lastAt: Time;
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:1028; narrowed for 4.0.
export interface FamilyState {
  contactCovered: TimeSpan[];
  aptitudes: Record<Id, number>;
  pregnancy?: Pregnancy;

  attachment?: Unit;

  raisedMs?: DurationMs;
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:1677; narrowed for 4.0.
export interface FollowOn {
  label?: string;

  durationMs: DurationMs;
  effort: Unit;
  focus?: Unit;
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:537; narrowed for 4.0.
export interface Gist extends Episode {
  count: number;
  firstAt: Time;
  lastAt: Time;

  weight: number;

  peak: Unit;
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:687; narrowed for 4.0.
export interface Goal {
  id: Id;
  label: string;
  serves: (NeedId | ValueId)[];
  progress: Unit;
  advancedBy: { action: Id; amount: number }[];
  importance: Unit;
  status: 'active' | 'achieved' | 'abandoned';
  adoptedAt: Time;
  deadline?: Time;
  completionHalfLifeMs: DurationMs;
  lastAdvancedAt: Time;
  baseImportance: Unit;
  project?: { prospectId: Id; peak?: Unit };
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:415; narrowed for 4.0.
export interface Habit {
  cue: { hour?: number; placeId?: EntityId; after?: string };
  action: string;
  strength: Unit;
  repetitions: number;
  lastAt: Time;

  withheld?: number;

  lastWithheldAt?: Time;

  craving?: Unit;
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:297; narrowed for 4.0.
export interface HeldNorm {
  normId: Id;
  standing: NormStanding;
  conviction: Unit;
  provenance: NormProvenance;
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:63; narrowed for 4.0.
export interface Illness {
  id: string;
  kind: string;
  severity: Unit;

  trendPerDay: number;
  contagious: boolean;
  since: Time;

  chronic?: boolean;

  baseline?: Unit;

  aggravatedBy?: string[];
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:627; narrowed for 4.0.
export interface Impression {
  targetId: PersonId;
  cues: ImpressionCue[];

  seenAt: Time;
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:620; narrowed for 4.0.
export interface ImpressionCue {
  key: string;
  mean: number;
  weight: number;
  at: Time;
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:49; narrowed for 4.0.
export interface Injury {
  id: string;
  part: string;
  severity: Unit;
  healRatePerDay: number;
  since: Time;

  affects?: Partial<Record<Capacity, Unit>>;

  bleeding?: number;

  tendedAt?: Time;
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:1418; narrowed for 4.0.
export type LearningDomain = 'general' | 'language' | 'motor' | 'knowledge';

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:900; narrowed for 4.0.
export interface LifeCourse {
  bornAt: Time;
  sex: 'female' | 'male';
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:1816; narrowed for 4.0.
export interface LifeModifiers {
  ageYears: number;
  stage: LifeStage;
  metabolism: number;
  recovery: number;
  learning: number;

  maturity: number;
  maxFitness: Unit;

  mortalityPerYear: number;
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:883; narrowed for 4.0.
export type LifeStage = 'infant' | 'child' | 'adolescent' | 'adult' | 'elder';

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:1051; narrowed for 4.0.
export interface Marriage {
  spouseId: PersonId;
  since: Time;
  endedAt?: Time;
  end?: 'widowed';

  mourningDays?: number;
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:548; narrowed for 4.0.
export interface MemoryState {
  episodes: Episode[];
  beliefs: Belief[];
  expectations: ActionExpectation[];
  sourceTrust: Record<Id, Unit>;
  nextEpisode: number;
  gists: Gist[];
  nextGist: number;
  contradictions: NotedContradiction[];
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:1094; narrowed for 4.0.
export interface MethodCue {
  cue: string;
  value: string;
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:1099; narrowed for 4.0.
export interface MethodRule {
  id: string;
  action: string;
  conditions: MethodCue[];
  evidence: {
    id: string;
    sourceId: string;
    at: Time;
    attention: Unit;
    outcome: 'success' | 'failure';
  }[];
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:1113; narrowed for 4.0.
export interface MethodsState {
  rules: MethodRule[];

  recentDemonstrations: string[];
  context?: { id: string; at: Time; cues: MethodCue[] };
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:730; narrowed for 4.0.
export type MissedExcuse = 'sleep' | 'unconscious';

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:203; narrowed for 4.0.
export type NeedId = PhysiologicalNeed | PsychologicalNeed;

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:208; narrowed for 4.0.
export interface NeedReading {
  id: NeedId;
  level: Unit;
  urgency: Unit;
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:206; narrowed for 4.0.
export type NeedReservoirs = Record<PsychologicalNeed, Unit>;

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:275; narrowed for 4.0.
export interface NormDefinition {
  id: Id;
  label: string;
  standing: NormStanding;
  sources: SourceCitation[];
  provenance: NormProvenance;
  exemptions: NormExemption[];
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:290; narrowed for 4.0.
export interface NormExemption {
  when: 'illness' | 'travel';
  makeUp: boolean;
  sources: SourceCitation[];
  provenance: NormProvenance;
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:272; narrowed for 4.0.
export type NormStanding = 'obligatory' | 'recommended' | 'permitted' | 'disliked' | 'forbidden';

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:305; narrowed for 4.0.
export interface NormTag {
  normId: string;

  relation: 'fulfills' | 'violates';
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:511; narrowed for 4.0.
export interface NotedContradiction {
  sourceId: EntityId;
  prop: string;
  at: Time;

  weight: Unit;
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:735; narrowed for 4.0.
export interface OwedMakeUp {
  ofId: string;
  normId?: string;
  kind: Commitment['kind'];
  violatedBy?: string[];
  actions: string[];

  reason: 'illness' | 'travel' | 'necessity' | MissedExcuse | 'missed' | 'broken';

  lapseSince?: Time;
  at: Time;
  label?: string;

  scheduledAs?: string;
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:490; narrowed for 4.0.
export interface PerceptClaim {
  prop: string;
  value: boolean;
  confidence: Unit;

  origin?: EntityId;

  lineage?: string;
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:201; narrowed for 4.0.
export type PhysiologicalNeed = 'food' | 'water' | 'sleep' | 'rest' | 'relief';

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:1180; narrowed for 4.0.
export interface PlanningState {
  depth: number;
  presentBias: Unit;
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:1424; narrowed for 4.0.
export interface PracticeConditions {
  quality?: Unit;

  instruction?: { level: Unit; engagement?: Unit; teacherId?: EntityId };
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:1019; narrowed for 4.0.
export type Pregnancy = {
  id: Id;
  mother: ActorRef;
  father: Father;
  offspring: EntityRef;
  conceivedAt: Time;
  dueAt: Time;
  basis:
    | { kind: 'authored'; evidence: EvidenceRef }
    | { kind: 'derived-gestation'; conceptionInput: InputId; stream: Id };
};

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:2131; narrowed for 4.0.
export interface ProjectHistory {
  prospectId: string;
  goalId: string;
  adoptedAt: Time;
  outcome: 'achieved' | 'abandoned';
  at: Time;
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:2139; narrowed for 4.0.
export interface ProjectsState {
  contributions: ProjectContributionReceipt[];
  setbacks: { prospectId: Id; action: Id; targetId?: Id; placeId?: Id }[];
  pendingAct?: {
    action: Id;
    targetId?: Id;
    placeId?: Id;
    at: Time;
    completedReceipt: Id;
    readings: { prospectId: Id; progress: Unit; evidenceId: Id }[];
  };
  prospects: (Prospect & { lastSeenAt: Time })[];
  history: ProjectHistory[];
  lastAdoptedAt?: Time;
  lastAbandonedAt?: Time;
  currentGoalId?: Id;
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:1694; narrowed for 4.0.
export type PromptingReading = 'whisper' | 'inclination' | 'intrusion' | 'fault' | 'none';

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:1714; narrowed for 4.0.
export interface PromptingRecord {
  at: Time;
  action: string;
  affordanceId: string;

  source: string;

  opposedBy: string;
  outcome: 'passed' | 'turned' | 'assented';

  responseId?: string;
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:1699; narrowed for 4.0.
export interface PromptingResponse {
  id: string;
  kind: PromptingResponseKind;

  practice: Unit;
  lastUsedAt: Time;

  cue?: string;
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:1697; narrowed for 4.0.
export type PromptingResponseKind = 'refuge' | 'redirect' | 'leave';

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:1727; narrowed for 4.0.
export interface PromptingsState {
  reading: PromptingReading;
  readingSource?: Id;
  responses: PromptingResponse[];
  recent: PromptingRecord[];
  echo: Record<Id, { level: Unit; at: Time }>;
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:2110; narrowed for 4.0.
export interface Prospect {
  id: string;
  label: string;
  kind: 'make' | 'arrange' | 'gather' | 'finish';
  placeId?: EntityId;

  materialIds?: EntityId[];
  progress?: Unit;
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:1167; narrowed for 4.0.
export interface ProspectionState {
  entries: RetainedConsequence[];
  revisions: ConsequenceRevision[];
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:202; narrowed for 4.0.
export type PsychologicalNeed =
  | 'safety'
  | 'belonging'
  | 'esteem'
  | 'autonomy'
  | 'competence'
  | 'leisure'
  | 'meaning';

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:2174; narrowed for 4.0.
export interface Pursuit {
  goalId: string;
  since: Time;
  lastServedAt: Time;
  strength: Unit;
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:2181; narrowed for 4.0.
export interface PursuitState {
  current?: Pursuit;
  rested?: { goalId: Id; until: Time };
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:1128; narrowed for 4.0.
export interface ReceivedConsequence {
  id: string;
  revision: number;
  trigger: ConsequenceAction;
  successor: ConsequenceAction & {
    durationMs: DurationMs;
    effort: Unit;
    focus?: Unit;
    materialCost?: number;

    diminishes?: string[];

    advances?: string[];
  };
  availableFrom: Time;

  availableUntil: Time;
  expiresAt: Time;

  chance: Unit;
  confidence: Unit;
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:1517; narrowed for 4.0.
export type RefusalKind = 'cannot' | 'notNow' | 'willNot';

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:566; narrowed for 4.0.
export interface Relationship {
  otherId: PersonId;

  affection: Signed;

  trust: Unit;

  respect: Signed;

  familiarity: Unit;

  roles: string[];

  ledger: number;
  lastInteraction: Time;

  deceasedAt?: Time;

  groups?: string[];
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:504; narrowed for 4.0.
export interface ReportedAccount {
  sourceId: EntityId;
  prop: string;
  value: boolean;
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:1749; narrowed for 4.0.
export interface Resolve {
  key: string;
  label?: string;
  kind: string;
  strength: Unit;

  day: number;
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:1158; narrowed for 4.0.
export interface RetainedConsequence extends ReceivedConsequence {
  sourceId: EntityId;
  channel: 'told' | 'known';
  receivedAt: Time;

  triggeredAt?: Time;
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:1258; narrowed for 4.0.
export interface Retention {
  trace: number;
  chronicleDays: number;
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:1760; narrowed for 4.0.
export interface ReviewRecord {
  day: number;
  missed: string[];
  kept: string[];
  resolved: string[];
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:1768; narrowed for 4.0.
export interface ReviewState {
  style: ReviewStyle;
  styleSource?: string;

  atMsOfDay: DurationMs;

  lastDay?: number;
  resolves: Resolve[];
  last?: ReviewRecord;

  seen: string[];
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:1746; narrowed for 4.0.
export type ReviewStyle = 'accounting' | 'ruminating' | 'none';

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:34; narrowed for 4.0.
export interface RngState {
  a: number;
  b: number;
  c: number;
  d: number;
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:408; narrowed for 4.0.
export interface Skill {
  level: Unit;

  practicedMs: DurationMs;
  lastPracticed: Time;
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:1854; narrowed for 4.0.
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

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:595; narrowed for 4.0.
export interface SocialState {
  relationships: Relationship[];
  groups: { memberOf: Id[]; outsiderStance?: Signed };
  impressions: Impression[];
  reserve: Reserve;
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:1882; narrowed for 4.0.
export interface StandingAdvice {
  adviceId: Id;
  sourceId: EntityId;
  action: string;
  affordanceId?: string;

  strength: Unit;

  salience: Unit;

  at: Time;
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:612; narrowed for 4.0.
export type StateCue = 'fatigue' | 'pain' | 'fear' | 'mood';

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:1484; narrowed for 4.0.
export interface Suggestion {
  voiceId: EntityId;

  affordanceId?: string;
  action?: string;

  strength: Unit;

  insist?: boolean;

  appeal?: NeedId | ValueId | 'duty';

  since?: Time;
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:1519; narrowed for 4.0.
export interface SuggestionResolution {
  assentCost?: { pressure: Unit; provenance: string };

  decidedBy?: { kind: 'inertia' | 'term'; source?: string; margin: number };
  voiceId: EntityId;
  verdict: SuggestionVerdict;
  kind?: RefusalKind;

  insteadAffordanceId?: string;

  counterOffer?: { affordanceId?: string; label: string };

  reason: string;

  likelihood?: Unit;

  episodeId?: string;

  commitmentId?: string;

  insisted?: boolean;

  margin?: number;
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:1515; narrowed for 4.0.
export type SuggestionVerdict = 'assented' | 'complied' | 'deferred' | 'modified' | 'refused' | 'commanded';

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:1551; narrowed for 4.0.
export interface Term {
  source: string;
  value: number;

  ref?: string;
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:219; narrowed for 4.0.
export interface Traits {
  honesty: Unit;
  emotionality: Unit;
  extraversion: Unit;
  agreeableness: Unit;
  conscientiousness: Unit;
  openness: Unit;
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:241; narrowed for 4.0.
export type ValueId = keyof Values;

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:229; narrowed for 4.0.
export interface Values {
  benevolence: Unit;
  universalism: Unit;
  tradition: Unit;
  conformity: Unit;
  security: Unit;
  achievement: Unit;
  power: Unit;
  hedonism: Unit;
  stimulation: Unit;
  selfDirection: Unit;
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:761; narrowed for 4.0.
export interface VoiceRelation {
  voiceId: EntityId;

  trust: Unit;

  pressure: Unit;
  accepted: number;
  refused: number;

  history: VoiceTrustEvent[];

  seeded?: boolean;

  credited?: { action: string; n: number; at: Time }[];

  lastWornAt?: Time;
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:784; narrowed for 4.0.
export interface VoiceTrustEvent {
  at: Time;

  delta: number;

  reason: string;

  action?: string;

  from?: Time;
  count?: number;
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:814; narrowed for 4.0.
export interface WillState {
  voices: VoiceRelation[];
  precommitments: PrecommitmentData[];
  switchMargin: number;
  temperature: number;
  advice: StandingAdvice[];
  command?: Command & {
    startedAt: Time;
    chargedAt: Time;
    margin: number;
    obeyed?: boolean;
    remembered?: boolean;
  };
  lastCommand?: { voiceId: Id; since: Time; endedAt: Time; reason: string };
}

// Source 72f5bdce9bffe05b86953fd954382dc0bea1061c:packages/human/src/types.ts:1962; narrowed for 4.0.
export interface YearRecord {
  year: number;

  days: number;

  routineDays: number;

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

  actions: { action: string; days: number }[];

  episodes: { id: string; day: number; summary: string; valence: Signed; salience: Unit }[];

  illness: string[];

  alive: boolean;
}

// Closed leaves. Source derivations and deliberate changes are recorded in invariants.md.
export type DurationMs = number;
export type TimeSpan = { from: Time; to: Time };
export type ContextBasis =
  | { kind: 'authored'; author: Id; at: Time; validUntil?: Time }
  | { kind: 'received'; evidenceId: Id; at: Time; validUntil?: Time };
export type SourceCitation = {
  kind: 'revelation' | 'hadith' | 'interpretation' | 'empirical' | 'assumption';
  ref: Id;
};
export type Reserve = Partial<Record<StateCue, Unit>>;
export type SourcedNorm = NormDefinition;
export type FacultyParameters = {
  builtins: EffectiveBuiltins;
  fixedPriors: {
    downing: { moving: 0.2; health: 0.3 };
    crisisRepertoire: readonly BreakBehaviour[];
    chronicConditions: readonly ChronicConditionData[];
    inheritance: {
      traitSlope: 0.3;
      traitSd: 0.15;
      aptitudeLogSlope: 0.5;
      aptitudeLogSd: 0.25;
      traitClamp: readonly [0.02, 0.98];
      aptitudeClamp: readonly [0.25, 4];
    };
  };
  planning: { depth: number; presentBias: Unit };
  assent: { minStrength: Unit; pressure: Unit };
  doze: { hazardScale: number };
  crisis: { hazardScale: number };
  promptings: { practiceHalfLifeDays: number; echoRate: number };
};
// The effective frozen built-in coefficient catalog is identified by engine.schema/build hashes.
// Only this closed tuning surface may vary; coefficients retain their original units internally.
export type ActionDemands = {
  effort: Unit;
  focus: Unit;
  mode: 'awake' | 'sleep';
  requires: Partial<Record<Capacity, Unit>>;
  skill?: { id: Id; difficulty: Unit; domain: LearningDomain };
};
export type ActionDefinition = {
  id: Id;
  label: string;
  demands: ActionDemands;
  tags: readonly Id[];
  norms: readonly NormTag[];
};
export type SkillDefinition = { id: Id; label: string; domain: LearningDomain };
export type MethodDefinition = { id: Id; action: Id; conditions: readonly Cue[] };
export type ExpectedConsequences = {
  needs: Partial<Record<NeedId, number>>;
  material?: number;
  risk?: { chance: Unit; severity: Unit; kind: Id };
  voidsBladder?: boolean;
  followedBy: readonly FollowOn[];
  forecastAt?: { comfortAt: Unit; spentAt: Unit };
  provenance: readonly Id[];
};
export type Offer = {
  id: Id;
  actionId: Id;
  label: string;
  person: PersonId;
  durationMs: DurationMs;
  target?: Id;
  place?: Id;
  participants: readonly PersonId[];
  alongside: readonly PersonId[];
  demands: ActionDemands;
  tags: readonly Id[];
  norms: readonly NormTag[];
  expected: ExpectedConsequences;
  methodContext?: Id;
  promise?: CommitmentData;
  fulfills: readonly Id[];
  advances: readonly Id[];
  diminishes: readonly Id[];
  jointId?: Id;
};
export type ConsumedAmounts = { food?: number; water?: number; relief?: number };
export type ExertionAmounts = { sleepPressure?: number; exertion?: number };
export type InjuryEvidence = {
  part: string;
  severity: Unit;
  healRatePerDay: number;
  affects?: Partial<Record<Capacity, Unit>>;
  bleeding?: number;
};
export type IllnessEvidence = {
  kind: Id;
  severity: Unit;
  trendPerDay: number;
  contagious: boolean;
  chronic?: boolean;
  baseline?: Unit;
  aggravatedBy?: readonly Id[];
};
export type ActualConsequences = {
  psychological?: Partial<Record<PsychologicalNeed, Signed>>;
  consumed?: ConsumedAmounts;
  exerted?: ExertionAmounts;
  injury?: InjuryEvidence;
  illness?: IllnessEvidence;
  exposures: readonly { agent: Id; amount: number; exposureId: Id }[];
  voidedBladder?: boolean;
  material?: number;
  practice?: PracticeConditions;
  observedProgress: readonly { prospectId: Id; progress: Unit; evidenceId: Id }[];
};
export type ObservedOutcome = {
  activityId: Id;
  offerId: Id;
  actionId: Id;
  target?: Id;
  start: Time;
  end: Time;
  status: 'completed' | 'failed' | 'interrupted';
  evidenceId: Id;
  actual: ActualConsequences;
  quality?: Unit;
  summary?: string;
  fulfills: readonly Id[];
  advances: readonly Id[];
};
export type PerceptData = {
  id: Id;
  occurredAt: Time;
  channel: 'saw' | 'heard' | 'told' | 'felt' | 'outcome' | 'social';
  kind: Id;
  actorId?: Id;
  targetId?: Id;
  placeId?: Id;
  valence?: Signed;
  salience: Unit;
  summary: string;
  addressedSummary?: string;
  near?: boolean;
  claims: readonly PerceptClaim[];
  norms: readonly NormTag[];
  threat?: { severity: Unit; chance?: Unit; sourceId?: Id; aboutId?: Id };
  advice: readonly { adviceId: Id; action: Id; affordanceId?: Id; strength?: Unit }[];
  demonstrates?: { skill: Id; level: Unit; durationMs: DurationMs; domain: LearningDomain };
  consequences: readonly ReceivedConsequence[];
  withdrawConsequences: readonly { id: Id; revision: number }[];
  witnesses: readonly PersonId[];
  reports: readonly ReportedAccount[];
  prospect?: Prospect;
  provenance: readonly Id[];
};
export type AmbientEvidence = {
  contextId: Id;
  readings: AmbientPercept;
  dozeContext?: DozeContext;
  basis: { kind: 'received'; evidenceId: Id; at: Time; validUntil?: Time };
};
export type SuggestionData = Suggestion & { adviceId: Id };
export type SocialEventData = { kind: SocialEventKind; byMe: boolean; magnitude: Unit };
/** An authored response to this social evidence, not a factual correction or an empirical trust rate. */
export type SourceTrustResponse = {
  sourceId: Id;
  multiplier: Unit;
  basis: { author: Id; ruleId: Id; edition: Id };
};
export type ImpressionKey =
  | StateCue
  | 'regard'
  | `fear@${Id}`
  | `trait:${Id}`
  | `tie:${PersonId}`
  | `trust:${Id}`
  | `skill:${Id}`;
export type OutwardSigns = {
  fatigue: Unit;
  pain: Unit;
  fear: Unit;
  mood?: Signed;
  fearOf?: Record<Id, Unit>;
};
export type ObservedActData = {
  clarity?: Unit;
  placeId?: Id;
  avoided?: Signed;
  withId?: PersonId;
  toward?: Signed;
  voiceId?: Id;
  heeded?: Signed;
  tags: readonly Id[];
};
export type KnownPersonFact =
  | { kind: 'trait'; trait: keyof Traits; value: Unit }
  | { kind: 'tie'; other: PersonId; closeness: Signed };
/** Actual received evidence. The stable outcome id is also the input/evidence id.
 * Valence describes this person's experience, never moral worth or divine response. */
export type VoiceEvidence = { id: Id; occurredAt: Time; action: Id } & (
  | { kind: 'act'; felt: Signed }
  | { kind: 'request'; granted: boolean; felt: Signed }
  | { kind: 'support'; effect: 'acknowledged' | 'comfort' }
);
export type VoicePromiseData = { kept: boolean; action?: Id };
export type PracticeKind = 'reflection' | 'worship' | 'rest';
export type CommitmentData = Omit<Commitment, 'status' | 'exempt'>;
export type GoalData = Omit<Goal, 'status' | 'adoptedAt' | 'lastAdvancedAt'>;
export type PrecommitmentData = {
  id: Id;
  action: Id;
  bias: number;
  fromMsOfDay: DurationMs;
  toMsOfDay: DurationMs;
};
export type AuthoredEpisode = Episode & {
  basis: { kind: 'authored'; author: Id };
  provenance: readonly Id[];
};
export type InitialBody = {
  satiety: Unit;
  hydration: Unit;
  sleepPressure: Unit;
  exertion: Unit;
  fitness: Unit;
  health: Unit;
  pain: Unit;
  sleepDebtHours: number;
  depletion: Unit;
  circadianPeakMs: DurationMs;
  asleep: boolean;
  since: Time;
  doze: { context: DozeContext; basis: { kind: 'authored'; author: Id; at: Time; validUntil?: Time } };
  bladder: BladderState;
  injuries: readonly (InjuryEvidence & { id: Id; since: Time; tendedAt?: Time })[];
  illnesses: readonly (IllnessEvidence & { id: Id; since: Time })[];
  exposures: readonly { agent: Id; recent: Unit; cumulative: number; lastAt: Time }[];
  downed?: { since: Time; reason: string; until?: Time };
};
export type InitialNeeds = NeedReservoirs;
export type InitialSkill = { id: Id; level: Unit; practicedMs: DurationMs; lastPracticed: Time };
export type InitialBelief = Belief;
export type InitialSourceTrust = { sourceId: Id; trust: Unit };
export type InitialRelationship = Relationship;
export type InitialVoice = { voiceId: Id; trust: Unit };
export type InitialAgenda = {
  exemptions: ExemptionPremises;
  commitments: readonly CommitmentData[];
  goals: readonly GoalData[];
  precommitments: readonly PrecommitmentData[];
  owed: readonly OwedMakeUp[];
};
export type InitialFamily = {
  contactCovered: readonly TimeSpan[];
  aptitudes: Record<Id, number>;
  attachment?: Unit;
  pregnancy?: Pregnancy;
  raisedMs?: DurationMs;
};
export type InitialBonds = {
  courtships: readonly Courtship[];
  marriages: readonly Marriage[];
  mourning?: { forId: Id; since: Time; until: Time };
};
export type InitialAffect = {
  mood: { valence: Signed; arousal: Unit };
  regulation: Unit;
  emotions: readonly Emotion[];
};
export type InitialPromptings = {
  reading: PromptingReading;
  readingSource?: Id;
  responses: readonly PromptingResponse[];
};
export type InitialReview = { style: ReviewStyle; styleSource?: Id; atMsOfDay: DurationMs };
export type WordingSequence = { rng: RngState; occurrence: number; last: number };
export type Lexicon = {
  /** Reviewed alternatives for keys in NARRATION_TEMPLATES; same named slots. */
  wordings?: Record<string, readonly string[]>;
  /** Per-person partial overrides; missing keys use wordings, then built-in templates. */
  voices?: Record<Id, Record<string, readonly string[]>>;
  locale?: string;
  materialMeaning?: string;
  names: Record<Id, string>;
  roles: Record<Id, string>;
  prefer: 'name' | 'role';
  actions: Record<Id, { base?: string; past?: string; gerund?: string }>;
};
// Authored alternatives use the closed semantic catalog and the one renderer.
export type CalendarDefinition = {
  id: Id;
  epoch: { id: Id; simulationAt: Time; dayIndex: number; msOfDay: DurationMs };
  dayMs: 86400000;
  days: readonly CalendarDay[];
};
export type CalendarDay = {
  dayIndex: number;
  start: Time;
  prayers?: {
    fajrMs: DurationMs;
    sunriseMs: DurationMs;
    dhuhrMs: DurationMs;
    asrMs: DurationMs;
    maghribMs: DurationMs;
    ishaMs: DurationMs;
  };
  nextFajrMs?: DurationMs;
  fasting?: {
    normId: Id;
    from: Time;
    until: Time;
    violatingActions: readonly Id[];
    provenance: NormProvenance;
  };
  eid?: { normId: Id; from: Time; until: Time; provenance: NormProvenance };
  windows: readonly { commitmentId: Id; from: Time; until: Time }[];
};
export type RoutineDefinition = { id: Id; entries: readonly RoutineEntry[] };
export type RoutineEntry = {
  id: Id;
  at: Time;
  offer: Offer;
  chance: Unit;
  received?: { evidenceId: Id; percepts: readonly PerceptData[] };
};
// A routine opportunity is not an automatic successful completion receipt.

export type ActorActivity = {
  id: Id;
  offer: Offer;
  needsAtStart: Partial<Record<NeedId, Unit>>;
  startedAt: Time;
  endsAt: Time;
  decisionId: Id;
  intention: string;
  suggestions: readonly SuggestionResolution[];
  /** The one voice credited with this choice (will's creditedResolution), as 3.x Activity.suggestion. */
  suggestion?: SuggestionResolution;
  protest?: boolean;
  reviewAt: Time;
  commitmentId?: Id;
  jointId?: Id;
  interrupt?: { at: Time; reason: string };
  dozedAt?: Time;
  necessity?: boolean;
};
export type ActorState = {
  id: PersonId;
  name: string;
  now: Time;
  rng: RngState;
  randomIdentity: ActorRandomIdentity;
  life: LifeCourse;
  body: BodyState;
  needs: NeedReservoirs;
  traits: Traits;
  values: Values;
  conscience: ConscienceState;
  affect: AffectState;
  skills: Record<Id, Skill>;
  methods: MethodsState;
  prospection: ProspectionState;
  planning: PlanningState;
  promptings: PromptingsState;
  curiosity: CuriosityState;
  projects: ProjectsState;
  pursuit: PursuitState;
  review: ReviewState;
  skillRetention: { consolidationHours: number };
  habits: Habit[];
  memory: MemoryState;
  context: { scarcity: Knowledge<Unit>; smoking: Knowledge<Unit> };
  social: SocialState;
  agenda: AgendaState;
  will: WillState;
  activity: ActorActivity | null;
  trace: DecisionRecord[];
  nextDecision: number;
  lastAction?: Id; // previous settled action, not the current action
  chronicle: DayRecord[];
  chronicleDay: ChronicleDay;
  chronicleYears: YearRecord[];
  character: CharacterState;
  family: FamilyState;
  bonds: BondsState;
  ambient: AmbientState;
  retention: Retention;
};

export type FacultyId =
  | 'run'
  | 'body'
  | 'affect'
  | 'crisis'
  | 'environment'
  | 'family'
  | 'lifecourse'
  | 'partnering'
  | 'agenda'
  | 'beliefs'
  | 'cognition'
  | 'conscience'
  | 'curiosity'
  | 'habits'
  | 'methods'
  | 'needs'
  | 'persistence'
  | 'projects'
  | 'prospection'
  | 'skills'
  | 'social'
  | 'will'
  | 'character'
  | 'chronicle'
  | 'conversation'
  | 'memory'
  | 'promptings'
  | 'review'
  | 'renderer';
export type TermData = { source: TermSource; value: number; ref?: Id };
// Source strings are diagnostic labels, never dispatch keys.
export type TermSource =
  | 'habit'
  | 'effort'
  | 'risk'
  | 'expectation'
  | 'autonomy'
  | 'commitment'
  | 'memory'
  | 'material'
  | 'need:bladder'
  | 'forecast:body'
  | 'promptings:turn'
  | 'promptings:echo'
  | 'review:resolve'
  | `need:${NeedId}`
  | `norm:${Id}`
  | `commitment:${Id}`
  | `goal:${Id}`
  | `emotion:${EmotionId}:${Id}`
  | `emotion:${Id}`
  | `avoid:${Id}`
  | `joint:${Id}`
  | `companion:${Id}`
  | `precommit:${Id}`
  | `abstain:${Id}`
  | `pursuit:${Id}`
  | `suggestion:${Id}`
  | `social:${Id}`
  | `regard:${Id}`
  | `together:${Id}`
  | `method:${Id}`
  | `curiosity:${Id}`
  | `project:${Id}`
  | `persistence:${Id}`
  | `full:${PhysiologicalNeed}`
  | `partner:${Id}`
  | `prospection:${Id}`
  | `conscience:${Id}`;
export type EffectIdentity = { id: Id; cause: Id; person: PersonId; at: Time; applyPhase: Phase };
export type TermEffect = EffectIdentity & { from: FacultyId; to: 'will'; offerId: Id; term: TermData };
export type ModifierData =
  | { kind: 'body-load'; load: BodyLoad }
  | { kind: 'life-modifiers'; modifiers: LifeModifiers }
  | {
      kind: 'environment-body';
      metabolismMultiplier: number;
      exertionRecoverHalfLifeMultiplier: number;
      exertionRecoverHalfLifeAsleepMultiplier: number;
      sleepTauMultiplier: number;
      wakeTauMultiplier: number;
      moodOffset: Signed;
    }
  | { kind: 'pregnancy-body'; metabolismMultiplier: number }
  | { kind: 'skill-aptitude'; skillId: Id; multiplier: number };
export type ModifierEffect = EffectIdentity &
  (
    | { from: 'run'; to: 'body'; modifier: Extract<ModifierData, { kind: 'body-load' }> }
    | {
        from: 'lifecourse';
        to: 'body' | 'skills' | 'will' | 'affect';
        modifier: Extract<ModifierData, { kind: 'life-modifiers' }>;
      }
    | { from: 'environment'; to: 'body'; modifier: Extract<ModifierData, { kind: 'environment-body' }> }
    | { from: 'family'; to: 'body'; modifier: Extract<ModifierData, { kind: 'pregnancy-body' }> }
    | { from: 'family'; to: 'skills'; modifier: Extract<ModifierData, { kind: 'skill-aptitude' }> }
  );
export type AppraisalData = AppraisalEvent;
export type AppraisalEffect = EffectIdentity & {
  from:
    | 'run'
    | 'agenda'
    | 'conscience'
    | 'social'
    | 'body'
    | 'memory'
    | 'environment'
    | 'conversation'
    | 'projects'
    | 'promptings'
    | 'review';
  to: 'affect';
  appraisal: AppraisalData;
};
export type ScheduledEffect = TermEffect | ModifierEffect | AppraisalEffect;

export type EventData =
  | { kind: 'quantity-estimated'; person: PersonId; evidenceId: Id; value: number; confidence: Unit }
  | {
      kind: 'observation-attended';
      evidenceId: Id;
      perceptId: Id;
      attention: Unit;
      episodeId?: Id;
      deliveredAt: Time;
      occurredAt: Time;
      /** The host's own prose for what was perceived, kept verbatim. */
      summary?: string;
      /** For news of a death, who died; the renderer words it from the lexicon. */
      died?: PersonId;
    }
  | { kind: 'make-ups-retired'; receipts: readonly MakeUpRetirementReceipt[] }
  | { kind: 'suggestion-resolved'; adviceId: Id; decisionId: Id; resolution: SuggestionResolution }
  | { kind: 'decision'; decision: DecisionRecord }
  | { kind: 'action-requested'; request: ActionRequest }
  | { kind: 'communication-requested'; request: CommunicationRequest }
  | { kind: 'communication-settled'; requestId: Id; received: readonly CommunicationReception[] }
  | {
      kind: 'action-settled';
      requestId: Id;
      activityId: Id;
      disposition: ActionResolution['disposition'];
      outcomeEvidenceId?: Id;
      worldRevision: number;
    }
  | { kind: 'claim-told'; speaker: Id; listener: Id; deliveryRequestId: Id; claim: ToldClaimData }
  | {
      kind: 'belief-revised';
      prop: Id;
      beforeLogOdds: number | null;
      after: Belief;
      evidenceId: Id;
      sourceTrustChanges: readonly { sourceId: Id; before: Unit; after: Unit }[];
    }
  | {
      kind: 'contradiction-checked';
      evidenceId: Id;
      sourceId: Id;
      prop: Id;
      disposition:
        | 'applied'
        | 'no-account'
        | 'same-account'
        | 'self'
        | 'already-noted'
        | 'untrusted-reporter';
      appliedWeight?: Unit;
    }
  | {
      kind: 'method-evidence';
      demonstrationId: Id;
      methodId: Id;
      contextId: Id;
      disposition: 'acquired' | 'duplicate' | 'unavailable' | 'unreceived-conditions' | 'no-attention';
      evidence: MethodEvidence;
    }
  | {
      kind: 'commitment-changed';
      commitmentId: Id;
      before: Commitment['status'] | null;
      after: Commitment;
      owed?: OwedMakeUp;
    }
  | { kind: 'goal-changed'; goalId: Id; before: Goal['status'] | null; after: Goal }
  | { kind: 'body-change'; change: BodyChange }
  | { kind: 'lifecycle'; receipt: LifecycleReceipt }
  | { kind: 'chapter-change'; chapterId: Id; projection: ChapterProjection }
  | { kind: 'input-disposed'; disposition: InputDisposition }
  | { kind: 'effect-applied'; effectId: Id; owner: FacultyId }
  | { kind: 'social-received'; evidenceId: Id; other: Id; event: SocialEventData; applied: boolean }
  | {
      kind: 'source-trust-responded';
      evidenceId: Id;
      response: SourceTrustResponse;
      before: Unit;
      after: Unit;
    }
  | { kind: 'conversation'; conversation: ConversationData }
  | { kind: 'prompting'; record: PromptingRecord }
  | { kind: 'review'; record: ReviewRecord }
  | { kind: 'day-closed'; record: DayRecord }
  | { kind: 'year-closed'; record: YearRecord }
  | { kind: 'crisis'; change: 'onset' | 'recovered'; repertoireId: Id; until?: Time }
  | {
      kind: 'voice-evidence';
      evidenceId: Id;
      voiceId: Id;
      evidence: VoiceEvidence;
      before: Unit;
      after: Unit;
    }
  | { kind: 'voice-promise'; voiceId: Id; kept: boolean; before: Unit; after: Unit }
  | { kind: 'admission'; person: Id; castId?: Id; projectionHash?: Hash };
export type BodyChange =
  | { kind: 'consumed'; received: ConsumedAmounts; receiptId: Id }
  | { kind: 'exerted'; costs: ExertionAmounts; receiptId: Id }
  | { kind: 'injured'; injury: Injury }
  | { kind: 'illness'; illness: Illness }
  | { kind: 'downed'; since: Time; reason: string; until?: Time }
  | { kind: 'stood'; ended: TimeSpan }
  | { kind: 'dozed'; since: Time }
  | { kind: 'woke'; slept: TimeSpan; evidenceId?: Id }
  | { kind: 'died'; discoveredAt: Time }
  | { kind: 'voided'; receiptId: Id };
export type ToldClaimData = {
  prop: Id;
  value: boolean;
  confidence: Unit;
  speakerCredence: Unit;
  deceit: boolean;
  backbiting: boolean;
  about?: Id;
  score: number;
  origin?: Id;
  lineage?: string;
};
export type ConversationData = {
  speaker: Id;
  listener: Id;
  claims: readonly ToldClaimData[];
  withheld: readonly { prop: Id; reason: string }[];
  norms: readonly NormTag[];
  advice: readonly { action: Id; percept: PerceptData; suggestion: SuggestionData }[];
  socialEvents: { speaker: readonly SocialEventData[]; listener: readonly SocialEventData[] };
};
export type MethodEvidence = {
  support: Signed;
  terms: readonly TermData[];
  matched: readonly { id: Id; action: Id; sourceId: Id; support: Signed }[];
};

// Mapping IDs are provenance, not selectors of actor algorithms.
export type ReferenceKind =
  | 'person'
  | 'entity'
  | 'action'
  | 'skill'
  | 'norm'
  | 'voice'
  | 'place'
  | 'commitment'
  | 'chain'
  | 'goal'
  | 'prospect'
  | 'episode'
  | 'gist'
  | 'method'
  | 'evidence'
  | 'pregnancy'
  | 'construction-stream'
  | 'kin-premise'
  | 'kin-scope'
  | 'proposal'
  | 'tag'
  | 'input'
  | 'request'
  | 'effect'
  | 'breach'
  | 'response'
  | 'resolve'
  | 'context'
  | 'marriage-custom'
  | 'proposition'
  | 'advice'
  | 'deed'
  | 'receipt';
export type Reference = { kind: ReferenceKind; id: Id };
export type ReferenceBinding = { source: Reference; target: Reference };
export type PersonaMapping = {
  id: Id;
  sourceHost: Id;
  targetHost: Id;
  references: readonly ReferenceBinding[];
  episodes: readonly {
    sourceEpisodeId: Id;
    targetEpisodeId: Id;
    action?: Id;
    actorId?: Id;
    targetId?: Id;
    placeId?: Id;
    voiceId?: Id;
    tags: readonly Id[];
  }[];
  commitments: readonly {
    sourceCommitmentId: Id;
    targetCommitmentId: Id;
    actions: readonly Id[];
    toId?: Id;
    targetId?: Id;
    normId?: Id;
    chain?: Id;
    from: Time;
    until: Time;
  }[];
  exclusions: readonly ProjectionExclusion[];
};
export type CalendarMapping = {
  id: Id;
  source: CalendarDefinition;
  target: CalendarDefinition;
  offsetMs: number;
  references: readonly ReferenceBinding[];
  windows: readonly { sourceCommitmentId: Id; targetCommitmentId: Id; source: TimeSpan; target: TimeSpan }[];
  sourceNorms: readonly SourcedNorm[];
  targetNorms: readonly SourcedNorm[];
};
export type PortableObligation =
  | { kind: 'commitment'; commitment: Commitment }
  | { kind: 'owed'; owed: OwedMakeUp }
  | { kind: 'lapse'; since: Time; missed: number }
  | { kind: 'breach'; breach: ConscienceState['breaches'][number] }
  | { kind: 'goal'; goalId: Id };
export type PortableProvenance = {
  reference: Reference;
  sourceHost: Id;
  sourceEdition: Id;
  sourceAt: Time;
  basis: 'authored' | 'received' | 'derived';
  sourceIds: readonly Id[];
  evidence: readonly Reference[];
  research?: NormProvenance;
};
export type PortableUnknown = {
  reference: Reference;
  reason: 'not-observed' | 'not-retained' | 'unmapped' | 'outside-projection';
  lastKnownAt?: Time;
};
export type ProjectionExclusion =
  | {
      reference: Reference;
      reason:
        | 'host-local'
        | 'runtime-derived'
        | 'not-selected'
        | 'unsupported-health'
        | 'unsupported-temporal-bond'
        | 'unresolved-action';
      requiredForAdmission: boolean;
    }
  | {
      slice: 'body-arrival' | 'needs' | 'affect' | 'ambient' | 'context' | 'history' | 'continuation';
      reason: 'host-local' | 'runtime-derived' | 'not-selected';
      requiredForAdmission: boolean;
    };

export type PersonaProjection = {
  coordinates: { at: Time; offsetMs: number; calendarId: Id };
  mappingId: Id;
  source: { id: PersonId; host: Id; at: Time };
  name: string;
  life: LifeCourse;
  rng: RngState;
  randomIdentity: ActorRandomIdentity;
  traits: Traits;
  values: Values;
  health: { health: Unit; fitness: Unit; circadianPeakMs: DurationMs };
  family: FamilyState;
  bonds: BondsState;
  lifecycle: PortableLifecycle;
  skills: Record<Id, Skill>;
  skillRetention: { consolidationHours: number };
  episodes: readonly Episode[];
  commitments: readonly Commitment[];
  obligations: readonly PortableObligation[];
  evidence: PortableEvidence;
  references: readonly ReferenceBinding[];
  provenance: readonly PortableProvenance[];
  unknowns: readonly PortableUnknown[];
  exclusions: readonly ProjectionExclusion[];
};
// This is a proposed semantic DTO. A lossless admission policy/encoding is NOT accepted yet.
export type PortableEvidence = {
  character: CharacterState;
  heldNorms: readonly HeldNorm[];
  beliefs: readonly Belief[];
  sourceTrust: readonly InitialSourceTrust[];
  relationships: readonly Relationship[];
  voices: readonly VoiceRelation[];
  gists: readonly Gist[];
  expectations: readonly ActionExpectation[];
  contradictions: readonly NotedContradiction[];
  methods: MethodsState;
  prospection: ProspectionState;
  habits: readonly Habit[];
  motivation: PortableMotivation;
  dependencies: PortableDependencies;
  impressions: readonly Impression[];
  counters: { nextEpisode: number; nextGist: number; allocated: readonly Reference[] };
};
export type CalendarProjection = {
  person: PersonaProjection;
  calendar: {
    mappingId: Id;
    offsetMs: number;
    commitments: readonly Commitment[];
    owed: readonly OwedMakeUp[];
    lapse: AgendaState['lapse'] | null;
    heldNorms: readonly HeldNorm[];
    norms: readonly SourcedNorm[];
  };
};
export type ChapterSlot = { slot: number; atWallMs: number; draw: number };
// Source helper calls slot index `at`, not elapsed simulation time. Never feed it to body.

export type JointProposalData = {
  id: Id;
  proposerId: Id;
  partnerIds: readonly Id[];
  offer: Offer;
  record: DecisionRecord;
  at: Time;
  accepted: readonly Id[];
  partnerRecords: Record<Id, DecisionRecord>;
  status: 'pending' | 'accepted' | 'declined';
  settledReason?: string;
};
export type CommunityState = {
  idleUntil: Record<Id, Time>;
  perceivedUntil: Record<Id, Time>;
  interrupts: Record<Id, { at: Time; reason: string }>;
  joint: {
    nextId: number;
    proposals: readonly JointProposalData[];
    excluded: Record<Id, { at: Time; ids: readonly Id[] }>;
  };
  partnerDeaths: Record<Id, { decisionId: Id; jointId?: Id; deceasedId: Id }>;
  queued: Record<Id, readonly SuggestionData[]>;
  dayDone: Record<Id, number>;
  standingDone: Record<Id, Record<Id, { at: Time; action: Id; targetId?: Id }>>;
};
export type RunRngState = RngState;
export type RunCounters = {
  nextInput: number;
  nextRequest: number;
  nextEvent: number;
  nextActivity: number;
  nextTransaction: number;
};
export type SchedulerCursor = {
  at: Time;
  closed: boolean;
  phase: Phase;
  fidelity: Fidelity;
  frameOrdinal: number;
  localOrdinal: number;
  resolutionLane: readonly RequestId[];
};
export type ScheduledEvent = {
  id: Id;
  at: Time;
  phase: Phase;
  person?: PersonId;
  causalId: Id;
  localOrdinal: number;
  data: ScheduledEventData;
};
export type ScheduledEventData =
  | { kind: 'hazard-boundary'; person: Id; boundary: HazardBoundary }
  | { kind: 'input'; input: Input }
  | { kind: 'activity-finish'; person: Id; activityId: Id }
  | { kind: 'activity-review'; person: Id; activityId: Id; reason: string }
  | { kind: 'calendar'; dayIndex: number; commitmentIds: readonly Id[] }
  | { kind: 'routine-opportunity'; person: Id; scheduleId: Id; entryId: Id }
  | {
      kind: 'owner-boundary';
      owner: FacultyId;
      person: Id;
      boundary: 'hazard' | 'threshold' | 'recovery' | 'expiry' | 'day' | 'year';
    }
  | { kind: 'effect'; effect: ScheduledEffect };
export type ReceiptLedger = {
  dispositions: readonly InputDisposition[];
  communications: readonly {
    requestId: Id;
    inputId: Id;
    requestHash: Hash;
    receptions: readonly CommunicationReception[];
  }[];
  inputs: readonly { id: InputId; hash: Hash; ordinal: number }[];
  settlements: readonly {
    requestId: Id;
    inputId: Id;
    requestHash: Hash;
    activityId: Id;
    stage: ActionRequest['stage'];
    outcomeEvidenceId?: Id;
  }[];
  evidence: readonly { id: Id; person: Id; inputId: Id; hash: Hash }[];
  effects: readonly {
    id: Id;
    cause: Id;
    owner: FacultyId;
    person: Id;
    causalEffectKey: Id;
    appliedAt: Time;
  }[];
  allocated: readonly { scope: AllocationScope; reference: Reference; allocatedAt: Time }[];
};

export type Knowledge<T> =
  | { kind: 'known'; value: T; evidenceIds: readonly Id[] }
  | { kind: 'prior'; value: T; basis: Id }
  | { kind: 'unobserved' };
export type InspectSelection = InspectQuery['select'][number];
export type BeliefReading = Omit<Belief, 'logOdds'> & { credence: Unit };
export type HostParts = {
  needs: readonly NeedReading[];
  condition: ConditionReading;
  traits: Traits;
  heldNorms: readonly HeldNorm[];
  skills: readonly SkillReading[];
  summary: { name: string; alive: boolean; activity: { id: Id; actionId: Id } | null };
  body: { state: BodyState; readout: BodyReadout };
  beliefs: readonly BeliefReading[];
  sourceTrust: Readonly<Record<Id, Unit>>;
  promptings: PromptingsReading;
  review: ReviewState;
  advice: AdviceReading;
  relationships: { ties: readonly Relationship[]; voices: readonly VoiceRelation[] };
  methods: MethodsState;
  agenda: AgendaState;
  events: readonly VisibleEvent[];
  persona: PortablePerson;
  calendar: PortableCalendar;
  chapter: ChapterProjection;
};
export type PromptingsReading = Omit<PromptingsState, 'responses'> & {
  responses: readonly (PromptingResponse & { effectivePractice: Unit })[];
};
export type AdviceReading = readonly (StandingAdvice & { effectiveWeight: Unit })[];
export type SelfBody = { perceived: BodyReadout['perceived'] };
export type SelfParts = {
  needs: readonly NeedReading[];
  condition: ConditionReading;
  traits: Knowledge<Traits>;
  heldNorms: readonly HeldNorm[];
  skills: readonly SkillReading[];
  summary: { name: string; mood: AffectState['mood'] };
  body: SelfBody;
  beliefs: readonly BeliefReading[];
  sourceTrust: Readonly<Record<Id, Unit>>;
  promptings: PromptingsReading;
  review: ReviewState;
  advice: AdviceReading;
  relationships: { ties: readonly Relationship[]; voices: readonly VoiceRelation[] };
  methods: MethodsState;
  agenda: AgendaState;
  events: readonly VisibleEvent[];
  persona: { kind: 'unavailable'; reason: 'privileged-projection' };
  calendar: Knowledge<readonly Commitment[]>;
  chapter: { kind: 'unavailable'; reason: 'host-narrative-clock' };
};
export type OtherParts = {
  needs: Knowledge<readonly NeedReading[]>;
  condition: ImpressionReading;
  traits: Knowledge<Traits>;
  heldNorms: Knowledge<readonly HeldNorm[]>;
  skills: Knowledge<readonly SkillReading[]>;
  summary: { kind: 'unobserved' };
  body: Knowledge<OutwardSigns>;
  beliefs: Knowledge<readonly BeliefReading[]>;
  sourceTrust: Knowledge<Readonly<Record<Id, Unit>>>;
  promptings: Knowledge<PromptingsReading>;
  review: Knowledge<ReviewState>;
  advice: Knowledge<AdviceReading>;
  relationships: Knowledge<Relationship>;
  methods: Knowledge<MethodsState>;
  agenda: Knowledge<AgendaState>;
  events: readonly VisibleEvent[];
  persona: { kind: 'unavailable'; reason: 'privileged-projection' };
  calendar: Knowledge<readonly Commitment[]>;
  chapter: { kind: 'unavailable'; reason: 'host-narrative-clock' };
};
export type SelectedPart<T> = { [K in keyof T]: { select: K; value: T[K] } }[keyof T];
// Runtime enforces exactly the requested parts, no duplicates, and observer rights.
export type PersonView =
  | { kind: 'host'; id: Id; parts: readonly SelectedPart<HostParts>[] }
  | { kind: 'self'; id: Id; parts: readonly SelectedPart<SelfParts>[] }
  | { kind: 'other'; id: Id; parts: readonly SelectedPart<OtherParts>[] };
export type PreviewBoundary =
  | { type: 'until' }
  | {
      type: 'world-required';
      requests: readonly (
        | { kind: 'action'; person: Id; stage: ActionRequest['stage'] }
        | { kind: 'communication'; speaker: Id; recipients: readonly Id[] }
      )[];
    };
// Separate public data prevents private speaker confidence/deceit from reaching listener events.
export type PublicEventData =
  | { kind: 'claim-heard'; speaker: Id; listener: Id; claim: PerceptClaim }
  | {
      kind: 'action-visible';
      person: Id;
      actionId: Id;
      stage: 'start' | 'finish' | 'interrupt';
      activityId: Id;
      observedStatus?: ObservedOutcome['status'];
    }
  | { kind: 'social-visible'; actor: Id; target?: Id; event: SocialEventData }
  | { kind: 'outward-visible'; person: Id; signs: OutwardSigns };
export type VisibleEvent =
  | {
      id: EventId;
      at: Time;
      causeIds: readonly Id[];
      data: PublicEventData;
      narration: readonly RenderedLine[];
    }
  | {
      id: EventId;
      at: Time;
      causeIds: readonly Id[];
      access: 'self';
      data: SelfEventData;
      narration: readonly RenderedLine[];
    }
  | {
      id: EventId;
      at: Time;
      causeIds: readonly Id[];
      access: 'host';
      data: EventData;
      narration: readonly RenderedLine[];
    };

// Source partnering/partnering.ts:91,118,157; no custom callback.
export type Kin =
  | 'spouse'
  | 'parent'
  | 'child'
  | 'sibling'
  | 'grandparent'
  | 'grandchild'
  | 'aunt-uncle'
  | 'niece-nephew'
  | 'step-parent'
  | 'step-child'
  | 'parent-in-law'
  | 'child-in-law';
export type MarriageCustomData = {
  id: Id;
  minAgeYears: number;
  forbiddenKin: readonly Kin[];
  guardianForBride: boolean;
  mourningDays: { widow: number; widower: number };
  maxSpouses: number;
  pairing: 'opposite-sex' | 'any';
  provenance: NormProvenance;
  engineeringPremises: readonly SourceCitation[];
};

// Director rulings17–19; source conversation:129–181, memory:331–414.
export type CommunicationItem = {
  id: Id;
  data:
    | { kind: 'claim'; told: PerceptClaim; private: ToldClaimData }
    | { kind: 'gist'; sourceGistId: Id; gist: Gist }
    | { kind: 'advice'; percept: PerceptData; suggestion: SuggestionData }
    | { kind: 'social-act'; speaker: SocialEventData; listener: SocialEventData }
    | { kind: 'speaker-deed'; norms: readonly NormTag[] };
};
export type CommunicationRequest = {
  kind: 'communication';
  id: RequestId;
  requestHash: Hash;
  issuedAt: Time;
  boundaryAt: Time;
  worldRevision: number;
  speaker: PersonId;
  recipients: readonly PersonId[];
  items: readonly CommunicationItem[];
};
export type HostRequest = ActionRequest | CommunicationRequest;
export type CommunicationReception = {
  recipient: PersonId;
  evidenceId: Id;
  attention: Unit;
  itemIds: readonly Id[];
};
export type CommunicationResolution = {
  requestId: RequestId;
  requestHash: Hash;
  worldRevision: number;
  speaker: PersonId;
  emittedItemIds: readonly Id[];
  received: readonly CommunicationReception[];
  worldChange?: WorldChange;
};

// Qualified lifecycle/ruling20 folded into the canonical graph.
export type CourtshipStage = 'none' | 'courting' | 'ready' | 'engaged' | 'married';
export type ActorRef = { kind: 'actor'; id: PersonId };
export type EntityRef = { kind: 'entity'; id: Id };
export type EvidenceRef = { kind: 'evidence'; id: Id };
export type ActualBasis = { evidence: EvidenceRef; worldRevision: number };
export type KnownFather = { kind: 'identified'; entity: EntityRef };
export type Father = KnownFather | { kind: 'unknown' };
export type GeneticOrigin =
  | { kind: 'authored'; basis: EvidenceRef }
  | {
      kind: 'two-parent-derived';
      parents: readonly [EntityRef, EntityRef];
      parentSnapshotHash: Hash;
      inheritanceStream: Id;
    };
export type TraitBasis =
  | { kind: 'explicit-authoring'; evidence: EvidenceRef }
  | { kind: 'unknown-genetics-prior'; prior: 'source-population-midpoint' };
export type NewbornContext = Pick<
  AuthoredPersonState,
  'body' | 'needs' | 'reserve' | 'retention' | 'affect' | 'promptings' | 'review'
>;
export type InheritedNewborn = {
  kind: 'two-parent-derived';
  id: PersonId;
  identity: Omit<PersonAuthoring['identity'], 'birthAt' | 'sex'>;
  sex: { kind: 'authored'; value: LifeCourse['sex']; basis: EvidenceRef } | { kind: 'draw' };
  parents: readonly [ActorRef, ActorRef];
  context: NewbornContext;
};
export type AuthoredNewborn = { kind: 'authored'; person: PersonAuthoring };
export type Newborn = InheritedNewborn | AuthoredNewborn;
// One birth route, with independent child materialization and maternal delivery.
// Reference supports deliver(mother,{id}) without inventing a child/father actor.
export type BirthChild =
  | { kind: 'create'; newborn: Newborn }
  | { kind: 'reference'; child: EntityRef; name?: string };
export type Delivery =
  | { kind: 'open-pregnancy'; mother: ActorRef; pregnancyId: Id }
  | { kind: 'not-recorded' };
export type Guardian =
  | { kind: 'known'; stance: 'consented' | 'refused' | 'refused-unjustly' | 'none'; basis: EvidenceRef }
  | { kind: 'unknown' };
export type KinRole = 'parent' | 'child' | 'sibling' | 'grandparent' | 'grandchild' | 'spouse';
// Internal snapshot derived from authoritative premises, never submitted target-state patches.
export type KinPremise = { id: Id; from: EntityRef; to: EntityRef; role: KinRole; basis: EvidenceRef };
export type KinScope = {
  id: Id;
  people: readonly [EntityRef, EntityRef];
  at: Time;
  kinRevision: number;
  premiseIds: readonly Id[];
  degrees: 'source-two-step';
  completeness: 'complete-for-source-degrees' | 'partial';
  basis: EvidenceRef;
};
export type KinSnapshot = {
  at: Time;
  kinRevision: number;
  hash: Hash;
  roles: readonly KinPremise[];
  marriages: readonly { person: EntityRef; marriage: Marriage }[];
  scope: KinScope;
  unresolved: readonly EntityRef[];
};
export type Lifecycle =
  | {
      type: 'conception';
      mother: ActorRef;
      father: KnownFather;
      offspring: EntityRef;
      pregnancyId: Id;
      basis: ActualBasis;
    }
  | { type: 'birth'; child: BirthChild; delivery: Delivery; basis: ActualBasis }
  | {
      type: 'courtship-meeting';
      partners: readonly [ActorRef, ActorRef];
      quality: Unit;
      actionReceipt: Id;
      basis: ActualBasis;
    }
  | { type: 'betrothal'; partners: readonly [ActorRef, ActorRef]; acceptedProposal: Id; basis: ActualBasis }
  | {
      type: 'marriage';
      partners: readonly [ActorRef, ActorRef];
      customId: Id;
      guardian: Guardian;
      kinScopeId: Id;
      acceptedProposal: Id;
      basis: ActualBasis;
    }
  | { type: 'kin-premise'; premises: readonly KinPremise[]; scope: KinScope; basis: ActualBasis }
  | { type: 'death'; person: ActorRef; basis: ActualBasis };
export type FamilyContactReceipt = {
  person: PersonId;
  caregiver: PersonId;
  evidenceId: Id;
  from: Time;
  to: Time;
  activities: readonly Id[];
  observationIds: readonly Id[];
};
export type FamilyApproval = {
  kind: 'family-approval';
  voiceId: Id;
  approval: Signed;
  acceptOfferId: Id;
  declineOfferId: Id;
  evidenceId: Id;
  adviceId: Id;
};
export type ReceivedSuggestion = { kind: 'ordinary'; suggestion: SuggestionData } | FamilyApproval;
export type LifecycleTruthQuery =
  | { kind: 'aptitude'; person: PersonId; skill: Id }
  | { kind: 'attachment'; person: PersonId }
  | {
      kind: 'female-fecundity' | 'male-fertility' | 'value-plasticity' | 'attachment-plasticity';
      ageYears: number;
    }
  | { kind: 'conception-chance'; mother: PersonId; father: PersonId; durationMs: DurationMs }
  | { kind: 'pregnancy'; person: PersonId; at: Time }
  | { kind: 'pregnancy-modifiers'; person: PersonId; at: Time }
  | { kind: 'spouses' | 'mourning' | 'widowhood-mortality'; person: PersonId; at: Time }
  | { kind: 'values-similarity' | 'age-fit' | 'attraction' | 'compatibility'; a: PersonId; b: PersonId }
  | { kind: 'courtship-stage'; person: PersonId; other: PersonId; at: Time }
  | { kind: 'kinship'; a: PersonId; b: PersonId; kinScopeId: Id }
  | {
      kind: 'can-marry';
      a: PersonId;
      b: PersonId;
      customId: Id;
      at: Time;
      guardian: Guardian;
      kinScopeId: Id;
    }
  | { kind: 'age' | 'life-stage' | 'life-modifiers' | 'development'; person: PersonId; at: Time }
  | { kind: 'stage-for-age' | 'modifiers-for-age' | 'development-for-age'; ageYears: number }
  | { kind: 'learning-multiplier'; ageYears: number; domain: LearningDomain }
  | { kind: 'chronic-hazard'; ageYears: number; conditionId: Id; exposures: Exposures }
  | { kind: 'chronic-risk'; ageYears: number; exposures: Exposures }
  | { kind: 'mortality-hazard'; person: PersonId }
  | { kind: 'partnering-terms'; person: PersonId; offer: Offer; at: Time };
export type Exposures = { smoking?: Unit; sleepDebtHours?: number; fitness?: Unit };
export type LifecyclePersonQuery =
  | { kind: 'held-family'; person: PersonId }
  | { kind: 'held-partnering'; person: PersonId; other: EntityRef }
  | { kind: 'held-kin'; person: PersonId; other: EntityRef };
export type Unknown = { kind: 'unknown'; missing: readonly Reference[] };
export type Eligibility =
  | {
      kind: 'known';
      ok: boolean;
      uncertainty: readonly ('kin-incomplete' | 'guardian-unknown')[];
      reason?:
        | 'self'
        | 'dead'
        | 'pairing'
        | 'age'
        | 'married'
        | 'already-married'
        | 'mourning'
        | 'guardian'
        | `kin:${Kin}`;
    }
  | Unknown;
export type Development = {
  ageYears: number;
  stage: LifeStage;
  sensationSeeking: number;
  processingSpeed: number;
  crystallized: number;
  adolescence: number;
  elderDecline: number;
};
export type LifecycleTruthResults = {
  aptitude: number;
  attachment: Unit;
  'female-fecundity': Unit;
  'male-fertility': Unit;
  'value-plasticity': Unit;
  'attachment-plasticity': Unit;
  'conception-chance': Unit;
  pregnancy: { weeks: number; due: boolean; pregnancy: Pregnancy | null };
  'pregnancy-modifiers': LifeModifiers;
  spouses: readonly PersonId[];
  mourning: boolean;
  'widowhood-mortality': number;
  'values-similarity': Unit;
  'age-fit': Unit;
  attraction: Unit;
  compatibility: Unit;
  'courtship-stage': CourtshipStage;
  kinship: { kind: 'known'; value: Kin | null } | Unknown;
  'can-marry': Eligibility;
  age: number;
  'life-stage': LifeStage;
  'life-modifiers': LifeModifiers;
  development: Development;
  'stage-for-age': LifeStage;
  'modifiers-for-age': LifeModifiers;
  'development-for-age': Development;
  'learning-multiplier': number;
  'chronic-hazard': number;
  'chronic-risk': Unit;
  'mortality-hazard': { hazardPerYear: number; ageShare: Unit };
  'partnering-terms': readonly TermData[];
};
export type LifecycleInspection =
  | {
      [K in keyof LifecycleTruthResults]: {
        perspective: { kind: 'host' };
        query: Extract<LifecycleTruthQuery, { kind: K }> | (LifecycleTruthQuery & { kind: K });
        basis: 'actual-state-and-engineering-model';
        value: LifecycleTruthResults[K] | Unknown;
      };
    }[keyof LifecycleTruthResults]
  | {
      perspective: { kind: 'person'; observer: PersonId };
      query: LifecyclePersonQuery;
      basis: 'held-evidence';
      relationships: readonly Relationship[];
      courtships: readonly Courtship[];
      marriages: readonly Marriage[];
      evidenceIds: readonly Id[];
      unknowns: readonly Reference[];
    };
// Internal only: source owners consume frozen snapshots through existing exact ports.
export type StreamIdentity =
  | { kind: 'actor'; person: PersonId }
  | { kind: 'gestation'; mother: PersonId; pregnancyId: Id }
  | { kind: 'inheritance'; child: PersonId };
export type RandomContinuation = {
  id: Id;
  identity: StreamIdentity;
  origin: { runSeed: number; identity: StreamIdentity };
  seed: number;
  state: RngState;
  uniformDraws: number;
  initializationDraws: 12;
  status: 'active' | 'completed';
};
export type ConstructionContinuation = Omit<RandomContinuation, 'identity' | 'origin'> & {
  identity: Exclude<StreamIdentity, { kind: 'actor' }>;
  origin: { runSeed: number; identity: Exclude<StreamIdentity, { kind: 'actor' }> };
};
export type InitialLifecycle = { kinPremises: readonly KinPremise[]; kinScopes: readonly KinScope[] };
export type LifecycleArchive = {
  kinRevision: number;
  entities: readonly EntityRef[];
  origins: readonly { person: PersonId; origin: GeneticOrigin }[];
  kinPremises: readonly KinPremise[];
  kinScopes: readonly KinScope[];
  streams: readonly ConstructionContinuation[];
  appliedEffects: readonly Id[];
};

export type ActorRandomIdentity = {
  id: Id;
  seed: number;
  uniformDraws: number;
  initializationDraws: 12;
  origin: { runSeed: number; person: PersonId };
};
export type SourceFor<K extends keyof Payloads> = K extends
  | 'world.changed'
  | 'offers.received'
  | 'context.received'
  | 'body.received'
  | 'voice.evidence-received'
  | 'quantity.observed'
  | 'action.resolved'
  | 'communication.resolved'
  | 'testimony.withdrawn'
  | 'lifecycle.received'
  | 'person.arrived'
  | 'family.contact'
  | 'routine.authored'
  | 'routine.withdrawn'
  | 'chapter.elapsed'
  ? { type: 'host'; id: Id }
  : Source;
export type LifecycleQuery =
  | { kind: 'host'; query: LifecycleTruthQuery }
  | { kind: 'person'; query: LifecyclePersonQuery };
export type InputDisposition = {
  inputId: InputId;
  at: Time;
  owner: FacultyId;
  kind: 'consumed' | 'inapplicable';
  reason:
    | 'applied'
    | 'actor-dead'
    | 'activity-ended'
    | 'offer-withdrawn'
    | 'context-ended'
    | 'goal-closed'
    | 'pregnancy-ended'
    | 'bond-ended'
    | 'world-revision-changed';
  evidenceIds: readonly Id[];
  causeIds: readonly Id[];
};
export type SelfEventData =
  | Extract<
      EventData,
      {
        kind:
          | 'suggestion-resolved'
          | 'decision'
          | 'commitment-changed'
          | 'goal-changed'
          | 'prompting'
          | 'review'
          | 'voice-evidence'
          | 'voice-promise'
          | 'quantity-estimated'
          | 'observation-attended';
      }
    >
  | { kind: 'body-felt'; body: SelfBody }
  | { kind: 'claim-heard'; speaker: Id; listener: Id; claim: PerceptClaim };
export type ParameterProvenance = {
  path: ParameterPath;
  source: SourceCitation;
  status: 'source-engineering' | 'provisional-unfitted' | 'authored-tuning';
};
export type ParameterPath =
  | { kind: 'builtin'; record: keyof EffectiveBuiltins }
  | { kind: 'fixed-prior'; field: keyof FacultyParameters['fixedPriors'] }
  | { kind: 'tuning'; field: keyof RunTuning; coefficient: Id };

// One W2-owned portable motivation path; no active-status refusal or duplicate goals.
export type ProjectContributionReceipt = {
  id: Id;
  goalId: Id;
  prospectId: Id;
  actionReceipt: Id;
  at: Time;
  amount: number;
  basis: 'completed-action';
};
export type PortableMotivation = {
  exemptions: ExemptionPremises;
  goals: readonly Goal[];
  projects: ProjectsState;
  pursuit: PursuitState;
  agendaAllocation: { nextId: number; lastProposalDay: number; allocated: readonly Reference[] };
};
export type PortableDependencies = {
  lastAction?: Id;
  chronicle: readonly DayRecord[];
  chronicleDay: ChronicleDay;
  conscience: Pick<ConscienceState, 'breaches' | 'nextBreach' | 'intentions'>;
  will: Omit<WillState, 'voices'>;
  promptings: PromptingsState;
  review: ReviewState;
};
export type PortableLifecycle = Pick<
  LifecycleArchive,
  'origins' | 'kinPremises' | 'kinScopes' | 'streams' | 'entities'
> & {
  sourceKinRevision: number;
};

// Fixed source-shaped coefficient records; original numerical units stay internal.
// packages/human/src/affect/affect.ts:35
export type Effective_AFFECT_DEFAULTS = {
  maxEmotions: number;
  dropBelow: number;
  halfLife: Record<EmotionId, number>;
  valence: Record<EmotionId, Signed>;
  arousal: Record<EmotionId, Unit>;
  negative: readonly string[];
  regulationExempt: readonly string[];
  regulationShortening: number;
  gainBase: number;
  gainSlope: number;
  fearGainBase: number;
  fearGainSlope: number;
  mergeBlend: number;
  griefFloor: number;
  loveAffection: number;
  moodNeedGain: number;
  moodEmotionGain: number;
  moodValenceHalfLife: number;
  moodArousalHalfLife: number;
  baselineArousal: number;
  baselineArousalWeight: number;

  feltEmotionWeight: number;
  regulationRate: { reflection: number; worship: number; rest: number };
  regulationCeiling: number;
  soothe: { reflection: number; worship: number; rest: number };
  sootheMinutes: number;
  initialRegulation: number;
};
// packages/human/src/affect/crisis.ts:29
export type Effective_CRISIS_DEFAULTS = {
  breakMood: number;
  breakStress: number;
  baseHazard: number;
  stressHalfLife: number;
  stressMoodRate: number;
  minutes: readonly number[];
  refractory: number;
  afterBreakStress: number;
  maxBehaviours: number;
  commandStrainPerHour: number;
  injuryStrain: number;
};
// packages/human/src/agenda/agenda.ts:84
export type Effective_AGENDA_DEFAULTS = {
  leadMinutes: number;
  leadPressure: number;
  openPressure: number;
  peakFraction: number;
  commitmentScale: number;
  goalAmountGain: number;
  defaultAdvanceAmount: number;
  goalDeadlineBoost: number;
  maxClosedCommitments: number;
  maxClosedGoals: number;
  maxActiveGoals: number;
  maxCatchUp: number;
  abstainScale: number;
  maxOwed: number;
  wakeGrace: number;
  lapseWaiver: number;
  proposeUrgency: number;
  goalTemplates: {
    belonging: {
      label: 'make-friend';
      completionHalfLifeMs: 7200000;
      provenance: { kind: 'assumption'; ref: 'engineering:hf4-proposeGoals-ruling23-unfitted' };
      advancedBy: readonly { action: Id; amount: number }[];
    };
    competence: {
      label: 'master-skill';
      completionHalfLifeMs: 7200000;
      provenance: { kind: 'assumption'; ref: 'engineering:hf4-proposeGoals-ruling23-unfitted' };
      advancedBy: readonly { action: Id; amount: number }[];
    };
    meaning: {
      label: 'serve';
      completionHalfLifeMs: 7200000;
      provenance: { kind: 'assumption'; ref: 'engineering:hf4-proposeGoals-ruling23-unfitted' };
      advancedBy: readonly { action: Id; amount: number }[];
    };
    esteem: {
      label: 'earn-respect';
      completionHalfLifeMs: 7200000;
      provenance: { kind: 'assumption'; ref: 'engineering:hf4-proposeGoals-ruling23-unfitted' };
      advancedBy: readonly { action: Id; amount: number }[];
    };
  };
};
// packages/human/src/agenda/agenda.ts:915
export type Effective_EXEMPTION_DEFAULTS = { illnessSeverity: number; lookahead: number };
// packages/human/src/agenda/agenda.ts:1085
export type Effective_PURPOSE_DEFAULTS = { graceDays: number; decayPerDay: number; abandonBelow: number };
// packages/human/src/agenda/agenda.ts:1139
export type Effective_CARE_DEFAULTS = {
  urgency: number;
  horizon: number;
  importanceFloor: number;
  action: string;
  needs: readonly string[];
};
// packages/human/src/beliefs/beliefs.ts:41
export type Effective_BELIEF_DEFAULTS = {
  maxBeliefs: number;
  maxSources: number;
  maxLogOdds: number;
  defaultTrust: number;
  selfTrust: number;
  trustFloor: number;
  trustExponent: number;
  repeatDiscount: number;
  observedDiscount: number;
  confirmLogOdds: number;
  trustGain: number;
  trustLoss: number;
  contradictionLoss: number;
  maxContradictions: number;
  driftHalfLife: number;
  attentionBase: number;
  attentionRange: number;
  selfRelevance: number;
  selfValenceRelevance: number;
  affectionThreshold: number;
  socialRelevance: number;
  threatRelevance: number;
  interestRelevance: number;
  alwaysSalience: number;
  alwaysSelfValence: number;
  threatKinds: readonly string[];
};
// packages/human/src/body/bladder.ts:10
export type Effective_BLADDER_DEFAULTS = {
  intakeScale: number;
  maxPending: number;
  halfLife: number;
  basePerMinute: number;
  choiceThreshold: number;
  choiceScale: number;
};
// packages/human/src/body/body.ts:78
export type Effective_BODY_DEFAULTS = {
  satietyPerMinute: number;
  satietyEffortPerMinute: number;
  hydrationPerMinute: number;
  hydrationEffortPerMinute: number;
  sleepMetabolism: number;
  wakeTau: number;
  sleepTau: number;
  debtPerHourAbove: number;
  debtThreshold: number;
  debtRepayPerHour: number;
  repayThreshold: number;
  maxSleepDebt: number;
  exertionGain: number;
  exertionRiseHalfLife: number;
  exertionRecoverHalfLife: number;
  exertionRecoverHalfLifeAsleep: number;
  depletionPerHour: number;
  depletionFloor: number;
  depletionRestHalfLife: number;
  depletionSleepHalfLife: number;
  depletionFatigueWeight: number;
  trainingEffort: number;
  detrainHalfLife: number;
  fitnessFloor: number;
  trainingRatio: number;
  starvationPerDay: number;
  dehydrationPerDay: number;
  illnessHealthPerDay: number;
  healthRecoveryPerDay: number;
  immuneResponsePerDay: number;
  minIllnessTrend: number;
  illnessStressPerDay: number;
  painHalfLife: number;
  maxInjuries: number;
  maxIllnesses: number;
  sleepinessPressureWeight: number;
  sleepinessCircadianWeight: number;
  sleepinessDebtWeight: number;
  debtUnderperception: number;
  painAdaptation: number;
  fastingHungerDamp: number;
  fastingThirstDamp: number;
  fastingOnsetShare: number;
  fastingAdaptDays: number;
  fastingBreakthrough: readonly number[];
  underfedFrom: number;
  underfedFull: number;
  underfedDriftLoss: number;
  underfedWorsenPerDay: number;
  restEffort: number;
  restDriftBonus: number;
  heavyEffort: number;
  heavyEffortDriftLoss: number;
  debtDriftRange: readonly number[];
  debtDriftLoss: number;
  chronicHalfLife: number;
  chronicDebtGain: number;
  chronicExposureGain: number;
  chronicHealthPerDay: number;
  chronicPainWeight: number;
  maxExposures: number;
  exposureRecentGain: number;
  exposureRecentHalfLife: number;
  exposureCumulativeHalfLife: number;
  transmissionPerMinute: number;
  contractedSeverity: number;
  contractedTrendPerDay: number;
};
// packages/human/src/body/doze.ts:13
export type Effective_DOZE_DEFAULTS = {
  sleepiness: number;
  stimulation: number;
  hazard: number;
  seatedWeight: number;
  wakeSalience: number;
};
// packages/human/src/body/injury.ts:29
export type Effective_INJURY_DEFAULTS = {
  clotHalfLife: number;
  tendedClotHalfLife: number;
  tendBleedCut: number;
  tendedHeal: number;
  bleedStops: number;
  standMargin: number;
};
// packages/human/src/character/character.ts:17
export type Effective_CHARACTER_DEFAULTS = {
  maxDrift: number;
  maturationFrom: number;
  maturationTo: number;
  conscientiousnessUntil: number;
  traitPerYear: {
    honesty: number;
    emotionality: number;
    extraversion: number;
    agreeableness: number;
    conscientiousness: number;
    openness: number;
  };
  valuePerYear: {
    benevolence: number;
    universalism: number;
    tradition: number;
    conformity: number;
    security: number;
    achievement: number;
    power: number;
    hedonism: number;
    stimulation: number;
    selfDirection: number;
  };
  maxExperiencePerYear: number;
  experienceReversion: number;
  minDays: number;
  moodGain: number;
  dutyGain: number;
  minCommitments: number;
  socialGain: number;
  socialBaseline: number;
  wakingMinutes: number;
  varietyGain: number;
  varietyBaseline: number;
};
// packages/human/src/chronicle/chronicle.ts:34
export type Effective_CHRONICLE_DEFAULTS = {
  maxDays: number;
  maxNotes: number;
  maxActions: number;
  maxVerdicts: number;
  topEpisodes: number;
  habitThresholds: readonly number[];
  trustEpsilon: number;
  illnessEpsilon: number;
  maxYears: number;
  yearActions: number;
  yearEpisodes: number;
  yearIllnesses: number;
};
// packages/human/src/cognition/cognition.ts:91
export type Effective_COGNITION_DEFAULTS = {
  needScale: number;
  dischargedNormFactor: number;
  expectationScale: number;
  normRefractoryMinutes: number;
  normRefractoryFloor: number;
  habitScale: number;
  emotionScale: number;
  socialScale: number;
  socialSatiationFloor: number;
  effortScale: number;
  effortBase: number;
  riskScale: number;
  companionScale: number;
  materialScale: number;
  materialWeight: number;
  suggestionScale: number;
  appealBonus: number;
  maxConsidered: number;
  reactanceScale: number;
  reactanceFrom: number;
  reactanceInsist: number;
  commitmentInertia: number;
  commitmentInertiaFrom: number;
  commitmentInertiaFade: number;
  jointTrust: number;
  togetherScale: number;
  fullnessScale: number;
  rememberedScale: number;
  scarcityMaterialGain: number;
  scarcityScaleShrink: number;
  scarcitySafetyGain: number;
};
// packages/human/src/conscience/conscience.ts:47
export type Effective_CONSCIENCE_DEFAULTS = {
  termScale: number;
  fulfilWeight: {
    obligatory: number;
    recommended: number;
    permitted: number;
    disliked: number;
    forbidden: number;
  };
  violateWeight: {
    obligatory: number;
    recommended: number;
    permitted: number;
    disliked: number;
    forbidden: number;
  };
  breachStandings: readonly string[];
  honestyNorms: readonly string[];
  victimNorms: readonly string[];
  necessityEligible: readonly string[];
  necessityThreshold: number;
  abstainVetoConviction: number;
  vetoConviction: number;
  desperationSoftening: number;
  incompleteBreachFactor: number;
  repairScale: number;
  repentScale: number;
  maxBreaches: number;
  maxIntentions: number;
};
// packages/human/src/conversation/conversation.ts:66
export type Effective_CONVERSATION_DEFAULTS = {
  confidentMin: number;
  claimsBase: number;
  claimsRange: number;
  maxAdvice: number;
  relevance: { confidence: number; recency: number; topic: number; feeling: number; temptation: number };
  recencyScale: number;
  backbitingScale: number;
  lieScale: number;
  honestyCost: number;
  lyingScale: number;
  lieConfidence: number;
  standingWeight: {
    forbidden: number;
    disliked: number;
    permitted: number;
    recommended: number;
    obligatory: number;
  };
  adviceMin: number;
  benevolentAppeal: number;
  chatMagnitude: number;
  chatPerClaim: number;
};
// packages/human/src/curiosity/curiosity.ts:34
export type Effective_CURIOSITY_DEFAULTS = {
  unknownScale: number;
  progressScale: number;
  varyScale: number;
  recentMinutes: number;
  rewardMax: number;
  fastAlpha: number;
  slowAlpha: number;
  maxKeys: number;
  maxRecent: number;
};
// packages/human/src/environment/environment.ts:46
export type Effective_ENVIRONMENT_DEFAULTS = {
  coldMood: number;
  darkMood: number;
  shortDayMood: number;
  longDayHours: number;
  shortDayHours: number;
  weatherMood: number;
  indoorWeather: number;
  beautyMood: number;
  crowdingMood: number;
  crowdingTolerance: number;
  crowdingToleranceExtraversion: number;
  coldMetabolism: number;
  coldRecovery: number;
  coldSleep: number;
  darkWake: number;
  crowdingAutonomyPerHour: number;
  squalorSafetyPerHour: number;
  beautyLeisurePerHour: number;
  aweBeauty: number;
  aweIntensity: number;
};
// packages/human/src/family/family.ts:62
export type Effective_FAMILY_DEFAULTS = {
  peakCycleChance: number;
  cycleDays: number;
  gestationDays: number;
  gestationSdDays: number;
  pregnancyMetabolism: number;
  valueRatePerYear: number;
  normRatePerYear: number;
  breachSaturation: number;
  attachmentStart: number;
  attachmentRatePerYear: number;
  voiceRatePerYear: number;
};
// packages/human/src/habits/habits.ts:53
export type Effective_HABIT_DEFAULTS = {
  maxHabits: number;
  gain: number;
  decayHalfLife: number;
  fullSpacing: number;
  hourCore: number;
  hourFalloff: number;
  sameContext: number;
  extinction: number;
  urgeInterval: number;
  urgePeakDays: number;
  urgeGain: number;
  urgeMax: number;
  easeMax: number;
  refractory: number;
};
// packages/human/src/lifecourse/health.ts:57
export type Effective_HEALTH_DEFAULTS = {
  smokingRisk: number;
  sleepDebtRiskPerHour: number;
  maxSleepDebtHours: number;
  fitnessRisk: number;
  healthMortality: number;
  illnessMortality: number;
};
// packages/human/src/lifecourse/lifecourse.ts:15
export type Effective_LIFE_DEFAULTS = {
  gompertzBase: number;
  gompertzRefAge: number;
  gompertzDoublingYears: number;
  fitnessDeclinePerYear: number;
  fitnessPlateauEnd: number;
  recoveryDeclinePerYear: number;
};
// packages/human/src/memory/memory.ts:57
export type Effective_MEMORY_DEFAULTS = {
  maxEpisodes: number;
  maxProtectedLoss: number;
  maxExpectations: number;
  halfLifeNeutral: number;
  halfLifeEmotional: number;
  recencyScale: number;
  kindSalience: { outcome: number; social: number; witnessed: number; told: number; suggestion: number };
  defaultKindSalience: number;
  valenceSalience: number;
  recallBoost: number;
  defaultRecallLimit: number;
  confidenceK: number;
  maxStep: number;
  minLearningRate: number;
  priorSuccess: number;
  citeValence: number;
  maxCited: number;
};
// packages/human/src/memory/memory.ts:14
export type Effective_GIST_DEFAULTS = {
  maxGists: number;
  maxProtectedLoss: number;
  horizon: number;
  minValence: number;
  halfLifeNeutral: number;
  halfLifeEmotional: number;
  foldGain: number;
  maxTags: number;
  placeWeight: number;
};
// packages/human/src/memory/memory.ts:257
export type Effective_CUE_RECALL_DEFAULTS = {
  weights: { place: number; person: number; action: number; tags: number; hour: number; anniversary: number };
  deceasedBoost: number;
  threshold: number;
  minValence: number;
  minLossValence: number;
  refractory: number;
  reappraisal: number;
  limit: number;
  griefGainBase: number;
  griefGainSlope: number;
  hourTolerance: number;
  lossTags: readonly string[];
};
// packages/human/src/methods/methods.ts:19
export type Effective_METHOD_DEFAULTS = {
  maxRules: number;
  maxConditions: number;
  maxCues: number;
  maxEvidence: number;
  maxRecentDemonstrations: number;
  maxIdentifierLength: number;
  maxValueLength: number;
  contextMinutes: number;
  evidenceHalfLife: number;
  evidencePrior: number;
  utilityScale: number;
};
// packages/human/src/needs/needs.ts:33
export type Effective_NEEDS_DEFAULTS = {
  urgencySteepness: number;
  urgencyTail: number;
  thresholds: Record<NeedId, Unit>;
  traitCoefficient: number;
  thresholdRange: readonly number[];
  restSleepinessOverlap: number;
  asleepRate: number;
  belongingAloneHalfLife: number;
  belongingAloneTarget: number;
  belongingTogetherHalfLife: number;
  belongingSocialHalfLife: number;
  belongingTogetherTarget: number;
  leisureWorkHalfLife: number;
  leisureWorkTarget: number;
  leisureRecoverHalfLife: number;
  leisureRecoverTarget: number;
  leisureIdleHalfLife: number;
  leisureIdleTarget: number;
  autonomyHalfLife: number;
  autonomyTarget: number;
  competenceHalfLife: number;
  competenceTarget: number;
  esteemHalfLife: number;
  esteemTarget: number;
  meaningDecayHalfLife: number;
  meaningDecayTarget: number;
  meaningRecoverHalfLife: number;
  meaningRecoverTarget: number;
  safetyHalfLife: number;
  safetyTarget: number;
  socialTags: readonly string[];
  workTags: readonly string[];
  leisureTags: readonly string[];
  meaningTags: readonly string[];
  minHalfLife: number;
  meanFloorWeight: number;
};
// packages/human/src/partnering/partnering.ts:62
export type Effective_PARTNERING_DEFAULTS = {
  warmthGain: number;
  warmthHalfLifeDays: number;
  readyWarmth: number;
  readyMeetings: number;
  readyDays: number;
  maxCourtships: number;
  courtScale: number;
  courtFloor: number;
  proposalScale: number;
  proposalFloor: number;
  statusQuo: number;
  familyWeight: number;
  unavailable: number;
  widowhoodEarly: number;
  widowhoodEarlyDays: number;
  widowhoodMen: number;
  widowhoodWomen: number;
};
// packages/human/src/persistence/persistence.ts:28
export type Effective_PERSISTENCE_DEFAULTS = {
  continueScale: number;
  switchScale: number;
  cap: number;
  switchMargin: number;
  slackMinutes: number;
  maxMinutes: number;
  restMinutes: number;
  stallHalfLifeMinutes: number;
};
// packages/human/src/person.ts:13
export type Effective_PERSON_DEFAULTS = {
  idleLoad: BodyLoad;
  reviewInterval: number;
  sleepReviewInterval: number;
  maxTrace: number;
  feltBase: number;
  feltGain: number;
  failedPenalty: number;
  missedDistress: number;
  missedEsteemCost: number;
  participationMagnitude: number;
  qualityPenalty: number;
};
// packages/human/src/projects/projects.ts:28
export type Effective_PROJECTS_DEFAULTS = {
  maxProspects: number;
  maxHistory: number;
  forgetMinutes: number;
  calmUrgency: number;
  fearBelow: number;
  adoptEveryMinutes: number;
  cooldownMinutes: number;
  adoptAppeal: number;
  halfLifeMinutes: number;
  staleMinutes: number;
};
// packages/human/src/promptings/promptings.ts:59
export type Effective_PROMPTINGS_DEFAULTS = {
  noticeAt: number;
  turnMax: number;
  survivalDesperation: number;
  gainTurned: number;
  gainAttempt: number;
  practiceHalfLifeDays: number;
  faultGuilt: number;
  echoScale: number;
  echoHalfLifeDays: number;
  maxRecent: number;
  maxResponses: number;
  maxEcho: number;
};
// packages/human/src/prospection/forecast.ts:37
export type Effective_FORECAST_DEFAULTS = {
  comfortAt: number;
  spentAt: number;
  forecastScale: number;
  maxSpans: number;
  maxMinutes: number;
};
// packages/human/src/prospection/prospection.ts:37
export type Effective_PROSPECTION_DEFAULTS = {
  maxEntries: number;
  maxRevisions: number;
  maxBatch: number;
  maxIdentifierLength: number;
  horizon: number;
  maxMaterialCost: number;
};
// packages/human/src/review/review.ts:50
export type Effective_REVIEW_DEFAULTS = {
  at: number;
  resolveScale: number;
  gain: { accounting: number; ruminating: number; none: number };
  keptKeep: number;
  halfLifeDays: number;
  dropBelow: number;
  maxResolves: number;
  maxSeen: number;
  ruminatePer: number;
  ruminateMax: number;
};
// packages/human/src/skills/skills.ts:56
export type Effective_SKILL_DEFAULTS = {
  base: number;
  retentionFloor: number;
  forgetHalfLife: number;
  rate0: number;
  rateScaleHours: number;
  challengeOptimum: number;
  challengeWidth: number;
  challengeFloor: number;
  failureLearning: number;
  successSlope: number;
  successBias: number;
  capacityFloor: number;
  supportBonus: number;
  qualityLow: number;
  qualityHigh: number;
  instructionGain: number;
  instructionGapScale: number;
  observeRate: number;
  observeCeiling: number;
  consolidationHours: number;
};
// packages/human/src/social/groups.ts:7
export type Effective_GROUP_DEFAULTS = {
  insider: { affection: number; trust: number; familiarity: number; respect: number };
  outsider: { affection: number; trust: number; familiarity: number; respect: number };
  stanceTrust: number;
  stanceAffection: number;
  insiderCare: number;
  outsiderThreat: number;
  threatChance: number;
  maxGroups: number;
};
// packages/human/src/social/impressions.ts:50
export type Effective_IMPRESSION_DEFAULTS = {
  halfLife: {
    state: number;
    place: number;
    trait: number;
    tie: number;
    trust: number;
    skill: number;
    regard: number;
  };
  priorWeight: number;
  noise: number;
  prior: {
    fatigue: number;
    pain: number;
    fear: number;
    mood: number;
    place: number;
    trait: number;
    tie: number;
    trust: number;
    skill: number;
    regard: number;
  };
  reserve: { base: number; emotionalityCoef: number; fatigue: number; mood: number };
  wordsReserve: number;
  actTraitWeight: number;
  actTraits: {
    flee: { emotionality: number; conscientiousness: number };
    freeze: { emotionality: number };
    steady: { emotionality: number; conscientiousness: number };
    help: { agreeableness: number; honesty: number };
    care: { agreeableness: number };
    anger: { agreeableness: number };
    refuse: { agreeableness: number };
    defer: { conscientiousness: number };
    complain: { emotionality: number };
  };
  acquaintWeight: number;
  acquaintNoise: number;
  maxImpressions: number;
  maxCues: number;
};
// packages/human/src/social/social.ts:46
export type Effective_SOCIAL_DEFAULTS = {
  maxRelationships: number;
  defaultTrust: number;
  familyRoles: readonly string[];
  roleBaselines: {
    spouse: { affection: number; trust: number; familiarity: number; respect: number };
    parent: { affection: number; trust: number; familiarity: number; respect: number };
    child: { affection: number; trust: number; familiarity: number; respect: number };
    sibling: { affection: number; trust: number; familiarity: number; respect: number };
    grandparent: { affection: number; trust: number; familiarity: number; respect: number };
    grandchild: { affection: number; trust: number; familiarity: number; respect: number };
    friend: { affection: number; trust: number; familiarity: number; respect: number };
    colleague: { affection: number; trust: number; familiarity: number; respect: number };
    neighbor: { affection: number; trust: number; familiarity: number; respect: number };
    leader: { affection: number; trust: number; familiarity: number; respect: number };
  };
  negativityBias: number;
  familiarityGain: number;
  familiarityHalfLife: number;
  affectionHalfLife: number;
  forgiveRestore: number;
  ledgerLimit: number;
  terms: {
    affection: number;
    belonging: number;
    benevolence: number;
    group: number;
    groupFrom: number;
    regardRepair: number;
    regardRepairMax: number;
  };
  judge: {
    respect: number;
    trustLoss: number;
    trustGain: number;
    harmToClose: number;
    witnessFamiliarity: number;
  };
};
// packages/human/src/social/social.ts:556
export type Effective_REPUTATION_DEFAULTS = { familiarityDamping: number };
// packages/human/src/will/will.ts:67
export type Effective_WILL_DEFAULTS = {
  switchMargin: number;
  temperature: number;
  maxVoices: number;
  defaultVoiceTrust: number;
  effortCapacityRatio: number;
  skillGap: number;
  jointSkillSupport: number;
  wakeDesperation: number;
  distrustTrust: number;
  distrustPressure: number;
  distrustEpisodeTrust: number;
  distrustWindow: number;
  distrustValence: number;
  distrustSalience: number;
  omissionConviction: number;
  omissionFraction: number;
  maxVoiceHistory: number;
  maxPrecommitments: number;
  historyEpsilon: number;
  complyAutonomyCost: number;
  pressurePush: number;
  pressureInsist: number;
  pressureHalfLife: number;
  trustGain: number;
  trustLoss: number;
  trustLossComplied: number;
  trustLossPushed: number;
  trustLossWorn: number;
  wornInterval: number;
  creditHalfLife: number;
  maxCredited: number;
  inertiaFloor: number;
  promiseKeptGain: number;
  promiseBrokenLoss: number;
  survivalDesperation: number;
  survivalNeedUrgency: number;
  sleepinessFloor: number;
  wakeCommitmentPressure: number;
  maxAdvice: number;
  adviceHalfLife: number;
  adviceFloor: number;
  adviceStrength: number;
  commandAutonomyCost: number;
  commandAutonomyPerHour: number;
  commandPressurePerHour: number;
  commandTrustPerHour: number;
};
export type EffectiveBuiltins = RetellEffectiveRecord & {
  AFFECT_DEFAULTS: Effective_AFFECT_DEFAULTS;
  CRISIS_DEFAULTS: Effective_CRISIS_DEFAULTS;
  AGENDA_DEFAULTS: Effective_AGENDA_DEFAULTS;
  EXEMPTION_DEFAULTS: Effective_EXEMPTION_DEFAULTS;
  PURPOSE_DEFAULTS: Effective_PURPOSE_DEFAULTS;
  CARE_DEFAULTS: Effective_CARE_DEFAULTS;
  BELIEF_DEFAULTS: Effective_BELIEF_DEFAULTS;
  BLADDER_DEFAULTS: Effective_BLADDER_DEFAULTS;
  BODY_DEFAULTS: Effective_BODY_DEFAULTS;
  DOZE_DEFAULTS: Effective_DOZE_DEFAULTS;
  INJURY_DEFAULTS: Effective_INJURY_DEFAULTS;
  CHARACTER_DEFAULTS: Effective_CHARACTER_DEFAULTS;
  CHRONICLE_DEFAULTS: Effective_CHRONICLE_DEFAULTS;
  COGNITION_DEFAULTS: Effective_COGNITION_DEFAULTS;
  CONSCIENCE_DEFAULTS: Effective_CONSCIENCE_DEFAULTS;
  CONVERSATION_DEFAULTS: Effective_CONVERSATION_DEFAULTS;
  CURIOSITY_DEFAULTS: Effective_CURIOSITY_DEFAULTS;
  ENVIRONMENT_DEFAULTS: Effective_ENVIRONMENT_DEFAULTS;
  FAMILY_DEFAULTS: Effective_FAMILY_DEFAULTS;
  HABIT_DEFAULTS: Effective_HABIT_DEFAULTS;
  HEALTH_DEFAULTS: Effective_HEALTH_DEFAULTS;
  LIFE_DEFAULTS: Effective_LIFE_DEFAULTS;
  MEMORY_DEFAULTS: Effective_MEMORY_DEFAULTS;
  GIST_DEFAULTS: Effective_GIST_DEFAULTS;
  CUE_RECALL_DEFAULTS: Effective_CUE_RECALL_DEFAULTS;
  METHOD_DEFAULTS: Effective_METHOD_DEFAULTS;
  NEEDS_DEFAULTS: Effective_NEEDS_DEFAULTS;
  PARTNERING_DEFAULTS: Effective_PARTNERING_DEFAULTS;
  PERSISTENCE_DEFAULTS: Effective_PERSISTENCE_DEFAULTS;
  PERSON_DEFAULTS: Effective_PERSON_DEFAULTS;
  PROJECTS_DEFAULTS: Effective_PROJECTS_DEFAULTS;
  PROMPTINGS_DEFAULTS: Effective_PROMPTINGS_DEFAULTS;
  FORECAST_DEFAULTS: Effective_FORECAST_DEFAULTS;
  PROSPECTION_DEFAULTS: Effective_PROSPECTION_DEFAULTS;
  REVIEW_DEFAULTS: Effective_REVIEW_DEFAULTS;
  SKILL_DEFAULTS: Effective_SKILL_DEFAULTS;
  GROUP_DEFAULTS: Effective_GROUP_DEFAULTS;
  IMPRESSION_DEFAULTS: Effective_IMPRESSION_DEFAULTS;
  SOCIAL_DEFAULTS: Effective_SOCIAL_DEFAULTS;
  REPUTATION_DEFAULTS: Effective_REPUTATION_DEFAULTS;
  WILL_DEFAULTS: Effective_WILL_DEFAULTS;
};

// memory/memory.ts:331; retained nondistorting 4.0 retelling, director18.
export type Effective_RETELL_DEFAULTS = { share: 0.6; limit: 3; minSalience: 0.1 };
export interface RetellEffectiveRecord {
  RETELL_DEFAULTS: Effective_RETELL_DEFAULTS;
}

// Internal exact owner ports. No callable public mutators.
export type DeepReadonly<T> = T extends readonly unknown[]
  ? number extends T['length']
    ? readonly DeepReadonly<T[number]>[]
    : { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;
export type OwnerClock = { person: PersonId; owner: FacultyId; advancedThrough: Time };
export type SpanContext = {
  effective: EffectiveParameters;
  effectiveParametersHash: Hash;
  person: PersonId;
  from: Time;
  to: Time;
  phase: 1;
  fidelity: Fidelity;
  priorWorldRevision: number;
  causes: readonly Id[];
};
export type FrameContext = {
  effective: EffectiveParameters;
  effectiveParametersHash: Hash;
  person: PersonId;
  at: Time;
  priorAt: Time;
  phase: Phase;
  fidelity: Fidelity;
  worldRevision: number;
  causes: readonly Id[];
};
export type OwnerOutput<S> = {
  state: S;
  effects: FacultyEffects;
  events: readonly EventData[];
  nextBoundary: Time | null;
  advancedThrough: Time;
};
// nextBoundary cannot supply new conditions. No owner receives hostState or a callback.
// RNG is explicit data, not a global random function; only the owning scheduler commits returned streams.
export type BodySpan = SpanContext & {
  continuation: BodyContinuation;
  load: BodyLoad;
  life: { birthAt: Time }; // evaluate age modifiers throughout the span
  environment: AmbientPercept;
  pregnancy?: Pregnancy;
  perception: BodyPerceptionContext;
  dozeContinuation: DozeContinuation;
};
export type BodyEndpoint =
  | { kind: 'activity-started'; activityMode: BodyLoad['mode']; evidenceId: Id }
  | { kind: 'receipt'; id: Id; receipt: Exclude<BodyReceipt, { type: 'physical-contact' }> }
  | { kind: 'outcome'; outcome: ObservedOutcome; activityMode: BodyLoad['mode'] }
  | { kind: 'ambient-context'; context: DozeContext; basis: ContextBasis }
  | { kind: 'wake'; evidence: PerceptData }
  | { kind: 'actual-death'; evidenceId: Id };
export interface BodyOwner {
  advance(
    state: DeepReadonly<BodyState>,
    context: DeepReadonly<BodySpan>,
  ): OwnerOutput<BodyState> & {
    continuation: BodyContinuation;
    dozeContinuation: DozeContinuation;
    randomBoundary: HazardBoundary | null;
    trajectory: BodyTrajectory;
  };
  receive(
    state: DeepReadonly<BodyState>,
    input: DeepReadonly<BodyEndpoint>,
    context: DeepReadonly<
      FrameContext & { continuation: BodyContinuation; dozeContinuation: DozeContinuation }
    >,
  ): OwnerOutput<BodyState> & { continuation: BodyContinuation; dozeContinuation: DozeContinuation };
}
/** Immutable anchored source-law data. Only Character evaluates maturation. */
export type CharacterTrajectory = {
  id: Id;
  bornAt: Time;
  continuation: NarrativeContinuation['character'];
  parameters: Effective_CHARACTER_DEFAULTS;
};
export type EnvironmentTrajectory = {
  id: Id;
  character: CharacterTrajectory;
  percept: AmbientPercept;
  asleep: boolean;
};
export type AffectSpan = SpanContext & {
  environment: EnvironmentTrajectory;
  continuation: AffectContinuation;
  traits: Traits;
  body: BodyTrajectory;
  needs: NeedTrajectory;
  moodOffset: Signed;
};
export interface AffectOwner {
  advance(
    state: DeepReadonly<Omit<AffectState, 'crisis'>>,
    context: DeepReadonly<AffectSpan>,
  ): OwnerOutput<Omit<AffectState, 'crisis'>> & {
    continuation: AffectContinuation;
    trajectory: AffectTrajectory;
  };
  appraise(
    state: DeepReadonly<Omit<AffectState, 'crisis'>>,
    input: DeepReadonly<AppraisalEffect>,
    context: DeepReadonly<FrameContext & { continuation: AffectContinuation; traits: Traits }>,
  ): OwnerOutput<Omit<AffectState, 'crisis'>> & { continuation: AffectContinuation };
}
export type CrisisContext = SpanContext & {
  character: CharacterTrajectory;
  continuation: CrisisContinuation;
  body: BodyTrajectory;
  mood: AffectTrajectory;
  traits: Traits;
  asleep: boolean;
  alive: boolean;
  commandStrainRatePerMinute: number;
};
export interface CrisisOwner {
  advance(
    state: DeepReadonly<CrisisState>,
    context: DeepReadonly<CrisisContext>,
  ): OwnerOutput<CrisisState> & { continuation: CrisisContinuation; randomBoundary: HazardBoundary | null };
}
export type EnvironmentEndpoint =
  | { kind: 'received'; evidenceId: Id; evidence: AmbientEvidence }
  | { kind: 'left'; contextId: Id }
  | { kind: 'expired'; contextId: Id; basisAt: Time };
export interface EnvironmentOwner {
  receive(
    state: DeepReadonly<AmbientState>,
    input: DeepReadonly<EnvironmentEndpoint>,
    context: DeepReadonly<FrameContext & { alive: boolean }>,
  ): OwnerOutput<AmbientState> & { affectReceipts: readonly Extract<AffectEndpoint, { kind: 'felt' }>[] };
}
export type FamilyContact = FamilyContactReceipt;
export type FamilySpan = SpanContext & { life: LifeCourse }; // clock-only; actual contact enters receiveContacts
export interface FamilyOwner {
  receive(
    state: DeepReadonly<FamilyState>,
    input: DeepReadonly<LifecycleReceipt>,
    context: DeepReadonly<FamilyLifecycleContext>,
  ): OwnerOutput<FamilyState> & {
    memoryReceipts: readonly MaternalBirthMemory[];
    construction: FamilyConstructionResult;
  };
  advance(
    state: DeepReadonly<FamilyState>,
    context: DeepReadonly<FamilySpan>,
  ): OwnerOutput<FamilyState> & { upbringing: readonly UpbringingExposure[] };
}
export type LifecycleContext = FrameContext & {
  life: LifeCourse;
  body: BodyState;
  pregnancy?: Pregnancy;
  custom?: MarriageCustomData;
  rng: ActorRandomCursor;
};
export interface LifecycleOwner {
  receive(
    state: DeepReadonly<LifeCourse>,
    input: DeepReadonly<LifecycleReceipt>,
    context: DeepReadonly<LifecycleContext>,
  ): OwnerOutput<LifeCourse> & { rng: ActorRandomCursor };
}
export interface PartneringOwner {
  receive(
    state: DeepReadonly<BondsState>,
    input: DeepReadonly<LifecycleReceipt>,
    context: DeepReadonly<PartneringContext>,
  ): OwnerOutput<BondsState> & { receipts: PartneringReceipts };
}
export type AgendaSpan = SpanContext & {
  body: BodyState;
  activity: ActorActivity | null;
  norms: readonly HeldNorm[];
  catalog: readonly SourcedNorm[];
};
export interface AgendaOwner {
  advance(state: DeepReadonly<AgendaState>, context: DeepReadonly<AgendaSpan>): OwnerOutput<AgendaState>;
  receive(
    state: DeepReadonly<AgendaState>,
    input: DeepReadonly<
      | Exclude<AgendaRequest, { type: 'precommit' | 'release-precommitment' }>
      | ObservedOutcome
      | ProjectAgendaReceipt
      | AgendaEvidence
    >,
    context: DeepReadonly<
      FrameContext & {
        activity: ActorActivity | null;
        norms: readonly HeldNorm[];
        catalog: readonly SourcedNorm[];
      }
    >,
  ): OwnerOutput<AgendaState>;
}
export type BeliefOwnedState = Pick<MemoryState, 'beliefs' | 'sourceTrust' | 'contradictions'>;
export type BeliefInput =
  | { kind: 'claims'; teller: Id; claims: readonly Claim[]; attention: Unit; evidenceId: Id }
  | { kind: 'confirm'; prop: Id; value: boolean; observationId: Id; evidenceId: Id }
  | { kind: 'withdraw'; sourceId: Id; prop: Id; evidenceId: Id }
  | { kind: 'contradiction'; sourceId: Id; prop: Id; value: boolean; reporterId?: Id; evidenceId: Id }
  | { kind: 'source-trust-response'; evidenceId: Id; response: SourceTrustResponse };
export interface BeliefOwner {
  receive(
    state: DeepReadonly<BeliefOwnedState>,
    input: DeepReadonly<BeliefInput>,
    context: DeepReadonly<FrameContext>,
  ): OwnerOutput<BeliefOwnedState>;
}
export type MethodInput =
  | { kind: 'cues'; evidenceId: Id; contextId: Id; cues: readonly Cue[] }
  | { kind: 'context-left'; contextId: Id }
  | { kind: 'demonstration'; data: Payloads['method.demonstrated'] };
export interface MethodOwner {
  receive(
    state: DeepReadonly<MethodsState>,
    input: DeepReadonly<MethodInput>,
    context: DeepReadonly<FrameContext & { sourceTrust: readonly InitialSourceTrust[]; available: boolean }>,
  ): OwnerOutput<MethodsState>;
}
export type SocialInput =
  | { kind: 'event'; data: Payloads['social.received'] }
  | { kind: 'glimpse'; data: Payloads['person.glimpsed'] }
  | { kind: 'report'; data: Payloads['person.reported'] }
  | { kind: 'act'; data: Payloads['act.witnessed'] }
  | { kind: 'acquaintance'; data: Payloads['acquaintance.received'] }
  | { kind: 'groups'; data: Payloads['groups.received'] }
  | { kind: 'death-heard'; data: Payloads['death.heard'] }
  | { kind: 'spouse-role'; other: Id; receiptId: Id }
  | { kind: 'attended'; percept: PerceptData }
  | { kind: 'reputation'; prop: Id; before: Unit; credence: Unit; evidenceId: Id };
export interface SocialOwner {
  receive(
    state: DeepReadonly<SocialState>,
    input: DeepReadonly<SocialInput>,
    context: DeepReadonly<
      FrameContext & {
        traits: Traits;
        sourceTrust: readonly InitialSourceTrust[];
        norms: readonly HeldNorm[];
        catalog: readonly SourcedNorm[];
        reputationTraits?: Definitions['reputationTraits'];
        personIds: readonly PersonId[];
        values: Values;
        rng: ActorRandomCursor;
      }
    >,
  ): OwnerOutput<SocialState> & { rng: ActorRandomCursor };
}
export type ProspectionInput =
  | { kind: 'received'; data: Payloads['consequences.received'] }
  | { kind: 'completed-trigger'; outcome: ObservedOutcome; activity: ActorActivity }
  | { kind: 'authored'; data: AuthoredConsequences };
export interface ProspectionOwner {
  receive(
    state: DeepReadonly<ProspectionState>,
    input: DeepReadonly<ProspectionInput>,
    context: DeepReadonly<FrameContext>,
  ): OwnerOutput<ProspectionState>;
}
export type CognitionContext = FrameContext & {
  actor: ActorState;
  offers: readonly Offer[];
  body: BodyReadout;
  needs: readonly NeedReading[];
  life: LifeModifiers;
  suggestions: readonly SuggestionData[];
  treatment: 'ordinary' | 'reconsider';
  scarcity: Knowledge<Unit>;
  bodyProjection: BodyProjectionContext;
};
export interface CognitionOwner {
  terms(context: DeepReadonly<CognitionContext>): {
    terms: readonly TermEffect[];
    noticed: readonly NoticedPrompt[];
  };
}
export interface WillOwner {
  decide(
    state: DeepReadonly<WillState>,
    context: DeepReadonly<
      CognitionContext & {
        terms: readonly TermEffect[];
        rng: ActorRandomCursor;
      }
    >,
  ): OwnerOutput<WillState> & {
    decision: DecisionRecord;
    rng: ActorRandomCursor;
    resolutions: readonly SuggestionResolution[];
    needReceipts: readonly WillAutonomyReceipt[];
    command: CommandDecision | null;
    /** The chosen act is done under necessity: a held veto lifts only at the current desperation. */
    necessity: boolean;
  };
}
export type MemoryOwnedState = Omit<MemoryState, 'beliefs' | 'sourceTrust' | 'contradictions'>;
export type MemoryInput =
  | { kind: 'attended'; percept: PerceptData; attention: Unit }
  | {
      kind: 'outcome';
      outcome: ObservedOutcome;
      offer: Offer;
      episode: Omit<Episode, 'id'>;
      realized: Partial<Record<NeedId, Signed>>;
      felt: Signed;
    }
  | { kind: 'episode'; receiptId: Id; episode: Omit<Episode, 'id'> }
  | { kind: 'recall'; episodeIds: readonly Id[] };
export interface MemoryOwner {
  receive(
    state: DeepReadonly<MemoryOwnedState>,
    input: DeepReadonly<MemoryInput>,
    context: DeepReadonly<MemoryContext>,
  ): OwnerOutput<MemoryOwnedState>;
}
export interface ConversationOwner {
  prepare(
    input: DeepReadonly<Payloads['conversation.requested']>,
    context: DeepReadonly<
      FrameContext & {
        speaker: ActorState;
        listenerKnown: ListenerKnowledge;
        norms: readonly SourcedNorm[];
        reputationTraits?: Definitions['reputationTraits'];
        personIds: readonly PersonId[];
      }
    >,
  ): ConversationData;
}
// Remaining named owner ports carry domain receipts, never set-field operations.
export type LearningContext = FrameContext & {
  life: LifeModifiers;
  body: BodyReadout;
  traits: Traits;
  aptitude: Record<Id, number>;
  ageYears: number;
  skills: readonly SkillDefinition[];
  transfers: Definitions['skillTransfers'];
};
export interface SkillsOwner {
  learn(
    state: DeepReadonly<Record<Id, Skill>>,
    input: DeepReadonly<
      | { kind: 'practice'; activity: ActorActivity; outcome: ObservedOutcome }
      | { kind: 'witness'; data: Payloads['skill.witnessed'] }
    >,
    context: DeepReadonly<LearningContext>,
  ): OwnerOutput<Record<Id, Skill>>;
}
export interface HabitsOwner {
  learn(
    state: DeepReadonly<readonly Habit[]>,
    input: DeepReadonly<{
      activity: ActorActivity;
      outcome: ObservedOutcome;
    }>,
    context: DeepReadonly<FrameContext & { lastAction?: Id }>,
  ): OwnerOutput<readonly Habit[]>;
}
export interface NeedsOwner {
  advance(
    state: DeepReadonly<NeedReservoirs>,
    context: DeepReadonly<
      SpanContext & {
        character: CharacterTrajectory;
        environment: EnvironmentTrajectory;
        traits: Traits;
        values: Values;
        activity: ActorActivity | null;
        socialContext: SocialState;
        continuation: DeliberationContinuation['needs'];
        body: BodyTrajectory;
        forcingPerMinute: {
          environment: Partial<Record<PsychologicalNeed, number>>;
          command: Partial<Record<PsychologicalNeed, number>>;
        };
        asleep: boolean;
      }
    >,
  ): OwnerOutput<NeedReservoirs> & {
    continuation: DeliberationContinuation['needs'];
    trajectory: NeedTrajectory;
  };
}
export interface ConscienceOwner {
  receive(
    state: DeepReadonly<ConscienceState>,
    input: DeepReadonly<
      | { kind: 'act'; activity: ActorActivity; outcome: ObservedOutcome }
      | {
          kind: 'communication-deed';
          requestId: Id;
          evidenceId: Id;
          target: Id;
          norms: readonly NormTag[];
          intention: string;
        }
      // A broken commitment linked to a held norm: the same deed law, as a completed violation (3.x recordMissed).
      | { kind: 'missed-commitment'; evidenceId: Id; action: Id; normId: Id; target?: Id }
      | { kind: 'interpretation'; data: Payloads['norm.interpretation-received'] }
      | { kind: 'repair'; data: Payloads['repair.received'] }
      | { kind: 'repent'; data: Payloads['repentance.requested'] }
    >,
    context: DeepReadonly<FrameContext & { catalog: readonly SourcedNorm[] }>,
  ): OwnerOutput<ConscienceState>;
}
export interface CuriosityOwner {
  learn(
    state: DeepReadonly<CuriosityState>,
    input: DeepReadonly<{ activity: ActorActivity; outcome: ObservedOutcome; expected: ActionExpectation }>,
    context: DeepReadonly<FrameContext & { before: CuriosityLearningPremises; felt: Signed }>,
  ): OwnerOutput<CuriosityState> & { needReward: NeedRewardReceipt | null };
}
export interface ProjectsOwner {
  receive(
    state: DeepReadonly<ProjectsState>,
    input: DeepReadonly<
      | { kind: 'attended'; percept: PerceptData }
      | { kind: 'outcome'; activity: ActorActivity; outcome: ObservedOutcome }
    >,
    context: DeepReadonly<ProjectContext>,
  ): OwnerOutput<ProjectsState> & { agendaReceipts: readonly ProjectAgendaReceipt[] };
}
export interface PersistenceOwner {
  advance(
    state: DeepReadonly<PursuitState>,
    context: DeepReadonly<
      SpanContext & {
        goals: readonly Goal[];
        activity: ActorActivity | null;
      }
    >,
  ): OwnerOutput<PursuitState>;
}
export interface PromptingsOwner {
  learn(
    state: DeepReadonly<PromptingsState>,
    response: DeepReadonly<Payloads['prompting.response-learned']['response']>,
    at: Time,
  ): PromptingsState;
  receive(
    state: DeepReadonly<PromptingsState>,
    input: DeepReadonly<{
      decision: DecisionRecord;
      activity: ActorActivity | null;
      noticed: readonly NoticedPrompt[];
    }>,
    context: DeepReadonly<FrameContext>,
  ): OwnerOutput<PromptingsState> & { affectReceipts: readonly AffectEndpoint[] };
}
export interface ReviewOwner {
  changeStyle(state: DeepReadonly<ReviewState>, style: ReviewStyle, source: Id): ReviewState;
  review(
    state: DeepReadonly<ReviewState>,
    context: DeepReadonly<
      FrameContext & {
        agenda: AgendaState;
        days: readonly DayRecord[];
        open: ChronicleDay;
        traits: Traits;
      }
    >,
  ): OwnerOutput<ReviewState> & { affectReceipts: readonly AffectEndpoint[] };
}
export interface ChronicleOwner {
  receive(
    state: DeepReadonly<{ days: readonly DayRecord[]; years: readonly YearRecord[]; open: ChronicleDay }>,
    input: DeepReadonly<EventData>,
    context: DeepReadonly<
      FrameContext & { snapshot: ChronicleSnapshot; settlement: ChronicleSettlement | null }
    >,
  ): OwnerOutput<{ days: readonly DayRecord[]; years: readonly YearRecord[]; open: ChronicleDay }>;
}
export interface CharacterOwner {
  advance(
    state: DeepReadonly<{ character: CharacterState; traits: Traits; values: Values }>,
    context: DeepReadonly<
      SpanContext & {
        life: LifeCourse;
        days: readonly DayRecord[];
        continuation: NarrativeContinuation['character'];
      }
    >,
  ): OwnerOutput<{ character: CharacterState; traits: Traits; values: Values }> & {
    continuation: NarrativeContinuation['character'];
  };
}
export interface RendererOwner {
  render(
    event: DeepReadonly<RunEvent>,
    perspective: DeepReadonly<Perspective>,
    lexicon: DeepReadonly<Lexicon>,
    seed: number,
  ): readonly RenderedLine[];
}

// Source family/family.ts:293 onward. Exact coefficients remain owner equations.
// Snapshot records describe contact premises for source upbringing, not a host target-value setter.
export type UpbringingExposure = {
  id: Id;
  child: PersonId;
  from: Time;
  to: Time;
  contactEvidenceIds: readonly Id[];
  caregivers: readonly {
    id: PersonId;
    warmth: Unit;
    values: Values;
    norms: readonly HeldNorm[];
    breaches: readonly { normId: Id; at: Time }[];
    moodValence: Signed;
    voices: readonly { voiceId: Id; trust: Unit }[];
  }[];
};
export interface CharacterOwner {
  receiveUpbringing(
    state: DeepReadonly<{ character: CharacterState; traits: Traits; values: Values }>,
    input: DeepReadonly<UpbringingExposure>,
    context: DeepReadonly<
      FrameContext & {
        life: LifeCourse;
        continuation: NarrativeContinuation['character'];
        raisedMs: DurationMs;
      }
    >,
  ): OwnerOutput<{ character: CharacterState; traits: Traits; values: Values }> & {
    continuation: NarrativeContinuation['character'];
  };
}
export interface ConscienceOwner {
  receiveUpbringing(
    state: DeepReadonly<ConscienceState>,
    input: DeepReadonly<UpbringingExposure>,
    context: DeepReadonly<FrameContext & { life: LifeCourse }>,
  ): OwnerOutput<ConscienceState>;
}
export interface WillOwner {
  receiveUpbringing(
    state: DeepReadonly<WillState>,
    input: DeepReadonly<UpbringingExposure>,
    context: DeepReadonly<FrameContext & { life: LifeCourse }>,
  ): OwnerOutput<WillState>;
}
export type ChronicConditionData = {
  kind: Id;
  baseHazard: number;
  refAge: number;
  doublingYears: number;
  severity: Unit;
  sources: readonly SourceCitation[];
};
export interface LifecycleOwner {
  advance(
    state: DeepReadonly<LifeCourse>,
    context: DeepReadonly<
      SpanContext & {
        continuation: LifeContinuation;
        body: BodyTrajectory;
        alive: boolean;
        heldConditionKinds: readonly Id[];
        bonds: BondsState; // factual widowhood only, source multiplier derived internally
        smoking: Knowledge<Unit>; // unknown evidence is not observed zero; body path owns debt/fitness
        conditions: readonly ChronicConditionData[]; // derived frozen builtin catalog only
      }
    >,
  ): OwnerOutput<LifeCourse> & {
    randomBoundary: HazardBoundary | null;
    continuation: LifeContinuation;
    bodyReceipts: readonly (
      | { kind: 'illness-onset'; illness: IllnessEvidence }
      | { kind: 'mortality-discovered'; at: Time }
    )[];
  };
}
export interface MemoryOwner {
  receiveRetelling(
    state: DeepReadonly<MemoryOwnedState>,
    input: DeepReadonly<{
      requestId: Id;
      speaker: Id;
      reception: CommunicationReception;
      items: readonly Extract<CommunicationItem['data'], { kind: 'gist' }>[];
    }>,
    context: DeepReadonly<MemoryContext & { sourceTrust: Unit }>,
  ): OwnerOutput<MemoryOwnedState>;
}

// Closed validation reports carry paths/codes only. They cannot repair a slice.
export type ValidationIssue = { path: string; code: ContractError['code']; message: string };
export interface BodyOwner {
  validate(
    state: DeepReadonly<BodyState>,
    continuation: DeepReadonly<BodyContinuation>,
    doze: DeepReadonly<DozeContinuation>,
  ): readonly ValidationIssue[];
}
export interface AffectOwner {
  validate(
    state: DeepReadonly<Omit<AffectState, 'crisis'>>,
    continuation: DeepReadonly<AffectContinuation>,
  ): readonly ValidationIssue[];
}
export interface CrisisOwner {
  validate(
    state: DeepReadonly<CrisisState>,
    continuation: DeepReadonly<CrisisContinuation>,
  ): readonly ValidationIssue[];
}
export interface FamilyOwner {
  validate(state: DeepReadonly<FamilyState>): readonly ValidationIssue[];
}
export interface LifecycleOwner {
  validate(
    state: DeepReadonly<LifeCourse>,
    continuation: DeepReadonly<LifeContinuation>,
  ): readonly ValidationIssue[];
}
export interface PartneringOwner {
  validate(state: DeepReadonly<BondsState>): readonly ValidationIssue[];
}
export interface MemoryOwner {
  validate(
    state: DeepReadonly<MemoryOwnedState>,
    allocations: readonly Reference[],
  ): readonly ValidationIssue[];
}
export interface BeliefOwner {
  validate(state: DeepReadonly<BeliefOwnedState>): readonly ValidationIssue[];
}
export interface ConversationOwner {
  prepareRetelling(
    input: DeepReadonly<Payloads['retelling.requested']>,
    context: DeepReadonly<FrameContext & { speaker: ActorState }>,
  ): readonly CommunicationItem[];
}
export type MaternalBirthMemory = {
  kind: 'maternal-birth';
  id: Id;
  cause: InputId;
  mother: Id;
  child: EntityRef;
  at: Time;
  valence: 0.9;
  salience: 0.95;
};
export interface MemoryOwner {
  receiveMaternalBirth(
    state: DeepReadonly<MemoryOwnedState>,
    input: DeepReadonly<MaternalBirthMemory>,
    context: DeepReadonly<MemoryContext>,
  ): OwnerOutput<MemoryOwnedState>;
}
export interface ConstructionOwners {
  deriveTraits(
    parents: DeepReadonly<readonly [Traits, Traits]>,
    rng: InheritanceCursor,
  ): { traits: Traits; rng: InheritanceCursor };
  deriveAptitudes(
    parents: DeepReadonly<readonly [FamilyState, FamilyState]>,
    skills: readonly SkillDefinition[],
    rng: InheritanceCursor,
  ): { aptitudes: Record<Id, number>; rng: InheritanceCursor };
}

export interface MethodOwner {
  validate(state: DeepReadonly<MethodsState>): readonly ValidationIssue[];
}

export interface SocialOwner {
  validate(state: DeepReadonly<SocialState>): readonly ValidationIssue[];
}

export interface ProspectionOwner {
  validate(state: DeepReadonly<ProspectionState>): readonly ValidationIssue[];
}

export interface WillOwner {
  validate(state: DeepReadonly<WillState>): readonly ValidationIssue[];
}

export interface SkillsOwner {
  validate(state: DeepReadonly<Record<Id, Skill>>): readonly ValidationIssue[];
}

export interface HabitsOwner {
  validate(state: DeepReadonly<readonly Habit[]>): readonly ValidationIssue[];
}

export interface NeedsOwner {
  validate(state: DeepReadonly<NeedReservoirs>): readonly ValidationIssue[];
}

export interface ConscienceOwner {
  validate(state: DeepReadonly<ConscienceState>): readonly ValidationIssue[];
}

export interface CuriosityOwner {
  validate(state: DeepReadonly<CuriosityState>): readonly ValidationIssue[];
}

export interface ProjectsOwner {
  validate(state: DeepReadonly<ProjectsState>): readonly ValidationIssue[];
}

export interface PersistenceOwner {
  validate(state: DeepReadonly<PursuitState>): readonly ValidationIssue[];
}

export interface PromptingsOwner {
  validate(state: DeepReadonly<PromptingsState>): readonly ValidationIssue[];
}

export interface ReviewOwner {
  validate(state: DeepReadonly<ReviewState>): readonly ValidationIssue[];
}

export interface CharacterOwner {
  validate(
    state: DeepReadonly<{ character: CharacterState; traits: Traits; values: Values }>,
  ): readonly ValidationIssue[];
}

export interface ChronicleOwner {
  validate(
    state: DeepReadonly<{ days: readonly DayRecord[]; years: readonly YearRecord[]; open: ChronicleDay }>,
  ): readonly ValidationIssue[];
}

export interface EnvironmentOwner {
  validate(state: DeepReadonly<AmbientState>): readonly ValidationIssue[];
}

export interface OwnerConstructors {
  body(
    input: DeepReadonly<InitialBody>,
    context: DeepReadonly<FrameContext>,
  ): { state: BodyState; continuation: BodyContinuation; dozeContinuation: DozeContinuation };
  affect(
    input: DeepReadonly<InitialAffect>,
    context: DeepReadonly<FrameContext>,
  ): { state: Omit<AffectState, 'crisis'>; continuation: AffectContinuation };
  crisis(context: DeepReadonly<FrameContext>): { state: CrisisState; continuation: CrisisContinuation };
  family(input: DeepReadonly<InitialFamily>, context: DeepReadonly<FrameContext>): FamilyState;
  partnering(input: DeepReadonly<InitialBonds>, context: DeepReadonly<FrameContext>): BondsState;
  agenda(input: DeepReadonly<InitialAgenda>, context: DeepReadonly<FrameContext>): AgendaState;
  beliefs(
    input: DeepReadonly<{ beliefs: readonly InitialBelief[]; sourceTrust: readonly InitialSourceTrust[] }>,
    context: DeepReadonly<FrameContext>,
  ): BeliefOwnedState;
  memory(
    input: DeepReadonly<{ episodes: readonly AuthoredEpisode[]; expectations: readonly ActionExpectation[] }>,
    context: DeepReadonly<MemoryContext>,
  ): MemoryOwnedState;
  conscience(input: DeepReadonly<readonly HeldNorm[]>, context: DeepReadonly<FrameContext>): ConscienceState;
  social(
    input: DeepReadonly<{
      relationships: readonly InitialRelationship[];
      groups: readonly Id[];
      reserve: Reserve;
    }>,
    context: DeepReadonly<FrameContext>,
  ): SocialState;
  skills(
    input: DeepReadonly<readonly InitialSkill[]>,
    context: DeepReadonly<FrameContext>,
  ): { skills: Record<Id, Skill>; skillRetention: ActorState['skillRetention'] };
  will(
    input: DeepReadonly<{ voices: readonly InitialVoice[]; precommitments: readonly PrecommitmentData[] }>,
    context: DeepReadonly<FrameContext>,
  ): WillState;
  promptings(input: DeepReadonly<InitialPromptings>, context: DeepReadonly<FrameContext>): PromptingsState;
  review(input: DeepReadonly<InitialReview>, context: DeepReadonly<FrameContext>): ReviewState;
}
export interface BeliefOwner {
  advance(
    state: DeepReadonly<BeliefOwnedState>,
    context: DeepReadonly<SpanContext & { continuation: DeliberationContinuation['beliefs'] }>,
  ): OwnerOutput<BeliefOwnedState> & { continuation: DeliberationContinuation['beliefs'] };
}
export interface MemoryOwner {
  advance(
    state: DeepReadonly<MemoryOwnedState>,
    context: DeepReadonly<
      SpanContext & { continuation: NarrativeContinuation['memory']; allocations: readonly Reference[] }
    >,
  ): OwnerOutput<MemoryOwnedState> & { continuation: NarrativeContinuation['memory'] };
}
export interface SocialOwner {
  advance(
    state: DeepReadonly<SocialState>,
    context: DeepReadonly<SpanContext & { continuation: DeliberationContinuation['social'] }>,
  ): OwnerOutput<SocialState> & { continuation: DeliberationContinuation['social'] };
}
export interface HabitsOwner {
  advance(
    state: DeepReadonly<readonly Habit[]>,
    context: DeepReadonly<SpanContext & { continuation: DeliberationContinuation['habits'] }>,
  ): OwnerOutput<readonly Habit[]> & { continuation: DeliberationContinuation['habits'] };
}
export interface SkillsOwner {
  advance(
    state: DeepReadonly<Record<Id, Skill>>,
    context: DeepReadonly<
      SpanContext & {
        continuation: DeliberationContinuation['skills'];
        sleeping: boolean;
        consolidationHours: number;
      }
    >,
  ): OwnerOutput<Record<Id, Skill>> & {
    continuation: DeliberationContinuation['skills'];
    consolidationHours: number;
  };
}
export interface PromptingsOwner {
  advance(
    state: DeepReadonly<PromptingsState>,
    context: DeepReadonly<SpanContext & { continuation: NarrativeContinuation['promptings'] }>,
  ): OwnerOutput<PromptingsState> & { continuation: NarrativeContinuation['promptings'] };
}

export interface OwnerConstructors {
  needs(input: DeepReadonly<InitialNeeds>, context: DeepReadonly<FrameContext>): NeedReservoirs;
  habits(input: DeepReadonly<readonly Habit[]>, context: DeepReadonly<FrameContext>): Habit[];
  methods(context: DeepReadonly<FrameContext>): MethodsState;
  prospection(context: DeepReadonly<FrameContext>): ProspectionState;
  planning(context: DeepReadonly<FrameContext>): PlanningState;
  projects(context: DeepReadonly<FrameContext>): ProjectsState;
  pursuit(context: DeepReadonly<FrameContext>): PursuitState;
  curiosity(context: DeepReadonly<FrameContext>): CuriosityState;
  character(
    input: DeepReadonly<{ traits: Traits; values: Values }>,
    context: DeepReadonly<FrameContext>,
  ): { character: CharacterState; traits: Traits; values: Values };
  chronicle(context: DeepReadonly<FrameContext & { snapshot: ChronicleSnapshot }>): {
    days: DayRecord[];
    years: YearRecord[];
    open: ChronicleDay;
  };
  environment(context: DeepReadonly<FrameContext>): AmbientState;
  life(
    input: DeepReadonly<PersonAuthoring['identity']>,
    context: DeepReadonly<FrameContext>,
  ): { state: LifeCourse; continuation: LifeContinuation };
}
export interface AgendaOwner {
  validate(state: DeepReadonly<AgendaState>): readonly ValidationIssue[];
}

// Portable admission validates each W2-owned path once; C0 owns reference/transaction assembly.
export interface AgendaOwner {
  validatePortable(
    state: DeepReadonly<Pick<PortableMotivation, 'goals' | 'agendaAllocation'>>,
    obligations: DeepReadonly<readonly PortableObligation[]>,
  ): readonly ValidationIssue[];
}
export interface ProjectsOwner {
  validatePortable(
    state: DeepReadonly<ProjectsState>,
    goals: DeepReadonly<readonly Goal[]>,
    allocated: DeepReadonly<readonly Reference[]>,
  ): readonly ValidationIssue[];
}
export interface PersistenceOwner {
  validatePortable(
    state: DeepReadonly<PursuitState>,
    goals: DeepReadonly<readonly Goal[]>,
    allocated: DeepReadonly<readonly Reference[]>,
  ): readonly ValidationIssue[];
}

export type FamilyLifecycleContext = Omit<LifecycleContext, 'rng'> & {
  construction: { kind: 'none' } | { kind: 'gestation'; cursor: GestationCursor };
};
export type FamilyConstructionResult = { kind: 'none' } | { kind: 'gestation'; cursor: GestationCursor };

/** Agreed internal continuation data. Runtime integration and numerical controls remain required.
 * Timestamps are signed safe integer ms. Floating sub-ms offsets are numerical
 * brackets relative to an integer origin, never public event clocks.
 * W1/C0 must validate dimensions, IDs, finiteness, bounds and reference closure.
 */
export type TimeMs = Time;

export type ErrorBound = number;
export type ActorRngWords = Readonly<{ a: number; b: number; c: number; d: number }>;
export type NumericalClock = Readonly<{
  advancedThroughMs: TimeMs;
  conditionAnchorMs: TimeMs;
  conditionId: Id;
  effectiveParametersHash: string;
}>;
export type BodyVector = Readonly<{
  satiety: number;
  hydration: number;
  sleepPressure: number;
  sleepDebtHours: number;
  fitness: number;
  exertion: number;
  depletion: number;
  health: number;
  pain: number;
  bladderFill: number;
  bladderPending: number;
  injuries: readonly Readonly<{ id: Id; severity: number; bleedingPerDay: number | null }>[];
  illnesses: readonly Readonly<{
    id: Id;
    severity: number;
    trendPerDay: number;
    baseline: number | null;
    chronic: boolean;
  }>[];
  exposures: readonly Readonly<{ kind: Id; recent: number; cumulativeDose: number }>[];
}>;
export type BodyComponent =
  | 'satiety'
  | 'hydration'
  | 'sleep-pressure'
  | 'sleep-debt-hours'
  | 'fitness'
  | 'exertion'
  | 'depletion'
  | 'health'
  | 'pain'
  | 'bladder-fill'
  | 'bladder-pending'
  | 'injury-severity'
  | 'injury-bleeding-per-day'
  | 'illness-severity'
  | 'illness-trend-per-day'
  | 'exposure-recent'
  | 'exposure-cumulative-dose';
export type BodyFieldKey = Readonly<{ component: BodyComponent; recordId: Id | null }>;
export type ScalarCell = Readonly<{
  // Fixed method/basis version belongs to exact archive metadata, not a faculty switch.
  originMs: TimeMs;
  leftOffsetMinutes: number;
  rightOffsetMinutes: number;
  coefficients: readonly [number, number, number, number, number];
  // Estimated absolute normalized local error; not a certified enclosure.
  estimatedError: ErrorBound;
}>;
export type Bracket = Readonly<{ originMs: TimeMs; loOffsetMinutes: number; hiOffsetMinutes: number }>;
export type BodyContinuation = Readonly<{
  clock: NumericalClock;
  anchor: BodyVector;
  acceptedThroughMs: TimeMs;
  // Exposed body at a caller endpoint is derived from this anchor/cell, not rebased.
  materializedAtMs: TimeMs;
  nextTrialWidthMinutes: number;
  cells: readonly Readonly<{ field: BodyFieldKey; cell: ScalarCell }>[];
  errors: readonly Readonly<{ field: BodyFieldKey; absoluteNormalizedErrorEstimate: ErrorBound }>[];
  circadian: Readonly<{ epochMs: TimeMs; peakOffsetMs: number }>;
  sleep: Readonly<{
    asleep: boolean;
    sinceMs: TimeMs;
    dozeSinceMs: TimeMs | null;
    lastSleep: Readonly<{ fromMs: TimeMs; toMs: TimeMs }> | null;
  }>;
  clipping: readonly Readonly<{ field: BodyFieldKey; bound: 'lower' | 'upper'; sinceMs: TimeMs }>[];
  pendingRoots: readonly Readonly<{
    kind: 'death' | 'down' | 'up' | 'injury-removal' | 'illness-removal' | 'bleed-stop' | 'exposure-removal';
    recordId: Id | null;
    bracket: Bracket;
  }>[];
}>;
export type HazardKey = Readonly<{
  kind: 'doze' | 'crisis' | 'chronic' | 'mortality';
  channelId: Id;
}>;
export type HazardContinuation = Readonly<{
  key: HazardKey;
  episodeOrdinal: number;
  clock: NumericalClock;
  eligibility: 'closed' | 'positive';
  threshold: Readonly<{ exponentialBudget: number; drawOrdinal: number; allocatedAtMs: TimeMs }> | null;
  // Integral is anchored, never sum of arbitrary caller-sized pieces.
  anchorIntegral: number;
  acceptedIntegral: number;
  absoluteIntegralError: ErrorBound;
  acceptedThroughMs: TimeMs;
  materializedAtMs: TimeMs;
  activeIntegralCell: ScalarCell | null;
  nextTrialWidthMinutes: number;
  crossing: Bracket | null;
  pendingEvent: Readonly<{ eventId: Id; atMs: TimeMs; localOrdinal: number }> | null;
}>;
export type DozeContinuation = Readonly<{
  hazard: HazardContinuation;
  context: Readonly<{
    posture: 'upright' | 'seated' | 'reclined';
    stimulation: number;
    basis: 'authored' | 'received';
    atMs: TimeMs;
    conditionId: Id;
  }>;
}>;
export type AffectContinuation = Readonly<{
  clock: NumericalClock;
  materializedAtMs: TimeMs;
  acceptedThroughMs: TimeMs;
  anchorMood: Readonly<{ valence: number; arousal: number }>;
  // Keys must identify retained source emotion instances, not merely emotion kinds.
  emotions: readonly Readonly<{
    id: Id;
    intensityAtAnchor: number;
    effectiveHalfLifeMinutes: number;
    dropBracket: Bracket | null;
  }>[];
  regulationAtAnchor: number;
  needTrajectoryId: Id;
  moodOffsetConditionId: Id;
  valenceCell: ScalarCell | null;
  arousalCell: ScalarCell | null;
  valenceError: ErrorBound;
  arousalError: ErrorBound;
  nextTrialWidthMinutes: number;
}>;
export type CrisisContinuation = Readonly<{
  clock: NumericalClock;
  stressAtAnchor: number;
  acceptedThroughMs: TimeMs;
  materializedAtMs: TimeMs;
  nextTrialWidthMinutes: number;
  stressCell: ScalarCell | null;
  stressError: ErrorBound;
  hazard: HazardContinuation;
  recovery: Readonly<{
    behaviourId: Id;
    sinceMs: TimeMs;
    remainingWorkMinutesAtAnchor: number;
    anchorMs: TimeMs;
    sleepRate: 1 | 2;
    lastComfortReceiptId: Id | null;
  }> | null;
  lastBreakAtMs: TimeMs | null;
  refractoryUntilMs: TimeMs | null;
  breaks: number;
}>;
export type LifeContinuation = Readonly<{
  clock: NumericalClock;
  birthAtMs: TimeMs;
  catalogOrder: readonly Id[];
  hazards: readonly HazardContinuation[];
  bodyTrajectoryId: Id;
  physicalReceiptIds: readonly Id[];
  pending: readonly Readonly<{
    kind: 'chronic-onset' | 'death';
    channelId: Id;
    eventId: Id;
    atMs: TimeMs;
    physicalReceiptId: Id;
  }>[];
}>;
export type ActorRandomCursor = Readonly<{
  // One cursor handed sequentially to owners. Never one RNG per hazard.
  words: ActorRngWords;
  identity: ActorRandomIdentity;
}>;
export type BirthAuthoringRecord = Readonly<{
  lifecycleReceiptId: Id;
  childId: Id;
  derivedSeed: number;
  derivationId: Id;
  algorithmId: Id;
  parentIds: readonly Id[];
  availableGeneticParentIds: readonly Id[];
  conceivedAtMs: TimeMs | null;
  dueAtMs: TimeMs | null;
  authoringProvenance: readonly Id[];
}>;

// Closed immutable trajectory exchange; no callbacks or arbitrary state paths.
// Cells use quartic dense output. Simple source exponentials may use exact descriptors.
export type ScalarTrajectory = {
  from: Time;
  to: Time;
  segments: readonly (
    | { kind: 'constant'; from: Time; to: Time; value: number }
    | { kind: 'linear'; from: Time; to: Time; initial: number; ratePerMinute: number }
    | { kind: 'exponential'; from: Time; to: Time; initial: number; target: number; ratePerMinute: number }
    | { kind: 'quartic'; from: Time; to: Time; cell: ScalarCell }
  )[];
};
export type BodyTrajectory = {
  id: Id;
  from: Time;
  to: Time;
  conditionId: Id;
  fields: readonly {
    field: BodyFieldKey;
    path: ScalarTrajectory;
  }[];
  readout: readonly {
    field:
      | 'hunger'
      | 'thirst'
      | 'sleepiness'
      | 'fatigue'
      | 'pain'
      | 'capacity'
      | 'alertness'
      | 'perceived-hunger'
      | 'perceived-thirst'
      | 'perceived-sleepiness'
      | 'perceived-fatigue'
      | 'perceived-pain'
      | 'moving'
      | 'manipulation'
      | 'sight';
    path: ScalarTrajectory;
  }[];
};
export type AffectTrajectory = {
  id: Id;
  from: Time;
  to: Time;
  valence: ScalarTrajectory;
  arousal: ScalarTrajectory;
  emotions: readonly {
    identity: { kind: EmotionId; target?: Id; cause: Id; since: Time };
    intensity: ScalarTrajectory;
  }[];
};
export type ContinuousAnchor = { at: Time; conditionId: Id };

export type BodyPerceptionContext = { fasting: boolean; fastingDays: number };
// ErrorBound fields on numerical records are nonnegative finite error estimates, not certificates.
// W1 numerical agreement. Internal data only; not another public API.
// Quartic coefficients are c0..c4 in theta=(t-left)/(right-left), evaluated by Horner.
// ScalarCell.originMs is the absolute epoch for its minute offsets.
export type NeedTrajectory = {
  id: Id;
  from: Time;
  to: Time;
  satisfaction: ScalarTrajectory; // W2: source urgency-weighted mean, including perceived body path
};
export type HazardBoundary = {
  key: HazardKey;
  at: Time;
  operation: 'allocate' | 'fire';
};
// advance integrates without RNG, stopping at the earliest unarmed eligibility or armed crossing.
// C0 merges candidates and commits ONE reached boundary at a time, after same-time physical inputs.
export interface BodyOwner {
  commitHazard(
    state: DeepReadonly<BodyState>,
    boundary: DeepReadonly<HazardBoundary & { key: HazardKey & { kind: 'doze' } }>,
    context: DeepReadonly<
      FrameContext & {
        continuation: BodyContinuation;
        dozeContinuation: DozeContinuation;
        rng: ActorRandomCursor;
      }
    >,
  ): OwnerOutput<BodyState> & {
    continuation: BodyContinuation;
    dozeContinuation: DozeContinuation;
    rng: ActorRandomCursor;
  };
}
export interface CrisisOwner {
  commitHazard(
    state: DeepReadonly<CrisisState>,
    boundary: DeepReadonly<HazardBoundary & { key: HazardKey & { kind: 'crisis' } }>,
    context: DeepReadonly<
      FrameContext & {
        continuation: CrisisContinuation;
        rng: ActorRandomCursor;
        alive: boolean;
        asleep: boolean;
        traits: Traits;
        mood: AffectTrajectory;
      }
    >,
  ): OwnerOutput<CrisisState> & { continuation: CrisisContinuation; rng: ActorRandomCursor };
}
export interface LifecycleOwner {
  commitHazard(
    state: DeepReadonly<LifeCourse>,
    boundary: DeepReadonly<HazardBoundary & { key: HazardKey & { kind: 'chronic' | 'mortality' } }>,
    context: DeepReadonly<
      FrameContext & {
        continuation: LifeContinuation;
        rng: ActorRandomCursor;
        alive: boolean;
        heldConditionKinds: readonly Id[];
      }
    >,
  ): OwnerOutput<LifeCourse> & {
    continuation: LifeContinuation;
    rng: ActorRandomCursor;
    bodyReceipts: readonly (
      | { kind: 'illness-onset'; illness: IllnessEvidence }
      | { kind: 'mortality-discovered'; at: Time }
    )[];
  };
}

// W2/W3 anchors preserve exact source-owned state, never a generic residual dictionary.
export type DeliberationContinuation = {
  needs: { anchor: ContinuousAnchor; state: NeedReservoirs; numericalPolicy?: 'daily-cells-v1' };
  beliefs: { anchor: ContinuousAnchor; state: BeliefOwnedState };
  social: { anchor: ContinuousAnchor; state: SocialState };
  habits: { anchor: ContinuousAnchor; state: readonly Habit[] };
  conscience: { anchor: ContinuousAnchor; state: ConscienceState };
  skills: { anchor: ContinuousAnchor; state: Readonly<Record<Id, Skill>> };
  projects: { anchor: ContinuousAnchor; state: ProjectsState };
  persistence: { anchor: ContinuousAnchor; state: PursuitState };
  prospection: { anchor: ContinuousAnchor; state: ProspectionState };
  methods: { anchor: ContinuousAnchor; state: MethodsState };
  curiosity: { anchor: ContinuousAnchor; state: CuriosityState };
  will: { anchor: ContinuousAnchor; state: WillState };
  agenda: { anchor: ContinuousAnchor; state: AgendaState };
};
export type NarrativeContinuation = {
  memory: { anchor: ContinuousAnchor; state: MemoryOwnedState };
  promptings: { anchor: ContinuousAnchor; state: PromptingsState };
  review: { anchor: ContinuousAnchor; state: ReviewState };
  character: {
    anchor: ContinuousAnchor;
    state: { character: CharacterState; traits: Traits; values: Values };
  };
  chronicle: { anchor: ContinuousAnchor; open: ChronicleDay };
};
export type ActorContinuation = {
  person: PersonId;
  body: BodyContinuation;
  doze: DozeContinuation;
  affect: AffectContinuation;
  crisis: CrisisContinuation;
  life: LifeContinuation;
  deliberation: DeliberationContinuation;
  narrative: NarrativeContinuation;
};

export type ConstructionRandomCursor<K extends 'gestation' | 'inheritance'> = Omit<
  ConstructionContinuation,
  'identity' | 'origin' | 'state'
> & {
  identity: Extract<StreamIdentity, { kind: K }>;
  origin: { runSeed: number; identity: Extract<StreamIdentity, { kind: K }> };
  words: RngState;
};
export type GestationCursor = ConstructionRandomCursor<'gestation'>;
export type InheritanceCursor = ConstructionRandomCursor<'inheritance'>;

export interface RunOperations {
  createRun(spec: RunSpec): Result<Run>;
  createPerson(run: Run, spec: DeepReadonly<PersonAuthoring>): Result<PersonId>;
  step(run: Run, batch: DeepReadonly<StepBatch>): Result<DeepReadonly<StepResult>>;
  inspect(run: Run, query: DeepReadonly<InspectQuery>): Result<DeepReadonly<Inspection>>;
  preview(run: Run, query: DeepReadonly<PreviewQuery>): Result<DeepReadonly<PreviewResult>>;
  exportRun(run: Run): DeepReadonly<RunArchive>;
  restoreRun(input: unknown): Result<Run>;
  replay(input: unknown): Result<DeepReadonly<ReplayResult>>;
}
export interface ProjectionOperations {
  projectChapterClock(
    clock: DeepReadonly<ChapterClock>,
    untilWallMs: number,
  ): Result<DeepReadonly<ChapterProjection>>;
  // Portable persona and calendar projection are rejected in 4.0 (PORTABLE_ADMISSION_REJECTED).
}

// Concrete module initializer bindings. C0 composes owner results; it never initializes foreign slices.
export interface BodyOwner {
  initialize: OwnerConstructors['body'];
}
export interface AffectOwner {
  initialize: OwnerConstructors['affect'];
}
export interface CrisisOwner {
  initialize: OwnerConstructors['crisis'];
}
export interface FamilyOwner {
  initialize: OwnerConstructors['family'];
}
export interface PartneringOwner {
  initialize: OwnerConstructors['partnering'];
}
export interface LifecycleOwner {
  initialize: OwnerConstructors['life'];
}
export interface AgendaOwner {
  initialize: OwnerConstructors['agenda'];
}
export interface BeliefOwner {
  initialize: OwnerConstructors['beliefs'];
}
export interface MemoryOwner {
  initialize: OwnerConstructors['memory'];
}
export interface ConscienceOwner {
  initialize: OwnerConstructors['conscience'];
}
export interface SocialOwner {
  initialize: OwnerConstructors['social'];
}
export interface SkillsOwner {
  initialize: OwnerConstructors['skills'];
}
export interface WillOwner {
  initialize: OwnerConstructors['will'];
}
export interface PromptingsOwner {
  initialize: OwnerConstructors['promptings'];
}
export interface ReviewOwner {
  initialize: OwnerConstructors['review'];
}
export interface NeedsOwner {
  initialize: OwnerConstructors['needs'];
}
export interface HabitsOwner {
  initialize: OwnerConstructors['habits'];
}
export interface MethodOwner {
  initialize: OwnerConstructors['methods'];
}
export interface ProspectionOwner {
  initialize: OwnerConstructors['prospection'];
}
export interface ProjectsOwner {
  initialize: OwnerConstructors['projects'];
}
export interface PersistenceOwner {
  initialize: OwnerConstructors['pursuit'];
}
export interface CuriosityOwner {
  initialize: OwnerConstructors['curiosity'];
}
export interface CharacterOwner {
  initialize: OwnerConstructors['character'];
}
export interface ChronicleOwner {
  initialize: OwnerConstructors['chronicle'];
}
export interface EnvironmentOwner {
  initialize: OwnerConstructors['environment'];
}
export interface ProspectionOwner {
  initializePlanning: OwnerConstructors['planning'];
}
export interface CharacterOwner {
  deriveTraits: ConstructionOwners['deriveTraits'];
}
export interface FamilyOwner {
  deriveAptitudes: ConstructionOwners['deriveAptitudes'];
}

// Revision 4: read-only premises and closed owner receipts for existing faculty behavior.
// C0 threads its authoritative allocation ledger into every memory mutator. Owners
// allocate their own counters; C0 records new references before the next mutation.
export type MemoryContext = FrameContext & { allocations: readonly Reference[] };
export type PartneringActor = Pick<
  ActorState,
  'id' | 'name' | 'traits' | 'values' | 'life' | 'body' | 'bonds' | 'social' | 'family'
> & {
  knownKin?: KinSnapshot;
};
export type PartneringContext = LifecycleContext & { actors: readonly PartneringActor[] };
// Received premises only. Unknown listener beliefs/life remain unknown; this is not
// permission to read hidden listener state. C0 constructs it from admitted evidence.
export type ListenerKnowledge = {
  social: SocialState;
  beliefs: Knowledge<readonly Belief[]>;
  alive: Knowledge<boolean>;
  deceased: readonly Id[];
};
export type CuriosityLearningPremises = {
  needs: readonly NeedReading[];
  traits: Traits;
  life: LifeModifiers;
  fear: Unit;
};
export type RealizedNeedReceipt = {
  kind: 'realized-outcome';
  evidenceId: Id;
  needs: Partial<Record<PsychologicalNeed, Signed>>;
};
export type NeedRewardReceipt = {
  kind: 'curiosity-reward';
  evidenceId: Id;
  leisure: Unit;
  competence: Unit;
};
export type ProjectAgendaReceipt =
  | { kind: 'project-adopt'; evidenceId: Id; goal: GoalData }
  | { kind: 'project-progress'; evidenceId: Id; prospectId: Id; progress: Unit; ownContribution: boolean }
  | { kind: 'project-abandon'; evidenceId: Id; goalId: Id };
export type ProjectContext = FrameContext & {
  goals: readonly Goal[];
  commitments: readonly Commitment[];
  body: BodyReadout;
  needs: readonly NeedReading[];
  affect: AffectState;
  curiosity: CuriosityState;
  traits: Traits;
  alive: boolean;
  asleep: boolean;
  activity: ActorActivity | null;
  life: LifeModifiers;
};
export type NoticedPrompt = {
  offerId: Id;
  action: Id;
  source: TermSource | 'host';
  opposedBy: `norm:${Id}` | `goal:${Id}`;
  tags: readonly Id[];
  turnApplied: boolean;
  responseId?: Id;
};
export type ChronicleSnapshot = Pick<
  ActorState,
  'habits' | 'will' | 'body' | 'conscience' | 'memory' | 'affect' | 'agenda' | 'retention'
>;
export type ChronicleSettlement = {
  outcome: ObservedOutcome;
  activity: ActorActivity;
  kept: readonly Id[];
  suggestion?: SuggestionResolution;
};
export interface CrisisOwner {
  receive(
    state: DeepReadonly<CrisisState>,
    input: DeepReadonly<
      { kind: 'strain'; amount: number; receiptId: Id } | { kind: 'comfort'; receiptId: Id }
    >,
    context: DeepReadonly<FrameContext & { continuation: CrisisContinuation }>,
  ): OwnerOutput<CrisisState> & { continuation: CrisisContinuation };
}
export interface MethodOwner {
  evidence(
    state: DeepReadonly<MethodsState>,
    context: DeepReadonly<
      FrameContext & {
        action: Id;
        contextId: Id;
        available: boolean;
        sourceTrust: readonly InitialSourceTrust[];
        voices: readonly VoiceRelation[];
      }
    >,
  ): {
    support: Signed;
    terms: readonly TermData[];
    matched: readonly { id: Id; action: Id; sourceId: Id; support: Signed }[];
  };
}
export interface PersistenceOwner {
  begin(
    state: DeepReadonly<PursuitState>,
    context: DeepReadonly<
      FrameContext & {
        activity: ActorActivity;
        terms: readonly TermData[];
        goals: readonly Goal[];
        traits: Traits;
      }
    >,
  ): OwnerOutput<PursuitState>;
}
export interface NeedsOwner {
  receive(
    state: DeepReadonly<NeedReservoirs>,
    input: DeepReadonly<NeedRewardReceipt | WillAutonomyReceipt | RealizedNeedReceipt>,
    context: DeepReadonly<FrameContext & { continuation: DeliberationContinuation['needs'] }>,
  ): OwnerOutput<NeedReservoirs> & { continuation: DeliberationContinuation['needs'] };
}
export interface WillOwner {
  receive(
    state: DeepReadonly<WillState>,
    input: DeepReadonly<WillInput>,
    context: DeepReadonly<FrameContext & { actor: ActorState; offers: readonly Offer[] }>,
  ): WillMutationOutput;
}
export interface PromptingsOwner {
  terms(
    state: DeepReadonly<PromptingsState>,
    context: DeepReadonly<
      FrameContext & {
        offer: Offer;
        terms: readonly TermData[];
        desperation: Unit;
      }
    >,
  ): { terms: readonly TermData[]; noticed: NoticedPrompt | null };
}
export interface ReviewOwner {
  terms(
    state: DeepReadonly<ReviewState>,
    terms: DeepReadonly<readonly TermData[]>,
    context: DeepReadonly<FrameContext & { agenda: AgendaState }>,
  ): readonly TermData[];
}

export interface ProjectsOwner {
  consider(
    state: DeepReadonly<ProjectsState>,
    context: DeepReadonly<ProjectContext>,
  ): OwnerOutput<ProjectsState> & { agendaReceipts: readonly ProjectAgendaReceipt[] };
}

// Revision 5: preserved source effects, never writable public person patches.
export type AffectEndpoint =
  | { kind: 'felt'; id: EmotionId; intensity: Unit; cause: Id; targetId?: Id }
  | { kind: 'regulated'; practice: PracticeKind; durationMs: DurationMs }
  | { kind: 'released'; filter: { id?: EmotionId; targetId?: Id; causePrefix?: Id }; fraction: Unit };
export interface AffectOwner {
  receive(
    state: DeepReadonly<Omit<AffectState, 'crisis'>>,
    input: DeepReadonly<AffectEndpoint>,
    context: DeepReadonly<FrameContext & { continuation: AffectContinuation; traits: Traits }>,
  ): OwnerOutput<Omit<AffectState, 'crisis'>> & { continuation: AffectContinuation };
}
export type PartneringReceipts = {
  social: readonly Extract<SocialInput, { kind: 'event' | 'spouse-role' }>[];
  memory: readonly Extract<MemoryInput, { kind: 'episode' }>[];
  affect: readonly Extract<AffectEndpoint, { kind: 'felt' }>[];
};
export type WillAutonomyReceipt = { kind: 'will-autonomy'; evidenceId: Id; autonomy: Signed };
export type CommandDecision = { holds: boolean; margin: number; voiceId: Id; ends: boolean; reason: Id };
export type WillInput =
  | Extract<AgendaRequest, { type: 'precommit' | 'release-precommitment' }>
  | { kind: 'suggestion'; received: ReceivedSuggestion; evidenceId: Id }
  | { kind: 'advice'; percept: PerceptData; evidenceId: Id }
  | { kind: 'advice-withdrawn'; data: Payloads['advice.withdrawn'] }
  | { kind: 'coercion'; data: Payloads['coercion.received'] }
  | { kind: 'coercion-withdrawn'; data: Payloads['coercion.withdrawn'] }
  | { kind: 'voice-evidence'; data: Payloads['voice.evidence-received'] }
  | { kind: 'promise'; data: Payloads['voice.promise-received'] }
  | { kind: 'settled'; activity: ActorActivity; outcome: ObservedOutcome; felt: Signed }
  | { kind: 'command-decision'; decision: CommandDecision; evidenceId: Id }
  | { kind: 'action-started'; activity: ActorActivity; evidenceId: Id };
export type WillMutationOutput = OwnerOutput<WillState> & {
  resolutions: readonly SuggestionResolution[];
  needReceipts: readonly WillAutonomyReceipt[];
  crisisReceipts: readonly (
    | { kind: 'strain'; amount: number; receiptId: Id }
    | { kind: 'comfort'; receiptId: Id }
  )[];
};
export interface WillOwner {
  advance(
    state: DeepReadonly<WillState>,
    context: DeepReadonly<
      SpanContext & {
        continuation: DeliberationContinuation['will'];
        activity: ActorActivity | null;
      }
    >,
  ): WillMutationOutput & { continuation: DeliberationContinuation['will'] };
}
export type MemoryCue = {
  at: Time;
  placeId?: Id;
  action?: Id;
  personId?: Id;
  hour?: number;
  tags: readonly Id[];
};
export type ExpectedEffect = {
  needs: Partial<Record<NeedId, number>>;
  successRate: Unit;
  valence: Signed;
  samples: number;
  confidence: Unit;
  recalled: readonly Id[];
  gist?: { valence: Signed; weight: Unit; ids: readonly Id[] };
};
export interface MemoryOwner {
  receiveCue(
    state: DeepReadonly<MemoryOwnedState>,
    cue: DeepReadonly<MemoryCue>,
    context: DeepReadonly<MemoryContext & { deceased: readonly Id[]; emotionality: Unit }>,
  ): OwnerOutput<MemoryOwnedState> & { recalled: readonly Id[]; affectReceipts: readonly AffectEndpoint[] };
  expectedEffect(
    state: DeepReadonly<MemoryOwnedState>,
    offer: DeepReadonly<Offer>,
    context: DeepReadonly<FrameContext>,
  ): ExpectedEffect;
}
export interface ChronicleOwner {
  close(
    state: DeepReadonly<{ days: readonly DayRecord[]; years: readonly YearRecord[]; open: ChronicleDay }>,
    context: DeepReadonly<FrameContext & { snapshot: ChronicleSnapshot }>,
  ): OwnerOutput<{ days: readonly DayRecord[]; years: readonly YearRecord[]; open: ChronicleDay }> & {
    day: DayRecord;
    socialMs: DurationMs;
  };
}
export interface CharacterOwner {
  receiveDay(
    state: DeepReadonly<{ character: CharacterState; traits: Traits; values: Values }>,
    day: DeepReadonly<DayRecord>,
    context: DeepReadonly<
      FrameContext & {
        socialMs: DurationMs;
        continuation: NarrativeContinuation['character'];
      }
    >,
  ): OwnerOutput<{ character: CharacterState; traits: Traits; values: Values }> & {
    continuation: NarrativeContinuation['character'];
  };
}

// Revision 6: actual contact is one reached receipt, never an ongoing contact hazard.
export type PhysicalContactReceipt = {
  type: 'physical-contact';
  contactId: Id;
  durationMs: DurationMs;
  carrier: { kind: Id; contagious: boolean; severity: Unit };
  basis: EvidenceRef;
};
export interface BodyOwner {
  receiveContact(
    state: DeepReadonly<BodyState>,
    receipt: DeepReadonly<PhysicalContactReceipt>,
    context: DeepReadonly<
      FrameContext & {
        continuation: BodyContinuation;
        dozeContinuation: DozeContinuation;
        rng: ActorRandomCursor;
      }
    >,
  ): OwnerOutput<BodyState> & {
    continuation: BodyContinuation;
    dozeContinuation: DozeContinuation;
    rng: ActorRandomCursor;
  };
  read(
    state: DeepReadonly<BodyState>,
    context: DeepReadonly<FrameContext & { perception: BodyPerceptionContext }>,
  ): BodyReadout;
}
export type BodyProjectionContext = {
  continuation: BodyContinuation;
  dozeContinuation: DozeContinuation;
  life: { birthAt: Time };
  environment: AmbientPercept;
  pregnancy?: Pregnancy;
  perception: BodyPerceptionContext;
};
export type BodyForecastSpan = {
  label: string;
  endsAt: Time;
  worst: Unit;
  worstOf: 'fatigue' | 'sleepiness' | 'hunger' | 'thirst';
  basis: 'conditional-load-projection';
};
export interface BodyOwner {
  forecast(
    state: DeepReadonly<BodyState>,
    spans: DeepReadonly<
      readonly {
        label: string;
        durationMs: DurationMs;
        load: BodyLoad;
      }[]
    >,
    context: DeepReadonly<FrameContext & BodyProjectionContext>,
  ): Result<readonly BodyForecastSpan[]>;
}
export interface LifecycleOwner {
  modifiers(state: DeepReadonly<LifeCourse>, context: DeepReadonly<FrameContext>): LifeModifiers;
}
export interface NeedsOwner {
  read(
    state: DeepReadonly<NeedReservoirs>,
    context: DeepReadonly<
      FrameContext & {
        body: BodyReadout;
        traits: Traits;
        values: Values;
      }
    >,
  ): readonly NeedReading[];
}
export interface AffectOwner {
  tendencies(
    state: DeepReadonly<Omit<AffectState, 'crisis'>>,
    traits: DeepReadonly<Traits>,
    context: DeepReadonly<FrameContext>,
  ): {
    values: Record<Id, Signed>;
    emotions: Record<Id, EmotionId>;
  };
}
export interface PartneringOwner {
  terms(
    state: DeepReadonly<BondsState>,
    offer: DeepReadonly<Offer>,
    context: DeepReadonly<FrameContext & { social: SocialState }>,
  ): readonly TermData[];
}
export type ExemptionPremises = {
  traveling: Knowledge<boolean>;
  illnessSeverity: Knowledge<Unit>;
  validUntil?: Time;
};
export type AgendaEvidence =
  | ({ kind: 'exemption' } & ExemptionPremises)
  | { kind: 'dependent-needs'; dependent: Id; needs: readonly NeedReading[]; action: Id };
export interface AgendaOwner {
  consider(
    state: DeepReadonly<AgendaState>,
    context: DeepReadonly<
      FrameContext & {
        needs: readonly NeedReading[];
      }
    >,
  ): OwnerOutput<AgendaState>;
}

// Allocation identity includes actor scope: local e1/g1/goal IDs can coexist.
export type AllocationScope = { kind: 'run' } | { kind: 'person'; person: PersonId };

// Revision 9: reached contact and pure source projections. No legacy Person casts.
export interface FamilyOwner {
  receiveContacts(
    state: DeepReadonly<FamilyState>,
    contacts: DeepReadonly<readonly FamilyContactReceipt[]>,
    context: DeepReadonly<
      FrameContext & {
        life: LifeCourse;
        caregivers: readonly UpbringingExposure['caregivers'][number][];
        knownVoices: readonly VoiceRelation[];
      }
    >,
  ): OwnerOutput<FamilyState> & { upbringing: readonly UpbringingExposure[] };
}
export interface EnvironmentOwner {
  trajectory(
    state: DeepReadonly<AmbientState>,
    context: DeepReadonly<FrameContext & { character: CharacterTrajectory; asleep: boolean }>,
  ): EnvironmentTrajectory;
  forcing(
    state: DeepReadonly<AmbientState>,
    context: DeepReadonly<
      FrameContext & {
        traits: Traits;
        asleep: boolean;
      }
    >,
  ): { moodOffset: Signed; needsPerMinute: Partial<Record<PsychologicalNeed, number>> };
}
export interface BodyOwner {
  capacities(state: DeepReadonly<BodyState>, context: DeepReadonly<FrameContext>): Record<Capacity, Unit>;
  downedAllows(offer: DeepReadonly<Offer>): boolean;
  bladderMotivation(
    state: DeepReadonly<BodyState>,
    offer: DeepReadonly<Offer>,
    successRate: Unit,
    context: DeepReadonly<FrameContext>,
  ): number;
}
export interface CrisisOwner {
  inBreak(state: DeepReadonly<CrisisState>, context: DeepReadonly<FrameContext>): boolean;
  allows(
    state: DeepReadonly<CrisisState>,
    offer: DeepReadonly<Offer>,
    context: DeepReadonly<FrameContext>,
  ): boolean;
}
export interface WillOwner {
  commandForcing(
    state: DeepReadonly<WillState>,
    context: DeepReadonly<FrameContext>,
  ): {
    crisisStrainPerMinute: number;
    needsPerMinute: Partial<Record<PsychologicalNeed, number>>;
  };
}
export type AuthoredConsequences = {
  sourceId: Id;
  claims: readonly ReceivedConsequence[];
  withdrawals: readonly { id: Id; revision: number }[];
  basis: { kind: 'authored'; author: Id; evidence: EvidenceRef };
};
export type MakeUpRetirementReceipt = { owed: OwedMakeUp; commitment: Commitment; recordedAt: Time };

// C0 owns received opportunity context, separately from opaque host world data.
export type ReceivedOfferBook = {
  revision: number;
  receivedAt: Time;
  cause: InputId;
  offers: readonly Offer[];
  rejected: readonly { offerId: Id; offerRevision: number; requestId: RequestId }[];
};
export type ActiveRoutine = {
  person: PersonId;
  id: Id;
  entries: readonly RoutineEntry[];
  source: { kind: 'definition'; id: Id } | { kind: 'input'; inputId: InputId };
};
export interface PartneringOwner {
  familyVoice(
    approval: DeepReadonly<FamilyApproval>,
    context: DeepReadonly<FrameContext>,
  ): SuggestionData | null;
}

export interface SkillsOwner {
  successChance(
    state: DeepReadonly<ActorState>,
    input: DeepReadonly<{ skill: Id; difficulty: Unit; capacity: Unit; support: Unit }>,
    context: DeepReadonly<FrameContext>,
  ): Unit;
}
