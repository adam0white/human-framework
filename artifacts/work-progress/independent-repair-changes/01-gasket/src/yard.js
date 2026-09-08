import {createPerson, beginAttempt, advanceAttempt, finishAttempt, assessEffort, exportPerson, restorePerson, PARAMETERS} from 'paid-work-probe/human';
import {clone, fields, freeze, insist, integer, jsonTree, near, number} from './shape.js';

export const REPAIRERS = ['mara', 'tomas'];
export const PEOPLE = [...REPAIRERS, 'nuri'];
const ACCOUNTS = ['repair', 'hauling', 'crafting', 'rest'];
const initial = {
  mara: {body: {fatigue: .20, hunger: .20}, skills: {repair: .10, hauling: .10}},
  tomas: {body: {fatigue: .20, hunger: .20}, skills: {repair: .60, hauling: .10}},
  nuri: {body: {fatigue: .20, hunger: .20}, skills: {crafting: .10}}
};
const basis = person => Math.max(6, 20 - Math.floor(person.skills.repair * 4));
const accounting = () => Object.fromEntries(ACCOUNTS.map(name => [name, {minutes: 0, effort: 0}]));
const clamp = value => Math.max(0, Math.min(1, value));
const willing = id => REPAIRERS.includes(id);
const mayPay = (person, minutes, effort) => assessEffort(person.body, {durationMinutes: minutes, effort, exertive: true}).allowed;

// An actual attempt is provisionally created, capacity-checked, paid, and finished.
// Caller commits its returned person together with the corresponding world credit.
export function payMinute(person, kind, effort) {
  let next = beginAttempt(person, {actionId: kind === 'rest' ? 'recovery' : kind,
    targetId: kind === 'repair' ? 'south-pump' : kind === 'crafting' ? 'tool-blank' : null,
    durationMinutes: 1, effort, exertive: kind !== 'rest', activity: kind === 'rest' ? 'rest' : 'active',
    skill: kind === 'rest' ? null : kind});
  insist(next.pending.capacity.allowed, 'Actual paid minute exceeds capacity');
  next = advanceAttempt(next, 1);
  return finishAttempt(next, {attemptId: next.pending.id, status: 'completed'});
}

