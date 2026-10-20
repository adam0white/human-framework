import { expect, test } from 'vitest';
import { sampleFrame } from '../sim/fixtures.ts';
import { readingTick } from './reading-pace.ts';

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
