/**
 * Scope: pure, bounded host chapter scheduling from a supplied real-time clock. A slot is a coarse
 * narrative opportunity, not a lived day. This helper touches no Person, resolves no obligations,
 * and performs no body recovery. Hosts own fiction, persistence, admission and consent.
 */
export const CHAPTER_CLOCK = { version: 'hf-chapter-clock/1', quantumMs: 3_600_000, maxSlots: 24 } as const;
export interface ChapterClock {
  version: 'hf-chapter-clock/1';
  watermark: number;
  seed: number;
}
export interface ChapterAdvance {
  clock: ChapterClock;
  slots: { at: number; draw: number }[];
  skipped: number;
}
function slot(nowMs: number): number {
  if (!Number.isSafeInteger(nowMs) || nowMs < 0) throw new Error('Invalid chapter clock.');
  return Math.floor(nowMs / CHAPTER_CLOCK.quantumMs);
}
export function createChapterClock(seed: number, nowMs: number): ChapterClock {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new Error('Invalid chapter seed.');
  return { version: CHAPTER_CLOCK.version, watermark: slot(nowMs), seed };
}
/** Stateless seeded draw per absolute slot: splitting returns does not alter a retained slot's result. */
export function advanceChapterClock(clock: ChapterClock, nowMs: number): ChapterAdvance {
  if (
    clock.version !== CHAPTER_CLOCK.version ||
    !Number.isSafeInteger(clock.watermark) ||
    clock.watermark < 0 ||
    !Number.isInteger(clock.seed) ||
    clock.seed < 0 ||
    clock.seed > 0xffffffff
  )
    throw new Error('Unsupported chapter clock.');
  const end = Math.max(clock.watermark, slot(nowMs));
  const count = Math.min(CHAPTER_CLOCK.maxSlots, end - clock.watermark);
  const slots = Array.from({ length: count }, (_, i) => {
    const at = end - count + i + 1;
    let h = (clock.seed ^ (at >>> 0) ^ Math.floor(at / 0x100000000)) >>> 0;
    h = Math.imul(h ^ (h >>> 16), 0x21f0aaad) >>> 0;
    h = Math.imul(h ^ (h >>> 15), 0x735a2d97) >>> 0;
    return { at, draw: ((h ^ (h >>> 15)) >>> 0) / 0x100000000 };
  });
  return { clock: { ...clock, watermark: end }, slots, skipped: end - clock.watermark - count };
}
