import { describe, expect, test } from 'vitest';
import { runZakatAlFitrControl } from '../examples/zakat-al-fitr-control.ts';
import {
  agendaTerms,
  begin,
  createPerson,
  DEFAULT_NORMS,
  decide,
  finish,
  promise,
  readZakatAlFitr,
  restore,
  snapshot,
  tick,
  ZAKAT_AL_FITR_NORM,
  type ZakatAlFitrOptions,
  zakatAlFitr,
} from '../src/index.ts';

const options: ZakatAlFitrOptions = {
  enabled: true,
  eligible: true,
  amount: 240,
  from: 100,
  deadline: 400,
  action: 'pay-fitr:year-1',
};
const resident = () =>
  createPerson({
    id: 'p',
    name: 'Person',
    seed: 7,
    bornAt: -10000000,
    sex: 'female',
    norms: [{ normId: ZAKAT_AL_FITR_NORM.id, standing: 'obligatory', conviction: 0.9 }],
  });

describe('opt-in zakat al-fitr calendar', () => {
  test('absent, disabled, ineligible and unheld cases leave legacy state exact', () => {
    const person = resident();
    const before = snapshot(person);
    expect(zakatAlFitr(person)).toBeUndefined();
    expect(zakatAlFitr(person, { ...options, enabled: false })).toBeUndefined();
    expect(zakatAlFitr(person, { ...options, eligible: false })).toBeUndefined();
    expect(snapshot(person)).toEqual(before);
    person.conscience.norms = [];
    expect(zakatAlFitr(person, options)).toBeUndefined();
    expect(DEFAULT_NORMS.some((n) => n.id === ZAKAT_AL_FITR_NORM.id)).toBe(false);
  });

  test('omitted and disabled helpers preserve full composite continuation and RNG', () => {
    const run = (mode: 'none' | 'omitted' | 'disabled') => {
      const person = resident();
      if (mode === 'omitted') zakatAlFitr(person);
      if (mode === 'disabled') zakatAlFitr(person, { ...options, enabled: false });
      const duty = promise(person, {
        kind: 'duty',
        actions: ['work'],
        from: 0,
        until: 100,
        importance: 0.5,
        normId: ZAKAT_AL_FITR_NORM.id,
      });
      tick(person, 90);
      const aff = { id: 'work', action: 'work', label: 'work', duration: 20, effort: 0, advertises: {} };
      begin(person, aff, decide(person, [aff]));
      finish(person, { at: 110, affordanceId: aff.id, action: aff.action, status: 'completed' });
      expect(duty.status).toBe('kept');
      promise(person, {
        kind: 'duty',
        actions: ['miss'],
        from: 120,
        until: 150,
        importance: 0.5,
        normId: ZAKAT_AL_FITR_NORM.id,
      });
      tick(person, 180);
      expect(person.conscience.breaches).toHaveLength(1);
      const saved = snapshot(person);
      expect(restore(saved)).toEqual(saved);
      return saved;
    };
    const baseline = run('none');
    expect(run('omitted')).toEqual(baseline);
    expect(run('disabled')).toEqual(baseline);
  });

  test('host units, action and window remain exact; partial and late payments stay outstanding', () => {
    const person = resident();
    const before = snapshot(person);
    const plan = zakatAlFitr(person, options);
    expect(plan).toMatchObject({
      amount: 240,
      commitment: {
        kind: 'appointment',
        actions: ['pay-fitr:year-1'],
        from: 100,
        until: 400,
        completion: 'end',
      },
    });
    if (!plan) throw Error('missing plan');
    expect(readZakatAlFitr(plan, 100, 399)).toEqual({ outstanding: 140, deadlinePassed: false });
    expect(readZakatAlFitr(plan, 100, 401)).toEqual({ outstanding: 140, deadlinePassed: true });
    expect(readZakatAlFitr(plan, 240, 401)).toEqual({ outstanding: 0, deadlinePassed: true });
    expect(plan.commitment.normId).toBeUndefined();
    expect(plan.payment).toMatchObject({ kind: 'duty', normId: ZAKAT_AL_FITR_NORM.id, completion: 'end' });
    expect(snapshot(person)).toEqual(before);
    expect(zakatAlFitr(person, { ...options, amount: 1.5 })?.amount).toBe(1.5);
  });

  test('rejects invalid host quantities and windows rather than guessing a ruling or amount', () => {
    const person = resident();
    for (const changed of [
      { amount: NaN },
      { amount: 0 },
      { deadline: 100 },
      { from: Infinity },
      { action: '' },
    ])
      expect(() => zakatAlFitr(person, { ...options, ...changed })).toThrow(/invalid/);
    const plan = zakatAlFitr(person, options);
    if (!plan) throw Error('missing plan');
    expect(() => readZakatAlFitr(plan, -1, 200)).toThrow(/invalid/);
  });

  test('composite early, ablated, partial, late and spanning transfers conserve money and receipt time', () => {
    expect(runZakatAlFitrControl()).toEqual([
      { arm: 'early', reminder: 'kept', payment: 'kept', transferred: 24, completedAt: 90 },
      { arm: 'ablated', commitments: 0, transferred: 0 },
      { arm: 'partial', reminder: 'broken', payment: 'kept', transferred: 24, completedAt: 110 },
      { arm: 'late', reminder: 'broken', payment: 'kept', transferred: 24, completedAt: 110 },
      { arm: 'spanning', reminder: 'broken', payment: 'kept', transferred: 24, completedAt: 110 },
    ]);
  });
});

