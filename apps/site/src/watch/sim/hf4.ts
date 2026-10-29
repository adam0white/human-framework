/** The Watch host boundary. Actor state enters through HF inputs and leaves through public projections.
 * The game supplies action and transport receipts. The bridge never predicts a world outcome.
 */
import {
  type ActionResolution,
  createPerson,
  createRun,
  type DeepReadonly,
  exportRun,
  type Fidelity,
  type HostRequest,
  type Input,
  type Inspection,
  type InspectQuery,
  inspect,
  type Json,
  type Offer,
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

import { stableStringify } from '../../shared/playtest.ts';

export const WATCH_HF4_EDITION = 'watch-hf4-1';
export const WATCH_OLD_SAVE = 'This save is from an older version. Start a fresh game.';
export const minuteMs = (minute: number): number => {
  const value = minute * 60_000;
  if (!Number.isSafeInteger(value)) throw new Error('Watch time must be an integer number of milliseconds.');
  return value;
};

export function need<T>(result: Result<T>): T {
  if (!result.ok) throw new Error(`${result.error.code} ${result.error.path}: ${result.error.message}`);
  return result.value;
}

export type WatchActive = {
  id: string;
  person: string;
  offer: Offer;
  start: number;
};
export type WatchHostState = {
  /** The exact accepted offer revision, including duration and host task metadata. */
  offers: { person: string; revision: number; offers: Offer[] }[];
  active: WatchActive[];
  /** The game owns this data. Actor state must never be placed here. */
  game: Json;
};
export type WatchArchive = {
  edition: typeof WATCH_HF4_EDITION;
  archive: DeepReadonly<RunArchive>;
};
export type WatchWorld = {
  committed?: (before: DeepReadonly<WatchHostState>, after: DeepReadonly<WatchHostState>) => void;
  /** Mutate only the supplied staged host data. No effect may escape before the batch is admitted. */
  action: (
    host: WatchHostState,
    request: DeepReadonly<Extract<HostRequest, { kind: 'action' }>>,
    offer: DeepReadonly<Offer>,
    active: DeepReadonly<WatchActive> | undefined,
  ) => Pick<ActionResolution, 'disposition' | 'observations' | 'outcome'>;
  communication: (
    host: WatchHostState,
    request: DeepReadonly<Extract<HostRequest, { kind: 'communication' }>>,
  ) => {
    emittedItemIds: string[];
    received: { recipient: string; evidenceId: string; attention: number; itemIds: string[] }[];
  };
};

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function validId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}
function integer(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value);
}
function keys(value: Record<string, unknown>, expected: string): boolean {
  return Object.keys(value).sort().join(',') === expected;
}
/** HF validates all offer fields. This decoder validates the host-owned envelope and associations too. */
function decodeHost(archive: DeepReadonly<RunArchive>): WatchHostState {
  const data = archive.current.world.hostState;
  if (
    !isObject(data) ||
    !keys(data, 'active,game,offers') ||
    !Array.isArray(data.offers) ||
    !Array.isArray(data.active)
  )
    throw new Error('Invalid Watch host state.');
  const people = new Set(Object.keys(archive.current.people));
  const revisions = new Set<string>();
  for (const row of data.offers) {
    if (
      !isObject(row) ||
      !keys(row, 'offers,person,revision') ||
      !validId(row.person) ||
      !people.has(row.person) ||
      !integer(row.revision) ||
      row.revision < 1 ||
      !Array.isArray(row.offers) ||
      revisions.has(row.person)
    )
      throw new Error('Invalid Watch offer ledger.');
    revisions.add(row.person);
    for (const offer of row.offers) {
      if (
        !isObject(offer) ||
        offer.person !== row.person ||
        !validId(offer.id) ||
        !validId(offer.actionId) ||
        !integer(offer.durationMs) ||
        offer.durationMs <= 0
      )
        throw new Error('Invalid Watch offer ledger.');
    }
  }
  const activeIds = new Set<string>();
  for (const active of data.active) {
    if (
      !isObject(active) ||
      !keys(active, 'id,offer,person,start') ||
      !validId(active.id) ||
      !validId(active.person) ||
      !people.has(active.person) ||
      !integer(active.start) ||
      active.start > archive.current.at ||
      !isObject(active.offer) ||
      active.offer.person !== active.person ||
      !validId(active.offer.id) ||
      !validId(active.offer.actionId) ||
      activeIds.has(active.id)
    )
      throw new Error('Invalid Watch accepted action ledger.');
    activeIds.add(active.id);
  }
  return structuredClone(data) as unknown as WatchHostState;
}

/** One community Run includes the Keeper and every admitted villager. There is no independent actor clock. */
export class WatchActors {
  readonly run: Run;
  private host: WatchHostState;
  private revision: number;
  private at: number;
  private source: string;
  private viewEpoch = 0;

  private constructor(run: Run, host: WatchHostState, revision: number, at: number, source: string) {
    this.run = run;
    this.host = host;
    this.revision = revision;
    this.at = at;
    this.source = source;
  }

