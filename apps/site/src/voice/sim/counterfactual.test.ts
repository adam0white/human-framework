/**
 * Stretch S1, the month you never spoke (sim/counterfactual.ts): deterministic for a seed however it is sliced or
 * paced, built from no input at all, one line when the player said nothing, and kept out of the played run's
 * report and hash.
 */
import { beforeAll, describe, expect, test } from 'vitest';
import { SILENT_CAPTION } from '../protocol.ts';
import {
  advanceSilentMonth,
  compareMonths,
  finishSilentMonth,
  type MonthFacts,
  monthFacts,
  NEVER_SPOKE,
  SILENT_INTRO,
  SILENT_ROWS,
  silentMonthView,
  startSilentMonth,
} from './counterfactual.ts';
import { SHIPPED_SEED, VoiceGame } from './game.ts';
import { play } from './headless.ts';
import { STYLES } from './players.ts';
import { RecordedGame, voiceHash } from './record.ts';

const SLOW = 180_000;

describe('the month you never spoke', () => {
  let whole: VoiceGame;
  let facts: MonthFacts;
  beforeAll(() => {
    whole = finishSilentMonth(startSilentMonth(SHIPPED_SEED));
    facts = monthFacts(whole);
  }, SLOW);

  test(
    'is the same for a seed whether run at once or in wall-time slices',
    () => {
      const sliced = startSilentMonth(SHIPPED_SEED);
      let slices = 0;
      while (!advanceSilentMonth(sliced, 5)) slices++;
      expect(slices).toBeGreaterThan(10);
      expect(voiceHash(sliced.game)).toBe(voiceHash(whole));
      expect(monthFacts(sliced.game)).toEqual(facts);
    },
    SLOW,
  );

  test('takes no input: nothing said, no whisper, no insisting, and its report says you never spoke', () => {
    expect(whole.phase).toBe('report');
    expect(whole.said).toEqual({});
    expect(whole.insisted).toBe(0);
    expect(whole.report?.spoke).toBe(false);
    expect(whole.cells.some((c) => c.promptedBy === 'you')).toBe(false);
  });

  test(
    'a never-speaking player on real-time ticks reaches the same facts, and the section is one line',
    () => {
      const g = new VoiceGame(SHIPPED_SEED);
      play(new RecordedGame(g), { tick: [16, 17, 250] });
      expect(g.phase).toBe('report');
      expect(monthFacts(g)).toEqual(facts);
      const v = silentMonthView(g, facts);
      expect(v).toEqual({ intro: NEVER_SPOKE, rows: [], same: '', smaller: '', caption: SILENT_CAPTION });
    },
    SLOW,
  );

  test(
    'beside a Guardian month: differences in words, at most six rows, the caption, and the played run untouched',
    () => {
      const opts = STYLES.Guardian;
      if (!opts) throw new Error('Guardian');
      const g = new VoiceGame(SHIPPED_SEED);
      play(g, opts);
      const hash = voiceHash(g);
      const report = JSON.stringify(g.report);
      const v = silentMonthView(g, facts);
      if (process.env.VOICE_MEASURE) console.log(JSON.stringify(v, null, 2));
      expect(v.intro).toBe(SILENT_INTRO);
      expect(v.rows.length).toBeGreaterThan(0);
      expect(v.rows.length).toBeLessThanOrEqual(SILENT_ROWS);
      expect(v.rows.map((r) => r.topic)).toContain('Osman');
      for (const r of v.rows) expect(r.spoke).not.toBe(r.silent);
      expect(v.caption).toBe('Small differences compound; not every difference is your doing.');
      // No score, no verdict, no worship: the section never ranks the months or measures faith.
      expect(JSON.stringify(v)).not.toMatch(/better|worse|good|bad|faith|pray|fast|accept|worth|score/i);
      // Computing it changes neither the played run's state nor its report (the section is attached by the worker).
      expect(voiceHash(g)).toBe(hash);
      expect(JSON.stringify(g.report)).toBe(report);
      expect(g.report?.silent).toBeUndefined();
    },
    SLOW,
  );

  test('folds differences beyond six rows into one line, smallest levers first', () => {
    const mine: MonthFacts = {
      dateKept: true,
      firstPayDay: 14,
      firstPay: 300,
      paidByEid: 600,
      hisCalls: 4,
      herCalls: 15,
      eidCall: 'his',
      clinic: 1,
      firstClinicDay: 3,
      shifts: 2,
      walks: 20,
      smokeDays: 8,
      owedAfter: 'Nothing owed to Osman.',
    };
    const silent: MonthFacts = {
      ...mine,
      dateKept: false,
      firstPayDay: 17,
      paidByEid: 300,
      hisCalls: 0,
      eidCall: 'hers',
      clinic: 0,
      shifts: 0,
      walks: 0,
      smokeDays: 22,
      owedAfter: '300 still owed to Osman.',
    };
    const v = compareMonths(mine, silent);
    expect(v.rows.map((r) => r.topic)).toEqual([
      'Osman',
      'Selin in Ramadan',
      'Selin on Eid',
      'The clinic',
      'Cigarettes',
      'Osman after Eid',
    ]);
    expect(v.smaller).toBe('Smaller differences: the afternoon shift and walks by the river.');
    expect(v.same).toBe('');
    expect(compareMonths(mine, mine).same).toMatch(/^Both months came out the same: Osman, /);
  });
});
