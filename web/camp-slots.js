/** Pure story collection. Persistence, clocks and explicit deletion confirmation belong to the UI. */
import * as story from '../src/games/camp-story.js';

export const STORAGE_KEY = 'human-camp-story-slots-v1';
export const MAX_SLOTS = 5;
const MAX_BOOK_BYTES = 6 * 1024 * 1024, MAX_STORY_BYTES = 1024 * 1024;
const MAX_NODES = 1250128, MAX_DEPTH = 64;
const copy = value => structuredClone(value);
const fail = message => { throw new Error(message); };

// Count UTF-8 before JSON.parse or serialization; a large string never requires an encoded copy.
function utf8Bytes(value, limit) {
  let bytes = 0;
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index);
    if (code <= 0x7f) bytes++;
    else if (code <= 0x7ff) bytes += 2;
    else if (code >= 0xd800 && code <= 0xdbff && index + 1 < value.length && value.charCodeAt(index + 1) >= 0xdc00 && value.charCodeAt(index + 1) <= 0xdfff) { bytes += 4; index++; }
    else bytes += 3;
    if (bytes > limit) fail('Camp book exceeds its bounded size limit.');
  }
  return bytes;
}

/** Reject aliases before expansion and accessors before any property read. */
function inspectTree(root, limit = MAX_BOOK_BYTES) {
  const seen = new WeakSet();
  let nodes = 0, bytes = 0;
  const debit = amount => { bytes += amount; if (bytes > limit) fail('Camp book exceeds its bounded size limit.'); };
  const string = value => {
    if (value.length > 10000) fail('Camp book JSON string exceeds its size limit.');
    debit(utf8Bytes(JSON.stringify(value), limit));
  };
  function visit(value, depth) {
    if (++nodes > MAX_NODES || depth > MAX_DEPTH) fail('Camp book exceeds its bounded JSON size.');
    if (value === null) { debit(4); return; }
    if (typeof value === 'boolean') { debit(value ? 4 : 5); return; }
    if (typeof value === 'number') {
      if (!Number.isFinite(value) || Object.is(value, -0)) fail('Camp book requires finite JSON numbers.');
      debit(String(value).length); return;
    }
    if (typeof value === 'string') { string(value); return; }
    if (typeof value !== 'object' || seen.has(value)) fail('Camp book must be an unshared JSON tree.');
    seen.add(value);
    const array = Array.isArray(value), prototype = Object.getPrototypeOf(value);
    if (array ? prototype !== Array.prototype : ![Object.prototype, null].includes(prototype)) fail('Invalid camp book JSON object.');
    const keys = Reflect.ownKeys(value);
    if (keys.some(key => typeof key !== 'string')) fail('Invalid camp book JSON key.');
    if (array && (keys.length !== value.length + 1 || keys.some(key => key !== 'length' && (!/^(0|[1-9]\d*)$/.test(key) || Number(key) >= value.length)))) fail('Camp book requires dense JSON arrays.');
    debit(2);
    let count = 0;
    for (const key of keys) {
      if (array && key === 'length') continue;
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !Object.hasOwn(descriptor, 'value') || !descriptor.enumerable) fail('Camp book JSON accessors and hidden fields are invalid.');
      if (count++) debit(1);
      if (!array) { string(key); debit(1); }
      visit(descriptor.value, depth + 1);
    }
  }
  visit(root, 0);
  return bytes;
}

