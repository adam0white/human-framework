import {
  createPerson,
  createRun,
  exportRun,
  inspect,
  type PersonAuthoring,
  type Result,
  type RunSpec,
} from '@adam0white/human-framework';
import type { PersonaEnvelope, PersonaShelfState } from '@adam0white/lab-client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import opening from '../../test/fixtures/hf4-checkpoint-opening.json';
import { FRAMEWORK_PACKAGE_VERSION } from './playtest.ts';
import { requireValue } from './require-value.ts';

const control = vi.hoisted(() => ({
  transportAdmission: false,
  state: { heads: {}, revisions: [] } as PersonaShelfState,
  puts: [] as PersonaEnvelope[],
  batches: 0,
  channels: 0,
  requests: [] as string[],
  allowed: new Set<string>(),
  enabled: true,
  key: null as string | null,
  refuse: false,
  autoPreflight: false,
  rejectRecording: false,
  beforeBatch: undefined as (() => Promise<void>) | undefined,
  beforeCreate: undefined as (() => Promise<void>) | undefined,
}));
vi.mock('@adam0white/lab-client', async () => {
  const actual = await vi.importActual<typeof import('@adam0white/lab-client')>('@adam0white/lab-client');
  return {
    ...actual,
    createPersona: async (...args: Parameters<typeof actual.createPersona>) => {
      await control.beforeCreate?.();
      return actual.createPersona(...args);
    },
    personaChannel: () => {
      control.channels++;
      return {
        get enabled() {
          return control.enabled;
        },
        ready: Promise.resolve(true),
        setEnabled(value: boolean) {
          control.enabled = value;
        },
        async request<T>(r: import('@adam0white/lab-client').PersonaRequest): Promise<T> {
          control.requests.push(r.action);
          if (control.rejectRecording && ['recording', 'recordingBatch'].includes(r.action))
            throw new Error('Obsolete recording RPC must not gate publication');
          if (r.action === 'get')
            return (control.state.revisions.find(
              (p) => p.revision === control.state.heads[requireValue(r.castId)],
            ) ?? null) as T;
          if (r.action === 'prepareBatch') {
            const inputs = [],
              blocked = [];
            for (const id of r.castIds ?? []) {
              const p = control.state.revisions.find((p) => p.revision === control.state.heads[id]);
              if (!p) continue;
              try {
                inputs.push(actual.preparePersonaLife(p, 3600000));
              } catch (e) {
                blocked.push({ castId: id, reason: String(e) });
              }
            }
            return {
              inputs,
              blocked,
              expectedHeads: Object.fromEntries(
                (r.castIds ?? []).map((id) => [id, control.state.heads[id] ?? null]),
              ),
            } as T;
          }
          if (r.action === 'putBatch') {
            control.batches++;
            await control.beforeBatch?.();
            control.state = actual.acceptPersonaBatch(
              control.state,
              requireValue(r.envelopes),
              r.expectedHeads,
            );
            control.puts.push(...requireValue(r.envelopes));
            return r.envelopes as T;
          }
          if (r.action === 'put') {
            control.state = actual.acceptPersona(control.state, requireValue(r.envelope), r.fork);
            control.puts.push(requireValue(r.envelope));
            if (r.authored)
              control.allowed.add(`${requireValue(r.envelope).castId}/${requireValue(r.envelope).branchId}`);
            return r.envelope as T;
          }
          if (r.action === 'recordingBatch') {
            if (r.allowRecording !== undefined)
              for (const p of requireValue(r.envelopes)) {
                const key = `${p.castId}/${p.branchId}`;
                if (r.allowRecording) control.allowed.add(key);
                else control.allowed.delete(key);
              }
            return {
              sameEpoch: requireValue(r.envelopes).every((p) =>
                control.allowed.has(`${p.castId}/${p.branchId}`),
              ),
              recordingEpoch: 'epoch',
              revisions: requireValue(r.envelopes).map((p) => p.revision),
            } as T;
          }
          if (r.action === 'recording') return { recordingEpoch: 'epoch', sameEpoch: false } as T;
          return null as T;
        },
      };
    },
  };
});
// Public peer certification currently refuses these claims before transport races are reachable.
// This double isolates admission only. Shelf preparation, hashing, dispatch and atomic CAS stay real.
vi.mock('./cast-site-claim.ts', async () => {
  const actual = await vi.importActual<typeof import('./cast-site-claim.ts')>('./cast-site-claim.ts');
  return {
    claimSiteCastBatch: async (...args: Parameters<typeof actual.claimSiteCastBatch>) => {
      if (!control.transportAdmission) return actual.claimSiteCastBatch(...args);
      const [shelf, castIds, source, admit, options = {}] = args;
      const current = () => {
        if (options.isCurrent && !options.isCurrent())
          throw new Error('The run or identity changed. Choose again.');
      };
      current();
      const batch = await shelf.request<import('@adam0white/lab-client').LifeBatchPreparation>({
        action: 'prepareBatch',
        castIds,
      });
      current();
      for (const input of batch.inputs) {
        await options.admitPerson?.(structuredClone(input));
        current();
      }
      const initial =
        batch.inputs.length || batch.blocked.length ? await admit(structuredClone(batch.inputs)) : undefined;
      const { createPersona } = await import('@adam0white/lab-client');
      const claims = await Promise.all(
        batch.inputs.map(async (input) => {
          const { revision, ...body } = input.parent;
          return createPersona({
            ...body,
            parentRevision: revision,
            source: body.source,
            transfer: { ...body.transfer, life: input.life, portableClaim: { game: source.game } },
          });
        }),
      );
      current();
      options.onDispatch?.();
      await shelf.request({ action: 'putBatch', envelopes: claims, expectedHeads: batch.expectedHeads });
      current();
      return {
        initial,
        claims,
        inputs: batch.inputs,
        blocked: batch.blocked,
        expectedHeads: batch.expectedHeads,
      };
    },
  };
});
vi.mock('./playtest.ts', async () => ({
  ...(await vi.importActual('./playtest.ts')),
  fetchBuild: async () => 'control',
}));
const lab = {
  setPersonaRecording: (key: string | null) => {
    control.key = key;
  },
  allowPersonaRecording: vi.fn(),
  setTelemetryOff: vi.fn(),
  personaRecordingAllowed: false,
  playerId: null,
};
vi.mock('./lab.tsx', () => ({ gameLabs: { voice: lab, well: lab, watch: lab } }));

import {
  acceptPersona,
  acceptPersonaBatch,
  castForGame,
  createPersona,
  initialPersonaLife,
  preparePersonaLife,
} from '@adam0white/lab-client';
import {
  bindCastWorker,
  castState,
  checkpointCast,
  chooseCastRecording,
  postCastMessage,
  selectCast,
  startCastFresh,
} from './cast-runtime.ts';

