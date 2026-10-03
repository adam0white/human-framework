import { describe, expect, test } from 'vitest';
import { CUE_RECALL_DEFAULTS, recall, recallByCue, remember } from '../src/memory/index.ts';
import { markDeceased } from '../src/social/index.ts';
import type { Episode } from '../src/types.ts';
import { MINUTES_PER_DAY } from '../src/types.ts';
import { lanePerson } from './lane-fixture.ts';

const DAY = MINUTES_PER_DAY;

function widower() {
  const p = lanePerson('halil');
  // Fajr with Nuran at the masjid, 05:00 on day 0: a warm, salient memory.
  remember(p, {
    at: 5 * 60,
    kind: 'social',
    action: 'pray',
    actorId: 'nuran',
    placeId: 'masjid',
    valence: 0.8,
    summary: 'Nuran, Fajr, the winter before last',
    tags: ['pray', 'social'],
  });
  // A mildly pleasant tea at the kitchen, unrelated to her.
  remember(p, {
    at: 9 * 60,
    kind: 'outcome',
    action: 'tea',
    placeId: 'kitchen',
    valence: 0.2,
    summary: 'tea',
    tags: [],
  });
  return p;
}

describe('recallByCue', () => {
  test('a matching place brings back an emotional episode and sets recalledAt without boosting salience', () => {
    const p = widower();
    p.now = 2 * DAY;
    const before = p.memory.episodes[0]?.salience ?? 0;
    const r = recallByCue(p, { placeId: 'masjid', at: 2 * DAY + 5 * 60 });
    expect(r.recalled).toEqual(['e0']);
    expect(r.episodes[0]?.summary).toContain('Nuran');
    expect(p.memory.episodes[0]?.salience).toBe(before);
    expect(p.memory.episodes[0]?.recalledAt).toBe(2 * DAY + 5 * 60);
    // Nuran alive: an ordinary positive re-appraisal at reduced intensity, no grief.
    expect(r.grief).toEqual([]);
    expect(r.appraisals).toHaveLength(1);
    expect(r.appraisals[0]?.desirability).toBeGreaterThan(0);
    expect(r.appraisals[0]?.desirability).toBeLessThan(0.8 * CUE_RECALL_DEFAULTS.reappraisal + 1e-9);
  });

  test('hour alone never triggers recall; weak (low-valence) episodes never intrude', () => {
    const p = widower();
    p.now = 2 * DAY;
    expect(recallByCue(p, { hour: 5, at: 2 * DAY + 5 * 60 }).recalled).toEqual([]);
    expect(recallByCue(p, { placeId: 'kitchen', at: 2 * DAY + 9 * 60 }).recalled).toEqual([]);
  });

  test('memories of someone who died re-appraise as grief, even warm ones, at reduced intensity', () => {
    const p = widower();
    p.now = 2 * DAY;
    markDeceased(p, 'nuran', DAY);
    const r = recallByCue(p, { placeId: 'masjid', at: 2 * DAY + 5 * 60 });
    expect(r.appraisals).toEqual([]);
    expect(r.grief).toHaveLength(1);
    expect(r.grief[0]?.targetId).toBe('nuran');
    expect(r.grief[0]?.intensity).toBeGreaterThan(0.1);
    expect(r.grief[0]?.intensity).toBeLessThan(0.4);
    expect(r.grief[0]?.cause).toBe('recall:e0');
  });

  test('the person as a cue (e.g. her chair tagged with her id) also triggers it', () => {
    const p = widower();
    p.now = 3 * DAY;
    markDeceased(p, 'nuran', DAY);
    expect(recallByCue(p, { personId: 'nuran' }).recalled).toEqual(['e0']);
  });

  test('refractory period: the same cue does not replay the memory within six hours', () => {
    const p = widower();
    p.now = 2 * DAY;
    const at = 2 * DAY + 5 * 60;
    expect(recallByCue(p, { placeId: 'masjid', at }).recalled).toEqual(['e0']);
    expect(recallByCue(p, { placeId: 'masjid', at: at + 60 }).recalled).toEqual([]);
    expect(recallByCue(p, { placeId: 'masjid', at: at + CUE_RECALL_DEFAULTS.refractory }).recalled).toEqual([
      'e0',
    ]);
  });

  test('the yearly anniversary of a loss is a cue on its own', () => {
    const p = lanePerson('halil');
    remember(p, {
      at: 10 * 60,
      kind: 'witnessed',
      action: 'death',
      targetId: 'nuran',
      valence: -0.9,
      summary: 'Nuran died',
      tags: ['death'],
    });
    // Salience decays over a year; emotional episodes decay slowly, but give it a realistic boost by repeated recall.
    (p.memory.episodes[0] as Episode).salience = 0.6;
    p.now = 365 * DAY + 8 * 60;
    const r = recallByCue(p, {});
    expect(r.recalled).toEqual(['e0']);
    expect(r.grief).toHaveLength(1);
    // The day before is not the anniversary.
    const q = lanePerson('halil');
    remember(q, {
      at: 10 * 60,
      kind: 'witnessed',
      action: 'death',
      targetId: 'nuran',
      valence: -0.9,
      summary: 'x',
      tags: ['death'],
    });
    (q.memory.episodes[0] as Episode).salience = 0.6;
    q.now = 364 * DAY + 8 * 60;
    expect(recallByCue(q, {}).recalled).toEqual([]);
  });

  test('deterministic and bounded by limit; ordinary recall() is unchanged', () => {
    const a = widower();
    const b = widower();
    for (const p of [a, b]) {
      p.now = 2 * DAY;
      remember(p, {
        at: 6 * 60,
        kind: 'social',
        action: 'talk',
        placeId: 'masjid',
        valence: 0.7,
        summary: 'hoca',
        tags: [],
      });
    }
    const ra = recallByCue(a, { placeId: 'masjid', limit: 1 });
    const rb = recallByCue(b, { placeId: 'masjid', limit: 1 });
    expect(ra).toEqual(rb);
    expect(ra.recalled).toHaveLength(1);
    expect(recall(a, { placeId: 'masjid' }).length).toBe(2);
  });

  test('regression: a routine meal is not kept alive or re-felt by every meal (review 2026-10-03)', () => {
    const p = lanePerson('selin');
    remember(p, {
      at: 8 * 60,
      kind: 'outcome',
      action: 'eat',
      placeId: 'home',
      valence: 0.45,
      summary: 'ate at home',
      tags: [],
    });
    const before = p.memory.episodes[0]?.salience ?? 0;
    let recalled = 0;
    for (let d = 1; d <= 30; d++) {
      const r = recallByCue(p, { placeId: 'home', action: 'eat', at: d * DAY + 8 * 60 });
      recalled += r.recalled.length;
    }
    expect(recalled).toBe(0);
    expect(p.memory.episodes[0]?.salience ?? 0).toBeLessThanOrEqual(before);
  });
});
