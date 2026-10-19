/**
 * The canonical `GameAdapter` for The Glance (github.com/adam0white/glance), the night desk at a dam: an HF persona
 * plays the engineer who asks two keepers for readings and gate turns through five storm nights. Read-only against
 * The Glance: it imports the headless sim from a checkout (`GLANCE_DIR`, default ~/code/glance) and never edits it.
 * Written against glance@1 at commit 8e694c0 (also runs 8e870e7). The game's scratch copy
 * (scripts/playtester/hf-session.ts) may drift; this one is canonical.
 *
 * What the adapter shows is what the screen shows: the board (last reading of level and bridge, and how old), the
 * radio log, the keepers' likely answers (`hint`), and the dawn page. Not the true water level or the keepers'
 * needs. Time runs at 'steady' (1.4 sim minutes per real second); the UI's slowdown while a sheet is open is not
 * modelled.
 *
 * Reward decision (2026-10-19): the game's success line is a night held with Mill Lane dry or saved. The scratch
 * adapter scored that dawn 0.3 + 0.1 per caught miss, below the playtester's reward line (0.45), so no persona was
 * ever rewarded; that was an adapter premise, not the game's. Here a held night reads 0.55 + 0.1 per caught miss
 * (up to 0.9); a held night with Mill Lane flooded reads 0.1; an overtopped dam reads -1.
 *
 * Cohort fields: `chapter` is 'N<night>' ('N2 dawn' on the dawn page); `outcome` reads the run: overtopped is a
 * loss, a flooded lane on any night is mixed, otherwise a win. `openLoop`: a night under way, or a dawn page with
 * wrong readings not caught. Keeper replies answer only inputs aimed at that keeper. Edge actions: warn Mill Lane
 * with the bridge low (a false alarm), ring the inn while it is ringing, and insist on a job a keeper would do anyway.
 */
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { GameAdapter, Observation, PlayAction, PlayEvent } from '../src/index.ts';

type KeeperId = 'dai' | 'callum';
type Job = 'level' | 'gate' | 'weir';
interface Report {
  value: number;
  at: number;
}
interface Dawn {
  night: number;
  mill: 'dry' | 'saved' | 'flooded';
  overtopped: boolean;
  misses: { at: number; who: string; caught: boolean }[];
}
interface GameState {
  night: number;
  phase: 'watch' | 'dawn' | 'end';
  minute: number;
  board: Record<'level' | 'weir' | 'gate' | 'bridge', Report | null>;
  nerys: { ringing: number | null };
  warnedAt: number | null;
  said: { at: number; who: string; text: string; kind: string }[];
  dawns: Dawn[];
}
type NewInput =
  | { kind: 'ask'; keeper: KeeperId; job: Job; target?: number; insist?: boolean }
  | { kind: 'ring' }
  | { kind: 'warn' }
  | { kind: 'next' };
interface Dam {
  newGame(seed: number): GameState;
  step(s: GameState): void;
  queueInput(s: GameState, input: NewInput): void;
  hint(s: GameState, id: KeeperId, job: Job, target?: number): { verdict: string };
  keeperOf(s: GameState, id: KeeperId): { job: unknown };
  planOf(s: GameState): { keepers: KeeperId[]; weir: boolean; inn: boolean };
  clock(m: number): string;
  NIGHTS: number;
  GAME_VERSION?: string;
}

export const GLANCE_DIR = process.env.GLANCE_DIR ?? join(homedir(), 'code', 'glance');
const D = (await import(join(GLANCE_DIR, 'src/sim/dam.ts'))) as Dam;
const { NAMES } = (await import(join(GLANCE_DIR, 'src/sim/keepers.ts'))) as { NAMES: Record<string, string> };
const { TURNS } = (await import(join(GLANCE_DIR, 'src/sim/water.ts'))) as { TURNS: number };

const STEADY = 1.4;
const VERDICT: Record<string, number> = {
  assented: 1,
  complied: 0.7,
  modified: 0.4,
  deferred: 0.3,
  refused: 0.1,
};
const aimedAt = (id: string) => [`${id}:`, `insist:${id}:`];

export class GlanceAdapter implements GameAdapter {
  readonly name: string;
  readonly s: GameState;
  private seenSaid = 0;
  private seenDawns = 0;
  private carry = 0;
  private warned: number | null = null;
  private ringing: number | null = null;

