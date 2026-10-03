import { expect, test } from 'vitest';
import { FRAMEWORK_VERSION } from '../src/index.ts';

test('exports a version', () => {
  expect(FRAMEWORK_VERSION).toMatch(/^1\./);
});
