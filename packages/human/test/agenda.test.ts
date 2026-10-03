import { describe, expect, test } from 'vitest';
import {
  AGENDA_DEFAULTS,
  abandonGoal,
  adoptGoal,
  advanceAgenda,
  agendaTerms,
  commitmentPressure,
  createAgenda,
  DEFAULT_PRAYER_TIMES,
  onFinished,
  prayerWindows,
  promise,
  proposeGoals,
  release,
} from '../src/agenda/index.ts';
import type { Affordance, Commitment, NeedReading, Outcome, Person } from '../src/types.ts';

function person(): Person {
  return { id: 'p1', agenda: createAgenda({}, 0) } as unknown as Person;
}

const prayAff: Affordance = {
  id: 'a-pray',
  action: 'pray',
  label: 'Pray',
  duration: 10,
  effort: 0,
  advertises: {},
};
const done = (action: string, at: number, targetId?: string): Outcome => ({
  affordanceId: `a-${action}`,
  action,
  status: 'completed',
  at,
  ...(targetId ? { targetId } : {}),
});

const meet = (p: Person): Commitment =>
  promise(p, {
    kind: 'promise',
    toId: 'p2',
    actions: ['visit'],
    targetId: 'p2',
    from: 600,
    until: 720,
    normId: 'keep-promise',
    importance: 0.7,
  });

describe('commitments', () => {
  test('time pressure rises toward the deadline and peaks in the last 20%', () => {
    const p = person();
    const c = meet(p);
    const v = (now: number) =>
      agendaTerms(p, { ...prayAff, action: 'visit', targetId: 'p2' }, now).find(
        (t) => t.source === `commitment:${c.id}`,
      )?.value ?? 0;
    expect(v(500)).toBe(0);
    const series = [550, 600, 630, 660, 690, 696, 710, 720].map(v);
    for (let i = 1; i < series.length; i++) expect(series[i]).toBeGreaterThanOrEqual(series[i - 1] ?? 0);
    expect(v(696)).toBeCloseTo(0.7);
    expect(v(720)).toBeCloseTo(0.7);
    expect(v(630)).toBeLessThan(v(696));
    expect(v(721)).toBe(0);
    expect(commitmentPressure(c, 700)).toBe(1);
  });
  test('wrong target does not pull; explicit fulfills does', () => {
    const p = person();
    const c = meet(p);
    expect(agendaTerms(p, { ...prayAff, action: 'visit', targetId: 'p3' }, 700)).toEqual([]);
    expect(agendaTerms(p, { ...prayAff, fulfills: [c.id] }, 700)[0]?.source).toBe(`commitment:${c.id}`);
  });
  test('kept within the window; broken after it and reported with normId', () => {
    const p = person();
    const a = meet(p);
    expect(onFinished(p, done('visit', 650, 'p2'), 650).kept).toEqual([a]);
    const b = meet(p);
    expect(onFinished(p, done('visit', 650, 'p2'), 650).kept.map((x) => x.id)).toEqual([b.id]);
    const c = meet(p);
    expect(advanceAgenda(p, 720).broken).toEqual([]);
    const r = advanceAgenda(p, 721);
    expect(r.broken.map((x) => x.id)).toEqual([c.id]);
    expect(r.broken[0]?.normId).toBe('keep-promise');
    expect(advanceAgenda(p, 800).broken).toEqual([]);
  });
  test('failed outcomes keep nothing; released commitments never break', () => {
    const p = person();
    const c = meet(p);
    expect(onFinished(p, { ...done('visit', 650, 'p2'), status: 'failed' }, 650).kept).toEqual([]);
    expect(release(p, c.id)).toBe(true);
    expect(advanceAgenda(p, 1000).broken).toEqual([]);
    expect(release(p, c.id)).toBe(false);
  });
});

