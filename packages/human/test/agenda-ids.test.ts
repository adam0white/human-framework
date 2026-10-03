import { describe, expect, test } from 'vitest';
import { createAgenda, promise } from '../src/agenda/index.ts';
import type { Person } from '../src/types.ts';

const base = { kind: 'appointment' as const, actions: ['visit'], from: 0, until: 60, importance: 0.5 };

describe('createAgenda commitment ids', () => {
  test('spec commitments without an id receive unique ids', () => {
    const agenda = createAgenda({ commitments: [base, base, base] }, 0);
    const ids = agenda.commitments.map((c) => c.id);
    expect(ids.every((id) => id.length > 0)).toBe(true);
    expect(new Set(ids).size).toBe(3);
  });

  test('explicit ids are kept and generated ids avoid them, wherever they appear', () => {
    const agenda = createAgenda(
      { commitments: [base, { ...base, id: 'c1' }, { ...base, id: 'c2' }, base] },
      0,
    );
    const ids = agenda.commitments.map((c) => c.id);
    expect(ids[1]).toBe('c1');
    expect(ids[2]).toBe('c2');
    expect(new Set(ids).size).toBe(4);
  });

  test('later promises do not reuse spec ids', () => {
    const p = {
      id: 'p1',
      agenda: createAgenda({ commitments: [base, { ...base, id: 'c2' }] }, 0),
    } as unknown as Person;
    const made = promise(p, base);
    expect(p.agenda.commitments.filter((c) => c.id === made.id)).toHaveLength(1);
  });
});
