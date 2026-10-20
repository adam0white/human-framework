/**
 * A `GameAdapter` for Small Works (the repair workshop game): an HF persona runs the workshop. Example only,
 * read-only against Small Works: it imports the game's own headless engine from a checkout and never edits it.
 * Pass the checkout as `SMALLWORKS_DIR` (default ~/code/repair-game). Written against engine small-works@5
 * (repair-game commit d32a4bb, HF 2.8.0); a later engine may change these fields, so the adapter reads stable
 * fields only and treats unknown log lines as ordinary talk.
 *
 * The game's TypeScript uses extensionless relative imports, which plain Node ESM does not resolve: run this
 * through `smallworks-session.ts`, which registers a resolve hook first (or register one yourself).
 *
 * Two HF copies run in one process: the workshop's people (Sam, Mum, Nora, Evan) use the HF the game pins (its
 * own node_modules), the persona uses this repository's HF. They never share a Person.
 *
 * What the player sees, and so what the adapter shows: the job cards (title, owner's description, quote, return
 * time, payment, readiness line), the object's marked components and terminals, the player's own and Sam's
 * recorded observations (`job.evidence`: inspection, readings with the screen's interpretation of each signal,
 * use checks, work), the power switch, stock counts and prices, cash, the clock and minutes to closing, the log
 * (who said what), Sam's visible state line and blocked reason, the first-repair guide's highlighted step, the
 * gathering panel (its own ready/prepared lines) and the first-week account. It never reads a component's
 * `condition`, a person's needs, trust, goals or methods, or any test result the player has not run. Where the
 * game's own UI helpers decide what is on screen (`firstRepairProgress`, `eventOptions`, `describePerson`), the
 * adapter calls them, because their output is what the screen renders.
 *
 * Small Works is turn-based: game time moves only on the player's commands (each repair step costs its listed
 * minutes; `wait` and `next-day` move the clock on purpose). `advance(seconds)` therefore changes nothing in the
 * world: real seconds are the player's reading and thinking time. A beat with no input is a player looking at the
 * bench, not a world running past them, so a long lull here reads as "nothing on screen invites a move", not
 * "the game kept me waiting". Every input gets an answer (a reading, a line, or the status message), as in the UI.
 *
 * `promise` is a reasonable player's read of the screen: try the owner's use first, then measure untried spans
 * under the reported failing condition, work on parts whose readings look wrong, check again under the owner's
 * use, return it. Every number is an engineering premise for playtesting, not a model of real players.
 */
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { GameAdapter, Observation, PlayAction, PlayEvent } from '../src/index.ts';

type TC = 'bench' | 'movement' | 'load';
type Mode = 'voltage' | 'continuity' | 'motion';
interface Component {
  id: string;
  kind: string;
  label: string;
  terminals: [string, string];
}
interface Evidence {
  id: number;
  at: number;
  kind: 'inspection' | 'measurement' | 'use' | 'work';
  summary: string;
  cues: Record<string, string>;
  actorId?: string;
  componentId?: string;
  request?: { mode: Mode; a: string; b: string; condition: TC };
  value?: number | null;
  condition?: TC;
}
interface Job {
  id: string;
  title: string;
  ownerId: string;
  description: string;
  importance: string;
  requiredConditions?: TC[];
  kind: 'lantern' | 'fan' | 'music-box';
  model: { components: Component[]; power: boolean; ratedDrive?: number; gearRatio?: number };
  status: 'offer' | 'active' | 'ready' | 'delivered' | 'declined' | 'salvaged';
  due: number;
  reward: number;
  evidence: Evidence[];
  contributions: { actorId: string; action: string; at: number }[];
  verified: TC[];
  inspected: string[];
  assignedTo?: string;
  blocked?: { reason: string };
  deliveredAt?: number;
  returnedUnfinished?: boolean;
  isPersonal?: boolean;
  isDonor?: boolean;
  quote?: string;
}
interface LogEntry {
  id: number;
  at: number;
  speaker: string;
  text: string;
  tone: 'ordinary' | 'good' | 'warning';
}
interface Community {
  phase: 'announced' | 'setting-up' | 'completed';
  opensAt: number;
  deadline: number;
  finishesAt: number;
  preparedFormats: string[];
  reservedJobIds: string[];
  preparations: { format: string; completedAt?: number }[];
  resolvedAt?: number;
  outcome: string;
}
export interface SmallWorksState {
  now: number;
  day: number;
  cash: number;
  stock: Partial<Record<string, number>>;
  jobs: Job[];
  people: Record<string, unknown>;
  npcWork: { personId: string; jobId?: string; option: { label: string }; endsAt: number }[];
  watching: boolean;
  watchUntil?: number;
  pendingRequest?: { kind: 'lesson' | 'repair'; status: 'requested' | 'ready'; jobId?: string };
  selectedJobId: string;
  log: LogEntry[];
  upgrades: string[];
  ended: boolean;
  weekReviewed: boolean;
  community?: Community;
}
type Command = { type: string } & Record<string, unknown>;
interface Engine {
  createGame(seed: number): SmallWorksState;
  dispatch(s: SmallWorksState, c: Command): { state: SmallWorksState; ok: boolean; message: string };
  dayTime(now: number): string;
  dayRemaining(s: SmallWorksState): number;
  requiredChecks(job: Job): TC[];
  jobReadiness(job: Job): string;
  PART_PRICES: Partial<Record<string, number>>;
  UPGRADE_CATALOG: { id: string; name: string; price: number }[];
}

const DIR = process.env.SMALLWORKS_DIR ?? join(homedir(), 'code', 'repair-game');
export const engine = (await import(join(DIR, 'src/game/engine.ts'))) as Engine;
const { firstRepairProgress } = (await import(join(DIR, 'src/ui/first-repair.ts'))) as {
  firstRepairProgress(s: SmallWorksState): {
    phase: string;
    workshopAvailable: boolean;
    apprenticeshipAvailable: boolean;
    suggestedPart?: string;
    suggestedPair?: { mode: Mode; a: string; b: string; condition: TC };
  };
};
const { eventOptions } = (await import(join(DIR, 'src/game/community.ts'))) as {
  eventOptions(
    s: SmallWorksState,
    e: Community,
  ): { format: string; label: string; ready: boolean; prepared: boolean; reason: string }[];
};
const { describePerson } = (await import(join(DIR, 'src/game/people.ts'))) as {
  describePerson(p: unknown): { state: string };
};

const CONDITIONS: TC[] = ['bench', 'movement', 'load'];
const ABNORMAL = new Set([
  'high-drop',
  'low-source',
  'resistance',
  'open-path',
  'slow-drive',
  'blocked-drive',
]);
/** The status line the UI prints for a fresh reading (App.tsx `interpretations`). */
const READ: Record<string, string> = {
  'high-drop': 'large voltage drop across this span',
  'low-source': 'source voltage below the normal reference',
  voltage: 'voltage recorded',
  'open-path': 'no conducting path',
  resistance: 'resistance above the conducting-link reference',
  connected: 'a conducting path is present',
  rotation: 'shaft motion recorded',
  'slow-drive': 'the observed shaft turns slowly',
  'blocked-drive': 'no motion at the observed shaft',
  'power-off': 'the object is switched off',
};
/** Collar factors printed in the Notes reference table. */
const COLLAR = [0.4, 0.8, 1, 1.2, 1.6];
const PEOPLE: Record<string, string> = { Sam: 'sam', Mum: 'mum', Nora: 'nora', Evan: 'evan' };
const clamp = (x: number) => Math.max(0, Math.min(1, x));
const SAM_NO =
  /not accepted|cannot|ask me again|no useful time|keep my own plans|took a break|did not follow|is cancelled|has passed|no longer available/i;