describe('prayer windows', () => {
  test('five windows covering the day, Isha crossing midnight', () => {
    const w = prayerWindows(2);
    expect(w).toHaveLength(5);
    expect(w[0]?.from).toBe(2 * 1440 + DEFAULT_PRAYER_TIMES.fajr);
    expect(w[4]?.until).toBe(3 * 1440 + DEFAULT_PRAYER_TIMES.fajr);
    for (const c of w)
      expect(c).toMatchObject({ kind: 'worship', actions: ['pray'], normId: 'salah', recurEvery: 1440 });
  });
  test('windows recur after they close, kept or broken', () => {
    const p = person();
    for (const c of prayerWindows(0)) promise(p, c);
    onFinished(p, done('pray', 400), 400); // fajr kept
    const r = advanceAgenda(p, 760); // past dhuhr start
    expect(r.broken).toEqual([]);
    expect(r.recurred.map((c) => c.from)).toEqual([1440 + DEFAULT_PRAYER_TIMES.fajr]);
    const r2 = advanceAgenda(p, 1440 + 400);
    expect(r2.broken.map((c) => c.from)).toEqual([750, 960, 1125, 1215]);
    expect(r2.recurred).toHaveLength(4);
    const pending = p.agenda.commitments.filter((c) => c.status === 'pending');
    expect(pending).toHaveLength(5);
  });
  test('one long advance equals many short ones (catch-up across days)', () => {
    const run = (step: number) => {
      const p = person();
      for (const c of prayerWindows(0)) promise(p, c);
      const broken: number[] = [];
      for (let t = 0; t <= 3 * 1440; t += step)
        for (const b of advanceAgenda(p, t).broken) broken.push(b.from);
      return { broken, state: JSON.stringify(p.agenda) };
    };
    const long = run(3 * 1440);
    const short = run(1);
    expect(long.broken.length).toBe(14);
    expect(long).toEqual(short);
  });
  test('worship commitments produce commitment terms through the same machinery', () => {
    const p = person();
    for (const c of prayerWindows(0)) promise(p, c);
    const t = agendaTerms(p, prayAff, 800);
    expect(t).toHaveLength(1);
    expect(t[0]?.value).toBeGreaterThan(0);
  });
});

