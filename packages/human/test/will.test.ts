import { describe, expect, test } from 'vitest';
import {
  begin,
  createPerson,
  createVillage,
  decide,
  learnFromVoice,
  predictResponse,
  readPerson,
  resolveChoice,
  vetoFor,
  villagerSpec,
  voiceOf,
  WILL_DEFAULTS,
} from '../src/index.ts';
import type { Affordance, Person, Suggestion } from '../src/types.ts';

const NOON = 12 * 60;

function villager(id: string, seed: number, opts: Parameters<typeof villagerSpec>[3] = {}): Person {
  return createPerson(villagerSpec(id, id, seed, { now: NOON, others: ['a', 'b', 'c'], ...opts }));
}

function offers(p: Person, foodStock = 30): Affordance[] {
  const others = ['a', 'b', 'c'].filter((id) => id !== p.id).map((id) => villager(id, 99));
  return createVillage([p, ...others], { seed: 1, foodStock }).affordancesFor(p);
}

const ask = (action: string, extra: Partial<Suggestion> = {}): Suggestion => ({
  voiceId: 'player',
  action,
  strength: 0.6,
  ...extra,
});

describe('suggestion verdicts', () => {
  test('assents when the suggestion matches what they would do anyway', () => {
    const p = villager('a', 1, { body: { satiety: 0.2 } });
    const r = decide(p, offers(p), { suggestion: ask('eat') });
    expect(r.chosenAction).toBe('eat');
    expect(r.suggestion?.verdict).toBe('assented');
    expect(r.intention).toBe('to feed myself');
  });

  test('defers with a counter-offer when something more pressing comes first', () => {
    const p = villager('a', 2, { body: { satiety: 0.05 } });
    const r = decide(p, offers(p), { suggestion: ask('chat') });
    expect(r.chosenAction).toBe('eat');
    expect(r.suggestion?.verdict).toBe('deferred');
    expect(r.suggestion?.kind).toBe('notNow');
    expect(r.suggestion?.counterOffer?.label).toMatch(/^after I /);
    expect(r.suggestion?.says.length).toBeGreaterThan(0);
  });

  test('will not steal when fed, however hard the voice pushes', () => {
    const p = villager('a', 3, { devout: true, traits: { honesty: 0.9 } });
    const r = decide(p, offers(p), { suggestion: ask('steal-bread', { strength: 1, insist: true }) });
    expect(r.chosenAction).not.toBe('steal-bread');
    expect(r.suggestion?.verdict).toBe('refused');
    expect(r.suggestion?.kind).toBe('willNot');
    expect(r.suggestion?.reason).toMatch(/theft|norm/);
  });

  test('cannot work while asleep and not desperate', () => {
    const p = villager('a', 4, { body: { sleepPressure: 0.95 } });
    const affs = offers(p);
    const sleep = affs.find((a) => a.action === 'sleep') as Affordance;
    begin(p, sleep, decide(p, affs));
    expect(p.body.asleep).toBe(true);
    const r = decide(p, offers(p), { now: p.now + 60, suggestion: ask('work-field', { insist: true }) });
    expect(r.suggestion?.verdict).toBe('refused');
    expect(r.suggestion?.kind).toBe('cannot');
    expect(r.chosenAction).toBe('sleep');
  });

  test('cannot take on an effort far beyond present capacity', () => {
    const p = villager('a', 5, { body: { exertion: 1, sleepPressure: 1, sleepDebt: 40, health: 0.2 } });
    const heavy: Affordance = {
      id: 'haul',
      action: 'haul',
      label: 'haul stones',
      duration: 60,
      effort: 1,
      advertises: { competence: 0.1 },
    };
    const rest: Affordance = {
      id: 'rest',
      action: 'rest',
      label: 'rest',
      duration: 30,
      effort: 0,
      advertises: { rest: 0.3 },
    };
    const capacity = readPerson(p).body.capacity;
    expect(capacity).toBeLessThan(1 / WILL_DEFAULTS.effortCapacityRatio);
    const r = decide(p, [heavy, rest], { suggestion: ask('haul', { insist: true }) });
    expect(r.suggestion?.verdict).toBe('refused');
    expect(r.suggestion?.kind).toBe('cannot');
    expect(r.suggestion?.reason).toBe('capacity');
  });

  test('complies under insistence, at a cost to autonomy, and remembers it', () => {
    const p = villager('a', 6);
    const autonomyBefore = p.needs.autonomy;
    const own = decide(villager('a', 6), offers(p)).chosenAction;
    expect(own).not.toBe('wait');
    const r = decide(p, offers(p), { suggestion: ask('wait', { insist: true }) });
    expect(r.chosenAction).toBe('wait');
    expect(r.suggestion?.verdict).toBe('complied');
    expect(r.suggestion?.kind).toBe('notNow');
    expect(p.needs.autonomy).toBeLessThan(autonomyBefore);
    expect(r.intention).toBe('because you insisted');
    expect(p.memory.episodes.some((e) => e.tags.includes('suggestion'))).toBe(true);
    expect(voiceOf(p, 'player')?.pressure).toBeGreaterThan(0);
  });

  test('refuses out of distrust when trust is gone and the voice keeps pushing', () => {
    const p = villager('a', 7, { body: { satiety: 0.05 }, voices: [{ voiceId: 'player', trust: 0.1 }] });
    const v = voiceOf(p, 'player');
    if (v) v.pressure = 0.9;
    const r = decide(p, offers(p), { suggestion: ask('chat') });
    expect(r.suggestion?.verdict).toBe('refused');
    expect(r.suggestion?.kind).toBe('willNot');
    expect(r.suggestion?.reason).toBe('distrust');
  });

  test('modifies to a near alternative serving the same aim', () => {
    const p = villager('a', 8, { body: { satiety: 0.1 } });
    const affs = offers(p);
    const eat = affs.find((a) => a.action === 'eat') as Affordance;
    const r = decide(p, affs, { suggestion: { voiceId: 'player', affordanceId: 'forage', strength: 0.5 } });
    expect(r.chosenAffordanceId).toBe(eat.id);
    expect(r.suggestion?.verdict).toBe('modified');
    expect(r.suggestion?.counterOffer?.affordanceId).toBe(eat.id);
  });

  test('a suggestion for an option that is not on offer is refused as unavailable', () => {
    const p = villager('a', 9);
    const r = decide(p, offers(p), { suggestion: ask('fly') });
    expect(r.suggestion?.verdict).toBe('refused');
    expect(r.suggestion?.kind).toBe('cannot');
    expect(r.suggestion?.reason).toBe('unavailable');
  });
});

