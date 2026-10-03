/** Private host derivative: real assemblies and people continued from Common Ground.
 * No exported package or public host imports this experiment.
 */
import * as legacy from '../../games/commons.js';
import { HUMAN_VERSION, RUNTIME_VERSION, restorePerson,
  beginAttempt, advanceAttempt, finishAttempt, assessEffort, getPersonView } from '../../runtime/index.js';

export const CONTINUOUS_WORK_VERSION = '0.1.0-experiment';
const copy = value => structuredClone(value);
const EPS = 1e-12;
const fail = message => { throw new Error(message); };
const int = (value, min, max, name) => {
  if (!Number.isSafeInteger(value) || value < min || value > max) fail(`Invalid ${name}`);
};
function options(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(k => !['improvement', 'recovery'].includes(k))) fail('Invalid continuation options');
  const result = { improvement: input.improvement ?? 'prospective', recovery: input.recovery ?? 'automatic' };
  if (!['snapshot', 'prospective'].includes(result.improvement) || !['automatic', 'active-idle'].includes(result.recovery)) fail('Invalid continuation options');
  return result;
}
function spendMinute(person, action) {
  let next = beginAttempt(person, action);
  if (!next.pending.capacity.allowed) fail('Insufficient capacity for paid minute');
  next = advanceAttempt(next, 1);
  return finishAttempt(next, { attemptId: next.pending.id, status: 'completed' });
}
function duration(state, work, actor) {
  const tool = state.options.improvement === 'prospective' ? state.structures.workbench === 2 : work.workbenchAtStart;
  return Math.max(6, work.durationByActor[actor] - (tool ? 6 : 0));
}
function initial(snapshot, input) {
  const old = legacy.restoreGame(snapshot), config = options(input);
  if (Object.values(old.jobs).some(j => j && !j.project)) fail('Only idle or active assembly snapshots are supported; preserve other pending jobs in the legacy host');
  const state = { version: CONTINUOUS_WORK_VERSION, runtimeVersion: RUNTIME_VERSION, humanVersion: HUMAN_VERSION,
    origin: copy(snapshot), options: config, now: old.clock.now, people: {}, stock: copy(old.stock), structures: copy(old.structures), caches: old.caches,
    work: {}, assignments: {}, meals: {}, paid: {}, events: [], commands: [] };
  for (const [actor, original] of Object.entries(old.people)) {
    let person = restorePerson({ ...legacyPerson(original), componentVersion: original.version });
    if (person.pending) person = finishAttempt(person, { attemptId: person.pending.id, status: 'interrupted' });
    state.people[actor] = person;
    state.assignments[actor] = null;
    state.meals[actor] = null;
    state.paid[actor] = { work: 0, recovery: 0, idle: 0, meal: 0 };
    const job = old.jobs[actor];
    if (!job) continue;
    const fraction = original.pending.elapsedMinutes / job.duration;
    const id = `${job.project}-${job.project === 'cache' ? old.caches : job.stage}`;
    state.work[id] = { id, project: job.project, stage: job.stage, cost: copy(job.cost), progress: fraction,
      workbenchAtStart: job.benefits.workbench, durationByActor: { [actor]: job.duration + (job.benefits.workbench ? 6 : 0) },
      contributions: { [actor]: { priorMinutes: original.pending.elapsedMinutes, minutes: 0, fraction, effort: .2 * fraction } },
      completedAt: null };
    state.assignments[actor] = id;
  }
  return state;
}
function legacyPerson(person) {
  return { format: 'human-framework-person', version: 1, componentVersion: person.version, person: copy(person) };
}
function advanceRaw(state, minutes) {
  int(minutes, 0, 240, 'advance minutes');
  if (state.now + minutes > state.origin.game.clock.now + 240) fail('Private continuation is limited to 240 paid minutes');
  for (let elapsed = 0; elapsed < minutes; elapsed++) {
    const finished = [], finishedMeals = [];
    // Every actor uses the same world at the beginning of this minute. A tool
    // completed by the other actor applies starting with the following minute.
    for (const actor of Object.keys(state.people)) {
      const id = state.assignments[actor], work = id ? state.work[id] : null;
      if (state.meals[actor]) {
        state.people[actor] = advanceAttempt(state.people[actor], 1);
        state.paid[actor].meal++;
        if (state.meals[actor].endsAt === state.now + 1) finishedMeals.push(actor);
      } else if (work) {
        const fraction = Math.min(1 - work.progress, 1 / duration(state, work, actor));
        state.people[actor] = spendMinute(state.people[actor], { actionId: `build-${work.project}`, targetId: work.project,
          durationMinutes: 1, effort: .2 * fraction, exertive: true, skill: 'construction' });
        work.progress += fraction;
        const contribution = work.contributions[actor];
        contribution.minutes++;
        contribution.fraction += fraction;
        contribution.effort += .2 * fraction;
        state.paid[actor].work++;
        if (work.progress >= 1 - EPS) finished.push([actor, work]);
      } else {
        const recovering = state.options.recovery === 'automatic';
        state.people[actor] = spendMinute(state.people[actor], { actionId: recovering ? 'available' : 'idle', durationMinutes: 1, activity: recovering ? 'rest' : 'active' });
        state.paid[actor][recovering ? 'recovery' : 'idle']++;
      }
    }
    state.now++;
    for (const [actor, work] of finished) {
      work.progress = 1;
      work.completedAt = state.now;
      state.assignments[actor] = null;
      if (work.project === 'cache') state.caches++;
      else state.structures[work.project]++;
      state.events.push({ at: state.now, type: 'assembly-complete', actor, workId: work.id });
    }
    for (const actor of finishedMeals) {
      const person = state.people[actor];
      state.people[actor] = finishAttempt(person, { attemptId: person.pending.id, status: 'completed', mealConsumed: true });
      state.meals[actor] = null;
      state.events.push({ at: state.now, type: 'meal-complete', actor });
    }
  }
  return state;
}
export function createContinuation(snapshot, config = {}) {
  json(snapshot); json(config);
  return initial(snapshot, config);
}
export function advanceContinuation(state, minutes) {
  check(state);
  const next = advanceRaw(copy(state), minutes);
  if (minutes) record(next, { type: 'advance', minutes });
  return next;
}
export function getContinuityView(state) {
  check(state);
  return copy({ version: state.version, now: state.now, stock: state.stock, structures: state.structures, caches: state.caches,
    people: Object.fromEntries(Object.entries(state.people).map(([actor, person]) => [actor, getPersonView(person)])),
    work: state.work, assignments: state.assignments, meals: state.meals, paid: state.paid, events: state.events, nextStop: nextStop(state) });
}
function actorExists(state, actor) {
  if (typeof actor !== 'string' || !Object.hasOwn(state.people, actor)) fail('Unknown actor');
}
function available(state, actor) {
  actorExists(state, actor);
  if (state.assignments[actor] || state.meals[actor]) fail('Actor is already occupied');
}
function prepareWorker(state, work, actor) {
  work.durationByActor[actor] ??= legacy.PROJECTS[work.project].stages[work.stage].minutes - Math.floor(state.people[actor].skills.construction * 4);
  work.contributions[actor] ??= { priorMinutes: 0, minutes: 0, fraction: 0, effort: 0 };
  const remaining = 1 - work.progress;
  const capacity = assessEffort(state.people[actor].body, { durationMinutes: Math.max(1, Math.ceil(remaining * duration(state, work, actor) - EPS)), effort: .2 * remaining, exertive: true });
  if (!capacity.allowed) fail(`Insufficient ${capacity.causes.join(' and ')} capacity for remaining work`);
}
function stopRaw(state, actor) {
  actorExists(state, actor);
  if (!state.assignments[actor]) fail('No work to stop');
  state.assignments[actor] = null;
  return state;
}
function resumeRaw(state, actor, workId) {
  available(state, actor);
  if (typeof workId !== 'string') fail('Unknown work identity');
  const work = state.work[workId];
  if (!work || work.completedAt !== null) fail('No unfinished physical work');
  if (Object.values(state.assignments).includes(workId)) fail('Work is already assigned');
  prepareWorker(state, work, actor);
  state.assignments[actor] = workId;
  return state;
}
function handoverRaw(state, from, to) {
  actorExists(state, from);
  available(state, to);
  const id = state.assignments[from];
  if (!id) fail('No work to hand over');
  // This command records the recipient's explicit acceptance. It is not a
  // player command which silently forces another person's cooperation.
  prepareWorker(state, state.work[id], to);
  state.assignments[from] = null;
  state.assignments[to] = id;
  return state;
}
function startRaw(state, actor, project) {
  available(state, actor);
  if (typeof project !== 'string' || !Object.hasOwn(legacy.PROJECTS, project)) fail('Unknown project');
  if (project === 'cache' && Object.values(state.structures).some(n => n !== 2)) fail('The worksite must be established before packing caches');
  const stage = project === 'cache' ? 0 : state.structures[project];
  const definition = legacy.PROJECTS[project].stages[stage];
  if (!definition) fail('Assembly is already complete');
  const id = `${project}-${project === 'cache' ? state.caches : stage}`;
  if (state.work[id]) fail('Stage already exists; resume its reserved work');
  for (const [resource, count] of Object.entries(definition.cost)) if (state.stock[resource] < count) fail(`Missing ${resource}`);
  const work = { id, project, stage, cost: copy(definition.cost), progress: 0, workbenchAtStart: state.structures.workbench === 2,
    durationByActor: {}, contributions: {}, completedAt: null };
  prepareWorker(state, work, actor);
  for (const [resource, count] of Object.entries(work.cost)) state.stock[resource] -= count;
  state.work[id] = work;
  state.assignments[actor] = id;
  return state;
}
function change(state, command, apply) {
  check(state);
  const next = apply(copy(state));
  record(next, command);
  return next;
}
export function stopWork(state, actor) { return change(state, { type: 'stop', actor }, s => stopRaw(s, actor)); }
export function resumeWork(state, actor, workId) { return change(state, { type: 'resume', actor, workId }, s => resumeRaw(s, actor, workId)); }
export function acceptHandover(state, from, to) { return change(state, { type: 'handover', from, to }, s => handoverRaw(s, from, to)); }
export function startAssembly(state, actor, project) { return change(state, { type: 'start', actor, project }, s => startRaw(s, actor, project)); }
function nextStop(state) {
  const probe = copy(state), eventCount = state.events.length;
  const horizon = Math.min(6, state.origin.game.clock.now + 240 - state.now);
  for (let minutes = 1; minutes <= horizon; minutes++) {
    const previous = Object.fromEntries(Object.entries(probe.people).map(([a, p]) => [a, p.body.fatigue]));
    advanceRaw(probe, 1);
    if (probe.events.length > eventCount) return { at: probe.now, reason: probe.events.at(-1).type };
    if (Object.entries(probe.people).some(([a, p]) => previous[a] > 0 && p.body.fatigue === 0)) return { at: probe.now, reason: 'recovery-floor' };
  }
  return { at: state.now + horizon, reason: horizon ? 'review-interval' : 'continuation-limit' };
}
export function advanceToNextEvent(state) {
  check(state);
  return advanceContinuation(state, nextStop(state).at - state.now);
}
function beginMealRaw(state, actor) {
  available(state, actor);
  if (!state.stock.food) fail('No available portion');
  state.people[actor] = beginAttempt(state.people[actor], { actionId: 'eat', durationMinutes: 8, activity: 'meal' });
  state.stock.food--;
  state.meals[actor] = { startedAt: state.now, endsAt: state.now + 8, reservedPortions: 1 };
  return state;
}
function stopMealRaw(state, actor) {
  actorExists(state, actor);
  if (!state.meals[actor]) fail('No meal to stop');
  const person = state.people[actor];
  state.people[actor] = finishAttempt(person, { attemptId: person.pending.id, status: 'interrupted' });
  state.stock.food++;
  state.meals[actor] = null;
  return state;
}
export function beginMeal(state, actor) { return change(state, { type: 'meal', actor }, s => beginMealRaw(s, actor)); }
export function stopMeal(state, actor) { return change(state, { type: 'stop-meal', actor }, s => stopMealRaw(s, actor)); }
function json(value) {
  // Bound serialized characters while walking, before expanding the full tree.
  // Parsed JSON never shares object identities; reject direct-call DAGs as well
  // as cycles so a small input cannot cause exponential repeated traversal.
  let remaining = 262144;
  const seen = new Set();
  const debit = count => { remaining -= count; if (remaining < 0) fail('Save JSON exceeds size limit'); };
  const string = text => {
    if (text.length + 2 > remaining) fail('Save JSON exceeds size limit');
    debit(JSON.stringify(text).length);
  };
  function visit(item, depth) {
    if (depth > 32) fail('JSON nesting exceeds limit');
    if (item === null) { debit(4); return; }
    if (typeof item === 'boolean') { debit(item ? 4 : 5); return; }
    if (typeof item === 'string') { string(item); return; }
    if (typeof item === 'number') {
      if (!Number.isFinite(item) || Object.is(item, -0)) fail('Invalid JSON number');
      debit(JSON.stringify(item).length); return;
    }
    if (!item || typeof item !== 'object' || seen.has(item)) fail('Save requires an acyclic, unshared JSON tree');
    const array = Array.isArray(item), proto = Object.getPrototypeOf(item), names = Reflect.ownKeys(item);
    if (array ? proto !== Array.prototype : ![Object.prototype, null].includes(proto)) fail('Save requires plain JSON');
    if (array && (item.length > 10000 || names.length !== item.length + 1)) fail('JSON arrays must be dense and bounded');
    const count = names.length - (array ? 1 : 0);
    debit(2 + Math.max(0, count - 1));
    seen.add(item);
    for (const key of names) {
      if (array && key === 'length') continue;
      const d = Object.getOwnPropertyDescriptor(item, key);
      if (typeof key !== 'string' || !d.enumerable || !Object.hasOwn(d, 'value')) fail('Save requires data-only JSON properties');
      if (!array) { string(key); debit(1); }
      visit(d.value, depth + 1);
    }
  }
  visit(value, 0);
}
function fields(value, names, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length !== names.length || names.some(k => !Object.hasOwn(value, k))) fail(`Invalid ${label} fields`);
}
function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
  return JSON.stringify(value);
}
function commandReserve(state) {
  const active = Object.keys(state.people).filter(a => state.assignments[a] || state.meals[a]).length;
  if (state.now === state.origin.game.clock.now + 240) return active;
  return active * 2 + (state.commands.at(-1)?.type === 'advance' ? 0 : 1);
}
function record(state, command) {
  const last = state.commands.at(-1);
  if (last?.type === 'advance' && command.type === 'advance') last.minutes += command.minutes;
  else state.commands.push(copy(command));
  if (state.commands.length + commandReserve(state) > 512) fail('Private command limit: remaining space is reserved for stops and advancing');
}
function replay(origin, config, commands) {
  if (!Array.isArray(commands) || commands.length > 512) fail('Invalid replay command list');
  const state = initial(origin, config);
  for (const command of commands) {
    const type = command?.type;
    if (type === 'advance') { fields(command, ['type', 'minutes'], 'advance command'); int(command.minutes, 1, 240, 'replay minutes'); advanceRaw(state, command.minutes); }
    else if (type === 'start') { fields(command, ['type', 'actor', 'project'], 'start command'); startRaw(state, command.actor, command.project); }
    else if (type === 'stop') { fields(command, ['type', 'actor'], 'stop command'); stopRaw(state, command.actor); }
    else if (type === 'resume') { fields(command, ['type', 'actor', 'workId'], 'resume command'); resumeRaw(state, command.actor, command.workId); }
    else if (type === 'handover') { fields(command, ['type', 'from', 'to'], 'handover command'); handoverRaw(state, command.from, command.to); }
    else if (type === 'meal') { fields(command, ['type', 'actor'], 'meal command'); beginMealRaw(state, command.actor); }
    else if (type === 'stop-meal') { fields(command, ['type', 'actor'], 'stop meal command'); stopMealRaw(state, command.actor); }
    else fail('Unknown replay command');
    record(state, command);
  }
  return state;
}
function check(state) {
  json(state);
  if (state.version !== CONTINUOUS_WORK_VERSION) fail('Incompatible continuation state version');
  const expected = replay(state.origin, state.options, state.commands);
  if (canonical(expected) !== canonical(state)) fail('Continuation state does not match source-authoritative replay');
  return state;
}
export function exportContinuation(state) {
  check(state);
  return copy({ format: 'human-continuous-work-experiment', version: 1, state });
}
export function restoreContinuation(save) {
  json(save);
  fields(save, ['format', 'version', 'state'], 'save');
  if (save.format !== 'human-continuous-work-experiment' || save.version !== 1) fail('Incompatible continuation save version');
  return copy(check(save.state));
}
