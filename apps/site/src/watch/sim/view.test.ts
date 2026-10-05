import { describe, expect, it } from 'vitest';
import { planInputs } from '../../../test/watch/plans.ts';
import { SECTION_IDS } from './config.ts';
import { bellTarget } from './moments.ts';
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

describe('the bell names one watcher and rings for that one (owner playtest 2026-10-05)', () => {
  it('the name holds against minute-to-minute reads, and a pull rings for the name shown', () => {
    const run = new WatchRun(20261004);
    run.input({ k: 'start' });
    let raw = 0;
    let shown = 0;
    let rung = 0;
    for (let night = 0; night < 3; night++) {
      while (run.state.phase !== 'dusk') {
        if (run.state.phase === 'dawn') run.input({ k: 'toDusk' });
        else run.step();
      }
      run.input({ k: 'begin' });
      let lastRaw: string | null = null;
      let lastShown: string | null = null;
      for (let i = 0; i < 600 && (run.state.phase as string) === 'night'; i++) {
        if (i % 40 === 0)
          run.input({ k: 'lantern', section: SECTION_IDS[(i / 40) % SECTION_IDS.length] ?? 'gate' });
        if (run.state.moment)
          run.input({ k: 'answer', id: run.state.moment.id, choice: run.state.moment.options[0]?.id ?? '' });
        const f = buildFrame(run.state, 0, false);
        const r = bellTarget(run.state);
        if (r !== lastRaw && lastRaw !== null && r !== null) raw += 1;
        if (f.bellForId !== lastShown && lastShown !== null && f.bellForId !== null) shown += 1;
        lastRaw = r;
        lastShown = f.bellForId;
        if (i % 97 === 50 && f.bellForId && run.input({ k: 'bell', who: f.bellForId })) {
          rung += 1;
          expect(run.state.commands[f.bellForId]).toBeTruthy();
        }
        run.step();
      }
    }
    // Seed 20261004, lantern moved every 40 minutes: 65 raw changes of the best read, 29 of the shown name.
    expect(shown).toBeLessThan(raw * 0.6);
    expect(rung).toBeGreaterThan(0);
  });
});
