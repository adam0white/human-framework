import { IDBFactory, IDBObjectStore } from 'fake-indexeddb';
import { afterEach, expect, it, vi } from 'vitest';
import { linkedTransport } from '../src/linked.ts';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

async function storedReceipt(body: Blob) {
  const value = await new Response(body.stream().pipeThrough(new DecompressionStream('gzip'))).json();
  return Response.json({ ok: true, id: value.id });
}

it('preserves reset data until a real acknowledgment after delayed abort and drains new feedback', async () => {
  const database = new IDBFactory();
  vi.stubGlobal('indexedDB', database);
  const requests: RequestInit[] = [];
  let rejectOld: ((reason: Error) => void) | undefined;
  vi.stubGlobal('fetch', async (_url: string, init: RequestInit) => {
    requests.push(init);
    if (requests.length === 1)
      return new Promise<Response>((_resolve, reject) => {
        rejectOld = reject;
      });
    return storedReceipt(init.body as Blob);
  });
  const transport = linkedTransport({
    game: 'voice',
    endpoint: '/lab/api',
    link: () => ({ player: 'a'.repeat(32), session: 'b'.repeat(32), runId: 'c'.repeat(32) }),
    build: () => ({}),
    enabled: () => true,
    override: () => false,
  });
  const records = () =>
    new Promise<{ id: string }[]>((resolve, reject) => {
      const open = database.open('hf-lab-pending', 1);
      open.onerror = () => reject(open.error);
      open.onsuccess = () => {
        const connection = open.result;
        const get = connection.transaction('pieces').objectStore('pieces').getAll();
        get.onsuccess = () => {
          connection.close();
          resolve(get.result);
        };
        get.onerror = () => reject(get.error);
      };
    });
  await transport.send('note', { note: 'obsolete recording' });
  await vi.waitFor(() => expect(rejectOld).toBeDefined());
  const oldId = (await records())[0]?.id;
  expect(oldId).toBeDefined();
  transport.clear();
  await transport.send('note', { note: 'QA feedback-frictionless after off/on' });
  expect(requests[0]?.signal?.aborted).toBe(true);
  rejectOld?.(new Error('Delayed abort rejection'));
  await new Promise((resolve) => setTimeout(resolve, 50));
  expect((await records()).some((record) => record.id === oldId)).toBe(false);
  await vi.waitFor(() => expect(requests).toHaveLength(3));
});

it('confirms an explicit note only on stored 200 and retains a privacy refusal for retry', async () => {
  const database = new IDBFactory();
  vi.stubGlobal('indexedDB', database);
  let status = 204;
  const requests: RequestInit[] = [];
  vi.stubGlobal('fetch', async (_url: string, init: RequestInit) => {
    requests.push(init);
    return status === 200 ? storedReceipt(init.body as Blob) : new Response(null, { status });
  });
  const transport = linkedTransport({
    game: 'pass',
    endpoint: '/lab/api',
    link: () => ({ player: 'a'.repeat(32), session: 'b'.repeat(32), runId: 'c'.repeat(32) }),
    build: () => ({}),
    enabled: () => true,
    override: () => false,
  });
  await expect(
    transport.send('note', { note: 'Keep this note' }, undefined, undefined, true),
  ).rejects.toThrow('copy is saved');
  const body = await new Response(
    ((requests[0]?.body ?? new Blob()) as Blob).stream().pipeThrough(new DecompressionStream('gzip')),
  ).json();
  expect(body.privacyOverride).toBe(true);
  status = 200;
  await expect(
    transport.send('note', { note: 'Keep this note' }, undefined, undefined, true),
  ).resolves.toMatch(/^[a-f0-9]{32}$/);
  expect(requests).toHaveLength(2);
});

