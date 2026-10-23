/**
 * The site Worker. Static assets are served by Cloudflare directly; this script runs only for the lab paths
 * listed in wrangler.jsonc `assets.run_worker_first`:
 *
 *   POST /lab/api/linked   linked private records, gzip, explicit stable random player/session/run IDs
 *   POST /lab/api/events   regular events: anonymous, tiny, batched (sendBeacon, text/plain JSON)
 *   POST /lab/api/run      an opt-in run: the game's playtest export plus an optional note, gzip-compressed
 *   GET  /lab/data.json    public lab data: curated feedback, live game builds, event aggregates, run counts
 *
 * Storage is the private R2 bucket `hf-lab` (binding LAB). Nothing is public in R2. Privacy posture:
 * apps/site/lab/privacy/index.html. This Worker never stores or logs an IP address, user agent, cookie or location; the
 * client address is used only as an in-memory rate-limit key. Validation and aggregation: src/lab/core.ts.
 */

import {
  allowedOrigin,
  type DayAggregate,
  type DaySnapshot,
  dayAccumulator,
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
import { declaredLabel, LAB_GAMES } from '../src/lab/games.ts';
import {
  LINKED_LIMITS,
  type LinkedEnvelope,
  type LinkedMeta,
  linkedIndexKey,
  linkedKey,
  parseLinked,
} from '../src/lab/linked.ts';
import { translate } from './translate.ts';

// Minimal platform types (the subset this Worker uses), so the site needs no extra type package.
type R2Object = {
  key: string;
  size: number;
  etag: string;
  uploaded: Date;
  customMetadata?: Record<string, string>;
};
type R2Body = R2Object & { text(): Promise<string>; json<T>(): Promise<T> };
type R2List = { objects: R2Object[]; truncated: boolean; cursor?: string; delimitedPrefixes?: string[] };
type R2Bucket = {
  get(key: string): Promise<R2Body | null>;
  put(
    key: string,
    value: string | ArrayBuffer | Uint8Array,
    options?: {
      httpMetadata?: { contentType?: string };
      customMetadata?: Record<string, string>;
      onlyIf?: { etagMatches?: string; etagDoesNotMatch?: string };
    },
  ): Promise<R2Object | null>;
  delete(keys: string | string[]): Promise<void>;
  list(options?: {
    prefix?: string;
    delimiter?: string;
    cursor?: string;
    limit?: number;
    include?: 'customMetadata'[];
  }): Promise<R2List>;
};
type RateLimit = { limit(options: { key: string }): Promise<{ success: boolean }> };
type Fetcher = { fetch(input: Request | string): Promise<Response> };
type Ctx = { waitUntil(p: Promise<unknown>): void };
export type Env = {
  AI?: { run(model: string, input: unknown): Promise<unknown> };
  LAB: R2Bucket;
  EVENTS_LIMIT: RateLimit;
  RUNS_LIMIT: RateLimit;
  /** one shared key: a ceiling on all event batches together, whatever their source */
  EVENTS_ALL: RateLimit;
  /** Shared ingress protection per location; not a global or atomic daily ceiling. */
  RUNS_ALL: RateLimit;
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

/** Address only lives in the rate limiter. IPv6 addresses in one /64 share a key. */
function addressKey(ip: string): string {
  if (!ip.includes(':')) return ip;
  try {
    // WHATWG URL normalizes IPv6 spellings and IPv4-mapped addresses.
    const canonical = new URL(`http://[${ip}]/`).hostname.slice(1, -1);
    const [left = '', right = ''] = canonical.split('::');
    const head = left ? left.split(':') : [];
    const tail = right ? right.split(':') : [];
    const groups = canonical.includes('::')
      ? [...head, ...Array<string>(8 - head.length - tail.length).fill('0'), ...tail]
      : head;
    return `${groups
      .slice(0, 4)
      .map((x) => x.padStart(4, '0'))
      .join(':')}::/64`;
  } catch {
    return 'unknown';
  }
}
const limitKey = (req: Request, route: string) =>
  `${route}:${addressKey(req.headers.get('CF-Connecting-IP') ?? 'unknown')}`;

async function postEvents(req: Request, env: Env, origin: string | null): Promise<Response> {
  if (!(await env.EVENTS_LIMIT.limit({ key: limitKey(req, 'ev') })).success) return reply(429, null, origin);
  if (!(await env.EVENTS_ALL.limit({ key: 'all' })).success) return reply(429, null, origin);
  const bytes = await readCapped(req.body, LIMITS.batchBytes);
  if (!bytes) return reply(413, { error: 'too large' }, origin);
  const parsed = parseBatch(new TextDecoder().decode(bytes));
  if (!parsed.ok) return reply(400, { error: parsed.error }, origin);
  if (privacySignal(req.headers) && !parsed.batch.privacyOverride) return reply(204, null, origin);
  const hour = hourOf(Date.now());
  if (
    !(await reserveCapacity(
      env,
      `private/event-capacity/${hour.slice(0, 10)}.json`,
      keys.dayPrefix(hour.slice(0, 10)),
      EVENT_BATCHES_PER_DAY,
    ))
  ) {
    return reply(503, { error: 'Event capacity is full or busy for today.' }, origin);
  }
  const stored: StoredBatch = { ...parsed.batch, h: hour };
  await env.LAB.put(keys.batch(hour, randomHex(8)), JSON.stringify(stored), {
    httpMetadata: { contentType: 'application/json' },
  });
  return reply(204, null, origin);
}

/** At most 200 successful reservations per UTC day. Failed stores consume their reservation.
 * R2 conditional writes serialize this small counter without a database or Durable Object.
 * Existing pre-counter runs seed the first counter; admissions under an older deployment are outside it.
 */
const RUNS_PER_DAY = 200;
async function reserveCapacity(env: Env, key: string, prefix: string, max: number): Promise<boolean> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const current = await env.LAB.get(key);
    let used = current ? (await current.json<{ used: number }>()).used : 0;
    if (!current) {
      // Legacy admission seeding is bounded too; ambiguity fails closed, not above the cap.
      let cursor: string | undefined;
      for (let pageNo = 0; pageNo < 2; pageNo++) {
        const page = await env.LAB.list({ prefix, cursor, limit: 1000 });
        used += page.objects.length;
        cursor = page.truncated ? page.cursor : undefined;
        if (!cursor || used >= max) break;
      }
      if (cursor) return false;
    }
    if (!Number.isInteger(used) || used < 0 || used >= max) return false;
    const saved = await env.LAB.put(key, JSON.stringify({ used: used + 1 }), {
      onlyIf: current ? { etagMatches: current.etag } : { etagDoesNotMatch: '*' },
      httpMetadata: { contentType: 'application/json' },
    });
    if (saved) return true;
  }
  return false;
}

