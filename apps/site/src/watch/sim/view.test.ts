import { describe, expect, it } from 'vitest';
import { planInputs } from '../../../test/watch/plans.ts';
import { drawMap, layoutFor, newEase } from '../ui/map.ts';
import { arrive, personOf } from './people.ts';
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
    expect(run.input({ k: 'lantern', section: 'gate' })).toBe(true);
    run.input({ k: 'begin' });
    run.step();
    // Host scene premise: two present watchers stand on separate stretches.
    run.state.place.samira = 'gate-1';
    run.state.place.tamar = 'east-1';
    const atGate = buildFrame(run.state, 0, false);
    expect(atGate.postingReads).toBeNull();
    expect(atGate.watchers.some((w) => w.lit)).toBe(true);
    expect(atGate.watchers.some((w) => !w.lit)).toBe(true);
    for (const w of atGate.watchers) {
      if (w.lit) {
        expect(w.posture).not.toBe('figure');
        expect(w.signs).not.toBeNull();
      } else {
        expect(w.posture).toBe('figure');
        expect(w.signs).toBeNull();
      }
    }
    expect(run.input({ k: 'lantern', section: 'east' })).toBe(true);
    run.step();
    const moving = buildFrame(run.state, 0, false);
    expect(moving.lit).toBeNull();
    expect(moving.watchers.every((w) => !w.lit && w.posture === 'figure' && w.signs === null)).toBe(true);
    for (let i = 0; i < 10; i++) run.step();
    const east = buildFrame(run.state, 0, false);
    expect(east.lit).toBe('east');
    expect(east.watchers.some((w) => w.lit)).toBe(true);
    for (const w of east.watchers) {
      expect(w.lit).toBe(w.section === 'east');
      if (w.lit) {
        expect(w.posture).not.toBe('figure');
        expect(w.signs).not.toBeNull();
      } else {
        expect(w.posture).toBe('figure');
        expect(w.signs).toBeNull();
      }
    }
  });

  it('the newcomer is a stranger on her first night', () => {
    const run = new WatchRun(4242);
    run.input({ k: 'start' });
    // Host premise: the authored newcomer arrives on the third winter night.
    run.state.winterNight = 3;
    expect(arrive(run.state)).toContain('meryem');
    const r = buildFrame(run.state, 0, false).watchers.find((w) => w.id === 'meryem');
    expect(r?.impressions[0]?.text).toBe('You do not know her well enough yet.');
  });
});

describe('the bell control says where it carries (owner playtest 2026-10-05: the bell rings from the Gate)', () => {
  it('names the faint stretches, swings after a pull, and the bigger bell carries the length of the wall', () => {
    const run = new WatchRun(20261004);
    run.input({ k: 'start' });
    run.input({ k: 'begin' });
    let f = buildFrame(run.state, 0, false);
    expect(f.bellRead).toBe('It is loud at the Gate and faint at the east wall');
    expect(f.bellSwinging).toBe(false);
    expect(f.bellCarry.gate).toBe(1);
    const bodies = Object.fromEntries(
      f.watchers.map((w) => [w.id, structuredClone(personOf(run.state, w.id)?.body)]),
    );
    expect(run.input({ k: 'bell' })).toBe(true);
    f = buildFrame(run.state, 0, false);
    expect(f.bellSwinging).toBe(true);
    // The frame flag shows the active bell call, not proof that a person woke.
    expect(f.roused).toBe(true);
    for (const w of f.watchers) expect(personOf(run.state, w.id)?.body).toEqual(bodies[w.id]);
    expect(run.input({ k: 'bell' })).toBe(false);
    run.state.marks.bigBell = true;
    expect(buildFrame(run.state, 0, false).bellRead).toBe('It can be heard along the whole wall');
  });
});

// The edge playtest showed Samira twice and hid Idris at this earlier frame.
it('keeps every person sharing a post in the current map frame', () => {
  const run = new WatchRun(7);
  run.input({ k: 'start' });
  const state = run.state;
  state.winterNight = 2;
  arrive(state);
  state.phase = 'night';
  state.place.samira = 'east-1';
  state.place.idris = 'east-1';
  const frame = buildFrame(state, 0, false);
  expect(state.place.samira).toBe('east-1');
  expect(state.place.idris).toBe('east-1');
  const post = frame.sections.find((s) => s.id === 'east')?.posts.find((p) => p.id === 'east-1');
  expect(post?.watchers).toEqual(frame.watchers.filter((w) => w.place === 'east-1').map((w) => w.id));
  expect(post?.watchers).toContain('samira');
  expect(post?.watchers).toContain('idris');
  const labels: string[] = [];
  const ctx = new Proxy(
    {},
    {
      get(_target, key) {
        if (key === 'fillText') return (text: string) => labels.push(text);
        if (key === 'measureText') return (text: string) => ({ width: text.length * 6 });
        if (key === 'createLinearGradient' || key === 'createRadialGradient')
          return () => ({ addColorStop() {} });
        return () => {};
      },
      set() {
        return true;
      },
    },
  ) as CanvasRenderingContext2D;
  drawMap(ctx, layoutFor(360, 400), frame, newEase(), { selected: null, now: 0 });
  expect(labels).toContain('Samira');
  expect(labels).toContain('Idris');
});
