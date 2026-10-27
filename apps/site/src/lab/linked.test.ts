import { gunzipSync, gzipSync } from 'node:zlib';
import { describe, expect, it, vi } from 'vitest';
import worker, { cleanupLinked, type Env } from '../../worker/lab.ts';
import { dayOf } from './core.ts';
import { LINKED_LIMITS, linkedKey, parseLinked } from './linked.ts';

const required = <T>(value: T | null | undefined): T => {
  if (value == null) throw new Error('Missing fixture');
  return value;
};

const envelope = (extra: Record<string, unknown> = {}) => ({
  v: 2,
  id: 'a'.repeat(32),
  player: 'b'.repeat(32),
  session: 'c'.repeat(32),
  runId: 'd'.repeat(32),
  game: 'pass',
  kind: 'run',
  at: Date.now(),
  build: {},
  data: { state: 1 },
  ...extra,
});
function setup() {
  const store = new Map<
    string,
    { bytes: Uint8Array; etag: string; customMetadata?: Record<string, string> }
  >();
  let revision = 0;
  const object = (key: string) => {
    const value = store.get(key);
    return value
      ? {
          key,
          size: value.bytes.length,
          etag: value.etag,
          uploaded: new Date(),
          customMetadata: value.customMetadata,
          text: async () => new TextDecoder().decode(value.bytes),
          json: async <T>() => JSON.parse(new TextDecoder().decode(value.bytes)) as T,
        }
      : null;
  };
  const env: Env = {
    LAB: {
      get: async (key) => object(key),
      put: async (key, value, options) => {
        const old = store.get(key);
        if (options?.onlyIf?.etagDoesNotMatch === '*' && old) return null;
        if (options?.onlyIf?.etagMatches && options.onlyIf.etagMatches !== old?.etag) return null;
        store.set(key, {
          bytes: typeof value === 'string' ? new TextEncoder().encode(value) : new Uint8Array(value),
          etag: String(++revision),
          customMetadata: options?.customMetadata,
        });
        return object(key);
      },
      delete: async (keys) => {
        for (const key of typeof keys === 'string' ? [keys] : keys) store.delete(key);
      },
      list: async (options) => ({
        objects: [...store.keys()]
          .filter((key) => key.startsWith(options?.prefix ?? ''))
          .sort()
          .slice(0, options?.limit ?? 1000)
          .map((key) => required(object(key))),
        truncated: false,
      }),
    },
    EVENTS_LIMIT: { limit: async () => ({ success: true }) },
    EVENTS_ALL: { limit: async () => ({ success: true }) },
    RUNS_LIMIT: { limit: async () => ({ success: true }) },
    RUNS_ALL: { limit: async () => ({ success: true }) },
    ASSETS: { fetch: async () => new Response('asset') },
  };
  const post = (body: unknown, headers: Record<string, string> = {}) =>
    worker.fetch(
      new Request('https://human.adamwhite.work/lab/api/linked', {
        method: 'POST',
        headers: { Origin: 'https://repair.adamwhite.work', ...headers },
        body: gzipSync(JSON.stringify(body)),
      }),
      env,
      { waitUntil: () => {} },
    );
  return { store, env, post };
}

