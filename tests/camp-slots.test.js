import test from 'node:test';
import assert from 'node:assert/strict';
import * as story from '../src/games/camp-story.js';
import { STORAGE_KEY, MAX_SLOTS, createBook, addStory, updateActive, selectStory, removeStory, getActiveGame, restoreBook, serializeBook } from '../web/camp-slots.js';

const copy = value => JSON.parse(JSON.stringify(value));
const newStory = () => story.createGame();
const one = () => addStory(createBook(), newStory(), { id: 'first', at: 100 });

test('new book and stories have an explicit separate bounded identity', () => {
  assert.equal(STORAGE_KEY, 'human-camp-story-slots-v1'); assert.equal(MAX_SLOTS, 5);
  const empty = createBook();
  assert.deepEqual(empty, { format: 'human-camp-book', version: 1, nextOrdinal: 1, activeId: null, slots: [] });
  assert.equal(getActiveGame(empty), null);
  let book = empty;
  for (let n = 1; n <= 5; n++) book = addStory(book, newStory(), { id: `story-${n}`, at: n });
  assert.equal(book.activeId, 'story-5'); assert.equal(book.nextOrdinal, 6);
  assert.deepEqual(book.slots.map(s => s.label), ['Camp 1', 'Camp 2', 'Camp 3', 'Camp 4', 'Camp 5']);
  const before = copy(book);
  assert.throws(() => addStory(book, newStory(), { id: 'sixth', at: 6 }), /five|5|full|limit/i);
  assert.deepEqual(book, before); assert.deepEqual(empty, createBook());
});

test('active paid work updates one slot while older camp and save copies stay exact', () => {
  const game = story.advanceGame(story.startJob(newStory(), 'gather-timber'), 3);
  const first = addStory(createBook(), game, { id: 'first', at: 100 });
  const firstBefore = copy(first);
  let book = addStory(first, newStory(), { id: 'second', at: 200 });
  assert.deepEqual(book.slots[0], first.slots[0]);
  book = selectStory(book, 'first');
  assert.deepEqual(getActiveGame(book), game);
  const next = story.advanceGame(getActiveGame(book), 2);
  const updated = updateActive(book, next, 250);
  assert.equal(updated.slots[0].createdAt, 100); assert.equal(updated.slots[0].updatedAt, 250);
  assert.equal(getActiveGame(updated).world.people.player.pending.elapsedMinutes, 5);
  assert.deepEqual(updated.slots[1], book.slots[1]); assert.deepEqual(first, firstBefore);
  const restored = restoreBook(serializeBook(updated));
  assert.deepEqual(restored, updated);
  assert.deepEqual(story.advanceGame(getActiveGame(restored), 1), story.advanceGame(next, 1));
  restored.slots[1].save.game.world.stock.food = 999;
  assert.notEqual(updated.slots[1].save.game.world.stock.food, 999);
});

test('only explicit removal deletes a slot, selects a survivor, and keeps ordinal monotonic', () => {
  let book = addStory(one(), newStory(), { id: 'second', at: 200 });
  const source = copy(book);
  book = removeStory(book, 'second'); assert.equal(book.activeId, 'first');
  assert.deepEqual(source.slots.length, 2);
  book = addStory(book, newStory(), { id: 'third', at: 300 });
  assert.equal(book.slots[1].label, 'Camp 3');
  book = removeStory(book, 'first'); assert.equal(book.activeId, 'third');
  book = removeStory(book, 'third'); assert.equal(book.activeId, null); assert.equal(getActiveGame(book), null);
  assert.equal(book.nextOrdinal, 4);
});

test('invalid references and metadata reject without changing the valid book', () => {
  const book = one(), before = copy(book);
  for (const call of [() => addStory(book, newStory(), { id: 'first', at: 200 }), () => selectStory(book, 'missing'),
    () => removeStory(book, 'missing'), () => updateActive(createBook(), newStory(), 1),
    () => addStory(book, newStory(), { id: '', at: 200 }), () => addStory(book, newStory(), { id: '<bad>', at: 200 }),
    () => addStory(book, newStory(), { id: 'next', at: NaN }), () => updateActive(book, newStory(), 99)]) assert.throws(call);
  assert.deepEqual(book, before);
  for (const mutate of [b => b.activeId = 'missing', b => b.activeId = null, b => b.version = 2,
    b => b.nextOrdinal = 1, b => b.slots[0].label = 'Camp 0', b => b.slots[0].updatedAt = 50,
    b => b.extra = true, b => b.slots[0].extra = true, b => b.slots.push(copy(b.slots[0]))]) {
    const invalid = copy(book); mutate(invalid); assert.throws(() => restoreBook(JSON.stringify(invalid)));
  }
});

