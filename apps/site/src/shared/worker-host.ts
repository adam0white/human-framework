/**
 * The worker side of a game's message seam: every reply carries the run's `gen` so the page can drop replies
 * from an earlier run, and a throwing handler becomes an `error` reply instead of a dead worker. Shared by all
 * three games' workers since the quality review (2026-10-04 §4).
 */
export interface ErrorReply {
  type: 'error';
  message: string;
}

export interface WorkerHost<Reply extends { type: string }> {
  /** The run generation echoed on every reply; set it on `init`. */
  gen: number;
  /** Post a reply on `host.gen`, or on `gen` when given (a failed playtest load answers on the run it asked for). */
  post(msg: Reply | ErrorReply, gen?: number): void;
}

export function hostWorker<In, Reply extends { type: string }>(
  handle: (msg: In, host: WorkerHost<Reply>) => void,
): WorkerHost<Reply> {
  const host: WorkerHost<Reply> = {
    gen: 0,
    post(msg, gen = host.gen) {
      postMessage({ ...msg, gen });
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
