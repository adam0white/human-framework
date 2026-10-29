import { expect, it, vi } from 'vitest';
import type { MainToWorker, WorkerReply } from './protocol.ts';
import * as store from './store.ts';

it('reports actual unavailable storage immediately and stamps the attempted page from its complete snapshot', async () => {
  let receive: ((event: MessageEvent<MainToWorker>) => void) | undefined;
  const replies: (WorkerReply & { gen: number })[] = [];
  vi.stubGlobal('indexedDB', undefined);
  vi.stubGlobal('addEventListener', (_type: string, callback: typeof receive) => {
    receive = callback;
  });
  vi.stubGlobal('postMessage', (value: WorkerReply & { gen: number }) => replies.push(value));
  const writes = vi.spyOn(store, 'savePage'); // Calls the actual unavailable IndexedDB path.
  try {
    await import('./worker.ts');
    const send = (data: MainToWorker) => {
      if (!receive) throw new Error('No worker message handler');
      receive({ data } as MessageEvent<MainToWorker>);
    };
    send({ type: 'init', gen: 1, seed: 7, scenarioVersion: 23 });
    await vi.waitFor(() => expect(replies.some((r) => r.type === 'shelf')).toBe(true));
    replies.length = 0;
    send({ type: 'input', input: { k: 'start' } });
    send({ type: 'save' });
    await vi.waitFor(() => expect(replies.some((r) => r.type === 'shelf' && r.saving === false)).toBe(true));
    expect(writes).toHaveBeenCalled();
    const [info, text] = writes.mock.calls[0] ?? [];
    expect(info?.scenario).toBe(JSON.parse(text ?? '{}').scenario);
    expect(await writes.mock.results[0]?.value).toBe(false);
    expect(replies.some((r) => r.type === 'error')).toBe(false);
  } finally {
    writes.mockRestore();
    vi.unstubAllGlobals();
  }
});
