import { die, snapshot } from '@adam0white/human-framework';
import {
  canonicalPersona,
  createPersona,
  initialPersonaLife,
  type PersonaEnvelope,
  preparePersonaLife,
} from '@adam0white/lab-client';
import { expect, it, vi } from 'vitest';
import { playYears } from '../../test/watch/years.ts';
import { makeCastChapter } from '../shared/cast-chapter.ts';
import { importedFileRecord } from '../shared/file-record.ts';
import actualCare from '../shared/fixtures/watch-kian-care-native.json';
import { requireValue } from '../shared/require-value.ts';
import type { MainToWorker } from './protocol.ts';
import { WatchRun } from './sim/run.ts';
import type { PageInfo } from './store.ts';

const control = vi.hoisted(() => ({
  handle: undefined as ((m: MainToWorker, h: unknown) => void) | undefined,
  saved: [] as string[],
  infos: [] as PageInfo[],
  replies: [] as Record<string, unknown>[],
  gen: 0,
  listing: 0,
  pendingPages: undefined as Promise<PageInfo[]> | undefined,
}));
vi.mock('../shared/worker-host.ts', () => ({
  hostWorker: (handle: typeof control.handle) => {
    control.handle = handle;
    return {
      get gen() {
        return control.gen;
      },
      set gen(value: number) {
        control.gen = value;
      },
      post: (m: Record<string, unknown>, gen = control.gen) => control.replies.push({ ...m, gen }),
    };
  },
}));
vi.mock('./store.ts', () => ({
  savePage: async (_info: PageInfo, text: string) => {
    control.infos.push(structuredClone(_info));
    control.saved.push(text);
    return true;
  },
  listPages: async () => {
    control.listing++;
    return control.pendingPages ?? [];
  },
  loadPage: async () => JSON.parse(requireValue(control.saved.at(-1))),
}));
it('saves the old run with its exact accepted ownership before a fresh init and restores those local receipts', async () => {
  await import('./worker.ts');
  const send = (m: MainToWorker) =>
    requireValue(control.handle)(m, {
      get gen() {
        return control.gen;
      },
      set gen(value: number) {
        control.gen = value;
      },
      post: (message: Record<string, unknown>, gen = control.gen) =>
        control.replies.push({ ...message, gen }),
    });
  send({ type: 'init', seed: 1, gen: 1, scenarioVersion: 17 });
  send({ type: 'input', input: { k: 'start' } });
  const castId = 'hf.cast.tamar.watch';
  const branchId = 'worker-owned';
  const head = await createPersona({
    format: 'hf-persona/1',
    castId,
    castRevision: '1',
    branchId,
    parentRevision: null,
    source: { game: 'watch', engine: '2.17.0', build: 'control', rules: 'cast-1' },
    transfer: { life: initialPersonaLife(castId, branchId, 0) },
    limitations: [],
  });
  send({ type: 'castOwnership', heads: { [castId]: head } });
  send({ type: 'input', input: { k: 'begin' } });
  send({ type: 'init', seed: 2, gen: 2, scenarioVersion: 17 });
  const old = JSON.parse(requireValue(control.saved.at(-1)));
  expect(old.seed).toBe(1);
  expect(old.castOwnership[castId]).toEqual(head);
  send({ type: 'load', gen: 3, id: 'old:auto' });
  await vi.waitFor(() =>
    expect(
      control.replies.some(
        (r) => r.type === 'castReady' && r.gen === 3 && (r.ownership as Record<string, unknown>)?.[castId],
      ),
    ).toBe(true),
  );
  expect(control.replies.find((r) => r.type === 'castReady' && r.gen === 3)?.ownership).toEqual({
    [castId]: head,
  });
  control.saved.push(JSON.stringify({ ...old, fileOrigin: true }));
  send({ type: 'load', gen: 4, id: 'file:auto' });
  await vi.waitFor(() =>
    expect(control.replies.some((r) => r.type === 'castReady' && r.gen === 4)).toBe(true),
  );
  expect(control.replies.find((r) => r.type === 'castReady' && r.gen === 4)?.ownership).toEqual({});

  // A real local backup shape waits for eligibility; a newer init owns the worker meanwhile.
  const parent = actualCare as unknown as PersonaEnvelope;
  const { revision, ...body } = parent;
  const accepted = await createPersona({ ...body, parentRevision: revision });
  const clock = (parent.transfer.life as { clock: { watermark: number } }).clock.watermark * 3600000;
  const backup = new WatchRun(
    703,
    undefined,
    makeCastChapter([preparePersonaLife(parent, clock)], [accepted]),
  );
  backup.input({ k: 'start' });
  control.saved.push(JSON.stringify({ ...backup.snapshot(), castOwnership: { [parent.castId]: accepted } }));
  let release!: (pages: PageInfo[]) => void;
  control.pendingPages = new Promise((resolve) => {
    release = resolve;
  });
  const listing = control.listing;
  send({ type: 'load', gen: 5, id: 'owned:1:winter' });
  await vi.waitFor(() => expect(control.listing).toBeGreaterThan(listing));
  control.pendingPages = undefined;
  send({ type: 'init', seed: 3, gen: 6, scenarioVersion: 17 });
  release([
    {
      id: 'owned:1:winter',
      chronicle: 'owned',
      kind: 'season',
      seed: 703,
      year: 1,
      when: 'winter',
      savedAt: 1,
    },
  ]);
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(control.gen).toBe(6);
  expect(control.replies.some((r) => r.type === 'loaded' && r.gen === 5)).toBe(false);
  send({ type: 'export', requestId: 99 });
  expect(control.replies.find((r) => r.type === 'exported' && r.requestId === 99)?.data).toMatchObject({
    seed: 3,
  });
});

