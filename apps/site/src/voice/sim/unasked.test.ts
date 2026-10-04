import type { DecisionRecord } from '@human/framework';
import { describe, expect, test } from 'vitest';
import { noteUnasked, type UnaskedState, unaskedView } from './unasked.ts';

const DAY = 1440;
const rec = (o: Partial<DecisionRecord> & { at: number; chosen: string; ids: string[] }): DecisionRecord => ({
  id: `d${o.at}`,
  at: o.at,
  chosenAffordanceId: o.chosen,
  chosenAction: o.chosen,
  considered: o.ids.map((id) => ({ affordanceId: id, action: id, utility: 0.5, terms: [] })),
  intention: '',
  narration: '',
  ...(o.review ? { review: true } : {}),
  ...(o.suggestions ? { suggestions: o.suggestions } : {}),
});

describe('he’d now do unasked', () => {
  test('an unasked choice counts for its day; a decision your voice was in, or a review, reads nothing', () => {
    const s: UnaskedState = {};
    noteUnasked(s, rec({ at: 2 * DAY + 19 * 60, chosen: 'eat', ids: ['eat', 'call:selin'] }));
    expect(s.call).toEqual({ did: false, day: 2 });
    noteUnasked(s, rec({ at: 2 * DAY + 20 * 60, chosen: 'call:selin', ids: ['call:selin'] }));
    expect(s.call).toEqual({ did: true, day: 2 });
    // A later "no" the same day does not undo the day's yes.
    noteUnasked(s, rec({ at: 2 * DAY + 21 * 60, chosen: 'eat', ids: ['call:selin', 'eat'] }));
    expect(s.call?.did).toBe(true);
    const you = {
      voiceId: 'you',
      verdict: 'assented',
      says: 'Fine.',
      reason: '',
    } as unknown as NonNullable<DecisionRecord['suggestions']>[number];
    noteUnasked(
      s,
      rec({ at: 3 * DAY + 20 * 60, chosen: 'call:selin', ids: ['call:selin'], suggestions: [you] }),
    );
    noteUnasked(s, rec({ at: 3 * DAY + 20 * 60, chosen: 'call:selin', ids: ['call:selin'], review: true }));
    expect(s.call?.day).toBe(2);
    // Open but outside his top options: a "no" when the offers are known, nothing when they are not.
    noteUnasked(s, rec({ at: 4 * DAY + 10 * 60, chosen: 'rest', ids: ['rest'] }));
    expect(s.doctor).toBeUndefined();
    noteUnasked(s, rec({ at: 4 * DAY + 10 * 60, chosen: 'rest', ids: ['rest'] }), new Set(['see-doctor']));
    expect(s.doctor).toEqual({ did: false, day: 4 });
    const view = unaskedView(s, 4, { walk: false, rent: true });
    expect(view.find((u) => u.label === 'call Selin')).toEqual({
      label: 'call Selin',
      state: 'yes',
      day: 'Ramadan 2',
    });
    expect(view.find((u) => u.label === 'pay Osman')?.state).toBe('unknown');
    expect(view.some((u) => u.label.startsWith('walk'))).toBe(false);
  });
});
