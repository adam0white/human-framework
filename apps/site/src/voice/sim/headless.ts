/** Headless player for Game 2 tests and benchmarks. */
import type { Draft, Frame, StandingWhisper } from '../protocol.ts';
import type { VoiceGame } from './game.ts';

export interface PlayOpts {
  /** Confirm every new prefill (the bar's "prefill → Confirm" player). */
  confirm?: boolean;
  /** With `confirm`: urge and insist on every prefill instead of taking it as given. */
  insist?: boolean;
  whispers?: StandingWhisper[];
  /** Stop when this returns true (checked at every loop turn). */
  stop?: (g: VoiceGame) => boolean;
  onPause?: (f: Frame, g: VoiceGame) => void;
}

/** Headless player: dismisses cards, optionally confirms prefills, otherwise says nothing. */
export function play(g: VoiceGame, o: PlayOpts = {}): void {
  if (g.phase === 'premise') g.begin();
  let lastKey = '';
  for (let guard = 0; guard < 50_000; guard++) {
    if (o.stop?.(g) || g.phase === 'report') return;
    if (g.phase === 'between') {
      g.advance(g.between?.next?.skipped ? (o.whispers ?? []) : []);
      continue;
    }
    if (g.intro) {
      g.dismissIntro();
      g.resume();
      continue;
    }
    if (g.paused) {
      const f = g.frame();
      o.onPause?.(f, g);
      const key = `${f.minute}:${f.prefill?.optionId}`;
      if (
        o.confirm &&
        f.composer.open &&
        f.prefill &&
        f.prefill.optionId !== g.standing?.draft.optionId &&
        key !== lastKey
      ) {
        lastKey = key;
        const d: Draft = o.insist
          ? { optionId: f.prefill.optionId, strength: 'urge', insist: true }
          : { optionId: f.prefill.optionId, strength: f.prefill.strength, insist: false };
        if (f.prefill.appeal) d.appeal = f.prefill.appeal;
        g.suggest(d);
        continue;
      }
      g.resume();
    }
    g.advanceTo(g.t + 60);
  }
  throw new Error('play did not finish');
}
