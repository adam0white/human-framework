/**
 * A `GameAdapter` for The Warren (github.com/adam0white/warren): a plateau village digs a refuge into soft stone, in
 * cross-section. An HF persona plays the dig-master who chalks walls, marks rooms, hangs lamps, places doors and rings
 * the bell. Read-only against The Warren: it imports the headless sim from a checkout (`WARREN_DIR`, default
 * ~/code/warren) and never edits it. Written against warren 0.1.0 at commit 7067eac.
 *
 * What the adapter shows is what the screen shows: the journal lines (notes), the margin goal, the faces drawn with
 * their words ("dark", "no air", "blocked"), smoke and riders, the stores and water in words. Not people's needs.
 * Time runs at 'trot' (72 sim minutes per real second; a sim-day is 20 real seconds at walk). The UI's drop to walk
 * when riders come is modelled.
 *
 * Actions are what a sensible keeper would do next: chalk beside a face that can be dug (one cell at a time, the
 * dig plan the game's own bot follows), mark a fresh room for jars or beds, hang a lamp at a dark face, sink a shaft
 * above a face with no air, ring the bell when smoke shows. Edge actions: ring the bell with no smoke (crying wolf),
 * chalk toward the neighbours' side of the ridge, chalk loose stone, and chalk many faces at once to overwork the
 * diggers.
 *
 * Cohort fields: `chapter` is the season and year ('summer y1'); `outcome` (only after a year or when nobody is
 * left): everyone dead is a loss, a year with no deaths a win, otherwise mixed. `openLoop`: smoke on the horizon, an
 * unfinished goal in the margin, chalk not yet dug.
 */
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { GameAdapter, Observation, PlayAction, PlayEvent } from '../src/index.ts';

interface Note {
  at: number;
  kind: string;
  text: string;
  who?: string;
  weight: number;
}
interface State {
  minute: number;
  hill: { kind: number[]; chalk: number[]; use: number[]; known: number[] };
  people: { id: string; body: { alive: boolean } }[];
  notes: Note[];
  goals: Record<string, number>;
  raids: { smoke: number; riders: number; stage: string }[];
  bell: { until: number } | null;
  stats: { died: number };
}
interface Game {
  s: State;
  inputs: unknown[];
}
type Order =
  | { verb: 'chalk'; cells: number[]; on: boolean }
  | { verb: 'use'; cells: number[]; use: 'store' | 'beds' }
  | { verb: 'lamp'; cell: number }
  | { verb: 'bell' };

export const WARREN_DIR = process.env.WARREN_DIR ?? join(homedir(), 'code', 'warren');
const G = (await import(join(WARREN_DIR, 'src/sim/game.ts'))) as {
  newGame(seed: number): Game;
  act(g: Game, o: Order): boolean;
  advance(g: Game, to: number): void;
  GAME_VERSION: string;
};
const Wm = (await import(join(WARREN_DIR, 'src/sim/warren.ts'))) as {
  activeRaid(s: State): { stage: string } | undefined;
  airAndLight(s: State): { air: Int16Array; lit: Uint8Array };
  faceState(s: State, face: number, stand: number, lit: Uint8Array, air: Int16Array): string;
  currentGoal(s: State): { text: string } | undefined;
  storesWords(s: State): string;
};
const Gr = (await import(join(WARREN_DIR, 'src/sim/grid.ts'))) as {
  K: Record<string, number>;
  W: number;
  SURF: number;
  RIDGE: number;
  THEIR_X: number;
};
const { seasonOf, doyOf, yearOf, DAY } = (await import(join(WARREN_DIR, 'src/sim/calendar.ts'))) as {
  seasonOf(doy: number): string;
  doyOf(day: number): number;
  yearOf(day: number): number;
  DAY: number;
};

const TROT = 72;
const WALK = 18;
const xOf = (i: number) => i % Gr.W;
const yOf = (i: number) => Math.floor(i / Gr.W);

