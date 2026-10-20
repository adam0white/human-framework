import type { Prediction } from '../sim/human-side.ts';
import type { OrderCard, OrderInput } from '../sim/orders.ts';
import type { Frame, Nudge } from './contract.ts';
import { latestPersonOrder } from './order-status.ts';
import { inferredJob, shortName } from './parts.tsx';

/** The same payload that the existing suggestion route prepares. This does not issue an order. */
export function suggestionInput(nudge: Nudge): OrderInput {
  return {
    ...nudge.order,
    rush: Boolean(nudge.prefill?.rush ?? nudge.order.rush),
    insist: Boolean(nudge.prefill?.insist ?? nudge.order.insist),
  };
}

/** Presentation only. A fresh forecast supersedes earlier answers; HF still decides the actual response. */
export function suggestionChoice(
  nudge: Nudge,
  frame?: Frame | null,
  cards: readonly OrderCard[] = [],
  forecast?: Prediction | null,
) {
  const job = frame ? inferredJob(frame, nudge.order.placeId) : null;
  const prediction = forecast?.personId === nudge.order.personId && forecast.action === job ? forecast : null;
  const latest = latestPersonOrder(cards, nudge.order.personId);
  const prior =
    !prediction &&
    latest?.status === 'active' &&
    latest.order.action === job &&
    latest.human.state === 'willNot'
      ? latest
      : null;
  const refusal =
    prediction?.kind === 'willNot'
      ? `${shortName(nudge.order.personId)} · ${prediction.text}`
      : prior
        ? `Last answer from ${shortName(nudge.order.personId)}: “${prior.human.says ?? prior.human.label ?? 'I will not.'}” Checking the current answer…`
        : null;
  return {
    refusal,
    nudge: refusal ? { ...nudge, prefill: { ...nudge.prefill, insist: true } } : nudge,
  };
}
