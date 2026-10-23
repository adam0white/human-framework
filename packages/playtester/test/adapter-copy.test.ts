import { describe, expect, it } from 'vitest';
import { innControls, optionalUiCopy, voiceHint } from '../adapters/screen-copy.ts';

describe('adapter screen copy', () => {
  it('keeps the inn controls and their shown reasons when the request changes state', () => {
    const clock = (minute: number) => `${Math.floor(minute / 60)}:${String(minute % 60).padStart(2, '0')}`;
    const waiting = innControls(true, 1230, clock, false);
    expect(waiting.map((a) => [a.id, a.disabled])).toEqual([
      ['ring', { reason: 'she’s gone to look' }],
      ['warn', { reason: 'warned at 20:30' }],
    ]);
    const returned = innControls(false, null, clock, true);
    expect(returned.map((a) => a.id)).toEqual(['ring', 'warn']);
    expect(returned.every((a) => !a.disabled)).toBe(true);
    // Warning a low river is still an edge input, not a fabricated disabled control.
    expect(innControls(false, null, clock, false).map((a) => a.id)).toEqual(['ring']);
  });

  it('uses the visible card hint priority without inventing instructions from a refusal', () => {
    const first = { id: 'alarm-1', options: [{ lean: 'rather not', pushed: 'yes' }] };
    expect(voiceHint(1, first)).toBe('Tap one to say it.');
    expect(voiceHint(2, first)).toBe('');
    expect(voiceHint(1, { ...first, hint: 'Choose your words.' })).toBe('Choose your words.');
    expect(
      voiceHint(1, {
        ...first,
        hint: 'Choose your words.',
        options: [{ lean: 'yes', pushed: 'later' }],
      }),
    ).toBe('She’s had enough of being pushed. A hold now lands worse than a word.');
  });

  it('leaves a missing older UI reader unmeasured', async () => {
    expect(await optionalUiCopy(import.meta.dirname, 'absent-screen-reader')).toBeUndefined();
  });
});
