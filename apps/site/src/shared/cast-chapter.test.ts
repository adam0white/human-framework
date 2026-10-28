import { createPerson, ENGINE_VERSION, type Person } from '@adam0white/human-framework';
import { createPersona, initialPersonaLife, preparePersonaLife } from '@adam0white/lab-client';
import { describe, expect, it } from 'vitest';
import { ColonyGame } from '../colony/sim/game.ts';
import { createFrameworkHumanSide } from '../colony/sim/human.ts';
import { WATCHERS } from '../watch/sim/config.ts';
import { watcherSpec } from '../watch/sim/people.ts';
import { endState, replay, WatchRun } from '../watch/sim/run.ts';
import { talk } from '../watch/sim/talk.ts';
import { type CastChapter, makeCastChapter, personChapter, prepareSiteInitial } from './cast-chapter.ts';
import { WATCH_DISCOVERIES } from './cast-discoveries.ts';
import { requireValue } from './require-value.ts';

describe('site cast chapters', () => {
  it('carries an ordinary played Well Danyal through the real delayed Watch arrival and replay', async () => {
    const source = new ColonyGame(1, createFrameworkHumanSide);
    for (let m = 0; m < 400; m++) {
      if (m % 80 === 0) source.issue({ personId: 'danyal', placeId: 'well', insist: true, appeal: 'duty' });
      source.advance(1);
    }
    const capture = source.human.castCheckpoint?.('hf.cast.danyal.well');
    for (let m = 0; m < 200; m++) source.advance(1);
    const transfer = await capture;
    if (!transfer) throw new Error('missing source');
    const castId = 'hf.cast.danyal.well';
    const branchId = 'ordinary-water';
    const parent = await createPersona({
      format: 'hf-persona/1',
      castId,
      castRevision: '1',
      branchId,
      parentRevision: null,
      source: { game: 'well', engine: ENGINE_VERSION, rules: 'cast-1', build: 'control' },
      transfer: { ...transfer, life: initialPersonaLife(castId, branchId, 0) },
      limitations: [],
    });
    const chapter: CastChapter = { version: 'site-cast/1', input: preparePersonaLife(parent, 48 * 3600000) };
    const run = new WatchRun(1, undefined, chapter);
    run.input({ k: 'start' });
    run.input({ k: 'begin' });
    while (run.state.phase === 'night') run.step();
    expect(run.state.phase).toBe('dawn');
    run.input({ k: 'toDusk' });
    const person = requireValue(run.state.community.people.find((p) => p.id === 'danyal'));
    const portable = transfer.person as { person: { health: { fitness: number } } };
    expect(person.lexicon?.plainEnglish).toBe(true);
    expect(person.body.fitness).toBe(portable.person.health.fitness);
    expect(person.agenda.commitments.some((c) => c.normId === 'daily-prayer')).toBe(true);
    expect(person.conscience.norms.some((n) => n.normId === 'daily-prayer')).toBe(true);
    expect(person.agenda.goals.some((g) => g.id === 'between-games-assignment')).toBe(true);
    expect(endState(replay(run.export()))).toEqual(run.export().end);
    const def = requireValue(WATCHERS.find((p) => p.id === 'danyal'));
    const unhealthy = createPerson(watcherSpec(1, def, run.state.minute));
    unhealthy.body.health = 0.8;
    expect(() =>
      prepareSiteInitial('watch', unhealthy, { version: 'site-cast/1', input: chapter.input }),
    ).toThrow(/health compatibility/);
  });
  it('keeps declined Watch disclosures undiscovered until a later receptive talk', () => {
    const run = new WatchRun(1);
    run.state.phase = 'dawn';
    run.state.notes = [];
    const p = run.state.community.people.find((p) => p.id === 'kian');
    if (!p) throw new Error('missing Kian');
    p.affect.emotions = [
      { id: 'fear', intensity: 1, cause: 'test:general-fear', since: p.now, halfLife: 60 },
    ];
    expect(talk(run.state, 'kian', 'night')).toBe(true);
    expect(run.state.talks.said.at(-1)?.text).toContain('don’t want to talk');
    expect(run.state.talks.said.at(-1)?.text).not.toContain(WATCH_DISCOVERIES.kian);
    expect(run.state.talks.discovered).toBeUndefined();
    run.state.talks.said = [];
    p.affect.emotions = [];
    expect(talk(run.state, 'kian', 'home')).toBe(true);
    expect(run.state.talks.said.at(-1)?.text).toContain(WATCH_DISCOVERIES.kian);
  });

  it('installs a first-night input before arrivals and preserves its distinct work/place/notice state', async () => {
    const castId = 'hf.cast.tamar.watch';
    const parent = await createPersona({
      format: 'hf-persona/1',
      castId,
      castRevision: '1',
      branchId: 'first-night',
      parentRevision: null,
      source: { game: 'human', engine: '2.17.0', rules: 'cast-1', build: 'control' },
      transfer: { castPassport: 'authored-cast/1', life: initialPersonaLife(castId, 'first-night', 0) },
      limitations: ['Unit control: explicit fresh authored branch.'],
    });
    const chapter: CastChapter = { version: 'site-cast/1', input: preparePersonaLife(parent, 24 * 3600000) };
    const run = new WatchRun(2, undefined, chapter);
    const tamar = run.state.community.people.find((p) => p.id === 'tamar') as Person;
    expect(tamar.agenda.goals.some((g) => g.id === 'between-games-assignment')).toBe(true);
    expect(tamar.memory.episodes.some((e) => e.kind === 'cast-notice')).toBe(
      chapter.input.life.events.some((e) => e.kind === 'contact'),
    );
    expect(run.state.place.tamar).toBe(
      chapter.input.life.place === 'home'
        ? 'home'
        : chapter.input.life.place === 'public-garden'
          ? 'hall'
          : 'village',
    );
    expect(run.export().castChapter?.input).toEqual(chapter.input);
    expect(run.export().castChapter?.initial).toBeTypeOf('string');
    expect(endState(replay(run.export()))).toEqual(run.export().end);
  });
});

