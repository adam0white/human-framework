import { describe, expect, it } from 'vitest';
import { playYears } from '../../../test/watch/years.ts';
import { listPages, loadPage, savePage } from '../store.ts';
import { DAY } from './config.ts';
import { openFair, takeOffer } from './fair.ts';
import { seasonNow } from './life.ts';
import { DAY_RATE, Pacer } from './pace.ts';
import { isWatcher } from './people.ts';
import { keeperImpressions } from './reads.ts';
import { endState, replay, type Snapshot, WatchRun } from './run.ts';
import type { WatchState } from './state.ts';
import { topicsFor } from './talk.ts';
import { tagline } from './view.ts';

/**
 * One three-year run shared by the two describes below (H2 performance review, P9). It stops once, at the first
 * night minute of year 3, to save a page as the game does between minutes, then goes on unchanged to the end.
 */
const { run, page } = ((): { run: WatchRun; page: Snapshot } => {
  const run = playYears(1, 3, undefined, (st) => st.year === 3 && st.phase === 'night');
  const page: Snapshot = JSON.parse(JSON.stringify(run.snapshot()));
  playYears(1, 3, undefined, undefined, run);
  return { run, page };
})();

describe('Game 3 years (G3-3)', () => {
  const s = run.state;

  it('three whole years pass: seasons, fairs and winters reach the chronicle', () => {
    expect(s.phase).not.toBe('fallen');
    expect(s.year).toBe(4);
    expect(s.annals.map((a) => a.year)).toEqual([1, 2, 3]);
    const kinds = new Set(s.chronicle.map((l) => l.kind));
    for (const k of ['harvest', 'fair', 'winter'] as const) expect(kinds).toContain(k);
    for (const a of s.annals) expect(a.harvest).toBeGreaterThan(0);
  }, 300_000);

  it('children hear winter stories: a told gist of a stretch of wall (H2)', () => {
    const told = s.community.people.flatMap((p) =>
      (p.memory.gists ?? []).filter((g) => g.tags.includes('told') && g.placeId !== undefined),
    );
    expect(told.length).toBeGreaterThan(0);
    expect(told.every((g) => ['west', 'gate', 'mill', 'east'].includes(g.placeId ?? ''))).toBe(true);
  }, 300_000);

  it('the multi-year playtest export replays to the same end', () => {
    const exp = JSON.parse(JSON.stringify(run.export()));
    expect(JSON.stringify(endState(replay(exp)))).toBe(JSON.stringify(exp.end));
  }, 300_000);

  it('a saved page resumes to the same end as the unbroken run', () => {
    // The page saved in year 3 (see `page` above), resumed and fed the rest of the log: the end must match.
    const exp = run.export();
    expect(page.state.minute).toBeLessThan(exp.endMinute);
    expect(page.log.length).toBeLessThan(run.log.length);
    const resumed = WatchRun.resume(page);
    for (const e of run.log.slice(page.log.length)) {
      while (resumed.state.minute < e.m) resumed.step();
      expect(resumed.input(e.i)).toBe(true);
    }
    while (resumed.state.minute < exp.endMinute) resumed.step();
    expect(endState(resumed.state).fullHash).toBe(exp.end.fullHash);
    expect(resumed.log.length).toBe(run.log.length);
  }, 300_000);
});

