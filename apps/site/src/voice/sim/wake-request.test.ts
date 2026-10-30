/** Captured player words are admitted after the actual known sleep finish; no future actor or forced wake. */
import { expect, test } from 'vitest';
import { VoiceGame } from './game.ts';
import { play } from './headless.ts';
import { RecordedGame, replayVoice, voiceHash } from './record.ts';

test('a captured food suggestion waits for actual wake before native evaluation and replays', () => {
  const rec = new RecordedGame(new VoiceGame(7, 4));
  play(rec, { stop: (g) => g.waking() });
  const game = rec.game,
    sent = game.t,
    wake = game.halil.activity!.endsAt;
  expect(game.halil.body.asleep).toBe(true);
  expect(game.frame().options.some((o) => o.id === 'eat')).toBe(true);
  const before = game.run.c.runtime!.events.length;
  rec.apply({ type: 'suggest', draft: { optionId: 'eat', strength: 'mention', insist: false } });
  const answers = game.run.c
    .runtime!.events.slice(before)
    .filter((e) => e.data.kind === 'suggestion-resolved');
  expect(answers.length).toBeGreaterThan(0);
  expect(answers.every((e) => e.at >= Math.round(wake * 60000))).toBe(true);
  expect(game.halil.body.asleep).toBe(false);
  expect(game.log.findLast((r) => r.kind === 'you')?.minute).toBe(sent);
  const cold = replayVoice(7, rec.log, 4);
  expect(cold.driftAt).toBe(-1);
  expect(voiceHash(cold.rec.game)).toBe(voiceHash(game));
}, 30_000);
