import { ENGINE_VERSION } from '@adam0white/human-framework';
/** Finite native return contracts. These recognize source semantics, never a cast id alone.
 * Host-specific episodes remain source-local. Calendar actions are retained only when the
 * target actually implements them; clinical/family/project gates remain HF's responsibility.
 */
import { type PersonaEnvelope, portablePassport, portablePersonRole } from '@adam0white/lab-client';

// Portable fields keep their semantics across the 2.23 doze/narration corrections.
const compatibleEngine = (engine: string) =>
  engine === '2.17.0' || engine === '2.21.0' || engine === '2.23.0' || engine === ENGINE_VERSION;

export function nativeCastSource(
  target: string,
  parent: PersonaEnvelope,
): { mapping: string; role: string } | undefined {
  const { transfer, castId } = parent;
  if (portablePassport(parent)) {
    return { mapping: 'hf-portable-person/1', role: portablePersonRole(parent, target) };
  }
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
      !compatibleEngine(parent.source.engine) ||
      receipt.version !== 'site-native-claim/1' ||
      !receipt.source ||
      typeof receipt.revision !== 'string' ||
      !/^[a-f0-9]{64}$/.test(receipt.revision)
    )
      throw new Error('A native claim is only a same-site continuation, not a new source checkpoint.');
    source = receipt.source;
  }
  const role = String(transfer.sourceRole);
  if (!compatibleEngine(source.engine)) return undefined;
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
    (source.rules === '7' ||
      (source.rules === '8' && source.engine === '2.21.0') ||
      (source.rules === '9' && source.engine === '2.23.0')) &&
    transfer.castPassport === 'stairwell-cast/1' &&
    role === 'hacer' &&
    castId === 'hf.cast.hacer.voice'
  ) {
    if (!Array.isArray(transfer.hostObligations) || transfer.hostObligations.length)
      throw new Error('The source building account or dues remain unresolved. Keep that chapter.');
    return { mapping: 'stairwell-calendar/1', role };
  }
  if (
    target === 'watch' &&
    source.game === 'warren' &&
    source.rules === 'warren-0.6.0' &&
    transfer.castPassport === 'warren-calendar/1' &&
    ({ kian: 'hf.cast.kian.watch', meryem: 'hf.cast.meryem.warren' } as Record<string, string>)[role] ===
      castId
  ) {
    if ((role === 'kian') !== (transfer.warrenCare !== undefined) || transfer.watchCare !== undefined)
      throw new Error('Native Warren care must match the finite source role.');
    return { mapping: 'warren-calendar/1', role };
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