describe('learning about voices', () => {
  test('trust rises after good advice and falls faster after harmful advice', () => {
    const good = villager('a', 10);
    const bad = villager('a', 10);
    const t0 = voiceOf(good, 'player')?.trust ?? 0;
    const resolution = { voiceId: 'player', verdict: 'assented' as const, reason: 'need:food', says: '' };
    learnFromVoice(good, resolution, 0.5);
    learnFromVoice(bad, resolution, -0.5);
    const gain = (voiceOf(good, 'player')?.trust ?? 0) - t0;
    const loss = t0 - (voiceOf(bad, 'player')?.trust ?? 0);
    expect(gain).toBeGreaterThan(0);
    expect(loss).toBeGreaterThan(gain);
  });

  test('pressure decays over hours', () => {
    const p = villager('a', 11);
    decide(p, offers(p), { suggestion: ask('wait', { insist: true }) });
    const before = voiceOf(p, 'player')?.pressure ?? 0;
    expect(before).toBeGreaterThan(0);
    decide(p, offers(p), { now: p.now + 24 * 60 });
    expect(voiceOf(p, 'player')?.pressure ?? 0).toBeLessThan(before / 4);
  });
});

describe('resolveChoice', () => {
  test('predictResponse neither mutates the person nor consumes randomness', () => {
    const p = villager('a', 12, { body: { satiety: 0.05 } });
    p.will.temperature = 0.3;
    const affs = offers(p);
    const first = decide(p, affs);
    const before = JSON.stringify(p);
    const readout = readPerson(p);
    const ctx = { now: p.now, affordances: affs, body: readout.body, desperation: readout.desperation };
    const predicted = predictResponse(p, first.considered, ctx, ask('chat'));
    expect(JSON.stringify(p)).toBe(before);
    expect(predicted.verdict).toBe('deferred');
  });

  test('hysteresis keeps the current activity unless a challenger beats it by the switch margin', () => {
    const p = villager('a', 13);
    const a: Affordance = { id: 'a', action: 'a', label: 'a', duration: 60, effort: 0, advertises: {} };
    const b: Affordance = { id: 'b', action: 'b', label: 'b', duration: 60, effort: 0, advertises: {} };
    const readout = readPerson(p);
    const ctx = { now: p.now, affordances: [a, b], body: readout.body, desperation: readout.desperation };
    begin(p, a, decide(p, [a, b]));
    const close = resolveChoice(
      p,
      [
        { affordanceId: 'a', action: 'a', utility: 0.5, terms: [] },
        { affordanceId: 'b', action: 'b', utility: 0.6, terms: [] },
      ],
      ctx,
    );
    expect(close.chosenAffordanceId).toBe('a');
    const far = resolveChoice(
      p,
      [
        { affordanceId: 'a', action: 'a', utility: 0.5, terms: [] },
        { affordanceId: 'b', action: 'b', utility: 0.9, terms: [] },
      ],
      ctx,
    );
    expect(far.chosenAffordanceId).toBe('b');
  });

  test('a positive temperature draws from the person rng deterministically', () => {
    const run = () => {
      const p = villager('a', 14);
      p.will.temperature = 0.5;
      const readout = readPerson(p);
      const options = ['a', 'b', 'c'].map((id) => ({
        affordanceId: id,
        action: id,
        utility: 0.5,
        terms: [],
      }));
      const affs = options.map((o) => ({
        id: o.affordanceId,
        action: o.action,
        label: o.action,
        duration: 10,
        effort: 0,
        advertises: {},
      }));
      const ctx = { now: p.now, affordances: affs, body: readout.body, desperation: readout.desperation };
      return Array.from({ length: 12 }, () => resolveChoice(p, options, ctx).chosenAffordanceId);
    };
    const first = run();
    expect(run()).toEqual(first);
    expect(new Set(first).size).toBeGreaterThan(1);
  });
});

