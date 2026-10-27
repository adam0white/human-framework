/**
 * A self-contained host using the public HF 4 run API. Run it with node packages/human/examples/minimal.ts.
 * pack-smoke copies this file alone outside the workspace, so it has no local helper imports.
 * These authored facts are engineering examples, not measurements of a real person.
 */
import { pathToFileURL } from 'node:url';

import {
  type ActionResolution,
  type CommunicationResolution,
  createPerson,
  createRun,
  type DeepReadonly,
  exportRun,
  type HostRequest,
  type Input,
  inspect,
  type Offer,
  type PersonAuthoring,
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

/** Entry detection works throughout the declared Node 24+ range and when this file is imported. */
export function isMain(moduleUrl: string): boolean {
  return process.argv[1] !== undefined && pathToFileURL(process.argv[1]).href === moduleUrl;
}
export const MINUTE = 60_000;
export const DAY = 86_400_000;
export const START = 7 * 60 * MINUTE;
export const operations = { createRun, createPerson, step, inspect, preview, exportRun, restoreRun, replay };
export function need<T>(result: Result<T>): T {
  if (!result.ok) throw new Error(`${result.error.code} ${result.error.path}: ${result.error.message}`);
  return result.value;
}
export function exampleSpec(seed = 7): RunSpec {
  const demands = { effort: 0, focus: 0, mode: 'awake' as const, requires: {} };
  return {
    id: 'example',
    seed,
    start: START,
    host: { id: 'world', edition: 'example4-1', schema: 'example4-1' },
    definitions: {
      actions: ['wait', 'rest', 'work'].map((id) => ({
        id,
        label: id,
        demands: { ...demands, effort: id === 'work' ? 0.4 : 0 },
        tags: id === 'rest' ? ['rest'] : [],
        norms: [],
      })),
      norms: [],
      marriageCustoms: [],
      skills: [],
      skillTransfers: [],
      methods: [],
      routines: [],
      sources: [
        { type: 'host', id: 'world' },
        { type: 'voice', id: 'player' },
      ],
      lexicon: { names: {}, roles: {}, prefer: 'name', actions: {} },
      calendar: {
        id: 'calendar',
        epoch: { id: 'epoch', simulationAt: 0, dayIndex: 0, msOfDay: 0 },
        dayMs: 86400000,
        days: [
          { dayIndex: 0, start: 0, windows: [] },
          { dayIndex: 1, start: DAY, windows: [] },
        ],
      },
    },
    lifecycle: { kinPremises: [], kinScopes: [] },
    world: { revision: 0, facts: [], hostState: { completed: 0, active: [] } },
  };
}
export function authoredPerson(id: string, name: string, sex: 'female' | 'male' = 'female'): PersonAuthoring {
  return {
    id,
    identity: { name, birthAt: START - 30 * 365 * DAY, sex },
    biography: [],
    origin: {
      kind: 'authored',
      basis: { kind: 'evidence', id: `author:${id}` },
      traits: { kind: 'explicit-authoring', evidence: { kind: 'evidence', id: `traits:${id}` } },
    },
    state: {
      traits: {
        honesty: 0.5,
        emotionality: 0.5,
        extraversion: 0.5,
        agreeableness: 0.5,
        conscientiousness: 0.5,
        openness: 0.5,
      },
      values: {
        benevolence: 0.5,
        universalism: 0.5,
        tradition: 0.5,
        conformity: 0.5,
        security: 0.5,
        achievement: 0.5,
        power: 0.5,
        hedonism: 0.5,
        stimulation: 0.5,
        selfDirection: 0.5,
      },
      body: {
        satiety: 0.8,
        hydration: 0.85,
        sleepPressure: 0.2,
        exertion: 0,
        fitness: 0.5,
        health: 1,
        pain: 0,
        sleepDebtHours: 0,
        depletion: 0,
        circadianPeakMs: 16 * 60 * MINUTE,
        asleep: false,
        since: START,
        doze: {
          context: { posture: 'upright', stimulation: 0.5 },
          basis: { kind: 'authored', author: 'world', at: START },
        },
        bladder: { fill: 0, pending: 0 },
        injuries: [],
        illnesses: [],
        exposures: [],
      },
      needs: {
        safety: 0.8,
        belonging: 0.7,
        esteem: 0.6,
        autonomy: 0.7,
        competence: 0.6,
        leisure: 0.6,
        meaning: 0.6,
      },
      skills: [],
      heldNorms: [],
      beliefs: [],
      consequences: [],
      sourceTrust: [],
      context: {
        scarcity: { kind: 'prior', value: 0, basis: 'engineering:source-zero-context' },
        smoking: { kind: 'unobserved' },
      },
      relationships: [],
      voices: [{ voiceId: 'player', trust: 0.5 }],
      agenda: {
        exemptions: { traveling: { kind: 'unobserved' }, illnessSeverity: { kind: 'unobserved' } },
        commitments: [],
        goals: [],
        precommitments: [],
        owed: [],
      },
      family: { contactCovered: [], aptitudes: {} },
      groups: [],
      reserve: {},
      retention: { trace: 32, chronicleDays: 120 },
      habits: [],
      expectations: [],
      affect: { mood: { valence: 0, arousal: 0.3 }, regulation: 0.3, emotions: [] },
      promptings: { reading: 'none', responses: [] },
      review: { style: 'accounting', atMsOfDay: 21 * 60 * MINUTE },
      bonds: { courtships: [], marriages: [] },
    },
  };
}
export function exampleOffers(
  person: string,
  actions: readonly ('wait' | 'rest' | 'work')[] = ['wait'],
): Offer[] {
  return actions.map((actionId) => ({
    id: actionId,
    actionId,
    label: actionId,
    person,
    durationMs: 15 * MINUTE,
    participants: [],
    alongside: [],
    demands: { effort: actionId === 'work' ? 0.4 : 0, focus: 0, mode: 'awake', requires: {} },
    tags: actionId === 'rest' ? ['rest'] : [],
    norms: [],
    expected: { needs: {}, followedBy: [], provenance: ['authored:example4'] },
    fulfills: [],
    advances: [],
    diminishes: [],
  }));
}
export function openingInputs(people: readonly { id: string; offers: readonly Offer[] }[]): Input[] {
  return people.flatMap(({ id, offers }) => [
    {
      id: `host:0-offers:${id}:1`,
      at: START,
      source: { type: 'host', id: 'world' },
      kind: 'offers.received',
      payload: { person: id, revision: 1, offers },
    },
    {
      id: `host:1-decision:${id}:1`,
      at: START,
      source: { type: 'host', id: 'world' },
      kind: 'decision.requested',
      payload: { person: id, reason: 'example opening', treatment: 'ordinary', offerRevision: 1 },
    },
  ]);
}

type Active = { id: string; person: string; offerId: string; actionId: string; start: number };
export type ExampleHost = { revision: number; completed: number; active: Active[] };
export function freshHost(): ExampleHost {
  return { revision: 0, completed: 0, active: [] };
}
const hostState = (host: ExampleHost) => ({
  completed: host.completed,
  active: host.active.map((a) => ({ ...a })),
});
const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
/** Decode only this host's own schema. HF validates its archive; the host still validates its data. */
export function restoredHost(archive: DeepReadonly<RunArchive>): ExampleHost {
  if (
    archive.host.id !== 'world' ||
    archive.host.edition !== 'example4-1' ||
    archive.host.schema !== 'example4-1'
  )
    throw new Error('Unsupported example host schema');
  const data = archive.current.world.hostState;
  if (
    !object(data) ||
    Object.keys(data).sort().join(',') !== 'active,completed' ||
    typeof data.completed !== 'number' ||
    !Number.isSafeInteger(data.completed) ||
    data.completed < 0 ||
    !Array.isArray(data.active)
  )
    throw new Error('Invalid example host state');
  const active: Active[] = [];
  for (const a of data.active) {
    if (
      !object(a) ||
      Object.keys(a).sort().join(',') !== 'actionId,id,offerId,person,start' ||
      typeof a.id !== 'string' ||
      typeof a.person !== 'string' ||
      typeof a.offerId !== 'string' ||
      typeof a.actionId !== 'string' ||
      typeof a.start !== 'number' ||
      !Number.isSafeInteger(a.start)
    )
      throw new Error('Invalid example active action');
    active.push({ id: a.id, person: a.person, offerId: a.offerId, actionId: a.actionId, start: a.start });
  }
  return { revision: archive.current.world.revision, completed: data.completed, active };
}
function resolveRequest(
  host: ExampleHost,
  request: DeepReadonly<HostRequest>,
  offers: ReadonlyMap<string, readonly Offer[]>,
  seen: Set<string>,
): Input {
  if (seen.has(request.id)) throw new Error('Host request already settled');
  const source = { type: 'host' as const, id: 'world' };
  const input = { id: `host:receipt:${request.id}`, at: request.boundaryAt, source };
  if (request.kind === 'communication') {
    // No transport/co-location is authored in this example. No delivery or attention is invented.
    const payload: CommunicationResolution = {
      requestId: request.id,
      requestHash: request.requestHash,
      worldRevision: host.revision,
      speaker: request.speaker,
      emittedItemIds: [],
      received: [],
    };
    seen.add(request.id);
    return { ...input, kind: 'communication.resolved', payload };
  }
  const base = {
    requestId: request.id,
    requestHash: request.requestHash,
    person: request.person,
    activityId: request.activityId,
    stage: request.stage,
    worldRevision: host.revision,
  };
  let payload: ActionResolution;
  if (request.stage === 'start') {
    const offer = offers.get(request.person)?.find((o) => o.id === request.offerId);
    if (!offer) payload = { ...base, disposition: 'rejected', observations: [] };
    else {
      host.active.push({
        id: request.activityId,
        person: request.person,
        offerId: offer.id,
        actionId: offer.actionId,
        start: request.boundaryAt,
      });
      const prior = host.revision++;
      payload = {
        ...base,
        disposition: 'accepted',
        observations: [],
        worldChange: {
          expectedRevision: prior,
          revision: host.revision,
          put: [],
          remove: [],
          hostState: hostState(host),
        },
      };
    }
  } else {
    const index = host.active.findIndex((a) => a.id === request.activityId && a.person === request.person);
    const a = host.active[index];
    if (!a) throw new Error('Host has no accepted action for the settlement');
    const status = request.stage === 'interrupt' ? 'interrupted' : 'completed';
    host.active.splice(index, 1);
    if (status === 'completed') host.completed++;
    const prior = host.revision++;
    payload = {
      ...base,
      disposition: status,
      observations: [],
      outcome: {
        activityId: a.id,
        offerId: a.offerId,
        actionId: a.actionId,
        start: a.start,
        end: request.boundaryAt,
        status,
        evidenceId: `outcome:${request.id}`,
        summary: 'The host recorded this action.',
        actual: { exposures: [], observedProgress: [] },
        fulfills: [],
        advances: [],
      },
      worldChange: {
        expectedRevision: prior,
        revision: host.revision,
        put: [],
        remove: [],
        hostState: hostState(host),
      },
    };
  }
  seen.add(request.id);
  return { ...input, kind: 'action.resolved', payload };
}
/** Follow exact actor boundaries, including requests issued at until. There is no second simulation loop. */
export function serve(
  run: Run,
  host: ExampleHost,
  offers: ReadonlyMap<string, readonly Offer[]>,
  until: number,
  inputs: readonly Input[] = [],
  initial?: DeepReadonly<StepResult>,
): DeepReadonly<StepResult> {
  if (initial && inputs.length) throw new Error('An admitted initial result cannot resubmit its inputs');
  let pending = initial;
  let batch = inputs;
  let staged: ExampleHost | undefined;
  for (let boundary = 0; boundary < 10_000; boundary++) {
    const result = pending ?? need(step(run, { until, inputs: batch }));
    pending = undefined;
    // Publish this host's bounded candidate only after HF admits the whole receipt batch.
    if (staged) {
      host.revision = staged.revision;
      host.completed = staged.completed;
      host.active = staged.active;
      staged = undefined;
    }
    if (result.boundary.type === 'until') {
      if (!result.reachedUntil || result.at !== until) throw new Error('Target was not reached');
      return result;
    }
    // Example IDs are ASCII. Envelope ID order equals request ID order and the revision chain below.
    const candidate: ExampleHost = { ...host, active: host.active.map((a) => ({ ...a })) };
    const seen = new Set<string>(); // only this pending frame; HF owns the settled-request ledger
    staged = candidate;
    batch = [...result.boundary.requests]
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
      .map((request) => resolveRequest(candidate, request, offers, seen));
  }
  throw new Error('Example host boundary admission budget exhausted');
}
export function main() {
  const run = need(createRun(exampleSpec()));
  need(createPerson(run, authoredPerson('ada', 'Ada')));
  const offers = exampleOffers('ada'),
    host = freshHost();
  serve(run, host, new Map([['ada', offers]]), START + 60 * MINUTE, openingInputs([{ id: 'ada', offers }]));
  const view = need(
    inspect(run, { perspective: { kind: 'host' }, people: ['ada'], select: ['summary', 'body', 'events'] }),
  );
  const archive = exportRun(run);
  const restored = need(restoreRun(archive));
  const verified = need(replay(archive));
  if (exportRun(restored).hashes.full !== archive.hashes.full || verified.fullHash !== archive.hashes.full)
    throw new Error('Current archive round-trip/replay mismatch');
  return { archive, view, completed: host.completed, replayVerified: verified.verified };
}
if (isMain(import.meta.url)) {
  const result = main();
  console.log(
    JSON.stringify(
      {
        engine: result.archive.engine,
        at: result.archive.current.at,
        completed: result.completed,
        replayVerified: result.replayVerified,
        people: result.view.people,
      },
      null,
      2,
    ),
  );
}
