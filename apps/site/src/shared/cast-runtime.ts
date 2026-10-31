/** Browser orchestration only. Titles preview authored state without shelf ownership.
 * Explicit starts preflight the whole cast before one atomic claim. Replacements wait for
 * an already-dispatched transaction; pre-dispatch cancellation never writes. No rollback,
 * cross-device service, passport relaxation or simulation state repair is provided here.
 */
import {
  anchorPersonaLife,
  canonicalCast,
  castForGame,
  closePersonaBranch,
  createPersona,
  initialPersonaLife,
  type Lab,
  lifeAdmission,
  type PersonaEnvelope,
  personaChannel,
  validatePersona,
} from '@adam0white/lab-client';
import {
  type CastAuthority,
  canCheckpoint,
  localCastAuthority,
  validateCastRecord,
} from './cast-authority.ts';
import { type CastChapter, makeCastChapter } from './cast-chapter.ts';
import { claimSiteCastBatch } from './cast-site-claim.ts';
import { verifyCastSourceCheckpoint } from './cast-source-checkpoint.ts';
import { type FileImport, importedFileRecord } from './file-record.ts';
import { FRAMEWORK_PACKAGE_VERSION, fetchBuild } from './playtest.ts';
import { requireValue } from './require-value.ts';

const HOST_EXPORT_GAMES: Readonly<Record<string, string>> = {
  voice: 'voice',
  well: 'colony',
  watch: 'the-night-watch',
};
export type CastHeads = Record<string, PersonaEnvelope>;
export type CastRequest =
  | { type: 'castPreflight'; requestId: number; seed: number; chapter: CastChapter }
  | { type: 'castCheckpoint'; requestId: number; castId: string }
  | {
      type: 'castOwnership';
      heads: CastHeads;
      localOnly?: boolean;
      skipped?: string[];
      authority?: CastAuthority;
      sources?: Record<string, unknown>;
    };
export type CastReply = {
  type: 'castReady';
  requestId: number;
  error?: string;
  transfer?: Record<string, unknown>;
  terminal?: { castId: string; at: number };
  ownership?: CastHeads;
  authority?: CastAuthority;
  sources?: Record<string, unknown>;
  localOnly?: boolean;
  skipped?: string[];
  initials?: Record<string, string>;
  sourceSnapshot?: unknown;
  fileOrigin?: true;
};
/** Immutable host policy, decided before the real browser Shelf is constructed. */
export const fileSession =
  typeof window !== 'undefined' &&
  /^\/(?:colony|voice|watch)\/?$/.test(window.location?.pathname ?? '') &&
  new URLSearchParams(window.location?.search ?? '').get('file') === '1';
