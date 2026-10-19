/**
 * The canonical `GameAdapter` for The Pass (github.com/adam0white/pass), the kitchen campaign: an HF persona plays
 * the chef. Read-only against The Pass: it imports the game's own headless sim from a checkout (`PASS_DIR`,
 * default ~/code/pass) and never edits it. Written against pass@3 (commit 01601bc); it also runs pass@2 (85e32e9),
 * which has the same sim surface, so two builds can be compared. The game's scratch copy (scratch/hf/adapter.ts)
 * may drift; this one is canonical.
 *
 * Two HF copies run in one process: the cooks use the HF the game pins (its own node_modules), the persona uses
 * this repository's HF. They never share a Person.
 *
 * What the adapter shows is what the screen shows: tickets and plates, the till and the week's bill, what cooks
 * say, each cook's likely answer to a job (the game's own `hints`), walkouts, the evening report with the bill and
 * notebook stamps, Sunday's page, the ending. Not the cooks' needs, trust or plans. Time runs at 'steady' (1.5 game
 * minutes per real second), slowed to 0.5 while a cook's request waits, as the UI does.
 *
 * Cohort fields: `chapter` is 'w<week> <Day>' ('w2 Sun' for the Sunday page); `outcome` reads the ending (the
 * lokanta lost or kept); `openLoop` is what a player putting it down would see unfinished: a service under way,
 * the week's bill not yet covered by the till, Sunday choices not made. Cook replies answer only the inputs aimed at
 * that cook. Edge actions: send a cook home mid-rush, ask for a job nobody needs, insist on a job the cook already
 * agrees to (all mischief), and say no to a request (already a plain input, tagged `confront`).
 *
 * A cook's reply is shown twice, as on screen: the words at the pass (`said:answer`) and what the cook then does
 * (said no, did it grudgingly, said yes). The second is read from the cook's night tally, which mirrors the visible
 * move. The bill line is approximate: the UI adds the new hands' wages for the rest of the week; this adds what is
 * already due. Every number here is a playtesting premise, not a measurement of The Pass.
 */
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { GameAdapter, Observation, PlayAction, PlayEvent } from '../src/index.ts';

type Verb = 'grill' | 'cold' | 'dish' | 'oven' | 'break' | 'eat' | 'home';
interface Ticket {
  id: number;
  table: number;
  critic?: boolean;
  due?: number;
  status: 'waiting' | 'open' | 'served' | 'walked';
}
interface CookState {
  id: string;
  pending: unknown;
  night: { asked: number; insisted: number; refused: number; complied: number; assented: number };
}
interface Said {
  at: number;
  who: string;
  text: string;
  kind: 'answer' | 'journal' | 'prompt' | 'call';
}
interface GameState {
  night: number;
  phase: 'service' | 'evening' | 'sunday' | 'end';
  minute: number;
  cooks: CookState[];
  tickets: Ticket[];
  plates: { clean: number; pile: number };
  oven: { heat: number };
  till: number;
  carry: number;
  wagesDue: number;
  lost: boolean;
  request: { who: string; state: 'asking' | 'yes' | 'no' } | null;
  lastAnswer: { at: number; who: string; counter?: Verb } | null;
  inputs: { kind: string; at: number; counter?: boolean }[];
  said: Said[];
  sunday: {
    quits: { id: string; words: string }[];
    changes: { id: string; line: string }[];
    candidates: string[];
    offday: boolean;
    tabs: string[];
    sell: boolean;
    chosen: Record<string, string>;
  } | null;
  reports: {
    night: number;
    served: number;
    walked: number;
    takings: number;
    reviews: { id: string; aboutYou: string }[];
    bill?: { owed: string; paid: boolean; short: number };
    stamps: string[];
  }[];
}
type NewInput =
  | { kind: 'ask'; cook: string; verb: Verb; insist?: boolean; counter?: boolean }
  | { kind: 'jar'; choice: 'move' | 'talk' | 'leave' }
  | { kind: 'answer'; choice: 'yes' | 'no' }
  | { kind: 'choose'; key: string; value: string }
  | { kind: 'open' };
