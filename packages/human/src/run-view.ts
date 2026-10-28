/** SCOPE: closed event projection. Privileged events never become a person view
 * by copying a raw payload. Rendering follows the admitted audience selection.
 */
import { cloneData } from './core/clone.ts';
import { rendererOwner } from './narrate/literal.ts';
import { freezeData } from './run-kernel.ts';
import type * as T from './run-schema.ts';

export function projectEvents(
  events: readonly T.DeepReadonly<T.RunEvent>[],
  perspective: T.DeepReadonly<T.Perspective>,
  lexicon: T.DeepReadonly<T.Lexicon>,
  seed: number,
  communications: T.DeepReadonly<T.ReceiptLedger['communications']>,
): readonly T.DeepReadonly<T.VisibleEvent>[] {
  const visible: T.DeepReadonly<T.VisibleEvent>[] = [];
  const requests = new Map<T.Id, T.DeepReadonly<T.CommunicationRequest>>();
  for (const event of events)
    if (event.data.kind === 'communication-requested')
      requests.set(event.data.request.id, event.data.request);
  for (const event of events) {
    const base = { id: event.id, at: event.at, causeIds: event.causeIds };
    if (perspective.kind === 'host') {
      visible.push({
        ...base,
        access: 'host',
        data: event.data,
        narration: rendererOwner.render(event, perspective, lexicon, seed),
      });
      continue;
    }
    const data = event.data;
    if (data.kind === 'claim-told') {
      const ownSpeech = data.speaker === perspective.observer;
      const items =
        requests
          .get(data.deliveryRequestId)
          ?.items.filter((item) => {
            if (item.data.kind !== 'claim') return false;
            const told = item.data.told;
            return (
              told.prop === data.claim.prop &&
              told.value === data.claim.value &&
              told.confidence === data.claim.confidence &&
              told.origin === data.claim.origin &&
              told.lineage === data.claim.lineage
            );
          })
          .map((item) => item.id) ?? [];
      const received =
        data.listener === perspective.observer &&
        communications.some(
          (receipt) =>
            receipt.requestId === data.deliveryRequestId &&
            receipt.receptions.some(
              (reception) =>
                reception.recipient === perspective.observer &&
                reception.itemIds.some((id) => items.includes(id)),
            ),
        );
      if (!ownSpeech && !received) continue;
      // Deliberately name each public leaf. Speaker credence, deceit, backbiting
      // and score do not travel to the listener's event payload.
      const claim: T.PerceptClaim = {
        prop: data.claim.prop,
        value: data.claim.value,
        confidence: data.claim.confidence,
        ...(data.claim.origin === undefined ? {} : { origin: data.claim.origin }),
        ...(data.claim.lineage === undefined ? {} : { lineage: data.claim.lineage }),
      };
      visible.push({
        ...base,
        access: 'self',
        data: { kind: 'claim-heard', speaker: data.speaker, listener: data.listener, claim },
        narration: rendererOwner.render(event, perspective, lexicon, seed),
      });
      continue;
    }
    if (event.person !== perspective.observer) continue;
    switch (data.kind) {
      case 'suggestion-resolved':
      case 'decision':
      case 'commitment-changed':
      case 'goal-changed':
      case 'prompting':
      case 'review':
      case 'voice-evidence':
      case 'voice-promise':
      case 'quantity-estimated':
      case 'observation-attended':
        visible.push({
          ...base,
          access: 'self',
          data,
          narration: rendererOwner.render(event, perspective, lexicon, seed),
        });
        break;
    }
  }
  return freezeData(cloneData(visible));
}
