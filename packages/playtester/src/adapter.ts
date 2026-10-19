/**
 * The contract between a game and an HF playtester. A game exposes what a player would see and do, not its inner
 * state: the playtester never reads the game's people or numbers the screen does not show.
 *
 * - `observe()` reports what is on screen now: events since the last call (each judged from the player's side),
 *   a few features, and whether the session can go on.
 * - `actions()` lists what the player could do now, with how useful each looks from what is shown.
 * - `apply(id)` does one action.
 * - `advance(seconds)` lets real play time pass at the game's current speed.
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
}

export interface Observation {
  /** Game clock or chapter, for the trace only (e.g. "Tue 19:40"). */
  clock: string;
  /** Phase name, for the trace only (e.g. 'service', 'evening'). */
  phase: string;
  events: PlayEvent[];
  /** Screen-level readings, 0..1: `pressure` (how much is demanding the player now) is the one the session reads. */
  features: Record<string, number>;
  /** The game has ended (a win, a loss, the last chapter). */
  over: boolean;
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
}

export interface GameAdapter {
  name: string;
  observe(): Observation;
  actions(): PlayAction[];
  apply(id: string): void;
  /** Let `seconds` of real play time pass. */
  advance(seconds: number): void;
}
