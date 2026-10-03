/**
 * The seam between the UI and the simulation: the real Web Worker (`../worker.ts`). In development only, `?mock=1`
 * in the URL swaps in an in-page mock built on `sim/fixtures.ts` so every screen stays reachable; the mock is
 * loaded with a dynamic import behind `import.meta.env.DEV`, so it does not ship in the production bundle.
 */
import type { MainToWorker, WorkerToMain } from '../protocol.ts';
import VoiceWorker from '../worker.ts?worker';

export interface Transport {
  post(msg: MainToWorker): void;
  onMessage(fn: (msg: WorkerToMain) => void): void;
  onError(fn: (message: string) => void): void;
  close(): void;
  readonly kind: 'worker' | 'mock';
}

function wantMock(): boolean {
  try {
    return new URLSearchParams(window.location.search).get('mock') === '1';
  } catch {
    return false;
  }
}

async function mockTransport(): Promise<Transport> {
  const { MockEngine } = await import('./mock.ts');
  const engine = new MockEngine();
  return {
    kind: 'mock',
    post: (msg) => engine.receive(msg),
    onMessage: (fn) => engine.listen(fn),
    onError: () => {},
    close: () => engine.close(),
  };
}

function workerTransport(): Transport {
  const w = new VoiceWorker();
  return {
    kind: 'worker',
    post: (msg) => w.postMessage(msg),
    onMessage: (fn) => w.addEventListener('message', (e: MessageEvent<WorkerToMain>) => fn(e.data)),
    onError: (fn) => {
      w.addEventListener('error', (e) => fn(`The simulation failed to load: ${e.message || 'worker error'}`));
      w.addEventListener('messageerror', () => fn('The simulation sent a message the page could not read.'));
    },
    close: () => w.terminate(),
  };
}

export async function openTransport(): Promise<Transport> {
  if (import.meta.env.DEV && wantMock()) return mockTransport();
  return workerTransport();
}
