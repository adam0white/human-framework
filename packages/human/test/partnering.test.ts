import { describe, expect, test } from 'vitest';
import {
  canMarry,
  compatibility,
  court,
  courtingOffer,
  courtshipStage,
  createPerson,
  DEFAULT_NORMS,
  decide,
  familyVoices,
  GENERIC_CUSTOM,
  heldNorms,
  kinship,
  MARRIAGE_NORMS,
  MUSLIM_CUSTOM,
  marry,
  perceive,
  proposalOffers,
  proposeOffer,
  restore,
  seedTie,
  snapshot,
  spousesOf,
  widowhoodMortality,
} from '../src/index.ts';
import type { Person, PersonSpec } from '../src/types.ts';
import { MINUTES_PER_DAY, MINUTES_PER_YEAR } from '../src/types.ts';

const NOW = 6 * 60;
const SHARED = { tradition: 0.7, benevolence: 0.8, conformity: 0.6, hedonism: 0.3 };

function adult(id: string, sex: 'female' | 'male', age: number, extra: Partial<PersonSpec> = {}): Person {
  return createPerson({
    id,
    name: id,
    seed: id.charCodeAt(0) + age,
    now: NOW,
    bornAt: NOW - age * MINUTES_PER_YEAR,
    sex,
    values: SHARED,
    ...extra,
  });
}

const devoutNorms = () => heldNorms({ practice: 0.9 }, [...DEFAULT_NORMS, ...MARRIAGE_NORMS]);

/** Meet every `every` days, `n` times; both clocks advance with the meetings. */
function courtFor(a: Person, b: Person, n: number, every = 4, from = NOW, quality = 1): number {
  let t = from;
  for (let i = 0; i < n; i++) {
    t = from + i * every * MINUTES_PER_DAY;
    a.now = t;
    b.now = t;
    court(a, b, t, { quality });
  }
  return t;
}

describe('partnering: courtship and proposal (control scenario)', () => {
  test('two compatible adults court, he proposes, she accepts, and they marry under a family-consent custom', () => {
    const a = adult('amin', 'male', 26, { norms: devoutNorms() });
    const b = adult('banu', 'female', 24, { norms: devoutNorms() });
    expect(courtshipStage(a, b.id)).toBe('none');
    courtFor(a, b, 6);
    expect(courtshipStage(a, b.id)).toBe('courting');
    courtFor(a, b, 18, 4, a.now + 4 * MINUTES_PER_DAY);
    expect(courtshipStage(a, b.id)).toBe('ready');
    expect(courtshipStage(b, a.id)).toBe('ready');

    const propose = decide(a, [proposeOffer(a, b, { guardian: 'consented' }), courtingOffer(b)]);
    expect(propose.chosenAction).toBe('propose');
    const offers = proposalOffers(b, a, { guardian: 'consented' });
    const answer = decide(b, offers);
    expect(answer.chosenAction).toBe('accept-proposal');

    expect(marry(a, b, b.now, MUSLIM_CUSTOM, { guardian: 'consented' })).toEqual({ ok: true });
    expect(spousesOf(a)).toEqual([b.id]);
    expect(spousesOf(b)).toEqual([a.id]);
    expect(courtshipStage(a, b.id)).toBe('married');
    expect(a.social.relationships.find((r) => r.otherId === b.id)?.roles).toContain('spouse');
    expect(b.affect.emotions.some((e) => e.id === 'joy')).toBe(true);
    expect(b.bonds?.marriages[0]?.mourningDays).toBe(130);
    expect(a.bonds?.marriages[0]?.mourningDays).toBeUndefined();
    // Married: courting someone else pulls against.
    const c = adult('cem', 'female', 25);
    const r = decide(a, [courtingOffer(c)]);
    expect(r.considered[0]?.terms.some((t) => t.source === 'partner:unavailable')).toBe(true);
  });

  test('a person can refuse: a brief acquaintance with little in common is declined', () => {
    const a = adult('amin', 'male', 26, {
      values: { tradition: 0.1, benevolence: 0.2, hedonism: 0.9, power: 0.9 },
    });
    const b = adult('banu', 'female', 24, {
      values: { tradition: 0.9, benevolence: 0.9, hedonism: 0.1, power: 0.1 },
    });
    courtFor(a, b, 2);
    expect(compatibility(a, b)).toBeLessThan(0.6);
    expect(decide(b, proposalOffers(b, a)).chosenAction).toBe('decline-proposal');
  });

  test('family approval is a weighed voice: parents she trusts can tip a borderline answer either way', () => {
    const setup = () => {
      const a = adult('amin', 'male', 26);
      const b = adult('banu', 'female', 24, {
        voices: [
          { voiceId: 'mother', trust: 0.85 },
          { voiceId: 'father', trust: 0.85 },
        ],
      });
      courtFor(a, b, 9);
      return { a, b, offers: proposalOffers(b, a) };
    };
    const base = setup();
    const neutral = decide(base.b, base.offers);
    const pro = setup();
    const yes = decide(pro.b, pro.offers, {
      suggestions: familyVoices(pro.offers, [
        { voiceId: 'mother', approval: 0.8 },
        { voiceId: 'father', approval: 0.6 },
      ]),
    });
    const con = setup();
    const no = decide(con.b, con.offers, {
      suggestions: familyVoices(con.offers, [
        { voiceId: 'mother', approval: -0.8 },
        { voiceId: 'father', approval: -0.6 },
      ]),
    });
    const margin = (r: typeof neutral) =>
      (r.considered.find((c) => c.action === 'accept-proposal')?.utility ?? 0) -
      (r.considered.find((c) => c.action === 'decline-proposal')?.utility ?? 0);
    expect(margin(yes)).toBeGreaterThan(margin(neutral));
    expect(margin(no)).toBeLessThan(margin(neutral));
    expect(yes.chosenAction).toBe('accept-proposal');
    expect(no.chosenAction).toBe('decline-proposal');
  });

  test('family weighs in but does not decide: mild objection loses to a ready courtship, strong objection to a long one', () => {
    const answer = (meetings: number, approval: number) => {
      const a = adult('amin', 'male', 26);
      const b = adult('banu', 'female', 24, {
        voices: [
          { voiceId: 'mother', trust: 0.85 },
          { voiceId: 'father', trust: 0.85 },
        ],
      });
      courtFor(a, b, meetings);
      const offers = proposalOffers(b, a);
      const voices = familyVoices(offers, [
        { voiceId: 'mother', approval },
        { voiceId: 'father', approval },
      ]);
      return decide(b, offers, { suggestions: voices }).chosenAction;
    };
    expect(answer(20, -0.4)).toBe('accept-proposal');
    expect(answer(20, -0.9)).toBe('decline-proposal');
    expect(answer(60, -0.9)).toBe('accept-proposal');
  });
});

