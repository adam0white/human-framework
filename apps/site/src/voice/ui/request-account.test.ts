import { expect, test } from 'vitest';
import type { Frame, LogEntry } from '../protocol.ts';
import { sampleFrame } from '../sim/fixtures.ts';
import { callAccount, requestAccount } from './request-account.ts';

const row = (id: string, kind: LogEntry['kind'], text: string, extra: Partial<LogEntry> = {}): LogEntry => ({
  id,
  kind,
  text,
  who: kind === 'you' ? 'you' : 'halil',
  day: 1,
  minute: 600,
  clock: '10:00',
  ...extra,
});
const frame = (log: LogEntry[]): Frame => ({
  ...structuredClone(sampleFrame),
  day: 1,
  minute: 700,
  log,
  standing: undefined,
});

test('keeps the actual sent line and answer together, without turning agreement into completion', () => {
  const f = frame([
    row('sent', 'you', 'You: mention · take an afternoon shift'),
    row('reply', 'answer', '“After I rest.”', { tone: 'notNow' }),
  ]);
  const before = JSON.stringify(f);
  const account = requestAccount(f);
  expect(account?.id).toBe('sent');
  expect(account?.answer?.text).toBe('“After I rest.”');
  expect(account?.status).toContain('end or result is not recorded');
  expect(JSON.stringify(f)).toBe(before);
});

test('reports waiting, actual begun fact and offered window separately', () => {
  const f = frame([row('sent', 'you', 'You: urge · call Selin')]);
  f.standing = {
    draft: { optionId: 'call:selin', strength: 'urge', insist: false },
    label: 'urge · call Selin',
    since: '10:00',
    expires: '13:00',
    minutesLeft: 80,
    offered: false,
  };
  expect(requestAccount(f)?.status).toContain('Waiting for his answer');
  expect(requestAccount(f)?.window).toContain('not among his current offers');
  f.standing.begun = { clock: '11:35', label: 'call Selin' };
  expect(requestAccount(f)?.status).toContain('Began at 11:35: call Selin');
  expect(requestAccount(f)?.status).not.toContain('completed');
});

test('uses actual refusal, expiry, sleep and withdrawal receipts and never takes an older reply', () => {
  for (const text of [
    'Your suggestion has now ended.',
    'He is asleep. Your suggestion has ended.',
    'You withdraw your suggestion.',
  ]) {
    const f = frame([
      row('old', 'answer', '“Fine.”', { tone: 'yes' }),
      row('sent', 'you', 'You: mention · call Selin'),
      row('end', 'note', text, { who: 'you' }),
    ]);
    expect(requestAccount(f)?.status).toBe(text);
    expect(requestAccount(f)?.answer).toBeUndefined();
  }
  const f = frame([
    row('sent', 'you', 'You: mention · call Selin'),
    row('reply', 'answer', '“No.”', { tone: 'willNot' }),
  ]);
  expect(requestAccount(f)?.status).toContain('declined');
  f.log.push(row('new', 'you', 'You: mention · rest at home', { minute: 620 }));
  expect(requestAccount(f)?.id).toBe('new');
  expect(requestAccount(f)?.answer).toBeUndefined();
});

test('call activity alone proves neither connection nor a missed call', () => {
  expect(callAccount(frame([row('call', 'act', 'I call Selin.', { until: '11:00' })]))).toEqual([]);
  const f = frame([]);
  f.callFacts = {
    connected: { minute: 610, day: 1, clock: '10:10', by: 'halil' },
    missed: { minute: 650, day: 1, clock: '10:50' },
  };
  expect(callAccount(f).map((x) => x.text)).toEqual([
    'Halil’s call to Selin connected. No conversation ending is recorded here.',
    'Selin called, but Halil did not answer. No conversation took place.',
  ]);
});
