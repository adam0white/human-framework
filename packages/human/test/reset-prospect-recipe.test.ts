/** A rebuilt world retains the undertaking's identity and prior high. No body reset or fast project mode. */
import { expect, test } from 'vitest';
import { exportRun, replay, restoreRun, step } from '../src/index.ts';
import type { Input, Run } from '../src/run-schema.ts';
import { actor, authoredPerson, MINUTE, need, START, setup } from './support.ts';

const original = 'workbench:original',
  separate = 'workbench:new-commission';
function observedWork(episode: string, progress: number, at: number): Input<'observation.received'> {
  const id = `host:work:${episode}:${at}`;
  return {
    id,
    at,
    source: { type: 'host', id: 'world' },
    kind: 'observation.received',
    payload: {
      person: 'ada',
      evidenceId: `evidence:${id}`,
      percepts: [
        {
          id: `reading:${id}`,
          occurredAt: at,
          channel: 'saw',
          kind: 'fact',
          actorId: 'ada',
          salience: 1,
          summary: 'The workbench and its assembled pieces.',
          claims: [],
          norms: [],
          advice: [],
          consequences: [],
          withdrawConsequences: [],
          witnesses: [],
          reports: [],
          provenance: ['world'],
          prospect: { id: episode, label: 'Assemble the workbench', kind: 'arrange', progress },
        },
      ],
    },
  };
}
function review(at: number): Input<'decision.requested'> {
  return {
    id: `host:review:${at}`,
    at,
    source: { type: 'host', id: 'world' },
    kind: 'decision.requested',
    payload: {
      person: 'ada',
      reason: 'ordinary project consideration',
      treatment: 'ordinary',
      offerRevision: 1,
    },
  };
}
function project(run: Run) {
  const goal = actor(run).agenda.goals.find((goal) => goal.project?.prospectId === original);
  if (!goal) throw new Error('Known calm project was not adopted through the ordinary faculty path');
  return goal;
}
function reset() {
  const person = authoredPerson('ada', 'Ada');
  person.state.traits.openness = person.state.traits.conscientiousness = 1;
  person.state.body.satiety = person.state.body.hydration = 1;
  person.state.body.sleepPressure = person.state.body.exertion = person.state.body.sleepDebtHours = 0;
  person.state.needs = {
    safety: 1,
    belonging: 1,
    esteem: 1,
    autonomy: 1,
    competence: 1,
    leisure: 1,
    meaning: 1,
  };
  const run = setup([person]);
  need(
    step(run, {
      until: START,
      inputs: [
        observedWork(original, 0, START),
        {
          id: 'host:offers',
          at: START,
          source: { type: 'host', id: 'world' },
          kind: 'offers.received',
          payload: { person: 'ada', revision: 1, offers: [] },
        },
        review(START),
      ],
    }),
  );
  expect(project(run).progress).toBe(0);
  need(step(run, { until: START + 1, inputs: [observedWork(original, 0.4, START + 1)] }));
  expect(project(run).project?.peak).toBe(0.4);
  need(step(run, { until: START + 2, inputs: [observedWork(original, 0, START + 2)] }));
  expect(project(run).progress).toBe(0);
  expect(project(run).project?.peak).toBe(0.4);
  expect(project(run).lastAdvancedAt).toBe(START + 1);
  need(step(run, { until: START + 3, inputs: [observedWork(original, 0.4, START + 3)] }));
  return run;
}

test('restoring the prior high earns no progress credit; genuinely new work continues exactly after restore', () => {
  const run = reset();
  expect(project(run).progress).toBe(0.4);
  expect(project(run).project?.peak).toBe(0.4);
  expect(project(run).lastAdvancedAt).toBe(START + 1);
  const restored = need(restoreRun(exportRun(run)));
  const inputs = [observedWork(original, 0.5, START + 4)];
  need(step(run, { until: START + 4, inputs }));
  need(step(restored, { until: START + 4, inputs }));
  expect(project(run).project?.peak).toBe(0.5);
  expect(project(run).lastAdvancedAt).toBe(START + 4);
  const archive = exportRun(run);
  expect(exportRun(restored)).toStrictEqual(archive);
  expect(need(replay(archive)).fullHash).toBe(archive.hashes.full);
});

test('a distinct observed undertaking does not erase the former goal or its abandoned history', () => {
  const run = reset(),
    old = project(run);
  need(step(run, { until: START + 4, inputs: [observedWork(separate, 0, START + 4)] }));
  expect(actor(run).projects.prospects.map((prospect) => prospect.id)).toContain(separate);
  expect(project(run).id).toBe(old.id);
  need(
    step(run, {
      until: START + 5,
      inputs: [
        {
          id: 'host:abandon',
          at: START + 5,
          source: { type: 'host', id: 'world' },
          kind: 'agenda.requested',
          payload: { person: 'ada', request: { type: 'abandon-goal', goalId: old.id } },
        },
        review(START + 5),
      ],
    }),
  );
  expect(project(run).status).toBe('abandoned');
  expect(project(run).project?.peak).toBe(0.4);
  expect(actor(run).projects.history).toContainEqual(
    expect.objectContaining({ goalId: old.id, outcome: 'abandoned' }),
  );
});

test('stable identity does not keep a project active beyond the actual stale interval', () => {
  const run = reset();
  const stale = exportRun(run).initial.effective.builtins.PROJECTS_DEFAULTS.staleMinutes * MINUTE;
  const at = START + 1 + stale + 1;
  need(step(run, { until: at, inputs: [review(at)] }));
  expect(project(run).status).toBe('abandoned');
  expect(project(run).project?.peak).toBe(0.4);
});
