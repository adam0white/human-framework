import { preparePersonaLife, validatePersona } from '@adam0white/lab-client';
import { describe, expect, it } from 'vitest';
import { VoiceGame } from '../voice/sim/game.ts';
import { endState, replay, WatchRun } from '../watch/sim/run.ts';
import { makeCastChapter, personChapter } from './cast-chapter.ts';
import { goodhandsSelinPassport } from './cast-goodhands-selin.ts';
import selin from './fixtures/goodhands-selin-native.json';
import hacer from './fixtures/stairwell-hacer-native.json';
import meryem from './fixtures/valley-meryem-native.json';

/** Retained public generated source checkpoints from actual prior UI play. No raw source
 * snapshots/secrets here. Fresh live journeys remain separate from these adapter controls. */
describe('actual native checkpoint adapters', () => {
  it('returns actual agency Selin with acquired RNG, office work and make-up debts, without agency encounters', async () => {
    const parent = await validatePersona(selin);
    const original = structuredClone(parent);
    const mapped = goodhandsSelinPassport(parent);
    const game = new VoiceGame(1, 4, makeCastChapter([preparePersonaLife(parent, 0)]));
    const initial = JSON.parse(personChapter(game.castChapter, parent.castId)!.initial!);
    expect(initial.rng).toEqual(mapped.portable.person.rng);
    expect(initial.skills.office).toEqual({
      ...mapped.portable.person.skills.office,
      lastPracticed:
        mapped.portable.person.skills.office!.lastPracticed + initial.now - mapped.portable.person.source.now,
    });
    expect(initial.agenda.owed).toHaveLength(2);
    expect(initial.agenda.commitments.find((c: { kind: string }) => c.kind === 'job')).toMatchObject({
      actions: ['work'],
      chain: 'job',
    });
    expect(initial.memory.episodes).toEqual([]);
    expect(parent).toEqual(original);
    const future = structuredClone(parent);
    (future.transfer.guestMetadata as { status: string }).status = 'available';
    expect(() => goodhandsSelinPassport(future)).toThrow(/Unsupported native/);
    const unknown = structuredClone(parent);
    const calendar = (unknown.transfer.agencyPerson as typeof selin.transfer.agencyPerson).calendar;
    calendar.commitments.find((c) => c.kind === 'job')!.actions = ['agency-placement'];
    expect(() => goodhandsSelinPassport(unknown)).toThrow(/Unsupported native/);
  });
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
