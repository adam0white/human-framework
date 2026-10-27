import { expect, test } from 'vitest';
import { willOwner } from '../src/will/will.ts';
import { activity, offer, outcome, person } from './w2-fixture.ts';

test('coerced success earns no trust; pushed harm retains its faster negative learning', () => {
  const p = person();
  p.actor.will.voices = [{ voiceId: 'voice', trust: 0.8, pressure: 0, accepted: 0, refused: 0, history: [] }];
  const act = activity(offer('work'));
  act.suggestions = [{ voiceId: 'voice', verdict: 'complied', reason: 'insisted', insisted: true }];
  const c = { ...p.frame, actor: p.actor, offers: [act.offer] };
  const good = willOwner.receive(
    p.actor.will,
    { kind: 'settled', activity: act, outcome: outcome(act), felt: 1 },
    c,
  ).state;
  expect(good.voices[0]?.trust).toBe(0.8);
  const bad = willOwner.receive(
    p.actor.will,
    { kind: 'settled', activity: act, outcome: outcome(act), felt: -1 },
    c,
  ).state;
  expect(bad.voices[0]?.trust).toBeLessThan(0.8);
  expect(bad.voices[0]?.history[0]?.reason).toBe('harm-under-protest');
});