export function createYard(pumpRules) {
  const known = new WeakSet();
  const seal = state => { freeze(state); known.add(state); return state; };
  function checked(state) {
    if (!known.has(state)) { validate(state); }
    return state;
  }
  function review(state, request, from, to, accepted, reason) {
    const next = clone(state);
    next.decision = {at: state.minute, request, from, to, accepted, reason};
    return {state: seal(next), result: clone(next.decision)};
  }
  function create({tool = false, busy = false, origins = initial} = {}) {
    insist(typeof tool === 'boolean' && typeof busy === 'boolean', 'Invalid setup');
    const state = {
      schema: 'pump-yard-gasket-1', minute: 0, origins: clone(origins),
      people: Object.fromEntries(PEOPLE.map(id => [id, createPerson({id, ...origins[id]})])),
      paid: Object.fromEntries(PEOPLE.map(id => [id, accounting()])),
      occupied: {mara: 'free', tomas: busy ? 'hauling' : 'free', nuri: tool ? 'crafting' : 'free'},
      pump: {work: pumpRules.create(), permission: null, finishedAt: null},
      gasket: {owner: 'yard', place: 'shelf'},
      tooling: {blankOwner: 'nuri', blank: tool ? 'shelf' : 'absent', readyAt: null},
      hauling: {enabled: busy, stopped: false, finishedAt: null},
      decision: {at: 0, request: 'setup', from: null, to: null, accepted: true, reason: 'created'}
    };
    if (tool) insist(mayPay(state.people.nuri, 1, .02), 'Supplier cannot begin');
    if (busy) insist(mayPay(state.people.tomas, 4, .04), 'Hauler cannot begin');
    validate(state); return seal(state);
  }
  function start(state, id) {
    checked(state); insist(PEOPLE.includes(id), 'Unknown actor');
    if (!willing(id)) return review(state, 'start', id, id, false, 'not-a-repairer');
    if (state.pump.permission || state.occupied[id] !== 'free') return review(state, 'start', id, id, false, 'busy');
    if (pumpRules.inspect(state.pump.work).complete) return review(state, 'start', id, id, false, 'finished');
    const prepared = pumpRules.enlist(state.pump.work, id, basis(state.people[id]));
    const plan = pumpRules.plan(prepared, id, state.tooling.readyAt !== null);
    if (!mayPay(state.people[id], plan.minutesLeft, plan.effortLeft)) return review(state, 'start', id, id, false, 'capacity');
    const next = clone(state); next.pump.work = prepared;
    next.pump.permission = {worker: id, acceptedAt: state.minute, via: 'start', offeredBy: id};
    next.occupied[id] = 'repair'; next.gasket.place = 'installed';
    return review(next, 'start', id, id, true, 'accepted');
  }
  function offerHandover(state, from, to) {
    checked(state); insist(PEOPLE.includes(from) && PEOPLE.includes(to), 'Unknown actor');
    if (state.pump.permission?.worker !== from || from === to) return review(state, 'handover', from, to, false, 'not-current-worker');
    if (!willing(to)) return review(state, 'handover', from, to, false, 'not-a-repairer');
    if (state.occupied[to] !== 'free') return review(state, 'handover', from, to, false, 'busy');
    const prepared = pumpRules.enlist(state.pump.work, to, basis(state.people[to]));
    const plan = pumpRules.plan(prepared, to, state.tooling.readyAt !== null);
    if (!mayPay(state.people[to], plan.minutesLeft, plan.effortLeft)) return review(state, 'handover', from, to, false, 'capacity');
    const next = clone(state); next.pump.work = prepared;
    next.occupied[from] = 'free'; next.occupied[to] = 'repair';
    next.pump.permission = {worker: to, acceptedAt: state.minute, via: 'handover', offeredBy: from};
    return review(next, 'handover', from, to, true, 'accepted');
  }
  function stop(state, id) {
    checked(state); insist(PEOPLE.includes(id), 'Unknown actor');
    if (state.occupied[id] === 'free') return review(state, 'stop', id, null, false, 'already-free');
    const next = clone(state);
    if (next.occupied[id] === 'repair') next.pump.permission = null;
    if (next.occupied[id] === 'hauling') next.hauling.stopped = true;
    next.occupied[id] = 'free';
    return review(next, 'stop', id, null, true, 'stopped');
  }
  function startTool(state, id) {
    checked(state); insist(PEOPLE.includes(id), 'Unknown actor');
    if (id !== state.tooling.blankOwner) return review(state, 'tool', id, null, false, 'not-owner');
    if (state.occupied[id] !== 'free') return review(state, 'tool', id, null, false, 'busy');
    if (state.tooling.blank !== 'shelf') return review(state, 'tool', id, null, false, 'no-blank');
    if (!mayPay(state.people[id], 1, .02)) return review(state, 'tool', id, null, false, 'capacity');
    const next = clone(state); next.occupied[id] = 'crafting';
    return review(next, 'tool', id, null, true, 'accepted');
  }
  function settle(state) {
    checked(state);
    const work = pumpRules.inspect(state.pump.work);
    if (!work.complete) return state;
    const release = pumpRules.release(state.pump.work);
    if (!release.first) return state;
    insist(state.gasket.place === 'installed' && state.pump.finishedAt === null, 'No installed gasket to settle');
    const next = clone(state); next.pump.work = release.work;
    next.gasket.place = 'spent'; next.pump.finishedAt = state.minute;
    if (next.pump.permission) next.occupied[next.pump.permission.worker] = 'free';
    next.pump.permission = null;
    return seal(next);
  }
  function minute(state) {
    // Nothing outside this detached prospective minute changes before every payment succeeds.
    const next = clone(state), tool = state.tooling.readyAt !== null;
    for (const id of PEOPLE) {
      const kind = state.occupied[id] === 'free' ? 'rest' : state.occupied[id];
      let effort = kind === 'hauling' ? .01 : kind === 'crafting' ? .02 : 0;
      if (kind === 'repair') effort = pumpRules.plan(state.pump.work, id, tool).effort;
      next.people[id] = payMinute(state.people[id], kind, effort);
      next.paid[id][kind].minutes++; next.paid[id][kind].effort += effort;
      if (kind === 'repair') next.pump.work = pumpRules.pay(state.pump.work, id, tool);
    }
    next.minute++;
    // Only now can a completion alter availability. Nuri's minute-0 tool never speeds that same minute.
    if (state.occupied.nuri === 'crafting') {
      insist(state.tooling.blank === 'shelf' && state.tooling.blankOwner === 'nuri', 'Supplier does not own an available blank');
      next.tooling.blank = 'spent'; next.tooling.readyAt = next.minute; next.occupied.nuri = 'free';
    }
    if (state.occupied.tomas === 'hauling' && next.paid.tomas.hauling.minutes === 4) {
      next.hauling.finishedAt = next.minute; next.occupied.tomas = 'free';
    }
    // next is produced internally; settlement still enforces the material transition.
    return settle(seal(next));
  }
  function advance(state, target) {
    checked(state); integer(target, state.minute, 1_000_000);
    insist(target - state.minute <= 1440, 'Advance exceeds 1440 minutes');
    let next = state;
    while (next.minute < target) next = minute(next);
    return next;
  }
  function nextEvent(state) {
    checked(state); const waits = [];
    if (state.occupied.nuri === 'crafting') waits.push(1);
    if (state.occupied.tomas === 'hauling') waits.push(4 - state.paid.tomas.hauling.minutes);
    if (state.pump.permission) waits.push(pumpRules.plan(state.pump.work, state.pump.permission.worker, state.tooling.readyAt !== null).minutesLeft);
    return waits.length ? Math.min(1_000_000, state.minute + Math.min(...waits)) : null;
  }
  function exportState(state) {
    checked(state);
    const wire = clone(state); wire.pump.work = pumpRules.pack(state.pump.work);
    wire.people = Object.fromEntries(PEOPLE.map(id => [id, exportPerson(state.people[id])]));
    return {format: 'pump-yard', version: 1, state: wire};
  }
  function restoreState(snapshot) {
    jsonTree(snapshot); fields(snapshot, ['format', 'version', 'state']);
    insist(snapshot.format === 'pump-yard' && snapshot.version === 1, 'Unsupported yard snapshot');
    const next = clone(snapshot.state);
    fields(next.people, PEOPLE); fields(next.pump, ['work', 'permission', 'finishedAt']);
    for (const id of PEOPLE) {
      fields(snapshot.state.people[id], ['format', 'version', 'componentVersion', 'person']);
      insist(snapshot.state.people[id].componentVersion === '0.1.1', 'Yard requires the frozen Human version');
    }
    next.pump.work = pumpRules.unpack(snapshot.state.pump.work);
    next.people = Object.fromEntries(PEOPLE.map(id => [id, restorePerson(snapshot.state.people[id])]));
    validate(next); return seal(next);
  }
  function projection(state) {
    checked(state); const next = clone(state); next.pump.work = pumpRules.inspect(state.pump.work); return next;
  }
  function validate(state) {
    jsonTree(state);
    fields(state, ['schema', 'minute', 'origins', 'people', 'paid', 'occupied', 'pump', 'gasket', 'tooling', 'hauling', 'decision']);
    insist(state.schema === 'pump-yard-gasket-1', 'Unknown yard schema'); integer(state.minute, 0, 1_000_000);
    fields(state.origins, PEOPLE); fields(state.people, PEOPLE); fields(state.paid, PEOPLE); fields(state.occupied, PEOPLE);
    fields(state.pump, ['work', 'permission', 'finishedAt']);
    // Run the work arm's own validator in addition to host conservation checks.
    const work = pumpRules.inspect(pumpRules.unpack(pumpRules.pack(state.pump.work)));
    insist(work.id === 'south-pump' && work.coefficient === .20 && work.floor === 6, 'Wrong pump law or identity');
    const timeOrNull = value => { if (value !== null) integer(value, 1, state.minute); };
    timeOrNull(state.pump.finishedAt);
    fields(state.gasket, ['owner', 'place']); insist(state.gasket.owner === 'yard' && ['shelf', 'installed', 'spent'].includes(state.gasket.place), 'Invalid gasket ownership');
    fields(state.tooling, ['blankOwner', 'blank', 'readyAt']);
    insist(state.tooling.blankOwner === 'nuri' && ['absent', 'shelf', 'spent'].includes(state.tooling.blank), 'Invalid blank ownership');
    timeOrNull(state.tooling.readyAt);
    insist((state.tooling.blank === 'spent') === (state.tooling.readyAt !== null), 'Tool without spent blank');
    fields(state.hauling, ['enabled', 'stopped', 'finishedAt']);
    insist(typeof state.hauling.enabled === 'boolean' && typeof state.hauling.stopped === 'boolean', 'Invalid hauling flags');
    timeOrNull(state.hauling.finishedAt);
    for (const id of PEOPLE) {
      const origin = state.origins[id], person = state.people[id], paid = state.paid[id];
      fields(origin, ['body', 'skills']); fields(origin.body, ['fatigue', 'hunger']);
      fields(origin.skills, id === 'nuri' ? ['crafting'] : ['repair', 'hauling']);
      createPerson({id, ...origin});
      fields(person, ['version', 'id', 'body', 'skills', 'observationBias', 'minutes', 'nextAttempt', 'pending']);
      fields(person.body, ['fatigue', 'hunger']); fields(person.skills, Object.keys(origin.skills));
      restorePerson(exportPerson(person));
      insist(person.id === id && person.version === '0.1.1' && person.pending === null && person.observationBias === 0 && person.minutes === state.minute && person.nextAttempt === state.minute + 1, 'Person-clock or attempt mismatch');
      fields(paid, ACCOUNTS); let ticks = 0, effort = 0;
      for (const task of ACCOUNTS) {
        fields(paid[task], ['minutes', 'effort']); integer(paid[task].minutes, 0, state.minute); number(paid[task].effort, 0, 1);
        ticks += paid[task].minutes; effort += paid[task].effort;
        if (task !== 'repair') insist(near(paid[task].effort, paid[task].minutes * (task === 'hauling' ? .01 : task === 'crafting' ? .02 : 0)), 'Incorrect paid effort');
      }
      insist(ticks === state.minute, 'Missing or double paid time');
      for (const [skill, start] of Object.entries(origin.skills)) {
        // Read-only reconciliation of cumulative real exposure; these estimates grant no practice.
        const expected = start + (1 - start) * -Math.expm1(-PARAMETERS.learningPerMinute * PARAMETERS.practiceQuality * paid[skill].minutes);
        insist(near(person.skills[skill], expected), 'Unpaid practice');
      }
      const lowFatigue = clamp(origin.body.fatigue + PARAMETERS.fatiguePerMinute * state.minute + effort - PARAMETERS.restPerMinute * paid.rest.minutes);
      const highFatigue = clamp(clamp(origin.body.fatigue + (PARAMETERS.fatiguePerMinute - PARAMETERS.restPerMinute) * paid.rest.minutes) + PARAMETERS.fatiguePerMinute * (state.minute - paid.rest.minutes) + effort);
      insist(person.body.fatigue >= lowFatigue - 1e-10 && person.body.fatigue <= highFatigue + 1e-10, 'Body outside cumulative payment bounds');
      insist(near(person.body.hunger, clamp(origin.body.hunger + PARAMETERS.hungerPerMinute * state.minute)), 'Hunger-clock mismatch');
      const allowedJobs = id === 'nuri' ? ['free', 'crafting'] : id === 'mara' ? ['free', 'repair'] : ['free', 'repair', 'hauling'];
      insist(allowedJobs.includes(state.occupied[id]), 'Wrong actor duty');
      if (id === 'nuri') insist(paid.repair.minutes === 0 && paid.hauling.minutes === 0 && paid.crafting.minutes <= 1, 'Supplier wrong work');
      else insist(paid.crafting.minutes === 0 && (id !== 'mara' || paid.hauling.minutes === 0), 'Repairer wrong work');
      if (id !== 'nuri') {
        const hand = work.hands[id];
        insist(paid.repair.minutes === (hand?.minutes ?? 0) && near(paid.repair.effort, hand?.effort ?? 0), 'Repair credit without matched Human payment');
        if (hand) {
          integer(hand.basis, basis(person), basis({skills: origin.skills}));
          const fastest = Math.max(6, hand.basis - (state.tooling.readyAt === null ? 0 : 6));
          insist(hand.coverage <= hand.minutes / fastest + 1e-12, 'Unearned productivity');
        }
      }
    }
    insist(Object.keys(work.hands).every(willing), 'Unknown repair contributor');
    const hasHands = Object.keys(work.hands).length > 0;
    insist(state.gasket.place === (work.released ? 'spent' : hasHands ? 'installed' : 'shelf'), 'Gasket conservation mismatch');
    insist(work.complete === work.released && work.released === (state.pump.finishedAt !== null), 'Output settlement mismatch');
    const repairTicks = REPAIRERS.reduce((sum, id) => sum + state.paid[id].repair.minutes, 0);
    if (state.pump.finishedAt !== null) insist(repairTicks <= state.pump.finishedAt, 'Completion before paid work');
    const permission = state.pump.permission;
    if (permission !== null) {
      fields(permission, ['worker', 'acceptedAt', 'via', 'offeredBy']);
      insist(willing(permission.worker) && willing(permission.offeredBy) && ['start', 'handover'].includes(permission.via), 'Invalid assignment consent');
      integer(permission.acceptedAt, 0, state.minute);
      insist((permission.via === 'start') === (permission.worker === permission.offeredBy), 'Invalid consent origin');
      insist(Object.hasOwn(work.hands, permission.worker) && !work.complete && state.occupied[permission.worker] === 'repair', 'Assignment not linked to work');
    }
    insist(REPAIRERS.filter(id => state.occupied[id] === 'repair').length === (permission ? 1 : 0), 'Nonexclusive repair assignment');
    insist(state.paid.nuri.crafting.minutes === (state.tooling.readyAt === null ? 0 : 1), 'Unpaid tool');
    if (state.occupied.nuri === 'crafting') insist(state.tooling.blank === 'shelf', 'Crafting without owned blank');
    const haul = state.paid.tomas.hauling.minutes;
    integer(haul, 0, 4);
    if (!state.hauling.enabled) insist(haul === 0 && !state.hauling.stopped && state.hauling.finishedAt === null && state.occupied.tomas !== 'hauling', 'Unrequested hauling');
    else if (state.hauling.stopped) insist(haul < 4 && state.hauling.finishedAt === null && state.occupied.tomas !== 'hauling', 'Interrupted hauling produced output');
    else if (haul === 4) insist(state.hauling.finishedAt === 4 && state.occupied.tomas !== 'hauling', 'Hauling completion mismatch');
    else insist(haul === state.minute && state.occupied.tomas === 'hauling' && state.hauling.finishedAt === null, 'Lost active hauling');
    fields(state.decision, ['at', 'request', 'from', 'to', 'accepted', 'reason']);
    integer(state.decision.at, 0, state.minute);
    insist(['setup', 'start', 'handover', 'stop', 'tool'].includes(state.decision.request) && typeof state.decision.accepted === 'boolean' && [null, ...PEOPLE].includes(state.decision.from) && [null, ...PEOPLE].includes(state.decision.to), 'Invalid decision');
    insist(['created', 'not-a-repairer', 'busy', 'finished', 'capacity', 'accepted', 'not-current-worker', 'already-free', 'stopped', 'not-owner', 'no-blank'].includes(state.decision.reason), 'Invalid decision reason');
    insist(state.decision.accepted === ['created', 'accepted', 'stopped'].includes(state.decision.reason), 'Decision outcome contradicts reason');
    const decision = state.decision;
    if (decision.request === 'setup') insist(decision.reason === 'created' && decision.at === 0 && decision.from === null && decision.to === null, 'Invalid setup decision');
    else if (decision.request === 'handover') insist(PEOPLE.includes(decision.from) && PEOPLE.includes(decision.to), 'Missing handover actors');
    else if (decision.request === 'start') insist(PEOPLE.includes(decision.from) && decision.from === decision.to, 'Invalid starter');
    else insist(PEOPLE.includes(decision.from) && decision.to === null, 'Invalid control actor');
  }
  return Object.freeze({create, start, stop, offerHandover, startTool, advance, nextEvent, settle, exportState, restoreState, projection});
}
