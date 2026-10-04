import { describe, expect, test } from 'vitest';
import {
  advanceAgenda,
  agendaTerms,
  applyExemptions,
  calendarRetimer,
  careDuty,
  createAgenda,
  DEFAULT_PRAYER_TIMES,
  eidPrayer,
  fastWindow,
  iftarWindow,
  onFinished,
  owedMakeUps,
  type PrayerTimes,
  PURPOSE_DEFAULTS,
  prayerWindows,
  promise,
  ramadanFast,
  ramadanMeals,
  retimeCommitments,
  revisePurposes,
  scheduleMakeUp,
  suhoorWindow,
} from '../src/agenda/index.ts';
import { abstentionVeto, DEFAULT_NORMS, heldNorms, normVeto } from '../src/conscience/index.ts';
import { begin, createPerson, createVillage, decide, finish, tick, villagerSpec } from '../src/index.ts';
import type { Affordance, Commitment, HeldNorm, Outcome, Person } from '../src/types.ts';
import { MINUTES_PER_DAY } from '../src/types.ts';

const DAY = MINUTES_PER_DAY;
const T = DEFAULT_PRAYER_TIMES;

function person(norms: HeldNorm[] = [], illnesses: { severity: number }[] = []): Person {
  return {
    id: 'p1',
    now: 0,
    agenda: createAgenda({}, 0),
    conscience: { norms, breaches: [], intentions: [], nextBreach: 0 },
    body: { illnesses },
    traits: { honesty: 0.5 },
  } as unknown as Person;
}

const devoutNorms = (): HeldNorm[] => [{ normId: 'sawm-ramadan', standing: 'obligatory', conviction: 0.9 }];

const eat: Affordance = {
  id: 'a-eat',
  action: 'eat',
  label: 'Eat',
  duration: 20,
  effort: 0,
  advertises: { food: 0.4 },
};
const smoke: Affordance = {
  id: 'a-smoke',
  action: 'smoke',
  label: 'Smoke',
  duration: 10,
  effort: 0,
  advertises: {},
};
const done = (action: string, at: number, startedAt = at): [Outcome, number] => [
  { affordanceId: `a-${action}`, action, status: 'completed', at },
  startedAt,
];

function fasting(norms = devoutNorms(), days = 30): { p: Person; fast: Commitment } {
  const p = person(norms);
  const fast = promise(p, ramadanFast(0, days));
  return { p, fast };
}

