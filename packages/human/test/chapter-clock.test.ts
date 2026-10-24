import { describe, expect, it } from 'vitest';
import {
  advanceChapterClock,
  CHAPTER_CLOCK,
  createChapterClock,
  createPerson,
  snapshot,
} from '../src/index.ts';

describe('optional chapter clock', () => {
  it('pins deterministic slots, rollback and repeated returns without touching a Person', () => {
    const p = createPerson({ id: 'p', name: 'P', seed: 1, bornAt: 0, sex: 'female' });
    const before = snapshot(p);
    const clock = createChapterClock(17, 0);
    const a = advanceChapterClock(clock, CHAPTER_CLOCK.quantumMs * 4 + 10);
    expect(a).toEqual(advanceChapterClock(clock, CHAPTER_CLOCK.quantumMs * 4 + 999));
    expect(a.slots).toHaveLength(4);
    expect(advanceChapterClock(a.clock, 0).slots).toEqual([]);
    expect(advanceChapterClock(a.clock, CHAPTER_CLOCK.quantumMs * 4).slots).toEqual([]);
    expect(snapshot(p)).toEqual(before);
  });
  it('caps work and records the omitted interval; split returns preserve retained draws', () => {
    const clock = createChapterClock(6, 0);
    const a = advanceChapterClock(clock, 100 * CHAPTER_CLOCK.quantumMs);
    expect(a.slots).toHaveLength(24);
    expect(a.skipped).toBe(76);
    const split = advanceChapterClock(
      advanceChapterClock(clock, 90 * CHAPTER_CLOCK.quantumMs).clock,
      100 * CHAPTER_CLOCK.quantumMs,
    );
    expect(split.slots).toEqual(a.slots.slice(-10));
    expect(() => advanceChapterClock(clock, Number.NaN)).toThrow();
  });
});
