/**
 * Worker protocol for Game 2, *The Day You Say Nothing* (docs/games/voice.md §10). The
 * main thread sends `tick{dtMs}` every animation frame; the worker turns real time into sim minutes and replies
 * with at most one `frame` per tick, only when something changed. Every reply carries the run's `gen`. The worker
 * builds all view models as plain JSON; React never imports `@adam0white/human-framework`.
 *
 * Additive to the original contract (no shape changes): `VOICE_SCENARIO_VERSION`, `STRENGTH_VALUE`, `PACE_MINUTES_PER_SECOND`.
 */
import type { PlaytestFile, ReplayResult } from '../shared/playtest.ts';

/** The scenario the worker runs; `init.scenarioVersion` must equal it. */
export const VOICE_SCENARIO_VERSION = 'voice-1';

export type Pace = 'slow' | 'normal' | 'fast';
export type Phase = 'premise' | 'day' | 'between' | 'eid' | 'report' | 'free';
export type Strength = 'mention' | 'urge'; // 0.35 | 0.7
export type Appeal = 'duty' | 'safety' | 'benevolence' | 'belonging' | 'meaning';
export type Tone = 'yes' | 'notNow' | 'cannot' | 'willNot' | 'protest';
export type BeatKind =
  | 'wake'
  | 'verdict'
  | 'voice'
  | 'craving'
  | 'close-call'
  | 'duty-risk'
  | 'recall'
  | 'day-end'
  | 'eid';
export type VoiceId = 'you' | 'selin' | 'riza' | 'hacer' | 'osman' | 'doctor';
export type Family =
  | 'worship'
  | 'work'
  | 'food'
  | 'social'
  | 'phone'
  | 'rest'
  | 'sleep'
  | 'health'
  | 'money'
  | 'smoke'
  | 'grave';

/** The seed the game ships with (Replay keeps it; New town picks another). */
export const SHIPPED_SEED = 7;

/**
 * Model notes (voice.md §10), the one copy: the premise card, the report and the mock all read this. Kept out of ordinary play (a
 * collapsed section). Wording rules: his understanding, never a ruling; nothing about acceptance; anything not
 * sourced in research/ is named an engineering assumption.
 */
export const MODEL_NOTES: readonly string[] = [
  'Halil is a simulation of a person’s needs, duties, habits, memories and trust, built from engineering defaults. It is not a model of any real person or town.',
  'The game represents his understanding of his duties, never a ruling, and never anything about acceptance.',
  'From the project’s research notes: smoking breaks the fast as he understands it; Fajr ends at sunrise; the Eid prayer is offered at the mosque on Eid morning, strongly emphasised but not obligatory as the game records it. A prayer he misses stays owed and may be made up quietly another day; sleeping through it or being unconscious is no fault. The prayer times are fictional, not computed. Engineering assumptions: zakat al-fitr is not represented; the workshop is shut on Eid (a town custom).',
  'Money: the morning shift alone does not reach Osman’s 300 by Ramadan 15. He does not reckon on the afternoon shift’s pay, so on his own he rarely takes it (an engineering choice that makes the shift your lever).',
  'Illness excuses the fast with a make-up owed (Qur’an 2:184). Treating a break under real necessity the same way is an engineering assumption by analogy with Qur’an 2:173, not yet sourced. The game never records either as a breach of the fast.',
  'How heavy the clinic, the mosque and calling Selin feel to him since Nuran died are engineering defaults, not findings.',
  'He decides from what he feels. His true body is shown only by the doctor and in the report.',
  'Two parameters have no empirical citation yet: scarcity (debt pressure) and habit strength.',
];

/** Suggestion strength sent to the framework for each `Strength`. */
export const STRENGTH_VALUE: Record<Strength, number> = { mention: 0.35, urge: 0.7 };
/** Sim minutes per real second at each pace (voice.md §9); fast-forward runs at 240. */
export const PACE_MINUTES_PER_SECOND: Record<Pace, number> = { slow: 8, normal: 20, fast: 60 };

export interface Draft {
  optionId: string;
  strength: Strength;
  insist: boolean;
  appeal?: Appeal;
}
export interface StandingWhisper {
  choiceId:
    | 'work'
    | 'extra'
    | 'doctor'
    | 'selin'
    | 'rent'
    | 'mosque'
    | 'rest'
    | 'walk'
    // Tempting words (tenth pass): the player's own choice, framed as plainly as the others.
    | 'sleepIn'
    | 'friends'
    | 'osmanWaits'
    | 'skipCall';
  strength: Strength;
  appeal?: Appeal;
}
/**
 * What a whisper starts as when picked on the between-days card: the reason the in-day prefill would give for the
 * same act (his word to Osman for the shift and the rent, his health for the clinic, Selin for the call). The
 * player can change or clear it. A bare mention of the shift does not move him (he does not count on its pay).
 */