async function postRun(req: Request, env: Env, origin: string | null, ctx: Ctx): Promise<Response> {
  if (!(await env.RUNS_LIMIT.limit({ key: limitKey(req, 'run') })).success) {
    return reply(429, { error: 'Too many runs at once. Try again in a minute.' }, origin);
  }
  if (!(await env.RUNS_ALL.limit({ key: 'all' })).success)
    return reply(429, { error: 'Too many runs at once. Try again in a minute.' }, origin);
  const capacity = await env.LAB.get(`private/capacity/${dayOf(Date.now())}.json`);
  if (capacity && (await capacity.json<{ used: number }>()).used >= RUNS_PER_DAY) {
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
  if (
    !(await reserveCapacity(env, `private/capacity/${dayOf(now)}.json`, `runs/${dayOf(now)}/`, RUNS_PER_DAY))
  )
    return reply(503, { error: 'The notebook is full or busy. Try again later.' }, origin);
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
  // Legacy run uploads have a separate 8 MiB/day ceiling. Together with linked records,
  // retained compressed payloads admit at most 40 MiB/day before the 180-day lifecycle.
  if (
    !(await reserveLinked(
      env,
      dayOf(now),
      keys.run(dayOf(now), id),
      stored.byteLength,
      'private/run-byte-capacity',
      8 * 1024 * 1024,
    ))
  )
    return reply(503, { error: 'The notebook byte budget is full or busy today.' }, origin);
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

/** Receipt-day budget: CAS serializes admissions, retries of one key spend no additional budget.
 * Failed writes consume reservations. Counters never contain payloads or request headers.
 */
async function reserveLinked(
  env: Env,
  day: string,
  key: string,
  size: number,
  prefix = 'private/linked-capacity',
  maxBytes: number = LINKED_LIMITS.dailyBytes,
): Promise<boolean> {
  const path = `${prefix}/${day}.json`;
  for (let attempt = 0; attempt < 8; attempt++) {
    const body = await env.LAB.get(path);
    const state = body
      ? await body.json<{ bytes: number; records: Record<string, number> }>()
      : { bytes: 0, records: {} };
    if (
      !Number.isSafeInteger(state.bytes) ||
      state.bytes < 0 ||
      !state.records ||
      typeof state.records !== 'object'
    )
      return false;
    if (Object.hasOwn(state.records, key)) return state.records[key] === size;
    if (Object.keys(state.records).length >= LINKED_LIMITS.dailyObjects || state.bytes + size > maxBytes)
      return false;
    const saved = await env.LAB.put(
      path,
      JSON.stringify({ bytes: state.bytes + size, records: { ...state.records, [key]: size } }),
      {
        onlyIf: body ? { etagMatches: body.etag } : { etagDoesNotMatch: '*' },
        httpMetadata: { contentType: 'application/json' },
      },
    );
    if (saved) return true;
  }
  return false;
}

async function indexLinked(env: Env, day: string, entry: LinkedMeta): Promise<boolean> {
  const key = linkedIndexKey(day);
  for (let attempt = 0; attempt < 8; attempt++) {
    const body = await env.LAB.get(key);
    const old = body ? (await body.json<{ records: LinkedMeta[] }>()).records : [];
    if (old.some((r) => r.key === entry.key)) return true;
    if (old.length >= LINKED_LIMITS.dailyObjects) return false;
    const saved = await env.LAB.put(key, JSON.stringify({ v: 2, records: [...old, entry] }), {
      onlyIf: body ? { etagMatches: body.etag } : { etagDoesNotMatch: '*' },
      httpMetadata: { contentType: 'application/json' },
    });
    if (saved) return true;
  }
  return false;
}

/** CAS unions actual receipt days so the inbox never tries empty calendar manifests. */
async function linkedDirectory(env: Env, now: number, day?: string): Promise<void> {
  const key = 'private/linked-index.json';
  for (let attempt = 0; attempt < 8; attempt++) {
    const body = await env.LAB.get(key);
    const old = body ? (await body.json<{ days: string[] }>()).days : [];
    const oldest = dayOf(now - 180 * 86400000);
    const days = [...new Set([...old, ...(day ? [day] : [])])]
      .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d) && d >= oldest)
      .sort();
    if (
      await env.LAB.put(key, JSON.stringify({ v: 2, days }), {
        onlyIf: body ? { etagMatches: body.etag } : { etagDoesNotMatch: '*' },
        httpMetadata: { contentType: 'application/json' },
      })
    )
      return;
  }
  throw new Error('Linked directory is busy.');
}

