import { describe, expect, test } from 'vitest';
import type {
  Activity,
  Community,
  DayRecord,
  DecisionRecord,
  Person,
  Suggestion,
  SuggestionResolution,
  Town,
} from '../src/index.ts';
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
  homeOf,
  interruptPerson,
  lifeModifiers,
  MINUTES_PER_DAY,
  MINUTES_PER_YEAR,
  minuteOfDay,
  narrateDecision,
  nextEventAt,
  perceive,
  preview,
  relationshipWith,
  resolutionsOf,
  runSilent,
  sharesPlace,
  sicken,
  skip,
  snapshot,
  standingAdvice,
  stepCommunity,
  TOWN_DEFAULTS,
  TOWN_EID_DAY,
  TOWN_GAME_CREATE,
  TOWN_GAME_START,
  TOWN_IDS,
  townCalendar,
  townDay,
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
  test('every finish event carries the decisionId of the begin it closes (engine 1.3.0)', () => {
    const { events } = run(2);
    const begun = new Set(
      events.filter((e) => e.kind === 'begin').map((e) => `${e.personId}:${e.decisionId}`),
    );
    const finishes = events.filter((e) => e.kind === 'finish');
    expect(finishes.length).toBeGreaterThan(20);
    for (const e of finishes) {
      expect(e.decisionId, `${e.personId} ${e.action} @${e.at}`).toBeDefined();
      expect(begun.has(`${e.personId}:${e.decisionId}`) || e.at < 2 * 60).toBe(true);
    }
  });

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
    // Morning wages alone cover one 300 payment in the month, late (W5); the second needs afternoon shifts.
    expect(a.town.state.completed.halil?.['pay-rent'] ?? 0).toBeGreaterThanOrEqual(1);
    expect(a.town.state.rentOwed).toBeLessThanOrEqual(300);
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
    // Over a month of calls the same advice is still standing. Her word alone does not get him to the clinic
    // (the clinic lever, W10): that is what the player's voice is for.
    const a = run(30);
    const month = standingAdvice(a.ppl.halil, a.ppl.halil.now);
    expect(month.some((x) => x.sourceId === 'selin' && x.action === 'see-doctor')).toBe(true);
    expect(a.town.state.completed.halil?.['see-doctor'] ?? 0).toBe(0);
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

// ---------------------------------------------------------------------------------------------
// Game 2 world content (build plan docs/games/voice-build.md §3, W1–W9) and the opening gate (§4)
// ---------------------------------------------------------------------------------------------

/** The town as Game 2 builds it: created on the evening before Ramadan, run unseen to R1 03:40. */
function gameSetup(opts: TownOptions & { seed?: number } = {}): Setup {
  const s = setup({ now: TOWN_GAME_CREATE, ...opts });
  stepCommunity(s.c, s.town, TOWN_GAME_START, {});
  return { ...s, start: TOWN_GAME_START };
}

/** A deep copy of a running town (people, community and host state), as the game clones it for the epilogue. */
function cloneSetup(s: Setup, opts: TownOptions = {}): Setup {
  const { c, state } = structuredClone({ c: s.c, state: s.town.state });
  const ppl = Object.fromEntries(c.people.map((p) => [p.id, p])) as Record<TownPersonId, Person>;
  const people = TOWN_IDS.map((id) => ppl[id]);
  const town = createTown(people, { seed: 0, ...opts, state });
  return { ppl, people, town, c, start: s.start };
}

/** Step in chunks, handing every new decision record of `who` to `onRecord` (the trace keeps only 32). */
function stepWatching(
  s: Setup,
  until: number,
  onRecord: (r: DecisionRecord) => void,
  step: Parameters<typeof stepCommunity>[3] = {},
  who: TownPersonId = 'halil',
  chunk = 30,
): void {
  const seen = new Set(s.ppl[who].trace.map((r) => r.id));
  for (let t = Math.min(...s.people.map((p) => p.now)); t < until; t = Math.min(until, t + chunk)) {
    stepCommunity(s.c, s.town, Math.min(until, t + chunk), step);
    for (const r of s.ppl[who].trace)
      if (!seen.has(r.id)) {
        seen.add(r.id);
        onRecord(r);
      }
  }
}