/** The shortlist a player weighs (see `shortlist`): promise floor, share of the best, and size. */
const SHORTLIST = { floor: 0.12, share: 0.55, max: 8 };
/**
 * Screen pace: real seconds of clicking a command takes in the UI (choose pane, terminals, condition, press), and
 * reading speed for what comes back. Engineering premises from the UI's click counts, not measured players.
 */
const CLICK_SECONDS: Record<string, number> = {
  measure: 6,
  calibrate: 5,
  work: 4,
  buy: 4,
  upgrade: 4,
  'prepare-event': 4,
  inspect: 3,
  verify: 3,
  deliver: 3,
  salvage: 3,
  select: 3,
  accept: 3,
  decline: 3,
  continue: 3,
  'request-lesson': 3,
  'start-lesson': 3,
  assign: 3,
  'retry-sam': 3,
  recall: 3,
};
const READ_WORDS_PER_SECOND = 4;

export interface SmallWorksOptions {
  /** Days after which the session ends regardless (the engine has no last day after the first week). */
  maxDay?: number;
  /** Beats the first-week account may stay on screen without a choice before the session reads as ended. */
  accountPatience?: number;
  /**
   * 'screen' (default): after each input the player spends the seconds the UI's clicks take plus reading time for
   * what came back before choosing again. 'instant': a new input every beat (no reading, no clicking).
   */
  pace?: 'screen' | 'instant';
}

export class SmallWorksAdapter implements GameAdapter {
  name = 'small-works';
  s: SmallWorksState;
  /** Every command applied and how it went, for inspection. */
  readonly inputs: { command: Command; ok: boolean; message: string }[] = [];
  /** Real seconds the player has spent (thinking time; the world does not move with it). */
  realSeconds = 0;
  private readonly maxDay: number;
  private readonly accountPatience: number;
  private readonly paced: boolean;
  private busyUntil = 0;
  /** Inputs the screen refused, with the clock then: the same answer is expected until the clock moves. */
  private refused = new Map<string, number>();
  /** The clock when the screen last said the bench itself is taken. */
  private benchTakenAt: number | undefined;
  private passed = new Set<string>();
  private commands = new Map<string, Command>();
  private pending: PlayEvent[] = [];
  private lastLogId: number;
  private lastEvidenceId = new Map<string, number>();
  private jobsSeen = new Set<string>();
  private overdue = new Set<string>();
  private day: number;
  private skippedIntro = false;
  private accountBeats = 0;
  private leftAtAccount = false;
  private salvaged = new Set<string>();
  private uncheckedReturns = 0;

  constructor(seed: number, opts: SmallWorksOptions = {}) {
    this.s = engine.createGame(seed);
    this.maxDay = opts.maxDay ?? 15;
    this.accountPatience = opts.accountPatience ?? 10;
    this.paced =
      (opts.pace ?? (process.env.SMALLWORKS_PACE === 'instant' ? 'instant' : 'screen')) === 'screen';
    this.day = this.s.day;
    // The opening lines are on screen at the start; they are read as the first observation.
    this.lastLogId = 0;
    for (const j of this.s.jobs) {
      this.jobsSeen.add(j.id);
      this.lastEvidenceId.set(j.id, maxId(j.evidence));
    }
  }

  // ---- what the screen shows -------------------------------------------------------------------------------

  observe(): Observation {
    const s = this.s;
    const events: PlayEvent[] = this.pending;
    this.pending = [];
    for (const line of s.log.filter((l) => l.id > this.lastLogId)) {
      const e = this.lineEvent(line);
      if (e) events.push(e);
    }
    this.lastLogId = Math.max(this.lastLogId, ...s.log.map((l) => l.id));
    for (const j of s.jobs) {
      const from = this.lastEvidenceId.get(j.id) ?? 0;
      for (const e of j.evidence.filter((x) => x.id > from)) events.push(this.evidenceEvent(j, e));
      this.lastEvidenceId.set(j.id, Math.max(from, maxId(j.evidence)));
      if (!this.jobsSeen.has(j.id)) {
        this.jobsSeen.add(j.id);
        if (j.status === 'offer')
          events.push({
            kind: 'offer',
            summary: `new request: ${j.title} (${j.quote ?? `£${j.reward}`})`,
            valence: 0.12,
            salience: 0.55,
          });
      }
      if (this.isPromise(j) && s.now > j.due && !this.overdue.has(j.id)) {
        this.overdue.add(j.id);
        events.push({
          kind: 'overdue',
          summary: `${j.title} is past its return time (${engine.dayTime(j.due)})`,
          valence: -0.45,
          salience: 0.8,
        });
      }
    }
    if (s.day !== this.day) {
      this.day = s.day;
      events.push({
        kind: 'new-day',
        summary: `Day ${s.day} opens, £${s.cash} in hand`,
        valence: 0.05,
        salience: 0.5,
      });
    }
    if (this.paced) {
      const words = events.reduce((n, e) => n + e.summary.split(/\s+/).length, 0);
      this.busyUntil = Math.max(this.busyUntil, this.realSeconds + words / READ_WORDS_PER_SECOND);
    }
    const over =
      this.leftAtAccount || s.day > this.maxDay || (s.ended && this.accountBeats > this.accountPatience);
    if (s.ended) this.accountBeats += 1;
    const loops = this.loops();
    const tally = this.tally();
    return {
      clock: engine.dayTime(s.now),
      phase: s.ended
        ? 'week-account'
        : s.community &&
            s.community.phase !== 'completed' &&
            s.day === Math.floor(s.community.opensAt / 1440) + 1
          ? 'gathering'
          : engine.dayRemaining(s) < 10
            ? 'closing'
            : 'workshop',
      events,
      features: { pressure: this.pressure(), openLoop: clamp(0.2 * loops.length), cash: s.cash },
      over,
      chapter: `Day ${s.day}`,
      ...(over || s.ended
        ? { outcome: tally.paid >= 3 && tally.unchecked === 0 ? 'win' : tally.paid === 0 ? 'loss' : 'mixed' }
        : {}),
      loops,
    } as Observation;
  }