const nativeShelf = fileSession ? undefined : personaChannel();
// Test the bridge before admitting a chapter. A failed bridge leaves fresh local play available.
const shelfReady = nativeShelf?.ready;
export const sitePersonaShelf = nativeShelf && {
  get enabled() {
    return nativeShelf.enabled;
  },
  get ready() {
    return shelfReady?.then(() => nativeShelf.ready) ?? Promise.resolve(false);
  },
  setEnabled: (value: boolean) => nativeShelf.setEnabled(value),
  request: <T>(request: Parameters<typeof nativeShelf.request>[0]) => nativeShelf.request<T>(request),
};
// Every entry into native orchestration checks fileSession before using this native-only value.
const shelf = sitePersonaShelf;
// A completed seed-42 Watch departure needs 1.83 MB of exact replay evidence.
// Keep a bounded 2 MiB journal; storage quota errors still refuse before a shelf write.
const SOURCE_JOURNAL_BYTES = 2 * 1024 * 1024;
function requireNativeSession(): void {
  if (fileSession) throw new Error('This file stays in this tab. Native continuity is unavailable.');
}
/** Reject encodings that File.text would normalize, before parsing or claiming original bytes. */
export async function readGameFile(file: File): Promise<string> {
  if (file.size > 5 * 1024 * 1024) throw new Error('This game file is too large.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.length > 5 * 1024 * 1024) throw new Error('This game file is too large.');
  const text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
  const encoded = new TextEncoder().encode(text);
  if (bytes.length !== encoded.length || bytes.some((byte, i) => byte !== encoded[i]))
    throw new Error('This game file is not exact UTF-8.');
  // JSON does not admit a leading BOM. Refuse it without silently changing the original.
  JSON.parse(text);
  return text;
}
type State = {
  game: string;
  rejectLoad?: (failure: { gen: number; message: string; restore?: true }) => void;
  validatingLoad?: boolean;
  lab: Lab;
  worker: Worker;
  generation: number;
  heads: CastHeads;
  authority?: CastAuthority;
  sources: Record<string, unknown>;
  localSources?: unknown;
  histories: CastHeads;
  busy: boolean;
  status: string;
  selected: string;
  line?: string;
  pending: Map<number, { resolve(r: CastReply): void; reject(e: Error): void }>;
  seq: number;
  gate: string | null;
  dedicated: boolean;
  runGen?: number;
  boundary?: string;
  phase?: string;
  day?: number;
  ended?: boolean;
  played: boolean;
  localRestore?: CastHeads;
  localLoad: boolean;
  auto: boolean;
  blocked?: boolean;
  skipped?: string[];
  localOnly?: boolean;
  pinnedImport?: boolean;
  fileImport?: FileImport;
  pendingInit?: Record<string, unknown>;
  startupQueue?: Record<string, unknown>[];
  /** Controls sent after a local load is accepted but before its ownership receipts settle. */
  restoreQueue?: Record<string, unknown>[];
  previewInit?: Record<string, unknown>;
  claiming?: number;
  afterClaim?: Record<string, unknown>[];
  startPrior?: RunState;
  loadPrior?: RunState;
};
const RUN_FIELDS = [
  'heads',
  'authority',
  'sources',
  'histories',
  'gate',
  'dedicated',
  'runGen',
  'boundary',
  'phase',
  'day',
  'ended',
  'played',
  'localRestore',
  'localSources',
  'localLoad',
  'previewInit',
  'pendingInit',
  'line',
  'status',
  'skipped',
  'localOnly',
  'pinnedImport',
  'fileImport',
] as const;
type RunState = Pick<State, (typeof RUN_FIELDS)[number]>;
function savedRun(s: State): RunState {
  return Object.fromEntries(RUN_FIELDS.map((key) => [key, s[key]])) as RunState;
}
const states = new Map<string, State>();
const listeners = new Set<() => void>();
export const castChanges = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};
const changed = () => {
  for (const fn of listeners) fn();
};
export function castState(game: string) {
  const s = states.get(game);
  return {
    blocked: s?.blocked ?? false,
    enabled: fileSession ? false : requireValue(shelf).enabled,
    ready: fileSession ? Promise.resolve(false) : requireValue(shelf).ready,
    line: s?.line,
    localNotice: s?.localOnly
      ? s.pinnedImport
        ? 'This game was opened from a file. Its people stay in this game.'
        : 'This game uses local people. Carryover remains available in other games.'
      : s?.skipped
          ?.map((id) => `${canonicalCast(id).name} could not carry over. Local people take their place.`)
          .join(' '),
    status: s?.status ?? 'People carry between compatible games on this browser.',
    busy: s?.busy ?? false,
    people: castForGame(game),
    selected: s?.selected ?? castForGame(game)[0]?.castId ?? '',
    gated: Boolean(s?.gate) && !s?.dedicated,
    recordingAllowed: s?.lab.personaRecordingAllowed ?? true,
  };
}
export function selectCast(game: string, id: string) {
  const s = states.get(game);
  if (s && castForGame(game).some((p) => p.castId === id)) s.selected = id;
  changed();
}
export function setCastEnabled(enabled: boolean) {
  requireNativeSession();
  requireValue(shelf).setEnabled(enabled);
  window.dispatchEvent(new Event('hf-cast-preference'));
  changed();
}
function gate(s: State, key: string | null) {
  s.gate = key;
  s.lab.setPersonaRecording(key);
  changed();
}
function ask(
  s: State,
  message:
    | { type: 'castPreflight'; seed: number; chapter: CastChapter }
    | { type: 'castCheckpoint'; castId: string },
): Promise<CastReply> {
  const requestId = ++s.seq;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      s.pending.delete(requestId);
      reject(new Error('No eligible checkpoint boundary was reached. Continue play and try again.'));
    }, 60000);
    s.pending.set(requestId, {
      resolve: (r) => {
        clearTimeout(timer);
        resolve(r);
      },
      reject: (e) => {
        clearTimeout(timer);
        reject(e);
      },
    });
    s.worker.postMessage({ ...message, requestId });
  });
}
function reset(s: State, gen?: number) {
  s.generation++;
  s.validatingLoad = false;
  s.busy = false;
  s.heads = {};
  s.authority = undefined;
  s.pinnedImport = false;
  s.fileImport = undefined;
  s.sources = {};
  s.localSources = undefined;
  s.histories = {};
  s.dedicated = false;
  s.runGen = gen;
  s.boundary = undefined;
  s.phase = undefined;
  s.day = undefined;
  s.ended = undefined;
  s.played = false;
  s.localRestore = undefined;
  s.startupQueue = undefined;
  s.restoreQueue = undefined;
  s.localLoad = false;
  s.blocked = false;
  s.skipped = [];
  s.localOnly = false;
  for (const p of s.pending.values()) p.reject(new Error('This chapter was replaced.'));
  s.pending.clear();
  s.previewInit = undefined;
}
/** Init and its already-issued UI controls enter the worker in FIFO order after preflight/CAS. */
function startWorker(s: State, message: Record<string, unknown>) {
  const queued = s.startupQueue ?? [];
  s.startupQueue = undefined;
  s.worker.postMessage(message);
  pinOwnership(s);
  for (const control of queued) {
    const { castRunGeneration: _generation, ...input } = control;
    s.worker.postMessage(input);
  }
}
function pinOwnership(s: State) {
  s.worker.postMessage({
    type: 'castOwnership',
    heads: structuredClone(s.heads),
    authority: structuredClone(s.authority),
    sources: structuredClone(s.sources),
    localOnly: s.localOnly ?? false,
    skipped: [...(s.skipped ?? [])],
  } satisfies CastRequest);
}
async function validHeads(game: string, value: unknown): Promise<CastHeads> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const entries = Object.entries(value);
  if (entries.length > 8) throw new Error('Too many ownership receipts.');
  const heads: CastHeads = {};
  for (const [id, value] of entries) {
    const p = await validatePersona(value);
    if (p.castId !== id || !castForGame(game).some((c) => c.castId === id))
      throw new Error('Ownership receipt identity differs.');
    heads[id] = p;
  }
  return heads;
}
async function recording(s: State, generation: number) {
  // Kept for older host call sites. The recording switch covers every carried history.
  if (generation === s.generation) s.lab.allowPersonaRecording(true);
  changed();
}

