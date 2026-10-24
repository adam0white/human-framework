import { advanceChapterClock, CHAPTER_CLOCK, createChapterClock } from '../src/index.ts';

const initial = createChapterClock(23, 0);
const week = advanceChapterClock(initial, 168 * CHAPTER_CLOCK.quantumMs);
const repeated = advanceChapterClock(week.clock, 168 * CHAPTER_CLOCK.quantumMs);
if (week.slots.length !== 24 || week.skipped !== 144 || repeated.slots.length !== 0)
  throw new Error('chapter control failed');
console.log(
  JSON.stringify({
    slots: week.slots.length,
    omitted: week.skipped,
    repeated: repeated.slots.length,
    deterministic:
      JSON.stringify(week) === JSON.stringify(advanceChapterClock(initial, 168 * CHAPTER_CLOCK.quantumMs)),
  }),
);
