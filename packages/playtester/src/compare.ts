/**
 * SCOPE: two cohort summaries of the same game, an earlier build and a later one, compared on what players felt:
 * boredom, quit points, rewards, edges, session length, engagement and the returner's evenings. Read-only over the
 * summaries. A difference is reported as a change only past a small noise line (`COMPARE_DEFAULTS`), and the text
 * says how many sessions each side had: with two or three seeds a persona, a single session moves a rate a lot.
 * This is the loop the owner called recursive improvement: change the game, rerun the cohort, read the comparison.
 */
import type { CohortSummary } from './cohort.ts';
import type { Edge } from './edges.ts';

export const COMPARE_DEFAULTS = {
  /** Smallest change reported: minutes, engagement, rewards per session. */
  minutes: 1,
  engagement: 0.03,
  rewards: 0.5,
};

export interface PersonaDelta {
  persona: string;
  sessions: [number, number];
  minutes: [number, number];
  engagement: [number, number];
  bored: [number, number];
  frustrated: [number, number];
  rewards: [number, number];
  quit: [number, number];
  wins: [number, number];
  /** Chapters where the player put it down by choice, before and after. */
  quitAt: [Record<string, number>, Record<string, number>];
  returned?: [string, string];
}

export interface CohortComparison {
  game: string;
  from: string;
  to: string;
  personas: PersonaDelta[];
  boredAt: [Record<string, number>, Record<string, number>];
  edges: { added: Edge[]; removed: Edge[]; relabelled: { edge: Edge; was: Edge['label'] }[] };
  /** Plain lines, worst news first. */
  lines: string[];
}

const keyOf = (e: Edge) => `${e.kind}|${e.subject}`;
const sum = (r: Record<string, number>) => Object.values(r).reduce((a, b) => a + b, 0);

