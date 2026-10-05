import { describe, expect, it } from 'vitest';
import { planInputs } from '../../../test/watch/plans.ts';
import { SECTION_IDS } from './config.ts';
import { WatchRun } from './run.ts';
import { buildFrame } from './view.ts';

describe('the frame shows what the Keeper can see', () => {
  it('posture and signs only in the light; impressions in words with a sureness', () => {
    const run = new WatchRun(4242);
    run.input({ k: 'start' });
    const dusk = buildFrame(run.state, 0, false);
    expect(dusk.postingReads).not.toBeNull();
    for (const w of dusk.watchers) {
      expect(w.impressions.length).toBeGreaterThan(0);
      for (const i of w.impressions) {
        expect(i.text).not.toMatch(/\d/);
        expect(i.sure).toBeGreaterThanOrEqual(0);
        expect(i.sure).toBeLessThanOrEqual(1);
      }
    }
    for (const x of planInputs(run.state, 'matched', true)) run.input(x);
    run.input({ k: 'begin' });
    let litSeen = 0;
    let darkSeen = 0;
    for (let i = 0; i < 240 && run.state.phase === 'night'; i++) {
      run.step();
      const f = buildFrame(run.state, 0, false);
      expect(f.postingReads).toBeNull();
      for (const w of f.watchers) {
        if (w.lit) {
          litSeen += 1;
          expect(w.posture).not.toBe('figure');
          expect(w.signs).not.toBeNull();
        } else {
          darkSeen += 1;
          expect(w.posture).toBe('figure');
          expect(w.signs).toBeNull();
        }
      }
    }
    expect(litSeen).toBeGreaterThan(0);
    expect(darkSeen).toBeGreaterThan(0);
  });

  it('the newcomer is a stranger on his first night', () => {
    const run = new WatchRun(4242);
    run.input({ k: 'start' });
    for (let n = 1; n < 3; n++) {
      for (const x of planInputs(run.state, 'usual', true)) run.input(x);
      run.input({ k: 'begin' });
      while (run.state.phase === 'night') run.step();
      if (run.state.phase !== 'dawn') return;
      run.input({ k: 'toDusk' });
    }
    const r = buildFrame(run.state, 0, false).watchers.find((w) => w.id === 'ruslan');
    expect(r?.impressions[0]?.text).toBe('you don’t know them yet');
  });
});

describe('the bell control says where it carries (owner playtest 2026-10-05: the bell rings from the Gate)', () => {
  it('names the faint stretches, swings after a pull, and the bigger bell carries the length of the wall', () => {
    const run = new WatchRun(20261004);
    run.input({ k: 'start' });
    run.input({ k: 'begin' });
    let f = buildFrame(run.state, 0, false);
    expect(f.bellRead).toBe('loud at the Gate, faint at the east wall');
    expect(f.bellSwinging).toBe(false);
    expect(f.bellCarry.gate).toBe(1);
    expect(run.input({ k: 'bell' })).toBe(true);
    f = buildFrame(run.state, 0, false);
    expect(f.bellSwinging).toBe(true);
    expect(f.roused).toBe(true);
    run.state.marks.bigBell = true;
    expect(buildFrame(run.state, 0, false).bellRead).toBe('heard the length of the wall');
  });
});
