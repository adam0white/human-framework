import { expect, it } from 'vitest';
import { portableWriteBlockers } from '../src/persona-portable.ts';
import { PORTABLE_READERS } from '../src/portable-readers.ts';

it('opens Left Hand Tariq writes only while both verified peers can skip him', () => {
  const castId = 'hf.cast.tariq.well';
  expect(portableWriteBlockers(castId, 'lefthand')).toEqual([]);
  const readers = PORTABLE_READERS as Record<string, { client: string; perPersonSkips: boolean }>;
  const well = readers.well;
  try {
    delete readers.well;
    expect(portableWriteBlockers(castId, 'lefthand')).toEqual(['well']);
  } finally {
    if (well) readers.well = well;
  }
  // Left Hand is not certified by this pre-deployment source change.
  expect(portableWriteBlockers(castId, 'warren')).toContain('lefthand');
});
