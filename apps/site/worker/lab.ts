/**
 * The site Worker. Static assets are served by Cloudflare directly; this script runs only for the lab paths
 * listed in wrangler.jsonc `assets.run_worker_first`:
 *
 *   POST /lab/api/events   regular events: anonymous, tiny, batched (sendBeacon, text/plain JSON)
 *   POST /lab/api/run      an opt-in run: the game's playtest export plus an optional note, gzip-compressed
 *   GET  /lab/data.json    public lab data: curated feedback, live game builds, event aggregates, run counts
 *
 * Storage is the private R2 bucket `hf-lab` (binding LAB). Nothing is public in R2. Privacy posture:
 * docs/lab/privacy.md. This Worker never stores or logs an IP address, user agent, cookie or location; the
 * client address is used only as an in-memory rate-limit key. Validation and aggregation: src/lab/core.ts.
 */

import {
  aggregateDay,
  allowedOrigin,
  type DayAggregate,
  dayOf,
  hourOf,
  keys,
  LIMITS,
  lastDays,
  mergeAggregates,
  parseBatch,
  parseRun,
  privacySignal,
  runId,
  type StoredBatch,
  top,
} from '../src/lab/core.ts';
import curated from '../src/lab/curated.json' with { type: 'json' };

// Minimal platform types (the subset this Worker uses), so the site needs no extra type package.
type R2Object = {
  key: string;
  size: number;
  uploaded: Date;
  customMetadata?: Record<string, string>;
};
type R2Body = R2Object & { text(): Promise<string>; json<T>(): Promise<T> };
type R2List = { objects: R2Object[]; truncated: boolean; cursor?: string };
type R2Bucket = {
  get(key: string): Promise<R2Body | null>;
  put(
    key: string,
    value: string | ArrayBuffer | Uint8Array,
    options?: { httpMetadata?: { contentType?: string }; customMetadata?: Record<string, string> },
  ): Promise<unknown>;
  delete(keys: string | string[]): Promise<void>;
  list(options?: {
    prefix?: string;
    cursor?: string;
    limit?: number;
    include?: 'customMetadata'[];
  }): Promise<R2List>;
};
type RateLimit = { limit(options: { key: string }): Promise<{ success: boolean }> };
type Fetcher = { fetch(input: Request | string): Promise<Response> };
type Ctx = { waitUntil(p: Promise<unknown>): void };
export type Env = {
  LAB: R2Bucket;
  EVENTS_LIMIT: RateLimit;
  RUNS_LIMIT: RateLimit;
  /** one shared key: a ceiling on all event batches together, whatever their source */
  EVENTS_ALL: RateLimit;
  ASSETS: Fetcher;
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Cache-Control': 'no-store',
};

function cors(origin: string | null): Record<string, string> {
  if (!origin || !allowedOrigin(origin)) return { Vary: 'Origin' };
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function reply(status: number, body: unknown, origin: string | null, extra: Record<string, string> = {}) {
  return new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: {
      ...SECURITY_HEADERS,
      ...cors(origin),
      ...(body === null ? {} : { 'Content-Type': 'application/json; charset=utf-8' }),
      ...extra,
    },
  });
}

/** Reads at most `max` bytes of a body stream; returns null when it is longer. */
async function readCapped(
  stream: ReadableStream<Uint8Array> | null,
  max: number,
): Promise<Uint8Array<ArrayBuffer> | null> {
  if (!stream) return new Uint8Array(0);
  const reader = stream.getReader();
  const parts: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      await reader.cancel();
      return null;
    }
    parts.push(value);
  }
  const out = new Uint8Array(total);
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.byteLength;
  }
  return out;
}

const randomHex = (bytes: number) =>
  [...crypto.getRandomValues(new Uint8Array(bytes))].map((b) => b.toString(16).padStart(2, '0')).join('');

/** In-memory rate-limit key: the client address, used for the check and then discarded. */
const limitKey = (req: Request, route: string) =>
  `${route}:${req.headers.get('CF-Connecting-IP') ?? 'unknown'}`;

async function postEvents(req: Request, env: Env, origin: string | null): Promise<Response> {
  if (privacySignal(req.headers)) return reply(204, null, origin);
  if (!(await env.EVENTS_LIMIT.limit({ key: limitKey(req, 'ev') })).success) return reply(429, null, origin);
  if (!(await env.EVENTS_ALL.limit({ key: 'all' })).success) return reply(429, null, origin);
  const bytes = await readCapped(req.body, LIMITS.batchBytes);
  if (!bytes) return reply(413, { error: 'too large' }, origin);
  const parsed = parseBatch(new TextDecoder().decode(bytes));
  if (!parsed.ok) return reply(400, { error: parsed.error }, origin);
  const hour = hourOf(Date.now());
  const stored: StoredBatch = { ...parsed.batch, h: hour };
  await env.LAB.put(keys.batch(hour, randomHex(8)), JSON.stringify(stored), {
    httpMetadata: { contentType: 'application/json' },
  });
  return reply(204, null, origin);
}

