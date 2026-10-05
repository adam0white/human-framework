/**
 * Several voices in one decision (Game 2 spec N1) and the omission rule under several voices.
 * Decisions run through cognition's `decide` (exported as `scoreAndResolve`) with hand-built offers.
 */
import { describe, expect, test } from 'vitest';
import type { DecideContext } from '../src/index.ts';
import {
  actionTendencies,
  conflictBetweenVoices,
  createPerson,
  learnFromVoice,
  lifeModifiers,
  prayerWindows,
  predictResponse,
  predictResponses,
  promise,
  readPerson,
  remember,
  scoreAll,
  scoreAndResolve,
  voiceOf,
  voicesIn,
  WILL_DEFAULTS,
} from '../src/index.ts';
import type { Affordance, Person, PersonSpec, Suggestion } from '../src/types.ts';
import { ADULT, aff, PRAY, REST, WORK } from './support.ts';

function person(id: string, over: Partial<PersonSpec> = {}): Person {
  return createPerson({ id, name: id, seed: 11, bornAt: ADULT, sex: 'male', now: 600, ...over });
}

const CHAT = aff('chat', { advertises: { belonging: 0.1 }, duration: 30, tags: ['social'] });

const say = (voiceId: string, action: string, extra: Partial<Suggestion> = {}): Suggestion => ({
  voiceId,
  action,
  strength: 0.6,
  ...extra,
});

function ctxOf(p: Person, extra: Partial<DecideContext> = {}): DecideContext {
  const { body, needs, desperation } = readPerson(p);
  return {
    id: 'd',
    now: p.now,
    body,
    needs,
    mods: lifeModifiers(p),
    tendencies: actionTendencies(p),
    desperation,
    habit: { now: p.now },
    ...extra,
  };
}

const run = (p: Person, offers: Affordance[], suggestions: Suggestion[]) =>
  scoreAndResolve(p, offers, ctxOf(p, { suggestions })).record;

/** A worker who would rather work than rest or chat. */
const keen = (voices: { voiceId: string; trust: number }[] = []) =>
  person('halil', { needs: { esteem: 0.1, competence: 0.1 }, voices });

const resOf = (r: ReturnType<typeof run>, voiceId: string) =>
  r.suggestions?.find((s) => s.voiceId === voiceId);