  static create(spec: RunSpec, people: readonly PersonAuthoring[], game: Json): WatchActors {
    const host: WatchHostState = { offers: [], active: [], game: structuredClone(game) };
    const run = need(
      createRun({
        ...spec,
        host: { id: spec.host.id, edition: WATCH_HF4_EDITION, schema: WATCH_HF4_EDITION },
        world: { ...spec.world, hostState: host as unknown as Json },
      }),
    );
    for (const person of people) need(createPerson(run, person));
    return new WatchActors(run, host, spec.world.revision, spec.start, spec.host.id);
  }

  static restore(value: unknown): WatchActors {
    if (!isObject(value) || value.edition !== WATCH_HF4_EDITION || !isObject(value.archive))
      throw new Error(WATCH_OLD_SAVE);
    const archive = value.archive as unknown as RunArchive;
    if (!isObject(archive.host)) throw new Error(WATCH_OLD_SAVE);
    if (archive.host.edition !== WATCH_HF4_EDITION || archive.host.schema !== WATCH_HF4_EDITION)
      throw new Error(WATCH_OLD_SAVE);
    const result = restoreRun(archive);
    if (!result.ok) {
      if (result.error.code === 'unsupported-archive') throw new Error(WATCH_OLD_SAVE);
      need(result);
    }
    const run = need(result);
    return new WatchActors(
      run,
      decodeHost(archive),
      archive.current.world.revision,
      archive.current.at,
      archive.host.id,
    );
  }

  time(): number {
    return this.at;
  }
  generation(): number {
    return this.viewEpoch;
  }
  activeActions(): DeepReadonly<WatchActive[]> {
    return structuredClone(this.host.active);
  }
  worldRevision(): number {
    return this.revision;
  }

  snapshot(): WatchArchive {
    return { edition: WATCH_HF4_EDITION, archive: exportRun(this.run) };
  }

  verify(): void {
    const archive = exportRun(this.run);
    const result = need(replay(archive));
    if (!result.verified || result.fullHash !== archive.hashes.full)
      throw new Error('The Watch actor archive did not replay exactly.');
  }

  read(query: InspectQuery): DeepReadonly<Inspection> {
    return need(inspect(this.run, query));
  }

  preview(query: PreviewQuery): DeepReadonly<PreviewResult> {
    return need(preview(this.run, query));
  }

  hostState(): DeepReadonly<WatchHostState> {
    return structuredClone(this.host);
  }

