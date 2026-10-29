/** HF4 uses authored names and public readings; legacy per-actor narration switches are not imported. */
import { expect, it } from 'vitest';
import { ColonyGame } from '../colony/sim/game.ts';
import { createFrameworkHumanSide, type FrameworkHumanSide } from '../colony/sim/human.ts';
import { counterIdentity } from '../colony/sim/human-view.ts';
import { replay, ruleHash, WatchRun } from '../watch/sim/run.ts';
import { FRAMEWORK_PACKAGE_VERSION } from './playtest.ts';
import { requireValue } from './require-value.ts';

it('keeps named current readings through Watch cold restore and complete replay', () => {
  const run = new WatchRun(7);
  run.input({ k: 'start' });
  run.input({ k: 'begin' });
  run.step();
  const snapshot = run.snapshotText();
  const loaded = WatchRun.resume(JSON.parse(snapshot));
  expect(loaded.snapshotText()).toBe(snapshot);
  const full = JSON.parse(JSON.stringify(run.export()));
  expect(full.framework).toBe(FRAMEWORK_PACKAGE_VERSION);
  expect(ruleHash(replay(full))).toBe(full.end.ruleHash);
  expect(run.state.community.people.map((person) => person.id)).toContain('tamar');
});

it('pins the adopted runtime and keeps a named duty counter from the public Well reading', () => {
  const game = new ColonyGame(7, createFrameworkHumanSide);
  const person = (game.human as FrameworkHumanSide).person('samira');
  const duty = requireValue(person.agenda.commitments.find((commitment) => commitment.label === 'Maghrib'));
  expect(FRAMEWORK_PACKAGE_VERSION).toBe('4.14.0');
  expect(
    counterIdentity(person, {
      voiceId: 'player',
      verdict: 'deferred',
      reason: 'duty',
      says: 'I will pray first.',
      commitmentId: duty.id,
      counterOffer: { label: 'after I finish this duty (the sunset prayer)' },
    }),
  ).toBe('after I pray Maghrib');
});

it('refuses older narration files before they can replace the current run', async () => {
  const { makePlaytestFile } = await import('./playtest.ts');
  const { parseVoicePlaytest } = await import('../voice/sim/record.ts');
  const { parseColonyPlaytest } = await import('../colony/sim/playtest.ts');
  const { VOICE_SCENARIO_VERSION } = await import('../voice/protocol.ts');
  const { CURRENT_RULES, scenarioOf } = await import('../colony/sim/human-side.ts');
  for (const [game, scenario, parse] of [
    ['voice', VOICE_SCENARIO_VERSION, parseVoicePlaytest],
    ['colony', scenarioOf(CURRENT_RULES), parseColonyPlaytest],
  ] as const) {
    const file = await makePlaytestFile({
      game,
      scenario,
      seed: 7,
      minute: 0,
      log: [],
      hash: 'abc',
      engine: '2.21.0',
      snapshot: {},
      plainSnapshot: true,
    });
    expect(() => parse(JSON.stringify({ ...file, framework: '2.20.0' }))).toThrow(/Start a fresh game/);
  }
});