interface Kitchen {
  newGame(seed: number): GameState;
  step(s: GameState): void;
  queueInput(s: GameState, input: NewInput): void;
  hints(s: GameState, id: string): { verb: Verb; verdict: string; short: string; guess?: boolean }[];
  stationOf(s: GameState, id: string): string | null;
  nameOf(s: GameState, id: string): string;
  owed(s: GameState): Record<'grill' | 'cold' | 'oven', number>;
  onShift(s: GameState): string[];
  cookOf(s: GameState, id: string): CookState;
  OVEN_HOT: number;
  GAME_VERSION?: string;
}
interface Campaign {
  planOf(n: number): { week: number; weekday: number; title: string; oven: boolean; dish: boolean };
  weekOf(w: number): { bill: number; owed: string };
  isLastOfWeek(n: number): boolean;
}

export const PASS_DIR = process.env.PASS_DIR ?? join(homedir(), 'code', 'pass');
const K = (await import(join(PASS_DIR, 'src/sim/kitchen.ts'))) as Kitchen;
const C = (await import(join(PASS_DIR, 'src/sim/campaign.ts'))) as Campaign;

const STEADY = 1.5;
const SLOWED = 0.5;
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
/** How a likely answer reads to the player: a yes is worth asking for, a no barely. */
const VERDICT: Record<string, number> = {
  assented: 1,
  complied: 0.7,
  modified: 0.4,
  deferred: 0.3,
  refused: 0.1,
};
/** Rough minutes of work a portion is worth, to size how much a station is needed. */
const WORK = { grill: 5, cold: 3.5, dish: 1.4, oven: 6 };
const clockOf = (m: number) => {
  const d = ((m % 1440) + 1440) % 1440;
  return `${String(Math.floor(d / 60)).padStart(2, '0')}:${String(d % 60).padStart(2, '0')}`;
};
/** Inputs a cook's reply answers. */
const aimedAt = (id: string) => [`ask:${id}:`, `insist:${id}:`, `take:${id}:`];
// Edge-action ids end in ':sport' so they never share an id (and so a record) with the same plain input.

export class PassAdapter implements GameAdapter {
  readonly name: string;
  readonly s: GameState;
  private carry = 0;
  private said = 0;
  private ticketSeen = new Map<number, Ticket['status']>();
  private counters = new Map<string, CookState['night']>();
  private phase: GameState['phase'];
  private reportsSeen = 0;
  private jarDone = false;

  constructor(seed: number) {
    this.name = `the-${K.GAME_VERSION ?? 'pass'}`;
    this.s = K.newGame(seed);
    this.phase = this.s.phase;
  }

  private chapter(): string {
    const p = C.planOf(this.s.night);
    return this.s.phase === 'sunday'
      ? `w${p.week} Sun`
      : `w${p.week} ${DAYS[p.weekday] ?? p.title.slice(0, 3)}`;
  }

  /** What is left unfinished on screen, and how strongly (see SCOPE). */
  private loops(): { openLoop: number; loops: string[] } {
    const s = this.s;
    if (s.phase === 'end') return { openLoop: 0, loops: [] };
    const loops: string[] = [];
    let open = 0;
    const p = C.planOf(s.night);
    if (s.phase === 'service') {
      loops.push(`${p.title} service under way`);
      open += 0.4;
    }
    const w = C.weekOf(p.week);
    const bill = w.bill + s.carry + s.wagesDue;
    if (s.phase !== 'sunday' && s.till < bill) {
      loops.push(`${w.owed} wants ${bill} by Saturday; the till has ${s.till}`);
      open += 0.5 * Math.min(1, (bill - s.till) / Math.max(1, bill));
    }
    const pg = s.sunday;
    if (s.phase === 'sunday' && pg) {
      const waiting =
        (pg.candidates.length && pg.chosen.hire === undefined ? 1 : 0) +
        (pg.offday && pg.chosen.offday === undefined ? 1 : 0) +
        pg.tabs.filter((t) => pg.chosen[`tab:${t}`] === undefined).length +
        (pg.sell && pg.chosen.sell === undefined ? 1 : 0);
      if (waiting) loops.push(`${waiting} Sunday choice${waiting > 1 ? 's' : ''} to make`);
      if (pg.quits.length) loops.push(`${pg.quits.length} cook${pg.quits.length > 1 ? 's' : ''} quit`);
      open += Math.min(0.4, 0.15 * waiting) + (pg.quits.length ? 0.3 : 0) + 0.2;
    }
    return { openLoop: Math.min(1, open), loops };
  }

