/** Authored care acknowledges reception through the existing native faculty; questions retain presentation. */

import { describe, expect, test } from 'vitest';
import { FRAMEWORK_PACKAGE_VERSION, makePlaytestFile } from '../../shared/playtest.ts';
import { scenarioOf } from '../protocol.ts';
import { sceneBeat, sceneWordChoices } from '../ui/scene-words.ts';
import { VoiceGame } from './game.ts';
import { play } from './headless.ts';
import { parseVoicePlaytest, RecordedGame, replayVoice, validateVoiceLog, voiceHash } from './record.ts';

function atBusyOccasion(): RecordedGame {
  const rec = new RecordedGame(new VoiceGame(7, 4));
  play(rec, { stop: (g) => g.composer().reason === 'busy' && sceneWordChoices(g.frame()).length > 0 });
  return rec;
}

describe('recorded scene words', () => {
  test('busy care records acknowledged reception once, with no direction or trust change, and replays', async () => {
    const rec = atBusyOccasion();
    const baseline = replayVoice(7, rec.log, 4).rec;
    const runtime = rec.game.run.c.runtime!;
    const empty = baseline.game.run.c.runtime!;
    const at = runtime.ingressAt();
    const beforeEvents = runtime.events.length;
    const beat = sceneBeat(rec.frame());
    rec.apply({ type: 'sceneWord', beat, kind: 'care' });
    empty.receive(at);
    const readings = (r: typeof runtime) =>
      r.inspect({
        perspective: { kind: 'host' },
        people: ['halil'],
        select: ['summary', 'sourceTrust', 'advice', 'review'],
      });
    expect(readings(runtime)).toEqual(readings(empty));
    const received = runtime.events.filter(
      (e) => e.data.kind === 'voice-evidence' && e.data.evidence.kind === 'support',
    );
    expect(received).toHaveLength(1);
    expect(received[0]?.data.kind === 'voice-evidence' && received[0].data.evidence).toMatchObject({
      effect: 'acknowledged',
      action: 'listen',
    });
    expect(
      runtime.events
        .slice(beforeEvents)
        .some(
          (e) =>
            e.data.kind === 'input-disposed' &&
            e.data.disposition.kind === 'consumed' &&
            e.data.disposition.evidenceIds.includes(
              received[0]?.data.kind === 'voice-evidence' ? received[0].data.evidenceId : '',
            ),
        ),
    ).toBe(true);
    expect(runtime.events.slice(beforeEvents).filter((e) => e.data.kind === 'decision')).toEqual(
      empty.events.slice(beforeEvents).filter((e) => e.data.kind === 'decision'),
    );
    expect(rec.sceneWords).toHaveLength(1);
    const accepted = voiceHash(rec.game);
    rec.apply({ type: 'sceneWord', beat, kind: 'care' });
    rec.apply({ type: 'sceneWord', beat: 'stale occasion', kind: 'care' });
    expect(rec.sceneWords).toHaveLength(1);
    expect(voiceHash(rec.game)).toBe(accepted);
    const restored = replayVoice(7, rec.log, 4).rec;
    expect(voiceHash(restored.game)).toBe(accepted);
    expect(restored.game.run.c.runtime!.events).toEqual(runtime.events);
    expect(restored.sceneWords).toEqual(rec.sceneWords);
    runtime.verify();
    const file = await makePlaytestFile({
      game: 'voice',
      seed: rec.game.seed,
      scenario: scenarioOf(4),
      minute: rec.game.t,
      log: rec.log,
      hash: accepted,
      engine: runtime.save().archive.engine.package,
      snapshot: null,
    });
    const parsed = parseVoicePlaytest(JSON.stringify({ ...file, voiceEdition: 'voice-hf4/1' }));
    const cold = replayVoice(parsed.file.seed, parsed.file.log, parsed.rules).rec;
    expect(voiceHash(cold.game)).toBe(accepted);
    expect(cold.game.run.c.runtime!.events).toEqual(runtime.events);
    const start = rec.game.t;
    for (const current of [rec, cold]) {
      current.apply({ type: 'resume' });
      current.step(1);
    }
    expect(rec.game.t).toBeGreaterThan(start);
    expect(voiceHash(cold.game)).toBe(voiceHash(rec.game));
  }, 30_000);

  test('an exported and imported busy question restores the exact presented exchange and can continue', async () => {
    const rec = atBusyOccasion();
    rec.apply({ type: 'sceneWord', beat: sceneBeat(rec.frame()), kind: 'question' });
    const file = await makePlaytestFile({
      game: 'voice',
      seed: 7,
      scenario: scenarioOf(rec.game.rules),
      minute: rec.game.t,
      log: rec.log,
      hash: voiceHash(rec.game),
      engine: FRAMEWORK_PACKAGE_VERSION,
      snapshot: null,
    });
    const parsed = parseVoicePlaytest(JSON.stringify({ ...file, voiceEdition: 'voice-hf4/1' }));
    const { rec: restored, driftAt } = replayVoice(parsed.file.seed, parsed.file.log, parsed.rules);
    expect(driftAt).toBe(-1);
    expect(restored.sceneWords).toEqual(rec.sceneWords);
    expect(restored.frame().sceneWords).toEqual(rec.frame().sceneWords);
    expect(voiceHash(restored.game)).toBe(file.hash);
    expect(restored.log).toEqual(rec.log);
    for (let n = 0; n < 10; n++) {
      rec.tick(100);
      restored.tick(100);
    }
    expect(voiceHash(restored.game)).toBe(voiceHash(rec.game));
  });

  test('quick suggestion wording survives replay while its decision remains the existing suggest path', () => {
    const rec = new RecordedGame(new VoiceGame(7, 4));
    play(rec, { stop: (g) => !g.intro && g.composer().open && g.frame().options.length > 0 });
    const frame = rec.frame();
    const option = frame.options[0];
    expect(option).toBeDefined();
    if (!option) throw new Error('No suggestion at opening');
    const baseline = replayVoice(7, rec.log, 4).rec;
    const draft = { optionId: option.id, strength: 'mention' as const, insist: false };
    rec.apply({ type: 'suggest', draft, sceneLine: 'Take a moment at home.' });
    baseline.apply({ type: 'suggest', draft });
    expect(voiceHash(rec.game)).toBe(voiceHash(baseline.game));
    const restored = replayVoice(7, validateVoiceLog(rec.log), 4).rec;
    expect(restored.sceneWords).toEqual(rec.sceneWords);
    expect(restored.sceneWords[0]?.words).toBe('Take a moment at home.');
    expect(voiceHash(restored.game)).toBe(voiceHash(rec.game));
    expect(() => validateVoiceLog([{ at: 0, type: 'suggest', draft, sceneLine: 'x'.repeat(241) }])).toThrow();
  });

  test('a stale busy quick suggestion stays unsaid, leaves simulation untouched, and replays', async () => {
    const rec = atBusyOccasion();
    const before = voiceHash(rec.game);
    const minute = rec.game.t;
    rec.apply({
      type: 'suggest',
      draft: { optionId: 'rest-home', strength: 'mention', insist: false },
      sceneLine: 'Rest at home.',
    });
    expect(voiceHash(rec.game)).toBe(before);
    expect(rec.game.t).toBe(minute);
    expect(rec.sceneWords).toHaveLength(1);
    expect(rec.sceneWords[0]).toMatchObject({
      said: false,
      kind: 'suggestion',
      words: 'Rest at home.',
      answer: 'He is occupied. Wait until he is choosing.',
    });
    const restored = replayVoice(7, validateVoiceLog(rec.log), 4);
    expect(restored.driftAt).toBe(-1);
    expect(restored.rec.sceneWords).toEqual(rec.sceneWords);
    expect(voiceHash(restored.rec.game)).toBe(before);
  });

  test('validation accepts only a bounded occasion and a known line kind, with no arbitrary answer', () => {
    expect(
      validateVoiceLog([{ at: 1, type: 'sceneWord', beat: '1:workshop:act-7', kind: 'care' }]),
    ).toHaveLength(1);
    for (const invalid of [
      { beat: 'x'.repeat(161), kind: 'care' },
      { beat: 'x', kind: 'command' },
      { beat: 'x', kind: 'care', answer: 'Invent an answer' },
      { beat: 'x', kind: 'care', words: 'x'.repeat(241) },
    ])
      expect(() => validateVoiceLog([{ at: 1, type: 'sceneWord', ...invalid }])).toThrow();
  });
});

