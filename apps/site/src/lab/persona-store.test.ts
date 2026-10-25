import { indexedDB } from 'fake-indexeddb';
import { afterEach, expect, it, vi } from 'vitest';
import { OFF_KEY, PLAYER_KEY, writeLocal } from '../../../../packages/lab-client/src/identity.ts';
import type { PersonaRequest } from '../../../../packages/lab-client/src/persona.ts';
import { createPersona } from '../../../../packages/lab-client/src/persona.ts';
import { requireValue } from '../shared/require-value.ts';
import { shelfRequest as rawShelfRequest } from './persona-store.ts';

async function shelfRequest(request: PersonaRequest): Promise<unknown> {
  if (request.authored || request.allowRecording !== undefined) {
    const epoch = (await rawShelfRequest({ action: 'recording' })) as { recordingEpoch: string };
    return rawShelfRequest({ ...request, recordingEpoch: epoch.recordingEpoch });
  }
  return rawShelfRequest(request);
}

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
  expect(await shelfRequest({ action: 'recording', castId: body.castId, envelope: first })).toMatchObject({
    sameEpoch: true,
  });
  expect(await shelfRequest({ action: 'recording', castId: body.castId })).toMatchObject({
    sameEpoch: false,
  });
  await expect(
    shelfRequest({ action: 'recording', castId: body.castId, allowRecording: true }),
  ).rejects.toThrow('pinned');
  const left = await createPersona({ ...body, parentRevision: first.revision, transfer: { left: true } });
  const right = await createPersona({ ...body, parentRevision: first.revision, transfer: { right: true } });
  const results = await Promise.allSettled([
    shelfRequest({ action: 'put', envelope: left }),
    shelfRequest({ action: 'put', envelope: right }),
  ]);
  expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
  await expect(shelfRequest({ action: 'put', envelope: first })).rejects.toThrow('conflict');
  writeLocal(OFF_KEY, '1');
  expect(await shelfRequest({ action: 'recording', castId: body.castId })).toMatchObject({
    sameEpoch: false,
  });
  await shelfRequest({ action: 'delete', castId: body.castId });
  writeLocal(OFF_KEY, null);
});

it('forgets recording associations for a deleted person even after old branches leave the cache', async () => {
  vi.stubGlobal('indexedDB', indexedDB);
  const stored = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => stored.get(key) ?? null,
    setItem: (key: string, value: string) => stored.set(key, value),
    removeItem: (key: string) => stored.delete(key),
  });
  const body = {
    format: 'hf-persona/1' as const,
    castId: 'hf.cast.deleted.test',
    castRevision: '1',
    branchId: 'original',
    parentRevision: null,
    source: { game: 'pass', build: 'test', engine: '2.14.1', rules: '1' },
    transfer: {},
    limitations: [],
  };
  const original = await createPersona(body);
  await shelfRequest({ action: 'put', envelope: original, authored: true });
  for (let n = 0; n < 11; n++) {
    const fork = await createPersona({ ...body, branchId: `fork-${n}` });
    await shelfRequest({ action: 'put', envelope: fork, fork: true });
    await shelfRequest({ action: 'recording', castId: body.castId, envelope: fork, allowRecording: true });
  }
  await shelfRequest({ action: 'delete', castId: body.castId });
  await shelfRequest({ action: 'put', envelope: original });
  expect(await shelfRequest({ action: 'recording', castId: body.castId })).toMatchObject({
    sameEpoch: false,
  });
  await shelfRequest({ action: 'delete', castId: body.castId });
});

