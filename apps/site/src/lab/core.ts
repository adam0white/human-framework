/**
 * Lab telemetry core: validation and aggregation as pure functions, shared by the lab Worker
 * (apps/site/worker/lab.ts) and the tests. No platform APIs here.
 *
 * Covers: the regular-event batch schema, the opt-in run envelope schema, origin and privacy-signal checks,
 * object keys coarsened to the hour, and per-game aggregates (sessions, durations, milestones, quit points,
 * errors, viewport classes). Does not cover storage, rate limits or decompression (the Worker does those).
 * Privacy posture: docs/lab/privacy.md. Nothing here reads or stores an IP address, user agent or location.
 */

export const LAB_SCHEMA = 1;

/** Event kinds: session start, milestone, screen shown, error, session end. */
export type EventKind = 'start' | 'ms' | 'scr' | 'err' | 'end';
/** One event: kind, milliseconds since the session started, optional name (milestone, screen or error). */
export type LabEvent = [EventKind, number, string?];
export type Viewport = 'phone' | 'tablet' | 'desktop';

/** A batch of regular events, as the client sends it and as it is stored (plus `h`, the hour received). */
export type EventBatch = {
  v: 1;
  /** game id, e.g. 'pass' */
  g: string;
  /** random session id, held in the tab's sessionStorage only */
  s: string;
  /** build: game commit (short), HF version, game version */
  b: { c?: string; hf?: string; a?: string };
  vp: Viewport;
  e: LabEvent[];
};
export type StoredBatch = EventBatch & { h: string };

/** An opt-in run, as the client sends it (gzip-compressed JSON). */
export type RunEnvelope = {
  v: 1;
  game: string;
  /** optional free-text note */
  note?: string;
  /** optional "who you are" label, e.g. 'owner' */
  who?: string;
  build?: { c?: string; hf?: string; a?: string };
  /** the game's own playtest export (seed, input log, state) */
  run: unknown;
};

export const LIMITS = {
  /** bytes of one event batch body */
  batchBytes: 8 * 1024,
  eventsPerBatch: 60,
  nameChars: 80,
  noteChars: 4000,
  whoChars: 40,
  /** compressed run body */
  runBytes: 2 * 1024 * 1024,
  /** decompressed run body */
  runInflatedBytes: 8 * 1024 * 1024,
  /** a session longer than this is clamped when aggregating */
  sessionMs: 12 * 3600 * 1000,
} as const;

const GAME_ID = /^[a-z][a-z0-9-]{0,31}$/;
const SESSION_ID = /^[a-z0-9]{8,32}$/;
const KINDS: ReadonlySet<string> = new Set(['start', 'ms', 'scr', 'err', 'end']);
const VIEWPORTS: ReadonlySet<string> = new Set(['phone', 'tablet', 'desktop']);

/** Origins allowed to post: https on adamwhite.work and its subdomains, and localhost for development. */
export function allowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  return (
    /^https:\/\/([a-z0-9-]+\.)*adamwhite\.work$/.test(origin) ||
    /^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d{1,5})?$/.test(origin)
  );
}

/** True when the request carries Global Privacy Control or Do Not Track: regular events are then dropped. */
export function privacySignal(headers: { get(name: string): string | null }): boolean {
  return headers.get('Sec-GPC') === '1' || headers.get('DNT') === '1';
}

