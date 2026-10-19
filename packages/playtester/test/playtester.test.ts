import { describe, expect, it } from 'vitest';
import { PERSONAS, type Persona, type PersonaId, playSession, readSession } from '../src/index.ts';
import { Garden, Lull, Wall } from './toys.ts';

const ALL = Object.values(PERSONAS) as Persona[];
const SEEDS = [1, 2, 3];
const cap = { maxMinutes: 40 };

describe('playtester on toy games', () => {
  it('a game where nothing happens bores every persona into putting it down within minutes', () => {
    for (const persona of ALL)
      for (const seed of SEEDS) {
        const tr = playSession(new Lull(), persona, seed, cap);
        expect(tr.ended.reason, `${persona.id}/${seed}`).toBe('quit');
        expect(tr.ended.t).toBeLessThanOrEqual(8 * 60);
        expect(tr.ended.why).toMatch(/boredom|leisure/);
      }
    // The patient completionist lasts longer than the restless player.
    const t = (id: PersonaId) => playSession(new Lull(), PERSONAS[id], 1, cap).ended.t;
    expect(t('completionist')).toBeGreaterThan(t('restless'));
  });

  it('a game with steady fresh rewards holds players until real life or the end', () => {
    for (const seed of SEEDS) {
      expect(playSession(new Garden(), PERSONAS.completionist, seed, cap).ended.reason).toBe('game-over');
      const bus = playSession(new Garden(), PERSONAS.commuter, seed, cap);
      expect(bus.ended.reason).toBe('agenda');
      expect(bus.ended.t).toBeGreaterThanOrEqual(15 * 60);
      expect(bus.ended.t).toBeLessThanOrEqual(28 * 60);
      expect(bus.moments.some((m) => m.kind === 'rewarded')).toBe(true);
    }
    const garden = readSession(playSession(new Garden(), PERSONAS.commuter, 1, cap));
    const lull = readSession(playSession(new Lull(), PERSONAS.commuter, 1, cap));
    expect(garden.meanEngagement).toBeGreaterThan(lull.meanEngagement + 0.3);
    expect(lull.bored.length).toBeGreaterThan(0);
  });

  it('a keeper who always refuses frustrates, draws insisting, and drives players off', () => {
    for (const persona of ALL) {
      const tr = playSession(new Wall(), persona, 1, cap);
      const frustrated = tr.moments.find((m) => m.kind === 'frustrated');
      expect(frustrated, persona.id).toBeDefined();
      expect(frustrated?.text).toMatch(/keeper said no/);
      expect(tr.ended.reason).toBe('quit');
      expect(tr.ended.t).toBeLessThan(cap.maxMinutes * 60);
      expect(tr.beats.some((b) => b.choice === 'insist')).toBe(true);
    }
  });

  it('is deterministic for a seed and varies across seeds', () => {
    const a = playSession(new Garden(), PERSONAS.restless, 4, cap);
    const b = playSession(new Garden(), PERSONAS.restless, 4, cap);
    expect(JSON.stringify(a.beats)).toBe(JSON.stringify(b.beats));
    expect(a.moments).toEqual(b.moments);
    const ends = new Set(SEEDS.map((s) => playSession(new Wall(), PERSONAS.restless, s, cap).ended.t));
    expect(ends.size).toBeGreaterThan(1);
  });
});
