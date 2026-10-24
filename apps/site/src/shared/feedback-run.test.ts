import { expect, it, vi } from 'vitest';
import { optionalFeedbackRun } from './feedback-run.ts';

it('does not let a cancelled or never-replied export block feedback', async () => {
  vi.useFakeTimers();
  try {
    const result = optionalFeedbackRun(() => new Promise(() => {}));
    await vi.advanceTimersByTimeAsync(4000);
    expect(await result).toBeUndefined();
    expect(await optionalFeedbackRun(async () => ({ seed: 1 }))).toEqual({ seed: 1 });
    expect(
      await optionalFeedbackRun(async () => {
        throw new Error('replaced worker');
      }),
    ).toBeUndefined();
    expect(vi.getTimerCount()).toBe(0);
  } finally {
    vi.useRealTimers();
  }
});
