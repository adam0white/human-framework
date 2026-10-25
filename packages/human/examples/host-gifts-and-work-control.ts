/**
 * Host recipes using existing HF APIs. Run with Node >=24 directly.
 * Two local inventories hold whole loaves. Offers use an admitted stock sighting;
 * only resolution reads stock truth. Gifts need no invented joint consent protocol.
 * This synchronous, in-memory control is not storage, a generic inventory system,
 * a host’s mixed-routine integration, social realism, or evidence of player feel.
 */
import assert from 'node:assert/strict';
import {
  type Activity,
  type Affordance,
  abandonGoal,
  adoptGoal,
  begin,
  createPerson,
  decide,
  finish,
  type Outcome,
  type Person,
  perceive,
  snapshot,
  tick,
  type World,
} from '../src/index.ts';

export function resident(id: string, now = 0): Person {
  return createPerson({
    id,
    name: id,
    seed: 17,
    now,
    bornAt: -30 * 365 * 1440,
    sex: 'female',
    norms: [],
    body: { satiety: 1, hydration: 1, sleepPressure: 0, exertion: 0 },
  });
}

/** Fixed donor and recipient; host owns stock, delivery queue and resolution receipts. */
export function giftHost(donor: Person, recipient: Person) {
  const stock = { donor: 3, recipient: 0 };
  let perceivedLoaves = 0;
  let clock = donor.now;
  const receipts = new Map<string, Outcome>();
  const pending: { occurredAt: number; amount: number }[] = [];
  const offer: Affordance = {
    id: 'give-two-loaves',
    action: 'give',
    label: 'give two loaves',
    targetId: recipient.id,
    duration: 10,
    effort: 0,
    advertises: {},
  };
  const world: World = {
    now: () => clock,
    affordancesFor: (p) => (p.id === donor.id && perceivedLoaves > 0 ? [{ ...offer }] : []),
    perceptsFor: (p, _since, until) => {
      // A late notice is admitted now, never backdated into the recipient's past.
      if (p.id !== recipient.id) return [];
      const due = pending.filter((e) => e.occurredAt <= until);
      for (const e of due) pending.splice(pending.indexOf(e), 1);
      return due.map((e) => ({
        at: until,
        channel: 'saw',
        kind: 'gift',
        actorId: donor.id,
        targetId: recipient.id,
        salience: 1,
        valence: 0.3,
        summary: `${donor.name} left ${e.amount} loaves at minute ${e.occurredAt}.`,
      }));
    },
    resolve: (p, act, reason) => {
      clock = Math.max(clock, p.now);
      const key = `${p.id}:${act.decisionId}`;
      const prior = receipts.get(key);
      if (prior) return structuredClone(prior);
      const valid = p === donor && p.activity === act && act.affordanceId === offer.id;
      const amount =
        valid && reason === 'ended' && p.now >= act.endsAt
          ? Math.min(2, Math.max(0, Math.floor(stock.donor)))
          : 0;
      const out: Outcome = {
        at: p.now,
        affordanceId: act.affordanceId,
        action: act.action,
        status: reason === 'interrupted' ? 'interrupted' : amount > 0 ? 'completed' : 'failed',
      };
      if (amount > 0) {
        // One synchronous transaction: debit and credit together before publishing evidence.
        stock.donor -= amount;
        stock.recipient += amount;
        pending.push({ occurredAt: p.now, amount });
      }
      receipts.set(key, structuredClone(out));
      return out;
    },
  };
  return {
    stock,
    world,
    sightStock: () => {
      // Host admits this sighting only when the donor can actually inspect their pantry.
      perceivedLoaves = stock.donor;
    },
  };
}

/** One personal care goal at most; repeated sightings reuse it, including after abandonment. */
export function sharedWorkRecipe(p: Person) {
  let goalId: string | undefined;
  return {
    noticeDamage() {
      const attended = perceive(p, [
        {
          at: p.now,
          channel: 'saw',
          kind: 'damage',
          salience: 1,
          summary: 'The shared bench has a loose board.',
        },
      ]);
      if (attended.length && goalId === undefined)
        goalId = adoptGoal(
          p,
          {
            label: 'help mend the shared bench',
            serves: ['competence'],
            importance: 0.4,
            advancedBy: [{ action: 'mend-bench', amount: 0.25 }],
          },
          p.now,
        ).id;
      return goalId;
    },
    // Host calls when its bench is sound, including when someone else repaired it.
    sound() {
      if (goalId !== undefined) abandonGoal(p, goalId);
    },
  };
}

