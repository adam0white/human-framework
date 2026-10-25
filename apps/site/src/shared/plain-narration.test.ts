import { createPerson, restore, snapshot } from '@adam0white/human-framework';
import { expect, it } from 'vitest';
import { villagerPersonSpec } from '../colony/sim/human-cast.ts';
import { VILLAGERS } from '../colony/sim/world-types.ts';
import { townPeople } from '../voice/sim/town.ts';
import { FOUNDER_KIN, WATCHERS } from '../watch/sim/config.ts';
import { bear, newcomer } from '../watch/sim/life.ts';
import { castPerson, createKeeper, kinPerson } from '../watch/sim/people.ts';
import { WatchRun } from '../watch/sim/run.ts';
import { requireValue } from './require-value.ts';

it('persists plain narration in all fresh site actors, including later Watch arrivals', () => {
  const run = new WatchRun(7);
  const people = [
    ...Object.values(townPeople()),
    ...VILLAGERS.map((v) => createPerson(villagerPersonSpec(7, v))),
    ...WATCHERS.map((w) => castPerson(7, w, 1020)),
    ...FOUNDER_KIN.map((k, i) => kinPerson(7, k, i, 1020)),
    createKeeper(7, 1020),
    bear(
      run.state,
      requireValue(run.state.community.people[0]),
      requireValue(run.state.community.people[1]),
      run.state.minute,
    ),
    newcomer(run.state, 'female', 20, run.state.minute),
  ];
  for (const person of people) {
    expect(person.lexicon?.plainEnglish, person.id).toBe(true);
    expect(restore(snapshot(person)).lexicon).toEqual(person.lexicon);
  }
});

it('keeps a loaded Watch actor’s saved narration choice', () => {
  const run = new WatchRun(7);
  for (const p of run.state.community.people) p.lexicon = { ...p.lexicon, plainEnglish: false };
  const saved = run.snapshot();
  expect(WatchRun.resume(saved).state).toEqual(saved.state);
});

it('pins the adopted runtime in exports and keeps duty counter identity across narration', async () => {
  const { FRAMEWORK_PACKAGE_VERSION } = await import('./playtest.ts');
  const { counterIdentity } = await import('../colony/sim/human-view.ts');
  const p = createPerson(villagerPersonSpec(7, requireValue(VILLAGERS[1])));
  const duty = requireValue(p.agenda.commitments.find((c) => c.label === 'Maghrib'));
  expect(FRAMEWORK_PACKAGE_VERSION).toBe('2.21.0');
  expect(new WatchRun(7).export().framework).toBe('2.21.0');
  expect(
    counterIdentity(p, {
      voiceId: 'player',
      verdict: 'deferred',
      reason: 'duty',
      says: 'I will pray first.',
      commitmentId: duty.id,
      counterOffer: { label: 'after I finish this duty (the sunset prayer)' },
    }),
  ).toBe('after I pray Maghrib');
});

it('preserves a pinned canonical actor’s explicit legacy narration during replay', async () => {
  const { createPersona, initialPersonaLife, preparePersonaLife } = await import('@adam0white/lab-client');
  const { prepareSiteInitial } = await import('./cast-chapter.ts');
  const { watcherSpec } = await import('../watch/sim/people.ts');
  const { endState, replay } = await import('../watch/sim/run.ts');
  const castId = 'hf.cast.tamar.watch';
  const parent = await createPersona({
    format: 'hf-persona/1',
    castId,
    castRevision: '1',
    branchId: 'narration-choice',
    parentRevision: null,
    source: { game: 'human', engine: '2.21.0', build: 'control', rules: 'cast-1' },
    transfer: { castPassport: 'authored-cast/1', life: initialPersonaLife(castId, 'narration-choice', 0) },
    limitations: [],
  });
  const chapter = { version: 'site-cast/1' as const, input: preparePersonaLife(parent, 0) };
  const opening = createPerson(watcherSpec(7, requireValue(WATCHERS.find((p) => p.id === 'tamar')), 1020));
  opening.lexicon = { ...opening.lexicon, plainEnglish: false };
  prepareSiteInitial('watch', opening, chapter);
  const run = new WatchRun(7, undefined, chapter);
  expect(run.state.community.people.find((p) => p.id === 'tamar')?.lexicon?.plainEnglish).toBe(false);
  run.input({ k: 'start' });
  run.input({ k: 'begin' });
  for (let i = 0; i < 30; i++) run.step();
  expect(run.state.community.people.find((p) => p.id === 'tamar')?.lexicon?.plainEnglish).toBe(false);
  expect(endState(replay(run.export()))).toEqual(run.export().end);
});

it('refuses older narration files before replay can replace the saved choice', async () => {
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
