import {
  admitPersona,
  begin,
  createPerson,
  decide,
  MINUTES_PER_YEAR,
  projectPersona,
  remember,
  snapshot,
} from '@adam0white/human-framework';
import { createPersona } from '@adam0white/lab-client';
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

describe('Selin continuity chapter', () => {
  test('refuses an active source action and pre-Eid duties without changing her', () => {
    const g = new VoiceGame(7, 3);
    const before = voiceHash(g);
    expect(() => selinCheckpoint(g.run.ppl.selin)).toThrow();
    expect(voiceHash(g)).toBe(before);
  });

  test('only her own attended episode can travel; office duty remains mapped', () => {
    const g = new VoiceGame(7, 3);
    const p = g.run.ppl.selin;
    p.now = 40 * 1440 + 19 * 60;
    p.activity = null;
    p.agenda.commitments = [
      {
        id: 'office-next',
        kind: 'job',
        actions: ['work'],
        from: 41 * 1440 + 540,
        until: 41 * 1440 + 1080,
        importance: 0.8,
        status: 'pending',
        recurEvery: 1440,
      },
    ];
    p.agenda.owed = [];
    p.agenda.lapse = undefined;
    remember(p, {
      at: p.now - 60,
      kind: 'outcome',
      action: 'work',
      actorId: 'selin',
      placeId: 'city',
      valence: 0.2,
      salience: 0.8,
      summary: 'finished my office work',
      tags: ['work'],
    });
    remember(p, {
      at: p.now - 1,
      kind: 'told',
      actorId: 'hacer',
      targetId: 'halil',
      valence: 0,
      salience: 1,
      summary: 'unverified health story',
      tags: [],
    });
    const result = selinCheckpoint(p);
    expect(result.person.episodes.map((e) => e.summary)).toEqual(['finished my office work']);
    expect(result.person.commitments[0]?.actions).toEqual(['voice-office-work']);
    expect(result.person.commitments[0]?.from).toBe(1440 + 540);
    expect(result.targetOpening).toBe(19 * 60);
    expect(result.person.skills).toEqual({});
  });

  test('a played source retains actual fasting debts and distinct future makeup days', () => {
    const rec = new RecordedGame(new VoiceGame(7, 3));
    play(rec);
    rec.apply({ type: 'keepListening' });
    rec.apply({ type: 'personaCheckpoint' });
    play(rec, { stop: (g) => !!g.personaDeparture?.transfer || g.t > 34 * 1440 });
    expect(rec.game.personaDeparture?.transfer).toBeUndefined();
    expect(rec.game.run.ppl.selin.agenda.owed?.length).toBeGreaterThan(0);
    const future = rec.game.run.ppl.selin.agenda.commitments.filter(
      (c) => c.makeUpOf && c.status === 'pending',
    );
    expect(new Set(future.map((c) => Math.floor(c.from / 1440))).size).toBe(future.length);
    const result = replayVoice(7, rec.log, 3);
    expect(result.driftAt).toBe(-1);
    expect(voiceHash(result.rec.game)).toBe(voiceHash(rec.game));
  });

  test('a synthetic compatible branch returns the actual agency answer without changing its source', async () => {
    // Controlled compatibility proof only; the default played source is blocked above.
    const now = 40 * 1440 + 19 * 60;
    const source = createPerson({
      id: 'selin',
      name: 'Selin',
      seed: 1002,
      now,
      bornAt: now - 32 * MINUTES_PER_YEAR,
      sex: 'female',
      skills: { office: 0.6 },
    });
    source.agenda.commitments.push({
      id: 'office',
      kind: 'job',
      actions: ['work'],
      from: 41 * 1440 + 540,
      until: 41 * 1440 + 1080,
      importance: 0.8,
      recurEvery: 1440,
      status: 'pending',
    });
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
    const before = snapshot(source);
    const transfer = selinCheckpoint(source);
    const opening = createPerson({
      id: 'selin-voice',
      name: 'Selin',
      seed: 2,
      now: transfer.targetOpening,
      bornAt: transfer.targetOpening - 32 * MINUTES_PER_YEAR,
      sex: 'female',
    });
    const guest = admitPersona(transfer.person, opening, {
      mappingVersion: 'voice-selin/1',
      sourceId: 'selin',
      targetId: 'selin-voice',
    }).person;
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
    const job = guest.agenda.commitments.find((c) => c.status === 'pending')!;
    const person = projectPersona(guest, {
      version: 'goodhands-selin/1',
      skills: {},
      episodes: {
        [answer.id]: {
          id: 'agency-answer',
          action: 'selin-enquiry',
          actorId: 'nermin-goodhands',
          targetId: 'selin',
        },
      },
      commitments: {
        [job.id]: {
          id: 'returned-office',
          actions: ['work'],
          from: job.from + now - guest.now,
          until: job.until + now - guest.now,
        },
      },
    });
    const envelope = await createPersona({
      format: 'hf-persona/1',
      castId: SELIN_CAST,
      castRevision: '1',
      branchId: 'synthetic-proof',
      parentRevision: null,
      source: { game: 'goodhands', build: 'test', engine: '2.14.1', rules: 'goodhands-5' },
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
      },
      limitations: person.limitations,
    });
    const returned = returnedSelin(envelope, source);
    expect(returned.memory.episodes.map((e) => e.summary)).toEqual([answer.summary]);
    expect(selinEnquiryAnswer(returned)).toBe(answer.summary);
    expect(returned.agenda.commitments.filter((c) => c.status === 'pending').map((c) => c.actions)).toEqual([
      ['work'],
    ]);
    expect(snapshot(source)).toEqual(before);
    expect(returned.body.health).toBe(source.body.health);
  });

  test('a new return answer is told once on a connected call even after an earlier enquiry', () => {
    const run = newRun(7);
    const h = run.ppl.halil;
    h.now = 40 * 1440 + 20 * 60;
    run.ppl.selin.now = h.now;
    run.town.state.selinEnquirySaidAt = h.now - 1440;
    const oldMarker = run.town.state.selinEnquirySaidAt;
    const answer = 'Nermin said a daytime enquiry is possible.';
    const town = selinReturnTown(run.c.people, run.opts, run.town.state, answer);
    const offer = town.affordancesFor(h).find((a) => a.id === 'call:selin')!;
    expect(offer).toBeDefined();
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

  test('voice-1 and voice-2 replay retain their own edition', () => {
    for (const rules of [1, 2] as const) {
      const rec = new RecordedGame(new VoiceGame(7, rules));
      rec.apply({ type: 'begin' });
      rec.step(1);
      expect(voiceHash(replayVoice(7, rec.log, rules).rec.game)).toBe(voiceHash(rec.game));
    }
  });
});