describe('partnering: kinship, guardian and seclusion', () => {
  function family() {
    const mum = adult('mum', 'female', 50);
    const dad = adult('dad', 'male', 52);
    const sis = adult('sis', 'female', 22);
    const bro = adult('bro', 'male', 25);
    for (const k of [sis, bro]) {
      seedTie(k, { otherId: 'mum', roles: ['parent'] });
      seedTie(k, { otherId: 'dad', roles: ['parent'] });
    }
    const aunt = adult('aunt', 'female', 45);
    seedTie(aunt, { otherId: 'gran', roles: ['parent'] });
    seedTie(mum, { otherId: 'gran', roles: ['parent'] });
    const gran = adult('gran', 'female', 75);
    const cousin = adult('cous', 'female', 24);
    seedTie(cousin, { otherId: 'aunt', roles: ['parent'] });
    const people = new Map([mum, dad, sis, bro, aunt, gran, cousin].map((p) => [p.id, p]));
    return { mum, dad, sis, bro, aunt, cousin, lookup: (id: string) => people.get(id) };
  }

  test('kinship from roles: siblings by shared parents, an aunt through a lookup, cousins not forbidden', () => {
    const f = family();
    expect(kinship(f.bro, f.sis)).toBe('sibling');
    expect(kinship(f.bro, f.mum)).toBe('parent');
    expect(kinship(f.bro, f.aunt)).toBeUndefined();
    expect(kinship(f.bro, f.aunt, f.lookup)).toBe('aunt-uncle');
    expect(kinship(f.bro, f.cousin, f.lookup)).toBeUndefined();
    expect(canMarry(f.bro, f.sis)).toEqual({ ok: false, reason: 'kin:sibling' });
    expect(canMarry(f.bro, f.aunt, GENERIC_CUSTOM, { lookup: f.lookup }).reason).toBe('kin:aunt-uncle');
    expect(canMarry(f.bro, f.cousin, MUSLIM_CUSTOM, { lookup: f.lookup })).toEqual({ ok: true });
  });

  test('affinity degrees: a step-parent is forbidden under the Muslim custom, not under the generic one', () => {
    const f = family();
    const stepmum = adult('step', 'female', 40);
    seedTie(f.dad, { otherId: 'step', roles: ['spouse'] });
    expect(kinship(f.bro, stepmum)).toBeUndefined(); // the step-mother's own roles do not name him
    seedTie(stepmum, { otherId: 'dad', roles: ['spouse'] });
    expect(kinship(f.bro, stepmum)).toBe('step-parent');
    expect(canMarry(f.bro, stepmum, MUSLIM_CUSTOM).reason).toBe('kin:step-parent');
    expect(canMarry(f.bro, stepmum, GENERIC_CUSTOM)).toEqual({ ok: true });
  });

  test('a firm understanding vetoes accepting a sibling, whatever the pull', () => {
    const f = family();
    const sis = adult('sis2', 'female', 22, { norms: devoutNorms() });
    seedTie(sis, { otherId: 'mum', roles: ['parent'] });
    const [accept] = proposalOffers(sis, f.bro);
    expect(accept.norms).toEqual([{ normId: 'kin-marriage', relation: 'violates' }]);
    const r = decide(sis, proposalOffers(sis, f.bro));
    expect(r.considered.find((c) => c.action === 'accept-proposal')?.vetoed?.reason).toBe(
      'norm:kin-marriage',
    );
  });

  test('a guardian’s just refusal blocks under the Muslim custom; an unjust refusal does not (2:232)', () => {
    const a = adult('amin', 'male', 26);
    const b = adult('banu', 'female', 24, { norms: devoutNorms() });
    expect(canMarry(a, b, MUSLIM_CUSTOM, { guardian: 'refused' }).reason).toBe('guardian');
    expect(canMarry(a, b, MUSLIM_CUSTOM, { guardian: 'refused-unjustly' })).toEqual({ ok: true });
    expect(canMarry(a, b, GENERIC_CUSTOM, { guardian: 'refused' })).toEqual({ ok: true });
    courtFor(a, b, 24);
    const refused = decide(b, proposalOffers(b, a, { guardian: 'refused' }));
    expect(refused.considered.find((c) => c.action === 'accept-proposal')?.vetoed?.reason).toBe(
      'norm:marry-without-guardian',
    );
    const unjust = decide(b, proposalOffers(b, a, { guardian: 'refused-unjustly' }));
    expect(unjust.considered.find((c) => c.action === 'accept-proposal')?.vetoed).toBeUndefined();
  });

  test('unchaperoned courting is declined by someone who holds the seclusion norm, not by someone who does not', () => {
    const devout = adult('dev', 'female', 24, { norms: devoutNorms() });
    const secular = adult('sec', 'female', 24, { norms: heldNorms({ practice: 0.05 }) });
    const him = adult('him', 'male', 26);
    const veto = (p: Person) =>
      decide(p, [courtingOffer(him, { chaperoned: false })]).considered[0]?.vetoed?.reason;
    expect(veto(devout)).toBe('norm:seclusion');
    expect(veto(secular)).toBeUndefined();
    expect(decide(devout, [courtingOffer(him)]).considered[0]?.vetoed).toBeUndefined();
  });

  test('age and existing marriage are custom checks', () => {
    const teen = adult('teen', 'female', 16);
    const a = adult('amin', 'male', 26);
    expect(canMarry(a, teen).reason).toBe('age');
    const b = adult('banu', 'female', 24);
    const c = adult('cem', 'female', 25);
    expect(marry(a, b, NOW).ok).toBe(true);
    expect(canMarry(a, c).reason).toBe('already-married');
  });
});