  observe(): Observation {
    const s = this.s;
    const events: PlayEvent[] = [];
    for (const c of s.cooks) {
      const before = this.counters.get(c.id);
      const now = { ...c.night };
      const who = K.nameOf(s, c.id);
      const answers = aimedAt(c.id);
      if (before && before.asked <= now.asked) {
        if (now.refused > before.refused)
          events.push({
            kind: 'refused',
            summary: `${who} said no`,
            valence: -0.4,
            salience: 0.75,
            by: c.id,
            answers,
          });
        if (now.complied > before.complied)
          events.push({
            kind: 'complied',
            summary: `${who} did it, grudgingly`,
            valence: -0.05,
            salience: 0.6,
            by: c.id,
            answers,
          });
        if (now.assented > before.assented)
          events.push({
            kind: 'assented',
            summary: `${who} said yes`,
            valence: 0.3,
            salience: 0.6,
            by: c.id,
            answers,
          });
      }
      this.counters.set(c.id, now);
    }
    for (const line of s.said.slice(this.said)) {
      const urgent = line.kind === 'call' || line.kind === 'prompt';
      const cook = line.who !== 'narrator';
      const e: PlayEvent = {
        kind: `said:${line.kind}`,
        summary: `${cook ? `${K.nameOf(s, line.who)}: ` : ''}${line.text}`,
        valence: line.kind === 'journal' ? 0.05 : 0,
        salience: urgent ? 0.85 : line.kind === 'journal' ? 0.5 : 0.55,
      };
      // A cook's answer at the pass answers the inputs aimed at that cook; journal lines and calls answer nothing.
      e.answers =
        cook && line.kind === 'answer'
          ? [...aimedAt(line.who), ...(s.request?.who === line.who ? ['answer:'] : [])]
          : false;
      events.push(e);
    }
    this.said = s.said.length;
    for (const t of s.tickets) {
      const was = this.ticketSeen.get(t.id);
      if (was === t.status) continue;
      this.ticketSeen.set(t.id, t.status);
      if (t.status === 'open' && was !== 'open')
        events.push({ kind: 'ticket', summary: `table ${t.table} ordered`, valence: 0, salience: 0.4 });
      if (t.status === 'served')
        events.push({
          kind: t.critic ? 'critic-pleased' : 'served',
          summary: `table ${t.table} served`,
          valence: t.critic ? 0.6 : 0.25,
          salience: t.critic ? 0.9 : 0.45,
        });
      if (t.status === 'walked')
        events.push({
          kind: 'walkout',
          summary: `table ${t.table} walked out`,
          valence: t.critic || t.due ? -0.8 : -0.5,
          salience: 0.85,
        });
    }
    for (const r of s.reports.slice(this.reportsSeen)) {
      const total = r.served + r.walked || 1;
      const p = C.planOf(r.night);
      events.push({
        kind: 'night-report',
        summary: `${p.title} w${p.week} closed: served ${r.served} of ${total}, took ${r.takings}`,
        valence: Math.max(-1, Math.min(1, 2 * (r.served / total - 0.75))),
        salience: 0.9,
      });
      for (const v of r.reviews)
        events.push({
          kind: 'review',
          summary: `${K.nameOf(s, v.id)}: ${v.aboutYou}`,
          valence: 0.05,
          salience: 0.7,
        });
      if (r.bill)
        events.push({
          kind: r.bill.paid ? 'bill-paid' : 'bill-short',
          summary: r.bill.paid ? `paid ${r.bill.owed}` : `short ${r.bill.short} for ${r.bill.owed}`,
          valence: r.bill.paid ? 0.8 : -0.7,
          salience: 1,
        });
      for (const st of r.stamps ?? [])
        events.push({ kind: 'stamp', summary: `notebook stamp: ${st}`, valence: 0.5, salience: 0.8 });
    }
    this.reportsSeen = s.reports.length;
    if (this.phase !== 'sunday' && s.phase === 'sunday' && s.sunday) {
      for (const q of s.sunday.quits)
        events.push({
          kind: 'quit',
          summary: `${K.nameOf(s, q.id)} quit: ${q.words}`,
          valence: -0.6,
          salience: 1,
          by: q.id,
          answers: false,
        });
      for (const c of s.sunday.changes)
        events.push({ kind: 'unprompted', summary: c.line, valence: 0.6, salience: 0.85 });
    }
    if (this.phase !== 'end' && s.phase === 'end')
      events.push({
        kind: 'ending',
        summary: s.lost ? 'the lokanta is lost' : 'Nevin’s name is still over the door',
        valence: s.lost ? -0.7 : 0.9,
        salience: 1,
      });
    this.phase = s.phase;
    const open = s.tickets.filter((t) => t.status === 'open').length;
    const { openLoop, loops } = this.loops();
    const o: Observation = {
      clock: `${this.chapter()} ${clockOf(s.minute)}`,
      phase: s.phase,
      events,
      features: { pressure: s.phase === 'service' ? Math.min(1, open / 8) : 0, openLoop },
      over: s.phase === 'end',
      chapter: this.chapter(),
      loops,
    };
    if (s.phase === 'end') o.outcome = s.lost ? 'loss' : 'win';
    return o;
  }