describe('abstention commitments (N2)', () => {
  test('kept at window close when nothing violated it, and recurs next day', () => {
    const { p, fast } = fasting();
    const r = advanceAgenda(p, T.maghrib + 1);
    expect(r.kept).toEqual([fast]);
    expect(r.broken).toEqual([]);
    expect(fast.status).toBe('kept');
    const next = p.agenda.commitments.find((c) => c.status === 'pending' && c.kind === 'abstain');
    expect(next?.from).toBe(DAY + T.fajr);
    expect(next?.violatedBy).toEqual(['eat', 'drink']);
    expect(next?.violatedBy).not.toBe(fast.violatedBy);
  });

  test('broken by the first completed violating action inside the window', () => {
    const { p, fast } = fasting();
    expect(onFinished(p, ...done('pray', 600)).broken).toEqual([]);
    const r = onFinished(p, ...done('eat', 800, 780));
    expect(r.broken).toEqual([fast]);
    expect(fast.status).toBe('broken');
    expect(r.kept).toEqual([]);
  });

  test('eating that runs past dawn breaks it; eating that starts at maghrib does not; interrupted eating does not', () => {
    const a = fasting();
    expect(onFinished(a.p, ...done('eat', T.fajr + 5, T.fajr - 15)).broken).toHaveLength(1);
    const b = fasting();
    expect(onFinished(b.p, ...done('eat', T.maghrib + 20, T.maghrib)).broken).toHaveLength(0);
    expect(onFinished(b.p, ...done('eat', T.fajr - 1, T.fajr - 30)).broken).toHaveLength(0);
    const c = fasting();
    expect(
      onFinished(c.p, { affordanceId: 'x', action: 'eat', status: 'interrupted', at: 700 }, 690).broken,
    ).toEqual([]);
  });

  test('a negative term on violating options while open, scaled by held conviction; none on other actions', () => {
    const strong = fasting();
    const weak = fasting([{ normId: 'sawm-ramadan', standing: 'obligatory', conviction: 0.3 }]);
    const v = (p: Person, aff: Affordance, now: number) =>
      agendaTerms(p, aff, now).find((t) => t.source.startsWith('abstain:'))?.value ?? 0;
    expect(v(strong.p, eat, 700)).toBeLessThan(0);
    expect(v(weak.p, eat, 700)).toBeLessThan(0);
    expect(v(strong.p, eat, 700)).toBeLessThan(v(weak.p, eat, 700));
    expect(v(strong.p, smoke, 700)).toBe(0);
    expect(v(fasting([]).p, eat, 700)).toBe(0); // linked norm not held: no pull
    expect(v(strong.p, eat, T.maghrib)).toBe(0); // iftar
    expect(v(strong.p, eat, T.fajr - 60)).toBe(0); // suhoor that ends before dawn
    expect(v(strong.p, eat, T.fajr - 10)).toBeLessThan(0); // would run past dawn
    // Constant through the window, not rising with deadline pressure.
    expect(v(strong.p, eat, 400)).toBeCloseTo(v(strong.p, eat, 1000), 10);
  });

  test('a norm-free self-commitment ("no cigarette after iftar") uses importance alone and never vetoes', () => {
    const p = person([]);
    const c = promise(p, {
      kind: 'abstain',
      actions: [],
      violatedBy: ['smoke'],
      from: T.maghrib,
      until: T.maghrib + 120,
      importance: 0.6,
      toId: 'self',
    });
    const t = agendaTerms(p, smoke, T.maghrib + 10).find((x) => x.source === `abstain:${c.id}`);
    expect(t?.value).toBeCloseTo(-0.6, 10);
    p.now = T.maghrib + 10;
    expect(normVeto(p, smoke, 0)).toBeUndefined();
  });

  test('the abstention never pulls toward anything and is never "kept" by an action', () => {
    const { p, fast } = fasting();
    for (const aff of [eat, smoke, { ...eat, action: 'pray', id: 'a-pray' }]) {
      expect(agendaTerms(p, aff, 700).every((t) => t.value <= 0)).toBe(true);
    }
    expect(onFinished(p, { ...done('pray', 700)[0], fulfills: [fast.id] }).kept).toEqual([]);
    expect(fast.status).toBe('pending');
  });

  test('recurrence stops after the last day of Ramadan', () => {
    const { p } = fasting(devoutNorms(), 3);
    advanceAgenda(p, 10 * DAY);
    const fasts = p.agenda.commitments.filter((c) => c.chain === 'sawm:fast');
    expect(fasts.map((c) => c.from)).toEqual([T.fajr, DAY + T.fajr, 2 * DAY + T.fajr]);
    expect(fasts.every((c) => c.status === 'kept')).toBe(true);
  });
});

describe('abstention veto (N2 / N5 extension)', () => {
  test('a high-conviction holder will not eat during the fast: willNot duty:sawm-ramadan', () => {
    const { p } = fasting();
    expect(abstentionVeto(p, eat, 700)).toEqual({ kind: 'willNot', reason: 'duty:sawm-ramadan' });
    p.now = 700;
    expect(normVeto(p, eat, 0.3)).toEqual({ kind: 'willNot', reason: 'duty:sawm-ramadan' });
    expect(normVeto(p, eat, 0.3, { necessity: true, now: T.maghrib })).toBeUndefined();
    expect(normVeto(p, smoke, 0.3)).toBeUndefined();
  });

  test('a low-conviction holder is only pulled against, not blocked', () => {
    const { p } = fasting([{ normId: 'sawm-ramadan', standing: 'obligatory', conviction: 0.5 }]);
    expect(abstentionVeto(p, eat, 700)).toBeUndefined();
  });

  test('the capacity bound lifts the veto only at extreme need and only for an act meeting it', () => {
    const { p } = fasting();
    p.now = 700;
    expect(normVeto(p, eat, 0.8)).toBeUndefined();
    expect(normVeto(p, eat, 0.8, { necessity: false })).toEqual({
      kind: 'willNot',
      reason: 'duty:sawm-ramadan',
    });
    const cig = { ...smoke, violatedBy: undefined };
    p.agenda.commitments[0]?.violatedBy?.push('smoke');
    expect(normVeto(p, cig, 0.8)).toEqual({ kind: 'willNot', reason: 'duty:sawm-ramadan' });
  });

  test('through decide: insisting on eating cannot make a devout faster break the fast', () => {
    const spec = villagerSpec('a', 'a', 3, {
      now: 12 * 60,
      devout: true,
      others: ['a', 'b'],
      body: { satiety: 0.4 },
    });
    spec.commitments = [...(spec.commitments ?? []), ramadanFast(0, 30)];
    const p = createPerson(spec);
    const affs = createVillage([p, createPerson(villagerSpec('b', 'b', 9, { now: 12 * 60 }))], {
      seed: 1,
      foodStock: 30,
    }).affordancesFor(p);
    expect(affs.some((a) => a.action === 'eat')).toBe(true);
    const r = decide(p, affs, {
      suggestion: { voiceId: 'player', action: 'eat', strength: 1, insist: true },
    });
    expect(r.chosenAction).not.toBe('eat');
    expect(r.suggestion?.verdict).toBe('refused');
    expect(r.suggestion?.kind).toBe('willNot');
    expect(r.suggestion?.reason).toBe('duty:sawm-ramadan');
  });
});