describe('several voices in one decision', () => {
  test('one voice through `suggestions` decides exactly like the single `suggestion` sugar', () => {
    const a = keen();
    const b = keen();
    const one = run(a, [WORK, REST], [say('you', 'rest')]);
    const sugar = scoreAndResolve(b, [WORK, REST], ctxOf(b, { suggestion: say('you', 'rest') })).record;
    expect(one.chosenAffordanceId).toBe(sugar.chosenAffordanceId);
    expect(one.suggestion).toEqual(sugar.suggestion);
    expect(one.considered).toEqual(sugar.considered);
    expect(voiceOf(a, 'you')).toEqual(voiceOf(b, 'you'));
  });

  test('each voice adds its own term and gets its own verdict and counters', () => {
    const p = keen();
    const r = run(p, [WORK, REST, CHAT], [say('selin', 'work'), say('riza', 'chat')]);
    expect(r.chosenAction).toBe('work');
    const work = r.considered.find((c) => c.affordanceId === 'work');
    const chat = r.considered.find((c) => c.affordanceId === 'chat');
    expect(work?.terms.some((t) => t.source === 'suggestion:selin')).toBe(true);
    expect(chat?.terms.some((t) => t.source === 'suggestion:riza')).toBe(true);
    expect(r.suggestions?.map((s) => s.voiceId)).toEqual(['riza', 'selin']);
    expect(resOf(r, 'selin')?.verdict).toBe('assented');
    expect(resOf(r, 'riza')?.verdict).toBe('deferred');
    expect(r.suggestion).toBe(resOf(r, 'selin'));
    expect(voiceOf(p, 'selin')?.accepted).toBe(1);
    expect(voiceOf(p, 'riza')?.refused).toBe(1);
    expect(voiceOf(p, 'riza')?.pressure ?? 0).toBeGreaterThan(0);
    expect(voiceOf(p, 'selin')?.pressure).toBe(0);
  });

  test('two voices on the chosen option both assent; the larger term is credited', () => {
    const p = keen([
      { voiceId: 'selin', trust: 0.9 },
      { voiceId: 'hacer', trust: 0.4 },
    ]);
    const r = run(p, [WORK, REST], [say('hacer', 'work'), say('selin', 'work')]);
    expect(resOf(r, 'selin')?.verdict).toBe('assented');
    expect(resOf(r, 'hacer')?.verdict).toBe('assented');
    expect(r.suggestion?.voiceId).toBe('selin');
    const c = conflictBetweenVoices(r.considered, r.suggestions ?? [], r.chosenAffordanceId);
    expect(c?.creditedVoiceId).toBe('selin');
    const term = (id: string) => c?.voices.find((v) => v.voiceId === id)?.term ?? 0;
    expect(term('selin')).toBeGreaterThan(term('hacer'));
  });

  test('two voices pushing the same option can together move him where one alone cannot', () => {
    const p = keen();
    const alone = run(keen(), [WORK, REST], [say('you', 'rest', { strength: 0.35 })]);
    expect(alone.chosenAction).toBe('work');
    const both = run(
      p,
      [WORK, REST],
      [
        say('you', 'rest', { strength: 1 }),
        say('selin', 'rest', { strength: 1 }),
        say('hacer', 'rest', { strength: 1 }),
      ],
    );
    expect(both.chosenAction).toBe('rest');
    expect(both.suggestions?.every((s) => s.verdict === 'assented')).toBe(true);
  });

  test('two voices insisting on different options: the most trusted is complied with, the other waits', () => {
    const p = keen([
      { voiceId: 'selin', trust: 0.8 },
      { voiceId: 'riza', trust: 0.6 },
    ]);
    const r = scoreAndResolve(
      p,
      [WORK, REST, CHAT],
      ctxOf(p, {
        suggestions: [say('riza', 'chat', { insist: true }), say('selin', 'rest', { insist: true })],
      }),
    );
    expect(r.record.chosenAction).toBe('rest');
    expect(resOf(r.record, 'selin')?.verdict).toBe('complied');
    const riza = resOf(r.record, 'riza');
    expect(riza?.verdict).toBe('deferred');
    expect(riza?.reason).toBe('voice:selin');
    expect(riza?.insteadAffordanceId).toBe('rest');
    expect(r.record.suggestion?.voiceId).toBe('selin');
    expect(r.needDeltas.autonomy ?? 0).toBeLessThan(0);
    expect(voiceOf(p, 'riza')?.refused).toBe(1);
  });

  test('insisting displaces another voice’s assent, which costs that voice nothing', () => {
    const p = keen();
    const r = run(p, [WORK, REST], [say('osman', 'work'), say('you', 'rest', { insist: true })]);
    expect(r.chosenAction).toBe('rest');
    expect(resOf(r, 'you')?.verdict).toBe('complied');
    expect(resOf(r, 'osman')?.verdict).toBe('deferred');
    expect(resOf(r, 'osman')?.reason).toBe('voice:you');
    expect(voiceOf(p, 'osman')?.accepted).toBe(0);
    expect(voiceOf(p, 'osman')?.refused).toBe(0);
    expect(voiceOf(p, 'osman')?.pressure).toBe(0);
  });

  test('predicting one voice amid others reads the combined pull, writes nothing and draws no RNG', () => {
    const p = keen();
    p.will.temperature = 0.1;
    const you = say('you', 'rest', { strength: 0.35 });
    const others = [say('selin', 'rest', { strength: 1 }), say('hacer', 'rest', { strength: 1 })];
    const before = JSON.stringify(p);
    const withAll = scoreAll(p, [WORK, REST], ctxOf(p, { suggestions: [you, ...others] }));
    const alone = scoreAll(p, [WORK, REST], ctxOf(p, { suggestion: you }));
    const amid = predictResponse(p, withAll.considered, withAll.willCtx, you, others);
    const solo = predictResponse(p, alone.considered, alone.willCtx, you);
    expect(amid.verdict).toBe('assented');
    expect(solo.verdict).not.toBe('assented');
    expect(amid.likelihood ?? 0).toBeGreaterThan(solo.likelihood ?? 0);
    expect(JSON.stringify(p)).toBe(before);
  });

  test('predictResponses gives one verdict per voice in id order; no voices means no conflict', () => {
    const p = keen();
    const voices = [say('selin', 'work'), say('riza', 'chat')];
    const s = scoreAll(p, [WORK, REST, CHAT], ctxOf(p, { suggestions: voices }));
    const all = predictResponses(p, s.considered, s.willCtx, voices);
    expect(all.map((r) => [r.voiceId, r.verdict])).toEqual([
      ['riza', 'deferred'],
      ['selin', 'assented'],
    ]);
    expect(conflictBetweenVoices(s.considered, [], 'work')).toBeUndefined();
  });

  test('voices are ordered by id and deduplicated, so argument order never changes the outcome', () => {
    const a = keen();
    const b = keen();
    const s1 = [say('selin', 'work'), say('riza', 'chat'), say('selin', 'rest')];
    const s2 = [say('riza', 'chat'), say('selin', 'work')];
    expect(voicesIn(undefined, s1).map((s) => `${s.voiceId}:${s.action}`)).toEqual([
      'riza:chat',
      'selin:work',
    ]);
    expect(run(a, [WORK, REST, CHAT], s1)).toEqual(run(b, [WORK, REST, CHAT], s2));
  });

  test('a quiet review that continues the activity moves no voice counters for any voice', () => {
    const p = keen();
    const r0 = run(p, [WORK, REST], []);
    expect(r0.chosenAction).toBe('work');
    p.activity = {
      affordanceId: 'work',
      action: 'work',
      affordance: WORK,
      needsAtStart: {},
      startedAt: p.now,
      endsAt: p.now + 120,
      effort: 0.2,
      focus: 0,
      mode: 'awake',
      decisionId: r0.id,
      intention: '',
      reviewAt: p.now,
    };
    const r = scoreAndResolve(
      p,
      [WORK, REST, CHAT],
      ctxOf(p, { quiet: true, suggestions: [say('riza', 'chat'), say('hacer', 'rest')] }),
    ).record;
    expect(r.chosenAffordanceId).toBe('work');
    expect(r.suggestions?.length).toBe(2);
    expect(voiceOf(p, 'riza')?.refused ?? 0).toBe(0);
    expect(voiceOf(p, 'hacer')?.pressure ?? 0).toBe(0);
  });
});

