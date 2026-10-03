import { describe, expect, test } from 'vitest';
import type { Community, DayRecord, Person, Suggestion, Town } from '../src/index.ts';
import {
  ageYears,
  birth,
  CHRONICLE_DEFAULTS,
  conflictBetweenVoices,
  contagionRoll,
  converse,
  createCommunity,
  createPerson,
  createTown,
  createVillage,
  dayOf,
  decide,
  diffChronicle,
  lifeModifiers,
  MINUTES_PER_DAY,
  MINUTES_PER_YEAR,
  minuteOfDay,
  perceive,
  relationshipWith,
  resolutionsOf,
  runSilent,
  sicken,
  skip,
  snapshot,
  standingAdvice,
  stepCommunity,
  TOWN_DEFAULTS,
  TOWN_IDS,
  townCalendar,
  townPeople,
  townSpecs,
  villagerSpec,
} from '../src/index.ts';
import type { TownOptions, TownPersonId } from '../src/scenarios/town.ts';

interface Setup {
  ppl: Record<TownPersonId, Person>;
  people: Person[];
  town: Town;
  c: Community;
  start: number;
}

function setup(opts: TownOptions & { seed?: number } = {}): Setup {
  const ppl = townPeople(opts);
  const people = TOWN_IDS.map((id) => ppl[id]);
  const town = createTown(people, { seed: opts.seed ?? 7, ...opts });
  const c = createCommunity(people);
  return { ppl, people, town, c, start: people[0]?.now ?? 0 };
}

function run(days: number, opts: TownOptions & { seed?: number } = {}, step = {}) {
  const s = setup(opts);
  const events = stepCommunity(s.c, s.town, s.start + days * MINUTES_PER_DAY, step);
  return { ...s, events };
}

const stateJson = (s: Setup) =>
  JSON.stringify({
    people: s.people.map((p) => ({ ...snapshot(p), chronicle: undefined })),
    state: s.town.state,
  });

/** Inside the Ramadan fast of that day (fajr to maghrib on the town calendar)? */
function inFast(at: number): boolean {
  const d = dayOf(at);
  if (d < 1 || d > 30) return false;
  const t = townCalendar(d);
  const m = minuteOfDay(at);
  return m >= t.fajr && m < t.maghrib;
}

const BREAKS = ['eat', 'drink', 'tea', 'smoke'];

