/** Focused current host controls. HF3 director timings/verdict guarantees are retired;
 * hf4-control.test.ts keeps the actual full two-day game and native replay. */
import { describe, expect, it } from 'vitest';
import { requireValue } from '../../shared/require-value.ts';
import { ColonyGame, DEFAULT_SEED, NUDGES } from './game.ts';
import { createFrameworkHumanSide } from './human.ts';
import { colonyHash, replayColony } from './playtest.ts';
import { END_MINUTE } from './world-types.ts';

describe('Twice at the Well — current framework host', () => {
  it('replays orders, cancellation and dismissed suggestions from the seed', () => {
    const g = new ColonyGame(DEFAULT_SEED, createFrameworkHumanSide);
    const o = requireValue(g.issue({ personId: 'yusuf', placeId: 'site' }));
    g.advance(5);
    g.cancel(o.id);
    g.dismissNudge('dawn-site');
    g.issue({ personId: 'maryam', placeId: 'kitchen' });
    g.advance(35);
    const again = replayColony(g.seed, createFrameworkHumanSide, g.log, g.minute);
    expect(again.log).toEqual(g.log);
    expect(colonyHash(again)).toBe(colonyHash(g));
    expect(again.human.snapshot()).toEqual(g.human.snapshot());
  });

  it('a late tap keeps the cedar card’s roll and its actual receipt time', () => {
    const game = new ColonyGame(DEFAULT_SEED, createFrameworkHumanSide);
    const cedar = requireValue(NUDGES.find((n) => n.id === 'cedar'));
    game.advance(cedar.minute + 30);
    const o = game.issue(cedar.order);
    expect(o?.rollKey).toBe(cedar.minute);
    expect(o?.issuedAt).toBe(cedar.minute + 30);
  });

  it('inspection and prediction leave the native actor and both worlds unchanged', () => {
    const game = new ColonyGame(DEFAULT_SEED, createFrameworkHumanSide);
    game.advance(5);
    const before = colonyHash(game);
    game.human.view();
    game.why('idris');
    game.predict({ personId: 'idris', placeId: 'site' });
    expect(colonyHash(game)).toBe(before);
  });

  it('logs the single Day-3 continuation and changes the host goals at its boundary', () => {
    const game = new ColonyGame(DEFAULT_SEED, createFrameworkHumanSide);
    // This is the host transition premise, not a claim to have simulated two days.
    game.minute = END_MINUTE;
    expect(game.canContinue).toBe(true);
    expect(game.continueDay()).toBe(true);
    expect(game.continueDay()).toBe(false);
    expect(game.endMinute).toBe(4320);
    expect(game.log.filter((e) => e.kind === 'continue')).toEqual([{ minute: END_MINUTE, kind: 'continue' }]);
    expect(game.frame().goals.map((g) => g.id)).toEqual(['project', 'stock', 'lives']);
  });
});
