import { expect, test } from 'vitest';
import { packedFilename } from './npm-pack.ts';

const filename = 'adam0white-human-framework-3.0.0.tgz';
test('accepts npm 11 array output after lifecycle messages', () => {
  expect(packedFilename(`> package prepack\n> tsc\n${JSON.stringify([{ filename }])}\n`)).toBe(filename);
});
test('accepts npm 12 package-keyed output without parsing its inner files array', () => {
  expect(
    packedFilename(JSON.stringify({ '@adam0white/human-framework': { filename, files: [] } }, null, 2)),
  ).toBe(filename);
});
test('refuses ambiguous packages and a filename outside the pack directory', () => {
  expect(() => packedFilename(JSON.stringify([{ filename }, { filename: 'second.tgz' }]))).toThrow();
  expect(() => packedFilename(JSON.stringify([{ filename: '../private.tgz' }]))).toThrow();
});
