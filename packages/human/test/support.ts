/** Complete authored data and actual public Run constructors. No partial Person casts or legacy wrappers. */

import { authoredPerson, exampleSpec, need } from '../examples/minimal.ts';
import { createPerson, createRun, exportRun } from '../src/index.ts';
import type {
  ActionRequest,
  ActionResolution,
  DeepReadonly,
  Input,
  PersonAuthoring,
  Run,
  RunSpec,
  StepResult,
} from '../src/run-schema.ts';

export {
  authoredPerson,
  DAY,
  exampleOffers,
  exampleSpec,
  freshHost,
  MINUTE,
  need,
  openingInputs,
  restoredHost,
  START,
  serve,
} from '../examples/minimal.ts';

/** Valid fixture authoring only. Malformed-input controls call the public admission boundary directly. */
export function setup(
  people: readonly PersonAuthoring[] = [authoredPerson('ada', 'Ada')],
  input: RunSpec = exampleSpec(),
): Run {
  const spec = structuredClone(input);
  const sources = new Map(spec.definitions.sources.map((source) => [`${source.type}:${source.id}`, source]));
  for (const person of people) sources.set(`person:${person.id}`, { type: 'person', id: person.id });
  spec.definitions.sources = [...sources.values()];
  const run = need(createRun(spec));
  for (const person of people) need(createPerson(run, person));
  return run;
}

/** Cold test checkpoint only; performance hosts use selected pure reads instead of serializing history. */
export function actor(run: Run, id = 'ada') {
  const person = exportRun(run).current.people[id];
  if (!person) throw new Error(`Missing authored actor ${id}`);
  return person;
}

/** Select an actual issued request. Ambiguous or missing boundaries fail the control. */
export function actionRequest(
  result: DeepReadonly<StepResult>,
  stage: ActionRequest['stage'],
  person = 'ada',
) {
  if (result.boundary.type !== 'world-required') throw new Error('Missing actual host boundary');
  const matches = result.boundary.requests.filter(
    (request) => request.kind === 'action' && request.stage === stage && request.person === person,
  );
  const request = matches[0];
  if (matches.length !== 1 || !request || request.kind !== 'action')
    throw new Error('Missing unambiguous action request');
  return request;
}

/** The caller supplies the current projected revision. Issued identity and hash never change. */
export function resolutionInput(
  request: DeepReadonly<ActionRequest>,
  revision: number,
  settlement: Pick<ActionResolution, 'disposition' | 'observations' | 'outcome' | 'worldChange'>,
): Input<'action.resolved'> {
  return {
    id: `host:receipt:${request.id}`,
    at: request.boundaryAt,
    source: { type: 'host', id: 'world' },
    kind: 'action.resolved',
    payload: {
      requestId: request.id,
      requestHash: request.requestHash,
      person: request.person,
      activityId: request.activityId,
      stage: request.stage,
      worldRevision: revision,
      ...settlement,
    },
  };
}
