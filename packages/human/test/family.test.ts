import { describe, expect, test } from 'vitest';
import {
  aptitudeOf,
  attachmentOf,
  begin,
  conceive,
  conceptionChance,
  createChild,
  createPerson,
  decide,
  deliver,
  enableGists,
  expectedEffect,
  finish,
  heldNorms,
  lifeModifiers,
  pregnancyDue,
  pregnancyModifiers,
  raise,
  remember,
  restore,
  retell,
  seedTie,
  skillLevel,
  skip,
  snapshot,
  tick,
} from '../src/index.ts';
import type { Affordance, Person, PersonSpec } from '../src/types.ts';
import { MINUTES_PER_DAY, MINUTES_PER_YEAR } from '../src/types.ts';

const NOW = 6 * 60;

function adult(id: string, sex: 'female' | 'male', age: number, extra: Partial<PersonSpec> = {}): Person {
  return createPerson({
    id,
    name: id,
    seed: id.length * 7 + age,
    now: NOW,
    bornAt: NOW - age * MINUTES_PER_YEAR,
    sex,
    ...extra,
  });
}

describe('family: conception, pregnancy and birth', () => {
  test('conception chance falls with the mother’s age and is zero when it cannot happen', () => {
    const dad = adult('d', 'male', 30);
    const young = adult('m1', 'female', 25);
    const older = adult('m2', 'female', 39);
    const year = conceptionChance(young, dad, 365);
    expect(year).toBeGreaterThan(0.9);
    expect(conceptionChance(young, dad, 29.5)).toBeCloseTo(0.2, 6);
    expect(conceptionChance(older, dad, 29.5)).toBeLessThan(0.5 * conceptionChance(young, dad, 29.5) + 1e-9);
    expect(conceptionChance(adult('m3', 'female', 52), dad, 365)).toBe(0);
    expect(conceptionChance(dad, young, 365)).toBe(0);
    conceive(young, dad, 11, NOW);
    expect(conceptionChance(young, dad, 365)).toBe(0);
  });

  test('a pregnancy is due about 268 days on, raises metabolism later, and delivery yields a child spec', () => {
    const mum = adult('m', 'female', 28);
    const dad = adult('d', 'male', 31);
    const pg = conceive(mum, dad, 42, NOW);
    expect(pg).toBeDefined();
    const days = ((pg?.dueAt ?? 0) - NOW) / MINUTES_PER_DAY;
    expect(days).toBeGreaterThan(230);
    expect(days).toBeLessThan(300);
    expect(conceive(mum, dad, 43, NOW)).toBeUndefined();
    const twin = adult('m', 'female', 28);
    expect(conceive(twin, dad, { at: NOW, seed: 42 })).toEqual(pg); // deprecated 2.0 form, removed in 3.0
    expect(mum.rng).toEqual(adult('m', 'female', 28).rng); // no person's stream consumed
    expect(pregnancyModifiers(mum, lifeModifiers(mum)).metabolism).toBe(lifeModifiers(mum).metabolism);
    tick(mum, NOW + 20 * 7 * MINUTES_PER_DAY);
    expect(pregnancyModifiers(mum, lifeModifiers(mum)).metabolism).toBeCloseTo(
      lifeModifiers(mum).metabolism * 1.15,
      9,
    );
    expect(pregnancyDue(mum)).toBe(false);
    expect(pregnancyDue(mum, pg?.dueAt ?? 0)).toBe(true);
    const born = deliver(mum, { id: 'k', name: 'Kid' }, pg?.dueAt ?? 0);
    expect(born).toMatchObject({ id: 'k', seed: 42, fatherId: 'd', bornAt: pg?.dueAt });
    expect(mum.family?.pregnancy).toBeUndefined();
    expect(mum.memory.episodes.some((e) => e.action === 'birth')).toBe(true);
    expect(deliver(mum, { id: 'k2' })).toBeUndefined();
  });
});

