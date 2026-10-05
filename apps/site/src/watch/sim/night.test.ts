import { describe, expect, it } from 'vitest';
import {
  LANTERN_STEP_MIN,
  NIGHT_LENGTH,
  postSection,
  SECTION_IDS,
  START_GRAIN,
  WATCHER_IDS,
} from './config.ts';
import {
  applyInput,
  bellCall,
  bellCarry,
  bellLoudness,
  inVoice,
  litSection,
  newGame,
  presentIds,
  stepMinute,
  suggestions,
} from './night.ts';
import { isPost, personOf, villager, WatchWorld } from './people.ts';
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

  it('the bell is loudest at the Gate and fainter each stretch away; the bigger bell carries further', () => {
    const s = toNight(100);
    expect(SECTION_IDS.map((id) => bellCarry(s, id))).toEqual([0.8, 1, 0.8, 0.6]);
    s.marks.bigBell = true;
    expect(SECTION_IDS.map((id) => bellCarry(s, id))).toEqual([0.9, 1, 0.9, 0.8]);
    s.marks.bigBell = false;
    // At home it wakes a sleeper only near the Gate; the bigger bell reaches the east houses too.
    const gateHome = WATCHER_IDS.find((id) => villager(s, id).home === 'gate');
    const eastHome = WATCHER_IDS.find((id) => villager(s, id).home === 'east');
    if (!gateHome || !eastHome) throw new Error('no houses at the Gate or the east wall');
    s.place[gateHome] = 'home';
    s.place[eastHome] = 'home';
    expect(bellLoudness(s, gateHome)).toBeCloseTo(0.5);
    expect(bellLoudness(s, eastHome)).toBe(0);
    s.marks.bigBell = true;
    expect(bellLoudness(s, eastHome)).toBeCloseTo(0.4);
    s.place[eastHome] = 'hall';
    expect(bellLoudness(s, eastHome)).toBe(1);
  });

  it('a pull is heard by everyone in range: it wakes sleepers, keeps them from nodding off, and calls them louder', () => {
    let woken = 0;
    let boosted = 0;
    let rang = 0;
    for (let seed = 100; seed < 110; seed++) {
      const s = toNight(seed);
      // Wait until someone on the wall has nodded off, or the night is half gone.
      const asleep = () =>
        presentIds(s).filter(
          (id) => isPost(s.place[id]) && personOf(s, id)?.body.asleep && !personOf(s, id)?.body.downed,
        );
      while (s.phase === 'night' && asleep().length === 0 && s.minute < s.nightStart + NIGHT_LENGTH / 2)
        stepMinute(s);
      if (s.phase !== 'night') continue;
      const sleepers = asleep();
      const before = suggestions(s);
      expect(applyInput(s, { k: 'bell' })).toBe(true);
      rang += 1;
      // A plain pull names nobody: no one is put under a command.
      expect(Object.keys(s.commands)).toEqual([]);
      expect(s.alerts.at(-1)?.text).toMatch(/The bell rings out from the Gate|rope snaps/);
      for (const id of presentIds(s)) {
        const pl = s.place[id];
        if (isPost(pl)) expect(s.bell.heard[id]).toBeCloseTo(bellCarry(s, postSection(pl)));
      }
      for (const id of sleepers) expect(s.notes.some((n) => n.who === id && n.kind === 'woken')).toBe(true);
      const after = suggestions(s);
      for (const id of presentIds(s)) {
        const a = before[id]?.find((x) => x.affordanceId?.startsWith('post:'))?.strength ?? 0;
        const b = after[id]?.find((x) => x.affordanceId?.startsWith('post:'))?.strength ?? 0;
        if (b > a) boosted += 1;
      }
      stepMinute(s);
      for (const id of sleepers) {
        if (!personOf(s, id)?.body.asleep) woken += 1;
        // Not even offered the doze while the bell's rousing lasts.
        const p = personOf(s, id);
        if (p && isPost(s.place[id]))
          expect(new WatchWorld(s).affordancesFor(p).some((a) => a.id.startsWith('doze:'))).toBe(false);
      }
    }
    expect(rang).toBeGreaterThan(5);
    expect(woken).toBeGreaterThan(0);
    expect(boosted).toBeGreaterThan(5);
  });

  it('a pull keeps more of the wall awake at its posts for the hour after, across seeds', () => {
    // Measured 2026-10-05, seeds 100–129, night 1, one pull when someone first nods off at a post: more awake
    // watcher-minutes on the posts in the next hour in 30 of 30 seeds, 4184 → 5175 (+24%).
    const awake = (s: WatchState) =>
      presentIds(s).filter(
        (id) => isPost(s.place[id]) && !personOf(s, id)?.body.asleep && !personOf(s, id)?.body.downed,
      ).length;
    let quiet = 0;
    let rung = 0;
    let better = 0;
    for (let seed = 100; seed < 110; seed++) {
      const night = (ringAt: number | null) => {
        const s = toNight(seed);
        let t = -1;
        let acc = 0;
        while (s.phase === 'night') {
          stepMinute(s);
          if (
            ringAt === null &&
            t < 0 &&
            presentIds(s).some((id) => isPost(s.place[id]) && personOf(s, id)?.body.asleep)
          )
            t = s.minute;
          if (ringAt !== null && s.minute === ringAt) {
            applyInput(s, { k: 'bell' });
            t = ringAt;
          }
          if (t >= 0 && s.minute > t && s.minute <= t + 60) acc += awake(s);
        }
        return { t, acc };
      };
      const q = night(null);
      if (q.t < 0) continue;
      const r = night(q.t);
      quiet += q.acc;
      rung += r.acc;
      if (r.acc > q.acc) better += 1;
    }
    expect(better).toBeGreaterThanOrEqual(8);
    expect(rung).toBeGreaterThan(quiet * 1.1);
  });

  it('a named call over the bell commands that watcher only, within reach of the Keeper’s voice', () => {
    let commanded = 0;
    let costlier = 0;
    for (let seed = 100; seed < 110; seed++) {
      const runs = [false, true].map((ring) => {
        const s = toNight(seed);
        let rangAt = -1;
        let who: string | null = null;
        while (s.phase === 'night') {
          stepMinute(s);
          if (ring && rangAt < 0 && s.alerts.some((a) => a.kind === 'foot')) {
            const far = presentIds(s).find((id) => isPost(s.place[id]) && !inVoice(s, id));
            if (far) expect(applyInput(s, { k: 'bell', who: far })).toBe(false);
            const near = presentIds(s).find((id) => isPost(s.place[id]) && inVoice(s, id));
            if (!near) continue;
            expect(applyInput(s, { k: 'bell', who: near })).toBe(true);
            expect(Object.keys(s.commands)).toEqual([near]);
            expect(s.alerts.at(-1)?.text).toContain('by name');
            rangAt = s.minute;
            who = near;
          }
          if (who && s.minute === rangAt + 30 && personOf(s, who)?.will.command) commanded += 1;
        }
        return { s, who };
      });
      const [quiet, rung] = runs;
      const id = rung?.who;
      if (!id) continue;
      const a = quiet?.s.community.people.find((p) => p.id === id)?.needs.autonomy ?? 0;
      const b = rung?.s.community.people.find((p) => p.id === id)?.needs.autonomy ?? 0;
      if (b < a) costlier += 1;
    }
    expect(commanded).toBeGreaterThan(5);
    expect(costlier).toBeGreaterThan(3);
    // From the west wall the Keeper's voice does not reach the east wall: a name called there is refused.
    const s = toNight(100);
    s.lantern.x = 0;
    const id = presentIds(s)[0];
    if (!id) throw new Error('nobody here');
    s.place[id] = 'east-1';
    expect(inVoice(s, id)).toBe(false);
    expect(applyInput(s, { k: 'bell', who: id })).toBe(false);
    s.place[id] = 'west-1';
    expect(applyInput(s, { k: 'bell', who: id })).toBe(true);
  });

  it('while the bell swings another pull waits, but a name can still be called over it', () => {
    const s = toNight(101);
    expect(applyInput(s, { k: 'bell' })).toBe(true);
    const wear = s.rope.wear;
    expect(applyInput(s, { k: 'bell' })).toBe(false);
    expect(buildFrame(s, 0, false).bellSwinging).toBe(true);
    const near = presentIds(s).find((id) => inVoice(s, id));
    if (near) {
      expect(applyInput(s, { k: 'bell', who: near })).toBe(true);
      expect(s.rope.wear).toBe(wear);
      expect(s.commands[near]).toBeTruthy();
      expect(s.alerts.at(-1)?.text).toMatch(/^Over the bell you call/);
    }
    for (let i = 0; i < 5; i++) stepMinute(s);
    expect(buildFrame(s, 0, false).bellSwinging).toBe(false);
    expect(applyInput(s, { k: 'bell' })).toBe(true);
  });

  it('a pull with nothing out there is a false alarm: the next call is weaker', () => {
    const s = toNight(102);
    s.tokens = [];
    s.spawns = [];
    const call = bellCall(s, 1);
    expect(applyInput(s, { k: 'bell' })).toBe(true);
    for (let i = 0; i < 31; i++) stepMinute(s);
    expect(s.bell.cry).toBe(1);
    expect(bellCall(s, 1)).toBeLessThan(call);
    // The next night forgives half of it.
    while (s.phase === 'night') stepMinute(s);
    applyInput(s, { k: 'toDusk' });
    applyInput(s, { k: 'begin' });
    if ((s.phase as string) === 'night') expect(s.bell.cry).toBe(0.5);
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
