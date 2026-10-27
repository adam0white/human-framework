/** SCOPE: pure bounded chapter projection from a supplied wall clock. A slot is a
 * narrative opportunity, never a lived day or a second actor clock. No run state,
 * body recovery, obligation resolution, mutable used-lines or clock reads here.
 */
import { canonicalJson } from './run-canonical.ts';
import type { ChapterClock, ChapterProjection, DeepReadonly, Result } from './run-schema.ts';

const HOUR_MS = 3600000;
const MAX_SLOTS = 24;
export function projectChapterClock(
  input: DeepReadonly<ChapterClock>,
  untilWallMs: number,
): Result<DeepReadonly<ChapterProjection>> {
  let clock: ChapterClock;
  try {
    const data: unknown = JSON.parse(canonicalJson(input));
    if (data === null || typeof data !== 'object' || Array.isArray(data)) throw new TypeError('clock');
    const keys = Object.keys(data);
    if (keys.length !== 4 || keys.some((key) => !['seed', 'wallAtMs', 'slot', 'remainderMs'].includes(key)))
      throw new TypeError('clock fields');
    // Representation and exact keys were checked before this closed scalar read.
    clock = data as ChapterClock;
    if (
      !Number.isInteger(clock.seed) ||
      clock.seed < 0 ||
      clock.seed > 0xffffffff ||
      !Number.isSafeInteger(clock.wallAtMs) ||
      clock.wallAtMs < 0 ||
      !Number.isSafeInteger(clock.slot) ||
      clock.slot < 0 ||
      !Number.isInteger(clock.remainderMs) ||
      clock.remainderMs < 0 ||
      clock.remainderMs >= HOUR_MS ||
      clock.slot !== Math.floor(clock.wallAtMs / HOUR_MS) ||
      clock.remainderMs !== clock.wallAtMs - clock.slot * HOUR_MS
    )
      throw new TypeError('clock scalars');
  } catch {
    return {
      ok: false,
      error: { code: 'invalid-schema', path: '$.clock', message: 'invalid current chapter clock' },
    };
  }
  if (!Number.isSafeInteger(untilWallMs) || untilWallMs < 0)
    return {
      ok: false,
      error: {
        code: 'invalid-schema',
        path: '$.untilWallMs',
        message: 'wall clock must be nonnegative exact milliseconds',
      },
    };
  // Wall rollback does not create a narrative opportunity or erase its watermark.
  const wallAtMs = Math.max(clock.wallAtMs, untilWallMs);
  const end = Math.floor(wallAtMs / HOUR_MS);
  const count = Math.min(MAX_SLOTS, end - clock.slot);
  const slots = Array.from({ length: count }, (_, index) => {
    const slot = end - count + index + 1;
    let h = (clock.seed ^ (slot >>> 0) ^ Math.floor(slot / 0x100000000)) >>> 0;
    h = Math.imul(h ^ (h >>> 16), 0x21f0aaad) >>> 0;
    h = Math.imul(h ^ (h >>> 15), 0x735a2d97) >>> 0;
    return Object.freeze({ slot, atWallMs: slot * HOUR_MS, draw: ((h ^ (h >>> 15)) >>> 0) / 0x100000000 });
  });
  return {
    ok: true,
    value: Object.freeze({
      clock: Object.freeze({ seed: clock.seed, wallAtMs, slot: end, remainderMs: wallAtMs - end * HOUR_MS }),
      slots: Object.freeze(slots),
      skipped: end - clock.slot - count,
    }),
  };
}
