import { describe, expect, it } from 'vitest';
import { LANTERN_STEP_MIN, NIGHT_LENGTH, START_GRAIN, WATCHER_IDS } from './config.ts';
import { applyInput, litSection, newGame, stepMinute } from './night.ts';
import type { WatchState } from './state.ts';
import { buildFrame } from './view.ts';

function toNight(seed: number): WatchState {
  const s = newGame(seed);
  applyInput(s, { k: 'start' });
  applyInput(s, { k: 'begin' });
  return s;
}

function runNight(s: WatchState): void {
  while (s.phase === 'night') stepMinute(s);
}

describe('Night Watch rules (G3-1)', () => {
  it('opens on the goal page with the clock stopped and a scout warning drawn', () => {
    const s = newGame(7);
    expect(s.phase).toBe('goal');
    expect(s.warning).toMatch(/scout/);
    const m = s.minute;
    stepMinute(s);
    expect(s.minute).toBe(m);
  });

  it('a night lasts twelve sim hours and ends on a dawn page with a line per section', () => {
    const s = toNight(11);
    const start = s.minute;
    runNight(s);
    expect(s.minute - start).toBe(NIGHT_LENGTH);
    expect(['dawn', 'fallen']).toContain(s.phase);
    expect(s.dawn?.lines).toHaveLength(4);
  });

  it('is deterministic for a seed', () => {
    const a = toNight(42);
    const b = toNight(42);
    runNight(a);
    runNight(b);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('posting is closed at night and a post holds one watcher', () => {
    const s = newGame(3);
    applyInput(s, { k: 'start' });
    expect(applyInput(s, { k: 'post', watcher: 'kian', post: 'gate-1' })).toBe(true);
    expect(s.posts.kian).toBe('gate-1');
    expect(s.posts.tamar).toBeNull();
    applyInput(s, { k: 'begin' });
    expect(applyInput(s, { k: 'post', watcher: 'tamar', post: 'east-1' })).toBe(false);
  });

  it('an unwatched wall loses grain; the lead threat comes mostly where the scout said', () => {
    let lost = 0;
    let warnedHits = 0;
    let waves = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const s = newGame(seed);
      applyInput(s, { k: 'start' });
      for (const w of WATCHER_IDS) applyInput(s, { k: 'post', watcher: w, post: null });
      for (const sp of s.spawns.filter((x) => x.kind === s.lead)) {
        waves += 1;
        if (sp.section === s.warned) warnedHits += 1;
      }
      applyInput(s, { k: 'begin' });
      runNight(s);
      lost += START_GRAIN - s.grain;
    }
    expect(lost / 20).toBeGreaterThan(5);
    expect(warnedHits / waves).toBeGreaterThan(0.6);
  });

  it('walking the lantern takes minutes; nothing is lit on the way', () => {
    const s = toNight(5);
    expect(litSection(s)).toBe('gate');
    applyInput(s, { k: 'lantern', section: 'east' });
    stepMinute(s);
    expect(litSection(s)).toBeNull();
    for (let i = 0; i < 2 * LANTERN_STEP_MIN; i++) stepMinute(s);
    expect(litSection(s)).toBe('east');
  });

  it('the dark shows only motion: no kinds, nothing seen in unlit sections', () => {
    const s = toNight(9);
    for (let i = 0; i < 400 && s.phase === 'night'; i++) {
      stepMinute(s);
      const f = buildFrame(s, 0, false);
      for (const t of f.seen) expect(t.section).toBe(f.lit);
      for (const m of f.motion) expect(m.section).not.toBe(f.lit);
      expect(f.motion.every((m) => !('kind' in m))).toBe(true);
    }
  });

  it('each pull wears the rope until it snaps, and dawn mends it partly', () => {
    const s = toNight(13);
    let pulls = 0;
    while (applyInput(s, { k: 'bell' })) {
      pulls += 1;
      stepMinute(s);
    }
    expect(pulls).toBeGreaterThanOrEqual(3);
    expect(pulls).toBeLessThanOrEqual(5);
    expect(s.rope.snapped).toBe(true);
    runNight(s);
    if (s.phase === 'dawn') {
      applyInput(s, { k: 'toDusk' });
      expect(s.rope.snapped).toBe(false);
      expect(s.rope.wear).toBeGreaterThan(0.5);
    }
  });

  it('the bell rouses the wall: rung at the first motion it saves grain on average', () => {
    let quiet = 0;
    let rung = 0;
    for (let seed = 100; seed < 120; seed++) {
      for (const ring of [false, true]) {
        const s = toNight(seed);
        while (s.phase === 'night') {
          stepMinute(s);
          if (ring && s.alerts.some((a) => a.kind === 'foot' && a.minute === s.minute - 1))
            applyInput(s, { k: 'bell' });
        }
        const lost = START_GRAIN - s.grain;
        if (ring) rung += lost;
        else quiet += lost;
      }
    }
    expect(rung).toBeLessThan(quiet);
  });

  it('dusk runs on its own to nightfall', () => {
    const s = newGame(21);
    applyInput(s, { k: 'start' });
    for (let i = 0; i < 60; i++) stepMinute(s);
    expect(s.phase).toBe('night');
  });
});
