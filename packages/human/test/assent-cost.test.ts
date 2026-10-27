import { expect, test } from 'vitest';
import { willOwner } from '../src/will/will.ts';
import { activity, decisionContext, offer, person } from './w2-fixture.ts';

test('one final booked ordinary assent charges .1 pressure, not elapsed time or extra autonomy', () => {
  const p = person();
  p.actor.will.temperature = 0;
  const request = offer('work'),
    c = decisionContext(p, [request], [{ source: 'suggestion:voice', value: 1 }]);
  c.suggestions = [{ adviceId: 'advice', voiceId: 'voice', affordanceId: 'work', strength: 0.8 }];
  const result = willOwner.decide(p.actor.will, c);
  expect(result.resolutions[0]?.verdict).toBe('assented');
  expect(result.resolutions[0]?.assentCost?.pressure).toBeCloseTo(0.1, 14);
  expect(result.state.voices[0]?.pressure).toBeCloseTo(0.1, 14);
  expect(result.needReceipts).toEqual([]);
  p.actor.activity = activity(request);
  const ongoing = willOwner.decide(result.state, { ...c, actor: p.actor });
  expect(ongoing.resolutions[0]?.assentCost).toBeUndefined();
  expect(ongoing.state.voices[0]?.pressure).toBeCloseTo(0.1, 14);
});
