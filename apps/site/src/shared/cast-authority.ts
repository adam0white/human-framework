/** Browser ownership protocol only; no simulation or shelf permission is inferred from old saves. */
import { castForGame, portablePersonOwner, validatePersona } from '@adam0white/lab-client';
import { nativeCastSource } from './cast-native-sources.ts';
import type { CastHeads } from './cast-runtime.ts';
import { verifyCastSourceCheckpoint } from './cast-source-checkpoint.ts';
import { validateFileSources } from './file-sources.ts';

export type CastAuthority = {
  format: 'site-cast-authority/1';
  mode: 'shared' | 'local';
  expectedHeads: Record<string, string | null>;
  denied: string[];
};
const damaged = () =>
  new Error('This save has incomplete character authority. Keep the export and start a fresh chapter.');
const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
/** Single structural/receipt validator, used before native restoration or worker activation. */
export async function validateCastRecord(
  game: string,
  raw: Record<string, unknown>,
  options: { provenanceOnly?: true } = {},
): Promise<{
  authority: CastAuthority;
  heads: CastHeads;
  sources: Record<string, unknown>;
}> {
  const a = raw.castAuthority;
  const ids = castForGame(game).map((p) => p.castId);
  if (
    !object(a) ||
    a.format !== 'site-cast-authority/1' ||
    !['shared', 'local'].includes(String(a.mode)) ||
    Object.keys(a).some((key) => !['format', 'mode', 'expectedHeads', 'denied'].includes(key)) ||
    !object(a.expectedHeads) ||
    !Array.isArray(a.denied) ||
    !Array.isArray(raw.castSkipped) ||
    typeof raw.castLocalOnly !== 'boolean' ||
    !object(raw.castOwnership) ||
    !object(raw.castSources)
  )
    throw damaged();
  const denied = a.denied;
  if (
    denied.some((id) => typeof id !== 'string' || !ids.includes(id)) ||
    new Set(denied).size !== denied.length ||
    raw.castSkipped.length !== denied.length ||
    raw.castSkipped.some((id, i) => id !== denied[i]) ||
    raw.castLocalOnly !== (a.mode === 'local')
  )
    throw damaged();
  const expected = a.expectedHeads;
  if (
    Object.keys(expected).some((id) => !ids.includes(id)) ||
    Object.values(expected).some(
      (head) => head !== null && (typeof head !== 'string' || !/^[a-f0-9]{64}$/.test(head)),
    ) ||
    (a.mode === 'shared' &&
      (Object.keys(expected).length !== ids.length || ids.some((id) => !Object.hasOwn(expected, id)))) ||
    (a.mode === 'local' &&
      (Object.keys(expected).length ||
        denied.length ||
        Object.keys(raw.castOwnership).length ||
        Object.keys(raw.castSources).length))
  )
    throw damaged();
  if (denied.some((id) => expected[id] == null)) throw damaged();
  await validateFileSources(raw);
  const heads: CastHeads = {};
  for (const [id, value] of Object.entries(raw.castOwnership)) {
    if (!ids.includes(id) || denied.includes(id) || !Object.hasOwn(expected, id)) throw damaged();
    const head = await validatePersona(value);
    if (head.castId !== id) throw damaged();
    if (!options.provenanceOnly) {
      // A terminal receipt retains its last projection; it never becomes a living actor.
      // Closing a receiving claim changes the envelope source to its closing host.
      const { terminal, ...living } = head;
      let checked = living;
      if (terminal) {
        if (head.source.game !== game || head.parentRevision === null) throw damaged();
        const source = (head.transfer.portable as { source?: { game?: string; engine?: string } } | undefined)
          ?.source;
        if (!source?.game || !source.engine) throw damaged();
        checked = { ...living, source: { ...living.source, game: source.game, engine: source.engine } };
      }
      const owner = portablePersonOwner(checked);
      if (owner !== undefined) {
        if (owner !== game || head.transfer.castPassport !== 'hf-portable-person/2') throw damaged();
      } else {
        if (head.source.game !== game) throw damaged();
        nativeCastSource(game, checked);
        // A local authored head needs its exact supported checkpoint, not merely a passport marker.
        await verifyCastSourceCheckpoint(game, id, head.transfer, raw.castSources[id]);
      }
    }
    heads[id] = head;
  }
  if (ids.some((id) => expected[id] != null && !denied.includes(id) && !heads[id])) throw damaged();
  if (Object.keys(raw.castSources).some((id) => !heads[id] || denied.includes(id))) throw damaged();
  return { authority: structuredClone(a) as CastAuthority, heads, sources: structuredClone(raw.castSources) };
}
export function localCastAuthority(): CastAuthority {
  return { format: 'site-cast-authority/1', mode: 'local', expectedHeads: {}, denied: [] };
}
/** Null is an explicitly checked absence, not a missing authority entry. */
export function canCheckpoint(authority: CastAuthority | undefined, id: string, heads: CastHeads): boolean {
  return (
    authority?.mode === 'shared' &&
    Object.hasOwn(authority.expectedHeads, id) &&
    !authority.denied.includes(id) &&
    !heads[id]?.terminal &&
    (authority.expectedHeads[id] === null || Boolean(heads[id]))
  );
}
