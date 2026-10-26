/**
 * Scope: explicit stop/confusion feedback using the existing bounded note transport.
 * Recording, run linkage and receipts belong to Lab.sendFeedback. No new wire fields
 * or agent attribution are introduced. Importing this module sends nothing.
 */
import type { Lab } from './index.ts';

export const FEEDBACK_LABELS = {
  stopping: "I'm stopping",
  confused: "I'm confused",
} as const;
export type FeedbackLabel = keyof typeof FEEDBACK_LABELS;

/** Explicit submission; recording off keeps the existing unlinked-note behavior. */
export function sendFeedbackLabel(
  lab: Pick<Lab, 'sendFeedback'>,
  label: FeedbackLabel,
  options?: Parameters<Lab['sendFeedback']>[1],
): Promise<string> {
  if (!Object.hasOwn(FEEDBACK_LABELS, label)) throw new TypeError('Unknown feedback label.');
  return lab.sendFeedback(FEEDBACK_LABELS[label], options);
}