test('stale displayed wording is retained as Unsaid rather than replaced with another spoken line', () => {
  const rec = atBusyOccasion();
  const before = voiceHash(rec.game);
  rec.apply({
    type: 'sceneWord',
    beat: sceneBeat(rec.frame()),
    kind: 'care',
    words: 'A line from an earlier reading.',
  });
  expect(rec.sceneWords.at(-1)).toMatchObject({ said: false, words: 'A line from an earlier reading.' });
  expect(voiceHash(rec.game)).toBe(before);
  const restored = replayVoice(7, validateVoiceLog(rec.log), 4).rec;
  expect(restored.sceneWords).toEqual(rec.sceneWords);
});

// Particular clinic/Nuran wording is covered by the focused scene-words projections.
// Recorded care/question delivery and replay are covered above. The canonical whole-month
// control owns the complete live horizon; no seed promises a particular conversation.

test('an actual asleep opening never receives care and keeps the attempted words unsaid', () => {
  const rec = new RecordedGame(new VoiceGame(7, 4));
  rec.apply({ type: 'begin' });
  expect(rec.frame().halil.asleep).toBe(true);
  const before = voiceHash(rec.game);
  rec.apply({ type: 'sceneWord', kind: 'care', beat: sceneBeat(rec.frame()), words: 'I am here.' });
  expect(voiceHash(rec.game)).toBe(before);
  expect(rec.sceneWords.at(-1)).toMatchObject({ said: false });
  expect(
    rec.game.run.c.runtime!.events.some(
      (e) => e.data.kind === 'voice-evidence' && e.data.evidence.kind === 'support',
    ),
  ).toBe(false);
});
