/**
 * Playtest log for Game 2. `RecordedGame` wraps a `VoiceGame`: the worker sends every state-changing message
 * through it, and `replayVoice` re-applies a log through the same `apply`, so recording and replay cannot drift.
 *
 * Log format (one array, in order):
 * - `[minutes, count]`: `count` consecutive moving ticks that each asked for `minutes` whole sim minutes
 *   (`VoiceGame.tickMinutes`). Real time is not recorded, only the minutes it became; a replay calls `step`.
 * - `{ at, type, ... }`: one player input (a `MainToWorker` message minus `tick`, `predict`, `why`, `init`) with
 *   `at`, the game clock when it was applied. A replay checks `at` and reports the first entry where it differs.
 *
 * Covers: the inputs that change state (begin, pause, resume, setPace, setAutoPause, suggest, withdraw, endDay,
 * advance, dismissIntro, keepListening) and the comparable state that is hashed. `predict`, `why` and `frame` are
 * not logged: the replay test checks that calling them leaves the hash unchanged. Does not cover: the worker's
 * frame throttling (a view concern) or `carry` (the fraction of a minute real time left over).
 */
import { check, hashState, pushRun } from '../../shared/playtest.ts';
import {
  type Appeal,
  type Draft,
  type MainToWorker,
  type Pace,
  type StandingWhisper,
  type Strength,
  WHISPER_DEFAULT,
} from '../protocol.ts';
import { MAX_FF_MINUTES_PER_TICK, type Run, VoiceGame } from './game.ts';

/** A logged input: a worker message that changes state. */
export type VoiceInput = Exclude<MainToWorker, { type: 'init' | 'tick' | 'predict' | 'why' }>;
export type VoiceStep = [minutes: number, count: number];
export type VoiceLogEntry = VoiceStep | (VoiceInput & { at: number });

export class RecordedGame {
  readonly log: VoiceLogEntry[] = [];
  readonly game: VoiceGame;

  constructor(game: VoiceGame) {
    this.game = game;
  }

  /** A real-time tick: logs the whole minutes it moved. Returns whether time moved. */
  tick(dtMs: number): boolean {
    const whole = this.game.tickMinutes(dtMs);
    if (whole > 0) pushRun(this.log, whole);
    return whole > 0;
  }

  /** A logged step (replay): the same minutes, with no real time. */
  step(minutes: number): void {
    this.game.step(minutes);
    pushRun(this.log, minutes);
  }

  apply(msg: VoiceInput): void {
    this.log.push({ at: this.game.t, ...structuredClone(msg) } as VoiceInput & { at: number });
    applyInput(this.game, msg);
  }
}

function applyInput(g: VoiceGame, msg: VoiceInput): void {
  switch (msg.type) {
    case 'pause':
      g.pause();
      break;
    case 'resume':
      g.resume();
      break;
    case 'setPace':
      g.setPace(msg.pace);
      break;
    case 'setAutoPause':
      g.setAutoPause(msg.on);
      break;
    case 'begin':
      g.begin();
      break;
    case 'suggest':
      g.suggest(msg.draft);
      break;
    case 'withdraw':
      g.withdraw();
      break;
    case 'endDay':
      g.endDay();
      break;
    case 'advance':
      g.advance(msg.standing);
      break;
    case 'dismissIntro':
      g.dismissIntro();
      break;
    case 'keepListening':
      g.keepListening();
      break;
  }
}

export interface VoiceReplay {
  rec: RecordedGame;
  /** Index of the first input whose `at` did not match the replayed clock (-1: none). */
  driftAt: number;
}

/** Replay a seed and a log from the start. */
export function replayVoice(seed: number, log: readonly VoiceLogEntry[]): VoiceReplay {
  const rec = new RecordedGame(new VoiceGame(seed));
  let driftAt = -1;
  log.forEach((e, i) => {
    if (Array.isArray(e)) {
      for (let n = 0; n < e[1]; n++) rec.step(e[0]);
      return;
    }
    if (driftAt < 0 && e.at !== rec.game.t) driftAt = i;
    const { at: _at, ...msg } = e;
    rec.apply(msg as VoiceInput);
  });
  rec.game.outbox.length = 0;
  return { rec, driftAt };
}

const runState = (r: Run) => ({ c: r.c, town: r.town.state });

/**
 * Everything that makes up a run, for the hash: every game field (private ones too) except `carry` and the
 * worker's outbox, with each `Run` reduced to its community (people and host fields) and town state.
 */
export function voiceState(g: VoiceGame): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(g)) {
    if (k === 'carry' || k === 'outbox') continue;
    if (k === 'run') out[k] = runState(v as Run);
    else if ((k === 'eidNight' || k === 'eidMorning') && v) {
      const { run, ...rest } = v as { run: Run };
      out[k] = { ...rest, run: runState(run) };
    } else out[k] = v;
  }
  return out;
}

