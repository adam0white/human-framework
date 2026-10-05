/**
 * A small community on the bundled village scenario: play some days with a voice nudging one villager, then
 * mute that voice with `runSilent` and diff the two periods' chronicles. The diff says what the person kept
 * doing on their own, what they still did only when told, and how trust and mood moved.
 * Run: `npm run build -w packages/human && node packages/human/examples/community.ts`.
 */
import {
  chronicleBetween,
  createCommunity,
  createPerson,
  createVillage,
  type DayRecord,
  dayOf,
  diffChronicle,
  MINUTES_PER_DAY,
  narrateChronicle,
  runSilent,
  type Suggestion,
  stepCommunity,
  villagerSpec,
} from '@adam0white/human-framework';

export const DAYS = 4;

export function main(): { lines: string[]; played: DayRecord[]; silent: DayRecord[] } {
  const ids = ['ada', 'bora', 'cem'];
  const start = 6 * 60; // 06:00 on day 0
  const people = ids.map((id, i) =>
    createPerson(villagerSpec(id, id[0]?.toUpperCase() + id.slice(1), 100 + i, { now: start, others: ids })),
  );
  const village = createVillage(people, { seed: 42 });
  const c = createCommunity(people);

  // The player's standing push on Ada: help a neighbour. Resolved at each of her decisions.
  const nudge: Suggestion = { voiceId: 'player', action: 'help', strength: 0.7, appeal: 'benevolence' };
  const suggestions = { ada: nudge };

  // Played period: run to midnight after DAYS full days so every day closes into a DayRecord.
  const firstDay = dayOf(start) + 1;
  const end = (firstDay + DAYS) * MINUTES_PER_DAY;
  const events = stepCommunity(c, village, end, { suggestions });
  const ada = c.people.find((p) => p.id === 'ada');
  if (!ada) throw new Error('ada missing');
  const played = chronicleBetween(ada.chronicle ?? [], firstDay, firstDay + DAYS - 1);

  // Silent period: same driver, same world, the player's voice muted.
  const run = runSilent(c, village, DAYS, { suggestions, mutedVoiceId: 'player' });
  const silent = run.chronicles.ada ?? [];

  const lines: string[] = [];
  const verdicts = events.filter((e) => e.personId === 'ada' && e.verdict && !e.review);
  const tally: Record<string, number> = {};
  for (const e of verdicts) tally[e.verdict as string] = (tally[e.verdict as string] ?? 0) + 1;
  lines.push(`Played ${played.length} days with the voice: Ada's verdicts ${JSON.stringify(tally)}`);
  lines.push(...narrateChronicle(played, { name: 'Ada', pronoun: 'she' }).slice(0, 4));
  lines.push(`Then ${silent.length} days with the voice muted. What changed:`);
  const diff = diffChronicle(played, silent, { name: 'Ada', pronoun: 'she' });
  lines.push(...diff.lines.map((l) => `  ${l}`));
  return { lines, played, silent };
}

if (import.meta.main) for (const line of main().lines) console.log(line);
