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
    return Response.json({ ok: true, id: (received.at(-1) as { id?: string })?.id });
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

it('preserves old chunks when recording resets during recovery', async () => {
  const h = harness([false, false]);
  const first = createLab({ game: 'pass', build: { a: 'old' } });
  first.milestone('old private run');
  first.flush();
  const second = createLab({ game: 'pass', build: { a: 'new' } });
  second.setTelemetryOff(true);
  h.release[1]?.();
  await new Promise((resolve) => setTimeout(resolve, 20));
  expect([...h.values.keys()].some((key) => key.startsWith('hf-lab-navigation:pass:'))).toBe(true);
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
    return Response.json({ ok: true, id: (h.received.at(-1) as { id?: string })?.id });
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

it('preserves a regular chunk older than seven days without uploading it', async () => {
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
  expect(h.values.has(key)).toBe(true);
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

it('preserves captured agent and legacy source across journal reload', async () => {
  const h = harness([false, false, true]);
  const first = createLab({ game: 'pass', build: {}, runSource: 'agent' });
  first.milestone('agent journal');
  first.flush();
  const second = createLab({ game: 'pass', build: {} });
  second.milestone('legacy journal');
  second.flush();
  createLab({ game: 'pass', build: {}, runSource: 'agent' });
  await vi.waitFor(() => expect(h.received.length).toBe(2));
  const records = h.received as Record<string, unknown>[];
  expect(records.find((r) => JSON.stringify(r.data).includes('agent journal'))?.runSource).toBe('agent');
  expect(records.find((r) => JSON.stringify(r.data).includes('legacy journal'))).not.toHaveProperty(
    'runSource',
  );
});

it('preserving initialization keeps existing identity session preferences and unknown journal bytes while off', async () => {
  const h = harness();
  const old = {
    'hf-lab-player': 'a'.repeat(32),
    'hf-lab-session:pass': `${'b'.repeat(32)}:123`,
    'hf-lab-run:pass': 'c'.repeat(32),
    'hf-lab-recording-off': '1',
    'hf-persona-opt-in': '0',
    'hf-lab-navigation:pass:unknown': 'unique malformed original journal bytes',
  };
  for (const [key, value] of Object.entries(old)) h.values.set(key, value);
  const lab = createLab({ game: 'pass', build: {}, preservation: 'preserve' });
  lab.flush();
  lab.captureSave({ state: 'must not send' });
  await new Promise((resolve) => setTimeout(resolve, 30));
  expect(lab.preservationStatus).toBe('existing-local');
  expect(Object.fromEntries(h.values)).toEqual(old);
  expect(h.received).toHaveLength(0);
  expect(identity.identityBridge).not.toHaveBeenCalled();
  lab.dispose();
});

it('preserving initialization refuses missing identity and incompatible sessions without replacing keys', async () => {
  const h = harness();
  const missing = createLab({ game: 'pass', build: {}, preservation: 'preserve' });
  expect(missing.preservationStatus).toBe('missing-identity');
  expect(missing.telemetryOn).toBe(false);
  await expect(missing.sendRun({ state: 'full' })).rejects.toThrow('preserv');
  expect(h.values.size).toBe(0);
  missing.dispose();
  h.values.set('hf-lab-player', 'a'.repeat(32));
  h.values.set('hf-lab-session:pass', 'unique-incompatible-session');
  const noSession = createLab({ game: 'pass', build: {}, preservation: 'preserve' });
  expect(noSession.preservationStatus).toBe('incompatible-session');
  expect(h.values.get('hf-lab-session:pass')).toBe('unique-incompatible-session');
  expect(h.values.size).toBe(2);
  noSession.dispose();
});

it('preserving recording keeps identity session and journal across explicit off without creating bridge consent', async () => {
  const h = harness();
  h.values.set('hf-lab-player', 'a'.repeat(32));
  h.values.set('hf-lab-session:pass', `${'b'.repeat(32)}:${Date.now()}`);
  h.values.set('hf-lab-run:pass', 'c'.repeat(32));
  h.values.set('hf-lab-navigation:pass:unknown', 'unique old bytes');
  const lab = createLab({ game: 'pass', build: {}, preservation: 'preserve', runSource: 'agent' });
  expect(lab.telemetryOn).toBe(true);
  lab.setTelemetryOff(true);
  lab.flush();
  expect(h.values.get('hf-lab-player')).toBe('a'.repeat(32));
  expect(h.values.get('hf-lab-run:pass')).toBe('c'.repeat(32));
  expect(h.values.get('hf-lab-navigation:pass:unknown')).toBe('unique old bytes');
  expect(identity.identityBridge).not.toHaveBeenCalled();
  lab.dispose();
});

it('preserving initialization adds only absent fresh-tab session keys and keeps old records identities', async () => {
  const h = harness();
  h.values.set('hf-lab-player', 'a'.repeat(32));
  const lab = createLab({ game: 'pass', build: {}, preservation: 'preserve', runSource: 'agent' });
  expect(lab.preservationStatus).toBe('existing-local');
  expect(lab.telemetryOn).toBe(true);
  expect(h.values.get('hf-lab-session:pass')).toMatch(/^[a-f0-9]{32}:\d+$/);
  expect(h.values.get('hf-lab-run:pass')).toMatch(/^[a-f0-9]{32}$/);
  lab.milestone('fresh tab');
  lab.flush();
  await vi.waitFor(() =>
    expect(h.received.some((r) => JSON.stringify(r.data).includes('fresh tab'))).toBe(true),
  );
  expect((h.received[0] as Record<string, unknown>).runSource).toBe('agent');
  expect(h.values.get('hf-lab-player')).toBe('a'.repeat(32));
  lab.dispose();
});

it('preserving navigation refuses a different central identity before changing storage and stops on later identity replacement', async () => {
  const h = harness();
  const existing = 'a'.repeat(32);
  h.values.set('hf-lab-player', existing);
  h.values.set('hf-lab-session:pass', `${'b'.repeat(32)}:${Date.now()}`);
  h.values.set('hf-lab-run:pass', 'c'.repeat(32));
  const before = Object.fromEntries(h.values);
  const url = new URL('https://pass.adamwhite.work/play');
  url.hash = `hf-lab-navigation=${encodeURIComponent(JSON.stringify({ v: 1, at: Date.now(), to: url.origin, player: 'd'.repeat(32), off: false, notice: true }))}`;
  vi.stubGlobal('location', url);
  vi.stubGlobal('document', { ...h.document, referrer: 'https://human.adamwhite.work/' });
  vi.stubGlobal('history', {
    state: null,
    replaceState: (_state: unknown, _unused: string, href: string) => {
      url.href = new URL(href, url).href;
    },
  });
  const refused = createLab({ game: 'pass', build: {}, preservation: 'preserve' });
  expect(refused.preservationStatus).toBe('identity-mismatch');
  expect(refused.telemetryOn).toBe(false);
  expect(Object.fromEntries(h.values)).toEqual(before);
  expect(url.hash).toBe('');
  refused.dispose();
  const accepted = createLab({ game: 'pass', build: {}, preservation: 'preserve' });
  expect(accepted.telemetryOn).toBe(true);
  h.values.set('hf-lab-player', 'e'.repeat(32));
  expect(accepted.telemetryOn).toBe(false);
  expect(accepted.preservationStatus).toBe('identity-mismatch');
  accepted.dispose();
  h.values.set('hf-lab-player', existing);
  const sessionChanged = createLab({ game: 'pass', build: {}, preservation: 'preserve' });
  h.values.set('hf-lab-session:pass', 'foreign replacement');
  expect(sessionChanged.telemetryOn).toBe(false);
  expect(sessionChanged.preservationStatus).toBe('incompatible-session');
  sessionChanged.dispose();
});

it('preserving backpressure keeps new memory events when both durable stores are unavailable', async () => {
  const h = harness();
  h.values.set('hf-lab-player', 'a'.repeat(32));
  h.values.set('hf-lab-session:pass', `${'b'.repeat(32)}:${Date.now()}`);
  h.values.set('hf-lab-run:pass', 'c'.repeat(32));
  vi.stubGlobal('indexedDB', undefined);
  let denied = true;
  vi.stubGlobal('localStorage', {
    get length() {
      return h.values.size;
    },
    key: (index: number) => [...h.values.keys()][index] ?? null,
    getItem: (key: string) => h.values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      if (denied) throw new Error('Storage unavailable');
      h.values.set(key, value);
    },
    removeItem: (key: string) => h.values.delete(key),
  });
  const lab = createLab({ game: 'pass', build: {}, preservation: 'preserve' });
  lab.milestone('retain while denied');
  lab.flush();
  await new Promise((resolve) => setTimeout(resolve, 20));
  denied = false;
  lab.flush();
  expect([...h.values.values()].some((value) => value.includes('retain while denied'))).toBe(true);
  expect(h.received).toHaveLength(0);
  lab.dispose();
});
