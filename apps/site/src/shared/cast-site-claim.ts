/** Site-only claim receipt: an abandoned native arrival may start another chapter in the SAME
 * site host before its next source checkpoint. It cannot become a pass-through native source
 * for another host. Shelf CAS, absence checks and all semantic admissions remain atomic.
 */
import {
  type CastShelf,
  claimPortablePerson,
  createPersona,
  type LifeBatchPreparation,
  type LifePreparation,
  lifeAdmission,
  type PersonaEnvelope,
  portablePassport,
} from '@adam0white/lab-client';
import { nativeCastSource } from './cast-native-sources.ts';
export async function claimSiteCastBatch<T>(
  shelf: CastShelf,
  castIds: string[],
  source: PersonaEnvelope['source'],
  admit: (inputs: LifePreparation[]) => Promise<T>,
  options: { isCurrent?: () => boolean; onDispatch?: () => void } = {},
) {
  const current = () => {
    if (options.isCurrent && !options.isCurrent())
      throw new Error('The run or identity changed. Choose again.');
  };
  current();
  const batch = await shelf.request<LifeBatchPreparation>({ action: 'prepareBatch', castIds });
  current();
  if (!batch.expectedHeads || castIds.some((id) => !Object.hasOwn(batch.expectedHeads, id)))
    throw new Error('The batch omitted expected cast parents.');
  if (batch.blocked.length) throw new Error(batch.blocked.map((p) => `${p.castId}: ${p.reason}`).join(' '));
  if (!batch.inputs.length) {
    options.onDispatch?.();
    await shelf.request({ action: 'putBatch', envelopes: [], expectedHeads: batch.expectedHeads });
    current();
    return null;
  }
  for (const input of batch.inputs) lifeAdmission(input, source.game);
  const initial = await admit(structuredClone(batch.inputs));
  const claims = await Promise.all(
    batch.inputs.map(async (input) => {
      const { revision, ...body } = input.parent;
      const native = nativeCastSource(source.game, input.parent);
      const prior = body.transfer.siteNativeClaim as
        | { source: PersonaEnvelope['source']; revision: string }
        | undefined;
      const portable = portablePassport(input.parent);
      const transfer = portable ? claimPortablePerson(input.parent, source.game) : body.transfer;
      return createPersona({
        ...body,
        parentRevision: revision,
        source: portable ? body.source : source,
        transfer: {
          ...transfer,
          life: input.life,
          ...(native && !portable
            ? { siteNativeClaim: prior ?? { version: 'site-native-claim/1', source: body.source, revision } }
            : {}),
        },
      });
    }),
  );
  current();
  options.onDispatch?.();
  await shelf.request({ action: 'putBatch', envelopes: claims, expectedHeads: batch.expectedHeads });
  current();
  return { initial, claims, inputs: batch.inputs };
}
