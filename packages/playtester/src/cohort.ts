/**
 * SCOPE: a cohort is N personas × M seeds played against one build of a game, summarised as one plain-JSON
 * `CohortSummary` per build: how sessions ended and where, engagement, boredom, frustration and reward, inputs by
 * kind, the returner's evenings, and the edges reached (`edges.ts`). The summary is what two builds are compared
 * on (`compare.ts`) and what the designer experiment reads (`designer.ts`); it holds no game state and no HF state,
 * only what the traces recorded. Each session gets a fresh game from `make(seed)`; a returner keeps its game
 * across its evenings. Deterministic for the same build, personas and seeds.
 */
import type { GameAdapter } from './adapter.ts';
import { type Edge, findEdges, type PlayedSession } from './edges.ts';
import { PERSONAS, type Persona } from './persona.ts';
import { readSession } from './reading.ts';
import { type DaysTrace, playDays } from './returner.ts';
import { playSession, type SessionTrace } from './session.ts';

export interface CohortSpec {
  /** Game name and a build label (a commit, a version) for the summary. */
  game: string;
  build: string;
  /** A fresh game for a session seed. */
  make: (seed: number) => GameAdapter;
  /** Default: every preset in `PERSONAS`. */
  personas?: readonly Persona[];
  /** Session seeds (each persona plays each). */
  seeds: readonly number[];
  maxMinutes?: number;
}

export interface PersonaSummary {
  persona: string;
  style?: string;
  sessions: number;
  minutes: { mean: number; min: number; max: number };
  ended: Record<SessionTrace['ended']['reason'], number>;
  /** How ended games read: win, loss, mixed; 'none' when the session stopped before the end. */
  outcomes: Record<string, number>;
  engagement: number;
  /** Sessions with at least one bored or frustrated moment. */
  boredSessions: number;
  frustratedSessions: number;
  rewardsPerSession: number;
  /**
   * Mischief-maker only: provocations the game rose to, a session. This is that player's reward ("they rose to
   * it"); it is recorded as an 'answered' moment, not as a reward, so it is counted here.
   */
  provokedPerSession?: number;
  /** Longest lull per session: median and max seconds, and the chapter where the longest one began. */
  lull: { median: number; max: number; where: string };
  /** Chapters where the player put it down by choice (reason 'quit'), and where every session ended. */
  quitAt: Record<string, number>;
  endedAt: Record<string, number>;
  /** Share of input beats by action kind. */
  inputs: Record<string, number>;
  /** Share of inputs that were edge actions. */
  edgeShare: number;
  /** Returner only: evenings it came back, of those it could have, and why it decided each time. */
  returned?: { evenings: number; possible: number; why: Record<string, number> };
}

export interface CohortSummary {
  game: string;
  build: string;
  seeds: number[];
  personas: PersonaSummary[];
  /** Bored moments by chapter, over every session. */
  boredAt: Record<string, number>;
  /** Frustrated moments by what caused them (numbers stripped), top ten. */
  frustratedBy: Record<string, number>;
  /** Rewards shown (event valence at least the reward line) by event kind. */
  rewardedBy: Record<string, number>;
  edges: Edge[];
  note: string;
}

export interface Cohort {
  summary: CohortSummary;
  played: PlayedSession[];
  days: DaysTrace[];
}

const round2 = (x: number) => Math.round(x * 100) / 100;
const bump = (r: Record<string, number>, k: string, by = 1) => {
  r[k] = (r[k] ?? 0) + by;
};
const sortRecord = (r: Record<string, number>, top?: number) =>
  Object.fromEntries(
    Object.entries(r)
      .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
      .slice(0, top),
  );
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? (s[Math.floor((s.length - 1) / 2)] ?? 0) : 0;
};
const chapterAt = (tr: SessionTrace, t: number) => {
  let c = tr.beats[0]?.chapter ?? '';
  for (const b of tr.beats) {
    if (b.t > t) break;
    c = b.chapter;
  }
  return c;
};

/** Play the cohort and summarise it. */
export function runCohort(spec: CohortSpec): Cohort {
  const personas = spec.personas ?? (Object.values(PERSONAS) as Persona[]);
  const played: PlayedSession[] = [];
  const days: DaysTrace[] = [];
  const opts = spec.maxMinutes ? { maxMinutes: spec.maxMinutes } : {};
  for (const persona of personas)
    for (const seed of spec.seeds) {
      const game = spec.make(seed);
      if (persona.returnDays) {
        const d = playDays(game, persona, seed, opts);
        days.push(d);
        for (const trace of d.sessions) played.push({ persona, trace });
      } else played.push({ persona, trace: playSession(game, persona, seed, opts) });
    }
  return { summary: summarise(spec, personas, played, days), played, days };
}

