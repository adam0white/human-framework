import { describe, expect, test } from 'vitest';
import { deriveScene, sceneChoices } from '../ui/scenes.ts';
import { VoiceGame } from './game.ts';
import { profile } from './hf4-run.ts';

test('mounted Voice opens with five public people and advances actual town outcomes', () => {
  const started = performance.now();
  const g = new VoiceGame(7, 4);
  expect(g.run.c.runtime).toBeDefined();
  expect(g.run.c.people).toHaveLength(5);
  console.log(
    'opening-ms',
    performance.now() - started,
    'opening',
    g.run.c.runtime!.events.length,

    g.run.c.runtime!.active.size,
    g.t,
  );
  g.begin();
  g.autoPause = false;
  const startStep = performance.now();
  g.advanceTo(g.t + 120);
  console.log('step-ms', performance.now() - startStep, profile, 'activity', g.halil.activity?.action);
  expect(g.run.c.runtime!.at).toBeGreaterThan(0);
  expect(g.frame().halil).toBeDefined();
});

import { writeFileSync } from 'node:fs';
import {
  decodeSnapshot,
  MAX_PLAYTEST_BYTES,
  MAX_SNAPSHOT_BYTES,
  makePlaytestFile,
  stableStringify,
} from '../../shared/playtest.ts';
import { play } from './headless.ts';
import { parseVoicePlaytest, RecordedGame, replayVoice, voiceHash, voiceState } from './record.ts';

type WholeProof = {
  text: string;
  engine: string;
  hash: string;
  fullHash: string;
  town: string;
  nextState: string;
  nextFullHash: string;
  nextTown: string;
};

