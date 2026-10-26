import { tick } from '@adam0white/human-framework';
import { expect, it } from 'vitest';
import { personOf } from './people.ts';
import { replay, WatchRun } from './run.ts';

it('admits only a fresh explicit warning edition, with optional night-off coexistence', () => {
  const r = new WatchRun(2026, undefined, undefined, { localWarning: 'local-warning@1' });
  expect(r.export().scenario).toBe(16);
  expect(r.export().options).toEqual({ localWarning: 'local-warning@1' });
  const both = new WatchRun(2026, undefined, undefined, {
    localWarning: 'local-warning@1',
    duskRest: 'dusk-rest@1',
  });
  expect(both.export().scenario).toBe(16);
  expect(() => new WatchRun(1, undefined, undefined, { localWarning: 'wrong' } as never)).toThrow();
  expect(() => new WatchRun(1, undefined, undefined, [] as never)).toThrow();
  expect(() => new WatchRun(1, undefined, undefined, { localWarning: null } as never)).toThrow();
  expect(() => new WatchRun(1, undefined, undefined, { warning: 'local-warning@1' } as never)).toThrow();
  const malformed = r.snapshot();
  malformed.state.localWarning = { edition: 'wrong', receipts: {} } as never;
  expect(() => WatchRun.resume(malformed)).toThrow();
  const unchanged = r.snapshotText();
  expect(r.input({ k: 'local-warning', who: 'tamar', threat: 'wolves' } as never)).toBe(false);
  expect(r.snapshotText()).toBe(unchanged);
  expect(() => new WatchRun(r.seed, r.snapshot(), undefined, { localWarning: 'local-warning@1' })).toThrow();
  for (const old of [
    new WatchRun(2026),
    new WatchRun(2026, undefined, undefined, { duskRest: 'dusk-rest@1' }),
  ]) {
    const before = old.snapshotText();
    expect(old.input({ k: 'local-warning', who: 'tamar' })).toBe(false);
    expect(old.snapshotText()).toBe(before);
    expect(() =>
      WatchRun.resume({
        ...old.snapshot(),
        log: [{ m: old.state.minute, i: { k: 'local-warning', who: 'tamar' } }],
      }),
    ).toThrow();
  }
  expect(() => WatchRun.resume({ ...r.snapshot(), scenario: 14 })).toThrow();
  expect(() => replay({ ...r.export(), options: undefined })).toThrow();
});

it('delivers a caution through HF attention to a nearby awake watcher and blocks a sleeper without waking them', () => {
  const r = new WatchRun(2026, undefined, undefined, { localWarning: 'local-warning@1' });
  r.input({ k: 'start' });
  r.input({ k: 'begin' });
  r.step();
  const s = r.state,
    p = personOf(s, 'tamar');
  if (!p) throw new Error('Missing watcher');
  const costs = JSON.stringify({
    bell: s.bell,
    rope: s.rope,
    asks: s.asks,
    commands: s.commands,
    minute: s.minute,
    rng: s.rng,
    world: s.world,
    posts: s.posts,
    place: s.place,
  });
  const memory = JSON.stringify(p.memory);
  expect(r.input({ k: 'local-warning', who: 'tamar' })).toBe(true);
  expect(s.localWarning?.receipts.tamar).toMatchObject({ status: 'pending' });
  expect(JSON.stringify(p.memory)).toBe(memory);
  expect(
    JSON.stringify({
      bell: s.bell,
      rope: s.rope,
      asks: s.asks,
      commands: s.commands,
      minute: s.minute,
      rng: s.rng,
      world: s.world,
      posts: s.posts,
      place: s.place,
    }),
  ).toBe(costs);
  r.step();
  expect(s.localWarning?.receipts.tamar).toMatchObject({ status: 'delivered', heard: true });
  expect(JSON.stringify(p.memory)).not.toBe(memory);
  // Lawful blocked contrast: public input must not wake a sleeping person or change any field.
  const blocked = WatchRun.resume(r.snapshot());
  const sleeper = personOf(blocked.state, 'tamar');
  if (!sleeper) throw new Error('Missing watcher');
  sleeper.body.asleep = true;
  const before = blocked.snapshotText();
  expect(blocked.input({ k: 'local-warning', who: 'tamar' })).toBe(false);
  expect(blocked.snapshotText()).toBe(before);
  const full = JSON.parse(JSON.stringify(r.export()));
  expect(JSON.stringify(replay(full))).toBe(JSON.stringify(s));
  const { end: _end, ...compact } = full;
  expect(JSON.stringify(replay(compact))).toBe(JSON.stringify(s));
  const loaded = WatchRun.resume(JSON.parse(r.snapshotText()));
  expect(loaded.snapshotText()).toBe(r.snapshotText());
  for (let i = 0; i < 30; i++) {
    r.step();
    loaded.step();
  }
  expect(loaded.snapshotText()).toBe(r.snapshotText());
});

