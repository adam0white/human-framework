import { describe, expect, it } from 'vitest';
import { grainCondition, thawProgress } from './words.ts';

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
