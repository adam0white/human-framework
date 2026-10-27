import { afterEach, expect, it, vi } from 'vitest';
import { linkedTransport, retryAfterMs } from '../src/linked.ts';

// Fake clock, real event loop: compression and hashing finish between steps.
async function pass(ms: number) {
  for (let step = 0; step < 100; step++) {
    await new Promise((resolve) => setImmediate(resolve));
    await vi.advanceTimersByTimeAsync(ms / 100);
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

// Valley 2026-10-27: a reload with many saved records sent ~513 POSTs, all 429, within seconds.
it('pauses the whole queue after a 429, honours Retry-After and stops each pass at its first failure', async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
  vi.stubGlobal('indexedDB', undefined);
  vi.spyOn(Math, 'random').mockReturnValue(0);
  let throttled = true;
  let held: (() => void)[] | undefined = [];
  let open = 0;
  let most = 0;
  const posts: number[] = [];
  vi.stubGlobal('fetch', async (_url: string, init: RequestInit) => {
    posts.push(Date.now());
    most = Math.max(most, ++open);
    try {
      // The first requests stay open until every replayed send is waiting for a slot.
      if (held) await new Promise<void>((resolve) => held?.push(resolve));
      if (throttled) return new Response(null, { status: 429, headers: { 'Retry-After': '30' } });
      const value = await new Response(
        (init.body as Blob).stream().pipeThrough(new DecompressionStream('gzip')),
      ).json();
      return Response.json({ ok: true, id: value.id });
    } finally {
      open--;
    }
  });
  const transport = linkedTransport({
    game: 'valley',
    endpoint: '/lab/api',
    link: () => ({ player: 'a'.repeat(32), session: 'b'.repeat(32), runId: 'c'.repeat(32) }),
    build: () => ({}),
    enabled: () => true,
    override: () => false,
  });
  // A journal replay on reload: every saved entry asks for delivery at once.
  const replay = Array.from({ length: 12 }, (_, i) =>
    transport.send('events', { e: [i] }, undefined, undefined, 'due').catch(() => 'kept'),
  );
  await pass(200);
  expect(posts).toHaveLength(2);
  const release = held ?? [];
  held = undefined;
  for (const resolve of release) resolve();
  expect(await Promise.all(replay)).toEqual(Array(12).fill('kept'));
  expect(posts).toHaveLength(2);
  await transport.drain();
  await pass(29000);
  expect(posts).toHaveLength(2);
  // After Retry-After, one pass tries one record, fails, and stops.
  await pass(2000);
  expect(posts).toHaveLength(3);
  throttled = false;
  await pass(150000);
  // The two 429s at the start leave records backed off; all twelve land once each.
  expect(posts.length).toBe(15);
  expect(most).toBeLessThanOrEqual(2);
  transport.dispose();
});

it('reads Retry-After as seconds or an HTTP date, capped', () => {
  expect(retryAfterMs('30')).toBe(30000);
  expect(retryAfterMs(new Date(Date.now() + 60000).toUTCString())).toBeGreaterThan(58000);
  expect(retryAfterMs('999999')).toBe(15 * 60 * 1000);
  expect(retryAfterMs('soon')).toBe(0);
  expect(retryAfterMs(null)).toBe(0);
});