/** Short text from a game: trimmed, control characters removed, URLs' query strings and fragments cut. */
export function cleanText(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const text = value
    // biome-ignore lint/suspicious/noControlCharactersInRegex: removing control characters is the point
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, ' ')
    .replace(/(https?:\/\/[^\s?#]*)[?#][^\s]*/g, '$1')
    .trim()
    .slice(0, max);
  return text || undefined;
}

function cleanBuild(value: unknown): EventBatch['b'] {
  const b = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const out: EventBatch['b'] = {};
  const c = cleanText(b.c, 40);
  const hf = cleanText(b.hf, 20);
  const a = cleanText(b.a, 20);
  if (c && /^[0-9a-f]{4,40}$|^none$/.test(c)) out.c = c.slice(0, 12);
  if (hf && /^[0-9A-Za-z.+-]+$/.test(hf)) out.hf = hf;
  if (a && /^[0-9A-Za-z.+-]+$/.test(a)) out.a = a;
  return out;
}

/**
 * A screen or milestone name the game declares: letters, digits, spaces and light punctuation only, so a
 * name cannot carry an email address, a URL or other free text. Anything else is replaced or dropped.
 */
export function label(value: unknown): string | undefined {
  const text = cleanText(value, LIMITS.nameChars);
  if (!text || /@|https?:|www\./i.test(text)) return undefined;
  const kept = text.replace(/[^\p{L}\p{N} :'’.,()/#+-]/gu, '').trim();
  return kept || undefined;
}

/** An error is kept only as its type and place, e.g. "TypeError at app-3f2a.js:12:345"; never its message. */
export function errorLabel(value: unknown): string {
  const text = typeof value === 'string' ? value.trim() : '';
  return /^[A-Za-z][A-Za-z0-9]{0,39}( at [\w.-]{1,60}:\d{1,7}:\d{1,7})?$/.test(text) ? text : 'Error';
}

/** Parses and validates an event batch. Unknown fields are dropped; a malformed batch returns an error. */
export function parseBatch(text: string): { ok: true; batch: EventBatch } | { ok: false; error: string } {
  if (text.length > LIMITS.batchBytes) return { ok: false, error: 'too large' };
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'not JSON' };
  }
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'not an object' };
  const r = raw as Record<string, unknown>;
  if (r.v !== 1) return { ok: false, error: 'unknown version' };
  if (typeof r.g !== 'string' || !GAME_ID.test(r.g)) return { ok: false, error: 'bad game' };
  if (typeof r.s !== 'string' || !SESSION_ID.test(r.s)) return { ok: false, error: 'bad session' };
  const vp = typeof r.vp === 'string' && VIEWPORTS.has(r.vp) ? (r.vp as Viewport) : 'desktop';
  if (!Array.isArray(r.e) || r.e.length === 0 || r.e.length > LIMITS.eventsPerBatch) {
    return { ok: false, error: 'bad events' };
  }
  const events: LabEvent[] = [];
  for (const item of r.e) {
    if (!Array.isArray(item)) return { ok: false, error: 'bad event' };
    const [kind, at, name] = item as unknown[];
    if (typeof kind !== 'string' || !KINDS.has(kind)) return { ok: false, error: 'bad kind' };
    if (typeof at !== 'number' || !Number.isFinite(at) || at < 0) return { ok: false, error: 'bad time' };
    const n = kind === 'err' ? errorLabel(name) : label(name);
    const t = Math.min(Math.round(at), LIMITS.sessionMs);
    events.push(n ? [kind as EventKind, t, n] : [kind as EventKind, t]);
  }
  return { ok: true, batch: { v: 1, g: r.g, s: r.s, b: cleanBuild(r.b), vp, e: events } };
}

/** Validates a decompressed run envelope. */
export function parseRun(text: string): { ok: true; run: RunEnvelope } | { ok: false; error: string } {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'not JSON' };
  }
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'not an object' };
  const r = raw as Record<string, unknown>;
  if (r.v !== 1) return { ok: false, error: 'unknown version' };
  if (typeof r.game !== 'string' || !GAME_ID.test(r.game)) return { ok: false, error: 'bad game' };
  if (!r.run || typeof r.run !== 'object') return { ok: false, error: 'no run' };
  if (typeof r.note === 'string' && r.note.length > LIMITS.noteChars)
    return { ok: false, error: 'note too long' };
  const out: RunEnvelope = { v: 1, game: r.game, run: r.run, build: cleanBuild(r.build) };
  const note = typeof r.note === 'string' ? r.note.trim().slice(0, LIMITS.noteChars) : '';
  if (note) out.note = note;
  const who = cleanText(r.who, LIMITS.whoChars);
  if (who) out.who = who;
  return { ok: true, run: out };
}

/** The hour a message was received, as 'YYYY-MM-DDTHH' (UTC). Nothing finer is stored. */
export function hourOf(ms: number): string {
  return new Date(ms).toISOString().slice(0, 13);
}
export function dayOf(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}
/** The last `n` UTC days ending with the day of `ms`, oldest first. */
export function lastDays(ms: number, n: number): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(dayOf(ms - i * 86_400_000));
  return out;
}

/** Storage keys. Event batches: ev/<day>/<hour>/<random>.json. Runs: runs/<day>/<id>.json.gz. */
export const keys = {
  batch: (hour: string, rand: string) => `ev/${hour.slice(0, 10)}/${hour.slice(11, 13)}/${rand}.json`,
  dayPrefix: (day: string) => `ev/${day}/`,
  dayAggregate: (day: string) => `agg/${day}.json`,
  run: (day: string, id: string) => `runs/${day}/${id}.json.gz`,
  runIndex: 'private/index.json',
};

/** A run reference shown to the sender, so they can ask for its removal: 'r-' plus 10 base-32 characters. */
export function runId(random: Uint8Array): string {
  const alphabet = 'abcdefghjkmnpqrstvwxyz0123456789';
  let id = 'r-';
  for (let i = 0; i < 10; i++) id += alphabet[(random[i] ?? 0) % 32];
  return id;
}

