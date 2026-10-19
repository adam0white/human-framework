/**
 * A `GameAdapter` for The Pass (github.com/adam0white/pass), the kitchen game: an HF persona plays the chef.
 * Example only, read-only against The Pass: it imports the game's own headless sim from a checkout and never
 * edits it. Pass the checkout as `PASS_DIR` (default ~/code/pass). The adapter was written against The Pass at
 * commit 6bd0b28 (six nights, pass@1); a later sim may change these fields.
 *
 * Two HF copies run in one process: The Pass's cooks use the HF the game pins (its own node_modules), the persona
 * uses this repository's HF. They never share a Person, so the copies do not meet.
 *
 * What the player sees, and so what the adapter shows: tickets on the rail and plates, the till, what cooks say,
 * each cook's likely answer to a job (the game's own telegraph, `hints`), walkouts, the evening report and the
 * cooks' lines about the chef, Dilek's call on Friday, the jar on Wednesday. It does not show the cooks' needs,
 * trust or plans. Time runs at the game's 'steady' speed (1.5 game minutes per real second), slowed to 0.5
 * while a call waits, as the UI does. The evening sheet waits until the player opens the next night.
 */
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { GameAdapter, Observation, PlayAction, PlayEvent } from '../src/index.ts';

type Verb = 'grill' | 'cold' | 'dish' | 'break' | 'eat' | 'home';
interface Ticket {
  id: number;
  table: number;
  grill: number;
  cold: number;
  doneGrill: number;
  doneCold: number;
  critic?: boolean;
  status: 'waiting' | 'open' | 'served' | 'walked';
}
interface CookState {
  id: string;
  here: boolean;
  gone: boolean;
  pending: unknown;
  night: { asked: number; insisted: number; refused: number; complied: number; assented: number };
}
interface GameState {
  night: number;
  phase: 'service' | 'evening' | 'end';
  minute: number;
  cooks: CookState[];
  tickets: Ticket[];
  plates: { clean: number; pile: number };
  till: number;
  call: 'none' | 'asking' | 'went' | 'stayed' | 'refused';
  said: { at: number; who: string; text: string; kind: 'answer' | 'journal' | 'prompt' | 'call' }[];
  reports: {
    night: number;
    served: number;
    walked: number;
    takings: number;
    reviews: { id: string; line: string; aboutYou: string }[];
  }[];
}
type NewInput =
  | { kind: 'ask'; cook: string; verb: Verb; insist?: boolean }
  | { kind: 'jar'; choice: 'move' | 'talk' | 'leave' }
  | { kind: 'call'; choice: 'go' | 'stay' }
  | { kind: 'open' };
interface Kitchen {
  newGame(seed: number): GameState;
  step(s: GameState): void;
  queueInput(s: GameState, input: NewInput): void;
  hints(s: GameState, id: string, insist?: boolean): { verb: Verb; verdict: string; short: string }[];
  stationOf(s: GameState, id: string): string | null;
  bankMet(s: GameState): boolean;
  BANK_TARGET: number;
  NIGHTS: number;
}

const PASS_DIR = process.env.PASS_DIR ?? join(homedir(), 'code', 'pass');
export const kitchen = (await import(join(PASS_DIR, 'src/sim/kitchen.ts'))) as Kitchen;
const { COOKS } = (await import(join(PASS_DIR, 'src/sim/cooks.ts'))) as { COOKS: readonly string[] };

