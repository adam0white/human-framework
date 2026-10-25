/**
 * Pseudonymous, bounded background transport. JSON snapshots are split before gzip; each piece has a
 * stable content id, so retries replace no data and create no second object. IndexedDB keeps pending
 * pieces across reloads. Covers delivery, not game exports or consent to character analysis.
 */
import { type Build, gzip } from './util.ts';

export const LINKED_LIMITS = {
  compressed: 256 * 1024,
  inflated: 512 * 1024,
  total: 16 * 1024 * 1024,
  chunkChars: 64 * 1024,
  chunks: 128,
  queued: 256,
  queueBytes: 16 * 1024 * 1024,
} as const;
export type LinkedKind = 'events' | 'run' | 'save' | 'logs' | 'note';
export type Link = { player: string; session: string; runId: string };
type Pending = {
  kind?: LinkedKind;
  id: string;
  body: Blob;
  next: number;
  attempts: number;
  player: string;
  at: number;
};
export const randomId = () =>
  [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join('');
const hash = async (text: string) =>
  [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 32);

function database(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') return resolve(null);
    try {
      const request = indexedDB.open('hf-lab-pending', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('pieces', { keyPath: 'id' });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export function linkedTransport(options: {
  game: string;
  endpoint: string;
  link: () => Link | null;
  build: () => Build;
  override: () => boolean;
  enabled: () => boolean;
  ready?: Promise<void>;
}) {
  const pending = new Map<string, Pending>();
  const acknowledged = new Set<string>();
  const durable = new Set<string>();
  let bytes = 0;
  let busy = false;
  let generation = 0;
  const active = new Set<AbortController>();
  const deliveries = new Map<string, Promise<boolean>>();
  const db = database();
  const persist = async (record: Pending | string) => {
    const connection = await db;
    if (!connection) return;
    await new Promise<void>((resolve) => {
      try {
        const tx = connection.transaction('pieces', 'readwrite');
        const store = tx.objectStore('pieces');
        if (typeof record === 'string') store.delete(record);
        else store.put(record);
        tx.oncomplete = () => {
          if (typeof record === 'string') durable.delete(record);
          else durable.add(record.id);
          resolve();
        };
        tx.onerror = () => resolve();
        tx.onabort = () => resolve();
      } catch {
        resolve();
      }
    });
  };
  const remove = (record: Pending) => {
    if (pending.delete(record.id)) bytes -= record.body.size;
    void persist(record.id);
  };
  const ready = (options.ready ?? Promise.resolve())
    .then(() => db)
    .then(
      (connection) =>
        new Promise<void>((resolve) => {
          if (!connection) return resolve();
          try {
            const request = connection.transaction('pieces').objectStore('pieces').getAll();
            request.onsuccess = async () => {
              const link = options.link();
              for (const record of request.result as Pending[]) {
                // Queues written before 0.4.7 omitted kind. Recover it without
                // changing the original compressed envelope or content id.
                if (!record.kind) {
                  try {
                    const envelope = (await new Response(
                      record.body.stream().pipeThrough(new DecompressionStream('gzip')),
                    ).json()) as { kind?: LinkedKind };
                    record.kind = envelope.kind;
                  } catch {
                    /* Keep unreadable pieces under the usual bounded retry policy. */
                  }
                }
                if (
                  !options.enabled() ||
                  record.player !== link?.player ||
                  (record.kind !== 'note' && Date.now() - record.at > 7 * 86400000) ||
                  pending.size >= LINKED_LIMITS.queued ||
                  bytes + record.body.size > LINKED_LIMITS.queueBytes
                ) {
                  void persist(record.id);
                  continue;
                }
                pending.set(record.id, record);
                durable.add(record.id);
                bytes += record.body.size;
              }
              resolve();
            };
            request.onerror = () => resolve();
          } catch {
            resolve();
          }
        }),
    );
  function deliver(record: Pending): Promise<boolean> {
    const existing = deliveries.get(record.id);
    if (existing) return existing;
    const task = (async () => {
      const epoch = generation;
      const controller = new AbortController();
      active.add(controller);
      const timeout = setTimeout(() => controller.abort(), 15000);
      let status = 0;
      try {
        const response = await fetch(`${options.endpoint}/linked`, {
          method: 'POST',
          body: record.body,
          headers: { 'Content-Type': 'application/gzip' },
          credentials: 'omit',
          referrerPolicy: 'no-referrer',
          mode: 'cors',
          signal: controller.signal,
        });
        status = response.status;
      } catch {
      } finally {
        clearTimeout(timeout);
        active.delete(controller);
      }
      if (epoch !== generation) return false;
      // Only the Worker's stored receipt acknowledges a linked object. A privacy
      // 204 is a refusal, not a receipt. Explicit notes must survive every refusal.
      if (status === 200) {
        acknowledged.add(record.id);
        if (acknowledged.size > 2048) acknowledged.delete(acknowledged.values().next().value ?? '');
        remove(record);
        return true;
      }
      record.attempts++;
      if (
        record.kind !== 'note' &&
        ((status >= 400 && status < 500 && status !== 429) || record.attempts >= 5)
      ) {
        remove(record);
      } else {
        record.next =
          Date.now() +
          Math.min(3600000, 60000 * 2 ** Math.min(6, record.attempts - 1)) +
          Math.random() * 5000;
        await persist(record);
      }
      return false;
    })();
    deliveries.set(record.id, task);
    void task.finally(() => deliveries.delete(record.id));
    return task;
  }
  async function drain() {
    await ready;
    if (busy || !options.enabled()) return;
    busy = true;
    const drainingGeneration = generation;
    try {
      for (const record of [...pending.values()].sort(
        (a, b) => Number(b.kind === 'note') - Number(a.kind === 'note'),
      )) {
        if (!options.enabled()) break;
        if (record.player !== options.link()?.player) {
          remove(record);
          continue;
        }
        if (record.next > Date.now()) continue;
        if (!(await deliver(record))) break;
      }
    } finally {
      busy = false;
      if (drainingGeneration !== generation) void drain();
    }
  }
  const clear = () => {
    generation++;
    for (const controller of active) controller.abort();
    for (const record of pending.values()) remove(record);
    pending.clear();
    bytes = 0;
    void db.then((connection) => {
      try {
        connection?.transaction('pieces', 'readwrite').objectStore('pieces').clear();
      } catch {}
    });
  };
  async function send(
    kind: LinkedKind,
    data: unknown,
    captured?: Link,
    feedbackName?: string,
    confirm = false,
  ): Promise<string> {
    await ready;
    const epoch = generation;
    const link = captured ?? options.link();
    if (!options.enabled() || !link) throw new Error('Lab recording is off.');
    const name = kind === 'note' ? feedbackName?.trim().slice(0, 60) : undefined;
    const text = JSON.stringify(data);
    if (text === undefined || new TextEncoder().encode(text).byteLength > LINKED_LIMITS.total)
      throw new Error('This snapshot exceeds the 16 MiB recording limit.');
    const upload = await hash(
      JSON.stringify({ ...link, game: options.game, kind, text, ...(name ? { name } : {}) }),
    );
    const pieces: unknown[] =
      kind === 'run' || kind === 'save'
        ? Array.from({ length: Math.ceil(text.length / LINKED_LIMITS.chunkChars) }, (_, index) => ({
            encoding: 'json',
            upload,
            index,
            total: Math.ceil(text.length / LINKED_LIMITS.chunkChars),
            text: text.slice(index * LINKED_LIMITS.chunkChars, (index + 1) * LINKED_LIMITS.chunkChars),
          }))
        : [data];
    if (pieces.length > LINKED_LIMITS.chunks)
      throw new Error('This snapshot exceeds the recording chunk limit.');
    const additions: Pending[] = [];
    const ids: string[] = [];
    for (const piece of pieces) {
      const id = await hash(JSON.stringify({ upload, piece }));
      ids.push(id);
      if (acknowledged.has(id) || pending.has(id)) continue;
      const at = Date.now();
      const envelope = JSON.stringify({
        v: 2,
        id,
        ...link,
        game: options.game,
        kind,
        at,
        build: options.build(),
        data: piece,
        ...(name ? { name } : {}),
        ...(kind === 'note' || options.override() ? { privacyOverride: true } : {}),
      });
      if (new TextEncoder().encode(envelope).byteLength > LINKED_LIMITS.inflated)
        throw new Error('Recording piece exceeds the server limit.');
      const body = await gzip(envelope);
      if (body.size > LINKED_LIMITS.compressed)
        throw new Error('Compressed recording piece exceeds the server limit.');
      additions.push({ kind, id, body, next: 0, attempts: 0, player: link.player, at });
    }
    if (epoch !== generation || !options.enabled() || options.link()?.player !== link.player)
      throw new Error('Lab recording is off.');
    const addedBytes = additions.reduce((sum, r) => sum + r.body.size, 0);
    if (kind === 'note') {
      for (const record of pending.values()) {
        if (
          bytes + addedBytes <= LINKED_LIMITS.queueBytes &&
          pending.size + additions.length <= LINKED_LIMITS.queued
        )
          break;
        if (record.kind !== 'note') remove(record);
      }
    }
    if (
      bytes + addedBytes > LINKED_LIMITS.queueBytes ||
      pending.size + additions.length > LINKED_LIMITS.queued
    )
      throw new Error('The background recording queue is full.');
    for (const record of additions) {
      if (epoch !== generation || !options.enabled()) break;
      pending.set(record.id, record);
      bytes += record.body.size;
      await persist(record);
    }
    if (epoch !== generation || !options.enabled() || options.link()?.player !== link.player)
      throw new Error('Lab recording is off.');
    if (confirm) {
      // A note bypasses a busy or backed-off snapshot queue. Its content id still
      // deduplicates concurrent delivery and retries on the server.
      const records = [...pending.values()].filter((record) => ids.includes(record.id));
      const results = await Promise.all(records.map(deliver));
      if (epoch !== generation || !options.enabled() || options.link()?.player !== link.player)
        throw new Error('Lab recording is off.');
      if (results.some((stored) => !stored) || !ids.every((id) => acknowledged.has(id))) {
        throw new Error(
          records.every((record) => durable.has(record.id))
            ? 'A copy is saved on this device. It will retry while recording is on; you can also try Send again.'
            : 'A copy is kept in this open page. Keep it open and try Send again.',
        );
      }
    } else void drain();
    return upload;
  }
  return { send, drain, clear };
}
