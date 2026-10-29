/** A shelf write carries the portable projection of this exact replayable source run.
 * Source archives are custody evidence, never a live UI reading. */
import { exportRun, inspect, replay, restoreRun } from '@adam0white/human-framework';
import { canonicalCast, canonicalPersona } from '@adam0white/lab-client';
import { castRole } from './cast-chapter.ts';

export async function verifyCastSourceCheckpoint(
  game: string,
  castId: string,
  transfer: Record<string, unknown>,
  sourceSnapshot: unknown,
): Promise<unknown> {
  const receipt = transfer.checkpoint as Record<string, unknown> | undefined;
  const role = castRole(game, castId);
  if (
    transfer.castPassport !== 'hf-portable-person/2' ||
    transfer.sourceRole !== castId.split('.')[2] ||
    receipt?.kind !== 'hf-run/1' ||
    receipt.person !== role
  )
    throw new Error('The source checkpoint identity differs.');
  const restored = restoreRun(sourceSnapshot as Parameters<typeof restoreRun>[0]);
  if (!restored.ok) throw new Error('The source checkpoint is not a supported complete run.');
  const archive = exportRun(restored.value);
  if (
    archive.host.id !== game ||
    receipt.sourceAt !== archive.current.at ||
    canonicalPersona(receipt.engine) !== canonicalPersona(archive.engine) ||
    canonicalPersona(sourceSnapshot) !== canonicalPersona(archive)
  )
    throw new Error('The full-source checkpoint receipt differs from its run.');
  const checked = replay(archive);
  if (!checked.ok || checked.value.fullHash !== archive.hashes.full)
    throw new Error('The source checkpoint does not replay exactly.');
  const projected = inspect(restored.value, {
    perspective: { kind: 'host' },
    people: [role],
    select: ['persona'],
    portable: { person: role, castId, castRevision: canonicalCast(castId).revision },
  });
  const view = projected.ok && projected.value.people[0];
  const actual =
    view && view.kind === 'host' ? view.parts.find((part) => part.select === 'persona')?.value : undefined;
  if (!actual || canonicalPersona(actual) !== canonicalPersona(transfer.portable))
    throw new Error('The portable person differs from the actual source projection.');
  const digest = Array.from(
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonicalPersona(archive))),
    ),
    (b) => b.toString(16).padStart(2, '0'),
  ).join('');
  if (digest !== receipt.sha256) throw new Error('The full-source checkpoint checksum differs.');
  return archive;
}
