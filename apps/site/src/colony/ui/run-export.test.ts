import { requireValue } from '../../shared/require-value.ts';

let usePolicyColony: typeof import('./useColony.ts').useColony;
function PolicyColony({ capture }: { capture(value: Colony): void }) {
  capture(usePolicyColony());
  return null;
}

// @vitest-environment happy-dom
import { createElement } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import type { WorkerToMain } from '../protocol.ts';
import { type Colony, useColony } from './useColony.ts';

// Worker orchestration tests must not start the real lab client's metadata fetch.
vi.mock('../../shared/lab.tsx', () => ({
  useLabScreen: () => {},
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

it.each([false, true])(
  'autoPause persists only in native mode (file=%s) and file entry has no authored init',
  async (foreign) => {
    vi.resetModules();
    window.history.replaceState(null, '', foreign ? '/colony/?file=1' : '/colony/');
    vi.stubGlobal('localStorage', window.localStorage);
    const { useColony: useCurrent } = await import('./useColony.ts');
    const post = vi.fn();
    vi.stubGlobal(
      'Worker',
      class {
        postMessage = post;
        addEventListener() {}
        removeEventListener() {}
        terminate() {}
      },
    );
    const writes = vi.spyOn(window.localStorage, 'setItem');
    let current: Colony | undefined;
    usePolicyColony = useCurrent;
    const root = createRoot(document.createElement('div'));
    try {
      flushSync(() =>
        root.render(
          createElement(PolicyColony, {
            capture: (value) => {
              current = value;
            },
          }),
        ),
      );
      await vi.waitFor(() => expect(post.mock.calls.length).toBeGreaterThan(0));
      writes.mockClear();
      flushSync(() => requireValue(current).actions.setAutoPause(false));
      expect(requireValue(current).playback.autoPause).toBe(false);
      expect(post.mock.calls.some(([m]) => m.type === 'setAutoPause' && m.on === false)).toBe(true);
      expect(writes.mock.calls.filter(([key]) => key === 'colony.autoPause')).toHaveLength(foreign ? 0 : 1);
      expect(post.mock.calls.some(([m]) => m.type === 'init')).toBe(!foreign);
      if (foreign) {
        expect(requireValue(post.mock.calls[0])[0]).toEqual({ type: 'fileSession' });
        expect(() => requireValue(current).actions.restart()).toThrow(/file/i);
        expect(() => requireValue(current).actions.loadPlaytest('{}', true)).toThrow(/file/i);
      }
    } finally {
      flushSync(() => root.unmount());
      writes.mockRestore();
      vi.unstubAllGlobals();
      window.history.replaceState(null, '', '/');
    }
  },
);

it('file-mode Well App renders a chooser before any native save read or authored worker init', async () => {
  vi.resetModules();
  window.history.replaceState(null, '', '/colony/?file=1');
  const { App } = await import('./App.tsx');
  const post = vi.fn();
  vi.stubGlobal(
    'Worker',
    class {
      postMessage = post;
      addEventListener() {}
      removeEventListener() {}
      terminate() {}
    },
  );
  const reads = vi.spyOn(Storage.prototype, 'getItem'),
    writes = vi.spyOn(Storage.prototype, 'setItem');
  const node = document.createElement('div'),
    root = createRoot(node);
  try {
    flushSync(() => root.render(createElement(App)));
    expect(node.textContent).toContain('This file stays in this tab.');
    expect(node.querySelector('input[type=file]')).not.toBeNull();
    expect(node.textContent).not.toContain('Begin the first morning');
    expect(post.mock.calls.some(([message]) => message.type === 'init')).toBe(false);
    expect(reads).not.toHaveBeenCalled();
    expect(writes).not.toHaveBeenCalled();
    const picker = requireValue(node.querySelector<HTMLInputElement>('input[type=file]'));
    let resolveOld: (bytes: ArrayBuffer) => void = () => {};
    const oldRead = new Promise<ArrayBuffer>((resolve) => {
      resolveOld = resolve;
    });
    const latest = '{"syntheticChooser":"latest"}';
    const select = (read: () => Promise<ArrayBuffer>) => {
      Object.defineProperty(picker, 'files', {
        configurable: true,
        value: [{ size: 100, arrayBuffer: read }],
      });
      picker.dispatchEvent(new Event('change', { bubbles: true }));
    };
    flushSync(() => select(() => oldRead));
    flushSync(() => select(async () => new TextEncoder().encode(latest).buffer));
    await vi.waitFor(() =>
      expect(
        post.mock.calls
          .map(([message]) => message)
          .filter((message) => message.type === 'loadPlaytest')
          .map((message) => message.text),
      ).toEqual([latest]),
    );
    resolveOld(new Uint8Array([0xff]).buffer);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(
      post.mock.calls
        .map(([message]) => message)
        .filter((message) => message.type === 'loadPlaytest')
        .map((message) => message.text),
    ).toEqual([latest]);
    expect(node.querySelector('[role=alert]')).toBeNull();
    let resolveCancelled: (bytes: ArrayBuffer) => void = () => {};
    const cancelled = new Promise<ArrayBuffer>((resolve) => {
      resolveCancelled = resolve;
    });
    flushSync(() => select(() => cancelled));
    flushSync(() => picker.dispatchEvent(new Event('cancel')));
    resolveCancelled(new TextEncoder().encode('{"syntheticChooser":"cancelled"}').buffer);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(
      post.mock.calls
        .map(([message]) => message)
        .filter((message) => message.type === 'loadPlaytest')
        .map((message) => message.text),
    ).toEqual([latest]);
  } finally {
    flushSync(() => root.unmount());
    reads.mockRestore();
    writes.mockRestore();
    vi.unstubAllGlobals();
    window.history.replaceState(null, '', '/');
  }
});
