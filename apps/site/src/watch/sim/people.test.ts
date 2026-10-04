/**
 * G3-2: the watchers are HF people. Fear and family take them off the wall, the Keeper's reads come from what
 * he has seen, cards stay rare and on the lit stretch, and prayer stays quiet.
 */
import { impressionOf } from '@human/framework';
import { describe, expect, it } from 'vitest';
import { postSection, type WatcherId, watcherDef } from './config.ts';
import { litSection } from './night.ts';
import { isPost, KEEPER_ID, personOf } from './people.ts';
import { type PlanName, planInputs } from './plans.ts';
import { WatchRun } from './run.ts';
import type { NightNote } from './state.ts';

const SEEDS = Array.from({ length: 12 }, (_, i) => 1000 + i * 7919);

interface Seen {
  notes: NightNote[];
  litMinutes: Partial<Record<WatcherId, number>>[];
  confidence: Partial<Record<WatcherId, number>>[];
  cardsPerNight: number[];
  cardOffLit: number;
  stuckCards: number;
  prayed: number;
  prayerAlerts: number;
  ruslanAtArrival: number | null;
}

function meanConfidence(run: WatchRun, id: WatcherId): number {
  const cues = impressionOf(run.state.keeper, id, run.state.minute).cues;
  return cues.length === 0 ? 0 : cues.reduce((a, c) => a + c.confidence, 0) / cues.length;
}

function watch(seed: number, plan: PlanName, nights = 3): Seen {
  const run = new WatchRun(seed);
  run.input({ k: 'start' });
  const seen: Seen = {
    notes: [],
    litMinutes: [],
    confidence: [],
    cardsPerNight: [],
    cardOffLit: 0,
    stuckCards: 0,
    prayed: 0,
    prayerAlerts: 0,
    ruslanAtArrival: null,
  };
  for (let n = 1; n <= nights; n++) {
    if (run.state.night === 3 && personOf(run.state, 'ruslan'))
      seen.ruslanAtArrival = meanConfidence(run, 'ruslan');
    for (const i of planInputs(run.state, plan, true)) run.input(i);
    run.input({ k: 'begin' });
    const lit: Partial<Record<WatcherId, number>> = {};
    let opened = -1;
    while (run.state.phase === 'night') {
      run.step();
      const s = run.state;
      const ls = litSection(s);
      for (const [id, pl] of Object.entries(s.place)) {
        if (ls && isPost(pl) && postSection(pl) === ls)
          lit[id as WatcherId] = (lit[id as WatcherId] ?? 0) + 1;
      }
      const m = s.moment;
      if (m && m.id !== opened) {
        opened = m.id;
        if (m.section !== ls) seen.cardOffLit += 1;
      }
      if (m && s.minute > m.until + 1) seen.stuckCards += 1;
      const y = personOf(s, 'yunus');
      if (y?.activity?.action === 'pray' && y.activity.startedAt === s.minute - 1) seen.prayed += 1;
    }
    const s = run.state;
    seen.prayerAlerts += s.alerts.filter((a) => /pray/i.test(a.text)).length;
    seen.notes.push(...s.notes);
    seen.cardsPerNight.push(s.momentLog.length);
    seen.litMinutes.push(lit);
    const conf: Partial<Record<WatcherId, number>> = {};
    for (const id of Object.keys(lit) as WatcherId[]) conf[id] = meanConfidence(run, id);
    seen.confidence.push(conf);
    if (s.phase !== 'dawn') break;
    run.input({ k: 'toDusk' });
  }
  return seen;
}

