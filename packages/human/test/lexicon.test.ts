import { describe, expect, test } from 'vitest';
import {
  actionForms,
  createPerson,
  EN_LINES,
  fillTemplate,
  intentionFor,
  linesFor,
  nameOf,
  narrateDecision,
  pickLine,
  voiceLine,
} from '../src/index.ts';
import type { DecisionRecord, Lexicon, Person, SuggestionResolution } from '../src/types.ts';
import { MINUTES_PER_YEAR } from '../src/types.ts';

const NOON = 12 * 60;

function halil(lexicon?: Lexicon): Person {
  const p = createPerson({
    id: 'halil',
    name: 'Halil',
    seed: 7,
    now: NOON,
    bornAt: NOON - 61 * MINUTES_PER_YEAR,
    sex: 'male',
    relationships: [
      { otherId: 'selin', roles: ['child'] },
      { otherId: 'osman', roles: ['landlord'] },
      { otherId: 'nuran', roles: ['spouse'] },
    ],
    commitments: [
      {
        id: 'rent',
        kind: 'promise',
        toId: 'osman',
        actions: ['pay-rent'],
        from: NOON,
        until: NOON + 3 * 1440,
        importance: 0.8,
      },
    ],
  });
  // Integration hook (not yet in createPerson): copy `PersonSpec.lexicon` to `Person.lexicon`.
  if (lexicon) p.lexicon = lexicon;
  return p;
}

const LEX: Lexicon = {
  locale: 'en',
  names: { selin: 'Selin', osman: 'Osman' },
  roles: { child: 'daughter', landlord: 'landlord' },
};

const record = (source: string, id = 'd1'): DecisionRecord => ({
  id,
  at: NOON,
  chosenAffordanceId: 'a',
  chosenAction: 'talk',
  considered: [{ affordanceId: 'a', action: 'talk', utility: 1, terms: [{ source, value: 1 }] }],
  intention: '',
  narration: '',
});

describe('lexicon (N6)', () => {
  test('nameOf without a lexicon keeps the built-in role phrases and raw ids', () => {
    const p = halil();
    expect(nameOf(p, 'nuran')).toBe('my spouse');
    expect(nameOf(p, 'selin')).toBe('my child');
    expect(nameOf(p, 'osman')).toBe('osman');
    expect(nameOf(p, undefined)).toBe('them');
  });

  test('nameOf prefers lexicon names, or role nouns with the right possessive', () => {
    const p = halil();
    expect(nameOf(p, 'selin', LEX)).toBe('Selin');
    expect(nameOf(p, 'osman', { ...LEX, prefer: 'role' })).toBe('my landlord');
    expect(nameOf(p, 'selin', LEX, { prefer: 'role', possessive: 'his' })).toBe('his daughter');
    // A name with no relationship still resolves; an unknown id stays an id.
    expect(nameOf(p, 'riza', { names: { riza: 'Rıza' } })).toBe('Rıza');
    expect(nameOf(p, 'stranger', LEX)).toBe('stranger');
    // The person's own lexicon is used when none is passed.
    expect(nameOf(halil(LEX), 'selin')).toBe('Selin');
  });

  test('decision narration and intentions use names from the lexicon', () => {
    const p = halil(LEX);
    expect(narrateDecision(p, record('social:selin'))).toMatch(/Selin/);
    expect(narrateDecision(halil(), record('social:selin'))).toMatch(/my child/);
    expect(intentionFor(p, record('commitment:rent'))).toBe('to keep my promise to Osman');
    expect(intentionFor(halil(), record('commitment:rent'))).toBe('to keep my promise to osman');
    // A named non-player voice is credited by name; the player stays "you".
    expect(intentionFor(p, record('suggestion:selin'))).toBe('because Selin asked');
    expect(intentionFor(p, record('suggestion:player'))).toBe('because you asked');
  });

  test('host packs replace or extend templates by key, deterministically', () => {
    const p = halil();
    const res: SuggestionResolution = {
      voiceId: 'player',
      verdict: 'assented',
      reason: 'need:food',
      says: '',
    };
    const turkish: Lexicon = { locale: 'tr', lines: { 'voice.assented': ['Peki.', 'Tamam, yaparım.'] } };
    const line = voiceLine(p, res, 'k1', turkish);
    expect(['Peki.', 'Tamam, yaparım.']).toContain(line);
    expect(voiceLine(p, res, 'k1', turkish)).toBe(line);
    const extended: Lexicon = { extend: { 'voice.assented': ['Fair enough.'] } };
    expect(linesFor('voice.assented', extended)).toEqual([
      ...(EN_LINES['voice.assented'] ?? []),
      'Fair enough.',
    ]);
    // Slots are filled; unknown keys fall back.
    const deferred: SuggestionResolution = {
      ...res,
      verdict: 'deferred',
      counterOffer: { label: 'after iftar' },
    };
    expect(voiceLine(p, deferred, 'k2', { lines: { 'voice.deferred': ['Sonra. {After}.'] } })).toBe(
      'Sonra. After iftar.',
    );
    expect(pickLine('no.such.key', 'x', { a: 1 }, undefined, 0, 'fallback {a}')).toBe('fallback 1');
    expect(fillTemplate('{who} and {missing}', { who: 'Selin' })).toBe('Selin and {missing}');
  });

  test('every default template key is non-empty', () => {
    for (const [key, lines] of Object.entries(EN_LINES)) {
      expect(lines.length, key).toBeGreaterThan(0);
    }
  });

  test('action verb forms: irregular, regular, multi-word, and lexicon overrides', () => {
    expect(actionForms('eat')).toEqual({ base: 'eat', past: 'ate', gerund: 'eating' });
    expect(actionForms('pray')).toEqual({ base: 'pray', past: 'prayed', gerund: 'praying' });
    expect(actionForms('smoke')).toEqual({ base: 'smoke', past: 'smoked', gerund: 'smoking' });
    expect(actionForms('work-field').past).toBe('worked field');
    expect(
      actionForms('cards', { actions: { cards: { base: 'play cards', past: 'played cards' } } }),
    ).toEqual({
      base: 'play cards',
      past: 'played cards',
      gerund: 'playing cards',
    });
  });
});