  private lineEvent(line: LogEntry): PlayEvent | undefined {
    const t = line.text;
    const who = PEOPLE[line.speaker];
    const summary = `${line.speaker}: ${t}`;
    if (line.speaker === 'You') return undefined; // the player's own words; the status line answers the input
    if (/first week is complete/i.test(t)) {
      const k = this.tally();
      return {
        kind: 'week-account',
        summary: `first-week account: ${k.paid} back in use, ${k.unfinished} returned unfinished, ${k.late} late, £${this.s.cash}`,
        valence: clamp(0.25 * k.paid) - 0.15 * k.unchecked - 0.1,
        salience: 1,
      };
    }
    if (line.speaker === 'Neighbourhood')
      return /No prepared activity was completed/.test(t)
        ? { kind: 'gathering-empty', summary, valence: -0.35, salience: 0.9 }
        : { kind: 'gathering', summary, valence: 0.65, salience: 0.95 };
    if (/is back in use/.test(t)) {
      const late = /later than promised/.test(t);
      return {
        kind: 'returned',
        summary,
        valence: late ? 0.35 : 0.7,
        salience: 0.95,
        ...(who ? { by: who } : {}),
      };
    }
    if (/not reliable in use/.test(t)) {
      this.uncheckedReturns += 1;
      return {
        kind: 'returned-unchecked',
        summary,
        valence: -0.6,
        salience: 0.9,
        ...(who ? { by: who } : {}),
      };
    }
    if (/telling me what remains/.test(t))
      return {
        kind: 'returned-unfinished',
        summary,
        valence: -0.2,
        salience: 0.75,
        ...(who ? { by: who } : {}),
      };
    if (line.speaker === 'Sam') {
      const morning = /back this morning|want to learn to handle|have the morning free/i.test(t);
      const v = SAM_NO.test(t)
        ? -0.3
        : /helped|accept responsibility|can start a lesson|finished the checked work/i.test(t)
          ? 0.4
          : /no improvement/i.test(t)
            ? -0.15
            : line.tone === 'good'
              ? 0.4
              : line.tone === 'warning'
                ? -0.3
                : 0.05;
      return {
        kind: v < 0 ? 'sam-no' : v >= 0.3 ? 'sam-yes' : 'sam-said',
        summary,
        valence: v,
        salience: v < 0 || v >= 0.3 ? 0.7 : 0.5,
        by: 'sam',
        ...(morning ? { answers: false } : {}),
      };
    }
    if (who)
      return {
        kind: 'said',
        summary,
        valence: line.tone === 'good' ? 0.3 : line.tone === 'warning' ? -0.25 : 0.03,
        salience: 0.55,
        by: who,
        answers: false,
      };
    // The workshop's own lines: purchases, salvage, costs, notices.
    if (/covers consumables/.test(t)) return { kind: 'costs', summary, valence: -0.05, salience: 0.35 };
    if (/Recovered one working/.test(t)) return { kind: 'salvaged', summary, valence: 0.3, salience: 0.6 };
    if (/not usable/.test(t)) return { kind: 'salvage-dud', summary, valence: -0.25, salience: 0.6 };
    if (/^Bought one/.test(t)) return { kind: 'bought', summary, valence: 0, salience: 0.35 };
    return {
      kind: `notice:${line.tone}`,
      summary,
      valence: line.tone === 'good' ? 0.3 : line.tone === 'warning' ? -0.15 : 0,
      salience: line.tone === 'ordinary' ? 0.4 : 0.6,
      answers: false,
    };
  }

  private evidenceEvent(j: Job, e: Evidence): PlayEvent {
    const by = e.actorId && e.actorId !== 'player' ? { by: e.actorId } : { answers: true };
    const signal = e.cues.signal ?? '';
    const who = e.actorId === 'sam' ? 'Sam: ' : '';
    if (e.kind === 'measurement') {
      const odd = ABNORMAL.has(signal);
      return {
        kind: odd ? 'reading:odd' : signal === 'power-off' ? 'reading:off' : 'reading',
        summary: `${who}${j.title}: ${e.summary} (${READ[signal] ?? signal})`,
        valence: odd ? 0.15 : signal === 'power-off' ? -0.1 : 0.02,
        salience: odd ? 0.7 : 0.45,
        ...by,
      };
    }
    if (e.kind === 'use') {
      const required = e.condition !== undefined && engine.requiredChecks(j).includes(e.condition);
      const pass = signal === 'steady-output';
      const prior = j.evidence.filter((x) => x.id < e.id);
      const afterWork =
        (prior.findLast((x) => x.kind === 'work')?.id ?? -1) >
        (prior.findLast((x) => x.kind === 'use')?.id ?? 0);
      // The first pass under the owner's use is the payoff; passing the same check again is only reassurance.
      const key = `${j.id}:${e.condition}`;
      const again = pass && required && this.passed.has(key);
      if (pass && required) this.passed.add(key);
      return {
        kind: pass
          ? required
            ? again
              ? 'check:pass-again'
              : 'check:pass'
            : 'check:pass-bench'
          : afterWork
            ? 'check:still-failing'
            : 'check:fail',
        summary: `${who}${j.title}: ${e.summary}`,
        valence: pass ? (required && !again ? 0.5 : 0.15) : afterWork ? -0.35 : -0.05,
        salience: pass && required ? 0.85 : afterWork ? 0.75 : 0.55,
        ...by,
      };
    }
    if (e.kind === 'work')
      return { kind: 'work', summary: `${who}${j.title}: ${e.summary}`, valence: 0.05, salience: 0.5, ...by };
    return { kind: 'inspect', summary: `${who}${j.title}: ${e.summary}`, valence: 0, salience: 0.4, ...by };
  }

  private isPromise(j: Job): boolean {
    return !j.isPersonal && !j.isDonor && (j.status === 'active' || j.status === 'ready');
  }

  private pressure(): number {
    const s = this.s;
    let p = 0;
    for (const j of s.jobs.filter((x) => this.isPromise(x))) {
      const left = j.due - s.now;
      p = Math.max(p, left <= 0 ? 0.9 : clamp(1 - left / 480));
    }
    const c = s.community;
    if (c && c.resolvedAt === undefined && c.deadline - s.now < 480 && c.deadline > s.now)
      p = Math.max(p, clamp(1 - (c.deadline - s.now) / 480));
    return Math.round(p * 100) / 100;
  }

  private loops(): string[] {
    const s = this.s;
    const out: string[] = [];
    for (const j of s.jobs.filter((x) => this.isPromise(x)))
      out.push(`${j.title}: return by ${engine.dayTime(j.due)} (${engine.jobReadiness(j)})`);
    for (const j of s.jobs.filter((x) => x.blocked))
      out.push(`Sam has put ${j.title} aside: ${j.blocked?.reason}`);
    if (s.pendingRequest) out.push(`Sam's ${s.pendingRequest.kind} request is ${s.pendingRequest.status}`);
    const c = s.community;
    if (c && c.phase !== 'completed')
      out.push(`the gathering at ${engine.dayTime(c.deadline)}, ${c.preparedFormats.length} prepared`);
    return out;
  }

  /** Returns as the first-week account counts them (unchecked returns are read off the owner's reply). */
  tally(): { paid: number; late: number; unfinished: number; unchecked: number; open: number } {
    const t = { paid: 0, late: 0, unfinished: 0, unchecked: this.uncheckedReturns, open: 0 };
    for (const j of this.s.jobs.filter((x) => !x.isPersonal && !x.isDonor)) {
      if (j.status === 'delivered') {
        if (!j.returnedUnfinished) {
          t.paid += 1;
          if ((j.deliveredAt ?? 0) > j.due) t.late += 1;
        } else t.unfinished += 1;
      } else if (j.status === 'active' || j.status === 'ready') t.open += 1;
    }
    t.unfinished = Math.max(0, t.unfinished - t.unchecked);
    return t;
  }

