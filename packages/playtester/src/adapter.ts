/**
 * The contract between a game and an HF playtester. A game exposes what a player would see and do, not its inner
 * state: the playtester never reads the game's people or numbers the screen does not show.
 *
 * - `observe()` reports what is on screen now: events since the last call (each judged from the player's side),
 *   a few features, and whether the session can go on.
 * - `actions()` lists what the player could do now, with how useful each looks from what is shown.
 * - `apply(id)` does one action.
 * - `advance(seconds)` lets real play time pass at the game's current speed.
 * - `edgeActions()` (optional) lists what the screen allows but a sensible player would not try: sending the only
 *   cook home in a rush, agreeing with the wrong voice, a warning nobody needs. Only edge-pushing personas see them.
 *
 * Optional fields let the cohort tools read more without seeing more: `chapter` (where in the game, for quit
 * points), `outcome` (how an ended game reads to the player), `features.openLoop` and `loops` (what the screen says
 * is unfinished when the player puts it down: a bill due Sunday, a phrase half learned), and `answers` on events
 * (the game's answer to the player's last input, which is how ignored mischief is detected).
 */

/** Something the player could notice, judged from the player's side. */
export interface PlayEvent {
  /** Machine kind, used for habituation: the tenth 'served' is less interesting than the first. */
  kind: string;
  summary: string;
  /** Good or bad for the player, -1..1. */
  valence: number;
  /** How much it stands out on screen, 0..1. */
  salience: number;
  /** A game character who did it (a refusal by a cook): appraisal can aim anger at them. */
  by?: string;
  /**
   * The game answering the player's own input (a cook's reply, "she did what I said"): `true` for any recent input,
   * or the id prefixes of the inputs it answers (`['ask:selim', 'insist:selim']`), which keeps an answer to one
   * input from counting for another. Default: true when `by` is set. Ambient events (a ticket arriving, the clock)
   * are not answers.
   */
  answers?: boolean | string[];
}

export interface Observation {
  /** Game clock or chapter, for the trace only (e.g. "Tue 19:40"). */
  clock: string;
  /** Phase name, for the trace only (e.g. 'service', 'evening'). */
  phase: string;
  events: PlayEvent[];
  /**
   * Screen-level readings, 0..1. The session reads `pressure` (how much is demanding the player now); the returner
   * reads `openLoop` (how strongly the screen leaves something unfinished, 0 = a clean stopping point).
   */
  features: Record<string, number>;
  /** The game has ended (a win, a loss, the last chapter). */
  over: boolean;
  /** Where in the game, coarser than `clock` (e.g. 'w1 Fri', 'night 2'): quit points are counted by chapter. */
  chapter?: string;
  /** How an ended game reads to the player. */
  outcome?: 'win' | 'loss' | 'mixed';
  /** What the screen shows as unfinished, in the game's words ("the bank wants ₺4,000 on Sunday"). */
  loops?: string[];
}

/** One thing the player could do now. */
export interface PlayAction {
  id: string;
  label: string;
  /** Class of action (HF action `play:<kind>`), for traces and emotion tags; inputs carry no learned expectation. */
  kind: string;
  /** How useful it looks from what is shown, 0..1. A player's read, not the game's truth. */
  promise: number;
  /** Mental load of doing it, 0..1 (default `SESSION_DEFAULTS.actionFocus`). */
  focus?: number;
  /** HF affordance tags (e.g. 'confront' for insisting, which anger favours). */
  tags?: string[];
  /** Mischief: an input whose point is to provoke (insisting for sport, agreeing with the tempter). */
  mischief?: boolean;
}

export interface GameAdapter {
  name: string;
  observe(): Observation;
  actions(): PlayAction[];
  apply(id: string): void;
  /** Let `seconds` of real play time pass. */
  advance(seconds: number): void;
  /** Inputs the screen allows but a sensible player would not try (see above). Ids must be accepted by `apply`. */
  edgeActions?(): PlayAction[];
}

/** One event as a beat records it; `a` is what it answered (1 = any recent input, else id prefixes). */
export interface ShownEvent {
  k: string;
  v: number;
  a?: 1 | string[];
}

/** What an event answers, from `answers` (default: any input when it has a `by`). */
export function answerOf(e: PlayEvent): 1 | string[] | undefined {
  const a = e.answers ?? e.by !== undefined;
  if (a === true) return 1;
  if (Array.isArray(a) && a.length > 0) return [...a];
  return undefined;
}

/** Whether a recorded answer answers the input `id`. */
export function answers(a: ShownEvent['a'], id: string): boolean {
  return a === 1 || (Array.isArray(a) && a.some((x) => id.startsWith(x)));
}
