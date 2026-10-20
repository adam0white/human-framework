/**
 * Read-only scene presentation. Recorded acts anchor UI-authored incidental exchanges (unnamed customers and neighbours); recorded recalls alone
 * supply Nuran's memories. No scene changes an input, advances time, or consumes simulation randomness.
 * These incidental speakers are narrative presentation, not simulated people or recorded events.
 * It does not infer completed acts, future encounters, consequential requests, or named people’s availability.
 */
import type { Draft, Frame, LogEntry, OptionView } from '../protocol.ts';
import { conversationFor } from './conversations.ts';

export type SceneKind =
  | 'meal'
  | 'workshop'
  | 'street'
  | 'door'
  | 'tea'
  | 'call'
  | 'mosque'
  | 'memory'
  | 'grave'
  | 'clinic';
export interface DayScene {
  id: string;
  kind: SceneKind;
  place: string;
  clock: string;
  names: string[];
  lines: { speaker: string; words: string }[];
  /** False means the scene is retained history, never an assertion that he is still there. */
  current: boolean;
  activity: string;
}
type SceneFrame = Pick<Frame, 'day' | 'minute' | 'clock' | 'halil' | 'log'>;
type Setting = { kind: SceneKind; place: string; names: string[] };
function setting(entry: LogEntry): Setting | null {
  if (
    entry.kind === 'recall' &&
    (/Nuran/.test(entry.text) || entry.text === 'He remembers: the clinic, the day they found her illness.')
  )
    return { kind: 'memory', place: 'A memory of Nuran', names: ['Halil'] };
  if (
    entry.kind === 'voice' &&
    entry.who === 'hacer' &&
    /^Hacer(?: says |(?:, his neighbour,)? at the door:)/.test(entry.text)
  )
    return { kind: 'door', place: 'At his door', names: ['Halil', 'Hacer'] };
  if (entry.kind === 'voice' && entry.who === 'doctor')
    return { kind: 'clinic', place: 'The clinic', names: ['Halil', 'The doctor'] };
  if (entry.kind === 'voice' && entry.who === 'selin' && /^Selin called/.test(entry.text))
    return { kind: 'call', place: 'On the phone', names: ['Halil', 'Selin'] };
  if (entry.kind !== 'act' || entry.who !== 'halil') return null;
  const text = entry.text;
  if (/^I (?:eat at home|have (?:suhoor|iftar))\b/.test(text))
    return { kind: 'meal', place: 'At home · the table', names: ['Halil'] };
  if (/^I (?:repair in the workshop|take an afternoon shift)\b/.test(text))
    return { kind: 'workshop', place: 'The workshop', names: ['Halil'] };
  if (/^I walk by the river\b/.test(text)) return { kind: 'street', place: 'By the river', names: ['Halil'] };
  if (/^I talk with Hacer at the door\b/.test(text))
    return { kind: 'door', place: 'At his door', names: ['Halil', 'Hacer'] };
  if (/^I (?:have )?tea with Rıza\b/.test(text))
    return { kind: 'tea', place: 'The tea house', names: ['Halil', 'Rıza'] };
  if (/^I call Selin\b/.test(text)) return { kind: 'call', place: 'On the phone', names: ['Halil', 'Selin'] };
  if (/^I visit Nuran['’]s grave\b/.test(text))
    return { kind: 'grave', place: 'Nuran’s grave', names: ['Halil'] };
  return null;
}
const ORDINARY: Record<'workshop' | 'street', readonly (readonly [string, string, string, string])[]> = {
  workshop: [
    [
      'Do you mind if I watch?',
      'Not at all. There is not much to see just yet.',
      'You look closely at everything.',
      'It is easier when I take one part at a time.',
    ],
    [
      'Is it fiddly work?',
      'Sometimes. I have done it a long time.',
      'Does that make it easier?',
      'It makes it familiar. That is something.',
    ],
    [
      'You are quiet when you work.',
      'I am looking at what is in front of me.',
      'I will leave you to it, then.',
      'You can stay. I do not mind the company.',
    ],
  ],
  street: [
    [
      'Out for a walk, Halil?',
      'Just along the river for a while.',
      'No hurry, then?',
      'Not for this little stretch.',
    ],
    [
      'Good to see you out.',
      'It is good to be out for a while.',
      'Going far?',
      'I have not decided. Just walking.',
    ],
    [
      'A quiet walk?',
      'That was the idea.',
      'I will not keep you.',
      'A hello does not hurt. It is good to see someone.',
    ],
  ],
};
function hash(text: string): number {
  let value = 2166136261;
  for (const char of text) value = Math.imul(value ^ char.charCodeAt(0), 16777619);
  return value >>> 0;
}
/** The latest grounded scene today, retained with an explicit history flag after he leaves it. */
export function deriveScene(frame: SceneFrame): DayScene | null {
  const log = frame.log.filter((entry) => entry.day === frame.day && entry.minute <= frame.minute);
  let anchor = log.findLast((entry) => setting(entry) !== null);
  if (anchor?.kind === 'recall') {
    const occasion = log.findLast(
      (entry) => entry.minute === anchor?.minute && entry.kind !== 'recall' && setting(entry) !== null,
    );
    if (occasion) anchor = occasion;
  }
  if (!anchor) return null;
  const place = setting(anchor);
  if (!place) return null;
  const anchorIndex = log.indexOf(anchor);
  const latestActIndex = log.findLastIndex((entry) => entry.kind === 'act' && entry.who === 'halil');
  const precedingAct = log
    .slice(0, anchorIndex + 1)
    .findLast((entry) => entry.kind === 'act' && entry.who === 'halil');
  const doing = frame.halil.doing;
  const matchingActivity =
    !!doing &&
    !!precedingAct &&
    precedingAct.text.replace(/^I have tea with Rıza\b/, 'I tea with Rıza').startsWith(`I ${doing.label}`);
  // A recall or delivered remark belongs to the activity before it, even at the same minute.
  // Array order distinguishes a later act; a timestamp alone cannot do that.
  const superseded = latestActIndex > anchorIndex;
  const current = !superseded && (!doing || matchingActivity);
  let lines: DayScene['lines'] = conversationFor(anchor, log);
  if (place.kind === 'door' && anchor.kind === 'voice') {
    lines = [
      {
        speaker: 'Hacer',
        words: anchor.text.replace(/^Hacer(?: says |(?:, his neighbour,)? at the door:\s*)/, ''),
      },
      { speaker: 'Halil', words: 'I am listening, Hacer.' },
    ];
  } else if (place.kind === 'memory') {
    lines = [{ speaker: 'Halil', words: anchor.text.replace(/^He remembers:\s*/, '') }];
  } else if (place.kind === 'meal') {
    const memory = log.findLast(
      (entry) => entry.minute <= anchor.minute && entry.kind === 'recall' && /Nuran/.test(entry.text),
    );
    if (!memory) return null;
    lines = [
      { speaker: 'Scene', words: 'At the table, an earlier memory of Nuran is with him.' },
      { speaker: 'Halil', words: memory.text.replace(/^He remembers:\s*/, '') },
      { speaker: 'Halil', words: 'I miss you, Nuran.' },
    ];
  } else if (place.kind === 'workshop' || place.kind === 'street') {
    const bank = ORDINARY[place.kind];
    const pair = bank[hash(`${anchor.day}|${anchor.minute}|${anchor.text}`) % bank.length];
    const other = place.kind === 'workshop' ? 'A customer' : 'A neighbour';
    place.names = ['Halil', other];
    if (pair) lines = pair.map((words, index) => ({ speaker: index % 2 === 0 ? other : 'Halil', words }));
  } else if (place.kind === 'clinic') {
    lines = [
      { speaker: 'Halil', words: 'Tell me plainly.' },
      { speaker: 'The doctor', words: anchor.text.replace(/^The doctor said /i, '') },
      { speaker: 'Halil', words: 'There is a lot to take in.' },
    ];
  } else if (place.kind === 'grave') {
    lines = [{ speaker: 'Halil', words: 'I miss you, Nuran.' }];
  }
  return {
    id: `scene:${anchor.id}`,
    ...place,
    clock: anchor.clock,
    lines,
    current,
    activity: doing?.label ?? '',
  };
}
const LABELS: Readonly<Record<string, string>> = {
  'talk:hacer': 'Talk with Hacer at the door',
  'tea:riza': 'Have tea with Rıza',
  'call:selin': 'Call Selin',
  'see-doctor': 'See the doctor at the clinic',
  rest: 'Rest at home',
  'work-repair': 'Work in the workshop',
  'work-extra': 'Take the afternoon shift',
  walk: 'Walk by the river',
  eat: 'Eat at home',
};
const CHOICES: Record<SceneKind, readonly string[]> = {
  meal: ['call:selin', 'talk:hacer', 'walk', 'rest'],
  workshop: ['tea:riza', 'rest', 'talk:hacer'],
  street: ['tea:riza', 'call:selin', 'rest'],
  door: ['talk:hacer', 'rest', 'tea:riza'],
  tea: ['tea:riza', 'call:selin', 'rest'],
  call: ['call:selin', 'rest', 'talk:hacer'],
  mosque: ['tea:riza', 'talk:hacer', 'rest'],
  memory: ['call:selin', 'talk:hacer', 'tea:riza', 'rest'],
  grave: ['call:selin', 'tea:riza', 'rest'],
  clinic: ['rest', 'call:selin', 'walk'],
};
/** A small literal vocabulary over offered actions. These are suggestions, never invented dialogue topics. */
export function sceneChoices(
  scene: DayScene | null,
  options: readonly OptionView[],
): { label: string; draft: Draft }[] {
  const social = ['call:selin', 'talk:hacer', 'tea:riza'];
  const clinicConcern =
    scene?.current &&
    (scene.kind === 'clinic' || scene.lines.some((line) => /clinic|doctor/i.test(line.words)));
  const preferences = clinicConcern
    ? ['see-doctor', ...CHOICES[scene.kind]]
    : scene?.current
      ? CHOICES[scene.kind]
      : social;
  const offered = new Map(options.map((option) => [option.id, option]));
  const candidates = [...new Set([...preferences, ...social, ...options.map((option) => option.id)])];
  return candidates
    .filter((id) => offered.has(id) && !/pray|prayer|worship/i.test(`${id} ${offered.get(id)?.label ?? ''}`))
    .slice(0, 2)
    .map((id) => ({
      label:
        id === 'talk:hacer' && scene?.current && scene.kind === 'door'
          ? 'Stay and talk with Hacer'
          : (LABELS[id] ?? offered.get(id)?.label ?? id),
      draft: { optionId: id, strength: 'mention', insist: false },
    }));
}
