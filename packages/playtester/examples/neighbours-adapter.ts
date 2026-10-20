/**
 * A `GameAdapter` for Neighbours (the Alder Quay town simulation, Concordia repository): an HF persona plays the
 * visitor, the one person in town who is not run by HF. Example only, read-only against Neighbours: it imports the
 * game's own host runtime from a checkout and never edits it. Pass the checkout as `NEIGHBOURS_DIR` (required; no
 * default). Written against the Neighbours working tree of 2026-10-19 (HF 2.8.0 pinned in the game), which its
 * owner was editing at the time; a later tree may change the fields read here.
 *
 * Entry point. `createRuntime(seed, population)` from `src/core/index.ts` is the TypeScript host that the
 * repository's own Node controls (`scripts/profile-town.ts`, `scripts/probe-repair-return.ts`) drive. The adapter
 * calls `runtime.step()` (one 15-minute round), `runtime.view()` (the TownView the screen renders),
 * `runtime.predictSpeech(id)` (the speech panel's offers and worded read) and `runtime.intervene(...)` (the
 * player's own inputs and the Help panel's). Only `src/core/index.ts` is imported; no UI module is.
 *
 * LIMIT: this is the host without the browser's Python Concordia orchestration. In the browser the same host runs
 * under Pyodide, and each Play/Step/Next round goes through `town_engine.advance`; here each round is a plain
 * `runtime.step()`. The adapter did not check that the two give identical towns (the repository has its own parity
 * script, `scripts/check-parity.mjs`, which was not run). Anything Python-side (a game master, recorded proposals)
 * is absent. Other limits: the slower Pyodide worker is not modelled (a round costs nothing in play time beyond the
 * playback speed); `Next` runs its rounds in zero play time; the bench-window proposal, inspection-request and
 * comparison ("what if") panels are not offered (they need authored proposals or a separate study view, not one
 * input); saves, menus and map zoom are not modelled.
 *
 * Two HF copies run in one process: the town's residents use the HF the game pins (its own node_modules), the
 * persona uses this repository's HF. They never share a Person.
 *
 * WHAT IT SHOWS, because the screen shows it: the clock and weather; the visitor's place or walk or hour of work; the
 * current goal and its hint; the journal lines ("Your own lines"); known neighbours who are here and awake with
 * their activity label, their worded `read` (the person panel's line) and the speech panel's offers and "You can
 * tell" lines; the answer each request got and the later "decision" line; promises and their deadlines; the hall's
 * repair tally and whether it is open; the evening board's stage and result; new stories; support credits and what
 * the Help panel offers. WHAT IT HIDES, as the screen hides it: every resident's needs, mood, trust, relationships,
 * decision records and options; `predictAnswers` and any likelihood or predicted verdict (the UI hides predicted
 * replies on purpose); the 200 background residents (grey dots, not speakable); the raw HF state of anyone. A
 * reply is shown only after the visitor has asked.
 *
 * TIME. The browser runs the town in real time at 1/2x, 1x, 3x or 10x (2400, 1200, 400 or 120 ms a round) after
 * Play, and every player input (walk, speak, work) pauses it, so the visitor presses Play again. The adapter keeps
 * both: `play`, `pause`, `step`, `next` (to the next new story or a notice) and speed changes
 * are inputs; `advance(seconds)` runs rounds only while playing. Option `pauseOnInput: false` leaves Play running
 * after an input (a divergence). The browser's `Next` runs up to 672 rounds as fast as the worker computes; one beat
 * of play is about 3 real seconds and this host computes about 9 rounds a second (measured here, 114 ms a round;
 * the Pyodide worker was not measured), so one press runs at most `nextRounds` (default 24) and stops, and a
 * longer skip is several presses, each costing one beat of the session's clock. Neighbours has no ending, so the
 * adapter ends the session itself after `days`
 * in-game days (default 3): `over` then means the run horizon, not a finished game, and `outcome` is not set.
 *
 * Cohort fields: `chapter` is `Day n`; `loops` is what the screen leaves open (the current goal, promises, a
 * request whose later decision has not come, the hall tally); `features.pressure` rises when a promise is due
 * within three hours; `features.openLoop` follows `loops`. Replies answer only inputs aimed at that person (ids
 * `ask:<person>:...`, `urge:...`, `promise:...`, `counter:...`). Edge actions: urging or promising before any no.
 *
 * `promise` on each action is a reasonable first-time player's read of the screen: walk to where neighbours are,
 * ask what the panel's lean line points at, offer an hour after a no, keep a promise before it is due, press Play
 * when the town is paused. Every number is an engineering premise for playtesting, not a model of real players.
 */
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { GameAdapter, Observation, PlayAction, PlayEvent } from '../src/index.ts';

