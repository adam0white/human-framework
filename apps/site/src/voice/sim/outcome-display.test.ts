import { describe, expect, test } from 'vitest';
import type { LogEntry } from '../protocol.ts';
import { SHIPPED_SEED, VoiceGame } from './game.ts';
import { play } from './headless.ts';
import { RecordedGame, replayVoice, voiceHash } from './record.ts';

const row = (id: string, kind: LogEntry['kind'], text: string, extra: Partial<LogEntry> = {}): LogEntry => ({
  id,
  kind,
  text,
  who: kind === 'you' || kind === 'note' ? 'you' : 'halil',
  minute: 100,
  day: 1,
  clock: '01:40',
  ...extra,
});

describe('outcome display without changing the recorded run', () => {
  test('a deferred suggestion ends visibly without claiming he never acted', () => {
    const g = new VoiceGame(SHIPPED_SEED, 4);
    g.log = [
      row('l1', 'you', 'You: mention · call Selin'),
      row('l2', 'answer', '“After this task.”', { tone: 'notNow' }),
      row('l3', 'note', 'Your suggestion fades.'),
    ];
    const before = voiceHash(g);
    expect(g.frame().log.at(-1)?.text).toBe(
      'He asked you to wait. Your suggestion has now ended. Say it again if you still want him to hear it.',
    );
    expect(voiceHash(g)).toBe(before);
    expect(g.log.at(-1)?.text).toBe('Your suggestion fades.');
  });

  test('sleep ends the suggestion and the rent deadline reports a missed payment, not a visit', () => {
    const g = new VoiceGame(SHIPPED_SEED, 4);
    g.log = [
      row('l1', 'note', 'He is asleep. Your suggestion fades.'),
      row(
        'l2',
        'note',
        'Osman’s payment deadline has passed, and he has paid nothing; he had 215 of the 300. From now Osman presses harder when he comes.',
        { who: 'halil', beat: 'duty-risk' },
      ),
    ];
    const before = voiceHash(g);
    expect(g.frame().log[0]?.text).toMatch(/asleep.*suggestion has ended/);
    expect(g.frame().log[1]?.text).toContain('Halil paid nothing by 20:00');
    expect(g.frame().log[1]?.text).not.toMatch(/at the door|arrived|came/);
    expect(voiceHash(g)).toBe(before);
  });

  test('current-version inputs replay exactly after reading outcome frames throughout the month', () => {
    const rec = new RecordedGame(new VoiceGame(SHIPPED_SEED, 4));
    play(rec, {
      confirm: true,
      stop: (g) => {
        g.frame();
        return false;
      },
    });
    const result = replayVoice(SHIPPED_SEED, rec.log, 4);
    expect(result.driftAt).toBe(-1);
    expect(voiceHash(result.rec.game)).toBe(voiceHash(rec.game));
    expect(result.rec.game.log).toEqual(rec.game.log);
  });

  test('Mention with duty and Urge preserve the existing twelve-day shift outcomes', () => {
    const shifts = (strength: 'mention' | 'urge') => {
      const g = new VoiceGame(SHIPPED_SEED, 4);
      play(g, { stop: (x) => x.phase === 'between' && x.day === 2 });
      expect(g.between?.next?.skipped).toBe(12);
      g.advance([{ choiceId: 'extra', strength, appeal: 'duty' }]);
      return g.cells.filter(
        (c) => c.affordanceId === 'work-extra' && c.from >= 3 * 1440 && c.from < 15 * 1440,
      ).length;
    };
    expect(shifts('mention')).toBe(0);
    expect(shifts('urge')).toBeGreaterThan(0);
  });

  test('the first refusal of an afternoon shift explains his doubt about the pay', () => {
    const g = new VoiceGame(SHIPPED_SEED, 4);
    play(g, { stop: (x) => x.paused && x.frame().prefill?.optionId === 'work-extra' });
    g.suggest({ optionId: 'work-extra', strength: 'mention', appeal: 'duty', insist: false });
    const before = voiceHash(g);
    const answer = g.frame().log.findLast((e) => e.kind === 'answer');
    expect(answer?.tone).not.toBe('yes');
    expect(answer?.text).toContain('He also doubts the afternoon shift will pay.');
    expect(voiceHash(g)).toBe(before);
    expect(g.log.findLast((e) => e.kind === 'answer')?.text).not.toContain('He doubts');
  });
});
