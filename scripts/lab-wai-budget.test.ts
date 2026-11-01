import { describe, expect, it } from 'vitest';
import {
  admissionAccount,
  admissionAllowed,
  DAILY_HARD_NEURONS,
  headroomAllowed,
  reservation,
  usageNeurons,
  utcDate,
} from './lab-wai-budget.ts';

describe('Workers AI admission and response accounting', () => {
  it('admits up to the readable ceiling and preserves the fallback and hard ceilings', () => {
    expect(admissionAllowed(9_800, 9_000, 100)).toBe(true);
    expect(admissionAllowed(9_800, 9_000, 101)).toBe(false);
    expect(admissionAllowed(null, 7_900, 100)).toBe(true);
    expect(admissionAllowed(null, 7_900, 101)).toBe(false);
    expect(admissionAllowed(0, 9_850, 51)).toBe(false);
    expect(admissionAllowed(0, 11_900, 101)).toBe(false);
  });
  it('adds local growth to a cached account snapshot and rejects a previous UTC day', () => {
    const account = {
      date: utcDate(),
      neurons: 7000,
      remaining: 3000,
      localCompletedAtRead: 1000,
      measuredAt: new Date().toISOString(),
    };
    expect(admissionAccount(account, 1500)).toBe(7500);
    expect(admissionAccount(account, 500)).toBe(7000);
    // A snapshot during an in-flight 100-neuron reservation has only 1000 completed.
    // Refunding that request to 10 must not hide the next reservation of 90.
    const pending = { ...account, neurons: 9800, localCompletedAtRead: 1000 };
    expect(admissionAccount(pending, 1100)).toBe(9900);
    expect(admissionAllowed(admissionAccount(pending, 1100), 1100, 90)).toBe(false);
    expect(admissionAccount({ ...account, date: '2000-01-01' }, 1500)).toBeNull();
  });
  it('preserves best-effort play and control headroom against both admission gates', () => {
    expect(headroomAllowed('preplay', 4_300, 4_000, 100, 1)).toBe(true);
    expect(headroomAllowed('preplay', 4_301, 4_000, 100, 1)).toBe(false);
    expect(headroomAllowed('preplay', null, 2_401, 100, 1)).toBe(false);
    expect(headroomAllowed('focused', 8_800, 8_000, 100, 1)).toBe(true);
    expect(headroomAllowed('focused', 8_801, 8_000, 100, 1)).toBe(false);
    expect(headroomAllowed('control', 9_800, 9_000, 100, 1)).toBe(true);
    expect(headroomAllowed('preplay', 0, 0, 100, 3.96)).toBe(false);
  });
  it('charges token usage at the published rate and rejects missing input usage', () => {
    expect(
      usageNeurons('@cf/qwen/qwen3-30b-a3b-fp8', {
        usage: { prompt_tokens: 1000, completion_tokens: 100 },
      }),
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

// Exercise the same R2 admission used by scripts and the public translator.
const { admitDaily, dailyKey } = await import('../apps/site/worker/wai-budget.ts');
function dailyBucket() {
  const values = new Map<string, { raw: string; etag: string }>();
  let revision = 0;
  return {
    async get(key: string) {
      const old = values.get(key);
      return old
        ? {
            key,
            size: old.raw.length,
            uploaded: new Date(),
            etag: old.etag,
            text: async () => old.raw,
            json: async <T>() => JSON.parse(old.raw) as T,
          }
        : null;
    },
    async put(
      key: string,
      value: string | ArrayBuffer | Uint8Array,
      options?: {
        onlyIf?: { etagMatches?: string; etagDoesNotMatch?: string };
      },
    ) {
      const old = values.get(key);
      if (options?.onlyIf?.etagMatches ? old?.etag !== options.onlyIf.etagMatches : old) return null;
      const etag = String(++revision);
      values.set(key, { raw: String(value), etag });
      return { key, etag, size: String(value).length, uploaded: new Date() };
    },
    async delete() {},
    async list() {
      return { objects: [], truncated: false };
    },
  };
}
it('combines script high-water accounting and concurrent translator reservations at 12,000', async () => {
  const b = dailyBucket();
  expect(await admitDaily(b, '2026-10-23', 'local', 11_000)).toBe(true);
  const admitted = await Promise.all(
    Array.from({ length: 8 }, () => admitDaily(b, '2026-10-23', 'translator', 500)),
  );
  expect(admitted.filter(Boolean)).toHaveLength(2);
  expect(await admitDaily(b, '2026-10-23', 'local', 11_001)).toBe(false);
  expect(await admitDaily(b, '2026-10-23', 'translator', 1)).toBe(false);
  expect(await admitDaily(b, '2026-10-24', 'local', 8_000)).toBe(true);
  const stored = await b.get(dailyKey('2026-10-23'));
  if (!stored) throw new Error('Missing daily accounting');
  expect(JSON.parse(await stored.text())).toMatchObject({
    local: 11_000,
    translator: 1_000,
  });
});