it('admits the explicit fresh night-off choice and retains that scenario through worker save/load', async () => {
  await import('./worker.ts');
  const send = (m: MainToWorker) =>
    requireValue(control.handle)(m, {
      get gen() {
        return control.gen;
      },
      set gen(g: number) {
        control.gen = g;
      },
      post: (m: Record<string, unknown>, gen = control.gen) => control.replies.push({ ...m, gen }),
    });
  send({
    type: 'init',
    seed: 2026,
    gen: 20,
    scenarioVersion: 18,
    options: { duskRest: 'dusk-rest@1' },
    startAtDusk: true,
  });
  send({ type: 'export', requestId: 200 });
  const data = control.replies.findLast((r) => r.type === 'exported' && r.requestId === 200)
    ?.data as ReturnType<WatchRun['export']>;
  expect(data).not.toHaveProperty('fileImport');
  expect(data.scenario).toBe(18);
  expect(data.options).toEqual({ duskRest: 'dusk-rest@1' });
  expect(data.end.phase).toBe('dusk');
  expect(data.inputs).toEqual([{ m: 1020, i: { k: 'start' } }]);
  send({ type: 'save' });
  expect(JSON.parse(requireValue(control.saved.at(-1))).scenario).toBe(18);
  // The existing loader retains the saved state; no fresh-run checkbox is applied to it.
  control.pendingPages = undefined;
  send({ type: 'load', id: 'saved:auto', gen: 21 });
  await vi.waitFor(() =>
    expect(control.replies.some((r) => r.type === 'loaded' && r.gen === 21 && r.ok === true)).toBe(true),
  );
  send({ type: 'export', requestId: 201 });
  const restored = control.replies.findLast((r) => r.type === 'exported' && r.requestId === 201)
    ?.data as typeof data;
  expect(restored.scenario).toBe(18);
  expect(restored.end.fullHash).toBe(data.end.fullHash);
  send({ type: 'init', seed: 2026, gen: 22, scenarioVersion: 18 });
  expect(control.replies.findLast((r) => r.gen === 22)?.type).toBe('error');
});

it('native worker saves first season, due input/timer, hold/hide and a real terminal volume without changing its chronicle', async () => {
  vi.resetModules();
  await import('./worker.ts');
  control.saved = [];
  control.infos = [];
  control.replies = [];
  control.pendingPages = undefined;
  const send = (message: MainToWorker) =>
    requireValue(control.handle)(message, {
      get gen() {
        return control.gen;
      },
      set gen(g: number) {
        control.gen = g;
      },
      post: (reply: Record<string, unknown>, gen = control.gen) => control.replies.push({ ...reply, gen }),
    });
  send({ type: 'init', seed: 1, gen: 101, scenarioVersion: 17 });
  expect(control.saved).toEqual([]);
  send({ type: 'input', input: { k: 'start' } });
  expect(control.infos.map((info) => info.kind)).toEqual(['season', 'auto']);
  const chronicle = requireValue(control.infos[0]).chronicle;
  send({ type: 'input', input: { k: 'begin' } });
  const saves = control.saved.length;
  for (let n = 0; n < 120; n++) send({ type: 'tick', dtMs: 250 });
  expect(control.saved.length).toBeGreaterThan(saves);
  send({ type: 'tick', dtMs: 250 });
  send({ type: 'tick', dtMs: 250 });
  const beforeHold = control.saved.length;
  send({ type: 'hold', on: true });
  expect(control.saved.length).toBe(beforeHold + 1);
  send({ type: 'hold', on: false });
  for (let n = 0; n < 4; n++) send({ type: 'tick', dtMs: 250 });
  const beforeHide = control.saved.length;
  send({ type: 'save' });
  expect(control.saved.length).toBe(beforeHide + 1);
  const latest = JSON.parse(requireValue(control.saved.at(-1)));
  send({ type: 'load', id: `${chronicle}:auto`, gen: 102 });
  await vi.waitFor(() =>
    expect(control.replies.some((reply) => reply.type === 'loaded' && reply.gen === 102 && reply.ok)).toBe(
      true,
    ),
  );
  send({ type: 'export', requestId: 102 });
  expect(control.replies.findLast((reply) => reply.type === 'exported')?.data).toMatchObject({
    seed: latest.seed,
    endMinute: latest.state.minute,
  });
  await vi.waitFor(() =>
    expect(control.replies.findLast((reply) => reply.type === 'shelf')?.current).toBe(chronicle),
  );

  // The public Person death API and the existing headless Keeper reach a real closed-volume boundary.
  const terminal = new WatchRun(1);
  terminal.input({ k: 'start' });
  die(
    requireValue(terminal.state.community.people.find((person) => person.id === terminal.state.gateKeeper)),
  );
  playYears(1, 1, undefined, (state) => state.phase === 'thaw', terminal);
  expect(terminal.state.phase).toBe('thaw');
  expect(terminal.state.volume.epilogue).toBeDefined();
  const prior = terminal.snapshot();
  control.saved.push(JSON.stringify(prior));
  send({ type: 'load', id: `${chronicle}:auto`, gen: 103 });
  await vi.waitFor(() =>
    expect(control.replies.some((reply) => reply.type === 'loaded' && reply.gen === 103 && reply.ok)).toBe(
      true,
    ),
  );
  const volumes = control.infos.filter((info) => info.kind === 'volume').length;
  send({ type: 'input', input: { k: 'continue' } });
  expect(control.infos.filter((info) => info.kind === 'volume')).toHaveLength(volumes + 1);
  expect(control.infos.at(-1)?.chronicle).toBe(chronicle);
});

