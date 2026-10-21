import { expect, test } from 'vitest';
import * as hf from '../src/index.ts';
import { legacyProjectLoopContinuation } from './legacy-projects-loop-fixture.ts';
import { LEGACY_PROJECT_LOOP_HASH, LEGACY_PROJECT_LOOP_SAVE } from './legacy-projects-loop-save.ts';

test('a published 2.14.0 mid-loop save continues exactly without re-enabling either faculty', () => {
  const p = hf.restore(LEGACY_PROJECT_LOOP_SAVE);
  expect(p.projects).not.toHaveProperty('behaviour');
  expect(p.pursuit).not.toHaveProperty('behaviour');
  expect(p.agenda.goals[0]?.project).not.toHaveProperty('peak');
  expect(legacyProjectLoopContinuation(hf, LEGACY_PROJECT_LOOP_SAVE)).toBe(LEGACY_PROJECT_LOOP_HASH);
});
