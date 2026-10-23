import { expect, test, vi } from 'vitest';
import type { Env } from '../../worker/lab.ts';
import { reserveTranslation, type TranslationEnv, translate } from '../../worker/translate.ts';
import { admitDaily } from '../../worker/wai-budget.ts';

function bucket(): Env['LAB'] {
  const values = new Map<string, { raw: string; revision: number }>();
  let revision = 0;
  return {
    async get(key) {
      const captured = values.get(key)?.raw ?? null;
      const etag = String(values.get(key)?.revision ?? 0);
      return captured === null
        ? null
        : {
            key,
            etag,
            size: captured.length,
            uploaded: new Date(),
            text: async () => captured,
            json: async <T>() => JSON.parse(captured) as T,
          };
    },
    async put(key, value, options) {
      if (
        options?.onlyIf?.etagMatches !== undefined
          ? options.onlyIf.etagMatches !== String(values.get(key)?.revision ?? 0)
          : values.has(key)
      )
        return null;
      const raw = String(value);
      revision++;
      values.set(key, { raw, revision });
      return { key, etag: String(revision), size: raw.length, uploaded: new Date() };
    },
    async delete() {},
    async list() {
      return { objects: [], truncated: false };
    },
  };
}
test('concurrent reservations preserve the daily and lifetime hard caps', async () => {
  const b = bucket();
  const results = await Promise.all(
    Array.from({ length: 20 }, (_, i) => reserveTranslation(b, `browser${i}`, '2026-10-23')),
  );
  expect(results.filter(Boolean).length).toBeLessThanOrEqual(10);
  let total = results.filter(Boolean).length;
  for (let day = 24; day < 29; day++)
    for (let i = 0; i < 10; i++) total += Number(await reserveTranslation(b, 'browser', `2026-10-${day}`));
  expect(total).toBe(25);
});
test('invalid bodies and missing binding never invoke AI or reserve capacity', async () => {
  const env: TranslationEnv = { LAB: bucket() };
  expect((await translate({ text: 'x' }, env)).status).toBe(400);
  expect(
    (
      await translate(
        {
          text: 'rest',
          browser: '00000000-0000-0000-0000-000000000000',
          acts: [{ id: 'rest', label: 'Rest' }],
        },
        env,
      )
    ).status,
  ).toBe(503);
  for (let i = 0; i < 10; i++) expect(await reserveTranslation(env.LAB, 'browser', '2026-10-23')).toBe(true);
  expect(await reserveTranslation(env.LAB, 'browser', '2026-10-23')).toBe(false);
});

test('a provider error reserves the failed call and blocks subsequent inference', async () => {
  const env: TranslationEnv = {
    LAB: bucket(),
    AI: {
      async run() {
        throw Error('provider usage limit');
      },
    },
  };
  const input = {
    text: 'rest',
    browser: '00000000-0000-0000-0000-000000000000',
    acts: [{ id: 'rest', label: 'Rest' }],
  };
  expect((await translate(input, env)).status).toBe(503);
  expect((await translate(input, env)).status).toBe(429);
  expect(await reserveTranslation(env.LAB, 'other', '2026-10-24')).toBe(false);
});

test('translator dispatch shares the scripts daily ceiling', async () => {
  let calls = 0;
  const env: TranslationEnv = {
    LAB: bucket(),
    AI: {
      async run() {
        calls++;
        return {};
      },
    },
  };
  expect(await admitDaily(env.LAB, new Date().toISOString().slice(0, 10), 'local', 11999)).toBe(true);
  expect(
    (
      await translate(
        {
          text: 'rest',
          browser: '00000000-0000-0000-0000-000000000000',
          acts: [{ id: 'rest', label: 'Rest' }],
        },
        env,
      )
    ).status,
  ).toBe(429);
  expect(calls).toBe(0);
});

test('Clairic must reserve against the new UTC day after a midnight Clef response', async () => {
  vi.useFakeTimers();
  try {
    vi.setSystemTime(new Date('2026-10-23T23:59:59Z'));
    let calls = 0;
    const env: TranslationEnv = {
      LAB: bucket(),
      AI: {
        async run() {
          calls++;
          vi.setSystemTime(new Date('2026-10-24T00:00:01Z'));
          return {};
        },
      },
    };
    await admitDaily(env.LAB, '2026-10-24', 'local', 12000);
    expect(
      (
        await translate(
          {
            text: 'rest',
            browser: '00000000-0000-0000-0000-000000000000',
            acts: [{ id: 'rest', label: 'Rest' }],
          },
          env,
        )
      ).status,
    ).toBe(429);
    expect(calls).toBe(1);
  } finally {
    vi.useRealTimers();
  }
});