async function projectLinkedEvents(env: Env, record: LinkedEnvelope, receiptDay: string): Promise<boolean> {
  if (record.kind !== 'events' || receiptDay < dayOf(Date.now() - 86400000)) return true;
  const key = keys.batch(`${receiptDay}T00`, `linked-${record.player}-${record.id}`);
  if (await env.LAB.get(key)) return true;
  if (
    !(await reserveCapacity(
      env,
      `private/event-capacity/${receiptDay}.json`,
      keys.dayPrefix(receiptDay),
      EVENT_BATCHES_PER_DAY,
    ))
  )
    return false;
  const d = record.data as { vp: 'phone' | 'tablet' | 'desktop'; e: StoredBatch['e'] };
  const batch: StoredBatch = {
    v: 1,
    g: record.game,
    s: record.session,
    b: record.build,
    vp: d.vp,
    e: d.e,
    h: `${receiptDay}T00`,
  };
  await env.LAB.put(key, JSON.stringify(batch), {
    onlyIf: { etagDoesNotMatch: '*' },
    httpMetadata: { contentType: 'application/json' },
  });
  return true;
}

/** One expired receipt-day per cron, at most 1000 data deletions. The reservation counter
 * is the durable deletion manifest, including stores interrupted before their index update.
 */
export async function cleanupLinked(env: Env, now: number): Promise<void> {
  const oldest = await env.LAB.list({ prefix: 'private/linked-capacity/', limit: 1 });
  const first = oldest.objects[0];
  if (!first) return;
  const day = first.key.slice('private/linked-capacity/'.length, -5);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || day >= dayOf(now - LINKED_LIMITS.retentionDays * 86400000)) return;
  const body = await env.LAB.get(first.key);
  if (!body) return;
  const state = await body.json<{ bytes: number; records: Record<string, number> }>();
  const entries = Object.entries(state.records);
  const removed = entries.slice(0, 1000);
  if (removed.length) await env.LAB.delete(removed.map(([key]) => key));
  if (entries.length > removed.length) {
    await env.LAB.put(
      first.key,
      JSON.stringify({ bytes: state.bytes, records: Object.fromEntries(entries.slice(1000)) }),
      { onlyIf: { etagMatches: body.etag } },
    );
  } else {
    await env.LAB.delete(linkedIndexKey(day));
    await env.LAB.delete(first.key);
  }
}

