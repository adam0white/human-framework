import { createHash } from 'node:crypto';
import {
  admitCalendarPersona,
  begin,
  type CalendarPersonaProjection,
  createPerson,
  DEFAULT_NORMS,
  decide,
  heldNorms,
  MINUTES_PER_YEAR,
  projectCalendarPersona,
  remember,
  snapshot,
} from '@adam0white/human-framework';
import { canonicalPersona, createPersona } from '@adam0white/lab-client';
import { describe, expect, test } from 'vitest';
import { newRun, VoiceGame } from './game.ts';
import { play } from './headless.ts';
import {
  returnedSelin,
  SELIN_CAST,
  selinCheckpoint,
  selinEnquiryAnswer,
  selinReturnTown,
} from './persona.ts';
import { RecordedGame, replayVoice, voiceHash } from './record.ts';

function sourceFixture() {
  const now = 2 * 1440 + 19 * 60;
  const source = createPerson({
    id: 'selin',
    name: 'Selin',
    seed: 1002,
    now,
    bornAt: now - 32 * MINUTES_PER_YEAR,
    sex: 'female',
    norms: heldNorms({ practice: 0.4 }),
    skills: { office: 0.6 },
  });
  source.agenda.commitments = [
    {
      id: 'office',
      kind: 'job',
      actions: ['work'],
      from: 3 * 1440 + 540,
      until: 3 * 1440 + 1080,
      importance: 0.8,
      recurEvery: 1440,
      chain: 'job',
      status: 'pending',
    },
    {
      id: 'fast-before',
      kind: 'abstain',
      actions: [],
      violatedBy: ['eat', 'drink', 'tea'],
      from: 1440 + 299,
      until: 1440 + 1126,
      importance: 0.8,
      normId: 'sawm-ramadan',
      status: 'broken',
    },
    {
      id: 'fast-makeup',
      kind: 'abstain',
      actions: [],
      violatedBy: ['eat', 'drink', 'tea'],
      from: 32 * 1440 + 268,
      until: 32 * 1440 + 1157,
      importance: 0.8,
      normId: 'sawm-ramadan',
      makeUpOf: 'fast-before',
      status: 'pending',
    },
  ];
  source.agenda.owed = [
    {
      ofId: 'fast-before',
      kind: 'abstain',
      actions: [],
      violatedBy: ['eat', 'drink', 'tea'],
      normId: 'sawm-ramadan',
      reason: 'broken',
      at: 1440 + 700,
      scheduledAs: 'fast-makeup',
    },
  ];
  remember(source, {
    at: now - 60,
    kind: 'outcome',
    action: 'work',
    actorId: 'selin',
    placeId: 'city',
    valence: 0.2,
    summary: 'finished office work',
    tags: ['work'],
  });
  return source;
}