/** At most this many runs are stored per UTC day, from everyone together. */
// A soft daily ceiling: list-then-put is not atomic, so a few uploads at the same moment can pass it
// (RUNS_LIMIT keeps that to a handful). A strict counter would need a Durable Object, which the lab avoids.
const RUNS_PER_DAY = 200;

async function postRun(req: Request, env: Env, origin: string | null, ctx: Ctx): Promise<Response> {
  if (!(await env.RUNS_LIMIT.limit({ key: limitKey(req, 'run') })).success) {
    return reply(429, { error: 'Too many runs at once. Try again in a minute.' }, origin);
  }
  const today = await env.LAB.list({ prefix: `runs/${dayOf(Date.now())}/`, limit: RUNS_PER_DAY });
  if (today.objects.length >= RUNS_PER_DAY) {
    return reply(503, { error: 'The notebook is full for today. Try again tomorrow.' }, origin);
  }
  const declared = Number(req.headers.get('Content-Length') ?? '0');
  if (declared > LIMITS.runBytes) return reply(413, { error: 'This run is too large to send.' }, origin);
  const gz = await readCapped(req.body, LIMITS.runBytes);
  if (!gz) return reply(413, { error: 'This run is too large to send.' }, origin);
  let text: string;
  try {
    const inflated = await readCapped(
      new Blob([gz]).stream().pipeThrough(new DecompressionStream('gzip')),
      LIMITS.runInflatedBytes,
    );
    if (!inflated) return reply(413, { error: 'This run is too large to send.' }, origin);
    text = new TextDecoder('utf-8', { fatal: true }).decode(inflated);
  } catch {
    return reply(400, { error: 'The run did not arrive as gzip-compressed text.' }, origin);
  }
  const parsed = parseRun(text);
  if (!parsed.ok) return reply(400, { error: parsed.error }, origin);
  const now = Date.now();
  const id = runId(crypto.getRandomValues(new Uint8Array(10)));
  const meta: Record<string, string> = {
    id,
    game: parsed.run.game,
    hour: hourOf(now),
    note: parsed.run.note ? String(parsed.run.note.length) : '0',
    bytes: String(gz.byteLength),
  };
  if (parsed.run.who) meta.who = parsed.run.who;
  if (parsed.run.build?.c) meta.commit = parsed.run.build.c;
  // The stored body is the validated envelope, re-compressed: unknown top-level fields are dropped.
  const stored = await new Response(
    new Blob([JSON.stringify(parsed.run)]).stream().pipeThrough(new CompressionStream('gzip')),
  ).arrayBuffer();
  await env.LAB.put(keys.run(dayOf(now), id), stored, {
    httpMetadata: { contentType: 'application/gzip' },
    customMetadata: meta,
  });
  // The run is stored: answer now, and add it to the private index after the response. Two uploads at
  // the same moment can drop one entry from the index (not the run); the daily cron rebuilds it in full.
  ctx.waitUntil(
    addToRunIndex(env, { key: keys.run(dayOf(now), id), size: stored.byteLength, ...meta }).catch(() => {}),
  );
  return reply(200, { ok: true, id }, origin);
}

type RunMeta = { key: string; size: number } & Record<string, string | number>;

async function listAll(env: Env, prefix: string, cap: number, withMeta = false): Promise<R2Object[]> {
  const out: R2Object[] = [];
  let cursor: string | undefined;
  do {
    const page = await env.LAB.list({
      prefix,
      cursor,
      limit: 1000,
      ...(withMeta ? { include: ['customMetadata' as const] } : {}),
    });
    out.push(...page.objects);
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor && out.length < cap);
  return out.slice(0, cap);
}

const INDEX_SIZE = 5000;

async function writeRunIndex(env: Env, index: RunMeta[]): Promise<void> {
  await env.LAB.put(keys.runIndex, JSON.stringify({ v: 1, runs: index.slice(0, INDEX_SIZE) }), {
    httpMetadata: { contentType: 'application/json' },
  });
}

