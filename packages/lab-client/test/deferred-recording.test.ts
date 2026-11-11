import { createHash } from 'node:crypto';
import { gunzipSync, gzipSync } from 'node:zlib';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, expect, it, vi } from 'vitest';
import { createLab } from '../src/index.ts';

function memory(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    values,
    get length() {
      return values.size;
    },
    key: (i: number) => [...values.keys()][i] ?? null,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}
afterEach(() => vi.unstubAllGlobals());

it('holds existing pending bytes and journals through unshared feedback, then records on explicit opt-in', async () => {
  const player = 'a'.repeat(32),
    sessionId = 'b'.repeat(32),
    runId = 'c'.repeat(32);
  const hash = (value: unknown) =>
    createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 32);
  const text = JSON.stringify({ old: true });
  const link = { player, session: sessionId, runId };
  const upload = hash({ ...link, game: 'word', kind: 'run', text });
  const piece = { encoding: 'json', upload, index: 0, total: 1, text };
  const id = hash({ upload, piece });
  const local = memory({ 'hf-lab-player': player, 'hf-lab-navigation:word:old': 'preserve-original' });
  const session = memory({ 'hf-lab-session:word': `${sessionId}:${Date.now()}`, 'hf-lab-run:word': runId });
  const beforeLocal = [...local.values],
    beforeSession = [...session.values];
  const database = new IDBFactory();
  const db = await new Promise<IDBDatabase>((resolve) => {
    const open = database.open('hf-lab-pending', 1);
    open.onupgradeneeded = () => open.result.createObjectStore('pieces', { keyPath: 'id' });
    open.onsuccess = () => resolve(open.result);
  });
  const original = new Blob([
    gzipSync(
      JSON.stringify({
        v: 2,
        id,
        ...link,
        game: 'word',
        kind: 'run',
        at: Date.now(),
        build: {},
        data: piece,
      }),
    ),
  ]);
  const originalRow = {
    id,
    game: 'word',
    kind: 'run',
    body: original,
    player,
    at: Date.now(),
    next: 0,
    attempts: 0,
  };
  await new Promise<void>((resolve) => {
    const tx = db.transaction('pieces', 'readwrite');
    tx.objectStore('pieces').put(originalRow);
    tx.oncomplete = () => resolve();
  });
  vi.stubGlobal('indexedDB', database);
  vi.stubGlobal('localStorage', local);
  vi.stubGlobal('sessionStorage', session);
  vi.stubGlobal('location', {
    hostname: 'play.adamwhite.work',
    origin: 'https://play.adamwhite.work',
    pathname: '/word/file/',
  });
  vi.stubGlobal('navigator', {});
  vi.stubGlobal('addEventListener', undefined);
  const requests: { url: string; value: Record<string, unknown> }[] = [];
  vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
    const value = JSON.parse(gunzipSync(new Uint8Array(await (init.body as Blob).arrayBuffer())).toString());
    requests.push({ url, value });
    return Response.json({ ok: true, id: typeof value.id === 'string' ? value.id : 'note-receipt' });
  });
  const lab = createLab({ game: 'word', build: {}, preservation: 'preserve', deferRecording: true });
  try {
    expect(lab.eventsOn).toBe(false);
    expect(lab.telemetryOn).toBe(false);
    const getRun = vi.fn(() => ({ seed: 7 }));
    lab.trackRun(getRun);
    lab.screen('file');
    lab.captureSave({ seed: 7 });
    lab.flush();
    await lab.sendFeedback('hello', { run: { seed: 7 }, sharePlay: false });
    expect(requests).toHaveLength(1);
    expect(requests[0]?.url).toContain('/run');
    expect(requests[0]?.value).toMatchObject({ run: { feedbackOnly: true }, note: 'hello' });
    expect(requests[0]?.value).not.toHaveProperty('player');
    expect(getRun).not.toHaveBeenCalled();
    expect([...local.values]).toEqual(beforeLocal);
    expect([...session.values]).toEqual(beforeSession);
    const row = await new Promise<typeof originalRow>((resolve) => {
      const get = db.transaction('pieces').objectStore('pieces').get(id);
      get.onsuccess = () => resolve(get.result);
    });
    const { body, ...metadata } = row;
    const { body: originalBody, ...originalMetadata } = originalRow;
    expect(metadata).toEqual(originalMetadata);
    expect(body.size).toBe(originalBody.size);
    expect(new Uint8Array(await row.body.arrayBuffer())).toEqual(
      new Uint8Array(await original.arrayBuffer()),
    );
    lab.setTelemetryOff(false);
    lab.captureSave({ seed: 7 });
    await vi.waitFor(() => expect(requests.some((r) => r.value.kind === 'save')).toBe(true));
    await vi.waitFor(() => expect(requests.some((r) => r.value.id === id)).toBe(true));
    expect(requests.find((r) => r.value.id === id)?.value).toMatchObject({
      v: 2,
      id,
      ...link,
      game: 'word',
      kind: 'run',
      data: piece,
    });
  } finally {
    lab.dispose();
    db.close();
  }
});

