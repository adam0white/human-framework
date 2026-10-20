import { describe, expect, it } from 'vitest';
import { WatchRun } from '../sim/run.ts';
import { buildFrame } from '../sim/view.ts';
import { hitTest, layoutFor, offWallWatchers, postXY } from './map.ts';

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
  run.state.place.mara = 'gate-1';
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
  run.state.place.mara = 'home';
  const f = buildFrame(run.state, 0, false);
  const l = layoutFor(360, 240);
  for (const at of offWallWatchers(l, f)) {
    expect(hitTest(l, f, at.x, at.y - 6)).toEqual({ kind: 'watcher', watcher: at.id });
  }
});