export const WHISPER_DEFAULT: Record<StandingWhisper['choiceId'], Omit<StandingWhisper, 'choiceId'>> = {
  work: { strength: 'mention' },
  extra: { strength: 'mention', appeal: 'duty' },
  doctor: { strength: 'mention', appeal: 'safety' },
  selin: { strength: 'mention', appeal: 'benevolence' },
  rent: { strength: 'mention', appeal: 'duty' },
  mosque: { strength: 'mention' },
  rest: { strength: 'mention' },
  walk: { strength: 'mention', appeal: 'safety' },
  sleepIn: { strength: 'mention', appeal: 'safety' },
  friends: { strength: 'mention', appeal: 'belonging' },
  osmanWaits: { strength: 'mention', appeal: 'benevolence' },
  skipCall: { strength: 'mention', appeal: 'benevolence' },
};
/** A whisper as the between-days card makes it when the player picks it and changes nothing. */
export const defaultWhisper = (choiceId: StandingWhisper['choiceId']): StandingWhisper => ({
  choiceId,
  ...WHISPER_DEFAULT[choiceId],
});

export type MainToWorker =
  | { type: 'init'; seed: number; gen: number; scenarioVersion: string }
  | { type: 'tick'; dtMs: number }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'setPace'; pace: Pace }
  | { type: 'setAutoPause'; on: boolean }
  | { type: 'begin' } // premise card dismissed
  | { type: 'predict'; requestId: number; draft: Draft }
  | { type: 'suggest'; draft: Draft } // Confirm
  | { type: 'withdraw' }
  | { type: 'why'; decisionId: string }
  | { type: 'endDay' }
  | { type: 'advance'; standing: StandingWhisper[] } // between-days card: next day (skips run here)
  | { type: 'dismissIntro' }
  | { type: 'keepListening' }
  /** Playtest file (additive): the worker answers `playtest` with the file (its `build` is filled in by the page). */
  | { type: 'exportPlaytest' }
  /** Replay a playtest file's text as a new run numbered `gen`; answers `replayed`, or `playtestError`. */
  | { type: 'loadPlaytest'; gen: number; text: string };

export type { ReplayResult };

export interface LogEntry {
  id: string;
  day: number;
  minute: number;
  clock: string;
  kind: 'act' | 'you' | 'answer' | 'voice' | 'feel' | 'recall' | 'note';
  who: 'halil' | VoiceId;
  text: string;
  tone?: Tone;
  until?: string;
  decisionId?: string;
  beat?: BeatKind;
}
export interface OptionView {
  id: string;
  label: string;
  rank: number;
  leaning: boolean;
}
export interface Prefill {
  optionId: string;
  strength: Strength;
  appeal?: Appeal;
  why: string;
  source: 'advice' | 'end' | 'close-call' | 'tutorial';
  sourceId?: VoiceId;
}
export interface Telegraph {
  tone: Tone;
  text: string;
  says: string;
  counter?: string;
  reason: string;
  likelihood?: number;
}
export interface StandingView {
  draft: Draft;
  label: string;
  since: string;
  lastAnswer?: { tone: Tone; says: string; counter?: string };
  expires: string;
}
export interface Felt {
  id: 'hunger' | 'thirst' | 'tired';
  level: number;
  word: string;
}
export interface HalilView {
  doing: { label: string; intention: string; until: string } | null;
  asleep: boolean;
  felt: Felt[];
  feelings: { name: string; word: string; intensity: number }[];
  onMind: {
    id: string;
    label: string;
    due: string;
    state: 'open' | 'closing' | 'kept' | 'missed' | 'excused';
  }[];
  money: number;
  owed: number;
  /** Round 3: illness that excuses the fast, and the doctor's last words, as plain lines (absent when well and unseen). */
  health?: string[];
  /**
   * How a few things feel to him now, from his learned expectations (fix pass 2): the clinic, calling Selin, the
   * mosque. `trend` compares with the start of Ramadan.
   */
  weighs?: { label: string; word: string; trend: 'easier' | 'heavier' | 'same' }[];
}
export interface VoiceView {
  id: VoiceId;
  name: string;
  relation: string;
  colour: string;
  trust?: number; // 'you' only
  trustWord: string;
  history: { delta: number; text: string }[];
  lastUrged?: { label: string; when: string; standing: boolean; weight: number };
  conflict?: string;
}
export interface EndView {
  id: 'fast' | 'rent' | 'doctor' | 'selin' | 'trust';
  label: string;
  status: string;
  detail: string;
  progress?: number;
  /** End report only: what came of this end without you, on Eid and in the six days after (dated apart). */
  after?: string;
}
/**
 * Seventh pass: one thing he would now do with no word from you, from his last decision where it was open and your
 * voice was not in it (a real decision, or a silent copy of the next one when your word stood). `day`: the day
 * that reading is from, when it is not today. `state` 'unknown': no such chance yet.
 */
export interface UnaskedItem {
  label: string;
  state: 'yes' | 'no' | 'unknown';
  day?: string;
}
export interface StripRow {
  label: string;
  cells: { from: number; to: number; family: Family; label: string; promptedBy?: VoiceId }[];
}

