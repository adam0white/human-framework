/**
 * SCOPE: edges a cohort reached, read from session traces alone (what was shown and what was pressed), never from
 * the game's state. Each edge gets a label, "fun to keep" or "close", and the rule that gave it. The labels are
 * heuristics written down as rules, not judgements: a designer reads the reason and decides. The owner's direction
 * (2026-10-19) is that an edge players find should stay a bit fun and enter the game's own calculations rather
 * than only be closed, so the rules lean to "fun to keep" unless the edge collapses play or wins without play.
 *
 * Kinds:
 * - dominant-strategy: in a session with a real choice (on average at least two inputs on offer), one input is at
 *   least `dominantShare` of the inputs and the session's reward rate is above zero and at least the cohort's.
 *   Keep when players doing it stay engaged and never bored; close when they get bored on it.
 * - degenerate-loop: with a real choice on offer, the same input `loopRun` times running, or two alternating for
 *   twice that. Keep when new kinds of reward came during the run, or when the game kept answering it and
 *   engagement held; close otherwise.
 * - unexpected-win: a win in which under `idleShare` of beats held an input the game answered (close: the game
 *   plays itself), or a win by an edge-pusher's style (keep: misbehaviour is playable; close when a dominant input
 *   won it).
 * - mischief-ignored / mischief-answered: a provocation tried `minTries` times that the game answered under
 *   `ignoredRate` of the time (keep: give it an answer; close when sessions with it end in losses clearly more
 *   often than the rest) or at least `answeredRate` (keep: already part of play; grouped by input kind). Tallied
 *   over mischief beats only, so an id also offered plainly is not counted as mischief.
 * - silent-input: an ordinary input pressed at least `minTries` times with a full window after it, after which
 *   nothing at all was shown (close: a tap with no visible answer reads as a bug).
 * An edge seen in several sessions gets one label, by majority (ties close), with both counts in the detail.
 */

import { answers } from './adapter.ts';
import type { Persona } from './persona.ts';
import type { Beat, SessionTrace } from './session.ts';
import { STYLE_DEFAULTS } from './style.ts';

export const EDGE_DEFAULTS = {
  dominantShare: 0.6,
  /** Sessions with fewer inputs than this are not checked for dominance. */
  dominantMinInputs: 20,
  loopRun: 8,
  /** Engagement drop over a loop still counted as holding. */
  loopHold: 0.05,
  idleShare: 0.1,
  minTries: 3,
  ignoredRate: 0.25,
  answeredRate: 0.75,
  /** How much more often than the cohort sessions with an ignored provocation must end in a loss to close it. */
  costlyMargin: 0.25,
  /** Event valence counted as a reward (the session's `rewardedAt`). */
  reward: 0.45,
};

export type EdgeKind =
  | 'dominant-strategy'
  | 'degenerate-loop'
  | 'unexpected-win'
  | 'mischief-ignored'
  | 'mischief-answered'
  | 'silent-input';

export interface Edge {
  kind: EdgeKind;
  /** The input id (or ids) involved, or the session's style for a win. */
  subject: string;
  label: 'fun to keep' | 'close';
  reason: string;
  sessions: number;
  personas: string[];
  detail: string;
}

export interface PlayedSession {
  persona: Persona;
  trace: SessionTrace;
}

type Finding = Omit<Edge, 'sessions' | 'personas'>;

const rewardsOf = (b: Beat) => b.shown.filter((e) => e.v >= EDGE_DEFAULTS.reward).length;
const minutesOf = (tr: SessionTrace) => Math.max(1 / 60, tr.ended.t / 60);
const round2 = (x: number) => Math.round(x * 100) / 100;
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);

/** Whether the game answered the input at beat `i` within the window. */
function answeredAt(beats: readonly Beat[], i: number): boolean {
  const W = STYLE_DEFAULTS.window;
  const id = beats[i]?.choice ?? '';
  for (let j = i + 1; j <= i + W && j < beats.length; j++)
    if (beats[j]?.shown.some((e) => answers(e.a, id))) return true;
  return false;
}

