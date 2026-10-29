/** Controls cross public boundaries; none edits a live person. */

import { canonicalCast, createPersona, preparePersonaLife } from '@adam0white/lab-client';
import { expect, test } from 'vitest';
import { makeCastChapter } from '../../shared/cast-chapter.ts';
import { VoiceGame } from './game.ts';
import { openingPerson } from './hf4-authoring.ts';
import { admitVoicePerson, voiceTerminal } from './hf4-portable.ts';
import { VoiceRun } from './hf4-run.ts';
import { voiceSpec } from './hf4-spec.ts';
import { cloneCommunity, createCommunity, mount, stepCommunity } from './hf4-town-run.ts';
import { createTown, TOWN_IDS, townCalendar, townPeople } from './town.ts';

function mounted(start: number, options: import('./town.ts').TownOptions = {}) {
  const people = townPeople({ now: start, ...options });
  const list = TOWN_IDS.map((id) => people[id]);
  const town = createTown(list, { seed: 7, now: start, ...options });
  const community = createCommunity(list);
  mount(community, town, voiceSpec(7, start, townCalendar));
  return { community, town };
}

test('coarse and fine town ingress preserve midnight opportunities and active cold continuation', () => {
  const start = 23 * 60;
  const coarse = mounted(start, { rentDueDay: 1 }),
    fine = mounted(start, { rentDueDay: 1 });
  const rentBefore = coarse.town.state.rentOwed;
  stepCommunity(coarse.community, coarse.town, start + 120);
  for (let at = start + 15; at <= start + 120; at += 15) stepCommunity(fine.community, fine.town, at);
  for (const id of TOWN_IDS) {
    const a = coarse.community.people.find((p) => p.id === id)!;
    const b = fine.community.people.find((p) => p.id === id)!;
    expect(a.agenda.commitments.map((c) => [c.id, c.from, c.until, c.status])).toEqual(
      b.agenda.commitments.map((c) => [c.id, c.from, c.until, c.status]),
    );
    expect(a.body.health).toBeCloseTo(b.body.health, 10);
    expect(a.body.sleepPressure).toBeCloseTo(b.body.sleepPressure, 10);
    const today = a.agenda.commitments.filter((c) => c.id.startsWith('salah:1:'));
    expect(today.map((c) => c.label)).toEqual(['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']);
    expect(today.at(-1)?.until).toBe(2 * 1440 + townCalendar(2).fajr);
  }
  expect(coarse.town.state.money).toEqual(fine.town.state.money);
  expect(coarse.town.state.rentOwed).toBe(rentBefore + 300);
  expect(coarse.town.state.days.halil).toEqual([0, 1]);
  const restored = cloneCommunity(coarse.community);
  restored.runtime = VoiceRun.restore(JSON.parse(JSON.stringify(coarse.community.runtime!.save())));
  const restoredTown = createTown(restored.people, {
    seed: 7,
    now: start + 120,
    state: JSON.parse(JSON.stringify(coarse.town.state)),
  });
  for (const pair of [
    { c: coarse.community, t: coarse.town },
    { c: restored, t: restoredTown },
  ])
    stepCommunity(pair.c, pair.t, start + 150);
  expect(restored.runtime!.save()).toEqual(coarse.community.runtime!.save());
  expect(restoredTown.state).toEqual(coarse.town.state);
});

test('actual public death becomes a terminal checkpoint before any portable write', () => {
  const start = 1320 * 60000;
  const person = openingPerson('hacer', 'Hacer');
  person.state.voices = [{ voiceId: 'you', trust: 0.5 }];
  const runtime = new VoiceRun(voiceSpec(7, 1320, townCalendar), [person]);
  expect(voiceTerminal(runtime, 'hacer')).toBe(false);
  runtime.receive(start + 1, [
    runtime.input('lifecycle.received', start + 1, {
      type: 'death',
      person: { kind: 'actor', id: 'hacer' },
      basis: { evidence: { kind: 'evidence', id: 'town:verified-death' }, worldRevision: 0 },
    }),
  ]);
  expect(voiceTerminal(runtime, 'hacer')).toBe(true);
  runtime.verify();
});