type Verdict = 'assented' | 'complied' | 'deferred' | 'modified' | 'refused' | 'commanded';
type Work = 'carry-meals' | 'help-repair' | 'cover-shift' | 'dry-timber';
interface Intervention {
  kind: string;
  eventId?: string;
  actorId?: string;
  placeId?: string;
  affordanceId?: string;
  mode?: 'ask' | 'urge' | 'promise';
  acceptCounter?: boolean;
  pledge?: { work: Work; by?: number };
  pledgeId?: string;
  work?: Work;
}
interface PersonView {
  id: string;
  name: string;
  known: boolean;
  placeId: string;
  journey?: unknown;
  lifeState?: string;
  activity: string;
  read?: string;
}
interface Request {
  id: number;
  at: number;
  placeId?: string;
  targetId: string;
  targetName: string;
  affordanceId: string;
  label: string;
  mode: 'ask' | 'urge' | 'promise';
  verdict: Verdict;
  says: string;
  counterOffer?: { affordanceId?: string; label: string };
  status: string;
  decision?: { at: number; verdict: Verdict; says: string; chosenAffordanceId: string; chosenLabel: string };
  result?: string;
}
interface PlayerView {
  placeId?: string;
  job?: { kind: 'travel' | 'work'; toId: string; arriveAt: number; endsAt: number };
  workHoursLeft: number;
  canAirTimber?: boolean;
  pledgeDeadlines?: number[];
  canMove: boolean;
  present: { id: string; name: string; known: boolean; activity: string }[];
  presentCount: number;
  destinations: { id: string; name: string; minutes: number }[];
  requests: Request[];
  pledges: {
    id: string;
    toId: string;
    toName: string;
    work: Work;
    label: string;
    dueBy: number;
    status: string;
    canStart?: boolean;
    blocked?: string;
  }[];
  journal: { id: string; at: number; text: string; sourceEventIds: number[] }[];
  goals: { id: string; title: string; hint: string; status: 'done' | 'current' }[];
  notices: number;
  latestNotice?: { at: number; text: string };
}
interface Evening {
  id: string;
  title: string;
  stage: string;
  result?: string;
  recurring?: boolean;
  canOpenSlot?: boolean;
  canAdvertise?: boolean;
  supportRemaining?: number;
  startsAt: number;
  endsAt: number;
}
interface TownView {
  now: number;
  day: number;
  weather: string;
  player?: PlayerView;
  people: PersonView[];
  places: { id: string; name: string; open: boolean }[];
  events: { id: number; kind: string }[];
  stories: { id: string; title: string; summary: string; kind: string }[];
  stats: Record<string, number>;
  controlsRemaining: number;
  canShareNews?: boolean;
  canLendTools?: boolean;
  canRestoreBus?: boolean;
  evenings?: Evening[];
}
interface Speech {
  offers: { affordanceId: string; label: string }[];
  read: string[];
}
interface Runtime {
  step(): void;
  view(): TownView;
  intervene(input: Intervention): void;
  predictSpeech(id: string): Speech;
}

const NEIGHBOURS_DIR = process.env.NEIGHBOURS_DIR;
if (!NEIGHBOURS_DIR)
  throw new Error('Set NEIGHBOURS_DIR to a Neighbours checkout, e.g. ~/code/concordia/neighbours');
const core = (await import(pathToFileURL(join(NEIGHBOURS_DIR, 'src/core/index.ts')).href)) as {
  createRuntime(seed?: number, population?: number): Runtime;
};

/** The speed menu, in ms per 15-minute round: 1/2x, 1x, 3x, 10x. */
const SPEEDS = [2400, 1200, 400, 120] as const;
const WORK_LABEL: Record<Work, string> = {
  'carry-meals': 'carry food up from the quay',
  'help-repair': 'help repair the hall',
  'cover-shift': 'cover one hour of their shift',
  'dry-timber': 'prop and air the hall timber',
};
const VERDICT_VALENCE: Record<Verdict, number> = {
  assented: 0.45,
  complied: 0.2,
  commanded: 0.2,
  modified: 0.1,
  deferred: 0.05,
  refused: -0.4,
};
const hhmm = (m: number) =>
  `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(Math.floor(m % 60)).padStart(2, '0')}`;
const clock = (m: number) => `Day ${Math.floor(m / 1440) + 1} ${hhmm(m)}`;
const words = (s: string) => new Set(s.toLowerCase().match(/[a-z]{4,}/g) ?? []);
const overlap = (a: string, b: string) => {
  const x = words(a);
  const y = words(b);
  if (x.size === 0 || y.size === 0) return 0;
  let n = 0;
  for (const w of x) if (y.has(w)) n++;
  return n / Math.min(x.size, y.size);
};
const clamp = (x: number) => Math.max(0, Math.min(1, x));
/** The deadline the speech panel preselects: 18:00 if offered, else the last one. */
const defaultBy = (p: PlayerView | undefined) => {
  const d = p?.pledgeDeadlines ?? [];
  return d.find((t) => t % 1440 === 1080) ?? d.at(-1);
};

export interface NeighboursOptions {
  seed?: number;
  population?: number;
  /** In-game days the run lasts (the game has no ending of its own). */
  days?: number;
  /** Start speed index into 1/2x, 1x, 3x, 10x. */
  speedIndex?: number;
  /** The UI pauses the town on every player input; false leaves Play running (a divergence). */
  pauseOnInput?: boolean;
  /** Most rounds one press of Next runs (see TIME). */
  nextRounds?: number;
}

