import type { PersonaEnvelope } from '@adam0white/lab-client';
import { expect, test } from 'vitest';
import { nativeCastSource } from './cast-native-sources.ts';
import selin from './fixtures/goodhands-selin-native.json';
import hacer from './fixtures/stairwell-hacer-hf223-native.json';
import meryem from './fixtures/valley-meryem-native.json';

test('older native source dialects refuse before an HF4 arrival', () => {
  for (const source of [selin, hacer, meryem]) {
    const original = structuredClone(source);
    expect(() => nativeCastSource('voice', source as PersonaEnvelope)).toThrow(/older version.*fresh game/);
    expect(source).toEqual(original);
  }
});
