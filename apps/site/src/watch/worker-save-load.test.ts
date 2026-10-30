/** A native page written by the worker must load through the same worker with its cast metadata. */
import 'fake-indexeddb/auto';
import { expect, it, vi } from 'vitest';
import type { MainToWorker, WorkerReply } from './protocol.ts';
import { WATCH_SCENARIO_VERSION } from './sim/run.ts';
import { listPages, loadPage } from './store.ts';

it('loads its own saved page and restores cast metadata', async () => {
  let receive: ((event: MessageEvent<MainToWorker>) => void) | undefined;
  const replies: (WorkerReply & { gen: number })[] = [];
  vi.stubGlobal('addEventListener', (_type: string, callback: typeof receive) => {
    receive = callback;
  });
  vi.stubGlobal('postMessage', (value: WorkerReply & { gen: number }) => replies.push(value));
  try {
    await import('./worker.ts');
    const send = (data: MainToWorker) => {
      if (!receive) throw new Error('No worker message handler');
      receive({ data } as MessageEvent<MainToWorker>);
    };
    const waitForShelf = (gen: number) =>
      vi.waitFor(() =>
        expect(replies.some((reply) => reply.type === 'shelf' && reply.gen === gen)).toBe(true),
      );
    send({ type: 'init', gen: 1, seed: 7, scenarioVersion: WATCH_SCENARIO_VERSION });
    await waitForShelf(1);
    send({ type: 'input', input: { k: 'start' } });
    send({ type: 'castOwnership', heads: {}, localOnly: true, skipped: ['kian'] });
    let pageId = '';
    await vi.waitFor(async () => {
      const pages = await listPages();
      const page = pages.find((p) => p.kind === 'auto');
      expect(page).toBeDefined();
      if (!page) return;
      const snapshot = await loadPage(page.id);
      expect(snapshot?.castLocalOnly).toBe(true);
      expect(snapshot?.castSkipped).toEqual(['kian']);
      pageId = page.id;
    });
    await vi.waitFor(() =>
      expect(
        replies.some(
          (reply) =>
            reply.type === 'saved' &&
            reply.gen === 1 &&
            reply.value !== null &&
            typeof reply.value === 'object' &&
            'castLocalOnly' in reply.value &&
            reply.value.castLocalOnly === true,
        ),
      ).toBe(true),
    );
    send({ type: 'init', gen: 2, seed: 8, scenarioVersion: WATCH_SCENARIO_VERSION });
    await waitForShelf(2);
    replies.length = 0;
    send({ type: 'load', id: pageId, gen: 3 });
    await vi.waitFor(() =>
      expect(replies).toContainEqual({ type: 'loaded', ok: true, id: pageId, seed: 7, gen: 3 }),
    );
    expect(replies).toContainEqual({
      type: 'castReady',
      requestId: 0,
      ownership: {},
      localOnly: true,
      skipped: ['kian'],
      gen: 3,
    });
    // Loading posts its shelf asynchronously after the loaded/castReady replies.
    // Keep the worker globals until that final IndexedDB read has settled.
    await waitForShelf(3);
  } finally {
    vi.unstubAllGlobals();
  }
});