const willCtx = (p: Person, affordances: Affordance[]) => {
  const r = readPerson(p);
  return { now: p.now, affordances, body: r.body, desperation: r.desperation };
};

describe('review fixes (2026-10-03)', () => {
  test('insisting cannot override a pressing bodily need', () => {
    const p = villager('a', 21, { body: { satiety: 0.05 } });
    const r = decide(p, offers(p), { suggestion: ask('wait', { insist: true }) });
    expect(r.chosenAction).toBe('eat');
    expect(r.suggestion?.verdict).toBe('refused');
    expect(r.suggestion?.kind).toBe('cannot');
    expect(r.suggestion?.reason).toBe('need:food');
    expect(r.suggestion?.says).toBe('I have to eat first.');
  });

  test('cannot refusals move no voice counters or pressure', () => {
    const p = villager('a', 22);
    decide(p, offers(p), { suggestion: ask('fly', { insist: true }) });
    const v = voiceOf(p, 'player');
    expect(v?.refused ?? 0).toBe(0);
    expect(v?.pressure ?? 0).toBe(0);
  });

  test('a coerced activity that felt good earns no trust; one that harmed costs trust', () => {
    const p = villager('a', 23);
    const complied = { voiceId: 'player', verdict: 'complied' as const, reason: 'x', says: '' };
    learnFromVoice(p, complied, 0.8);
    expect(voiceOf(p, 'player')?.trust).toBe(WILL_DEFAULTS.defaultVoiceTrust);
    learnFromVoice(p, complied, -0.8);
    expect(voiceOf(p, 'player')?.trust ?? 1).toBeLessThan(WILL_DEFAULTS.defaultVoiceTrust);
  });

  test('insisting earns no credit, and insisting at every turn ends in distrust refusals (playtest 2026-10-03)', () => {
    // An insisted assent that went well earns nothing; the same assent unforced earns trust.
    const p = villager('a', 25);
    learnFromVoice(p, { voiceId: 'player', verdict: 'assented', reason: 'x', says: '', insisted: true }, 0.8);
    expect(voiceOf(p, 'player')?.trust).toBe(WILL_DEFAULTS.defaultVoiceTrust);
    learnFromVoice(p, { voiceId: 'player', verdict: 'assented', reason: 'x', says: '' }, 0.8);
    expect(voiceOf(p, 'player')?.trust ?? 0).toBeGreaterThan(WILL_DEFAULTS.defaultVoiceTrust);
    // A voice that insists on chatting, decision after decision, wears trust down until he will not.
    const q = villager('a', 26);
    const verdicts: string[] = [];
    for (let i = 0; i < 20; i++) {
      const r = decide(q, offers(q), {
        suggestion: ask('chat', { strength: 1, insist: true }),
        now: NOON + i,
      });
      verdicts.push(`${r.suggestion?.verdict}/${r.suggestion?.kind ?? ''}`);
      q.activity = null;
    }
    const v = voiceOf(q, 'player');
    expect(v?.trust ?? 1).toBeLessThan(WILL_DEFAULTS.distrustTrust);
    expect(v?.history?.some((e) => e.reason === 'pushed')).toBe(true);
    expect(verdicts).toContain('refused/willNot');
  });

  test('a NaN in a host offer is vetoed as invalid and never chosen', () => {
    const p = villager('a', 24, { body: { hydration: 0.1 } });
    const bad: Affordance = {
      id: 'a-bad',
      action: 'bad',
      label: 'bad',
      duration: 10,
      effort: 0,
      advertises: { food: Number.NaN },
    };
    const r = decide(p, [bad, ...offers(p)]);
    expect(r.chosenAffordanceId).toBe('drink');
    expect(r.considered.every((c) => Number.isFinite(c.utility))).toBe(true);
    expect(vetoFor(p, bad, willCtx(p, [bad]))?.reason).toBe('invalid');
  });

  test('an 8-hour sleep is not on offer to someone who is not sleepy', () => {
    const p = villager('a', 25);
    const affs = offers(p);
    const sleep = affs.find((a) => a.action === 'sleep') as Affordance;
    expect(readPerson(p).body.perceived.sleepiness).toBeLessThan(WILL_DEFAULTS.sleepinessFloor);
    expect(vetoFor(p, sleep, willCtx(p, affs))?.reason).toBe('not-sleepy');
    expect(decide(p, affs).chosenAction).not.toBe('sleep');
  });

  test('with temperature > 0 the prediction reports the chance the suggestion is drawn', () => {
    const p = villager('a', 26, { body: { satiety: 0.3 } });
    p.will.temperature = 0.2;
    const affs = offers(p);
    const readout = readPerson(p);
    const ctx = { now: p.now, affordances: affs, body: readout.body, desperation: readout.desperation };
    const first = decide(villager('a', 26, { body: { satiety: 0.3 } }), affs);
    const res = predictResponse(p, first.considered, ctx, ask('eat'));
    expect(res.likelihood).toBeGreaterThan(0);
    expect(res.likelihood).toBeLessThan(1);
  });
});