const VAL: Record<string, number> = {
  dig: 0.25,
  find: 0.45,
  goal: 0.6,
  arrival: 0.5,
  path: 0.2,
  habit: 0.2,
  answer: 0.1,
  story: 0.05,
  theft: -0.1,
  hurt: -0.6,
  raid: -0.3,
  day: 0,
};

export class WarrenAdapter implements GameAdapter {
  readonly name: string;
  readonly g: Game;
  private seen = 0;
  private t = 0;
  private sawSmoke = -1;
  /** The mark the screen draws at once for an accepted input (chalk X, lamp ghost, room glyphs, bell arcs). */
  private marks: PlayEvent[] = [];

  constructor(seed: number) {
    this.name = `the-warren-${G.GAME_VERSION}`;
    this.g = G.newGame(seed);
    this.seen = this.g.s.notes.length;
  }

  private alive() {
    return this.g.s.people.filter((p) => p.body.alive).length;
  }

  private ended() {
    return this.g.s.minute >= 365 * DAY || this.alive() === 0;
  }

  observe(): Observation {
    const s = this.g.s;
    const events: PlayEvent[] = this.marks.splice(0);
    for (const n of s.notes.slice(Math.min(this.seen, s.notes.length))) {
      let v = VAL[n.kind] ?? 0;
      if (/died|dead/.test(n.text)) v = -0.9;
      if (/went on\.$/.test(n.text)) v = -0.15;
      if (n.kind === 'raid' && /held|nothing|little/.test(n.text)) v = 0.4;
      events.push({
        kind: n.kind,
        summary: n.text,
        valence: v,
        salience: Math.min(1, 0.3 + 0.25 * n.weight),
        ...(n.who ? { by: n.who } : {}),
        // A dig, a reply to the bell or a refusal answers the keeper's chalk or bell; arrivals and seasons do not.
        answers:
          n.kind === 'dig' || n.kind === 'find' || n.kind === 'path'
            ? ['chalk', 'shaft', 'edge:chalk']
            : n.kind === 'answer'
              ? ['bell', 'edge:bell']
              : false,
      });
    }
    this.seen = s.notes.length;
    const raid = Wm.activeRaid(s);
    if (raid && raid.stage === 'smoke' && this.sawSmoke !== s.raids.indexOf(raid as never)) {
      this.sawSmoke = s.raids.indexOf(raid as never);
      events.push({
        kind: 'smoke',
        summary: 'smoke on the horizon',
        valence: -0.4,
        salience: 1,
        answers: false,
      });
    }
    const day = Math.floor(s.minute / DAY);
    const chapter = `${seasonOf(doyOf(day))} y${yearOf(day)}`;
    const goal = Wm.currentGoal(s);
    const chalked = s.hill.chalk.some((c) => c);
    const loops: string[] = [];
    if (raid && raid.stage !== 'gone') loops.push('smoke on the horizon');
    if (goal) loops.push(goal.text);
    if (chalked) loops.push('chalk not yet dug');
    const o: Observation = {
      clock: `day ${day + 1}`,
      phase: raid?.stage ?? 'quiet',
      events,
      features: {
        pressure: raid ? (raid.stage === 'riders' ? 1 : 0.7) : chalked ? 0.2 : 0.35,
        openLoop: Math.min(1, (raid ? 0.5 : 0) + (goal ? 0.3 : 0) + (chalked ? 0.2 : 0)),
      },
      over: this.ended(),
      chapter,
      loops,
    };
    if (o.over) {
      const died = s.stats.died;
      o.outcome = this.alive() === 0 ? 'loss' : died === 0 ? 'win' : 'mixed';
    }
    return o;
  }

