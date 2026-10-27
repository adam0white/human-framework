/** SCOPE: canonical scheduler topology. Caller endpoints materialize state but do
 * not become opportunities. Owners supply their actual analytic boundaries.
 * No minute/50ms polling, host callbacks, hidden world reads or global scheduler.
 */
import { compareInputs } from './run-admission.ts';
import { canonicalJson, compareCodePoints, hashCanonical } from './run-canonical.ts';
import type * as T from './run-schema.ts';

export function compareScheduled(
  a: T.DeepReadonly<T.ScheduledEvent>,
  b: T.DeepReadonly<T.ScheduledEvent>,
): number {
  if (a.at !== b.at) return a.at < b.at ? -1 : 1;
  if (a.data.kind === 'input' && b.data.kind === 'input') return compareInputs(a.data.input, b.data.input);
  if (a.data.kind === 'input') return -1;
  if (b.data.kind === 'input') return 1;
  return (
    a.phase - b.phase ||
    compareCodePoints(a.person ?? '', b.person ?? '') ||
    compareCodePoints(a.data.kind, b.data.kind) ||
    compareCodePoints(a.causalId, b.causalId) ||
    a.localOrdinal - b.localOrdinal
  );
}
export function frameEntries(
  queue: readonly T.DeepReadonly<T.ScheduledEvent>[],
  at: T.Time,
): readonly T.DeepReadonly<T.ScheduledEvent>[] {
  return queue.filter((event) => event.at === at).sort(compareScheduled);
}
export function nextDailyAt(after: T.Time, anchor: T.Time): T.Result<T.Time> {
  if (!Number.isSafeInteger(after) || !Number.isSafeInteger(anchor))
    return {
      ok: false,
      error: {
        code: 'invalid-schema',
        path: '$.fidelity',
        message: 'daily clocks must be exact integer milliseconds',
      },
    };
  const day = 86400000n;
  const delta = BigInt(after) - BigInt(anchor);
  let quotient = delta / day;
  if (delta % day < 0n) quotient--;
  const next = BigInt(anchor) + (quotient + 1n) * day;
  if (next > BigInt(Number.MAX_SAFE_INTEGER) || next < BigInt(Number.MIN_SAFE_INTEGER))
    return {
      ok: false,
      error: {
        code: 'limit-exceeded',
        path: '$.fidelity',
        message: 'next daily opportunity exceeds exact clock range',
      },
    };
  return { ok: true, value: Number(next) };
}
export function queuedInputs(
  runId: T.Id,
  inputs: readonly T.DeepReadonly<T.Input>[],
): readonly T.ScheduledEvent[] {
  return [...inputs].sort(compareInputs).map((input) => ({
    id: hashCanonical('hf-run4/queued-input', runId, input.id),
    at: input.at,
    phase: 0,
    causalId: input.id,
    localOrdinal: 0,
    // Only newly admitted input bytes are detached; prior queue/history is shared.
    data: { kind: 'input', input: JSON.parse(canonicalJson(input)) as T.Input },
  }));
}
export function calendarSchedule(spec: T.DeepReadonly<T.RunSpec>): readonly T.ScheduledEvent[] {
  const queue: T.ScheduledEvent[] = [];
  const add = (at: T.Time, dayIndex: number, boundary: string, commitments: readonly T.Id[]) => {
    if (at < spec.start) return;
    const causalId = hashCanonical(
      'hf-run4/calendar-cause',
      spec.id,
      spec.definitions.calendar.id,
      dayIndex,
      boundary,
      commitments,
    );
    queue.push({
      id: hashCanonical('hf-run4/scheduled-calendar', causalId, at),
      at,
      phase: 4,
      causalId,
      localOrdinal: 0,
      data: { kind: 'calendar', dayIndex, commitmentIds: commitments },
    });
  };
  for (const day of spec.definitions.calendar.days) {
    add(day.start, day.dayIndex, 'day', []);
    for (const window of day.windows) {
      add(window.from, day.dayIndex, 'window-open', [window.commitmentId]);
      add(window.until, day.dayIndex, 'window-close', [window.commitmentId]);
    }
  }
  return queue.sort(compareScheduled);
}
