import { expect, it } from 'vitest';
import { harnessCommands } from './harness-commands.ts';

it('accepts seed arguments and multi-word commands with explicit semicolon boundaries', () => {
  const words = new Set(['new', 'inspect', 'show']);
  expect(harnessCommands(['new', '7', 'inspect', 'Idris', 'show'], words)).toEqual([
    'new 7',
    'inspect Idris',
    'show',
  ]);
  expect(harnessCommands(['new 7;inspect Idris', 'show'], words)).toEqual(['new 7', 'inspect Idris', 'show']);
  expect(harnessCommands(['new 7;bogus', 'arg'], words)).toEqual(['new 7', 'bogus arg']);
});
