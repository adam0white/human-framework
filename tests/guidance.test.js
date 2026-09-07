import test from 'node:test';
import assert from 'node:assert/strict';
import { createSimulation, getView, rankActions } from '../src/core/index.js';
import { createSimulation as createLegacy } from '../src/legacy/v0.1/index.js';
import { getScenario } from '../src/scenarios/index.js';
import { actionGuidance, decisionGuidance } from '../web/guidance.js';

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
  assert.deepEqual(guide(state, 'eat').costs, [`1 round · ${state.scenario.roundMinutes} min`, '1 ration if available at the attempt']);
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

test('perceived capacity warning survives body ablation and uses no hidden fatigue', () => {
  const state = createSimulation(getScenario('courier'), { modules: { body: false } });
  state.actors[0].body.fatigue = 0.9;
  state.actors[0].body.hunger = 0.2;
  const guidance = guide(state, 'work');
  assert.equal(guidance.capacity.allowed, false);
  assert.ok(guidance.capacity.causes.includes('fatigue'));
  assert.match(guidance.capacityLabel, /estimated/);
  const samePerception = structuredClone(state);
  samePerception.actors[0].body.fatigue = 0.899;
  assert.deepEqual(guide(samePerception, 'work').capacity, guidance.capacity);
});

test('hunger can constrain exertion while non-exertive recovery has no capacity warning', () => {
  const state = createSimulation(getScenario('courier'));
  state.actors[0].body.fatigue = 0.1;
  state.actors[0].body.hunger = 1;
  assert.ok(guide(state, 'work').capacity.causes.includes('hunger'));
  assert.equal(guide(state, 'rest').capacity, null);
  assert.equal(guide(state, 'eat').capacity, null);
});

test('decision guidance distinguishes requested effort from executed recovery without inventing intention', () => {
  assert.deepEqual(decisionGuidance({ requestedActionLabel: 'Fit precision parts', actionLabel: 'Automatic recovery', intervention: { cause: 'fatigue', reason: 'Capacity was exhausted.' } }), {
    requested: 'Fit precision parts', executed: 'Automatic recovery', forced: true, cause: 'fatigue', reason: 'Capacity was exhausted.'
  });
  assert.deepEqual(decisionGuidance({ actionLabel: 'Rest' }), {
    requested: 'Rest', executed: 'Rest', forced: false, cause: null, reason: ''
  });
});

test('archived rules do not receive new capacity predictions', () => {
  const state = createLegacy(getScenario('solo'));
  state.actors[0].body.fatigue = 1;
  state.actors[0].body.hunger = 1;
  assert.equal(guide(state, 'work').capacity, null);
  assert.equal(guide(state, 'work').capacityLabel, null);
});
