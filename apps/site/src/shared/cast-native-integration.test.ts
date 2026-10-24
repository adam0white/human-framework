import { preparePersonaLife, validatePersona } from '@adam0white/lab-client';
import { describe, expect, it } from 'vitest';
import { VoiceGame } from '../voice/sim/game.ts';
import { endState, replay, WatchRun } from '../watch/sim/run.ts';
import { makeCastChapter, personChapter } from './cast-chapter.ts';
import hacer from './fixtures/stairwell-hacer-native.json';
import meryem from './fixtures/valley-meryem-native.json';

/** Retained public generated source checkpoints from actual prior UI play. No raw source
 * snapshots/secrets here. Fresh live journeys remain separate from these adapter controls. */
describe('actual native checkpoint adapters', () => {
  it('admits native Stairwell Hacer into Voice without granting a new trade', async () => {
    const parent = await validatePersona(hacer);
    const input = preparePersonaLife(parent, 0);
    const game = new VoiceGame(1, 4, makeCastChapter([input]));
    const initial = JSON.parse(personChapter(game.castChapter, parent.castId)!.initial!);
    expect(initial.rng).toEqual((parent.transfer.person as { person: { rng: unknown } }).person.rng);
    expect(Object.keys(initial.skills)).not.toContain('trade');
  });
  it('preflights native Valley Meryem before deferred Watch arrival, preserving acquired fitness and current replay', async () => {
    const parent = await validatePersona(meryem);
    const input = preparePersonaLife(parent, 0);
    const run = new WatchRun(1, undefined, makeCastChapter([input]));
    const initial = JSON.parse(personChapter(run.state.castChapter, parent.castId)!.initial!);
    expect(initial.id).toBe('meryem');
    expect(initial.body.fitness).toBe(
      (parent.transfer.person as { person: { health: { fitness: number } } }).person.health.fitness,
    );
    expect(initial.rng).toEqual((parent.transfer.person as { person: { rng: unknown } }).person.rng);
    run.input({ k: 'start' });
    run.input({ k: 'begin' });
    while (run.state.phase === 'night') run.step();
    expect(endState(replay(run.export()))).toEqual(run.export().end);
  });
});
