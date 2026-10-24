/**
 * Read-only scene presentation. Recorded acts anchor UI-authored incidental exchanges (incidental customers and neighbours); recorded recalls alone
 * supply Nuran's memories. No scene changes an input, advances time, or consumes simulation randomness.
 * These incidental speakers are narrative presentation, not simulated people or recorded events.
 * It does not infer completed acts, future encounters, consequential requests, or named people’s availability.
 */
import type { Draft, Frame, LogEntry, OptionView, Prefill } from '../protocol.ts';
import { TOWN_DEFAULTS, TOWN_EID_DAY } from '../sim/town.ts';
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
/** Recall wording is presentation only; the recorded recall remains unchanged. */
function memoryWords(text: string): string {
  const memory = text.replace(/^He remembers:\s*/, '').replace(/[.!?]$/, '');
  if (/^the clinic, the day they found her illness$/i.test(memory))
    return 'I remember learning about Nuran’s illness at the clinic.';
  return `I remember ${memory.replace(/, at/g, ' at').replace(/, last Ramadan/g, ' last Ramadan')}.`;
}
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
      'I am walking along the river for a while.',
      'You are in no hurry, then?',
      'I am in no hurry on this short walk.',
    ],
    [
      'It is good to see you out.',
      'It is good to be out for a while.',
      'Are you going far?',
      'I have not decided. I am just walking.',
    ],
    [
      'Are you taking a quiet walk?',
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
    lines = [{ speaker: 'Halil', words: memoryWords(anchor.text) }];
  } else if (place.kind === 'meal') {
    const memory = log.findLast(
      (entry) => entry.minute <= anchor.minute && entry.kind === 'recall' && /Nuran/.test(entry.text),
    );
    if (!memory) return null;
    lines = [
      { speaker: 'Scene', words: 'Halil remembers Nuran as he sits at the table.' },
      { speaker: 'Halil', words: memoryWords(memory.text) },
      { speaker: 'Halil', words: 'I miss you, Nuran.' },
    ];
  } else if (place.kind === 'workshop' || place.kind === 'street') {
    const bank = ORDINARY[place.kind];
    const pair = bank[hash(`${anchor.day}|${anchor.minute}|${anchor.text}`) % bank.length];
    // A day's visitor keeps the same identity across repairs/walks and replayed occasions.
    const identities = ['Mrs Aydın', 'Mr Demir', 'The baker’s boy'] as const;
    const other = identities[hash(`${frame.day}|${place.kind}`) % identities.length] ?? identities[0];
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
  'talk:hacer': 'Go and talk with Hacer.',
  'tea:riza': 'Go and have tea with Rıza.',
  'call:selin': 'Give Selin a call.',
  'see-doctor': 'Go and see the doctor.',
  rest: 'Go home and rest.',
  'work-repair': 'Go and do some repairs.',
  'work-extra': 'Take the afternoon shift.',
  walk: 'Go for a walk by the river.',
  eat: 'Have something to eat at home.',
  sleep: 'Go to sleep.',
  drink: 'Have some water.',
  wait: 'Give yourself a moment.',
  smoke: 'Have a cigarette.',
  'visit-grave': 'Go and visit Nuran’s grave.',
  shop: 'Go to the market for Eid.',
  'pay-rent': 'Go and pay Osman the rent.',
};
const CONTINUATIONS: Partial<Record<SceneKind, readonly [string, string]>> = {
  door: ['talk:hacer', 'Hacer is here. Stay and talk.'],
  tea: ['tea:riza', 'Stay for tea with Rıza.'],
  call: ['call:selin', 'Stay on the phone with Selin.'],
};
/** A familiar routine, never a promised future event or knowledge of another person's state. */
export function nextEncounter(frame: SceneFrame): string | null {
  if (frame.day > TOWN_EID_DAY) return null;
  const lastCall = frame.log.findLast(
    (entry) =>
      entry.minute <= frame.minute &&
      ((entry.kind === 'act' && /^I call Selin\b/.test(entry.text)) ||
        (entry.kind === 'voice' && entry.who === 'selin' && /^Selin called/.test(entry.text))),
  );
  if (lastCall && frame.minute - lastCall.minute < TOWN_DEFAULTS.selinCallGap)
    return frame.day < TOWN_EID_DAY ? 'Selin usually leaves a day or two between calls.' : null;
  if (frame.minute % 1440 < 22 * 60) return 'Selin usually calls this evening.';
  return frame.day < TOWN_EID_DAY ? 'Selin usually calls tomorrow evening.' : null;
}
const CHOICES: Record<SceneKind, readonly string[]> = {
  meal: ['call:selin', 'talk:hacer', 'walk', 'rest'],
  workshop: ['tea:riza', 'talk:hacer', 'rest'],
  street: ['tea:riza', 'call:selin', 'rest'],
  door: ['talk:hacer', 'rest', 'tea:riza'],
  tea: ['tea:riza', 'call:selin', 'rest'],
  call: ['call:selin', 'rest', 'talk:hacer'],
  mosque: ['tea:riza', 'talk:hacer', 'rest'],
  memory: ['call:selin', 'talk:hacer', 'tea:riza', 'rest'],
  grave: ['call:selin', 'tea:riza', 'rest'],
  clinic: ['rest', 'call:selin', 'walk'],
};
/** Short inner-voice lines over offered actions; never invented dialogue topics or extra inputs. */
export function sceneChoices(
  scene: DayScene | null,
  options: readonly OptionView[],
  competing?: Prefill,
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
  const continuation = scene?.current ? CONTINUATIONS[scene.kind] : undefined;
  const offered = new Map(options.map((option) => [option.id, option]));
  const candidates = [
    ...new Set([
      ...(competing ? [competing.optionId] : []),
      ...(continuation ? [continuation[0]] : []),
      ...(clinicConcern ? ['see-doctor'] : []),
      ...preferences,
      ...social,
      ...options.map((option) => option.id),
    ]),
  ];
  return candidates
    .filter((id) => offered.has(id) && !/pray|prayer|worship/i.test(`${id} ${offered.get(id)?.label ?? ''}`))
    .slice(0, 2)
    .map((id) => ({
      label:
        id === continuation?.[0]
          ? continuation[1]
          : id === 'rest' && scene?.current && scene.kind === 'workshop'
            ? 'Leave the work for now. Rest at home.'
            : (LABELS[id] ??
              `You could ${offered
                .get(id)
                ?.label.replace(/^./, (letter) => letter.toLowerCase())
                .replace(/[.!?]$/, '')}.`),
      draft: { optionId: id, strength: 'mention', insist: false },
    }));
}
