/**
 * SCOPE: the edge-pushers' input policy. HF scores a game's inputs by what they promise (competence), emotion
 * tendencies (anger toward `confront`) and effort; nothing in HF hunts for exploits or provokes for sport. A style
 * reshapes what each input promises before HF scores it, from what the player has seen its inputs do:
 * - mischief: inputs marked `mischief` or tagged `confront` look worth trying; a provocation the game answers is a
 *   small reward ("they rose to it"), one it ignores is a little boring, and after three ignored tries that input
 *   stops looking worth it. Ordinary rewards count half: good behaviour bores this player.
 * - exploit: each input is credited with the good things that follow it (within `window` beats); the input with
 *   the best payoff per try looks best, untried ones keep a small explorer's pull. Rewards habituate twice as fast:
 *   once found, the trick wears out.
 * - rules: untried inputs look best; an input that just went through is tried once more at once (does it count
 *   twice?); an input the game never answers is a small distress (the game did not keep its word).
 * All three see the adapter's `edgeActions`. Numbers are engineering premises for playtesting, tuned on the toys in
 * test/; they are not estimates of real players. A style never reads game state: only what the adapter shows.
 */
import { answerOf, answers, type PlayAction, type PlayEvent } from './adapter.ts';
import type { PlayStyle } from './persona.ts';

export const STYLE_DEFAULTS = {
  /** Beats after an input in which an answer or a payoff is credited to it. */
  window: 3,
  /** Promise floor for a provocation that has not yet been ignored. */
  mischiefFloor: 0.75,
  /** Ignored tries after which a provocation stops looking worth it, and the factor then applied. */
  mischiefGiveUp: 3,
  mischiefGiveUpFactor: 0.3,
  /** Share of ordinary promise a mischief-maker still sees. */
  mischiefPlain: 0.5,
  /** What an answered provocation is worth (as an event valence) and how much an ignored one bores. */
  mischiefRelish: 0.5,
  mischiefIgnoredBoredom: 0.12,
  /** Share of ordinary event valence a mischief-maker appraises. */
  mischiefAppraisal: 0.5,
  /** Exploit-hunter: weight of the payoff record against what is shown, and the explorer's floor for untried ids. */
  exploitWeight: 0.6,
  exploitExplore: 0.35,
  exploitHabituation: 2,
  /** Rule-lawyer: promise of an untried input and of the immediate repeat, and the share kept once tried. */
  rulesUntried: 0.85,
  rulesRepeat: 0.95,
  rulesTried: 0.6,
  rulesSilentDistress: 0.08,
};

export interface InputRecord {
  tries: number;
  /** Tries the game answered within the window. */
  answered: number;
  /** Tries whose window closed with no answer (open windows count as neither). */
  ignored: number;
  /** Summed positive valence × salience seen within the window after each try. */
  payoff: number;
  mischief: boolean;
}

/** What a style reports back to the session after a beat's events are credited. */
export interface StyleBeat {
  /** Provocations answered this beat (each a small reward for a mischief-maker). */
  answered: { id: string; by: PlayEvent }[];
  /** Inputs whose window closed with no answer. */
  ignored: { id: string; mischief: boolean }[];
}

export class StyleMind {
  readonly style: PlayStyle | undefined;
  readonly inputs = new Map<string, InputRecord>();
  private open: { id: string; beat: number; answered: boolean }[] = [];
  private repeat: string | undefined;

  constructor(style: PlayStyle | undefined) {
    this.style = style;
  }

  /** Habituation multiplier on the session's event-kind habituation. */
  get habituation(): number {
    return this.style === 'exploit' ? STYLE_DEFAULTS.exploitHabituation : 1;
  }

  /** Share of event valence appraised and counted as reward. */
  get appraisal(): number {
    return this.style === 'mischief' ? STYLE_DEFAULTS.mischiefAppraisal : 1;
  }

  /** Credit this beat's shown events to the inputs still within their window. */
  credit(beat: number, shown: readonly PlayEvent[]): StyleBeat {
    const out: StyleBeat = { answered: [], ignored: [] };
    if (this.open.length === 0) return out;
    const gain = shown.reduce((s, e) => s + Math.max(0, e.valence) * e.salience, 0);
    const last = this.open[this.open.length - 1];
    for (const o of this.open) {
      const rec = this.inputs.get(o.id);
      if (!rec) continue;
      const answer = shown.find((e) => answers(answerOf(e), o.id));
      if (answer && !o.answered) {
        o.answered = true;
        rec.answered += 1;
        if (rec.mischief) out.answered.push({ id: o.id, by: answer });
      }
      // Payoff goes to the most recent input: the one a player would credit.
      if (o === last) rec.payoff += gain;
    }
    const keep: typeof this.open = [];
    for (const o of this.open) {
      if (beat - o.beat < STYLE_DEFAULTS.window) keep.push(o);
      else if (!o.answered) {
        const rec = this.inputs.get(o.id);
        if (rec) rec.ignored += 1;
        out.ignored.push({ id: o.id, mischief: rec?.mischief ?? false });
      }
    }
    this.open = keep;
    return out;
  }

  /** Note an applied input. */
  applied(beat: number, a: PlayAction): void {
    const mischief = a.mischief === true || (a.tags?.includes('confront') ?? false);
    const rec = this.inputs.get(a.id) ?? { tries: 0, answered: 0, ignored: 0, payoff: 0, mischief };
    rec.tries += 1;
    this.inputs.set(a.id, rec);
    this.open.push({ id: a.id, beat, answered: false });
    if (this.style === 'rules') this.repeat = rec.tries === 1 ? a.id : undefined;
  }

  /** What each input promises to this player now. Ordinary players see the adapter's own promise. */
  shape(actions: readonly PlayAction[]): PlayAction[] {
    const S = STYLE_DEFAULTS;
    const style = this.style;
    if (!style) return [...actions];
    const rate = (r: InputRecord | undefined) => (r && r.tries > 0 ? r.payoff / r.tries : 0);
    const best = Math.max(0, ...actions.map((a) => rate(this.inputs.get(a.id))));
    const repeat = this.repeat;
    this.repeat = undefined;
    return actions.map((a) => {
      const rec = this.inputs.get(a.id);
      let promise = a.promise;
      if (style === 'mischief') {
        const provoking = a.mischief === true || (a.tags?.includes('confront') ?? false);
        if (provoking) {
          promise = Math.max(promise, S.mischiefFloor);
          if ((rec?.ignored ?? 0) >= S.mischiefGiveUp) promise *= S.mischiefGiveUpFactor;
        } else promise *= S.mischiefPlain;
      } else if (style === 'exploit') {
        if (!rec) promise = Math.max(promise, S.exploitExplore);
        else if (best > 0) promise = (1 - S.exploitWeight) * promise + S.exploitWeight * (rate(rec) / best);
      } else if (style === 'rules') {
        if (a.id === repeat) promise = S.rulesRepeat;
        else if (!rec) promise = Math.max(promise, S.rulesUntried);
        else promise *= S.rulesTried;
      }
      return { ...a, promise: Math.max(0, Math.min(1, promise)) };
    });
  }
}
