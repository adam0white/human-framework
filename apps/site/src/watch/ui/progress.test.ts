import { describe, expect, it } from 'vitest';
import { dawnOutcome, grainCondition, thawProgress, winterWatchMarks } from './words.ts';

describe('the winter goal in approximate words', () => {
  it('relates grain to spring food without promising safety', () => {
    expect(grainCondition({ grain: 0, need: 5 })).toContain('no grain left');
    expect(grainCondition({ grain: 4, need: 5 })).toContain('households may leave');
    expect(grainCondition({ grain: 5, need: 5 })).toContain('none to spare');
    expect(grainCondition({ grain: 12, need: 5 })).toContain('plenty');
  });
  it('separates the last played watch from the rest of winter', () => {
    const winter = { night: 1, nights: 7, why: '', question: null };
    expect(thawProgress({ winter, phase: 'dusk' })).toContain('still far off');
    expect(thawProgress({ winter, phase: 'dusk' })).toContain('7 watches to complete, including this one');
    expect(thawProgress({ winter, phase: 'dawn' })).toContain('6 watches left');
    expect(thawProgress({ winter: { ...winter, night: 5 }, phase: 'night' })).toContain('a few watches');
    expect(thawProgress({ winter: { ...winter, night: 7 }, phase: 'night' })).toContain(
      'last watch you control',
    );
    expect(thawProgress({ winter: { ...winter, night: 7 }, phase: 'dawn' })).toContain(
      'watches you control are finished',
    );
    expect(thawProgress({ winter: { ...winter, night: 7 }, phase: 'dawn' })).toContain('usual watches');
  });
  it('counts only controlled watches and handles one remaining watch and the thaw', () => {
    const winter = { night: 1, nights: 1, why: '', question: null };
    for (const phase of ['dusk', 'night'] as const) {
      expect(thawProgress({ winter, phase })).toContain('1 watch to complete, including this one');
    }
    expect(thawProgress({ winter: { ...winter, nights: 2 }, phase: 'dawn' })).toContain('1 watch left');
    for (const phase of ['dawn', 'thaw'] as const) {
      expect(thawProgress({ winter, phase })).toContain('watches you control are finished');
      expect(thawProgress({ winter, phase })).not.toContain('1 watch');
    }
  });
});

describe('the morning outcome', () => {
  it('distinguishes a held night, a harmless crossing, a small loss and a serious breach', () => {
    const dawn = { grainBefore: 20, grainAfter: 20, crossed: false };
    expect(dawnOutcome(dawn)).toBe('The wall held. No grain was lost.');
    expect(dawnOutcome({ ...dawn, crossed: true })).toBe('The wall was crossed. No grain was lost.');
    expect(dawnOutcome({ ...dawn, crossed: true, grainAfter: 18 })).toContain('A little grain was taken.');
    expect(dawnOutcome({ ...dawn, crossed: true, grainAfter: 12 })).toContain('took a lot of grain.');
  });
  it('draws coarse watched-night progress without claiming the thaw has arrived', () => {
    const winter = { night: 1, nights: 8, why: '', question: null };
    expect(winterWatchMarks({ winter, phase: 'dawn' })).toBe(1);
    expect(winterWatchMarks({ winter: { ...winter, night: 4 }, phase: 'dawn' })).toBe(2);
    expect(winterWatchMarks({ winter: { ...winter, night: 7 }, phase: 'dawn' })).toBe(3);
    expect(winterWatchMarks({ winter: { ...winter, night: 8 }, phase: 'dawn' })).toBe(4);
    expect(thawProgress({ winter: { ...winter, night: 8 }, phase: 'dawn' })).toContain('usual watches');
  });
});