/** Per-game aggregate for one or more days. Counts only; no session ids survive aggregation. */
export type GameAggregate = {
  sessions: number;
  /** sessions that sent an 'end' event */
  ended: number;
  /** session duration buckets in minutes: <1, 1-5, 5-15, 15-60, 60+ */
  minutes: [number, number, number, number, number];
  milestones: Record<string, number>;
  /** last screen seen per session that ended or went quiet */
  quits: Record<string, number>;
  errors: Record<string, number>;
  viewports: Record<string, number>;
  builds: Record<string, number>;
};
export type DayAggregate = { v: 1; day: string; games: Record<string, GameAggregate>; batches: number };

/** A dictionary without a prototype, so names like "constructor" or "__proto__" are ordinary keys. */
const dict = <T>(): Record<string, T> => Object.create(null) as Record<string, T>;

const emptyGame = (): GameAggregate => ({
  sessions: 0,
  ended: 0,
  minutes: [0, 0, 0, 0, 0],
  milestones: dict(),
  quits: dict(),
  errors: dict(),
  viewports: dict(),
  builds: dict(),
});

const bump = (map: Record<string, number>, key: string, by = 1) => {
  map[key] = (map[key] ?? 0) + by;
};

/** Folds stored batches (any order) into a day aggregate. Sessions are joined by id within the day only. */
export function aggregateDay(day: string, batches: readonly StoredBatch[]): DayAggregate {
  type Session = {
    g: string;
    vp: string;
    build: string;
    last: number;
    lastScreen: string | undefined;
    lastScreenAt: number;
    ended: boolean;
    milestones: Set<string>;
    errors: Map<string, number>;
  };
  const sessions = new Map<string, Session>();
  for (const b of batches) {
    const id = `${b.g}:${b.s}`;
    let s = sessions.get(id);
    if (!s) {
      s = {
        g: b.g,
        vp: b.vp,
        build: [b.b.c ?? '?', b.b.hf ?? '?'].join(' hf '),
        last: 0,
        lastScreen: undefined,
        lastScreenAt: -1,
        ended: false,
        milestones: new Set(),
        errors: new Map(),
      };
      sessions.set(id, s);
    }
    for (const [kind, at, name] of b.e) {
      s.last = Math.max(s.last, at);
      if (kind === 'end') s.ended = true;
      else if (kind === 'ms' && name) s.milestones.add(name);
      else if (kind === 'scr' && name && at >= s.lastScreenAt) {
        s.lastScreen = name;
        s.lastScreenAt = at;
      } else if (kind === 'err' && name) s.errors.set(name, (s.errors.get(name) ?? 0) + 1);
    }
  }
  const games = dict<GameAggregate>();
  for (const s of sessions.values()) {
    const g = games[s.g] ?? emptyGame();
    games[s.g] = g;
    g.sessions++;
    if (s.ended) g.ended++;
    const min = s.last / 60_000;
    g.minutes[min < 1 ? 0 : min < 5 ? 1 : min < 15 ? 2 : min < 60 ? 3 : 4]++;
    for (const m of s.milestones) bump(g.milestones, m);
    bump(g.quits, s.lastScreen ?? '(no screen named)');
    for (const [e, n] of s.errors) bump(g.errors, e, n);
    bump(g.viewports, s.vp);
    bump(g.builds, s.build);
  }
  return { v: 1, day, games, batches: batches.length };
}

/** Sums day aggregates. */
export function mergeAggregates(days: readonly DayAggregate[]): Record<string, GameAggregate> {
  const out = dict<GameAggregate>();
  for (const d of days) {
    for (const [id, g] of Object.entries(d.games)) {
      const o = out[id] ?? emptyGame();
      out[id] = o;
      o.sessions += g.sessions;
      o.ended += g.ended;
      g.minutes.forEach((n, i) => {
        o.minutes[i as 0] += n;
      });
      for (const [k, n] of Object.entries(g.milestones)) bump(o.milestones, k, n);
      for (const [k, n] of Object.entries(g.quits)) bump(o.quits, k, n);
      for (const [k, n] of Object.entries(g.errors)) bump(o.errors, k, n);
      for (const [k, n] of Object.entries(g.viewports)) bump(o.viewports, k, n);
      for (const [k, n] of Object.entries(g.builds)) bump(o.builds, k, n);
    }
  }
  return out;
}

/** The top `n` entries of a count map, largest first. */
export function top(map: Record<string, number>, n: number): [string, number][] {
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, n);
}
