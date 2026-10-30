/** Voice's public HF4 boundary. The town supplies actual outcomes; this module never edits an actor. */
import {
  type ActionRequest,
  type ActionResolution,
  type CommunicationRequest,
  type CommunicationResolution,
  createPerson,
  createRun,
  type DeepReadonly,
  exportRun,
  type Fidelity,
  forkRun,
  type HostRequest,
  type Input,
  type Inspection,
  type InspectQuery,
  inspect,
  type Offer,
  type Payloads,
  type PerceptData,
  type PersonAuthoring,
  type PreviewQuery,
  type PreviewResult,
  preview,
  type Result,
  type Run,
  type RunArchive,
  type RunSpec,
  replay,
  restoreRun,
  type StepResult,
  step,
} from '@adam0white/human-framework';

export const profile = {
  step: 0,
  inspect: 0,
  save: 0,
  preview: 0,
  restore: 0,
  restores: 0,
  fork: 0,
  forks: 0,
};
export const VOICE_HF4_EDITION = 'voice-hf4/1';
export const OLD_VOICE_SAVE = 'This save is from an older version. Start a fresh game.';
export const MINUTE_MS = 60_000;
export function milliseconds(minutes: number): number {
  const at = minutes * MINUTE_MS;
  if (!Number.isSafeInteger(at)) throw new Error('Voice time must be an exact integer millisecond.');
  return at;
}
export function need<T>(result: Result<T>): T {
  if (!result.ok) throw new Error(`${result.error.path}: ${result.error.message}`);
  return result.value;
}

type Event = DeepReadonly<StepResult>['events'][number];
type Decision = Extract<Event['data'], { kind: 'decision' }>['decision'];
export type VoiceTextSource = Pick<
  PerceptData,
  'channel' | 'kind' | 'actorId' | 'targetId' | 'placeId' | 'valence' | 'salience'
>;
type VoiceHistory = {
  trace: DeepReadonly<Decision>[];
  days: Extract<Event['data'], { kind: 'day-closed' }>['record'][];
};
/** These facts came from submitted offers and accepted start receipts, not a copied actor. */
export interface VoiceActiveWork {
  request: DeepReadonly<ActionRequest>;
  offer: DeepReadonly<Offer>;
  start: number;
  end: number;
  decision?: DeepReadonly<Decision>;
}
export interface VoiceRunSnapshot {
  edition: typeof VOICE_HF4_EDITION;
  fidelity: Fidelity;
  archive: DeepReadonly<RunArchive>;
  nextInput: number;
  textSources: [string, VoiceTextSource][];
  /** Closing a timestamp means later new host evidence needs a strictly later ingress. */
  closedAt: number | null;
  offers: [string, { revision: number; offers: DeepReadonly<Offer>[] }][];
  active: [string, VoiceActiveWork][];
  decisions: [string, DeepReadonly<Decision>][];
  events: Event[];
  pending: DeepReadonly<HostRequest>[];
}
export type VoiceHostReply =
  | { kind: 'action'; resolution: ActionResolution }
  | { kind: 'communication'; resolution: CommunicationResolution };
export interface VoiceHostTransaction {
  action(request: DeepReadonly<ActionRequest>, work: VoiceActiveWork | undefined): ActionResolution;
  communication(request: DeepReadonly<CommunicationRequest>): CommunicationResolution;
  /** Publish staged town state only after every receipt is accepted. */
  commit(): readonly Input[] | void;
}
export interface VoiceHost {
  /** Stage all requests at this boundary on one detached town state. */
  stage(): VoiceHostTransaction;
}

/** One run for all townspeople. All HF faculties stay enabled by construction. */
export class VoiceRun {
  run: Run;
  fidelity: Fidelity = { mode: 'fine' };
  private currentAt: number;
  private cachedArchive: DeepReadonly<RunArchive> | undefined;
  private nextInput = 0;
  private closedAt: number | null = null;
  readonly offers = new Map<string, { revision: number; offers: DeepReadonly<Offer>[] }>();
  readonly active = new Map<string, VoiceActiveWork>();
  readonly decisions: Map<string, DeepReadonly<Decision>> = new Map();
  readonly events: Event[] = [];
  readonly textSources: Map<string, VoiceTextSource> = new Map();
  textSource(perceptId: string, evidenceId: string): VoiceTextSource | undefined {
    return this.textSources.get(`percept:${perceptId}`) ?? this.textSources.get(`evidence:${evidenceId}`);
  }
  private recordTextSource(percept: DeepReadonly<PerceptData>): void {
    const { channel, kind, actorId, targetId, placeId, valence, salience } = percept;
    this.textSources.set(`percept:${percept.id}`, {
      channel,
      kind,
      actorId,
      targetId,
      placeId,
      valence,
      salience,
    });
  }
  private readIndexAt = 0;
  private readIndex = new Map<
    string,
    { trace: DeepReadonly<Decision>[]; days: Extract<Event['data'], { kind: 'day-closed' }>['record'][] }
  >();
  /** Derived public event index; never serialized or used to advance the actor. */
  history(person: string): VoiceHistory {
    for (; this.readIndexAt < this.events.length; this.readIndexAt++) {
      const e = this.events[this.readIndexAt]!;
      if (!e.person || (e.data.kind !== 'decision' && e.data.kind !== 'day-closed')) continue;
      const row = this.readIndex.get(e.person) ?? { trace: [], days: [] };
      if (e.data.kind === 'decision') {
        row.trace.push(e.data.decision);
        if (row.trace.length > 32) row.trace.shift();
      } else row.days.push(e.data.record);
      this.readIndex.set(e.person, row);
    }
    return this.readIndex.get(person) ?? { trace: [], days: [] };
  }
  pending: DeepReadonly<HostRequest>[] = [];