export interface InputRecord {
  id: string;
  ok: boolean;
  /** The game's own message when it refused. */
  message?: string;
  at: string;
}

export class NeighboursAdapter implements GameAdapter {
  name = 'neighbours';
  readonly rt: Runtime;
  /** Every input tried, in order, with the game's own message when it refused. */
  readonly inputs: InputRecord[] = [];
  private v: TownView;
  private version = 0;
  private playing = false;
  private speedIx: number;
  private carry = 0;
  private readonly endAt: number;
  private readonly pauseOnInput: boolean;
  private readonly nextRounds: number;
  private refusals: PlayEvent[] = [];
  /** What the transport bar and the Help panel show in answer to their own buttons. */
  private echoes: PlayEvent[] = [];
  private speechCache = new Map<string, Speech | null>();
  private lastAsk = new Map<string, number>();
  // What was already shown.
  private journalSeen = new Set<string>();
  private requestSeen = new Map<number, { decision: boolean; result: boolean }>();
  private storiesSeen = new Set<string>();
  private goalsDone = new Set<string>();
  private repairs = 0;
  private hallOpen = false;
  private here = new Set<string>();
  private day = 0;
  private visited = new Set<string>(['homes']);
  /** Presses of the speed menu so far: a player settles on a speed rather than fiddling with it. */
  private speedPresses = 0;
  private eveningSeen = new Map<string, { stage: string; result: boolean }>();

  constructor(opts: NeighboursOptions = {}) {
    const {
      seed = 42,
      population = 208,
      days = 3,
      speedIndex = 1,
      pauseOnInput = true,
      nextRounds = 24,
    } = opts;
    this.nextRounds = nextRounds;
    this.rt = core.createRuntime(seed, population);
    this.v = this.rt.view();
    this.endAt = this.v.now + days * 1440;
    this.speedIx = Math.max(0, Math.min(SPEEDS.length - 1, speedIndex));
    this.pauseOnInput = pauseOnInput;
    // The opening journal line is the scene, not news.
    for (const j of this.v.player?.journal ?? []) this.journalSeen.add(j.id);
    for (const s of this.v.stories) this.storiesSeen.add(s.id);
    this.day = this.v.day;
    this.repairs = this.v.stats.hallRepairs ?? 0;
    this.hallOpen = this.v.places.find((p) => p.id === 'hall')?.open ?? false;
  }

  /** The run horizon was reached (not a game ending). */
  get horizonReached(): boolean {
    return this.v.now >= this.endAt;
  }
  /** A compact view of where the town stands, for the session's summary line. */
  get state() {
    const v = this.v;
    return {
      now: clock(v.now),
      hallRepairs: Math.min(12, v.stats.hallRepairs ?? 0),
      hallOpen: v.places.find((p) => p.id === 'hall')?.open ?? false,
      goalsDone: v.player?.goals.filter((g) => g.status === 'done').map((g) => g.title) ?? [],
      requests: v.player?.requests.length ?? 0,
      pledges: v.player?.pledges.map((p) => p.status) ?? [],
    };
  }

  private refresh(): void {
    this.v = this.rt.view();
    this.version += 1;
    this.speechCache.clear();
  }

