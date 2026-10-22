/** Full runs cross the worker boundary only when sampled; rendering frames are never used as saves. */
export type TelemetryRequest = { type: 'telemetry'; requestId: number };
export type TelemetryReply =
  | { type: 'telemetry'; requestId: number; run?: unknown; logs?: unknown[]; error?: string }
  | { type: 'saved'; value: unknown };
export type TelemetryMessage = (TelemetryReply | { type: 'error'; message: string }) & { gen: number };

export type LabTelemetry = {
  readonly eventsOn?: boolean;
  trackRun?: (
    getRun: () => Promise<unknown>,
    options: { runKey: () => number; getLogs: () => string[] },
  ) => () => void;
  captureSave?: (value: unknown) => void;
  log?: (level: 'error' | 'warn' | 'game', message: string) => void;
};

/** The client owns sampling cadence, storage preference and delivery. */
export function trackWorkerRun(worker: Worker, lab: LabTelemetry, generation: () => number): () => void {
  return trackTransportRun(
    {
      post: (request) => worker.postMessage(request),
      listen: (receive) => {
        const listener = (event: MessageEvent<TelemetryMessage>) => receive(event.data);
        worker.addEventListener('message', listener);
        return () => worker.removeEventListener('message', listener);
      },
    },
    lab,
    generation,
  );
}

export function trackTransportRun(
  transport: {
    post: (request: TelemetryRequest) => void;
    listen: (receive: (reply: TelemetryMessage) => void) => () => void;
  },
  lab: LabTelemetry,
  generation: () => number,
): () => void {
  let seq = 0;
  let logGeneration = generation();
  const seen = new Set<string>();
  let lines: string[] = [];
  const pending = new Map<
    number,
    { resolve: (run: unknown) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }
  >();
  const message = (reply: TelemetryMessage) => {
    if (reply.type === 'error') {
      if (reply.gen === generation()) lab.log?.('error', reply.message);
      return;
    }
    if (reply.type === 'saved') {
      if (reply.gen === generation()) lab.captureSave?.(reply.value);
      return;
    }
    if (reply.type !== 'telemetry') return;
    const wait = pending.get(reply.requestId);
    if (!wait) return;
    pending.delete(reply.requestId);
    clearTimeout(wait.timer);
    if (reply.gen !== generation() || reply.error) wait.reject(new Error(reply.error ?? 'Run changed'));
    else {
      if (logGeneration !== reply.gen) {
        logGeneration = reply.gen;
        seen.clear();
        lines = [];
      }
      for (const entry of reply.logs ?? []) {
        const line = JSON.stringify(entry);
        if (line === undefined || seen.has(line)) continue;
        seen.add(line);
        lines.push(line.slice(0, 1000));
      }
      wait.resolve(reply.run);
    }
  };
  const unlisten = transport.listen(message);
  const stop = lab.trackRun?.(
    () =>
      new Promise((resolve, reject) => {
        const requestId = ++seq;
        const timer = setTimeout(() => {
          pending.delete(requestId);
          reject(new Error('Run snapshot timed out'));
        }, 10_000);
        pending.set(requestId, { resolve, reject, timer });
        transport.post({ type: 'telemetry', requestId });
      }),
    {
      runKey: generation,
      getLogs: () => {
        const result = lines;
        lines = [];
        return result;
      },
    },
  );
  return () => {
    stop?.();
    unlisten();
    for (const wait of pending.values()) {
      clearTimeout(wait.timer);
      wait.reject(new Error('Run closed'));
    }
    pending.clear();
  };
}
