import { expect, test } from 'vitest';
import { sampleFrame } from '../sim/fixtures.ts';
import { pendingSceneOffer, readingTick } from './reading-pace.ts';

test('reading slows normal and busy playback to one simulation minute per real second', () => {
  for (const pace of ['slow', 'normal', 'fast'] as const) {
    const frame = { ...sampleFrame, pace, fastForward: undefined };
    const rates = { slow: 8, normal: 20, fast: 60 };
    expect(readingTick(1000, frame, true) * rates[pace]).toBeCloseTo(1000);
    expect(readingTick(1000, { ...frame, fastForward: 'repairing' }, true) * 240).toBeCloseTo(1000);
    expect(readingTick(1000, frame, false)).toBe(1000);
  }
  expect(readingTick(1000, null, true)).toBe(1000);
});

test('a live stay offer slows even before speech opens and restores the chosen pace after it ends', () => {
  const frame = structuredClone(sampleFrame);
  Object.assign(frame, { phase: 'day', muted: false, minute: 1200, pace: 'fast', fastForward: undefined });
  frame.halil.asleep = false;
  frame.halil.doing = null;
  frame.composer = { open: true };
  frame.log = [
    {
      id: 'call',
      day: frame.day,
      minute: 1200,
      clock: '20:00',
      kind: 'act',
      who: 'halil',
      text: 'I call Selin.',
    },
  ];
  frame.options = [{ id: 'call:selin', label: 'call Selin', rank: 1, leaning: true }];
  expect(pendingSceneOffer(frame)).toBeTruthy();
  expect(readingTick(1000, frame, false, true) * 60).toBeCloseTo(250);
  frame.log.push({
    id: 'rest',
    day: frame.day,
    minute: 1220,
    clock: '20:20',
    kind: 'act',
    who: 'halil',
    text: 'I rest at home.',
  });
  frame.minute = 1220;
  expect(pendingSceneOffer(frame)).toBeNull();
  expect(readingTick(1000, frame, false)).toBe(1000);
});
