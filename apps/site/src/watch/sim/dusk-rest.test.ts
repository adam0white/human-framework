import { describe, expect, it } from 'vitest';
import { applyDuskRest, duskRestAccount, resolveDuskRest } from './dusk-rest.ts';
import { nightEnd, suggestions } from './night.ts';
import { personOf, WatchWorld } from './people.ts';
import { replay, WatchRun } from './run.ts';

const fresh = () => {
  const r = new WatchRun(2026, undefined, undefined, { duskRest: 'dusk-rest@1' });
  r.input({ k: 'start' });
  r.step();
  return r;
};
const raw = (r: WatchRun) => JSON.stringify(r.state);
function proveReplay(r: WatchRun) {
  const full = JSON.parse(JSON.stringify(r.export()));
  expect(JSON.stringify(replay(full))).toBe(raw(r));
  const { end: _end, ...compact } = full;
  expect(JSON.stringify(replay(compact))).toBe(raw(r));
  const loaded = WatchRun.resume(JSON.parse(r.snapshotText()));
  expect(raw(loaded)).toBe(raw(r));
  for (let i = 0; i < 10; i++) {
    r.step();
    loaded.step();
  }
  expect(raw(loaded)).toBe(raw(r));
}
describe('explicit dusk night off', () => {
  it('keeps default admission exact and rejects mismatched saved/replayed options', () => {
    const legacy = new WatchRun(2026);
    legacy.input({ k: 'start' });
    legacy.step();
    const before = JSON.stringify(legacy.snapshot());
    expect(legacy.input({ k: 'dusk-rest', who: 'tamar', until: 'dawn' })).toBe(false);
    expect(JSON.stringify(legacy.snapshot())).toBe(before);
    expect(legacy.export().scenario).toBe(20);
    expect(legacy.state).not.toHaveProperty('duskRest');
    const r = fresh();
    expect(r.export().scenario).toBe(21);
    expect(() => WatchRun.resume({ ...r.snapshot(), scenario: 17 })).toThrow();
    expect(() => WatchRun.resume({ ...legacy.snapshot(), scenario: 18 })).toThrow();
    expect(() => replay({ ...r.export(), options: undefined })).toThrow();
    expect(() => replay({ ...legacy.export(), options: { duskRest: 'dusk-rest@1' } })).toThrow();
    expect(() => new WatchRun(1, undefined, undefined, { duskRest: 'unknown' } as never)).toThrow();
    proveReplay(legacy);
  });
  it('records an actual refusal without claiming rest, and preserves pending full/compact replay', () => {
    const r = fresh();
    expect(r.input({ k: 'dusk-rest', who: 'tamar', until: 'dawn' })).toBe(true);
    proveReplay(r);
    const request = r.state.duskRest?.requests.tamar;
    expect(request?.status).toBe('refused');
    expect(request?.decisionAt).toBe(1021);
    expect(request?.begunAt).toBeUndefined();
    expect(duskRestAccount(request!)).toContain('declined');
    expect(suggestions(r.state).tamar?.[0]?.affordanceId).toBe('post:gate-1');
    proveReplay(r);
  });
  it('lets HF defer, begin, finish at dawn and later actually resume watch, without changing the post plan', () => {
    const r = fresh(),
      s = r.state,
      p = personOf(s, 'tamar')!;
    // Lawful tired-body fixture. No decision/event is fabricated and no need is healed by the request.
    p.body.sleepPressure = 0.95;
    expect(r.input({ k: 'dusk-rest', who: 'tamar', until: 'dawn' })).toBe(true);
    const pending = WatchRun.resume(r.snapshot());
    expect(raw(pending)).toBe(raw(r));
    const post = s.posts.tamar;
    const offered = new WatchWorld(s).affordancesFor(p).find((a) => a.id === 'dusk-rest');
    expect(offered?.duration).toBe(nightEnd(s) - p.now);
    r.step();
    pending.step();
    expect(raw(pending)).toBe(raw(r));
    expect(s.duskRest?.requests.tamar?.status).toBe('deferred');
    r.input({ k: 'begin' });
    pending.input({ k: 'begin' });
    expect(suggestions(s).tamar?.[0]?.affordanceId).toBe('dusk-rest');
    while (s.minute < 1100) {
      r.step();
      pending.step();
    }
    expect(raw(pending)).toBe(raw(r));
    expect(s.duskRest?.requests.tamar).toMatchObject({ status: 'resting', begunAt: 1080, until: 1800 });
    expect(s.posts.tamar).toBe(post);
    expect(s.place.tamar).toBe('home');
    const loaded = WatchRun.resume(r.snapshot());
    while (s.phase === 'night') {
      r.step();
      loaded.step();
    }
    expect(raw(loaded)).toBe(raw(r));
    expect(s.duskRest?.requests.tamar).toMatchObject({ status: 'ended', endedAt: 1800 });
    expect(s.duskRest?.requests.tamar?.returnedAt).toBeUndefined();
    expect(duskRestAccount(s.duskRest!.requests.tamar!)).toContain('not yet seen');
    r.input({ k: 'toDusk' });
    for (let i = 0; i < 60 && !s.duskRest?.requests.tamar?.returnedAt; i++) r.step();
    expect(s.duskRest?.requests.tamar?.status).toBe('returned');
    expect(s.duskRest?.requests.tamar?.returnedAt).toBeGreaterThanOrEqual(1800);
  });
  it('reaches a villager at the planned post and answers before night', () => {
    const r = fresh();
    r.state.place.tamar = 'village';
    r.input({ k: 'lantern', section: 'gate' });
    expect(r.input({ k: 'dusk-rest', who: 'tamar', until: 'dawn' })).toBe(true);
    expect(r.state.duskRest?.requests.tamar?.status).not.toBe('pending');
    expect(r.state.phase).toBe('dusk');
  });
  it('expires unanswered requests and never reports a return without begun rest', () => {
    const r = fresh();
    applyDuskRest(r.state, { k: 'dusk-rest', who: 'tamar', until: 'dawn' });
    const request = r.state.duskRest!.requests.tamar!;
    resolveDuskRest(r.state, [], request.until);
    expect(request.status).toBe('expired');
    expect(request.begunAt).toBeUndefined();
    expect(request.returnedAt).toBeUndefined();
  });
});
