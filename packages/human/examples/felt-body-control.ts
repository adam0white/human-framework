/** Fixed engineering control, not a calibrated sleep or urinary experiment. Run with Node >=24. */
import assert from 'node:assert/strict';
import {
  consume,
  enableBladder,
  enableDoze,
  estimateQuantity,
  readBladder,
  readBody,
  voidBladder,
} from '../src/body/index.ts';
import { begin, createPerson, decide, finish, perceive, tick } from '../src/person.ts';
import { snapshot } from '../src/restore.ts';
import type { Affordance, Person } from '../src/types.ts';

const quiet = { posture: 'reclined', stimulation: 0 } as const;
const watch: Affordance = {
  id: 'watch',
  action: 'watch',
  label: 'Watch',
  duration: 240,
  effort: 0.1,
  advertises: {},
};
const alarm = (p: Person) => ({
  at: p.now,
  channel: 'heard' as const,
  kind: 'alarm',
  summary: 'The alarm rings',
  targetId: p.id,
  salience: 1,
});
function actor(restricted: boolean): Person {
  return createPerson({
    id: 'p',
    name: 'Watchkeeper',
    seed: 1,
    now: 120,
    bornAt: -30 * 365 * 1440,
    sex: 'female',
    body: { sleepPressure: restricted ? 1 : 0.2, sleepDebt: restricted ? 48 : 0, hydration: 1 },
  });
}

// Frozen-start isolation: each intervention alone, with matching inputs and initial RNG.
function localIsolation(): void {
  const a = actor(true);
  const b = snapshot(a);
  enableDoze(a, quiet);
  consume(a, { water: 1 });
  consume(b, { water: 1 });
  perceive(a, [alarm(a)]);
  perceive(b, [alarm(b)]);
  assert.deepEqual(
    estimateQuantity(a, { truth: 20, difficulty: 1 }),
    estimateQuantity(b, { truth: 20, difficulty: 1 }),
  );
  const body = { ...a.body };
  delete body.doze;
  assert.deepEqual(body, b.body);
  assert.deepEqual(a.rng, b.rng);

  const c = actor(true);
  const d = snapshot(c);
  enableBladder(c);
  consume(c, { water: 1 });
  consume(d, { water: 1 });
  assert.deepEqual(
    estimateQuantity(c, { truth: 20, difficulty: 1 }),
    estimateQuantity(d, { truth: 20, difficulty: 1 }),
  );
  const cBody = { ...c.body };
  delete cBody.bladder;
  assert.deepEqual(cBody, d.body);
  assert.deepEqual(c.rng, d.rng);

  const e = actor(true);
  enableBladder(e);
  enableDoze(e, quiet);
  const f = snapshot(e);
  const before = snapshot(e);
  estimateQuantity(e, { truth: 20, difficulty: 1 });
  assert.deepEqual(e.body, f.body);
  assert.deepEqual(e.body, before.body);
  assert.notDeepEqual(e.rng, f.rng);
  const rested = actor(false);
  const restricted = actor(true);
  const x = estimateQuantity(rested, { truth: 20, difficulty: 1 });
  const y = estimateQuantity(restricted, { truth: 20, difficulty: 1 });
  assert(Math.abs(y.value - 20) > Math.abs(x.value - 20));
  assert(y.confidence > 1 - (0.05 + 0.45 * readBody(restricted).sleepiness));
}