async function restoreOwnership(s: State, value: unknown, generation: number) {
  const heads = await validHeads(s.game, value);
  if (generation !== s.generation || !s.localLoad) return;
  let archived: Record<string, unknown> = {};
  if (typeof localStorage !== 'undefined') {
    try {
      archived = JSON.parse(localStorage.getItem(`hf-cast-source:${s.game}`) ?? '{}') as Record<
        string,
        unknown
      >;
    } catch {
      /* Missing source evidence does not change the simulation. */
    }
  }
  if (s.localSources && typeof s.localSources === 'object')
    archived = { ...archived, ...(s.localSources as Record<string, unknown>) };
  const sources: Record<string, unknown> = {};
  if (new TextEncoder().encode(JSON.stringify(archived)).length <= SOURCE_JOURNAL_BYTES) {
    for (const [id, head] of Object.entries(heads)) {
      const raw = archived[id];
      if (!raw || !head.transfer.checkpoint) continue;
      try {
        sources[id] = await verifyCastSourceCheckpoint(s.game, id, head.transfer, raw);
      } catch {
        // Preserve accepted ownership, but do not relabel unsupported source data as a verified run.
      }
    }
  }
  if (generation !== s.generation || !s.localLoad) return;
  s.sources = sources;
  s.heads = heads;
  s.histories = heads;
  pinOwnership(s);
  if (Object.keys(heads).length) {
    gate(s, `cast-local-${crypto.randomUUID()}`);
    await recording(s, generation);
    s.status = 'Local save restored its exact accepted heads. A changed shelf still conflicts.';
  }
  s.busy = false;
  flushRestoreQueue(s);
  changed();
}
/** Delivers controls held while ownership restored, in order, through the ordinary gate. */
function flushRestoreQueue(s: State) {
  const queued = s.restoreQueue ?? [];
  s.restoreQueue = undefined;
  for (const control of queued) dispatchCastMessage(s.worker, s.game, control);
}
const RESTORE_FAILED = "This save's people could not be restored, so it cannot continue. Start a fresh game.";
/**
 * A local load whose replay was accepted but whose ownership receipts failed is refused:
 * HF 4 never continues an old or damaged save without its exact owners. The gate opens
 * (busy clears) but stays blocked until a fresh start resets it. Obsolete generations are ignored.
 */