describe('Game 3 long-run depth (G3-4)', () => {
  const s = run.state;
  const clone = (): WatchState => JSON.parse(JSON.stringify(s));

  it('each thaw writes the routine nights; births and summer lessons come to the Keeper as cards', () => {
    for (const year of [1, 2, 3])
      expect(
        s.chronicle.some(
          (l) => l.year === year && /(routine|uneventful|worth the lantern|without the lantern)/.test(l.text),
        ),
      ).toBe(true);
    // The headless Keeper sends a sack for every birth and allows every lesson.
    expect(s.chronicle.some((l) => l.text.startsWith('You sent a sack from the granary for'))).toBe(true);
    expect(s.chronicle.some((l) => l.text.includes('took sling lessons from'))).toBe(true);
    const learners = s.pairings.map((x) => x.who);
    expect(new Set(learners).size).toBe(learners.length);
  }, 300_000);

  it('a child is expected before it is born; incomers stop being "newcomers" after their winters', () => {
    const births = s.chronicle.filter((l) => l.kind === 'birth' && / had a (son|daughter)/.test(l.text));
    expect(births.length).toBeGreaterThan(0);
    for (const b of births) {
      const parents = b.text.split(' had a ')[0] ?? '';
      expect(
        s.chronicle.some((l) => l.minute < b.minute && l.text === `${parents} are expecting a child.`),
      ).toBe(true);
    }
    const notes = s.community.people.filter((p) => isWatcher(s, p)).map((p) => tagline(s, p));
    expect(notes.some((n) => /winters? (on the wall|here)|one of ours/.test(n))).toBe(true);
    expect(notes.some((n) => /newcomer|fleeing/.test(n) && !/one of ours|winter here/.test(n))).toBe(false);
  }, 300_000);

  it('talk topics differ by what the Keeper reads of each watcher', () => {
    const lists = s.community.people.filter((p) => isWatcher(s, p)).map((p) => topicsFor(s, p.id).join(','));
    expect(new Set(lists).size).toBeGreaterThan(1);
    expect(lists.some((l) => l.includes('home'))).toBe(true);
  }, 300_000);

  it('an ageing gatekeeper brings two heir names to the fair; naming one closes the other', () => {
    const t = clone();
    const keeper = t.community.people.find((p) => p.id === t.gateKeeper);
    expect(keeper).toBeDefined();
    if (!keeper) return;
    keeper.life.bornAt = t.minute - 60 * 365 * DAY;
    t.heir = null;
    openFair(t);
    const heirs = (t.fair?.offers ?? []).filter((o) => o.id === 'heir' || o.id === 'heir2');
    expect(heirs.length).toBe(2);
    expect(heirs[0]?.target).not.toBe(heirs[1]?.target);
    expect(takeOffer(t, 'heir2')).toBe(true);
    expect(t.heir).toBe(heirs[1]?.target);
    expect(takeOffer(t, 'heir')).toBe(false);
  }, 300_000);

  it('a stretch the thaw brought down can be rebuilt at the fair', () => {
    const t = clone();
    t.marks.lost = { section: 'west', year: t.year + 1 };
    t.grain = 30;
    openFair(t);
    expect(t.fair?.offers[0]?.id).toBe('rebuild');
    expect(takeOffer(t, 'rebuild')).toBe(true);
    expect(t.marks.lost).toBeNull();
  }, 300_000);
});

describe('Game 3 dawn voices (G3-4 review)', () => {
  it('no two watchers say the same words on one dawn, and few repeat their own last dawn', () => {
    let repeats = 0;
    let spoken = 0;
    for (const seed of [1, 2, 3]) {
      const run = new WatchRun(seed);
      run.input({ k: 'start' });
      let last: Record<string, string> = {};
      for (
        let guard = 0;
        guard < 200_000 && run.state.phase !== 'thaw' && run.state.phase !== 'fallen';
        guard++
      ) {
        const ph = run.state.phase;
        if (ph === 'dusk') run.input({ k: 'begin' });
        else if (ph === 'dawn') {
          const voices = run.state.dawn?.voices ?? [];
          const texts = voices.map((v) => v.text);
          expect(new Set(texts).size).toBe(texts.length);
          for (const v of voices) {
            spoken += 1;
            if (last[v.who] === v.text) repeats += 1;
          }
          last = Object.fromEntries(voices.map((v) => [v.who, v.text]));
          run.input({ k: 'toDusk' });
        } else run.step();
      }
    }
    expect(spoken).toBeGreaterThan(20);
    expect(repeats / spoken).toBeLessThan(0.1);
  }, 300_000);
});

