import type { ReportView, SceneWords } from '../protocol.ts';

/** Count the player's record, never Halil's worship, health, trust or worth. */
export function voiceTally(view: ReportView, words: readonly SceneWords[]): string[] {
  const days = view.rows.length;
  const suggestions = view.ledger?.length ?? 0;
  const company = words.filter((line) => line.said !== false && line.kind !== 'suggestion').length;
  return [
    `${days + suggestions + company} marks — one per recorded day, kind of suggestion and care or question line`,
    `Days recorded: ${days} · Suggestion kinds: ${suggestions} · Care or question lines spoken: ${company}`,
  ];
}
