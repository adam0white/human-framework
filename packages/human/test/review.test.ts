import { describe, expect, test } from 'vitest';
import { runReviewArm, runReviewControl } from '../examples/review-control.ts';
import {
  type Affordance,
  createPerson,
  decide,
  enableReview,
  promise,
  restore,
  reviewIfDue,
  reviewLine,
  reviewTerms,
  snapshot,
} from '../src/index.ts';

const DAY = 1440;
const adult = () =>
  createPerson({ id: 'p', name: 'P', seed: 3, now: 0, bornAt: -30 * 365 * DAY, sex: 'female' });
const note = (id: string, label = 'task', kind = 'promise') => ({
  id,
  kind,
  label,
  action: 'tend',
  toId: 'self',
});
const day = (n: number, broken: ReturnType<typeof note>[] = [], kept: ReturnType<typeof note>[] = []) =>
  ({ day: n, broken, kept, released: [] }) as never;

describe('evening review (muhasaba, 2.7.0)', () => {
  test('off by default: no state, no terms, the control person without review never changes course', () => {
    expect(adult().review).toBeUndefined();
    expect(reviewTerms(adult(), [{ source: 'commitment:x', value: 0.3 }])).toEqual([]);
    expect(runReviewArm('N').kept).toBe(0);
  });

  test('a lapse forms a resolve; a further lapse renews it with diminishing gains; keeping relaxes it', () => {
    const p = adult();
    enableReview(p);
    reviewIfDue(p, 21 * 60, [], day(0, [note('c1')]));
    const s1 = p.review?.resolves[0]?.strength ?? 0;
    expect(s1).toBeCloseTo(0.5, 6);
    reviewIfDue(p, DAY + 21 * 60, [day(1, [note('c2')])], day(1, [note('c2')]));
    const s2 = p.review?.resolves[0]?.strength ?? 0;
    expect(s2).toBeGreaterThan(s1);
    expect(s2 - s1).toBeLessThan(s1);
    reviewIfDue(p, 2 * DAY + 21 * 60, [day(2, [], [note('c3')])], day(2, [], [note('c3')]));
    expect(p.review?.resolves[0]?.strength ?? 1).toBeLessThan(s2);
  });

  test('each lapse is reviewed once; the review runs once a day', () => {
    const p = adult();
    enableReview(p);
    const rec = day(0, [note('c1')]);
    expect(reviewIfDue(p, 21 * 60, [rec], rec)).toBeDefined();
    expect(reviewIfDue(p, 22 * 60, [rec])).toBeUndefined();
    reviewIfDue(p, DAY + 21 * 60, [rec]);
    expect(p.review?.last?.missed).toEqual([]);
  });

  test('the resolve leans on the commitment term with its sign, and only that one', () => {
    const p = adult();
    enableReview(p);
    const c = promise(p, {
      kind: 'promise',
      label: 'task',
      actions: ['tend'],
      from: 0,
      until: 60,
      importance: 0.5,
      toId: 'self',
    });
    const ab = promise(p, {
      kind: 'abstain',
      label: 'quiet',
      actions: [],
      violatedBy: ['shout'],
      from: 0,
      until: 60,
      importance: 0.5,
      toId: 'self',
    });
    reviewIfDue(p, 21 * 60, [], day(0, [note('o1', 'task'), note('o2', 'quiet', 'abstain')]));
    expect(reviewTerms(p, [{ source: `commitment:${c.id}`, value: 0.2 }])[0]?.value ?? 0).toBeGreaterThan(0);
    expect(reviewTerms(p, [{ source: `abstain:${ab.id}`, value: -0.2 }])[0]?.value ?? 0).toBeLessThan(0);
    expect(reviewTerms(p, [{ source: 'goal:g', value: 0.2 }])).toEqual([]);
    const tend: Affordance = {
      id: 'tend',
      action: 'tend',
      label: 'tend',
      duration: 30,
      effort: 0.1,
      advertises: {},
    };
    p.now = 10;
    const terms = decide(p, [tend]).considered[0]?.terms.map((t) => t.source) ?? [];
    expect(terms).toContain('review:resolve');
  });

  test('held readings: accounting resolves without distress; ruminating resolves weakly and feels distress; none never reviews', () => {
    const rows = Object.fromEntries(runReviewControl().map((r) => [r.arm, r]));
    expect(rows.A?.kept ?? 0).toBeGreaterThan(15);
    expect(rows.R?.kept ?? 1).toBeLessThan(rows.A?.kept ?? 0);
    expect(rows.R?.maxDistress ?? 0).toBeGreaterThan(rows.A?.maxDistress ?? 1);
    expect(rows.X?.kept).toBe(30);
    expect(rows.X?.resolves).toBe(0);
    expect(rows.A?.decisive ?? 0).toBeGreaterThan(0);
    const p = adult();
    enableReview(p, { style: 'none' });
    expect(reviewIfDue(p, 21 * 60, [], day(0, [note('c1')]))).toBeUndefined();
    expect(reviewLine(p)).toBeUndefined();
  });

  test('lines are in the person’s own words', () => {
    const p = adult();
    enableReview(p);
    reviewIfDue(p, 21 * 60, [], day(0, [note('c1', 'the evening task')]));
    expect(reviewLine(p)).toBe("I didn't keep the evening task. Next time I'll be ready when it comes.");
    enableReview(p, { style: 'ruminating' });
    expect(reviewLine(p)).toBe('I keep going back over the evening task.');
  });

  test('save and restore keep resolves; malformed parts are dropped', () => {
    const p = adult();
    enableReview(p, { at: 20 * 60 });
    reviewIfDue(p, 21 * 60, [], day(0, [note('c1')]));
    const back = restore(JSON.parse(JSON.stringify(snapshot(p))));
    expect(back.review).toEqual(p.review);
    const bad = JSON.parse(JSON.stringify(snapshot(p)));
    bad.review.resolves.push({ key: 3 }, { key: 'k', kind: 'promise', strength: 9, day: 0 });
    bad.review.at = 5000;
    const fixed = restore(bad).review;
    expect(fixed?.at).toBe(21 * 60);
    expect(fixed?.resolves.find((r) => r.key === 'k')?.strength).toBe(1);
    expect(fixed?.resolves.length).toBe(2);
  });

  test('one resolve counts once per option and the term stays within ±resolveScale', () => {
    const p = adult();
    enableReview(p);
    const mk = () =>
      promise(p, {
        kind: 'promise',
        label: 'task',
        actions: ['tend'],
        from: 0,
        until: 60,
        importance: 0.5,
        toId: 'self',
      });
    const a = mk();
    const b = mk();
    reviewIfDue(p, 21 * 60, [], day(0, [note('o1')]));
    const t = reviewTerms(p, [
      { source: `commitment:${a.id}`, value: 0.2 },
      { source: `commitment:${b.id}`, value: 0.2 },
    ]);
    expect(t[0]?.value ?? 1).toBeCloseTo(0.3 * (p.review?.resolves[0]?.strength ?? 0), 4);
  });

  test('keys keep kind and owed-to apart: an unlabelled abstention does not share a resolve with another', () => {
    const p = adult();
    enableReview(p);
    reviewIfDue(
      p,
      21 * 60,
      [],
      day(0, [{ id: 'a1', kind: 'abstain', toId: 'self' } as never, note('o1', 'abstain')]),
    );
    expect(new Set(p.review?.resolves.map((r) => r.key)).size).toBe(2);
  });

  test('a lapse after the evening review is reviewed when the day closes; an excused one forms no resolve', () => {
    const p = adult();
    enableReview(p);
    reviewIfDue(p, 21 * 60, [], day(0));
    expect(p.review?.resolves.length).toBe(0);
    const closed = {
      day: 0,
      broken: [note('late')],
      kept: [],
      released: [note('excused', 'other')],
    } as never;
    expect(reviewIfDue(p, DAY, [closed], closed)).toBeDefined();
    expect(p.review?.resolves.map((r) => r.label)).toEqual(['task']);
    expect(reviewIfDue(p, DAY + 60, [closed], closed)).toBeUndefined();
  });

  test('a save whose last review lies in the future is repaired', () => {
    const p = adult();
    enableReview(p);
    const bad = JSON.parse(JSON.stringify(snapshot(p)));
    bad.review.lastDay = 999;
    expect(restore(bad).review?.lastDay).toBeUndefined();
  });
});
