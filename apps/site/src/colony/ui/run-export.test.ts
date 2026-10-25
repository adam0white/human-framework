// @vitest-environment happy-dom
import { createElement } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import type { WorkerToMain } from '../protocol.ts';
import { type Colony, useColony } from './useColony.ts';

// Worker orchestration tests must not start the real lab client's metadata fetch.
vi.mock('../../shared/lab.tsx', () => ({
  gameLabs: {
    well: { setPersonaRecording: vi.fn(), allowPersonaRecording: vi.fn(), personaRecordingAllowed: false },
  },
}));
vi.mock('../../shared/tick-loop.ts', () => ({ startTickLoop: () => () => {} }));
vi.mock('../../shared/worker-telemetry.ts', () => ({ trackWorkerRun: () => () => {} }));
function Harness({ capture }: { capture: (value: Colony) => void }) {
  capture(useColony());
  return null;
}

it('matches concurrent export replies by request id rather than response order', async () => {
  const listeners: ((e: { data: WorkerToMain }) => void)[] = [];
  const receive = (e: { data: WorkerToMain }) => {
    for (const fn of listeners) fn(e);
  };
  const post = vi.fn();
  vi.stubGlobal(
    'Worker',
    class {
      postMessage = post;
      addEventListener(type: string, fn: typeof receive) {
        if (type === 'message') listeners.push(fn);
      }
      removeEventListener() {}
      terminate() {}
    },
  );
  let colony: Colony | undefined;
  const root = createRoot(document.createElement('div'));
  try {
    flushSync(() =>
      root.render(
        createElement(Harness, {
          capture: (value) => {
            colony = value;
          },
        }),
      ),
    );
    if (!colony) throw Error('Missing hook');
    await vi.waitFor(() => expect(post.mock.calls.some(([m]) => m.type === 'init')).toBe(true));
    const first = colony.actions.getRun(),
      second = colony.actions.getRun();
    const requests = post.mock.calls.map(([m]) => m).filter((m) => m.type === 'exportPlaytest');
    const gen = post.mock.calls.find(([m]) => m.type === 'init')?.[0].gen;
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