  // ---- what the player could do -----------------------------------------------------------------------------

  actions(): PlayAction[] {
    this.commands.clear();
    // Still reading the last answer or working the controls for the last input: nothing new to choose yet.
    if (this.realSeconds < this.busyUntil) return [];
    const s = this.s;
    const out: PlayAction[] = [];
    const add = (a: PlayAction, c: Command) => {
      if (this.commands.has(a.id)) return;
      this.commands.set(a.id, c);
      out.push({ ...a, promise: clamp(Math.round(a.promise * 1000) / 1000) });
    };
    if (s.ended) {
      const k = this.tally();
      add(
        {
          id: 'continue',
          label: 'keep this workshop going',
          kind: 'continue',
          promise: 0.25 + 0.1 * Math.min(5, k.paid),
        },
        { type: 'continue' },
      );
      add({ id: 'leave', label: 'leave the workshop here', kind: 'leave', promise: 0.45 }, { type: 'leave' });
      return out;
    }
    const left = engine.dayRemaining(s);
    const progress = firstRepairProgress(s);
    const guided = !this.skippedIntro && !progress.workshopAvailable;
    const job = s.jobs.find((j) => j.id === s.selectedJobId) ?? s.jobs[0];
    if (job && this.workable(job)) this.benchActions(job, guided ? progress : undefined, add);
    // The menu: always there.
    if (left >= 30)
      add(
        { id: 'wait:30', label: 'wait 30 min', kind: 'wait', promise: 0.04 },
        { type: 'wait', minutes: 30 },
      );
    const useful =
      s.jobs.some((j) => this.isPromise(j) && this.workable(j)) || s.jobs.some((j) => j.status === 'offer');
    add(
      {
        id: 'next-day',
        label: 'close for the day',
        kind: 'next-day',
        promise: left < 15 ? 0.9 : left < 60 ? 0.45 : !useful ? 0.5 : 0.04,
      },
      { type: 'next-day' },
    );
    if (guided) {
      add(
        { id: 'skip-intro', label: 'put this aside, explore the workshop', kind: 'explore', promise: 0.06 },
        { type: 'skip-intro' },
      );
    } else this.boardActions(job, progress.apprenticeshipAvailable, add);
    return this.shortlist(out);
  }

  /**
   * What a player actually weighs: the few moves that look best on screen, not every button. HF's input scorer
   * separates promise only weakly (utility ~0.01 × promise at the personas' temperatures), so a long tail of
   * unlikely buttons would drown the read; the shortlist keeps moves within reach of the best one. When nothing
   * looks useful, closing the day is the move the screen leaves.
   */
  private shortlist(all: PlayAction[]): PlayAction[] {
    const s = this.s;
    const left = engine.dayRemaining(s);
    const taken = this.benchTakenAt === s.now;
    for (const a of all) {
      const c = this.commands.get(a.id);
      // Buttons show their minutes and the menu shows minutes to closing; a step that cannot fit is not weighed.
      if (c && minutesOf(c) > left) a.promise = 0;
      // The screen just refused this input and nothing has changed since.
      if (this.refused.get(a.id) === s.now) a.promise = 0;
      if (c && taken && BENCH.has(c.type)) a.promise *= 0.08;
    }
    const sorted = [...all].sort((a, b) => b.promise - a.promise);
    const top = sorted[0]?.promise ?? 0;
    if (top < SHORTLIST.floor) {
      const close = sorted.find((a) => a.id === 'next-day');
      return close ? [{ ...close, promise: 0.45 }] : sorted.slice(0, 1);
    }
    const kept = sorted.filter((a) => a.promise >= Math.max(SHORTLIST.floor, SHORTLIST.share * top));
    for (const a of all) if (!kept.includes(a)) this.commands.delete(a.id);
    return kept.slice(0, SHORTLIST.max);
  }

  private workable(j: Job): boolean {
    const s = this.s;
    return (
      (j.status === 'active' || j.status === 'ready') &&
      !j.assignedTo &&
      !s.community?.reservedJobIds.includes(j.id) &&
      !(s.pendingRequest?.kind === 'repair' && s.pendingRequest.jobId === j.id)
    );
  }

  /** The failing conditions the owner's words name, plus the use the owner asks to be checked. */
  private symptoms(j: Job): TC[] {
    const d = j.description;
    const out = new Set<TC>(engine.requiredChecks(j));
    if (
      /On the shelf, it stays (dark|dim)|At rest, (there is no airflow|the airflow falls)|On the bench, the melody (stops|runs)/.test(
        d,
      )
    )
      out.add('bench');
    if (/when carried, it (goes dark|stays dim)|[Cc]arry it .* goes dark|carried/.test(d))
      out.add('movement');
    if (
      /While working, it stays (dark|dim)|through the grille, (there is no|the airflow falls)|driving the figures, the melody (stops|runs)|filter|fades/.test(
        d,
      )
    )
      out.add('load');
    return [...out];
  }

