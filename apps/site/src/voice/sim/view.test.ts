import type { Person } from '@human/framework';
import { describe, expect, test } from 'vitest';
import { reasonLabel, toldLine } from './view.ts';

describe('told lines in the day log', () => {
  const names = { hacer: 'Hacer', riza: 'Rıza', halil: 'Halil', selin: 'Selin' };
  test('ids become names and the speaker is not repeated', () => {
    expect(toldLine('Hacer says riza is lazy', names)).toBe('Hacer says Rıza is lazy.');
  });
  test('advice reads as words, not an action id', () => {
    expect(toldLine('Selin says I should see-doctor', names)).toBe('Selin says he should see the doctor.');
  });
  test('a bare fact about a proposition is not shown', () => {
    expect(toldLine('Halil says halil:should:see-doctor is not so', names)).toBeUndefined();
  });
});

describe('suggestion reasons in the Why sheet', () => {
  const h = { agenda: { commitments: [] } } as unknown as Person;
  test('ids become words', () => {
    expect(reasonLabel('commitment:meal0', h)).toBe('something he had set himself to');
    expect(reasonLabel('distrust', h)).toBe('he does not trust you enough for this');
    expect(reasonLabel('need:energy', h)).not.toContain(':');
    expect(reasonLabel('voice:selin', h)).toBe('he had already said yes to Selin');
  });
});