// Both phases are required. Only serialized evidence survives capture; no warm Run is retained for replay.
describe('whole mounted HF4 file proof', { concurrent: false, shuffle: false }, () => {
  let captured: WholeProof | undefined;
  test('capture: plays a real choice through the complete month, report and serialized file', async () => {
    const started = performance.now();
    for (const key of Object.keys(profile) as (keyof typeof profile)[]) profile[key] = 0;
    const rec = new RecordedGame(new VoiceGame(7, 4));
    console.log('whole-engine', rec.game.run.c.runtime!.save().archive.engine);
    let spoken = false,
      day = 0;
    const sceneIds = new Set<string>();
    let checkedSceneRead = false,
      checkedSkipDigest = false;
    while (rec.game.phase !== 'report') {
      let turns = 0;
      play(rec, {
        choose(frame) {
          if (!spoken && frame.options.length && frame.composer.open) {
            spoken = true;
            return { optionId: frame.options[0]!.id, strength: 'mention', insist: false };
          }
          return undefined;
        },
        onPause(frame, g) {
          const scene = deriveScene(frame);
          if (scene?.current) {
            const speakers = new Set(
              scene.lines.map((line) => line.speaker).filter((speaker) => speaker !== 'Scene'),
            );
            if (speakers.size >= 2) sceneIds.add(scene.id);
          }
          if (!checkedSceneRead && scene) {
            const before = voiceHash(g);
            const detached = structuredClone(frame);
            Object.freeze(detached);
            sceneChoices(deriveScene(detached), detached.options);
            expect(voiceHash(g)).toBe(before);
            checkedSceneRead = true;
          }
        },
        stop(g) {
          if (g.day !== day) {
            day = g.day;
            if (day === 15) {
              expect(g.intro?.label).toBe('12 days passed');
              const digest = g.log.filter((row) => row.text.startsWith('Skipped days ('));
              expect(digest.length).toBeGreaterThan(0);
              expect(
                digest.every((row) => row.day === 15 && row.text.includes('Ramadan 3 to Ramadan 14')),
              ).toBe(true);
              expect(digest.map((row) => row.text.replace(/^Skipped days \([^)]*\): /, ''))).toEqual(
                g.intro?.lines.slice(0, digest.length),
              );
              checkedSkipDigest = true;
            }

            console.log(
              'whole-progress',
              day,
              g.t,
              performance.now() - started,
              g.run.c.runtime?.events.length,
              profile,
            );
          }
          return turns++ > 0;
        },
      });
      if (performance.now() - started > 600000)
        throw new Error('Voice whole control exceeded its existing ten-minute budget.');
      await new Promise((done) => setTimeout(done, 0));
    }
    // One actual month owns live scene coverage; no per-seed encounter-frequency promise.
    expect(sceneIds.size).toBeGreaterThan(0);
    expect(checkedSceneRead).toBe(true);
    expect(checkedSkipDigest).toBe(true);
    expect(spoken).toBe(true);
    expect(rec.log.some((e) => !Array.isArray(e) && e.type === 'suggest')).toBe(true);
    expect(rec.game.run.c.runtime!.events.some((e) => e.data.kind === 'suggestion-resolved')).toBe(true);
    expect(rec.game.report).toBeDefined();
    const hash = voiceHash(rec.game),
      state = voiceState(rec.game);
    const snapshotBytes = new TextEncoder().encode(JSON.stringify(state)).byteLength;
    expect(snapshotBytes).toBeLessThan(MAX_SNAPSHOT_BYTES);
    const file = {
      ...(await makePlaytestFile({
        game: 'voice',
        seed: 7,
        scenario: 'voice-4',
        minute: rec.game.t,
        log: rec.log,
        hash,
        engine: rec.game.run.c.runtime!.save().archive.engine.package,
        snapshot: state,
      })),
      voiceEdition: 'voice-hf4/1',
    };
    const text = JSON.stringify(file),
      fileBytes = new TextEncoder().encode(text).byteLength;
    expect(fileBytes).toBeLessThan(MAX_PLAYTEST_BYTES);
    expect(stableStringify(await decodeSnapshot(JSON.parse(text))) === stableStringify(state)).toBe(true);
    console.log('whole-recorded', performance.now() - started, hash, rec.log.length, {
      snapshotBytes,
      fileBytes,
    });
    const native = rec.game.run.c.runtime!.save().archive;
    const fullHash = native.hashes.full,
      town = stableStringify(rec.game.run.town.state);
    const at = rec.game.run.c.runtime!.at;
    rec.apply({ type: 'keepListening' });
    if (rec.game.intro) rec.apply({ type: 'dismissIntro' });
    rec.apply({ type: 'setAutoPause', on: false });
    rec.apply({ type: 'resume' });
    rec.step(30);
    expect(rec.game.run.c.runtime!.at).toBeGreaterThan(at);
    const nextState = stableStringify(voiceState(rec.game));
    const nextFullHash = rec.game.run.c.runtime!.save().archive.hashes.full;
    const nextTown = stableStringify(rec.game.run.town.state);
    expect(performance.now() - started).toBeLessThan(600000);
    captured = {
      text,
      engine: stableStringify(native.engine),
      hash,
      fullHash,
      town,
      nextState,
      nextFullHash,
      nextTown,
    };
    console.log('whole-capture-verified', performance.now() - started, profile, hash, fullHash);
  }, 600000);

  test('replay: loads that exact file, replays every input and matches Keep Listening continuation', () => {
    const started = performance.now();
    if (!captured) throw new Error('Required whole-month capture is absent; replay cannot qualify.');
    for (const key of Object.keys(profile) as (keyof typeof profile)[]) profile[key] = 0;
    const proof = captured;
    const parsed = parseVoicePlaytest(proof.text);
    const replayed = replayVoice(parsed.file.seed, parsed.file.log, parsed.rules);
    const g = replayed.rec.game;
    expect(replayed.driftAt).toBe(-1);
    expect(voiceHash(g)).toBe(proof.hash);
    const native = g.run.c.runtime!.save().archive;
    expect(stableStringify(native.engine)).toBe(proof.engine);
    expect(native.hashes.full).toBe(proof.fullHash);
    expect(stableStringify(g.run.town.state) === proof.town).toBe(true);
    const at = g.run.c.runtime!.at;
    replayed.rec.apply({ type: 'keepListening' });
    if (g.intro) replayed.rec.apply({ type: 'dismissIntro' });
    replayed.rec.apply({ type: 'setAutoPause', on: false });
    replayed.rec.apply({ type: 'resume' });
    replayed.rec.step(30);
    expect(g.run.c.runtime!.at).toBeGreaterThan(at);
    expect(g.run.c.runtime!.save().archive.hashes.full).toBe(proof.nextFullHash);
    expect(stableStringify(g.run.town.state) === proof.nextTown).toBe(true);
    expect(stableStringify(voiceState(g)) === proof.nextState).toBe(true);
    expect(performance.now() - started).toBeLessThan(600000);
    console.log(
      'whole-file-replay-continuation-verified',
      performance.now() - started,
      profile,
      proof.hash,
      proof.nextFullHash,
    );
    if (process.env.VOICE_CONTROL_EXPORT) writeFileSync(process.env.VOICE_CONTROL_EXPORT, proof.text);
    captured = undefined;
  }, 600000);
});

