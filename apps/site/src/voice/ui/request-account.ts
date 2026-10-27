/** Read-only display of retained host events, in plain words. Forecasts and planned end times prove no outcome. */
import type { Frame } from '../protocol.ts';

/** The suggestion in plain words: drops the strength word ("mention", "urge") the player already chose. */
export function suggestionWords(text: string): string {
  return text
    .replace(/^You:\s*/, '')
    .split(' · ')
    .filter((part) => part !== 'mention' && part !== 'urge' && part !== 'insist')
    .join(' · ');
}

/**
 * What a "later" answer commits him to (R2: 12 of 16 players asked). He means it, but it is not a promise: his
 * next choice weighs it again against what he wants then, and it lapses when the time or its window runs out.
 */
export function laterMeaning(until: string | undefined): string {
  return `He means to do it then. That is a plan, not a promise: when he next chooses, he weighs your word again against what he wants then. If time runs out first, it ends, and you will see why.${until ? ` You do not need to repeat it. It stands until ${until}.` : ''}`;
}

export function requestAccount(frame: Frame) {
  const index = frame.log.findLastIndex((entry) => entry.kind === 'you' && entry.minute <= frame.minute);
  const sent = frame.log[index];
  // An ended suggestion from an earlier day is history (Today keeps it), not the current account.
  if (!sent || (!frame.standing && sent.day < frame.day)) return null;
  const later = frame.log.slice(index + 1).filter((entry) => entry.minute <= frame.minute);
  const answer = later.findLast((entry) => entry.kind === 'answer');
  const ended = later.findLast(
    (entry) =>
      entry.kind === 'note' &&
      entry.who === 'you' &&
      /Your suggestion (?:has (?:now )?ended|fades)|You withdraw your suggestion|^He did what you suggested/.test(
        entry.text,
      ),
  );
  const standing = frame.standing;
  const status =
    ended?.text ??
    (answer?.tone === 'cannot' || answer?.tone === 'willNot'
      ? 'He said no. Your suggestion has ended.'
      : standing?.begun
        ? `He started at ${standing.begun.clock}.`
        : standing
          ? answer
            ? answer.tone === 'notNow'
              ? laterMeaning(standing.expires)
              : `He agreed. Your suggestion stands until ${standing.expires}.`
            : 'Said. Waiting for his answer.'
          : 'Your suggestion has ended.');
  return {
    id: sent.id,
    sent,
    words: suggestionWords(sent.text),
    answer,
    status,
    window:
      standing && standing.offered === false && !standing.begun
        ? `He cannot do it just now. If it opens again before ${standing.expires}, he will hear it.`
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
      text: `${call.by === 'halil' ? 'Halil called Selin' : 'Selin called Halil'}, and they talked.`,
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