describe('trust economy (engine 1.3.0)', () => {
  test('asking again for what he declines while pressed wears trust, at most once per wornInterval', () => {
    const p = villager('a', 31);
    const v = voiceOf(p, 'player');
    if (!v) throw new Error('no voice');
    const t0 = v.trust;
    const ask1 = () => {
      v.pressure = 0.9;
      p.activity = null;
      return decide(p, offers(p), { suggestion: ask('wait', { strength: 0.3 }) });
    };
    const r = ask1();
    expect(['deferred', 'refused', 'modified']).toContain(r.suggestion?.verdict);
    expect(r.suggestion?.kind).not.toBe('cannot');
    const t1 = v.trust;
    expect(t1).toBeCloseTo(t0 * (1 - WILL_DEFAULTS.trustLossWorn), 9);
    expect(v.history?.at(-1)?.reason).toBe('worn');
    ask1();
    expect(v.trust).toBe(t1);
    p.now += WILL_DEFAULTS.wornInterval;
    ask1();
    expect(v.trust).toBeLessThan(t1);
  });

  test('repeat good outcomes of the same suggested action earn less each time', () => {
    const p = villager('a', 32);
    const ok = { voiceId: 'player', verdict: 'assented' as const, reason: 'x', says: '' };
    const gains: number[] = [];
    for (let i = 0; i < 3; i++) {
      const before = voiceOf(p, 'player')?.trust ?? 0;
      learnFromVoice(p, ok, 0.6, { at: NOON + i * 60, action: 'tea' });
      gains.push((voiceOf(p, 'player')?.trust ?? 0) - before);
    }
    expect(gains[1] ?? 1).toBeLessThan(gains[0] ?? 0);
    expect(gains[2] ?? 1).toBeLessThan(gains[1] ?? 0);
    // A different action is not discounted by the first.
    const before = voiceOf(p, 'player')?.trust ?? 0;
    learnFromVoice(p, ok, 0.6, { at: NOON + 300, action: 'pray' });
    expect((voiceOf(p, 'player')?.trust ?? 0) - before).toBeGreaterThan(gains[2] ?? 1);
  });

  test('small trust changes fold into one history entry that keeps its span and count', () => {
    const p = villager('a', 33);
    const ok = { voiceId: 'player', verdict: 'assented' as const, reason: 'x', says: '' };
    for (let i = 0; i < 4; i++)
      learnFromVoice(p, ok, 0.01, { at: NOON + i * 60, action: 'tea', reason: 'felt' });
    const h = voiceOf(p, 'player')?.history ?? [];
    const last = h.at(-1);
    expect(last?.count ?? 1).toBeGreaterThan(1);
    expect(last?.from).toBeLessThan(last?.at ?? 0);
  });
});
