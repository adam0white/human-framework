import {
  createPersona,
  initialPersonaLife,
  type PersonaEnvelope,
  preparePersonaLife,
} from '@adam0white/lab-client';
import { expect, it, vi } from 'vitest';
import { makeCastChapter } from '../shared/cast-chapter.ts';
import actualCare from '../shared/fixtures/watch-kian-care-native.json';
import { requireValue } from '../shared/require-value.ts';
import type { MainToWorker } from './protocol.ts';
import { WatchRun } from './sim/run.ts';
import type { PageInfo } from './store.ts';

const control = vi.hoisted(() => ({
  handle: undefined as ((m: MainToWorker, h: unknown) => void) | undefined,
  saved: [] as string[],
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
  savePage: async (_info: unknown, text: string) => {
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
  send({ type: 'init', seed: 1, gen: 1, scenarioVersion: 14 });
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
  send({ type: 'init', seed: 2, gen: 2, scenarioVersion: 14 });
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
  send({ type: 'init', seed: 3, gen: 6, scenarioVersion: 14 });
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
    scenarioVersion: 15,
    options: { duskRest: 'dusk-rest@1' },
    startAtDusk: true,
  });
  send({ type: 'export', requestId: 200 });
  const data = control.replies.findLast((r) => r.type === 'exported' && r.requestId === 200)
    ?.data as ReturnType<WatchRun['export']>;
  expect(data.scenario).toBe(15);
  expect(data.options).toEqual({ duskRest: 'dusk-rest@1' });
  expect(data.end.phase).toBe('dusk');
  expect(data.inputs).toEqual([{ m: 1020, i: { k: 'start' } }]);
  send({ type: 'save' });
  expect(JSON.parse(requireValue(control.saved.at(-1))).scenario).toBe(15);
  // The existing loader retains the saved state; no fresh-run checkbox is applied to it.
  control.pendingPages = undefined;
  send({ type: 'load', id: 'saved:auto', gen: 21 });
  await vi.waitFor(() =>
    expect(control.replies.some((r) => r.type === 'loaded' && r.gen === 21 && r.ok === true)).toBe(true),
  );
  send({ type: 'export', requestId: 201 });
  const restored = control.replies.findLast((r) => r.type === 'exported' && r.requestId === 201)
    ?.data as typeof data;
  expect(restored.scenario).toBe(15);
  expect(restored.end.fullHash).toBe(data.end.fullHash);
  send({ type: 'init', seed: 2026, gen: 22, scenarioVersion: 15 });
  expect(control.replies.findLast((r) => r.gen === 22)?.type).toBe('error');
});
