import type { PersonaEnvelope } from '@adam0white/lab-client';
import { expect, it } from 'vitest';
import { carriedCare } from './care-reentry.ts';

it('refuses older finite care evidence before replacing any dependent or duty', () => {
  const source = {
    castId: 'hf.cast.kian.watch',
    transfer: { watchCare: { version: 'watch-warren-ada/1' } },
  } as unknown as PersonaEnvelope;
  const before = structuredClone(source);
  expect(() => carriedCare(source, {})).toThrow(/must stay together/);
  expect(source).toEqual(before);
});