  /**
   * Walls a keeper could chalk: diggable stone beside open ground (or the surface walk), this side of the neighbours,
   * with what the screen would write there once chalked. Loose stone counts only where the screen shows it (known).
   */
  private faces() {
    const s = this.g.s;
    const h = s.hill;
    const { lit, air } = Wm.airAndLight(s);
    const out: { face: number; stand: number; state: string; loose: boolean }[] = [];
    for (let i = 0; i < h.kind.length; i++) {
      const k = h.kind[i] ?? 0;
      if (!(k === Gr.K.rock || k === Gr.K.hard || k === Gr.K.loose || k === Gr.K.seam)) continue;
      if (xOf(i) >= Gr.THEIR_X || yOf(i) < Gr.SURF) continue;
      let stand = -1;
      for (const d of [1, -1, Gr.W, -Gr.W]) {
        const j = i + d;
        if (j < 0 || j >= h.kind.length || Math.abs(xOf(j) - xOf(i)) > 1) continue;
        if (h.kind[j] === Gr.K.open || (h.kind[j] === Gr.K.sky && yOf(j) === Gr.SURF - 1)) stand = j;
      }
      if (stand < 0) continue;
      out.push({
        face: i,
        stand,
        state: Wm.faceState(s, i, stand, lit, air),
        loose: k === Gr.K.loose && !!h.known[i],
      });
    }
    return out;
  }

  actions(): PlayAction[] {
    if (this.ended()) return [];
    const s = this.g.s;
    const h = s.hill;
    const out: PlayAction[] = [];
    const raid = Wm.activeRaid(s);
    if (raid && raid.stage === 'smoke' && !(s.bell && s.bell.until > s.minute))
      out.push({ id: 'bell', label: 'ring the bell', kind: 'bell', promise: 0.9, tags: ['help'] });
    const chalkCount = h.chalk.filter((c) => c).length;
    const fs = this.faces();
    const good = fs.filter(
      (f) =>
        f.state === 'ready' &&
        !f.loose &&
        !h.chalk[f.face] &&
        xOf(f.face) < Gr.RIDGE &&
        yOf(f.face) >= Gr.SURF,
    );
    if (chalkCount < 6 && good.length) {
      // The deepest and the widest faces: a keeper digs down and out.
      const down = [...good].sort((a, b) => yOf(b.face) - yOf(a.face))[0];
      const side = [...good].sort((a, b) => xOf(a.face) - xOf(b.face))[0];
      if (down)
        out.push({ id: `chalk:${down.face}`, label: 'chalk the wall below', kind: 'chalk', promise: 0.55 });
      if (side && side !== down)
        out.push({ id: `chalk:${side.face}`, label: 'chalk the far wall', kind: 'chalk', promise: 0.45 });
    }
    const dark = fs.find((f) => f.state === 'dark' && h.chalk[f.face]);
    if (dark)
      out.push({ id: `lamp:${dark.stand}`, label: 'hang a lamp at a dark face', kind: 'lamp', promise: 0.6 });
    const stale = fs.find((f) => f.state === 'stale' && h.chalk[f.face]);
    if (stale && chalkCount < 12)
      out.push({
        id: `shaft:${stale.face}`,
        label: 'sink a shaft for air',
        kind: 'chalk',
        promise: 0.5,
        focus: 0.4,
      });
    // A dug room with nothing marked: jars first, then beds.
    const open: number[] = [];
    for (let i = 0; i < h.kind.length; i++)
      if (h.kind[i] === Gr.K.open && !h.use[i] && yOf(i) > Gr.SURF + 1 && xOf(i) < Gr.RIDGE) open.push(i);
    if (open.length >= 4) {
      const hasStore = h.use.some((u) => u === 1);
      const what = hasStore ? 'beds' : 'store';
      out.push({
        id: `use:${what}:${open[open.length - 1]}`,
        label: `mark a room for ${what === 'store' ? 'jars' : 'beds'}`,
        kind: 'mark',
        promise: hasStore ? 0.4 : 0.6,
      });
    }
    out.push({ id: 'watch', label: 'watch them work', kind: 'watch', promise: 0.3, focus: 0.1 });
    return out;
  }

