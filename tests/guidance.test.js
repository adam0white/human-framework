import test from 'node:test';
import assert from 'node:assert/strict';
import { createSimulation, getView, rankActions } from '../src/core/index.js';
import { getScenario } from '../src/scenarios/index.js';
import { actionGuidance } from '../web/guidance.js';

function guide(state, actionId) {
  const view = getView(state, state.actors[0].id);
  const action = view.actions.find((candidate) => candidate.id === actionId);
  const ranking = rankActions(view).find((candidate) => candidate.actionId === actionId);
  return actionGuidance(view, action, ranking);
}

test('action guidance uses the actual authored output, effort and round duration', () => {
  const scenario = getScenario('courier');
  scenario.actions[0].output = 4.25;
  scenario.actions[0].effort = 0.07;
  scenario.roundMinutes = 8;
  const guidance = guide(createSimulation(scenario), 'work');
  assert.equal(guidance.benefit, '+4.25 delivery units on success');
  assert.deepEqual(guidance.costs, ['1 round · 8 min', 'Effort: +7 fatigue points']);
  assert.match(guidance.estimate, /% estimated success/);
});

test('guidance does not invent a forecast for the baseline or read hidden conditions', () => {
  const first = createSimulation(getScenario('courier'), { seed: 7 });
  const second = structuredClone(first);
  second.world.hazard = 0.99;
  assert.deepEqual(guide(first, 'work'), guide(second, 'work'));
  const baseline = createSimulation(getScenario('courier'), { policy: 'baseline' });
  assert.equal(guide(baseline, 'work').estimate, null);
});

test('guidance states empty-ration and disabled-component effects without hiding valid attempts', () => {
  const state = createSimulation(getScenario('courier'), { modules: { beliefs: false, relationships: false, learning: false } });
  state.world.food = 0;
  assert.equal(guide(state, 'eat').benefit, 'No ration available now');
  assert.deepEqual(guide(state, 'eat').costs, ['1 round · 5 min', '1 ration if available at the attempt']);
  assert.equal(guide(state, 'observe').benefit, 'Inspect conditions; belief updating is off');
  assert.equal(guide(state, 'help').benefit, 'Attempt help; assistance effects are off');
  assert.equal(guide(state, 'work').practice, null);
});

test('help guidance does not promise assistance when no partner exists', () => {
  const scenario = getScenario('courier');
  scenario.actors = scenario.actors.slice(0, 1);
  assert.equal(guide(createSimulation(scenario), 'help').benefit, 'No partner available to assist');
});

test('imported help actions show their default effort when no explicit value is authored', () => {
  const scenario = getScenario('commons');
  delete scenario.actions.find(action => action.kind === 'help').effort;
  assert.ok(guide(createSimulation(scenario), 'help').costs.includes('Effort: +8 fatigue points'));
});
