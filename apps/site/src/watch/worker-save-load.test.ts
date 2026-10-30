/** A native page written by the worker must load through the same worker with its cast metadata. */
import 'fake-indexeddb/auto';
import { expect, it, vi } from 'vitest';
import type { MainToWorker, WorkerReply } from './protocol.ts';
import { WATCH_OLD_SAVE } from './sim/hf4.ts';
import { WATCH_SCENARIO_VERSION } from './sim/run.ts';
import { listPages, loadPage, savePage } from './store.ts';

it('loads its own saved page and restores cast metadata', async () => {
  let receive: ((event: MessageEvent<MainToWorker>) => void) | undefined;
  const replies: (WorkerReply & { gen: number })[] = [];
  vi.stubGlobal('addEventListener', (_type: string, callback: typeof receive) => {
    receive = callback;
  });
  const pending = new Set<{
    type: 'loaded' | 'shelf';
    gen: number;
    id?: string;
    resolve(message: WorkerReply & { gen: number }): void;
    reject(error: Error): void;
  }>();
  const reply = (type: 'loaded' | 'shelf', gen: number, id?: string) =>
    new Promise<WorkerReply & { gen: number }>((resolve, reject) => {
      pending.add({ type, gen, id, resolve, reject });
    });
  vi.stubGlobal('postMessage', (value: WorkerReply & { gen: number }) => {
    replies.push(value);
    if (value.type === 'error' || (value.type === 'loaded' && !value.ok)) {
      for (const waiting of pending)
        waiting.reject(new Error(value.type === 'error' ? value.message : value.error));
      pending.clear();
    } else {
      for (const waiting of pending) {
        if (
          value.gen === waiting.gen &&
          value.type === waiting.type &&
          (waiting.id === undefined || (value.type === 'loaded' && value.id === waiting.id))
        ) {
          pending.delete(waiting);
          waiting.resolve(value);
        }
      }
    }
  });
  try {
    await import('./worker.ts');
    const send = async (data: MainToWorker) => {
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      if (!receive) throw new Error('No worker message handler');
      receive({ data: structuredClone(data) } as MessageEvent<MainToWorker>);
    };
    const waitForShelf = (gen: number) =>
      vi.waitFor(() =>
        expect(replies.some((reply) => reply.type === 'shelf' && reply.gen === gen)).toBe(true),
      );
    await send({ type: 'init', gen: 1, seed: 7, scenarioVersion: WATCH_SCENARIO_VERSION });
    await waitForShelf(1);
    await send({ type: 'input', input: { k: 'start' } });
    await send({
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
    await send({ type: 'init', gen: 2, seed: 8, scenarioVersion: WATCH_SCENARIO_VERSION });
    await waitForShelf(2);
    replies.length = 0;
    await send({ type: 'load', id: pageId, gen: 3 });
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
    // Arm both terminal replies before dispatch: the real native read precedes loaded,
    // and the final shelf has a separate async read after loaded/castReady.
    const [loaded, shelf] = await Promise.all([
      reply('loaded', 4, importedId),
      reply('shelf', 4),
      send({ type: 'load', id: importedId, gen: 4 }),
    ]);
    expect(loaded).toEqual({ type: 'loaded', ok: true, id: importedId, seed: 7, gen: 4 });
    expect(shelf).toMatchObject({ type: 'shelf', gen: 4 });
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
    // A page saved before characters carried authority is refused as an older save, so the player gets
    // the start-fresh message rather than a generic stop.
    const { castAuthority: _dropped, ...legacy } = snapshot as unknown as Record<string, unknown>;
    const legacyId = 'legacy-page:auto';
    await savePage({ ...page, id: legacyId }, JSON.stringify(legacy));
    replies.length = 0;
    await send({ type: 'load', id: legacyId, gen: 5 });
    await vi.waitFor(() =>
      expect(replies).toContainEqual({
        type: 'loaded',
        ok: false,
        id: legacyId,
        error: WATCH_OLD_SAVE,
        gen: 5,
      }),
    );
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
  let pending:
    | {
        type: 'fileLoaded' | 'exported';
        gen: number;
        requestId?: number;
        resolve(message: WorkerReply & { gen: number }): void;
        reject(error: Error): void;
      }
    | undefined;
  const reply = (type: 'fileLoaded' | 'exported', gen: number, requestId?: number) =>
    new Promise<WorkerReply & { gen: number }>((resolve, reject) => {
      pending = { type, gen, requestId, resolve, reject };
    });
  vi.stubGlobal('postMessage', (value: WorkerReply & { gen: number }) => {
    replies.push(value);
    if (value.type === 'error' || (value.type === 'fileLoaded' && !value.ok)) {
      const waiting = pending;
      pending = undefined;
      waiting?.reject(new Error(value.type === 'error' ? value.message : value.error));
    } else if (
      pending &&
      value.gen === pending.gen &&
      value.type === pending.type &&
      (pending.requestId === undefined ||
        (value.type === 'exported' && value.requestId === pending.requestId))
    ) {
      const waiting = pending;
      pending = undefined;
      waiting.resolve(value);
    }
  });
  try {
    await import('./worker.ts');
    // Worker messages arrive in separate tasks. Keep globals until async validation/SHA
    // and the matched export complete, rather than polling with a shorter deadline.
    const send = async (data: MainToWorker) => {
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      if (!receive) throw new Error('No worker message handler');
      receive({ data: structuredClone(data) } as MessageEvent<MainToWorker>);
    };
    await send({ type: 'fileSession' });
    let text = JSON.stringify(original);
    for (const gen of [1, 2]) {
      const bytes = text;
      const [loaded] = await Promise.all([reply('fileLoaded', gen), send({ type: 'loadFile', text, gen })]);
      expect(loaded).toEqual({ type: 'fileLoaded', ok: true, seed: 7, gen });
      const [exported] = await Promise.all([
        reply('exported', gen, gen),
        send({ type: 'export', requestId: gen }),
      ]);
      if (exported.type !== 'exported') throw new Error('No complete file reply');
      const data = exported.data as typeof exported.data & Record<string, unknown>;
      expect(data.fileImport).toEqual(await importedFileRecord(JSON.parse(bytes), bytes));
      expect(data.castAuthority).toEqual(localCastAuthority());
      expect(data.castOwnership).toEqual({});
      expect(data.castSources).toEqual({});
      expect(data.castSkipped).toEqual([]);
      expect(data.castLocalOnly).toBe(true);
      expect(exported.data.snapshot).toEqual(original.snapshot);
      expect(exported.data.end).toEqual(original.end);
      text = JSON.stringify(exported.data);
    }
    expect(replies.filter((r) => ['saved', 'castReady', 'shelf', 'error'].includes(r.type))).toEqual([]);
  } finally {
    vi.unstubAllGlobals();
  }
});
