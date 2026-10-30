/** A native page written by the worker must load through the same worker with its cast metadata. */
import 'fake-indexeddb/auto';
import { expect, it, vi } from 'vitest';
import type { MainToWorker, WorkerReply } from './protocol.ts';
import { WATCH_SCENARIO_VERSION } from './sim/run.ts';
import { listPages, loadPage, savePage } from './store.ts';

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
    send({
      type: 'castOwnership',
      heads: {},
      localOnly: true,
      skipped: [],
      authority: { format: 'site-cast-authority/1', mode: 'local', expectedHeads: {}, denied: [] },
      sources: {},
    });
    let pageId = '';
    await vi.waitFor(async () => {
      const pages = await listPages();
      const page = pages.find((p) => p.kind === 'auto');
      expect(page).toBeDefined();
      if (!page) return;
      const snapshot = await loadPage(page.id);
      expect(snapshot?.castLocalOnly).toBe(true);
      expect(snapshot?.castSkipped).toEqual([]);
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
      skipped: [],
      authority: { format: 'site-cast-authority/1', mode: 'local', expectedHeads: {}, denied: [] },
      sources: {},
      gen: 3,
    });
    // Loading posts its shelf asynchronously after the loaded/castReady replies.
    // Keep the worker globals until that final IndexedDB read has settled.
    await waitForShelf(3);
    // An imported page remains explicitly nonowning on the actual native worker load path.
    const page = (await listPages()).find((p) => p.id === pageId)!;
    const snapshot = await loadPage(pageId);
    const importedId = 'r4-imported:auto';
    await savePage({ ...page, id: importedId }, JSON.stringify({ ...snapshot, fileOrigin: true }));
    replies.length = 0;
    send({ type: 'load', id: importedId, gen: 4 });
    await vi.waitFor(() =>
      expect(replies).toContainEqual({ type: 'loaded', ok: true, id: importedId, seed: 7, gen: 4 }),
    );
    expect(replies).toContainEqual({
      type: 'castReady',
      requestId: 0,
      ownership: {},
      localOnly: true,
      skipped: [],
      authority: { format: 'site-cast-authority/1', mode: 'local', expectedHeads: {}, denied: [] },
      sources: {},
      gen: 4,
      fileOrigin: true,
    });
    await waitForShelf(4);
  } finally {
    vi.unstubAllGlobals();
  }
});

it('keeps complete text-file imports nonowning and byte-bound through re-download and reimport', async () => {
  vi.resetModules();
  const { WatchRun } = await import('./sim/run.ts');
  const { localCastAuthority } = await import('../shared/cast-authority.ts');
  const { importedFileRecord } = await import('../shared/file-record.ts');
  const run = new WatchRun(7);
  run.input({ k: 'start' });
  const original = {
    ...run.export(),
    snapshot: run.snapshot(),
    castAuthority: localCastAuthority(),
    castOwnership: {},
    castSources: {},
    castSkipped: [],
    castLocalOnly: true,
  };
  let receive: ((event: MessageEvent<MainToWorker>) => void) | undefined;
  const replies: (WorkerReply & { gen: number })[] = [];
  vi.stubGlobal('addEventListener', (_type: string, callback: typeof receive) => {
    receive = callback;
  });
  vi.stubGlobal('postMessage', (value: WorkerReply & { gen: number }) => replies.push(value));
  try {
    await import('./worker.ts');
    const send = (data: MainToWorker) => receive?.({ data } as MessageEvent<MainToWorker>);
    send({ type: 'fileSession' });
    let text = JSON.stringify(original);
    for (const gen of [1, 2]) {
      const bytes = text;
      send({ type: 'loadFile', text, gen });
      await vi.waitFor(() => expect(replies).toContainEqual({ type: 'fileLoaded', ok: true, seed: 7, gen }));
      send({ type: 'export', requestId: gen });
      const reply = replies.find((r) => r.type === 'exported' && r.requestId === gen);
      if (!reply || reply.type !== 'exported') throw new Error('No complete file reply');
      const data = reply.data as typeof reply.data & Record<string, unknown>;
      expect(data.fileImport).toEqual(await importedFileRecord(JSON.parse(bytes), bytes));
      expect(data.castAuthority).toEqual(localCastAuthority());
      expect(data.castOwnership).toEqual({});
      expect(reply.data.snapshot).toEqual(original.snapshot);
      text = JSON.stringify(reply.data);
    }
    expect(replies.filter((r) => ['saved', 'castReady', 'shelf', 'error'].includes(r.type))).toEqual([]);
  } finally {
    vi.unstubAllGlobals();
  }
});