/** Find the edges a set of sessions reached (see SCOPE). */
export function findEdges(played: readonly PlayedSession[]): Edge[] {
  const E = EDGE_DEFAULTS;
  const W = STYLE_DEFAULTS.window;
  const groups = new Map<
    string,
    { fun: number; close: number; personas: Set<string>; first: Partial<Record<Edge['label'], Finding>> }
  >();
  const add = (f: Finding, persona: string) => {
    const key = `${f.kind}|${f.subject}`;
    const g = groups.get(key) ?? { fun: 0, close: 0, personas: new Set<string>(), first: {} };
    if (f.label === 'close') g.close += 1;
    else g.fun += 1;
    g.personas.add(persona);
    g.first[f.label] ??= f;
    groups.set(key, g);
  };
  const all = played.map((x) => x.trace);
  const totalMinutes = all.reduce((s, tr) => s + minutesOf(tr), 0);
  const cohortRate =
    all.reduce((s, tr) => s + tr.beats.reduce((n, b) => n + rewardsOf(b), 0), 0) / totalMinutes;
  const cohortEngagement = mean(all.flatMap((tr) => tr.beats.map((b) => b.engagement)));
  const lossCount = all.filter((tr) => tr.final.outcome === 'loss').length;
  const lossRate = lossCount / Math.max(1, all.length);

  for (const { persona, trace } of played) {
    const beats = trace.beats;
    const idx = beats.flatMap((b, i) => (b.choice === 'wait' ? [] : [i]));
    const inputs = idx.map((i) => beats[i] as Beat);
    const bored = trace.moments.some((m) => m.kind === 'bored');
    const engagement = mean(beats.map((b) => b.engagement));
    const rate = beats.reduce((n, b) => n + rewardsOf(b), 0) / minutesOf(trace);
    const choice = mean(inputs.map((b) => b.offered)) >= 2;

    // Dominant strategy.
    let dominant: { id: string; share: number } | undefined;
    if (choice && inputs.length >= E.dominantMinInputs) {
      const count = new Map<string, number>();
      for (const b of inputs) count.set(b.choice, (count.get(b.choice) ?? 0) + 1);
      const [id, n] = [...count.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0] ?? [
        '',
        0,
      ];
      const share = n / inputs.length;
      if (share >= E.dominantShare && rate > 0 && rate >= cohortRate) {
        dominant = { id, share };
        const fun = !bored && engagement >= cohortEngagement - 0.02;
        add(
          {
            kind: 'dominant-strategy',
            subject: id,
            label: fun ? 'fun to keep' : 'close',
            reason: fun
              ? 'it pays and players doing it stay engaged: a strategy worth finding; make it visible and give it a counter'
              : 'it pays but players doing it get bored: play has collapsed to one move',
            detail: `${Math.round(share * 100)}% of inputs; ${round2(rate)} rewards a minute against ${round2(cohortRate)}`,
          },
          persona.id,
        );
      }
    }

    // Degenerate loops: the longest run of one input, or of two alternating, over consecutive input beats (waits
    // between inputs do not break a run: a player pressing the same thing whenever they press anything is looping).
    if (choice) {
      let run = { len: 0, from: 0, to: 0, ids: '' };
      for (let i = 0; i < inputs.length; ) {
        let j = i + 1;
        while (j < inputs.length && inputs[j]?.choice === inputs[i]?.choice) j++;
        if (j - i > run.len) run = { len: j - i, from: i, to: j, ids: inputs[i]?.choice ?? '' };
        i = j;
      }
      let alt = { len: 0, from: 0, to: 0, ids: '' };
      for (let i = 0; i + 1 < inputs.length; i++) {
        const a = inputs[i]?.choice;
        const b = inputs[i + 1]?.choice;
        if (a === b) continue;
        let j = i + 2;
        while (j < inputs.length && inputs[j]?.choice === ((j - i) % 2 === 0 ? a : b)) j++;
        if (j - i > alt.len) alt = { len: j - i, from: i, to: j, ids: `${a} / ${b}` };
      }
      const loop = run.len >= E.loopRun ? run : alt.len >= 2 * E.loopRun ? alt : undefined;
      if (loop) {
        const segIdx = idx.slice(loop.from, loop.to);
        const startT = beats[segIdx[0] ?? 0]?.t ?? 0;
        // The window after the run's last input, in seconds of this persona's beats.
        const endT = (beats[segIdx[segIdx.length - 1] ?? 0]?.t ?? 0) + W * persona.beatSeconds;
        const before = new Set<string>();
        const during = new Set<string>();
        for (const b of beats)
          for (const e of b.shown)
            if (e.v >= E.reward) {
              if (b.t < startT) before.add(e.k);
              else if (b.t <= endT && !before.has(e.k)) during.add(e.k);
            }
        const e0 = beats[segIdx[0] ?? 0]?.engagement ?? 0;
        const e1 = beats[segIdx[segIdx.length - 1] ?? 0]?.engagement ?? 0;
        const answered = segIdx.filter((i) => answeredAt(beats, i)).length / Math.max(1, segIdx.length);
        const fun = during.size > 0 || (answered >= E.answeredRate && e1 >= e0 - E.loopHold);
        add(
          {
            kind: 'degenerate-loop',
            subject: loop.ids,
            label: fun ? 'fun to keep' : 'close',
            reason: fun
              ? 'new rewards came, or the game kept answering it and engagement held: a rhythm, not a rut'
              : 'nothing new came of it and engagement did not hold: a rut',
            detail: `${loop.len} inputs running; engagement ${round2(e0)} → ${round2(e1)}; new reward kinds ${during.size}; answered ${Math.round(answered * 100)}%`,
          },
          persona.id,
        );
      }
    }

    // Unexpected wins.
    if (trace.final.outcome === 'win') {
      const share = idx.filter((i) => answeredAt(beats, i)).length / Math.max(1, beats.length);
      if (share < E.idleShare)
        add(
          {
            kind: 'unexpected-win',
            subject: 'idle',
            label: 'close',
            reason: 'won with the game barely answering the player: it plays itself',
            detail: `answered inputs on ${Math.round(share * 100)}% of beats`,
          },
          persona.id,
        );
      else if (persona.style) {
        const oneTrick = persona.style === 'exploit' && dominant !== undefined;
        add(
          {
            kind: 'unexpected-win',
            subject: persona.style,
            label: oneTrick ? 'close' : 'fun to keep',
            reason: oneTrick
              ? `one repeated input won it (${dominant?.id})`
              : 'an edge-pusher still won: misbehaviour is playable; check the win was earned, then keep it',
            detail: persona.label,
          },
          persona.id,
        );
      }
    }
  }

  const edges: Edge[] = [];
  for (const g of groups.values()) {
    const label: Edge['label'] = g.fun > g.close ? 'fun to keep' : 'close';
    const f = g.first[label] ?? g.first['fun to keep'] ?? g.first.close;
    if (!f) continue;
    const both = g.fun > 0 && g.close > 0 ? ` (fun to keep in ${g.fun} sessions, close in ${g.close})` : '';
    edges.push({
      ...f,
      label,
      detail: `${f.detail}${both}`,
      sessions: g.fun + g.close,
      personas: [...g.personas].sort(),
    });
  }

  // Per-input answer rates over every session: mischief and silence are properties of the game, not the player.
  // Mischief is tallied over mischief beats only (an id offered both as an edge and plainly counts once each way).
  type Tally = {
    kind: string;
    tries: number;
    answered: number;
    full: number;
    silent: number;
    lost: number;
    sessions: Set<number>;
    personas: Set<string>;
  };
  const plain = new Map<string, Tally>();
  const mischief = new Map<string, Tally>();
  played.forEach(({ persona, trace }, si) => {
    const beats = trace.beats;
    for (const [i, b] of beats.entries()) {
      if (b.choice === 'wait') continue;
      // A try in the session's last beat had no time to be answered (the game ended on it): it says nothing.
      if (i === beats.length - 1) continue;
      const into = b.mischief ? mischief : plain;
      const t = into.get(b.choice) ?? {
        kind: b.kind,
        tries: 0,
        answered: 0,
        full: 0,
        silent: 0,
        lost: 0,
        sessions: new Set<number>(),
        personas: new Set<string>(),
      };
      t.tries += 1;
      if (answeredAt(beats, i)) t.answered += 1;
      const after = beats.slice(i + 1, i + 1 + W);
      if (after.length === W) {
        t.full += 1;
        if (after.every((x) => x.shown.length === 0)) t.silent += 1;
      }
      if (!t.sessions.has(si) && trace.final.outcome === 'loss') t.lost += 1;
      t.sessions.add(si);
      t.personas.add(persona.id);
      into.set(b.choice, t);
    }
  });
  const byId = (m: Map<string, Tally>) => [...m.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1));
  // Answered provocations are grouped by input kind: one line says "insisting is already play", not one per cook.
  const answered = new Map<string, { ids: [string, Tally][]; tries: number; answered: number }>();
  for (const [id, t] of byId(mischief)) {
    if (t.tries < E.minTries) continue;
    const rate = t.answered / t.tries;
    const sessions = t.sessions.size;
    if (rate < E.ignoredRate) {
      // Sessions with it lose clearly more often than the rest of the cohort.
      const rest = all.length - sessions;
      const restLoss = rest > 0 ? (lossCount - t.lost) / rest : lossRate;
      const costly = t.lost / sessions > restLoss + E.costlyMargin;
      edges.push({
        kind: 'mischief-ignored',
        subject: id,
        label: costly ? 'close' : 'fun to keep',
        reason: costly
          ? 'it quietly costs the run with no answer: answer it on screen or do not offer it'
          : 'the game lets it pass in silence: give it an answer (a line, a small cost or a small reward) so the edge becomes play',
        sessions,
        personas: [...t.personas].sort(),
        detail: `${t.tries} tries, answered ${Math.round(rate * 100)}%`,
      });
    } else if (rate >= E.answeredRate) {
      const g = answered.get(t.kind) ?? { ids: [], tries: 0, answered: 0 };
      g.ids.push([id, t]);
      g.tries += t.tries;
      g.answered += t.answered;
      answered.set(t.kind, g);
    }
  }
  for (const [kind, g] of [...answered.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    const sessions = new Set(g.ids.flatMap(([, t]) => [...t.sessions])).size;
    const personas = [...new Set(g.ids.flatMap(([, t]) => [...t.personas]))].sort();
    const top = [...g.ids]
      .sort((a, b) => b[1].tries - a[1].tries)
      .slice(0, 3)
      .map(([id]) => id);
    edges.push({
      kind: 'mischief-answered',
      subject: kind,
      label: 'fun to keep',
      reason: 'the game answers it: provocation is already part of play',
      sessions,
      personas,
      detail: `${g.ids.length} input${g.ids.length > 1 ? 's' : ''} (${top.join(', ')}${g.ids.length > 3 ? ', …' : ''}), ${g.tries} tries, answered ${Math.round((100 * g.answered) / g.tries)}%`,
    });
  }
  for (const [id, t] of byId(plain))
    if (t.tries >= E.minTries && t.full >= E.minTries && t.silent === t.full)
      edges.push({
        kind: 'silent-input',
        subject: id,
        label: 'close',
        reason: 'nothing at all showed after it: a tap with no visible answer reads as a bug',
        sessions: t.sessions.size,
        personas: [...t.personas].sort(),
        detail: `${t.tries} tries, answered ${Math.round((t.answered / t.tries) * 100)}%`,
      });
  const order: EdgeKind[] = [
    'unexpected-win',
    'dominant-strategy',
    'degenerate-loop',
    'mischief-ignored',
    'silent-input',
    'mischief-answered',
  ];
  return edges.sort(
    (a, b) =>
      order.indexOf(a.kind) - order.indexOf(b.kind) ||
      b.sessions - a.sessions ||
      (a.subject < b.subject ? -1 : 1),
  );
}
