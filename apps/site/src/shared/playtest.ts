/**
 * Playtest files, shared by both games: a JSON file with the seed, the player's input log, the final state and a
 * hash of it, so a run can be replayed elsewhere and checked to land on the same state.
 *
 * Covers: stable stringify (sorted keys; Map and Set as arrays in insertion order; functions and `undefined`
 * dropped), a synchronous 53-bit non-crypto hash (cyrb53) that runs in a worker, gzip+base64 for the snapshot,
 * and the browser download / file-read helpers. Does not cover: what each game hashes or logs (see
 * `colony/sim/playtest.ts` and `voice/sim/record.ts`), or any check that a file is genuine.
 */

/** Framework package version, from packages/human/package.json at build time (see vite.config.ts `define`). */
declare const __HF_PACKAGE_VERSION__: string;
export const FRAMEWORK_PACKAGE_VERSION: string =
  typeof __HF_PACKAGE_VERSION__ === 'string' ? __HF_PACKAGE_VERSION__ : 'unknown';

export type GameId = 'colony' | 'voice';

/** One playtest file. `snapshot` is plain JSON, or a gzip+base64 string of it when `snapshotEncoding` says so. */
export interface PlaytestFile<L = unknown> {
  kind: 'human-playtest';
  format: 1;
  game: GameId;
  /** Commit of the deployed build (`/release.json`), or 'dev'. */
  build: string;
  /** `@human/framework` package version. */
  framework: string;
  /** `ENGINE_VERSION` of the framework (the saved-person schema version). */
  engine: string;
  seed: number;
  scenario: string;
  /** Sim minute the run stopped at. */
  minute: number;
  log: L[];
  /** `hashState` of the final state (the full comparable state, not only `snapshot`). */
  hash: string;
  snapshotEncoding: 'json' | 'gzip-base64';
  snapshot: unknown;
}

/** The outcome of loading a playtest file: the replayed state's hash against the file's. */
export interface ReplayResult {
  matches: boolean;
  hash: string;
  expected: string;
  /** What the file says it was made with (plain strings, shown as text only). */
  file: { build: string; framework: string; engine: string };
  here: { framework: string; engine: string };
  /** Game 2: index of the first input whose recorded clock the replay did not reach there (-1: none). */
  driftAt: number;
  minute: number;
}

/** JSON text with object keys sorted, so equal states give equal text. */
export function stableStringify(value: unknown, digits?: number): string {
  const out: string[] = [];
  write(value, out, digits);
  return out.join('');
}

function write(v: unknown, out: string[], digits?: number): void {
  if (v === null || typeof v === 'boolean') {
    out.push(String(v));
    return;
  }
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) out.push(JSON.stringify(String(v)));
    else if (digits === undefined || Number.isInteger(v)) out.push(String(v));
    else out.push(String(Number(v.toPrecision(digits))));
    return;
  }
  if (typeof v === 'string') {
    out.push(JSON.stringify(v));
    return;
  }
  if (typeof v === 'bigint') {
    out.push(JSON.stringify(`${v}n`));
    return;
  }
  if (typeof v !== 'object') {
    // undefined, functions and symbols: written as null inside arrays, dropped from objects (by the caller).
    out.push('null');
    return;
  }
  if (Array.isArray(v)) {
    out.push('[');
    v.forEach((x, i) => {
      if (i > 0) out.push(',');
      write(x, out, digits);
    });
    out.push(']');
    return;
  }
  if (v instanceof Map) {
    write([...v.entries()], out, digits);
    return;
  }
  if (v instanceof Set) {
    write([...v.values()], out, digits);
    return;
  }
  const obj = v as Record<string, unknown>;
  const keys = Object.keys(obj)
    .filter((k) => {
      const x = obj[k];
      return x !== undefined && typeof x !== 'function' && typeof x !== 'symbol';
    })
    .sort();
  out.push('{');
  keys.forEach((k, i) => {
    if (i > 0) out.push(',');
    out.push(JSON.stringify(k), ':');
    write(obj[k], out, digits);
  });
  out.push('}');
}

/** cyrb53: a fast, well-mixed 53-bit string hash (not cryptographic), as 14 hex digits. */
export function cyrb53(str: string, seed = 0): string {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const n = 4294967296 * (2097151 & h2) + (h1 >>> 0);
  return n.toString(16).padStart(14, '0');
}

/**
 * Hash of a state: cyrb53 of its stable stringify, exact to the bit. Browsers and Node used to differ in the last
 * bits of `Math.log`/`exp` (a belief's log-odds 0.1566459601557215 in Chromium, 0.15664596015572152 in Node 24), so
 * this once rounded to 10 significant digits. The framework now uses core/libm and the game sims call no platform
 * transcendental (test/libm.test.ts scans both), so every engine gives the same bits and a mismatch is a real
 * divergence.
 */
