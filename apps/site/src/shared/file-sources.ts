import { canonicalPersona, validatePersona } from '@adam0white/lab-client';
import { validateCastRecord } from './cast-authority.ts';
import { MAX_PLAYTEST_BYTES } from './playtest.ts';

/** Imported receipt archives are kept as history only; validate their binding without any Shelf access. */
export async function validateFileSources(raw: Record<string, unknown>): Promise<void> {
  const ownership = raw.castOwnership;
  const sources = raw.castSources;
  if (ownership !== undefined && (!ownership || typeof ownership !== 'object' || Array.isArray(ownership)))
    throw new Error(
      'This file has damaged character records. Keep the original file and choose another export.',
    );
  if (sources !== undefined && (!sources || typeof sources !== 'object' || Array.isArray(sources)))
    throw new Error(
      'This file has damaged character history. Keep the original file and choose another export.',
    );
  const heads = Object.entries((ownership ?? {}) as Record<string, unknown>);
  if (heads.length > 8)
    throw new Error(
      'This file has too many character records. Choose an export with at most eight characters.',
    );
  for (const [id, value] of heads) {
    const head = await validatePersona(value);
    if (id !== head.castId)
      throw new Error(
        'This file has records for a different character. Keep the original file and choose another export.',
      );
  }
  for (const [id, source] of Object.entries((sources ?? {}) as Record<string, unknown>)) {
    const head = (
      ownership as Record<string, { transfer: { checkpoint?: { sha256?: string } } }> | undefined
    )?.[id];
    if (!head?.transfer.checkpoint?.sha256 || !source || typeof source !== 'object')
      throw new Error(
        'This file is missing the record needed to check a character’s history. Choose a complete export.',
      );
    const digest = Array.from(
      new Uint8Array(
        await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonicalPersona(source))),
      ),
      (byte) => byte.toString(16).padStart(2, '0'),
    ).join('');
    if (digest !== head.transfer.checkpoint.sha256)
      throw new Error(
        'A character’s history has changed since this file was made. Keep the original file and choose another export.',
      );
  }
}

/** One file boundary for all three games; reject large or non-object JSON before inspecting records. */
export async function checkGameFile(text: string): Promise<Record<string, unknown>> {
  if (new TextEncoder().encode(text).byteLength > MAX_PLAYTEST_BYTES)
    throw new Error('This file is too large. Keep the original file and choose an export smaller than 5 MB.');
  const raw: unknown = JSON.parse(text);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    throw new Error('This file does not contain a game. Keep the original file and choose another export.');
  if ('castAuthority' in raw) {
    const game = (raw as Record<string, unknown>).game;
    const host = game === 'colony' ? 'well' : game === 'the-night-watch' ? 'watch' : game;
    if (host !== 'well' && host !== 'watch' && host !== 'voice')
      throw new Error('Unknown character authority host.');
    await validateCastRecord(host, raw as Record<string, unknown>, { provenanceOnly: true });
  }
  await validateFileSources(raw as Record<string, unknown>);
  return raw as Record<string, unknown>;
}