describe('distrust with several voices', () => {
  const FOREST = aff('forest', { advertises: { esteem: 0.3, competence: 0.2 }, tags: ['work'] });

  function burnedBy(voiceId: string, action: string, over: Partial<PersonSpec> = {}): Person {
    const p = person('halil', {
      needs: { esteem: 0.1, competence: 0.1 },
      voices: [
        { voiceId, trust: 0.3 },
        { voiceId: 'selin', trust: 0.8 },
      ],
      ...over,
    });
    remember(p, {
      at: p.now - 600,
      kind: 'outcome',
      action,
      actorId: p.id,
      valence: -0.7,
      summary: 'It went badly',
      tags: [],
      voiceId,
    });
    return p;
  }

  test('a distrusted voice repeating trusted advice does not spoil it', () => {
    const p = burnedBy('riza', 'forest');
    const r = run(p, [FOREST, REST], [say('riza', 'forest'), say('selin', 'forest')]);
    expect(r.chosenAction).toBe('forest');
    expect(r.considered.find((c) => c.affordanceId === 'forest')?.vetoed).toBeUndefined();
    expect(resOf(r, 'riza')?.verdict).toBe('refused');
    expect(resOf(r, 'riza')?.reason).toBe('distrust');
    expect(resOf(r, 'selin')?.verdict).toBe('assented');
    expect(r.suggestion?.voiceId).toBe('selin');
  });

  test('alone, the distrusted voice still blocks the option (unchanged single-voice rule)', () => {
    const p = burnedBy('riza', 'forest');
    const r = run(p, [FOREST, REST], [say('riza', 'forest')]);
    expect(r.chosenAction).toBe('rest');
    expect(r.considered.find((c) => c.affordanceId === 'forest')?.vetoed?.reason).toBe('distrust');
  });
});

