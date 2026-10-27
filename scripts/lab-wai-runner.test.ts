/** One synthetic driver control: definite local refusals leave smaller stages available. */
import { EventEmitter } from 'node:events';
import { rm } from 'node:fs/promises';
import { afterEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  home: `${process.env.HOME ?? process.cwd()}/code/.lab-scratch/codex/wai-runner-test-${process.pid}`,
  refill: vi.fn(),
}));
vi.mock('node:os', () => ({ homedir: () => mocks.home }));
vi.mock('./lab-wai-reading.ts', () => ({
  runReadingAndVariants: vi.fn(),
  refillReading: mocks.refill,
}));
vi.mock('node:child_process', async (original) => ({
  ...(await original<typeof import('node:child_process')>()),
  spawn: () => {
    const child = Object.assign(new EventEmitter(), {
      stdout: new EventEmitter(),
      exitCode: null as number | null,
      kill: () => {
        child.exitCode = 0;
        child.emit('exit', 0);
        return true;
      },
    });
    queueMicrotask(() => child.stdout.emit('data', Buffer.from('{"port":19370,"driver_check":true}\n')));
    return child;
  },
}));

import { runDaily } from './lab-wai-play.ts';

const argv = [...process.argv];
afterEach(async () => {
  process.argv = [...argv];
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  await rm(mocks.home, { recursive: true, force: true });
});
it('continues to control and refill after a local refusal and claims the UTC day only once', async () => {
  process.argv = [...argv, '--scheduled'];
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ json: async () => ({ visible: 'A choice is available.' }) })),
  );
  vi.spyOn(console, 'log').mockImplementation(() => {});
  const infer = vi
    .fn()
    .mockRejectedValueOnce(new Error('STOP: daily neuron cap reached'))
    .mockResolvedValueOnce(
      JSON.stringify({
        op: { op: 'log', kind: 'stop', reason: 'FINISHED', reaction: 'I made one choice.' },
        report: 'Control report.',
      }),
    );
  const budget = { models: async () => ['@cf/qwen/qwen3-30b-a3b-fp8'], infer, summary: async () => ({}) };
  const now = new Date();
  const result = await runDaily(budget, now);
  expect(result.halted).toBe(false);
  expect(infer.mock.calls).toHaveLength(2);
  expect(infer.mock.calls[1]?.[5]).toBe('control');
  expect(mocks.refill).toHaveBeenCalledOnce();
  await expect(runDaily(budget, now)).rejects.toThrow('EEXIST');
  expect(infer.mock.calls).toHaveLength(2);
});
