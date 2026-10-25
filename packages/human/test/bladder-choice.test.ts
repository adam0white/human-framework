import { expect, test } from 'vitest';
import { enableBladder, readBladder } from '../src/body/bladder.ts';
import { narrateDecision } from '../src/narrate/narrate.ts';
import { begin, createPerson, decide, finish } from '../src/person.ts';
import type { Affordance, Person } from '../src/types.ts';

const toilet: Affordance = {
  id: 'toilet',
  action: 'use-toilet',
  label: 'Use the toilet',
  duration: 2,
  effort: 0,
  advertises: {},
  voidsBladder: true,
};
const work: Affordance = {
  id: 'work',
  action: 'work',
  label: 'Paid work',
  duration: 2,
  effort: 0,
  advertises: {},
  material: 2,
};
function person(fill: number, enabled = true): Person {
  const p = createPerson({ id: 'p', name: 'P', seed: 1, now: 120, bornAt: -30 * 365 * 1440, sex: 'female' });
  if (enabled) {
    enableBladder(p);
    if (p.body.bladder) p.body.bladder.fill = fill;
  }
  return p;
}
const bladderTerm = (p: Person, offer: Affordance) =>
  decide(p, [offer, work])
    .considered.find((c) => c.affordanceId === offer.id)
    ?.terms.find((t) => t.source === 'need:bladder');

test('a full awake person prefers a declared void offer without pain relief', () => {
  const p = person(1);
  const choice = decide(p, [work, toilet]);
  expect(choice.chosenAffordanceId).toBe('toilet');
  expect(bladderTerm(p, toilet)?.value).toBeGreaterThan(0);
  expect(narrateDecision(p, choice, { plainEnglish: true })).toMatch(/toilet|urinate/i);
});

test('bladder term requires opt-in, a declared offer and sufficient urgency', () => {
  expect(bladderTerm(person(1, false), toilet)).toBeUndefined();
  expect(bladderTerm(person(0.1), toilet)).toBeUndefined();
  expect(bladderTerm(person(1), { ...toilet, voidsBladder: false })).toBeUndefined();
  expect(bladderTerm(person(1), { ...toilet, voidsBladder: 'false' as unknown as boolean })).toBeUndefined();
  expect(decide(person(0.1), [work, toilet]).chosenAffordanceId).toBe('work');
});

test('only a completed actual void clears fill, leaving other body stores alone', () => {
  for (const [status, effect, clears] of [
    ['failed', true, false],
    ['interrupted', true, false],
    ['completed', false, false],
    ['completed', true, true],
  ] as const) {
    const p = person(0.9);
    if (!p.body.bladder) throw new Error('Missing bladder');
    p.body.bladder.pending = 0.4;
    const before = {
      hydration: p.body.hydration,
      pain: p.body.pain,
      satiety: p.body.satiety,
      pending: p.body.bladder.pending,
    };
    begin(p, toilet, decide(p, [toilet]));
    finish(p, { at: p.now, affordanceId: toilet.id, action: toilet.action, status, voidedBladder: effect });
    expect(readBladder(p)?.urgency).toBe(clears ? 0 : 0.9);
    expect({
      hydration: p.body.hydration,
      pain: p.body.pain,
      satiety: p.body.satiety,
      pending: p.body.bladder.pending,
    }).toEqual(before);
  }
});

test('completed toilet attempts without urination teach failure of the advertised purpose', () => {
  const p = createPerson({ id: 'p', name: 'P', seed: 1, now: 120, bornAt: -15768000, sex: 'female' });
  enableBladder(p);
  if (!p.body.bladder) throw new Error('Missing bladder');
  p.body.bladder.fill = 1;
  const a: Affordance = {
    id: 'toilet',
    action: 'toilet',
    label: 'Toilet',
    duration: 1,
    effort: 0,
    advertises: {},
    voidsBladder: true,
  };
  const value = () =>
    decide(p, [a]).considered[0]?.terms.find((t) => t.source === 'need:bladder')?.value ?? 0;
  const before = value();
  for (let i = 0; i < 6; i++) {
    begin(p, a, decide(p, [a]));
    finish(p, { at: p.now, affordanceId: a.id, action: a.action, status: 'completed', voidedBladder: false });
  }
  expect(p.body.bladder.fill).toBe(1);
  expect(value()).toBeLessThan(before);
});