describe('linked lab records', () => {
  it('validates identities, dates, chunks and structural bounds before accepting payloads', () => {
    const now = Date.now();
    expect(parseLinked(JSON.stringify(envelope()), now).ok).toBe(true);
    for (const extra of [
      { player: '../secret' },
      { at: now + 300001 },
      { at: now - 181 * 86400000 },
      { data: { encoding: 'json', upload: 'a'.repeat(32), index: 128, total: 128, text: '' } },
      { data: { encoding: 'json', upload: 'a'.repeat(32), index: 0, total: 129, text: '' } },
    ])
      expect(parseLinked(JSON.stringify(envelope(extra)), now).ok).toBe(false);
    const chunk = envelope({
      data: { encoding: 'json', upload: 'a'.repeat(32), index: 127, total: 128, text: '界'.repeat(65536) },
    });
    expect(parseLinked(JSON.stringify(chunk), now).ok).toBe(true);
    expect(
      parseLinked(JSON.stringify(envelope({ data: { text: 'x'.repeat(LINKED_LIMITS.inflated) } })), now).ok,
    ).toBe(false);
    expect(
      parseLinked(JSON.stringify(envelope({ data: JSON.parse(`${'['.repeat(65)}0${']'.repeat(65)}`) })), now)
        .ok,
    ).toBe(false);
  });

  it('suppresses automatic recording under DNT and GPC while storing explicit notes', async () => {
    const { store, post } = setup();
    for (const kind of ['run', 'save', 'note', 'logs', 'events']) {
      const data = kind === 'events' ? { vp: 'phone', e: [['start', 0]] } : {};
      for (const signal of [{ DNT: '1' }, { 'Sec-GPC': '1' }] as Record<string, string>[])
        expect((await post(envelope({ kind, data }), signal)).status).toBe(kind === 'note' ? 200 : 204);
    }
    expect([...store.keys()].filter((key) => key.startsWith('linked/')).length).toBe(1);
    expect((await post(envelope({ id: 'e'.repeat(32), privacyOverride: true }), { DNT: '1' })).status).toBe(
      200,
    );
    expect([...store.keys()].filter((key) => key.startsWith('linked/'))).toHaveLength(2);
  });

  it('keeps retries idempotent across UTC dates, repairs a missing manifest and rejects changed content', async () => {
    const { store, post } = setup();
    const record = envelope({ at: Date.now() - 86400000, ip: 'must-drop' });
    expect((await post(record)).status).toBe(200);
    expect(
      JSON.parse(new TextDecoder().decode(required(store.get('private/linked-index.json')).bytes)).days,
    ).toEqual([dayOf(Date.now())]);
    const index = `private/linked-index/${dayOf(Date.now())}.json`;
    store.delete(index);
    expect((await post({ ...record, at: Date.now() })).status).toBe(200);
    expect([...store.keys()].filter((key) => key.startsWith('linked/'))).toHaveLength(1);
    expect(JSON.parse(new TextDecoder().decode(required(store.get(index)).bytes)).records).toHaveLength(1);
    const budget = JSON.parse(
      new TextDecoder().decode(
        required(store.get(`private/linked-capacity/${dayOf(Date.now())}.json`)).bytes,
      ),
    );
    expect(Object.keys(budget.records)).toHaveLength(1);
    const key = required([...store.keys()].find((value) => value.startsWith('linked/')));
    expect(JSON.parse(gunzipSync(required(store.get(key)).bytes).toString()).ip).toBeUndefined();
    expect((await post({ ...record, data: { changed: true } })).status).toBe(409);
  });

  it('preserves concurrent manifest entries and projects sanitized events once', async () => {
    const { store, post } = setup();
    const first = envelope({
      kind: 'events',
      data: {
        vp: 'phone',
        e: [
          ['start', 0],
          ['err', 1, 'private message'],
        ],
      },
    });
    const second = envelope({ id: 'e'.repeat(32) });
    expect((await Promise.all([post(first), post(second)])).map((response) => response.status)).toEqual([
      200, 200,
    ]);
    expect((await post(first)).status).toBe(200);
    const index = JSON.parse(
      new TextDecoder().decode(required(store.get(`private/linked-index/${dayOf(Date.now())}.json`)).bytes),
    );
    expect(index.records).toHaveLength(2);
    const events = [...store.entries()].filter(([key]) => key.startsWith('ev/'));
    expect(events).toHaveLength(1);
    expect(JSON.parse(new TextDecoder().decode(required(events[0])[1].bytes)).e).toEqual([
      ['start', 0],
      ['err', 1, 'Error'],
    ]);
  });

  it('enforces receipt-day bytes even for backdated data and retains accepted retries', async () => {
    const { store, env, post } = setup();
    const record = envelope();
    expect((await post(record)).status).toBe(200);
    const budgetKey = `private/linked-capacity/${dayOf(Date.now())}.json`;
    const old = JSON.parse(new TextDecoder().decode(required(store.get(budgetKey)).bytes));
    await env.LAB.put(budgetKey, JSON.stringify({ ...old, bytes: LINKED_LIMITS.dailyBytes }));
    const exhausted = await post(envelope({ id: 'f'.repeat(32), at: Date.now() - 120 * 86400000 }));
    expect(exhausted.status).toBe(429);
    expect(await exhausted.json()).toMatchObject({ code: 'daily_capacity' });
    expect(Number(exhausted.headers.get('Retry-After'))).toBeGreaterThan(0);
    expect((await post(record)).status).toBe(200);
  });

  it('admits beyond the old object cap, then distinguishes daily exhaustion from CAS contention', async () => {
    const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-26T23:20:00Z'));
    try {
      const { env, store, post } = setup();
      const budgetKey = 'private/linked-capacity/2026-10-26.json';
      const records = Object.fromEntries(Array.from({ length: 2000 }, (_, i) => [`reserved-${i}`, 1]));
      await env.LAB.put(budgetKey, JSON.stringify({ bytes: 2000, records }));
      expect((await post(envelope())).status).toBe(200);
      await env.LAB.put(
        budgetKey,
        JSON.stringify({
          bytes: 20000,
          records: Object.fromEntries(Array.from({ length: 20000 }, (_, i) => [`reserved-${i}`, 1])),
        }),
      );
      const full = await post(envelope({ id: 'e'.repeat(32) }));
      expect(full.status).toBe(429);
      expect(await full.json()).toMatchObject({ code: 'daily_capacity' });
      expect(full.headers.get('Retry-After')).toBe('2400');
      expect(full.headers.get('Access-Control-Expose-Headers')).toContain('Retry-After');
      expect([...store.keys()].filter((key) => key.startsWith('linked/'))).toHaveLength(1);
      // A receipt already stored is acknowledged even when today's admission budget is full.
      expect((await post(envelope())).status).toBe(200);
      store.delete(budgetKey);
      const put = env.LAB.put;
      env.LAB.put = async (key, value, options) => (key === budgetKey ? null : put(key, value, options));
      const busy = await post(envelope({ id: 'f'.repeat(32) }));
      expect(busy.status).toBe(503);
      expect(await busy.json()).toMatchObject({ code: 'capacity_busy' });
      expect(busy.headers.get('Retry-After')).toBe('1');
      expect([...store.keys()].filter((key) => key.startsWith('linked/'))).toHaveLength(1);
    } finally {
      clock.mockRestore();
    }
  });

  it('returns a short retry delay when linked index or directory CAS is busy', async () => {
    for (const prefix of ['private/linked-index/', 'private/linked-index.json']) {
      const { env, post } = setup();
      const put = env.LAB.put;
      env.LAB.put = async (key, value, options) => (key.startsWith(prefix) ? null : put(key, value, options));
      const busy = await post(envelope());
      expect(busy.status).toBe(503);
      expect(await busy.json()).toMatchObject({ code: 'capacity_busy' });
      expect(busy.headers.get('Retry-After')).toBe('1');
    }
  });

  it('bounds legacy run bytes separately from the linked budget', async () => {
    const { env, store } = setup();
    await env.LAB.put(
      `private/run-byte-capacity/${dayOf(Date.now())}.json`,
      JSON.stringify({ bytes: 8 * 1024 * 1024, records: {} }),
    );
    const response = await worker.fetch(
      new Request('https://human.adamwhite.work/lab/api/run', {
        method: 'POST',
        headers: { Origin: 'https://repair.adamwhite.work' },
        body: gzipSync(JSON.stringify({ v: 1, game: 'pass', run: {} })),
      }),
      env,
      { waitUntil: () => {} },
    );
    expect(response.status).toBe(503);
    expect([...store.keys()].filter((key) => key.startsWith('runs/'))).toHaveLength(0);
  });

  it('removes expired records through the durable receipt manifest', async () => {
    const { env, store } = setup();
    const now = Date.now();
    const day = dayOf(now - 181 * 86400000);
    const parsed = parseLinked(JSON.stringify(envelope()), now);
    if (!parsed.ok) throw new Error('fixture');
    const key = linkedKey(parsed.record);
    await env.LAB.put(key, 'stored');
    await env.LAB.put(
      `private/linked-capacity/${day}.json`,
      JSON.stringify({ bytes: 6, records: { [key]: 6 } }),
    );
    await env.LAB.put(`private/linked-index/${day}.json`, '{}');
    await cleanupLinked(env, now);
    expect(store.size).toBe(0);
  });
});

