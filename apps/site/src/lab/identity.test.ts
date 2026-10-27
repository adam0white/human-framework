import { IDBFactory, IDBObjectStore } from 'fake-indexeddb';
import { afterEach, expect, it, vi } from 'vitest';
import { createPersona, PERSONA_CONSENT_KEY } from '../../../../packages/lab-client/src/persona.ts';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it('uses the same effective continuity consent for GET and real Shelf requests without storing a default', async () => {
  const database = new IDBFactory();
  vi.stubGlobal('indexedDB', database);
  const values = new Map([
    ['hf-lab-player', 'a'.repeat(32)],
    ['hf-lab-session:pass', 'existing session bytes'],
    ['hf-lab-navigation:pass:old', 'existing journal bytes'],
    ['hf-lab:once:telemetry-notice-v1', 'existing notice bytes'],
  ]);
  const setItem = vi.fn((key: string, value: string) => values.set(key, value));
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem,
    removeItem: (key: string) => values.delete(key),
  });
  const person = await createPersona({
    format: 'hf-persona/1',
    castId: 'hf.cast.receiver.test',
    castRevision: '1',
    branchId: 'original',
    parentRevision: null,
    source: { game: 'pass', build: 'test', engine: '2.14.1', rules: '1' },
    transfer: { person: { state: 'complete retained synthetic source' } },
    limitations: [],
  });
  const state = { revisions: [person], heads: { [person.castId]: person.revision } };
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const open = database.open('hf-persona-shelf', 1);
    open.onupgradeneeded = () => open.result.createObjectStore('shelf');
    open.onsuccess = () => resolve(open.result);
    open.onerror = () => reject(open.error);
  });
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('shelf', 'readwrite');
    tx.objectStore('shelf').put(state, 'state');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  const put = vi.spyOn(IDBObjectStore.prototype, 'put');
  const replies: { type: string; id: string; value?: unknown; error?: string }[] = [];
  const parent = { postMessage: (data: (typeof replies)[number]) => replies.push(data) };
  const listeners: ((event: unknown) => void)[] = [];
  vi.stubGlobal('window', {
    parent,
    addEventListener: (kind: string, listener: (event: unknown) => void) => {
      if (kind === 'message') listeners.push(listener);
    },
  });
  await import('./identity.ts');
  let sequence = 0;
  const send = async (type: string, payload: Record<string, unknown>) => {
    const id = (++sequence).toString(16).padStart(32, '0');
    const event = {
      origin: 'https://pass.adamwhite.work',
      source: parent,
      data: { type, id, ...payload },
      ports: [],
    };
    for (const listener of listeners) listener(event);
    await vi.waitFor(() => expect(replies.some((reply) => reply.id === id)).toBe(true));
    const reply = replies.find((reply) => reply.id === id);
    if (!reply) throw new Error('Receiver did not answer');
    return reply;
  };
  // Four effective states, one genuine read request for each. No favorable receiver stub.
  for (const [stored, enabled] of [
    [null, true],
    ['0', false],
    ['1', true],
    ['malformed', false],
  ] as const) {
    if (stored === null) values.delete(PERSONA_CONSENT_KEY);
    else values.set(PERSONA_CONSENT_KEY, stored);
    const before = Object.fromEntries(values);
    const consent = await send('hf-persona-consent', { action: 'get' });
    expect(consent.value).toBe(enabled);
    const result = await send('hf-persona-request', { action: 'get', castId: person.castId, optedIn: true });
    if (enabled) {
      expect(result.error).toBeUndefined();
      expect(result.value).toEqual(person);
    } else {
      expect(result.error).toBe('Enable fictional person continuity first.');
      expect(result.value).toBeUndefined();
    }
    expect(Object.fromEntries(values)).toEqual(before);
  }
  expect(setItem).not.toHaveBeenCalled();
  expect(put).not.toHaveBeenCalled();
  // Explicit preference writes remain explicit, and both public paths observe the choice.
  expect((await send('hf-persona-consent', { action: 'set', enabled: false })).value).toBe(false);
  expect(values.get(PERSONA_CONSENT_KEY)).toBe('0');
  expect((await send('hf-persona-consent', { action: 'set', enabled: true })).value).toBe(true);
  expect(values.get(PERSONA_CONSENT_KEY)).toBe('1');
  expect(
    (await send('hf-persona-request', { action: 'get', castId: person.castId, optedIn: true })).value,
  ).toEqual(person);
  expect(setItem.mock.calls.map(([key, value]) => [key, value])).toEqual([
    [PERSONA_CONSENT_KEY, '0'],
    [PERSONA_CONSENT_KEY, '1'],
  ]);
  const retained = await new Promise<unknown>((resolve, reject) => {
    const request = db.transaction('shelf').objectStore('shelf').get('state');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  expect(retained).toEqual(state);
  db.close();
});
