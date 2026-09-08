import test from 'node:test';
import assert from 'node:assert/strict';
import * as camp from '../src/games/camp-current.js';
import { createSession, pauseSession, playSession, commandSession, advanceSession, nextEventSession,
  STORAGE_KEY, MAX_SAVE_BYTES, createSaveStore, createImportPreview } from '../web/camp-current-session.js';

const current = game => JSON.stringify(camp.exportGame(game));
const file = raw => ({ size: new TextEncoder().encode(raw).length, text: async () => raw });
function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial)), reads = [], writes = [];
  return { data, reads, writes,
    getItem(key) { reads.push(key); return data.get(key) ?? null; },
    setItem(key, value) { writes.push(key); data.set(key, value); },
  };
}
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

test('pause preserves paid pending work; stop preserves the stage and pays no time', () => {
  let session = commandSession(createSession(), { type: 'start', job: 'build-shelter' });
  session = advanceSession(playSession(session), 1);
  const before = current(session.game), paused = pauseSession(session, 'Reading.');
  assert.equal(paused.running, false); assert.equal(current(paused.game), before);
  const stopped = commandSession(paused, { type: 'cancel' }), view = camp.getGameView(stopped.game);
  assert.equal(view.people.player.job, null); assert.ok(view.work.shelter.progress > 0); assert.equal(view.now, 1);
});

test('a large playback tick stops at completed work instead of consuming the remainder', () => {
  let session = commandSession(createSession(), { type: 'start', job: 'build-shelter' });
  const due = camp.getGameView(session.game).people.player.job.endsAt;
  for (let i = 0; camp.getGameView(session.game).people.player.job && i < 30; i++) session = advanceSession(playSession(session), 100);
  assert.equal(camp.getGameView(session.game).now, due); assert.equal(session.running, false);
});

test('invalid commands preserve the game and available next-event recovery is finite', () => {
  const session = createSession(), before = current(session.game);
  for (const command of [{ type: 'missing' }, { type: 'start', job: 'build-cache' }, null]) {
    const failed = commandSession(session, command);
    assert.equal(current(failed.game), before); assert.equal(failed.running, false); assert.ok(failed.error);
  }
  assert.throws(() => advanceSession(session, -1));
  const next = nextEventSession(session), now = camp.getGameView(next.game).now;
  assert.ok(now > 0 && now <= 6); assert.equal(next.running, false);
});

test('one current save reloads paid work paused and never reads or overwrites older keys', () => {
  const oldKey = 'human-camp-story-slots-v1', storage = memoryStorage({ [oldKey]: 'unread old book' });
  const store = createSaveStore(storage), game = advanceSession(commandSession(createSession(), { type: 'start', job: 'gather-timber' }), 3).game;
  assert.equal(STORAGE_KEY, 'human-camp-current-v0.3.0'); assert.equal(store.load().game, null);
  assert.equal(store.save(game).ok, true);
  const restored = createSession(createSaveStore(storage).load().game);
  assert.equal(current(restored.game), current(game)); assert.equal(restored.running, false);
  assert.equal(storage.data.get(oldKey), 'unread old book'); assert.deepEqual(storage.reads, [STORAGE_KEY, STORAGE_KEY]);
  assert.deepEqual(storage.writes, [STORAGE_KEY]);
  assert.equal(current(camp.advanceGame(restored.game, 1)), current(camp.advanceGame(game, 1)));
});

test('unreadable current save is preserved with a raw backup while new play remains exportable', () => {
  for (const raw of ['{bad', 'null', JSON.stringify({ format: 'human-camp-story', version: 1 })]) {
    const storage = memoryStorage({ [STORAGE_KEY]: raw }), store = createSaveStore(storage), loaded = store.load();
    assert.equal(loaded.game, null); assert.equal(loaded.backup, raw); assert.ok(loaded.error);
    const game = nextEventSession(createSession()).game;
    assert.equal(store.save(game).ok, false); assert.equal(storage.data.get(STORAGE_KEY), raw);
    assert.deepEqual(storage.writes, []); assert.equal(current(camp.restoreGame(JSON.parse(current(game)))), current(game));
  }
});

test('read denial and quota failure preserve play; a later successful write can retry quota failures', () => {
  const denied = createSaveStore({ getItem() { throw Error('denied'); }, setItem() { assert.fail('Unread storage must be protected'); } });
  assert.ok(denied.load().error); assert.equal(denied.save(camp.createGame()).ok, false);
  const storage = memoryStorage(), store = createSaveStore(storage); store.load();
  const savedSet = storage.setItem; storage.setItem = () => { throw Error('quota'); };
  const game = nextEventSession(createSession()).game, before = current(game);
  assert.equal(store.save(game).ok, false); assert.equal(current(game), before);
  storage.setItem = savedSet; assert.equal(store.save(game).ok, true);
  assert.equal(current(createSaveStore(storage).load().game), before);
});

test('import previews current state without replacing it until explicit confirmation', async () => {
  let game = camp.createGame(); const before = current(game), gate = createImportPreview(() => game);
  const imported = nextEventSession(createSession()).game, ready = await gate.read(file(current(imported)));
  assert.equal(ready.status, 'ready'); assert.equal(current(game), before);
  assert.equal(camp.getGameView(ready.game).now, camp.getGameView(imported).now);
  game = gate.confirm(); assert.equal(current(game), current(imported));
  assert.throws(() => gate.confirm(), /no longer current/);
});

test('invalid, unsupported and oversized imports leave the active camp and preview unchanged', async () => {
  const game = camp.createGame(), before = current(game), gate = createImportPreview(() => game);
  for (const raw of ['{bad', 'null', JSON.stringify({ format: 'human-camp-story' }), ' '.repeat(MAX_SAVE_BYTES + 1)]) {
    const result = await gate.read(file(raw)); assert.equal(result.status, 'error'); assert.ok(result.error);
    assert.equal(current(game), before); assert.throws(() => gate.confirm(), /no longer current/);
  }
  const utf8 = '"' + '界'.repeat(MAX_SAVE_BYTES / 2) + '"';
  const result = await gate.read({ size: 1, text: async () => utf8 });
  assert.equal(result.status, 'error'); assert.match(result.error, /megabyte/);
});

test('an older asynchronous success or failure cannot replace a newer preview', async () => {
  const game = camp.createGame(), gate = createImportPreview(() => game), newer = nextEventSession(createSession()).game;
  for (const rejected of [false, true]) {
    const slow = deferred(), pending = gate.read({ size: 1, text: () => slow.promise });
    assert.equal((await gate.read(file(current(newer)))).status, 'ready');
    if (rejected) slow.reject(Error('old read failed')); else slow.resolve(current(game));
    assert.equal((await pending).status, 'stale'); assert.equal(current(gate.confirm()), current(newer));
  }
});

test('new play, replacing the camp and cancelling invalidate pending imports and previews', async () => {
  let game = camp.createGame(); const gate = createImportPreview(() => game);
  const slow = deferred(), pending = gate.read({ size: 1, text: () => slow.promise });
  game = nextEventSession(createSession(game)).game; slow.resolve(current(camp.createGame()));
  assert.equal((await pending).status, 'stale'); assert.throws(() => gate.confirm());
  await gate.read(file(current(camp.createGame()))); game = camp.createGame();
  assert.throws(() => gate.confirm(), /no longer current/);
  await gate.read(file(current(game))); gate.invalidate(); assert.throws(() => gate.confirm());
  const cancelled = deferred(), read = gate.read({ size: 1, text: () => cancelled.promise });
  gate.invalidate(); cancelled.reject(Error('read interrupted')); assert.equal((await read).status, 'stale');
});
