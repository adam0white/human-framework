import type { PersonaEnvelope, PersonaShelfState } from '@adam0white/lab-client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const control = vi.hoisted(() => ({
  state: { heads: {}, revisions: [] } as PersonaShelfState,
  puts: [] as PersonaEnvelope[],
  batches: 0,
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
    personaChannel: () => ({
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
          return (control.state.revisions.find((p) => p.revision === control.state.heads[r.castId!]) ??
            null) as T;
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
          control.state = actual.acceptPersonaBatch(control.state, r.envelopes!, r.expectedHeads);
          control.puts.push(...r.envelopes!);
          return r.envelopes as T;
        }
        if (r.action === 'put') {
          control.state = actual.acceptPersona(control.state, r.envelope!, r.fork);
          control.puts.push(r.envelope!);
          if (r.authored) control.allowed.add(`${r.envelope!.castId}/${r.envelope!.branchId}`);
          return r.envelope as T;
        }
        if (r.action === 'recordingBatch') {
          if (r.allowRecording !== undefined)
            for (const p of r.envelopes!) {
              const key = `${p.castId}/${p.branchId}`;
              if (r.allowRecording) control.allowed.add(key);
              else control.allowed.delete(key);
            }
          return {
            sameEpoch: r.envelopes!.every((p) => control.allowed.has(`${p.castId}/${p.branchId}`)),
            recordingEpoch: 'epoch',
            revisions: r.envelopes!.map((p) => p.revision),
          } as T;
        }
        if (r.action === 'recording') return { recordingEpoch: 'epoch', sameEpoch: false } as T;
        return null as T;
      },
    }),
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
            Object.keys((m.chapter as import('./cast-chapter.ts').CastChapter).people!).map((id) => [
              id,
              '{}',
            ]),
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
async function head(id = 'hf.cast.riza.voice') {
  const branchId = `control-${id.split('.')[2]}`;
  return createPersona({
    format: 'hf-persona/1',
    castId: id,
    castRevision: '1',
    branchId,
    parentRevision: null,
    source: {
      game: id.endsWith('.watch') ? 'watch' : 'voice',
      engine: '2.17.0',
      build: 'control',
      rules: 'cast-1',
    },
    transfer: {
      castPassport: 'site-cast/1',
      sourceRole: id.split('.')[2],
      life: initialPersonaLife(id, branchId, 0),
      acquired: id,
    },
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
  const request = worker.requests('castCheckpoint').at(-1)!;
  worker.reply({
    type: 'castReady',
    requestId: request.requestId,
    transfer: { sourceRole: id.split('.')[2], engine: '2.17.0', acquired: id },
  });
  await promise;
}
describe('whole-cast browser continuity', () => {
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

  it('accepts the actual Watch night frame with no daytime summary', async () => {
    const { WatchRun } = await import('../watch/sim/run.ts');
    const { buildFrame } = await import('../watch/sim/view.ts');
    const run = new WatchRun(4242);
    run.input({ k: 'start' });
    run.input({ k: 'begin' });
    const frame = buildFrame(run.state, 0, false);
    expect(frame.day).toBeNull();
    const worker = new FakeWorker();
    const listeners = vi.spyOn(worker, 'addEventListener');
    close = bindCastWorker(worker as unknown as Worker, 'watch', lab as never);
    const receive = listeners.mock.calls.find(([type]) => type === 'message')?.[1] as EventListener;
    // Invoke the registered handler directly so EventTarget cannot defer a thrown error.
    expect(() => receive(new MessageEvent('message', { data: { type: 'frame', frame } }))).not.toThrow();
  });

  it('retains object and numeric day extraction for Voice checkpoint boundaries', async () => {
    const worker = new FakeWorker();
    close = bindCastWorker(worker as unknown as Worker, 'voice', lab as never);
    worker.reply({ type: 'frame', frame: { phase: 'day', day: { current: 2 } } });
    worker.reply({ type: 'frame', frame: { phase: 'day', day: 2 } });
    expect(worker.requests('castCheckpoint')).toHaveLength(0);
    control.refuse = true;
    worker.reply({ type: 'frame', frame: { phase: 'day', day: { current: 3 } } });
    await vi.waitFor(() => expect(worker.requests('castCheckpoint').length).toBeGreaterThan(0));
  });
  it('verifies full source checksums and keeps raw captures out of shelf envelopes', async () => {
    const storage = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    });
    const { canonicalPersona } = await import('@adam0white/lab-client');
    const worker = new FakeWorker();
    close = bindCastWorker(worker as unknown as Worker, 'voice', lab as never);
    selectCast('voice', 'hf.cast.riza.voice');
    const raw = {
      schema: 1,
      now: 400,
      rng: { a: 1, b: 2, c: 3, d: 4 },
      privateSourceDetail: 'retained only at source',
    };
    const sha256 = Array.from(
      new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonicalPersona(raw)))),
      (b) => b.toString(16).padStart(2, '0'),
    ).join('');
    for (const digest of ['0'.repeat(64), sha256]) {
      const saving = checkpointCast('voice');
      await vi.waitFor(() =>
        expect(worker.requests('castCheckpoint').length).toBeGreaterThan(digest === sha256 ? 1 : 0),
      );
      worker.reply({
        type: 'castReady',
        requestId: worker.requests('castCheckpoint').at(-1)!.requestId,
        sourceSnapshot: raw,
        transfer: {
          castPassport: 'site-cast/1',
          sourceRole: 'riza',
          engine: '2.17.0',
          checkpoint: { schema: raw.schema, sourceMinute: raw.now, rng: raw.rng, sha256: digest },
        },
      });
      await saving;
      expect(control.puts.length).toBe(digest === sha256 ? 1 : 0);
    }
    expect(JSON.stringify(control.puts)).not.toContain('privateSourceDetail');
    expect(JSON.parse(localStorage.getItem('hf-cast-source:voice')!)).toEqual({ 'hf.cast.riza.voice': raw });
  });
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
      text: JSON.stringify({ castOwnership: { [old.castId]: old } }),
    });
    worker.reply({ type: 'replayed', gen: 2, result: { matches: true } });
    await vi.waitFor(() =>
      expect(worker.requests('castOwnership').at(-1)?.heads).toEqual({ [old.castId]: old }),
    );
    expect(control.batches).toBe(0);
    postCastMessage(worker as unknown as Worker, 'voice', {
      type: 'loadPlaytest',
      gen: 3,
      text: JSON.stringify({ castOwnership: { [old.castId]: old } }),
    });
    worker.reply({ type: 'replayed', gen: 3, result: { matches: true } });
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
        text: JSON.stringify({ castOwnership: { [id]: old } }),
      });
      worker.reply({ type: 'replayed', gen: 2, result: { matches: true } });
      await vi.waitFor(() => expect(worker.requests('castOwnership').at(-1)?.heads).toEqual({ [id]: old }));
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
      worker.reply(
        game === 'watch'
          ? { type: 'loaded', gen: 3, ok: false, id: 'missing' }
          : { type: 'playtestError', gen: 3, message: 'bad file' },
      );
      postCastMessage(worker as unknown as Worker, game, { type: 'exportPlaytest', castRunGeneration: 2 });
      expect(worker.requests('exportPlaytest')).toHaveLength(1);
      const file: Record<string, unknown> = { kind: 'human-playtest' };
      worker.reply({ type: 'exported', gen: 2, file });
      expect(file.castOwnership).toEqual({ [id]: old });
      expect(control.batches).toBe(0);
      expect(lab.allowPersonaRecording).toHaveBeenLastCalledWith(true);
    },
  );
  it('queues begin behind actual prepared init and exports a replayable current chapter', async () => {
    const { VoiceGame } = await import('../voice/sim/game.ts');
    const { RecordedGame, replayVoice, voiceHash, voiceSnapshot, validateVoiceLog } = await import(
      '../voice/sim/record.ts'
    );
    const { makePlaytestFile, parsePlaytest, decodeSnapshot } = await import('./playtest.ts');
    const castId = 'hf.cast.riza.voice';
    const parent = await createPersona({
      format: 'hf-persona/1',
      castId,
      castRevision: '1',
      branchId: 'queued-opening',
      parentRevision: null,
      source: { game: 'human', engine: '2.17.0', build: 'control', rules: 'cast-1' },
      transfer: { castPassport: 'authored-cast/1', life: initialPersonaLife(castId, 'queued-opening', 0) },
      limitations: ['Authored opening control; ordinary acquired-state proof is separate.'],
    });
    control.state = acceptPersona(control.state, parent);
    let played: InstanceType<typeof RecordedGame> | undefined;
    class PlayingWorker extends FakeWorker {
      override postMessage(m: Record<string, unknown>) {
        super.postMessage(m);
        if (m.type === 'castPreflight') {
          const chapter = m.chapter as import('./cast-chapter.ts').CastChapter;
          new VoiceGame(1, 4, chapter);
          queueMicrotask(() =>
            this.reply({
              type: 'castReady',
              requestId: m.requestId,
              initials: Object.fromEntries(Object.entries(chapter.people!).map(([id, p]) => [id, p.initial])),
            }),
          );
        }
        if (m.type === 'init')
          played = new RecordedGame(
            new VoiceGame(1, 4, m.castChapter as import('./cast-chapter.ts').CastChapter),
          );
        if (m.type === 'begin') played!.apply({ type: 'begin' });
      }
    }
    const worker = new PlayingWorker();
    close = bindCastWorker(worker as unknown as Worker, 'voice', lab as never);
    postCastMessage(worker as unknown as Worker, 'voice', {
      type: 'init',
      gen: 1,
      seed: 1,
      castPreview: true,
    });
    expect(control.batches).toBe(0);
    postCastMessage(worker as unknown as Worker, 'voice', { type: 'begin', castRunGeneration: 1 });
    for (let n = 0; n < 100; n++)
      postCastMessage(worker as unknown as Worker, 'voice', { type: 'tick', gen: 1, dtMs: 16 });
    postCastMessage(worker as unknown as Worker, 'voice', { type: 'predict', gen: 1, requestId: 50 });
    expect(worker.requests('begin')).toHaveLength(0);
    expect(worker.requests('tick')).toHaveLength(0);
    expect(worker.requests('predict')).toHaveLength(0);
    await vi.waitFor(() => expect(castState('voice').busy).toBe(false));
    expect(played!.game.phase).toBe('day');
    expect(worker.sent.findIndex((m) => m.type === 'init')).toBeLessThan(
      worker.sent.findIndex((m) => m.type === 'begin'),
    );
    played!.step(20);
    const current = played!;
    expect(JSON.stringify(current.log)).not.toContain('castRunGeneration');
    const file = await makePlaytestFile({
      game: 'voice',
      seed: current.game.seed,
      scenario: 'voice-4',
      minute: current.game.t,
      log: current.log,
      hash: voiceHash(current.game),
      engine: '2.17.0',
      snapshot: voiceSnapshot(current.game),
    });
    const parsed = parsePlaytest(JSON.stringify(file), 'voice', 'voice-4', validateVoiceLog);
    const saved = (await decodeSnapshot(parsed)) as { castChapter: import('./cast-chapter.ts').CastChapter };
    const again = replayVoice(parsed.seed, parsed.log, 4, undefined, 0, saved.castChapter);
    expect(voiceHash(again.rec.game)).toBe(parsed.hash);
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
    postCastMessage(worker as unknown as Worker, 'voice', { type: 'loadPlaytest', gen: 2, text: '{}' });
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
    postCastMessage(worker as unknown as Worker, 'voice', { type: 'loadPlaytest', text: '{}', gen: 3 });
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
      const preflightCount = worker.requests('castPreflight').length;
      postCastMessage(worker as unknown as Worker, 'voice', { type: 'init', seed: 1, gen: 1 });
      postCastMessage(worker as unknown as Worker, 'voice', { type: 'begin', gen: 1 });
      await vi.waitFor(() => expect(worker.requests('castPreflight')).toHaveLength(preflightCount + 1));
      const request = worker.requests('castPreflight').at(-1)!;
      const beforeWrites = control.puts.length;
      if (cancellation === 'load')
        postCastMessage(worker as unknown as Worker, 'voice', { type: 'loadPlaytest', gen: 2, text: '{}' });
      if (cancellation === 'conflict')
        control.beforeBatch = async () => {
          const old = control.state.revisions.at(-1)!;
          const { revision, ...body } = old;
          control.state = acceptPersona(
            control.state,
            await createPersona({ ...body, parentRevision: revision }),
          );
        };
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
    control.allowed.add(`${people[0]!.castId}/${people[0]!.branchId}`);
    const worker = new FakeWorker();
    await begin(worker);
    const init = worker.requests('init')[0]!;
    expect(Object.keys((init.castChapter as import('./cast-chapter.ts').CastChapter).people!)).toHaveLength(
      2,
    );
    expect(control.puts).toHaveLength(2);
    expect(lab.allowPersonaRecording).toHaveBeenLastCalledWith(true);
    expect(control.key).toMatch(/^cast-group-/);
  });
  it('a stale second parent mutates neither head and exposes working fresh-local startup recovery', async () => {
    const people = await Promise.all([head(), head('hf.cast.osman.voice')]);
    control.state = acceptPersonaBatch(control.state, people);
    let before: PersonaShelfState | undefined;
    control.beforeBatch = async () => {
      const p = people[1]!;
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
      'Start a fresh local chapter',
    );
    startCastFresh('voice');
    await vi.waitFor(() => expect(worker.requests('init')).toHaveLength(1));
    expect(worker.requests('init')[0]?.castChapter).toBeUndefined();
    expect(control.state).toEqual(before);
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
    const file: { kind: string; hash: string; castOwnership?: Record<string, PersonaEnvelope> } = {
      kind: 'human-playtest',
      hash: 'unchanged-simulation-hash',
    };
    worker.reply({ type: 'playtest', gen: 1, file });
    const saved = JSON.stringify(file);
    const accepted = file.castOwnership!['hf.cast.riza.voice']!;
    postCastMessage(worker as unknown as Worker, 'voice', {
      type: 'loadPlaytest',
      gen: 2,
      text: saved,
      local: true,
    });
    worker.reply({ type: 'replayed', gen: 2, result: { matches: true } });
    await vi.waitFor(() =>
      expect(worker.requests('castOwnership').at(-1)?.heads).toEqual(file.castOwnership),
    );
    await checkpoint(worker);
    expect(control.puts.at(-1)?.parentRevision).toBe(accepted.revision);
    expect(file.hash).toBe('unchanged-simulation-hash');
    const current = control.puts.at(-1)!;
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
  it('an actual Watch actor death closes the owned branch and a stale source cannot reopen it', async () => {
    const p = await head('hf.cast.tamar.watch');
    control.state = acceptPersona(control.state, p);
    const worker = new FakeWorker();
    await begin(worker, 'watch');
    const { WatchRun } = await import('../watch/sim/run.ts');
    const { die } = await import('@adam0white/human-framework');
    const { watchTerminalReceipts } = await import('../watch/sim/people.ts');
    const run = new WatchRun(1);
    const tamar = run.state.community.people.find((p) => p.id === 'tamar')!;
    die(tamar);
    const terminal = watchTerminalReceipts(run.state, { [p.castId]: p })[0]!;
    worker.reply({ type: 'castReady', requestId: 0, gen: 1, terminal });
    await vi.waitFor(() => expect(control.puts.at(-1)?.terminal?.kind).toBe('dead'));
    const closed = control.puts.at(-1)!;
    expect(() => preparePersonaLife(closed, 3600000)).toThrow(/closed/);
    const { revision: _revision, ...body } = p;
    const stale = await createPersona({ ...body, parentRevision: closed.revision });
    expect(() => acceptPersona(control.state, stale)).toThrow(/closed/);
  });
  it('pins manual source selection across worker/hash awaits', async () => {
    const worker = new FakeWorker();
    close = bindCastWorker(worker as unknown as Worker, 'voice', lab as never);
    selectCast('voice', 'hf.cast.riza.voice');
    const saving = checkpointCast('voice');
    await vi.waitFor(() => expect(worker.requests('castCheckpoint')).toHaveLength(1));
    selectCast('voice', 'hf.cast.osman.voice');
    worker.reply({
      type: 'castReady',
      requestId: worker.requests('castCheckpoint')[0]?.requestId,
      transfer: { sourceRole: 'riza', engine: '2.17.0' },
    });
    await saving;
    expect(control.puts.map((p) => p.castId)).toEqual(['hf.cast.riza.voice']);
  });
  it('cancels prior pending source capture and keeps a dedicated return prefix out of automatic authoring', async () => {
    const worker = new FakeWorker();
    close = bindCastWorker(worker as unknown as Worker, 'voice', lab as never);
    const saving = checkpointCast('voice');
    await vi.waitFor(() => expect(worker.requests('castCheckpoint')).toHaveLength(1));
    const old = worker.requests('castCheckpoint')[0]!;
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
    postCastMessage(worker as unknown as Worker, 'voice', { type: 'loadPlaytest', text: '{}', gen: 2 });
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
    postCastMessage(worker as unknown as Worker, 'well', { type: 'loadPlaytest', gen: 2, text: '{}' });
    expect(castState('well').busy).toBe(false);
    postCastMessage(worker as unknown as Worker, 'well', { type: 'init', seed: 1, gen: 3 });
    window.dispatchEvent(new Event('hf-lab-preference'));
    expect(castState('well').busy).toBe(true);
  });
});