const LOSS_TAGS = ['death', 'loss', 'funeral', 'grave'];
/** Loss episodes a decision's begun option brought back (Nuran, or tagged as a loss). */
function lossRecalls(p: Person, r: DecisionRecord): string[] {
  const chosen = r.considered.find((c) => c.affordanceId === r.chosenAffordanceId);
  const out: string[] = [];
  for (const id of chosen?.recalled ?? []) {
    const ep = p.memory.episodes.find((e) => e.id === id);
    if (ep && (ep.targetId === 'nuran' || ep.tags.some((t) => LOSS_TAGS.includes(t))))
      out.push(ep.targetId ?? id);
  }
  return out;
}

/** The player's suggestion `sug` delivered at minute `at`: interrupt, decide with it, return his answer. */
function say(s: Setup, at: number, sug: Omit<Suggestion, 'voiceId'>): SuggestionResolution | undefined {
  stepCommunity(s.c, s.town, at, {});
  const halil = s.ppl.halil;
  const before = new Set(halil.trace.map((r) => r.id));
  interruptPerson(s.c, halil, at, 'voice');
  stepCommunity(s.c, s.town, at + 1, { suggestions: { halil: { voiceId: 'you', ...sug } } });
  for (const r of halil.trace) {
    if (before.has(r.id)) continue;
    const res = resolutionsOf(r).find((x) => x.voiceId === 'you');
    if (res) return res;
  }
  return undefined;
}

/** First minute in [from, to) (step `every`) at which `sug` gets an answer matching `want`, tried on clones. */
function findMinute(
  s: Setup,
  from: number,
  to: number,
  sug: Omit<Suggestion, 'voiceId'>,
  want: (r: SuggestionResolution) => boolean,
  every = 10,
): number | undefined {
  for (let m = Math.max(from, Math.ceil(s.ppl.halil.now)); m < to; m += every) {
    const res = say(cloneSetup(s), m, sug);
    if (res && want(res)) return m;
  }
  return undefined;
}

const at = (day: number, hh: number, mm = 0) => day * MINUTES_PER_DAY + hh * 60 + mm;

