import { IDBFactory } from 'fake-indexeddb';
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