  observe(): Observation {
    const v = this.v;
    const p = v.player;
    const events: PlayEvent[] = [...this.refusals, ...this.echoes];
    this.refusals = [];
    this.echoes = [];

    if (p) {
      // Replies, later decisions and results: the speech panel's "latest answer".
      for (const q of p.requests) {
        const answers = [
          `ask:${q.targetId}:`,
          `urge:${q.targetId}:`,
          `promise:${q.targetId}:`,
          `counter:${q.targetId}`,
        ];
        if (!this.requestSeen.has(q.id)) {
          const line = p.journal.find((j) => j.sourceEventIds.includes(q.id))?.text;
          const worn = line?.includes('wore on') ? -0.15 : 0;
          events.push({
            kind: `reply:${q.verdict}`,
            summary: line ?? `${q.targetName}: ${q.says}`,
            valence: VERDICT_VALENCE[q.verdict] + worn,
            salience: 0.75,
            by: q.targetId,
            answers,
          });
          this.requestSeen.set(q.id, { decision: false, result: false });
        }
        const st = this.requestSeen.get(q.id);
        if (st && q.decision && !st.decision) {
          st.decision = true;
          const did = q.decision.chosenAffordanceId === q.affordanceId;
          const good = q.decision.verdict === 'assented' || q.decision.verdict === 'complied';
          events.push({
            kind: `decided:${q.decision.verdict}${did ? ':did-it' : ''}`,
            summary: `${q.targetName} later chose to ${q.decision.chosenLabel.toLowerCase()}.`,
            valence: good && did ? 0.6 : good ? 0.15 : q.decision.verdict === 'refused' ? -0.4 : -0.05,
            salience: 0.8,
            by: q.targetId,
            answers,
          });
        }
        if (st && q.result && !st.result) {
          st.result = true;
          events.push({ kind: 'result', summary: q.result, valence: 0.2, salience: 0.6, answers });
        }
      }
      // The journal lines that are not replies: arrivals, work, promises. `view.events` is a short window, so the
      // line's own words decide what it is.
      for (const j of p.journal) {
        if (this.journalSeen.has(j.id)) continue;
        this.journalSeen.add(j.id);
        const t = j.text;
        const mk = (k: string, valence: number, salience: number, answers?: string[]) =>
          events.push({ kind: k, summary: t, valence, salience, ...(answers ? { answers } : {}) });
        if (/^You reached /.test(t)) {
          mk('arrived', 0.1, 0.45);
          if (p.placeId) this.visited.add(p.placeId);
        } else if (/^You set off from .* on foot\.$/.test(t)) mk('moved', 0, 0.2, ['move:']);
        else if (/^You set off to /.test(t)) mk('work-started', 0, 0.3, ['work:', 'pledge:']);
        else if (/passed with no hour recorded/.test(t)) mk('pledge-lapsed', -0.6, 0.85);
        else if (/no longer stands/.test(t)) mk('pledge-released', -0.15, 0.5);
        else if (/promise to .* stood|your promise now stands|waits on what they do/.test(t))
          mk('pledge', 0.1, 0.5);
        else if (/^You (asked|urged|promised|took up|were back)|answered: |chose to /.test(t))
          continue; // replies: above
        else if (/^You /.test(t)) mk('work-done', /kept your promise/.test(t) ? 0.7 : 0.5, 0.8);
        else mk('neighbour-did', 0.1, 0.25);
      }
      for (const g of p.goals)
        if (g.status === 'done' && !this.goalsDone.has(g.id)) {
          this.goalsDone.add(g.id);
          events.push({ kind: 'goal-done', summary: `Done: ${g.title}`, valence: 0.6, salience: 0.9 });
        }
      // Company: known neighbours who are now here and awake.
      const present = p.present.filter((x) => x.known);
      const fresh = present.filter((x) => !this.here.has(x.id));
      this.here = new Set(present.map((x) => x.id));
      if (fresh.length > 0)
        events.push({
          kind: 'company',
          summary: fresh
            .map((x) => `${x.name} is here: ${v.people.find((y) => y.id === x.id)?.read ?? x.activity}`)
            .join(' '),
          valence: 0.05,
          salience: 0.4,
        });
    }
    // The shared world: stories, the repair tally, the hall, evenings, the day.
    for (const s of v.stories)
      if (!this.storiesSeen.has(s.id)) {
        this.storiesSeen.add(s.id);
        events.push({
          kind: `story:${s.kind}`,
          summary: `${s.title}. ${s.summary}`,
          valence: 0.05,
          salience: 0.5,
        });
      }
    const repairs = Math.min(12, v.stats.hallRepairs ?? 0);
    if (repairs > this.repairs)
      events.push({
        kind: 'repair',
        summary: `The hall tally now reads ${repairs} of 12.`,
        valence: 0.35,
        salience: 0.6,
      });
    this.repairs = Math.max(this.repairs, repairs);
    const hallOpen = v.places.find((x) => x.id === 'hall')?.open ?? false;
    if (hallOpen && !this.hallOpen)
      events.push({ kind: 'hall-open', summary: 'The hall has opened.', valence: 0.9, salience: 1 });
    this.hallOpen = hallOpen;
    for (const e of v.evenings ?? []) {
      const was = this.eveningSeen.get(e.id);
      const now = { stage: e.stage, result: Boolean(e.result) };
      if (was && was.stage !== now.stage && !now.result)
        events.push({
          kind: `evening:${e.stage}`,
          summary: `${e.title}: ${e.stage}.`,
          valence: 0.05,
          salience: 0.5,
        });
      if (was && !was.result && now.result)
        events.push({
          kind: 'evening-result',
          summary: `${e.title}: ${e.result}`,
          valence: 0.3,
          salience: 0.8,
        });
      this.eveningSeen.set(e.id, now);
    }
    if (v.day !== this.day) {
      this.day = v.day;
      events.push({
        kind: 'day',
        summary: `Day ${v.day} begins (${v.weather.toLowerCase()}).`,
        valence: 0,
        salience: 0.25,
      });
    }

    const dueSoon = (p?.pledges ?? []).filter(
      (x) => x.status === 'open' && x.dueBy > v.now && x.dueBy - v.now <= 180,
    ).length;
    const held = (p?.requests ?? []).filter((q) => q.status === 'held' && !q.decision).length;
    const openPledges = (p?.pledges ?? []).filter(
      (x) => x.status === 'open' || x.status === 'offered',
    ).length;
    const hour = Math.floor((v.now % 1440) / 60);
    return {
      clock: clock(v.now),
      phase:
        hour < 6
          ? 'night'
          : hour < 12
            ? 'morning'
            : hour < 18
              ? 'afternoon'
              : hour < 22
                ? 'evening'
                : 'night',
      events,
      features: {
        pressure: clamp(
          0.5 * Math.min(1, dueSoon) + 0.1 * Math.min(2, held) + (p?.job?.kind === 'work' ? 0.1 : 0),
        ),
        openLoop: clamp(
          (p?.goals.some((g) => g.status === 'current') ? 0.25 : 0) +
            0.2 * Math.min(2, openPledges) +
            0.1 * Math.min(2, held) +
            (repairs < 12 && !hallOpen ? 0.1 : 0),
        ),
      },
      over: this.horizonReached,
      chapter: `Day ${v.day}`,
      loops: this.loops(),
    };
  }

