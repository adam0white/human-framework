/**
 * Runs the end screen's hindsight replay (`sim/hindsight.ts`) off the main thread and off the game worker, so
 * neither the page nor the villages stall while it plays the branches. One request, one reply; the page starts
 * it lazily when a Day-2 report with a missed Human goal is shown, and terminates it when the report closes.
 */
import type { LogEntry } from './sim/game.ts';
import { type Hindsight, hindsight } from './sim/hindsight.ts';
import { createFrameworkHumanSide } from './sim/human.ts';

export interface HindsightRequest {
  seed: number;
  log: LogEntry[];
}

export type HindsightReply = { ok: true; result: Hindsight | null } | { ok: false; message: string };

addEventListener('message', (e: MessageEvent<HindsightRequest>) => {
  let reply: HindsightReply;
  try {
    reply = { ok: true, result: hindsight(e.data.seed, createFrameworkHumanSide, e.data.log) };
  } catch (err) {
    reply = { ok: false, message: err instanceof Error ? err.message : String(err) };
  }
  postMessage(reply);
});
