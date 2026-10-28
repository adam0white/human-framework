/** SCOPE: daily resolution advances all existing kernels with coarser deterministic
 * numerical cells. Retained body cells are wider than the fine control. The public
 * runtime, fidelity transitions, living state, and current-export replay are real.
 * Fine/daily continuous agreement is bounded separately by numerical control.
 */
import { expect, it } from 'vitest';
import { createPerson, createRun, exportRun, inspect, replay, step } from '../src/index.ts';
import type { Fidelity } from '../src/run-schema.ts';
import { accepted, DAY, numericalPerson, numericalSpec, PERSON } from './run-numerical-fixture.ts';

const DAILY: Fidelity = { mode: 'daily', dayMs: 86_400_000, anchor: 0 };
const FINE: Fidelity = { mode: 'fine' };
function fresh() {
  const spec = numericalSpec(1);
  spec.definitions.skills = [{ id: 'learned-craft', label: 'Learned craft', domain: 'motor' }];
  const run = accepted(createRun(spec));
  const person = numericalPerson(1);
  person.state.skills = [{ id: 'learned-craft', level: 0.6, practicedMs: 3_600_000, lastPracticed: 0 }];
  // No authored action or host settlement hides numerical work in this idle control.
  accepted(createPerson(run, person));
  return run;
}

it('uses larger numerical cells per day and replays fine/daily transitions exactly', () => {
  const fine = fresh();
  accepted(step(fine, { until: DAY, fidelity: FINE, inputs: [] }));
  const fineClock = exportRun(fine).current.continuations[0]?.body;
  const daily = fresh();
  accepted(step(daily, { until: DAY, fidelity: DAILY, inputs: [] }));
  const dailyClock = exportRun(daily).current.continuations[0]?.body;
  const fineWidth = fineClock?.cells[0]?.cell.rightOffsetMinutes ?? 0;
  const dailyWidth = dailyClock?.cells[0]?.cell.rightOffsetMinutes ?? 0;
  expect(dailyWidth).toBeGreaterThan(fineWidth * 2);
  accepted(step(daily, { until: 3 * DAY, fidelity: DAILY, inputs: [] }));
  expect(exportRun(daily).current.people[PERSON]?.body.alive).toBe(true);
  expect(exportRun(daily).current.continuations[0]?.deliberation.needs.anchor.at).toBe(3 * DAY);
  const transition = fresh();
  accepted(step(transition, { until: DAY / 2, fidelity: FINE, inputs: [] }));
  accepted(step(transition, { until: DAY * 2, fidelity: DAILY, inputs: [] }));
  const coarse = exportRun(transition).current.continuations[0]?.body.clock;
  expect(coarse?.conditionId).toContain('daily-cells-v1');
  accepted(step(transition, { until: DAY * 2 + DAY / 2, fidelity: FINE, inputs: [] }));
  expect(exportRun(transition).current.continuations[0]?.body.clock.conditionId).not.toContain(
    'daily-cells-v1',
  );
  const archive = exportRun(transition);
  const actor = archive.current.people[PERSON];
  const retained = archive.current.continuations[0];
  expect(actor?.character.agedTo).toBe(DAY * 2 + DAY / 2);
  expect(actor?.skills['learned-craft']?.practicedMs).toBe(3_600_000);
  expect(actor?.skills['learned-craft']?.level).toBeGreaterThan(0.5);
  const view = accepted(
    inspect(transition, { perspective: { kind: 'host' }, people: [PERSON], select: ['skills'] }),
  );
  const personView = view.people[0];
  if (personView?.kind !== 'host') throw new Error('missing host reading');
  const skills = personView.parts.find((part) => part.select === 'skills');
  if (skills?.select !== 'skills') throw new Error('missing skills reading');
  expect(skills.value[0]?.competence).toBeLessThan(0.6);
  expect(retained?.life.clock.advancedThroughMs).toBe(archive.current.at);
  expect(retained?.life.hazards.find((h) => h.key.kind === 'mortality')?.acceptedIntegral).toBeGreaterThan(0);
  expect(accepted(replay(archive)).fullHash).toBe(archive.hashes.full);
}, 30_000);