describe('town scenario (Game 2 world)', () => {
  test('30 days are deterministic, bounded and nobody dies', () => {
    const a = run(30, { cold: 'riza' });
    const b = run(30, { cold: 'riza' });
    const three = run(3, { cold: 'riza' });
    expect(stateJson(a)).toBe(stateJson(b));
    expect(a.events.map((e) => `${e.at}:${e.personId}:${e.kind}`)).toEqual(
      b.events.map((e) => `${e.at}:${e.personId}:${e.kind}`),
    );
    // Everything but the chronicle is bounded: 30 days cost less than twice 3 days plus a small constant.
    const len30 = stateJson(a).length;
    const len3 = stateJson(three).length;
    expect(len30).toBeLessThan(2 * len3 + 60_000);
    // The chronicle grows one record a day up to its cap, each record of bounded size.
    for (const p of a.people) {
      const chron = p.chronicle ?? [];
      expect(chron.length).toBeLessThanOrEqual(Math.min(30, CHRONICLE_DEFAULTS.maxDays));
      expect(chron.length).toBeGreaterThanOrEqual(29);
      for (const r of chron) expect(JSON.stringify(r).length).toBeLessThan(12_000);
    }
    expect(a.people.every((p) => p.body.alive)).toBe(true);
    // Rent was due on day 10 and Halil had the money by then.
    expect(a.town.state.completed.halil?.['pay-rent'] ?? 0).toBeGreaterThanOrEqual(1);
    expect(a.town.state.rentOwed).toBe(0);
    // The people prompted into an action never outnumber the completions of it.
    for (const p of a.people)
      for (const r of p.chronicle ?? [])
        for (const t of r.actions)
          expect(t.prompted, `${p.id} d${r.day} ${t.action}`).toBeLessThanOrEqual(t.done);
  });

  test('Halil keeps the fast: nothing eaten, drunk or smoked in the window, kept every Ramadan day', () => {
    const a = run(30, { cold: 'riza' });
    const breaks = a.events.filter(
      (e) =>
        e.personId === 'halil' &&
        e.kind === 'finish' &&
        e.status === 'completed' &&
        BREAKS.includes(e.action ?? '') &&
        inFast(e.at),
    );
    expect(breaks.map((e) => `${e.action}@d${dayOf(e.at)}:${minuteOfDay(e.at)}`)).toEqual([]);
    const chron = a.ppl.halil.chronicle ?? [];
    for (let day = 1; day <= 29; day++) {
      const r = chron.find((x) => x.day === day);
      expect(r?.keptByKind.abstain ?? 0, `day ${day}`).toBeGreaterThanOrEqual(1);
      expect(r?.brokenByKind.abstain ?? 0, `day ${day}`).toBe(0);
    }
    // He still ate: suhoor and iftar, outside the window.
    expect(a.town.state.completed.halil?.eat ?? 0).toBeGreaterThan(30);
  });

  test('a sick person is exempted from the fast and owes a make-up', () => {
    const a = run(5, { cold: 'riza' });
    const riza = a.ppl.riza;
    const owed = riza.agenda.owed ?? [];
    expect(owed.some((o) => o.ofId === 'fast' && o.reason === 'illness')).toBe(true);
    const makeUp = riza.agenda.commitments.find((c) => c.makeUpOf === 'fast');
    expect(makeUp).toBeDefined();
    // Never on Eid al-Fitr (day 31 with 30 fasts from day 1): make-ups start the day after (review 2026-10-03).
    const eid = TOWN_DEFAULTS.ramadanFirstDay + TOWN_DEFAULTS.ramadanDays;
    const makeUps = riza.agenda.commitments.filter((c) => c.makeUpOf !== undefined);
    expect(makeUps.length).toBeGreaterThan(0);
    for (const c of makeUps) {
      expect(c.until <= eid * MINUTES_PER_DAY || c.from >= (eid + 1) * MINUTES_PER_DAY).toBe(true);
    }
    expect(dayOf(makeUp?.from ?? 0)).toBe(eid + 1);
    // Halil, healthy, owes nothing.
    expect(a.ppl.halil.agenda.owed ?? []).toEqual([]);
  });

  test('the smoking habit withers when its cue passes unanswered: below half strength within 30 days', () => {
    const a = run(30);
    const habit = a.ppl.halil.habits.find((h) => h.action === 'smoke');
    expect(habit).toBeDefined();
    expect(habit?.withheld ?? 0).toBeGreaterThan(10);
    expect(habit?.strength ?? 1).toBeLessThan(0.35);
  });

  test('several voices in one decision get their own verdicts and a named conflict', () => {
    const s = setup();
    const halil = s.ppl.halil;
    // Day 1, 10:00: the clinic is open and the tea house is there, but it is Ramadan.
    const at = MINUTES_PER_DAY + 10 * 60;
    skip(halil, at);
    const affs = s.town.affordancesFor(halil);
    expect(affs.some((x) => x.action === 'see-doctor')).toBe(true);
    expect(affs.some((x) => x.action === 'tea')).toBe(true);
    const suggestions: Suggestion[] = [
      { voiceId: 'selin', action: 'see-doctor', strength: 0.6 },
      { voiceId: 'riza', action: 'tea', strength: 0.6 },
    ];
    const record = decide(halil, affs, { suggestions });
    const res = resolutionsOf(record);
    expect(res.map((r) => r.voiceId)).toEqual(['riza', 'selin']);
    const byVoice = Object.fromEntries(res.map((r) => [r.voiceId, r]));
    // Tea in daylight breaks the fast: refused on the duty, whatever Rıza says.
    expect(byVoice.riza?.verdict).toBe('refused');
    expect(byVoice.riza?.reason).toMatch(/duty|norm/);
    expect(byVoice.selin?.verdict).not.toBe(byVoice.riza?.verdict);
    for (const r of res) expect(r.says.length).toBeGreaterThan(0);
    const conflict = conflictBetweenVoices(record.considered, res, record.chosenAffordanceId);
    expect(conflict?.voices.map((v) => v.voiceId)).toEqual(['riza', 'selin']);
  });

  test('a muted epilogue differs from the played days and the diff narrates it', () => {
    const s = setup();
    const you: Suggestion = { voiceId: 'you', action: 'smoke', strength: 0.7 };
    const suggestions = { halil: you };
    stepCommunity(s.c, s.town, s.start + 6 * MINUTES_PER_DAY, { suggestions });
    const played: DayRecord[] = (s.ppl.halil.chronicle ?? []).filter((r) => r.day >= 1 && r.day <= 5);
    expect(played.length).toBe(5);
    const silent = runSilent(s.c, s.town, 5, { suggestions, mutedVoiceId: 'you' });
    const quiet = silent.chronicles.halil ?? [];
    expect(quiet.length).toBe(5);
    expect(quiet.every((r) => r.day >= 6)).toBe(true);
    // The player's voice is absent from the silent days.
    for (const r of quiet) for (const t of r.actions) expect(t.by.you ?? 0).toBe(0);
    const diff = diffChronicle(played, quiet, { name: 'Halil', pronoun: 'he' });
    expect(diff.changes.length).toBeGreaterThan(0);
    expect(diff.lines.length).toBeGreaterThan(0);
    for (const line of diff.lines) expect(line).toMatch(/\w/);
  });

  test('gossip changes a third party’s standing with the listener', () => {
    const s = setup();
    const { hacer, halil } = s.ppl;
    const before = { ...relationshipWith(halil, 'osman') };
    const result = converse(hacer, halil, { at: halil.now, placeId: 'home', topics: ['osman'] });
    expect(result.claims.some((c) => c.prop === 'osman:stingy')).toBe(true);
    expect(result.norms.some((n) => n.normId === 'backbiting')).toBe(true);
    perceive(halil, result.told);
    const after = relationshipWith(halil, 'osman');
    expect(after.respect).toBeLessThan(before.respect);
    expect(after.trust).toBeLessThan(before.trust);
    // Told once, it is not told again by the same mouth.
    const again = converse(hacer, halil, { at: halil.now + 60, placeId: 'home', topics: ['osman'] });
    expect(again.claims.some((c) => c.prop === 'osman:stingy')).toBe(false);
  });

  test('advice heard in conversation becomes standing advice', () => {
    const s = setup();
    const { selin, halil } = s.ppl;
    const result = converse(selin, halil, { at: halil.now, topics: ['halil'] });
    expect(result.advice.map((a) => a.action)).toContain('see-doctor');
    // The driver stamps each advice percept with what was urged (`Percept.advice`) before the listener hears it.
    perceive(
      halil,
      result.advice.map((a) => ({
        ...a.percept,
        advice: [{ action: a.action, strength: a.suggestion.strength }],
      })),
    );
    const standing = standingAdvice(halil, halil.now);
    expect(standing.some((a) => a.sourceId === 'selin' && a.action === 'see-doctor')).toBe(true);
    // Over a month of calls the same advice is still standing, and the doctor's joins it.
    const a = run(30);
    const month = standingAdvice(a.ppl.halil, a.ppl.halil.now);
    expect(month.some((x) => x.sourceId === 'selin' && x.action === 'see-doctor')).toBe(true);
    expect(a.town.state.completed.halil?.['see-doctor'] ?? 0).toBeGreaterThanOrEqual(1);
  });

  test('a severe contagious illness passes on in a long contact', () => {
    const s = setup();
    const { halil } = s.ppl;
    const caught = contagionRoll(halil, { kind: 'flu', contagious: true, severity: 1 }, 3000);
    expect(caught?.kind).toBe('flu');
    expect(halil.body.illnesses.some((i) => i.kind === 'flu')).toBe(true);
    // Already ill with it: no second infection.
    expect(contagionRoll(halil, { kind: 'flu', contagious: true, severity: 1 }, 3000)).toBeNull();
  });

  test('a napper wakes for a duty whose closing stretch is shorter than the sleep review (review 2026-10-03)', () => {
    // Before: reviewed every 120 min while asleep, Halil slept through Asr on 20 of 30 days.
    const s = run(30);
    let asr = 0;
    for (const r of s.ppl.halil.chronicle ?? []) if (r.prayers.kept.includes('Asr')) asr++;
    expect(asr).toBeGreaterThanOrEqual(25);
  });

  test('a conversation both partners finish in the same minute runs once (review 2026-10-03)', () => {
    const { events } = run(10);
    const keys = events.filter((e) => e.kind === 'converse').map((e) => `${e.at}|${e.personId}|${e.withId}`);
    expect(keys.length).toBeGreaterThan(0);
    expect(new Set(keys).size).toBe(keys.length);
  });

  test('contagion runs through the driver only for people physically together (review 2026-10-03)', () => {
    // Halil carries it, kept at a mild level every morning (acute illness otherwise clears in days); Selin only
    // ever calls him from the city, so she can never catch it.
    const ill = { kind: 'flu', severity: 1, trendPerDay: 0, contagious: true };
    const carrier = (s: Setup): Setup['town'] => ({
      ...s.town,
      onDay: (p, day) => {
        s.town.onDay?.(p, day);
        if (p.id !== 'halil') return;
        const flu = p.body.illnesses.find((i) => i.kind === 'flu');
        if (flu) flu.severity = 1;
        else sicken(p, ill);
      },
    });
    const s = setup();
    sicken(s.ppl.halil, ill);
    const events = stepCommunity(s.c, carrier(s), s.start + 20 * MINUTES_PER_DAY, {});
    const caught = events.filter((e) => e.kind === 'contagion');
    expect(caught.some((e) => e.personId === 'selin')).toBe(false);
    for (const e of caught) expect(e.detail).toMatch(/caught flu from/);
    // Switched off, the same world produces none.
    const t = setup();
    sicken(t.ppl.halil, ill);
    const quiet = stepCommunity(t.c, carrier(t), t.start + 20 * MINUTES_PER_DAY, { contagion: false });
    expect(quiet.filter((e) => e.kind === 'contagion')).toEqual([]);
  });

  test('life-course rolls are opt-in: the very old die in a long run, the dead stop acting, a birth joins', () => {
    const START = 7 * 60;
    const ids = Array.from({ length: 24 }, (_, i) => `e${String(i).padStart(2, '0')}`);
    const people = ids.map((id, i) =>
      createPerson(
        villagerSpec(id, id, 100 + i, { now: START, ageYears: 95, others: ids, devout: i % 2 === 0 }),
      ),
    );
    const village = createVillage(people, { seed: 3, foodStock: 500 });
    const c = createCommunity(people);
    const events = stepCommunity(c, village, START + 60 * MINUTES_PER_DAY, {
      lifecourse: { mortality: true, multiplier: 50 },
      maxEvents: 200_000,
    });
    const died = events.filter((e) => e.kind === 'died');
    expect(died.length).toBeGreaterThanOrEqual(1);
    const dead = people.filter((p) => !p.body.alive);
    expect(dead.map((p) => p.id).sort()).toEqual(died.map((e) => e.personId).sort());
    for (const p of dead) {
      const at = died.find((e) => e.personId === p.id)?.at ?? 0;
      const after = events.filter(
        (e) => e.personId === p.id && e.at > at && (e.kind === 'decide' || e.kind === 'begin'),
      );
      expect(after).toEqual([]);
    }
    // Without the option nobody dies in the same world.
    const calm = ids.map((id, i) =>
      createPerson(
        villagerSpec(id, id, 100 + i, { now: START, ageYears: 95, others: ids, devout: i % 2 === 0 }),
      ),
    );
    stepCommunity(
      createCommunity(calm),
      createVillage(calm, { seed: 3, foodStock: 500 }),
      START + 20 * MINUTES_PER_DAY,
      {
        maxEvents: 1,
      },
    );
    expect(calm.every((p) => p.body.alive)).toBe(true);
    // A birth adds a person to the community with parent and child ties both ways.
    const [a, b] = people.filter((p) => p.body.alive);
    if (!a || !b) throw new Error('need two living parents');
    const child = birth(c, a, b, { id: 'baby', name: 'Baby', seed: 999, sex: 'female' });
    expect(c.people.length).toBe(25);
    expect(child.body.alive).toBe(true);
    expect(relationshipWith(child, a.id).roles).toContain('parent');
    expect(relationshipWith(a, child.id).roles).toContain('child');
  }, 60_000);

  test('forty years pass plausibly for one person under skip()', () => {
    const halil = createPerson(townSpecs().halil);
    const age0 = ageYears(halil);
    let prev = lifeModifiers(halil);
    for (let y = 1; y <= 40; y++) {
      skip(halil, halil.now + MINUTES_PER_YEAR);
      const m = lifeModifiers(halil);
      expect(m.mortalityPerYear).toBeGreaterThanOrEqual(prev.mortalityPerYear);
      expect(m.maxFitness).toBeLessThanOrEqual(prev.maxFitness + 1e-9);
      for (const v of Object.values(m)) if (typeof v === 'number') expect(Number.isFinite(v)).toBe(true);
      prev = m;
    }
    expect(ageYears(halil)).toBeCloseTo(age0 + 40, 1);
    expect(prev.stage).toBe('elder');
    expect(prev.mortalityPerYear).toBeGreaterThan(
      lifeModifiers(createPerson(townSpecs().halil)).mortalityPerYear * 3,
    );
    expect(halil.body.alive).toBe(true);
    const json = JSON.stringify(snapshot(halil));
    expect(json.length).toBeLessThan(400_000);
    expect(JSON.parse(json)).toBeTruthy();
    expect(halil.chronicleDay).toBeUndefined();
  });
});
