/** SCOPE: the daily clock is a first-class larger step (rulings 6, 14). A three-day daily run
 * through the public API completes; whole-run and per-day chunkings reach the same clocks,
 * counters, RNG and event sequence (ruling 26); the export replays to its own hash.
 * Day 1 carries the fixture's meals and sleep; days 2 and 3 run without inputs, so the
 * stores drain and reach their floors inside hours-wide daily cells.
 */
import { expect, it } from 'vitest';
import { createPerson, createRun, exportRun, replay, step } from '../src/index.ts';
import type { Fidelity, Input, Run } from '../src/run-schema.ts';
import {
  accepted,
  DAY,
  HOST,
  HOUR,
  numericalPerson,
  numericalSpec,
  PERSON,
  semanticInputs,
} from './run-numerical-fixture.ts';

const DAILY: Fidelity = { mode: 'daily', dayMs: 86_400_000, anchor: 0 };

function drive(run: Run, stops: readonly number[]) {
  const inputs = semanticInputs(),
    events: unknown[] = [];
  let sent = 0;
  for (const until of stops) {
    const due: Input[] = [];
    while (sent < inputs.length && (inputs[sent]?.at ?? Infinity) <= until) due.push(inputs[sent++] as Input);
    let result = accepted(step(run, { until, fidelity: DAILY, inputs: due }));
    events.push(...result.events);
    for (let n = 0; result.boundary.type === 'world-required'; n++) {
      if (n >= 32) throw new Error('request cycle');
      const at = result.at;
      const responses: Input[] = result.boundary.requests.map((request) => {
        if (request.kind !== 'action') throw new Error(`unexpected request ${request.kind}`);
        return {
          id: `accept-${request.id}`,
          at,
          source: HOST,
          kind: 'action.resolved',
          payload: {
            requestId: request.id,
            requestHash: request.requestHash,
            person: request.person,
            activityId: request.activityId,
            stage: request.stage,
            worldRevision: request.worldRevision,
            disposition: request.stage === 'start' ? 'accepted' : 'completed',
            ...(request.stage === 'finish'
              ? {
                  outcome: {
                    activityId: request.activityId,
                    offerId: request.offerId,
                    actionId: 'sleep',
                    start: 16 * HOUR,
                    end: at,
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
        } as Input;
      });
      result = accepted(step(run, { until, fidelity: DAILY, inputs: responses }));
      events.push(...result.events);
    }
    expect(result.at).toBe(until);
  }
  return events;
}

function fresh() {
  const run = accepted(createRun(numericalSpec(1)));
  accepted(createPerson(run, numericalPerson(1)));
  return run;
}

it('runs three daily-clock days, chunking-independent and replaying exactly', () => {
  const whole = fresh(),
    days = fresh();
  const wholeEvents = drive(whole, [3 * DAY]);
  const dayEvents = drive(days, [DAY, 2 * DAY, 3 * DAY]);
  const a = exportRun(whole).current,
    b = exportRun(days).current;
  expect(a.at).toBe(3 * DAY);
  expect(a.people[PERSON]?.body.alive).toBe(true);
  expect(wholeEvents.length).toBeGreaterThan(0);
  expect(dayEvents).toEqual(wholeEvents);
  expect(b.ownerClocks).toEqual(a.ownerClocks);
  expect(b.rng).toEqual(a.rng);
  expect(b.people[PERSON]?.rng).toEqual(a.people[PERSON]?.rng);
  expect(b.counters.nextEvent).toBe(a.counters.nextEvent);
  // The stores drained through their floors inside daily cells; the floor holds them at 0.
  const bodyA = a.people[PERSON]?.body,
    bodyB = b.people[PERSON]?.body;
  if (!bodyA || !bodyB) throw new Error('missing body');
  expect([bodyA.satiety, bodyA.hydration]).toEqual([0, 0]);
  for (const key of ['satiety', 'hydration', 'sleepPressure', 'fitness', 'health', 'sleepDebtHours'] as const)
    expect(Math.abs(bodyB[key] - bodyA[key]), key).toBeLessThanOrEqual(1e-9);
  const archive = exportRun(days),
    reproduced = accepted(replay(archive));
  expect(reproduced.fullHash).toBe(archive.hashes.full);
});