export const voiceHash = (g: VoiceGame): string => hashState(voiceState(g));

/**
 * The snapshot a file carries for a reader (not needed to replay): the game's own fields and the town state,
 * with each person's decision trace, episodic memory and chronicle dropped, and without the activity cells and
 * decision records (all large, and all follow from the log).
 */
export function voiceSnapshot(g: VoiceGame): Record<string, unknown> {
  const s = voiceState(g);
  const slim = (r: unknown) => {
    const { c, town } = r as ReturnType<typeof runState>;
    return {
      town,
      people: c.people.map(({ trace: _t, memory: _m, chronicle: _c, chronicleDay: _d, ...p }) => p),
    };
  };
  delete s.records;
  delete s.cells;
  delete s.eidNight;
  delete s.eidMorning;
  s.run = slim(s.run);
  return s;
}

// --- validation of an imported log -----------------------------------------------------------------

/** Most sim minutes a replayed log may ask for (a whole run with the epilogue is about 62,000). */
export const MAX_REPLAY_MINUTES = 200_000;
const MAX_ENTRIES = 200_000;
const PACES: readonly Pace[] = ['slow', 'normal', 'fast'];
const STRENGTHS: readonly Strength[] = ['mention', 'urge'];
const APPEALS: readonly Appeal[] = ['duty', 'safety', 'benevolence', 'belonging', 'meaning'];
const CHOICES = Object.keys(WHISPER_DEFAULT) as StandingWhisper['choiceId'][];

function draftOf(x: unknown, what: string): Draft {
  const o = check.obj(x, what);
  check.keys(o, ['optionId', 'strength', 'insist', 'appeal'], what);
  const d: Draft = {
    optionId: check.str(o.optionId, `${what}.optionId`, 80),
    strength: check.oneOf(o.strength, STRENGTHS, `${what}.strength`),
    insist: check.bool(o.insist, `${what}.insist`),
  };
  if (o.appeal !== undefined) d.appeal = check.oneOf(o.appeal, APPEALS, `${what}.appeal`);
  return d;
}

function whisperOf(x: unknown, what: string): StandingWhisper {
  const o = check.obj(x, what);
  check.keys(o, ['choiceId', 'strength', 'appeal'], what);
  const w: StandingWhisper = {
    choiceId: check.oneOf(o.choiceId, CHOICES, `${what}.choiceId`),
    strength: check.oneOf(o.strength, STRENGTHS, `${what}.strength`),
  };
  if (o.appeal !== undefined) w.appeal = check.oneOf(o.appeal, APPEALS, `${what}.appeal`);
  return w;
}

/** Check every entry of an imported Game 2 log and return it typed; an unknown entry is an error. */
export function validateVoiceLog(log: readonly unknown[]): VoiceLogEntry[] {
  if (log.length > MAX_ENTRIES) throw new Error('the log is too long');
  let minutes = 0;
  return log.map((e, i): VoiceLogEntry => {
    const what = `entry ${i}`;
    if (Array.isArray(e)) {
      if (e.length !== 2) throw new Error(`${what} is not [minutes, count]`);
      const m = check.int(e[0], `${what} minutes`, 1, MAX_FF_MINUTES_PER_TICK);
      const n = check.int(e[1], `${what} count`, 1, MAX_REPLAY_MINUTES);
      minutes += m * n;
      if (minutes > MAX_REPLAY_MINUTES) throw new Error('the log asks for more minutes than a run has');
      return [m, n];
    }
    const o = check.obj(e, what);
    const at = check.int(o.at, `${what}.at`, 0, 10_000_000);
    const type = check.oneOf(
      o.type,
      [
        'begin',
        'pause',
        'resume',
        'setPace',
        'setAutoPause',
        'suggest',
        'withdraw',
        'endDay',
        'advance',
        'dismissIntro',
        'keepListening',
      ] as const,
      `${what}.type`,
    );
    switch (type) {
      case 'setPace':
        check.keys(o, ['at', 'type', 'pace'], what);
        return { at, type, pace: check.oneOf(o.pace, PACES, `${what}.pace`) };
      case 'setAutoPause':
        check.keys(o, ['at', 'type', 'on'], what);
        return { at, type, on: check.bool(o.on, `${what}.on`) };
      case 'suggest':
        check.keys(o, ['at', 'type', 'draft'], what);
        return { at, type, draft: draftOf(o.draft, `${what}.draft`) };
      case 'advance': {
        check.keys(o, ['at', 'type', 'standing'], what);
        if (!Array.isArray(o.standing) || o.standing.length > CHOICES.length)
          throw new Error(`${what}.standing is not a short list`);
        return { at, type, standing: o.standing.map((w, j) => whisperOf(w, `${what}.standing[${j}]`)) };
      }
      default:
        check.keys(o, ['at', 'type'], what);
        return { at, type };
    }
  });
}