const fixtureSources = new Map<string, unknown>();
// TEST ONLY native receipt fixture. Browser qualification uses real fresh admission instead.
function nativeRecord(game: string, heads: Record<string, PersonaEnvelope> = {}) {
  return {
    castOwnership: heads,
    castSources: Object.fromEntries(
      Object.entries(heads).flatMap(([id, head]) => {
        const sha = (head.transfer.checkpoint as { sha256?: string } | undefined)?.sha256;
        return sha && fixtureSources.has(sha) ? [[id, fixtureSources.get(sha)]] : [];
      }),
    ),
    castLocalOnly: false,
    castSkipped: [],
    castAuthority: {
      format: 'site-cast-authority/1',
      mode: 'shared',
      denied: [],
      expectedHeads: Object.fromEntries(
        castForGame(game).map((p) => [p.castId, heads[p.castId]?.parentRevision ?? null]),
      ),
    },
  };
}
async function emptyAdmission(worker: FakeWorker, game = 'voice') {
  postCastMessage(worker as unknown as Worker, game, { type: 'init', seed: 1, gen: 1 });
  await vi.waitFor(() => expect(castState(game).busy).toBe(false));
}
class FakeWorker extends EventTarget {
  sent: Record<string, unknown>[] = [];
  postMessage(m: Record<string, unknown>) {
    this.sent.push(m);
    if (m.type === 'castPreflight' && control.autoPreflight)
      queueMicrotask(() =>
        this.reply({
          type: 'castReady',
          requestId: m.requestId,
          initials: Object.fromEntries(
            Object.keys(requireValue((m.chapter as import('./cast-chapter.ts').CastChapter).people)).map(
              (id) => [id, '{}'],
            ),
          ),
        }),
      );
    if (m.type === 'castCheckpoint' && control.refuse)
      queueMicrotask(() =>
        this.reply({ type: 'castReady', requestId: m.requestId, error: 'Active project remains.' }),
      );
  }
  reply(data: unknown) {
    this.dispatchEvent(new MessageEvent('message', { data }));
  }
  requests(type: string) {
    return this.sent.filter((m) => m.type === type);
  }
}
let close: (() => void) | undefined;
beforeEach(() => {
  vi.stubGlobal('window', new EventTarget());
  vi.stubGlobal('document', Object.assign(new EventTarget(), { visibilityState: 'visible' }));
  control.transportAdmission = false;
  control.state = { heads: {}, revisions: [] };
  control.puts = [];
  control.batches = 0;
  control.requests = [];
  control.allowed.clear();
  control.enabled = true;
  control.key = null;
  control.refuse = false;
  control.autoPreflight = false;
  control.rejectRecording = false;
  control.beforeBatch = undefined;
  control.beforeCreate = undefined;
  lab.allowPersonaRecording.mockClear();
});
afterEach(() => {
  close?.();
  close = undefined;
  vi.unstubAllGlobals();
});
// These small authored runs exercise real HF4 projection, receipt verification and shelf CAS.
// FakeWorker controls only asynchronous transport; it does not establish any game's readiness.
function need<T>(result: Result<T>): T {
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}
async function capture(id = 'hf.cast.riza.voice', game = 'voice') {
  const role = requireValue(id.split('.')[2]);
  const fixture = JSON.parse(
    JSON.stringify(opening).replaceAll('hf.cast.selin.voice', id).replaceAll('selin', role),
  );
  fixture.spec.host.id = game;
  fixture.spec.definitions.sources.find((source: { type: string }) => source.type === 'host').id = game;
  const run = need(createRun(fixture.spec as RunSpec));
  need(createPerson(run, fixture.person as PersonAuthoring));
  const archive = exportRun(run);
  const { canonicalCast, canonicalPersona } = await import('@adam0white/lab-client');
  const reading = need(
    inspect(run, {
      perspective: { kind: 'host' },
      people: [role],
      select: ['persona'],
      portable: { person: role, castId: id, castRevision: canonicalCast(id).revision },
    }),
  );
  const portable = reading.people[0]?.parts[0]?.value;
  const sha256 = Array.from(
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonicalPersona(archive))),
    ),
    (b) => b.toString(16).padStart(2, '0'),
  ).join('');
  fixtureSources.set(sha256, archive);
  return {
    sourceSnapshot: archive,
    transfer: {
      castPassport: 'hf-portable-person/2',
      sourceRole: role,
      portable,
      checkpoint: {
        kind: 'hf-run/1',
        engine: archive.engine,
        sourceAt: archive.current.at,
        person: role,
        sha256,
      },
    },
  };
}
async function head(id = 'hf.cast.riza.voice') {
  const game = id.endsWith('.watch') ? 'watch' : id.endsWith('.well') ? 'well' : 'voice';
  const { transfer } = await capture(id, game);
  const { canonicalCast } = await import('@adam0white/lab-client');
  const branchId = `control-${id.split('.')[2]}`;
  return createPersona({
    format: 'hf-persona/1',
    castId: id,
    castRevision: canonicalCast(id).revision,
    branchId,
    parentRevision: null,
    source: { game, engine: FRAMEWORK_PACKAGE_VERSION, build: 'control', rules: 'cast-1' },
    transfer: { ...transfer, life: initialPersonaLife(id, branchId, 0) },
    limitations: [],
  });
}
async function begin(worker: FakeWorker, game = 'voice') {
  close = bindCastWorker(worker as unknown as Worker, game, lab as never);
  control.autoPreflight = true;
  postCastMessage(worker as unknown as Worker, game, { type: 'init', seed: 1, gen: 1 });
  await vi.waitFor(() => expect(castState(game).busy).toBe(false));
}
async function checkpoint(worker: FakeWorker, id = 'hf.cast.riza.voice', game = 'voice') {
  selectCast(game, id);
  const before = worker.requests('castCheckpoint').length;
  const promise = checkpointCast(game);
  await vi.waitFor(() => expect(worker.requests('castCheckpoint')).toHaveLength(before + 1));
  const request = requireValue(worker.requests('castCheckpoint').at(-1));
  worker.reply({
    type: 'castReady',
    requestId: request.requestId,
    ...(await capture(id, game)),
  });
  await promise;
}
describe('browser continuity transport with test admission', () => {
  beforeEach(() => {
    control.transportAdmission = true;
  });
  it('does not cancel pending admission when recording identity acknowledges or changes', async () => {
    const old = await head();
    control.state = acceptPersona(control.state, old);
    let release: () => void = () => {};
    let entered = false;
    const waiting = new Promise<void>((resolve) => {
      release = resolve;
    });
    control.beforeCreate = async () => {
      entered = true;
      await waiting;
    };
    const worker = new FakeWorker();
    close = bindCastWorker(worker as unknown as Worker, 'voice', lab as never);
    control.autoPreflight = true;
    postCastMessage(worker as unknown as Worker, 'voice', { type: 'init', seed: 1, gen: 1 });
    await vi.waitFor(() => expect(entered).toBe(true));
    window.dispatchEvent(new Event('hf-lab-preference'));
    release();
    await vi.waitFor(() => expect(castState('voice').busy).toBe(false));
    expect(castState('voice').blocked).toBe(false);
    expect(worker.requests('init')).toHaveLength(1);
  });

  it('retains object and numeric day extraction for Voice checkpoint boundaries', async () => {
    const worker = new FakeWorker();
    close = bindCastWorker(worker as unknown as Worker, 'voice', lab as never);
    await emptyAdmission(worker);
    worker.reply({ type: 'frame', frame: { phase: 'day', day: { current: 2 } } });
    worker.reply({ type: 'frame', frame: { phase: 'day', day: 2 } });
    expect(worker.requests('castCheckpoint')).toHaveLength(0);
    control.refuse = true;
    worker.reply({ type: 'frame', frame: { phase: 'day', day: { current: 3 } } });
    await vi.waitFor(() => expect(worker.requests('castCheckpoint').length).toBeGreaterThan(0));
  });
  it.each(['voice', 'watch'] as const)(
    'verifies %s source checksums and exports raw captures outside shelf envelopes',
    async (game) => {
      const id = game === 'watch' ? 'hf.cast.tamar.watch' : 'hf.cast.riza.voice';
      const storage = new Map<string, string>();
      vi.stubGlobal('localStorage', {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
      });
      const worker = new FakeWorker();
      close = bindCastWorker(worker as unknown as Worker, game, lab as never);
      await emptyAdmission(worker, game);
      selectCast(game, id);
      const captured = await capture(id, game);
      const raw = captured.sourceSnapshot;
      const sha256 = captured.transfer.checkpoint.sha256;
      for (const digest of ['0'.repeat(64), sha256]) {
        const saving = checkpointCast(game);
        await vi.waitFor(() =>
          expect(worker.requests('castCheckpoint').length).toBeGreaterThan(digest === sha256 ? 1 : 0),
        );
        worker.reply({
          type: 'castReady',
          requestId: requireValue(worker.requests('castCheckpoint').at(-1)).requestId,
          ...captured,
          transfer: { ...captured.transfer, checkpoint: { ...captured.transfer.checkpoint, sha256: digest } },
        });
        await saving;
        expect(control.puts.length).toBe(digest === sha256 ? 1 : 0);
      }
      expect(control.puts[0]?.transfer).not.toHaveProperty('sourceSnapshot');
      expect(control.puts[0]?.source.engine).toBe(FRAMEWORK_PACKAGE_VERSION);
      expect(control.puts[0]?.source.rules).toBe('hf4-cast-1');
      expect(JSON.parse(requireValue(localStorage.getItem(`hf-cast-source:${game}`)))).toEqual({ [id]: raw });
      const file: Record<string, unknown> =
        game === 'watch' ? { game: 'the-night-watch' } : { kind: 'human-playtest', game: 'voice' };
      worker.reply({ type: 'exported', data: file });
      expect(file.castSources).toEqual({ [id]: raw });
      expect(file.castOwnership).toEqual({ [id]: control.puts.at(-1) });
      const saved = JSON.stringify(file);
      const heads = structuredClone(file.castOwnership);
      const restores = worker.requests('castOwnership').length;
      postCastMessage(
        worker as unknown as Worker,
        game,
        game === 'watch'
          ? { type: 'load', gen: 2, id: 'native:auto' }
          : { type: 'loadPlaytest', gen: 2, text: saved, local: true },
      );
      if (game === 'voice') await vi.waitFor(() => expect(worker.requests('loadPlaytest')).toHaveLength(1));
      worker.reply(
        game === 'watch'
          ? {
              type: 'castReady',
              requestId: 0,
              gen: 2,
              ownership: heads,
              authority: file.castAuthority,
              sources: file.castSources,
              localOnly: false,
              skipped: [],
            }
          : { type: 'replayed', gen: 2, result: { matches: true } },
      );
      await vi.waitFor(() => expect(worker.requests('castOwnership').length).toBeGreaterThan(restores));
      await vi.waitFor(() => expect(castState(game).busy).toBe(false));
      expect(worker.requests('castOwnership').at(-1)?.heads).toEqual(heads);
      const restored: Record<string, unknown> =
        game === 'watch' ? { game: 'the-night-watch' } : { kind: 'human-playtest', game: 'voice' };
      worker.reply({ type: 'exported', gen: 2, data: restored });
      expect(restored.castSources).toEqual({ [id]: raw });
      expect(restored.castOwnership).toEqual(heads);
      expect(JSON.parse(requireValue(localStorage.getItem(`hf-cast-source:${game}`)))).toEqual({ [id]: raw });
    },
  );
  it('opens an owned title and restores Continue without writing or replacing its accepted receipts', async () => {
    const old = await head();
    control.state = acceptPersona(control.state, old);
    const worker = new FakeWorker();
    close = bindCastWorker(worker as unknown as Worker, 'voice', lab as never);
    postCastMessage(worker as unknown as Worker, 'voice', {
      type: 'init',
      seed: 1,
      gen: 1,
      castPreview: true,
    });
    await Promise.resolve();
    expect(control.batches).toBe(0);
    expect(control.requests).toEqual([]);
    expect(control.state.heads[old.castId]).toBe(old.revision);
    postCastMessage(worker as unknown as Worker, 'voice', {
      type: 'loadPlaytest',
      gen: 2,
      local: true,
      text: JSON.stringify(nativeRecord('voice', { [old.castId]: old })),
    });
    await vi.waitFor(() => expect(worker.requests('loadPlaytest').length).toBeGreaterThan(0));
    worker.reply({ type: 'replayed', gen: 2, result: { matches: true } });
    await vi.waitFor(() =>
      expect(worker.requests('castOwnership').at(-1)?.heads).toEqual({ [old.castId]: old }),
    );
    expect(control.batches).toBe(0);
    postCastMessage(worker as unknown as Worker, 'voice', {
      type: 'loadPlaytest',
      gen: 3,
      text: JSON.stringify(nativeRecord('voice', { [old.castId]: old })),
    });
    await vi.waitFor(() => expect(worker.requests('loadPlaytest')).toHaveLength(2));
    worker.reply({ type: 'replayed', gen: 3, result: { matches: true } });
    expect(castState('voice').status).toContain('stay in this game');
    expect(control.batches).toBe(0);
    expect(control.state.heads[old.castId]).toBe(old.revision);
  });
  it.each([
    ['voice', 'hf.cast.riza.voice', { type: 'begin' }],
    ['well', 'hf.cast.danyal.well', { type: 'resume' }],
    ['watch', 'hf.cast.tamar.watch', { type: 'input', input: { k: 'start' } }],
  ] as const)(
    'promotes %s title only on its intentional start, with one whole-batch claim',
    async (game, id, start) => {
      control.state = acceptPersona(control.state, await head(id));
      control.autoPreflight = true;
      const worker = new FakeWorker();
      close = bindCastWorker(worker as unknown as Worker, game, lab as never);
      postCastMessage(worker as unknown as Worker, game, {
        type: 'init',
        seed: 1,
        gen: 1,
        castPreview: true,
      });
      await Promise.resolve();
      expect(control.batches).toBe(0);
      expect(worker.requests('castPreflight')).toHaveLength(0);
      expect(control.requests).toEqual([]);
      postCastMessage(worker as unknown as Worker, game, { ...start, gen: 1 });
      await vi.waitFor(() => expect(castState(game).busy).toBe(false));
      expect(control.batches).toBe(1);
      expect(worker.requests('init')).toHaveLength(2);
      expect(worker.requests(start.type)).toHaveLength(1);
    },
  );
  it.each(['voice', 'well', 'watch'])(
    'retains the prior owned %s run and working generation after a refused load',
    async (game) => {
      const id =
        game === 'watch'
          ? 'hf.cast.tamar.watch'
          : game === 'well'
            ? 'hf.cast.danyal.well'
            : 'hf.cast.riza.voice';
      const old = await head(id);
      const worker = new FakeWorker();
      close = bindCastWorker(worker as unknown as Worker, game, lab as never);
      postCastMessage(worker as unknown as Worker, game, {
        type: 'init',
        seed: 1,
        gen: 1,
        castPreview: true,
      });
      postCastMessage(worker as unknown as Worker, game, {
        type: 'loadPlaytest',
        gen: 2,
        local: true,
        text: JSON.stringify(nativeRecord(game, { [id]: old })),
      });
      await vi.waitFor(() => expect(worker.requests('loadPlaytest').length).toBeGreaterThan(0));
      worker.reply({ type: 'replayed', gen: 2, result: { matches: true } });
      await vi.waitFor(() => expect(worker.requests('castOwnership').at(-1)?.heads).toEqual({ [id]: old }));
      await vi.waitFor(() => expect(castState(game).busy).toBe(false));
      if (game === 'voice') {
        await chooseCastRecording(game, true);
        expect(lab.allowPersonaRecording).toHaveBeenLastCalledWith(true);
      }
      postCastMessage(worker as unknown as Worker, game, {
        type: game === 'watch' ? 'load' : 'loadPlaytest',
        gen: 3,
        text: 'bad',
        id: 'missing',
      });
      if (game === 'voice') {
        control.allowed.clear(); // Old per-person permission state cannot block the recording switch.
        window.dispatchEvent(new Event('hf-lab-preference'));
      }
      if (game !== 'watch') await vi.waitFor(() => expect(castState(game).busy).toBe(false));
      worker.reply(
        game === 'watch'
          ? { type: 'loaded', gen: 3, ok: false, id: 'missing' }
          : { type: 'playtestError', gen: 3, message: 'bad file' },
      );
      postCastMessage(worker as unknown as Worker, game, { type: 'exportPlaytest', castRunGeneration: 2 });
      expect(worker.requests('exportPlaytest')).toHaveLength(1);
      const file: Record<string, unknown> =
        game === 'watch'
          ? { game: 'the-night-watch' }
          : { kind: 'human-playtest', game: game === 'well' ? 'colony' : 'voice' };
      worker.reply({ type: 'exported', gen: 2, file });
      expect(file.castOwnership).toEqual({ [id]: old });
      expect(control.batches).toBe(0);
      expect(lab.allowPersonaRecording).toHaveBeenLastCalledWith(true);
    },
  );
  it('queues begin behind prepared init and drops transient controls during admission transport', async () => {
    control.state = acceptPersona(control.state, await head());
    const worker = new FakeWorker();
    close = bindCastWorker(worker as unknown as Worker, 'voice', lab as never);
    postCastMessage(worker as unknown as Worker, 'voice', {
      type: 'init',
      seed: 1,
      gen: 1,
      castPreview: true,
    });
    postCastMessage(worker as unknown as Worker, 'voice', { type: 'begin', castRunGeneration: 1 });
    postCastMessage(worker as unknown as Worker, 'voice', { type: 'tick', gen: 1, dtMs: 16 });
    postCastMessage(worker as unknown as Worker, 'voice', { type: 'predict', gen: 1, requestId: 50 });
    await vi.waitFor(() => expect(worker.requests('castPreflight')).toHaveLength(1));
    expect(worker.requests('begin')).toHaveLength(0);
    expect(worker.requests('tick')).toHaveLength(0);
    expect(worker.requests('predict')).toHaveLength(0);
    control.autoPreflight = true;
    worker.reply({
      type: 'castReady',
      requestId: worker.requests('castPreflight')[0]?.requestId,
      initials: { 'hf.cast.riza.voice': '{}' },
    });
    await vi.waitFor(() => expect(castState('voice').busy).toBe(false));
    expect(worker.requests('init')).toHaveLength(2);
    expect(worker.requests('begin')).toHaveLength(1);
    expect(worker.sent.findLastIndex((m) => m.type === 'init')).toBeLessThan(
      worker.sent.findIndex((m) => m.type === 'begin'),
    );
  });
  it('finishes a dispatched explicit claim before loading, without running its queued begin in the replacement', async () => {
    control.state = acceptPersona(control.state, await head());
    control.autoPreflight = true;
    let release!: () => void;
    control.beforeBatch = () =>
      new Promise<void>((resolve) => {
        release = resolve;
      });
    const worker = new FakeWorker();
    close = bindCastWorker(worker as unknown as Worker, 'voice', lab as never);
    postCastMessage(worker as unknown as Worker, 'voice', {
      type: 'init',
      seed: 1,
      gen: 1,
      castPreview: true,
    });
    postCastMessage(worker as unknown as Worker, 'voice', { type: 'begin', gen: 1 });
    await vi.waitFor(() => expect(control.batches).toBe(1));
    postCastMessage(worker as unknown as Worker, 'voice', {
      type: 'loadPlaytest',
      gen: 2,
      text: JSON.stringify(nativeRecord('voice')),
    });
    expect(worker.requests('loadPlaytest')).toHaveLength(0);
    postCastMessage(worker as unknown as Worker, 'voice', { type: 'begin', castRunGeneration: 1 });
    release();
    await vi.waitFor(() => expect(worker.requests('loadPlaytest')).toHaveLength(1));
    expect(control.puts).toHaveLength(1); // Explicit start was already dispatched, not rolled back.
    expect(worker.requests('begin')).toHaveLength(0);
    expect(worker.requests('init')).toHaveLength(1); // Only the read-only preview reached the worker.
  });
  it('does not let obsolete hashing release a newer dispatched claim or its replacement queue', async () => {
    control.state = acceptPersona(control.state, await head());
    control.autoPreflight = true;
    let releaseOld!: () => void, releaseCommit!: () => void;
    let entered = false;
    control.beforeCreate = () => {
      entered = true;
      control.beforeCreate = undefined;
      return new Promise<void>((resolve) => {
        releaseOld = resolve;
      });
    };
    control.beforeBatch = () =>
      new Promise<void>((resolve) => {
        releaseCommit = resolve;
      });
    const worker = new FakeWorker();
    close = bindCastWorker(worker as unknown as Worker, 'voice', lab as never);
    postCastMessage(worker as unknown as Worker, 'voice', { type: 'init', seed: 1, gen: 1 });
    await vi.waitFor(() => expect(entered).toBe(true));
    postCastMessage(worker as unknown as Worker, 'voice', { type: 'init', seed: 1, gen: 2 });
    await vi.waitFor(() => expect(control.batches).toBe(1));
    releaseOld();
    await new Promise((resolve) => setTimeout(resolve, 10));
    postCastMessage(worker as unknown as Worker, 'voice', {
      type: 'loadPlaytest',
      text: JSON.stringify(nativeRecord('voice')),
      gen: 3,
    });
    expect(worker.requests('loadPlaytest')).toHaveLength(0);
    releaseCommit();
    await vi.waitFor(() => expect(worker.requests('loadPlaytest')).toHaveLength(1));
    expect(control.puts).toHaveLength(1);
  });
  it('discards queued old-run controls on replacement and failed CAS', async () => {
    control.state = acceptPersona(control.state, await head());
    const worker = new FakeWorker();
    close = bindCastWorker(worker as unknown as Worker, 'voice', lab as never);
    for (const cancellation of ['load', 'conflict'] as const) {
      control.beforeBatch = undefined;
      control.autoPreflight = false;
      const preflightCount = worker.requests('castPreflight').length;
      postCastMessage(worker as unknown as Worker, 'voice', { type: 'init', seed: 1, gen: 1 });
      postCastMessage(worker as unknown as Worker, 'voice', { type: 'begin', gen: 1 });
      await vi.waitFor(() => expect(worker.requests('castPreflight')).toHaveLength(preflightCount + 1));
      const request = requireValue(worker.requests('castPreflight').at(-1));
      const beforeWrites = control.puts.length;
      if (cancellation === 'load')
        postCastMessage(worker as unknown as Worker, 'voice', {
          type: 'loadPlaytest',
          gen: 2,
          text: JSON.stringify(nativeRecord('voice')),
        });
      if (cancellation === 'conflict')
        control.beforeBatch = async () => {
          const old = requireValue(control.state.revisions.at(-1));
          const { revision, ...body } = old;
          control.state = acceptPersona(
            control.state,
            await createPersona({ ...body, parentRevision: revision }),
          );
        };
      control.autoPreflight = true;
      worker.reply({
        type: 'castReady',
        requestId: request.requestId,
        initials: { 'hf.cast.riza.voice': '{}' },
      });
      await vi.waitFor(() => expect(castState('voice').busy).toBe(false));
      expect(worker.requests('begin')).toHaveLength(0);
      if (cancellation !== 'conflict') expect(control.puts).toHaveLength(beforeWrites);
    }
  });
  it('starts two histories together without a separate recording-epoch gate', async () => {
    const people = await Promise.all([head(), head('hf.cast.osman.voice')]);
    control.state = acceptPersonaBatch(control.state, people);
    control.allowed.add(`${requireValue(people[0]).castId}/${requireValue(people[0]).branchId}`);
    const worker = new FakeWorker();
    await begin(worker);
    const init = requireValue(worker.requests('init')[0]);
    expect(
      Object.keys(requireValue((init.castChapter as import('./cast-chapter.ts').CastChapter).people)),
    ).toHaveLength(2);
    expect(control.puts).toHaveLength(2);
    expect(lab.allowPersonaRecording).toHaveBeenLastCalledWith(true);
    expect(control.key).toMatch(/^cast-group-/);
  });
  it('a stale second parent mutates neither head and exposes working fresh-local startup recovery', async () => {
    const people = await Promise.all([head(), head('hf.cast.osman.voice')]);
    control.state = acceptPersonaBatch(control.state, people);
    let before: PersonaShelfState | undefined;
    control.beforeBatch = async () => {
      const p = requireValue(people[1]);
      const { revision, ...body } = p;
      control.state = acceptPersona(
        control.state,
        await createPersona({
          ...body,
          parentRevision: revision,
          transfer: { ...body.transfer, changed: true },
        }),
      );
      before = structuredClone(control.state);
    };
    const worker = new FakeWorker();
    await begin(worker);
    expect(control.state).toEqual(before);
    expect(worker.requests('init')).toHaveLength(0);
    expect(castState('voice').blocked).toBe(true);
    const { renderToStaticMarkup } = await import('react-dom/server');
    const { createElement } = await import('react');
    const { CastStartGate } = await import('./CastMenu.tsx');
    expect(renderToStaticMarkup(createElement(CastStartGate, { game: 'voice' }))).toContain(
      'Start this game with local people',
    );
    startCastFresh('voice');
    await vi.waitFor(() => expect(worker.requests('init')).toHaveLength(1));
    expect(worker.requests('init')[0]?.castChapter).toBeUndefined();
    expect(control.state).toEqual(before);
    expect(control.enabled).toBe(true);
    const other = new FakeWorker();
    const unbind = bindCastWorker(other as unknown as Worker, 'watch', lab as never);
    postCastMessage(other as unknown as Worker, 'watch', { type: 'init', seed: 2, gen: 1 });
    await vi.waitFor(() => expect(other.requests('init')).toHaveLength(1));
    expect(control.enabled).toBe(true);
    unbind();
  });
  it('starts around a dead person and preserves their head through checkpoint and local reload', async () => {
    const { closePersonaBranch } = await import('@adam0white/lab-client');
    const alive = await head('hf.cast.hacer.voice');
    const dead = await closePersonaBranch(alive, alive.source, 1);
    control.state = acceptPersona(acceptPersona(control.state, alive), dead);
    const eligible = await head();
    control.state = acceptPersona(control.state, eligible);
    const worker = new FakeWorker();
    await begin(worker);
    expect(worker.requests('init')).toHaveLength(1);
    expect(castState('voice').blocked).toBe(false);
    expect(castState('voice').line).toContain('Hacer could not carry over');
    expect(castState('voice').localNotice).toContain('Hacer could not carry over');
    expect(control.puts.map((p) => p.castId)).toEqual([eligible.castId]);
    selectCast('voice', dead.castId);
    await checkpointCast('voice');
    expect(worker.requests('castCheckpoint')).toHaveLength(0);
    expect(control.state.heads[dead.castId]).toBe(dead.revision);
    postCastMessage(worker as unknown as Worker, 'voice', {
      type: 'load',
      gen: 2,
      text: JSON.stringify({ castSkipped: [dead.castId] }),
    });
    await vi.waitFor(() => expect(castState('voice').busy).toBe(false));
    await checkpointCast('voice');
    expect(worker.requests('castCheckpoint')).toHaveLength(0);
  });
  it('restores Watch local-only identities from the native ownership reply', async () => {
    const worker = new FakeWorker();
    close = bindCastWorker(worker as unknown as Worker, 'watch', lab as never);
    postCastMessage(worker as unknown as Worker, 'watch', { type: 'load', id: 'local:auto', gen: 4 });
    worker.reply({
      type: 'castReady',
      requestId: 0,
      gen: 4,
      ownership: {},
      localOnly: true,
      skipped: [],
      sources: {},
      authority: { format: 'site-cast-authority/1', mode: 'local', expectedHeads: {}, denied: [] },
    });
    await vi.waitFor(() => expect(castState('watch').localNotice).toContain('This game uses local people'));
    selectCast('watch', 'hf.cast.kian.watch');
    await checkpointCast('watch');
    expect(worker.requests('castCheckpoint')).toHaveLength(0);
    expect(control.enabled).toBe(true);
  });
  it('an allocated person created during preflight conflicts with the expected-absent parent', async () => {
    const first = await head();
    control.state = acceptPersona(control.state, first);
    control.beforeBatch = async () => {
      control.state = acceptPersona(control.state, await head('hf.cast.osman.voice'));
    };
    const worker = new FakeWorker();
    await begin(worker);
    expect(worker.requests('init')).toHaveLength(0);
    expect(control.puts).toHaveLength(0);
    expect(control.state.heads[first.castId]).toBe(first.revision);
  });
  it('checks the entire expected-absent cast even when there are no existing claims', async () => {
    control.beforeBatch = async () => {
      control.state = acceptPersona(control.state, await head());
    };
    const worker = new FakeWorker();
    await begin(worker);
    expect(worker.requests('init')).toHaveLength(0);
    expect(control.puts).toHaveLength(0);
    expect(castState('voice').blocked).toBe(true);
  });
  it('a recording choice during startup cannot cancel or strand the pending whole-cast init', async () => {
    control.state = acceptPersona(control.state, await head());
    const worker = new FakeWorker();
    close = bindCastWorker(worker as unknown as Worker, 'voice', lab as never);
    control.autoPreflight = true;
    postCastMessage(worker as unknown as Worker, 'voice', { type: 'init', seed: 1, gen: 1 });
    await chooseCastRecording('voice', true);
    await vi.waitFor(() => expect(worker.requests('init')).toHaveLength(1));
    expect(castState('voice').busy).toBe(false);
  });
  it('publishes checkpoints without obsolete recording RPCs', async () => {
    control.rejectRecording = true;
    const worker = new FakeWorker();
    await begin(worker);
    const before = control.puts.length;
    await checkpoint(worker);
    expect(control.puts.length).toBe(before + 1);
    expect(control.requests).not.toContain('recording');
    expect(control.requests).not.toContain('recordingBatch');
    expect(castState('voice').status).toContain('saved for another chapter');
  });
  it('local reload restores the last accepted receipt while a later competing claim still conflicts', async () => {
    control.state = acceptPersona(control.state, await head());
    const worker = new FakeWorker();
    await begin(worker);
    await checkpoint(worker);
    const file: {
      kind: string;
      game: string;
      hash: string;
      castOwnership?: Record<string, PersonaEnvelope>;
    } = {
      kind: 'human-playtest',
      game: 'voice',
      hash: 'unchanged-simulation-hash',
    };
    worker.reply({ type: 'playtest', gen: 1, file });
    const saved = JSON.stringify(file);
    const accepted = requireValue(requireValue(file.castOwnership)['hf.cast.riza.voice']);
    postCastMessage(worker as unknown as Worker, 'voice', {
      type: 'loadPlaytest',
      gen: 2,
      text: saved,
      local: true,
    });
    await vi.waitFor(() => expect(worker.requests('loadPlaytest').length).toBeGreaterThan(0));
    worker.reply({ type: 'replayed', gen: 2, result: { matches: true } });
    await vi.waitFor(() =>
      expect(worker.requests('castOwnership').at(-1)?.heads).toEqual(file.castOwnership),
    );
    await vi.waitFor(() => expect(castState('voice').busy).toBe(false));
    await checkpoint(worker);
    expect(control.puts.at(-1)?.parentRevision).toBe(accepted.revision);
    expect(file.hash).toBe('unchanged-simulation-hash');
    const current = requireValue(control.puts.at(-1));
    const { revision, ...body } = current;
    control.state = acceptPersona(
      control.state,
      await createPersona({
        ...body,
        parentRevision: revision,
        transfer: { ...body.transfer, otherHost: true },
      }),
    );
    const before = structuredClone(control.state);
    await checkpoint(worker);
    expect(control.state).toEqual(before);
    expect(castState('voice').status).toMatch(/Another chapter owns/);
  });
  it('a worker terminal receipt closes the owned branch and a stale source cannot reopen it', async () => {
    const p = await head('hf.cast.tamar.watch');
    control.state = acceptPersona(control.state, p);
    const worker = new FakeWorker();
    await begin(worker, 'watch');
    const terminal = { castId: p.castId, kind: 'dead', at: 1 };
    worker.reply({ type: 'castReady', requestId: 0, gen: 1, terminal });
    await vi.waitFor(() => expect(control.puts.at(-1)?.terminal?.kind).toBe('dead'));
    const closed = requireValue(control.puts.at(-1));
    expect(() => preparePersonaLife(closed, 3600000)).toThrow(/closed/);
    const { revision: _revision, ...body } = p;
    const stale = await createPersona({ ...body, parentRevision: closed.revision });
    expect(() => acceptPersona(control.state, stale)).toThrow(/closed/);
  });
  it('pins manual source selection across worker/hash awaits', async () => {
    const worker = new FakeWorker();
    close = bindCastWorker(worker as unknown as Worker, 'voice', lab as never);
    await emptyAdmission(worker);
    selectCast('voice', 'hf.cast.riza.voice');
    const saving = checkpointCast('voice');
    await vi.waitFor(() => expect(worker.requests('castCheckpoint')).toHaveLength(1));
    selectCast('voice', 'hf.cast.osman.voice');
    worker.reply({
      type: 'castReady',
      requestId: worker.requests('castCheckpoint')[0]?.requestId,
      ...(await capture()),
    });
    await saving;
    expect(control.puts.map((p) => p.castId)).toEqual(['hf.cast.riza.voice']);
  });
  it('cancels prior pending source capture and keeps a dedicated return prefix out of automatic authoring', async () => {
    const worker = new FakeWorker();
    close = bindCastWorker(worker as unknown as Worker, 'voice', lab as never);
    await emptyAdmission(worker);
    const saving = checkpointCast('voice');
    await vi.waitFor(() => expect(worker.requests('castCheckpoint')).toHaveLength(1));
    const old = requireValue(worker.requests('castCheckpoint')[0]);
    postCastMessage(worker as unknown as Worker, 'voice', { type: 'init', gen: 2, selinReturn: {} });
    worker.reply({
      type: 'castReady',
      requestId: old.requestId,
      gen: 1,
      transfer: { sourceRole: 'selin', engine: '2.17.0' },
    });
    await saving;
    worker.reply({ type: 'frame', gen: 2, frame: { day: 1, phase: 'day' } });
    worker.reply({ type: 'frame', gen: 2, frame: { day: 1, phase: 'between' } });
    await Promise.resolve();
    expect(control.puts).toHaveLength(0);
    expect(worker.requests('castCheckpoint')).toHaveLength(1);
  });
  it('generic imported-file recording gate survives dedicated Selin file completion', async () => {
    const worker = new FakeWorker();
    close = bindCastWorker(worker as unknown as Worker, 'voice', lab as never);
    postCastMessage(worker as unknown as Worker, 'voice', {
      type: 'loadPlaytest',
      text: JSON.stringify(nativeRecord('voice')),
      gen: 2,
    });
    await vi.waitFor(() => expect(worker.requests('loadPlaytest')).toHaveLength(1));
    const key = control.key;
    const voice = await import('../voice/ui/persona.tsx');
    await voice.gateVoiceFile('{}');
    voice.settleVoiceFileGate(true);
    expect(control.key).toBe(key);
    expect(key).toMatch(/^cast-file-/);
  });
  it('requests actual eligible-source checkpoints at chapter and hidden boundaries, not partial frames', async () => {
    const worker = new FakeWorker();
    close = bindCastWorker(worker as unknown as Worker, 'voice', lab as never);
    await emptyAdmission(worker);
    control.refuse = true;
    worker.reply({ type: 'frame', frame: { day: 1, phase: 'day', minute: 300 } });
    worker.reply({ type: 'frame', frame: { minute: 301 } });
    expect(worker.requests('castCheckpoint')).toHaveLength(0);
    worker.reply({ type: 'frame', frame: { day: 1, phase: 'between' } });
    await vi.waitFor(() => expect(worker.requests('castCheckpoint')).toHaveLength(5));
    await vi.waitFor(() => expect(castState('voice').busy).toBe(false));
    Object.defineProperty(document, 'visibilityState', { value: 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
    await vi.waitFor(() => expect(worker.requests('castCheckpoint')).toHaveLength(10));
    expect(control.puts).toHaveLength(0);
  });
  it('file replacement clears pending startup controls while recording preferences do not', async () => {
    const worker = new FakeWorker();
    close = bindCastWorker(worker as unknown as Worker, 'well', lab as never);
    postCastMessage(worker as unknown as Worker, 'well', { type: 'init', seed: 1, gen: 1 });
    expect(castState('well').busy).toBe(true);
    postCastMessage(worker as unknown as Worker, 'well', {
      type: 'loadPlaytest',
      gen: 2,
      text: JSON.stringify(nativeRecord('well')),
    });
    await vi.waitFor(() => expect(castState('well').busy).toBe(false));
    postCastMessage(worker as unknown as Worker, 'well', { type: 'init', seed: 1, gen: 3 });
    window.dispatchEvent(new Event('hf-lab-preference'));
    expect(castState('well').busy).toBe(true);
  });
});

it('uncertified peer admission preserves the real HF4 source head without preflight', async () => {
  const parent = await head();
  control.state = acceptPersona(control.state, parent);
  const worker = new FakeWorker();
  await begin(worker);
  expect(control.puts).toEqual([]);
  expect(control.state.heads[parent.castId]).toBe(parent.revision);
  expect(worker.requests('castPreflight')).toHaveLength(0);
  expect(castState('voice').localNotice).toContain('could not carry over');
  const { claimPortablePerson } = await import('@adam0white/lab-client');
  expect(() => claimPortablePerson(parent, 'voice')).toThrow(/read-only.*hearsay/);
});

it('native phase, hidden and pagehide checkpoints publish real bound source journals and accepted parents', async () => {
  control.transportAdmission = true;
  const storage = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  });
  control.state = acceptPersona(control.state, await head());
  const worker = new FakeWorker();
  await begin(worker);
  const captured = await capture();
  const raw = captured.sourceSnapshot;
  worker.reply({ type: 'frame', gen: 1, frame: { day: 1, phase: 'day', minute: 400 } });
  const id = 'hf.cast.riza.voice';
  const triggers = [
    () => worker.reply({ type: 'frame', gen: 1, frame: { day: 1, phase: 'between' } }),
    () => {
      Object.defineProperty(document, 'visibilityState', { value: 'hidden' });
      document.dispatchEvent(new Event('visibilitychange'));
    },
    () => window.dispatchEvent(new Event('pagehide')),
  ];
  for (let n = 0; n < triggers.length; n++) {
    const prior = control.puts.at(-1)?.revision;
    const puts = control.puts.length;
    requireValue(triggers[n])();
    await vi.waitFor(() => expect(worker.requests('castCheckpoint')).toHaveLength(n + 1));
    worker.reply({
      type: 'castReady',
      gen: 1,
      requestId: requireValue(worker.requests('castCheckpoint').at(-1)).requestId,
      ...captured,
    });
    await vi.waitFor(() => expect(control.puts).toHaveLength(puts + 1));
    await vi.waitFor(() => expect(castState('voice').busy).toBe(false));
    expect(control.puts.at(-1)?.parentRevision).toBe(prior);
    expect(JSON.parse(requireValue(storage.get('hf-cast-source:voice')))).toEqual({ [id]: raw });
  }
});

