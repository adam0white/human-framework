/**
 * The chronicle's saved pages (G3-3), kept in IndexedDB from the worker: one page at the start of each season and
 * one running autosave per chronicle, each the run's seed, input log and whole state (`Snapshot`), gzipped where the
 * browser can. Every storage call is wrapped: without IndexedDB (a private window, blocked site data, a preview) the
 * game plays on and the shelf simply has nothing to load. Saving never touches the run: the snapshot text is taken
 * synchronously between minutes and written in the background, one write at a time.
 */
import type { Snapshot } from './sim/run.ts';

export interface PageInfo {
  /** `${chronicle}:auto` for the autosave, `${chronicle}:${year}:${season}` for a season page. */
  id: string;
  /** Which chronicle (one per new game). */
  chronicle: string;
  kind: 'auto' | 'season';
  seed: number;
  year: number;
  /** The season or page the save was taken in, in words for the shelf. */
  when: string;
  /** Wall-clock time of the save (for ordering only; never part of the run). */
  savedAt: number;
}

const DB = 'night-watch';
const INFO = 'info';
const DATA = 'data';
/** Season pages kept per chronicle (three years). */
const KEEP_SEASONS = 12;
/** Chronicles kept on the shelf; older ones are dropped whole. */
const KEEP_CHRONICLES = 3;

let opening: Promise<IDBDatabase | null> | null = null;
let queue: Promise<unknown> = Promise.resolve();

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

async function pack(text: string): Promise<Blob | string> {
  try {
    if (typeof CompressionStream === 'undefined') return text;
    const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
    return await new Response(stream).blob();
  } catch {
    return text;
  }
}

async function unpack(data: Blob | string): Promise<string | null> {
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

/** A saved page's snapshot, or null if it is gone, unreadable or storage is unavailable. */
export async function loadPage(id: string): Promise<Snapshot | null> {
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
 * Queues a page to be written (the text is the snapshot as JSON, taken now). Season pages beyond the last twelve of
 * a chronicle, and chronicles beyond the last three, are dropped after the write. Resolves false if nothing was kept.
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
      await prune(db, info.chronicle);
      return true;
    } catch {
      return false;
    }
  });
  queue = job;
  return job;
}

async function prune(db: IDBDatabase, current: string): Promise<void> {
  try {
    const all = await listPages();
    const drop: string[] = [];
    const seasons = all.filter((p) => p.chronicle === current && p.kind === 'season');
    for (const p of seasons.slice(KEEP_SEASONS)) drop.push(p.id);
    const chronicles: string[] = [];
    for (const p of all) if (!chronicles.includes(p.chronicle)) chronicles.push(p.chronicle);
    for (const c of chronicles.slice(KEEP_CHRONICLES))
      for (const p of all) if (p.chronicle === c) drop.push(p.id);
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
