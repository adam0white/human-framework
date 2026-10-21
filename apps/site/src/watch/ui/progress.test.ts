import { describe, expect, it } from 'vitest';
import { dawnOutcome, grainCondition, thawProgress, winterWatchMarks } from './words.ts';

describe('the winter goal in approximate words', () => {
  it('relates grain to spring food without promising safety', () => {
    expect(grainCondition({ grain: 0, need: 5 })).toContain('empty');
    expect(grainCondition({ grain: 4, need: 5 })).toContain('homes may leave');
    expect(grainCondition({ grain: 5, need: 5 })).toContain('nothing spare');
    expect(grainCondition({ grain: 12, need: 5 })).toContain('plenty');
  });
  it('separates the last played watch from the rest of winter', () => {
    const winter = { night: 1, nights: 7, why: '', question: null };
    expect(thawProgress({ winter, phase: 'dusk' })).toContain('still far off');
    expect(thawProgress({ winter: { ...winter, night: 5 }, phase: 'night' })).toContain('A few watches');
    expect(thawProgress({ winter: { ...winter, night: 7 }, phase: 'night' })).toContain('Last watch');
    expect(thawProgress({ winter: { ...winter, night: 7 }, phase: 'dawn' })).toContain('Watch finished');
    expect(thawProgress({ winter: { ...winter, night: 7 }, phase: 'dawn' })).toContain('routine');
  });
});

describe('the morning outcome', () => {
  it('distinguishes a held night, a harmless crossing, a small loss and a serious breach', () => {
    const dawn = { grainBefore: 20, grainAfter: 20, crossed: false };
    expect(dawnOutcome(dawn)).toBe('The wall held. No grain was lost.');
    expect(dawnOutcome({ ...dawn, crossed: true })).toBe('The wall was crossed. No grain was lost.');
    expect(dawnOutcome({ ...dawn, crossed: true, grainAfter: 18 })).toContain('A small loss of grain.');
    expect(dawnOutcome({ ...dawn, crossed: true, grainAfter: 12 })).toContain('A serious breach.');
  });
  it('draws coarse watched-night progress without claiming the thaw has arrived', () => {
    const winter = { night: 1, nights: 8, why: '', question: null };
    expect(winterWatchMarks({ winter, phase: 'dawn' })).toBe(1);
    expect(winterWatchMarks({ winter: { ...winter, night: 4 }, phase: 'dawn' })).toBe(2);
    expect(winterWatchMarks({ winter: { ...winter, night: 7 }, phase: 'dawn' })).toBe(3);
    expect(winterWatchMarks({ winter: { ...winter, night: 8 }, phase: 'dawn' })).toBe(4);
    expect(thawProgress({ winter: { ...winter, night: 8 }, phase: 'dawn' })).toContain('routine');
  });
});