const STEADY = 1.5;
const SLOWED = 0.5;
/** How a likely answer reads to the player: a yes is worth asking for, a no barely. */
const VERDICT: Record<string, number> = {
  assented: 1,
  complied: 0.7,
  modified: 0.4,
  deferred: 0.3,
  refused: 0.1,
};
const WORK = { grill: 5, cold: 3.5, dish: 1.4 };
const NAME: Record<string, string> = { selim: 'Selim', dilek: 'Dilek', rafi: 'Rafi' };
const clock = (m: number) => {
  const d = ((m % 1440) + 1440) % 1440;
  return `${String(Math.floor(d / 60)).padStart(2, '0')}:${String(d % 60).padStart(2, '0')}`;
};
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export class PassAdapter implements GameAdapter {
  name = 'the-pass';
  readonly s: GameState;
  private carry = 0;
  /** The last line read: The Pass trims `said` from the front, so position is not stable. */
  private lastSaid: GameState['said'][number] | undefined;
  private ticketSeen = new Map<number, Ticket['status']>();
  private counters = new Map<string, CookState['night']>();
  private phase: GameState['phase'];
  private jarDone = false;
  private reportsSeen = 0;

  constructor(seed: number) {
    this.s = kitchen.newGame(seed);
    this.phase = this.s.phase;
    for (const t of this.s.tickets) this.ticketSeen.set(t.id, t.status);
  }

  observe(): Observation {
    const s = this.s;
    const events: PlayEvent[] = [];
    // What was said, with how it went for the chef read from the answer counters.
    for (const c of s.cooks) {
      const before = this.counters.get(c.id);
      const now = { ...c.night };
      if (before && before.asked <= now.asked) {
        const who = NAME[c.id] ?? c.id;
        if (now.refused > before.refused)
          events.push({
            kind: 'refused',
            summary: `${who} said no`,
            valence: -0.4,
            salience: 0.75,
            by: c.id,
          });
        if (now.complied > before.complied)
          events.push({
            kind: 'complied',
            summary: `${who} did it, grudgingly`,
            valence: -0.05,
            salience: 0.6,
            by: c.id,
          });
        if (now.assented > before.assented)
          events.push({
            kind: 'assented',
            summary: `${who} said yes`,
            valence: 0.3,
            salience: 0.6,
            by: c.id,
          });
      }
      this.counters.set(c.id, now);
    }
    const from = this.lastSaid ? s.said.lastIndexOf(this.lastSaid) + 1 : 0;
    for (const line of s.said.slice(from)) {
      const urgent = line.kind === 'call' || line.kind === 'prompt';
      events.push({
        kind: `said:${line.kind}`,
        summary: `${NAME[line.who] ?? line.who}: ${line.text}`,
        valence: line.kind === 'journal' ? 0.05 : 0,
        salience: urgent ? 0.85 : line.kind === 'journal' ? 0.5 : 0.55,
      });
    }
    this.lastSaid = s.said[s.said.length - 1] ?? this.lastSaid;
    for (const t of s.tickets) {
      const was = this.ticketSeen.get(t.id);
      if (was === t.status) continue;
      this.ticketSeen.set(t.id, t.status);
      if (t.status === 'open' && was !== 'open')
        events.push({ kind: 'ticket', summary: `table ${t.table} ordered`, valence: 0, salience: 0.4 });
      if (t.status === 'served')
        events.push(
          t.critic
            ? {
                kind: 'critic-pleased',
                summary: `the food writer at table ${t.table} was served`,
                valence: 0.6,
                salience: 0.9,
              }
            : { kind: 'served', summary: `table ${t.table} served`, valence: 0.25, salience: 0.45 },
        );
      if (t.status === 'walked')
        events.push({
          kind: 'walkout',
          summary: t.critic
            ? `the food writer at table ${t.table} walked out`
            : `table ${t.table} walked out`,
          valence: t.critic ? -0.8 : -0.5,
          salience: 0.85,
        });
    }
    for (const r of s.reports.slice(this.reportsSeen)) {
      const total = r.served + r.walked || 1;
      events.push({
        kind: 'night-report',
        summary: `${DAYS[r.night - 1] ?? r.night} closed: served ${r.served} of ${total}, took ${r.takings}`,
        valence: Math.max(-1, Math.min(1, 2 * (r.served / total - 0.75))),
        salience: 0.9,
      });
      for (const v of r.reviews)
        events.push({
          kind: 'review',
          summary: `${NAME[v.id] ?? v.id}: ${v.aboutYou}`,
          valence: 0.05,
          salience: 0.7,
        });
    }
    this.reportsSeen = s.reports.length;
    if (this.phase !== 'end' && s.phase === 'end') {
      const met = kitchen.bankMet(s);
      events.push({
        kind: 'ending',
        summary: met
          ? `the bank is paid (${s.till} of ${kitchen.BANK_TARGET})`
          : `short of the bank (${s.till} of ${kitchen.BANK_TARGET})`,
        valence: met ? 0.9 : -0.7,
        salience: 1,
      });
    }
    this.phase = s.phase;
    const open = s.tickets.filter((t) => t.status === 'open').length;
    return {
      clock: `${DAYS[s.night - 1] ?? s.night} ${clock(s.minute)}`,
      phase: s.phase,
      events,
      features: { pressure: s.phase === 'service' ? Math.min(1, open / 8) : 0 },
      over: s.phase === 'end',
    };
  }

  actions(): PlayAction[] {
    const s = this.s;
    if (s.phase === 'end') return [];
    if (s.phase === 'evening') {
      const out: PlayAction[] = [{ id: 'open', label: 'open the next night', kind: 'open', promise: 0.6 }];
      if (s.night === 3 && !this.jarDone)
        out.push(
          { id: 'jar:talk', label: 'talk to Rafi about the jar', kind: 'jar', promise: 0.55, focus: 0.08 },
          { id: 'jar:move', label: 'move the jar to the pass', kind: 'jar', promise: 0.5 },
          { id: 'jar:leave', label: 'leave the jar', kind: 'jar', promise: 0.35 },
        );
      return out;
    }
    if (s.call === 'asking')
      return [
        { id: 'call:go', label: 'let Dilek go', kind: 'call', promise: 0.55 },
        { id: 'call:stay', label: 'ask Dilek to stay', kind: 'call', promise: 0.45, tags: ['confront'] },
      ];
    const open = s.tickets.filter((t) => t.status === 'open');
    const need: Record<'grill' | 'cold' | 'dish', number> = {
      grill: open.reduce((n, t) => n + t.grill - t.doneGrill, 0) * WORK.grill,
      cold: open.reduce((n, t) => n + t.cold - t.doneCold, 0) * WORK.cold,
      dish: s.night === 1 ? 0 : s.plates.pile * WORK.dish - s.plates.clean,
    };
    const out: PlayAction[] = [];
    for (const id of COOKS) {
      const c = s.cooks.find((x) => x.id === id);
      if (!c?.here || c.gone || c.pending) continue;
      const st = kitchen.stationOf(s, id);
      const who = NAME[id] ?? id;
      const hs = kitchen.hints(s, id);
      for (const h of hs) {
        if (h.verb === 'home' || h.verb === st) continue;
        const want =
          h.verb === 'grill' || h.verb === 'cold' || h.verb === 'dish'
            ? Math.min(1, Math.max(0, need[h.verb]) / 20)
            : open.length === 0 && !st
              ? 0.15
              : 0;
        if (want <= 0) continue;
        const busy = st && (need[st as 'grill' | 'cold' | 'dish'] ?? 0) >= 2 ? 0.4 : 1;
        out.push({
          id: `ask:${id}:${h.verb}`,
          label: `ask ${who} to ${h.verb} (${h.short})`,
          kind: 'ask',
          promise: want * busy * (VERDICT[h.verdict] ?? 0.3),
        });
        if (want >= 0.4 && (h.verdict === 'refused' || h.verdict === 'deferred' || h.verdict === 'modified'))
          out.push({
            id: `insist:${id}:${h.verb}`,
            label: `insist ${who} ${h.verb}`,
            kind: 'insist',
            promise: 0.6 * want * busy,
            focus: 0.05,
            tags: ['confront'],
          });
      }
    }
    return out;
  }

  apply(id: string): void {
    const s = this.s;
    const [head, a, b] = id.split(':');
    if (head === 'open') kitchen.queueInput(s, { kind: 'open' });
    else if (head === 'jar' && (a === 'talk' || a === 'move' || a === 'leave')) {
      kitchen.queueInput(s, { kind: 'jar', choice: a });
      this.jarDone = true;
    } else if (head === 'call' && (a === 'go' || a === 'stay'))
      kitchen.queueInput(s, { kind: 'call', choice: a });
    else if ((head === 'ask' || head === 'insist') && a && b)
      kitchen.queueInput(s, { kind: 'ask', cook: a, verb: b as Verb, insist: head === 'insist' });
  }

  advance(seconds: number): void {
    const s = this.s;
    if (s.phase !== 'service') return;
    this.carry += seconds * (s.call === 'asking' ? SLOWED : STEADY);
    while (this.carry >= 1 && s.phase === 'service') {
      kitchen.step(s);
      this.carry -= 1;
    }
    if (s.phase !== 'service') this.carry = 0;
  }
}