it('file entry has no Shelf construction and rejects native actions before access', async () => {
  vi.resetModules();
  Object.assign(window, { location: { pathname: '/watch/', search: '?file=1' } });
  const before = control.channels;
  const runtime = await import('./cast-runtime.ts');
  expect(control.channels).toBe(before);
  expect(runtime.sitePersonaShelf).toBeUndefined();
  const worker = { postMessage: vi.fn(), addEventListener: vi.fn() } as unknown as Worker;
  const stop = runtime.bindCastWorker(worker, 'watch', lab as never);
  expect(worker.addEventListener).not.toHaveBeenCalled();
  expect(() => runtime.setCastEnabled(true)).toThrow(/file/i);
  expect(() => runtime.startCastFresh('watch')).toThrow(/file/i);
  await expect(runtime.checkpointCast('watch')).rejects.toThrow(/file/i);
  expect(control.channels).toBe(before);
  const valid = new TextEncoder().encode('{"full":"native"}');
  expect(await runtime.readGameFile({ arrayBuffer: async () => valid.buffer } as File)).toBe(
    '{"full":"native"}',
  );
  const bom = new Uint8Array([0xef, 0xbb, 0xbf, ...valid]);
  await expect(runtime.readGameFile({ arrayBuffer: async () => bom.buffer } as File)).rejects.toThrow();
  const invalid = new Uint8Array([0xff, 0xfe]);
  await expect(runtime.readGameFile({ arrayBuffer: async () => invalid.buffer } as File)).rejects.toThrow();
  stop();
});