/** The summary of played sessions (see SCOPE). Exposed for hosts that run sessions themselves. */
export function summarise(
  spec: Pick<CohortSpec, 'game' | 'build' | 'seeds'>,
  personas: readonly Persona[],
  played: readonly PlayedSession[],
  days: readonly DaysTrace[] = [],
): CohortSummary {
  const boredAt: Record<string, number> = {};
  const frustratedBy: Record<string, number> = {};
  const rewardedBy: Record<string, number> = {};
  const out: PersonaSummary[] = [];
  for (const persona of personas) {
    const mine = played.filter((x) => x.persona.id === persona.id).map((x) => x.trace);
    if (mine.length === 0) continue;
    const readings = mine.map((tr) => readSession(tr));
    const ended: PersonaSummary['ended'] = { quit: 0, agenda: 0, 'game-over': 0, 'time-limit': 0 };
    const outcomes: Record<string, number> = {};
    const quitAt: Record<string, number> = {};
    const endedAt: Record<string, number> = {};
    const inputs: Record<string, number> = {};
    let inputBeats = 0;
    let edgeBeats = 0;
    let lullWhere = { s: -1, where: '' };
    for (const [i, tr] of mine.entries()) {
      ended[tr.ended.reason] += 1;
      bump(outcomes, tr.ended.reason === 'game-over' ? (tr.final.outcome ?? 'mixed') : 'none');
      bump(endedAt, tr.final.chapter);
      if (tr.ended.reason === 'quit') bump(quitAt, tr.final.chapter);
      for (const b of tr.beats) {
        if (b.choice !== 'wait') {
          inputBeats += 1;
          bump(inputs, b.kind);
          if (b.edge) edgeBeats += 1;
        }
        for (const e of b.shown) if (e.v >= 0.45) bump(rewardedBy, e.k);
      }
      for (const m of tr.moments) {
        if (m.kind === 'bored') bump(boredAt, chapterAt(tr, m.t));
        if (m.kind === 'frustrated') bump(frustratedBy, m.text.replace(/\d+/g, '#').slice(0, 90));
      }
      const r = readings[i];
      if (r && r.longestLull.seconds > lullWhere.s)
        lullWhere = { s: r.longestLull.seconds, where: chapterAt(tr, lullStart(tr, r.longestLull.from)) };
    }
    for (const k of Object.keys(inputs)) inputs[k] = round2((inputs[k] ?? 0) / Math.max(1, inputBeats));
    const mins = readings.map((r) => r.minutes);
    const ps: PersonaSummary = {
      persona: persona.id,
      sessions: mine.length,
      minutes: {
        mean: round2(mins.reduce((a, b) => a + b, 0) / mins.length),
        min: Math.min(...mins),
        max: Math.max(...mins),
      },
      ended,
      outcomes: sortRecord(outcomes),
      engagement: round2(readings.reduce((s, r) => s + r.meanEngagement, 0) / readings.length),
      boredSessions: readings.filter((r) => r.bored.length > 0).length,
      frustratedSessions: readings.filter((r) => r.frustrated.length > 0).length,
      rewardsPerSession: round2(readings.reduce((s, r) => s + r.rewarded.length, 0) / readings.length),
      lull: {
        median: median(readings.map((r) => r.longestLull.seconds)),
        max: Math.max(0, ...readings.map((r) => r.longestLull.seconds)),
        where: lullWhere.where,
      },
      quitAt: sortRecord(quitAt),
      endedAt: sortRecord(endedAt),
      inputs: sortRecord(inputs),
      edgeShare: round2(edgeBeats / Math.max(1, inputBeats)),
    };
    if (persona.style) ps.style = persona.style;
    if (persona.style === 'mischief')
      ps.provokedPerSession = round2(
        mine.reduce((n, tr) => n + tr.moments.filter((m) => m.kind === 'answered').length, 0) / mine.length,
      );
    const mineDays = days.filter((d) => d.persona === persona.id);
    if (mineDays.length > 0) {
      const why: Record<string, number> = {};
      let evenings = 0;
      let possible = 0;
      for (const d of mineDays) {
        for (const x of d.decisions) {
          possible += 1;
          if (x.returned) evenings += 1;
          bump(why, `${x.returned ? 'came back' : 'stayed away'}: ${x.why}`);
        }
      }
      ps.returned = { evenings, possible, why: sortRecord(why) };
    }
    out.push(ps);
  }
  return {
    game: spec.game,
    build: spec.build,
    seeds: [...spec.seeds],
    personas: out,
    boredAt: sortRecord(boredAt),
    frustratedBy: sortRecord(frustratedBy, 10),
    rewardedBy: sortRecord(rewardedBy),
    edges: findEdges(played),
    note: 'Edge labels are rules written down (edges.ts), not judgements; every number is a playtesting premise, not an estimate of real players.',
  };
}

function lullStart(tr: SessionTrace, clock: string): number {
  return tr.beats.find((b) => b.clock === clock)?.t ?? 0;
}