export function compareCohorts(a: CohortSummary, b: CohortSummary): CohortComparison {
  const C = COMPARE_DEFAULTS;
  if (a.game.split('@')[0] !== b.game.split('@')[0])
    throw new Error(`different games: ${a.game} vs ${b.game}`);
  const personas: PersonaDelta[] = [];
  const worse: string[] = [];
  const better: string[] = [];
  const same: string[] = [];
  const changed: string[] = [];
  const ids = [...new Set([...a.personas.map((p) => p.persona), ...b.personas.map((p) => p.persona)])];
  for (const id of ids) {
    const x = a.personas.find((p) => p.persona === id);
    const y = b.personas.find((p) => p.persona === id);
    if (!x || !y) {
      same.push(`${id}: only in ${x ? a.build : b.build}`);
      continue;
    }
    const d: PersonaDelta = {
      persona: id,
      sessions: [x.sessions, y.sessions],
      minutes: [x.minutes.mean, y.minutes.mean],
      engagement: [x.engagement, y.engagement],
      bored: [x.boredSessions, y.boredSessions],
      frustrated: [x.frustratedSessions, y.frustratedSessions],
      rewards: [x.rewardsPerSession, y.rewardsPerSession],
      quit: [x.ended.quit, y.ended.quit],
      wins: [x.outcomes.win ?? 0, y.outcomes.win ?? 0],
      quitAt: [x.quitAt, y.quitAt],
    };
    if (x.returned && y.returned)
      d.returned = [
        `${x.returned.evenings}/${x.returned.possible}`,
        `${y.returned.evenings}/${y.returned.possible}`,
      ];
    personas.push(d);
    const n = `${id} (${x.sessions}→${y.sessions} sessions)`;
    const rate = (k: number, s: number) => k / Math.max(1, s);
    const boredUp = rate(y.boredSessions, y.sessions) - rate(x.boredSessions, x.sessions);
    if (boredUp > 0) worse.push(`${n}: bored in ${x.boredSessions} → ${y.boredSessions} sessions`);
    else if (boredUp < 0) better.push(`${n}: bored in ${x.boredSessions} → ${y.boredSessions} sessions`);
    const quitUp = rate(y.ended.quit, y.sessions) - rate(x.ended.quit, x.sessions);
    if (quitUp !== 0)
      (quitUp > 0 ? worse : better).push(
        `${n}: put it down by choice ${x.ended.quit} → ${y.ended.quit}${quitUp > 0 ? ` (at ${top(y.quitAt)})` : ''}`,
      );
    // Session length is reported, not judged: a finite game finished sooner is not worse.
    const dm = y.minutes.mean - x.minutes.mean;
    if (Math.abs(dm) >= C.minutes) changed.push(`${n}: ${x.minutes.mean} → ${y.minutes.mean} min a session`);
    const de = y.engagement - x.engagement;
    if (Math.abs(de) >= C.engagement)
      (de > 0 ? better : worse).push(`${n}: engagement ${x.engagement} → ${y.engagement}`);
    const dr = y.rewardsPerSession - x.rewardsPerSession;
    if (Math.abs(dr) >= C.rewards)
      (dr > 0 ? better : worse).push(
        `${n}: ${x.rewardsPerSession} → ${y.rewardsPerSession} rewards a session`,
      );
    const dp = (y.provokedPerSession ?? 0) - (x.provokedPerSession ?? 0);
    if (Math.abs(dp) >= C.rewards)
      (dp > 0 ? better : worse).push(
        `${n}: provocations answered ${x.provokedPerSession ?? 0} → ${y.provokedPerSession ?? 0} a session`,
      );
    const fr = rate(y.frustratedSessions, y.sessions) - rate(x.frustratedSessions, x.sessions);
    if (fr !== 0)
      (fr > 0 ? worse : better).push(
        `${n}: frustrated in ${x.frustratedSessions} → ${y.frustratedSessions} sessions`,
      );
    if (d.returned && d.returned[0] !== d.returned[1]) {
      const [ra, rb] = [x.returned, y.returned].map((r) => rate(r?.evenings ?? 0, r?.possible ?? 0));
      const line = `${n}: came back ${d.returned[0]} → ${d.returned[1]} evenings`;
      if ((rb ?? 0) === (ra ?? 0)) changed.push(line);
      else ((rb ?? 0) > (ra ?? 0) ? better : worse).push(line);
    }
  }
  const ea = new Map(a.edges.map((e) => [keyOf(e), e]));
  const eb = new Map(b.edges.map((e) => [keyOf(e), e]));
  const added = b.edges.filter((e) => !ea.has(keyOf(e)));
  const removed = a.edges.filter((e) => !eb.has(keyOf(e)));
  const relabelled = b.edges
    .filter((e) => ea.has(keyOf(e)) && ea.get(keyOf(e))?.label !== e.label)
    .map((e) => ({ edge: e, was: ea.get(keyOf(e))?.label ?? e.label }));
  const edgeLines = [
    ...added.map(
      (e) => `new edge: ${e.kind} ${e.subject} [${e.label}] (${e.personas.join(', ')}): ${e.reason}`,
    ),
    ...removed.map((e) => `edge gone: ${e.kind} ${e.subject} [was ${e.label}]`),
    ...relabelled.map((r) => `edge relabelled: ${r.edge.kind} ${r.edge.subject} ${r.was} → ${r.edge.label}`),
  ];
  const lines = [
    `${a.game}: ${a.build} → ${b.build}, ${a.seeds.length}→${b.seeds.length} seeds a persona`,
    `bored moments ${sum(a.boredAt)} → ${sum(b.boredAt)}${sum(b.boredAt) ? ` (most at ${top(b.boredAt)})` : ''}`,
    ...worse.map((l) => `worse: ${l}`),
    ...better.map((l) => `better: ${l}`),
    ...changed.map((l) => `changed: ${l}`),
    ...edgeLines,
    ...same,
  ];
  if (worse.length + better.length + changed.length + edgeLines.length === 0)
    lines.push('no change past the noise lines');
  return {
    game: a.game,
    from: a.build,
    to: b.build,
    personas,
    boredAt: [a.boredAt, b.boredAt],
    edges: { added, removed, relabelled },
    lines,
  };
}

function top(r: Record<string, number>): string {
  const [k, v] = Object.entries(r).sort((x, y) => y[1] - x[1])[0] ?? ['-', 0];
  return `${k} ×${v}`;
}