  edgeActions(): PlayAction[] {
    if (this.ended()) return [];
    const s = this.g.s;
    const h = s.hill;
    const out: PlayAction[] = [];
    if (!Wm.activeRaid(s) && !(s.bell && s.bell.until > s.minute))
      out.push({
        id: 'edge:bell',
        label: 'ring the bell with no smoke',
        kind: 'bell',
        promise: 0.05,
        tags: ['confront'],
        mischief: true,
      });
    const fs = this.faces();
    const east = [...fs]
      .filter((f) => h.kind[f.face] !== Gr.K.open)
      .sort((a, b) => xOf(b.face) - xOf(a.face))[0];
    if (east && xOf(east.face) >= Gr.RIDGE - 6)
      out.push({
        id: `edge:chalk:${east.face}`,
        label: 'chalk toward the neighbours',
        kind: 'chalk',
        promise: 0.15,
        mischief: true,
      });
    const loose = fs.find((f) => f.loose && !h.chalk[f.face]);
    if (loose)
      out.push({
        id: `edge:chalk:${loose.face}`,
        label: 'chalk the loose stone',
        kind: 'chalk',
        promise: 0.1,
        mischief: true,
      });
    const all = fs.filter((f) => !h.chalk[f.face]).map((f) => f.face);
    if (all.length >= 4)
      out.push({
        id: `edge:all:${all.join(',')}`,
        label: 'chalk every wall at once',
        kind: 'chalk',
        promise: 0.1,
        mischief: true,
      });
    return out;
  }

  apply(id: string): void {
    const before = this.g.inputs.length;
    this.applyInner(id);
    if (this.g.inputs.length > before)
      this.marks.push({
        kind: 'mark',
        summary: `the screen shows it: ${id.split(':')[0]}`,
        valence: 0.02,
        salience: 0.2,
        answers: [id],
      });
  }

  private applyInner(id: string): void {
    const g = this.g;
    const parts = id.split(':');
    const head = parts[0] === 'edge' ? parts[1] : parts[0];
    const arg = parts[parts.length - 1] ?? '';
    if (head === 'watch') return;
    if (head === 'bell') G.act(g, { verb: 'bell' });
    else if (head === 'chalk') G.act(g, { verb: 'chalk', cells: [Number(arg)], on: true });
    else if (head === 'all') G.act(g, { verb: 'chalk', cells: arg.split(',').map(Number), on: true });
    else if (head === 'lamp') G.act(g, { verb: 'lamp', cell: Number(arg) });
    else if (head === 'use') {
      const cell = Number(arg);
      // The unmarked open cells joined to this one, up to eight: what a finger drag would cover.
      const h = g.s.hill;
      const room = [cell];
      for (let k = 0; k < room.length && room.length < 8; k++)
        for (const d of [1, -1, Gr.W, -Gr.W]) {
          const j = (room[k] ?? 0) + d;
          if (
            j >= 0 &&
            j < h.kind.length &&
            h.kind[j] === Gr.K.open &&
            !h.use[j] &&
            !room.includes(j) &&
            room.length < 8
          )
            room.push(j);
        }
      G.act(g, { verb: 'use', cells: room, use: parts[1] as 'store' | 'beds' });
    } else if (head === 'shaft') {
      const face = Number(arg);
      const x = xOf(face);
      const cells: number[] = [];
      for (let y = Gr.SURF; y < yOf(face); y++) {
        const c = y * Gr.W + x;
        if (g.s.hill.kind[c] !== Gr.K.open) cells.push(c);
      }
      if (cells.length) G.act(g, { verb: 'chalk', cells, on: true });
    }
  }

  advance(seconds: number): void {
    if (this.ended()) return;
    const raid = Wm.activeRaid(this.g.s);
    this.t = Math.max(this.t, this.g.s.minute) + seconds * (raid && raid.stage === 'riders' ? WALK : TROT);
    G.advance(this.g, Math.min(this.t, 365 * DAY));
  }
}

export const make = (seed: number): GameAdapter => new WarrenAdapter(700 + seed);