function failRestore(s: State, generation: number) {
  if (generation !== s.generation) return;
  s.busy = false;
  s.blocked = true;
  s.restoreQueue = undefined;
  s.status = RESTORE_FAILED;
  changed();
  if (s.runGen !== undefined) s.rejectLoad?.({ gen: s.runGen, message: RESTORE_FAILED, restore: true });
}
async function closeOwned(s: State, terminal: { castId: string; at: number }, generation: number) {
  const parent = s.heads[terminal.castId];
  if (
    s.validatingLoad ||
    !canCheckpoint(s.authority, terminal.castId, s.heads) ||
    !parent ||
    parent.terminal ||
    generation !== s.generation ||
    !requireValue(shelf).enabled
  )
    return;
  const receipt = await closePersonaBranch(
    parent,
    { game: s.game, build: await fetchBuild(), engine: FRAMEWORK_PACKAGE_VERSION, rules: 'hf4-cast-1' },
    terminal.at,
  );
  if (generation !== s.generation) return;
  await requireValue(shelf).request({ action: 'put', envelope: receipt });
  if (generation !== s.generation || s.heads[terminal.castId]?.revision !== parent.revision) return;
  s.heads[terminal.castId] = receipt;
  s.histories[terminal.castId] = receipt;
  pinOwnership(s);
  s.status = `${canonicalCast(terminal.castId).name}'s branch is closed by their death. History remains inspectable.`;
  changed();
}
export function bindCastWorker(
  worker: Worker,
  game: string,
  lab: Lab,
  rejectLoad?: State['rejectLoad'],
): () => void {
  if (fileSession) return () => {};
  const s: State = {
    worker,
    game,
    lab,
    rejectLoad,
    generation: 0,
    heads: {},
    sources: {},
    histories: {},
    busy: false,
    status: 'People carry between compatible games on this browser.',
    selected: castForGame(game)[0]?.castId ?? '',
    pending: new Map(),
    seq: 0,
    gate: null,
    dedicated: false,
    played: false,
    localLoad: false,
    auto: false,
  };
  states.set(game, s);
  const automatic = () => {
    if (
      s.validatingLoad ||
      !s.authority ||
      s.blocked ||
      !requireValue(shelf).enabled ||
      !s.played ||
      s.busy ||
      s.auto ||
      s.dedicated ||
      (s.gate && !Object.keys(s.heads).length)
    )
      return;
    s.auto = true;
    const generation = s.generation;
    void (async () => {
      const ids = Object.keys(s.heads).length ? Object.keys(s.heads) : castForGame(game).map((p) => p.castId);
      for (const id of ids) {
        if (generation !== s.generation) break;
        await checkpointPerson(s, id, false);
      }
    })().finally(() => {
      s.auto = false;
    });
  };
  const hidden = () => {
    if (document.visibilityState === 'hidden') automatic();
  };
  const receive = (event: MessageEvent) => {
    if (s.validatingLoad) {
      event.stopImmediatePropagation();
      return;
    }
    const r = event.data as CastReply;
    const m = event.data as {
      type: string;
      gen?: number;
      frame?: { phase?: string; day?: number | { current: number } | null; ended?: boolean; minute?: number };
      result?: { matches?: boolean };
      ok?: boolean;
      file?: Record<string, unknown>;
      data?: Record<string, unknown>;
    };
    if (r.type === 'castReady') {
      if (r.terminal && (s.runGen === undefined || m.gen === s.runGen))
        void closeOwned(s, r.terminal, s.generation).catch((e) => {
          s.status = String(e);
          changed();
        });
      if (r.ownership && s.localLoad && m.gen === s.runGen) {
        const generation = s.generation;
        s.restoreQueue ??= [];
        void validateCastRecord(game, {
          castAuthority: r.authority,
          castOwnership: r.ownership,
          castSources: r.sources,
          castLocalOnly: r.localOnly,
          castSkipped: r.skipped,
        })
          .then(async (record) => {
            if (generation !== s.generation) return;
            s.pinnedImport = r.fileOrigin === true;
            s.authority = record.authority;
            s.localOnly = record.authority.mode === 'local';
            s.skipped = record.authority.denied;
            s.localSources = record.sources;
            await restoreOwnership(s, record.heads, generation);
          })
          .catch(() => failRestore(s, generation));
      }
      const pending = s.pending.get(r.requestId);
      s.pending.delete(r.requestId);
      pending?.resolve(r);
    }
    if (
      s.loadPrior &&
      m.gen === s.runGen &&
      (m.type === 'playtestError' || (m.type === 'loaded' && m.ok === false))
    ) {
      const prior = s.loadPrior;
      s.loadPrior = undefined;
      s.busy = false;
      s.restoreQueue = undefined;
      s.startPrior = undefined;
      Object.assign(s, prior);
      gate(s, prior.gate);
      s.lab.allowPersonaRecording(false);
      if (Object.keys(s.histories).length) void recording(s, s.generation).catch(() => {});
      changed();
      return;
    }
    if (m.gen === s.runGen && (m.type === 'replayed' || (m.type === 'loaded' && m.ok === true)))
      s.loadPrior = undefined;
    if (m.gen !== undefined && s.runGen !== undefined && m.gen !== s.runGen) return;
    const exportGame = HOST_EXPORT_GAMES[game];
    for (const file of [m.file, m.data])
      if (
        file &&
        typeof file === 'object' &&
        exportGame &&
        file.game === exportGame &&
        (game === 'watch' || file.kind === 'human-playtest')
      ) {
        if (s.fileImport) file.fileImport = structuredClone(s.fileImport);
        file.castAuthority = structuredClone(s.authority);
        file.castOwnership = structuredClone(s.heads);
        file.castSources = structuredClone(s.sources);
        file.castLocalOnly = s.localOnly ?? false;
        file.castSkipped = [...(s.skipped ?? [])];
      }
    if (m.type === 'replayed' && m.result?.matches && s.localRestore) {
      const generation = s.generation;
      s.restoreQueue ??= [];
      void restoreOwnership(s, s.localRestore, generation).catch(() => failRestore(s, generation));
    }
    if (m.type === 'frame' && m.frame) {
      const f = m.frame;
      if (f.phase !== undefined) s.phase = f.phase;
      if (f.day != null) s.day = typeof f.day === 'object' ? f.day.current : f.day;
      if (f.ended !== undefined) s.ended = f.ended;
      if (game === 'well' ? (f.minute ?? 0) > 0 : !['premise', 'goal'].includes(s.phase ?? 'goal'))
        s.played = true;
      const boundary = `${s.day ?? ''}/${s.phase ?? ''}/${s.ended ?? false}`;
      if (s.boundary !== undefined && boundary !== s.boundary) automatic();
      s.boundary = boundary;
    }
  };
  worker.addEventListener('message', receive);
  // Recording identity and preferences no longer gate fictional-person admission.
  // Transport owns its recording reset; ownership and run replacement keep their own generation checks.
  document.addEventListener('visibilitychange', hidden);
  window.addEventListener('pagehide', automatic);
  void requireValue(shelf).ready.then(changed);
  return () => {
    reset(s);
    worker.removeEventListener('message', receive);
    document.removeEventListener('visibilitychange', hidden);
    window.removeEventListener('pagehide', automatic);
    if (states.get(game) === s) states.delete(game);
  };
}
/** Loaded simulation never reads current shelf state. Only explicit local reload restores its pinned receipts. */
export function postCastMessage(worker: Worker, game: string, message: Record<string, unknown>): void {
  dispatchCastMessage(worker, game, message);
}
function dispatchCastMessage(
  worker: Worker,
  game: string,
  message: Record<string, unknown>,
  prepared?: Awaited<ReturnType<typeof validateCastRecord>> & { fileImport?: FileImport },
): void {
  if (fileSession) {
    if (
      ['init', 'load', 'castOwnership', 'castPreflight', 'castCheckpoint'].includes(String(message.type)) ||
      message.local === true
    )
      requireNativeSession();
    const { castRunGeneration: _generation, ...input } = message;
    worker.postMessage(input);
    return;
  }
  const s = states.get(game);
  if (!s || s.worker !== worker) {
    if (['castOwnership', 'castCheckpoint', 'load', 'loadPlaytest'].includes(String(message.type)))
      throw new Error('Bind character authority before using native continuity.');
    worker.postMessage(message);
    return;
  }
  const replacement = ['init', 'loadPlaytest', 'load'].includes(String(message.type));
  const controlGeneration = message.castRunGeneration ?? message.gen;
  if (s.validatingLoad && !replacement) return;
  const postControl = () => {
    const { castRunGeneration: _generation, ...input } = message;
    worker.postMessage(input);
  };
  if (s.claiming !== undefined && (replacement || s.afterClaim)) {
    // A dispatched atomic transaction cannot be rolled back. Finish that explicit start,
    // then replace it; never send its queued play controls into the replacement run.
    if (replacement) s.afterClaim = [structuredClone(message)];
    else if (
      controlGeneration !== undefined &&
      controlGeneration !== requireValue(requireValue(s.afterClaim)[0]).gen
    )
      return;
    else if (
      !['tick', 'predict', 'why'].includes(String(message.type)) &&
      requireValue(s.afterClaim).length < 32
    )
      requireValue(s.afterClaim).push(structuredClone(message));
    else if (requireValue(s.afterClaim).length >= 32) {
      s.status =
        'Too many controls arrived while accepting the explicit chapter. The extra control was refused.';
      changed();
    }
    return;
  }
  if (!replacement && controlGeneration !== undefined && controlGeneration !== s.runGen) return;
  const startsPreview =
    s.previewInit &&
    ((game === 'voice' && message.type === 'begin') ||
      (game === 'well' && message.type === 'resume') ||
      (game === 'watch' && message.type === 'input' && (message.input as { k?: string })?.k === 'start'));
  if (startsPreview && typeof message.gen === 'number' && message.gen !== s.runGen) return;
  if (startsPreview) {
    const init = requireValue(s.previewInit);
    postCastMessage(worker, game, init);
    postCastMessage(worker, game, message);
    return;
  }
  if (
    (message.type === 'loadPlaytest' || message.type === 'load') &&
    typeof message.text === 'string' &&
    !(game === 'watch' && typeof message.id === 'string') &&
    !prepared
  ) {
    const generation = ++s.generation;
    s.validatingLoad = true;
    s.busy = true;
    void Promise.resolve()
      .then(async () => {
        const raw = JSON.parse(String(message.text));
        const record = await validateCastRecord(
          game,
          raw,
          message.local === true || message.type === 'load' ? {} : { provenanceOnly: true },
        );
        const fileImport =
          message.local === true ? raw.fileImport : await importedFileRecord(raw, String(message.text));
        return { ...record, fileImport };
      })
      .then((record) => {
        if (generation !== s.generation) return;
        s.validatingLoad = false;
        s.busy = false;
        dispatchCastMessage(worker, game, message, record);
      })
      .catch((error) => {
        if (generation !== s.generation) return;
        s.validatingLoad = false;
        s.busy = false;
        s.status = String(error);
        s.rejectLoad?.({ gen: Number(message.gen), message: String(error) });
        changed();
      });
    return;
  }
  if (replacement) {
    const prior = s.loadPrior ?? (s.startupQueue ? s.startPrior : savedRun(s));
    reset(s, typeof message.gen === 'number' ? message.gen : undefined);
    s.startPrior = message.type === 'init' ? prior : undefined;
    s.loadPrior = message.type === 'init' ? undefined : prior;
  }
  if (message.type === 'init' && message.castPreview === true) {
    const { castPreview: _preview, ...init } = message;
    s.previewInit = init;
    s.pendingInit = undefined;
    s.line = undefined;
    s.status = 'Title preview. No continuing person has been claimed.';
    gate(s, `cast-preview-${crypto.randomUUID()}`);
    worker.postMessage(init);
    changed();
    return;
  }
  if (message.type === 'loadPlaytest' || message.type === 'load') {
    s.pinnedImport =
      (message.local !== true && message.type !== 'load') || prepared?.fileImport?.imported === true;
    s.fileImport = prepared?.fileImport;
    s.localLoad = message.type === 'load' || message.local === true;
    if (s.localLoad) s.busy = true;
    if (!s.localLoad) {
      s.authority = localCastAuthority();
      s.localOnly = true;
      s.status = 'This game was opened from a file. Its people stay in this game.';
    }
    if (prepared && s.localLoad) {
      s.localRestore = prepared.heads;
      s.localSources = prepared.sources;
      s.authority = prepared.authority;
      s.localOnly = prepared.authority.mode === 'local';
      s.skipped = prepared.authority.denied;
    }

    gate(s, `cast-file-${crypto.randomUUID()}`);
    worker.postMessage(message);
    return;
  }
  if (message.type === 'init' && message.selinReturn) {
    s.gate = `cast-dedicated-${crypto.randomUUID()}`;
    s.dedicated = true;
    changed();
    worker.postMessage(message);
    return;
  }
  if (message.type !== 'init') {
    if (s.blocked) return;
    if (s.busy && s.localLoad) {
      // Before replay acceptance nothing passes. After it, ownership is still restoring: hold real
      // controls and exports for this run. Elapsed frames and reads are not inputs. Stale
      // generations were already dropped above, and a replacement clears the queue.
      if (['tick', 'predict', 'why'].includes(String(message.type)) || !s.restoreQueue) return;
      // A pending export is never dropped: only one can wait, and losing it would leave the page's export flag set.
      if (s.restoreQueue.length < 32 || message.type === 'exportPlaytest')
        s.restoreQueue.push(structuredClone(message));
      else {
        s.status = 'Too many controls arrived while this save was restoring. The extra control was refused.';
        changed();
      }
      return;
    }
    if (s.startupQueue) {
      // No simulation exists yet. Elapsed frames and reads of the previous view are not inputs to the new run.
      if (['tick', 'predict', 'why'].includes(String(message.type))) return;
      if (typeof controlGeneration === 'number' && s.runGen !== undefined && controlGeneration !== s.runGen)
        return;
      if (s.startupQueue.length >= 32) {
        reset(s, s.runGen);
        s.blocked = true;
        s.status = 'Too many controls arrived during startup. Start a fresh chapter again.';
      } else s.startupQueue.push(structuredClone(message));
    } else postControl();
    return;
  }
  s.pendingInit = message;
  s.startupQueue = [];
  const generation = s.generation;
  s.busy = true;
  changed();
  void (async () => {
    await requireValue(shelf).ready;
    if (generation !== s.generation) return;
    if (!requireValue(shelf).enabled) {
      s.authority = localCastAuthority();
      s.localOnly = true;
      gate(s, null);
      startWorker(s, message);
      return;
    }
    gate(s, `cast-pending-${crypto.randomUUID()}`);
    const source = {
      game,
      build: await fetchBuild(),
      engine: FRAMEWORK_PACKAGE_VERSION,
      rules: 'hf4-cast-1',
    };
    const admitted = await claimSiteCastBatch(
      requireValue(shelf),
      castForGame(game).map((p) => p.castId),
      source,
      async (inputs) => {
        if (!inputs.length) return undefined;
        const chapter = makeCastChapter(inputs);
        const checked = await ask(s, { type: 'castPreflight', seed: Number(message.seed), chapter });
        if (checked.error) throw new Error(checked.error);
        for (const input of inputs) {
          const initial = checked.initials?.[input.parent.castId];
          if (!initial) throw new Error('Preflight omitted a complete initial actor.');
          requireValue(requireValue(chapter.people)[input.parent.castId]).initial = initial;
        }
        return chapter;
      },
      {
        admitPerson: async (input) => {
          const checked = await ask(s, {
            type: 'castPreflight',
            seed: Number(message.seed),
            chapter: makeCastChapter([input]),
          });
          if (checked.error) throw new Error(checked.error);
          if (!checked.initials?.[input.parent.castId])
            throw new Error('Preflight omitted a complete initial actor.');
        },
        isCurrent: () => generation === s.generation && requireValue(shelf).enabled,
        onDispatch: () => {
          s.claiming = generation;
        },
      },
    );
    if (generation !== s.generation || s.afterClaim) return;
    if (!admitted) {
      gate(s, null);
      s.line = undefined;
      s.authority = localCastAuthority();
      s.localOnly = true;
      s.status = 'Fresh local chapter. No allocated person has an active shelf history.';
      startWorker(s, message);
      return;
    }
    const record = await validateCastRecord(game, {
      castAuthority: {
        format: 'site-cast-authority/1',
        mode: 'shared',
        expectedHeads: admitted.expectedHeads,
        denied: admitted.blocked.map((p) => p.castId),
      },
      castOwnership: Object.fromEntries(admitted.claims.map((p) => [p.castId, p])),
      castSources: {},
      castLocalOnly: false,
      castSkipped: admitted.blocked.map((p) => p.castId),
    });
    if (generation !== s.generation || s.afterClaim) return;
    s.authority = record.authority;
    s.heads = record.heads;
    s.histories = { ...s.heads };
    s.skipped = admitted.blocked.map((p) => p.castId);
    const skipped = admitted.blocked
      .map((p) => `${canonicalCast(p.castId).name} could not carry over. Local people take their place.`)
      .join(' ');
    if (!admitted.inputs.length) {
      gate(s, null);
      s.line = skipped;
      s.status = skipped;
      startWorker(s, message);
      return;
    }
    const chapter = makeCastChapter(admitted.inputs, admitted.claims);
    for (const [id, person] of Object.entries(requireValue(chapter.people)))
      person.initial = requireValue(requireValue(requireValue(admitted.initial).people)[id]).initial;
    s.line = [skipped, ...admitted.inputs.map((p) => lifeAdmission(p, game).line)].filter(Boolean).join(' ');
    gate(s, `cast-group-${crypto.randomUUID()}`);
    s.status =
      `${skipped} ${admitted.claims.length} continuing people begin together. Their initial state and life are pinned.`.trim();
    startWorker(s, { ...message, castChapter: chapter });
    await recording(s, generation);
  })()
    .catch((e) => {
      if (generation === s.generation) {
        s.startupQueue = undefined;
        s.blocked = true;
        s.status = `${String(e)} No partial chapter started. Use fresh local play, or finish an eligible source chapter first.`;
      }
    })
    .finally(() => {
      if (generation === s.generation) s.busy = false;
      // An obsolete hashing/preflight continuation must not release a newer transaction.
      if (s.claiming === generation) {
        s.claiming = undefined;
        const next = s.afterClaim;
        s.afterClaim = undefined;
        if (next && states.get(game) === s)
          for (const control of next) postCastMessage(worker, game, control);
      }
      changed();
    });
}
export function startCastFresh(game: string) {
  requireNativeSession();
  const s = states.get(game);
  if (!s) return;
  if (s.pendingInit && !s.busy) {
    const message = s.pendingInit;
    reset(s, typeof message.gen === 'number' ? message.gen : undefined);
    s.localOnly = true;
    s.authority = localCastAuthority();
    s.line = 'This game uses local people. Carryover remains available in other games.';
    s.status = s.line;
    gate(s, null);
    startWorker(s, message);
  }
  changed();
}

