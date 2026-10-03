import { describe, expect, test } from 'vitest';
import {
  appendDay,
  begin,
  CHRONICLE_DEFAULTS,
  chronicleBetween,
  closeDay,
  consolidateDay,
  consume,
  createPerson,
  decide,
  diffChronicle,
  finish,
  narrateChronicle,
  noteCommitments,
  noteMood,
  openDay,
  restore,
  snapshot,
  tick,
} from '../src/index.ts';
import type { Affordance, DayRecord, Person, Suggestion } from '../src/types.ts';
import { MINUTES_PER_DAY, MINUTES_PER_YEAR } from '../src/types.ts';

const H = 60;

const pray: Affordance = {
  id: 'pray',
  action: 'pray',
  label: 'pray Fajr',
  duration: 15,
  effort: 0.1,
  advertises: { meaning: 0.1 },
  norms: [{ normId: 'salah', relation: 'fulfills' }],
  tags: ['worship'],
};
const sleep: Affordance = {
  id: 'sleep',
  action: 'sleep',
  label: 'sleep',
  duration: 8 * H,
  effort: 0,
  mode: 'sleep',
  advertises: { sleep: 1 },
};
const work: Affordance = {
  id: 'work',
  action: 'repair',
  label: 'repair in the shop',
  duration: 4 * H,
  effort: 0.3,
  advertises: { competence: 0.2 },
  material: 10,
};

function halil(): Person {
  const start = 4 * H;
  return createPerson({
    id: 'halil',
    name: 'Halil',
    seed: 11,
    now: start,
    bornAt: start - 61 * MINUTES_PER_YEAR,
    sex: 'male',
    values: { tradition: 0.8 },
    relationships: [{ otherId: 'selin', roles: ['child'] }],
    voices: [
      { voiceId: 'you', trust: 0.5 },
      { voiceId: 'selin', trust: 0.8 },
    ],
    commitments: [
      {
        id: 'fajr',
        kind: 'worship',
        label: 'Fajr',
        actions: ['pray'],
        normId: 'salah',
        from: 5 * H,
        until: 6 * H + 30,
        importance: 0.8,
        recurEvery: MINUTES_PER_DAY,
      },
    ],
  });
}

/** Host: decide, begin, run, finish. The composite feeds the chronicle hooks and closes the day at midnight. */
function act(p: Person, aff: Affordance, at: number, suggestion?: Suggestion): void {
  const r = decide(p, [aff], { now: at, ...(suggestion ? { suggestion } : {}) });
  if (r.chosenAffordanceId !== aff.id)
    throw new Error(
      `did not choose ${aff.id} at ${p.now}: ${JSON.stringify(r.considered[0]?.vetoed)} ${JSON.stringify(p.body)}`,
    );
  begin(p, aff, r);
  const end = p.now + aff.duration;
  tick(p, end);
  finish(p, {
    affordanceId: aff.id,
    action: aff.action,
    status: 'completed',
    at: end,
    ...(aff.material !== undefined ? { material: aff.material } : {}),
  });
}

const lastDay = (p: Person): DayRecord => {
  const r = p.chronicle?.[p.chronicle.length - 1];
  if (!r) throw new Error('no day record');
  return r;
};

/** One day from 04:59: Fajr (prompted or not, or skipped), food, work, sleep across midnight. */
function day(p: Person, d: number, opts: { prompt?: boolean; skipPrayer?: boolean } = {}): void {
  const base = d * MINUTES_PER_DAY;
  if (!opts.skipPrayer)
    act(
      p,
      pray,
      base + 5 * H + 10,
      opts.prompt ? { voiceId: 'you', action: 'pray', strength: 0.35 } : undefined,
    );
  tick(p, base + 7 * H);
  consume(p, { food: 0.8, water: 0.8 });
  noteMood(p);
  act(p, work, base + 9 * H);
  consume(p, { food: 0.8, water: 0.8 });
  for (const hour of [16, 19, 21]) {
    tick(p, base + hour * H - 5);
    consume(p, { food: 0.8, water: 0.8 });
    noteMood(p);
  }
  act(p, sleep, base + 21 * H);
}

function runTen(): Person {
  const p = halil();
  openDay(p);
  for (let d = 0; d < 10; d++) day(p, d, { prompt: d < 5, skipPrayer: d === 7 });
  return p;
}