describe('Game 3 first winter (G3-3 review)', () => {
  it('a Keeper who never plans still reaches the thaw: an empty granary is told at dawn, not a sudden end', () => {
    for (const seed of [1, 2, 3]) {
      const run = new WatchRun(seed);
      run.input({ k: 'start' });
      let dawns = 0;
      for (
        let guard = 0;
        guard < 200_000 && run.state.phase !== 'thaw' && run.state.phase !== 'fallen';
        guard++
      ) {
        const ph = run.state.phase;
        if (ph === 'dusk') run.input({ k: 'begin' });
        else if (ph === 'dawn') {
          dawns += 1;
          run.input({ k: 'toDusk' });
        } else run.step();
      }
      expect(run.state.phase).toBe('thaw');
      expect(dawns).toBe(run.state.winter.nights);
    }
  }, 300_000);
});

describe('Game 3 pacing in the open seasons (G3-3)', () => {
  it('spring opens at Seasons (2026-10-05, was Days), steps whole days, news eases it to Days, and the next winter opens at Watch', () => {
    const run = playYears(2, 1, undefined, (s) => s.phase === 'thaw');
    expect(run.state.phase).toBe('thaw');
    const pacer = new Pacer();
    pacer.speed = 'fast';
    pacer.tick(run, 16);
    run.input({ k: 'continue' });
    if (run.state.phase === 'closed') run.input({ k: 'continue' });
    expect(run.state.phase).toBe('spring');
    pacer.tick(run, 0);
    // The open seasons run themselves (owner's playtest: "I'd speed up automatically unless there's a reason").
    expect(pacer.speed).toBe('seasons');
    pacer.speed = 'days';
    const before = run.state.minute;
    const stepped = pacer.tick(run, 1000);
    expect(stepped).toBe(DAY_RATE.days);
    expect(run.state.minute - before).toBe(DAY_RATE.days * DAY);
    pacer.speed = 'seasons';
    expect(pacer.tick(run, 1000)).toBe(DAY_RATE.seasons);
    // News written into the chronicle eases Seasons to Days for a few days, without a card.
    let eased = false;
    for (let guard = 0; guard < 400 && run.state.phase !== 'fair' && !eased; guard++) {
      const lines = run.state.chronicle.length;
      const c = run.state.card;
      if (c) run.input({ k: 'card', id: c.id, choice: c.options[0]?.id ?? '' });
      pacer.tick(run, 100);
      if (run.state.chronicle.length > lines && !run.state.card) {
        pacer.tick(run, 0);
        eased = pacer.slowed(run) && pacer.rate(run) === DAY_RATE.days;
      }
    }
    expect(eased).toBe(true);
    // Through to the next winter's first dusk: the watch speed comes back on its own.
    for (let guard = 0; guard < 5000 && run.state.phase !== 'dusk'; guard++) {
      const s = run.state;
      if (s.phase === 'fair') run.input({ k: 'continue' });
      else if (s.card) {
        // A card slows play to the tactical pace (not a pause).
        expect(pacer.slowed(run)).toBe(true);
        expect(pacer.rate(run)).toBe(DAY_RATE.tactical);
        run.input({ k: 'card', id: s.card.id, choice: s.card.options[0]?.id ?? '' });
      } else pacer.tick(run, 1000);
    }
    expect(run.state.phase).toBe('dusk');
    expect(pacer.speed).toBe('watch');
  }, 300_000);

  it('without IndexedDB the shelf is empty and saving reports false, without throwing', async () => {
    expect(await listPages()).toEqual([]);
    expect(await loadPage('x:auto')).toBeNull();
    const ok = await savePage(
      { id: 'x:auto', chronicle: 'x', kind: 'auto', seed: 1, year: 1, when: 'spring', savedAt: 0 },
      '{}',
    );
    expect(ok).toBe(false);
  });
});

describe('Game 3 reads over the year (G3-3 review)', () => {
  it('what the Keeper learned on the wall is still known in summer, marked as last winter’s', () => {
    const run = playYears(1, 1, undefined, (st) => seasonNow(st) === 'summer');
    const s = run.state;
    const reads = s.community.people
      .filter((p) => isWatcher(s, p))
      .map((p) => keeperImpressions(s, p.id).map((r) => r.text));
    const known = reads.filter((r) => !r.includes('you don’t know them yet'));
    expect(known.length).toBeGreaterThanOrEqual(3);
    for (const r of known) expect(r).toContain('from last winter');
  }, 300_000);
});
