import { describe, expect, test } from 'vitest';
import {
  actionTendencies,
  careFor,
  closeness,
  createCommunity,
  createPerson,
  isInsider,
  isOutsider,
  joinGroups,
  meet,
  outsiderStance,
  perceive,
  restore,
  snapshot,
  stepCommunity,
  villagerSpec,
} from '../src/index.ts';
import type { World } from '../src/sim/index.ts';
import type { Affordance, Percept, Person, PersonSpec } from '../src/types.ts';

const NOON = 12 * 60;
const ids = ['a', 'b', 'c'];

function villager(id: string, seed: number, traits?: PersonSpec['traits']): Person {
  return createPerson(villagerSpec(id, id, seed, { now: NOON, others: ids, ...(traits ? { traits } : {}) }));
}
function fearOf(p: Person, targetId?: string): number {
  let s = 0;
  for (const e of p.affect.emotions)
    if (e.id === 'fear' && (targetId === undefined || e.targetId === targetId)) s += e.intensity;
  return s;
}
function threat(p: Person, t: NonNullable<Percept['threat']>, actorId?: string): void {
  const pc: Percept = {
    at: p.now,
    channel: 'saw',
    kind: 'threat',
    salience: 0.9,
    summary: 'a threat',
    threat: t,
  };
  if (actorId !== undefined) pc.actorId = actorId;
  perceive(p, [pc]);
}

describe('insiders and outsiders', () => {
  test('without joinGroups nothing changes: meeting gives the plain tie, care is closeness', () => {
    const p = villager('a', 1);
    const rel = meet(p, 'x', ['raiders']);
    expect(rel).toMatchObject({ affection: 0, trust: 0.5, familiarity: 0, groups: ['raiders'] });
    expect(isOutsider(p, 'x')).toBe(false);
    expect(careFor(p, 'b')).toBe(closeness(p, 'b'));
  });

  test('insiders get warmer defaults and are cared for; outsiders get wary ones, by stance', () => {
    const p = villager('a', 2);
    joinGroups(p, ['village']);
    const ins = meet(p, 'n', ['village']);
    expect(ins).toMatchObject({ affection: 0.15, trust: 0.6, familiarity: 0.1 });
    expect(isInsider(p, 'n')).toBe(true);
    expect(careFor(p, 'n')).toBeGreaterThanOrEqual(0.3);
    joinGroups(p, ['village'], { outsiderStance: -1 });
    const wary = meet(p, 'x', ['raiders']);
    joinGroups(p, ['village'], { outsiderStance: 1 });
    const open = meet(p, 'y', ['traders']);
    expect(wary.trust).toBeCloseTo(0.25, 10);
    expect(open.trust).toBeCloseTo(0.55, 10);
    expect(wary.affection).toBeLessThan(open.affection);
    expect(isOutsider(p, 'x')).toBe(true);
    // Meeting again keeps the tie's values and updates only the groups.
    wary.trust = 0.9;
    expect(meet(p, 'x', ['village']).trust).toBe(0.9);
    expect(isInsider(p, 'x')).toBe(true);
  });

  test('the default stance comes from openness and agreeableness', () => {
    const closed = villager('a', 3, { openness: 0.1, agreeableness: 0.2 });
    const open = villager('a', 3, { openness: 0.9, agreeableness: 0.8 });
    expect(outsiderStance(closed)).toBeCloseTo(-0.7, 10);
    expect(outsiderStance(open)).toBeCloseTo(0.7, 10);
  });

  test('a threat to me becomes fear aimed at its source, which raises risk aversion and avoidance', () => {
    const p = villager('a', 4);
    threat(p, { severity: 0.8, sourceId: 'forest' });
    expect(fearOf(p, 'forest')).toBeGreaterThan(0.3);
    const t = actionTendencies(p);
    expect(t['avoid:forest']).toBeGreaterThan(0.3);
    expect(t.risky).toBeLessThan(0);
    expect(p.memory.episodes.at(-1)?.tags).toContain('threat');
  });

  test('a threat to someone else matters by care: more for an insider than for a stranger', () => {
    const member = villager('a', 5);
    const loner = villager('a', 5);
    joinGroups(member, ['village']);
    for (const p of [member, loner]) meet(p, 'z', ['village']);
    threat(member, { severity: 0.8, aboutId: 'z', sourceId: 'x' });
    threat(loner, { severity: 0.8, aboutId: 'z', sourceId: 'x' });
    expect(fearOf(member, 'x')).toBeGreaterThan(fearOf(loner, 'x'));
    expect(fearOf(loner, 'x')).toBe(0);
  });

  test('a wary person fears an outsider source more than the same threat from an insider', () => {
    const p = villager('a', 6);
    const q = villager('a', 6);
    for (const x of [p, q]) joinGroups(x, ['village'], { outsiderStance: -1 });
    meet(p, 's', ['raiders']);
    meet(q, 's', ['village']);
    threat(p, { severity: 0.5 }, 's');
    threat(q, { severity: 0.5 }, 's');
    expect(fearOf(p, 's')).toBeGreaterThan(fearOf(q, 's'));
  });

  test('group fields survive save and restore; malformed ones are dropped', () => {
    const p = villager('a', 7);
    joinGroups(p, ['village', 'household'], { outsiderStance: -0.3 });
    meet(p, 'x', ['raiders']);
    const q = restore(JSON.parse(JSON.stringify(snapshot(p))));
    expect(q.social).toEqual(p.social);
    const bad = JSON.parse(JSON.stringify(snapshot(p)));
    bad.social.groups = { memberOf: 'village' };
    bad.social.relationships.find((r: { otherId: string }) => r.otherId === 'x').groups = [1];
    const r = restore(bad);
    expect(r.social.groups).toBeUndefined();
    expect(r.social.relationships.find((x) => x.otherId === 'x')?.groups).toBeUndefined();
  });
});