  constructor(seed: number) {
    this.name = `the-${D.GAME_VERSION ?? 'glance'}`;
    this.s = D.newGame(seed);
  }

  private wantGate(): number {
    const lvl = this.s.board.level?.value ?? 4;
    return lvl > 4.9 ? TURNS : lvl > 4.6 ? 4 : lvl > 4.3 ? 3 : 1;
  }

  observe(): Observation {
    const s = this.s;
    const events: PlayEvent[] = [];
    const lines = s.said.filter((x) => x.at >= 0);
    for (const x of lines.slice(Math.min(this.seenSaid, lines.length))) {
      const refusal = x.kind === 'answer' && /^(No|Not|I can’t|I… I can’t|after)/.test(x.text);
      const keeper = x.who === 'dai' || x.who === 'callum';
      events.push({
        kind:
          x.kind === 'report' ? 'report' : x.who === 'narrator' ? 'narration' : refusal ? 'refused' : x.kind,
        summary: `${x.who}: ${x.text}`,
        valence: refusal ? -0.35 : x.kind === 'report' ? 0.15 : 0.05,
        salience: x.who === 'narrator' ? 0.7 : 0.55,
        ...(keeper ? { by: x.who } : {}),
        answers: keeper && (x.kind === 'answer' || x.kind === 'report') ? aimedAt(x.who) : false,
      });
    }
    this.seenSaid = lines.length;
    // The warden's call and the inn's phone answer the player's own warn and ring (the narrator's line says so).
    if (s.warnedAt !== this.warned && s.warnedAt !== null)
      events.push({
        kind: 'warned',
        summary: 'the warden is knocking on Mill Lane',
        valence: 0.05,
        salience: 0.6,
        answers: ['warn'],
      });
    if (s.nerys.ringing !== this.ringing && s.nerys.ringing !== null)
      events.push({
        kind: 'ringing',
        summary: 'the inn’s phone is ringing',
        valence: 0,
        salience: 0.5,
        answers: ['ring'],
      });
    this.warned = s.warnedAt;
    this.ringing = s.nerys.ringing;
    while (this.seenDawns < s.dawns.length) {
      const d = s.dawns[this.seenDawns++];
      if (!d) break;
      const caught = d.misses.filter((m) => m.caught).length;
      events.push({
        kind: 'dawn',
        summary: `dawn ${d.night}: ${d.overtopped ? 'overtopped' : 'held'}, Mill Lane ${d.mill}, caught ${caught}/${d.misses.length}`,
        valence: d.overtopped ? -1 : d.mill === 'flooded' ? 0.1 : Math.min(0.9, 0.55 + 0.1 * caught),
        salience: 1,
      });
      for (const m of d.misses)
        events.push({
          kind: 'miss-revealed',
          summary: `${m.who} was wrong at ${D.clock(m.at)}`,
          valence: m.caught ? 0.4 : -0.3,
          salience: 0.8,
          by: m.who,
          answers: false,
        });
    }
    const lvl = s.board.level?.value ?? 4;
    const bridge = s.board.bridge?.value ?? 0;
    const chapter = s.phase === 'dawn' ? `N${s.night} dawn` : `N${s.night}`;
    const last = s.dawns[s.dawns.length - 1];
    const loops: string[] = [];
    let openLoop = 0;
    if (s.phase === 'watch') {
      loops.push(`night ${s.night} of ${D.NIGHTS} under way`);
      openLoop = 0.5;
    } else if (s.phase === 'dawn' && last) {
      const missed = last.misses.filter((m) => !m.caught).length;
      if (missed) loops.push(`${missed} wrong reading${missed > 1 ? 's' : ''} not caught`);
      loops.push(`night ${s.night + 1} of ${D.NIGHTS} to come`);
      openLoop = 0.2 + Math.min(0.3, 0.1 * missed);
    }
    const o: Observation = {
      clock: `N${s.night} ${D.clock(s.minute)}`,
      phase: s.phase,
      events,
      features: { pressure: Math.max(0, Math.min(1, (lvl - 4) / 1.6 + (bridge >= 4 ? 0.3 : 0))), openLoop },
      over: s.phase === 'end',
      chapter,
      loops,
    };
    if (s.phase === 'end')
      o.outcome = s.dawns.some((d) => d.overtopped)
        ? 'loss'
        : s.dawns.some((d) => d.mill === 'flooded')
          ? 'mixed'
          : 'win';
    return o;
  }

