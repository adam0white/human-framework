import { describe, expect, it } from 'vitest';
import {
  actionableNames,
  attemptDirectory,
  continueSweep,
  normalizeTapName,
  responseText,
  scheduledDirectory,
  scheduledDue,
  sweepFailure,
} from './lab-wai-play.ts';

describe('Workers AI runner response envelopes', () => {
  it('reads ordinary response and chat content, with reasoning fallback', () => {
    expect(responseText({ response: '{"op":1}' })).toBe('{"op":1}');
    expect(
      responseText({
        choices: [{ message: { content: '{"op":2}', reasoning: 'unused' } }],
      }),
    ).toBe('{"op":2}');
    expect(
      responseText({
        choices: [{ message: { content: '', reasoning: '{"op":3}' } }],
      }),
    ).toBe('{"op":3}');
    expect(() => responseText({ choices: [] })).toThrow('no text response');
  });
  it('isolates explicit attempts without moving the UTC day or accepting traversal', () => {
    const date = new Date('2026-10-24T00:40:00Z');
    const base = attemptDirectory(date);
    expect(attemptDirectory(date, '2')).toBe(`${base}/attempt-2`);
    expect(() => attemptDirectory(date, '../escape')).toThrow('Invalid attempt');
  });
});

describe('visible accessible name transport', () => {
  it('unwraps only an exact, uniquely visible role serialization', () => {
    const controls = '- button "Begin"\n- link "Help"';
    expect(actionableNames(controls)).toEqual([
      { role: 'button', name: 'Begin' },
      { role: 'link', name: 'Help' },
    ]);
    expect(normalizeTapName({ op: 'tap', name: 'button "Begin"' }, controls)).toEqual({
      op: 'tap',
      name: 'Begin',
    });
    expect(normalizeTapName({ op: 'tap', name: 'button "Begin"' }, `${controls}\n- button "Begin"`)).toEqual({
      op: 'tap',
      name: 'button "Begin"',
    });
  });
  it('preserves literal quoted names and mismatched roles', () => {
    const literal = { op: 'tap' as const, name: 'button "Begin"' };
    const controls = `- button ${JSON.stringify(literal.name)}\n- button "Begin"`;
    expect(normalizeTapName(literal, controls)).toEqual(literal);
    const quoted = { op: 'tap' as const, name: 'Say "hello"' };
    expect(normalizeTapName(quoted, `- button ${JSON.stringify(quoted.name)}`)).toEqual(quoted);
    const wrongRole = {
      op: 'tap' as const,
      role: 'link',
      name: 'button "Begin"',
    };
    expect(normalizeTapName(wrongRole, '- button "Begin"')).toEqual(wrongRole);
  });
});

it('runs at 17:50 Chicago across daylight saving time', () => {
  expect(scheduledDue(new Date('2026-10-23T22:50:00Z'))).toBe(true);
  expect(scheduledDue(new Date('2026-11-02T23:50:00Z'))).toBe(true);
  expect(scheduledDue(new Date('2026-10-23T22:51:00Z'))).toBe(false);
});

it('continues a productive daily sweep only within its UTC day', () => {
  const start = new Date('2026-10-23T22:50:00Z');
  expect(continueSweep(start, new Date('2026-10-23T23:59:00Z'), 1, false)).toBe(true);
  expect(continueSweep(start, new Date('2026-10-24T00:00:00Z'), 1, false)).toBe(false);
  expect(continueSweep(start, start, 0, false)).toBe(false);
  expect(continueSweep(start, start, 1, true)).toBe(false);
});

it('continues after only a definite local cap refusal', () => {
  expect(sweepFailure('STOP: daily neuron cap reached')).toBe('next');
  expect(sweepFailure('STOP: shared daily admission unavailable or capped; reservation retained')).toBe(
    'stop',
  );
  expect(sweepFailure('USAGE LIMIT: Workers AI HTTP 429; stop')).toBe('stop');
});

it('separates scheduled receipts from manually run receipts', () => {
  const date = new Date('2026-10-23T22:50:00Z');
  expect(scheduledDirectory(date)).toBe(`${attemptDirectory(date)}/scheduled`);
});