it('preserves a bounded optional name only on feedback records', () => {
  const parsed = parseLinked(
    JSON.stringify(envelope({ kind: 'note', name: '  Sam  ', data: { note: 'hello' } })),
    Date.now(),
  );
  expect(parsed).toMatchObject({ ok: true, record: { name: 'Sam' } });
  expect(parseLinked(JSON.stringify(envelope({ kind: 'note', name: 'x'.repeat(61) })), Date.now()).ok).toBe(
    false,
  );
  expect(parseLinked(JSON.stringify(envelope({ name: 'Sam' })), Date.now())).toMatchObject({
    ok: true,
    record: expect.not.objectContaining({ name: 'Sam' }),
  });
});

it('retains self-declared agent source in canonical records and private metadata', async () => {
  const { store, post } = setup();
  const marked = envelope({ runSource: 'agent' });
  expect((await post(marked)).status).toBe(200);
  const stored = required(store.get(linkedKey(marked as Parameters<typeof linkedKey>[0])));
  expect(JSON.parse(gunzipSync(stored.bytes).toString()).runSource).toBe('agent');
  expect(stored.customMetadata?.runSource).toBe('agent');
  const index = [...store.entries()].find(([key]) => /^private\/linked-index\/.*\.json$/.test(key));
  expect(new TextDecoder().decode(required(index)[1].bytes)).toContain('"runSource":"agent"');
  expect((await post(marked)).status).toBe(200);
  const legacy = parseLinked(JSON.stringify(envelope()), Date.now());
  expect(legacy.ok).toBe(true);
  if (legacy.ok) expect(legacy.record).not.toHaveProperty('runSource');
  expect(parseLinked(JSON.stringify(envelope({ runSource: 'human' })), Date.now()).ok).toBe(false);
  expect(parseLinked(JSON.stringify(envelope({ runSource: null })), Date.now()).ok).toBe(false);
});