it('file worker reconstructs full people without reading or writing native chronicles', async () => {
  vi.resetModules();
  await import('./worker.ts');
  control.saved = [];
  control.replies = [];
  control.listing = 0;
  const send = (m: Record<string, unknown>) =>
    requireValue(control.handle)(m as MainToWorker, {
      get gen() {
        return control.gen;
      },
      set gen(g: number) {
        control.gen = g;
      },
      post: (r: Record<string, unknown>, gen = control.gen) => control.replies.push({ ...r, gen }),
    });
  send({ type: 'fileSession' });
  const source = new WatchRun(20261004);
  source.input({ k: 'start' });
  const person = snapshot(requireValue(source.state.community.people[0]));
  const digest = Array.from(
    new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonicalPersona(person)))),
    (byte) => byte.toString(16).padStart(2, '0'),
  ).join('');
  const id = 'hf.cast.tamar.watch';
  const receipt = await createPersona({
    format: 'hf-persona/1',
    castId: id,
    castRevision: '1',
    branchId: 'synthetic-file-source',
    parentRevision: null,
    source: { game: 'watch', engine: '3.2.0', build: 'synthetic', rules: 'cast-1' },
    transfer: { checkpoint: { sha256: digest } },
    limitations: [],
  });
  const file = {
    ...source.export(),
    build: 'synthetic-original-host',
    runId: 'synthetic-source-run',
    snapshot: source.snapshot(),
    castOwnership: { [id]: receipt },
    castSources: { [id]: person },
  };
  const sourceText = JSON.stringify(file);
  const fileImport = await importedFileRecord(file, sourceText);
  send({ type: 'loadFile', text: sourceText, gen: 1 });
  await vi.waitFor(() => expect(control.replies.some((r) => r.type === 'fileLoaded' && r.ok)).toBe(true));
  send({ type: 'hold', on: true });
  send({ type: 'tick', dtMs: 250 });
  send({ type: 'save' });
  send({ type: 'export', requestId: 991 });
  expect(control.saved).toEqual([]);
  expect(control.listing).toBe(0);
  const out = control.replies.findLast((r) => r.type === 'exported')?.data;
  expect(out).toEqual({ ...file, runId: expect.any(String), fileImport, clock: expect.any(Object) });
  const runId = (out as { runId: string }).runId;
  expect(runId).not.toBe(file.runId);
  send({ type: 'telemetry', requestId: 996 });
  expect(control.replies.findLast((reply) => reply.type === 'telemetry')).toMatchObject({
    requestId: 996,
    run: { runId, fileImport },
  });
  send({ type: 'hold', on: false });
  for (let i = 0; i < 16; i++) send({ type: 'tick', dtMs: 250 });
  send({ type: 'export', requestId: 995 });
  const continued = control.replies.findLast((reply) => reply.type === 'exported')?.data as typeof file;
  expect(continued).toMatchObject({ runId, fileImport });
  expect(continued.snapshot.state.minute).toBeGreaterThan(file.snapshot.state.minute);
  const resumed = WatchRun.resume(continued.snapshot);
  expect(resumed.snapshot()).toEqual(continued.snapshot);
  expect(continued.build).toBe(file.build);
  expect(continued.castOwnership).toEqual(file.castOwnership);
  expect(continued.castSources).toEqual(file.castSources);
  expect(control.saved).toEqual([]);
});
