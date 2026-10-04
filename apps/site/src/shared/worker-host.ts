/**
 * The worker side of a game's message seam: every reply carries the run's `gen` so the page can drop replies
 * from an earlier run, and a throwing handler becomes an `error` reply instead of a dead worker. Extracted for
 * Game 3 from `colony/worker.ts` and `voice/worker.ts` (quality review, 2026-10-04 §4); Games 1–2 still carry
 * their own copies.
 */
export interface ErrorReply {
  type: 'error';
  message: string;
}

export interface WorkerHost<Reply extends { type: string }> {
  /** The run generation echoed on every reply; set it on `init`. */
  gen: number;
  post(msg: Reply | ErrorReply): void;
}

export function hostWorker<In, Reply extends { type: string }>(
  handle: (msg: In, host: WorkerHost<Reply>) => void,
): WorkerHost<Reply> {
  const host: WorkerHost<Reply> = {
    gen: 0,
    post(msg) {
      postMessage({ ...msg, gen: host.gen });
    },
  };
  addEventListener('message', (e: MessageEvent<In>) => {
    try {
      handle(e.data, host);
    } catch (err) {
      host.post({ type: 'error', message: err instanceof Error ? err.message : String(err) });
    }
  });
  return host;
}
