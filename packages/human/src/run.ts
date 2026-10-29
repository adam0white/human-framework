/** SCOPE: public run entry points. Definitions and effective parameters are admitted
 * once. Full history materialization and canonical hashes belong to cold export.
 */
import { cloneData } from './core/clone.ts';
import { installPortable, preparePortable } from './portable-admission.ts';
import { checkPersonAuthoring, checkRunSpec, PORTABLE_ADMISSION_REJECTED } from './run-admission.ts';
import { archiveHashes, archiveSnapshot, expandedArchive } from './run-archive.ts';
import { hashCanonical } from './run-canonical.ts';
import { Frame } from './run-dispatch.ts';
import { RUN_ENGINE } from './run-engine.ts';
import { packHistory } from './run-history.ts';
import { inspectCurrentRun } from './run-inspect.ts';
import { validateActor } from './run-integrity.ts';
import { exportJournal, restoreJournal } from './run-journal.ts';
import {
  commitTransaction,
  freezeData,
  historyEntries,
  makeKernel,
  readKernel,
  stageTransaction,
} from './run-kernel.ts';
import { inspectLifecycle } from './run-lifecycle.ts';
import { OWNERS } from './run-owners.ts';
import { buildParameters } from './run-parameters.ts';
import { constructAuthoredActor, installPrayerCalendar } from './run-person.ts';
import { replayCurrentRun, restoreCurrentRun } from './run-recovery.ts';
import { calendarSchedule } from './run-scheduler.ts';
import type * as T from './run-schema.ts';
import { step } from './run-step.ts';
import { validateData } from './run-validation.ts';

export function createRun(spec: T.RunSpec): T.Result<T.Run> {
  const admitted = checkRunSpec(spec);
  if (!admitted.ok) return admitted;
  const parameters = buildParameters(admitted.value.tuning);
  if (!parameters.ok) return parameters;
  const run = makeKernel(admitted.value, parameters.value);
  readKernel(run).current.queue = calendarSchedule(admitted.value);
  return { ok: true, value: run };
}

export function createPerson(run: T.Run, input: T.DeepReadonly<T.PersonAuthoring>): T.Result<T.PersonId> {
  const record = readKernel(run);
  // Checked before the schema so every portable input, well-formed or not, gets the one documented rejection.
  if (typeof input === 'object' && input !== null && Object.hasOwn(input, 'admission'))
    return {
      ok: false,
      error: {
        code: 'invalid-admission',
        path: '$.admission',
        message: PORTABLE_ADMISSION_REJECTED,
      },
    };
  let prepared: ReturnType<typeof preparePortable>;
  try {
    const structural = validateData('PersonAuthoring', input);
    if (!structural.ok) return structural;
    prepared = preparePortable(structural.value, record.spec.definitions, record.current.at, [
      ...Object.keys(record.current.people),
      ...record.current.lifecycle.entities.map((e) => e.id),
    ]);
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    return { ok: false, error: { code: 'invalid-admission', path: '$.portable', message: error.message } };
  }
  const admitted = checkPersonAuthoring(
    record.current,
    record.spec.definitions,
    record.started,
    prepared.authored,
  );
  if (!admitted.ok) return admitted;
  const person = admitted.value;
  const context: T.FrameContext = {
    effective: record.parameters.effective,
    effectiveParametersHash: record.parameters.hash,
    person: person.id,
    at: record.current.at,
    priorAt: record.current.at,
    phase: 0,
    fidelity: record.current.cursor.fidelity,
    worldRevision: record.current.world.revision,
    causes: [person.origin.basis.id],
  };
  let built: ReturnType<typeof constructAuthoredActor>;
  try {
    built = constructAuthoredActor(person, context, record.spec.seed, OWNERS);
    if (prepared.retained) installPortable(built, prepared.retained);
    installPrayerCalendar(built, record.spec.definitions, context.at);
    const issues = validateActor(
      built.actor,
      built.continuation,
      built.allocations,
      context.at,
      record.parameters.hash,
      OWNERS,
    );
    const first = issues[0];
    if (first)
      return { ok: false, error: { code: 'invalid-admission', path: first.path, message: first.message } };
  } catch (error) {
    if (!(error instanceof RangeError || error instanceof TypeError)) throw error;
    return { ok: false, error: { code: 'invalid-admission', path: '$.state', message: error.message } };
  }
  const stage = stageTransaction(run);
  stage.current.people = { ...stage.current.people, [person.id]: built.actor };
  stage.current.continuations = [...stage.current.continuations, built.continuation];
  stage.current.ownerClocks = [...stage.current.ownerClocks, ...built.clocks];
  stage.current.lifecycle = {
    ...stage.current.lifecycle,
    entities: stage.current.lifecycle.entities.some((entity) => entity.id === person.id)
      ? stage.current.lifecycle.entities
      : [...stage.current.lifecycle.entities, { kind: 'entity', id: person.id }],
    origins: [
      ...stage.current.lifecycle.origins,
      { person: person.id, origin: { kind: 'authored', basis: person.origin.basis } },
    ],
  };
  for (const reference of built.allocations)
    stage.receipts.allocated.push({
      scope: { kind: 'person', person: person.id },
      reference,
      allocatedAt: context.at,
    });
  for (const data of built.constructionEvents) {
    const ordinal = stage.current.counters.nextEvent++;
    if (!Number.isSafeInteger(stage.current.counters.nextEvent))
      return {
        ok: false,
        error: { code: 'limit-exceeded', path: '$.counters.nextEvent', message: 'event counter exhausted' },
      };
    stage.events.push({
      id: hashCanonical('hf-run4/event-id', record.spec.id, ordinal),
      at: context.at,
      phase: 0,
      person: person.id,
      causeIds: context.causes,
      data,
      narration: [],
    });
  }
  const effects = [
    ...built.constructionEffects.terms,
    ...built.constructionEffects.modifiers,
    ...built.constructionEffects.appraisals,
  ];
  stage.current.effects = [...stage.current.effects, ...effects];
  stage.current.queue = [
    ...stage.current.queue,
    ...effects.map(
      (effect): T.ScheduledEvent => ({
        id: hashCanonical('hf-run4/scheduled-effect', effect.id),
        at: effect.at,
        phase: effect.applyPhase,
        person: effect.person,
        causalId: effect.cause,
        localOrdinal: 0,
        data: { kind: 'effect', effect },
      }),
    ),
  ];
  // This is still the authored opening, so further declared cast members may be
  // constructed. No accepted transaction or fake social observation is recorded.
  new Frame(record, stage).installDefinitionRoutines(person.id);
  commitTransaction(run, stage, false);
  // Keep the portable input for replay, with the identity actually admitted.
  // Retained birth date and sex replace the receiving opening's placeholders.
  record.initialPeople = [
    ...record.initialPeople,
    input.portable ? { ...cloneData(input), identity: cloneData(person.identity) } : person,
  ];
  return { ok: true, value: person.id };
}

