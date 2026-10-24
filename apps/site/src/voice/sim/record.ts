import { restore, snapshot } from '@adam0white/human-framework';
import type { PersonaEnvelope } from '@adam0white/lab-client';
import { applyAdmittedLife } from '../../shared/cast-chapter.ts';
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
 * advance, dismissIntro, keepListening), plus presentation-only sceneWord/quick suggestion wording.
 * Authored scene text is recomputed by this UI version, like the existing authored conversations; the sidecar
 * is not part of the simulated state hash. These inputs neither change rules nor require a new edition.
 * Covers the comparable state that is hashed. `predict`, `why` and `frame` are
 * not logged: the replay test checks that calling them leaves the hash unchanged. Does not cover: the worker's
 * frame throttling (a view concern) or `carry` (the fraction of a minute real time left over).
 */
import {
  check,
  hashState,
  type PlaytestFile,
  parsePlaytest,
  pushRun,
  stableStringify,
} from '../../shared/playtest.ts';
import {
  type Appeal,
  type Draft,
  type MainToWorker,
  type Pace,
  type SceneWords,
  type StandingWhisper,
  type Strength,
  scenarioIn,
  VOICE_RULES,
  type VoiceRules,
  WHISPER_DEFAULT,
} from '../protocol.ts';
import { sceneBeat, sceneWord } from '../ui/scene-words.ts';
import { MAX_FF_MINUTES_PER_TICK, type Run, VoiceGame } from './game.ts';
import {
  type OneCastRow,
  returnedSelin,
  type SelinReturn,
  selinEnquiryAnswer,
  selinReturnTown,
} from './persona.ts';

/** A logged input: a worker message that changes simulation or recorded scene presentation. */
export type VoiceInput = Exclude<
  MainToWorker,
  { type: 'init' | 'tick' | 'predict' | 'why' | 'personaPublished' | 'personaReturnCheck' }
>;
export type VoiceStep = [minutes: number, count: number];
export type VoiceLogEntry = VoiceStep | (VoiceInput & { at: number });

export class RecordedGame {
  readonly log: VoiceLogEntry[] = [];
  readonly game: VoiceGame;
  /** Presentation sidecar. Deliberately outside voiceState and the person loop. */
  readonly sceneWords: SceneWords[] = [];
  chapter?: SelinReturn;
  personaHead?: PersonaEnvelope;
  readonly oneCast: OneCastRow[] = [];

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
    if (msg.type === 'sceneWord') {
      const continuation = sceneWord(this.frame(), msg.kind, msg.beat, msg.words);
      if (continuation) this.sceneWords.push(continuation);
      else if (msg.words) {
        const frame = this.frame();
        this.sceneWords.push({
          beat: sceneBeat(frame),
          kind: msg.kind,
          day: frame.day,
          minute: frame.minute,
          clock: frame.clock,
          words: msg.words,
          answer: 'Those words are no longer available. Nothing was said.',
          said: false,
        });
      }
      return;
    }
    if (msg.type === 'suggest' && msg.sceneLine) {
      const frame = this.frame();
      const available =
        frame.composer.open &&
        !frame.muted &&
        frame.options.some((option) => option.id === msg.draft.optionId);
      this.sceneWords.push({
        beat: sceneBeat(frame),
        kind: 'suggestion',
        day: frame.day,
        minute: frame.minute,
        clock: frame.clock,
        words: msg.sceneLine,
        answer: available
          ? ''
          : frame.muted
            ? 'You are silent today. Those words were not said.'
            : frame.halil.asleep
              ? 'He is asleep. Those words were not said.'
              : frame.composer.open
                ? 'That is no longer one of his choices. Nothing was said.'
                : 'He is occupied. Wait until he is choosing.',
        ...(!available ? { said: false as const } : {}),
      });
      if (!available) return;
    }
    applyInput(this.game, msg);
  }
  /** Same simulation frame, with recorded scene continuations for display and repeat bounds. */
  frame() {
    return { ...this.game.frame(), sceneWords: this.sceneWords };
  }
}

