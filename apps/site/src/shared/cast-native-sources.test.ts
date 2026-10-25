import type { PersonaEnvelope } from '@adam0white/lab-client';
import { describe, expect, it } from 'vitest';
import { nativeCastSource } from './cast-native-sources.ts';

/** Dialect registration controls, not played-source or browser journey evidence. */
function head(game: string, rules: string, dialect: string, role: string, castId: string): PersonaEnvelope {
  return {
    source: { game, rules, engine: '2.17.0', build: 'control' },
    castId,
    transfer: { castPassport: dialect, sourceRole: role, hostObligations: [] },
  } as unknown as PersonaEnvelope;
}
describe('finite native site returns', () => {
  it('recognizes only authored native target roles, editions and dialects', () => {
    const routes = [
      [
        'voice',
        'hearsay',
        'hearsay-cast-6',
        'hearsay-cast/1',
        'riza',
        'hf.cast.riza.voice',
        'hearsay-calendar/1',
      ],
      [
        'voice',
        'hearsay',
        'hearsay-cast-6',
        'hearsay-cast/1',
        'osman',
        'hf.cast.osman.voice',
        'hearsay-calendar/1',
      ],
      ['voice', 'stairwell', '7', 'stairwell-cast/1', 'hacer', 'hf.cast.hacer.voice', 'stairwell-calendar/1'],
      [
        'well',
        'valley',
        'valley-cast-3',
        'valley-cast/1',
        'maryam',
        'hf.cast.maryam.well',
        'valley-calendar/1',
      ],
      [
        'well',
        'valley',
        'valley-cast-3',
        'valley-cast/1',
        'yusuf',
        'hf.cast.yusuf.well',
        'valley-calendar/1',
      ],
      [
        'well',
        'valley',
        'valley-cast-3',
        'valley-cast/1',
        'danyal',
        'hf.cast.danyal.well',
        'valley-calendar/1',
      ],
      [
        'watch',
        'valley',
        'valley-cast-3',
        'valley-cast/1',
        'danyal',
        'hf.cast.danyal.well',
        'valley-calendar/1',
      ],
      [
        'watch',
        'valley',
        'valley-cast-3',
        'valley-cast/1',
        'samira',
        'hf.cast.samira.well',
        'valley-calendar/1',
      ],
      [
        'watch',
        'valley',
        'valley-cast-3',
        'valley-cast/1',
        'meryem-visitor',
        'hf.cast.meryem.warren',
        'valley-calendar/1',
      ],
    ];
    for (const [target, game, rules, dialect, role, castId, mapping] of routes as [
      string,
      string,
      string,
      string,
      string,
      string,
      string,
    ][]) {
      const p = head(game, rules, dialect, role, castId);
      expect(nativeCastSource(target, p)).toEqual({ role, mapping });
      expect(nativeCastSource(target, { ...p, source: { ...p.source, rules: 'old' } })).toBeUndefined();
      expect(nativeCastSource(target, { ...p, castId: 'hf.cast.tamar.watch' })).toBeUndefined();
    }
  });
  it('refuses unresolved or missing Stairwell host account evidence', () => {
    const p = head('stairwell', '7', 'stairwell-cast/1', 'hacer', 'hf.cast.hacer.voice');
    p.transfer.hostObligations = ['unpaid-building-share'];
    expect(() => nativeCastSource('voice', p)).toThrow(/unresolved/);
    delete p.transfer.hostObligations;
    expect(() => nativeCastSource('voice', p)).toThrow(/unresolved/);
  });
  it('admits the current Stairwell edition only with its released engine and existing role guards', () => {
    const p = head('stairwell', '8', 'stairwell-cast/1', 'hacer', 'hf.cast.hacer.voice');
    p.source.engine = '2.21.0';
    expect(nativeCastSource('voice', p)).toEqual({ role: 'hacer', mapping: 'stairwell-calendar/1' });
    for (const [rules, engine] of [
      ['9', '2.21.0'],
      ['8', '2.17.0'],
      ['8', '2.20.0'],
    ] as const)
      expect(nativeCastSource('voice', { ...p, source: { ...p.source, rules, engine } })).toBeUndefined();
    expect(
      nativeCastSource('voice', { ...p, transfer: { ...p.transfer, sourceRole: 'burak' } }),
    ).toBeUndefined();
    p.transfer.hostObligations = ['unpaid-building-share'];
    expect(() => nativeCastSource('voice', p)).toThrow(/unresolved/);
  });
});