/** After an upload: put the new run first in the private index, without listing the bucket. */
async function addToRunIndex(env: Env, entry: RunMeta): Promise<void> {
  const body = await env.LAB.get(keys.runIndex);
  const old = body ? ((await body.json<{ runs?: RunMeta[] }>()).runs ?? []) : [];
  await writeRunIndex(env, [entry, ...old.filter((r) => r.key !== entry.key)]);
}

/**
 * The private run index the owner's local script reads (wrangler cannot list a bucket): the newest 5000.
 * Keys list in ascending day order, so the walk keeps only the newest INDEX_SIZE it has seen.
 */
async function rebuildRunIndex(env: Env): Promise<RunMeta[]> {
  let newest: R2Object[] = [];
  let cursor: string | undefined;
  do {
    const page = await env.LAB.list({ prefix: 'runs/', cursor, limit: 1000, include: ['customMetadata'] });
    newest = [...newest, ...page.objects].slice(-INDEX_SIZE);
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  const index: RunMeta[] = newest
    .sort(
      (a, b) =>
        b.key.slice(0, 15).localeCompare(a.key.slice(0, 15)) ||
        String(b.customMetadata?.hour ?? '').localeCompare(String(a.customMetadata?.hour ?? '')),
    )
    .map((o) => ({ key: o.key, size: o.size, ...(o.customMetadata ?? {}) }));
  await writeRunIndex(env, index);
  return index;
}

/** Raw event batches older than this many days are deleted once their day aggregate exists. */
const RAW_DAYS = 2;
/** At most this many raw batches are read per day; a capped day is marked `sampled`. */
const DAY_CAP = 600;

/** The aggregate for one day: stored once the day is over, computed from raw batches for recent days. */
async function dayAggregate(
  env: Env,
  day: string,
  today: string,
): Promise<DayAggregate & { sampled?: boolean }> {
  if (day !== today) {
    const stored = await env.LAB.get(keys.dayAggregate(day));
    if (stored) return stored.json<DayAggregate>();
  }
  const objects = await listAll(env, keys.dayPrefix(day), DAY_CAP + 1);
  const sampled = objects.length > DAY_CAP;
  const batches: StoredBatch[] = [];
  for (const o of objects.slice(0, DAY_CAP)) {
    const body = await env.LAB.get(o.key);
    if (body) batches.push(await body.json<StoredBatch>());
  }
  const agg = { ...aggregateDay(day, batches), ...(sampled ? { sampled } : {}) };
  if (day !== today) {
    await env.LAB.put(keys.dayAggregate(day), JSON.stringify(agg), {
      httpMetadata: { contentType: 'application/json' },
    });
  }
  return agg;
}

/**
 * Retention: take the oldest day that still has raw event batches; if it is at least RAW_DAYS old, make
 * sure its aggregate is stored, then delete every raw batch of that day (sampled days included). Repeat
 * until the oldest remaining day is recent, so a long cron outage is caught up. Runs daily from the cron.
 */
export async function cleanup(env: Env, now: number): Promise<number> {
  const today = dayOf(now);
  let deleted = 0;
  for (let days = 0; days < 400; days++) {
    const first = await env.LAB.list({ prefix: 'ev/', limit: 1 });
    const day = first.objects[0]?.key.split('/')[1];
    if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day)) break;
    if ((Date.parse(today) - Date.parse(day)) / 86_400_000 < RAW_DAYS) break;
    await dayAggregate(env, day, today);
    for (let round = 0; round < 100; round++) {
      const page = await env.LAB.list({ prefix: keys.dayPrefix(day), limit: 1000 });
      if (!page.objects.length) break;
      await env.LAB.delete(page.objects.map((o) => o.key));
      deleted += page.objects.length;
    }
  }
  return deleted;
}

type Live = { commit?: string; framework?: string; app?: string; dirty?: boolean } | null;

async function liveRelease(env: Env, href: string): Promise<Live> {
  try {
    const res = href.startsWith('http')
      ? await fetch(new URL('/release.json', href).toString(), { cf: { cacheTtl: 300 } } as RequestInit)
      : await env.ASSETS.fetch('https://human.adamwhite.work/release.json');
    if (!res.ok) return null;
    const r = (await res.json()) as Record<string, unknown>;
    return {
      commit: typeof r.commit === 'string' ? r.commit.slice(0, 12) : undefined,
      framework: typeof r.framework === 'string' ? r.framework : undefined,
      app: typeof r.app === 'string' ? r.app : undefined,
      dirty: typeof r.dirty === 'boolean' ? r.dirty : undefined,
    };
  } catch {
    return null;
  }
}

const WINDOW_DAYS = 7;
let cached: { at: number; body: string } | undefined;
let building: Promise<string> | undefined;

