/**
 * A read-only summary of a play session: where the persona was held, where it drifted, what hurt and what
 * rewarded it, and why it stopped. Reads only the trace; changes nothing.
 */
import type { SessionTrace } from './session.ts';

export interface SessionReading {
  persona: string;
  game: string;
  seed: number;
  minutes: number;
  ended: SessionTrace['ended'];
  /** Share of beats spent on each kind of choice. */
  choices: Record<string, number>;
  meanEngagement: number;
  /** The longest run of beats with engagement under the neutral level, with where it started. */
  longestLull: { seconds: number; from: string; phase: string };
  bored: string[];
  frustrated: string[];
  rewarded: string[];
  lookedAway: number;
}

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

export function readSession(trace: SessionTrace, neutral = 0.45): SessionReading {
  const n = trace.beats.length || 1;
  const choices: Record<string, number> = {};
  for (const b of trace.beats) {
    const k = b.stance === 'play' ? (b.choice === 'wait' ? 'watch' : 'input') : b.stance;
    choices[k] = (choices[k] ?? 0) + 1 / n;
  }
  for (const k of Object.keys(choices)) choices[k] = Math.round((choices[k] ?? 0) * 100) / 100;
  let best = { seconds: 0, from: '', phase: '' };
  let run = 0;
  let start = trace.beats[0];
  const step = trace.beats.length > 1 ? (trace.beats[1]?.t ?? 0) - (trace.beats[0]?.t ?? 0) : 0;
  for (const b of trace.beats) {
    if (b.engagement < neutral) {
      if (run === 0) start = b;
      run += 1;
      if (run * step > best.seconds && start)
        best = { seconds: run * step, from: start.clock, phase: start.phase };
    } else run = 0;
  }
  const at = (m: { t: number; clock: string; text: string }) => `${mmss(m.t)} (${m.clock}): ${m.text}`;
  return {
    persona: trace.persona,
    game: trace.game,
    seed: trace.seed,
    minutes: Math.round((trace.ended.t / 60) * 10) / 10,
    ended: trace.ended,
    choices,
    meanEngagement: Math.round((trace.beats.reduce((s, b) => s + b.engagement, 0) / n) * 100) / 100,
    longestLull: best,
    bored: trace.moments.filter((m) => m.kind === 'bored').map(at),
    frustrated: trace.moments.filter((m) => m.kind === 'frustrated').map(at),
    rewarded: trace.moments.filter((m) => m.kind === 'rewarded').map(at),
    lookedAway: trace.moments.filter((m) => m.kind === 'looked-away').length,
  };
}
