import { describe, expect, it } from 'vitest';
import type { Frame, LogEntry, OptionView } from '../protocol.ts';
import { deriveScene, nextEncounter, sceneChoices } from './scenes.ts';

const act = (text: string, minute = 2040, id = 'a'): LogEntry => ({
  id,
  text,
  minute,
  day: 1,
  clock: '10:00',
  kind: 'act',
  who: 'halil',
  until: '12:00',
  ...(/^I call Selin/.test(text) ? { connection: { minute, clock: '10:00' } } : {}),
});
function frame(
  log: LogEntry[],
  doing: string | null = null,
): Pick<Frame, 'day' | 'minute' | 'clock' | 'halil' | 'log'> {
  return {
    day: 1,
    minute: 2100,
    clock: '11:00',
    log,
    halil: {
      doing: doing ? { label: doing, intention: '', until: '12:00' } : null,
      asleep: false,
      felt: [],
      feelings: [],
      onMind: [],
      money: 0,
      owed: 0,
    },
  };
}
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.freeze(value);
    for (const child of Object.values(value)) freeze(child);
  }
  return value;
}
const options = (...ids: string[]): OptionView[] =>
  ids.map((id) => ({ id, label: id, rank: 0, leaning: false }));

describe('read-only day scenes', () => {
  it('derives a deterministic workshop exchange from frozen state without changing the input', () => {
    const input = freeze(frame([act('I repair in the workshop, to earn.')], 'repair in the workshop'));
    const before = JSON.stringify(input);
    const scene = deriveScene(input);
    expect(scene?.kind).toBe('workshop');
    expect(scene?.names).toEqual(['Halil', expect.stringMatching(/Mrs Aydın|Mr Demir|The baker’s boy/)]);
    expect(scene?.lines).toHaveLength(4);
    expect(scene?.current).toBe(true);
    expect(deriveScene(input)).toEqual(scene);
    expect(JSON.stringify(input)).toBe(before);
  });
  it('keeps the recorded have-tea wording current during the town tea activity', () => {
    const scene = deriveScene(frame([act('I have tea with Rıza, to be with someone.')], 'tea with Rıza'));
    expect(scene?.kind).toBe('tea');
    expect(scene?.current).toBe(true);
    expect(new Set(scene?.lines.map((line) => line.speaker))).toEqual(new Set(['Halil', 'Rıza']));
  });
  it('keeps an earlier encounter visibly historical after another action begins', () => {
    const input = frame([act('I call Selin.'), act('I rest at home.', 2060, 'b')], 'rest at home');
    const scene = deriveScene(input);
    expect(scene?.kind).toBe('call');
    expect(scene?.current).toBe(false);
    expect(scene?.activity).toBe('rest at home');
    expect(sceneChoices(scene, options('call:selin', 'rest')).map((choice) => choice.draft.optionId)).toEqual(
      ['call:selin', 'rest'],
    );
  });
  it('does not invent a call from advice or an encounter from an offered action', () => {
    const advice = {
      ...act('Selin wants him to see the doctor.'),
      kind: 'voice' as const,
      who: 'selin' as const,
    };
    expect(deriveScene(frame([advice]))).toBeNull();
    expect(deriveScene(frame([]))).toBeNull();
  });
  it('does not carry a previous day or a future event into today', () => {
    expect(
      deriveScene(frame([{ ...act('I call Selin.'), day: 0 }, act('I call Selin.', 2110, 'future')])),
    ).toBeNull();
  });
  it('does not invent Nuran memories at meals, and never makes her a live speaker', () => {
    expect(deriveScene(frame([act('I eat at home.')]))).toBeNull();
    const memory = {
      ...act('He remembers: iftar with Nuran at our table, last Ramadan.', 2000, 'm'),
      kind: 'recall' as const,
    };
    const scene = deriveScene(frame([memory, act('I eat at home.')]));
    expect(scene?.kind).toBe('meal');
    expect(scene?.lines.find((line) => line.speaker === 'Halil')?.words).toBe(
      'I remember iftar with Nuran at our table last Ramadan.',
    );
    expect(memory.text).toBe('He remembers: iftar with Nuran at our table, last Ramadan.');
    expect(scene?.lines.map((line) => line.words).join(' ')).toContain('last Ramadan');
    expect(scene?.names).toEqual(['Halil']);
    expect(scene?.lines.some((line) => line.speaker === 'Nuran')).toBe(false);
  });
  it('offers at most two exact offered actions as bare mentions with spoken labels', () => {
    const scene = deriveScene(frame([act('I talk with Hacer at the door.')]));
    const result = sceneChoices(scene, freeze(options('talk:hacer', 'rest', 'tea:riza', 'call:selin')));
    expect(result).toEqual([
      {
        label: 'Hacer is here. Stay and talk.',
        draft: { optionId: 'talk:hacer', strength: 'mention', insist: false },
      },
      { label: 'Go home and rest.', draft: { optionId: 'rest', strength: 'mention', insist: false } },
    ]);
    expect(sceneChoices(null, options('rest')).map((choice) => choice.draft.optionId)).toEqual(['rest']);
  });
  it('offers literal nonreligious fallbacks between scenes and when scene preferences are absent', () => {
    const offered = freeze([
      ...options('pray-mosque', 'make-up-prayer', 'sleep', 'drink'),
      { id: 'call:selin', label: 'Call Selin', rank: 0, leaning: false },
    ]);
    expect(sceneChoices(null, offered).map((choice) => choice.draft.optionId)).toEqual([
      'call:selin',
      'sleep',
    ]);
    const scene = deriveScene(frame([act('I repair in the workshop.')]));
    const fallback = sceneChoices(scene, [{ id: 'drink', label: 'Drink water', rank: 0, leaning: false }]);
    expect(fallback[0]?.label).toBe('Have some water.');
    expect(fallback[0]?.draft).toEqual({ optionId: 'drink', strength: 'mention', insist: false });
    expect(sceneChoices(null, options('pray-mosque', 'pray-home', 'pray-eid', 'make-up-prayer'))).toEqual([]);
  });
  it('gives a recorded clinic conversation priority over a same-minute recall without inventing advice', () => {
    const doctor = {
      ...act(
        'The doctor said his blood pressure is high. The doctor told him to rest, walk and stop smoking.',
        2040,
        'doc',
      ),
      kind: 'voice' as const,
      who: 'doctor' as const,
    };
    const recall = { ...act('He remembers: Nuran at our table.', 2040, 'memory'), kind: 'recall' as const };
    const scene = deriveScene(frame([act('I see the doctor at the clinic.', 2000), doctor, recall]));
    expect(scene?.kind).toBe('clinic');
    expect(scene?.names).toEqual(['Halil', 'The doctor']);
    expect(scene?.lines.find((line) => line.speaker === 'Scene')?.words).toBe(doctor.text);
    expect(deriveScene(frame([act('I see the doctor at the clinic.')]))).toBeNull();
  });
  it('keeps a surfaced recall current after its same-minute activity and retires it after a later act', () => {
    const activity = act('I rest at home.', 2040, 'rest');
    const recall = {
      ...act('He remembers: the clinic, the day they found her illness.', 2040, 'memory'),
      kind: 'recall' as const,
    };
    const scene = deriveScene(frame([activity, recall], 'rest at home'));
    expect(scene?.kind).toBe('memory');
    expect(scene?.current).toBe(true);
    expect(sceneChoices(scene, options('call:selin', 'see-doctor', 'rest'))[0]?.draft.optionId).toBe(
      'see-doctor',
    );
    const later = deriveScene(frame([activity, recall, act('I drink water.', 2040, 'drink')], 'drink water'));
    expect(later?.current).toBe(false);
  });
  it('keeps recorded advice current during the clinic act that preceded it', () => {
    const activity = act('I see the doctor at the clinic.', 2040, 'visit');
    const doctor = {
      ...act('The doctor said to rest.', 2040, 'doctor'),
      kind: 'voice' as const,
      who: 'doctor' as const,
    };
    const scene = deriveScene(frame([activity, doctor], 'see the doctor at the clinic'));
    expect(scene?.current).toBe(true);
    expect(sceneChoices(scene, options('call:selin', 'see-doctor', 'rest'))[0]?.draft.optionId).toBe(
      'see-doctor',
    );
  });
  it('derives a Hacer exchange only from a recorded delivery of her words', () => {
    const delivery = {
      ...act('Hacer says Rıza is lazy.', 2040, 'delivery'),
      kind: 'voice' as const,
      who: 'hacer' as const,
    };
    const scene = deriveScene(frame([delivery]));
    expect(scene?.kind).toBe('door');
    expect(new Set(scene?.lines.map((line) => line.speaker)).size).toBe(2);
    expect(scene?.lines.find((line) => line.speaker === 'Hacer')?.words).toBe('Rıza is lazy.');
  });
  it('varies authored incidental dialogue by the recorded occasion', () => {
    const words = new Set(
      Array.from({ length: 12 }, (_, index) =>
        JSON.stringify(deriveScene(frame([act('I repair in the workshop.', 2000 + index)]))?.lines),
      ),
    );
    expect(words.size).toBeGreaterThan(1);
    expect(deriveScene(frame([act('I walk by the river.')]))?.names[1]).toMatch(
      /Mrs Aydın|Mr Demir|The baker’s boy/,
    );
  });
  it('keeps incidental identities stable across occasions in a day without changing frozen state', () => {
    for (const text of ['I repair in the workshop.', 'I walk by the river.']) {
      const first = freeze(frame([act(text, 2000)]));
      const later = freeze(frame([act(text, 2090, 'later')]));
      expect(deriveScene(first)?.names[1]).toBe(deriveScene(later)?.names[1]);
      expect(deriveScene(first)?.lines[0]?.speaker).toBe(deriveScene(first)?.names[1]);
    }
  });
  it('prefers offered scene continuations and speaks to Halil without inventing a topic', () => {
    const cases = [
      ['I call Selin.', 'call:selin', 'Stay on the phone with Selin.'],
      ['I have tea with Rıza.', 'tea:riza', 'Stay for tea with Rıza.'],
    ] as const;
    for (const [text, id, label] of cases) {
      const scene = deriveScene(frame([act(text)]));
      expect(sceneChoices(scene, options('rest', 'talk:hacer', id))[0]).toEqual({
        label,
        draft: { optionId: id, strength: 'mention', insist: false },
      });
    }
    expect(sceneChoices(null, options('sleep'))[0]?.label).toBe('Go to sleep.');
    const workshop = deriveScene(frame([act('I repair in the workshop.')]));
    expect(sceneChoices(workshop, options('rest', 'talk:hacer')).map((c) => c.label)).toEqual([
      'Go and talk with Hacer.',
      'Leave the work for now. Rest at home.',
    ]);
  });
  it('uses remembered calls conservatively rather than promising an ineligible evening call', () => {
    const input = frame([act('I call Selin.', 1200)]);
    expect(nextEncounter(input)).toBe('Selin usually leaves a day or two between calls.');
    expect(nextEncounter({ ...input, day: 32 })).toBeNull();
    expect(nextEncounter({ ...input, day: 31 })).toBeNull();
  });
  it('does not add conversation during prayer', () => {
    const scene = deriveScene(frame([act('I pray at the mosque.')], 'pray at the mosque'));
    expect(scene).toBeNull();
  });
  // The full mounted month/file control also checks actual scene observations.
});