it('refuses missing or malformed native authority before worker activation, capture, fork or recording (unit transport)', async () => {
  const worker = new FakeWorker();
  close = bindCastWorker(worker as unknown as Worker, 'voice', lab as never);
  control.refuse = true;
  lab.allowPersonaRecording.mockClear();
  for (const record of [
    { castOwnership: {} },
    { castOwnership: {}, castSources: {}, castLocalOnly: false, castSkipped: ['unknown'] },
    { castOwnership: {}, castSources: {}, castLocalOnly: false, castSkipped: [], castAuthority: {} },
  ]) {
    postCastMessage(worker as unknown as Worker, 'voice', {
      type: 'loadPlaytest',
      gen: 71,
      local: true,
      text: JSON.stringify(record),
    });
    await vi.waitFor(() => expect(castState('voice').busy).toBe(false));
    expect(worker.requests('loadPlaytest')).toHaveLength(0);
    expect(await checkpointCast('voice')).toBe(false);
    expect(await checkpointCast('voice', true)).toBe(false);
    worker.reply({
      type: 'castReady',
      gen: 71,
      requestId: 0,
      terminal: { castId: 'hf.cast.hacer.voice', at: 1 },
    });
    expect(worker.requests('castCheckpoint')).toHaveLength(0);
    expect(control.requests).toEqual([]);
    expect(lab.allowPersonaRecording).not.toHaveBeenCalled();
  }
});