test('every saved world validates, including inactive corruption and malformed raw JSON', () => {
  const book = addStory(one(), newStory(), { id: 'second', at: 200 });
  book.slots[0].save.game.world.stock.food++;
  assert.throws(() => getActiveGame(book)); assert.throws(() => serializeBook(book)); assert.throws(() => restoreBook(JSON.stringify(book)));
  for (const raw of [null, {}, '', '{bad', 'null', '[]', JSON.stringify(story.exportGame(newStory()))]) assert.throws(() => restoreBook(raw));
  const huge = ' '.repeat(6 * 1024 * 1024 + 1);
  assert.throws(() => restoreBook(huge), /size|large|limit/i);
  assert.equal(huge.length, 6 * 1024 * 1024 + 1);
  assert.throws(() => restoreBook('"' + '界'.repeat(3 * 1024 * 1024) + '"'), /size|large|limit/i);
});

test('cycles, aliases, accessors, symbol keys, sparse arrays and hidden fields reject before reading', () => {
  let read = 0;
  const accessor = one(); Object.defineProperty(accessor, 'activeId', { enumerable: true, get() { read++; return 'first'; } });
  assert.throws(() => serializeBook(accessor), /accessor|JSON/i); assert.equal(read, 0);
  const options = { id: 'next' }; Object.defineProperty(options, 'at', { enumerable: true, get() { read++; return 200; } });
  assert.throws(() => addStory(one(), newStory(), options)); assert.equal(read, 0);
  const cycle = one(); cycle.slots[0].save.game.extra = cycle;
  assert.throws(() => serializeBook(cycle), /tree|shared|cycle|JSON/i);
  const alias = addStory(one(), newStory(), { id: 'second', at: 200 }); alias.slots[1].save = alias.slots[0].save;
  assert.throws(() => serializeBook(alias), /tree|shared|alias|JSON/i);
  let expansion = {}; for (let n = 0; n < 25; n++) expansion = { a: expansion, b: expansion };
  assert.throws(() => serializeBook(expansion), /tree|shared|alias|JSON|fields/i);
  const symbol = one(); symbol[Symbol('hidden')] = 1; assert.throws(() => serializeBook(symbol));
  const hidden = one(); Object.defineProperty(hidden, 'hidden', { value: 1 }); assert.throws(() => serializeBook(hidden));
  const sparse = one(); sparse.slots = new Array(1); assert.throws(() => serializeBook(sparse));
  const customArray = one(); customArray.slots.foo = 1; assert.throws(() => serializeBook(customArray));
});

test('raw six MiB is inclusive, story size is independent, and label exhaustion preserves access', () => {
  const valid = serializeBook(one()), maximum = valid + ' '.repeat(6 * 1024 * 1024 - Buffer.byteLength(valid, 'utf8'));
  assert.deepEqual(restoreBook(maximum), restoreBook(valid));
  assert.throws(() => restoreBook(maximum + ' '), /size|limit/i);
  const oversizedStory = one();
  oversizedStory.slots[0].save.extra = Object.fromEntries(Array.from({ length: 1100 }, (_, n) => [String(n), 'x'.repeat(1000)]));
  assert.throws(() => serializeBook(oversizedStory), /size|limit/i);
  const exhausted = one(); exhausted.nextOrdinal = Number.MAX_SAFE_INTEGER;
  assert.throws(() => addStory(exhausted, newStory(), { id: 'next', at: 200 }), /ordinal|limit/i);
  assert.deepEqual(getActiveGame(exhausted), newStory());
  assert.equal(removeStory(exhausted, 'first').activeId, null);
});
