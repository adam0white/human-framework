import type { PersonAuthoring, Result, RunSpec } from '@adam0white/human-framework';
import { createPerson, createRun, exportRun, inspect } from '@adam0white/human-framework';
import { canonicalPersona } from '@adam0white/lab-client';
import { expect, test } from 'vitest';
import opening from '../../test/fixtures/hf4-checkpoint-opening.json';

const need = <T>(result: Result<T>): T => {
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
};

import { verifyCastSourceCheckpoint } from './cast-source-checkpoint.ts';

test('a shelf checkpoint binds the complete replaying run and actual portable person', async () => {
  const run = need(createRun(opening.spec as unknown as RunSpec));
  const person = opening.person as unknown as PersonAuthoring;
  need(createPerson(run, person));
  const archive = exportRun(run);
  const reading = need(
    inspect(run, {
      perspective: { kind: 'host' },
      people: ['selin'],
      select: ['persona'],
      portable: { person: 'selin', castId: 'hf.cast.selin.voice', castRevision: '2' },
    }),
  );
  const portable = reading.people[0]?.parts[0]?.value;
  const digest = Array.from(
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonicalPersona(archive))),
    ),
    (b) => b.toString(16).padStart(2, '0'),
  ).join('');
  const transfer = {
    castPassport: 'hf-portable-person/2',
    sourceRole: 'selin',
    portable,
    checkpoint: {
      kind: 'hf-run/1',
      engine: archive.engine,
      sourceAt: archive.current.at,
      person: 'selin',
      sha256: digest,
    },
  };
  await expect(
    verifyCastSourceCheckpoint('voice', 'hf.cast.selin.voice', transfer, archive),
  ).resolves.toEqual(archive);
  await expect(
    verifyCastSourceCheckpoint(
      'voice',
      'hf.cast.selin.voice',
      { ...transfer, checkpoint: { ...transfer.checkpoint, person: 'halil' } },
      archive,
    ),
  ).rejects.toThrow(/identity/);
  const changed = structuredClone(archive);
  Reflect.set(changed.current, 'at', changed.current.at + 1);
  await expect(
    verifyCastSourceCheckpoint('voice', 'hf.cast.selin.voice', transfer, changed),
  ).rejects.toThrow();
  await expect(
    verifyCastSourceCheckpoint(
      'voice',
      'hf.cast.selin.voice',
      { ...transfer, portable: { ...(portable as object), castId: 'hf.cast.halil.voice' } },
      archive,
    ),
  ).rejects.toThrow();
});
