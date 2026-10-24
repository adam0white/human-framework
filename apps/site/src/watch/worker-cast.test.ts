import { createPersona, initialPersonaLife } from '@adam0white/lab-client';
import { expect, it, vi } from 'vitest';
import type { MainToWorker } from './protocol.ts';

const control = vi.hoisted(() => ({
  handle: undefined as ((m: MainToWorker, h: unknown) => void) | undefined,
  saved: [] as string[],
  replies: [] as Record<string, unknown>[],
  gen: 0,
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
  listPages: async () => [],
  loadPage: async () => JSON.parse(control.saved.at(-1)!),
}));
it('saves the old run with its exact accepted ownership before a fresh init and restores those local receipts', async () => {
  await import('./worker.ts');
  const send = (m: MainToWorker) =>
    control.handle!(m, {
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
  const old = JSON.parse(control.saved.at(-1)!);
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
});
