import { expect, test } from 'vitest';
import { projectChapterClock } from '../src/chapter-clock.ts';
import type { ChapterClock } from '../src/run-schema.ts';

const HOUR = 3600000;
const clock = (seed: number): ChapterClock => ({ seed, wallAtMs: 0, slot: 0, remainderMs: 0 });

test('chapter slots preserve retained draws, fractions, rollback and repeat purity', () => {
  const input = Object.freeze(clock(17));
  const a = projectChapterClock(input, 4 * HOUR + 10);
  const b = projectChapterClock(input, 4 * HOUR + 999);
  if (!a.ok || !b.ok) throw new Error('valid chapter clock rejected');
  expect(a.value.slots).toEqual(b.value.slots);
  expect(a.value.slots.map((x) => x.slot)).toEqual([1, 2, 3, 4]);
  expect(a.value.clock.remainderMs).toBe(10);
  expect(b.value.clock.remainderMs).toBe(999);
  expect(projectChapterClock(input, 4 * HOUR + 10)).toEqual(a);
  const rolledBack = projectChapterClock(a.value.clock, 0);
  expect(rolledBack).toEqual({ ok: true, value: { clock: a.value.clock, slots: [], skipped: 0 } });
  expect(input).toEqual(clock(17));
  expect(Object.isFrozen(a.value.slots)).toBe(true);
});

test('chapter work stays at24slots and reports skipped time without changing retained draws', () => {
  const input = clock(6);
  const all = projectChapterClock(input, 100 * HOUR);
  const first = projectChapterClock(input, 90 * HOUR);
  if (!all.ok || !first.ok) throw new Error('valid chapter clock rejected');
  const split = projectChapterClock(first.value.clock, 100 * HOUR);
  if (!split.ok) throw new Error(split.error.message);
  expect(all.value.slots).toHaveLength(24);
  expect(all.value.skipped).toBe(76);
  expect(split.value.slots).toEqual(all.value.slots.slice(-10));
  expect(projectChapterClock(input, Number.NaN).ok).toBe(false);
  expect(projectChapterClock({ ...input, remainderMs: 1 }, HOUR).ok).toBe(false);
});