async function postLinked(req: Request, env: Env, origin: string | null): Promise<Response> {
  if (
    !(await env.EVENTS_LIMIT.limit({ key: limitKey(req, 'linked') })).success ||
    !(await env.EVENTS_ALL.limit({ key: 'linked' })).success
  )
    return reply(429, null, origin);
  if (Number(req.headers.get('Content-Length') ?? 0) > LINKED_LIMITS.compressed)
    return reply(413, null, origin);
  const bytes = await readCapped(req.body, LINKED_LIMITS.compressed);
  if (!bytes) return reply(413, null, origin);
  let text: string;
  try {
    const inflated = await readCapped(
      new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')),
      LINKED_LIMITS.inflated,
    );
    if (!inflated) return reply(413, null, origin);
    text = new TextDecoder('utf-8', { fatal: true }).decode(inflated);
  } catch {
    return reply(400, { error: 'Expected gzip-compressed JSON.' }, origin);
  }
  const now = Date.now();
  const parsed = parseLinked(text, now);
  if (!parsed.ok) return reply(400, { error: parsed.error }, origin);
  const record = parsed.record;
  if (privacySignal(req.headers) && !record.privacyOverride) return reply(204, null, origin);
  const key = linkedKey(record);
  const canonical = JSON.stringify(record);
  // Content IDs survive a reload; timestamp changes alone must not duplicate a snapshot.
  const { at: _at, ...identity } = record;
  const digest = [
    ...new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(identity))),
    ),
  ]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  let object: R2Object | null = await env.LAB.get(key);
  if (!object) {
    const stored = await new Response(
      new Blob([canonical]).stream().pipeThrough(new CompressionStream('gzip')),
    ).arrayBuffer();
    const day = dayOf(now);
    if (!(await reserveLinked(env, day, key, stored.byteLength)))
      return reply(503, { error: 'Linked storage is full or busy today.' }, origin);
    const result = await env.LAB.put(key, stored, {
      onlyIf: { etagDoesNotMatch: '*' },
      httpMetadata: { contentType: 'application/gzip' },
      customMetadata: {
        digest,
        indexDay: day,
        id: record.id,
        player: record.player,
        session: record.session,
        runId: record.runId,
        game: record.game,
        kind: record.kind,
        at: String(record.at),
      },
    });
    object = result ?? (await env.LAB.get(key));
  }
  if (!object || object.customMetadata?.digest !== digest)
    return reply(409, { error: 'Record ID already has different content.' }, origin);
  const indexDay = object.customMetadata.indexDay;
  if (!indexDay || !/^\d{4}-\d{2}-\d{2}$/.test(indexDay)) return reply(503, null, origin);
  const { data: _data, v: _v, privacyOverride: _override, ...fields } = record;
  if (
    !(await indexLinked(env, indexDay, {
      ...fields,
      at: Number(object.customMetadata.at),
      key,
      size: object.size,
    }))
  )
    return reply(503, { error: 'Linked index is busy. Retry this record.' }, origin);
  await linkedDirectory(env, now, indexDay);
  if (!(await projectLinkedEvents(env, record, indexDay)))
    return reply(503, { error: 'Event storage is full or busy today.' }, origin);
  return reply(200, { ok: true, id: record.id }, origin);
}

