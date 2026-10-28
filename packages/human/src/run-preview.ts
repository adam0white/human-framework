/** SCOPE: detached execution of the same runtime, stopping at actual host truth.
 * A person may propose only its own actions and receives only its visible events. */
import { cloneData } from './core/clone.ts';
import { createPerson, createRun } from './run.ts';
import { hashCanonical } from './run-canonical.ts';
import { conditionImpression, imaginedPerson } from './run-imagination.ts';
import { forkKernel, freezeData, readKernel } from './run-kernel.ts';
import { OWNERS } from './run-owners.ts';
import { bodyPerception } from './run-person.ts';
import type * as T from './run-schema.ts';
import { step } from './run-step.ts';
import { validateData } from './run-validation.ts';
import { projectEvents } from './run-view.ts';
export function preview(
  run: T.Run,
  input: T.DeepReadonly<T.PreviewQuery>,
): T.Result<T.DeepReadonly<T.PreviewResult>> {
  const parsed = validateData('PreviewQuery', input);
  if (!parsed.ok) return parsed;
  const query = parsed.value,
    record = readKernel(run);
  if (!record.current.people[query.person])
    return { ok: false, error: { code: 'unknown-id', path: '$.person', message: 'Unknown preview actor' } };
  if (query.perspective.kind === 'person') {
    if (!record.current.people[query.perspective.observer])
      return {
        ok: false,
        error: { code: 'unknown-id', path: '$.perspective.observer', message: 'Unknown observer' },
      };
    const observerId = query.perspective.observer;
    if (observerId !== query.person) {
      // A new run contains only an imagined actor. Its constructor never receives
      // the target. Explicit hypothetical offers are premises, never target truth.
      if (query.bodyForecast !== undefined)
        return {
          ok: false,
          error: {
            code: 'invalid-admission',
            path: '$.bodyForecast',
            message: 'Another person’s body is unknown',
          },
        };
      if (
        query.inputs.some(
          (entry) =>
            entry.at !== record.current.at ||
            !('person' in entry.payload) ||
            entry.payload.person !== query.person ||
            !['offers.received', 'suggestion.received', 'decision.requested'].includes(entry.kind) ||
            (!(entry.source.type === 'host' && entry.source.id === record.spec.host.id) &&
              !(entry.source.type === 'person' && entry.source.id === observerId)),
        )
      )
        return {
          ok: false,
          error: {
            code: 'invalid-admission',
            path: '$.inputs',
            message:
              'Another-person preview accepts only current hypothetical offers, suggestions and decisions; future state is unknown',
          },
        };
      const observer = record.current.people[query.perspective.observer];
      if (!observer) throw new TypeError('Preview observer disappeared');
      const imagined = createRun({
        ...(cloneData(record.spec) as T.RunSpec),
        id: hashCanonical(
          'hf-run4/observer-preview',
          query.person,
          query.perspective.observer,
          record.current.at,
        ),
        seed: 0,
        start: record.current.at,
        lifecycle: { kinPremises: [], kinScopes: [] },
        definitions: { ...(cloneData(record.spec.definitions) as T.Definitions), routines: [] },
        world: { revision: 0, facts: [], hostState: null },
      });
      if (!imagined.ok) return imagined;
      const authored = createPerson(
        imagined.value,
        imaginedPerson(observer, query.person, record.current.at),
      );
      if (!authored.ok) return authored;
      const result = preview(imagined.value, {
        ...query,
        perspective: { kind: 'host' },
        inputs: query.inputs.map((entry) => ({
          ...entry,
          source: { type: 'host', id: record.spec.host.id },
        })),
      });
      if (!result.ok) return result;
      return {
        ok: true,
        value: freezeData({
          ...result.value,
          perspective: query.perspective,
          impression: conditionImpression(observer, query.person, record.current.at),
          knowledgeLimit: [
            'This answer uses only the observer’s held impressions and explicit hypothetical offers and suggestions.',
            'Unknown faculties use neutral engineering priors. Current hidden state, target RNG and future host evidence are never read. Confidence describes evidence, not a calibrated probability of the answer.',
            ...result.value.knowledgeLimit,
          ],
        }),
      };
    }
    for (const entry of query.inputs)
      if (entry.source.type !== 'person' || entry.source.id !== query.person)
        return {
          ok: false,
          error: {
            code: 'invalid-admission',
            path: '$.inputs',
            message: 'Person preview accepts only the observer’s own inputs',
          },
        };
  }
  let bodyForecast: T.DeepReadonly<NonNullable<T.PreviewResult['bodyForecast']>> | undefined;
  if (query.bodyForecast !== undefined) {
    const actor = record.current.people[query.person];
    const continuation = record.current.continuations.find((c) => c.person === query.person);
    if (!actor || !continuation) throw new TypeError('Preview actor continuation disappeared');
    const forecast = OWNERS.body.forecast(actor.body, query.bodyForecast, {
      effective: record.parameters.effective,
      effectiveParametersHash: record.parameters.hash,
      person: query.person,
      at: record.current.at,
      priorAt: record.current.at,
      phase: record.current.cursor.phase,
      fidelity: record.current.cursor.fidelity,
      worldRevision: record.current.world.revision,
      causes: [],
      continuation: continuation.body,
      dozeContinuation: continuation.doze,
      life: { birthAt: actor.life.bornAt },
      environment: actor.ambient.percept,
      ...(actor.family.pregnancy ? { pregnancy: actor.family.pregnancy } : {}),
      perception: bodyPerception(actor, record.current.at),
    });
    if (!forecast.ok) return forecast;
    bodyForecast = { person: query.person, from: record.current.at, spans: forecast.value };
  }
  const fork = forkKernel(run);
  const hypothetical = readKernel(fork);
  hypothetical.spec = {
    ...hypothetical.spec,
    id: hashCanonical(
      'hf-run4/preview-id',
      record.spec.id,
      record.current.at,
      record.current.counters.nextRequest,
      query,
    ),
  };
  if (query.perspective.kind === 'person') {
    const branch = readKernel(fork),
      observer = branch.current.people[query.person];
    if (!observer) throw new TypeError('Preview observer disappeared');
    // Others remain only as the observer's held ties, beliefs and impressions.
    // No omitted body, motive, RNG or future host evidence is filled from truth.
    branch.current = {
      ...branch.current,
      people: { [query.person]: observer },
      continuations: branch.current.continuations.filter((item) => item.person === query.person),
      ownerClocks: branch.current.ownerClocks.filter((item) => item.person === query.person),
      offers: Object.fromEntries(
        Object.entries(branch.current.offers).filter(([person]) => person === query.person),
      ),
      routines: branch.current.routines.filter((routine) => routine.person === query.person),
      queue: branch.current.queue.filter((event) =>
        event.data.kind === 'input'
          ? event.data.input.source.type === 'person' && event.data.input.source.id === query.person
          : event.person === undefined || event.person === query.person,
      ),
    };
  }
  const result = step(fork, {
    until: query.until,
    inputs: query.inputs,
    ...(query.fidelity ? { fidelity: query.fidelity } : {}),
  });
  if (!result.ok) return result;
  const current = readKernel(fork).current;
  const allEvents = [...record.current.events, ...result.value.events];
  const added = new Set(result.value.events.map((event) => event.id));
  const possibilities = projectEvents(
    allEvents,
    query.perspective,
    record.spec.definitions.lexicon,
    record.spec.seed,
    current.receipts.communications,
  ).filter((event) => added.has(event.id));
  const boundary: T.PreviewBoundary =
    result.value.boundary.type === 'until'
      ? { type: 'until' }
      : {
          type: 'world-required',
          requests: result.value.boundary.requests.flatMap(
            (
              request,
            ): (
              | { kind: 'action'; person: T.Id; stage: T.ActionRequest['stage'] }
              | { kind: 'communication'; speaker: T.Id; recipients: readonly T.Id[] }
            )[] => {
              if (
                query.perspective.kind === 'person' &&
                (request.kind === 'action'
                  ? request.person !== query.person
                  : request.speaker !== query.person && !request.recipients.includes(query.person))
              )
                return [];
              return request.kind === 'action'
                ? [{ kind: 'action', person: request.person, stage: request.stage }]
                : [{ kind: 'communication', speaker: request.speaker, recipients: request.recipients }];
            },
          ),
        };
  return {
    ok: true,
    value: freezeData({
      at: result.value.at,
      hypothetical: true,
      ...(bodyForecast ? { bodyForecast } : {}),
      perspective: query.perspective,
      possibilities,
      boundary,
      knowledgeLimit: [
        'Host outcomes remain unresolved until actual host evidence is received.',
        ...(bodyForecast
          ? [
              'Body spans condition on declared loads and current ambient evidence; they do not promise action admission, host outcomes or other people’s behavior.',
            ]
          : []),
        ...(query.perspective.kind === 'person'
          ? [
              'Other people are represented only by the observer’s held evidence. Unknown bodies, motives and autonomous actions are not simulated. Future host evidence is unknown.',
            ]
          : []),
      ],
    }),
  };
}
