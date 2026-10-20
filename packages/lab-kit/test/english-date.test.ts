import { describe, expect, it } from 'vitest';
import { dayOf, englishDate, month, weekday } from '../src/english-date.ts';

describe('English dates', () => {
  it('uses fixed English words and Gregorian UTC fields', () => {
    expect(weekday(0)).toBe('Sunday');
    expect(weekday(6)).toBe('Saturday');
    expect(month(1)).toBe('January');
    expect(month(12)).toBe('December');
    expect(dayOf(3, 12)).toBe('Day 3 of 12');
    expect(englishDate(new Date('2024-05-14T23:30:00-05:00'))).toBe('Wednesday 15 May');
    expect(englishDate(Date.UTC(2024, 1, 29), true)).toBe('Thursday 29 February 2024');
  });
  it('rejects invalid numeric and date inputs', () => {
    for (const value of [-1, 7, 0.5, Number.NaN]) expect(() => weekday(value)).toThrow(RangeError);
    for (const value of [0, 13, 1.5, Number.NaN]) expect(() => month(value)).toThrow(RangeError);
    for (const [day, total] of [
      [0, 12],
      [13, 12],
      [1, 0],
      [1.5, 12],
      [1, Number.NaN],
    ] as const) {
      expect(() => dayOf(day, total)).toThrow(RangeError);
    }
    expect(() => englishDate(new Date('invalid'))).toThrow(RangeError);
    expect(() => englishDate(Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });
});