/** Decode a current archive's complete accepted inputs for tools and host evidence.
 * This pure reader enforces the closed history schema; restore/replay separately
 * verify engine identity, hashes and executed outcomes before accepting a run.
 */
export function readRunHistory(
  archive: T.DeepReadonly<T.RunArchive>,
): T.DeepReadonly<readonly T.AcceptedTransaction[]> {
  const admitted = validateData('RunArchive', archive);
  if (!admitted.ok) throw new TypeError(admitted.error.message);
  return freezeData(expandedArchive(admitted.value).history);
}

/** Complete native archive for downloads and playtest replay exports. */
export function exportRun(run: T.Run): T.DeepReadonly<T.RunArchive> {
  const record = readKernel(run);
  const body = {
    format: 'hf-run' as const,
    version: 7 as const,
    engine: RUN_ENGINE,
    host: record.spec.host,
    initial: {
      spec: record.spec,
      effective: record.parameters.effective,
      parameterProvenance: record.parameters.provenance,
      people: record.initialPeople,
    },
    history: packHistory(historyEntries(run)),
    current: archiveSnapshot(record.current),
  };
  // The caller cannot freeze or mutate private live state through an export.
  return freezeData(cloneData({ ...body, hashes: archiveHashes(body) }));
}

export function inspect(
  run: T.Run,
  input: T.DeepReadonly<T.InspectQuery>,
): T.Result<T.DeepReadonly<T.Inspection>> {
  const parsed = validateData('InspectQuery', input);
  if (!parsed.ok) return parsed;
  const { lifecycle, ...query } = parsed.value;
  if (new Set(query.select).size !== query.select.length)
    return {
      ok: false,
      error: { code: 'duplicate-id', path: '$.select', message: 'Duplicate inspection selection' },
    };
  const result = inspectCurrentRun(run, query);
  if (!result.ok) return result;
  let value: T.DeepReadonly<T.Inspection> = result.value;
  if (lifecycle) {
    const life = inspectLifecycle(run, lifecycle, query.perspective);
    if (!life.ok) return life;
    value = { ...value, lifecycle: life.value };
  }
  return { ok: true, value: freezeData(cloneData(value)) };
}
export { preview } from './run-preview.ts';
export { step } from './run-step.ts';

export function restoreRun(input: unknown): T.Result<T.Run> {
  const restored = restoreCurrentRun(input, { createRun, createPerson, step, exportRun });
  if (!restored.ok) return restored;
  const record = readKernel(restored.value);
  for (const actor of Object.values(record.current.people))
    if (actor.activity && !record.activityOffers.has(actor.activity.id))
      return {
        ok: false,
        error: {
          code: 'invalid-admission',
          path: `$.current.people.${actor.id}.activity`,
          message: 'Activity lacks an original start offer revision',
        },
      };
  return restored;
}
export function replay(input: unknown): T.Result<T.DeepReadonly<T.ReplayResult>> {
  return replayCurrentRun(input, { createRun, createPerson, step, exportRun });
}

/** Autosave only: persist the returned head and chunks atomically with the matching host snapshot
 * before replacing a prior cursor. A retained cursor supports deterministic retry. */
export function exportRunJournal(
  run: T.Run,
  cursor?: T.RunJournalCursor,
): T.Result<T.DeepReadonly<T.RunJournalExport>> {
  return exportJournal(run, cursor);
}
/** Recover an autosave by executing and validating its complete committed journal prefix. */
export function restoreRunJournal(input: unknown): T.Result<T.DeepReadonly<T.RunJournalRestored>> {
  return restoreJournal(input, { createRun, createPerson, step, exportRun });
}