  private benchActions(
    j: Job,
    guide: ReturnType<typeof firstRepairProgress> | undefined,
    add: (a: PlayAction, c: Command) => void,
  ): void {
    const s = this.s;
    const required = engine.requiredChecks(j);
    const symptoms = this.symptoms(j);
    const lastWork = j.evidence.findLast((e) => e.kind === 'work');
    const current = j.evidence.filter((e) => e.id > (lastWork?.id ?? 0));
    const uses = current.filter((e) => e.kind === 'use');
    const readings = current.filter((e) => e.kind === 'measurement' && e.request);
    const suspects = new Map<string, Evidence>();
    if (j.kind === 'music-box') for (const [id, r] of this.driveSuspects(j, readings)) suspects.set(id, r);
    else
      for (const r of readings)
        if (r.componentId && ABNORMAL.has(r.cues.signal ?? '')) suspects.set(r.componentId, r);
    const lead = suspects.size > 0;
    const power = j.model.power;
    const music = j.kind === 'music-box';
    const t = j.title;
    const suggested = guide?.suggestedPair;
    const isSuggested = (m: Mode, a: string, b: string, c: TC) =>
      !!suggested &&
      suggested.mode === m &&
      suggested.condition === c &&
      [suggested.a, suggested.b].sort().join() === [a, b].sort().join();

    if (j.isDonor) {
      this.donorActions(j, add);
      return;
    }
    // Use checks: the owner's use first, again right after work.
    for (const c of CONDITIONS) {
      if (!required.includes(c) && c !== 'bench') continue;
      const last = uses.findLast((e) => e.condition === c);
      let p: number;
      if (last) p = last.cues.signal === 'steady-output' ? 0.03 : 0.06;
      else if (lastWork) p = required.includes(c) ? 0.88 : 0.3;
      else if (j.evidence.length === 0) p = required.includes(c) ? 0.62 : 0.25;
      else p = required.includes(c) ? (lead ? 0.12 : 0.28) : 0.12;
      if (!power) p *= 0.1;
      if (guide?.phase === 'try' || guide?.phase === 'check') p = required.includes(c) ? 0.92 : 0.1;
      add(
        { id: `verify:${c}`, label: `check ${t} under ${c}`, kind: 'check', promise: p },
        { type: 'verify', jobId: j.id, condition: c },
      );
    }
    // Power: voltage, motion and use checks need it on; continuity needs it off.
    const voltsSeen = readings.filter((r) => r.request?.mode === 'voltage');
    if (!music) {
      if (power) {
        const wantContinuity = voltsSeen.length >= 3 && !lead;
        add(
          {
            id: 'power:off',
            label: `switch ${t} off`,
            kind: 'power',
            promise: wantContinuity ? 0.35 : guide ? 0.01 : 0.05,
          },
          { type: 'power', jobId: j.id, on: false },
        );
      } else
        add(
          { id: 'power:on', label: `switch ${t} on`, kind: 'power', promise: 0.6 },
          { type: 'power', jobId: j.id, on: true },
        );
    }
    // Readings: untried spans under the conditions the owner's words point at.
    const mode: Mode = music ? 'motion' : power ? 'voltage' : 'continuity';
    const spans: { a: string; b: string; comp?: Component }[] = music
      ? ['A', 'B', 'C', 'D'].map((n) => ({
          a: '0',
          b: n,
          comp: j.model.components.find((c) => c.terminals.includes('0') && c.terminals.includes(n)),
        }))
      : j.model.components
          .filter((c) => mode === 'voltage' || c.kind !== 'cell')
          .map((c) => ({ a: c.terminals[0], b: c.terminals[1], comp: c }));
    const probes: { a: PlayAction; c: Command }[] = [];
    for (const sp of spans)
      for (const c of CONDITIONS) {
        const tried = readings.some(
          (r) =>
            r.request?.mode === mode &&
            r.request.condition === c &&
            [r.request.a, r.request.b].sort().join() === [sp.a, sp.b].sort().join(),
        );
        const pref = symptoms.includes(c) ? 1 : c === 'bench' ? 0.55 : 0.3;
        let p = 0.55 * pref * (tried ? 0.04 : 1) * (lead ? 0.45 : 1);
        if (sp.comp?.kind === 'cell' && c === 'bench') p *= 1.15;
        const hinted = isSuggested(mode, sp.a, sp.b, c);
        // The guide highlights its probe pair only while it is asking for a reading.
        if (guide) p = hinted && guide.phase.startsWith('measure') ? 0.9 : p * 0.3;
        if (mode === 'voltage' && !power) p *= 0.05;
        // The guide highlights its probe pair in its own order; read it that way.
        const [a, b] = hinted && suggested ? [suggested.a, suggested.b] : [sp.a, sp.b];
        const id = `measure:${mode}:${a}:${b}:${c}`;
        probes.push({
          a: {
            id,
            label: `read ${mode} ${a}–${b}${sp.comp ? ` (${sp.comp.label})` : ''} under ${c}`,
            kind: 'measure',
            promise: p,
          },
          c: { type: 'measure', jobId: j.id, request: { mode, a, b, condition: c } },
        });
      }
    for (const pr of probes.sort((x, y) => y.a.promise - x.a.promise).slice(0, 6)) add(pr.a, pr.c);
    // Inspection: suspects first, then anything unopened.
    for (const c of j.model.components) {
      const inspected = j.inspected.includes(c.id);
      if (inspected && !suspects.has(c.id)) continue;
      let p = inspected ? 0.04 : suspects.has(c.id) ? 0.55 : j.evidence.length ? 0.18 : 0.3;
      if (guide) p = guide.suggestedPart === c.id && !inspected && guide.phase === 'inspect' ? 0.9 : p * 0.4;
      add(
        { id: `inspect:${c.id}`, label: `examine ${c.label}`, kind: 'inspect', promise: p },
        { type: 'inspect', jobId: j.id, componentId: c.id },
      );
    }
    // Work on parts whose readings look wrong.
    const tried = new Set(j.contributions.map((c) => c.action));
    const aged = j.evidence.some((e) => e.kind === 'inspection' && e.cues.signal === 'aged-surface');
    for (const c of j.model.components) {
      const r = suspects.get(c.id);
      const looksAged = c.kind === 'contact' && aged && !lead;
      if (!r && !looksAged) continue;
      const sig = r?.cues.signal ?? 'aged-surface';
      const movingOnly = r?.request?.condition === 'movement';
      const base: Record<string, number> = {
        clean: sig === 'resistance' || sig === 'aged-surface' ? 0.66 : movingOnly ? 0.48 : 0.58,
        adjust: movingOnly ? 0.68 : 0.5,
        replace: sig === 'open-path' || sig === 'low-source' || sig === 'blocked-drive' ? 0.7 : 0.42,
      };
      for (const w of ['clean', 'adjust', 'replace'] as const) {
        if (c.kind === 'governor' && w === 'adjust') continue;
        if (w === 'replace' && !(s.stock[c.kind] ?? 0)) continue;
        let p = base[w] ?? 0.4;
        if (looksAged) p *= 0.5;
        if (tried.has(`${w}:${c.id}`)) p *= 0.2;
        if (!j.inspected.includes(c.id)) p *= 0.85;
        if (guide) p = guide.phase === 'repair' && guide.suggestedPart === c.id ? p + 0.25 : p * 0.5;
        add(
          { id: `${w}:${c.id}`, label: `${w} ${c.label}`, kind: 'work', promise: p },
          { type: 'work', jobId: j.id, componentId: c.id, intervention: w },
        );
      }
      if (!(s.stock[c.kind] ?? 0)) {
        const price = engine.PART_PRICES[c.kind] ?? 99;
        const exhausted =
          tried.has(`clean:${c.id}`) && (c.kind === 'governor' || tried.has(`adjust:${c.id}`));
        if (s.cash >= price)
          add(
            {
              id: `buy:${c.kind}`,
              label: `buy a ${c.kind} (£${price}, 20 min)`,
              kind: 'buy',
              promise: exhausted || base.replace === 0.7 ? 0.55 : 0.25,
            },
            { type: 'buy', part: c.kind },
          );
      }
    }
    // The governor collar: the Notes reference gives rated drive, ratio and collar factors.
    const gov = j.model.components.find((c) => c.kind === 'governor');
    if (gov && !suspects.size) this.collarActions(j, gov, current, add);
    // Return it, or say honestly what remains as the time runs out.
    if (!j.isPersonal) {
      if (j.status === 'ready')
        add(
          { id: `deliver:${j.id}`, label: `return ${t} checked`, kind: 'deliver', promise: 0.93 },
          { type: 'deliver', jobId: j.id },
        );
      else if (j.evidence.length && (j.due - s.now <= 45 || s.now > j.due))
        add(
          {
            id: `unfinished:${j.id}`,
            label: `return ${t} unfinished`,
            kind: 'return-unfinished',
            promise: 0.4,
          },
          { type: 'deliver', jobId: j.id, unfinished: true },
        );
    }
  }

