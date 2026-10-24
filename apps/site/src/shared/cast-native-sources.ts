/** Finite native return contracts. These recognize source semantics, never a cast id alone.
 * Host-specific episodes remain source-local. Calendar actions are retained only when the
 * target actually implements them; clinical/family/project gates remain HF's responsibility.
 */
import type { PersonaEnvelope } from '@adam0white/lab-client';

export function nativeCastSource(
  target: string,
  parent: PersonaEnvelope,
): { mapping: string; role: string } | undefined {
  const { transfer, castId } = parent;
  let source = parent.source;
  if (transfer.siteNativeClaim !== undefined) {
    const receipt = transfer.siteNativeClaim as {
      version?: unknown;
      source?: PersonaEnvelope['source'];
      revision?: unknown;
    };
    if (
      parent.source.game !== target ||
      parent.source.rules !== 'cast-1' ||
      parent.source.engine !== '2.17.0' ||
      receipt.version !== 'site-native-claim/1' ||
      !receipt.source ||
      typeof receipt.revision !== 'string' ||
      !/^[a-f0-9]{64}$/.test(receipt.revision)
    )
      throw new Error('A native claim is only a same-site continuation, not a new source checkpoint.');
    source = receipt.source;
  }
  const role = String(transfer.sourceRole);
  if (source.engine !== '2.17.0') return undefined;
  if (
    target === 'voice' &&
    source.game === 'goodhands' &&
    source.rules === 'goodhands-6' &&
    transfer.castPassport === 'goodhands-agency/1' &&
    role === 'selin-voice' &&
    castId === 'hf.cast.selin.voice'
  )
    return { mapping: 'goodhands-agency-calendar/1', role };
  if (
    target === 'voice' &&
    source.game === 'hearsay' &&
    source.rules === 'hearsay-cast-6' &&
    transfer.castPassport === 'hearsay-cast/1' &&
    ({ riza: 'hf.cast.riza.voice', osman: 'hf.cast.osman.voice' } as Record<string, string>)[role] === castId
  )
    return { mapping: 'hearsay-calendar/1', role };
  if (
    target === 'voice' &&
    source.game === 'stairwell' &&
    source.rules === '7' &&
    transfer.castPassport === 'stairwell-cast/1' &&
    role === 'hacer' &&
    castId === 'hf.cast.hacer.voice'
  ) {
    if (!Array.isArray(transfer.hostObligations) || transfer.hostObligations.length)
      throw new Error('The source building account or dues remain unresolved. Keep that chapter.');
    return { mapping: 'stairwell-calendar/1', role };
  }
  if (
    source.game === 'valley' &&
    source.rules === 'valley-cast-3' &&
    transfer.castPassport === 'valley-cast/1'
  ) {
    const routes: Record<string, Record<string, string>> = {
      well: { danyal: 'hf.cast.danyal.well', maryam: 'hf.cast.maryam.well', yusuf: 'hf.cast.yusuf.well' },
      watch: {
        danyal: 'hf.cast.danyal.well',
        samira: 'hf.cast.samira.well',
        'meryem-visitor': 'hf.cast.meryem.warren',
      },
    };
    if (routes[target]?.[role] === castId) return { mapping: 'valley-calendar/1', role };
  }
  return undefined;
}
