import { describe, expect, it } from 'vitest';
import { actionableNames, attemptDirectory, normalizeTapName, responseText } from './lab-wai-play.ts';

describe('Workers AI runner response envelopes', () => {
  it('reads ordinary response and chat content, with reasoning fallback', () => {
    expect(responseText({ response: '{"op":1}' })).toBe('{"op":1}');
    expect(responseText({ choices: [{ message: { content: '{"op":2}', reasoning: 'unused' } }] })).toBe(
      '{"op":2}',
    );
    expect(responseText({ choices: [{ message: { content: '', reasoning: '{"op":3}' } }] })).toBe('{"op":3}');
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
    const wrongRole = { op: 'tap' as const, role: 'link', name: 'button "Begin"' };
    expect(normalizeTapName(wrongRole, '- button "Begin"')).toEqual(wrongRole);
  });
});
