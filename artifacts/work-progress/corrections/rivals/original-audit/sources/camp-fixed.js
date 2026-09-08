/** Private fixed rival: first-item tool snapshot and refusal of optional handover. No shared helper dependency. */
import { createPerson, assessEffort, beginAttempt, advanceAttempt, finishAttempt, exportPerson, restorePerson } from '../../human/v0.1.1.js';
import { practice } from '../../core/model.js';
const HOST = 'work-progress-camp-fixed', EPS = 1e-12, MAX_TIME = 1000000;
const actors = ['A', 'B', 'C'], workers = ['A', 'B'];
const initialSkills = { A: { construction: .1, hauling: .1 }, B: { construction: .6, hauling: .1 }, C: { crafting: .1 } };
const copy = value => structuredClone(value), trusted = new WeakSet();
const fail = message => { throw new Error(message); };
const integer = (value, low, high, name) => { if (!Number.isSafeInteger(value) || Object.is(value, -0) || value < low || value > high) fail(`Invalid ${name}`); };
const number = (value, low, high, name) => { if (typeof value !== 'number' || !Number.isFinite(value) || value < low - EPS || value > high + EPS) fail(`Invalid ${name}`); };
const fields = (value, keys, name) => { if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length !== keys.length || keys.some(key => !Object.hasOwn(value, key))) fail(`Invalid ${name} fields`); };
function inspect(value) {
  const seen = new WeakSet(); let budget = 262144;
  const debit = n => { if ((budget -= n) < 0) fail('World JSON size limit'); };
  function visit(value, depth) {
    if (depth > 32) fail('World JSON depth limit');
    if (value === null || typeof value === 'boolean') { debit(5); return; }
    if (typeof value === 'number') { if (!Number.isFinite(value) || Object.is(value, -0)) fail('Invalid JSON number'); debit(String(value).length); return; }
    if (typeof value === 'string') { if (value.length > 10000) fail('World JSON string limit'); debit(JSON.stringify(value).length); return; }
    if (typeof value !== 'object' || seen.has(value)) fail('World requires an unshared JSON tree'); seen.add(value);
    const array = Array.isArray(value), keys = Reflect.ownKeys(value), proto = Object.getPrototypeOf(value);
    if (array ? proto !== Array.prototype || keys.length !== value.length + 1 : ![Object.prototype, null].includes(proto)) fail('Invalid JSON object');
    debit(2);
    for (const key of keys) {
      if (array && key === 'length') continue;
      const d = Object.getOwnPropertyDescriptor(value, key);
      if (typeof key !== 'string' || !d.enumerable || !Object.hasOwn(d, 'value')) fail('Invalid JSON accessor/key');
      if (array && (!/^(0|[1-9]\d*)$/.test(key) || Number(key) >= value.length)) fail('Invalid JSON array index');
      debit(key.length + 3); visit(d.value, depth + 1);
    }
  }
  visit(value, 0);
}
function freeze(value) { if (value && typeof value === 'object') { for (const child of Object.values(value)) freeze(child); Object.freeze(value); } return value; }
function seal(world) { validate(world); freeze(world); trusted.add(world); return world; }
function duration(world, item, actor) { return Math.max(6, item.contributions[actor].basis - (item.toolAtStart === true ? 6 : 0)); }
function forecast(world, item, actor) {
  const basis = item.contributions[actor]?.basis ?? 20 - Math.floor(world.people[actor].skills.construction * 4);
  const d = Math.max(6, basis - ((item.toolAtStart ?? world.toolAvailable) ? 6 : 0));
  return { durationMinutes: Math.max(1, Math.ceil((1 - item.progress) * d - EPS)), effort: .2 * (1 - item.progress), exertive: true };
}
function prepare(world, item, actor) {
  if (item.toolAtStart === null) item.toolAtStart = world.toolAvailable;
  if (!item.contributions[actor]) {
    item.contributions[actor] = { basis: 20 - Math.floor(world.people[actor].skills.construction * 4), minutes: 0, fraction: 0, effort: 0 };
    item.basisPaid[actor] = world.paid[actor].construction;
  }
}
function pay(world, actor, kind, effort = 0, item = null) {
  const skill = kind === 'construct' ? 'construction' : kind === 'haul' ? 'hauling' : kind === 'craft' ? 'crafting' : null;
  let person = beginAttempt(world.people[actor], { actionId: kind, targetId: item, durationMinutes: 1, effort,
    exertive: kind !== 'recover', activity: kind === 'recover' ? 'rest' : 'active', skill });
  if (!person.pending.capacity.allowed) fail('Insufficient capacity for paid minute');
  person = advanceAttempt(person, 1); world.people[actor] = finishAttempt(person, { attemptId: person.pending.id, status: 'completed' });
  const paid = world.paid[actor]; paid[kind === 'recover' ? 'recovery' : 'work']++;
  if (skill) paid[skill]++; paid.effort += effort;
}
function tick(world) {
  const done = [];
  for (const actor of actors) {
    const assignment = world.assignments[actor];
    if (assignment?.startsWith('work-')) {
      const item = world.items[assignment], part = Math.min(1 - item.progress, 1 / duration(world, item, actor));
      pay(world, actor, 'construct', .2 * part, assignment);
      const credit = item.contributions[actor]; item.progress += part; credit.minutes++; credit.fraction += part; credit.effort += .2 * part;
      if (item.progress >= 1 - EPS) done.push(assignment);
    } else if (assignment === 'hauling') pay(world, actor, 'haul', .01);
    else if (assignment === 'crafting') pay(world, actor, 'craft', .02);
    else pay(world, actor, 'recover');
  }
  world.now++;
  for (const id of done) {
    const item = world.items[id]; if (item.settled) fail('Work already settled');
    item.progress = 1; item.completedAt = world.now; item.settled = true;
    world.spent.timber += item.reserved.timber; world.spent.salvage += item.reserved.salvage;
    item.reserved = { timber: 0, salvage: 0 }; world.outputs++;
    for (const actor of workers) if (world.assignments[actor] === id) world.assignments[actor] = null;
  }
  if (world.assignments.C === 'crafting' && world.now === 1) {
    world.stock.toolBlank--; world.spent.toolBlank++; world.toolAvailable = true; world.assignments.C = null;
  }
  if (world.assignments.B === 'hauling' && world.now === 4) world.assignments.B = null;
}
function validate(world) {
  if (trusted.has(world)) return world;
  inspect(world); fields(world, ['host', 'setup', 'now', 'people', 'paid', 'stock', 'spent', 'toolAvailable', 'outputs', 'items', 'assignments', 'haulStoppedAt', 'lastResponse'], 'world');
  if (world.host !== HOST) fail('Wrong rival host');
  fields(world.setup, ['toolArrival', 'busyB', 'items'], 'setup');
  if (![null, 1].includes(world.setup.toolArrival) || typeof world.setup.busyB !== 'boolean' || ![1, 2].includes(world.setup.items)) fail('Invalid setup');
  integer(world.now, 0, MAX_TIME, 'world time'); integer(world.outputs, 0, world.setup.items, 'output count');
  if (world.haulStoppedAt !== null) { integer(world.haulStoppedAt, 0, Math.min(3, world.now), 'hauling stop'); if (!world.setup.busyB) fail('No hauling to stop'); }
  const hauled = world.setup.busyB ? Math.min(world.now, world.haulStoppedAt ?? 4) : 0, crafted = world.setup.toolArrival === 1 ? Math.min(world.now, 1) : 0;
  if (world.toolAvailable !== Boolean(crafted)) fail('Unpaid tool');
  for (const key of ['people', 'paid', 'assignments']) fields(world[key], actors, key);
  for (const key of ['stock', 'spent']) { fields(world[key], ['timber', 'salvage', 'toolBlank'], key); for (const value of Object.values(world[key])) integer(value, 0, 10, key); }
  const ids = Array.from({ length: world.setup.items }, (_, n) => `work-${n + 1}`); fields(world.items, ids, 'items');
  let outputs = 0, reservedTimber = 0, reservedSalvage = 0;
  const credited = Object.fromEntries(workers.map(actor => [actor, { minutes: 0, effort: 0 }]));
  for (const id of ids) {
    const item = world.items[id]; fields(item, ['id', 'progress', 'completedAt', 'settled', 'reserved', 'contributions', 'basisPaid', 'toolAtStart'], 'item');
    if (item.id !== id || typeof item.settled !== 'boolean') fail('Invalid item identity'); number(item.progress, 0, 1, 'progress');
    fields(item.reserved, ['timber', 'salvage'], 'reservation');
    const participants = Object.keys(item.contributions); if (participants.length ? typeof item.toolAtStart !== 'boolean' || item.toolAtStart && !world.toolAvailable : item.toolAtStart !== null) fail('Invalid fixed tool snapshot'); if (participants.some(a => !workers.includes(a))) fail('Invalid contributor'); fields(item.basisPaid, participants, 'basis credit');
    let fraction = 0;
    for (const actor of participants) {
      const c = item.contributions[actor]; fields(c, ['basis', 'minutes', 'fraction', 'effort'], 'contribution');
      integer(item.basisPaid[actor], 0, world.paid[actor].construction, 'basis exposure');
      if (c.basis !== 20 - Math.floor(practice(initialSkills[actor].construction, item.basisPaid[actor]) * 4)) fail('Changed worker basis');
      integer(c.minutes, 0, world.now, 'contribution minutes'); number(c.fraction, 0, 1, 'fraction'); number(c.effort, 0, .2, 'effort');
      if (Math.abs(c.effort - .2 * c.fraction) > 1e-10 || c.fraction > c.minutes / 6 + EPS || c.minutes && c.fraction < (c.minutes - 1) / 20 - EPS || !c.minutes && c.fraction !== 0) fail('Inconsistent paid fraction');
      if (item.basisPaid[actor] + c.minutes > world.paid[actor].construction) fail('Reversed basis exposure');
      fraction += c.fraction; credited[actor].minutes += c.minutes; credited[actor].effort += c.effort;
    }
    if (Math.abs(fraction - item.progress) > 1e-10) fail('Progress and contributors disagree');
    if (item.settled) { integer(item.completedAt, 1, world.now, 'completion time'); if (item.progress !== 1 || item.reserved.timber || item.reserved.salvage) fail('Invalid settlement'); outputs++; }
    else if (item.completedAt !== null || item.progress >= 1 - EPS || item.reserved.timber !== (participants.length ? 5 : 0) || item.reserved.salvage !== (participants.length ? 1 : 0)) fail('Invalid active material');
    reservedTimber += item.reserved.timber; reservedSalvage += item.reserved.salvage;
  }
  if (outputs !== world.outputs || world.spent.timber !== outputs * 5 || world.spent.salvage !== outputs || world.spent.toolBlank !== crafted || world.stock.toolBlank !== (world.setup.toolArrival === 1 ? 1 : 0) - crafted || world.stock.timber + world.spent.timber + reservedTimber !== 5 * world.setup.items || world.stock.salvage + world.spent.salvage + reservedSalvage !== world.setup.items) fail('Resource/output conservation mismatch');
  const assigned = [];
  for (const actor of actors) {
    const person = restorePerson(exportPerson(world.people[actor])), paid = world.paid[actor], assignment = world.assignments[actor];
    if (person.version !== '0.1.1' || person.id !== actor || person.minutes !== world.now || person.nextAttempt !== world.now + 1 || person.pending !== null || person.observationBias !== 0) fail('Invalid person clock/identity');
    fields(person.skills, Object.keys(initialSkills[actor]), 'skills');
    fields(paid, ['work', 'recovery', 'effort', 'construction', 'hauling', 'crafting'], 'paid');
    for (const key of ['work', 'recovery', 'construction', 'hauling', 'crafting']) integer(paid[key], 0, world.now, key); number(paid.effort, 0, MAX_TIME, 'paid effort');
    if (paid.work + paid.recovery !== world.now || paid.work !== paid.construction + paid.hauling + paid.crafting || paid.hauling !== (actor === 'B' ? hauled : 0) || paid.crafting !== (actor === 'C' ? crafted : 0) || paid.construction !== (credited[actor]?.minutes ?? 0) || Math.abs(paid.effort - ((credited[actor]?.effort ?? 0) + paid.hauling * .01 + paid.crafting * .02)) > 1e-10) fail('Paid ownership mismatch');
    for (const skill of Object.keys(person.skills)) if (Math.abs(person.skills[skill] - practice(initialSkills[actor][skill], paid[skill])) > 1e-10) fail('Practice does not match paid ownership');
    if (assignment?.startsWith('work-')) {
      const item = world.items[assignment]; if (!workers.includes(actor) || !item || item.settled || !item.contributions[actor]) fail('Invalid work assignment');
      if (world.now + forecast(world, item, actor).durationMinutes > MAX_TIME) fail('Assignment exceeds remaining time');
      if (!assessEffort(person.body, forecast(world, item, actor)).allowed) fail('Assignment lacks remaining capacity'); assigned.push(assignment);
    } else if (assignment !== null && !(actor === 'B' && assignment === 'hauling' && world.setup.busyB && world.haulStoppedAt === null && world.now < 4) && !(actor === 'C' && assignment === 'crafting' && world.setup.toolArrival === 1 && world.now === 0)) fail('Invalid auxiliary assignment');
    if (assignment === 'hauling' || assignment === 'crafting') {
      const remaining = assignment === 'hauling' ? 4 - world.now : 1 - world.now;
      if (!assessEffort(person.body, { durationMinutes: remaining, effort: remaining * (assignment === 'hauling' ? .01 : .02), exertive: true }).allowed) fail('Auxiliary assignment lacks remaining capacity');
    }
  }
  if (new Set(assigned).size !== assigned.length || world.assignments.C !== (world.setup.toolArrival === 1 && world.now === 0 ? 'crafting' : null) || world.setup.busyB && world.haulStoppedAt === null && world.now < 4 && world.assignments.B !== 'hauling') fail('Invalid exclusive assignment');
  if (world.lastResponse !== null) {
    const r = world.lastResponse; fields(r, ['at', 'item', 'from', 'to', 'accepted', 'reason'], 'response'); integer(r.at, 0, world.now, 'response time');
    if (!ids.includes(r.item) || !workers.includes(r.from) || !workers.includes(r.to) || r.from === r.to || typeof r.accepted !== 'boolean' || !['recipient-busy', 'recipient-capacity', 'fixed-assignment'].includes(r.reason) || r.accepted !== (r.reason === 'accepted')) fail('Invalid handover response');
  }
  return world;
}
export function createWorld(input = {}) {
  inspect(input); if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(k => !['toolArrival', 'busyB', 'items'].includes(k))) fail('Invalid setup');
  const setup = { toolArrival: Object.hasOwn(input, 'toolArrival') ? input.toolArrival : null, busyB: Object.hasOwn(input, 'busyB') ? input.busyB : false, items: Object.hasOwn(input, 'items') ? input.items : 1 };
  if (![null, 1].includes(setup.toolArrival) || typeof setup.busyB !== 'boolean' || ![1, 2].includes(setup.items)) fail('Invalid setup');
  const world = { host: HOST, setup, now: 0,
    people: Object.fromEntries(actors.map(id => [id, createPerson({ id, body: { fatigue: .2, hunger: .2 }, skills: copy(initialSkills[id]), observationBias: 0 })])),
    paid: Object.fromEntries(actors.map(a => [a, { work: 0, recovery: 0, effort: 0, construction: 0, hauling: 0, crafting: 0 }])),
    stock: { timber: 5 * setup.items, salvage: setup.items, toolBlank: setup.toolArrival === 1 ? 1 : 0 }, spent: { timber: 0, salvage: 0, toolBlank: 0 },
    toolAvailable: false, outputs: 0, items: Object.fromEntries(Array.from({ length: setup.items }, (_, n) => { const id = `work-${n + 1}`; return [id, { id, progress: 0, completedAt: null, settled: false, reserved: { timber: 0, salvage: 0 }, contributions: {}, basisPaid: {}, toolAtStart: null }]; })),
    assignments: { A: null, B: setup.busyB ? 'hauling' : null, C: setup.toolArrival === 1 ? 'crafting' : null }, haulStoppedAt: null, lastResponse: null };
  return seal(world);
}
export function command(world, input) {
  validate(world); inspect(input);
  const schema = { start: ['type', 'actor', 'item'], stop: ['type', 'actor'], handover: ['type', 'from', 'to', 'item'] };
  if (!input || !Object.hasOwn(schema, input.type)) fail('Unknown command'); fields(input, schema[input.type], 'command');
  const next = copy(world);
  if (input.type === 'stop') {
    if (!workers.includes(input.actor) || !next.assignments[input.actor]) fail('No controlled assignment to stop');
    if (next.assignments[input.actor] === 'hauling') next.haulStoppedAt = next.now;
    next.assignments[input.actor] = null;
  } else if (input.type === 'start') {
    const item = next.items[input.item];
    if (!workers.includes(input.actor) || !item || item.settled || next.assignments[input.actor] || Object.values(next.assignments).includes(input.item)) fail('Impossible work start');
    if (next.now + forecast(next, item, input.actor).durationMinutes > MAX_TIME) fail('Insufficient future work interval');
    if (!assessEffort(next.people[input.actor].body, forecast(next, item, input.actor)).allowed) fail('Insufficient remaining-work capacity');
    if (!Object.keys(item.contributions).length) { if (next.stock.timber < 5 || next.stock.salvage < 1) fail('Insufficient owned material'); next.stock.timber -= 5; next.stock.salvage--; item.reserved = { timber: 5, salvage: 1 }; }
    prepare(next, item, input.actor); next.assignments[input.actor] = input.item;
  } else {
    const { from, to, item: id } = input, item = next.items[id];
    if (!workers.includes(from) || !workers.includes(to) || from === to || !item || next.assignments[from] !== id) fail('Invalid handover offer');
    const reason = next.assignments[to] ? 'recipient-busy' : (!assessEffort(next.people[to].body, forecast(next, item, to)).allowed || next.now + forecast(next, item, to).durationMinutes > MAX_TIME) ? 'recipient-capacity' : 'fixed-assignment';
    next.lastResponse = { at: next.now, item: id, from, to, accepted: reason === 'accepted', reason };
    // This smaller contract declines optional transfers; explicit stop remains available.
  }
  return seal(next);
}
export function advanceTo(world, at) {
  validate(world); integer(at, world.now, MAX_TIME, 'target time'); if (at - world.now > 1440) fail('Advance exceeds bounded interval');
  const next = copy(world); while (next.now < at) tick(next); return seal(next);
}
export function nextEvent(world) {
  validate(world); if (!Object.values(world.assignments).some(Boolean)) return null;
  const next = copy(world), initialOutputs = world.outputs, tool = world.toolAvailable, hauling = world.assignments.B === 'hauling';
  while (next.now < Math.min(MAX_TIME, world.now + 1440)) { tick(next); if (next.outputs !== initialOutputs || next.toolAvailable !== tool || hauling && next.assignments.B !== 'hauling') return next.now; }
  return null;
}
export function observe(world) {
  validate(world);
  return freeze({ now: world.now, stock: copy(world.stock), spent: copy(world.spent), toolAvailable: world.toolAvailable, outputs: world.outputs,
    actors: Object.fromEntries(actors.map(a => [a, { person: exportPerson(world.people[a]), paid: copy(world.paid[a]) }])),
    items: Object.values(world.items).sort((a, b) => a.id.localeCompare(b.id)).map(item => ({ id: item.id, progress: item.progress, completedAt: item.completedAt, settled: item.settled, reserved: copy(item.reserved), contributions: copy(item.contributions) })),
    assignments: copy(world.assignments), lastResponse: copy(world.lastResponse) });
}
export function exportWorld(world) { validate(world); return copy({ format: HOST, version: 1, world }); }
export function restoreWorld(snapshot) { inspect(snapshot); fields(snapshot, ['format', 'version', 'world'], 'snapshot'); if (snapshot.format !== HOST || snapshot.version !== 1) fail('Incompatible rival snapshot'); return seal(copy(validate(snapshot.world))); }
