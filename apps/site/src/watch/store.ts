/**
 * The chronicle's saved pages, kept in IndexedDB from the worker (spec §6: the chronicle is the menu, volumes are
 * the save slots, no rewind within a volume). Each kept page is the run's seed, input log and whole state
 * (`Snapshot`), gzipped where the browser can.
 *
 * G3-4: three kinds of page per chronicle.
 * - `auto`, the running page: one per chronicle, written often (after inputs, every few real seconds while the
 *   clock runs, when the chronicle opens and when the tab is hidden), so little is lost on a reload. "Continue"
 *   always opens this page: there is no going back to an earlier page of the same chronicle.
 * - `season`, a backup taken as each season opens. Only the last two are kept, and only to open the chronicle if
 *   its running page cannot be read. They are not offered as load points (that would be a rewind).
 * - `volume`, kept when a volume closes: the book on the shelf. It is never pruned while its chronicle is kept.
 *   Taking up a closed volume starts a *new* chronicle from that page; the old chronicle stays as it was.
 *
 * Every storage call is wrapped: without IndexedDB (a private window, blocked site data, a preview) the game plays
 * on and the shelf simply has nothing to load. Saving never touches the run: the snapshot text is taken
 * synchronously between minutes and written in the background, one write at a time.
 */
import type { Snapshot } from './sim/run.ts';

export interface PageInfo {
  /** `${chronicle}:auto`, `${chronicle}:${year}:${season}` or `${chronicle}:vol:${n}`. */
  id: string;
  /** Which chronicle (one per new game, and one per volume taken up again). */
  chronicle: string;
  kind: 'auto' | 'season' | 'volume';
  seed: number;
  year: number;
  /** The season or page the save was taken in, in words for the shelf. */
  when: string;
  /** Wall-clock time of the save (for ordering only; never part of the run). */
  savedAt: number;
  /** A closed volume's book: its numeral, title and how its question ended. */
  volume?: { numeral: string; title: string; end: string | null };
}

const DB = 'night-watch';
const INFO = 'info';
const DATA = 'data';
/** Season backups kept per chronicle. */
const KEEP_SEASONS = 2;
/** Chronicles kept on the shelf; older ones are dropped whole. */
const KEEP_CHRONICLES = 4;

let opening: Promise<IDBDatabase | null> | null = null;
let queue: Promise<unknown> = Promise.resolve();

/** Forget the open database (tests swap in a fresh IndexedDB). */
export function resetStore(): void {
  opening = null;
  queue = Promise.resolve();
}

function open(): Promise<IDBDatabase | null> {
  if (opening) return opening;
  opening = new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') return resolve(null);
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(INFO)) db.createObjectStore(INFO, { keyPath: 'id' });
        if (!db.objectStoreNames.contains(DATA)) db.createObjectStore(DATA);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return opening;
}

function done(tx: IDBTransaction): Promise<boolean> {
  return new Promise((resolve) => {
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => resolve(false);
    tx.onabort = () => resolve(false);
  });
}

function request<T>(req: IDBRequest<T>): Promise<T | null> {
  return new Promise((resolve) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}

/** Gzips a page's text where the browser can (else keeps the text). */
export async function pack(text: string): Promise<Blob | string> {
  try {
    if (typeof CompressionStream === 'undefined') return text;
    const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
    return await new Response(stream).blob();
  } catch {
    return text;
  }
}

export async function unpack(data: Blob | string): Promise<string | null> {
  try {
    if (typeof data === 'string') return data;
    const stream = data.stream().pipeThrough(new DecompressionStream('gzip'));
    return await new Response(stream).text();
  } catch {
    return null;
  }
}

/** Every saved page, newest first ([] without storage). */
export async function listPages(): Promise<PageInfo[]> {
  try {
    const db = await open();
    if (!db) return [];
    const all = await request(
      db.transaction(INFO, 'readonly').objectStore(INFO).getAll() as IDBRequest<PageInfo[]>,
    );
    return (all ?? []).sort((a, b) => b.savedAt - a.savedAt);
  } catch {
    return [];
  }
}

async function readPage(id: string): Promise<Snapshot | null> {
  try {
    const db = await open();
    if (!db) return null;
    const data = await request(
      db.transaction(DATA, 'readonly').objectStore(DATA).get(id) as IDBRequest<Blob | string>,
    );
    if (data === null || data === undefined) return null;
    const text = await unpack(data);
    return text === null ? null : (JSON.parse(text) as Snapshot);
  } catch {
    return null;
  }
}

/**
 * A saved page's snapshot, or null if it is gone, unreadable or storage is unavailable. A chronicle's running page
 * that cannot be read falls back to its newest season backup.
 */
export async function loadPage(id: string): Promise<Snapshot | null> {
  await queue.catch(() => {});
  const snap = await readPage(id);
  if (snap || !id.endsWith(':auto')) return snap;
  const chronicle = id.slice(0, -':auto'.length);
  for (const p of await listPages()) {
    if (p.chronicle !== chronicle || p.kind !== 'season') continue;
    const backup = await readPage(p.id);
    if (backup) return backup;
  }
  return null;
}

/**
 * Queues a page to be written (the text is the snapshot as JSON, taken now). Older season backups and chronicles
 * beyond the kept number are dropped after the write (`pruneIds`). Resolves false if nothing was kept.
 */
export function savePage(info: PageInfo, text: string): Promise<boolean> {
  const job = queue.then(async () => {
    try {
      const db = await open();
      if (!db) return false;
      const data = await pack(text);
      const tx = db.transaction([INFO, DATA], 'readwrite');
      tx.objectStore(INFO).put(info);
      tx.objectStore(DATA).put(data, info.id);
      if (!(await done(tx))) return false;
      if (info.kind !== 'auto') await prune(db, info.chronicle);
      return true;
    } catch {
      return false;
    }
  });
  queue = job;
  return job;
}

/**
 * The pages to drop, given every page newest first and the chronicle being written: season backups beyond the last
 * two of that chronicle, and every page of chronicles beyond the newest few (the one being written always stays).
 * Closed volumes of a kept chronicle are never dropped.
 */
export function pruneIds(all: PageInfo[], current: string): string[] {
  const drop: string[] = [];
  const seasons = all.filter((p) => p.chronicle === current && p.kind === 'season');
  for (const p of seasons.slice(KEEP_SEASONS)) drop.push(p.id);
  const chronicles: string[] = [current];
  for (const p of all) if (!chronicles.includes(p.chronicle)) chronicles.push(p.chronicle);
  for (const c of chronicles.slice(KEEP_CHRONICLES))
    for (const p of all) if (p.chronicle === c) drop.push(p.id);
  return drop;
}

async function prune(db: IDBDatabase, current: string): Promise<void> {
  try {
    const drop = pruneIds(await listPages(), current);
    if (drop.length === 0) return;
    const tx = db.transaction([INFO, DATA], 'readwrite');
    for (const id of drop) {
      tx.objectStore(INFO).delete(id);
      tx.objectStore(DATA).delete(id);
    }
    await done(tx);
  } catch {
    // Pruning is housekeeping: a failure leaves an extra page, nothing worse.
  }
}