describe('Game 2 world content (voice-build §3)', () => {
  test('W10: the clinic and calling Selin need a voice; going softens them (fix pass 2026-10-03)', () => {
    // Silent month: Selin's standing advice never gets him to the clinic, and he never calls her himself.
    const quiet = gameSetup();
    stepCommunity(quiet.c, quiet.town, at(31, 0), {});
    expect(quiet.town.state.completed.halil?.['see-doctor'] ?? 0).toBe(0);
    expect(quiet.town.state.completed.halil?.call ?? 0).toBe(0);
    // Her word plus an urging voice gets him there on Ramadan 1.
    const s = gameSetup();
    const doc = findMinute(
      s,
      at(1, 9),
      at(1, 17),
      { affordanceId: 'see-doctor', strength: 0.7, appeal: 'safety' },
      (r) => r.verdict === 'assented',
    );
    expect(doc).toBeDefined();
    // A visit that goes well moves his expectation of the clinic toward neutral.
    const before = s.ppl.halil.memory.expectations.find((x) => x.key === 'see-doctor')?.valence ?? 0;
    // The voice stands while he goes (the game keeps a standing suggestion until the activity ends).
    const urge = { voiceId: 'you', affordanceId: 'see-doctor', strength: 0.7, appeal: 'safety' } as const;
    say(s, doc ?? 0, urge);
    stepCommunity(s.c, s.town, (doc ?? 0) + 90, { suggestions: { halil: urge } });
    const after = s.ppl.halil.memory.expectations.find((x) => x.key === 'see-doctor')?.valence ?? 0;
    expect(s.town.state.completed.halil?.['see-doctor']).toBe(1);
    expect(after).toBeGreaterThan(before);
  }, 60_000);

  test('W1: Eid is day 31, days are labelled, play starts asleep before the suhoor drummer', () => {
    expect(TOWN_EID_DAY).toBe(31);
    expect(townDay(31)).toEqual({ kind: 'eid', n: 1, label: 'Eid al-Fitr' });
    expect(townDay(1).label).toBe('Ramadan 1');
    expect(townDay(30)).toEqual({ kind: 'ramadan', n: 30, label: 'Ramadan 30' });
    expect(townDay(32)).toEqual({ kind: 'after', n: 2, label: 'Shawwal 2' });
    expect(townDay(0).kind).toBe('before');
    // No fast commitment of Halil's reaches into day 31.
    const halil = townPeople().halil;
    const fast = halil.agenda.commitments.find((c) => c.id === 'fast');
    expect(fast?.recurUntil).toBeLessThan(TOWN_EID_DAY * MINUTES_PER_DAY);
    const s = gameSetup();
    expect(s.ppl.halil.now).toBe(TOWN_GAME_START);
    expect(s.ppl.halil.body.asleep).toBe(true);
    const wake = nextEventAt(s.c, s.ppl.halil);
    const drummer = MINUTES_PER_DAY + townCalendar(1).fajr - 60;
    expect(wake).toBeGreaterThan(TOWN_GAME_START);
    expect(wake).toBeLessThanOrEqual(drummer);
  });

  test('W2: each house is its own place; a visitor at Halil’s door is not with Hacer in her house', () => {
    expect(homeOf('halil')).toBe('halil-home');
    expect(homeOf('selin')).toBe('city');
    const s = setup({ now: at(1, 16) });
    const affs = s.town.affordancesFor(s.ppl.halil);
    expect(affs.find((a) => a.id === 'talk:hacer')?.placeId).toBe('halil-home');
    expect(affs.find((a) => a.id === 'eat')?.placeId).toBe('halil-home');
    const hacer = s.ppl.hacer;
    const visit = { action: 'collect-rent', affordance: { placeId: 'halil-home' } } as Pick<
      Activity,
      'action' | 'affordance'
    >;
    hacer.activity = { action: 'housework', affordance: { placeId: 'hacer-home' } } as unknown as Activity;
    expect(sharesPlace(hacer, visit)).toBe(false);
    hacer.activity = { action: 'talk', affordance: { placeId: 'halil-home' } } as unknown as Activity;
    expect(sharesPlace(hacer, visit)).toBe(true);
  });

  test('W3: Nuran is remembered as lost, and grief comes back without a pump', () => {
    const s = gameSetup();
    const nuran = s.ppl.halil.social.relationships.find((r) => r.otherId === 'nuran');
    expect(nuran?.roles).toEqual(['wife', 'deceased']);
    expect(nuran?.deceasedAt).toBe(TOWN_GAME_CREATE - 98 * MINUTES_PER_DAY);
    const perDay: Record<number, number> = {};
    let early = 0;
    stepWatching(s, at(31, 0), (r) => {
      const hits = lossRecalls(s.ppl.halil, r);
      if (hits.length === 0) return;
      perDay[dayOf(r.at)] = (perDay[dayOf(r.at)] ?? 0) + hits.length;
      if (dayOf(r.at) <= 2 && hits.includes('nuran')) early += 1;
    });
    expect(early).toBeGreaterThanOrEqual(1);
    const total = Object.values(perDay).reduce((a, b) => a + b, 0);
    // Plan target was ≤ 1.5 a day; the iftar memory is cued by both meals (findings 2026-10-03), so ≤ 3. Engine
    // 1.3.0 (lower wage, finished activities keep commitments) moved it to 3.03; the bound is 3.2.
    expect(total / 30).toBeLessThanOrEqual(3.2);
    // Still recalled at the end of the month: loss memories outlast ordinary ones (memory eviction fix).
    expect(perDay[30] ?? 0).toBeGreaterThanOrEqual(1);
    const eps = s.ppl.halil.memory.episodes.filter((e) => e.targetId === 'nuran');
    // Funeral, iftar, cigarette, condolences, and the clinic (W10).
    expect(eps.length).toBe(5);
    for (const e of eps) expect(e.salience).toBeLessThan(0.85);
  });

  test('W4: he prays at home most of the time, and a mosque suggestion can be modified or taken', () => {
    const a = gameSetup();
    stepCommunity(a.c, a.town, at(31, 0), {});
    const chron = (a.ppl.halil.chronicle ?? []).filter((r) => r.day >= 1 && r.day <= 30);
    const fullDays = chron.filter((r) => r.prayers.kept.length >= 5).length;
    expect(fullDays).toBeGreaterThanOrEqual(20);
    const prayed = a.town.state.completed.halil?.pray ?? 0;
    expect(prayed).toBeGreaterThan(100);
    const s = gameSetup();
    const verdicts = new Set<string>();
    for (let t = TOWN_GAME_START; t < at(3, 0); t += 10) {
      stepCommunity(s.c, s.town, t, {});
      const h = s.ppl.halil;
      if (h.body.asleep) continue;
      const open = h.agenda.commitments.some(
        (c) => c.kind === 'worship' && c.status === 'pending' && c.from <= t && c.until > t,
      );
      if (!open) continue;
      const affs = s.town.affordancesFor(h);
      for (const strength of [0.35, 0.7])
        verdicts.add(preview(h, affs, { voiceId: 'you', affordanceId: 'pray', strength }).verdict);
    }
    expect(verdicts.has('modified')).toBe(true);
    expect(verdicts.has('assented')).toBe(true);
  });

  test('W4: at least 60 % of kept prayers are at home over R1–R30', () => {
    const s = gameSetup();
    let home = 0;
    let mosque = 0;
    const events = stepCommunity(s.c, s.town, at(31, 0), {});
    for (const e of events)
      if (e.personId === 'halil' && e.kind === 'finish' && e.action === 'pray' && e.status === 'completed')
        if (e.affordanceId === 'pray-home') home += 1;
        else mosque += 1;
    expect(home / Math.max(1, home + mosque)).toBeGreaterThanOrEqual(0.6);
  });

  test('W5: 600 owed, 300 by Ramadan 15; the payable days are pinned', () => {
    const T = TOWN_DEFAULTS;
    const s0 = setup();
    expect(s0.town.state.rentOwed).toBe(600);
    const rent = s0.ppl.halil.agenda.commitments.find((c) => c.id === 'rent');
    expect(rent?.until).toBe(at(15, 20));
    expect(rent?.recurEvery).toBeUndefined();
    const start = T.startingMoney.halil ?? 0;
    // Morning wages alone do not make the date: 40 + 16 × 15 = 280 by R15 even working every day, so keeping it
    // needs at least two afternoon shifts (which pay but are not reckoned on, see TOWN_DEFAULTS.extraWage).
    expect(start + T.wage * T.rentPromiseDay).toBeLessThan(T.rent);
    expect(start + T.wage * T.rentPromiseDay + 2 * T.extraWage).toBeGreaterThanOrEqual(T.rent);
    // In a silent month (through Eid) he works every morning, misses the date, and pays 300 once, after R15.
    const s = gameSetup();
    const events = stepCommunity(s.c, s.town, at(32, 0), {});
    const pays = events.filter(
      (e) => e.personId === 'halil' && e.kind === 'finish' && e.action === 'pay-rent',
    );
    expect(pays.length).toBe(1);
    expect(dayOf(pays[0]?.at ?? 0)).toBeGreaterThan(T.rentPromiseDay);
    expect(s.ppl.halil.agenda.commitments.find((c) => c.id === 'rent')?.status ?? 'broken').not.toBe('kept');
    // Left alone he rarely takes the afternoon shift (it carries no reckoned pay).
    const extra = events.filter(
      (e) => e.personId === 'halil' && e.kind === 'finish' && e.affordanceId === 'work-extra',
    );
    expect(extra.length).toBeLessThanOrEqual(3);
    // Osman comes to the door on his own date when nothing has been paid.
    expect(
      events.some(
        (e) =>
          e.personId === 'osman' &&
          e.kind === 'finish' &&
          e.action === 'collect-rent' &&
          dayOf(e.at) === T.rentPromiseDay,
      ),
    ).toBe(true);
    // Eid: the workshop is shut (town custom), so he does not work.
    expect(
      events.some((e) => e.personId === 'halil' && e.action === 'work-repair' && dayOf(e.at) === 31),
    ).toBe(false);
    const visits = events.filter(
      (e) => e.personId === 'osman' && e.kind === 'finish' && e.action === 'collect-rent',
    );
    expect(visits.length).toBeLessThanOrEqual(6);
    for (const v of visits) expect(dayOf(v.at)).toBeGreaterThanOrEqual(T.collectFrom);
  });

  test('W6: Selin calls him; on Eid his phone is open from 10:00 and she leaves the first call to him until 18:00', () => {
    const s = gameSetup();
    stepCommunity(s.c, s.town, at(31, 0), {});
    expect(s.town.state.completed.selin?.call ?? 0).toBeGreaterThanOrEqual(1);
    const e = setup({ now: at(TOWN_EID_DAY, 9, 50) });
    expect(e.town.affordancesFor(e.ppl.halil).some((a) => a.id === 'call:selin')).toBe(false);
    skip(e.ppl.halil, at(TOWN_EID_DAY, 10));
    expect(e.town.affordancesFor(e.ppl.halil).some((a) => a.id === 'call:selin')).toBe(true);
    skip(e.ppl.selin, at(TOWN_EID_DAY, 10));
    expect(e.town.affordancesFor(e.ppl.selin).some((a) => a.id === 'call:halil')).toBe(false);
    skip(e.ppl.selin, at(TOWN_EID_DAY, 18));
    expect(e.town.affordancesFor(e.ppl.selin).some((a) => a.id === 'call:halil')).toBe(true);
  });

  test('W7: Eid morning offers the grave, tea with Rıza and (only with the flag) the Eid prayer', () => {
    const fajr = townCalendar(TOWN_EID_DAY).fajr;
    const offered = (m: number, opts: TownOptions = {}) => {
      const s = setup({ now: m, ...opts });
      return s.town.affordancesFor(s.ppl.halil).map((a) => a.id);
    };
    expect(offered(at(TOWN_EID_DAY, 8))).not.toContain('tea:riza');
    expect(offered(at(TOWN_EID_DAY, 8))).not.toContain('visit-grave');
    expect(offered(at(TOWN_EID_DAY, 9))).toContain('tea:riza');
    expect(offered(at(TOWN_EID_DAY, 9))).toContain('visit-grave');
    expect(offered(at(TOWN_EID_DAY, 0, fajr + 150))).not.toContain('pray-eid');
    expect(offered(at(TOWN_EID_DAY, 0, fajr + 150), { eidPrayer: true })).toContain('pray-eid');
    expect(offered(at(TOWN_EID_DAY, 0, fajr + 250), { eidPrayer: true })).not.toContain('pray-eid');
    // An ordinary Ramadan day: the grave only after Asr.
    expect(offered(at(5, 12))).not.toContain('visit-grave');
    expect(offered(at(5, 0, townCalendar(5).asr + 5))).toContain('visit-grave');
    // His first daytime meal on Eid cues the cigarette: the habit term shows on the smoke option.
    const s = gameSetup();
    stepCommunity(s.c, s.town, at(TOWN_EID_DAY, 0), {});
    let ate = false;
    let cued = false;
    stepWatching(s, at(TOWN_EID_DAY, 23), (r) => {
      if (r.at < at(TOWN_EID_DAY, 6)) return;
      if (ate && !cued) {
        const smoke = r.considered.find((c) => c.action === 'smoke');
        if (smoke?.terms.some((t) => t.source === 'habit' && t.value > 0)) cued = true;
      }
      if (r.chosenAction === 'eat') ate = true;
    });
    expect(ate).toBe(true);
    expect(cued).toBe(true);
  });

  test('W9: suhoor and iftar read as what they are, not "to keep my word"', () => {
    const s = gameSetup();
    const lines: string[] = [];
    stepWatching(s, at(2, 0), (r) => {
      if (r.chosenAction === 'eat') lines.push(`${r.intention} | ${narrateDecision(s.ppl.halil, r)}`);
    });
    expect(lines.some((l) => l.includes('suhoor'))).toBe(true);
    expect(lines.some((l) => l.includes('break the fast'))).toBe(true);
    expect(lines.some((l) => l.includes('keep my word'))).toBe(false);
  });

  test('a cloned town runs on exactly as the original does', () => {
    const a = gameSetup();
    stepCommunity(a.c, a.town, at(2, 12), {});
    const b = cloneSetup(a);
    stepCommunity(a.c, a.town, at(4, 0), {});
    stepCommunity(b.c, b.town, at(4, 0), {});
    expect(stateJson(b)).toBe(stateJson(a));
  });
});

