/** Read-only display of retained host events. Forecasts and planned end times prove no outcome. */
import type { Frame } from '../protocol.ts';

export function requestAccount(frame: Frame) {
  const index = frame.log.findLastIndex((entry) => entry.kind === 'you' && entry.minute <= frame.minute);
  const sent = frame.log[index];
  if (!sent) return null;
  const later = frame.log.slice(index + 1).filter((entry) => entry.minute <= frame.minute);
  const answer = later.findLast((entry) => entry.kind === 'answer');
  const ended = later.findLast(
    (entry) =>
      entry.kind === 'note' &&
      entry.who === 'you' &&
      /Your suggestion (?:has (?:now )?ended|fades)|You withdraw your suggestion/.test(entry.text),
  );
  const standing = frame.standing;
  const status =
    ended?.text ??
    (answer?.tone === 'cannot' || answer?.tone === 'willNot'
      ? 'He declined. This suggestion is no longer standing.'
      : standing?.begun
        ? `Began at ${standing.begun.clock}: ${standing.begun.label}. This is not a completion receipt.`
        : standing
          ? answer
            ? 'Your suggestion still stands. His answer does not guarantee he will do it.'
            : 'Said. Waiting for his answer.'
          : 'This suggestion is no longer standing. Its end or result is not recorded here.');
  return {
    id: sent.id,
    sent,
    answer,
    status,
    window: standing
      ? `Until ${standing.expires}${standing.minutesLeft === undefined ? '' : ` · ${standing.minutesLeft} minutes remaining`}. ${standing.offered === undefined ? '' : standing.offered ? 'The action is among his current offers; this does not guarantee it will fit or be chosen.' : 'The action is not among his current offers.'}`
      : undefined,
  };
}

export function callAccount(frame: Frame) {
  const facts = frame.callFacts;
  if (!facts) return [];
  const rows: { id: string; minute: number; day: number; clock: string; text: string }[] = [];
  if (facts.connected && facts.connected.minute <= frame.minute) {
    const call = facts.connected;
    rows.push({
      id: `connected:${call.minute}:${call.by}`,
      minute: call.minute,
      day: call.day,
      clock: call.clock,
      text: `${call.by === 'halil' ? 'Halil’s call to Selin' : 'Selin’s call to Halil'} connected. No conversation ending is recorded here.`,
    });
  }
  if (facts.missed && facts.missed.minute <= frame.minute) {
    const call = facts.missed;
    rows.push({
      id: `missed:${call.minute}`,
      minute: call.minute,
      day: call.day,
      clock: call.clock,
      text: 'Selin called, but Halil did not answer. No conversation took place.',
    });
  }
  return rows.sort((a, b) => a.minute - b.minute);
}