describe('chronicle (N3)', () => {
  test('one record per day with prayers, prompts, actions and material', () => {
    const p = runTen();
    const ch = p.chronicle ?? [];
    expect(ch.map((r) => r.day)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9].slice(0, ch.length));
    expect(ch.length).toBeGreaterThanOrEqual(9);
    const d0 = ch[0] as DayRecord;
    expect(d0.prayers.kept).toEqual(['Fajr']);
    expect(d0.prayers.prompted).toEqual(['Fajr']);
    expect(d0.keptByKind.worship).toBe(1);
    expect(d0.material).toBe(10);
    expect(d0.actions.find((a) => a.action === 'pray')).toMatchObject({
      done: 1,
      prompted: 1,
      by: { you: 1 },
    });
    expect(d0.verdicts[0]).toMatchObject({ voiceId: 'you', verdict: 'assented', action: 'pray', count: 1 });
    const d6 = ch[6] as DayRecord;
    expect(d6.prayers.kept).toEqual(['Fajr']);
    expect(d6.prayers.prompted).toEqual([]);
    // The skipped Fajr is recorded as missed, found in the agenda even though nobody noted it.
    expect((ch[7] as DayRecord).prayers.missed).toEqual(['Fajr']);
    expect((ch[7] as DayRecord).brokenByKind.worship).toBe(1);
    expect(d0.episodes.length).toBeGreaterThan(0);
    expect(d0.episodes.length).toBeLessThanOrEqual(CHRONICLE_DEFAULTS.topEpisodes);
    expect(Number.isFinite(d0.mood)).toBe(true);
  });

  test('diffChronicle narrates what he now does without being told', () => {
    const p = runTen();
    const ch = p.chronicle ?? [];
    const a = chronicleBetween(ch, 0, 4);
    const b = chronicleBetween(ch, 5, 9);
    const { changes, lines } = diffChronicle(a, b, { person: p, voices: ['you'] });
    expect(changes.find((c) => c.subject === 'prayer:Fajr')?.kind).toBe('unprompted');
    expect(lines.join(' ')).toContain('prayed Fajr without being told');
    // Identical periods produce no changes.
    expect(diffChronicle(b, b).lines).toEqual(['Little had changed.']);
    // A voice that never prompted does not count as "telling".
    expect(diffChronicle(a, b, { voices: ['selin'] }).changes.some((c) => c.kind === 'unprompted')).toBe(
      false,
    );
    // Still prompted in both periods.
    const still = diffChronicle(
      a,
      a.map((r) => structuredClone(r)),
      { voices: ['you'] },
    );
    expect(still.changes.find((c) => c.subject === 'prayer:Fajr')?.kind).toBe('still-prompted');
  });

  test('narrateChronicle: first and third person, deterministic, no verdicts on worth', () => {
    const p = runTen();
    const ch = p.chronicle ?? [];
    const third = narrateChronicle(ch, { person: p });
    expect(third).toEqual(narrateChronicle(ch, { person: p }));
    expect(third[0]).toMatch(/^Halil prayed Fajr on \d+ of \d+ days\.$/);
    expect(third.join(' ')).toMatch(/He repaired in the shop|repaired/);
    const first = narrateChronicle(ch, { voice: 'first' });
    expect(first[0]).toMatch(/^I prayed Fajr/);
    const lexed = narrateChronicle(ch, {
      person: p,
      lexicon: { lines: { 'chronicle.prayer': ['{Subj}, {label}: {n}/{days}.'] } },
    });
    expect(lexed[0]).toMatch(/^Halil, Fajr: \d+\/\d+\.$/);
    for (const line of [...third, ...first])
      expect(line).not.toMatch(/accept|worth|reward|faith|pious|righteous/i);
    expect(narrateChronicle([], {})).toEqual(['Nothing was recorded.']);
  });

  test('habit crossings, trust deltas, breaches and repairs are diffed against the previous day', () => {
    const p = halil();
    openDay(p);
    p.habits.push({ cue: { hour: 5 }, action: 'pray', strength: 0.4, repetitions: 10, lastAt: p.now });
    tick(p, MINUTES_PER_DAY); // the composite closes day 0 at midnight
    const habit = p.habits[0];
    if (!habit) throw new Error('habit');
    habit.strength = 0.6;
    const voice = p.will.voices.find((v) => v.voiceId === 'you');
    if (!voice) throw new Error('voice');
    voice.trust = 0.62;
    p.conscience.breaches.push({ id: 'b1', normId: 'honesty', at: p.now + 60, weight: 0.5, repaired: false });
    consume(p, { food: 1, water: 1 }); // nobody eats in this test otherwise; the dead keep no chronicle
    tick(p, 2 * MINUTES_PER_DAY);
    const d1 = lastDay(p);
    expect(d1.day).toBe(1);
    // Strengths decay a little within the day (habits/), so compare loosely.
    expect(d1.habits).toHaveLength(1);
    expect(d1.habits[0]).toMatchObject({ key: 'pray@h5', action: 'pray', level: 0.5, direction: 'up' });
    expect(d1.habits[0]?.from).toBeLessThan(0.5);
    expect(d1.habits[0]?.to).toBeGreaterThan(0.55);
    expect(d1.trust).toEqual([{ voiceId: 'you', from: 0.5, to: 0.62, delta: expect.closeTo(0.12, 9) }]);
    // The unprayed Fajr is a breach too (missed worship with a linked norm).
    expect(d1.breaches).toContainEqual({ id: 'b1', normId: 'honesty' });
    const breach = p.conscience.breaches.find((b) => b.id === 'b1');
    if (!breach) throw new Error('breach');
    breach.repaired = true;
    consume(p, { food: 1, water: 1 });
    tick(p, 3 * MINUTES_PER_DAY);
    const d2 = lastDay(p);
    expect(d2.day).toBe(2);
    expect(d2.repairs).toEqual([{ id: 'b1', normId: 'honesty' }]);
    expect(d2.breaches.some((b) => b.id === 'b1')).toBe(false);
    const lines = narrateChronicle(p.chronicle ?? [], { person: p }).join(' ');
    expect(lines).toContain('Praying around 05:00 had become a habit.');
    expect(lines).toContain('came to trust you more');
    expect(lines).toMatch(/went against his own standards (once|\d+ times) and turned back from 1\./);
    expect(lines).not.toContain('made amends');
  });

  test('consolidateDay is pure; notes at midnight belong to the closing day, which tick then closes', () => {
    const p = halil();
    const acc = openDay(p);
    noteMood(p);
    const before = JSON.stringify(p);
    consolidateDay(p, acc.day, acc);
    expect(JSON.stringify(p)).toBe(before);
    tick(p, MINUTES_PER_DAY - 60);
    noteCommitments(p, 'released', [
      {
        id: 'x',
        kind: 'promise',
        actions: ['visit'],
        from: 0,
        until: 10,
        importance: 0.5,
        status: 'released',
      },
    ]);
    // A note at exactly midnight, before the composite closes the day, still lands in day 0.
    p.now = MINUTES_PER_DAY;
    noteMood(p);
    expect(p.chronicleDay?.day).toBe(0);
    p.now = MINUTES_PER_DAY - 60;
    tick(p, MINUTES_PER_DAY);
    const rec = lastDay(p);
    expect(rec.day).toBe(0);
    expect(rec.released.map((n) => n.id)).toEqual(['x']);
    expect(p.chronicleDay?.day).toBe(1);
    expect(closeDay(p).day).toBe(1);
  });

  test('a stale accumulator is closed by the next note; the chronicle is bounded; saves keep it', () => {
    const p = halil();
    openDay(p);
    tick(p, 2 * MINUTES_PER_DAY + 60);
    expect(p.chronicle?.map((r) => r.day)).toEqual([0, 1]);
    expect(p.chronicleDay?.day).toBe(2);
    // A host that skipped the boundary: the next note closes the stale day itself.
    p.chronicleDay = openDay(p, 1);
    noteMood(p);
    expect(p.chronicle?.map((r) => r.day)).toEqual([0, 1, 1]);
    expect(p.chronicleDay?.day).toBe(2);
    p.chronicle?.pop();
    const proto = p.chronicle?.[0] as DayRecord;
    for (let i = 1; i <= CHRONICLE_DEFAULTS.maxDays + 10; i++) appendDay(p, { ...proto, day: i });
    expect(p.chronicle?.length).toBe(CHRONICLE_DEFAULTS.maxDays);
    expect(p.chronicle?.[0]?.day).toBe(11);
    const back = restore(JSON.parse(JSON.stringify(snapshot(p))));
    expect(back.chronicle?.length).toBe(CHRONICLE_DEFAULTS.maxDays);
    expect(back.chronicleDay?.day).toBe(2);
  });
});