it('reports a malformed native load without replacing authority or touching the worker, then accepts a valid load and fresh start (unit transport)', async () => {
  control.transportAdmission = true;
  const worker = new FakeWorker();
  const refused = vi.fn();
  close = bindCastWorker(worker as unknown as Worker, 'voice', lab as never, refused);
  await emptyAdmission(worker);
  const before: Record<string, unknown> = {
    kind: 'human-playtest',
    game: 'voice',
    hash: 'unchanged-local-state',
  };
  worker.reply({ type: 'playtest', gen: 1, file: before });
  const bytes = JSON.stringify(before),
    key = control.key;
  const messages = worker.sent.length,
    requests = control.requests.length;
  lab.allowPersonaRecording.mockClear();
  postCastMessage(worker as unknown as Worker, 'voice', {
    type: 'loadPlaytest',
    gen: 2,
    local: true,
    text: JSON.stringify({ ...before, castAuthority: undefined }),
  });
  await vi.waitFor(() => expect(refused).toHaveBeenCalledOnce());
  expect(worker.sent).toHaveLength(messages);
  expect(control.requests).toHaveLength(requests);
  expect(lab.allowPersonaRecording).not.toHaveBeenCalled();
  expect(control.key).toBe(key);
  const after: Record<string, unknown> = {
    kind: 'human-playtest',
    game: 'voice',
    hash: 'unchanged-local-state',
  };
  worker.reply({ type: 'playtest', gen: 1, file: after });
  expect(JSON.stringify(after)).toBe(bytes);
  postCastMessage(worker as unknown as Worker, 'voice', {
    type: 'loadPlaytest',
    gen: 3,
    local: true,
    text: bytes,
  });
  await vi.waitFor(() => expect(worker.requests('loadPlaytest')).toHaveLength(1));
  worker.reply({ type: 'replayed', gen: 3, result: { matches: true } });
  await vi.waitFor(() => expect(castState('voice').busy).toBe(false));
  postCastMessage(worker as unknown as Worker, 'voice', { type: 'init', gen: 4, seed: 1 });
  await vi.waitFor(() => expect(castState('voice').busy).toBe(false));
  expect(castState('voice').blocked).toBe(false);
  expect(worker.requests('init').at(-1)?.gen).toBe(4);
});