async function checkpointPerson(s: State, selectedCastId: string, fork: boolean): Promise<void> {
  if (s.busy || s.validatingLoad) return;
  if (!canCheckpoint(s.authority, selectedCastId, s.heads)) {
    s.status = `${castForGame(s.game).find((p) => p.castId === selectedCastId)?.name ?? 'This person'} is local in this game. Their saved history stays unchanged.`;
    changed();
    return;
  }
  s.busy = true;
  const generation = s.generation;
  s.status = `Waiting for ${canonicalCast(selectedCastId).name}'s actual action to finish. Close the menu and continue play.`;
  changed();
  try {
    await requireValue(shelf).ready;
    if (!requireValue(shelf).enabled) throw new Error('Enable fictional-person continuity first.');
    const result = await ask(s, { type: 'castCheckpoint', castId: selectedCastId });
    if (generation !== s.generation) return;
    if (result.terminal) {
      await closeOwned(s, result.terminal, generation);
      return;
    }
    if (result.error || !result.transfer) throw new Error(result.error ?? 'No supported checkpoint.');
    if (result.transfer.sourceRole !== selectedCastId.split('.')[2])
      throw new Error('Checkpoint identity differs.');
    if (!result.transfer.checkpoint) throw new Error('Missing full-source checkpoint receipt.');
    {
      const raw = await verifyCastSourceCheckpoint(
        s.game,
        selectedCastId,
        result.transfer,
        result.sourceSnapshot,
      );
      if (generation !== s.generation) return;
      s.sources[selectedCastId] = raw;
      const key = `hf-cast-source:${s.game}`;
      let prior: Record<string, unknown> = {};
      if (typeof localStorage !== 'undefined') {
        try {
          prior = JSON.parse(localStorage.getItem(key) ?? '{}') as Record<string, unknown>;
        } catch {
          /* Keep the current verified capture. */
        }
      }
      const allocated = new Set(castForGame(s.game).map((p) => p.castId));
      const journal = JSON.stringify(
        Object.fromEntries(Object.entries({ ...prior, ...s.sources }).filter(([id]) => allocated.has(id))),
      );
      if (new TextEncoder().encode(journal).length > SOURCE_JOURNAL_BYTES)
        throw new Error('The bounded source receipt archive is full. Export this run first.');
      if (typeof localStorage !== 'undefined') localStorage.setItem(key, journal);
    }
    const cast = canonicalCast(selectedCastId);
    const existing = await requireValue(shelf).request<PersonaEnvelope | null>({
      action: 'get',
      castId: cast.castId,
    });
    if (existing && !fork && s.heads[cast.castId]?.revision !== existing.revision)
      throw new Error('Another chapter owns this person. Export or explicitly fork.');
    const branchId = !fork && existing ? existing.branchId : crypto.randomUUID();
    const life =
      !fork && existing?.transfer.life
        ? anchorPersonaLife(existing.transfer.life as never, cast.castId, Date.now())
        : initialPersonaLife(cast.castId, branchId, Date.now());
    const transfer = result.transfer;
    const envelope = await createPersona({
      format: 'hf-persona/1',
      castId: cast.castId,
      castRevision: cast.revision,
      branchId,
      parentRevision: fork ? null : (existing?.revision ?? null),
      source: {
        game: s.game,
        build: await fetchBuild(),
        engine: FRAMEWORK_PACKAGE_VERSION,
        rules: 'hf4-cast-1',
      },
      transfer: { ...transfer, life },
      limitations: [
        'Bounded coarse local life; no full days, travel, healing or duty completion is inferred.',
      ],
    });
    if (generation !== s.generation || !requireValue(shelf).enabled) return;
    await requireValue(shelf).request({
      action: 'put',
      envelope,
      fork,
      authored: !existing && !s.gate,
    });
    if (generation !== s.generation) return;
    s.heads[cast.castId] = envelope;
    s.histories[cast.castId] = envelope;
    gate(s, `cast-group-${crypto.randomUUID()}`);
    pinOwnership(s);
    await recording(s, generation);
    s.status = `${cast.name} is saved for another chapter. Loaded play stays pinned.`;
  } catch (e) {
    if (generation === s.generation) s.status = String(e);
  } finally {
    if (generation === s.generation) s.busy = false;
    changed();
  }
}
export async function checkpointCast(game: string, fork = false): Promise<boolean> {
  requireNativeSession();
  const s = states.get(game);
  if (!s || s.busy) return false;
  const id = s.selected;
  const prior = s.heads[id]?.revision;
  await checkpointPerson(s, id, fork);
  return Boolean(
    s.heads[id]?.revision &&
      !s.heads[id]?.terminal &&
      s.heads[id]?.revision !== prior &&
      s.status === `${canonicalCast(id).name} is saved for another chapter. Loaded play stays pinned.`,
  );
}
/** Compatibility entry point: the single recording switch covers every history. */
export async function chooseCastRecording(game: string, allow: boolean) {
  const s = states.get(game);
  if (!s) return;
  s.lab.setTelemetryOff(!allow);
  s.lab.allowPersonaRecording(true);
  changed();
}
export function castRecordingGate(game: string): string | null {
  return states.get(game)?.gate ?? null;
}
