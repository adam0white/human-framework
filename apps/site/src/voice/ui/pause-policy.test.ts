import { expect, it } from 'vitest';
import type { Frame } from '../protocol.ts';
import { sampleFrame } from '../sim/fixtures.ts';
import { VoiceGame } from '../sim/game.ts';
import { RecordedGame, replayVoice, voiceHash } from '../sim/record.ts';
import { consequentialOffer, PausePolicy, speakingOpportunity } from './pause-policy.ts';

const frame = (patch: Partial<Frame> = {}): Frame => ({
  ...structuredClone(sampleFrame),
  phase: 'day',
  paused: false,
  autoPause: true,
  log: [],
  options: [],
  prefill: undefined,
  intro: undefined,
  pauseBeat: undefined,
  halil: { ...sampleFrame.halil, doing: null },
  composer: { open: true },
  muted: false,
  ...patch,
});

it('runs the current day-one pause policy with exact replay', () => {
  const seed = 7;
  const rec = new RecordedGame(new VoiceGame(seed));
  const policy = new PausePolicy();
  rec.apply({ type: 'begin' });
  let previous = rec.game.frame();
  const commands = { pause: 0, resume: 0 };
  for (let guard = 0; rec.game.phase === 'day' && guard < 20000; guard++) {
    rec.tick(250);
    const current = rec.game.frame();
    const command = policy.update(current, previous);
    if (command) {
      commands[command]++;
      rec.apply({ type: command });
    }
    if (rec.game.paused && rec.game.phase === 'day') {
      if (rec.game.intro) rec.apply({ type: 'dismissIntro' });
      rec.apply({ type: 'resume' });
    }
    previous = rec.game.frame();
  }
  expect(rec.game.phase).toBe('between');
  expect(commands.pause).toBeGreaterThan(0);
  expect(commands.resume).toBeGreaterThan(0);
  const replay = replayVoice(seed, rec.log);
  expect(replay.driftAt).toBe(-1);
  expect(voiceHash(replay.rec.game)).toBe(voiceHash(rec.game));
}, 30000);

it('resumes only a known automatic transition and preserves explicit reading holds', () => {
  const policy = new PausePolicy();
  const running = frame();
  const stopped = frame({ paused: true, pauseBeat: { kind: 'close-call', text: 'A routine choice.' } });
  expect(policy.update(stopped, null)).toBe(null);
  expect(policy.update(stopped, running, true)).toBe(null);
  expect(policy.update(stopped, running)).toBe('resume');
  expect(policy.update(stopped, stopped)).toBe(null);
  expect(policy.update(frame({ paused: true }), running)).toBe(null);
  expect(policy.update({ ...stopped, intro: { label: 'Read', lines: [] } }, running)).toBe(null);
  expect(policy.update({ ...stopped, phase: 'between' }, running)).toBe(null);
  expect(policy.update({ ...stopped, autoPause: false }, running)).toBe(null);
  expect(policy.update({ ...stopped, pauseBeat: { kind: 'verdict', text: 'No.' } }, running)).toBe(null);
  expect(
    policy.update(
      {
        ...stopped,
        log: [
          {
            id: 'answer',
            day: stopped.day,
            minute: stopped.minute,
            clock: stopped.clock,
            kind: 'answer',
            who: 'halil',
            text: 'I cannot.',
          },
        ],
      },
      running,
    ),
  ).toBe(null);
});

it('stops on a new two-person scene on arrival even while busy, once per occasion', () => {
  const policy = new PausePolicy();
  const scene = frame({
    composer: { open: false, reason: 'busy' },
    log: [
      {
        id: 'selin-call',
        day: sampleFrame.day,
        minute: sampleFrame.minute,
        clock: sampleFrame.clock,
        kind: 'voice',
        who: 'selin',
        text: 'Selin called. How are you?',
      },
    ],
  });
  expect(speakingOpportunity(scene)).toBe('scene:scene:selin-call');
  expect(policy.update(scene, frame())).toBe('pause');
  expect(policy.update(scene, scene)).toBe(null);
});

it('stops once per day for new important offered prefills, excluding routine actions', () => {
  const policy = new PausePolicy();
  const offer = frame({
    prefill: { optionId: 'see-doctor', strength: 'mention', source: 'end', why: 'Her advice.' },
    options: [{ id: 'see-doctor', label: 'see the doctor', rank: 1, leaning: false }],
  });
  if (!offer.prefill) throw new Error('Missing test prefill');
  expect(policy.update(offer, frame())).toBe('pause');
  expect(policy.update({ ...offer, prefill: { ...offer.prefill, why: 'New wording.' } }, offer)).toBe(null);
  expect(policy.update({ ...offer, day: offer.day + 1 }, offer)).toBe('pause');
  expect(speakingOpportunity({ ...offer, options: [] })).toBe(null);
  for (const id of ['eat', 'rest', 'sleep', 'smoke', 'work-repair']) {
    expect(
      speakingOpportunity({
        ...offer,
        prefill: { ...offer.prefill, optionId: id },
        options: [{ id, label: id, rank: 1, leaning: false }],
      }),
    ).toBe(null);
  }
});

it('keeps the offered walk consequential when the doctor’s advice competes with a cigarette', () => {
  const policy = new PausePolicy();
  const cigarette = frame({
    prefill: {
      optionId: 'walk',
      strength: 'mention',
      source: 'end',
      appeal: 'safety',
      why: 'He is reaching for a cigarette. The doctor told him to walk, and to stop smoking.',
    },
    options: [{ id: 'walk', label: 'walk by the river', rank: 2, leaning: false }],
  });
  expect(consequentialOffer(cigarette)).toEqual(cigarette.prefill);
  expect(speakingOpportunity(cigarette)).toBe(`offer:${cigarette.day}:walk:end:`);
  expect(policy.update(cigarette, frame())).toBe('pause');
  expect(policy.update(cigarette, cigarette)).toBe(null);
  expect(consequentialOffer({ ...cigarette, options: [] })).toBeUndefined();
  expect(consequentialOffer({ ...cigarette, composer: { open: false, reason: 'busy' } })).toBeUndefined();
  expect(consequentialOffer({ ...cigarette, muted: true })).toBeUndefined();
});