test('a real unsupported Hacer source is named before admission or a new claim', async () => {
  const castId = 'hf.cast.hacer.voice';
  const parent = await createPersona({
    format: 'hf-persona/1',
    castId,
    castRevision: canonicalCast(castId).revision,
    branchId: 'voice-hacer-source-control',
    parentRevision: null,
    source: { game: 'voice', build: 'source-control', engine: '3.2.0', rules: 'voice-3' },
    transfer: { castPassport: 'site-cast/1' },
    limitations: ['Source preserved; no HF4 mapping.'],
  });
  const source = JSON.stringify(parent);
  const input = preparePersonaLife(parent, 0);
  const chapter = makeCastChapter([input]);
  expect(() => admitVoicePerson(openingPerson('hacer', 'Hacer'), chapter)).toThrow(
    'hf.cast.hacer.voice: this older source has no supported HF4 portable history',
  );
  expect(() => new VoiceGame(7, 4, chapter)).toThrow('hf.cast.hacer.voice');
  expect(chapter.initial).toBeUndefined();
  expect(chapter.claim).toBeUndefined();
  expect(JSON.stringify(parent)).toBe(source);
});

import {
  decodeSnapshot,
  MAX_PLAYTEST_BYTES,
  MAX_SNAPSHOT_BYTES,
  makePlaytestFile,
  stableStringify,
} from '../../shared/playtest.ts';
import {
  parseVoicePlaytest,
  RecordedGame,
  replayVoice,
  voiceHash,
  voiceSnapshot,
  voiceState,
} from './record.ts';

test('a current JSON game file reconstructs native actor and town RNG, then continues with the same fullHash', async () => {
  const live = new RecordedGame(new VoiceGame(7, 4));
  live.apply({ type: 'begin' });
  live.apply({ type: 'dismissIntro' });
  live.apply({ type: 'setAutoPause', on: false });
  live.apply({ type: 'resume' });
  for (let i = 0; i < 48; i++) live.step(30);
  const state = voiceState(live.game);
  const collections = Object.entries(live.game).filter(
    (entry): entry is [string, Set<unknown> | Map<unknown, unknown>] =>
      entry[1] instanceof Set || entry[1] instanceof Map,
  );
  expect(collections.some(([, value]) => value instanceof Set && value.size > 0)).toBe(true);
  expect(collections.some(([, value]) => value instanceof Map && value.size > 0)).toBe(true);
  for (const [key, value] of collections)
    expect(state[key], key).toEqual(
      JSON.parse(stableStringify(value instanceof Map ? [...value.entries()] : [...value])),
    );
  expect(new TextEncoder().encode(JSON.stringify(state)).byteLength).toBeLessThan(MAX_SNAPSHOT_BYTES);
  const file = {
    ...(await makePlaytestFile({
      game: 'voice',
      seed: 7,
      scenario: 'voice-4',
      minute: live.game.t,
      log: live.log,
      hash: voiceHash(live.game),
      engine: live.game.run.c.runtime!.save().archive.engine.package,
      snapshot: state,
    })),
    voiceEdition: 'voice-hf4/1',
  };
  const text = JSON.stringify(file);
  expect(file.snapshotEncoding).toBe('gzip-base64');
  expect(new TextEncoder().encode(text).byteLength).toBeLessThan(MAX_PLAYTEST_BYTES);
  expect(stableStringify(await decodeSnapshot(JSON.parse(text)))).toBe(stableStringify(state));
  for (const snapshot of [state, voiceSnapshot(live.game)]) {
    const plain = await makePlaytestFile({
      game: 'voice',
      seed: 7,
      scenario: 'voice-4',
      minute: live.game.t,
      log: live.log,
      hash: voiceHash(live.game),
      engine: live.game.run.c.runtime!.save().archive.engine.package,
      snapshot,
      plainSnapshot: true,
    });
    expect(await decodeSnapshot(JSON.parse(JSON.stringify(plain)))).toEqual(snapshot);
  }
  const parsed = parseVoicePlaytest(text);
  const loaded = replayVoice(parsed.file.seed, parsed.file.log, parsed.rules);
  expect(loaded.driftAt).toBe(-1);
  expect(voiceHash(loaded.rec.game)).toBe(file.hash);
  expect(loaded.rec.game.run.c.runtime!.save().archive.hashes.full).toBe(
    live.game.run.c.runtime!.save().archive.hashes.full,
  );
  const before = live.game.run.c.runtime!.at;
  for (const rec of [live, loaded.rec]) {
    if (rec.game.phase === 'between') rec.apply({ type: 'advance', standing: [] });
    if (rec.game.intro) rec.apply({ type: 'dismissIntro' });
    rec.apply({ type: 'resume' });
    rec.step(30);
  }
  expect(live.game.run.c.runtime!.at).toBeGreaterThan(before);
  expect(loaded.rec.game.run.c.runtime!.save().archive.hashes.full).toBe(
    live.game.run.c.runtime!.save().archive.hashes.full,
  );
  expect(loaded.rec.game.run.town.state).toEqual(live.game.run.town.state);
});

