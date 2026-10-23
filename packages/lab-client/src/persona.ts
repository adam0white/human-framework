/** Browser-only fictional-person continuity. No recording identifiers belong in this store. */
import { IDENTITY_ORIGIN, readLocal, writeLocal } from './identity.ts';
import { randomId } from './linked.ts';

export const PERSONA_LIMITS = {
  transferBytes: 256 * 1024,
  revisions: 10,
  shelfBytes: 2 * 1024 * 1024,
} as const;
export const PERSONA_ORIGINS = new Set(
  ['human', 'pass', 'murmur', 'stairwell', 'hearsay', 'goodhands'].map(
    (host) => `https://${host}.adamwhite.work`,
  ),
);
export type PersonaEnvelope = {
  format: 'hf-persona/1';
  castId: string;
  castRevision: string;
  branchId: string;
  revision: string;
  parentRevision: string | null;
  source: { game: string; build: string; engine: string; rules: string };
  transfer: Record<string, unknown>;
  limitations: string[];
};
export type PersonaSummary = Pick<
  PersonaEnvelope,
  'castId' | 'castRevision' | 'branchId' | 'revision' | 'source' | 'limitations'
>;
export type PersonaShelfState = { revisions: PersonaEnvelope[]; heads: Record<string, string> };
export type PersonaAction = 'list' | 'get' | 'put' | 'delete' | 'recording';
export type PersonaRequest = {
  action: PersonaAction;
  castId?: string;
  envelope?: PersonaEnvelope;
  fork?: boolean;
  /** Original authored source only; never set for imports. */
  authored?: boolean;
  /** Explicit historical linkage approval, current central recording epoch only. */
  allowRecording?: boolean;
};
const token = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const hash = /^[a-f0-9]{64}$/;
const bytes = (x: unknown) => new TextEncoder().encode(JSON.stringify(x)).length;
/** Reject non-JSON, prototype keys, deep and excessively wide input before hashing or storage. */
export function boundedPersonaJson(value: unknown): void {
  let nodes = 0;
  const walk = (x: unknown, depth: number) => {
    if (++nodes > 20000 || depth > 24) throw new Error('Persona data is too complex.');
    if (x === null || typeof x === 'boolean') return;
    if (typeof x === 'number' && Number.isFinite(x)) return;
    if (typeof x === 'string' && x.length <= 32000) return;
    if (Array.isArray(x)) {
      if (x.length > 4096) throw new Error('Persona array is too long.');
      for (const y of x) walk(y, depth + 1);
      return;
    }
    if (typeof x !== 'object' || !x || ![Object.prototype, null].includes(Object.getPrototypeOf(x)))
      throw new Error('Persona must contain plain JSON.');
    const entries = Object.entries(x);
    if (entries.length > 512) throw new Error('Persona object is too wide.');
    for (const [key, y] of entries) {
      if (key.length > 128 || ['__proto__', 'constructor', 'prototype'].includes(key))
        throw new Error('Unsafe persona key.');
      walk(y, depth + 1);
    }
  };
  walk(value, 0);
  if (bytes(value) > PERSONA_LIMITS.transferBytes)
    throw new Error('Persona exceeds 256 KiB. Export a local file instead.');
}
export function canonicalPersona(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalPersona).join(',')}]`;
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalPersona((value as Record<string, unknown>)[key])}`)
    .join(',')}}`;
}
export async function personaRevision(value: Omit<PersonaEnvelope, 'revision'>): Promise<string> {
  boundedPersonaJson(value);
  return [
    ...new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonicalPersona(value))),
    ),
  ]
    .map((n) => n.toString(16).padStart(2, '0'))
    .join('');
}
export async function validatePersona(value: unknown): Promise<PersonaEnvelope> {
  boundedPersonaJson(value);
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid persona.');
  const p = value as PersonaEnvelope;
  const keys = [
    'format',
    'castId',
    'castRevision',
    'branchId',
    'revision',
    'parentRevision',
    'source',
    'transfer',
    'limitations',
  ];
  if (
    Object.keys(p).some((key) => !keys.includes(key)) ||
    Object.keys(p).length !== keys.length ||
    p.format !== 'hf-persona/1' ||
    ![p.castId, p.castRevision, p.branchId].every((v) => typeof v === 'string' && token.test(v)) ||
    ['constructor', 'prototype', '__proto__'].includes(p.castId) ||
    typeof p.revision !== 'string' ||
    !hash.test(p.revision) ||
    !(p.parentRevision === null || (typeof p.parentRevision === 'string' && hash.test(p.parentRevision))) ||
    !p.source ||
    Object.keys(p.source).sort().join(',') !== 'build,engine,game,rules' ||
    !Object.values(p.source).every((v) => typeof v === 'string' && token.test(v)) ||
    !p.transfer ||
    typeof p.transfer !== 'object' ||
    Array.isArray(p.transfer) ||
    !Array.isArray(p.limitations) ||
    p.limitations.length > 64 ||
    !p.limitations.every((v) => typeof v === 'string' && v.length <= 500)
  )
    throw new Error('Invalid persona envelope.');
  const { revision, ...body } = p;
  if ((await personaRevision(body)) !== revision) throw new Error('Persona checksum does not match.');
  return structuredClone(p);
}
export async function createPersona(body: Omit<PersonaEnvelope, 'revision'>): Promise<PersonaEnvelope> {
  return validatePersona({ ...body, revision: await personaRevision(body) });
}
/** Pure CAS reducer; called inside the central IndexedDB transaction. A fork explicitly replaces the active branch. */
export function acceptPersona(state: PersonaShelfState, p: PersonaEnvelope, fork = false): PersonaShelfState {
  if (state.revisions.some((r) => r.revision === p.revision)) return state;
  const head = Object.hasOwn(state.heads, p.castId) ? (state.heads[p.castId] ?? null) : null;
  const current = state.revisions.find((r) => r.revision === head);
  if (fork) {
    if (current?.branchId === p.branchId || p.parentRevision !== null)
      throw new Error('A fork needs a new branch and no parent.');
  } else if (head !== p.parentRevision || (current && current.branchId !== p.branchId))
    throw new Error('Continuity conflict. Export this history or explicitly fork it.');
  const next = { revisions: [...state.revisions, p], heads: { ...state.heads, [p.castId]: p.revision } };
  const heads = new Set(Object.values(next.heads));
  while (next.revisions.length > PERSONA_LIMITS.revisions || bytes(next) > PERSONA_LIMITS.shelfBytes) {
    const oldest = next.revisions.findIndex((revision) => !heads.has(revision.revision));
    if (oldest < 0) throw new Error('The local shelf is full. Delete a person after exporting it.');
    next.revisions.splice(oldest, 1);
  }
  return next;
}
export function personaSummary(p: PersonaEnvelope): PersonaSummary {
  const { castId, castRevision, branchId, revision, source, limitations } = p;
  return { castId, castRevision, branchId, revision, source, limitations };
}
export const PERSONA_CONSENT_KEY = 'hf-persona-opt-in';
/** The consent handshake exposes only a boolean, never cast metadata or recording identity. */
export function isPersonaConsentMessage(
  origin: string,
  source: unknown,
  parent: unknown,
  data: unknown,
): boolean {
  if (!PERSONA_ORIGINS.has(origin) || !source || source !== parent || !data || typeof data !== 'object')
    return false;
  const message = data as Record<string, unknown>;
  return (
    message.type === 'hf-persona-consent' &&
    typeof message.id === 'string' &&
    /^[a-f0-9]{32}$/.test(message.id) &&
    (message.action === 'get' || (message.action === 'set' && typeof message.enabled === 'boolean'))
  );
}
/** Global browser continuity consent is read before hosts decide fresh-run admission. */
export function personaChannel(): {
  readonly enabled: boolean;
  readonly ready: Promise<boolean>;
  setEnabled(value: boolean): void;
  request<T>(request: PersonaRequest): Promise<T>;
} {
  let enabled = readLocal(PERSONA_CONSENT_KEY) === '1';
  let frame: HTMLIFrameElement | undefined;
  let loaded: Promise<void> | undefined;
  async function exchange<T>(message: Record<string, unknown>, replyType: string): Promise<T> {
    if (!PERSONA_ORIGINS.has(location.origin))
      throw new Error('Continuity is local to this game. Use a file.');
    if (!frame) {
      if (!document.body)
        await new Promise<void>((resolve) =>
          window.addEventListener('DOMContentLoaded', () => resolve(), { once: true }),
        );
      frame = document.createElement('iframe');
      frame.hidden = true;
      frame.title = 'Fictional person shelf';
      frame.src = `${IDENTITY_ORIGIN}/lab/identity/`;
      loaded = new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Shelf unavailable. Use a local file.')), 3000);
        frame?.addEventListener(
          'load',
          () => {
            clearTimeout(timer);
            resolve();
          },
          { once: true },
        );
      });
      document.body.append(frame);
    }
    await loaded;
    const id = randomId();
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        window.removeEventListener('message', receive);
        reject(new Error('Shelf unavailable. Use a local file.'));
      }, 3000);
      const receive = (event: MessageEvent) => {
        if (
          event.origin !== IDENTITY_ORIGIN ||
          event.source !== frame?.contentWindow ||
          event.data?.type !== replyType ||
          event.data.id !== id
        )
          return;
        clearTimeout(timer);
        window.removeEventListener('message', receive);
        if (event.data.error) reject(new Error(String(event.data.error).slice(0, 200)));
        else resolve(event.data.value as T);
      };
      window.addEventListener('message', receive);
      frame?.contentWindow?.postMessage({ ...message, id }, IDENTITY_ORIGIN);
    });
  }
  const remember = (value: unknown): boolean => {
    if (typeof value !== 'boolean') throw new Error('Invalid continuity preference.');
    enabled = value;
    writeLocal(PERSONA_CONSENT_KEY, value ? '1' : '0');
    return value;
  };
  // A failed bridge retains local/file play but cannot establish shared consent.
  let pending = exchange<unknown>({ type: 'hf-persona-consent', action: 'get' }, 'hf-persona-consent-reply')
    .then(remember)
    .catch(() => enabled);
  return {
    get enabled() {
      return enabled;
    },
    get ready() {
      return pending;
    },
    setEnabled(value) {
      enabled = value;
      writeLocal(PERSONA_CONSENT_KEY, value ? '1' : '0');
      pending = pending
        .then(() =>
          exchange<unknown>(
            { type: 'hf-persona-consent', action: 'set', enabled: value },
            'hf-persona-consent-reply',
          ),
        )
        .then(remember)
        .catch(() => enabled);
    },
    async request<T>(request: PersonaRequest): Promise<T> {
      await pending;
      if (!enabled) throw new Error('Enable fictional person continuity first.');
      const value = await exchange<T>(
        { type: 'hf-persona-request', optedIn: true, ...request },
        'hf-persona-reply',
      );
      if (!enabled) throw new Error('Continuity is off.');
      return value;
    },
  };
}

/** Host controls projection/admission. This helper never mutates or refreshes a loaded game. */
export function watchPersonaCheckpoint(checkpoint: () => void | Promise<void>): () => void {
  const take = () => {
    void Promise.resolve()
      .then(checkpoint)
      .catch(() => {});
  };
  const hidden = () => {
    if (document.visibilityState === 'hidden') take();
  };
  window.addEventListener('pagehide', take);
  document.addEventListener('visibilitychange', hidden);
  return () => {
    window.removeEventListener('pagehide', take);
    document.removeEventListener('visibilitychange', hidden);
  };
}

/** Frame request admission is independent of the broader recording-identity channel. */
export function isPersonaMessage(origin: string, source: unknown, parent: unknown, data: unknown): boolean {
  if (!PERSONA_ORIGINS.has(origin) || !source || source !== parent || !data || typeof data !== 'object')
    return false;
  const message = data as Record<string, unknown>;
  return (
    message.type === 'hf-persona-request' &&
    message.optedIn === true &&
    typeof message.id === 'string' &&
    /^[a-f0-9]{32}$/.test(message.id) &&
    ['list', 'get', 'put', 'delete', 'recording'].includes(String(message.action)) &&
    (message.castId === undefined ||
      (typeof message.castId === 'string' &&
        token.test(message.castId) &&
        !['constructor', 'prototype'].includes(message.castId)))
  );
}
