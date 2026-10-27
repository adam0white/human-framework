import { expect, test } from 'vitest';
import { willOwner } from '../src/will/will.ts';
import { activity, offer, outcome, person } from './w2-fixture.ts';

test('tiny same-reason trust changes fold with their time span and actual total', () => {
  const p = person();
  p.actor.will.voices = [{ voiceId: 'voice', trust: 0.8, pressure: 0, accepted: 0, refused: 0, history: [] }];
  const act = activity(offer('work'));
  act.suggestions = [{ voiceId: 'voice', verdict: 'assented', reason: 'chosen', margin: 0 }];
  let state = p.actor.will;
  for (const at of [100, 200])
    state = willOwner.receive(
      state,
      { kind: 'settled', activity: act, outcome: outcome(act), felt: 0.0001 },
      { ...p.frame, at, actor: p.actor, offers: [] },
    ).state;
  const voice = state.voices[0];
  expect(voice?.history).toHaveLength(1);
  expect(voice?.history[0]).toMatchObject({ reason: 'went-well', from: 100, at: 200, count: 2 });
  expect(voice?.history[0]?.delta).toBeCloseTo((voice?.trust ?? 0) - 0.8, 12);
  expect(voice?.trust).toBeGreaterThan(0.8);
});