import { personAuthoring } from './hf4-model.ts';

test('actual attended doctor and Hacer text retains its source; JSON cold restore retains that join', () => {
  const { community, town } = mounted(600);
  const summaries = [
    'the doctor told him to rest, walk and stop smoking',
    'Hacer told him Rıza was at the tea house',
  ];
  for (const [i, actorId] of ['doctor', 'hacer'].entries())
    town.queue('halil', {
      at: 600,
      channel: 'told',
      kind: 'news',
      actorId,
      targetId: 'halil',
      valence: 0.1,
      salience: 1,
      summary: summaries[i]!,
    });
  stepCommunity(community, town, 601);
  const halil = community.people.find((p) => p.id === 'halil')!;
  for (const [i, actorId] of ['doctor', 'hacer'].entries()) {
    const attended = community.runtime!.events.find(
      (e) =>
        e.person === 'halil' && e.data.kind === 'observation-attended' && e.data.summary === summaries[i],
    );
    expect(attended?.data.kind).toBe('observation-attended');
    if (attended?.data.kind !== 'observation-attended' || attended.data.attention <= 0)
      throw new Error('No actual attention receipt.');
    expect(halil.receivedTexts.find((e) => e.id === `heard:${attended.id}`)).toMatchObject({
      actorId,
      kind: 'told',
      summary: summaries[i],
    });
    const restored = VoiceRun.restore(JSON.parse(JSON.stringify(community.runtime!.save())));
    expect(restored.textSource(attended.data.perceptId, attended.data.evidenceId)?.actorId).toBe(actorId);
  }
});

test('actual emitted communication items with zero reception attention create no heard text', () => {
  const people = townPeople({ now: 1200 });
  const runtime = new VoiceRun(
    voiceSpec(7, 1200, townCalendar),
    ['hacer', 'halil'].map((id) => personAuthoring(people[id as 'hacer' | 'halil'])),
  );
  runtime.receive(1200 * 60000, [
    runtime.input('conversation.requested', 1200 * 60000, {
      speaker: 'hacer',
      listener: 'halil',
      topicIds: ['riza'],
      maxClaims: 3,
      temptations: [],
      loyalWarning: false,
    }),
  ]);
  expect(runtime.pending.some((r) => r.kind === 'communication' && r.items.length > 0)).toBe(true);
  runtime.advance(runtime.at, {
    stage() {
      return {
        action() {
          throw new Error('Unexpected action.');
        },
        communication(r) {
          return {
            requestId: r.id,
            requestHash: r.requestHash,
            worldRevision: r.worldRevision,
            speaker: r.speaker,
            emittedItemIds: r.items.map((i) => i.id),
            received: r.recipients.map((recipient) => ({
              recipient,
              evidenceId: 'unheard:halil',
              attention: 0,
              itemIds: r.items.map((i) => i.id),
            })),
          };
        },
        commit() {},
      };
    },
  });
  expect(
    runtime.events.some(
      (e) => e.data.kind === 'communication-settled' && e.data.received.every((r) => r.attention === 0),
    ),
  ).toBe(true);
  expect(
    runtime.events.some(
      (e) => e.person === 'halil' && e.data.kind === 'observation-attended' && e.data.episodeId,
    ),
  ).toBe(false);
  expect(runtime.textSource('unknown', 'unheard:halil')).toBeUndefined();
});

import { forecast } from './hf4-town-run.ts';

test('repeated actual public forecasts preserve the native fullHash, input counter, town RNG and next step', () => {
  const { community, town } = mounted(600);
  const cold = cloneCommunity(community);
  const coldTown = createTown(cold.people, {
    seed: 7,
    now: 600,
    state: JSON.parse(JSON.stringify(town.state)),
  });
  const halil = community.people.find((p) => p.id === 'halil')!;
  const offers = town.affordancesFor(halil);
  const before = community.runtime!.save();
  const world = JSON.stringify(town.state);
  const suggestion = { voiceId: 'you', affordanceId: offers[0]!.id, strength: 0.35 };
  const first = forecast(halil, offers, suggestion);
  expect(first).toBeDefined();
  expect(forecast(halil, offers, suggestion)).toEqual(first);
  expect(forecast(halil, offers, suggestion)).toEqual(first);
  expect(community.runtime!.save().archive.hashes.full).toBe(before.archive.hashes.full);
  expect(community.runtime!.save().nextInput).toBe(before.nextInput);
  expect(JSON.stringify(town.state)).toBe(world);
  stepCommunity(community, town, 615);
  stepCommunity(cold, coldTown, 615);
  expect(cold.runtime!.save().archive.hashes.full).toBe(community.runtime!.save().archive.hashes.full);
  expect(coldTown.state).toEqual(town.state);
});

