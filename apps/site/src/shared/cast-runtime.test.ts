import type { PersonaEnvelope, PersonaShelfState } from '@adam0white/lab-client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const control = vi.hoisted(() => ({
  state: { heads: {}, revisions: [] } as PersonaShelfState,
  puts: [] as PersonaEnvelope[],
  allowed: new Set<string>(),
  enabled: true,
  key: null as string | null,
  refuse: false,
  autoPreflight: false,
  beforeBatch: undefined as (() => Promise<void>) | undefined,
}));
vi.mock('@adam0white/lab-client', async () => {
  const actual = await vi.importActual<typeof import('@adam0white/lab-client')>('@adam0white/lab-client');
  return {
    ...actual,
    personaChannel: () => ({
      get enabled() {
        return control.enabled;
      },
      ready: Promise.resolve(true),
      setEnabled(value: boolean) {
        control.enabled = value;
      },
      async request<T>(r: import('@adam0white/lab-client').PersonaRequest): Promise<T> {
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
  control.allowed.clear();
  control.enabled = true;
  control.key = null;
  control.refuse = false;
  control.autoPreflight = false;
  control.beforeBatch = undefined;
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
  it('starts two histories together but mixed recording epochs keep the derived run gated', async () => {
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
    expect(lab.allowPersonaRecording).toHaveBeenLastCalledWith(false);
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
  it('file replacement and identity invalidation both clear pending startup controls', async () => {
    const worker = new FakeWorker();
    close = bindCastWorker(worker as unknown as Worker, 'well', lab as never);
    postCastMessage(worker as unknown as Worker, 'well', { type: 'init', seed: 1, gen: 1 });
    expect(castState('well').busy).toBe(true);
    postCastMessage(worker as unknown as Worker, 'well', { type: 'loadPlaytest', gen: 2, text: '{}' });
    expect(castState('well').busy).toBe(false);
    postCastMessage(worker as unknown as Worker, 'well', { type: 'init', seed: 1, gen: 3 });
    window.dispatchEvent(new Event('hf-lab-preference'));
    expect(castState('well').busy).toBe(false);
  });
});