export const hashState = (state: unknown): string => cyrb53(stableStringify(state));

/** Run-length encode consecutive equal steps into `[minutes, count]` pairs (helper for step logs). */
export function pushRun(log: unknown[], minutes: number): void {
  const last = log.at(-1);
  if (Array.isArray(last) && last[0] === minutes && typeof last[1] === 'number') last[1] += 1;
  else log.push([minutes, 1]);
}

// --- compression (CompressionStream: browsers, workers and Node ≥18) --------------------------------

function toBase64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

function fromBase64(b64: string): Uint8Array<ArrayBuffer> {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

export async function gzipBase64(text: string): Promise<string> {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
  return toBase64(new Uint8Array(await new Response(stream).arrayBuffer()));
}

export async function gunzipBase64(b64: string): Promise<string> {
  const stream = new Blob([fromBase64(b64)]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).text();
}

/** Snapshots above this many characters of JSON are stored gzipped. */
export const SNAPSHOT_GZIP_OVER = 64 * 1024;

/** Encode a snapshot for the file: plain JSON when small, gzip+base64 otherwise. */
export async function encodeSnapshot(
  snapshot: unknown,
): Promise<Pick<PlaytestFile, 'snapshot' | 'snapshotEncoding'>> {
  const json = JSON.stringify(snapshot);
  if (json.length <= SNAPSHOT_GZIP_OVER) return { snapshotEncoding: 'json', snapshot };
  return { snapshotEncoding: 'gzip-base64', snapshot: await gzipBase64(json) };
}

export async function decodeSnapshot(
  f: Pick<PlaytestFile, 'snapshot' | 'snapshotEncoding'>,
): Promise<unknown> {
  if (f.snapshotEncoding === 'gzip-base64' && typeof f.snapshot === 'string')
    return JSON.parse(await gunzipBase64(f.snapshot));
  return f.snapshot;
}

/** Largest playtest file accepted, checked before parsing. */
export const MAX_PLAYTEST_BYTES = 5 * 1024 * 1024;

/** A rejected playtest file; `message` is plain text for the player. */
export class PlaytestError extends Error {}

const isInt = (x: unknown): x is number => typeof x === 'number' && Number.isInteger(x);

/**
 * Parse and strictly check a playtest file's envelope for one game and scenario. The log's entries are checked by
 * the game (`validate`), which returns them typed or throws. The snapshot is kept only to be shown; replay never
 * reads it. Throws `PlaytestError` with a plain message.
 */
export function parsePlaytest<L>(
  text: string,
  game: GameId,
  scenario: string,
  validate: (log: readonly unknown[]) => L[],
  maxBytes = MAX_PLAYTEST_BYTES,
): PlaytestFile<L> {
  if (text.length > maxBytes) throw new PlaytestError('That file is too large to be a playtest file.');
  let f: unknown;
  try {
    f = JSON.parse(text);
  } catch {
    throw new PlaytestError('That file is not a playtest file (it is not JSON).');
  }
  if (typeof f !== 'object' || f === null || Array.isArray(f))
    throw new PlaytestError('That file is not a playtest file.');
  const p = f as Record<string, unknown>;
  if (p.kind !== 'human-playtest' || p.format !== 1)
    throw new PlaytestError('That file is not a playtest file.');
  if (p.game !== 'colony' && p.game !== 'voice')
    throw new PlaytestError('That playtest file names no known game.');
  if (p.game !== game) throw new PlaytestError('That playtest file is for the other game.');
  if (p.scenario !== scenario)
    throw new PlaytestError('That playtest file is from another version of this game’s scenario.');
  if (!isInt(p.seed) || Math.abs(p.seed) > 2 ** 32)
    throw new PlaytestError('That playtest file has no valid seed.');
  if (!isInt(p.minute) || p.minute < 0) throw new PlaytestError('That playtest file has no valid minute.');
  if (typeof p.hash !== 'string' || !/^[0-9a-f]{1,32}$/.test(p.hash))
    throw new PlaytestError('That playtest file has no valid hash.');
  for (const k of ['build', 'framework', 'engine'] as const)
    if (typeof p[k] !== 'string' || (p[k] as string).length > 100)
      throw new PlaytestError(`That playtest file has no valid ${k}.`);
  if (p.snapshotEncoding !== 'json' && p.snapshotEncoding !== 'gzip-base64')
    throw new PlaytestError('That playtest file has no valid snapshot encoding.');
  if (!Array.isArray(p.log)) throw new PlaytestError('That playtest file has no input log.');
  let log: L[];
  try {
    log = validate(p.log);
  } catch (e) {
    throw new PlaytestError(
      `That playtest file’s input log is not valid: ${e instanceof Error ? e.message : e}`,
    );
  }
  return {
    kind: 'human-playtest',
    format: 1,
    game,
    build: p.build as string,
    framework: p.framework as string,
    engine: p.engine as string,
    seed: p.seed,
    scenario,
    minute: p.minute,
    log,
    hash: p.hash,
    snapshotEncoding: p.snapshotEncoding,
    snapshot: p.snapshot,
  };
}

/** Field checks for log validators: each throws a short message naming the entry. */
export const check = {
  int(x: unknown, what: string, min = -Infinity, max = Infinity): number {
    if (!isInt(x) || x < min || x > max) throw new Error(`${what} is not a whole number in range`);
    return x;
  },
  bool(x: unknown, what: string): boolean {
    if (typeof x !== 'boolean') throw new Error(`${what} is not true or false`);
    return x;
  },
  oneOf<T extends string>(x: unknown, allowed: readonly T[], what: string): T {
    if (typeof x !== 'string' || !(allowed as readonly string[]).includes(x))
      throw new Error(`${what} is not known`);
    return x as T;
  },
  str(x: unknown, what: string, max = 200): string {
    if (typeof x !== 'string' || x.length > max) throw new Error(`${what} is not a short string`);
    return x;
  },
  obj(x: unknown, what: string): Record<string, unknown> {
    if (typeof x !== 'object' || x === null || Array.isArray(x)) throw new Error(`${what} is not an object`);
    return x as Record<string, unknown>;
  },
  /** Only these keys (others are an error). */
  keys(o: Record<string, unknown>, allowed: readonly string[], what: string): void {
    for (const k of Object.keys(o))
      if (!allowed.includes(k)) throw new Error(`${what} has an unknown field ${k}`);
  },
};

/** Build a file (worker side); the page fills in `build` from `/release.json` before download. */
export async function makePlaytestFile<L>(o: {
  game: GameId;
  seed: number;
  scenario: string;
  minute: number;
  log: L[];
  hash: string;
  engine: string;
  snapshot: unknown;
}): Promise<PlaytestFile<L>> {
  return {
    kind: 'human-playtest',
    format: 1,
    game: o.game,
    build: 'dev',
    framework: FRAMEWORK_PACKAGE_VERSION,
    engine: o.engine,
    seed: o.seed,
    scenario: o.scenario,
    minute: o.minute,
    log: o.log,
    hash: o.hash,
    ...(await encodeSnapshot(o.snapshot)),
  };
}

/** Compare a replay with its file (worker side). */
export function replayResult(
  f: PlaytestFile<unknown>,
  hash: string,
  engine: string,
  minute: number,
  driftAt = -1,
): ReplayResult {
  return {
    matches: hash === f.hash,
    hash,
    expected: f.hash,
    file: { build: f.build, framework: f.framework, engine: f.engine },
    here: { framework: FRAMEWORK_PACKAGE_VERSION, engine },
    driftAt,
    minute,
  };
}

// --- browser side -------------------------------------------------------------------------------------

/** The deployed commit from `/release.json`, or 'dev' when it is absent (Vite dev, tests). */
export async function fetchBuild(): Promise<string> {
  try {
    const r = await fetch('/release.json', { cache: 'no-store' });
    if (!r.ok) return 'dev';
    const j = (await r.json()) as { commit?: unknown };
    return typeof j.commit === 'string' ? j.commit : 'dev';
  } catch {
    return 'dev';
  }
}

/** Offer `data` to the player as a JSON file download. */
export function downloadJson(name: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Open a file picker for one JSON file and resolve with its text (null when the player cancels). */
export function pickJsonFile(): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) resolve(null);
      else if (file.size > MAX_PLAYTEST_BYTES)
        reject(new PlaytestError('That file is too large to be a playtest file.'));
      else file.text().then(resolve, () => resolve(null));
    });
    input.addEventListener('cancel', () => resolve(null));
    input.click();
  });
}

/** Fetch a playtest file's text from a URL (the `?replay=` flag), refusing anything over the size cap. */
export async function fetchPlaytestText(url: string): Promise<string> {
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new PlaytestError(`Could not fetch the playtest file (${r.status}).`);
  const len = Number(r.headers.get('content-length') ?? '0');
  if (len > MAX_PLAYTEST_BYTES) throw new PlaytestError('That file is too large to be a playtest file.');
  const text = await r.text();
  if (text.length > MAX_PLAYTEST_BYTES)
    throw new PlaytestError('That file is too large to be a playtest file.');
  return text;
}

/** `?replay=<url>` (development only): a playtest file to load when the game opens. */
export function replayParam(): string | null {
  if (!import.meta.env.DEV) return null;
  try {
    return new URLSearchParams(window.location.search).get('replay');
  } catch {
    return null;
  }
}

/** Fixed download names (never derived from file content). */
export const PLAYTEST_FILE_NAME: Record<GameId, string> = {
  colony: 'playtest-colony.json',
  voice: 'playtest-voice.json',
};
