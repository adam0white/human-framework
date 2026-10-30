/** A current retained public portable person is the only source dialect admitted here.
 * Unsupported older host-native exports stay in their source chapter. */
import { type PersonaEnvelope, portablePassport, portablePersonRole } from '@adam0white/lab-client';
export function nativeCastSource(target: string, parent: PersonaEnvelope): { mapping: string; role: string } {
  if (!portablePassport(parent) || parent.transfer.castPassport !== 'hf-portable-person/2')
    throw new Error(
      'This saved person is from an older version. Start a fresh game, or keep the source chapter.',
    );
  return { mapping: 'hf-portable-person/2', role: portablePersonRole(parent, target) };
}
