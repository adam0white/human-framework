import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { afterEach, describe, expect, it, vi } from 'vitest';
import worker, { cleanup, type Env } from '../../worker/lab.ts';
import {
  aggregateDay,
  allowedOrigin,
  cleanText,
  errorLabel,
  hourOf,
  label,
  lastDays,
  mergeAggregates,
  parseBatch,
  parseRun,
  runId,
  type StoredBatch,
} from './core.ts';
import { buildCurated } from './ledger.ts';

const batch = (over: Record<string, unknown> = {}) =>
  JSON.stringify({
    v: 1,
    g: 'pass',
    s: 'abcdefgh12345678',
    b: { c: '01601bc', hf: '2.8.0' },
    vp: 'phone',
    e: [['start', 0]],
    ...over,
  });

describe('lab core', () => {
  it('accepts Rope season labels and rejects invented climbs or mountain names', () => {
    const e = [
      ['scr', 0, 'title'],
      ['scr', 1, 'season'],
      ['ms', 2, 'season done'],
    ];
    for (const [i, id] of ['hollin', 'tooth', 'kestrel'].entries()) {
      for (const phase of ['hut', 'climb', 'debrief']) e.push(['scr', 3, `climb ${i + 1} ${id}: ${phase}`]);
      for (const milestone of ['done', 'summit', 'all home'])
        e.push(['ms', 4, `climb ${i + 1} ${milestone}`]);
    }
    const good = parseBatch(batch({ g: 'rope', e }));
    expect(good.ok && good.batch.e).toEqual(e);
    const bad = parseBatch(
      batch({
        g: 'rope',
        e: [
          ['scr', 0, 'climb 4 hollin: hut'],
          ['scr', 1, 'climb 1 Jane Doe: hut'],
        ],
      }),
    );
    expect(bad.ok && bad.batch.e).toEqual([
      ['scr', 0],
      ['scr', 1],
    ]);
  });

  it('rejects unknown games and drops undeclared prose and addresses', () => {
    expect(parseBatch(batch({ g: 'zzz' })).ok).toBe(false);
    expect(parseRun(JSON.stringify({ v: 1, game: 'zzz', run: {} })).ok).toBe(false);
    for (const name of [
      'My name is Jane Doe at 123 Main Street',
      '192.168.1.1',
      '2001:db8::1',
      'visit evil dot example',
    ]) {
      const r = parseBatch(
        batch({
          e: [
            ['scr', 1, name],
            ['ms', 2, name],
          ],
        }),
      );
      expect(r.ok && r.batch.e).toEqual([
        ['scr', 1],
        ['ms', 2],
      ]);
    }
  });

  it('rejects structurally expensive JSON before parsing and accepts braces inside strings', () => {
    const dense = JSON.stringify({ v: 1, game: 'pass', run: Array.from({ length: 40000 }, () => ({})) });
    expect(parseRun(dense).ok).toBe(false);
    const deep = `{"v":1,"game":"pass","run":${'['.repeat(100)}0${']'.repeat(100)}}`;
    expect(parseRun(deep).ok).toBe(false);
    expect(parseRun(JSON.stringify({ v: 1, game: 'pass', run: { text: '[{"'.repeat(40000) } })).ok).toBe(
      true,
    );
  });

  it('accepts a well-formed batch and drops unknown fields', () => {
    const r = parseBatch(
      batch({
        ip: '1.2.3.4',
        ua: 'x',
        e: [
          ['start', 0],
          ['ms', 1200, 'service 1 done'],
          ['scr', 1500.4, 'night 1: service'],
        ],
      }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(Object.keys(r.batch).sort()).toEqual(['b', 'e', 'g', 's', 'v', 'vp']);
    expect(r.batch.e[2]).toEqual(['scr', 1500, 'night 1: service']);
  });

  it('rejects malformed batches', () => {
    expect(parseBatch('nope').ok).toBe(false);
    expect(parseBatch(batch({ g: 'Pass!' })).ok).toBe(false);
    expect(parseBatch(batch({ s: 'short' })).ok).toBe(false);
    expect(parseBatch(batch({ e: [] })).ok).toBe(false);
    expect(parseBatch(batch({ e: [['click', 0]] })).ok).toBe(false);
    expect(parseBatch(batch({ e: [['ms', -1, 'x']] })).ok).toBe(false);
    expect(parseBatch(batch({ e: Array.from({ length: 61 }, () => ['ms', 0, 'x']) })).ok).toBe(false);
    expect(parseBatch('x'.repeat(9000)).ok).toBe(false);
  });

  it('cleans text: control characters, query strings, length', () => {
    expect(cleanText('TypeError at https://pass.adamwhite.work/a.js?token=abc#x line 3', 80)).toBe(
      'TypeError at https://pass.adamwhite.work/a.js line 3',
    );
    expect(cleanText('a\u0000b', 80)).toBe('a b');
    expect(cleanText('x'.repeat(200), 80)).toHaveLength(80);
    expect(cleanText(3, 80)).toBeUndefined();
  });

  it('allows only adamwhite.work over https and localhost', () => {
    expect(allowedOrigin('https://pass.adamwhite.work')).toBe(true);
    expect(allowedOrigin('https://adamwhite.work')).toBe(true);
    expect(allowedOrigin('http://localhost:5173')).toBe(true);
    expect(allowedOrigin('http://pass.adamwhite.work')).toBe(false);
    expect(allowedOrigin('https://evil-adamwhite.work')).toBe(false);
    expect(allowedOrigin('https://adamwhite.work.evil.com')).toBe(false);
    expect(allowedOrigin(null)).toBe(false);
  });

  it('validates a run envelope', () => {
    expect(
      parseRun(JSON.stringify({ v: 1, game: 'pass', run: { seed: 1 }, note: ' hi ', who: 'owner' })),
    ).toEqual({
      ok: true,
      run: { v: 1, game: 'pass', run: { seed: 1 }, note: 'hi', who: 'owner', build: {} },
    });
    expect(parseRun(JSON.stringify({ v: 1, game: 'pass' })).ok).toBe(false);
    expect(parseRun(JSON.stringify({ v: 1, game: 'pass', run: {}, note: 'x'.repeat(4001) })).ok).toBe(false);
  });

  it('aggregates sessions, quit points and durations without keeping session ids', () => {
    const b = (s: string, e: StoredBatch['e']): StoredBatch => ({
      v: 1,
      g: 'pass',
      s,
      b: { c: 'abc1234' },
      vp: 'phone',
      e,
      h: '',
    });
    const day = aggregateDay('2026-10-19', [
      b('aaaaaaaa', [
        ['start', 0],
        ['scr', 10, 'night 1'],
      ]),
      b('aaaaaaaa', [
        ['ms', 400_000, 'service 1 done'],
        ['scr', 400_001, 'night 2'],
        ['end', 700_000],
      ]),
      b('bbbbbbbb', [
        ['start', 0],
        ['scr', 5, 'title'],
        ['err', 9, 'boom'],
        ['err', 10, 'boom'],
      ]),
    ]);
    const g = day.games.pass;
    expect(g?.sessions).toBe(2);
    expect(g?.ended).toBe(1);
    expect(g?.minutes).toEqual([1, 0, 1, 0, 0]);
    expect(g?.quits).toEqual({ 'night 2': 1, title: 1 });
    expect(g?.milestones).toEqual({ 'service 1 done': 1 });
    expect(g?.errors).toEqual({ boom: 2 });
    expect(JSON.stringify(day)).not.toContain('aaaaaaaa');
    expect(mergeAggregates([day, day]).pass?.sessions).toBe(4);
  });

  it('treats names like "constructor" as plain keys', () => {
    const b = (g: string, name: string): StoredBatch => ({
      v: 1,
      g,
      s: 'aaaaaaaa',
      b: {},
      vp: 'phone',
      e: [
        ['ms', 1, name],
        ['scr', 2, name],
      ],
      h: '',
    });
    const day = aggregateDay('2026-10-19', [b('constructor', 'constructor'), b('pass', '__proto__')]);
    expect(day.games['constructor' as string]?.sessions).toBe(1);
    expect(Object.entries(mergeAggregates([day]).pass?.milestones ?? {})).toContainEqual(['__proto__', 1]);
    expect(parseBatch(batch({ g: 'constructor' })).ok).toBe(false);
  });

  it('keeps errors as type and place only, and names free of addresses', () => {
    expect(errorLabel('TypeError at index-3f2a.js:12:345')).toBe('TypeError at index-3f2a.js:12:345');
    expect(errorLabel('Cannot read jane@example.com')).toBe('Error');
    expect(label('night 2: service')).toBe('night 2: service');
    expect(label('mail jane@example.com')).toBeUndefined();
    expect(label('see https://x.y/z')).toBeUndefined();
    const r = parseBatch(
      batch({
        e: [
          ['err', 1, 'my password is hunter2'],
          ['scr', 2, 'night <b>2</b>'],
        ],
      }),
    );
    expect(r.ok && r.batch.e).toEqual([
      ['err', 1, 'Error'],
      ['scr', 2],
    ]);
  });

  it('formats ids, hours and day windows', () => {
    expect(runId(new Uint8Array(10))).toMatch(/^r-[a-z0-9]{10}$/);
    expect(hourOf(Date.UTC(2026, 9, 19, 14, 59))).toBe('2026-10-19T14');
    expect(lastDays(Date.UTC(2026, 9, 2), 3)).toEqual(['2026-09-30', '2026-10-01', '2026-10-02']);
  });
});

/** An in-memory stand-in for the R2 binding, with the subset the Worker uses. */
function fakeEnv(limited = false) {
  const store = new Map<
    string,
    { body: Uint8Array; meta?: Record<string, string>; uploaded?: Date; etag?: string }
  >();
  const enc = new TextEncoder();
  const obj = (key: string) => {
    const o = store.get(key);
    if (!o) return null;
    const text = new TextDecoder().decode(o.body);
    return {
      key,
      size: o.body.byteLength,
      uploaded: o.uploaded ?? new Date(),
      etag: o.etag ?? key,
      customMetadata: o.meta,
      text: async () => text,
      json: async () => JSON.parse(text),
    };
  };
  const env = {
    LAB: {
      get: async (key: string) => obj(key),
      put: async (
        key: string,
        value: string | ArrayBuffer | Uint8Array,
        opts?: {
          customMetadata?: Record<string, string>;
          onlyIf?: { etagMatches?: string; etagDoesNotMatch?: string };
        },
      ) => {
        const old = store.get(key);
        if (opts?.onlyIf?.etagDoesNotMatch === '*' && old) return null;
        if (opts?.onlyIf?.etagMatches && (old?.etag ?? key) !== opts.onlyIf.etagMatches) return null;
        const body = typeof value === 'string' ? enc.encode(value) : new Uint8Array(value as ArrayBuffer);
        const saved = { body, meta: opts?.customMetadata, etag: String(Number(old?.etag ?? 0) + 1) };
        store.set(key, saved);
        return { key, size: body.byteLength, uploaded: new Date(), etag: saved.etag };
      },
      delete: async (keys: string | string[]) => {
        for (const k of Array.isArray(keys) ? keys : [keys]) store.delete(k);
      },
      list: async ({
        prefix = '',
        cursor,
        limit = 1000,
        delimiter,
      }: {
        prefix?: string;
        cursor?: string;
        limit?: number;
        delimiter?: string;
      } = {}) => {
        const all = [...store.keys()].filter((k) => k.startsWith(prefix) && (!cursor || k > cursor)).sort();
        const entries = delimiter
          ? [
              ...new Set(
                all.map((k) => {
                  const end = k.indexOf(delimiter, prefix.length);
                  return end < 0 ? k : k.slice(0, end + delimiter.length);
                }),
              ),
            ].filter((k) => !cursor || k > cursor)
          : all;
        const page = entries.slice(0, Math.min(limit, 173)); // metadata can shorten R2 pages
        return {
          objects: page.flatMap((k) => obj(k) ?? []),
          delimitedPrefixes: delimiter ? page.filter((k) => !store.has(k)) : [],
          truncated: entries.length > page.length,
          cursor: entries.length > page.length ? page.at(-1) : undefined,
        };
      },
    },
    EVENTS_LIMIT: { limit: async () => ({ success: !limited }) },
    RUNS_LIMIT: { limit: async () => ({ success: !limited }) },
    EVENTS_ALL: { limit: async () => ({ success: true }) },
    RUNS_ALL: { limit: async () => ({ success: true }) },
    ASSETS: {
      fetch: async () =>
        Response.json({ app: '1.0.0', framework: '2.8.0', commit: 'f'.repeat(40), dirty: false }),
    },
  };
  return { env: env as unknown as Env, store };
}

/** Calls the Worker and waits for its after-response work (waitUntil). */
async function call(req: Request, env: Env): Promise<Response> {
  const later: Promise<unknown>[] = [];
  const res = await worker.fetch(req, env, { waitUntil: (p) => later.push(p) });
  await Promise.all(later);
  return res;
}

const post = (path: string, body: BodyInit, headers: Record<string, string> = {}) =>
  new Request(`https://human.adamwhite.work${path}`, {
    method: 'POST',
    body,
    headers: { Origin: 'https://pass.adamwhite.work', ...headers },
  });

describe('lab worker', () => {
  it('bounds the public rebuild below fifty total R2 and release subrequests', async () => {
    vi.resetModules();
    const freshWorker = (await import('../../worker/lab.ts')).default;
    const { env, store } = fakeEnv();
    for (const day of lastDays(Date.now(), 7)) {
      for (let i = 0; i < 200; i++) {
        store.set(`ev/${day}/10/${i}.json`, {
          body: new TextEncoder().encode(batch({ s: `sess${String(i).padStart(8, '0')}` })),
        });
        store.set(`runs/${day}/${i}.gz`, { body: new Uint8Array(), meta: { game: 'pass' } });
      }
    }
    let operations = 0;
    const originals = { ...env.LAB };
    for (const k of ['get', 'put', 'list', 'delete'] as const)
      Object.assign(env.LAB, {
        [k]: (...args: unknown[]) => {
          operations++;
          if (operations > 49) throw new Error('too many subrequests');
          return Reflect.apply(originals[k], originals, args);
        },
      });
    vi.stubGlobal('fetch', async () => {
      operations++;
      return Response.json({});
    });
    env.ASSETS.fetch = async () => {
      operations++;
      return Response.json({});
    };
    const res = await freshWorker.fetch(new Request('https://human.adamwhite.work/lab/data.json'), env, {
      waitUntil() {},
    });
    expect(res.status).toBe(200);
    expect(operations).toBeLessThan(50);
    expect(((await res.json()) as { window: { sampled: boolean } }).window.sampled).toBe(true);
  });

  it('does not publish undeclared labels left in old stored batches', async () => {
    vi.resetModules();
    const freshWorker = (await import('../../worker/lab.ts')).default;
    const { env, store } = fakeEnv();
    const day = new Date().toISOString().slice(0, 10);
    store.set(`ev/${day}/10/legacy.json`, {
      body: new TextEncoder().encode(
        batch({
          e: [
            ['scr', 1, 'Jane Doe at 123 Main Street'],
            ['ms', 2, 'arbitrary text'],
          ],
        }),
      ),
    });
    vi.stubGlobal('fetch', async () => Response.json({}));
    const res = await freshWorker.fetch(new Request('https://human.adamwhite.work/lab/data.json'), env, {
      waitUntil() {},
    });
    const text = await res.text();
    expect(text).not.toContain('Jane Doe');
    expect(text).not.toContain('arbitrary text');
  });

  it('abandons a stalled rebuild and lets the next request retry', async () => {
    vi.resetModules();
    const freshWorker = (await import('../../worker/lab.ts')).default;
    const { env } = fakeEnv();
    const get = env.LAB.get;
    env.LAB.get = () => new Promise(() => {});
    vi.stubGlobal('fetch', async () => Response.json({}));
    vi.useFakeTimers();
    try {
      const res = freshWorker.fetch(new Request('https://human.adamwhite.work/lab/data.json'), env, {
        waitUntil() {},
      });
      await vi.advanceTimersByTimeAsync(20001);
      let status: number | undefined;
      void res.then((r) => {
        status = r.status;
      });
      await Promise.resolve();
      expect(status).toBe(503);
      env.LAB.get = get;
      const retried = await freshWorker.fetch(
        new Request('https://human.adamwhite.work/lab/data.json'),
        env,
        { waitUntil() {} },
      );
      expect(retried.status).toBe(200);
    } finally {
      vi.useRealTimers();
    }
  });

  it('groups IPv6 clients by their /64 across expanded and compressed spellings', async () => {
    const { env } = fakeEnv();
    const seen: string[] = [];
    env.EVENTS_LIMIT.limit = async ({ key }) => {
      seen.push(key);
      return { success: true };
    };
    for (const ip of [
      '2001:db8:abcd:12::1',
      '2001:0db8:abcd:0012:ffff:ffff:ffff:ffff',
      '2001:db8:abcd:13::1',
    ]) {
      await call(post('/lab/api/events', batch(), { 'CF-Connecting-IP': ip }), env);
    }
    expect(seen[0]).toBe(seen[1]);
    expect(seen[0]).not.toBe(seen[2]);
  });

  it('reserves daily event capacity before accepting concurrent batches', async () => {
    const { env, store } = fakeEnv();
    const day = new Date().toISOString().slice(0, 10);
    store.set(`private/event-capacity/${day}.json`, {
      body: new TextEncoder().encode('{"used":999}'),
      etag: '1',
    });
    const responses = await Promise.all(
      Array.from({ length: 20 }, () => call(post('/lab/api/events', batch()), env)),
    );
    expect(responses.filter((r) => r.status === 204)).toHaveLength(1);
    expect([...store.keys()].filter((k) => k.startsWith('ev/'))).toHaveLength(1);
  });

  it('reserves daily capacity with conditional R2 writes under concurrency', async () => {
    const { env, store } = fakeEnv();
    const day = new Date().toISOString().slice(0, 10);
    for (let i = 0; i < 199; i++) store.set(`runs/${day}/${i}.gz`, { body: new Uint8Array() });
    const body = gzipSync(JSON.stringify({ v: 1, game: 'pass', run: { seed: 1, inputs: [] } }));
    const responses = await Promise.all(
      Array.from({ length: 20 }, () => call(post('/lab/api/run', body), env)),
    );
    expect(responses.filter((r) => r.status === 200)).toHaveLength(1);
    expect([...store.keys()].filter((k) => k.startsWith('runs/'))).toHaveLength(200);
    expect(responses.every((r) => r.status === 200 || r.status === 503)).toBe(true);
  });

  it('checks shared run ingress before listing or decompressing', async () => {
    const { env } = fakeEnv();
    env.RUNS_ALL.limit = async () => ({ success: false });
    const list = vi.spyOn(env.LAB, 'list');
    const replies = await Promise.all(
      Array.from({ length: 250 }, () => call(post('/lab/api/run', 'bad'), env)),
    );
    expect(replies.every((r) => r.status === 429)).toBe(true);
    expect(list).not.toHaveBeenCalled();
  });

  it('counts all pages before enforcing the daily run threshold', async () => {
    const { env, store } = fakeEnv();
    const day = new Date().toISOString().slice(0, 10);
    for (let i = 0; i < 200; i++) store.set(`runs/${day}/${i}.gz`, { body: new Uint8Array() });
    expect(
      (await call(post('/lab/api/run', gzipSync(JSON.stringify({ v: 1, game: 'pass', run: {} }))), env))
        .status,
    ).toBe(503);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('stores an event batch under the hour, with CORS for the game origin', async () => {
    const { env, store } = fakeEnv();
    const res = await call(post('/lab/api/events', batch(), { 'Content-Type': 'text/plain' }), env);
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://pass.adamwhite.work');
    const keys = [...store.keys()].filter((k) => k.startsWith('ev/'));
    expect(keys.filter((k) => k.startsWith('ev/'))).toHaveLength(1);
    expect(keys[0]).toMatch(/^ev\/\d{4}-\d{2}-\d{2}\/\d{2}\/[0-9a-f]{16}\.json$/);
    const stored = JSON.parse(new TextDecoder().decode(store.get(keys[0] ?? '')?.body));
    expect(Object.keys(stored).sort()).toEqual(['b', 'e', 'g', 'h', 's', 'v', 'vp']);
  });

  it('refuses other origins, drops events under GPC or DNT, and rate-limits', async () => {
    const { env, store } = fakeEnv();
    expect(
      (await call(post('/lab/api/events', batch(), { Origin: 'https://evil.example' }), env)).status,
    ).toBe(403);
    expect(
      (
        await call(
          new Request('https://human.adamwhite.work/lab/api/events', { method: 'POST', body: batch() }),
          env,
        )
      ).status,
    ).toBe(403);
    expect((await call(post('/lab/api/events', batch(), { 'Sec-GPC': '1' }), env)).status).toBe(204);
    expect((await call(post('/lab/api/events', batch(), { DNT: '1' }), env)).status).toBe(204);
    expect(store.size).toBe(0);
    const limited = fakeEnv(true);
    expect((await call(post('/lab/api/events', batch()), limited.env)).status).toBe(429);
  });

  it('answers a preflight from an allowed origin', async () => {
    const { env } = fakeEnv();
    const res = await call(
      new Request('https://human.adamwhite.work/lab/api/run', {
        method: 'OPTIONS',
        headers: { Origin: 'http://localhost:5173' },
      }),
      env,
    );
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST');
  });

  it('stores an opt-in run privately, re-compressed, and indexes it', async () => {
    const { env, store } = fakeEnv();
    const envelope = {
      v: 1,
      game: 'pass',
      note: 'got bored on night 3',
      who: 'owner',
      extra: 'dropped',
      run: { seed: 7, inputs: [] },
    };
    const res = await call(
      post('/lab/api/run', gzipSync(JSON.stringify(envelope)), { 'Content-Type': 'application/gzip' }),
      env,
    );
    expect(res.status).toBe(200);
    const { id } = (await res.json()) as { id: string };
    expect(id).toMatch(/^r-/);
    const key = [...store.keys()].find((k) => k.startsWith('runs/'));
    expect(key).toMatch(new RegExp(`^runs/\\d{4}-\\d{2}-\\d{2}/${id}\\.json\\.gz$`));
    const saved = store.get(key ?? '');
    expect(saved?.meta).toMatchObject({ id, game: 'pass', who: 'owner', note: '20' });
    const { gunzipSync } = await import('node:zlib');
    const back = JSON.parse(gunzipSync(saved?.body ?? new Uint8Array()).toString());
    expect(back).toEqual({
      v: 1,
      game: 'pass',
      note: 'got bored on night 3',
      who: 'owner',
      build: {},
      run: { seed: 7, inputs: [] },
    });
    const index = JSON.parse(new TextDecoder().decode(store.get('private/index.json')?.body));
    expect(index.runs).toHaveLength(1);
    const again = await call(
      post('/lab/api/run', gzipSync(JSON.stringify({ v: 1, game: 'glance', run: {} })), {
        'Content-Type': 'application/gzip',
      }),
      env,
    );
    const second = (await again.json()) as { id: string };
    const index2 = JSON.parse(new TextDecoder().decode(store.get('private/index.json')?.body));
    expect(index2.runs.map((r: { id: string }) => r.id)).toEqual([second.id, id]);
  });

  it('refuses runs that are not gzip, too large inflated, or malformed', async () => {
    const { env, store } = fakeEnv();
    expect((await call(post('/lab/api/run', 'plain text'), env)).status).toBe(400);
    const bomb = gzipSync(JSON.stringify({ v: 1, game: 'pass', run: { pad: 'x'.repeat(33 * 1024 * 1024) } }));
    expect((await call(post('/lab/api/run', bomb), env)).status).toBe(413);
    expect((await call(post('/lab/api/run', gzipSync('{"v":1,"game":"pass"}')), env)).status).toBe(400);
    expect([...store.keys()].filter((k) => k.startsWith('runs/'))).toHaveLength(0);
  });

  it('serves public data.json with aggregates and run counts, never notes', async () => {
    const { env } = fakeEnv();
    vi.stubGlobal('fetch', async () =>
      Response.json({ commit: 'abc1234def', framework: '2.8.0', app: '0.1.0', dirty: false }),
    );
    await call(
      post(
        '/lab/api/events',
        batch({
          e: [
            ['start', 0],
            ['scr', 3, 'night 1: service'],
          ],
        }),
      ),
      env,
    );
    await call(
      post('/lab/api/run', gzipSync(JSON.stringify({ v: 1, game: 'pass', note: 'secret words', run: {} }))),
      env,
    );
    const res = await call(new Request('https://human.adamwhite.work/lab/data.json'), env);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).not.toContain('secret words');
    expect(text).not.toContain('abcdefgh12345678');
    const data = JSON.parse(text) as {
      games: {
        id: string;
        runs: number;
        telemetry: { sessions: number; quits: [string, number][] } | null;
        live: unknown;
      }[];
    };
    const pass = data.games.find((g) => g.id === 'pass');
    expect(pass?.runs).toBe(1);
    expect(pass?.telemetry?.sessions).toBe(1);
    expect(pass?.telemetry?.quits).toEqual([['night 1: service', 1]]);
    expect(pass?.live).toMatchObject({ framework: '2.8.0' });
  });
});

async function drainCleanup(env: Env, now: number, steps = 100): Promise<number> {
  let total = 0;
  for (let i = 0; i < steps; i++) total += await cleanup(env, now);
  return total;
}

describe('lab retention', () => {
  it('blocks checkpoint resurrection after another initial writer completes and deletes raw data', async () => {
    const { env, store } = fakeEnv();
    const day = '2026-10-17';
    const key = `private/aggregation/${day}.json`;
    store.set(`ev/${day}/10/one.json`, { body: new TextEncoder().encode(batch()) });
    const put = env.LAB.put;
    let paused = false;
    let release: () => void = () => {};
    let notify: () => void = () => {};
    const blocked = new Promise<void>((r) => {
      notify = r;
    });
    const gate = new Promise<void>((r) => {
      release = r;
    });
    env.LAB.put = async (k, value, options) => {
      if (k === key && options?.onlyIf?.etagDoesNotMatch === '*' && !paused) {
        paused = true;
        notify();
        await gate;
      }
      return put(k, value, options);
    };
    const slow = cleanup(env, Date.UTC(2026, 9, 19));
    await blocked;
    await cleanup(env, Date.UTC(2026, 9, 19));
    expect([...store.keys()].some((k) => k.startsWith(`ev/${day}/`))).toBe(false);
    release();
    await slow;
    const retained = new TextDecoder().decode(store.get(key)?.body);
    expect(retained).not.toContain('abcdefgh12345678');
    expect(JSON.parse(retained)).toEqual({ done: true });
  });

  it('bounds each cron invocation and resumes without counting a session twice', async () => {
    const { env, store } = fakeEnv();
    const day = '2026-10-17';
    for (let i = 0; i < 180; i++)
      store.set(`ev/${day}/10/${String(i).padStart(5, '0')}.json`, {
        body: new TextEncoder().encode(
          batch({ s: i % 2 ? 'sharedsession01' : `sess${String(i).padStart(8, '0')}` }),
        ),
      });
    for (let step = 0; step < 20; step++) {
      let calls = 0;
      const originals = { ...env.LAB };
      for (const k of ['get', 'put', 'list', 'delete'] as const) {
        // Count every R2 operation, as a free-plan invocation would.
        Object.assign(env.LAB, {
          [k]: (...args: unknown[]) => {
            calls++;
            if (calls > 45) throw new Error('invocation exceeded operation budget');
            return Reflect.apply(originals[k], originals, args);
          },
        });
      }
      const pending: Promise<unknown>[] = [];
      await worker.scheduled({}, env, { waitUntil: (p) => pending.push(p) });
      await Promise.all(pending);
      Object.assign(env.LAB, originals);
      expect(calls).toBeLessThanOrEqual(45);
    }
    const agg = JSON.parse(new TextDecoder().decode(store.get(`agg/${day}.json`)?.body));
    expect(agg.batches).toBe(180);
    expect(agg.games.pass.sessions).toBe(91);
    expect([...store.keys()].some((k) => k.startsWith(`ev/${day}/`))).toBe(false);
    expect(JSON.parse(new TextDecoder().decode(store.get(`private/aggregation/${day}.json`)?.body))).toEqual({
      done: true,
    });
  });

  it('retains oversized legacy days and lets later days complete', async () => {
    const { env, store } = fakeEnv();
    for (let i = 0; i < 1001; i++)
      store.set(`ev/2026-10-16/10/${String(i).padStart(5, '0')}.json`, {
        body: new TextEncoder().encode(batch({ s: `sess${String(i).padStart(8, '0')}` })),
      });
    store.set('ev/2026-10-17/10/one.json', { body: new TextEncoder().encode(batch()) });
    await drainCleanup(env, Date.UTC(2026, 9, 19, 12), 70);
    expect([...store.keys()].filter((k) => k.startsWith('ev/2026-10-16/'))).toHaveLength(1001);
    expect(store.has('agg/2026-10-16.json')).toBe(false);
    expect(store.has('private/deferred/2026-10-16.json')).toBe(true);
    expect(store.has('agg/2026-10-17.json')).toBe(true);
  });

  it('concurrent checkpoint writers do not double count or delete unfinished batches', async () => {
    const { env, store } = fakeEnv();
    for (let i = 0; i < 75; i++)
      store.set(`ev/2026-10-17/10/${String(i).padStart(5, '0')}.json`, {
        body: new TextEncoder().encode(batch({ s: `sess${String(i).padStart(8, '0')}` })),
      });
    for (let n = 0; n < 15; n++)
      await Promise.all([cleanup(env, Date.UTC(2026, 9, 19)), cleanup(env, Date.UTC(2026, 9, 19))]);
    const agg = JSON.parse(new TextDecoder().decode(store.get('agg/2026-10-17.json')?.body));
    expect(agg.batches).toBe(75);
    expect(agg.games.pass.sessions).toBe(75);
  });

  it('finalizes every batch across pages and replaces a previously sampled aggregate', async () => {
    const { env, store } = fakeEnv();
    const day = '2026-10-17';
    for (let i = 0; i < 805; i++) {
      store.set(`ev/${day}/10/${String(i).padStart(5, '0')}.json`, {
        body: new TextEncoder().encode(batch({ s: `sess${String(i).padStart(8, '0')}` })),
      });
    }
    store.set(`agg/${day}.json`, {
      body: new TextEncoder().encode(JSON.stringify({ ...aggregateDay(day, []), sampled: true })),
    });
    expect(await drainCleanup(env, Date.UTC(2026, 9, 19, 12))).toBe(805);
    const saved = JSON.parse(new TextDecoder().decode(store.get(`agg/${day}.json`)?.body));
    expect(saved.batches).toBe(805);
    expect(saved.games.pass.sessions).toBe(805);
    expect(saved.sampled).toBeUndefined();
  });

  it('keeps a recent day provisional so a delayed midnight write survives finalization', async () => {
    const { env, store } = fakeEnv();
    const now = vi.spyOn(Date, 'now').mockReturnValue(Date.UTC(2026, 9, 18, 23, 59, 59));
    const original = env.LAB.put;
    let release: () => void = () => {};
    const gate = new Promise<void>((r) => {
      release = r;
    });
    env.LAB.put = async (key, value, opts) => {
      if (key.startsWith('ev/')) await gate;
      return original(key, value, opts);
    };
    const upload = call(post('/lab/api/events', batch()), env);
    await vi.waitFor(() => expect(env.LAB.put).toBeDefined());
    // Let body read and the storage write begin before crossing midnight.
    await new Promise((r) => setTimeout(r, 20));
    now.mockReturnValue(Date.UTC(2026, 9, 19, 0, 0, 1));
    const pending: Promise<unknown>[] = [];
    await worker.scheduled({}, env, { waitUntil: (p) => pending.push(p) });
    await Promise.all(pending);
    expect(store.has('agg/2026-10-18.json')).toBe(false);
    release();
    expect((await upload).status).toBe(204);
    await cleanup(env, Date.UTC(2026, 9, 20, 12));
    const agg = JSON.parse(new TextDecoder().decode(store.get('agg/2026-10-18.json')?.body));
    expect(agg.games.pass.sessions).toBe(1);
    now.mockRestore();
  });

  it('retains the newest runs by upload time across the 5000-entry page boundary', async () => {
    const { env, store } = fakeEnv();
    for (let i = 0; i < 5001; i++)
      store.set(`runs/2026-10-18/${String(i).padStart(5, '0')}.gz`, {
        body: new Uint8Array(),
        uploaded: new Date(Date.UTC(2026, 9, 18) + (5001 - i) * 1000),
        meta: { game: 'pass' },
      });
    const pending: Promise<unknown>[] = [];
    for (let n = 0; n < 35; n++) {
      pending.length = 0;
      await worker.scheduled({}, env, { waitUntil: (p) => pending.push(p) });
      await Promise.all(pending);
    }
    const index = JSON.parse(new TextDecoder().decode(store.get('private/index.json')?.body));
    expect(index.runs).toHaveLength(5000);
    expect(index.runs[0].key).toBe('runs/2026-10-18/00000.gz');
    expect(index.runs.some((r: { key: string }) => r.key.endsWith('05000.gz'))).toBe(false);
  });

  it('deletes raw batches two or more days old after storing their aggregate', async () => {
    const { env, store } = fakeEnv();
    const now = Date.UTC(2026, 9, 19, 12);
    const put = (day: string, n: number) => {
      for (let i = 0; i < n; i++) {
        const b = {
          v: 1,
          g: 'pass',
          s: `sess${i}aaaa`,
          b: {},
          vp: 'phone',
          e: [['start', 0]],
          h: `${day}T10`,
        };
        store.set(`ev/${day}/10/${i}.json`, { body: new TextEncoder().encode(JSON.stringify(b)) });
      }
    };
    put('2026-10-19', 2);
    put('2026-10-18', 2);
    put('2026-10-17', 3);
    put('2026-10-10', 1);
    put('2025-06-01', 1); // left behind by a long cron outage
    expect(await drainCleanup(env, now)).toBe(5);
    const left = [...store.keys()];
    expect(left.filter((k) => k.startsWith('ev/')).sort()).toEqual([
      'ev/2026-10-18/10/0.json',
      'ev/2026-10-18/10/1.json',
      'ev/2026-10-19/10/0.json',
      'ev/2026-10-19/10/1.json',
    ]);
    const agg = JSON.parse(new TextDecoder().decode(store.get('agg/2026-10-17.json')?.body));
    expect(agg.games.pass.sessions).toBe(3);
    expect(await cleanup(env, now)).toBe(0);
  });
});

describe('lab ledger', () => {
  it('curated.json is in step with docs/lab (run npm run lab:ledger)', () => {
    const root = resolve(import.meta.dirname, '../../../..');
    const read = (p: string) => readFileSync(resolve(root, p), 'utf8');
    const { curated, problems } = buildCurated({
      ledger: read('docs/lab/feedback-ledger.md'),
      lessons: read('docs/lab/lessons.md'),
      asks: read('docs/lab/testing-asks.md'),
    });
    expect(problems).toEqual([]);
    expect(read('apps/site/src/lab/curated.json')).toBe(`${JSON.stringify(curated, null, 1)}\n`);
  });

  it('flags untriaged rows, unknown routes and missing lessons', () => {
    const md = `## Ledger\n\n| id | date | game | kind | who | words | verdict | routes | source |\n|---|---|---|---|---|---|---|---|---|\n| F-001 | 2026-10-19 | pass | owner | owner | "x" | keep |  | a |\n| F-002 | 2026-10-19 | pass | owner | owner | "y" | keep | lesson:L9; maybe | a |\n`;
    const { problems, curated } = buildCurated({ ledger: md, lessons: '', asks: '' });
    expect(problems).toEqual([
      'F-001: not triaged (no routes)',
      'F-002: unknown route "maybe"',
      'F-002: lesson L9 is not in lessons.md',
    ]);
    expect(curated.ledger[0]?.words).toBe('x');
  });
});
