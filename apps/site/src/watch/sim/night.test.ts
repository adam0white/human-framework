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

describe('Night Watch rules (G3-1, G3-2)', () => {
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

  it('each pull wears the rope until it snaps; a day of mending makes it whole again', () => {
    const s = toNight(13);
    let pulls = 0;
    expect(applyInput(s, { k: 'bell' })).toBe(true);
    pulls += 1;
    // A pull while it still rings is refused and wears nothing.
    const wear = s.rope.wear;
    expect(applyInput(s, { k: 'bell' })).toBe(false);
    expect(s.rope.wear).toBe(wear);
    while (!s.rope.snapped && s.phase === 'night') {
      stepMinute(s);
      if (applyInput(s, { k: 'bell' })) pulls += 1;
    }
    expect(pulls).toBeGreaterThanOrEqual(3);
    expect(pulls).toBeLessThanOrEqual(5);
    expect(s.rope.snapped).toBe(true);
    runNight(s);
    if (s.phase === 'dawn') {
      applyInput(s, { k: 'toDusk' });
      expect(s.rope.snapped).toBe(s.rope.wear >= 1);
      expect(s.day?.ropeAfter ?? 1).toBeLessThan(s.day?.ropeBefore ?? 0);
      if (s.day?.lines.some((l) => /bell rope/.test(l.text))) expect(s.rope.snapped).toBe(false);
    }
  });

  it('the bell is a command: those in earshot are put under it, and it costs them autonomy', () => {
    let commanded = 0;
    let costlier = 0;
    for (let seed = 100; seed < 110; seed++) {
      const runs = [false, true].map((ring) => {
        const s = toNight(seed);
        let rangAt = -1;
        let heard: string[] = [];
        while (s.phase === 'night') {
          stepMinute(s);
          if (ring && rangAt < 0 && s.alerts.some((a) => a.kind === 'foot')) {
            expect(applyInput(s, { k: 'bell' })).toBe(true);
            rangAt = s.minute;
            heard = Object.keys(s.commands);
          }
          if (rangAt >= 0 && s.minute === rangAt + 30)
            for (const id of heard)
              if (s.community.people.find((p) => p.id === id)?.will.command) commanded += 1;
        }
        return { s, heard };
      });
      const [quiet, rung] = runs;
      for (const id of rung?.heard ?? []) {
        const a = quiet?.s.community.people.find((p) => p.id === id)?.needs.autonomy ?? 0;
        const b = rung?.s.community.people.find((p) => p.id === id)?.needs.autonomy ?? 0;
        if (b < a) costlier += 1;
      }
    }
    expect(commanded).toBeGreaterThan(5);
    expect(costlier).toBeGreaterThan(3);
  });

  it('the lantern alone at an empty stretch slows climbers, and the dawn page names the empty post', () => {
    let still = 0;
    let walked = 0;
    let named = 0;
    for (let seed = 200; seed < 220; seed++) {
      for (const walk of [false, true]) {
        const s = newGame(seed);
        applyInput(s, { k: 'start' });
        for (const w of WATCHER_IDS) applyInput(s, { k: 'post', watcher: w, post: null });
        applyInput(s, { k: 'begin' });
        while (s.phase === 'night') {
          const heard = s.alerts.find(
            (a) => (a.kind === 'motion' || a.kind === 'foot') && a.minute === s.minute - 1,
          );
          if (walk && heard) applyInput(s, { k: 'lantern', section: heard.section });
          stepMinute(s);
        }
        if (walk) walked += START_GRAIN - s.grain;
        else still += START_GRAIN - s.grain;
        if (s.dawn?.lines.some((l) => /^Nobody stood .* got over/.test(l.text))) named += 1;
      }
    }
    expect(walked).toBeLessThan(still);
    expect(named).toBeGreaterThan(20);
  });

  it('dusk runs on its own to nightfall', () => {
    const s = newGame(21);
    applyInput(s, { k: 'start' });
    for (let i = 0; i < 60; i++) stepMinute(s);
    expect(s.phase).toBe('night');
  });
});