import { heldNorms } from './hf4-model.ts';

test('an actual native missed prayer and native-created make-up settle through the linked qada opportunity', () => {
  const start = 1320 * 60000;
  const person = openingPerson('halil', 'Halil', 'male');
  person.state.voices = [{ voiceId: 'you', trust: 0.5 }];
  person.state.heldNorms = heldNorms({ practice: 0.8 });
  person.state.agenda.commitments = [
    {
      id: 'missed-prayer-control',
      kind: 'worship',
      actions: ['pray'],
      normId: 'salah',
      from: start,
      until: start + 60000,
      importance: 0.8,
      label: 'Fajr',
    },
  ];
  const runtime = new VoiceRun(voiceSpec(7, 1320, townCalendar), [person]);
  runtime.receive(start + 60001);
  const agenda = () => {
    const p = runtime.inspect({ perspective: { kind: 'host' }, people: ['halil'], select: ['agenda'] })
      .people[0];
    if (p?.kind !== 'host') throw new Error('Missing public person.');
    const part = p.parts.find((part) => part.select === 'agenda');
    if (part?.select !== 'agenda') throw new Error('Missing public agenda.');
    return part.value;
  };
  expect(agenda().owed.some((o) => o.ofId === 'missed-prayer-control')).toBe(true);
  runtime.receive(start + 60002, [
    runtime.input('agenda.requested', start + 60002, {
      person: 'halil',
      request: {
        type: 'make-up',
        commitmentId: 'missed-prayer-control',
        window: { start: start + 120000, end: start + 600000 },
      },
    }),
  ]);
  const qada = agenda().commitments.find((c) => c.makeUpOf === 'missed-prayer-control');
  if (!qada) throw new Error('HF did not schedule the make-up.');
  const offer = {
    id: 'pray-qada',
    actionId: 'pray-qada',
    label: 'make up a missed prayer',
    person: 'halil',
    durationMs: 60000,
    participants: [],
    alongside: [],
    demands: { effort: 0.1, focus: 0.3, mode: 'awake' as const, requires: {} },
    tags: ['worship'],
    norms: [],
    expected: { needs: { meaning: 0.05 }, followedBy: [], provenance: ['authored:voice'] },
    fulfills: [qada.id],
    advances: [],
    diminishes: [],
  };
  runtime.receive(start + 120000, runtime.offerInputs('halil', [offer], start + 120000));
  runtime.advance(start + 180000, {
    stage() {
      return {
        action(r, work) {
          return {
            requestId: r.id,
            requestHash: r.requestHash,
            person: r.person,
            activityId: r.activityId,
            stage: r.stage,
            worldRevision: r.worldRevision,
            disposition: r.stage === 'start' ? ('accepted' as const) : ('completed' as const),
            observations: [],
            ...(r.stage === 'start'
              ? {}
              : {
                  outcome: {
                    activityId: r.activityId,
                    offerId: r.offerId,
                    actionId: 'pray-qada',
                    start: work!.start,
                    end: r.boundaryAt,
                    status: 'completed' as const,
                    evidenceId: `completed:${r.id}`,
                    actual: { psychological: {}, exposures: [], observedProgress: [] },
                    fulfills: [qada.id],
                    advances: [],
                    summary: 'made up a missed prayer',
                  },
                }),
          };
        },
        communication() {
          throw new Error('Unexpected communication.');
        },
        commit() {},
      };
    },
  });
  expect(agenda().commitments.find((c) => c.id === qada.id)?.status).toBe('kept');
});

test('the public Fajr reading uses the actual sunrise boundary without the obsolete noon explanation', async () => {
  const { halilView, clock } = await import('./view.ts');
  const start = 1440 + townCalendar(1).fajr;
  const { community, town } = mounted(start);
  stepCommunity(community, town, start + 1);
  const halil = community.people.find((p) => p.id === 'halil');
  if (!halil) throw new Error('Missing Halil');
  const prayer = halil.agenda.commitments.find((c) => c.label === 'Fajr');
  expect(prayer?.until).toBe(1440 + townCalendar(1).sunrise);
  const before = community.runtime!.save();
  const reading = halilView(halil, town, start + 1);
  expect(reading.onMind.find((c) => c.id === prayer?.id)?.due).toContain(clock(prayer!.until));
  expect(JSON.stringify(reading)).not.toMatch(/noon prayer|game simplifies/);
  expect(community.runtime!.save()).toEqual(before);
});