describe('family: inherited aptitudes', () => {
  test('children of gifted parents learn faster on average; a spec without aptitudes is unchanged', () => {
    const a = adult('a', 'female', 30, { family: { aptitudes: { smith: 2 } } });
    const b = adult('b', 'male', 30, { family: { aptitudes: { smith: 2 } } });
    const c = adult('c', 'female', 30);
    const d = adult('d', 'male', 30);
    const mean = (x: Person, y: Person) => {
      let s = 0;
      for (let i = 0; i < 200; i++) {
        const spec = createChild(x, y, { id: `k${i}`, name: 'K', seed: 1000 + i, aptitudes: ['smith'] }).spec;
        s += Math.log(spec.family?.aptitudes?.smith ?? 1);
      }
      return Math.exp(s / 200);
    };
    const gifted = mean(a, b);
    const plain = mean(c, d);
    expect(gifted).toBeGreaterThan(1.25); // regression toward the mean: about 2^0.5 ≈ 1.41
    expect(gifted).toBeLessThan(1.7);
    expect(plain).toBeGreaterThan(0.9);
    expect(plain).toBeLessThan(1.1);
    const without = createChild(a, b, { id: 'k', name: 'K', seed: 5 }).spec;
    const withApt = createChild(a, b, { id: 'k', name: 'K', seed: 5, aptitudes: ['smith'] }).spec;
    expect(without.family).toBeUndefined();
    expect(withApt.traits).toEqual(without.traits);
    expect(withApt.sex).toBe(without.sex);
  });

  test('aptitude multiplies learning when practising', () => {
    const forge: Affordance = {
      id: 'forge',
      action: 'forge',
      label: 'Forge',
      duration: 120,
      effort: 0.3,
      advertises: { competence: 0.1 },
      skill: { id: 'smith', difficulty: 0.4 },
    };
    const run = (p: Person) => {
      begin(p, forge, decide(p, [forge]));
      tick(p, NOW + 120);
      finish(p, { affordanceId: 'forge', action: 'forge', status: 'completed', at: p.now });
      return skillLevel(p, 'smith');
    };
    const gifted = run(adult('g', 'female', 20, { family: { aptitudes: { smith: 2 } } }));
    const plain = run(adult('g', 'female', 20));
    expect(aptitudeOf(adult('g', 'female', 20), 'smith')).toBe(1);
    expect(gifted).toBeGreaterThan(plain);
  });
});

describe('family: upbringing (control scenario)', () => {
  /** Two households raise otherwise identical children from birth to 16. */
  function household(devout: boolean, warm: boolean) {
    const values = devout
      ? { tradition: 0.9, conformity: 0.8, benevolence: 0.8, hedonism: 0.2 }
      : { tradition: 0.15, conformity: 0.3, benevolence: 0.5, hedonism: 0.8 };
    const norms = heldNorms({ practice: devout ? 0.9 : 0.05 });
    const mum = adult('mum', 'female', 30, { values, norms });
    const dad = adult('dad', 'male', 32, { values, norms });
    dad.will.voices.push({
      voiceId: 'imam',
      trust: devout ? 0.9 : 0.2,
      pressure: 0,
      accepted: 0,
      refused: 0,
      history: [],
    });
    const birth = createChild(mum, dad, { id: 'kid', name: 'Kid', seed: 9, bornAt: NOW });
    const kid = createPerson({ ...birth.spec, values: {}, norms: [] });
    for (const parent of [mum, dad])
      seedTie(parent, { otherId: 'kid', roles: ['child'], affection: warm ? 0.8 : 0 });
    for (let y = 0; y < 16; y++) {
      const t = NOW + (y + 1) * MINUTES_PER_YEAR;
      for (const x of [mum, dad, kid]) x.now = t;
      raise(kid, { caregivers: [mum, dad] }, MINUTES_PER_YEAR);
    }
    return { kid, mum };
  }

  test('a child of a devout warm household ends closer to it than a child of a secular one', () => {
    const devout = household(true, true).kid;
    const secular = household(false, true).kid;
    expect(devout.values.tradition).toBeGreaterThan(0.6);
    expect(secular.values.tradition).toBeLessThan(0.4);
    const salah = (p: Person) => p.conscience.norms.find((n) => n.normId === 'salah')?.conviction ?? 0;
    expect(salah(devout)).toBeGreaterThan(0.5);
    expect(salah(secular)).toBeLessThan(0.1);
    expect(devout.will.voices.find((v) => v.voiceId === 'imam')?.trust ?? 0).toBeGreaterThan(0.7);
    expect(attachmentOf(devout)).toBeGreaterThan(0.6);
  });

  test('without warmth a household teaches nothing and attachment stays at its start', () => {
    const cold = household(true, false).kid;
    expect(cold.values.tradition).toBe(0.5);
    expect(cold.conscience.norms).toHaveLength(0);
    expect(attachmentOf(cold)).toBe(0.6);
  });

  test('a caregiver who keeps breaching a norm teaches it weakly', () => {
    const lived = household(true, true);
    const kidA = lived.kid;
    const values = { tradition: 0.9 };
    const norms = heldNorms({ practice: 0.9 });
    const mum = adult('mum', 'female', 30, { values, norms });
    const dad = adult('dad', 'male', 32, { values, norms });
    const kid = createPerson({
      ...createChild(mum, dad, { id: 'kid', name: 'Kid', seed: 9, bornAt: NOW }).spec,
      values: {},
      norms: [],
    });
    for (const parent of [mum, dad]) seedTie(parent, { otherId: 'kid', roles: ['child'], affection: 0.8 });
    for (let y = 0; y < 16; y++) {
      const t = NOW + (y + 1) * MINUTES_PER_YEAR;
      for (const x of [mum, dad, kid]) x.now = t;
      for (const parent of [mum, dad])
        for (let i = 0; i < 4; i++)
          parent.conscience.breaches.push({
            id: `b${y}-${i}`,
            normId: 'lying',
            at: t - 10,
            weight: 0.5,
            repaired: false,
          });
      raise(kid, { caregivers: [mum, dad] }, MINUTES_PER_YEAR);
    }
    const lying = (p: Person) => p.conscience.norms.find((n) => n.normId === 'lying')?.conviction ?? 0;
    expect(lying(kid)).toBeLessThan(0.05);
    expect(lying(kidA)).toBeGreaterThan(0.5);
  });

  test('the family slice survives a save and a malformed one is dropped', () => {
    const { kid } = household(true, true);
    const back = restore(JSON.parse(JSON.stringify(snapshot(kid))));
    expect(back.family).toEqual(kid.family);
    const bad = JSON.parse(JSON.stringify(snapshot(kid)));
    bad.family = 'nonsense';
    expect(restore(bad).family).toBeUndefined();
    expect(createPerson({ id: 'x', name: 'x', seed: 1, bornAt: 0, sex: 'male' }).family).toBeUndefined();
  });
});