describe("fast exemptions (Qur'an 2:184-185) and make-ups", () => {
  test('the catalog carries the exemptions with provenance, separate from the 2:173 necessity exception', () => {
    const sawm = DEFAULT_NORMS.find((n) => n.id === 'sawm-ramadan');
    expect(sawm?.exemptions?.map((e) => e.when).sort()).toEqual(['illness', 'travel']);
    for (const e of sawm?.exemptions ?? []) {
      expect(e.makeUp).toBe(true);
      expect(e.sources.some((s) => s.kind === 'revelation' && s.ref.includes('2:184'))).toBe(true);
      expect(e.sources.some((s) => s.ref.includes('2:173'))).toBe(false);
    }
    const food = DEFAULT_NORMS.find((n) => n.id === 'forbidden-food');
    expect(food?.exemptions).toBeUndefined();
  });

  test('illness above threshold releases the day, lifts the veto and term, and records a qada', () => {
    const p = person(devoutNorms(), [{ severity: 0.5 }]);
    const fast = promise(p, ramadanFast(0, 30));
    const r = applyExemptions(p, T.fajr - 30);
    expect(r.exempted).toEqual([fast]);
    expect(fast.exempt?.reason).toBe('illness');
    expect(abstentionVeto(p, eat, 700)).toBeUndefined();
    expect(agendaTerms(p, eat, 700).some((t) => t.source.startsWith('abstain:'))).toBe(false);
    expect(onFinished(p, ...done('eat', 700)).broken).toEqual([]);
    expect(owedMakeUps(p)).toHaveLength(1);
    expect(owedMakeUps(p)[0]).toMatchObject({ ofId: fast.id, normId: 'sawm-ramadan', reason: 'illness' });
    // Closes released, and the chain still recurs.
    const adv = advanceAgenda(p, DAY);
    expect(adv.released).toEqual([fast]);
    expect(fast.status).toBe('released');
    const pending = p.agenda.commitments.filter((c) => c.chain === 'sawm:fast' && c.status === 'pending');
    expect(pending).toHaveLength(1);
    expect(pending[0]?.exempt).toBeUndefined();
  });

  test('mild illness does not exempt; travel does, from a host flag', () => {
    const p = person(devoutNorms(), [{ severity: 0.1 }]);
    promise(p, ramadanFast(0, 30));
    expect(applyExemptions(p, 600).exempted).toEqual([]);
    expect(applyExemptions(p, 600, { traveling: true }).exempted[0]?.exempt?.reason).toBe('travel');
  });

  test("only today's instance, only a norm whose catalog lists the condition, never a broken one", () => {
    const p = person(devoutNorms(), [{ severity: 0.9 }]);
    const fast = promise(p, ramadanFast(0, 30));
    expect(applyExemptions(p, T.fajr - 7 * 60 - 1).exempted).toEqual([]); // too early
    onFinished(p, ...done('eat', 700));
    expect(fast.status).toBe('broken');
    expect(applyExemptions(p, 710).exempted).toEqual([]);
    const q = person(devoutNorms(), [{ severity: 0.9 }]);
    promise(q, { ...ramadanFast(0, 30), normId: 'punctuality' });
    expect(applyExemptions(q, 600).exempted).toEqual([]);
  });

  test('scheduleMakeUp turns the owed day into a one-off abstention on a host-chosen day', () => {
    const p = person(devoutNorms(), [{ severity: 0.5 }]);
    const fast = promise(p, ramadanFast(0, 30));
    applyExemptions(p, 600);
    const w = fastWindow(40);
    const made = scheduleMakeUp(p, fast.id, w);
    expect(made).toMatchObject({ kind: 'abstain', normId: 'sawm-ramadan', makeUpOf: fast.id, from: w.from });
    expect(made?.recurEvery).toBeUndefined();
    expect(owedMakeUps(p)).toEqual([]);
    expect(scheduleMakeUp(p, fast.id, w)).toBeUndefined();
  });
});