  /** How much each job is needed now, in rough minutes of work owed. */
  private need(): Record<string, number> {
    const s = this.s;
    const o = K.owed(s);
    const p = C.planOf(s.night);
    return {
      grill: o.grill * WORK.grill,
      cold: o.cold * WORK.cold,
      oven: o.oven * WORK.oven + (s.oven.heat < K.OVEN_HOT && p.oven ? 8 : 0),
      dish: p.dish ? s.plates.pile * WORK.dish - s.plates.clean : 0,
    };
  }

  actions(): PlayAction[] {
    const s = this.s;
    if (s.phase === 'end') return [];
    if (s.phase === 'evening') {
      const out: PlayAction[] = [
        {
          id: 'open',
          label: C.isLastOfWeek(s.night) ? 'turn to Sunday' : 'open the next night',
          kind: 'open',
          promise: 0.6,
        },
      ];
      if (s.night === 3 && !this.jarDone)
        out.push(
          { id: 'jar:talk', label: 'talk to Rafi about the jar', kind: 'jar', promise: 0.55, focus: 0.08 },
          { id: 'jar:move', label: 'move the jar to the pass', kind: 'jar', promise: 0.5 },
        );
      return out;
    }
    if (s.phase === 'sunday' && s.sunday) {
      const pg = s.sunday;
      const out: PlayAction[] = [{ id: 'open', label: 'open on Wednesday', kind: 'open', promise: 0.5 }];
      if (pg.candidates.length && pg.chosen.hire === undefined)
        for (const c of pg.candidates)
          out.push({ id: `choose:hire:${c}`, label: `hire ${c}`, kind: 'choose', promise: 0.6, focus: 0.1 });
      if (pg.offday && pg.chosen.offday === undefined)
        out.push({ id: 'choose:offday:yes', label: 'give Dilek Wednesdays', kind: 'choose', promise: 0.55 });
      for (const t of pg.tabs)
        if (pg.chosen[`tab:${t}`] === undefined)
          out.push(
            { id: `choose:tab:${t}:forgive`, label: `forgive ${t}`, kind: 'choose', promise: 0.5 },
            { id: `choose:tab:${t}:ask`, label: `ask ${t}`, kind: 'choose', promise: 0.45 },
          );
      if (pg.sell && pg.chosen.sell === undefined)
        out.push({ id: 'choose:sell:keep', label: 'keep Nevin’s name', kind: 'choose', promise: 0.7 });
      return out;
    }
    if (s.request?.state === 'asking')
      return [
        {
          id: 'answer:yes',
          label: `say yes to ${K.nameOf(s, s.request.who)}`,
          kind: 'answer',
          promise: 0.55,
        },
        {
          id: 'answer:no',
          label: `say no to ${K.nameOf(s, s.request.who)}`,
          kind: 'answer',
          promise: 0.45,
          tags: ['confront'],
        },
      ];
    const need = this.need();
    const o = K.owed(s);
    const out: PlayAction[] = [];
    const a = s.lastAnswer;
    if (
      a?.counter &&
      s.minute - a.at <= 10 &&
      !s.inputs.some((i) => i.kind === 'ask' && i.counter && i.at >= a.at)
    )
      out.push({
        id: `take:${a.who}:${a.counter}`,
        label: `take ${K.nameOf(s, a.who)}'s offer`,
        kind: 'ask',
        promise: 0.5,
      });
    for (const id of K.onShift(s)) {
      if (K.cookOf(s, id).pending) continue;
      const st = K.stationOf(s, id);
      for (const h of K.hints(s, id)) {
        if (h.verb === 'home' || h.verb === st) continue;
        const want =
          h.verb in need
            ? Math.min(1, Math.max(0, need[h.verb] ?? 0) / 20)
            : !st && o.grill + o.cold + o.oven === 0
              ? 0.15
              : 0;
        if (want <= 0) continue;
        const busy = st && (need[st] ?? 0) >= 2 ? 0.4 : 1;
        out.push({
          id: `ask:${id}:${h.verb}`,
          label: `ask ${K.nameOf(s, id)} to ${h.verb} (${h.short})`,
          kind: 'ask',
          promise: want * busy * (VERDICT[h.verdict] ?? 0.3) * (h.guess ? 0.8 : 1),
        });
        if (want >= 0.4 && ['refused', 'deferred', 'modified'].includes(h.verdict))
          out.push({
            id: `insist:${id}:${h.verb}`,
            label: `insist ${K.nameOf(s, id)} ${h.verb}`,
            kind: 'insist',
            promise: 0.6 * want * busy,
            focus: 0.05,
            tags: ['confront'],
          });
      }
    }
    return out;
  }

