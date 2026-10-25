import { gunzipSync } from 'node:zlib';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, expect, it, vi } from 'vitest';
import * as identity from '../src/identity.ts';
import { createLab } from '../src/index.ts';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function harness(ready: boolean[] = []) {
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
  const document = {
    visibilityState: 'visible',
    addEventListener: (name: string, fn: () => void) => {
      listeners[name] ??= [];
      listeners[name].push(fn);
    },
  };
  vi.stubGlobal('localStorage', storage);
  vi.stubGlobal('sessionStorage', storage);
  vi.stubGlobal('indexedDB', new IDBFactory());
  vi.stubGlobal('location', { hostname: 'human.adamwhite.work', origin: 'https://human.adamwhite.work' });
  vi.stubGlobal('navigator', {});
  vi.stubGlobal('window', undefined);
  vi.stubGlobal('document', document);
  vi.stubGlobal('innerWidth', 360);
  vi.stubGlobal('addEventListener', (name: string, fn: () => void) => {
    listeners[name] ??= [];
    listeners[name].push(fn);
  });
  vi.stubGlobal('dispatchEvent', () => true);
  let connections = 0;
  const release: (() => void)[] = [];
  vi.spyOn(identity, 'identityBridge').mockImplementation(() => {
    const index = connections++;
    return {
      ready:
        ready[index] === false
          ? new Promise<void>((resolve) => {
              release[index] = resolve;
            })
          : Promise.resolve(),
      setOff: () => {},
    };
  });
  const received: { data?: { e?: unknown[][]; vp?: string }; build?: { a?: string } }[] = [];
  vi.stubGlobal('fetch', async (_url: string, init: RequestInit) => {
    received.push(JSON.parse(gunzipSync(new Uint8Array(await (init.body as Blob).arrayBuffer())).toString()));
    return Response.json({ ok: true, id: 'stored' });
  });
  return { values, document, listeners, received, release };
}

it('does not resend an acknowledged hidden batch after pagehide adds an end', async () => {
  const h = harness();
  const first = createLab({ game: 'pass', build: { a: 'old' } });
  await Promise.resolve();
  await Promise.resolve();
  first.milestone('visible milestone');
  h.document.visibilityState = 'hidden';
  h.listeners.visibilitychange?.[0]?.();
  expect([...h.values.keys()].some((key) => key.startsWith('hf-lab-navigation:pass:'))).toBe(true);
  await vi.waitFor(() =>
    expect(h.received.some((r) => JSON.stringify(r.data).includes('visible milestone'))).toBe(true),
  );
  await vi.waitFor(() =>
    expect([...h.values.keys()].some((key) => key.startsWith('hf-lab-navigation:pass:'))).toBe(false),
  );
  h.listeners.pagehide?.[0]?.();
  createLab({ game: 'pass', build: { a: 'new' } });
  await vi.waitFor(() =>
    expect(h.received.some((r) => r.data?.e?.some((e: unknown[]) => e[0] === 'end'))).toBe(true),
  );
  await new Promise((resolve) => setTimeout(resolve, 200));
  expect(h.received.filter((r) => JSON.stringify(r.data).includes('visible milestone'))).toHaveLength(1);
});

it('replays original viewport and build from the captured document', async () => {
  const h = harness([false, true]);
  const first = createLab({ game: 'pass', build: { a: 'old-build' } });
  first.milestone('capture metadata');
  h.listeners.pagehide?.[0]?.();
  vi.stubGlobal('innerWidth', 1280);
  createLab({ game: 'pass', build: { a: 'new-build' } });
  await vi.waitFor(() => expect(h.received.length).toBeGreaterThan(0));
  const event = h.received.find((r) => JSON.stringify(r.data).includes('capture metadata'));
  expect(event?.data?.vp).toBe('phone');
  expect(event?.build?.a).toBe('old-build');
});

it('retains a flush already waiting on identity when the document hides', async () => {
  const h = harness([false, true]);
  const first = createLab({ game: 'pass', build: { a: 'old' } });
  first.milestone('in flight');
  first.flush();
  h.listeners.pagehide?.[0]?.();
  createLab({ game: 'pass', build: { a: 'new' } });
  await vi.waitFor(() =>
    expect(h.received.some((r) => JSON.stringify(r.data).includes('in flight'))).toBe(true),
  );
});

it('keeps the older journal through a second hide while its recovery waits', async () => {
  const h = harness([false, false, true]);
  const first = createLab({ game: 'pass', build: { a: 'old' } });
  first.milestone('older unsent');
  h.listeners.pagehide?.[0]?.();
  createLab({ game: 'pass', build: { a: 'middle' } });
  h.listeners.pagehide?.[1]?.();
  h.listeners.pagehide?.[1]?.();
  createLab({ game: 'pass', build: { a: 'latest' } });
  await vi.waitFor(() =>
    expect(h.received.some((r) => JSON.stringify(r.data).includes('older unsent'))).toBe(true),
  );
  expect(h.received.flatMap((r) => r.data?.e ?? []).filter((e: unknown[]) => e[0] === 'end')).toHaveLength(2);
});

it('erases old chunks when recording resets during recovery', async () => {
  const h = harness([false, false]);
  const first = createLab({ game: 'pass', build: { a: 'old' } });
  first.milestone('old private run');
  first.flush();
  const second = createLab({ game: 'pass', build: { a: 'new' } });
  second.setTelemetryOff(true);
  h.release[1]?.();
  await new Promise((resolve) => setTimeout(resolve, 20));
  expect([...h.values.keys()].some((key) => key.startsWith('hf-lab-navigation:pass:'))).toBe(false);
  expect(h.received).toHaveLength(0);
});