  /**
   * The drive chain read the way the Notes reference lays it out (spring at A turns at the rated drive, the gear
   * at B divides by the ratio, the governor at C multiplies by its collar factor, the drum at D halves it): the
   * first shaft that turns much slower than what reaches it, under the same condition, points at its part.
   */
  private driveSuspects(j: Job, readings: Evidence[]): Map<string, Evidence> {
    const out = new Map<string, Evidence>();
    const part = (n: string) => j.model.components.find((c) => c.terminals[1] === n);
    const pointer = /Collar pointer is at (\d)/.exec(
      j.evidence.filter((e) => e.kind === 'inspection' && /Collar pointer/.test(e.summary)).at(-1)?.summary ??
        '',
    );
    const lastSet = j.contributions.findLast((c) => c.action.startsWith('calibrate:'));
    const setting = lastSet ? Number(lastSet.action.split(':')[2]) : pointer ? Number(pointer[1]) : undefined;
    for (const c of CONDITIONS) {
      const at: Record<string, Evidence> = {};
      for (const r of readings)
        if (r.request?.mode === 'motion' && r.request.condition === c && r.request.a === '0')
          at[r.request.b] = r;
      const speed = (n: string) =>
        typeof at[n]?.value === 'number' ? Math.abs(at[n]?.value as number) : undefined;
      const expected: Record<string, number | undefined> = {
        A: j.model.ratedDrive ?? 120,
        B: speed('A') !== undefined ? (speed('A') as number) / (j.model.gearRatio ?? 4) : undefined,
        C:
          speed('B') !== undefined && setting !== undefined
            ? (speed('B') as number) * (COLLAR[setting] ?? 1)
            : undefined,
        D: speed('C') !== undefined ? (speed('C') as number) / 2 : undefined,
      };
      for (const n of ['A', 'B', 'C', 'D']) {
        const got = speed(n);
        const want = expected[n];
        const r = at[n];
        const comp = part(n);
        if (got === undefined || want === undefined || !r || !comp) continue;
        if (got < 0.8 * want) {
          if (!out.has(comp.id))
            out.set(comp.id, {
              ...r,
              componentId: comp.id,
              cues: { ...r.cues, signal: got === 0 ? 'blocked-drive' : 'slow-drive' },
            });
          break;
        }
      }
    }
    return out;
  }

  private collarActions(
    j: Job,
    gov: Component,
    current: Evidence[],
    add: (a: PlayAction, c: Command) => void,
  ): void {
    const text = j.evidence.map((e) => e.summary).join(' ');
    const desired = Number(
      /requested ([\d.]+) ±/.exec(text)?.[1] ?? /turn at ([\d.]+) rpm/.exec(j.description)?.[1] ?? 15,
    );
    const lastSet = j.contributions.findLast((c) => c.action.startsWith(`calibrate:${gov.id}:`));
    const pointer = /Collar pointer is at (\d)/.exec(
      j.evidence.filter((e) => e.componentId === gov.id && e.kind === 'inspection').at(-1)?.summary ?? '',
    );
    const known = lastSet ? Number(lastSet.action.split(':')[2]) : pointer ? Number(pointer[1]) : undefined;
    const pace = current.findLast((e) => e.kind === 'use' && /Drum turns at/.test(e.summary));
    const drum = pace ? Number(/Drum turns at ([\d.]+)/.exec(pace.summary)?.[1]) : undefined;
    if (!j.evidence.some((e) => e.cues.signal === 'timing')) return;
    const off = current.some((e) => e.cues.signal === 'timing');
    // The player's arithmetic: drum = governor input × factor ÷ 2.
    const nominal = (j.model.ratedDrive ?? 120) / (j.model.gearRatio ?? 4);
    const input =
      drum !== undefined && known !== undefined && drum > 0 ? (2 * drum) / (COLLAR[known] ?? 1) : nominal;
    const want = (2 * desired) / input;
    let best = 0;
    for (let k = 1; k < COLLAR.length; k++)
      if (Math.abs((COLLAR[k] ?? 0) - want) < Math.abs((COLLAR[best] ?? 0) - want)) best = k;
    for (const k of [best - 1, best, best + 1]) {
      if (k < 0 || k > 4 || k === known) continue;
      add(
        {
          id: `calibrate:${k}`,
          label: `set ${gov.label} collar to ${k}`,
          kind: 'calibrate',
          promise: k === best ? (off ? 0.75 : 0.4) : 0.12,
        },
        { type: 'calibrate', jobId: j.id, componentId: gov.id, setting: k },
      );
    }
  }

  /** Kinds a broken part on an accepted object needs and the tray lacks. */
  private wantedParts(): Set<string> {
    const s = this.s;
    const want = new Set<string>();
    for (const j of s.jobs.filter((x) => this.isPromise(x) || (x.isPersonal && x.status === 'active'))) {
      const lastWork = j.evidence.findLast((e) => e.kind === 'work')?.id ?? 0;
      for (const e of j.evidence)
        if (e.id > lastWork && e.componentId && ABNORMAL.has(e.cues.signal ?? '')) {
          const kind = j.model.components.find((c) => c.id === e.componentId)?.kind;
          if (kind && !(s.stock[kind] ?? 0)) want.add(kind);
        }
    }
    return want;
  }

  private donorActions(j: Job, add: (a: PlayAction, c: Command) => void): void {
    const want = this.wantedParts();
    for (const c of j.model.components) {
      if (this.salvaged.has(`${j.id}:${c.id}`)) continue;
      const odd = j.evidence.some((e) => e.componentId === c.id && ABNORMAL.has(e.cues.signal ?? ''));
      const p = want.has(c.kind) ? (odd ? 0.15 : 0.55) : 0.05;
      add(
        { id: `salvage:${c.id}`, label: `recover the ${c.label} (25 min)`, kind: 'salvage', promise: p },
        { type: 'salvage', jobId: j.id, componentId: c.id },
      );
    }
  }

