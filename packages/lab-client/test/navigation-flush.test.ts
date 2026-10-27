import { gunzipSync } from 'node:zlib';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, expect, it, vi } from 'vitest';
import * as identity from '../src/identity.ts';
import { createLab } from '../src/index.ts';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it('retains a pagehide event until a later document stores it', async () => {
  const values = new Map<string, string>();
  const storage = {
    get length() {
      return values.size;
    },
    key: (index: number) => [...values.keys()][index] ?? null,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
  const listeners: Record<string, (() => void)[]> = {};
  vi.stubGlobal('localStorage', storage);
  vi.stubGlobal('sessionStorage', storage);
  vi.stubGlobal('indexedDB', new IDBFactory());
  vi.stubGlobal('location', { hostname: 'pass.adamwhite.work', origin: 'https://pass.adamwhite.work' });
  vi.stubGlobal('navigator', {});
  vi.stubGlobal('window', undefined);
  vi.stubGlobal('addEventListener', (name: string, listener: () => void) => {
    listeners[name] ??= [];
    listeners[name].push(listener);
  });
  vi.stubGlobal('dispatchEvent', () => true);
  let connections = 0;
  vi.spyOn(identity, 'identityBridge').mockImplementation(() => ({
    ready: ++connections === 1 ? new Promise<void>(() => {}) : Promise.resolve(),
    setOff: () => {},
  }));
  const received: Record<string, unknown>[] = [];
  vi.stubGlobal('fetch', async (_url: string, init: RequestInit) => {
    received.push(JSON.parse(gunzipSync(new Uint8Array(await (init.body as Blob).arrayBuffer())).toString()));
    return Response.json({ ok: true, id: (received.at(-1) as { id?: string })?.id });
  });

  const first = createLab({ game: 'pass', build: { a: 'synthetic' } });
  first.milestone('synthetic navigation');
  listeners.pagehide?.[0]?.();
  expect(received).toHaveLength(0);
  expect([...values.keys()].some((key) => key.startsWith('hf-lab-navigation:pass:'))).toBe(true);
  const second = createLab({ game: 'pass', build: { a: 'synthetic' } });
  await vi.waitFor(() =>
    expect(
      received.some(
        (record) => record.kind === 'events' && JSON.stringify(record.data).includes('synthetic navigation'),
      ),
    ).toBe(true),
  );
  await vi.waitFor(() =>
    expect([...values.keys()].some((key) => key.startsWith('hf-lab-navigation:pass:'))).toBe(false),
  );
  second.milestone('preserve this navigation copy');
  listeners.pagehide?.[1]?.();
  expect([...values.keys()].some((key) => key.startsWith('hf-lab-navigation:pass:'))).toBe(true);
  second.setTelemetryOff(true);
  expect([...values.keys()].some((key) => key.startsWith('hf-lab-navigation:pass:'))).toBe(true);
});

it('keeps the navigation copy when IndexedDB cannot save the replacement', async () => {
  const values = new Map<string, string>();
  values.set('hf-lab-player', 'a'.repeat(32));
  values.set(
    `hf-lab-navigation:pass:${'d'.repeat(32)}`,
    JSON.stringify({
      id: 'd'.repeat(32),
      kind: 'events',
      data: { vp: 'phone', started: 1, e: [['ms', 2, 'synthetic offline navigation']] },
      count: 1,
      link: { player: 'a'.repeat(32), session: 'b'.repeat(32), runId: 'c'.repeat(32) },
      build: {},
      override: false,
      at: Date.now(),
    }),
  );
  const storage = {
    get length() {
      return values.size;
    },
    key: (index: number) => [...values.keys()][index] ?? null,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
  vi.stubGlobal('localStorage', storage);
  vi.stubGlobal('sessionStorage', storage);
  vi.stubGlobal('indexedDB', undefined);
  vi.stubGlobal('location', { hostname: 'human.adamwhite.work', origin: 'https://human.adamwhite.work' });
  vi.stubGlobal('navigator', {});
  vi.stubGlobal('window', undefined);
  vi.stubGlobal('addEventListener', undefined);
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  createLab({ game: 'pass', build: {} });
  await new Promise((resolve) => setTimeout(resolve, 20));
  expect([...values.keys()].some((key) => key.startsWith('hf-lab-navigation:pass:'))).toBe(true);
  expect(fetch).toHaveBeenCalledTimes(1);
});