describe('omission rule under several voices', () => {
  const MAGHRIB_FROM = 1125;
  const MAGHRIB_UNTIL = 1215;
  const late = MAGHRIB_FROM + Math.ceil(0.8 * (MAGHRIB_UNTIL - MAGHRIB_FROM));

  function devout(over: Partial<PersonSpec> = {}): Person {
    const p = person('halil', {
      now: late,
      values: { tradition: 0.9, achievement: 0.9 },
      needs: { esteem: 0.1, competence: 0.1 },
      norms: [{ normId: 'salah', standing: 'obligatory', conviction: 0.95 }],
      ...over,
    });
    const [, , , maghrib] = prayerWindows(0);
    if (maghrib) promise(p, maghrib);
    return p;
  }

  test('no number of voices pushing or insisting away adds up to missing a closing duty', () => {
    const p = devout({
      voices: [
        { voiceId: 'riza', trust: 0.95 },
        { voiceId: 'osman', trust: 0.95 },
        { voiceId: 'you', trust: 0.95 },
      ],
    });
    const r = run(
      p,
      [WORK, PRAY, REST, CHAT],
      [
        say('riza', 'chat', { strength: 1, insist: true }),
        say('osman', 'work', { strength: 1, insist: true, appeal: 'achievement' }),
        say('you', 'rest', { strength: 1 }),
      ],
    );
    expect(r.chosenAction).toBe('pray');
    for (const id of ['riza', 'osman']) {
      expect(resOf(r, id)?.verdict).toBe('refused');
      expect(resOf(r, id)?.kind).toBe('willNot');
      expect(resOf(r, id)?.reason).toBe('norm:salah');
    }
    expect(resOf(r, 'you')?.verdict).toBe('deferred');
    expect(resOf(r, 'you')?.counterOffer?.label).toBe('after I pray Maghrib');
  });

  test('a voice urging the duty assents while the others are deferred behind it', () => {
    const p = devout();
    const r = run(p, [WORK, PRAY], [say('yakup', 'pray'), say('osman', 'work')]);
    expect(r.chosenAction).toBe('pray');
    expect(resOf(r, 'yakup')?.verdict).toBe('assented');
    expect(resOf(r, 'osman')?.verdict).toBe('deferred');
    expect(r.suggestion?.voiceId).toBe('yakup');
  });

  test('a distrusted voice urging the duty cannot leave him with nothing to choose: he prays for its own sake', () => {
    // Before the fix (run on HEAD a15c4c5): pray was distrust-vetoed, work and rest omission-vetoed, chosen null.
    const p = devout({ voices: [{ voiceId: 'riza', trust: 0.2 }] });
    remember(p, {
      at: p.now - 600,
      kind: 'outcome',
      action: 'pray',
      actorId: p.id,
      valence: -0.7,
      summary: 'Got soaked on the way',
      tags: [],
      voiceId: 'riza',
    });
    const r = run(p, [WORK, PRAY, REST], [say('riza', 'pray')]);
    expect(r.chosenAction).toBe('pray');
    expect(r.considered.find((c) => c.affordanceId === 'pray')?.vetoed).toBeUndefined();
    expect(r.suggestion?.verdict).toBe('refused');
    expect(r.suggestion?.reason).toBe('distrust');
    expect(r.suggestion?.insteadAffordanceId).toBe('pray');
  });
});

describe('voice eviction (review 2026-10-03)', () => {
  test('a seeded voice is never evicted by a crowd of new voices', () => {
    const p = person('halil', { voices: [{ voiceId: 'you', trust: 0.8 }] });
    for (let i = 0; i < WILL_DEFAULTS.maxVoices + 8; i++)
      learnFromVoice(p, { voiceId: `n${i}`, verdict: 'assented', reason: 'x', says: '' }, 0);
    expect(p.will.voices.length).toBe(WILL_DEFAULTS.maxVoices);
    expect(voiceOf(p, 'you')?.trust).toBe(0.8);
  });
});