describe('threat scenario (headless): wolves heard in the forest at dawn', () => {
  // A gatherer's day: forage in the forest (more food) or fish at the river (less), rest, drink, sleep. In one run
  // wolves are heard in the forest at 07:00; the control hears nothing.
  const START = 6 * 60;
  function camp(wolvesAt: number | undefined): World {
    let clock = START;
    const offers: Affordance[] = [
      {
        id: 'forage',
        action: 'forage',
        label: 'forage in the forest',
        placeId: 'forest',
        duration: 90,
        effort: 0.4,
        advertises: { food: 0.45 },
        tags: ['outdoors'],
      },
      {
        id: 'fish',
        action: 'fish',
        label: 'fish at the river',
        placeId: 'river',
        duration: 90,
        effort: 0.4,
        advertises: { food: 0.3 },
        tags: ['outdoors'],
      },
      {
        id: 'drink',
        action: 'drink',
        label: 'drink',
        duration: 10,
        effort: 0.05,
        advertises: { water: 0.6 },
      },
      {
        id: 'rest',
        action: 'rest',
        label: 'rest',
        duration: 30,
        effort: 0,
        advertises: { rest: 0.25 },
        tags: ['rest'],
      },
      {
        id: 'sleep',
        action: 'sleep',
        label: 'sleep',
        duration: 480,
        effort: 0,
        mode: 'sleep',
        advertises: { sleep: 0.8, rest: 0.4 },
      },
    ];
    return {
      now: () => clock,
      affordancesFor: (q) => {
        clock = Math.max(clock, q.now);
        return offers.map((o) => ({ ...o }));
      },
      perceptsFor: (_q, since, until) =>
        wolvesAt !== undefined && wolvesAt > since && wolvesAt <= until
          ? [
              {
                at: wolvesAt,
                channel: 'heard',
                kind: 'wolves',
                placeId: 'forest',
                salience: 0.9,
                valence: -0.5,
                summary: 'wolves howling in the forest',
                threat: { severity: 0.8, sourceId: 'forest' },
                near: true,
              },
            ]
          : [],
      resolve: (_q, act, reason) => ({
        affordanceId: act.affordance.id,
        action: act.affordance.action,
        status: reason === 'ended' ? 'completed' : 'interrupted',
        at: Math.max(clock, act.startedAt + act.affordance.duration),
        needs: reason === 'ended' ? { ...act.affordance.advertises } : {},
      }),
    };
  }
  function run(wolves: boolean) {
    const p = createPerson(
      villagerSpec('a', 'a', 4, { now: START, others: [], body: { satiety: 0.35, hydration: 0.8 } }),
    );
    const world = camp(wolves ? 7 * 60 : undefined);
    const events = stepCommunity(createCommunity([p]), world, START + 18 * 60);
    const gathering = events.filter(
      (e) => e.kind === 'begin' && (e.action === 'forage' || e.action === 'fish'),
    );
    return { p, gathering };
  }

  test('after the howling he fishes instead of foraging until the fear fades; the control forages', () => {
    const calm = run(false);
    const wary = run(true);
    const firstAfter = (g: typeof calm.gathering) => g.find((e) => e.at >= 7 * 60);
    expect(firstAfter(calm.gathering)?.action).toBe('forage');
    expect(firstAfter(wary.gathering)?.action).toBe('fish');
    // The fear fades within hours (half-life 2 h): by the afternoon he is back in the forest.
    expect(wary.gathering.some((e) => e.action === 'forage' && e.at >= 13 * 60)).toBe(true);
    expect(wary.p.memory.episodes.some((e) => e.tags.includes('threat'))).toBe(true);
    expect(JSON.stringify(snapshot(run(true).p))).toBe(JSON.stringify(snapshot(wary.p)));
  });
});
