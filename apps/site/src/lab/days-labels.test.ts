import { describe, expect, it } from 'vitest';
import { declaredLabel, LAB_GAMES } from './games.ts';

describe('Three Days lab registration', () => {
  it('accepts the game and fixed labels while excluding private text', () => {
    expect(LAB_GAMES.find((game) => game.id === 'days')?.href).toBe('https://days.adamwhite.work');
    for (const screen of ['day 1', 'day 2', 'day 3', 'ending'])
      expect(declaredLabel('days', 'scr', screen)).toBe(screen);
    expect(declaredLabel('days', 'ms', 'ending reached')).toBe('ending reached');
    expect(declaredLabel('days', 'scr', 'A private player note')).toBeUndefined();
  });
});