it('pins two independent initial actors and restores deferred arrival by the explicit clock map', async () => {
  const inputs = await Promise.all(
    ['hf.cast.tamar.watch', 'hf.cast.idris.well'].map(async (castId, i) => {
      const branchId = `group-${i}`;
      const parent = await createPersona({
        format: 'hf-persona/1',
        castId,
        castRevision: '1',
        branchId,
        parentRevision: null,
        source: { game: 'human', build: 'control', engine: '2.17.0', rules: 'cast-1' },
        transfer: { castPassport: 'authored-cast/1', life: initialPersonaLife(castId, branchId, 0) },
        limitations: ['Explicit fresh authored unit control.'],
      });
      return preparePersonaLife(parent, 24 * 3600000);
    }),
  );
  const chapter = makeCastChapter(inputs);
  const run = new WatchRun(1, undefined, chapter);
  expect(personChapter(run.state.castChapter, requireValue(inputs[0]).parent.castId)?.initial).toBeTypeOf(
    'string',
  );
  expect(personChapter(run.state.castChapter, requireValue(inputs[1]).parent.castId)?.initial).toBeTypeOf(
    'string',
  );
  run.input({ k: 'start' });
  run.input({ k: 'begin' });
  while (run.state.phase === 'night') run.step();
  run.input({ k: 'toDusk' });
  const idris = run.state.community.people.find((p) => p.id === 'idris');
  expect(idris).toBeDefined();
  const pinned = JSON.parse(
    requireValue(
      requireValue(personChapter(run.state.castChapter, requireValue(inputs[1]).parent.castId)).initial,
    ),
  );
  expect(idris?.body).toEqual(pinned.body);
  const offset = requireValue(idris).now - pinned.now;
  for (const [id, skill] of Object.entries(requireValue(idris).skills))
    expect(skill).toEqual({ ...pinned.skills[id], lastPracticed: pinned.skills[id].lastPracticed + offset });
  expect(requireValue(idris).life.bornAt - pinned.life.bornAt).toBe(requireValue(idris).now - pinned.now);
  expect(endState(replay(run.export()))).toEqual(run.export().end);
});