function fields(value, names, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length !== names.length || names.some(name => !Object.hasOwn(value, name))) fail(`Invalid ${label} fields.`);
}
function integer(value, minimum, maximum, label) {
  if (!Number.isSafeInteger(value) || Object.is(value, -0) || value < minimum || value > maximum) fail(`Invalid ${label}.`);
}
function id(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value)) fail('Invalid story slot ID.');
}
function timestamp(value) { integer(value, 0, Number.MAX_SAFE_INTEGER, 'story timestamp'); }
function validateBook(book) {
  inspectTree(book);
  fields(book, ['format', 'version', 'nextOrdinal', 'activeId', 'slots'], 'camp book');
  if (book.format !== 'human-camp-book' || book.version !== 1) fail('Incompatible camp book.');
  integer(book.nextOrdinal, 1, Number.MAX_SAFE_INTEGER, 'next camp ordinal');
  if (!Array.isArray(book.slots) || book.slots.length > MAX_SLOTS) fail('A camp book has at most five story slots.');
  const ids = new Set(), ordinals = new Set();
  for (const slot of book.slots) {
    fields(slot, ['id', 'label', 'createdAt', 'updatedAt', 'save'], 'story slot');
    id(slot.id); if (ids.has(slot.id)) fail('Duplicate story slot ID.'); ids.add(slot.id);
    if (typeof slot.label !== 'string' || !/^Camp [1-9]\d*$/.test(slot.label)) fail('Invalid camp label.');
    const ordinal = Number(slot.label.slice(5));
    integer(ordinal, 1, book.nextOrdinal - 1, 'camp label ordinal');
    if (ordinals.has(ordinal)) fail('Duplicate camp label.'); ordinals.add(ordinal);
    timestamp(slot.createdAt); timestamp(slot.updatedAt);
    if (slot.updatedAt < slot.createdAt) fail('Story update cannot precede its creation timestamp.');
    inspectTree(slot.save, MAX_STORY_BYTES);
    story.restoreGame(slot.save);
  }
  if (book.slots.length === 0 ? book.activeId !== null : !ids.has(book.activeId)) fail('Invalid active story slot.');
  return book;
}
function storySave(game) {
  inspectTree(game, MAX_STORY_BYTES);
  const save = story.exportGame(game);
  inspectTree(save, MAX_STORY_BYTES);
  story.restoreGame(save);
  return save;
}

export function createBook() {
  return { format: 'human-camp-book', version: 1, nextOrdinal: 1, activeId: null, slots: [] };
}
export function addStory(book, game, metadata) {
  validateBook(book); inspectTree(metadata); fields(metadata, ['id', 'at'], 'new story metadata');
  id(metadata.id); timestamp(metadata.at);
  if (book.slots.length >= MAX_SLOTS) fail('The five story slots are full. Remove a chosen story before adding another.');
  if (book.slots.some(slot => slot.id === metadata.id)) fail('This story slot ID already exists.');
  if (book.nextOrdinal === Number.MAX_SAFE_INTEGER) fail('Camp label ordinal limit reached.');
  const save = storySave(game), next = copy(book);
  next.slots.push({ id: metadata.id, label: `Camp ${book.nextOrdinal}`, createdAt: metadata.at, updatedAt: metadata.at, save });
  next.nextOrdinal++; next.activeId = metadata.id;
  return validateBook(next);
}
export function updateActive(book, game, at) {
  validateBook(book); timestamp(at);
  if (book.activeId === null) fail('There is no active story to update.');
  const active = book.slots.find(slot => slot.id === book.activeId);
  if (at < active.createdAt) fail('Story update cannot precede its creation timestamp.');
  const save = storySave(game), next = copy(book), slot = next.slots.find(slot => slot.id === next.activeId);
  slot.updatedAt = at; slot.save = save;
  return validateBook(next);
}
export function selectStory(book, selectedId) {
  validateBook(book); id(selectedId);
  if (!book.slots.some(slot => slot.id === selectedId)) fail('Unknown story slot.');
  return { ...copy(book), activeId: selectedId };
}
export function removeStory(book, removedId) {
  validateBook(book); id(removedId);
  if (!book.slots.some(slot => slot.id === removedId)) fail('Unknown story slot.');
  const next = copy(book); next.slots = next.slots.filter(slot => slot.id !== removedId);
  if (next.activeId === removedId) next.activeId = next.slots[0]?.id ?? null;
  return next;
}
export function getActiveGame(book) {
  validateBook(book);
  return book.activeId === null ? null : story.restoreGame(book.slots.find(slot => slot.id === book.activeId).save);
}
export function restoreBook(rawString) {
  if (typeof rawString !== 'string') fail('Camp book storage must contain a JSON string.');
  if (rawString.length > MAX_BOOK_BYTES) fail('Camp book exceeds its bounded size limit.');
  utf8Bytes(rawString, MAX_BOOK_BYTES);
  return validateBook(JSON.parse(rawString));
}
export function serializeBook(book) {
  validateBook(book);
  return JSON.stringify(book);
}
