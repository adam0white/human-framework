/**
 * The 2026-10-19 level-up (voice.md, "2026-10-19 level-up"): rules 2 against rules 1 on the shipped seed, and old
 * voice-1 files still loading under their own rules.
 */
import { ENGINE_VERSION } from '@adam0white/human-framework';
import { describe, expect, test } from 'vitest';
import { makePlaytestFile } from '../../shared/playtest.ts';
import { scenarioIn, scenarioOf, type VoiceRules } from '../protocol.ts';
import { SHIPPED_SEED, VoiceGame } from './game.ts';
import { play } from './headless.ts';
import { parseVoicePlaytest, RecordedGame, replayVoice, voiceHash, voiceSnapshot } from './record.ts';
import { TOWN_DEFAULTS, TOWN_EID_DAY } from './town.ts';

const DAY = 1440;

/** Wake beats with a leaning, and how many of those leanings were what he then did. */
function wakes(rules: VoiceRules): { shown: number; matched: number; workshopOffered: number } {
  const g = new VoiceGame(SHIPPED_SEED, rules);
  // The leaning shown at the wake, and the last decision before it: his next decision is the one it foretold.
  let pending: { lean: string; after: number } | undefined;
  const out = { shown: 0, matched: 0, workshopOffered: 0 };
  play(g, {
    onPause: (f) => {
      if (f.pauseBeat?.kind !== 'wake' || !f.leaning) return;
      out.shown++;
      pending = { lean: f.leaning.optionId, after: g.halil.trace.at(-1)?.at ?? 0 };
      if (f.options.some((o) => o.id === 'work-repair')) out.workshopOffered++;
    },
    stop: (x) => {
      const next = pending && x.halil.trace.find((r) => r.at > (pending?.after ?? 0) && !r.review);
      if (pending && next) {
        if (next.chosenAffordanceId === pending.lean) out.matched++;
        pending = undefined;
      }
      return x.t >= 3 * DAY;
    },
  });
  return out;
}

describe('level-up 2026-10-19 (rules 2)', () => {
  test('the wake offers what he can do when he wakes, and its leaning is what he does', () => {
    const before = wakes(1);
    const after = wakes(2);
    // Rules 1: at 07:59 the workshop (open from 08:00) is missing and the leaning is last night's.
    expect(before.workshopOffered).toBe(0);
    expect(before.matched).toBeLessThan(before.shown);
    expect(after.workshopOffered).toBeGreaterThan(0);
    expect(after.matched).toBe(after.shown);
    expect(after.matched).toBeGreaterThan(before.matched);
  }, 60_000);

  test('a craving he has already turned down does not stop the clock with nothing to say', () => {
    const empty = (rules: VoiceRules) => {
      const g = new VoiceGame(SHIPPED_SEED, rules);
      const at: number[] = [];
      play(g, {
        confirm: true,
        onPause: (f) => {
          if (f.pauseBeat?.kind === 'craving' && !f.prefill && !f.muted) at.push(f.minute);
        },
        stop: (x) => x.t >= 3 * DAY,
      });
      return at;
    };
    expect(empty(1).length).toBeGreaterThan(0);
    expect(empty(2)).toEqual([]);
  }, 60_000);

  test('work he does under protest pays less: insisting is no longer a free way to make Osman’s date', () => {
    const insisted = (rules: VoiceRules) => {
      const g = new VoiceGame(SHIPPED_SEED, rules);
      // Osman's date: Ramadan 15, 20:00.
      play(g, {
        confirm: true,
        insist: true,
        stop: (x) => x.t >= TOWN_DEFAULTS.rentPromiseDay * DAY + 20 * 60,
      });
      return g.run.town.state.rentPaid;
    };
    // Rules 1: insisting on every prefill makes the 300 by Ramadan 15 (playtest audit). Rules 2: it falls short.
    expect(insisted(1)).toBeGreaterThanOrEqual(300);
    expect(insisted(2)).toBeLessThan(300);
  }, 120_000);

  test('the telegraph says what protest costs on work, under rules 2 only', () => {
    const texts = (rules: VoiceRules) => {
      const g = new VoiceGame(SHIPPED_SEED, rules);
      const seen: string[] = [];
      play(g, {
        onPause: (f, x) => {
          for (const o of f.options) {
            if (o.id !== 'work-repair' && o.id !== 'work-extra') continue;
            const t = x.predict({ optionId: o.id, strength: 'urge', insist: true });
            if (t.tone === 'protest') seen.push(t.text);
          }
        },
        stop: (x) => x.t >= 3 * DAY || x.phase === 'between',
      });
      return seen;
    };
    const after = texts(2);
    expect(after.length).toBeGreaterThan(0);
    expect(after.every((t) => t.includes('earn less'))).toBe(true);
    expect(texts(1).some((t) => t.includes('earn less'))).toBe(false);
  }, 60_000);

  test('the end of Ramadan says what is still owed to Osman on the day it passes', () => {
    const g = new VoiceGame(SHIPPED_SEED, 2);
    play(g, { stop: (x) => x.phase === 'between' && x.day === TOWN_EID_DAY - 1 });
    const owed = Math.round(g.run.town.state.rentOwed);
    // The quiet month on seed 7 ends Ramadan with the rest unpaid, so the line is exercised.
    expect(owed).toBeGreaterThan(0);
    const line = g.between?.lines.find((l) => l.includes('still owed Osman'));
    expect(line).toContain(`he still owed Osman ${owed}`);
  }, 60_000);
});

describe('old saves', () => {
  test('a voice-1 playtest file loads and replays under rules 1 to its recorded hash', async () => {
    const rec = new RecordedGame(new VoiceGame(SHIPPED_SEED, 1));
    play(rec, { confirm: true, tick: [250], stop: (g) => g.t >= DAY + 9 * 60 });
    const file = await makePlaytestFile({
      game: 'voice',
      seed: SHIPPED_SEED,
      scenario: scenarioOf(1),
      minute: rec.game.t,
      log: rec.log,
      hash: voiceHash(rec.game),
      engine: ENGINE_VERSION,
      snapshot: voiceSnapshot(rec.game),
    });
    const text = JSON.stringify(file);
    expect(scenarioIn(text)).toBe('voice-1');
    const { file: f, rules } = parseVoicePlaytest(text);
    expect(rules).toBe(1);
    const { rec: again, driftAt } = replayVoice(f.seed, f.log, rules);
    expect(driftAt).toBe(-1);
    expect(again.game.rules).toBe(1);
    expect(voiceHash(again.game)).toBe(f.hash);
  }, 60_000);

  test('a file of an unknown scenario is refused with the shared message', () => {
    const text = JSON.stringify({
      kind: 'human-playtest',
      format: 1,
      game: 'voice',
      scenario: 'voice-0',
      seed: 7,
    });
    expect(() => parseVoicePlaytest(text)).toThrow(/another version/);
  });

  test('a new game plays rules 2 and writes voice-2', () => {
    const g = new VoiceGame(SHIPPED_SEED);
    expect(g.rules).toBe(2);
    expect(scenarioOf(g.rules)).toBe('voice-2');
  });
});