export function chooseAndBegin(p: Person, offers: Affordance[]): Activity {
  const decision = decide(p, offers);
  const offer = offers.find((a) => a.id === decision.chosenAffordanceId);
  assert.ok(offer, 'control premise: the person chooses an offered act');
  assert.ok(begin(p, offer, decision));
  assert.ok(p.activity);
  return p.activity;
}

/** Executable assertions, also exercised by the focused test. */
export function runHostRecipesControl() {
  const donor = resident('donor');
  const recipient = resident('recipient', 30);
  const host = giftHost(donor, recipient);
  assert.equal(host.world.affordancesFor(donor).length, 0);
  host.sightStock();
  const before = snapshot(recipient);
  const act = chooseAndBegin(donor, host.world.affordancesFor(donor));
  assert.deepEqual(host.stock, { donor: 3, recipient: 0 });
  tick(donor, act.endsAt);
  const out = host.world.resolve(donor, act, 'ended');
  assert.equal(out.status, 'completed');
  finish(donor, out);
  host.world.resolve(donor, structuredClone(act), 'ended');
  assert.deepEqual(host.stock, { donor: 1, recipient: 2 });
  assert.deepEqual(snapshot(recipient), before);
  const evidence = host.world.perceptsFor(recipient, recipient.now, recipient.now);
  assert.equal(evidence.length, 1);
  assert.equal(evidence[0]?.at, 30);
  assert.equal(perceive(recipient, evidence).length, 1);
  assert.notDeepEqual(snapshot(recipient), before);
  assert.deepEqual(host.world.perceptsFor(recipient, 30, 30), []);

  for (const arm of ['interrupted', 'empty', 'reduced', 'early'] as const) {
    const giver = resident('giver');
    const receiver = resident('receiver');
    const trial = giftHost(giver, receiver);
    trial.sightStock();
    const attempt = chooseAndBegin(giver, trial.world.affordancesFor(giver));
    if (arm === 'empty') trial.stock.donor = 0;
    if (arm === 'reduced') trial.stock.donor = 1;
    const total = trial.stock.donor + trial.stock.recipient;
    tick(giver, arm === 'early' || arm === 'interrupted' ? 5 : attempt.endsAt);
    const result = trial.world.resolve(giver, attempt, arm === 'interrupted' ? 'interrupted' : 'ended');
    assert.equal(
      result.status,
      arm === 'reduced' ? 'completed' : arm === 'interrupted' ? 'interrupted' : 'failed',
    );
    finish(giver, result);
    trial.world.resolve(giver, attempt, 'ended');
    assert.equal(trial.stock.donor + trial.stock.recipient, total);
    assert.equal(trial.stock.recipient, arm === 'reduced' ? 1 : 0);
    assert.deepEqual(trial.world.perceptsFor(receiver, 0, 0), []);
    tick(receiver, 20);
    assert.equal(trial.world.perceptsFor(receiver, 0, receiver.now).length, arm === 'reduced' ? 1 : 0);
  }

  const worker = resident('worker');
  const care = sharedWorkRecipe(worker);
  const id = care.noticeDamage();
  assert.ok(id);
  care.noticeDamage();
  assert.equal(worker.agenda.goals.length, 1);
  const work = chooseAndBegin(worker, [
    { id: 'mend', action: 'mend-bench', label: 'mend the board', duration: 10, effort: 0, advertises: {} },
  ]);
  assert.equal(worker.agenda.goals[0]?.progress, 0);
  finish(worker, {
    at: work.endsAt,
    affordanceId: work.affordanceId,
    action: work.action,
    status: 'completed',
  });
  assert.equal(worker.agenda.goals[0]?.progress, 0.25);
  care.sound();
  care.sound();
  care.noticeDamage();
  assert.equal(worker.agenda.goals.length, 1);
  assert.equal(worker.agenda.goals[0]?.status, 'abandoned');
  return { stock: host.stock, goal: worker.agenda.goals[0]?.status };
}

if (process.argv[1]?.endsWith('/host-gifts-and-work-control.ts')) console.log(runHostRecipesControl());
