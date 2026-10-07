/**
 * Stretch S1, the month you never spoke (sim/counterfactual.ts): deterministic for a seed however it is sliced,
 * built from no input at all, equal to the played month when the player said nothing, and kept out of the played
 * run's report and hash.
 */
import { beforeAll, describe, expect, test } from 'vitest';
import { SILENT_CAPTION } from '../protocol.ts';
import {
  advanceSilentMonth,
  finishSilentMonth,
  monthFacts,
  silentMonthView,
  startSilentMonth,
} from './counterfactual.ts';
import { SHIPPED_SEED, VoiceGame } from './game.ts';
import { play } from './headless.ts';
import { STYLES } from './players.ts';
import { voiceHash } from './record.ts';

const SLOW = 120_000;

describe('the month you never spoke', () => {
  let whole: VoiceGame;
  beforeAll(() => {
    whole = finishSilentMonth(startSilentMonth(SHIPPED_SEED));
  }, SLOW);

  test(
    'is the same for a seed whether run at once or in wall-time slices',
    () => {
      const sliced = startSilentMonth(SHIPPED_SEED);
      let slices = 0;
      while (!advanceSilentMonth(sliced, 5)) slices++;
      expect(slices).toBeGreaterThan(10);
      expect(voiceHash(sliced.game)).toBe(voiceHash(whole));
      expect(monthFacts(sliced.game)).toEqual(monthFacts(whole));
    },
    SLOW,
  );

  test('takes no input: nothing said, no whisper, no insisting, and the report says you never spoke', () => {
    expect(whole.phase).toBe('report');
    expect(whole.said).toEqual({});
    expect(whole.insisted).toBe(0);
    expect(whole.report?.spoke).toBe(false);
    expect(whole.cells.some((c) => c.promptedBy === 'you')).toBe(false);
  });

  test(
    'a player who said nothing sees the two months come out the same',
    () => {
      const g = new VoiceGame(SHIPPED_SEED);
      play(g);
      const v = silentMonthView(g, whole);
      expect(monthFacts(g)).toEqual(monthFacts(whole));
      expect(v.rows).toEqual([]);
      expect(v.same).toMatch(/^Both months came out the same: the fast, Osman, /);
      expect(v.caption).toBe('Small differences compound; not every difference is your doing.');
    },
    SLOW,
  );

  test(
    'beside a Guardian month: differences in words, the caption, and the played run untouched',
    () => {
      const opts = STYLES.Guardian;
      if (!opts) throw new Error('Guardian');
      const g = new VoiceGame(SHIPPED_SEED);
      play(g, opts);
      const hash = voiceHash(g);
      const report = JSON.stringify(g.report);
      const v = silentMonthView(g, whole);
      if (process.env.VOICE_MEASURE) console.log(JSON.stringify(v, null, 2));
      expect(v.rows.length).toBeGreaterThan(0);
      expect(v.rows.map((r) => r.topic)).toContain('Osman');
      for (const r of v.rows) expect(r.spoke).not.toBe(r.silent);
      expect(v.caption).toBe(SILENT_CAPTION);
      // No score, no verdict: the section never ranks the months or speaks of worth, faith or acceptance.
      expect(JSON.stringify(v)).not.toMatch(/better|worse|good|bad|faith|pray|accept|worth|score/i);
      // Computing it changes neither the played run's state nor its report (the section is attached by the worker).
      expect(voiceHash(g)).toBe(hash);
      expect(JSON.stringify(g.report)).toBe(report);
      expect(g.report?.silent).toBeUndefined();
    },
    SLOW,
  );
});