it('does not initialize storage or create a queue when deferred identity is absent', async () => {
  const local = memory(),
    session = memory(),
    open = vi.fn(() => {
      throw Error('unexpected database');
    });
  vi.stubGlobal('indexedDB', { open });
  vi.stubGlobal('localStorage', local);
  vi.stubGlobal('sessionStorage', session);
  vi.stubGlobal('location', { hostname: 'play.adamwhite.work', pathname: '/word/file/' });
  vi.stubGlobal('navigator', {});
  vi.stubGlobal('addEventListener', undefined);
  const requests: Record<string, unknown>[] = [];
  vi.stubGlobal('fetch', async (_url: string, init: RequestInit) => {
    const payload = JSON.parse(
      gunzipSync(new Uint8Array(await (init.body as Blob).arrayBuffer())).toString(),
    );
    requests.push(payload);
    return Response.json({ id: 'receipt' });
  });
  const lab = createLab({ game: 'word', build: {}, deferRecording: true });
  try {
    expect([...local.values]).toEqual([]);
    expect([...session.values]).toEqual([]);
    expect(open).not.toHaveBeenCalled();
    await expect(lab.sendRun({ secret: true })).rejects.toThrow('not enabled');
    await lab.sendFeedback('hello', { run: { secret: true }, sharePlay: false });
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({ run: { feedbackOnly: true } });
    expect([...local.values]).toEqual([]);
    expect([...session.values]).toEqual([]);
    expect(open).not.toHaveBeenCalled();
  } finally {
    lab.dispose();
  }
});

it.each(['setEventsOff', 'sharePlay'] as const)('activates only on explicit %s opt-in', async (method) => {
  const local = memory({ 'hf-lab-player': 'a'.repeat(32) });
  const session = memory({
    'hf-lab-session:word': `${'b'.repeat(32)}:${Date.now()}`,
    'hf-lab-run:word': 'c'.repeat(32),
  });
  vi.stubGlobal('indexedDB', new IDBFactory());
  vi.stubGlobal('localStorage', local);
  vi.stubGlobal('sessionStorage', session);
  vi.stubGlobal('location', { hostname: 'play.adamwhite.work', pathname: '/word/file/' });
  vi.stubGlobal('navigator', {});
  vi.stubGlobal('addEventListener', undefined);
  const records: Record<string, unknown>[] = [];
  vi.stubGlobal('fetch', async (_url: string, init: RequestInit) => {
    const payload = JSON.parse(
      gunzipSync(new Uint8Array(await (init.body as Blob).arrayBuffer())).toString(),
    );
    records.push(payload);
    return Response.json({ ok: true, id: payload.id ?? 'receipt' });
  });
  const lab = createLab({ game: 'word', build: {}, preservation: 'preserve', deferRecording: true });
  try {
    expect(lab.telemetryOn).toBe(false);
    if (method === 'setEventsOff') {
      lab.setEventsOff(false);
      lab.captureSave({ seed: 9 });
    } else await lab.sendFeedback('share', { run: { seed: 9 }, sharePlay: true });
    await vi.waitFor(() =>
      expect(records.some((v) => v.kind === (method === 'sharePlay' ? 'run' : 'save'))).toBe(true),
    );
    expect(lab.eventsOn).toBe(true);
  } finally {
    lab.dispose();
  }
});

it('does not bypass preservation refusal on explicit opt-in', () => {
  const local = memory(),
    session = memory();
  vi.stubGlobal('indexedDB', undefined);
  vi.stubGlobal('localStorage', local);
  vi.stubGlobal('sessionStorage', session);
  vi.stubGlobal('location', { hostname: 'play.adamwhite.work', pathname: '/word/file/' });
  vi.stubGlobal('navigator', {});
  vi.stubGlobal('addEventListener', undefined);
  const lab = createLab({ game: 'word', build: {}, preservation: 'preserve', deferRecording: true });
  try {
    lab.setTelemetryOff(false);
    expect(lab.preservationStatus).toBe('missing-identity');
    expect(lab.telemetryOn).toBe(false);
    expect([...local.values]).toEqual([]);
    expect([...session.values]).toEqual([]);
  } finally {
    lab.dispose();
  }
});