  private boardActions(
    selected: Job | undefined,
    apprentice: boolean,
    add: (a: PlayAction, c: Command) => void,
  ): void {
    const s = this.s;
    const left = engine.dayRemaining(s);
    const load = s.jobs.filter((j) => this.isPromise(j)).length;
    const selectedOpen =
      selected &&
      this.workable(selected) &&
      !selected.isDonor &&
      !(selected.isPersonal && !this.gatheringWants(selected));
    // Requests on the workboard.
    for (const j of s.jobs.filter((x) => x.status === 'offer').slice(0, 4)) {
      if (j.due < s.now) {
        add(
          { id: `decline:${j.id}`, label: `clear expired ${j.title}`, kind: 'decline', promise: 0.2 },
          { type: 'decline', jobId: j.id },
        );
        continue;
      }
      const favour = j.importance === 'Neighbourhood gathering';
      add(
        {
          id: `accept:${j.id}`,
          label: `accept ${j.title} (${j.quote ?? ''})`,
          kind: 'accept',
          promise: (favour ? 0.6 : 0.6 + j.reward / 200) - 0.14 * load,
        },
        { type: 'accept', jobId: j.id },
      );
      if (j.ownerId !== 'mum')
        add(
          { id: `decline:${j.id}`, label: `decline ${j.title}`, kind: 'decline', promise: 0.1 + 0.08 * load },
          { type: 'decline', jobId: j.id },
        );
    }
    // Other objects on the board.
    for (const j of s.jobs.filter((x) => x.id !== selected?.id && this.workable(x))) {
      let p: number;
      if (j.isDonor)
        p = [...this.wantedParts()].some((k) =>
          j.model.components.some((c) => c.kind === k && !this.salvaged.has(`${j.id}:${c.id}`)),
        )
          ? 0.45
          : 0.03;
      else if (j.isPersonal) p = this.gatheringWants(j) ? 0.5 : 0.08;
      else {
        const urgency = clamp(1 - (j.due - s.now) / 1440);
        p = selectedOpen ? 0.1 + 0.2 * urgency : 0.6 + 0.3 * urgency;
        if (j.status === 'ready') p = 0.2;
      }
      add(
        { id: `select:${j.id}`, label: `open ${j.title} on the bench`, kind: 'select', promise: p },
        { type: 'select', jobId: j.id },
      );
    }
    for (const j of s.jobs.filter(
      (x) => x.id !== selected?.id && x.status === 'ready' && !x.isPersonal && !x.isDonor && !x.assignedTo,
    ))
      add(
        { id: `deliver:${j.id}`, label: `return ${j.title} checked`, kind: 'deliver', promise: 0.9 },
        { type: 'deliver', jobId: j.id },
      );
    // Sam, once the screen offers working with him.
    if (apprentice) this.samActions(load, add);
    // The gathering panel.
    const c = s.community;
    if (c && c.phase !== 'completed') {
      const opensDay = Math.floor(c.opensAt / 1440);
      const views = eventOptions(s, c);
      const preparing = c.preparations.some((p) => p.completedAt === undefined);
      if (s.now < c.opensAt && Math.floor(s.now / 1440) === opensDay)
        add(
          {
            id: 'wait-for-site',
            label: `wait until the site opens (${engine.dayTime(c.opensAt)})`,
            kind: 'wait',
            promise: views.some((v) => v.ready && !v.prepared) ? 0.55 : 0.2,
          },
          { type: 'wait-for-site' },
        );
      if (s.now >= c.opensAt && c.resolvedAt === undefined) {
        let preparable = false;
        for (const v of views)
          if (v.ready && !v.prepared && !preparing && s.now + 90 <= c.deadline) {
            preparable = true;
            add(
              {
                id: `prepare:${v.format}`,
                label: `prepare the ${v.label.toLowerCase()} (90 min)`,
                kind: 'prepare',
                promise: 0.78,
              },
              { type: 'prepare-event', format: v.format },
            );
          }
        const until = c.deadline - s.now;
        if (c.preparedFormats.length && !preparable && until > 0 && until <= Math.min(480, left))
          add(
            { id: `wait:${until}`, label: 'wait for the gathering', kind: 'wait', promise: 0.6 },
            { type: 'wait', minutes: until },
          );
      }
      if (c.resolvedAt !== undefined && c.finishesAt > s.now && c.finishesAt - s.now <= Math.min(480, left))
        add(
          {
            id: `wait:${c.finishesAt - s.now}`,
            label: 'stay for the gathering',
            kind: 'wait',
            promise: 0.65,
          },
          { type: 'wait', minutes: c.finishesAt - s.now },
        );
    }
    // Supplies.
    for (const u of engine.UPGRADE_CATALOG)
      if (!s.upgrades.includes(u.id) && s.cash >= u.price + 15 && left >= 30)
        add(
          {
            id: `upgrade:${u.id}`,
            label: `install ${u.name.toLowerCase()} (£${u.price})`,
            kind: 'upgrade',
            promise: u.id === 'second-bench' && s.jobs.some((j) => j.assignedTo === 'sam') ? 0.3 : 0.12,
          },
          { type: 'upgrade', id: u.id },
        );
  }

  private gatheringWants(j: Job): boolean {
    const c = this.s.community;
    return (
      !!c &&
      c.phase !== 'completed' &&
      j.isPersonal === true &&
      !engine.requiredChecks(j).every((x) => j.verified.includes(x))
    );
  }

  private samActions(load: number, add: (a: PlayAction, c: Command) => void): void {
    const s = this.s;
    const left = engine.dayRemaining(s);
    const samJob = s.jobs.find((j) => j.assignedTo === 'sam');
    const req = s.pendingRequest;
    const busy = s.npcWork.find((w) => w.personId === 'sam');
    if (req?.kind === 'lesson' && req.status === 'ready')
      add(
        { id: 'start-lesson', label: 'start the lesson with Sam', kind: 'lesson', promise: 0.8 },
        { type: 'start-lesson' },
      );
    if (req?.status === 'requested' && busy && busy.endsAt > s.now && busy.endsAt - s.now <= left)
      add(
        {
          id: `wait:${busy.endsAt - s.now}`,
          label: `wait for Sam to finish ${busy.option.label.toLowerCase()}`,
          kind: 'wait',
          promise: 0.45,
        },
        { type: 'wait', minutes: busy.endsAt - s.now },
      );
    if (!req && !s.watching && !(samJob && !samJob.blocked) && left >= 10)
      add(
        { id: 'request-lesson', label: 'ask Sam to watch a repair', kind: 'lesson', promise: 0.35 },
        { type: 'request-lesson' },
      );
    if (!req && !samJob) {
      const pick = s.jobs
        .filter((j) => this.workable(j) && !j.isDonor && (this.isPromise(j) || j.isPersonal))
        .sort((a, b) => a.due - b.due)[0];
      if (pick)
        add(
          {
            id: `assign:${pick.id}`,
            label: `ask Sam to take ${pick.title}`,
            kind: 'assign',
            promise: 0.22 + (load >= 2 ? 0.18 : 0),
          },
          { type: 'assign', jobId: pick.id, personId: 'sam' },
        );
    }
    if (samJob?.blocked) {
      add(
        {
          id: `retry-sam:${samJob.id}`,
          label: `ask Sam to retry ${samJob.title}`,
          kind: 'retry',
          promise: 0.4,
        },
        { type: 'retry-sam', jobId: samJob.id },
      );
      add(
        {
          id: `recall:${samJob.id}`,
          label: `take ${samJob.title} back from Sam`,
          kind: 'recall',
          promise: 0.35,
        },
        { type: 'recall', jobId: samJob.id },
      );
    }
    if (req)
      add(
        { id: 'cancel-request', label: 'cancel the request to Sam', kind: 'cancel', promise: 0.04 },
        { type: 'cancel-request' },
      );
    // Sam at the only bench: the screen said so; wait for his step or take the object back.
    const atBench = s.npcWork.find((w) => w.personId === 'sam' && w.jobId);
    if (
      samJob &&
      !samJob.blocked &&
      atBench &&
      !s.upgrades.includes('second-bench') &&
      this.benchTakenAt !== undefined
    ) {
      const until = atBench.endsAt - s.now;
      if (until > 0 && until <= left)
        add(
          {
            id: `wait:${until}`,
            label: `wait for Sam (${describePerson(s.people.sam).state.toLowerCase()})`,
            kind: 'wait',
            promise: 0.35,
          },
          { type: 'wait', minutes: until },
        );
      add(
        {
          id: `recall:${samJob.id}`,
          label: `take ${samJob.title} back from Sam`,
          kind: 'recall',
          promise: 0.3,
        },
        { type: 'recall', jobId: samJob.id },
      );
    }
  }