  private loops(): string[] {
    const p = this.v.player;
    if (!p) return [];
    const out: string[] = [];
    const goal = p.goals.find((g) => g.status === 'current');
    if (goal) out.push(`Your next step: ${goal.title}`);
    for (const x of p.pledges)
      if (x.status === 'open' || x.status === 'offered')
        out.push(
          `Promised ${x.toName}: ${x.label}, by ${clock(x.dueBy)}${x.status === 'offered' ? ' (if they take it up)' : ''}`,
        );
    for (const q of p.requests)
      if (q.status === 'held' && !q.decision)
        out.push(`Waiting to see what ${q.targetName} does about: ${q.label}`);
    const repairs = Math.min(12, this.v.stats.hallRepairs ?? 0);
    if (repairs < 12 && !this.hallOpen) out.push(`The hall tally reads ${repairs} of 12`);
    return out;
  }

  /** What the screen shows now, as plain text (for traces; it consumes nothing). */
  screen(): string[] {
    const v = this.v;
    const p = v.player;
    const out = [
      `${clock(v.now)} (${v.weather}), town ${this.playing ? `playing at ${SPEEDS[this.speedIx]} ms a round` : 'paused'}`,
    ];
    if (!p) return out;
    const place = (id?: string) => v.places.find((x) => x.id === id)?.name ?? id ?? '';
    out.push(
      p.job?.kind === 'travel'
        ? `Walking to ${place(p.job.toId)}, arriving about ${hhmm(p.job.arriveAt)}.`
        : p.job?.kind === 'work'
          ? `Working at ${place(p.job.toId)} until ${hhmm(p.job.endsAt)}.`
          : `You are at ${place(p.placeId)}. ${p.presentCount} awake here.`,
    );
    const goal = p.goals.find((g) => g.status === 'current');
    if (goal) out.push(`Next step: ${goal.title}. ${goal.hint}`);
    for (const x of p.present.filter((y) => y.known)) {
      const sp = this.speech(x.id);
      out.push(
        `Here: ${x.name} (${x.activity}). ${v.people.find((y) => y.id === x.id)?.read ?? ''}${sp ? ` You can tell: ${sp.read.join('. ')}.` : ''}`,
      );
    }
    for (const j of p.journal.slice(-3)) out.push(`Journal: ${j.text}`);
    for (const x of p.pledges.filter((y) => y.status === 'open' || y.status === 'offered'))
      out.push(`Promise to ${x.toName}: ${x.label}, by ${clock(x.dueBy)} (${x.status}).`);
    out.push(
      `Hall tally ${Math.min(12, v.stats.hallRepairs ?? 0)} of 12; town credits ${v.controlsRemaining}; work hours left today ${p.workHoursLeft}.`,
    );
    return out;
  }

  private speech(id: string): Speech | null {
    const hit = this.speechCache.get(id);
    if (hit !== undefined) return hit;
    let r: Speech | null;
    try {
      r = this.rt.predictSpeech(id);
    } catch {
      r = null; // not here and awake to hear you: the panel shows no offers
    }
    this.speechCache.set(id, r);
    return r;
  }

