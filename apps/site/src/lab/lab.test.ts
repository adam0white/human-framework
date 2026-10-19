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
  it('accepts a well-formed batch and drops unknown fields', () => {
    const r = parseBatch(
      batch({
        ip: '1.2.3.4',
        ua: 'x',
        e: [
          ['start', 0],
          ['ms', 1200, 'service 1 done'],
          ['scr', 1500.4, 'night 1'],
        ],
      }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(Object.keys(r.batch).sort()).toEqual(['b', 'e', 'g', 's', 'v', 'vp']);
    expect(r.batch.e[2]).toEqual(['scr', 1500, 'night 1']);
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
    expect(parseBatch(batch({ g: 'constructor' })).ok).toBe(true);
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
      ['scr', 2, 'night b2/b'],
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
  const store = new Map<string, { body: Uint8Array; meta?: Record<string, string> }>();
  const enc = new TextEncoder();
  const obj = (key: string) => {
    const o = store.get(key);
    if (!o) return null;
    const text = new TextDecoder().decode(o.body);
    return {
      key,
      size: o.body.byteLength,
      uploaded: new Date(),
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
        opts?: { customMetadata?: Record<string, string> },
      ) => {
        const body = typeof value === 'string' ? enc.encode(value) : new Uint8Array(value as ArrayBuffer);
        store.set(key, { body, meta: opts?.customMetadata });
      },
      delete: async (keys: string | string[]) => {
        for (const k of Array.isArray(keys) ? keys : [keys]) store.delete(k);
      },
      list: async ({ prefix = '' }: { prefix?: string } = {}) => ({
        objects: [...store.keys()]
          .filter((k) => k.startsWith(prefix))
          .sort()
          .flatMap((k) => obj(k) ?? []),
        truncated: false,
      }),
    },
    EVENTS_LIMIT: { limit: async () => ({ success: !limited }) },
    RUNS_LIMIT: { limit: async () => ({ success: !limited }) },
    EVENTS_ALL: { limit: async () => ({ success: true }) },
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
  afterEach(() => vi.unstubAllGlobals());

  it('stores an event batch under the hour, with CORS for the game origin', async () => {
    const { env, store } = fakeEnv();
    const res = await call(post('/lab/api/events', batch(), { 'Content-Type': 'text/plain' }), env);
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://pass.adamwhite.work');
    const keys = [...store.keys()];
    expect(keys).toHaveLength(1);
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
            ['scr', 3, 'night 1'],
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
    expect(pass?.telemetry?.quits).toEqual([['night 1', 1]]);
    expect(pass?.live).toMatchObject({ framework: '2.8.0' });
  });
});

describe('lab retention', () => {
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
    expect(await cleanup(env, now)).toBe(5);
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