  /** Inputs the screen allows but a sensible player would not try. */
  edgeActions(): PlayAction[] {
    const s = this.s;
    const out: PlayAction[] = [];
    if (s.ended || this.realSeconds < this.busyUntil) return out;
    const add = (a: PlayAction, c: Command) => {
      if (this.commands.has(a.id)) return;
      this.commands.set(a.id, c);
      out.push(a);
    };
    const job = s.jobs.find((j) => j.id === s.selectedJobId);
    // Return everything unfinished, Mum's lantern first.
    for (const j of s.jobs
      .filter((x) => this.isPromise(x) && this.workable(x) && x.status !== 'ready')
      .slice(0, 2))
      add(
        {
          id: `unfinished:${j.id}`,
          label: `hand ${j.title} back unfinished`,
          kind: 'return-unfinished',
          promise: 0.3,
          mischief: true,
          ...(j.ownerId === 'mum' ? { tags: ['confront'] } : {}),
        },
        { type: 'deliver', jobId: j.id, unfinished: true },
      );
    // Return it as if checked when it is not (the game refuses).
    for (const j of s.jobs.filter((x) => this.isPromise(x) && x.status !== 'ready').slice(0, 1))
      add(
        {
          id: `deliver:${j.id}`,
          label: `return ${j.title} as checked`,
          kind: 'deliver',
          promise: 0.25,
          mischief: true,
        },
        { type: 'deliver', jobId: j.id },
      );
    // Decline Mum.
    for (const j of s.jobs.filter((x) => x.status === 'offer' && x.ownerId === 'mum'))
      add(
        {
          id: `decline:${j.id}`,
          label: `decline Mum's ${j.title}`,
          kind: 'decline',
          promise: 0.3,
          mischief: true,
          tags: ['confront'],
        },
        { type: 'decline', jobId: j.id },
      );
    // Replace a part nobody measured.
    if (job && this.workable(job) && !job.isDonor)
      for (const c of job.model.components
        .filter((x) => (s.stock[x.kind] ?? 0) > 0 && !job.evidence.some((e) => e.componentId === x.id))
        .slice(0, 2))
        add(
          { id: `replace:${c.id}`, label: `replace the ${c.label} blindly`, kind: 'work', promise: 0.3 },
          { type: 'work', jobId: job.id, componentId: c.id, intervention: 'replace' },
        );
    // Buy a part no object needs.
    const want = this.wantedParts();
    const idle = Object.keys(engine.PART_PRICES).find(
      (k) => !want.has(k) && (s.stock[k] ?? 0) > 0 && s.cash >= (engine.PART_PRICES[k] ?? 99),
    );
    if (idle)
      add(
        { id: `buy:${idle}`, label: `buy another ${idle} for the shelf`, kind: 'buy', promise: 0.2 },
        { type: 'buy', part: idle },
      );
    // Press Sam right after he said no.
    const lastSam = s.log.filter((l) => l.speaker === 'Sam').at(-1);
    if (lastSam && SAM_NO.test(lastSam.text) && s.log.at(-1)?.id === lastSam.id) {
      const target = s.jobs.find(
        (j) => this.workable(j) && !j.isDonor && (this.isPromise(j) || j.isPersonal),
      );
      if (target && !s.jobs.some((j) => j.assignedTo === 'sam'))
        add(
          {
            id: `assign:${target.id}`,
            label: `ask Sam again to take ${target.title}`,
            kind: 'assign',
            promise: 0.3,
            mischief: true,
            tags: ['confront'],
          },
          { type: 'assign', jobId: target.id, personId: 'sam' },
        );
      add(
        {
          id: 'request-lesson',
          label: 'ask Sam again for a lesson',
          kind: 'lesson',
          promise: 0.3,
          mischief: true,
          tags: ['confront'],
        },
        { type: 'request-lesson' },
      );
    }
    // Pull Sam off mid-work.
    const samJob = s.jobs.find((j) => j.assignedTo === 'sam' && !j.blocked);
    if (samJob)
      add(
        {
          id: `recall:${samJob.id}`,
          label: `take ${samJob.title} off Sam mid-work`,
          kind: 'recall',
          promise: 0.2,
          mischief: true,
          tags: ['confront'],
        },
        { type: 'recall', jobId: samJob.id },
      );
    // Check with the power off.
    if (job && this.workable(job) && job.model.power && job.kind !== 'music-box')
      add(
        { id: 'power:off', label: `switch ${job.title} off`, kind: 'power', promise: 0.15 },
        { type: 'power', jobId: job.id, on: false },
      );
    return out;
  }

  // ---- doing it ---------------------------------------------------------------------------------------------

  apply(id: string): void {
    const command = this.commands.get(id);
    if (!command) return;
    if (command.type === 'skip-intro') {
      this.skippedIntro = true;
      this.pending.push({
        kind: 'status',
        summary: 'the whole workshop opens up: workboard, people and supplies',
        valence: 0.1,
        salience: 0.5,
        answers: true,
      });
      return;
    }
    if (command.type === 'leave') {
      this.leftAtAccount = true;
      return;
    }
    if (this.paced)
      this.busyUntil = Math.max(this.busyUntil, this.realSeconds + (CLICK_SECONDS[command.type] ?? 2));
    const before = this.s;
    let ok = false;
    let message = '';
    try {
      const r = engine.dispatch(before, command);
      this.s = r.state;
      ok = r.ok;
      message = r.message;
    } catch (error) {
      message = error instanceof Error ? error.message : 'This action could not be completed.';
    }
    this.inputs.push({ command, ok, message });
    if (command.type === 'salvage' && (ok || /nothing to recover/.test(message)))
      this.salvaged.add(`${command.jobId as string}:${command.componentId as string}`);
    if (command.type === 'continue' && ok) this.accountBeats = 0;
    // The status line answers every input; evidence and log lines carry the detail.
    const evidence = this.s.jobs.some((j) => maxId(j.evidence) > (this.lastEvidenceId.get(j.id) ?? 0));
    if (!ok) {
      this.refused.set(id, this.s.now);
      if (BENCH.has(command.type) && /only bench|Sam has this object/.test(message))
        this.benchTakenAt = this.s.now;
    }
    if (!ok)
      this.pending.push({
        kind: 'cannot',
        summary: `can't: ${message}`,
        valence: -0.3,
        salience: 0.65,
        answers: true,
      });
    else if (!evidence)
      this.pending.push({
        kind: `status:${command.type}`,
        summary: message,
        valence: 0.02,
        salience: 0.3,
        answers: true,
      });
  }

  advance(seconds: number): void {
    // Turn-based: real seconds are the player's thinking time. The workshop does not move.
    this.realSeconds += seconds;
  }
}

/** Commands that need the bench (the game's `canWork`). */
const BENCH = new Set(['inspect', 'measure', 'work', 'calibrate', 'verify', 'salvage']);
/** Minutes a command's button says it takes (engine COSTS, shown on the buttons). */
function minutesOf(c: Command): number {
  const t: Record<string, number> = {
    inspect: 10,
    measure: 10,
    calibrate: 20,
    verify: 15,
    deliver: 10,
    salvage: 25,
    buy: 20,
    upgrade: 30,
    'prepare-event': 90,
  };
  if (c.type === 'work') return c.intervention === 'replace' ? 30 : 20;
  if (c.type === 'wait') return Number(c.minutes);
  return t[c.type] ?? 0;
}

function maxId(xs: { id: number }[]): number {
  let m = 0;
  for (const x of xs) if (x.id > m) m = x.id;
  return m;
}