it('delivers an explicit note while an automatic snapshot is stalled', async () => {
  vi.stubGlobal('indexedDB', new IDBFactory());
  let finish: ((response: Response) => void) | undefined;
  const kinds: string[] = [];
  vi.stubGlobal('fetch', async (_url: string, init: RequestInit) => {
    const body = await new Response(
      (init.body as Blob).stream().pipeThrough(new DecompressionStream('gzip')),
    ).json();
    kinds.push(body.kind);
    if (body.kind === 'run')
      return new Promise<Response>((resolve) => {
        finish = resolve;
      });
    return Response.json({ ok: true, id: body.id });
  });
  const transport = linkedTransport({
    game: 'pass',
    endpoint: '/lab/api',
    link: () => ({ player: 'a'.repeat(32), session: 'b'.repeat(32), runId: 'c'.repeat(32) }),
    build: () => ({}),
    enabled: () => true,
    override: () => false,
  });
  await transport.send('run', { seed: 3 });
  await vi.waitFor(() => expect(finish).toBeDefined());
  await expect(transport.send('note', { note: 'Send now' }, undefined, undefined, true)).resolves.toMatch(
    /^[a-f0-9]{32}$/,
  );
  expect(kinds).toEqual(['run', 'note']);
  transport.dispose();
  finish?.(new Response(null, { status: 503 }));
});

it('never confirms a note cleared while its durable write is pending', async () => {
  vi.stubGlobal('indexedDB', new IDBFactory());
  const fetch = vi.fn(async () => Response.json({ ok: true }));
  vi.stubGlobal('fetch', fetch);
  const transport = linkedTransport({
    game: 'pass',
    endpoint: '/lab/api',
    link: () => ({ player: 'a'.repeat(32), session: 'b'.repeat(32), runId: 'c'.repeat(32) }),
    build: () => ({}),
    enabled: () => true,
    override: () => false,
  });
  const put = IDBObjectStore.prototype.put;
  const spy = vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function (
    this: IDBObjectStore,
    value,
    key,
  ) {
    const request = put.call(this, value, key);
    queueMicrotask(() => transport.clear());
    return request;
  });
  try {
    await expect(
      transport.send('note', { note: 'Reset during write' }, undefined, undefined, true),
    ).rejects.toThrow('off');
    expect(fetch).not.toHaveBeenCalled();
  } finally {
    spy.mockRestore();
  }
});

async function pendingRows(
  database: IDBFactory,
): Promise<{ id: string; body: Blob; attempts: number; next: number }[]> {
  return new Promise((resolve, reject) => {
    const open = database.open('hf-lab-pending', 1);
    open.onupgradeneeded = () => open.result.createObjectStore('pieces', { keyPath: 'id' });
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      const read = db.transaction('pieces').objectStore('pieces').getAll();
      read.onsuccess = () => {
        db.close();
        resolve(read.result);
      };
      read.onerror = () => reject(read.error);
    };
  });
}

it('keeps the exact automatic Blob through five 503s and retries idle until an exact stored ACK', async () => {
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
  const database = new IDBFactory();
  vi.stubGlobal('indexedDB', database);
  let calls = 0;
  let ack = false;
  vi.stubGlobal('fetch', async (_url: string, init: RequestInit) => {
    calls++;
    const value = await new Response(
      (init.body as Blob).stream().pipeThrough(new DecompressionStream('gzip')),
    ).json();
    return ack ? Response.json({ ok: true, id: value.id }) : new Response(null, { status: 503 });
  });
  const options = {
    game: 'pass',
    endpoint: '/lab/api',
    link: () => ({ player: 'a'.repeat(32), session: 'b'.repeat(32), runId: 'c'.repeat(32) }),
    build: () => ({}),
    enabled: () => true,
    override: () => false,
  };
  const transport = linkedTransport(options);
  try {
    await transport.send('save', { state: { full: 'unique payload' } });
    await vi.waitFor(async () => expect((await pendingRows(database))[0]?.attempts).toBe(1));
    const original = (await pendingRows(database))[0];
    if (!original) throw new Error('Missing pending original');
    const bytes = await original.body.arrayBuffer();
    for (let attempt = 2; attempt <= 5; attempt++) {
      const row = (await pendingRows(database))[0];
      if (!row) throw new Error('Missing pending row');
      await vi.advanceTimersByTimeAsync(row.next - Date.now() + 1);
      await vi.waitFor(async () => expect((await pendingRows(database))[0]?.attempts).toBe(attempt));
    }
    expect(calls).toBe(5);
    expect(await (await pendingRows(database))[0]?.body.arrayBuffer()).toEqual(bytes);
    (transport as typeof transport & { dispose?: () => void }).dispose?.();
    expect(vi.getTimerCount()).toBe(0);
    // Reload must recover and schedule the due retry without a new send or drain call.
    const recovered = linkedTransport(options);
    ack = true;
    const due = (await pendingRows(database))[0]?.next ?? Date.now();
    await vi.advanceTimersByTimeAsync(due - Date.now() - 1);
    expect(calls).toBe(5);
    await vi.advanceTimersByTimeAsync(2);
    await vi.waitFor(async () => expect(await pendingRows(database)).toHaveLength(0));
    expect(calls).toBe(6);
    (recovered as typeof recovered & { dispose?: () => void }).dispose?.();
  } finally {
    (transport as typeof transport & { dispose?: () => void }).dispose?.();
    vi.useRealTimers();
  }
});

