import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { FRAMEWORK_VERSION } from '../src/index.ts';

test('exports a version', () => {
  expect(FRAMEWORK_VERSION).toMatch(/^2\./);
});

test('FRAMEWORK_VERSION is the package version (the release version policy)', () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
    version: string;
  };
  expect(FRAMEWORK_VERSION).toBe(pkg.version);
});
