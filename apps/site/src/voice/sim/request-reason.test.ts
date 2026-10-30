/** Actual selected reason remains paired with its real native answer, without a claim about its effect. */
import { expect, test } from 'vitest';
import { requestAccount } from '../ui/request-account.ts';
import { VoiceGame } from './game.ts';
import { play } from './headless.ts';
import { RecordedGame, replayVoice, voiceHash } from './record.ts';

test('a selected appeal survives the actual sent line and matching answer, then replays', () => {
  const rec = new RecordedGame(new VoiceGame(7, 4));
  play(rec, { stop: (g) => !g.intro && g.composer().open && g.frame().options.length > 0 });
  const option = rec.frame().options[0]!;
  rec.apply({
    type: 'suggest',
    draft: { optionId: option.id, strength: 'mention', insist: false, appeal: 'duty' },
  });
  const frame = rec.frame(),
    account = requestAccount(frame);
  expect(account?.words).toContain('your duty');
  expect(account?.answer).toBeDefined();
  expect(account?.answer?.id).toBe(frame.log.findLast((e) => e.kind === 'answer')?.id);
  const before = voiceHash(rec.game);
  requestAccount(frame);
  expect(voiceHash(rec.game)).toBe(before);
  expect(voiceHash(replayVoice(7, rec.log, 4).rec.game)).toBe(before);
}, 30_000);