async function buildData(env: Env): Promise<string> {
  const now = Date.now();
  const today = dayOf(now);
  const days = lastDays(now, WINDOW_DAYS);
  const aggs = [];
  for (const d of days) aggs.push(await dayAggregate(env, d, today));
  const events = mergeAggregates(aggs);
  const since = days[0] ?? today;
  const runsByGame: Record<string, number> = Object.create(null);
  for (const d of days) {
    for (const r of await listAll(env, `runs/${d}/`, 1000, true)) {
      const game = r.customMetadata?.game;
      if (game) runsByGame[game] = (runsByGame[game] ?? 0) + 1;
    }
  }
  const lives = await Promise.all(curated.games.map((g) => liveRelease(env, g.href)));
  const games = curated.games.map((g, i) => {
    const e = events[g.id];
    return {
      ...g,
      live: lives[i] ?? null,
      telemetry: e
        ? {
            sessions: e.sessions,
            ended: e.ended,
            minutes: e.minutes,
            milestones: top(e.milestones, 12),
            quits: top(e.quits, 6),
            errors: top(e.errors, 6),
            viewports: e.viewports,
            builds: top(e.builds, 4),
          }
        : null,
      runs: runsByGame[g.id] ?? 0,
    };
  });
  return JSON.stringify({
    v: 1,
    about:
      'Human Framework game lab. Public aggregates and triaged quotes only; raw runs and notes are private. Privacy: https://human.adamwhite.work/lab/privacy/',
    generated: new Date(now).toISOString().slice(0, 16),
    window: { days: WINDOW_DAYS, from: since, to: today, sampled: aggs.some((a) => 'sampled' in a) },
    curatedAt: curated.generated,
    games,
    lessons: curated.lessons,
    asks: curated.asks,
    ledger: curated.ledger,
    hfRequests: curated.hfRequests,
    totals: {
      sessions: Object.values(events).reduce((n, g) => n + g.sessions, 0),
      runs: Object.values(runsByGame).reduce((n, r) => n + r, 0),
      feedback: curated.ledger.length,
    },
  });
}

/**
 * data.json is rebuilt at most every five minutes per Worker instance, by one request at a time; others get
 * the previous copy meanwhile, or wait for the one rebuild in flight.
 */
async function getData(env: Env, ctx: Ctx): Promise<Response> {
  if (!cached || Date.now() - cached.at > 5 * 60_000) {
    building ??= buildData(env).finally(() => {
      building = undefined;
    });
    if (cached) {
      // Serve the previous copy now; keep the instance alive until the rebuild has finished.
      ctx.waitUntil(
        building.then(
          (body) => {
            cached = { at: Date.now(), body };
          },
          () => {},
        ),
      );
    } else {
      cached = { at: Date.now(), body: await building };
    }
  }
  return new Response(cached.body, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
      'Access-Control-Allow-Origin': '*',
      'Cross-Origin-Resource-Policy': 'cross-origin',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export default {
  async fetch(req: Request, env: Env, ctx: Ctx): Promise<Response> {
    const url = new URL(req.url);
    const origin = req.headers.get('Origin');
    if (url.pathname === '/lab/data.json') {
      if (req.method !== 'GET' && req.method !== 'HEAD') return reply(405, null, null, { Allow: 'GET' });
      try {
        return await getData(env, ctx);
      } catch {
        return reply(503, { error: 'lab data unavailable' }, null);
      }
    }
    if (url.pathname === '/lab/api/events' || url.pathname === '/lab/api/run') {
      if (!allowedOrigin(origin)) return reply(403, { error: 'origin not allowed' }, null);
      if (req.method === 'OPTIONS') return reply(204, null, origin);
      if (req.method !== 'POST') return reply(405, null, origin, { Allow: 'POST, OPTIONS' });
      try {
        return url.pathname === '/lab/api/events'
          ? await postEvents(req, env, origin)
          : await postRun(req, env, origin, ctx);
      } catch {
        return reply(500, { error: 'The notebook could not store this.' }, origin);
      }
    }
    return env.ASSETS.fetch(req);
  },

  /** Daily: store yesterday's aggregates and delete old raw event batches, even when nobody opens the lab. */
  async scheduled(_event: unknown, env: Env, ctx: Ctx): Promise<void> {
    const now = Date.now();
    const today = dayOf(now);
    ctx.waitUntil(
      (async () => {
        for (const d of lastDays(now, WINDOW_DAYS)) if (d !== today) await dayAggregate(env, d, today);
        await cleanup(env, now);
        await rebuildRunIndex(env);
      })(),
    );
  },
};
