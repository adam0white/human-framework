import { expect, it, vi } from 'vitest';
import { type LabTelemetry, type TelemetryMessage, trackTransportRun } from './worker-telemetry.ts';

it('samples complete worker runs, rejects stale replies and captures only successful current saves', async () => {
  let receive!: (reply: TelemetryMessage) => void;
  let sample!: () => Promise<unknown>;
  let generation = 1;
  let getLogs!: () => string[];
  const post = vi.fn();
  const captureSave = vi.fn();
  const unlisten = vi.fn();
  const stopClient = vi.fn();
  const lab: LabTelemetry = {
    captureSave,
    trackRun: (getRun, options) => {
      sample = getRun;
      getLogs = options.getLogs;
      expect(options.runKey()).toBe(1);
      return stopClient;
    },
  };
  const stop = trackTransportRun(
    {
      post,
      listen: (listener) => {
        receive = listener;
        return unlisten;
      },
    },
    lab,
    () => generation,
  );
  const run = {
    seed: 7,
    log: [{ input: 'start' }],
    state: { minute: 10, people: [{ memory: ['remembered'] }] },
  };
  const first = sample();
  receive({
    type: 'telemetry',
    requestId: post.mock.lastCall?.[0].requestId,
    gen: 1,
    run,
    logs: [{ text: 'line' }, { text: 'line' }],
  });
  expect(await first).toEqual(run);
  expect(getLogs()).toEqual(['{"text":"line"}']);
  expect(getLogs()).toEqual([]);
  const stale = sample();
  generation = 2;
  receive({ type: 'telemetry', requestId: post.mock.lastCall?.[0].requestId, gen: 1, run });
  await expect(stale).rejects.toThrow('Run changed');
  receive({ type: 'saved', gen: 1, value: run });
  expect(captureSave).not.toHaveBeenCalled();
  receive({ type: 'saved', gen: 2, value: run });
  expect(captureSave).toHaveBeenCalledWith(run);
  stop();
  expect(stopClient).toHaveBeenCalledOnce();
  expect(unlisten).toHaveBeenCalledOnce();
});
