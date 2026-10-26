import { describe, expect, it } from 'vitest';
import { declaredLabel, LAB_GAMES } from './games.ts';

describe('His Word lab registration', () => {
  it('accepts its game and authored labels while excluding player text', () => {
    expect(LAB_GAMES.find((game) => game.id === 'word')?.href).toBe('https://word.adamwhite.work');
    for (const screen of [
      'His Word',
      'At the cutting table',
      'What they need',
      'One agreement',
      'Your word',
      'Read it together',
      'They kept their word.',
      'The shop stayed shut.',
    ]) {
      expect(declaredLabel('word', 'scr', screen)).toBe(screen);
    }
    for (const ending of ['ending:win', 'ending:loss']) {
      expect(declaredLabel('word', 'ms', ending)).toBe(ending);
    }
    expect(declaredLabel('word', 'scr', 'A private player note')).toBeUndefined();
  });
});