it('bounds the synchronous journal without deleting its oldest unsent chunk', () => {
  const h = harness([false]);
  const lab = createLab({ game: 'pass', build: { a: 'synthetic' } });
  for (let i = 0; i < 300; i++) {
    lab.screen(`screen ${i}`);
    lab.flush();
  }
  const raw = [...h.values.entries()]
    .filter(([key]) => key.startsWith('hf-lab-navigation:pass:'))
    .map(([, value]) => value);
  const entries = raw.map((value) => JSON.parse(value) as { count: number; data: unknown });
  expect(new TextEncoder().encode(JSON.stringify(entries)).byteLength).toBeLessThanOrEqual(128 * 1024);
  expect(entries.reduce((sum, entry) => sum + entry.count, 0)).toBeLessThanOrEqual(256);
  expect(JSON.stringify(entries[0]?.data)).toContain('screen 0');
});

it('retries an old full journal after the network returns even when new data cannot fit', async () => {
  const h = harness();
  vi.stubGlobal('indexedDB', undefined);
  let online = false;
  let offlineAttempts = 0;
  vi.stubGlobal('fetch', async (_url: string, init: RequestInit) => {
    if (!online) {
      offlineAttempts++;
      return new Response(null, { status: 503 });
    }
    h.received.push(
      JSON.parse(gunzipSync(new Uint8Array(await (init.body as Blob).arrayBuffer())).toString()),
    );
    return Response.json({ ok: true });
  });
  const lab = createLab({ game: 'pass', build: { a: 'offline' } });
  for (let i = 0; i < 255; i++) {
    lab.screen(`offline ${i}`);
    lab.flush();
  }
  expect([...h.values.keys()].filter((key) => key.startsWith('hf-lab-navigation:pass:'))).toHaveLength(255);
  await vi.waitFor(() => expect(offlineAttempts).toBeGreaterThan(0));
  await new Promise((resolve) => setTimeout(resolve, 50));
  online = true;
  const resumedAt = Date.now() + 2 * 3600000;
  vi.spyOn(Date, 'now').mockReturnValue(resumedAt);
  lab.screen('new event cannot fit');
  lab.flush();
  lab.screen('another event cannot fit');
  lab.flush();
  await vi.waitFor(() =>
    expect(h.received.some((record) => JSON.stringify(record.data).includes('offline 0'))).toBe(true),
  );
});

it('keeps two documents’ chunks independent while one retires its own entry', async () => {
  const h = harness([false, false, true]);
  const first = createLab({ game: 'pass', build: { a: 'first' } });
  first.milestone('first tab');
  first.flush();
  const second = createLab({ game: 'pass', build: { a: 'second' } });
  second.milestone('second tab');
  second.flush();
  const keys = () => [...h.values.keys()].filter((key) => key.startsWith('hf-lab-navigation:pass:'));
  expect(keys()).toHaveLength(2);
  const secondKey = keys().find((key) => h.values.get(key)?.includes('second tab'));
  h.release[0]?.();
  await vi.waitFor(() => expect(keys()).toHaveLength(1));
  expect(keys()[0]).toBe(secondKey);
  const third = createLab({ game: 'pass', build: { a: 'third' } });
  third.flush();
  await vi.waitFor(() =>
    expect(h.received.some((record) => JSON.stringify(record.data).includes('second tab'))).toBe(true),
  );
});

it('expires a regular chunk older than seven days without uploading it', async () => {
  const h = harness([false]);
  const first = createLab({ game: 'pass', build: { a: 'old' } });
  first.milestone('expired private event');
  first.flush();
  const key = [...h.values.keys()].find((item) => item.startsWith('hf-lab-navigation:pass:')) ?? '';
  const entry = JSON.parse(h.values.get(key) ?? '{}');
  entry.at = Date.now() - 8 * 86400000;
  h.values.set(key, JSON.stringify(entry));
  createLab({ game: 'pass', build: { a: 'new' } });
  await Promise.resolve();
  expect(h.values.has(key)).toBe(false);
  expect(h.received).toHaveLength(0);
});

it('retries rejected milestone, screen and end markers after journal space returns', async () => {
  const h = harness([false]);
  const lab = createLab({ game: 'pass', build: { a: 'bounded' } });
  for (let i = 0; i < 310; i++) {
    lab.screen(`fill ${i}`);
    lab.flush();
  }
  lab.milestone('retry milestone');
  lab.screen('retry screen');
  h.listeners.pagehide?.[0]?.();
  h.release[0]?.();
  await vi.waitFor(
    () => expect([...h.values.keys()].some((k) => k.startsWith('hf-lab-navigation:pass:'))).toBe(false),
    { timeout: 5000 },
  );
  lab.milestone('retry milestone');
  lab.screen('retry screen');
  h.listeners.pagehide?.[0]?.();
  h.listeners.pagehide?.[0]?.();
  await vi.waitFor(
    () => {
      const events = h.received.flatMap((r) => r.data?.e ?? []);
      expect(events.filter((e) => e[0] === 'ms' && e[2] === 'retry milestone')).toHaveLength(1);
      expect(events.filter((e) => e[0] === 'scr' && e[2] === 'retry screen')).toHaveLength(1);
      expect(events.filter((e) => e[0] === 'end')).toHaveLength(1);
    },
    { timeout: 5000 },
  );
});