it('creates a valid preserved game session only after explicit activation', async () => {
  const player = 'a'.repeat(32),
    local = memory({ 'hf-lab-player': player }),
    session = memory();
  vi.stubGlobal('indexedDB', new IDBFactory());
  vi.stubGlobal('localStorage', local);
  vi.stubGlobal('sessionStorage', session);
  vi.stubGlobal('location', { hostname: 'play.adamwhite.work', pathname: '/word/file/' });
  vi.stubGlobal('navigator', {});
  vi.stubGlobal('addEventListener', undefined);
  const records: Record<string, unknown>[] = [];
  vi.stubGlobal('fetch', async (_url: string, init: RequestInit) => {
    const payload = JSON.parse(
      gunzipSync(new Uint8Array(await (init.body as Blob).arrayBuffer())).toString(),
    );
    records.push(payload);
    return Response.json({ ok: true, id: payload.id });
  });
  const lab = createLab({ game: 'word', build: {}, preservation: 'preserve', deferRecording: true });
  try {
    expect([...session.values]).toEqual([]);
    lab.setTelemetryOff(false);
    const sid = session.getItem('hf-lab-session:word');
    const run = session.getItem('hf-lab-run:word');
    expect(sid).toMatch(/^[a-f0-9]{32}:\d+$/);
    expect(run).toMatch(/^[a-f0-9]{32}$/);
    lab.captureSave({ seed: 11 });
    lab.flush();
    await vi.waitFor(() => expect(records.some((record) => record.kind === 'save')).toBe(true));
    await vi.waitFor(() => expect(records.some((record) => record.kind === 'events')).toBe(true));
    const events = records.find((record) => record.kind === 'events')?.data as { e: unknown[] };
    expect(events.e).toContainEqual(['start', 0]);
    expect(records.find((record) => record.kind === 'save')).toMatchObject({
      player,
      session: sid!.split(':')[0],
      runId: run,
    });
  } finally {
    lab.dispose();
  }
});

it('does not activate or write after disposal', () => {
  const local = memory({ 'hf-lab-player': 'a'.repeat(32) }),
    session = memory();
  vi.stubGlobal('indexedDB', new IDBFactory());
  vi.stubGlobal('localStorage', local);
  vi.stubGlobal('sessionStorage', session);
  vi.stubGlobal('location', { hostname: 'play.adamwhite.work', pathname: '/word/file/' });
  vi.stubGlobal('navigator', {});
  vi.stubGlobal('addEventListener', undefined);
  const before = [...local.values];
  const lab = createLab({ game: 'word', build: {}, preservation: 'preserve', deferRecording: true });
  lab.dispose();
  lab.setEventsOff(false);
  lab.setTelemetryOff(false);
  lab.setPrivacyOverride(true);
  lab.setPersonaRecording('saved');
  expect([...local.values]).toEqual(before);
  expect([...session.values]).toEqual([]);
  expect(lab.telemetryOn).toBe(false);
});

it('refuses a malformed existing session without changing stored data', () => {
  const local = memory({ 'hf-lab-player': 'a'.repeat(32) });
  const session = memory({ 'hf-lab-session:word': 'malformed-session', 'hf-lab-run:word': 'c'.repeat(32) });
  vi.stubGlobal('indexedDB', new IDBFactory());
  vi.stubGlobal('localStorage', local);
  vi.stubGlobal('sessionStorage', session);
  vi.stubGlobal('location', { hostname: 'play.adamwhite.work', pathname: '/word/file/' });
  vi.stubGlobal('navigator', {});
  vi.stubGlobal('addEventListener', undefined);
  const beforeLocal = [...local.values],
    beforeSession = [...session.values];
  const lab = createLab({ game: 'word', build: {}, preservation: 'preserve', deferRecording: true });
  try {
    lab.setTelemetryOff(false);
    expect(lab.preservationStatus).toBe('incompatible-session');
    expect(lab.telemetryOn).toBe(false);
    expect([...local.values]).toEqual(beforeLocal);
    expect([...session.values]).toEqual(beforeSession);
  } finally {
    lab.dispose();
  }
});

it('retains the preserving navigation identity mismatch refusal while deferred', () => {
  const local = memory({ 'hf-lab-player': 'a'.repeat(32) });
  const session = memory({
    'hf-lab-session:word': `${'b'.repeat(32)}:${Date.now()}`,
    'hf-lab-run:word': 'c'.repeat(32),
  });
  const fragment = encodeURIComponent(
    JSON.stringify({
      v: 1,
      at: Date.now(),
      to: 'https://word.adamwhite.work',
      player: 'd'.repeat(32),
      off: false,
      notice: false,
    }),
  );
  vi.stubGlobal('localStorage', local);
  vi.stubGlobal('sessionStorage', session);
  vi.stubGlobal('indexedDB', new IDBFactory());
  vi.stubGlobal('navigator', {});
  vi.stubGlobal('addEventListener', undefined);
  vi.stubGlobal('location', {
    hostname: 'word.adamwhite.work',
    origin: 'https://word.adamwhite.work',
    href: 'https://word.adamwhite.work/',
    pathname: '/',
    search: '',
    hash: `#hf-lab-navigation=${fragment}`,
  });
  vi.stubGlobal('document', { referrer: 'https://human.adamwhite.work/games/' });
  vi.stubGlobal('history', { state: null, replaceState: vi.fn() });
  const beforeLocal = [...local.values],
    beforeSession = [...session.values];
  const lab = createLab({ game: 'word', build: {}, preservation: 'preserve', deferRecording: true });
  try {
    expect(lab.preservationStatus).toBe('identity-mismatch');
    lab.setTelemetryOff(false);
    expect(lab.telemetryOn).toBe(false);
    expect([...local.values]).toEqual(beforeLocal);
    expect([...session.values]).toEqual(beforeSession);
  } finally {
    lab.dispose();
  }
});