  actions(): PlayAction[] {
    const v = this.v;
    const p = v.player;
    if (!p || this.horizonReached) return [];
    const out: PlayAction[] = [];
    const goal = p.goals.find((g) => g.status === 'current')?.id;
    const minute = v.now % 1440;
    const dueSoon = p.pledges.some((x) => x.status === 'open' && x.dueBy - v.now <= 180);

    // Time controls: always on screen.
    out.push(
      this.playing
        ? { id: 'pause', label: 'Pause the town', kind: 'time', promise: 0.04 }
        : { id: 'play', label: 'Play the town', kind: 'time', promise: dueSoon ? 0.62 : 0.5 },
      { id: 'step', label: 'Step one round', kind: 'time', promise: 0.12 },
      { id: 'next', label: 'Next: to the next story', kind: 'time', promise: 0.35 },
    );
    if (this.speedIx < SPEEDS.length - 1)
      out.push({
        id: 'speed:faster',
        label: 'Playback speed faster',
        kind: 'speed',
        promise: 0.15 / (1 + 2 * this.speedPresses),
      });
    if (this.speedIx > 0)
      out.push({
        id: 'speed:slower',
        label: 'Playback speed slower',
        kind: 'speed',
        promise: 0.04 / (1 + 2 * this.speedPresses),
      });

    // Help panel: each costs a town credit.
    if (v.controlsRemaining > 0) {
      const repairs = v.stats.hallRepairs ?? 0;
      if (v.canRestoreBus !== false)
        out.push({
          id: 'help:restore-bus',
          label: 'Restore public bus (1 town credit)',
          kind: 'help',
          promise: 0.22,
        });
      if (v.canLendTools !== false && repairs < 12)
        out.push({ id: 'help:lend-tools', label: 'Lend tools (1 town credit)', kind: 'help', promise: 0.3 });
      if (v.canShareNews !== false && repairs < 12)
        out.push({
          id: 'help:share-news',
          label: 'Share hall news (1 town credit)',
          kind: 'help',
          promise: 0.28,
        });
    }
    for (const e of (v.evenings ?? [])
      .filter(
        (x) => (x.recurring || x.canOpenSlot || x.canAdvertise) && x.endsAt > v.now && x.stage !== 'closed',
      )
      .sort((a, b) => a.startsAt - b.startsAt)
      .slice(0, 2)) {
      if (v.controlsRemaining + (e.supportRemaining ?? 0) <= 0) continue;
      const w = goal === 'evening' ? 0.2 : 0;
      if (e.canOpenSlot)
        out.push({
          id: `evening:open:${e.id}`,
          label: `Fund an extra hall slot: ${e.title}`,
          kind: 'help',
          promise: 0.35 + w,
        });
      if (e.canAdvertise)
        out.push({
          id: `evening:advertise:${e.id}`,
          label: `Advertise: ${e.title}`,
          kind: 'help',
          promise: 0.35 + w,
        });
    }

    // Walking, working and speaking need the visitor free: the buttons are disabled mid-walk or mid-work.
    if (p.job) return out;
    const knownHere = p.present.filter((x) => x.known);
    const knownAt = (placeId: string) =>
      v.people.filter(
        (x) => x.known && x.placeId === placeId && !x.journey && (x.lifeState ?? 'awake') === 'awake',
      ).length;
    if (p.canMove)
      for (const d of p.destinations) {
        const n = knownAt(d.id);
        let pr = 0.12 + (n > 0 ? 0.12 : 0) - d.minutes / 500;
        if (goal === 'arrive') pr += n > 0 ? 0.45 : 0.1;
        else if (knownHere.length === 0 && n > 0) pr += 0.3;
        else if (knownHere.length > 0) pr -= 0.07;
        if (d.id === 'hall' && goal === 'evening') pr += 0.1;
        out.push({
          id: `move:${d.id}`,
          label: `Walk to ${d.name} (about ${d.minutes} min)`,
          kind: 'move',
          promise: clamp(pr),
          // A place not yet visited is new to the player.
          ...(this.visited.has(d.id) ? {} : { tags: ['novel'] }),
        });
      }

    // Own work: the section shows only while hours are left; 08:00-18:00 including the walk.
    if (p.canMove && p.workHoursLeft > 0) {
      const base = minute >= 480 && minute <= 1080 - 90 ? 1 : 0.25;
      const repairs = v.stats.hallRepairs ?? 0;
      const kinds: [Work, number][] = [
        ['carry-meals', 0.32],
        ['help-repair', repairs < 12 && (v.stats.tools ?? 0) > 0 ? 0.38 : 0.1],
      ];
      if (p.canAirTimber) kinds.push(['dry-timber', 0.35]);
      for (const [k, pr] of kinds)
        out.push({
          id: `work:${k}`,
          label: `Do an hour: ${WORK_LABEL[k]}`,
          kind: 'work',
          promise: clamp(pr * base),
        });
    }
    for (const x of p.pledges)
      if (x.status === 'open' && x.canStart)
        out.push({
          id: `pledge:${x.id}`,
          label: `Start the hour for ${x.toName}: ${x.label}`,
          kind: 'work',
          promise: goal === 'word' ? 0.95 : 0.85,
        });

    // Speaking to a known neighbour who is here and awake.
    for (const person of knownHere) {
      const sp = this.speech(person.id);
      if (sp) out.push(...this.speechActions(person.id, person.name, sp, goal, false));
    }
    return out;
  }

  edgeActions(): PlayAction[] {
    const p = this.v.player;
    if (!p || this.horizonReached || p.job) return [];
    const out: PlayAction[] = [];
    const goal = p.goals.find((g) => g.status === 'current')?.id;
    for (const person of p.present.filter((x) => x.known)) {
      const sp = this.speech(person.id);
      if (sp) out.push(...this.speechActions(person.id, person.name, sp, goal, true));
    }
    return out;
  }