it('rejects checksum-valid unsupported and foreign native heads before activation but retains supported current ownership (unit transport)', async () => {
  const { claimPortablePerson, closePersonaBranch, validatePersona } = await import('@adam0white/lab-client');
  const { validateCastRecord, canCheckpoint } = await import('./cast-authority.ts');
  const id = 'hf.cast.kian.watch';
  const captured = await capture(id, 'watch');
  const authored = await createPersona({
    format: 'hf-persona/1',
    castId: id,
    castRevision: '1',
    branchId: 'r3-owner',
    parentRevision: null,
    source: { game: 'watch', engine: FRAMEWORK_PACKAGE_VERSION, build: 'control', rules: 'hf4-cast-1' },
    transfer: captured.transfer,
    limitations: [],
  });
  const { revision, ...body } = authored;
  const own = await createPersona({
    ...body,
    parentRevision: revision,
    transfer: claimPortablePerson(authored, 'watch'),
  });
  const foreign = await createPersona({
    ...body,
    parentRevision: revision,
    transfer: claimPortablePerson(authored, 'warren'),
  });
  const unsupported = await createPersona({
    ...body,
    source: { ...body.source, game: 'repair' },
    transfer: { portableClaim: { game: 'repair' } },
  });
  const worker = new FakeWorker(),
    refused = vi.fn();
  close = bindCastWorker(worker as unknown as Worker, 'watch', lab as never, refused);
  lab.allowPersonaRecording.mockClear();
  for (const head of [unsupported, foreign]) {
    expect(await validatePersona(head)).toEqual(head);
    const raw = nativeRecord('watch', { [id]: head });
    postCastMessage(worker as unknown as Worker, 'watch', {
      type: 'loadPlaytest',
      gen: 2,
      local: true,
      text: JSON.stringify(raw),
    });
    await vi.waitFor(() => expect(castState('watch').busy).toBe(false));
    expect(worker.sent).toEqual([]);
    expect(control.requests).toEqual([]);
    expect(lab.allowPersonaRecording).not.toHaveBeenCalled();
    expect(control.key).toBeNull();
  }
  expect(refused).toHaveBeenCalledTimes(2);
  // A file can retain the original foreign receipt without acquiring native authority.
  const { checkGameFile } = await import('./file-sources.ts');
  const foreignFile = { game: 'the-night-watch', ...nativeRecord('watch', { [id]: foreign }) };
  const originalFile = JSON.stringify(foreignFile);
  await checkGameFile(originalFile);
  expect(JSON.stringify(foreignFile)).toBe(originalFile);
  await expect(validateCastRecord('watch', foreignFile)).rejects.toThrow();
  for (const head of [authored, own]) {
    const record = await validateCastRecord('watch', nativeRecord('watch', { [id]: head }));
    expect(canCheckpoint(record.authority, id, record.heads)).toBe(true);
  }
  // Public constructors also preserve an arrival whose supported source is another host.
  const otherCapture = await capture(id, 'warren');
  const otherSource = await createPersona({
    ...body,
    source: { ...body.source, game: 'warren' },
    transfer: otherCapture.transfer,
  });
  const { revision: otherRevision, ...otherBody } = otherSource;
  const arrival = await createPersona({
    ...otherBody,
    parentRevision: otherRevision,
    transfer: claimPortablePerson(otherSource, 'watch'),
  });
  const arrived = await validateCastRecord('watch', nativeRecord('watch', { [id]: arrival }));
  expect(canCheckpoint(arrived.authority, id, arrived.heads)).toBe(true);
  const closedArrival = await closePersonaBranch(arrival, authored.source, 1);
  const retained = await validateCastRecord('watch', nativeRecord('watch', { [id]: closedArrival }));
  expect(retained.heads[id]).toEqual(closedArrival);
  expect(canCheckpoint(retained.authority, id, retained.heads)).toBe(false);
  const withoutArchive = nativeRecord('watch', { [id]: authored });
  withoutArchive.castSources = {};
  await expect(validateCastRecord('watch', withoutArchive)).rejects.toThrow();
  const terminal = await closePersonaBranch(authored, authored.source, 1);
  const closed = await validateCastRecord('watch', nativeRecord('watch', { [id]: terminal }));
  expect(closed.heads[id]).toEqual(terminal);
  expect(canCheckpoint(closed.authority, id, closed.heads)).toBe(false);
});

