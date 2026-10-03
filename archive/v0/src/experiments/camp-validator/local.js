/** Private snapshot rival. No command execution and no alternative simulation engine. */
import * as camp from '../../games/camp.js';
import * as rain from '../../games/commons-next.js';

const fail = message => { throw new Error(message); };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const integer = (n, low, high, label) => { if (!Number.isSafeInteger(n) || n < low || n > high) fail(`Invalid ${label}`); };
const fields = (value, keys, label) => { if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length !== keys.length || keys.some(key => !Object.hasOwn(value, key))) fail(`Invalid ${label} fields`); };
function inspect(value) {
  let budget = 1048576, nodes = 0; const seen = new WeakSet();
  const debit = n => { if ((budget -= n) < 0) fail('Local JSON size limit'); };
  const string = value => { if (value.length > 10000) fail('Local JSON string limit'); debit(JSON.stringify(value).length); };
  function visit(value, depth) {
    if (++nodes > 250000 || depth > 48) fail('Local JSON tree limit');
    if (value === null) { debit(4); return; }
    if (typeof value === 'string') { string(value); return; }
    if (typeof value === 'boolean') { debit(5); return; }
    if (typeof value === 'number') { if (!Number.isFinite(value) || Object.is(value, -0)) fail('Invalid JSON number'); debit(String(value).length); return; }
    if (typeof value !== 'object' || seen.has(value)) fail('Local input must be an unshared JSON tree'); seen.add(value);
    const array = Array.isArray(value), prototype = Object.getPrototypeOf(value), keys = Reflect.ownKeys(value);
    if (array ? prototype !== Array.prototype : ![Object.prototype, null].includes(prototype)) fail('Invalid JSON prototype');
    if (array && keys.length !== value.length + 1) fail('Invalid dense array'); debit(2);
    for (const key of keys) {
      if (array && key === 'length') continue;
      const d = Object.getOwnPropertyDescriptor(value, key);
      if (typeof key !== 'string' || !d.enumerable || !Object.hasOwn(d, 'value')) fail('Invalid JSON accessor/key');
      if (array && (!/^(0|[1-9]\d*)$/.test(key) || Number(key) >= value.length)) fail('Invalid array index');
      if (!array) string(key); debit(2); visit(d.value, depth + 1);
    }
  }
  visit(value, 0);
}
function monotone(current, before) {
  for (const key of Object.keys(before)) {
    if (typeof before[key] === 'number' && (typeof current[key] !== 'number' || current[key] + 1e-10 < before[key])) fail('Reversed lifetime receipt');
    if (before[key] && typeof before[key] === 'object') monotone(current[key], before[key]);
  }
}
function extendsWorld(world, root) {
  if (world.clock.now < root.clock.now || world.caches < root.caches || world.milestoneAt !== root.milestoneAt || world.solo !== root.solo || !same(world.options, root.options) || !same(world.origin, root.origin)) fail('World does not extend pinned entry');
  if (world.clock.nextEvent < root.clock.nextEvent) fail('Reversed event identity');
  for (const p of Object.keys(root.structures)) if (world.structures[p] !== root.structures[p]) fail('Changed established structure');
  for (const actor of Object.keys(root.people)) {
    const a = world.people[actor], b = root.people[actor];
    if (a.id !== b.id || a.version !== b.version || a.minutes < b.minutes || a.nextAttempt < b.nextAttempt) fail('Changed person identity/time');
    monotone(a.skills, b.skills);
    if (a.minutes === b.minutes && !same(a.body, b.body)) fail('Unpaid body change at entry minute');
  }
  monotone(world.paid, root.paid); monotone(world.stats, root.stats);
}
function rootFor(record) {
  if (record.kind === 'legacy-rain') {
    fields(record.root, ['snapshot', 'options'], 'Rain root');
    const source = rain.restoreGame(record.root.snapshot);
    return { world: camp.migrateLegacyGame({ format: 'human-common-ground', version: 1, game: source.world }, record.root.options),
      enteredAt: source.openedAt, carriedCaches: 0, production: source.production.map((p, i) => ({ cache: i + 1, at: p.at })),
      allocations: source.allocations, acknowledged: true, departedAt: source.departedAt, finishedAt: source.ended ? source.world.clock.now : null };
  }
  if (!['earned', 'legacy'].includes(record.kind)) fail('Invalid origin kind');
  const world = camp.restoreGame(record.root);
  if (world.solo || world.milestoneAt === null || record.kind === 'earned' && world.milestoneAt !== world.clock.now) fail('Invalid milestone root');
  if (record.kind === 'legacy' && (!world.origin || !same(world, camp.migrateLegacyGame(world.origin, world.options)))) fail('Changed original migration root');
  return { world, enteredAt: world.clock.now, carriedCaches: world.caches, production: [], allocations: [], acknowledged: false, departedAt: null, finishedAt: null };
}
function commandShape(command) {
  const schema = { start: ['type', 'id'], cancel: ['type'], request: ['type', 'project'], release: ['type'], handover: ['type', 'from', 'to'], advance: ['type', 'minutes'], continue: ['type'], allocate: ['type', 'destination'], dispatch: ['type'], finish: ['type'], return: ['type'] };
  if (!command || !schema[command.type]) fail('Unknown inert journal command'); fields(command, schema[command.type], 'inert command');
  if (command.type === 'advance') integer(command.minutes, 1, 180, 'advance amount');
}
export function restoreLocal(snapshot) {
  inspect(snapshot); fields(snapshot, ['format', 'version', 'game'], 'snapshot');
  if (snapshot.format !== 'human-camp-story' || snapshot.version !== 1) fail('Incompatible snapshot');
  const game = snapshot.game; fields(game, ['version', 'world', 'window', 'record', 'returned'], 'story');
  if (game.version !== '0.1.0' || typeof game.returned !== 'boolean') fail('Invalid story identity');
  const world = camp.restoreGame({ format: 'human-camp', version: 2, game: game.world });
  if (world.solo) fail('Shared world required');
  if (game.window === null) {
    if (game.record !== null || game.returned || world.milestoneAt !== null || world.clock.now > 1e9 - 180) fail('Invalid pre-entry state');
    return structuredClone(game);
  }
  fields(game.record, ['kind', 'root', 'commands'], 'record');
  if (!Array.isArray(game.record.commands) || game.record.commands.length > 2048) fail('Invalid journal bound');
  game.record.commands.forEach(commandShape); // Shapes only: never execute or trust their physical claims.
  const root = rootFor(game.record), w = game.window, now = world.clock.now;
  fields(w, ['enteredAt', 'ferryAt', 'rainAt', 'carriedCaches', 'production', 'allocations', 'acknowledged', 'departedAt', 'finishedAt'], 'window');
  extendsWorld(world, root.world);
  if (w.enteredAt !== root.enteredAt || w.ferryAt !== w.enteredAt + 90 || w.rainAt !== w.enteredAt + 180 || w.rainAt > 1e9 || w.carriedCaches !== root.carriedCaches || typeof w.acknowledged !== 'boolean') fail('Changed pinned window');
  if (root.acknowledged && !w.acknowledged || !w.acknowledged && (now !== root.world.clock.now || w.production.length || w.allocations.length || w.departedAt !== null || w.finishedAt !== null || game.returned)) fail('Unacknowledged window advanced');
  const end = w.finishedAt ?? now;
  integer(end, root.world.clock.now, w.rainAt, 'window end');
  if (!game.returned && now !== end || game.returned && w.finishedAt === null) fail('Invalid return/end time');
  if (w.departedAt !== null && w.departedAt !== w.ferryAt || w.departedAt === null && end > w.ferryAt || w.departedAt !== null && end < w.ferryAt) fail('Invalid departure');
  if (root.departedAt !== null && w.departedAt !== root.departedAt || root.finishedAt !== null && w.finishedAt !== root.finishedAt) fail('Changed fixed Rain settlement');
  if (!Array.isArray(w.production) || w.production.length > 180 || !Array.isArray(w.allocations) || w.allocations.length > 4) fail('Invalid receipt bound');
  if (!same(w.production.slice(0, root.production.length), root.production) || !same(w.allocations.slice(0, root.allocations.length), root.allocations)) fail('Changed fixed Rain prefix');
  if (game.returned ? world.caches < w.carriedCaches + w.production.length : world.caches !== w.carriedCaches + w.production.length) fail('Incorrect physical cache count');
  let previous = w.enteredAt;
  for (let i = 0; i < w.production.length; i++) {
    const receipt = w.production[i]; fields(receipt, ['cache', 'at'], 'production');
    if (receipt.cache !== w.carriedCaches + i + 1) fail('Invalid production identity');
    integer(receipt.at, previous + (i ? 6 : 1), end, 'production time'); previous = receipt.at;
    if (i >= root.production.length && receipt.at <= root.world.clock.now) fail('Unpaid post-root production');
  }
  if (!game.returned && w.production.length > root.production.length && world.lastAssemblies.cache?.completedAt !== w.production.at(-1).at) fail('Latest cache receipt contradicts kernel');
  const used = new Set(), destinations = { households: 0, camp: 0 }; previous = w.enteredAt;
  for (const allocation of w.allocations) {
    fields(allocation, ['at', 'cache', 'destination'], 'allocation');
    if (!Object.hasOwn(destinations, allocation.destination) || ++destinations[allocation.destination] > 2) fail('Invalid destination capacity');
    integer(allocation.cache, 1, w.carriedCaches + w.production.length, 'allocated cache');
    integer(allocation.at, previous, allocation.destination === 'households' ? Math.min(end, w.ferryAt) : end, 'allocation time'); previous = allocation.at;
    const born = allocation.cache <= w.carriedCaches ? w.enteredAt : w.production[allocation.cache - w.carriedCaches - 1].at;
    if (allocation.at < born || used.has(allocation.cache)) fail('Unborn or duplicate allocation');
    let expected = 1; while (used.has(expected)) expected++;
    if (allocation.cache !== expected) fail('Changed first-available allocation identity'); used.add(allocation.cache);
  }
  if (w.finishedAt !== null && end !== w.rainAt && !(w.departedAt !== null && destinations.households === 2 && destinations.camp === 2)) fail('Invalid early finish');
  return structuredClone(game);
}