  private speechActions(
    id: string,
    name: string,
    sp: Speech,
    goal: string | undefined,
    edge: boolean,
  ): PlayAction[] {
    const v = this.v;
    const p = v.player;
    if (!p) return [];
    const read = sp.read;
    const setOn = read.some((r) => r.startsWith('Set on'));
    const cool = read.some((r) => /^(Bristling|Wary|Cooler|Still sore|Cautious)/.test(r));
    const warm = read.some((r) => /^(Trusts|Willing|Remembers)/.test(r));
    const lean = read.find((r) => r.startsWith('Leaning towards '))?.slice('Leaning towards '.length) ?? '';
    const hall = (v.stats.hallRepairs ?? 0) < 12;
    const mine = p.requests.filter((q) => q.targetId === id);
    const recent = (aff: string) =>
      mine.findLast((q) => q.affordanceId === aff && v.now - Math.max(q.at, q.decision?.at ?? q.at) <= 180);
    const score = (label: string) => {
      let s = 0.4 - (setOn ? 0.12 : 0) - (cool ? 0.12 : 0) + (warm ? 0.08 : 0);
      if (lean && overlap(lean, label) >= 0.5) s += 0.2;
      if (hall && /hall|repair|inspect/i.test(label)) s += 0.08;
      if (goal === 'evening' && /host|class|supper|meal|evening/i.test(label)) s += 0.15;
      if (goal === 'answer') s += 0.15;
      return s;
    };
    const ranked = sp.offers.toSorted((a, b) => score(b.label) - score(a.label)).slice(0, 6);
    const hours = p.workHoursLeft > 0 ? 1 : 0.2;
    const by = defaultBy(p);
    const works: [Work, number][] = [
      ['help-repair', 0],
      ['carry-meals', -0.02],
      ...(p.canAirTimber ? ([['dry-timber', -0.04]] as [Work, number][]) : []),
      ['cover-shift', -0.08],
    ];
    // A repeat of the same words while the first reply is still on the panel tells the visitor nothing new.
    const stale = (key: string) => {
      const at = this.lastAsk.get(key);
      return at !== undefined && v.now - at < 60 ? 0.2 : 1;
    };
    const out: PlayAction[] = [];
    for (const [i, o] of ranked.entries()) {
      const r = recent(o.affordanceId);
      const no = r && (r.verdict === 'refused' || r.verdict === 'deferred' || r.verdict === 'modified');
      const s = score(o.label);
      const what = o.label.toLowerCase();
      if (!edge) {
        const ask = `ask:${id}:${o.affordanceId}`;
        out.push({
          id: ask,
          label: `Ask ${name} to ${what}`,
          kind: 'ask',
          promise: clamp(s * stale(ask)),
        });
        if (no) {
          const urge = `urge:${id}:${o.affordanceId}`;
          out.push({
            id: urge,
            label: `Urge ${name} to ${what}`,
            kind: 'urge',
            promise: clamp(0.6 * s * stale(urge)),
            focus: 0.05,
            tags: ['confront'],
          });
        }
        if ((no || goal === 'objection') && by !== undefined)
          for (const [w, d] of works) {
            const key = `promise:${id}:${w}:${o.affordanceId}`;
            out.push({
              id: key,
              label: `Promise ${name} an hour (${WORK_LABEL[w]}) and ask them to ${what}`,
              kind: 'promise',
              promise: clamp((s + 0.05 + (goal === 'objection' ? 0.2 : 0) + d) * hours * stale(key)),
            });
          }
      } else if (i < 3 && !no) {
        // Urging before any no is pushing for its own sake; promising an hour before any no is over-offering.
        out.push({
          id: `urge:${id}:${o.affordanceId}`,
          label: `Urge ${name} to ${what}`,
          kind: 'urge',
          promise: clamp(0.35 * s),
          focus: 0.05,
          tags: ['confront'],
          mischief: true,
        });
        if (goal !== 'objection' && by !== undefined)
          out.push({
            id: `promise:${id}:help-repair:${o.affordanceId}`,
            label: `Promise ${name} an hour (${WORK_LABEL['help-repair']}) and ask them to ${what}`,
            kind: 'promise',
            promise: clamp(0.3 * hours),
          });
      }
    }
    const last = mine.at(-1);
    if (
      !edge &&
      last?.counterOffer?.affordanceId &&
      last.mode === 'ask' &&
      (last.verdict === 'deferred' || last.verdict === 'modified') &&
      v.now - Math.max(last.at, last.decision?.at ?? last.at) <= 180 &&
      (last.placeId === undefined || last.placeId === p.placeId) &&
      last.status !== 'replaced'
    )
      out.push({
        id: `counter:${id}`,
        label: `Accept ${name}'s counter-offer: ${last.counterOffer.label}`,
        kind: 'counter',
        promise: goal === 'objection' ? 0.85 : 0.65,
      });
    return out;
  }