it('keeps native public imports nonowning through export, reimport and local reload', async () => {
  const { localCastAuthority, validateCastRecord } = await import('./cast-authority.ts');
  for (const game of ['voice', 'well']) {
    const worker = new FakeWorker();
    close = bindCastWorker(worker as unknown as Worker, game, lab as never);
    let file: Record<string, unknown> = {
      game: game === 'well' ? 'colony' : 'voice',
      kind: 'human-playtest',
      ...nativeRecord(game),
    };
    for (const [index, local] of [false, false, true].entries()) {
      postCastMessage(worker as unknown as Worker, game, {
        type: 'loadPlaytest',
        text: JSON.stringify(file),
        gen: index + 2,
        local,
      });
      await vi.waitFor(() => expect(worker.requests('loadPlaytest')).toHaveLength(index + 1));
      worker.reply({ type: 'replayed', gen: index + 2, result: { matches: true } });
      await vi.waitFor(() => expect(castState(game).busy).toBe(false));
      postCastMessage(worker as unknown as Worker, game, {
        type: 'input',
        input: { k: 'test-only-bridge-input' },
      });
      const next = { game: file.game, kind: 'human-playtest' };
      worker.reply({ type: 'playtest', gen: index + 2, file: next });
      file = JSON.parse(JSON.stringify(next));
      expect(file.castAuthority).toEqual(localCastAuthority());
      expect(file.castOwnership).toEqual({});
      expect(file.castSources).toEqual({});
      expect(file.fileImport).toMatchObject({
        imported: true,
        sourceHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      });
      await expect(validateCastRecord(game, file)).resolves.toMatchObject({
        authority: localCastAuthority(),
        heads: {},
        sources: {},
      });
      expect(castState(game).localNotice).toContain('opened from a file');
      expect(await checkpointCast(game)).toBe(false);
      expect(await checkpointCast(game, true)).toBe(false);
    }
    expect(worker.requests('castPreflight')).toHaveLength(0);
    expect(worker.requests('castCheckpoint')).toHaveLength(0);
    close();
    close = undefined;
  }
  expect(control.puts).toEqual([]);
  expect(control.allowed.size).toBe(0);
});