it('does not replay the workshop visitor exchange on later work occasions', () => {
  const first = act('I repair in the workshop.', 2000, 'first');
  const again = act('I repair in the workshop.', 2040, 'again');
  const third = act('I repair in the workshop.', 2080, 'third');
  const scenes = [first, again, third].map((_entry, index) =>
    deriveScene(frame([first, again, third].slice(0, index + 1), 'repair in the workshop')),
  );
  expect(new Set(scenes.map((scene) => JSON.stringify(scene?.lines))).size).toBe(3);
  expect(scenes[2]?.lines).toEqual([
    { speaker: 'Scene', words: 'Halil is doing repairs again. He last worked here on day 1 at 10:00.' },
  ]);
});

it('summarizes a repeated Nuran memory using its earlier recorded occasion', () => {
  const first = {
    ...act('He remembers: Nuran at our table.', 2000, 'memory-first'),
    kind: 'recall' as const,
  };
  const again = { ...first, id: 'memory-again', minute: 2060, clock: '10:20' };
  const scene = deriveScene(frame([first, again]));
  expect(scene?.lines).toEqual([
    {
      speaker: 'Scene',
      words:
        'Halil recalls the same memory: “I remember Nuran at our table.” He last recalled it on day 1 at 10:00.',
    },
  ]);
});
it('does not replay the same table-memory exchange at another meal', () => {
  const memory = { ...act('He remembers: Nuran at our table.', 1900, 'memory'), kind: 'recall' as const };
  const first = act('I eat at home.', 2000, 'meal-first');
  const again = act('I eat at home.', 2080, 'meal-again');
  expect(deriveScene(frame([memory, first, again]))?.lines).toEqual([
    {
      speaker: 'Scene',
      words: 'Halil eats at his table again, remembering Nuran. He last ate here on day 1 at 10:00.',
    },
  ]);
});