  edgeActions(): PlayAction[] {
    const s = this.s;
    if (s.phase !== 'service' || s.request?.state === 'asking') return [];
    const need = this.need();
    const rush = s.tickets.filter((t) => t.status === 'open').length >= 3;
    const out: PlayAction[] = [];
    for (const id of K.onShift(s)) {
      if (K.cookOf(s, id).pending) continue;
      const st = K.stationOf(s, id);
      const who = K.nameOf(s, id);
      if (rush && st)
        out.push({
          id: `ask:${id}:home`,
          label: `send ${who} home in the rush`,
          kind: 'ask',
          promise: 0.05,
          mischief: true,
        });
      for (const h of K.hints(s, id)) {
        if (h.verb === 'home' || h.verb === st) continue;
        if (h.verb in need && (need[h.verb] ?? 0) <= 0)
          out.push({
            id: `ask:${id}:${h.verb}:sport`,
            label: `ask ${who} to ${h.verb} though nobody needs it`,
            kind: 'ask',
            promise: 0.05,
            mischief: true,
          });
        if (h.verdict === 'assented')
          out.push({
            id: `insist:${id}:${h.verb}:sport`,
            label: `insist ${who} ${h.verb}, though they would say yes`,
            kind: 'insist',
            promise: 0.1,
            focus: 0.05,
            tags: ['confront'],
            mischief: true,
          });
      }
    }
    return out;
  }

  apply(id: string): void {
    const s = this.s;
    const [head, a, b, c] = id.split(':');
    if (head === 'open') K.queueInput(s, { kind: 'open' });
    else if (head === 'jar') {
      K.queueInput(s, { kind: 'jar', choice: a as 'talk' | 'move' });
      this.jarDone = true;
    } else if (head === 'answer') K.queueInput(s, { kind: 'answer', choice: a as 'yes' | 'no' });
    else if (head === 'choose' && a && b)
      K.queueInput(s, { kind: 'choose', key: c !== undefined ? `${a}:${b}` : a, value: c ?? b });
    else if (head === 'take' && a && b)
      K.queueInput(s, { kind: 'ask', cook: a, verb: b as Verb, counter: true });
    else if ((head === 'ask' || head === 'insist') && a && b)
      K.queueInput(s, { kind: 'ask', cook: a, verb: b as Verb, insist: head === 'insist' });
  }

  advance(seconds: number): void {
    const s = this.s;
    if (s.phase !== 'service') return;
    this.carry += seconds * (s.request?.state === 'asking' ? SLOWED : STEADY);
    while (this.carry >= 1 && s.phase === 'service') {
      K.step(s);
      this.carry -= 1;
    }
    if (s.phase !== 'service') this.carry = 0;
  }
}

export const make = (seed: number): GameAdapter => new PassAdapter(1000 + seed);