// One correction group: actual public perception time and ordinary-JSON admission.
it('queues speech until the actual actor boundary and encodes one genuine episode there', () => {
  const r = new WatchRun(2026, undefined, undefined, { localWarning: 'local-warning@1' });
  r.input({ k: 'start' });
  r.input({ k: 'begin' });
  r.step();
  const p = personOf(r.state, 'tamar');
  if (!p) throw new Error('Missing watcher');
  const control = WatchRun.resume(r.snapshot());
  const before = JSON.stringify(p);
  const saidAt = r.state.minute;
  expect(p.now).toBeLessThan(saidAt);
  expect(r.input({ k: 'local-warning', who: 'tamar' })).toBe(true);
  expect.soft(JSON.stringify(p) === before).toBe(true);
  expect.soft(r.state.localWarning?.receipts.tamar).toMatchObject({ status: 'pending', saidAt });
  r.step();
  control.step();
  const episodes = p.memory.episodes.filter((e) => e.action === 'local-warning');
  expect(episodes).toHaveLength(1);
  expect.soft(episodes[0]?.at).toBe(saidAt);
  expect(p.now).toBe(saidAt);
  expect(r.state.localWarning?.receipts.tamar).toMatchObject({ at: p.now, heard: true, status: 'delivered' });
  expect(p.nextDecision).toBe(personOf(control.state, 'tamar')?.nextDecision);
  r.step();
  expect(p.memory.episodes.filter((e) => e.action === 'local-warning')).toHaveLength(1);
});

it('waits for a whole boundary when the public actor clock is fractional', () => {
  const r = new WatchRun(2026, undefined, undefined, { localWarning: 'local-warning@1' });
  r.input({ k: 'start' });
  r.input({ k: 'begin' });
  r.step();
  const p = personOf(r.state, 'tamar');
  if (!p) throw new Error('Missing watcher');
  tick(p, r.state.minute + 0.5);
  const before = JSON.stringify(p);
  expect(r.input({ k: 'local-warning', who: 'tamar' })).toBe(true);
  expect.soft(JSON.stringify(p) === before).toBe(true);
  r.step();
  expect(p.memory.episodes.filter((e) => e.action === 'local-warning')).toHaveLength(0);
  r.step();
  const episode = p.memory.episodes.find((e) => e.action === 'local-warning');
  expect(episode?.at).toBe(p.now);
  expect(Number.isInteger(episode?.at)).toBe(true);
  expect(r.state.localWarning?.receipts.tamar).toMatchObject({ at: p.now, status: 'delivered' });
});

it('rejects inherited cast names in ordinary JSON receipts and warning input logs', () => {
  const r = new WatchRun(2026, undefined, undefined, { localWarning: 'local-warning@1' });
  const receipt = JSON.parse(r.snapshotText());
  receipt.state.localWarning.receipts.constructor = {
    saidAt: receipt.state.minute,
    status: 'delivered',
    at: receipt.state.minute,
    heard: true,
  };
  expect.soft(() => WatchRun.resume(receipt)).toThrow();
  const log = JSON.parse(r.snapshotText());
  log.log.push({ m: log.state.minute, i: { k: 'local-warning', who: 'constructor' } });
  expect(() => WatchRun.resume(log)).toThrow();
});

it('retains each repeated pending speech through native load and rejects future warning sources', () => {
  const r = new WatchRun(2026, undefined, undefined, { localWarning: 'local-warning@1' });
  r.input({ k: 'start' });
  r.input({ k: 'begin' });
  r.step();
  expect(r.input({ k: 'local-warning', who: 'tamar' })).toBe(true);
  expect(r.input({ k: 'local-warning', who: 'tamar' })).toBe(true);
  const pending = WatchRun.resume(JSON.parse(r.snapshotText()));
  expect(pending.snapshotText()).toBe(r.snapshotText());
  r.step();
  pending.step();
  expect(pending.snapshotText()).toBe(r.snapshotText());
  expect(r.state.localWarning?.pending).toHaveLength(0);
  expect(
    personOf(r.state, 'tamar')?.memory.episodes.filter((e) => e.action === 'local-warning'),
  ).toHaveLength(2);
  const future = JSON.parse(r.snapshotText());
  future.log.at(-1).m = future.state.minute + 1;
  expect(() => WatchRun.resume(future)).toThrow();
  const futureReceipt = JSON.parse(r.snapshotText());
  futureReceipt.state.localWarning.receipts.tamar.at = futureReceipt.state.minute + 1;
  expect(() => WatchRun.resume(futureReceipt)).toThrow();
});

it('rechecks delivery eligibility after the normal driver and consumes an undeliverable caution once', () => {
  const r = new WatchRun(2026, undefined, undefined, { localWarning: 'local-warning@1' });
  r.input({ k: 'start' });
  r.input({ k: 'begin' });
  r.step();
  expect(r.input({ k: 'local-warning', who: 'tamar' })).toBe(true);
  // Synthetic native guard contrast: a person asleep by delivery is never woken by speech.
  const snap = JSON.parse(r.snapshotText());
  const sleeping = snap.state.community.people.find((p: { id: string }) => p.id === 'tamar');
  sleeping.body.asleep = true;
  sleeping.activity.mode = 'sleep';
  sleeping.activity.action = 'sleep';
  sleeping.activity.affordance.mode = 'sleep';
  const blocked = WatchRun.resume(snap);
  const p = personOf(blocked.state, 'tamar');
  blocked.step();
  expect(p?.body.asleep).toBe(true);
  expect(p?.memory.episodes.filter((e) => e.action === 'local-warning')).toHaveLength(0);
  expect(blocked.state.localWarning?.receipts.tamar).toMatchObject({ status: 'unavailable' });
  expect(blocked.state.localWarning?.pending).toHaveLength(0);
  blocked.step();
  expect(p?.memory.episodes.filter((e) => e.action === 'local-warning')).toHaveLength(0);
  const before = blocked.snapshotText();
  expect(blocked.input({ k: 'local-warning', who: 'tamar' })).toBe(false);
  expect(blocked.snapshotText()).toBe(before);
});