  apply(id: string): void {
    const v = this.v;
    const at = clock(v.now);
    const [head = '', a = '', b = '', ...rest] = id.split(':');
    const tail = (...parts: string[]) => parts.join(':');
    // Controls that are not game inputs: the town's own transport bar.
    if (head === 'play' || head === 'pause' || head === 'speed') {
      if (head === 'speed') {
        this.speedPresses += 1;
        this.speedIx = Math.max(0, Math.min(SPEEDS.length - 1, this.speedIx + (a === 'faster' ? 1 : -1)));
      } else this.playing = head === 'play';
      this.inputs.push({ id, ok: true, at });
      this.echo(
        id,
        head === 'speed'
          ? `Playback speed set to ${['1/2x', '1x', '3x', '10x'][this.speedIx]}.`
          : head === 'play'
            ? 'The town is running.'
            : 'The town is paused.',
      );
      return;
    }
    if (head === 'step' || head === 'next') {
      this.playing = false;
      if (this.guard(id, at, () => (head === 'step' ? this.rt.step() : this.advanceUntilNew()))) {
        this.refresh();
        this.echo(
          id,
          head === 'step'
            ? `One round passed: ${clock(this.v.now)}.`
            : `Skipped ahead to ${clock(this.v.now)}.`,
        );
      }
      this.refresh();
      return;
    }
    let iv: Intervention | undefined;
    let player = true;
    if (head === 'move') iv = { kind: 'player-move', placeId: a };
    else if (head === 'work') iv = { kind: 'player-work', work: a as Work };
    else if (head === 'pledge') iv = { kind: 'player-work', pledgeId: id.slice('pledge:'.length) };
    else if (head === 'ask' || head === 'urge') {
      iv = { kind: 'player-speak', actorId: a, affordanceId: tail(b, ...rest), mode: head };
      this.lastAsk.set(id, v.now);
    } else if (head === 'promise') {
      const by = defaultBy(v.player);
      iv = {
        kind: 'player-speak',
        actorId: a,
        affordanceId: tail(...rest),
        mode: 'promise',
        pledge: { work: b as Work, ...(by !== undefined ? { by } : {}) },
      };
      this.lastAsk.set(id, v.now);
    } else if (head === 'counter') {
      const last = v.player?.requests.findLast((q) => q.targetId === a);
      iv = {
        kind: 'player-speak',
        actorId: a,
        affordanceId: last?.counterOffer?.affordanceId ?? '',
        mode: 'ask',
        acceptCounter: true,
      };
    } else if (head === 'help') {
      iv = { kind: a };
      player = false;
    } else if (head === 'evening') {
      iv = { kind: a === 'open' ? 'open-evening-slot' : 'advertise-evening', eventId: tail(b, ...rest) };
      player = false;
    }
    if (!iv) {
      this.reject(id, at, 'Unknown input');
      return;
    }
    const credits = v.controlsRemaining;
    const ok = this.guard(id, at, () => this.rt.intervene(iv));
    this.refresh();
    if (ok && !player && this.v.controlsRemaining < credits)
      this.echo(
        id,
        a === 'restore-bus'
          ? 'Bus restored. Future trips can use it; current activities keep their durations.'
          : a === 'lend-tools'
            ? `Tools added. ${this.v.stats.tools ?? 'Updated'} tools now available.`
            : a === 'share-news'
              ? 'Hall news broadcast to awake neighbours. Each decides whether to act on it.'
              : head === 'evening' && a === 'open'
                ? 'Extra hall slot funded.'
                : 'Invitation advertised to awake neighbours.',
        0.4,
      );
    // The UI pauses the town after every player input, and after any rejected one.
    if (!ok || (player && this.pauseOnInput)) this.playing = false;
  }

  private guard(id: string, at: string, f: () => void): boolean {
    try {
      f();
      this.inputs.push({ id, ok: true, at });
      return true;
    } catch (e) {
      this.reject(id, at, e instanceof Error ? e.message : String(e));
      return false;
    }
  }

  private echo(id: string, summary: string, salience = 0.15): void {
    this.echoes.push({ kind: 'echo', summary, valence: 0, salience, answers: [id] });
  }

  /** The game refused: its own message is what the screen shows beside the panel. */
  private reject(id: string, at: string, message: string): void {
    this.inputs.push({ id, ok: false, message, at });
    this.refusals.push({
      kind: 'refused-input',
      summary: message,
      valence: -0.35,
      salience: 0.75,
      answers: [id],
    });
    this.playing = false;
  }

  /** `Next`: rounds until a new story appears or a notice arrives, at most `nextRounds` (and not past the horizon). */
  private advanceUntilNew(): void {
    const stories = new Set(this.v.stories.map((s) => s.id));
    const notices = this.v.player?.notices ?? 0;
    for (let i = 0; i < this.nextRounds && this.v.now < this.endAt; i++) {
      this.rt.step();
      this.v = this.rt.view();
      if (this.v.stories.some((s) => !stories.has(s.id))) return;
      if ((this.v.player?.notices ?? 0) > notices) return;
    }
  }

  advance(seconds: number): void {
    if (!this.playing || this.horizonReached) return;
    this.carry += (seconds * 1000) / (SPEEDS[this.speedIx] ?? 1200);
    // A round is 15 game minutes; stop on the horizon.
    const roundsLeft = Math.ceil((this.endAt - this.v.now) / 15);
    const n = Math.min(Math.floor(this.carry), roundsLeft);
    for (let i = 0; i < n; i++) this.rt.step();
    this.carry -= n;
    if (n >= roundsLeft) this.carry = 0;
    if (n > 0) this.refresh();
  }
}