  constructor(spec: RunSpec, people: readonly PersonAuthoring[]) {
    if (spec.host.edition !== VOICE_HF4_EDITION) throw new Error(OLD_VOICE_SAVE);
    this.run = need(createRun(spec));
    this.currentAt = spec.start;
    for (const person of people) need(createPerson(this.run, person));
  }
  static restore(snapshot: VoiceRunSnapshot): VoiceRun {
    const started = performance.now();
    if (snapshot?.edition !== VOICE_HF4_EDITION || snapshot.archive?.host.edition !== VOICE_HF4_EDITION)
      throw new Error(OLD_VOICE_SAVE);
    const self = Object.create(VoiceRun.prototype) as VoiceRun;
    Object.assign(self, {
      run: need(restoreRun(snapshot.archive)),
      currentAt: snapshot.archive.current.at,
      fidelity: snapshot.fidelity,
      nextInput: snapshot.nextInput,
      textSources: new Map(snapshot.textSources),
      closedAt: snapshot.closedAt,
      offers: new Map(snapshot.offers),
      active: new Map(snapshot.active),
      decisions: new Map(snapshot.decisions),
      events: structuredClone(snapshot.events),
      pending: structuredClone(snapshot.pending),
      readIndexAt: 0,
      readIndex: new Map(),
    });
    profile.restore += performance.now() - started;
    profile.restores++;
    return self;
  }
  get at(): number {
    return this.currentAt;
  }
  /** A live epilogue branches through HF; serialized files still use cold restore. */
  fork(): VoiceRun {
    const started = performance.now();
    const branch = Object.create(VoiceRun.prototype) as VoiceRun;
    Object.assign(branch, {
      ...this,
      run: forkRun(this.run),
      fidelity: structuredClone(this.fidelity),
      textSources: structuredClone(this.textSources),
      offers: structuredClone(this.offers),
      active: structuredClone(this.active),
      decisions: structuredClone(this.decisions),
      events: [...this.events],
      pending: [...this.pending],
      readIndexAt: 0,
      readIndex: new Map(),
    });
    profile.fork += performance.now() - started;
    profile.forks++;
    return branch;
  }
  /** Persisted ingress phase keeps player inputs ordered without changing authored durations. */
  ingressAt(): number {
    return Math.max(
      this.at + (this.pending.length ? 1 : 0),
      this.closedAt === null ? this.at : this.closedAt + 1,
    );
  }
  input<K extends keyof Payloads>(kind: K, at: number, payload: Payloads[K]): Input<K> {
    return {
      id: `voice-input:${this.nextInput++}`,
      at,
      source: { type: 'host', id: 'voice' },
      kind,
      payload,
    } as Input<K>;
  }
  offerInputs(person: string, offers: readonly Offer[], at: number): Input[] {
    const revision = (this.offers.get(person)?.revision ?? 0) + 1;
    return [
      this.input('offers.received', at, { person, revision, offers }),
      this.input('decision.requested', at, {
        person,
        offerRevision: revision,
        reason: 'town choices',
        treatment: 'ordinary',
      }),
    ];
  }
  /** Returns at an unresolved boundary. Useful for atomic saves before the host has acted. */
  receive(until: number, inputs: readonly Input[] = []): DeepReadonly<StepResult> {
    const started = performance.now();
    const result = need(
      step(this.run, { until, inputs, ...(!this.pending.length ? { fidelity: this.fidelity } : {}) }),
    );
    profile.step += performance.now() - started;
    this.currentAt = result.at;
    this.cachedArchive = undefined;
    const consumed = new Set(
      result.events.flatMap((event) =>
        event.data.kind === 'input-disposed' && event.data.disposition.kind === 'consumed'
          ? [event.data.disposition.inputId]
          : [],
      ),
    );
    for (const input of inputs) {
      if (!consumed.has(input.id)) continue;
      if (input.kind === 'observation.received')
        for (const percept of input.payload.percepts) this.recordTextSource(percept);
      if (input.kind === 'action.resolved')
        for (const observation of input.payload.observations)
          for (const percept of observation.percepts) this.recordTextSource(percept);
      if (input.kind === 'communication.resolved')
        for (const reception of input.payload.received)
          if (reception.attention > 0 && reception.itemIds.length)
            this.textSources.set(`evidence:${reception.evidenceId}`, {
              channel: 'told',
              kind: 'conversation',
              actorId: input.payload.speaker,
              targetId: reception.recipient,
              salience: reception.attention,
            });
      if (input.kind === 'offers.received')
        this.offers.set(input.payload.person, {
          revision: input.payload.revision,
          offers: structuredClone([...input.payload.offers]),
        });
      if (input.kind === 'action.resolved') {
        const resolution = input.payload;
        const request = this.pending.find((entry) => entry.id === resolution.requestId);
        if (request?.kind !== 'action') continue;
        if (request.stage === 'start' && resolution.disposition === 'accepted') {
          const offer = this.offers.get(request.person)?.offers.find((item) => item.id === request.offerId);
          if (!offer) throw new Error('Voice lost the submitted offer for an accepted action.');
          this.active.set(request.person, {
            request,
            offer,
            start: request.boundaryAt,
            end: request.boundaryAt + offer.durationMs,
            ...(this.decisions.has(request.person) ? { decision: this.decisions.get(request.person) } : {}),
          });
        } else if (request.stage !== 'start') this.active.delete(request.person);
      }
    }
    this.events.push(...result.events);
    for (const event of result.events)
      if (event.person && event.data.kind === 'decision')
        this.decisions.set(event.person, event.data.decision);
    this.pending = result.boundary.type === 'world-required' ? [...result.boundary.requests] : [];
    if (result.boundary.type === 'until') this.closedAt = result.at;
    return result;
  }
  resolve(request: DeepReadonly<HostRequest>, reply: VoiceHostReply): Input {
    if (request.kind !== reply.kind) throw new Error('Voice host replied to the wrong boundary kind.');
    if (reply.kind === 'communication')
      return this.input('communication.resolved', request.boundaryAt, reply.resolution);
    return this.input('action.resolved', request.boundaryAt, reply.resolution);
  }
  /** Every unresolved request is served before time advances. No completion is inferred from an offer. */
  advance(until: number, host: VoiceHost, inputs: readonly Input[] = []): Event[] {
    const start = this.events.length;
    let result: DeepReadonly<StepResult> =
      this.pending.length && inputs.length === 0
        ? {
            at: this.at,
            reachedUntil: false,
            events: [],
            boundary: { type: 'world-required', requests: this.pending },
            nextAt: null,
          }
        : this.receive(until, inputs);
    const followUps: Input[] = [];
    for (;;) {
      if (result.boundary.type !== 'world-required') {
        if (followUps.length) {
          const inputs = followUps.splice(0);
          result = this.receive(Math.max(until, ...inputs.map((input) => input.at)), inputs);
          continue;
        }
        if (result.at < until) {
          result = this.receive(until);
          continue;
        }
        break;
      }
      const transaction = host.stage();
      const inputCounter = this.nextInput;
      // Settle physical work before delivering speech at the same boundary. A received
      // suggestion can reconsider an activity; it must not interrupt work already finishing.
      // Remaining communication requests stay pending and are served at the same clock.
      const actions = result.boundary.requests.filter((request) => request.kind === 'action');
      const requests = actions.length ? actions : result.boundary.requests;
      const replies = requests.map((request) =>
        this.resolve(
          request,
          request.kind === 'action'
            ? { kind: 'action', resolution: transaction.action(request, this.active.get(request.person)) }
            : { kind: 'communication', resolution: transaction.communication(request) },
        ),
      );
      try {
        result = this.receive(result.at, replies);
        const consumed = new Set(
          result.events.flatMap((event) =>
            event.data.kind === 'input-disposed' && event.data.disposition.kind === 'consumed'
              ? [event.data.disposition.inputId]
              : [],
          ),
        );
        if (replies.some((reply) => !consumed.has(reply.id)))
          throw new Error('Voice town receipt was not accepted; staged changes were discarded.');
      } catch (error) {
        // Public step validates the complete input batch transactionally. No town effects have committed.
        this.nextInput = inputCounter;
        throw error;
      }
      followUps.push(...(transaction.commit() ?? []));
    }
    return this.events.slice(start);
  }
  inspect(query: InspectQuery): DeepReadonly<Inspection> {
    const started = performance.now();
    const result = need(inspect(this.run, query));
    profile.inspect += performance.now() - started;
    return result;
  }
  /** A waking forecast may end at a host boundary. That is an unknown future, not a receipt. */
  preview(query: PreviewQuery): DeepReadonly<PreviewResult> {
    const started = performance.now();
    const result = need(preview(this.run, query));
    profile.preview += performance.now() - started;
    return result;
  }
  save(): VoiceRunSnapshot {
    if (!this.cachedArchive) {
      const started = performance.now();
      this.cachedArchive = exportRun(this.run);
      profile.save += performance.now() - started;
    }
    return {
      edition: VOICE_HF4_EDITION,
      fidelity: this.fidelity,
      archive: this.cachedArchive,
      nextInput: this.nextInput,
      textSources: [...this.textSources],
      closedAt: this.closedAt,
      offers: [...this.offers],
      active: [...this.active],
      decisions: [...this.decisions],
      events: [...this.events],
      pending: [...this.pending],
    };
  }
  verify(): void {
    const archive = exportRun(this.run);
    const result = need(replay(archive));
    if (!result.verified || result.fullHash !== archive.hashes.full)
      throw new Error('Voice HF replay differs.');
  }
}
