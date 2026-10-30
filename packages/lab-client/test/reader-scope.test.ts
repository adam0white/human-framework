import { expect, it, vi } from 'vitest';
import { portableWriteBlockers } from '../src/persona-portable.ts';
import { PORTABLE_READERS, type PortableReaderCertificate } from '../src/portable-readers.ts';

// TEST ONLY: override Good Hands with a one-person fixture, independent of its live scope.
// Mock only this module instance; these assertions supply no live qualification.
vi.mock('../src/portable-readers.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/portable-readers.ts')>();
  return {
    ...actual,
    PORTABLE_READERS: {
      ...actual.PORTABLE_READERS,
      goodhands: {
        client: '0.5.16',
        perPersonSkips: true,
        castIds: ['hf.cast.hatice.hearsay'],
      },
    },
  };
});

it('limits a TEST ONLY reader certificate to its covered people and preserves unscoped coverage', () => {
  const fixture = PORTABLE_READERS as Record<string, PortableReaderCertificate>;
  expect(portableWriteBlockers('hf.cast.hatice.hearsay', 'hearsay')).toEqual([]);
  expect(portableWriteBlockers('hf.cast.nermin.goodhands', 'hearsay')).toEqual(['goodhands']);
  fixture.goodhands = { client: '0.5.16', perPersonSkips: true, castIds: [] };
  expect(portableWriteBlockers('hf.cast.hatice.hearsay', 'hearsay')).toEqual(['goodhands']);
  expect(portableWriteBlockers('hf.cast.nermin.goodhands', 'hearsay')).toEqual(['goodhands']);
  // Warren's existing real certificate omits castIds; it retains its original scope.
  expect(PORTABLE_READERS.warren?.castIds).toBeUndefined();
  expect(portableWriteBlockers('hf.cast.yusuf.warren', 'valley')).toEqual([]);
});