describe('per-day prayer calendar (N7)', () => {
  const drift: (day: number) => PrayerTimes = (day) => ({
    fajr: 300 - day,
    sunrise: 390 - day,
    dhuhr: 750,
    asr: 960,
    maghrib: 1125 + day,
    isha: 1215 + day,
  });

  test("prayerWindows takes a calendar; Isha runs to the next day's Fajr", () => {
    const w = prayerWindows(2, drift);
    // Fajr ends at sunrise (research/decisions.md).
    expect(w[0]).toMatchObject({ from: 2 * DAY + 298, until: 2 * DAY + 388, chain: 'salah:fajr' });
    expect(w[4]).toMatchObject({ from: 2 * DAY + 1217, until: 3 * DAY + 297 });
    expect(prayerWindows(0)[0]?.from).toBe(T.fajr);
  });

  test('retiming a successor keeps one chain: no duplicate spawn', () => {
    const p = person();
    for (const c of prayerWindows(0, drift)) promise(p, c);
    const fajr0 = p.agenda.commitments[0] as Commitment;
    onFinished(p, ...done('pray', 310));
    expect(fajr0.status).toBe('kept');
    advanceAgenda(p, 800);
    const retime = calendarRetimer(drift);
    retimeCommitments(p, 800, retime);
    const fajr1 = p.agenda.commitments.find((c) => c.chain === 'salah:fajr' && c.status === 'pending');
    expect(fajr1?.from).toBe(DAY + 299);
    advanceAgenda(p, 900);
    advanceAgenda(p, DAY + 200);
    expect(
      p.agenda.commitments.filter((c) => c.chain === 'salah:fajr' && c.status === 'pending'),
    ).toHaveLength(1);
  });

  test('a month of fasts follows the calendar when retimed each evening', () => {
    const p = person(devoutNorms());
    promise(p, ramadanFast(0, 30, drift));
    const retime = calendarRetimer(drift);
    for (let d = 0; d < 29; d++) {
      advanceAgenda(p, d * DAY + 1300);
      retimeCommitments(p, d * DAY + 1300, retime);
    }
    const fasts = () => p.agenda.commitments.filter((c) => c.chain === 'sawm:fast');
    const pending = fasts().filter((c) => c.status === 'pending');
    expect(pending).toHaveLength(1);
    expect(pending[0]).toMatchObject({ from: 29 * DAY + 300 - 29, until: 29 * DAY + 1125 + 29 });
    advanceAgenda(p, 31 * DAY);
    expect(fasts().filter((c) => c.status === 'pending')).toHaveLength(0);
  });

  test('suhoor, iftar and Eid helpers', () => {
    expect(suhoorWindow(1)).toEqual({ from: DAY + T.fajr - 60, until: DAY + T.fajr });
    expect(iftarWindow(1)).toEqual({ from: DAY + T.maghrib, until: DAY + T.maghrib + 45 });
    const meals = ramadanMeals(0, 30);
    expect(meals.map((m) => m.label)).toEqual(['suhoor', 'iftar']);
    const eid = eidPrayer({ from: 30 * DAY + 420, until: 30 * DAY + 600 });
    expect(eid.recurEvery).toBeUndefined();
    expect(eid.normId).toBe('eid-prayer');
    expect(eidPrayer({ from: 0, until: 1 }, { normId: null }).normId).toBeUndefined();
    expect(eid.actions).toEqual(['pray-eid']);
    const r = calendarRetimer(drift)({
      ...meals[0],
      id: 'x',
      status: 'pending',
      from: 5 * DAY + 240,
      until: 5 * DAY + 300,
    } as Commitment);
    expect(r).toEqual({ from: 5 * DAY + 295 - 60, until: 5 * DAY + 295 });
  });

  test('createAgenda assigns ids, so prayerWindows output goes straight into PersonSpec.commitments', () => {
    const a = createAgenda({ commitments: [{ ...ramadanFast(0, 1), id: 'c2' }, ...prayerWindows(0)] }, 0);
    const ids = a.commitments.map((c) => c.id);
    expect(new Set(ids).size).toBe(6);
    expect(ids[0]).toBe('c2');
    expect(ids.every((id) => id.length > 0)).toBe(true);
    const spec = villagerSpec('z', 'z', 1);
    spec.commitments = prayerWindows(0);
    const p = createPerson(spec);
    expect(new Set(p.agenda.commitments.map((c) => c.id)).size).toBe(5);
  });
});

