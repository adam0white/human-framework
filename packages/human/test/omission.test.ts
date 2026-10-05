/**
 * The omission rule's two 1.9.0 changes (Game 2 eleventh pass, docs/findings.md):
 * 1. a duty stays protected past its window's end while a prayer begun inside the window is under way (a prayer
 *    begun in its time counts; research/decisions.md, "A prayer begun in its time");
 * 2. an activity that would cover a protected duty's whole closing stretch and run past the window's end is reviewed
 *    when the stretch begins, so a long option chosen just before it is weighed under the rule.
 * Capacity and necessity still lift the rule in both cases.
 */
import { describe, expect, test } from 'vitest';
import { begin, decide, dutyReviewAt, knockDown, tick } from '../src/index.ts';
import type { Person, PersonSpec } from '../src/types.ts';
import { aff, devoutMaghrib, insist, MAGHRIB, PRAY, STRETCH, WORK } from './support.ts';

const REST = aff('rest', { advertises: { rest: 0.2 }, effort: 0, duration: 30, tags: ['rest'] });
const SLEEP = aff('sleep', {
  advertises: { rest: 0.3 },
  effort: 0,
  duration: 180,
  mode: 'sleep',
  tags: ['rest'],
});
/** Another way to keep the same prayer (a walk to the mosque). */
const MOSQUE = aff('pray-mosque', {
  action: 'pray',
  duration: 35,
  effort: 0.1,
  tags: ['worship'],
  norms: [{ normId: 'salah', relation: 'fulfills' }],
});

const UNTIL = MAGHRIB.until;
const maghribOf = (p: Person) => p.agenda.commitments.find((c) => c.normId === 'salah');

/** A devout person who began the prayer 3 minutes before the window's end, now 2 minutes past it. */
function prayingPastTheEnd(over: Partial<PersonSpec> = {}): Person {
  const p = devoutMaghrib(UNTIL - 3, over);
  begin(p, PRAY, decide(p, [PRAY]));
  tick(p, UNTIL + 2);
  return p;
}

describe('omission rule past the window’s end while a prayer begun in it runs (1.9.0)', () => {
  test('the window stays open and an insisted option is refused on the prayer’s account', () => {
    const p = prayingPastTheEnd();
    expect(maghribOf(p)?.status).toBe('pending');
    // The host no longer offers a prayer: only continuing the running one keeps it.
    const r = decide(p, [WORK, REST], { suggestion: insist('work') });
    expect(r.suggestion?.verdict).toBe('refused');
    expect(r.suggestion?.kind).toBe('willNot');
    expect(r.suggestion?.reason).toBe('norm:salah');
    expect(r.chosenAffordanceId).toBe('pray');
    for (const id of ['work', 'rest'])
      expect(r.considered.find((c) => c.affordanceId === id)?.vetoed?.omission).toBeDefined();
  });

  test('a fresh start of another prayer after the end does not keep it, so it does not exempt', () => {
    const p = prayingPastTheEnd();
    const r = decide(p, [MOSQUE, WORK]);
    expect(r.considered.find((c) => c.affordanceId === 'pray-mosque')?.vetoed?.omission).toBeDefined();
    expect(r.chosenAffordanceId).toBe('pray');
  });

  test('nothing is protected once the window has ended with no prayer under way', () => {
    const p = devoutMaghrib(UNTIL + 2);
    const r = decide(p, [WORK, PRAY]);
    expect(r.considered.find((c) => c.affordanceId === 'work')?.vetoed).toBeUndefined();
  });

  test('necessity lifts it', () => {
    const p = prayingPastTheEnd({ body: { satiety: 0.02, hydration: 0.02 } });
    const r = decide(p, [WORK, REST], { suggestion: insist('work') });
    expect(r.considered.find((c) => c.affordanceId === 'work')?.vetoed?.omission).toBeUndefined();
  });

  test('capacity bounds it: downed during the prayer, resting is not an omission', () => {
    const p = prayingPastTheEnd();
    knockDown(p);
    const r = decide(p, [REST, WORK]);
    expect(r.considered.find((c) => c.affordanceId === 'rest')?.vetoed).toBeUndefined();
    expect(r.chosenAffordanceId).toBe('rest');
  });
});

describe('a long option that would cover the closing stretch is reviewed when the stretch begins (1.9.0)', () => {
  test('a sleep begun just before the stretch is reviewed at its start; he wakes and prays', () => {
    const p = devoutMaghrib(STRETCH - 6);
    const act = begin(p, SLEEP, decide(p, [SLEEP]));
    expect(act?.reviewAt).toBe(STRETCH);
    tick(p, STRETCH);
    const r = decide(p, [PRAY, REST], { suggestion: insist('sleep') });
    expect(r.considered.find((c) => c.affordanceId === 'sleep')?.vetoed?.reason).toBe('norm:salah');
    expect(r.chosenAffordanceId).toBe('pray');
  });

  test('a long awake activity begun before the stretch is reviewed at its start and gives way', () => {
    const p = devoutMaghrib(STRETCH - 10);
    const act = begin(p, WORK, decide(p, [WORK]));
    expect(act?.reviewAt).toBe(STRETCH);
    tick(p, STRETCH);
    const r = decide(p, [PRAY]);
    expect(r.considered.find((c) => c.affordanceId === 'work')?.vetoed?.omission).toBeDefined();
    expect(r.chosenAffordanceId).toBe('pray');
  });

  test('no early review for an activity that ends inside the window or keeps the duty', () => {
    const p = devoutMaghrib(STRETCH - 40);
    expect(dutyReviewAt(p, REST, p.now, p.now + 30)).toBeUndefined();
    expect(dutyReviewAt(p, MOSQUE, p.now, UNTIL + 10)).toBeUndefined();
    expect(dutyReviewAt(p, WORK, p.now, p.now + 120)).toBe(STRETCH);
  });

  test('no early review for a duty not firmly held', () => {
    const p = devoutMaghrib(STRETCH - 10, {
      norms: [{ normId: 'salah', standing: 'obligatory', conviction: 0.5 }],
    });
    expect(dutyReviewAt(p, WORK, p.now, p.now + 120)).toBeUndefined();
  });

  test('capacity bounds it: with no prayer on offer at the review, he carries on', () => {
    const p = devoutMaghrib(STRETCH - 10);
    begin(p, WORK, decide(p, [WORK]));
    tick(p, STRETCH);
    const r = decide(p, [REST]);
    expect(r.considered.find((c) => c.affordanceId === 'work')?.vetoed).toBeUndefined();
    expect(r.chosenAffordanceId).toBe('work');
  });

  test('necessity lifts it at the review', () => {
    const p = devoutMaghrib(STRETCH - 10, { body: { satiety: 0.02, hydration: 0.02 } });
    begin(p, WORK, decide(p, [WORK]));
    tick(p, STRETCH);
    const r = decide(p, [PRAY, REST]);
    expect(r.considered.find((c) => c.affordanceId === 'work')?.vetoed?.omission).toBeUndefined();
  });
});
