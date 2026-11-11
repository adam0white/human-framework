import { gunzipSync, gzipSync } from 'node:zlib';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, expect, it, vi } from 'vitest';
import { linkedTransport } from '../src/linked.ts';

afterEach(() => vi.unstubAllGlobals());

it('retries only this game and preserves foreign pending bytes, including pre-migration rows', async () => {
  const database = new IDBFactory();
  vi.stubGlobal('indexedDB', database);
  const player = 'a'.repeat(32);
  const rows = ['murmur', 'pass'].flatMap((game, index) =>
    [true, false].map((metadata, old) => {
      const id = `${index}${old}`.padEnd(32, '0');
      const envelope = { id, game, player, kind: 'run', data: { seed: index } };
      return {
        id,
        player,
        kind: 'run',
        at: Date.now(),
        attempts: 0,
        next: 0,
        ...(metadata ? { game } : {}),
        body: new Blob([gzipSync(JSON.stringify(envelope))]),
      };
    }),
  );
  const connection = await new Promise<IDBDatabase>((resolve, reject) => {
    const open = database.open('hf-lab-pending', 1);
    open.onupgradeneeded = () => open.result.createObjectStore('pieces', { keyPath: 'id' });
    open.onsuccess = () => resolve(open.result);
    open.onerror = () => reject(open.error);
  });
  await new Promise<void>((resolve, reject) => {
    const tx = connection.transaction('pieces', 'readwrite');
    for (const row of rows) tx.objectStore('pieces').put(row);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  const sent: { id: string; game: string }[] = [];
  vi.stubGlobal('fetch', async (_url: string, init: RequestInit) => {
    const envelope = JSON.parse(
      gunzipSync(new Uint8Array(await (init.body as Blob).arrayBuffer())).toString(),
    );
    sent.push(envelope);
    return Response.json({ ok: true, id: envelope.id });
  });
  const transport = linkedTransport({
    game: 'murmur',
    endpoint: '/lab/api',
    link: () => ({ player, session: 'b'.repeat(32), runId: 'c'.repeat(32) }),
    build: () => ({}),
    enabled: () => true,
    override: () => false,
  });
  try {
    await transport.drain();
    expect(sent.map((row) => row.id).sort()).toEqual(
      rows
        .slice(0, 2)
        .map((row) => row.id)
        .sort(),
    );
    const remaining = await new Promise<typeof rows>((resolve, reject) => {
      const get = connection.transaction('pieces').objectStore('pieces').getAll();
      get.onsuccess = () => resolve(get.result);
      get.onerror = () => reject(get.error);
    });
    expect(remaining.map((row) => row.id).sort()).toEqual(
      rows
        .slice(2)
        .map((row) => row.id)
        .sort(),
    );
    for (const row of remaining) {
      const original = rows.find((value) => value.id === row.id);
      if (!original) throw new Error('Missing original pending row');
      expect(new Uint8Array(await row.body.arrayBuffer())).toEqual(
        new Uint8Array(await original.body.arrayBuffer()),
      );
    }
  } finally {
    transport.dispose();
    connection.close();
  }
});

it("counts another game's retained records toward the shared queue capacity", async () => {
  const database = new IDBFactory();
  vi.stubGlobal('indexedDB', database);
  const connection = await new Promise<IDBDatabase>((resolve) => {
    const open = database.open('hf-lab-pending', 1);
    open.onupgradeneeded = () => open.result.createObjectStore('pieces', { keyPath: 'id' });
    open.onsuccess = () => resolve(open.result);
  });
  await new Promise<void>((resolve) => {
    const tx = connection.transaction('pieces', 'readwrite');
    for (let i = 0; i < 256; i++)
      tx.objectStore('pieces').put({
        id: `foreign-${i}`,
        game: 'pass',
        kind: 'run',
        body: new Blob(['retained foreign bytes']),
        player: 'a'.repeat(32),
        at: Date.now(),
        next: 0,
        attempts: 0,
      });
    tx.oncomplete = () => resolve();
  });
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  const transport = linkedTransport({
    game: 'murmur',
    endpoint: '/lab/api',
    link: () => ({ player: 'a'.repeat(32), session: 'b'.repeat(32), runId: 'c'.repeat(32) }),
    build: () => ({}),
    enabled: () => true,
    override: () => false,
  });
  try {
    await expect(transport.send('note', { note: 'No room' })).rejects.toThrow('queue');
    expect(fetch).not.toHaveBeenCalled();
    const count = await new Promise<number>((resolve) => {
      const request = connection.transaction('pieces').objectStore('pieces').count();
      request.onsuccess = () => resolve(request.result);
    });
    expect(count).toBe(256);
  } finally {
    transport.dispose();
    connection.close();
  }
});
