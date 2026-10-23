// @vitest-environment happy-dom
import { createElement } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import type { WorkerToMain } from '../protocol.ts';
import { type Colony, useColony } from './useColony.ts';

vi.mock('../../shared/tick-loop.ts', () => ({ startTickLoop: () => () => {} }));
vi.mock('../../shared/worker-telemetry.ts', () => ({ trackWorkerRun: () => () => {} }));
it('matches concurrent export replies by request id rather than response order', async () => {
  let receive: (e: { data: WorkerToMain }) => void = () => {};
  const post = vi.fn();
  vi.stubGlobal(
    'Worker',
    class {
      postMessage = post;
      addEventListener(type: string, fn: typeof receive) {
        if (type === 'message') receive = fn;
      }
      terminate() {}
    },
  );
  let colony: Colony | undefined;
  function Harness() {
    colony = useColony();
    return null;
  }
  const root = createRoot(document.createElement('div'));
  try {
    flushSync(() => root.render(createElement(Harness)));
    if (!colony) throw Error('Missing hook');
    const first = colony.actions.getRun(),
      second = colony.actions.getRun();
    const requests = post.mock.calls.map(([m]) => m).filter((m) => m.type === 'exportPlaytest');
    const gen = post.mock.calls[0]?.[0].gen;
    const file = (minute: number) => ({
      kind: 'human-playtest' as const,
      format: 1 as const,
      game: 'colony' as const,
      build: 'dev',
      framework: '2.14.1',
      engine: '2.14.1',
      seed: 1,
      scenario: 'colony-scenario@7',
      minute,
      log: [],
      hash: String(minute),
      snapshotEncoding: 'json' as const,
      snapshot: {},
    });
    receive({ data: { type: 'playtest', file: file(2), requestId: requests[1].requestId, gen } });
    receive({ data: { type: 'playtest', file: file(1), requestId: requests[0].requestId, gen } });
    expect((await first).minute).toBe(1);
    expect((await second).minute).toBe(2);
  } finally {
    flushSync(() => root.unmount());
    vi.unstubAllGlobals();
  }
});