function applyInput(g: VoiceGame, msg: VoiceInput): void {
  switch (msg.type) {
    case 'personaCheckpoint':
      if (g.rules !== 4) throw new Error('This notebook is from an older version; start fresh.');
      g.personaDeparture = { pending: true };
      break;
    case 'personaCheckpointCancel':
      g.personaDeparture = undefined;
      break;
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

/**
 * Parse a voice playtest file against its own scenario (voice-1 or voice-2), with the rules it replays under. A file
 * of any other scenario is refused with the shared message.
 */
export function parseVoicePlaytest(
  text: string,
  maxBytes?: number,
): {
  file: PlaytestFile<VoiceLogEntry>;
  rules: VoiceRules;
  chapter?: SelinReturn;
  rows?: OneCastRow[];
  head?: PersonaEnvelope;
} {
  const scenario = scenarioIn(text);
  const file = parsePlaytest(text, 'voice', scenario, validateVoiceLog, maxBytes);
  const raw = JSON.parse(text) as {
    voicePersona?: SelinReturn;
    oneCast?: OneCastRow[];
    voicePersonaHead?: PersonaEnvelope;
  };
  if (raw.voicePersona && scenario !== 'voice-4')
    throw new Error('This notebook is from an older version; start fresh.');
  if (
    raw.voicePersona &&
    (typeof raw.voicePersona.prefix !== 'string' || typeof raw.voicePersona.initial !== 'string')
  )
    throw new Error('Unsupported Selin replay header.');
  return {
    file,
    rules: VOICE_RULES[scenario],
    chapter: raw.voicePersona,
    rows: raw.oneCast,
    head: raw.voicePersonaHead,
  };
}

/** Replay a seed and a log from the start, under the rules the log was recorded with (default the current rules). */
export function replayVoice(
  seed: number,
  log: readonly VoiceLogEntry[],
  rules: VoiceRules = 2,
  chapter?: SelinReturn,
  depth = 0,
  castChapter?: import('../../shared/cast-chapter.ts').CastChapter,
): VoiceReplay {
  if (depth > 4) throw new Error('Too many nested Selin chapters.');
  let rec: RecordedGame;
  if (chapter) {
    if (rules !== 4) throw new Error('This notebook is from an older version; start fresh.');
    if (chapter.version !== 1) throw new Error('Unsupported return chapter.');
    const prefix = parseVoicePlaytest(chapter.prefix);
    const prior = replayVoice(
      prefix.file.seed,
      prefix.file.log,
      prefix.rules,
      prefix.chapter,
      depth + 1,
      prefix.file.castChapter,
    );
    if (prior.driftAt !== -1 || voiceHash(prior.rec.game) !== prefix.file.hash)
      throw new Error('Source chapter does not replay.');
    const game = prior.rec.game;
    if (game.seed !== seed || game.rules !== 4 || !game.personaDeparture?.transfer)
      throw new Error('Source chapter did not depart.');
    const initial = restore(JSON.parse(chapter.initial));
    if (!prefix.head) throw new Error('The original Selin departure is missing; start fresh.');
    let expected = returnedSelin(chapter.admission, game.run.ppl.selin, prefix.head, game.run.opts);
    if (chapter.life) {
      if (chapter.life.parent.revision !== chapter.admission.revision)
        throw new Error('Life does not match admission.');
      expected = applyAdmittedLife('voice', expected, chapter.life);
    }
    if (stableStringify(snapshot(initial)) !== stableStringify(snapshot(expected)))
      throw new Error('Returned Selin initial state differs from admission.');
    game.run.ppl.selin = initial;
    game.run.c.people = game.run.c.people.map((p) => (p.id === 'selin' ? initial : p));
    const answer = selinEnquiryAnswer(initial);
    game.run.opts = {
      ...game.run.opts,
      selinEnquiryAnswer: answer,
      ...(chapter.life ? { castChapter: { version: 'site-cast/1' as const, input: chapter.life } } : {}),
    };
    game.run.town = selinReturnTown(game.run.c.people, game.run.opts, game.run.town.state, answer);
    game.installPersonaBoundary();
    game.personaDeparture = undefined;
    game.paused = true;
    rec = new RecordedGame(game);
    rec.chapter = structuredClone(chapter);
    rec.personaHead = chapter.acceptedHead ? structuredClone(chapter.acceptedHead) : undefined;
    rec.oneCast.push(...structuredClone(chapter.rows));
  } else rec = new RecordedGame(new VoiceGame(seed, rules, castChapter));
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
    // Rules 1 runs hash as they did before the field existed, so voice-1 files keep their recorded hash.
    if (k === 'rules' && v === 1) continue;
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
        'sceneWord',
        'withdraw',
        'endDay',
        'advance',
        'dismissIntro',
        'keepListening',
        'personaCheckpoint',
        'personaCheckpointCancel',
      ] as const,
      `${what}.type`,
    );
    switch (type) {
      case 'sceneWord':
        check.keys(o, ['at', 'type', 'beat', 'kind', 'words'], what);
        return {
          at,
          type,
          beat: check.str(o.beat, `${what}.beat`, 160),
          ...(o.words !== undefined ? { words: check.str(o.words, `${what}.words`, 240) } : {}),
          kind: check.oneOf(o.kind, ['care', 'question'] as const, `${what}.kind`),
        };
      case 'setPace':
        check.keys(o, ['at', 'type', 'pace'], what);
        return { at, type, pace: check.oneOf(o.pace, PACES, `${what}.pace`) };
      case 'setAutoPause':
        check.keys(o, ['at', 'type', 'on'], what);
        return { at, type, on: check.bool(o.on, `${what}.on`) };
      case 'suggest': {
        check.keys(o, ['at', 'type', 'draft', 'sceneLine'], what);
        const input: VoiceInput & { at: number } = { at, type, draft: draftOf(o.draft, `${what}.draft`) };
        if (o.sceneLine !== undefined) input.sceneLine = check.str(o.sceneLine, `${what}.sceneLine`, 240);
        return input;
      }
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
