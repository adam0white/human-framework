/** Linked lab records: validated envelopes and private index entries. No platform state or headers. */
import { boundedRunJson, cleanText, parseBatch } from './core.ts';
import { LAB_GAMES } from './games.ts';

export const LINKED_LIMITS = {
  compressed: 256 * 1024,
  inflated: 512 * 1024,
  chunkBytes: 256 * 1024,
  chunks: 128,
  dailyBytes: 32 * 1024 * 1024,
  dailyObjects: 2000,
  retentionDays: 180,
} as const;

export type LinkedEnvelope = {
  v: 2;
  id: string;
  player: string;
  session: string;
  runId: string;
  game: string;
  kind: 'events' | 'run' | 'save' | 'logs' | 'note';
  at: number;
  build: { c?: string; hf?: string; a?: string };
  data: unknown;
  privacyOverride?: true;
};
export type LinkedMeta = Omit<LinkedEnvelope, 'v' | 'data' | 'privacyOverride'> & {
  key: string;
  size: number;
};
export const linkedKey = (r: LinkedEnvelope) => `linked/${r.player}/${r.id}.json.gz`;
export const linkedIndexKey = (day: string) => `private/linked-index/${day}.json`;
const HEX = /^[a-f0-9]{32}$/;
const games = new Set(LAB_GAMES.map((g) => g.id));
const kinds = new Set(['events', 'run', 'save', 'logs', 'note']);

export function parseLinked(
  text: string,
  now: number,
): { ok: true; record: LinkedEnvelope } | { ok: false; error: string } {
  const fail = (error: string) => ({ ok: false as const, error });
  if (new TextEncoder().encode(text).byteLength > LINKED_LIMITS.inflated || !boundedRunJson(text))
    return fail('Record is too large or complex.');
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return fail('not JSON');
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return fail('not an object');
  const r = raw as Record<string, unknown>;
  if (r.v !== 2) return fail('unknown version');
  for (const field of ['id', 'player', 'session', 'runId'])
    if (typeof r[field] !== 'string' || !HEX.test(r[field])) return fail(`bad ${field}`);
  if (typeof r.game !== 'string' || !games.has(r.game)) return fail('bad game');
  if (typeof r.kind !== 'string' || !kinds.has(r.kind)) return fail('bad kind');
  if (
    typeof r.at !== 'number' ||
    !Number.isSafeInteger(r.at) ||
    r.at < now - LINKED_LIMITS.retentionDays * 86400000 ||
    r.at > now + 300000
  )
    return fail('bad time');
  if (!Object.hasOwn(r, 'data')) return fail('no data');
  const b = (r.build && typeof r.build === 'object' ? r.build : {}) as Record<string, unknown>;
  const build: LinkedEnvelope['build'] = {};
  const c = cleanText(b.c, 40);
  if (c && /^[0-9a-f]{4,40}$|^none$/.test(c)) build.c = c.slice(0, 12);
  for (const field of ['hf', 'a'] as const) {
    const value = cleanText(b[field], 20);
    if (value && /^[0-9A-Za-z.+-]+$/.test(value)) build[field] = value;
  }
  let data = r.data;
  if (data && typeof data === 'object' && !Array.isArray(data) && 'encoding' in data) {
    const chunk = data as Record<string, unknown>;
    if (
      (r.kind !== 'run' && r.kind !== 'save') ||
      chunk.encoding !== 'json' ||
      typeof chunk.upload !== 'string' ||
      !HEX.test(chunk.upload) ||
      typeof chunk.total !== 'number' ||
      !Number.isInteger(chunk.total) ||
      chunk.total < 1 ||
      chunk.total > LINKED_LIMITS.chunks ||
      typeof chunk.index !== 'number' ||
      !Number.isInteger(chunk.index) ||
      chunk.index < 0 ||
      chunk.index >= chunk.total ||
      typeof chunk.text !== 'string' ||
      new TextEncoder().encode(chunk.text).byteLength > LINKED_LIMITS.chunkBytes
    )
      return fail('bad chunk');
    data = {
      encoding: 'json',
      upload: chunk.upload,
      index: chunk.index,
      total: chunk.total,
      text: chunk.text,
    };
  }
  if (r.kind === 'events') {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return fail('bad events');
    const d = data as Record<string, unknown>;
    const parsed = parseBatch(JSON.stringify({ v: 1, g: r.game, s: r.session, b: build, vp: d.vp, e: d.e }));
    if (!parsed.ok) return fail(parsed.error);
    data = {
      vp: parsed.batch.vp,
      e: parsed.batch.e,
      ...(typeof d.started === 'number' &&
      Number.isSafeInteger(d.started) &&
      d.started >= 0 &&
      d.started <= r.at
        ? { started: d.started }
        : {}),
    };
  }
  return {
    ok: true,
    record: {
      v: 2,
      id: r.id as string,
      player: r.player as string,
      session: r.session as string,
      runId: r.runId as string,
      game: r.game,
      kind: r.kind as LinkedEnvelope['kind'],
      at: r.at,
      build,
      data,
      ...(r.privacyOverride === true ? { privacyOverride: true } : {}),
    },
  };
}