describe('partnering: widowhood', () => {
  test('a spouse’s death ends the marriage, brings grief and the waiting period, and raises mortality for a while', () => {
    const a = adult('amin', 'male', 60);
    const b = adult('banu', 'female', 58);
    courtFor(a, b, 20);
    marry(a, b, b.now, MUSLIM_CUSTOM);
    const death = b.now + 20 * MINUTES_PER_YEAR;
    for (const p of [a, b]) p.now = death;
    perceive(b, [
      { at: death, channel: 'saw', kind: 'death', targetId: a.id, salience: 1, valence: -1, summary: 'died' },
    ]);
    expect(spousesOf(b)).toEqual([]);
    expect(b.bonds?.marriages[0]).toMatchObject({ end: 'widowed', endedAt: death });
    expect(b.affect.emotions.some((e) => e.id === 'grief')).toBe(true);
    expect(b.bonds?.mourning?.until).toBe(death + 130 * MINUTES_PER_DAY);
    const suitor = adult('cem', 'male', 59);
    suitor.now = death;
    expect(canMarry(b, suitor, MUSLIM_CUSTOM, { at: death + 60 * MINUTES_PER_DAY }).reason).toBe('mourning');
    expect(canMarry(b, suitor, MUSLIM_CUSTOM, { at: death + 131 * MINUTES_PER_DAY })).toEqual({ ok: true });
    expect(widowhoodMortality(b, death + 30 * MINUTES_PER_DAY)).toBe(1.41);
    expect(widowhoodMortality(b, death + 400 * MINUTES_PER_DAY)).toBe(1.15);
    expect(widowhoodMortality(a)).toBe(1); // still recorded as married: the host marks the dead
    // A widower under the same custom has no waiting period.
    const c = adult('can', 'male', 60);
    const d = adult('dil', 'female', 58);
    marry(c, d, NOW, MUSLIM_CUSTOM);
    perceive(c, [
      { at: c.now, channel: 'saw', kind: 'death', targetId: d.id, salience: 1, valence: -1, summary: 'died' },
    ]);
    expect(c.bonds?.mourning).toBeUndefined();
    expect(widowhoodMortality(c, c.now + 400 * MINUTES_PER_DAY)).toBe(1.27);
  });

  test('bonds survive a save; a person never courted has none', () => {
    const a = adult('amin', 'male', 26);
    const b = adult('banu', 'female', 24);
    courtFor(a, b, 3);
    const back = restore(JSON.parse(JSON.stringify(snapshot(a))));
    expect(back.bonds).toEqual(a.bonds);
    const bad = JSON.parse(JSON.stringify(snapshot(a)));
    bad.bonds.courtships.push({ withId: 3 });
    expect(restore(bad).bonds?.courtships).toHaveLength(1);
    expect(adult('x', 'male', 30).bonds).toBeUndefined();
  });
});
