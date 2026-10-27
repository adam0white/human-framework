/** SCOPE: step-call contract under chunking. An event's phase does not depend on how a host chunks its
 * steps, and a batch that resolves pending requests cannot change the paused fidelity. */
import { expect, test } from 'vitest';
import { createPerson, createRun, exportRun, step } from '../src/index.ts';
import type { Run, StepResult } from '../src/run-schema.ts';
import {
  accepted,
  DAY,
  HOST,
  HOUR,
  numericalPerson,
  numericalSpec,
  semanticInputs,
} from './run-numerical-fixture.ts';

function resolutions(result: StepResult) {
  if (result.boundary.type !== 'world-required') return [];
  return result.boundary.requests.map((request) => {
    if (request.kind !== 'action') throw new Error(`unexpected request ${request.kind}`);
    return {
      id: `accept-${request.id}`,
      at: result.at,
      source: HOST,
      kind: 'action.resolved' as const,
      payload: {
        requestId: request.id,
        requestHash: request.requestHash,
        person: request.person,
        activityId: request.activityId,
        stage: request.stage,
        worldRevision: request.worldRevision,
        disposition: request.stage === 'start' ? ('accepted' as const) : ('completed' as const),
        ...(request.stage === 'finish'
          ? {
              outcome: {
                activityId: request.activityId,
                offerId: request.offerId,
                actionId: 'sleep',
                start: 16 * HOUR,
                end: result.at,
                status: 'completed' as const,
                evidenceId: 'sleep-completed',
                actual: { exposures: [], observedProgress: [] },
                fulfills: [],
                advances: [],
              },
            }
          : {}),
        observations: [],
      },
    };
  });
}

function drive(stops: readonly number[]): Run {
  const run = accepted(createRun(numericalSpec(1)));
  accepted(createPerson(run, numericalPerson(1)));
  const inputs = semanticInputs();
  let sent = 0;
  for (const until of stops) {
    const due = [];
    while (sent < inputs.length && (inputs[sent]?.at ?? Infinity) <= until) due.push(inputs[sent++]);
    let result = accepted(step(run, { until, inputs: due as never }));
    while (result.boundary.type === 'world-required')
      result = accepted(step(run, { until, inputs: resolutions(result as StepResult) as never }));
  }
  return run;
}

test('event phases are the same for hourly steps and one day-long step', () => {
  const phases = (run: Run) => exportRun(run).current.events.map((e) => `${e.data.kind}:${e.phase}`);
  const hourly = drive(Array.from({ length: 24 }, (_, i) => (i + 1) * HOUR));
  expect(phases(drive([DAY]))).toEqual(phases(hourly));
});

test('a resolution batch that names another fidelity is refused', () => {
  const run = accepted(createRun(numericalSpec(1)));
  accepted(createPerson(run, numericalPerson(1)));
  let result = accepted(step(run, { until: DAY, inputs: semanticInputs() }));
  expect(result.boundary.type).toBe('world-required');
  const refused = step(run, {
    until: DAY,
    fidelity: { mode: 'daily', dayMs: 86_400_000, anchor: 0 },
    inputs: resolutions(result as StepResult) as never,
  });
  expect(refused.ok ? null : refused.error.path).toBe('$.fidelity');
  result = accepted(step(run, { until: DAY, inputs: resolutions(result as StepResult) as never }));
  expect(exportRun(run).current.cursor.fidelity.mode).toBe('fine');
});
