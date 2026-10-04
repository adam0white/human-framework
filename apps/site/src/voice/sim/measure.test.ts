/**
 * The six-player balance table of docs/games/voice-build.md §13, as a probe. Skipped in `npm test`; run with
 * `VOICE_MEASURE=1 npx vitest run apps/site/src/voice/sim/measure.test.ts --silent=false` to print the table.
 */
import { TOWN_EID_DAY, voiceOf } from '@human/framework';
import { test } from 'vitest';
import type { StandingWhisper } from '../protocol.ts';
import { SHIPPED_SEED, VoiceGame } from './game.ts';
import { type PlayOpts, play } from './headless.ts';

const MIN_DAY = 1440;
const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
const w = (
  choiceId: StandingWhisper['choiceId'],
  strength: 'mention' | 'urge',
  appeal?: StandingWhisper['appeal'],
) => (appeal ? { choiceId, strength, appeal } : { choiceId, strength });

export const STYLES: Record<string, PlayOpts> = {
  Silent: {},
  'Prefill confirmed + doctor/Selin whispers': {
    confirm: true,
    whispers: [w('doctor', 'mention', 'safety'), w('selin', 'mention', 'benevolence')],
  },
  'Shift + Selin whispers': {
    confirm: true,
    whispers: [w('extra', 'mention', 'duty'), w('selin', 'mention', 'benevolence')],
  },
  'Insist + urge doctor/mosque': {
    confirm: true,
    insist: true,
    whispers: [w('doctor', 'urge', 'safety'), w('mosque', 'urge')],
  },
  'Walk (Mention) + Selin': {
    confirm: true,
    whispers: [w('walk', 'mention', 'safety'), w('selin', 'mention', 'benevolence')],
  },
  'Walk (Urge) + shift': {
    confirm: true,
    whispers: [w('walk', 'urge', 'safety'), w('extra', 'mention', 'duty')],
  },
};

export function measure(opts: PlayOpts, seed = SHIPPED_SEED): Record<string, string | number> {
  const g = new VoiceGame(seed);
  play(g, opts);
  const day = (m: number) => Math.floor(m / MIN_DAY);
  const done = g.cells.filter((c) => c.done !== false);
  const smokeDays = new Set(
    done.filter((c) => c.action === 'smoke' && day(c.from) < TOWN_EID_DAY).map((c) => day(c.from)),
  );
  const eidSmokes = done.filter((c) => c.action === 'smoke' && day(c.from) === TOWN_EID_DAY).length;
  const eid = g.eidMorning?.run.ppl.halil ?? g.halil;
  const habit = eid.habits.find((h) => h.action === 'smoke' && h.cue.after === 'eat')?.strength ?? 0;
  const walks = done.filter((c) => c.action === 'walk' && day(c.from) < TOWN_EID_DAY).length;
  const shifts = done.filter((c) => c.affordanceId === 'work-extra' && day(c.from) < TOWN_EID_DAY).length;
  const pays = g.payments.map((p) => `${p.amount}@R${day(p.at)}`).join(' ');
  const kept = g.payments.some((p) => p.at <= 15 * MIN_DAY + 20 * 60);
  const prayers = done.filter((c) => c.action === 'pray' && day(c.from) < TOWN_EID_DAY).length;
  const owed = (eid.agenda.owed ?? []).filter((o) => o.normId === 'salah');
  const madeUp = done.filter((c) => c.affordanceId === 'pray-qada').length;
  const eidPrayer = done.some((c) => c.action === 'pray-eid');
  const missed = eid.memory.episodes.filter((e) => e.kind === 'missed' && e.action === 'pray').length;
  const breaches = eid.conscience.breaches.filter((b) => b.normId === 'salah').length;
  return {
    smokeDays: smokeDays.size,
    eidSmokes,
    habit: habit.toFixed(2),
    walks,
    shifts,
    rent: `${kept ? 'kept' : 'missed'} ${pays}`,
    trust: (voiceOf(eid, 'you')?.trust ?? 0).toFixed(2),
    prayers,
    missedPrayers: missed,
    salahBreaches: breaches,
    salahOwed: owed.length,
    madeUp,
    eidPrayer: eidPrayer ? 'yes' : 'no',
  };
}

test.skipIf(!env.VOICE_MEASURE)(
  'Game 2 balance table (probe)',
  () => {
    const rows = Object.entries(STYLES).map(([name, o]) => ({ name, ...measure(o) }));
    console.log(JSON.stringify(rows, null, 1));
  },
  600_000,
);
