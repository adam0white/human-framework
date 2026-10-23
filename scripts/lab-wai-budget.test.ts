import { describe, expect, it } from 'vitest';
import { DAILY_HARD_NEURONS, reservation, usageNeurons, utcDate } from './lab-wai-budget.ts';

describe('Workers AI admission and response accounting', () => {
  it('charges token usage at the published rate and rejects missing input usage', () => {
    expect(
      usageNeurons('@cf/qwen/qwen3-30b-a3b-fp8', { usage: { prompt_tokens: 1000, completion_tokens: 100 } }),
    ).toBeCloseTo(7.6725);
    expect(() => usageNeurons('@cf/cloudflare/clef', { answers: {} })).toThrow('usage unreadable');
  });
  it('reserves each Clairic field pass and bounds generated tokens', () => {
    const one = reservation('@cf/cloudflare/clairic', {
      state: 'Ask Halil tomorrow',
      fields: { target: { type: 'text' } },
    });
    const two = reservation('@cf/cloudflare/clairic', {
      state: 'Ask Halil tomorrow',
      fields: { target: { type: 'text' }, time: { type: 'text' } },
    });
    expect(two).toBeGreaterThan(one * 1.9);
    expect(() => reservation('@cf/qwen/qwen3-30b-a3b-fp8', { max_tokens: 10_000 })).toThrow();
    expect(() => reservation('unapproved', { max_tokens: 1 })).toThrow();
  });
  it('reserves the full vision context independently of image compression', () => {
    const n = reservation('@cf/meta/llama-3.2-11b-vision-instruct', {
      prompt: 'What can I touch?',
      image: [1, 2],
      max_tokens: 768,
    });
    expect(n).toBeGreaterThan((128_000 * 4410) / 1e6);
    expect(n).toBeLessThan(DAILY_HARD_NEURONS);
  });
  it('uses UTC days across Chicago local dates and DST', () => {
    expect(utcDate(new Date('2026-11-02T18:40:00-06:00'))).toBe('2026-11-03');
    expect(utcDate(new Date('2026-10-23T19:40:00-05:00'))).toBe('2026-10-24');
  });
});