type RunMeta = { key: string; size: number } & Record<string, string | number>;

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
 * Each page is merged by its R2 upload timestamp before retaining the newest INDEX_SIZE.
 */
async function rebuildRunIndex(env: Env): Promise<void> {
  const key = 'private/index-progress.json';
  const body = await env.LAB.get(key);
  const state = body
    ? await body.json<{ cursor?: string; newest: (RunMeta & { uploaded: number })[]; complete?: boolean }>()
    : { newest: [] };
  if (state.complete) {
    state.newest = [];
    state.cursor = undefined;
  }
  const page = await env.LAB.list({
    prefix: 'runs/',
    cursor: state.cursor,
    limit: 1000,
    include: ['customMetadata'],
  });
  const newest = [
    ...state.newest,
    ...page.objects.map((o) => ({
      key: o.key,
      size: o.size,
      ...(o.customMetadata ?? {}),
      uploaded: o.uploaded.getTime(),
    })),
  ]
    .sort((a, b) => b.uploaded - a.uploaded || a.key.localeCompare(b.key))
    .slice(0, INDEX_SIZE);
  const saved = await env.LAB.put(
    key,
    JSON.stringify({ newest, ...(page.truncated ? { cursor: page.cursor } : {}), complete: !page.truncated }),
    {
      onlyIf: body ? { etagMatches: body.etag } : { etagDoesNotMatch: '*' },
    },
  );
  if (!saved) return;
  if (!page.truncated) {
    await writeRunIndex(
      env,
      newest.map(({ uploaded: _uploaded, ...entry }) => entry),
    );
    // Keep a complete checkpoint until the next invocation so concurrent writers cannot recreate from an old page.
  }
}

/** Grace period before reads can be finalized: all old-deployment requests have finished by then. */
const RAW_DAYS = 2;
/** Accepted batches and retained session checkpoints stay bounded; capacity exceeds normal small-lab traffic. */
const EVENT_BATCHES_PER_DAY = 1000;
const RAW_READS_PER_CRON = 24;

type PreviewBudget = { left: number };
type Aggregate = DayAggregate & { sampled?: boolean; finalized?: boolean };

/** Request-only preview: at most ten raw GETs across the whole window; never writes a final aggregate. */
async function dayAggregate(
  env: Env,
  day: string,
  budget: PreviewBudget,
  deadline: number,
): Promise<Aggregate> {
  if (Date.now() >= deadline) throw new Error('lab rebuild timed out');
  const stored = await env.LAB.get(keys.dayAggregate(day));
  const previous = stored ? await stored.json<Aggregate>() : null;
  if (previous?.finalized) return previous;
  const page = await env.LAB.list({ prefix: keys.dayPrefix(day), limit: Math.max(1, budget.left) });
  if (!page.objects.length && previous) return previous;
  const acc = dayAccumulator(day);
  const objects = page.objects.slice(0, budget.left);
  budget.left -= objects.length;
  const bodies = await Promise.all(
    objects.map(async (o) => {
      const b = await env.LAB.get(o.key);
      return b ? b.json<StoredBatch>() : null;
    }),
  );
  for (const b of bodies) if (b) acc.add(b);
  return {
    ...acc.finish(),
    ...(page.truncated || objects.length < page.objects.length ? { sampled: true } : {}),
  };
}

type Progress = { done?: boolean; cursor?: string; complete?: boolean; snapshot: DaySnapshot };
const scanKey = 'private/cleanup-scan.json';
/**
 * Each invocation advances one day by at most 24 batches. Checkpoints retain session IDs privately until
 * the complete aggregate and all raw deletions finish. CAS prevents duplicate consumption by cron races.
 * Legacy days above the admission bound remain raw, are marked deferred, and do not block later days.
 */