describe('goals', () => {
  test('goal terms, progress and achievement', () => {
    const p = person();
    const g = adoptGoal(
      p,
      {
        label: 'learn',
        serves: ['competence'],
        advancedBy: [{ action: 'practice', amount: 0.5 }],
        importance: 0.6,
      },
      0,
    );
    expect(agendaTerms(p, { ...prayAff, action: 'practice' }, 0)[0]?.value).toBeCloseTo(0.6);
    expect(agendaTerms(p, { ...prayAff, advances: [g.id] }, 0)[0]?.value).toBeCloseTo(0.3);
    onFinished(p, done('practice', 10), 10);
    const r = onFinished(p, done('practice', 20), 20);
    expect(r.achieved.map((x) => x.id)).toEqual([g.id]);
    expect(agendaTerms(p, { ...prayAff, action: 'practice' }, 30)).toEqual([]);
  });
  test('deadline raises goal pressure', () => {
    const p = person();
    adoptGoal(
      p,
      {
        label: 'x',
        serves: ['esteem'],
        advancedBy: [{ action: 'work', amount: 0.1 }],
        importance: 0.5,
        deadline: 1000,
      },
      0,
    );
    const v = (now: number) => agendaTerms(p, { ...prayAff, action: 'work' }, now)[0]?.value ?? 0;
    expect(v(900)).toBeGreaterThan(v(100));
  });
  test('proposals: one per day, only for unserved urgent needs, bounded active', () => {
    const p = person();
    const needs: NeedReading[] = [
      { id: 'belonging', level: 0.1, urgency: 0.9 },
      { id: 'meaning', level: 0.2, urgency: 0.7 },
      { id: 'food', level: 0, urgency: 1 },
    ];
    const first = proposeGoals(p, needs, 100);
    expect(first.map((g) => g.label)).toEqual(['make-friend']);
    expect(proposeGoals(p, needs, 200)).toEqual([]);
    expect(proposeGoals(p, needs, 1440 + 10).map((g) => g.label)).toEqual(['serve']);
    expect(proposeGoals(p, needs, 2 * 1440 + 10)).toEqual([]); // all served
    expect(proposeGoals(p, [{ id: 'competence', level: 0.5, urgency: 0.5 }], 3 * 1440)).toEqual([]);
    for (let i = 0; i < 10; i++)
      adoptGoal(p, { label: `g${i}`, serves: ['leisure'], advancedBy: [], importance: 0.3 }, 0);
    expect(proposeGoals(p, [{ id: 'competence', level: 0, urgency: 1 }], 5 * 1440)).toEqual([]);
    const active = p.agenda.goals.filter((g) => g.status === 'active');
    for (const g of active.slice(0, 6)) abandonGoal(p, g.id);
    expect(proposeGoals(p, [{ id: 'competence', level: 0, urgency: 1 }], 5 * 1440)).toHaveLength(1);
    expect(p.agenda.goals.filter((g) => g.status === 'active').length).toBeLessThanOrEqual(8);
  });
  test('headless control: deadline-pressure ordering beats a flat importance baseline', () => {
    // Two equally important commitments; the one closing sooner should pull harder, which a flat
    // importance-only baseline cannot express.
    const p = person();
    const soon = promise(p, { kind: 'duty', actions: ['a'], from: 0, until: 100, importance: 0.5 });
    const late = promise(p, { kind: 'duty', actions: ['a'], from: 0, until: 1000, importance: 0.5 });
    const t = agendaTerms(p, { ...prayAff, action: 'a' }, 90);
    const val = (id: string) => t.find((x) => x.source === `commitment:${id}`)?.value ?? 0;
    expect(val(soon.id)).toBeGreaterThan(val(late.id));
    expect(soon.importance).toBe(late.importance);
  });
  test('ids stay unique and closed history is bounded', () => {
    const p = person();
    for (let i = 0; i < 60; i++)
      promise(p, { kind: 'duty', actions: ['x'], from: i, until: i + 1, importance: 0.5 });
    advanceAgenda(p, 100);
    expect(p.agenda.commitments.length).toBe(AGENDA_DEFAULTS.maxClosedCommitments);
    const ids = p.agenda.commitments.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('review fixes (2026-10-03)', () => {
  test('pruning never drops the only link of a recurring chain kept early in its window', () => {
    const p = person();
    for (let i = 0; i < 14; i++) {
      promise(p, {
        kind: 'duty',
        actions: [`d${i}`],
        from: 0,
        until: 600,
        recurEvery: 1440,
        importance: 0.5,
      });
    }
    for (let i = 0; i < 14; i++) onFinished(p, done(`d${i}`, 100), 100);
    advanceAgenda(p, 120); // all kept, windows still open: no successors yet, 14 closed > 12
    advanceAgenda(p, 1440 + 100);
    const nextDay = p.agenda.commitments.filter((c) => c.status === 'pending' && c.from === 1440);
    expect(nextDay).toHaveLength(14);
  });

  test('one rule: a shift that starts inside the window pulls and also keeps the job when it ends after', () => {
    const p = person();
    const job = promise(p, { kind: 'job', actions: ['work'], from: 480, until: 960, importance: 0.8 });
    const shift: Affordance = { ...prayAff, id: 'work', action: 'work', duration: 120 };
    expect(agendaTerms(p, shift, 950).some((t) => t.source === `commitment:${job.id}`)).toBe(true);
    const kept = onFinished(p, done('work', 1070), 950).kept;
    expect(kept.map((c) => c.id)).toEqual([job.id]);
  });

  test('an option that would end before its window opens does not pull, and would not keep it', () => {
    const p = person();
    const c = promise(p, { kind: 'worship', actions: ['pray'], from: 900, until: 960, importance: 0.8 });
    expect(agendaTerms(p, prayAff, 860).some((t) => t.source === `commitment:${c.id}`)).toBe(false);
    expect(agendaTerms(p, prayAff, 895).some((t) => t.source === `commitment:${c.id}`)).toBe(true);
    expect(onFinished(p, done('pray', 870), 860).kept).toEqual([]);
  });
});