  actions(): PlayAction[] {
    const s = this.s;
    if (s.phase === 'dawn') return [{ id: 'next', label: 'next night', kind: 'next', promise: 0.6 }];
    if (s.phase === 'end') return [];
    const out: PlayAction[] = [];
    const age = s.board.level ? s.minute - s.board.level.at : 999;
    const plan = D.planOf(s);
    for (const id of plan.keepers) {
      if (D.keeperOf(s, id).job) continue;
      const h = D.hint(s, id, 'level');
      out.push({
        id: `${id}:level`,
        label: `ask ${NAMES[id]} to read the level`,
        kind: 'read',
        promise: Math.min(1, age / 60) * (VERDICT[h.verdict] ?? 0.3),
      });
      const g = s.board.gate?.value ?? 0;
      const want = this.wantGate();
      if (want !== g) {
        const hg = D.hint(s, id, 'gate', want);
        out.push({
          id: `${id}:gate:${want}`,
          label: `ask ${NAMES[id]} to set the gate to ${want}`,
          kind: 'gate',
          promise: 0.3 + 0.4 * Math.min(1, Math.abs(want - g) / 3) * (VERDICT[hg.verdict] ?? 0.3),
          focus: 0.4,
        });
      }
      if (plan.weir)
        out.push({ id: `${id}:weir`, label: `send ${NAMES[id]} to the weir`, kind: 'read', promise: 0.25 });
    }
    if (plan.inn) {
      if (s.nerys.ringing === null)
        out.push({ id: 'ring', label: 'ring the inn', kind: 'read', promise: 0.3 });
      if (s.warnedAt === null && (s.board.bridge?.value ?? 0) >= 4)
        out.push({ id: 'warn', label: 'warn Mill Lane', kind: 'warn', promise: 0.8, tags: ['confront'] });
    }
    return out;
  }

  edgeActions(): PlayAction[] {
    const s = this.s;
    if (s.phase !== 'watch') return [];
    const plan = D.planOf(s);
    const out: PlayAction[] = [];
    if (plan.inn) {
      if (s.warnedAt === null && (s.board.bridge?.value ?? 0) < 4)
        out.push({
          id: 'warn:sport',
          label: 'warn Mill Lane though the bridge is low',
          kind: 'warn',
          promise: 0.05,
          tags: ['confront'],
          mischief: true,
        });
      if (s.nerys.ringing !== null)
        out.push({
          id: 'ring:sport',
          label: 'ring the inn again',
          kind: 'read',
          promise: 0.05,
          mischief: true,
        });
    }
    for (const id of plan.keepers) {
      if (D.keeperOf(s, id).job) continue;
      if (D.hint(s, id, 'level').verdict === 'assented')
        out.push({
          id: `insist:${id}:level`,
          label: `insist ${NAMES[id]} reads the level, though he would`,
          kind: 'insist',
          promise: 0.1,
          tags: ['confront'],
          mischief: true,
        });
    }
    return out;
  }

  apply(id: string): void {
    const s = this.s;
    const head = id.split(':')[0];
    if (head === 'next' || head === 'ring' || head === 'warn') {
      D.queueInput(s, { kind: head });
      return;
    }
    if (id.startsWith('insist:')) {
      const [, keeper, job] = id.split(':') as [string, KeeperId, Job];
      D.queueInput(s, { kind: 'ask', keeper, job, insist: true });
      return;
    }
    const [keeper, job, t] = id.split(':') as [KeeperId, Job, string?];
    D.queueInput(
      s,
      t === undefined ? { kind: 'ask', keeper, job } : { kind: 'ask', keeper, job, target: Number(t) },
    );
  }

  advance(seconds: number): void {
    if (this.s.phase !== 'watch') return;
    this.carry += seconds * STEADY;
    while (this.carry >= 1 && this.s.phase === 'watch') {
      this.carry -= 1;
      D.step(this.s);
    }
  }
}

export const make = (seed: number): GameAdapter => new GlanceAdapter(500 + seed);