describe('opening day: the voice idea lands (voice-build §4)', () => {
  test('a scripted Ramadan 1 produces every verdict kind, a loss recall and another voice by R1 23:00', () => {
    const s = gameSetup();
    const got: Record<string, string> = {};
    const note = (k: string, r: SuggestionResolution | undefined) => {
      expect(r, k).toBeDefined();
      got[k] = `${r?.verdict}/${r?.kind ?? ''}/${r?.reason} "${r?.says}" ${r?.counterOffer?.label ?? ''}`;
      return r as SuggestionResolution;
    };
    const recalls: string[] = [];
    let voiced = false;
    const watch = (until: number) =>
      stepWatching(s, until, (r) => {
        recalls.push(...lossRecalls(s.ppl.halil, r));
      });
    // 1. The suhoor wake: he is woken by the drummer and the first answer is a yes.
    const wake = nextEventAt(s.c, s.ppl.halil);
    watch(wake);
    const eat = note('assented', say(s, wake, { affordanceId: 'eat', strength: 0.35 }));
    expect(eat.verdict).toBe('assented');
    // 2. The cigarette in the fast: refused on his understanding of the fast.
    const smokeAt = findMinute(
      s,
      at(1, 8),
      at(1, 11),
      { affordanceId: 'smoke', strength: 0.7 },
      (r) => r.kind === 'willNot',
    );
    expect(smokeAt).toBeDefined();
    watch(smokeAt ?? 0);
    const smoke = note('willNot', say(s, smokeAt ?? 0, { affordanceId: 'smoke', strength: 0.7 }));
    expect(smoke.reason).toBe('duty:sawm-ramadan');
    expect(smoke.says).toMatch(/fast/);
    // 3. The doctor while a prayer is due: not now, with a counter-offer; insisted, done under protest.
    const deferAt = findMinute(
      s,
      at(1, 8, 30),
      at(1, 12),
      { affordanceId: 'see-doctor', strength: 0.35 },
      (r) => r.verdict === 'deferred' && r.counterOffer !== undefined,
    );
    expect(deferAt).toBeDefined();
    const insisted = cloneSetup(s);
    watch(deferAt ?? 0);
    const deferred = note('deferred', say(s, deferAt ?? 0, { affordanceId: 'see-doctor', strength: 0.35 }));
    expect(deferred.counterOffer?.label).toMatch(/after/i);
    const complied = note(
      'complied',
      say(insisted, deferAt ?? 0, { affordanceId: 'see-doctor', strength: 0.35, insist: true }),
    );
    expect(complied.verdict).toBe('complied');
    // 4. The mosque: he does something like it.
    const mosqueAt = findMinute(
      s,
      (deferAt ?? 0) + 1,
      at(1, 19),
      { affordanceId: 'pray', strength: 0.35 },
      (r) => r.verdict === 'modified',
    );
    expect(mosqueAt).toBeDefined();
    watch(mosqueAt ?? 0);
    const mosque = note('modified', say(s, mosqueAt ?? 0, { affordanceId: 'pray', strength: 0.35 }));
    expect(mosque.counterOffer?.label).toMatch(/home/);
    // 5. Selin after iftar: his call reaches her, and her advice reaches him.
    const callAt = findMinute(
      s,
      at(1, 18, 50),
      at(1, 22),
      { affordanceId: 'call:selin', strength: 0.7 },
      (r) => r.verdict === 'assented',
    );
    expect(callAt).toBeDefined();
    watch(callAt ?? 0);
    note('call', say(s, callAt ?? 0, { affordanceId: 'call:selin', strength: 0.7 }));
    watch(at(1, 23));
    voiced = standingAdvice(s.ppl.halil, s.ppl.halil.now).some((a) => a.sourceId !== 'you');
    expect(voiced).toBe(true);
    expect(recalls.length).toBeGreaterThanOrEqual(1);
    expect(Object.keys(got).sort()).toEqual([
      'assented',
      'call',
      'complied',
      'deferred',
      'modified',
      'willNot',
    ]);
  }, 60_000);
});