it('binds recording approval to the pinned branch instead of a different active history', async () => {
  vi.stubGlobal('indexedDB', indexedDB);
  const stored = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => stored.get(key) ?? null,
    setItem: (key: string, value: string) => stored.set(key, value),
    removeItem: (key: string) => stored.delete(key),
  });
  const body = {
    format: 'hf-persona/1' as const,
    castId: 'hf.cast.selected.test',
    castRevision: '1',
    branchId: 'original',
    parentRevision: null,
    source: { game: 'pass', build: 'test', engine: '2.14.1', rules: '1' },
    transfer: {},
    limitations: [],
  };
  const original = await createPersona(body);
  await shelfRequest({ action: 'put', envelope: original, authored: true });
  const other = await createPersona({ ...body, branchId: 'other' });
  await shelfRequest({ action: 'put', envelope: other, fork: true });
  expect(await shelfRequest({ action: 'recording', castId: body.castId, envelope: original })).toMatchObject({
    sameEpoch: true,
    branchId: original.branchId,
    revision: original.revision,
  });
  const oldEpoch = (await rawShelfRequest({ action: 'recording', envelope: original })) as {
    recordingEpoch: string;
  };
  writeLocal(PLAYER_KEY, '0123456789abcdef0123456789abcdef');
  await expect(
    rawShelfRequest({
      action: 'recording',
      envelope: original,
      allowRecording: true,
      recordingEpoch: oldEpoch.recordingEpoch,
    }),
  ).rejects.toThrow('identity changed');
  const staleAuthored = await createPersona({ ...body, branchId: 'stale-authored' });
  await rawShelfRequest({
    action: 'put',
    envelope: staleAuthored,
    fork: true,
    authored: true,
    recordingEpoch: oldEpoch.recordingEpoch,
  });
  expect(await rawShelfRequest({ action: 'recording', envelope: staleAuthored })).toMatchObject({
    sameEpoch: false,
  });

  await shelfRequest({ action: 'recording', castId: body.castId, envelope: original, allowRecording: true });
  expect(await shelfRequest({ action: 'recording', castId: body.castId })).toMatchObject({
    sameEpoch: false,
  });
  await shelfRequest({ action: 'recording', castId: body.castId, envelope: other, allowRecording: true });
  await shelfRequest({ action: 'recording', castId: body.castId, envelope: original, allowRecording: false });
  expect(await shelfRequest({ action: 'recording', castId: body.castId, envelope: original })).toMatchObject({
    sameEpoch: false,
  });
  expect(await shelfRequest({ action: 'recording', castId: body.castId, envelope: other })).toMatchObject({
    sameEpoch: true,
  });
  const choices = [true, false].map((allowRecording) =>
    shelfRequest({ action: 'recording', castId: body.castId, envelope: original, allowRecording }),
  );
  await Promise.all(choices);
  expect(await shelfRequest({ action: 'recording', castId: body.castId, envelope: original })).toMatchObject({
    sameEpoch: false,
  });
  await expect(
    shelfRequest({ action: 'recording', castId: 'different', envelope: original, allowRecording: true }),
  ).rejects.toThrow('Selected');
  await shelfRequest({ action: 'delete', castId: body.castId });
});

it('accepts a whole cast atomically and requires all pinned histories for recording linkage', async () => {
  vi.stubGlobal('indexedDB', indexedDB);
  const stored = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => stored.get(k) ?? null,
    setItem: (k: string, v: string) => stored.set(k, v),
    removeItem: (k: string) => stored.delete(k),
  });
  const { initialPersonaLife } = await import('../../../../packages/lab-client/src/life.ts');
  const ids = ['hf.cast.samira.well', 'hf.cast.idris.well'];
  for (const castId of ids) await rawShelfRequest({ action: 'delete', castId });
  const people = await Promise.all(
    ids.map(async (castId, i) =>
      createPersona({
        format: 'hf-persona/1',
        castId,
        castRevision: '1',
        branchId: `batch-${i}`,
        parentRevision: null,
        source: { game: 'well', build: 'control', engine: '2.17.0', rules: 'cast-1' },
        transfer: { life: initialPersonaLife(castId, `batch-${i}`, 0) },
        limitations: [],
      }),
    ),
  );
  await rawShelfRequest({ action: 'putBatch', envelopes: people });
  const prepared = (await rawShelfRequest({ action: 'prepareBatch', castIds: ids })) as {
    inputs: unknown[];
    blocked: unknown[];
  };
  expect(prepared.inputs).toHaveLength(2);
  expect(prepared.blocked).toEqual([]);
  await shelfRequest({ action: 'recording', envelope: people[0], allowRecording: true });
  expect(await rawShelfRequest({ action: 'recordingBatch', envelopes: people })).toMatchObject({
    sameEpoch: false,
  });
  const epoch = (await rawShelfRequest({ action: 'recordingBatch', envelopes: people })) as {
    recordingEpoch: string;
  };
  writeLocal(PLAYER_KEY, 'abcdef0123456789abcdef0123456789');
  await expect(
    rawShelfRequest({
      action: 'recordingBatch',
      envelopes: people,
      allowRecording: true,
      recordingEpoch: epoch.recordingEpoch,
    }),
  ).rejects.toThrow('identity changed');
  expect(await rawShelfRequest({ action: 'recordingBatch', envelopes: people })).toMatchObject({
    sameEpoch: false,
  });
  await shelfRequest({ action: 'recordingBatch', envelopes: people, allowRecording: true });
  expect(await rawShelfRequest({ action: 'recordingBatch', envelopes: people })).toMatchObject({
    sameEpoch: true,
  });
  const children = await Promise.all(
    people.map(async (p) => {
      const { revision, ...body } = p;
      return createPersona({
        ...body,
        parentRevision: revision,
        transfer: { ...body.transfer, child: true },
      });
    }),
  );
  const p = requireValue(people[1]);
  const { revision, ...body } = p;
  const other = await createPersona({ ...body, parentRevision: revision, transfer: { other: true } });
  await rawShelfRequest({ action: 'put', envelope: other });
  await expect(rawShelfRequest({ action: 'putBatch', envelopes: children })).rejects.toThrow('conflict');
  expect(await rawShelfRequest({ action: 'get', castId: ids[0] })).toEqual(people[0]);
  expect(await rawShelfRequest({ action: 'get', castId: ids[1] })).toEqual(other);
  for (const castId of ids) await rawShelfRequest({ action: 'delete', castId });
});