describe('watchers are people', () => {
  const runs = SEEDS.map((seed) => watch(seed, 'usual'));
  const notes = runs.flatMap((r) => r.notes);
  const count = (who: WatcherId, kind: NightNote['kind']) =>
    notes.filter((n) => n.who === who && n.kind === kind).length;

  it('fear takes some of them off the wall, but not Tamar', () => {
    const fled = notes.filter((n) => n.kind === 'fled' || n.kind === 'ran').length;
    expect(fled).toBeGreaterThan(0);
    expect(count('tamar', 'fled') + count('tamar', 'ran')).toBe(0);
  });

  it('only a watcher with family at home goes home to them', () => {
    const home = notes.filter((n) => n.kind === 'home');
    expect(home.length).toBeGreaterThan(0);
    for (const n of home) expect(watcherDef(n.who).family).not.toBeNull();
  });

  it('the Keeper is surer of the watchers he lit than of those he did not', () => {
    let more = 0;
    let pairs = 0;
    for (const r of runs) {
      for (let n = 0; n < r.litMinutes.length; n++) {
        const lit = r.litMinutes[n] ?? {};
        const conf = r.confidence[n] ?? {};
        const ids = (Object.keys(conf) as WatcherId[]).sort((a, b) => (lit[b] ?? 0) - (lit[a] ?? 0));
        const top = ids[0];
        const low = ids.at(-1);
        if (!top || !low || top === low || (lit[top] ?? 0) - (lit[low] ?? 0) < 60) continue;
        pairs += 1;
        if ((conf[top] ?? 0) > (conf[low] ?? 0)) more += 1;
      }
    }
    expect(pairs).toBeGreaterThan(5);
    expect(more / pairs).toBeGreaterThanOrEqual(0.75);
  });

  it('the newcomer arrives unknown to the Keeper', () => {
    for (const r of runs) if (r.ruslanAtArrival !== null) expect(r.ruslanAtArrival).toBeLessThan(0.05);
    expect(runs.some((r) => r.ruslanAtArrival !== null)).toBe(true);
  });

  it('Yunus prays on the wall with no alert', () => {
    expect(runs.reduce((a, r) => a + r.prayed, 0)).toBeGreaterThan(0);
    expect(runs.reduce((a, r) => a + r.prayerAlerts, 0)).toBe(0);
  });

  it('cards: at most three a night, on the lit stretch, and they close on their own', () => {
    for (const r of runs) {
      for (const c of r.cardsPerNight) expect(c).toBeLessThanOrEqual(3);
      expect(r.cardOffLit).toBe(0);
      expect(r.stuckCards).toBe(0);
    }
    expect(runs.some((r) => r.cardsPerNight.some((c) => c > 0))).toBe(true);
  });
});

describe('answering a card', () => {
  it('ringing the bell from a card commands that watcher', () => {
    let rung = 0;
    for (const seed of SEEDS) {
      const run = new WatchRun(seed);
      run.input({ k: 'start' });
      for (const i of planInputs(run.state, 'usual', true)) run.input(i);
      run.input({ k: 'begin' });
      while (run.state.phase === 'night') {
        run.step();
        const m = run.state.moment;
        if (m?.options.some((o) => o.id === 'bell')) {
          run.input({ k: 'answer', id: m.id, choice: 'bell' });
          expect(run.state.moment).toBeNull();
          expect(run.state.commands[m.who]?.cmd.voiceId).toBe(KEEPER_ID);
          rung += 1;
          break;
        }
      }
      if (rung >= 2) break;
    }
    expect(rung).toBeGreaterThan(0);
  });

  it('letting a watcher go clears the posting for the night and restores it at dusk', () => {
    for (const seed of SEEDS) {
      const run = new WatchRun(seed);
      run.input({ k: 'start' });
      for (const i of planInputs(run.state, 'usual', true)) run.input(i);
      run.input({ k: 'begin' });
      while (run.state.phase === 'night') {
        run.step();
        const m = run.state.moment;
        if (m?.options.some((o) => o.id === 'let') && run.state.posts[m.who]) {
          const post = run.state.posts[m.who];
          run.input({ k: 'answer', id: m.id, choice: 'let' });
          expect(run.state.posts[m.who]).toBeNull();
          while (run.state.phase === 'night') run.step();
          if (run.state.phase !== 'dawn') return;
          run.input({ k: 'toDusk' });
          expect(run.state.posts[m.who]).toBe(post);
          return;
        }
      }
    }
    throw new Error('no card offered "let" on any seed');
  });
});
