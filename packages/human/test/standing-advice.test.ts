/**
 * Standing advice (sim SCOPE, Game 2 round 3): a standing suggestion whose action keeps a commitment is satisfied
 * by one completion per occasion and lies dormant until the next window is within reach; one whose target is not
 * on offer is held back rather than refused; actions that keep no commitment are heard at every decision as before.
 */
import { describe, expect, test } from 'vitest';
import {
  createCommunity,
  createPerson,
  promise,
  type SimEvent,
  standingHeard,
  stepCommunity,
  type World,
} from '../src/index.ts';
import type { Affordance, Person, Suggestion } from '../src/types.ts';
import { MINUTES_PER_DAY } from '../src/types.ts';

const ADULT = -30 * 365 * MINUTES_PER_DAY;
const H = 60;

const person = (id = 'ali'): Person =>
  createPerson({ id, name: id, seed: 11, bornAt: ADULT, sex: 'male', now: 5 * H });

const aff = (id: string, over: Partial<Affordance> = {}): Affordance => ({
  id,
  action: id,
  label: id,
  duration: 30,
  effort: 0.1,
  advertises: {},
  ...over,
});

const PRAY = aff('pray', { duration: 30, tags: ['worship'], advertises: { meaning: 0.1 } });
const REST = aff('rest', { advertises: { rest: 0.2 }, effort: 0 });
const WAIT = aff('wait', { duration: 15, effort: 0 });

function world(offers: (p: Person) => Affordance[]): World {
  let now = 0;
  return {
    now: () => now,
    affordancesFor: offers,
    perceptsFor: (_p, _s, until) => {
      now = Math.max(now, until);
      return [];
    },
    resolve: (p, a, reason) => ({
      affordanceId: a.affordanceId,
      action: a.action,
      status: reason === 'ended' ? 'completed' : 'interrupted',
      at: p.now,
    }),
  };
}

/** Three daily worship windows (06–08, 12–14, 18–20), recurring, with no linked norm. */
function withWindows(p: Person): void {
  for (const [from, label] of [
    [6, 'dawn'],
    [12, 'noon'],
    [18, 'evening'],
  ] as const)
    promise(p, {
      kind: 'worship',
      actions: ['pray'],
      from: from * H,
      until: (from + 2) * H,
      importance: 0.5,
      recurEvery: MINUTES_PER_DAY,
      chain: `w:${label}`,
      label,
    });
}

const begins = (events: SimEvent[], id: string) =>
  events.filter((e) => e.kind === 'begin' && e.affordanceId === id).map((e) => e.at);

const urge = (over: Partial<Suggestion> = {}): Suggestion => ({
  voiceId: 'you',
  affordanceId: 'pray',
  strength: 0.9,
  ...over,
});

describe('standing advice', () => {
  test('an urge for an action that keeps a commitment is done once per window, not at every decision', () => {
    const p = person();
    withWindows(p);
    const c = createCommunity([p]);
    const events = stepCommunity(
      c,
      world(() => [PRAY, REST, WAIT]),
      2 * MINUTES_PER_DAY + 5 * H,
      {
        suggestions: { ali: urge({ since: 5 * H }) },
      },
    );
    const prays = begins(events, 'pray');
    // Six windows in two days, plus at most one prayer on the word before the first window opens.
    expect(prays.length).toBeLessThanOrEqual(7);
    expect(prays.length).toBeGreaterThanOrEqual(5);
    // Every window is still kept: the advice wakes before each one.
    const kept = p.agenda.commitments.filter((k) => k.status === 'kept').length;
    expect(kept).toBeGreaterThanOrEqual(5);
    // Between windows it is dormant: after the first, every prayer begins where it would keep a window.
    const inReach = (t: number) => {
      const m = t % MINUTES_PER_DAY;
      return [6, 12, 18].some((h) => m + PRAY.duration >= h * H && m <= (h + 2) * H);
    };
    expect(prays.slice(1).every(inReach)).toBe(true);
  });

  test('the same urge with no commitment behind the action is heard at every decision (unchanged)', () => {
    const p = person();
    const c = createCommunity([p]);
    const events = stepCommunity(
      c,
      world(() => [REST, WAIT]),
      5 * H + MINUTES_PER_DAY,
      {
        suggestions: { ali: { voiceId: 'you', affordanceId: 'rest', strength: 0.9, since: 5 * H } },
      },
    );
    const verdicts = events.filter((e) => e.kind === 'decide' && e.verdict !== undefined);
    expect(verdicts.length).toBeGreaterThan(10);
  });

  test('advice whose target is not on offer is held back, then heard when the option returns', () => {
    const p = person();
    const visit = aff('visit', { duration: 45, advertises: { belonging: 0.2 } });
    const offers = (q: Person) => {
      const m = q.now % MINUTES_PER_DAY;
      return m >= 14 * H && m < 15 * H ? [visit, REST, WAIT] : [REST, WAIT];
    };
    const c = createCommunity([p]);
    const events = stepCommunity(c, world(offers), 16 * H, {
      suggestions: { ali: { voiceId: 'you', affordanceId: 'visit', strength: 0.9, since: 5 * H } },
    });
    expect(p.trace.some((r) => r.suggestion?.reason === 'unavailable')).toBe(false);
    const before = events.filter((e) => e.kind === 'decide' && e.at < 14 * H && !e.review);
    expect(before.length).toBeGreaterThan(0);
    expect(before.every((e) => e.verdict === undefined)).toBe(true);
    expect(begins(events, 'visit').some((t) => t >= 14 * H && t < 15 * H)).toBe(true);
  });

  test('a completion before `since` does not satisfy advice given afresh; one after does', () => {
    const p = person();
    withWindows(p);
    const c = createCommunity([p]);
    c.standingDone = { ali: { 'aff:pray': { at: 7 * H, action: 'pray' } } };
    p.now = 9 * H;
    // Between windows (09:00) and prayed at 07:00.
    expect(standingHeard(c, p, urge({ since: 8 * H }), [PRAY])).toBe(true);
    expect(standingHeard(c, p, urge({ since: 6 * H }), [PRAY])).toBe(false);
    expect(standingHeard(c, p, urge(), [PRAY])).toBe(false);
    // It wakes when praying now would keep the noon window (a 30-minute prayer begun at 11:45 reaches it), not before.
    expect(standingHeard(c, p, urge({ since: 6 * H }), [PRAY], 11 * H)).toBe(false);
    expect(standingHeard(c, p, urge({ since: 6 * H }), [PRAY], 11 * H + 45)).toBe(true);
    // Not on offer: never heard.
    expect(standingHeard(c, p, urge({ since: 8 * H }), [REST])).toBe(false);
  });
});
