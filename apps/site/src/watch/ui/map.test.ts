import { describe, expect, it } from 'vitest';
import { WatchRun } from '../sim/run.ts';
import { buildFrame } from '../sim/view.ts';
import { hitTest, layoutFor, offWallWatchers, placeMapLabels, postXY } from './map.ts';

describe('short Watch scenes', () => {
  it('leaves room below the wall for the staggered names and Keeper', () => {
    for (const height of [120, 160, 240, 600]) {
      const layout = layoutFor(360, height);
      expect(layout.yWall + layout.wallH + 35).toBeLessThanOrEqual(height);
    }
  });
});

it('selects either watcher sharing a post at night without turning their tap into a lantern move', () => {
  const run = new WatchRun(5);
  run.input({ k: 'start' });
  run.input({ k: 'begin' });
  run.state.place.tamar = 'gate-1';
  run.state.place.samira = 'gate-1';
  const f = buildFrame(run.state, 0, false);
  const layout = layoutFor(360, 160);
  const gate = f.sections.find((s) => s.id === 'gate');
  const post = gate?.posts.find((p) => p.id === 'gate-1');
  const at = postXY(layout, 'gate', 0, gate?.posts.length);
  for (const [offset, id] of (post?.watchers ?? []).entries()) {
    expect(hitTest(layout, f, at.x, at.y - offset * 34 - 9)).toEqual({ kind: 'watcher', watcher: id });
  }
});

it('selects the drawn hall and home figures rather than moving the lantern', () => {
  const run = new WatchRun(5);
  run.input({ k: 'start' });
  run.input({ k: 'begin' });
  run.state.place.tamar = 'hall';
  run.state.place.samira = 'home';
  const f = buildFrame(run.state, 0, false);
  const l = layoutFor(360, 240);
  for (const at of offWallWatchers(l, f)) {
    expect(hitTest(l, f, at.x, at.y - 6)).toEqual({ kind: 'watcher', watcher: at.id });
  }
});

it('separates outlined names, including neighbouring and co-located posts, inside both scene sizes', () => {
  for (const [w, h] of [
    [360, 208],
    [840, 744],
  ]) {
    if (!w || !h) throw new Error('missing size');
    const labels = placeMapLabels(
      [
        { x: 32, y: h - 20, width: 36 },
        { x: 60, y: h - 20, width: 28 },
        { x: 60, y: h - 20, width: 48 },
        { x: w - 4, y: h - 20, width: 40 },
      ],
      w,
      h,
    );
    for (const [i, a] of labels.entries()) {
      expect(a.x - a.width / 2 - 3).toBeGreaterThanOrEqual(0);
      expect(a.x + a.width / 2 + 3).toBeLessThanOrEqual(w);
      expect(a.y).toBeLessThanOrEqual(h - 4);
      for (const b of labels.slice(i + 1)) {
        expect(Math.abs(a.y - b.y) >= 16 || Math.abs(a.x - b.x) >= (a.width + b.width) / 2 + 6).toBe(true);
      }
    }
  }
});