// C86 controls: a genuine accepted Voice Continue, with only the receipt-hashing crypto delayed or failed.
let voiceWorkerReceive: ((event: MessageEvent) => void) | undefined;
async function acceptedVoice(heads: Record<string, PersonaEnvelope>) {
  const { VoiceGame } = await import('../voice/sim/game.ts');
  const { RecordedGame, voiceHash, voiceState } = await import('../voice/sim/record.ts');
  const { makePlaytestFile } = await import('./playtest.ts');
  const rec = new RecordedGame(new VoiceGame(11, 4));
  rec.apply({ type: 'begin' });
  rec.apply({ type: 'pause' });
  const file = {
    ...(await makePlaytestFile({
      game: 'voice',
      seed: 11,
      scenario: 'voice-4',
      minute: rec.game.t,
      log: rec.log,
      hash: voiceHash(rec.game),
      engine: requireValue(rec.game.run.c.runtime).save().archive.engine.package,
      snapshot: voiceState(rec.game),
      plainSnapshot: true,
    })),
    voiceEdition: 'voice-hf4/1',
    ...nativeRecord('voice', heads),
  };
  const replies: Record<string, unknown>[] = [];
  vi.stubGlobal('addEventListener', (_: string, callback: typeof voiceWorkerReceive) => {
    voiceWorkerReceive = callback;
  });
  vi.stubGlobal('postMessage', (message: Record<string, unknown>) => replies.push(message));
  await import('../voice/worker.ts');
  requireValue(voiceWorkerReceive)({
    data: { type: 'loadPlaytest', gen: 2, local: true, text: JSON.stringify(file) },
  } as MessageEvent);
  await vi.waitFor(() => expect(replies.some((r) => r.type === 'replayed')).toBe(true));
  const accepted = requireValue(replies.find((r) => r.type === 'replayed'));
  expect(accepted.result).toMatchObject({ matches: true, hash: file.hash, expected: file.hash, driftAt: -1 });
  return { text: JSON.stringify(file), accepted };
}
async function continueVoice(
  rejectLoad?: (failure: { gen: number; message: string }) => void,
  requestFreshStart?: (gen: number) => void,
) {
  const id = 'hf.cast.riza.voice';
  const { text, accepted } = await acceptedVoice({ [id]: await head(id) });
  const worker = new FakeWorker();
  close = bindCastWorker(worker as unknown as Worker, 'voice', lab as never, rejectLoad, requestFreshStart);
  postCastMessage(worker as unknown as Worker, 'voice', { type: 'init', seed: 1, gen: 1, castPreview: true });
  postCastMessage(worker as unknown as Worker, 'voice', { type: 'loadPlaytest', gen: 2, local: true, text });
  await vi.waitFor(() => expect(worker.requests('loadPlaytest')).toHaveLength(1));
  return { worker, accepted };
}

it('C86-1: an accepted Continue holds the autosave export and resume until ownership settles, then sends them', async () => {
  const { worker, accepted } = await continueVoice();
  const digest = crypto.subtle.digest.bind(crypto.subtle);
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  const spy = vi.spyOn(crypto.subtle, 'digest').mockImplementation(async (...args) => {
    await held;
    return digest(...args);
  });
  try {
    worker.reply(accepted);
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    // useVoice has accepted generation 2 here; its first loaded frame asks for an autosave.
    expect(castState('voice').busy).toBe(true);
    postCastMessage(worker as unknown as Worker, 'voice', { type: 'exportPlaytest' });
    postCastMessage(worker as unknown as Worker, 'voice', { type: 'resume', castRunGeneration: 2 });
    postCastMessage(worker as unknown as Worker, 'voice', { type: 'resume', castRunGeneration: 1 });
    expect(worker.requests('exportPlaytest')).toHaveLength(0);
    release();
    await vi.waitFor(() => expect(castState('voice').busy).toBe(false));
    expect(worker.requests('exportPlaytest')).toHaveLength(1);
    expect(worker.requests('resume')).toHaveLength(1);
  } finally {
    release();
    spy.mockRestore();
  }
});

it('C86-2: a receipt failure after an accepted Continue clears busy, refuses the save plainly and blocks shelf writes', async () => {
  const rejectLoad = vi.fn();
  const { worker, accepted } = await continueVoice(rejectLoad);
  const spy = vi.spyOn(crypto.subtle, 'digest').mockRejectedValue(new Error('receipt digest failed'));
  try {
    worker.reply(accepted);
    await vi.waitFor(() => expect(rejectLoad).toHaveBeenCalledTimes(1));
    const failure = rejectLoad.mock.calls[0]?.[0] as { gen: number; message: string };
    expect(failure.gen).toBe(2);
    expect(failure.message).toMatch(/could not be restored.*Start a fresh game/);
    expect(castState('voice')).toMatchObject({ busy: false, status: failure.message });
    postCastMessage(worker as unknown as Worker, 'voice', { type: 'resume', castRunGeneration: 2 });
    expect(worker.requests('resume')).toHaveLength(0);
  } finally {
    spy.mockRestore();
  }
});

it('C86-2: a receipt failure from a replaced Continue does not touch the new chapter', async () => {
  const rejectLoad = vi.fn();
  const { worker, accepted } = await continueVoice(rejectLoad);
  let fail!: () => void;
  const failing = new Promise<never>((_, reject) => {
    fail = () => reject(new Error('receipt digest failed'));
  });
  const spy = vi.spyOn(crypto.subtle, 'digest').mockReturnValue(failing);
  try {
    worker.reply(accepted);
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    postCastMessage(worker as unknown as Worker, 'voice', {
      type: 'init',
      seed: 3,
      gen: 3,
      castPreview: true,
    });
    const status = castState('voice').status;
    fail();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    expect(rejectLoad).not.toHaveBeenCalled();
    expect(castState('voice')).toMatchObject({ busy: false, status });
  } finally {
    spy.mockRestore();
  }
});

// C88 controls: the same genuine accepted Continue whose ownership restore is refused.
async function refusedContinue(requestFreshStart?: (gen: number) => void) {
  const { worker, accepted } = await continueVoice(vi.fn(), requestFreshStart);
  const spy = vi.spyOn(crypto.subtle, 'digest').mockRejectedValue(new Error('receipt digest failed'));
  try {
    worker.reply(accepted);
    await vi.waitFor(() => expect(castState('voice')).toMatchObject({ busy: false, blocked: true }));
  } finally {
    spy.mockRestore();
  }
  return worker;
}

it('C88-1: a refused restore keeps no authority, so a checkpoint cannot reach the shelf', async () => {
  const worker = await refusedContinue();
  selectCast('voice', 'hf.cast.riza.voice');
  const saved = checkpointCast('voice');
  // Answer a checkpoint request with a real bound HF receipt if one is (wrongly) sent.
  await vi
    .waitFor(() => expect(worker.requests('castCheckpoint')).toHaveLength(1), { timeout: 300 })
    .catch(() => {});
  const request = worker.requests('castCheckpoint').at(-1);
  if (request) worker.reply({ type: 'castReady', requestId: request.requestId, ...(await capture()) });
  expect(await saved).toBe(false);
  expect(worker.requests('castCheckpoint')).toHaveLength(0);
  expect(control.puts).toEqual([]);
});

it('C88-2: after a refused restore, the fresh-start button starts a new local game through the page', async () => {
  let worker: FakeWorker | undefined;
  const requestFreshStart = vi.fn((gen: number) =>
    postCastMessage(requireValue(worker) as unknown as Worker, 'voice', {
      type: 'init',
      seed: 1,
      gen: gen + 1,
      castFresh: true,
    }),
  );
  worker = await refusedContinue(requestFreshStart);
  const inits = worker.requests('init').length;
  startCastFresh('voice'); // The CastStartGate button.
  expect(requestFreshStart).toHaveBeenCalledWith(2);
  expect(worker.requests('init')).toHaveLength(inits + 1);
  expect(worker.requests('init').at(-1)).toEqual({ type: 'init', seed: 1, gen: 3 });
  expect(castState('voice')).toMatchObject({ busy: false, blocked: false });
  expect(control.puts).toEqual([]);
});