import { voiceSpec } from './hf4-spec.ts';
import { createCommunity, mount, stepCommunity } from './hf4-town-run.ts';
import { createTown, TOWN_IDS, type Town, townCalendar, townPeople } from './town.ts';

test('F475: actual Selin call receipts distinguish connection from a phone unheard at the tea house', () => {
  for (const missed of [false, true]) {
    const start = 1440 + 20 * 60;
    const ppl = townPeople({ now: start });
    const people = TOWN_IDS.map((id) => ppl[id]);
    function restrict(town: Town): Town {
      const offers = town.affordancesFor.bind(town),
        fork = town.fork.bind(town);
      town.affordancesFor = (p) =>
        offers(p).filter(
          (a) =>
            a.id ===
            (p.id === 'selin' ? 'call:halil' : p.id === 'halil' ? (missed ? 'tea:riza' : 'rest') : 'wait'),
        );
      town.fork = () => restrict(fork());
      return town;
    }
    const town = restrict(createTown(people, { seed: 7, now: start }));
    const c = createCommunity(people);
    mount(c, town, voiceSpec(7, start, townCalendar));
    const events = stepCommunity(c, town, start + 21);
    const call = events.find((e) => e.personId === 'selin' && e.kind === 'finish' && e.action === 'call');
    expect(call?.status).toBe(missed ? 'failed' : 'completed');
    expect(call?.detail.includes('no answer')).toBe(missed);
    expect(town.state.lastCall?.by).toBe(missed ? undefined : 'selin');
    expect(town.state.selinMissedAt !== undefined).toBe(missed);
    const settlement = c.runtime!.events.find(
      (e) =>
        e.person === 'selin' &&
        e.data.kind === 'action-settled' &&
        e.data.disposition === (missed ? 'failed' : 'completed'),
    );
    expect(settlement).toBeDefined();
    if (missed) expect(c.runtime!.events.some((e) => e.data.kind === 'communication-settled')).toBe(false);
  }
});

test('F475: a completed caller action does not invent a conversation with an asleep recipient', async () => {
  const { personAuthoring } = await import('./hf4-model.ts');
  const start = 1440 + 20 * 60;
  const ppl = townPeople({ now: start });
  const people = TOWN_IDS.map((id) => ppl[id]);
  const opening = people.map(personAuthoring);
  const halil = opening.find((p) => p.id === 'halil');
  if (!halil) throw new Error('Missing authored Halil');
  // New public opening premise, never a patch to a live person or a forced wake.
  halil.state.body.asleep = true;
  halil.state.body.sleepPressure = 0.95;
  halil.state.body.sleepDebtHours = 8;
  function restrict(town: Town): Town {
    const offers = town.affordancesFor.bind(town),
      fork = town.fork.bind(town);
    town.affordancesFor = (p) =>
      offers(p).filter(
        (a) => a.id === (p.id === 'selin' ? 'call:halil' : p.id === 'halil' ? 'sleep' : 'wait'),
      );
    town.fork = () => restrict(fork());
    return town;
  }
  const town = restrict(createTown(people, { seed: 7, now: start }));
  const c = createCommunity(people);
  mount(c, town, voiceSpec(7, start, townCalendar), opening);
  const events = stepCommunity(c, town, start + 21);
  expect(c.people.find((p) => p.id === 'halil')?.body.asleep).toBe(true);
  const call = events.find((e) => e.personId === 'selin' && e.kind === 'finish' && e.action === 'call');
  expect(call).toBeDefined();
  expect(call?.status).toBe('failed');
  expect(call?.detail).toContain('no answer');
  expect(town.state.lastCall).toBeUndefined();
  expect(town.state.selinMissedAt).toBeDefined();
});