describe('family: stories of a place (L2, control scenario)', () => {
  const wall: Affordance = {
    id: 'stand-east',
    action: 'stand-watch',
    label: 'Stand on the east wall',
    placeId: 'east-wall',
    duration: 60,
    effort: 0.2,
    advertises: { competence: 0.3 },
  };
  const hall: Affordance = {
    ...wall,
    id: 'sit-hall',
    action: 'sit',
    label: 'Sit in the hall',
    placeId: 'hall',
  };

  /** A parent who lived through the night the east wall broke, long enough ago that only the gist remains. */
  function fearfulParent(): Person {
    const mum = adult('mum', 'female', 40);
    enableGists(mum);
    remember(mum, {
      at: mum.now,
      kind: 'outcome',
      action: 'stand-watch',
      actorId: 'mum',
      placeId: 'east-wall',
      valence: -0.9,
      summary: 'the night the east wall broke',
      tags: ['danger'],
    });
    skip(mum, mum.now + 2 * MINUTES_PER_YEAR);
    return mum;
  }
  const memoryTerm = (p: Person) =>
    decide(p, [wall, hall])
      .considered.find((c) => c.action === 'stand-watch')
      ?.terms.find((t) => t.source === 'memory');

  test('a child of a fearful parent believes the east wall riskier before ever standing there', () => {
    const mum = fearfulParent();
    expect(mum.memory.gists?.some((g) => g.placeId === 'east-wall')).toBe(true);
    const told = adult('kid', 'male', 10);
    const control = adult('kid', 'male', 10);
    enableGists(told);
    enableGists(control);
    const written = retell(mum, told, told.now, { trust: 0.9 });
    expect(written).toHaveLength(1);
    expect(written[0]).toMatchObject({ placeId: 'east-wall', count: 0 });
    expect(written[0]?.tags[0]).toBe('told');
    expect(told.memory.episodes.some((e) => e.placeId === 'east-wall')).toBe(false);
    expect(expectedEffect(told, wall).gist?.valence).toBeLessThan(-0.5);
    expect(memoryTerm(told)?.value).toBeLessThan(0);
    expect(memoryTerm(control)).toBeUndefined();
    // A story weighs less than having been there.
    const mumGist = mum.memory.gists?.find((g) => g.placeId === 'east-wall');
    expect(written[0]?.salience ?? 1).toBeLessThan(mumGist?.salience ?? 0);
  });

  test('retelling is bounded: trust scales it, telling twice does not raise it, own experience is kept', () => {
    const mum = fearfulParent();
    const a = adult('kid', 'male', 10);
    const b = adult('kid', 'male', 10);
    enableGists(a);
    enableGists(b);
    const high = retell(mum, a, a.now, { trust: 0.9 })[0]?.salience ?? 0;
    const low = retell(mum, b, b.now, { trust: 0.3 })[0]?.salience ?? 0;
    expect(low).toBeLessThan(high);
    expect(retell(mum, a, a.now, { trust: 0.9 })).toHaveLength(0);
    const c = adult('kid', 'male', 10);
    enableGists(c);
    expect(retell(mum, c, { at: c.now, trust: 0.9 })[0]?.salience).toBe(high); // deprecated 2.0 form
    expect(a.memory.gists).toHaveLength(1);
    // Someone who stood there and came to like it keeps their own gist.
    const veteran = adult('vet', 'male', 30);
    enableGists(veteran);
    remember(veteran, {
      at: veteran.now,
      kind: 'outcome',
      action: 'stand-watch',
      actorId: 'vet',
      placeId: 'east-wall',
      valence: 0.6,
      summary: 'a quiet night on the east wall',
      tags: [],
    });
    skip(veteran, veteran.now + MINUTES_PER_YEAR);
    const before = JSON.stringify(veteran.memory.gists);
    retell(mum, veteran, veteran.now, { trust: 1 });
    expect(JSON.stringify(veteran.memory.gists)).toBe(before);
    // Without gists on, a listener hears nothing.
    const plain = adult('kid', 'male', 10);
    expect(retell(mum, plain, plain.now)).toEqual([]);
    expect(plain.memory.gists).toBeUndefined();
  });
});
