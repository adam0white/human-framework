/** Composite transfer control. Fictional host money; no religious outcome is asserted. */
import assert from 'node:assert/strict';
import {
  agendaTerms,
  begin,
  createPerson,
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
import type { Affordance, Person } from '../src/types.ts';

export function runZakatAlFitrControl() {
  const options: ZakatAlFitrOptions = {
    enabled: true,
    eligible: true,
    amount: 24,
    from: 0,
    deadline: 100,
    action: 'pay-fitr:occasion-1',
  };
  const results = [];
  for (const arm of ['early', 'ablated', 'partial', 'late', 'spanning'] as const) {
    const person = createPerson({
      id: 'resident',
      name: 'Resident',
      seed: 7,
      bornAt: -10000000,
      sex: 'female',
      norms: [{ normId: ZAKAT_AL_FITR_NORM.id, standing: 'obligatory', conviction: 0.9 }],
    });
    const before = snapshot(person);
    const plan = zakatAlFitr(person, { ...options, enabled: arm !== 'ablated' });
    assert.deepEqual(person, before, 'planning is pure, including RNG');
    const stock = { giver: 100, recipient: 0 };
    if (!plan) {
      assert.equal(arm, 'ablated');
      const control = restore(before);
      tick(person, 120);
      tick(control, 120);
      assert.deepEqual(person, control, 'disabled continuation: full Person and RNG');
      results.push({ arm, commitments: person.agenda.commitments.length, transferred: 0 });
      continue;
    }
    const reminder = promise(person, plan.commitment);
    const payment = promise(person, plan.payment);
    const fulfills = [reminder.id, payment.id];
    const start = (p: Person, at: number, duration: number, full: boolean) => {
      tick(p, at);
      const action = full ? options.action : `${options.action}:partial`;
      const aff: Affordance = {
        id: action,
        action,
        label: 'transfer payment',
        duration,
        effort: 0,
        advertises: {},
        ...(full ? { fulfills } : {}),
      };
      const decision = decide(p, [aff]);
      assert.equal(decision.chosenAction, action);
      assert.ok(begin(p, aff, decision));
      return aff;
    };
    const receive = (p: Person, money: typeof stock, aff: Affordance, amount: number, at: number) => {
      // The host verifies a receipt and atomically transfers at this minute, never at begin.
      assert.ok(amount > 0 && money.giver >= amount);
      money.giver -= amount;
      money.recipient += amount;
      assert.equal(money.giver + money.recipient, 100);
      assert.equal(
        finish(p, { at, affordanceId: aff.id, action: aff.action, status: 'completed' })?.status,
        'completed',
      );
    };
    if (arm === 'partial') {
      receive(person, stock, start(person, 80, 0, false), 8, 80);
      assert.equal(payment.status, 'pending');
      assert.equal(readZakatAlFitr(plan, stock.recipient, 80).outstanding, 16);
    }
    const at = arm === 'early' ? 90 : 110;
    const from = arm === 'spanning' || arm === 'partial' ? 90 : at;
    const aff = start(person, from, at - from, true);
    assert.equal(payment.status, 'pending', 'begin is not a payment receipt');
    assert.equal(stock.recipient, arm === 'partial' ? 8 : 0);
    if (from < at) {
      tick(person, 105);
      // Composite expiry bookkeeping runs on its fixed grid, not at each host tick.
      assert.equal(readZakatAlFitr(plan, stock.recipient, 105).deadlinePassed, true);
      assert.equal(payment.status, 'pending');
      assert.ok(readZakatAlFitr(plan, stock.recipient, 105).outstanding > 0);
      assert.ok(
        agendaTerms(person, aff, 105).some((t) => t.source === `commitment:${payment.id}` && t.value > 0),
      );
    }
    const saved = snapshot(person);
    const replay = restore(saved);
    assert.deepEqual(replay, saved, 'enabled in-flight restore preserves full Person/RNG');
    const replayStock = { ...stock };
    const remaining = readZakatAlFitr(plan, stock.recipient, from).outstanding;
    receive(person, stock, aff, remaining, at);
    receive(replay, replayStock, aff, remaining, at);
    tick(person, 120);
    tick(replay, 120);
    assert.deepEqual(person, replay, 'enabled receipt replay preserves full Person/RNG');
    assert.deepEqual(stock, replayStock);
    assert.equal(reminder.status, arm === 'early' ? 'kept' : 'broken');
    assert.equal(payment.status, 'kept');
    assert.deepEqual(person.conscience.breaches, []);
    assert.equal(readZakatAlFitr(plan, stock.recipient, at).outstanding, 0);
    const receipt = person.memory.episodes.find((e) => e.kind === 'outcome' && e.action === options.action);
    assert.equal(receipt?.at, at, 'composite records actual full completion time');
    results.push({
      arm,
      reminder: reminder.status,
      payment: payment.status,
      transferred: stock.recipient,
      completedAt: receipt?.at,
    });
  }
  return results;
}
if (process.argv[1]?.endsWith('/zakat-al-fitr-control.ts')) console.log(runZakatAlFitrControl());