it('two ordinary played Voice people retain distinct acquired state together in a fresh replayable chapter', async () => {
  const { VoiceGame } = await import('../voice/sim/game.ts');
  const { RecordedGame, replayVoice, voiceHash } = await import('../voice/sim/record.ts');
  const { captureSiteCastBoundary } = await import('./cast-chapter.ts');
  const source = new RecordedGame(new VoiceGame(1, 4));
  const opening = JSON.parse(JSON.stringify(source.game.run.ppl)) as Record<string, Person>;
  const { play } = await import('../voice/sim/headless.ts');
  const start = source.game.t;
  const sourceDay = Math.floor(start / 1440) + 1;
  play(source, { stop: (g) => g.t >= sourceDay * 1440 + 12 * 60 });
  expect(source.game.t).toBeGreaterThan(start);
  expect(source.log.length).toBeGreaterThan(0);
  const ids = ['riza', 'osman'] as const;
  const originalOffers = source.game.run.town.affordancesFor;
  const captures = ids.map((id) =>
    captureSiteCastBoundary('voice', source.game.run.ppl[id], source.game.run.town),
  );
  play(source, { stop: (g) => g.t >= sourceDay * 1440 + 19 * 60 });
  const transfers = await Promise.all(captures);
  expect(source.game.run.town.affordancesFor).toBe(originalOffers);
  const inputs = await Promise.all(
    ids.map(async (id, i) => {
      const castId = `hf.cast.${id}.voice`;
      const branchId = `ordinary-${id}`;
      const parent = await createPersona({
        format: 'hf-persona/1',
        castId,
        castRevision: '1',
        branchId,
        parentRevision: null,
        source: { game: 'voice', build: 'control', engine: ENGINE_VERSION, rules: 'voice-4' },
        transfer: { ...transfers[i], life: initialPersonaLife(castId, branchId, 0) },
        limitations: [],
      });
      return preparePersonaLife(parent, 24 * 3600000);
    }),
  );
  const receiving = new RecordedGame(new VoiceGame(1, 4, makeCastChapter(inputs)));
  for (const [i, id] of ids.entries()) {
    const carried = (
      requireValue(transfers[i]).person as {
        person: { rng: Person['rng']; health: { fitness: number }; skills: Person['skills'] };
      }
    ).person;
    expect(receiving.game.run.ppl[id].rng).toEqual(carried.rng);
    const raw = requireValue(transfers[i]).sourceSnapshot as Person;
    expect(raw.memory.episodes.length).toBeGreaterThan(requireValue(opening[id]).memory.episodes.length);
    const pinned = JSON.parse(
      requireValue(requireValue(personChapter(receiving.game.castChapter, `hf.cast.${id}.voice`)).initial),
    ) as Person;
    expect(pinned.body.fitness).toBe(carried.health.fitness);
    expect(pinned.body.fitness).not.toBe(requireValue(opening[id]).body.fitness);

    if (id === 'osman') {
      expect(receiving.game.run.ppl[id].skills.trade).toEqual({
        ...carried.skills.trade,
        lastPracticed: requireValue(carried.skills.trade).lastPracticed + pinned.now - raw.now,
      });
      expect(carried.skills.trade).not.toEqual(requireValue(opening.osman).skills.trade);
    }
  }
  expect(receiving.game.run.ppl.riza.rng).not.toEqual(receiving.game.run.ppl.osman.rng);
  receiving.apply({ type: 'begin' });
  receiving.step(20);
  const replayed = replayVoice(
    receiving.game.seed,
    receiving.log,
    4,
    undefined,
    0,
    receiving.game.castChapter,
  );
  expect(voiceHash(replayed.rec.game)).toBe(voiceHash(receiving.game));
});