describe('Selin calendar continuity chapter', () => {
  test('waits for an after-work boundary and still refuses an active source action', () => {
    const g = new VoiceGame(7, 4);
    const before = voiceHash(g);
    expect(() => selinCheckpoint(g.run.ppl.selin)).toThrow(/after work/);
    expect(voiceHash(g)).toBe(before);
    const source = sourceFixture();
    const meal = {
      id: 'meal',
      action: 'eat',
      duration: 20,
      label: 'a meal',
      effort: 0,
      advertises: { food: 0.6 },
    };
    begin(source, meal, decide(source, [meal]));
    expect(source.activity).not.toBeNull();
    expect(() => selinCheckpoint(source)).toThrow(/running activity/);
  });

  test('carries her own attended episode, office and unpaid scheduled fast during Ramadan', () => {
    const source = sourceFixture(),
      before = snapshot(source);
    remember(source, {
      at: source.now - 1,
      kind: 'told',
      actorId: 'hacer',
      targetId: 'halil',
      valence: 0,
      salience: 1,
      summary: 'unverified health story',
      tags: [],
    });
    const withStory = snapshot(source);
    const transfer = selinCheckpoint(source, { ramadanFirstDay: 1, ramadanDays: 29 });
    expect(transfer.person.person.episodes.map((e) => e.summary)).toEqual(['finished office work']);
    expect(transfer.person.calendar.commitments.find((c) => c.kind === 'job')).toMatchObject({
      actions: ['voice-office-work'],
      from: 2 * 1440 + 540,
      chain: 'voice-office',
    });
    expect(transfer.person.calendar.owed[0]).toMatchObject({
      ofId: 'voice-selin:fast-before',
      scheduledAs: 'voice-selin:fast-makeup',
      reason: 'broken',
    });
    expect(transfer.person.calendar.commitments.find((c) => c.makeUpOf)).toMatchObject({
      makeUpOf: 'voice-selin:fast-before',
      status: 'pending',
      from: 31 * 1440 + 268,
    });
    expect(transfer.calendarHost).toEqual({
      version: 'voice-spring/1',
      originSourceNow: source.now,
      sourceDayOffset: 1,
      ramadanFirstDay: 1,
      ramadanDays: 29,
    });
    expect(transfer.targetOpening).toBe(1440 + 19 * 60);
    expect(transfer.person.person.skills).toEqual({});
    expect(source).toEqual(withStory);
    expect(source.rng).toEqual(before.rng);
  });

  test('the actual played source departs after work with ordinary owed fasts and replays exactly', () => {
    const rec = new RecordedGame(new VoiceGame(7, 4));
    play(rec, { stop: (g) => (g.run.ppl.selin.agenda.owed?.length ?? 0) > 0 || g.t > 4 * 1440 });
    rec.apply({ type: 'personaCheckpoint' });
    play(rec, { stop: (g) => !!g.personaDeparture?.transfer || g.t > 6 * 1440 });
    const departure = rec.game.personaDeparture;
    expect(departure?.transfer, departure?.error).toBeDefined();
    expect(departure?.sourceSnapshot?.activity).toBeNull();
    expect(departure?.sourceSnapshot?.now).toBe(rec.game.run.ppl.selin.now);
    expect(departure?.sourceSnapshot).toEqual(rec.game.run.ppl.selin);
    expect(rec.game.t).toBeLessThan(6 * 1440);
    const transfer = departure?.transfer;
    if (!transfer) throw Error('missing actual source checkpoint');
    expect(transfer.person.calendar.owed.length).toBeGreaterThan(0);
    expect(transfer.person.calendar.owed.every((d) => d.reason === 'broken')).toBe(true);
    expect(
      transfer.person.person.episodes.every(
        (e) => e.action === 'voice-office-work' && e.actorId === 'selin-voice',
      ),
    ).toBe(true);
    const replay = replayVoice(7, rec.log, 4);
    expect(replay.driftAt).toBe(-1);
    expect(voiceHash(replay.rec.game)).toBe(voiceHash(rec.game));
  });

  test('returns the actual agency answer with quiet debt intact, without changing the source', async () => {
    const source = sourceFixture(),
      before = snapshot(source);
    const transfer = selinCheckpoint(source);
    const digest = createHash('sha256')
      .update(canonicalPersona(JSON.parse(JSON.stringify(snapshot(source)))))
      .digest('hex');
    const departure = await createPersona({
      format: 'hf-persona/1',
      castId: SELIN_CAST,
      castRevision: '2',
      branchId: 'synthetic-proof',
      parentRevision: null,
      source: { game: 'voice', build: 'test', engine: '2.14.1', rules: 'voice-4' },
      transfer: {
        ...transfer,
        checkpoint: {
          sourceSchema: source.schema,
          sourceNow: source.now,
          sourceRng: source.rng,
          checkpointDigest: digest,
        },
      },
      limitations: transfer.person.person.limitations,
    });

    const opening = createPerson({
      id: 'selin-voice',
      name: 'Selin',
      seed: 2,
      now: transfer.targetOpening,
      bornAt: source.life.bornAt + transfer.targetOpening - source.now,
      sex: 'female',
    });
    const guest = admitCalendarPersona(transfer.person, opening, {
      mappingVersion: 'voice-selin-calendar/1',
      sourceId: 'selin',
      targetId: 'selin-voice',
      targetNorms: DEFAULT_NORMS,
    }).person;
    guest.now += 10;
    // Normal activity in a receiving host can change this approved stable body field.
    guest.body.fitness += 0.0001;
    const answer = remember(guest, {
      at: guest.now,
      kind: 'outcome',
      action: 'enquiry',
      actorId: 'nermin',
      targetId: 'selin-voice',
      valence: 0,
      summary: 'Nermin said no suitable service reaches your father yet.',
      tags: [],
    });
    const refs: CalendarPersonaProjection['calendar']['references'] = {
      commitments: {},
      chains: {},
      actions: { 'voice-office-work': 'work', eat: 'eat', drink: 'drink', tea: 'tea' },
      entities: {},
      norms: Object.fromEntries(DEFAULT_NORMS.map((n) => [n.id, n.id])),
    };
    for (const c of guest.agenda.commitments) {
      refs.commitments[c.id] = `goodhands-selin:${c.id}`;
      if (c.makeUpOf) refs.commitments[c.makeUpOf] = `goodhands-selin:${c.makeUpOf}`;
      if (c.chain) refs.chains[c.chain] = c.chain === 'voice-office' ? 'job' : c.chain;
    }
    const person = projectCalendarPersona(guest, {
      version: 'goodhands-selin-calendar/1',
      skills: {},
      episodes: {
        [answer.id]: {
          id: 'agency-answer',
          action: 'selin-enquiry',
          actorId: 'nermin-goodhands',
          targetId: 'selin',
        },
      },
      calendar: {
        version: 'hf-persona-calendar-map/1',
        offset: source.now - guest.now,
        references: refs,
        sourceNorms: DEFAULT_NORMS,
      },
    });
    const envelope = await createPersona({
      format: 'hf-persona/1',
      castId: SELIN_CAST,
      castRevision: '2',
      branchId: 'synthetic-proof',
      parentRevision: null,
      source: { game: 'goodhands', build: 'test', engine: '2.14.1', rules: 'goodhands-6' },
      transfer: {
        person,
        history: [
          {
            id: answer.id,
            summary: answer.summary,
            at: answer.at,
            sourceGame: 'goodhands',
            sourceEpisodeId: answer.id,
          },
        ],
        targetOpening: source.now,
        calendarHost: transfer.calendarHost,
        sourceRevision: departure.revision,
        sourceCheckpointDigest: digest,
      },
      limitations: person.person.limitations,
    });
    const returned = returnedSelin(envelope, source, departure);
    expect(returned.memory.episodes.map((e) => e.summary)).toEqual([answer.summary]);
    expect(selinEnquiryAnswer(returned)).toBe(answer.summary);
    expect(returned.agenda.owed?.[0]).toMatchObject({
      reason: 'broken',
      scheduledAs: 'goodhands-selin:voice-selin:fast-makeup',
    });
    expect(returned.agenda.commitments.find((c) => c.kind === 'job')).toMatchObject({
      actions: ['work'],
      chain: 'job',
      from: 3 * 1440 + 540,
      until: 3 * 1440 + 1080,
    });
    expect(returned.agenda.commitments.find((c) => c.makeUpOf)).toMatchObject({ status: 'pending' });
    expect(returned.conscience.norms).toEqual(source.conscience.norms);
    expect(snapshot(source)).toEqual(before);
    expect(returned.body.health).toBe(source.body.health);
    expect(returned.body.fitness).toBe(guest.body.fitness);
    const wrongHealth = structuredClone(envelope);
    (wrongHealth.transfer.person as typeof person).person.health.health -= 0.1;
    expect(() => returnedSelin(wrongHealth, source, departure)).toThrow(/health/);
    const wrongCalendar = structuredClone(envelope);
    (wrongCalendar.transfer.calendarHost as { originSourceNow: number }).originSourceNow++;
    expect(() => returnedSelin(wrongCalendar, source, departure)).toThrow(/calendar/);
    const wrongRevision = structuredClone(envelope);
    wrongRevision.transfer.sourceRevision = 'other-revision';
    expect(() => returnedSelin(wrongRevision, source, departure)).toThrow(/checkpoint/);
    const wrongDigest = structuredClone(envelope);
    wrongDigest.transfer.sourceCheckpointDigest = '0'.repeat(64);
    expect(() => returnedSelin(wrongDigest, source, departure)).toThrow(/checkpoint/);
    const missingBinding = structuredClone(envelope);
    delete missingBinding.transfer.sourceRevision;
    expect(() => returnedSelin(missingBinding, source, departure)).toThrow(/checkpoint/);
  });

  test('a new return answer is told once on a connected call even after an earlier enquiry', () => {
    const run = newRun(7),
      h = run.ppl.halil;
    h.now = 40 * 1440 + 20 * 60;
    run.ppl.selin.now = h.now;
    run.town.state.selinEnquirySaidAt = h.now - 1440;
    const oldMarker = run.town.state.selinEnquirySaidAt,
      answer = 'Nermin said a daytime enquiry is possible.';
    const town = selinReturnTown(run.c.people, run.opts, run.town.state, answer);
    const offer = town.affordancesFor(h).find((a) => a.id === 'call:selin');
    if (!offer) throw Error('No call');
    const activity = begin(h, offer, decide(h, [offer]));
    if (!activity) throw Error('Call did not begin');
    h.now = activity.endsAt;
    town.resolve(h, activity, 'ended');
    expect(town.state.queued.halil?.filter((e) => e.summary === answer)).toHaveLength(1);
    h.now += 20;
    town.resolve(h, activity, 'ended');
    expect(town.state.queued.halil?.filter((e) => e.summary === answer)).toHaveLength(1);
    expect(run.town.state.selinEnquirySaidAt).toBe(oldMarker);
  });
});
