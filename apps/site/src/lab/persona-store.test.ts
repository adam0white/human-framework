import { indexedDB } from 'fake-indexeddb';
import { afterEach, expect, it, vi } from 'vitest';
import { OFF_KEY, writeLocal } from '../../../../packages/lab-client/src/identity.ts';
import { createPersona } from '../../../../packages/lab-client/src/persona.ts';
import { shelfRequest } from './persona-store.ts';

afterEach(() => vi.unstubAllGlobals());

it('serializes competing shelf writes and invalidates recording linkage after identity reset', async () => {
  vi.stubGlobal('indexedDB', indexedDB);
  const stored = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => stored.get(key) ?? null,
    setItem: (key: string, value: string) => stored.set(key, value),
    removeItem: (key: string) => stored.delete(key),
  });
  const body = {
    format: 'hf-persona/1' as const,
    castId: 'hf.cast.concurrent.test',
    castRevision: '1',
    branchId: 'branch',
    parentRevision: null,
    source: { game: 'pass', build: 'test', engine: '2.14.1', rules: '1' },
    transfer: { person: { approved: true } },
    limitations: [],
  };
  writeLocal(OFF_KEY, null);
  const first = await createPersona(body);
  await shelfRequest({ action: 'put', envelope: first, authored: true });
  expect(await shelfRequest({ action: 'recording', castId: body.castId })).toEqual({ sameEpoch: true });
  const left = await createPersona({ ...body, parentRevision: first.revision, transfer: { left: true } });
  const right = await createPersona({ ...body, parentRevision: first.revision, transfer: { right: true } });
  const results = await Promise.allSettled([
    shelfRequest({ action: 'put', envelope: left }),
    shelfRequest({ action: 'put', envelope: right }),
  ]);
  expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
  writeLocal(OFF_KEY, '1');
  expect(await shelfRequest({ action: 'recording', castId: body.castId })).toEqual({ sameEpoch: false });
  await shelfRequest({ action: 'delete', castId: body.castId });
  writeLocal(OFF_KEY, null);
});