function night(restricted: boolean, arm: 'full' | 'doze-off' | 'estimate-off' | 'bladder-off') {
  const p = actor(restricted);
  if (arm !== 'doze-off') enableDoze(p, quiet);
  if (arm !== 'bladder-off') enableBladder(p);
  begin(p, watch, decide(p, [watch]));
  const onsets: number[] = [];
  const wakes: number[] = [];
  const interruptedWorkMinutes: number[] = [];
  const estimates: { at: number; absoluteError: number; confidence: number }[] = [];
  const voids: { at: number; before: number | undefined; after: number | undefined; success: boolean }[] = [];
  const urgency: { at: number; value: number | undefined }[] = [];
  consume(p, { water: 1 });
  for (let at = 121; at <= 360; at++) {
    tick(p, at);
    if (p.body.doze?.since === at) onsets.push(at);
    if (p.activity?.interrupt?.reason === 'doze') {
      const act = p.activity;
      interruptedWorkMinutes.push(at - act.startedAt);
      finish(p, { at, action: act.action, affordanceId: act.affordanceId, status: 'interrupted' });
    } else if (p.activity && at >= p.activity.endsAt) {
      const act = p.activity;
      finish(p, { at, action: act.action, affordanceId: act.affordanceId, status: 'completed' });
    }
    if (at === 180 || at === 300) {
      const asleep = p.body.asleep;
      perceive(p, [alarm(p)]);
      if (asleep && !p.body.asleep) wakes.push(at);
    }
    if (at === 180) consume(p, { water: 0.5 });
    if (at === 125 || at === 200 || at === 300) {
      const q =
        arm === 'estimate-off'
          ? { value: 20, confidence: 1 }
          : estimateQuantity(p, { truth: 20, difficulty: 1 });
      estimates.push({ at, absoluteError: Math.abs(q.value - 20), confidence: q.confidence });
    }
    if (at === 179 || at === 299) urgency.push({ at, value: readBladder(p)?.urgency });
    if (at === 200 || at === 300) {
      const before = readBladder(p)?.urgency;
      const success = voidBladder(p);
      voids.push({ at, before, after: readBladder(p)?.urgency, success });
    }
  }
  if (arm === 'doze-off') assert.equal(onsets.length, 0);
  if (arm === 'estimate-off') assert(estimates.every((x) => x.absoluteError === 0));
  if (arm === 'bladder-off') assert.equal(p.body.bladder, undefined);
  if (arm === 'full' && restricted) {
    assert(onsets.length > 0);
    assert(wakes.length > 0);
    assert(interruptedWorkMinutes.length > 0);
  }
  for (const v of voids) if (v.success) assert.equal(v.after, 0);
  if (arm !== 'bladder-off') {
    assert((urgency[0]?.value ?? 0) > 0);
    assert(voids.some((v) => v.success));
    assert((p.body.bladder?.pending ?? 0) > 0);
    assert((readBladder(p)?.urgency ?? 0) > 0);
  }
  return {
    restricted,
    arm,
    onsets,
    wakes,
    interruptedWorkMinutes,
    estimates,
    urgency,
    voids,
    finalUrgency: readBladder(p)?.urgency,
  };
}
function awakeBladderChoice() {
  const start = actor(false);
  const toilet: Affordance = {
    id: 'toilet',
    action: 'use-toilet',
    label: 'Use the toilet',
    duration: 2,
    effort: 0,
    advertises: {},
    voidsBladder: true,
  };
  const work = { ...watch, id: 'work', action: 'work', label: 'Paid work', material: 2 };
  const full = snapshot(start);
  enableBladder(full);
  if (!full.body.bladder) throw new Error('Missing bladder');
  full.body.bladder.fill = 1;
  const off = snapshot(start);
  const low = snapshot(full);
  if (low.body.bladder) low.body.bladder.fill = 0.1;
  const choices = [
    { arm: 'off', p: off },
    { arm: 'low', p: low },
    { arm: 'full', p: full },
  ].map(({ arm, p }) => {
    const record = decide(p, [work, toilet]);
    return {
      arm,
      chosen: record.chosenAffordanceId,
      term: record.considered
        .find((c) => c.affordanceId === toilet.id)
        ?.terms.find((t) => t.source === 'need:bladder')?.value,
    };
  });
  assert.equal(choices[0]?.term, undefined);
  assert.equal(choices[1]?.term, undefined);
  assert.equal(choices[2]?.chosen, toilet.id);
  assert((choices[2]?.term ?? 0) > 0);
  const record = decide(full, [toilet]);
  assert(begin(full, toilet, record));
  finish(full, {
    at: full.now,
    affordanceId: toilet.id,
    action: toilet.action,
    status: 'completed',
    voidedBladder: true,
  });
  assert.equal(readBladder(full)?.urgency, 0);
  return { choices, afterVoid: readBladder(full)?.urgency };
}
localIsolation();
console.log(
  JSON.stringify(
    {
      localIsolation: 'passed',
      awakeBladderChoice: awakeBladderChoice(),
      limits: 'Engineering defaults; whole-night ablations also change downstream shared RNG and sleepiness.',
      runs: [false, true].flatMap((restricted) =>
        (['full', 'doze-off', 'estimate-off', 'bladder-off'] as const).map((arm) => night(restricted, arm)),
      ),
    },
    null,
    2,
  ),
);