test('outgoing call offers and their explanation share the actual evening and conversation limits', async () => {
  const { outgoingCallWindow, TOWN_EID_DAY } = await import('./town.ts');
  const before = 1440 + 17 * 60 + 59;
  const { community, town } = mounted(before);
  const halil = community.people.find((p) => p.id === 'halil')!;
  const opening = outgoingCallWindow(before, town.state);
  expect(opening.next).toBe(1440 + 18 * 60);
  expect(town.affordancesFor(halil).some((a) => a.id === 'call:selin')).toBe(false);
  stepCommunity(community, town, opening.next);
  expect(town.affordancesFor(halil).some((a) => a.id === 'call:selin')).toBe(true);
  expect(outgoingCallWindow(TOWN_EID_DAY * 1440 + 9 * 60, town.state).from).toBe(10 * 60);
  expect(outgoingCallWindow((TOWN_EID_DAY - 1) * 1440 + 23 * 60, {}).next).toBe(
    TOWN_EID_DAY * 1440 + 10 * 60,
  );
  // A retained actual conversation still constrains an otherwise open window.
  expect(outgoingCallWindow(1440 + 19 * 60, { lastCall: { at: 1440 + 10 * 60, by: 'selin' } }).next).toBe(
    1440 + 22 * 60,
  );
});

test('an actual completed Eid congregation is not offered again', () => {
  const day = 31;
  const start = day * 1440 + townCalendar(day).sunrise + 20;
  const { community, town } = mounted(start);
  function restrict(t: import('./town.ts').Town): import('./town.ts').Town {
    const offers = t.affordancesFor.bind(t),
      fork = t.fork.bind(t);
    t.affordancesFor = (p) => offers(p).filter((a) => a.id === (p.id === 'halil' ? 'pray-eid' : 'wait'));
    t.fork = () => restrict(fork());
    return t;
  }
  restrict(town);
  const events = stepCommunity(community, town, start + 61);
  const completed = events.find(
    (e) => e.personId === 'halil' && e.kind === 'finish' && e.action === 'pray-eid',
  );
  expect(completed?.status).toBe('completed');
  const halil = community.people.find((p) => p.id === 'halil')!;
  expect(town.state.completed.halil?.['pray-eid']).toBe(1);
  expect(town.affordancesFor(halil).some((a) => a.id === 'pray-eid')).toBe(false);
});

test('an actual interrupted Eid visit does not spend the congregation', async () => {
  const { interruptPerson } = await import('./hf4-town-run.ts');
  const start = 31 * 1440 + townCalendar(31).sunrise + 20;
  const { community, town } = mounted(start);
  const ordinary = town.affordancesFor.bind(town);
  let interrupted = false;
  function restrict(t: import('./town.ts').Town): import('./town.ts').Town {
    const offers = t.affordancesFor.bind(t),
      fork = t.fork.bind(t);
    t.affordancesFor = (p) =>
      offers(p).filter((a) => a.id === (p.id === 'halil' && !interrupted ? 'pray-eid' : 'wait'));
    t.fork = () => restrict(fork());
    return t;
  }
  restrict(town);
  stepCommunity(community, town, start + 10);
  const halil = community.people.find((p) => p.id === 'halil')!;
  expect(halil.activity?.action).toBe('pray-eid');
  interrupted = true;
  interruptPerson(community, halil, start + 10, 'actual host interruption control');
  const events = stepCommunity(community, town, start + 11);
  expect(
    events.some(
      (e) =>
        e.personId === 'halil' &&
        e.kind === 'finish' &&
        e.action === 'pray-eid' &&
        e.status === 'interrupted',
    ),
  ).toBe(true);
  expect(town.state.completed.halil?.['pray-eid'] ?? 0).toBe(0);
  expect(ordinary(halil).some((a) => a.id === 'pray-eid')).toBe(true);
});

test('ordinary dawn prayer choices stay in Why without a repeated prayer-versus-prayer drama line', () => {
  const game = new VoiceGame(7, 4);
  game.begin();
  game.autoPause = false;
  game.advanceTo(1440 + townCalendar(1).sunrise);
  const prayers = game.halil.trace.filter((r) => r.considered.some((o) => o.action === 'pray'));
  expect(prayers.length).toBeGreaterThan(0);
  expect(
    game.log
      .filter((row) => row.beat === 'close-call')
      .some((row) => /pray at home/.test(row.text) && /pray at the mosque/.test(row.text)),
  ).toBe(false);
});
