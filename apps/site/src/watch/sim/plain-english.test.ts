import { expect, it } from 'vitest';
import { newGame, refusalLine } from './night.ts';
import { dawnSpeech, soulsWords } from './view.ts';

it('uses the named watcher’s pronoun when a posting changes', () => {
  const s = newGame(7);
  expect(refusalLine(s, 'kian', 'modified', 'west', 'post:east-1')).toContain('posted him.');
  expect(refusalLine(s, 'samira', 'modified', 'west', 'post:east-1')).toContain('posted her.');
});

it('joins dawn reports without inventing why the watcher went home', () => {
  const reports = '“Every sound from the Gate startled me.” “I went to my little sister. I’d go again.”';
  expect(dawnSpeech(reports)).toBe(
    '“Every sound from the Gate startled me. I went to my little sister. I’d go again.”',
  );
  expect(dawnSpeech('“It was quiet.”')).toBe('“It was quiet.”');
  expect(soulsWords(1, 1)).toBe('One person in one home');
  expect(soulsWords(6, 3)).toBe('Six people in three homes');
});

it('describes company without claiming the watcher stayed all night', () => {
  const text = '“I left the Gate. I was very cold.” “I stayed because Kian stayed.”';
  expect(dawnSpeech(text)).toBe('“I left the Gate. I was very cold. It helped when Kian stayed beside me.”');
});
