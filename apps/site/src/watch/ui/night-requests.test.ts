import { describe, expect, it } from 'vitest';
import { applyInput, newGame } from '../sim/night.ts';
import type { NightAct } from '../sim/night-actions.ts';
import { buildFrame } from '../sim/view.ts';
import { groupedUnavailable, retainedNightActs } from './night-requests.ts';

function context() {
  const state = newGame(4242);
  applyInput(state, { k: 'start' });
  applyInput(state, { k: 'begin' });
  const frame = buildFrame(state, 0, false);
  const who = frame.watchers.find((w) => w.id === 'tamar');
  if (!who) throw new Error('Expected Tamar');
  who.post = 'gate-1';
  who.acts = [];
  who.actsUnavailable = null;
  const seen: NightAct[] = ['kian', 'mara'].map((by) => ({
    input: { k: 'relieve', who: who.id, by },
    label: `Send ${by}`,
    read: 'likely',
    available: true,
  }));
  return { frame, who, seen };
}

describe('retained night requests use current public evidence', () => {
  it('groups a newer healthy look once rather than once per helper', () => {
    const { frame, who, seen } = context();
    for (const helper of frame.watchers) {
      helper.account = { text: 'I’m here.', spoken: true };
      helper.post = 'gate-2';
    }
    const before = JSON.stringify(frame);
    const acts = retainedNightActs(frame, who, seen);
    expect(groupedUnavailable(acts, frame)).toEqual([
      'Kian, Mara: The latest look no longer shows tiredness.',
    ]);
    expect(acts.every((act) => !act.available)).toBe(true);
    expect(JSON.stringify(frame)).toBe(before);
  });
  it.each([
    ['They appear asleep. No reply comes.', 'They appear asleep. No reply comes.'],
    ['No reply comes from the dark.', 'No reply comes from the dark.'],
    ['Too far away for your voice to reach.', 'Too far away for your voice to reach.'],
  ])('keeps the known helper reason: %s', (text, expected) => {
    const { frame, who, seen } = context();
    const helper = frame.watchers.find((w) => w.id === 'kian');
    if (!helper) throw new Error('Expected Kian');
    helper.post = 'mill-1';
    helper.account = { text, spoken: false };
    expect(retainedNightActs(frame, who, seen)[0]?.read).toBe(expected);
  });
  it('names a downed recipient instead of guessing that tiredness disappeared', () => {
    const { frame, who, seen } = context();
    who.account = { text: 'They are down and cannot answer.', spoken: false };
    who.acts = [
      { input: { k: 'help', who: who.id, by: 'kian' }, label: 'Send Kian', read: 'likely', available: true },
    ];
    expect(retainedNightActs(frame, who, seen)[0]?.read).toBe('They are down and cannot answer.');
  });
  it('names a departed helper without substituting a condition guess', () => {
    const { frame, who, seen } = context();
    frame.watchers = frame.watchers.filter((w) => w.id !== 'kian');
    expect(retainedNightActs(frame, who, seen)[0]?.read).toBe('No longer on this watch.');
    const mara = frame.watchers.find((w) => w.id === 'mara');
    if (!mara) throw new Error('Expected Mara');
    mara.post = null;
    mara.place = 'home';
    expect(retainedNightActs(frame, who, seen)[1]?.read).toBe('Away from the wall and hall.');
  });
  it('groups helpers beyond voice reach once per destination', () => {
    const { frame, seen } = context();
    const acts = seen.map((act) => ({
      ...act,
      available: false,
      read: `Too far to call ${act.label} from here; carry the light to the east wall.`,
    }));
    expect(groupedUnavailable(acts, frame)).toEqual([
      'Kian, Mara: Out of your voice; carry the light to the east wall.',
    ]);
  });
  it('uses the recipient reason once and drops all retained acts off the wall', () => {
    const { frame, who, seen } = context();
    who.actsUnavailable = 'Out of your voice: the lantern is at the Gate.';
    expect(groupedUnavailable(retainedNightActs(frame, who, seen), frame)).toEqual([
      'Kian, Mara: Out of your voice: the lantern is at the Gate.',
    ]);
    who.post = null;
    expect(retainedNightActs(frame, who, seen)).toEqual([]);
  });
});
