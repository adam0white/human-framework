/** A spoken night-off offer changes no body or choice without public HF events. */
import { describe, expect, it } from 'vitest';
import { requireValue } from '../../shared/require-value.ts';
import { physicalLedger } from './actor-world.ts';
import { type DuskRestRequest, duskRestAccount, endDuskRest } from './dusk-rest.ts';
import { replay, ruleHash, WatchRun } from './run.ts';

const fresh = () => {
  const run = new WatchRun(2026);
  run.input({ k: 'start' });
  run.input({ k: 'post', watcher: 'tamar', post: 'east-1' });
  run.input({ k: 'lantern', section: 'east' });
  return run;
};
describe('explicit dusk night off through HF4', () => {
  it('uses one current rule set and rejects older scenarios without changing the run', () => {
    const run = fresh();
    expect(run.state.duskRest?.edition).toBe('dusk-rest@1');
    expect(run.state.localWarning?.edition).toBe('local-warning@1');
    expect(run.export().scenario).toBe(25);
    const before = run.snapshotText();
    expect(run.input({ k: 'dusk-rest', who: 'not-a-watcher', until: 'dawn' })).toBe(false);
    expect(run.snapshotText()).toBe(before);
    expect(() => WatchRun.resume({ ...run.snapshot(), scenario: 23 })).toThrow(/begin a new winter/);
    expect(() => WatchRun.resume({ ...run.snapshot(), scenario: 24 })).toThrow(/begin a new winter/);
    expect(() => WatchRun.resume({ ...run.snapshot(), origin: null } as never)).toThrow(/begin a new winter/);
    expect(() => WatchRun.resume({ ...run.snapshot(), unknownField: true } as never)).toThrow(
      /begin a new winter/,
    );
    expect(() => replay({ ...run.export(), origin: null } as never)).toThrow(/begin a new winter/);
    expect(run.input({ k: 'dusk-rest', who: 'tamar', until: 'dawn' })).toBe(true);
  });
  it('keeps the actual answer and any observed rest through pending cold restore and complete replay', () => {
    const run = fresh();
    const post = run.state.posts.tamar;
    expect(run.input({ k: 'dusk-rest', who: 'tamar', until: 'dawn' })).toBe(true);
    const first = requireValue(run.state.duskRest?.requests.tamar);
    expect(first.priorPost).toBe(post);
    expect(first.begunAt).toBeUndefined();
    const cold = WatchRun.resume(JSON.parse(run.snapshotText()));
    expect(cold.snapshotText()).toBe(run.snapshotText());
    run.input({ k: 'begin' });
    cold.input({ k: 'begin' });
    for (let n = 0; n < 8; n++) {
      run.step();
      cold.step();
      expect(cold.snapshotText()).toBe(run.snapshotText());
    }
    const request = requireValue(run.state.duskRest?.requests.tamar);
    expect(run.state.posts.tamar).toBe(post);
    if (request.begunAt !== undefined) {
      expect(
        physicalLedger(run.state).actions.some(
          (action) =>
            action.person === 'tamar' &&
            action.stage === 'start' &&
            action.status === 'accepted' &&
            action.offer.id === 'dusk-rest',
        ),
      ).toBe(true);
    }
    if (request.status === 'refused') {
      expect(request.begunAt).toBeUndefined();
      expect(duskRestAccount(request)).toContain('declined');
    } else if (request.begunAt === undefined) {
      expect(duskRestAccount(request)).not.toContain('began resting');
    }
    const full = JSON.parse(JSON.stringify(run.export()));
    expect(ruleHash(replay(full))).toBe(full.end.ruleHash);
    expect(() => replay({ ...full, scenario: 24 })).toThrow(/begin a new winter/);
  });
  it('expires an unanswered host request without inventing rest or return', () => {
    const run = fresh();
    const request: DuskRestRequest = {
      askedAt: run.state.minute,
      until: run.state.minute + 1,
      priorPost: null,
      status: 'pending',
    };
    requireValue(run.state.duskRest).requests.tamar = request;
    endDuskRest(run.state, 'tamar', request.until, 'dawn');
    expect(request.status).toBe('expired');
    expect(request.begunAt).toBeUndefined();
    expect(request.returnedAt).toBeUndefined();
    expect(duskRestAccount(request)).toContain('without observed rest');
  });
});
