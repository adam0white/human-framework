/** SCOPE G5: source-authored seed-7 recipient; natural tick-57 doze and actual nearby delivery.
 * Premises come from the retained Left Hand 4.5.1 reproducer. No runtime Person/RNG patch or host wake rule.
 */
import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { createPerson, createRun, exportRun, replay, restoreRun, step } from '../src/index.ts';
import type { Input, PersonAuthoring, RunSpec } from '../src/run-schema.ts';
import { need } from './support.ts';

const fixture: { spec: RunSpec; person: PersonAuthoring } = JSON.parse(
  readFileSync(new URL('./fixtures/voice-delivery-seed7.json', import.meta.url), 'utf8'),
);

test('seed-7 recipient naturally dozes at tick 57 and wakes on an actual near knock', () => {
  const run = need(createRun(fixture.spec));
  need(createPerson(run, fixture.person));
  const person = fixture.person.id;
  let tick = 0;
  for (tick = 1; tick <= 600; tick++) {
    need(step(run, { until: fixture.spec.start + tick * 1000, inputs: [] }));
    if (exportRun(run).current.people[person]?.body.asleep) break;
  }
  expect(tick).toBe(57);
  const before = exportRun(run).current.people[person]?.body;
  expect(before?.asleep).toBe(true);
  expect(before?.doze.since).toBeDefined();
  // Advance quietly before delivery, the interval that lost the marker in 4.5.1.
  const at = fixture.spec.start + (tick + 1) * 1000;
  need(step(run, { until: at - 1, inputs: [] }));
  const checkpoint = exportRun(run);
  expect(checkpoint.current.people[person]?.body.doze.since).toBe(before?.doze.since);
  const restored = need(restoreRun(JSON.parse(JSON.stringify(checkpoint))));
  const delivery: Input<'observation.received'> = {
    id: 'door-delivery',
    at,
    source: { type: 'host', id: fixture.spec.host.id },
    kind: 'observation.received',
    payload: {
      person,
      evidenceId: 'heard-delivery',
      percepts: [
        {
          id: 'door-knock',
          occurredAt: at,
          channel: 'heard',
          kind: 'knock',
          actorId: 'yusuf',
          targetId: person,
          near: true,
          salience: 0.9,
          summary: 'Yusuf knocks at the nearby door.',
          claims: [],
          norms: [],
          advice: [],
          consequences: [],
          withdrawConsequences: [],
          witnesses: [],
          reports: [],
          provenance: ['authored:g5-control'],
        },
      ],
    },
  };
  const result = need(step(run, { until: at, inputs: [delivery] }));
  need(step(restored, { until: at, inputs: [delivery] }));
  const after = exportRun(run).current.people[person]?.body;
  expect(after?.asleep).toBe(false);
  expect(after?.doze.since).toBeUndefined();
  expect(after?.lastSleep).toEqual({ from: before?.since, to: at });
  expect(
    result.events.some(
      (event) =>
        event.data.kind === 'body-change' &&
        event.data.change.kind === 'woke' &&
        event.data.change.evidenceId === 'door-knock',
    ),
  ).toBe(true);
  expect(exportRun(restored)).toEqual(exportRun(run));
  const archive = exportRun(run);
  expect(need(replay(archive)).fullHash).toBe(archive.hashes.full);
});