describe('purpose revision (N14)', () => {
  const goal = (_p: Person) =>
    createAgenda(
      {
        goals: [
          {
            id: 'g-fix',
            label: 'fix-sewing-machine',
            serves: ['meaning'],
            advancedBy: [{ action: 'repair', amount: 0.2 }],
            importance: 0.8,
          },
        ],
      },
      0,
    ).goals[0] as NonNullable<Person['agenda']['goals'][number]>;

  test('neglected goals fade after the grace period and are abandoned with an episode draft', () => {
    const p = person();
    const g = goal(p);
    p.agenda.goals.push(g);
    expect(revisePurposes(p, 3 * DAY).abandoned).toEqual([]);
    expect(g.importance).toBeCloseTo(0.8, 10);
    revisePurposes(p, 5 * DAY);
    expect(g.importance).toBeCloseTo(0.8 * PURPOSE_DEFAULTS.decayPerDay ** 2, 10);
    let out = revisePurposes(p, 10 * DAY);
    for (let d = 11; out.abandoned.length === 0 && d < 60; d++) out = revisePurposes(p, d * DAY);
    expect(out.abandoned).toEqual([g]);
    expect(g.status).toBe('abandoned');
    expect(out.episodes[0]).toMatchObject({
      kind: 'abandoned',
      actorId: 'p1',
      summary: 'gave up on fix-sewing-machine',
    });
    expect(out.episodes[0]?.valence).toBeLessThan(0);
  });

  test('closed form: one call equals daily calls; progress restores importance and resets neglect', () => {
    const a = person();
    const b = person();
    const ga = goal(a);
    const gb = goal(b);
    a.agenda.goals.push(ga);
    b.agenda.goals.push(gb);
    for (let d = 1; d <= 8; d++) revisePurposes(a, d * DAY);
    revisePurposes(b, 8 * DAY);
    expect(ga.importance).toBeCloseTo(gb.importance, 12);
    onFinished(a, ...done('repair', 8 * DAY + 60));
    expect(ga.importance).toBeCloseTo(0.8, 10);
    revisePurposes(a, 11 * DAY);
    expect(ga.importance).toBeCloseTo(0.8, 10);
  });
});

describe('dependent care (N15)', () => {
  test("a dependent's urgent need becomes one renewing care duty owed to them", () => {
    const p = person(heldNorms({ practice: 0.5 }));
    expect(
      careDuty(p, { id: 'deniz', needs: [{ id: 'food', level: 0.6, urgency: 0.3 }] }, 600),
    ).toBeUndefined();
    const c = careDuty(p, { id: 'deniz', needs: [{ id: 'food', level: 0.2, urgency: 0.7 }] }, 600);
    expect(c).toMatchObject({
      kind: 'duty',
      normId: 'care-dependents',
      toId: 'deniz',
      targetId: 'deniz',
      actions: ['care'],
    });
    const again = careDuty(p, { id: 'deniz', needs: [{ id: 'water', level: 0.1, urgency: 0.95 }] }, 630);
    expect(again).toBe(c);
    expect(c?.until).toBe(690);
    expect(c?.importance).toBeGreaterThan(0.9);
    expect(p.agenda.commitments).toHaveLength(1);
    // Ignored need types do not create duties.
    expect(
      careDuty(p, { id: 'other', needs: [{ id: 'leisure', level: 0, urgency: 1 }] }, 600),
    ).toBeUndefined();
  });

  test('the care norm is catalogued with provenance and wrongs the dependent when missed', () => {
    const def = DEFAULT_NORMS.find((n) => n.id === 'care-dependents');
    expect(def?.standing).toBe('obligatory');
    expect(def?.sources?.some((s) => s.kind === 'assumption')).toBe(true);
    expect(heldNorms({ practice: 0 }).some((n) => n.normId === 'care-dependents')).toBe(true);
  });
});

