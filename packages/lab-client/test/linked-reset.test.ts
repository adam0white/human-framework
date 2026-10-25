import { IDBFactory, IDBObjectStore } from 'fake-indexeddb';
import { afterEach, expect, it, vi } from 'vitest';
import { linkedTransport } from '../src/linked.ts';

afterEach(() => vi.unstubAllGlobals());

it('does not restore a cleared recording after delayed abort and drains new feedback', async () => {
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
    return Response.json({ ok: true });
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
  await vi.waitFor(() => expect(requests).toHaveLength(2));
});

it('confirms an explicit note only on stored 200 and retains a privacy refusal for retry', async () => {
  const database = new IDBFactory();
  vi.stubGlobal('indexedDB', database);
  let status = 204;
  const requests: RequestInit[] = [];
  vi.stubGlobal('fetch', async (_url: string, init: RequestInit) => {
    requests.push(init);
    return new Response(null, { status });
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
    return Response.json({ ok: true });
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
  finish?.(Response.json({ ok: true }));
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
