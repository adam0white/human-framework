import { describe, expect, test } from 'vitest';
import type { LogEntry } from '../protocol.ts';
import { SHIPPED_SEED, VoiceGame } from './game.ts';
import { voiceHash } from './record.ts';

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

describe('outcome presentation', () => {
  test('the rent deadline reports a missed payment, not a visit', () => {
    const g = new VoiceGame(SHIPPED_SEED, 4);
    g.log = [
      row(
        'l2',
        'note',
        'Osman’s payment deadline has passed, and he has paid nothing; he had 215 of the 300. From now Osman presses harder when he comes.',
        { who: 'halil', beat: 'duty-risk' },
      ),
    ];
    const before = voiceHash(g);
    expect(g.frame().log[0]?.text).toContain('Halil paid nothing by 20:00');
    expect(g.frame().log[0]?.text).not.toMatch(/at the door|arrived|came/);
    expect(voiceHash(g)).toBe(before);
  });
});