describe('a break under necessity is excused, not a breach (review 2026-10-03)', () => {
  function faster(satiety: number) {
    const spec = villagerSpec('a', 'a', 3, {
      now: 12 * 60,
      devout: true,
      others: ['a', 'b'],
      body: { satiety, hydration: satiety },
    });
    spec.commitments = [...(spec.commitments ?? []), ramadanFast(0, 30)];
    const p = createPerson(spec);
    const affs = createVillage([p, createPerson(villagerSpec('b', 'b', 9, { now: 12 * 60 }))], {
      seed: 1,
      foodStock: 30,
    }).affordancesFor(p);
    const eatAff = affs.find((a) => a.action === 'eat') as Affordance;
    return { p, eatAff, record: decide(p, affs) };
  }
  const eatThrough = (p: Person, eatAff: Affordance, record: ReturnType<typeof decide>) => {
    const act = begin(p, eatAff, record);
    if (!act) throw new Error('dead');
    tick(p, act.endsAt);
    finish(p, { affordanceId: eatAff.id, action: 'eat', status: 'completed', at: act.endsAt });
    return act;
  };

  test('in extremity: no sawm breach, the day is exempt for necessity, a make-up is owed', () => {
    const { p, eatAff, record } = faster(0.02);
    const act = eatThrough(p, eatAff, record);
    expect(act.necessity).toBe(true);
    expect(p.conscience.breaches.filter((b) => b.normId === 'sawm-ramadan')).toEqual([]);
    const fast = p.agenda.commitments.find((c) => c.kind === 'abstain' && c.exempt?.reason === 'necessity');
    expect(fast?.status).toBe('pending');
    expect(owedMakeUps(p).map((o) => o.reason)).toEqual(['necessity']);
  });

  test('without extremity, forcing the same meal through begin is a breach and owes the day (1.7.0)', () => {
    const { p, eatAff, record } = faster(0.6);
    const act = eatThrough(p, eatAff, record);
    expect(act.necessity).toBeUndefined();
    expect(p.conscience.breaches.some((b) => b.normId === 'sawm-ramadan')).toBe(true);
    // research/decisions.md, fasting-sources.md §1: a broken fast is made up.
    expect(owedMakeUps(p).map((o) => o.reason)).toEqual(['broken']);
  });

  test("the host's catalog decides the make-up; a norm missing from it is not excused", () => {
    const own = DEFAULT_NORMS.map((n) => (n.id === 'sawm-ramadan' ? { ...n, exemptions: [] } : n));
    const a = faster(0.02);
    const act = begin(a.p, a.eatAff, a.record);
    if (!act) throw new Error('dead');
    tick(a.p, act.endsAt);
    finish(
      a.p,
      { affordanceId: a.eatAff.id, action: 'eat', status: 'completed', at: act.endsAt },
      { catalog: own },
    );
    expect(a.p.agenda.commitments.some((c) => c.exempt?.reason === 'necessity')).toBe(true);
    expect(owedMakeUps(a.p)).toEqual([]);

    const b = faster(0.02);
    const act2 = begin(b.p, b.eatAff, b.record);
    if (!act2) throw new Error('dead');
    tick(b.p, act2.endsAt);
    const without = DEFAULT_NORMS.filter((n) => n.id !== 'sawm-ramadan');
    finish(
      b.p,
      { affordanceId: b.eatAff.id, action: 'eat', status: 'completed', at: act2.endsAt },
      { catalog: without },
    );
    expect(b.p.agenda.commitments.some((c) => c.exempt?.reason === 'necessity')).toBe(false);
    // Not excused: an ordinary break, which owes the day as the person holds the fast obligatory (1.7.0).
    expect(owedMakeUps(b.p).map((o) => o.reason)).toEqual(['broken']);
  });
});