export async function cleanup(env: Env, now: number): Promise<number> {
  const scan = await env.LAB.get(scanKey);
  const position = scan ? await scan.json<{ cursor?: string; after?: string }>() : {};
  const days = await env.LAB.list({ prefix: 'ev/', delimiter: '/', cursor: position.cursor, limit: 1000 });
  const prefix = days.delimitedPrefixes?.find((p) => !position.after || p > position.after);
  const advance = async () => {
    await env.LAB.put(scanKey, JSON.stringify({ cursor: position.cursor, after: prefix }));
  };
  if (!prefix) {
    await env.LAB.put(scanKey, JSON.stringify(days.truncated ? { cursor: days.cursor } : {}));
    return 0;
  }
  const day = prefix.split('/')[1];
  if (!day || (Date.parse(dayOf(now)) - Date.parse(day)) / 86_400_000 < RAW_DAYS) {
    await env.LAB.put(scanKey, '{}');
    return 0;
  }
  if (await env.LAB.get(`private/deferred/${day}.json`)) {
    await advance();
    return 0;
  }
  const aggregateBody = await env.LAB.get(keys.dayAggregate(day));
  const aggregate = aggregateBody ? await aggregateBody.json<Aggregate>() : null;
  const progressKey = `private/aggregation/${day}.json`;
  if (!aggregate?.finalized) {
    const body = await env.LAB.get(progressKey);
    const progress: Progress = body
      ? await body.json<Progress>()
      : { snapshot: { batches: 0, sessions: [] } };
    if (progress.done) return 0;
    if (!progress.complete) {
      const page = await env.LAB.list({ prefix, cursor: progress.cursor, limit: RAW_READS_PER_CRON });
      if (progress.snapshot.batches + page.objects.length > EVENT_BATCHES_PER_DAY) {
        await env.LAB.put(
          `private/deferred/${day}.json`,
          JSON.stringify({
            day,
            reason: 'legacy day exceeds 1000-batch processing bound; raw data retained for offline recovery',
          }),
        );
        await env.LAB.put(progressKey, JSON.stringify({ done: true }));
        await advance();
        return 0;
      }
      const acc = dayAccumulator(day, progress.snapshot);
      for (let at = 0; at < page.objects.length; at += 6) {
        const batches = await Promise.all(
          page.objects.slice(at, at + 6).map(async (o) => {
            const b = await env.LAB.get(o.key);
            return b ? b.json<StoredBatch>() : null;
          }),
        );
        for (const b of batches) if (b) acc.add(b);
      }
      progress.snapshot = acc.snapshot();
      progress.complete = !page.truncated;
      progress.cursor = page.truncated ? page.cursor : undefined;
      const saved = await env.LAB.put(progressKey, JSON.stringify(progress), {
        onlyIf: body ? { etagMatches: body.etag } : { etagDoesNotMatch: '*' },
      });
      if (!saved || !progress.complete) return 0;
    }
    const final = { ...dayAccumulator(day, progress.snapshot).finish(), finalized: true };
    const stored = await env.LAB.put(keys.dayAggregate(day), JSON.stringify(final), {
      onlyIf: aggregateBody ? { etagMatches: aggregateBody.etag } : { etagDoesNotMatch: '*' },
      httpMetadata: { contentType: 'application/json' },
    });
    if (!stored) return 0;
  }
  // Clear session IDs before deleting any raw data. Keep the key occupied so delayed initial CAS
  // writers cannot recreate a checkpoint after the raw prefix disappears.
  await env.LAB.put(progressKey, JSON.stringify({ done: true }));
  // One bounded delete page per invocation, after the exact final aggregate is durable.
  const raw = await env.LAB.list({ prefix, limit: 1000 });
  if (raw.objects.length) await env.LAB.delete(raw.objects.map((o) => o.key));
  if (!raw.truncated) {
    await advance();
  }
  return raw.objects.length;
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

async function buildData(env: Env, deadline: number): Promise<string> {
  const now = Date.now();
  const today = dayOf(now);
  const days = lastDays(now, WINDOW_DAYS);
  const aggs = [];
  const previewBudget = { left: 10 };
  for (const d of [...days].reverse()) aggs.push(await dayAggregate(env, d, previewBudget, deadline));
  const events = mergeAggregates(aggs);
  const since = days[0] ?? today;
  const runsByGame: Record<string, number> = Object.create(null);
  let sampledRuns = false;
  for (const d of days) {
    const page = await env.LAB.list({ prefix: `runs/${d}/`, limit: 1000, include: ['customMetadata'] });
    sampledRuns ||= page.truncated;
    for (const r of page.objects) {
      const game = r.customMetadata?.game;
      if (game) runsByGame[game] = (runsByGame[game] ?? 0) + 1;
    }
  }
  const deferred = await env.LAB.list({ prefix: 'private/deferred/', limit: 1000 });
  const deferredDays = deferred.objects.map((o) => o.key.split('/').at(-1)?.replace('.json', ''));
  const lives = await Promise.all(LAB_GAMES.map((g) => liveRelease(env, g.href)));
  const games = LAB_GAMES.map((g, i) => {
    const e = events[g.id];
    return {
      ...g,
      live: lives[i] ?? null,
      telemetry: e
        ? {
            sessions: e.sessions,
            ended: e.ended,
            minutes: e.minutes,
            milestones: top(
              Object.fromEntries(
                Object.entries(e.milestones).filter(([name]) => declaredLabel(g.id, 'ms', name)),
              ),
              12,
            ),
            quits: top(
              Object.fromEntries(
                Object.entries(e.quits).filter(
                  ([name]) => name === '(no screen named)' || declaredLabel(g.id, 'scr', name),
                ),
              ),
              6,
            ),
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
    window: {
      days: WINDOW_DAYS,
      from: since,
      to: today,
      sampled: sampledRuns || deferredDays.length > 0 || aggs.some((a) => 'sampled' in a),
      deferredDays,
    },
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
    if (!building) {
      let timer: ReturnType<typeof setTimeout>;
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('lab rebuild timed out')), 20_000);
      });
      building = Promise.race([buildData(env, Date.now() + 20_000), timeout]).finally(() => {
        clearTimeout(timer);
        building = undefined;
      });
    }
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
    if (url.pathname === '/lab/api/translate') {
      if (origin !== 'https://human.adamwhite.work') return reply(403, null, null);
      if (req.method === 'OPTIONS') return reply(204, null, origin);
      if (req.method !== 'POST') return reply(405, null, origin, { Allow: 'POST, OPTIONS' });
      try {
        const bytes = await readCapped(req.body, 12_000);
        if (!bytes) return reply(413, null, origin);
        const result = await translate(JSON.parse(new TextDecoder().decode(bytes)), env);
        return reply(result.status, result.body, origin);
      } catch {
        return reply(503, { error: 'Translation unavailable. Choose from the menu.' }, origin);
      }
    }
    if (url.pathname === '/lab/data.json') {
      if (req.method !== 'GET' && req.method !== 'HEAD') return reply(405, null, null, { Allow: 'GET' });
      try {
        return await getData(env, ctx);
      } catch {
        return reply(503, { error: 'lab data unavailable' }, null);
      }
    }
    if (
      url.pathname === '/lab/api/events' ||
      url.pathname === '/lab/api/run' ||
      url.pathname === '/lab/api/linked'
    ) {
      if (!allowedOrigin(origin)) return reply(403, { error: 'origin not allowed' }, null);
      if (req.method === 'OPTIONS') return reply(204, null, origin);
      if (req.method !== 'POST') return reply(405, null, origin, { Allow: 'POST, OPTIONS' });
      try {
        if (url.pathname === '/lab/api/linked') return await postLinked(req, env, origin);
        return url.pathname === '/lab/api/events'
          ? await postEvents(req, env, origin)
          : await postRun(req, env, origin, ctx);
      } catch {
        return reply(500, { error: 'The notebook could not store this.' }, origin);
      }
    }
    return env.ASSETS.fetch(req);
  },

  /** Every ten minutes: one bounded retention step and one private-index page. */
  async scheduled(_event: unknown, env: Env, ctx: Ctx): Promise<void> {
    const now = Date.now();
    ctx.waitUntil(
      (async () => {
        await cleanup(env, now);
        await rebuildRunIndex(env);
        await linkedDirectory(env, now);
        await cleanupLinked(env, now);
      })(),
    );
  },
};