test('a real unanswered outgoing attempt supplies no Selin scene or reply', async () => {
  const { personAuthoring } = await import('./hf4-model.ts');
  const { sampleFrame } = await import('./fixtures.ts');
  const { halilView, clock } = await import('./view.ts');
  const { conversationFor } = await import('../ui/conversations.ts');
  const { sceneResponse } = await import('../ui/scene-response.ts');
  const start = 1440 + 20 * 60,
    ppl = townPeople({ now: start }),
    people = TOWN_IDS.map((id) => ppl[id]);
  const opening = people.map(personAuthoring),
    selin = opening.find((p) => p.id === 'selin')!;
  selin.state.body.asleep = true;
  selin.state.body.sleepPressure = 0.95;
  selin.state.body.sleepDebtHours = 8;
  function restrict(t: Town): Town {
    const offers = t.affordancesFor.bind(t),
      fork = t.fork.bind(t);
    t.affordancesFor = (p) =>
      offers(p).filter(
        (a) => a.id === (p.id === 'halil' ? 'call:selin' : p.id === 'selin' ? 'sleep' : 'wait'),
      );
    t.fork = () => restrict(fork());
    return t;
  }
  const town = restrict(createTown(people, { seed: 7, now: start })),
    c = createCommunity(people);
  mount(c, town, voiceSpec(7, start, townCalendar), opening);
  const events = stepCommunity(c, town, start + 21);
  const begun = events.find((e) => e.personId === 'halil' && e.kind === 'begin' && e.action === 'call');
  expect(begun).toBeDefined();
  expect(
    events.some(
      (e) => e.personId === 'halil' && e.kind === 'finish' && e.action === 'call' && e.status === 'failed',
    ),
  ).toBe(true);
  expect(town.state.lastCall).toBeUndefined();
  const entry = {
    id: 'actual-dial',
    kind: 'act' as const,
    who: 'halil' as const,
    day: 1,
    minute: begun!.at,
    clock: clock(begun!.at),
    text: 'I call Selin.',
  };
  const frame = {
    ...structuredClone(sampleFrame),
    day: 1,
    minute: start + 21,
    clock: clock(start + 21),
    log: [entry],
    halil: halilView(c.people.find((p) => p.id === 'halil')!, town, start + 21),
  };
  expect(conversationFor(entry, frame.log)).toEqual([]);
  expect(deriveScene(frame)).toBeNull();
  expect(sceneResponse(frame, deriveScene(frame))).toBeNull();
  c.runtime!.verify();
}, 30_000);

test('a real completed outgoing call with native reception can supply its retained Selin exchange', async () => {
  const { conversationFor } = await import('../ui/conversations.ts');
  const { sampleFrame } = await import('./fixtures.ts');
  const { halilView, clock } = await import('./view.ts');
  const start = 1440 + 20 * 60,
    ppl = townPeople({ now: start }),
    people = TOWN_IDS.map((id) => ppl[id]);
  function restrict(t: Town): Town {
    const offers = t.affordancesFor.bind(t),
      fork = t.fork.bind(t);
    t.affordancesFor = (p) =>
      offers(p).filter(
        (a) => a.id === (p.id === 'halil' ? 'call:selin' : p.id === 'selin' ? 'rest' : 'wait'),
      );
    t.fork = () => restrict(fork());
    return t;
  }
  const town = restrict(createTown(people, { seed: 7, now: start })),
    c = createCommunity(people);
  mount(c, town, voiceSpec(7, start, townCalendar));
  const events = stepCommunity(c, town, start + 21),
    begun = events.find((e) => e.personId === 'halil' && e.kind === 'begin' && e.action === 'call'),
    finished = events.find(
      (e) => e.personId === 'halil' && e.kind === 'finish' && e.action === 'call' && e.status === 'completed',
    );
  expect(begun).toBeDefined();
  expect(finished).toBeDefined();
  expect(
    c.runtime!.events.some(
      (e) =>
        e.data.kind === 'communication-settled' &&
        e.data.received.some((r) => r.recipient === 'selin' && r.attention > 0),
    ),
  ).toBe(true);
  const entry = {
    id: 'connected-native-call',
    kind: 'act' as const,
    who: 'halil' as const,
    day: 1,
    minute: begun!.at,
    clock: clock(begun!.at),
    text: 'I call Selin.',
    connection: { minute: finished!.at, clock: clock(finished!.at) },
  };
  const frame = {
    ...structuredClone(sampleFrame),
    day: 1,
    minute: start + 21,
    clock: clock(start + 21),
    log: [entry],
    halil: halilView(c.people.find((p) => p.id === 'halil')!, town, start + 21),
  };
  const before = c.runtime!.save();
  expect(conversationFor(entry, frame.log).some((line) => line.speaker === 'Selin')).toBe(true);
  expect(deriveScene(frame)?.clock).toBe(clock(finished!.at));
  expect(c.runtime!.save()).toEqual(before);
  c.runtime!.verify();
}, 30_000);
