import { describe, expect, test } from 'vitest';
import type { Community, SimEvent, Village } from '../src/index.ts';
import {
  begin,
  createCommunity,
  createPerson,
  createVillage,
  decide,
  finish,
  MINUTES_PER_DAY,
  snapshot,
  stepCommunity,
  tick,
  villagerSpec,
} from '../src/index.ts';
import type { Affordance, Outcome, Person } from '../src/types.ts';

const START = 7 * 60;

interface Setup {
  people: Person[];
  village: Village;
  community: Community;
}

function setup(
  ids: string[],
  opts: { devout?: string[]; seed?: number; foodStock?: number; now?: number } = {},
): Setup {
  const now = opts.now ?? START;
  const people = ids.map((id, i) =>
    createPerson(
      villagerSpec(id, id, 100 + i, { devout: opts.devout?.includes(id) ?? false, others: ids, now }),
    ),
  );
  const village = createVillage(people, {
    seed: opts.seed ?? 7,
    ...(opts.foodStock !== undefined ? { foodStock: opts.foodStock } : {}),
  });
  return { people, village, community: createCommunity(people) };
}

const completed = (village: Village, id: string, action: string) =>
  village.state.completed[id]?.[action] ?? 0;

describe('village simulation', () => {
  test('is deterministic: the same seeds give identical state and events after three days', () => {
    const run = () => {
      const s = setup(['amina', 'bilal', 'cem'], { devout: ['amina'] });
      const events = stepCommunity(s.community, s.village, START + 3 * MINUTES_PER_DAY);
      return JSON.stringify({ people: s.people.map(snapshot), events, food: s.village.state.food });
    };
    const a = run();
    expect(a.length).toBeGreaterThan(1000);
    expect(run()).toBe(a);
  });

  test('stepping in one call or in hourly calls gives the same result', () => {
    const one = setup(['amina', 'bilal'], { devout: ['amina'] });
    const many = setup(['amina', 'bilal'], { devout: ['amina'] });
    const until = START + 2 * MINUTES_PER_DAY;
    const eventsOne = stepCommunity(one.community, one.village, until);
    const eventsMany: SimEvent[] = [];
    for (let t = START + 60; t <= until; t += 60)
      eventsMany.push(...stepCommunity(many.community, many.village, t));
    expect(eventsMany.map((e) => [e.at, e.personId, e.kind, e.affordanceId])).toEqual(
      eventsOne.map((e) => [e.at, e.personId, e.kind, e.affordanceId]),
    );
    expect(many.village.state.food).toBe(one.village.state.food);
    for (let i = 0; i < one.people.length; i++) {
      const a = one.people[i] as Person;
      const b = many.people[i] as Person;
      expect(Math.abs(a.body.satiety - b.body.satiety)).toBeLessThan(0.02);
      expect(Math.abs(a.body.hydration - b.body.hydration)).toBeLessThan(0.02);
      expect(Math.abs(a.body.sleepPressure - b.body.sleepPressure)).toBeLessThan(0.02);
    }
  });

  test('nobody starves over seven days when food is reachable', () => {
    const s = setup(['amina', 'bilal', 'cem', 'dilara'], { devout: ['amina', 'dilara'] });
    stepCommunity(s.community, s.village, START + 7 * MINUTES_PER_DAY);
    for (const p of s.people) {
      expect(p.body.alive).toBe(true);
      // Eating is triggered when hunger crosses its threshold, so satiety oscillates well above starvation.
      expect(p.body.satiety).toBeGreaterThan(0.15);
      expect(p.body.hydration).toBeGreaterThan(0.15);
      expect(p.body.health).toBeGreaterThan(0.8);
      expect(completed(s.village, p.id, 'eat')).toBeGreaterThan(7);
      expect(completed(s.village, p.id, 'sleep')).toBeGreaterThanOrEqual(5);
    }
    expect(s.village.state.food).toBeGreaterThan(0);
    const theft = s.people.reduce((n, p) => n + completed(s.village, p.id, 'steal-bread'), 0);
    expect(theft).toBe(0);
  });

  test('the devout pray in their windows most days; the secular hardly ever', () => {
    const s = setup(['amina', 'bilal'], { devout: ['amina'] });
    stepCommunity(s.community, s.village, START + 7 * MINUTES_PER_DAY);
    const devout = completed(s.village, 'amina', 'pray');
    const secular = completed(s.village, 'bilal', 'pray');
    expect(devout).toBeGreaterThanOrEqual(7 * 3);
    expect(devout).toBeLessThanOrEqual(7 * 7);
    expect(secular).toBeLessThanOrEqual(2);
    // Missed prayers are owned: breaches are few relative to prayers.
    expect(s.people[0]?.conscience.breaches.length ?? 0).toBeLessThan(devout / 2);
  });

  test('necessity lets a starving person take bread, and the exception can be switched off', () => {
    const make = () => {
      const s = setup(['amina', 'bilal'], { foodStock: 0, now: 10 * 60 });
      const amina = s.people[0] as Person;
      amina.body.satiety = 0.03;
      return { s, amina };
    };
    const { s, amina } = make();
    // The host offers no forest today, so bread is the only food within reach.
    const affs = s.village.affordancesFor(amina).filter((a) => a.action !== 'forage');
    expect(affs.some((a) => a.action === 'eat')).toBe(false);
    const r = decide(amina, affs);
    expect(r.chosenAction).toBe('steal-bread');
    expect(r.considered.find((c) => c.action === 'steal-bread')?.vetoed).toBeUndefined();

    const strict = make();
    const strictAffs = strict.s.village
      .affordancesFor(strict.amina)
      .filter((a) => a.action === 'steal-bread' || a.action === 'wait');
    const r2 = decide(strict.amina, strictAffs, { necessity: false });
    expect(r2.chosenAction).not.toBe('steal-bread');
    expect(r2.considered.find((c) => c.action === 'steal-bread')?.vetoed?.kind).toBe('willNot');

    const fed = setup(['amina', 'bilal'], { foodStock: 0, now: 10 * 60 });
    const r3 = decide(fed.people[0] as Person, fed.village.affordancesFor(fed.people[0] as Person));
    expect(r3.chosenAction).not.toBe('steal-bread');
  });

  test('a person hurt in the forest at night avoids it afterwards and says why', () => {
    const night = 22 * 60;
    const s = setup(['amina', 'bilal'], { foodStock: 0, now: night });
    const amina = s.people[0] as Person;
    amina.body.satiety = 0.15;
    const affs = s.village.affordancesFor(amina);
    const forage = affs.find((a) => a.action === 'forage') as Affordance;
    expect(forage.tags).toContain('risky');
    const r0 = decide(amina, affs);
    begin(amina, forage, r0);
    tick(amina, amina.now + forage.duration);
    const outcome: Outcome = {
      affordanceId: forage.id,
      action: 'forage',
      status: 'failed',
      at: amina.now,
      injury: { part: 'leg', severity: 0.5, healRatePerDay: 0.1 },
      summary: 'went to the forest at night and got hurt by an animal',
    };
    finish(amina, outcome);
    expect(amina.memory.episodes.at(-1)?.tags).toContain('night');

    // Next night, equally hungry, with food back in stock: the forest loses to the kitchen and is cited.
    s.village.state.food = 10;
    tick(amina, night + MINUTES_PER_DAY);
    amina.body.satiety = 0.15;
    const r = decide(amina, s.village.affordancesFor(amina));
    expect(r.chosenAction).not.toBe('forage');
    const forageConsidered = r.considered.find((c) => c.action === 'forage');
    expect(forageConsidered?.terms.find((t) => t.source === 'expectation')?.value ?? 0).toBeLessThan(0);
    expect(r.narration).toContain('Last time, went to the forest at night and got hurt by an animal.');
  });

  test('a standing suggestion is resolved at every decision where it is heard, logged with its verdict, counted only on new choices', () => {
    const s = setup(['amina', 'bilal']);
    const events = stepCommunity(s.community, s.village, START + MINUTES_PER_DAY, {
      suggestions: { bilal: { voiceId: 'player', action: 'work-field', strength: 0.6 } },
    });
    const decisions = events.filter((e) => e.kind === 'decide' && e.personId === 'bilal');
    expect(decisions.filter((e) => e.verdict !== undefined).length).toBeGreaterThan(2);
    // Standing advice (round 3): it is held back while the field is not on offer or once the day's shift is done,
    // so it is never refused as unavailable.
    const bilalP = s.people.find((p) => p.id === 'bilal') as Person;
    expect(bilalP.trace.some((r) => r.suggestion?.reason === 'unavailable')).toBe(false);
    // Reviews that keep the running activity re-weigh the request quietly: counters reflect choices only.
    const continued = new Set(
      events.filter((e) => e.kind === 'continue' && e.personId === 'bilal').map((e) => e.at),
    );
    const choices = decisions.filter((e) => !(e.review && continued.has(e.at)) && e.verdict !== 'refused');
    const v = s.people.find((p) => p.id === 'bilal')?.will.voices.find((x) => x.voiceId === 'player');
    expect(continued.size).toBeGreaterThan(0);
    expect(v?.accepted ?? 0).toBeLessThanOrEqual(choices.length);
    expect(decisions.some((e) => e.verdict === 'assented')).toBe(true);
    expect(
      events
        .filter((e) => e.kind === 'decide' && e.personId === 'amina')
        .every((e) => e.verdict === undefined),
    ).toBe(true);
  });

  test('a standing insist to wait cannot starve anyone: bodily needs refuse it, and trust falls', () => {
    const s = setup(['amina', 'bilal']);
    const events = stepCommunity(s.community, s.village, START + 3 * MINUTES_PER_DAY, {
      suggestions: { bilal: { voiceId: 'player', action: 'wait', strength: 0.8, insist: true } },
    });
    const bilal = s.people.find((p) => p.id === 'bilal') as Person;
    expect(bilal.body.alive).toBe(true);
    expect(events.some((e) => e.kind === 'died')).toBe(false);
    // Engine 1.3.0: he finishes a field shift begun inside his job window before drinking, so 5 rather than 6+.
    expect(completed(s.village, 'bilal', 'drink')).toBeGreaterThanOrEqual(5);
    // Early on bodily needs refuse the insisted wait (cannot); once followed waits have gone badly, the episode
    // distrust rule refuses it outright (willNot: distrust). Either way the request never starves him.
    expect(
      bilal.trace.some(
        (r) =>
          (r.suggestion?.kind === 'cannot' && r.suggestion.reason.startsWith('need:')) ||
          (r.suggestion?.kind === 'willNot' && r.suggestion.reason === 'distrust'),
      ),
    ).toBe(true);
    expect(bilal.will.voices.find((v) => v.voiceId === 'player')?.trust ?? 1).toBeLessThan(0.5);
  });

  test('a field shift left early yields and pays pro rata', () => {
    const s = setup(['amina'], { now: 9 * 60 });
    const amina = s.people[0] as Person;
    const field = s.village.affordancesFor(amina).find((a) => a.id === 'work-field') as Affordance;
    const food = s.village.state.food;
    begin(amina, field, decide(amina, [field]));
    tick(amina, amina.now + 60);
    const out = s.village.resolve(amina, amina.activity as NonNullable<Person['activity']>, 'interrupted');
    expect(out.status).toBe('interrupted');
    expect(out.material ?? 0).toBeGreaterThan(0);
    expect(s.village.state.food).toBeGreaterThan(food);
  });

  // Wall-clock budgets for these runs are in village.timing.ts (`npm run bench`); here only the outcome is checked.
  test('runs 20 people for 30 days to the event cap with at most two deaths', () => {
    const ids = Array.from({ length: 20 }, (_, i) => `p${String(i).padStart(2, '0')}`);
    const s = setup(ids, { devout: ids.filter((_, i) => i % 2 === 0), foodStock: 200 });
    const events = stepCommunity(s.community, s.village, START + 30 * MINUTES_PER_DAY, { maxEvents: 1000 });
    expect(events.length).toBe(1000);
    expect(s.people.filter((p) => p.body.alive).length).toBeGreaterThanOrEqual(18);
  }, 30_000);

  test('runs 50 people for 30 days to the event cap with at most five deaths (engine 1.2.0 hooks included)', () => {
    const ids = Array.from({ length: 50 }, (_, i) => `q${String(i).padStart(2, '0')}`);
    const s = setup(ids, { devout: ids.filter((_, i) => i % 2 === 0), foodStock: 500 });
    const events = stepCommunity(s.community, s.village, START + 30 * MINUTES_PER_DAY, { maxEvents: 1000 });
    expect(events.length).toBe(1000);
    expect(s.people.filter((p) => p.body.alive).length).toBeGreaterThanOrEqual(45);
  }, 30_000);
});