describe('composite preferred-payment regressions', () => {
  test('preferred reminder expiry does not breach the obligatory payment norm', () => {
    const person = resident();
    const plan = zakatAlFitr(person, { ...options, from: 0, deadline: 100 });
    if (!plan) throw Error('missing plan');
    const reminder = promise(person, plan.commitment);
    const payment = promise(person, plan.payment);
    tick(person, 120);
    expect(payment.status).toBe('pending');
    const aff = {
      id: options.action,
      action: options.action,
      label: 'pay',
      duration: 1,
      effort: 0,
      advertises: {},
    };
    expect(
      agendaTerms(person, aff, 120).some((t) => t.source === `commitment:${payment.id}` && t.value > 0),
    ).toBe(true);
    const decision = decide(person, [aff]);
    expect(decision.chosenAction).toBe(options.action);
    expect(decision.considered[0]?.vetoed).toBeUndefined();
    expect(readZakatAlFitr(plan, 100, 120).outstanding).toBe(140);
    expect(reminder.status).toBe('broken');
    expect(person.memory.episodes.some((e) => e.kind === 'missed')).toBe(true);
    expect(person.affect.emotions.some((e) => e.cause.startsWith('missed:'))).toBe(true);
    expect(person.conscience.breaches).toEqual([]);
  });

  test('receipt admission uses the inclusive completion minute, including offer utility', () => {
    const person = resident();
    const plan = zakatAlFitr(person, { ...options, from: 0, deadline: 100 });
    if (!plan) throw Error('missing plan');
    const reminder = promise(person, plan.commitment);
    tick(person, 90);
    const aff = {
      id: options.action,
      action: options.action,
      label: 'pay',
      duration: 10,
      effort: 0,
      advertises: {},
    };
    expect(agendaTerms(person, aff, 90).some((t) => t.source === `commitment:${reminder.id}`)).toBe(true);
    expect(agendaTerms(person, { ...aff, duration: 20 }, 90)).toEqual([]);
    begin(person, aff, decide(person, [aff]));
    finish(person, { at: 100, affordanceId: aff.id, action: aff.action, status: 'completed' });
    expect(reminder.status).toBe('kept');
  });

  test('payment begun at 90 and received at 110 does not keep the preferred deadline 100', () => {
    const person = resident();
    const plan = zakatAlFitr(person, { ...options, from: 0, deadline: 100 });
    if (!plan) throw Error('missing plan');
    const reminder = promise(person, plan.commitment);
    tick(person, 90);
    const aff = {
      id: options.action,
      action: options.action,
      label: 'pay',
      duration: 20,
      effort: 0,
      advertises: {},
    };
    expect(begin(person, aff, decide(person, [aff]))).not.toBeNull();
    finish(person, { at: 110, affordanceId: aff.id, action: aff.action, status: 'completed' });
    tick(person, 120);
    expect(reminder.status).toBe('broken');
    expect(person.conscience.breaches).toEqual([]);
  });
});