export interface Frame {
  phase: Phase;
  day: number;
  dayLabel: string;
  minute: number;
  clock: string;
  sky: {
    hour: number;
    /** Today's five prayers; `state` once its time has come (seventh pass: small pips, kept or missed). */
    prayers: { name: string; minute: number; state?: 'kept' | 'missed'; mosque?: boolean }[];
    fast?: { from: number; until: number };
  };
  paused: boolean;
  pace: Pace;
  autoPause: boolean;
  fastForward?: string;
  pauseBeat?: { kind: BeatKind; text: string };
  intro?: { label: string; lines: string[] };
  halil: HalilView;
  composer: { open: boolean; reason?: 'asleep' | 'busy' | 'muted'; until?: string };
  leaning?: { optionId: string; why: string };
  options: OptionView[];
  prefill?: Prefill;
  standing?: StandingView;
  log: LogEntry[]; // newest 300, append-only ids
  ends: EndView[];
  /** Seventh pass: what he would now do unasked (the Ends pane). */
  unasked?: UnaskedItem[];
  voices: VoiceView[];
  muted: boolean;
}
export interface WhyView {
  decisionId: string;
  clock: string;
  chosen: string;
  options: { label: string; total: number; terms: { label: string; value: number }[] }[];
  recalled?: string;
  voice?: { says: string; reason: string };
  /** When what he chose was not the top total: why (he kept to what he was doing, or did as told). */
  note?: string;
}
export interface BetweenView {
  closed: string;
  lines: string[];
  /** What your words did today, plainly (fix pass 2): verdicts by kind, calls, money, the clinic. */
  yours?: string[];
  strip: StripRow;
  ends: EndView[];
  /** Seventh pass: what he would now do unasked, as the day closes. */
  unasked?: UnaskedItem[];
  trust: { from: number; to: number; events: string[] };
  next: { label: string; day: number; skipped: number } | null; // null → Eid comes next
  /** `hint`: a line shown under the picked whisper (the shift when money is short: what moves him). */
  choices: { id: StandingWhisper['choiceId']; label: string; cost: string; hint?: string }[];
}
export interface ReportView {
  /** `summary`: the few plain facts the month and Eid come down to (Selin on Eid, the clinic, you). */
  eid: { strip: StripRow; lines: string[]; summary: string[] };
  /**
   * "What you used to say" (fix pass 2): for each thing you suggested in Ramadan, how many times, and what he did
   * about it on Eid with his reason.
   */
  ledger?: { said: string; times: number; eid: string }[];
  own: string[];
  /** May be empty; the UI hides an empty section. */
  others: string[];
  /** May be empty; the UI hides an empty section. */
  stopped: string[];
  trust: { id: VoiceId; name: string; endRamadan: string; endWeek: string }[];
  ends: EndView[];
  /** Seventh pass: what he would do unasked as Ramadan ended (Eid morning), to set beside what he did on Eid. */
  unasked?: UnaskedItem[];
  body: string[];
  open: string[];
  rows: StripRow[];
  /** False when you said nothing all month (the strips heading then says "watched"). */
  spoke?: boolean;
  /**
   * Stretch S1, "the month you never spoke": the same seed run again with no input from you, set beside this run as
   * a few plain facts. Added by the worker (sim/counterfactual.ts) after the report is built, so it is not part of
   * the run's state or hash. Absent until computed.
   */
  silent?: SilentMonthView;
  modelNotes: string[];
}
/** The same town from the same seed with no word from you, compared with the month as played (voice.md §7.5). */
export interface SilentMonthView {
  /** One line on what the silent month is; when you never spoke, the whole section (no rows). */
  intro: string;
  /** Facts that came out differently, in words: as played, and in the month you never spoke. */
  rows: { topic: string; spoke: string; silent: string }[];
  /** Topics that came out the same in both months, in words (one line, or empty). */
  same: string;
  /** Differing topics beyond the rows shown, named in one line ("Smaller differences: …"), or empty. */
  smaller: string;
  /** Always `SILENT_CAPTION`. */
  caption: string;
}
/** The caption the silent-month comparison must carry, verbatim (voice.md Stretch S1). */
export const SILENT_CAPTION = 'Small differences compound; not every difference is your doing.';

export type WorkerReply =
  /**
   * A frame: the fields that changed since the last one posted on this run, with the unchanged ones named in
   * `same` (the page reuses its previous values). Without `same` the frame is whole.
   */
  | { type: 'frame'; frame: Partial<Frame>; same?: (keyof Frame)[] }
  | { type: 'predicted'; requestId: number; telegraph: Telegraph }
  | { type: 'why'; decisionId: string; why: WhyView | null }
  | { type: 'between'; view: BetweenView }
  | { type: 'report'; view: ReportView }
  | { type: 'playtest'; file: PlaytestFile }
  | { type: 'replayed'; result: ReplayResult }
  | { type: 'playtestError'; message: string }
  | { type: 'error'; message: string };
export type WorkerToMain = WorkerReply & { gen: number };
