/** Headless player for Game 2 tests and benchmarks. */
import type { Draft, Frame, StandingWhisper } from '../protocol.ts';
import { VoiceGame } from './game.ts';
import type { VoiceInput } from './record.ts';

/** What `play` drives: a bare game, or a `RecordedGame` (same inputs, logged). */
export interface Driver {
  readonly game: VoiceGame;
  apply(msg: VoiceInput): void;
  /** Advance the clock; `step(60)` by default, or a real-time tick when `PlayOpts.tick` is set. */
  step(minutes: number): void;
  tick?(dtMs: number): boolean;
}

const direct = (game: VoiceGame): Driver => ({
  game,
  apply: (m) => {
    switch (m.type) {
      case 'begin':
        return game.begin();
      case 'advance':
        return game.advance(m.standing);
      case 'dismissIntro':
        return game.dismissIntro();
      case 'pause':
        return game.pause();
      case 'resume':
        return game.resume();
      case 'suggest':
        return game.suggest(m.draft);
      default:
        throw new Error(`headless: ${m.type} is not used`);
    }
  },
  step: (n) => game.advanceTo(game.t + n),
});

export interface PlayOpts {
  /** Confirm every new prefill (the bar's "prefill → Confirm" player). */
  confirm?: boolean;
  /** With `confirm`: urge and insist on every prefill instead of taking it as given. */
  insist?: boolean;
  whispers?: StandingWhisper[];
  /** Stop when this returns true (checked at every loop turn). */
  stop?: (g: VoiceGame) => boolean;
  onPause?: (f: Frame, g: VoiceGame) => void;
  /** Drive the clock with real-time ticks of these sizes (ms, cycled) instead of 60-minute steps. */
  tick?: readonly number[];
  /**
   * A scripted player: at a pause with the composer open, the draft to say (or nothing). It sees only the frame the
   * UI renders and must pick from `f.options` (the composer's six), so it has the player's real limits. Overrides
   * `confirm` at the pauses where it returns a draft.
   */
  choose?: (f: Frame, g: VoiceGame) => Draft | undefined;
  /** Press pause every this many minutes of a played day (the pause button), so `choose` is asked between beats. */
  pauseEvery?: number;
}

/** Headless player: dismisses cards, optionally confirms prefills, otherwise says nothing. */
export function play(target: VoiceGame | Driver, o: PlayOpts = {}): void {
  const d = target instanceof VoiceGame ? direct(target) : target;
  const g = d.game;
  if (g.phase === 'premise') d.apply({ type: 'begin' });
  let lastKey = '';
  let ticks = 0;
  let lastPress = Number.NEGATIVE_INFINITY;
  for (let guard = 0; guard < 2_000_000; guard++) {
    if (o.stop?.(g) || g.phase === 'report') return;
    if (g.phase === 'between') {
      d.apply({ type: 'advance', standing: g.between?.next?.skipped ? (o.whispers ?? []) : [] });
      continue;
    }
    if (g.intro) {
      d.apply({ type: 'dismissIntro' });
      d.apply({ type: 'resume' });
      continue;
    }
    if (g.paused) {
      const f = g.frame();
      o.onPause?.(f, g);
      const pick = o.choose && f.composer.open ? o.choose(f, g) : undefined;
      if (pick) {
        const k = `${f.minute}:${pick.optionId}`;
        if (pick.optionId !== g.standing?.draft.optionId && k !== lastKey && f.options.some((x) => x.id === pick.optionId)) {
          lastKey = k;
          d.apply({ type: 'suggest', draft: pick });
          continue;
        }
        d.apply({ type: 'resume' });
      }
      const key = `${f.minute}:${f.prefill?.optionId}`;
      if (
        !pick &&
        o.confirm &&
        f.composer.open &&
        f.prefill &&
        f.prefill.optionId !== g.standing?.draft.optionId &&
        key !== lastKey
      ) {
        lastKey = key;
        const draft: Draft = o.insist
          ? { optionId: f.prefill.optionId, strength: 'urge', insist: true }
          : { optionId: f.prefill.optionId, strength: f.prefill.strength, insist: false };
        if (f.prefill.appeal) draft.appeal = f.prefill.appeal;
        d.apply({ type: 'suggest', draft });
        continue;
      }
      if (!pick) d.apply({ type: 'resume' });
    }
    if (o.pauseEvery && g.phase === 'day' && !g.paused && g.t - lastPress >= o.pauseEvery) {
      lastPress = g.t;
      d.apply({ type: 'pause' });
      continue;
    }
    if (o.tick && d.tick) d.tick(o.tick[ticks++ % o.tick.length] ?? 16);
    else d.step(o.pauseEvery && g.phase === 'day' ? Math.min(60, o.pauseEvery) : 60);
  }
  throw new Error('play did not finish');
}