  /** The caller batches every input at a game instant before closing that instant. */
  advance(
    until: number,
    inputs: readonly Input[],
    world: WatchWorld,
    initial?: DeepReadonly<StepResult>,
    fidelity?: Fidelity,
  ): DeepReadonly<StepResult> {
    if (!integer(until) || until < this.at) throw new Error('Watch cannot move time backwards.');
    if (initial && inputs.length) throw new Error('An admitted boundary cannot resubmit inputs.');
    if (initial) {
      const archive = exportRun(this.run);
      this.host = decodeHost(archive);
      this.revision = archive.current.world.revision;
      this.at = archive.current.at;
    }
    let batch = inputs;
    const worldInputs = new Map(
      inputs.filter((input) => input.kind === 'world.changed').map((input) => [input.id, input]),
    );
    let pending = initial;
    const events: DeepReadonly<StepResult>['events'][number][] = [];
    let staged: { host: WatchHostState; revision: number } | undefined;
    for (let boundary = 0; boundary < 10_000; boundary++) {
      const next = pending
        ? undefined
        : step(this.run, { until, inputs: batch, ...(fidelity ? { fidelity } : {}) });
      if (next && !next.ok)
        throw new Error(
          `${next.error.code} ${next.error.path}: ${next.error.message}; until ${until}, clock ${this.at}; submitted ${batch.map((i) => `${i.id} ${i.kind} ${i.at} ${i.kind === 'observation.received' ? JSON.stringify(i.payload.percepts) : i.kind === 'act.witnessed' ? JSON.stringify(i.payload.act) : ''}`).join(',')}`,
        );
      if (!pending && !next) throw new Error('Missing Watch HF step result.');
      const result =
        pending ??
        (next
          ? need(next)
          : (() => {
              throw new Error('Missing Watch HF result.');
            })());
      pending = undefined;
      events.push(...result.events);
      if (staged) {
        const before = this.host;
        this.host = staged.host;
        this.revision = staged.revision;
        world.committed?.(before, this.host);
        staged = undefined;
      }
      for (const event of result.events) {
        if (
          event.data.kind === 'input-disposed' &&
          worldInputs.has(event.data.disposition.inputId) &&
          event.data.disposition.kind !== 'consumed'
        )
          throw new Error(
            `Watch world ledger refused: ${JSON.stringify(event.data.disposition)}; host revision ${this.revision}`,
          );
        if (event.data.kind !== 'input-disposed' || event.data.disposition.kind !== 'consumed') continue;
        const input = worldInputs.get(event.data.disposition.inputId);
        if (!input) continue;
        const data = input.payload;
        // Actor IDs may arrive in this same batch; offer rows still have HF-validated identities.
        this.host = structuredClone(data.hostState) as unknown as WatchHostState;
        this.revision = data.revision;
        worldInputs.delete(input.id);
      }
      this.at = result.at;
      if (result.boundary.type === 'until') {
        if (!result.reachedUntil || result.at !== until) throw new Error('Watch did not reach its target.');
        this.viewEpoch++;
        return { ...result, events };
      }
      const candidate = structuredClone(this.host);
      let revision = this.revision;
      const seen = new Set<string>();
      batch = [...result.boundary.requests]
        .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
        .map((request): Input => {
          if (seen.has(request.id)) throw new Error('Duplicate Watch host request.');
          seen.add(request.id);
          const envelope = {
            id: `watch:receipt:${request.id}`,
            at: request.boundaryAt,
            source: { type: 'host' as const, id: this.source },
          };
          if (request.kind === 'communication') {
            const actual = world.communication(candidate, request);
            const previous = revision++;
            return {
              ...envelope,
              kind: 'communication.resolved',
              payload: {
                requestId: request.id,
                requestHash: request.requestHash,
                worldRevision: previous,
                speaker: request.speaker,
                ...actual,
                worldChange: {
                  expectedRevision: previous,
                  revision,
                  put: [],
                  remove: [],
                  hostState: structuredClone(candidate) as unknown as Json,
                },
              },
            };
          }
          const active = candidate.active.find(
            (a) => a.id === request.activityId && a.person === request.person,
          );
          const offer =
            request.stage === 'start'
              ? candidate.offers
                  .find((row) => row.person === request.person && row.revision === request.offerRevision)
                  ?.offers.find((o) => o.id === request.offerId)
              : active?.offer;
          if (!offer) {
            if (request.stage !== 'start')
              throw new Error('Watch has no accepted action for this settlement.');
            return {
              ...envelope,
              kind: 'action.resolved',
              payload: {
                requestId: request.id,
                requestHash: request.requestHash,
                worldRevision: revision,
                person: request.person,
                activityId: request.activityId,
                stage: request.stage,
                disposition: 'rejected',
                observations: [],
              },
            };
          }
          const actual = world.action(candidate, request, offer, active);
          if (request.stage === 'start') {
            if (!['accepted', 'rejected'].includes(actual.disposition))
              throw new Error('Invalid Watch start receipt.');
            if (actual.disposition === 'accepted')
              candidate.active.push({
                id: request.activityId,
                person: request.person,
                offer: structuredClone(offer),
                start: request.boundaryAt,
              });
          } else {
            if (!['completed', 'failed', 'interrupted'].includes(actual.disposition))
              throw new Error('Invalid Watch end receipt.');
            candidate.active = candidate.active.filter((a) => a.id !== request.activityId);
          }
          const previous = revision++;
          return {
            ...envelope,
            kind: 'action.resolved',
            payload: {
              requestId: request.id,
              requestHash: request.requestHash,
              worldRevision: previous,
              person: request.person,
              activityId: request.activityId,
              stage: request.stage,
              ...actual,
              worldChange: {
                expectedRevision: previous,
                revision,
                put: [],
                remove: [],
                hostState: structuredClone(candidate) as unknown as Json,
              },
            },
          };
        });
      staged = { host: candidate, revision };
    }
    throw new Error('Watch host settlement budget exhausted.');
  }

  offerRevision(person: string): number {
    return this.host.offers.find((row) => row.person === person)?.revision ?? 0;
  }

  /** Offer history is host data. HF owns decisions and every actor consequence of these offers. */
  offerInputs(
    at: number,
    people: readonly { person: string; offers: readonly Offer[] }[],
    game?: Json,
  ): Input[] {
    const host = structuredClone(this.host);
    if (game !== undefined) host.game = structuredClone(game);
    const inputs: Input[] = [];
    for (const row of people) {
      const previous = host.offers.find((x) => x.person === row.person);
      if (previous && stableStringify(previous.offers) === stableStringify(row.offers)) continue;
      const revision = (previous?.revision ?? 0) + 1;
      host.offers = host.offers.filter((x) => x.person !== row.person);
      host.offers.push({ person: row.person, revision, offers: structuredClone([...row.offers]) });
      inputs.push({
        id: `watch:offers:${row.person}:${revision}`,
        at,
        source: { type: 'host', id: this.source },
        kind: 'offers.received',
        payload: { ...row, revision },
      });
    }
    if (!inputs.length && stableStringify(host.game) === stableStringify(this.host.game)) return [];
    // The world input persists the offer ledger atomically with its matching offers.
    inputs.push({
      id: `watch:ledger:${this.revision + 1}`,
      at,
      source: { type: 'host', id: this.source },
      kind: 'world.changed',
      payload: {
        expectedRevision: this.revision,
        revision: this.revision + 1,
        put: [],
        remove: [],
        hostState: host as unknown as Json,
      },
    });
    return inputs;
  }
}
