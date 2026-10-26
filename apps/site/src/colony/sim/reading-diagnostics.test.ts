import { expect, it } from 'vitest';
import { needDescription } from '../ui/descriptions.ts';
import { ColonyGame, DEFAULT_SEED, NUDGES, SCENARIO_VERSION } from './game.ts';
import { createFrameworkHumanSide } from './human.ts';
import { Playback } from './playback.ts';
import { colonyState } from './playtest.ts';
import { STORM_START } from './world-types.ts';

it('keeps actual carried injury distinct from general health and person trust distinct from the same-frame mean', () => {
  const g = new ColonyGame(DEFAULT_SEED, createFrameworkHumanSide);
  for (let m = 0; m < 307; m++) {
    for (const n of NUDGES) if (n.minute === m) g.issue({ ...n.order, ...n.prefill }, n.id);
    g.advance(1);
  }
  const raw = JSON.stringify(colonyState(g)),
    frame = g.frame(),
    idris = frame.human.find((p) => p.id === 'idris')!;
  expect(idris.state).toBe('carried');
  expect(idris.carriedBy).toBe('yusuf');
  expect(idris.needs.find((n) => n.id === 'injury')).toMatchObject({
    label: 'Injury',
    value: 0.4,
    urgent: true,
  });
  expect(idris.needs.find((n) => n.id === 'health')?.value).toBe(1);
  expect(needDescription('health', 1)).not.toContain('unhurt');
  expect(frame.scoreboard.human.trust).toBe(
    frame.human.reduce((sum, p) => sum + p.trust.value, 0) / frame.human.length,
  );
  expect(idris.trust.value).not.toBe(frame.scoreboard.human.trust);
  expect(JSON.stringify(colonyState(g))).toBe(raw);
});
it('retains a suggestion across elapsed wait until its actual storm expiry and gives new suggestions a reading opportunity', () => {
  const pb = new Playback(createFrameworkHumanSide);
  pb.handle({ type: 'init', seed: DEFAULT_SEED, scenarioVersion: SCENARIO_VERSION, gen: 1, autoPause: true });
  pb.handle({ type: 'resume' });
  while (pb.game!.minute < STORM_START - 4) pb.step(Math.min(8, STORM_START - 4 - pb.game!.minute));
  const game = pb.game!;
  const n = game.visibleNudges().find((n) => n.id === 'storm-shutter')!;
  expect(n).toBeDefined();
  expect(pb.state().pause?.nudgeId).toBe(n.id);
  const log = JSON.stringify(game.log);
  for (let i = 0; i < 24; i++) {
    pb.handle({ type: 'tick', dtMs: 250 });
    if (game.minute < n.until) expect(game.visibleNudges().some((x) => x.id === n.id)).toBe(true);
    else expect(game.visibleNudges().some((x) => x.id === n.id)).toBe(false);
  }
  expect(game.minute).toBeGreaterThanOrEqual(STORM_START);
  expect(pb.state().pace).toBe('reading');
  expect(JSON.stringify(game.log)).toBe(log);
});