it('preserves unknown and mismatched rows at capacity and refuses a new note without eviction', async () => {
  const database = new IDBFactory();
  vi.stubGlobal('indexedDB', database);
  await pendingRows(database);
  await new Promise<void>((resolve) => {
    const open = database.open('hf-lab-pending', 1);
    open.onsuccess = () => {
      const db = open.result;
      const tx = db.transaction('pieces', 'readwrite');
      for (let i = 0; i < 256; i++)
        tx.objectStore('pieces').put({
          id: `old-${i}`,
          body: new Blob([`unique-${i}`]),
          player: 'd'.repeat(32),
          at: 0,
          next: 0,
          attempts: 7,
        });
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
    };
  });
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  const transport = linkedTransport({
    game: 'pass',
    endpoint: '/lab/api',
    link: () => ({ player: 'a'.repeat(32), session: 'b'.repeat(32), runId: 'c'.repeat(32) }),
    build: () => ({}),
    enabled: () => true,
    override: () => false,
  });
  await expect(transport.send('note', { note: 'new' })).rejects.toThrow('queue');
  transport.clear();
  expect(await pendingRows(database)).toHaveLength(256);
  expect(await (await pendingRows(database))[3]?.body.text()).toMatch(/^unique-/);
  expect(fetch).not.toHaveBeenCalled();
  (transport as typeof transport & { dispose?: () => void }).dispose?.();
});

it('retains a piece on an unrelated HTTP200 and retires it only for the receiver exact id receipt', async () => {
  const database = new IDBFactory();
  vi.stubGlobal('indexedDB', database);
  let correct = false;
  vi.stubGlobal('fetch', async (_url: string, init: RequestInit) => {
    const value = await new Response(
      (init.body as Blob).stream().pipeThrough(new DecompressionStream('gzip')),
    ).json();
    return Response.json({ ok: true, id: correct ? value.id : 'wrong' });
  });
  const transport = linkedTransport({
    game: 'pass',
    endpoint: '/lab/api',
    link: () => ({ player: 'a'.repeat(32), session: 'b'.repeat(32), runId: 'c'.repeat(32) }),
    build: () => ({}),
    enabled: () => true,
    override: () => false,
  });
  await expect(transport.send('note', { note: 'real receipt' }, undefined, undefined, true)).rejects.toThrow(
    'copy',
  );
  expect(await pendingRows(database)).toHaveLength(1);
  correct = true;
  await transport.send('note', { note: 'real receipt' }, undefined, undefined, true);
  await vi.waitFor(async () => expect(await pendingRows(database)).toHaveLength(0));
  (transport as typeof transport & { dispose?: () => void }).dispose?.();
});

it('retains an automatic record after five actual due 503 deliveries', async () => {
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
  const database = new IDBFactory();
  vi.stubGlobal('indexedDB', database);
  let calls = 0;
  vi.stubGlobal('fetch', async () => {
    calls++;
    return new Response(null, { status: 503 });
  });
  const transport = linkedTransport({
    game: 'pass',
    endpoint: '/lab/api',
    link: () => ({ player: 'a'.repeat(32), session: 'b'.repeat(32), runId: 'c'.repeat(32) }),
    build: () => ({}),
    enabled: () => true,
    override: () => false,
  });
  try {
    await transport.send('run', { state: 'original full snapshot' });
    await vi.waitFor(async () => expect((await pendingRows(database))[0]?.attempts).toBe(1));
    for (let n = 2; n <= 5; n++) {
      const row = (await pendingRows(database))[0];
      if (!row) throw new Error('Missing pending row');
      vi.setSystemTime(row.next + 1);
      await transport.drain();
      expect(calls).toBe(n);
    }
    expect(await pendingRows(database)).toHaveLength(1);
    expect((await pendingRows(database))[0]?.attempts).toBe(5);
  } finally {
    (transport as typeof transport & { dispose?: () => void }).dispose?.();
    vi.useRealTimers();
  }
});
