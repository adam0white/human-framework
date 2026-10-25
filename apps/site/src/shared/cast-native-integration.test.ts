import { preparePersonaLife, validatePersona } from '@adam0white/lab-client';
import { describe, expect, it } from 'vitest';
import { VoiceGame } from '../voice/sim/game.ts';
import { play } from '../voice/sim/headless.ts';
import { RecordedGame, replayVoice, voiceState } from '../voice/sim/record.ts';
import { endState, replay, WatchRun } from '../watch/sim/run.ts';
import { makeCastChapter, personChapter } from './cast-chapter.ts';
import { goodhandsSelinPassport } from './cast-goodhands-selin.ts';
import selin from './fixtures/goodhands-selin-native.json';
import currentHacer from './fixtures/stairwell-hacer-hf221-native.json';
import hf3Hacer from './fixtures/stairwell-hacer-hf223-native.json';
import hacer from './fixtures/stairwell-hacer-native.json';
import meryem from './fixtures/valley-meryem-native.json';
import { requireValue } from './require-value.ts';

/** Generated checkpoints from real host exporters, captured through browser play or controlled
 * host inputs. No raw source snapshots/secrets here. Live journeys are separate controls. */
describe('actual native checkpoint adapters', () => {
  it('returns actual agency Selin with acquired RNG, office work and make-up debts, without agency encounters', async () => {
    const parent = await validatePersona(selin);
    const original = structuredClone(parent);
    const mapped = goodhandsSelinPassport(parent);
    const game = new VoiceGame(1, 4, makeCastChapter([preparePersonaLife(parent, 0)]));
    const initial = JSON.parse(
      requireValue(requireValue(personChapter(game.castChapter, parent.castId)).initial),
    );
    expect(initial.rng).toEqual(mapped.portable.person.rng);
    expect(initial.skills.office).toEqual({
      ...mapped.portable.person.skills.office,
      lastPracticed:
        requireValue(mapped.portable.person.skills.office).lastPracticed +
        initial.now -
        mapped.portable.person.source.now,
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
    requireValue(calendar.commitments.find((c) => c.kind === 'job')).actions = ['agency-placement'];
    expect(() => goodhandsSelinPassport(unknown)).toThrow(/Unsupported native/);
  });
  it('preserves the previously current2.23 Selin engine guard without admitting unknown engines', async () => {
    // Metadata guard regression only. This edited header is not a new host-export or journey receipt.
    const parent = await validatePersona(selin);
    const projection = parent.transfer.agencyPerson as typeof selin.transfer.agencyPerson;
    projection.person.source.engine = '2.23.0';
    expect(goodhandsSelinPassport(parent).portable.person.source.engine).toBe('2.23.0');
    projection.person.source.engine = '2.22.0';
    expect(() => goodhandsSelinPassport(parent)).toThrow(/Unsupported native|unsupported source/);
  });
  it('admits native Stairwell Hacer into Voice without granting a new trade', async () => {
    const parent = await validatePersona(hacer);
    const input = preparePersonaLife(parent, 0);
    const game = new VoiceGame(1, 4, makeCastChapter([input]));
    const initial = JSON.parse(
      requireValue(requireValue(personChapter(game.castChapter, parent.castId)).initial),
    );
    expect(initial.rng).toEqual((parent.transfer.person as { person: { rng: unknown } }).person.rng);
    expect(Object.keys(initial.skills)).not.toContain('trade');
  });
  it.each([
    { rules: '8', engine: '2.21.0', envelope: currentHacer.envelope },
    { rules: '9', engine: '2.23.0', envelope: hf3Hacer },
  ])(
    'admits actual Stairwell edition$rules and exactly replays its Voice continuation',
    async ({ rules, engine, envelope }) => {
      const parent = await validatePersona(envelope);
      expect(parent.source).toMatchObject({ rules, engine });
      const game = new VoiceGame(1, 4, makeCastChapter([preparePersonaLife(parent, 0)]));
      const initial = JSON.parse(
        requireValue(requireValue(personChapter(game.castChapter, parent.castId)).initial),
      );
      const portable = envelope.transfer.person.person;
      expect(initial.rng).toEqual(portable.rng);
      expect(initial.traits).toEqual(portable.traits);
      expect(initial.values).toEqual(portable.values);
      expect(initial.now - initial.life.bornAt).toBe(portable.source.now - portable.life.bornAt);
      expect(initial.lexicon.plainEnglish).toBe(true);
      expect(Object.keys(initial.skills)).not.toContain('trade');
      const start = game.t;
      const rec = new RecordedGame(game);
      play(rec, { stop: (g) => g.t >= start + 60 });
      expect(game.t).toBeGreaterThan(start);
      const result = replayVoice(1, rec.log, 4, undefined, 0, game.castChapter);
      expect(result.driftAt).toBe(-1);
      expect(voiceState(result.rec.game)).toEqual(voiceState(game));
    },
  );
  it('preflights native Valley Meryem before deferred Watch arrival, preserving acquired fitness and current replay', async () => {
    const parent = await validatePersona(meryem);
    const input = preparePersonaLife(parent, 0);
    const run = new WatchRun(1, undefined, makeCastChapter([input]));
    const initial = JSON.parse(
      requireValue(requireValue(personChapter(run.state.castChapter, parent.castId)).initial),
    );
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
