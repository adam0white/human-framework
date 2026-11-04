/** SCOPE: detached execution of the same runtime, stopping at actual host truth.
 * A person may propose only its own actions and receives only its visible events. */
import { observerBodyAssumptions, projectObserverBody } from './body/body.ts';
import { cloneData } from './core/clone.ts';
import { createPerson, createRun } from './run.ts';
import { hashCanonical } from './run-canonical.ts';
import { conditionImpression, imaginedPerson } from './run-imagination.ts';
import { inspectCurrentRun } from './run-inspect.ts';
import { forkKernel, freezeData, readKernel } from './run-kernel.ts';
import { OWNERS } from './run-owners.ts';
import { bodyPerception } from './run-person.ts';
import type * as T from './run-schema.ts';
import { step } from './run-step.ts';
import { validateData } from './run-validation.ts';
import { projectEvents } from './run-view.ts';
import { impressionOf } from './social/impressions.ts';
export function preview(
  run: T.Run,
  input: T.DeepReadonly<T.PreviewQuery>,
): T.Result<T.DeepReadonly<T.PreviewResult>> {
  const parsed = validateData('PreviewQuery', input);
  if (!parsed.ok) return parsed;
  if (
    input.select &&
    new Set(input.select).size !== input.select.length &&
    !(
      input.bodyForecast !== undefined &&
      input.perspective.kind === 'person' &&
      input.perspective.observer !== input.person
    )
  )
    return { ok: false, error: { code: 'duplicate-id', path: '$.select', message: 'duplicate selection' } };
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
      if (query.bodyForecast !== undefined) {
        const now = record.current.at;
        const spans = query.bodyForecast;
        const fail = (code: 'invalid-admission' | 'limit-exceeded', message: string): T.Result<never> => ({
          ok: false,
          error: { code, path: '$.bodyForecast', message },
        });
        if (query.inputs.length || query.select?.length || query.fidelity !== undefined)
          return fail(
            'invalid-admission',
            'Observer body loads require empty inputs, no selection and no fidelity',
          );
        const physical: T.BodyKernelEffective = {
          builtins: {
            BODY_DEFAULTS: record.parameters.effective.builtins.BODY_DEFAULTS,
            ENVIRONMENT_DEFAULTS: record.parameters.effective.builtins.ENVIRONMENT_DEFAULTS,
            BLADDER_DEFAULTS: record.parameters.effective.builtins.BLADDER_DEFAULTS,
            LIFE_DEFAULTS: record.parameters.effective.builtins.LIFE_DEFAULTS,
            INJURY_DEFAULTS: record.parameters.effective.builtins.INJURY_DEFAULTS,
            DOZE_DEFAULTS: record.parameters.effective.builtins.DOZE_DEFAULTS,
            FAMILY_DEFAULTS: record.parameters.effective.builtins.FAMILY_DEFAULTS,
            FORECAST_DEFAULTS: record.parameters.effective.builtins.FORECAST_DEFAULTS,
          },
          doze: { hazardScale: record.parameters.effective.doze.hazardScale },
          fixedPriors: { downing: record.parameters.effective.fixedPriors.downing },
        };
        if (!spans.length || spans.length > 4 || spans.length > physical.builtins.FORECAST_DEFAULTS.maxSpans)
          return fail(
            'limit-exceeded',
            'Observer body projection requires 1–4 spans within the source limit',
          );
        const labels = new Set<string>();
        let duration = 0;
        for (const span of spans) {
          if (!span.label.trim() || labels.has(span.label))
            return fail('invalid-admission', 'Labels must be unique and nonblank');
          labels.add(span.label);
          if (!Number.isSafeInteger(span.durationMs) || span.durationMs <= 0)
            return fail('invalid-admission', 'Positive safe integer durations required');
          if (
            ![span.load.effort, span.load.focus].every((n) => Number.isFinite(n) && n >= 0 && n <= 1) ||
            !['awake', 'sleep'].includes(span.load.mode)
          )
            return fail('invalid-admission', 'Finite unit effort/focus and awake/sleep mode required');
          duration += span.durationMs;
          if (!Number.isSafeInteger(duration) || !Number.isSafeInteger(now + duration))
            return fail('limit-exceeded', 'Observer projection time overflow');
        }
        if (duration > Math.min(86400000, physical.builtins.FORECAST_DEFAULTS.maxMinutes * 60000))
          return fail('limit-exceeded', 'Observer projection exceeds the source horizon or 24 hours');
        if (query.until !== now + duration)
          return fail('invalid-admission', 'until must equal current time plus all declared spans');
        const observer = record.current.people[observerId];
        if (!observer) throw new TypeError('Preview observer disappeared');
        const held = impressionOf(observer, query.person, now).cues.find((cue) => cue.key === 'fatigue');
        let evidence: T.ObserverBodyEvidence | undefined;
        let reason: Extract<T.ObserverBodyProjection, { status: 'unavailable' }>['reason'] | undefined;
        if (!held) reason = 'unseen';
        else {
          evidence = { key: 'fatigue', fatigueValue: held.value, confidence: held.confidence };
          if (![held.value, held.confidence].every((n) => Number.isFinite(n) && n >= 0 && n <= 1))
            return fail('invalid-admission', 'Held fatigue and confidence must be finite unit values');
          else if (held.seenAt === undefined) reason = 'unknown-age';
          else {
            const ageMs = now - held.seenAt;
            if (
              !Number.isSafeInteger(now) ||
              !Number.isSafeInteger(held.seenAt) ||
              !Number.isSafeInteger(ageMs) ||
              ageMs < 0
            )
              return fail('invalid-admission', 'Held evidence requires safe nonfuture timestamps and age');
            else {
              evidence.seenAt = held.seenAt;
              evidence.ageMs = ageMs;
              if (held.confidence < 0.12) reason = 'weak-evidence';
              else if (ageMs > 43200000) reason = 'stale-evidence';
            }
          }
        }
        let projected: T.Result<T.ObserverBodyProjection>;
        if (reason) projected = { ok: true, value: { status: 'unavailable', reason } };
        else {
          if (!evidence) throw new TypeError('Observer fatigue evidence disappeared');
          projected = projectObserverBody(evidence.fatigueValue, now, spans, physical);
        }
        if (!projected.ok) return projected;
        return {
          ok: true,
          value: freezeData({
            at: now,
            hypothetical: true,
            perspective: query.perspective,
            possibilities: [],
            boundary: { type: 'until' },
            bodyForecast: {
              kind: 'observer-conditional',
              person: query.person,
              from: now,
              ...(evidence ? { evidence } : {}),
              assumptions: observerBodyAssumptions,
              projection: projected.value,
            },
            knowledgeLimit: observerBodyAssumptions,
          }),
        };
      }
      // The ordinary offer preview constructs only an imagined actor. Explicit
      // hypothetical offers are premises, never target truth.
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
      const actor = imaginedPerson(observer, query.person, record.current.at, record.spec.definitions);
      const heldReferences = actor.state.relationships.map((tie) => ({
        id: hashCanonical('hf-run4/held-reference', tie.otherId),
        subject: tie.otherId,
        predicate: 'observer-held-reference',
        value: true,
        at: record.current.at,
        provenance: { source: record.spec.host.id, evidenceId: 'observer-impression-prior' },
      }));
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
        world: { revision: 0, facts: heldReferences, hostState: null },
      });
      if (!imagined.ok) return imagined;
      const authored = createPerson(imagined.value, actor);
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
          ...(query.select ? { reading: selectedReading(run, query) } : {}),
          impression: conditionImpression(observer, query.person, record.current.at),
          knowledgeLimit: [
            'This answer uses only the observer’s held impressions and explicit hypothetical offers and suggestions.',
            'The target’s age and sex are unknown. A 30-year-old female constructor prior is required by the actor schema and can affect this conditional forecast.',
            'Unknown faculties use neutral engineering priors. Current hidden state, target RNG and future host evidence are never read. Confidence describes evidence, not a calibrated probability of the answer.',
            ...result.value.knowledgeLimit,
          ],
        }),
      };
    }
    for (const entry of query.inputs)
      if (
        !(entry.source.type === 'person' && entry.source.id === query.person) &&
        !(
          entry.source.type === 'host' &&
          entry.source.id === record.spec.host.id &&
          'person' in entry.payload &&
          entry.payload.person === query.person &&
          ['offers.received', 'suggestion.received', 'decision.requested'].includes(entry.kind)
        )
      )
        return {
          ok: false,
          error: {
            code: 'invalid-admission',
            path: '$.inputs',
            message:
              'Person preview accepts own inputs or scoped hypothetical host offers, suggestions and decisions',
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
    bodyForecast = {
      kind: 'conditional-body',
      person: query.person,
      from: record.current.at,
      spans: forecast.value,
    };
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
      ...(query.select ? { reading: selectedReading(fork, query) } : {}),
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

/** Use the same detached, knowledge-bounded projection as live inspection. */
function selectedReading(run: T.Run, query: T.DeepReadonly<T.PreviewQuery>): T.DeepReadonly<T.PersonView> {
  const result = inspectCurrentRun(run, {
    perspective: query.perspective,
    people: [query.person],
    select: query.select ?? [],
  });
  if (!result.ok) throw new TypeError(result.error.message);
  const person = result.value.people[0];
  if (!person) throw new TypeError('Preview reading disappeared');
  return person;
}
