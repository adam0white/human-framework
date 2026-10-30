import { describe, expect, test } from 'vitest';
import { compareMonths, type MonthFacts } from './counterfactual.ts';

describe('the month comparison', () => {
  test('folds differences beyond six rows into one line, smallest levers first', () => {
    const mine: MonthFacts = {
      dateKept: true,
      firstPayDay: 14,
      firstPay: 300,
      paidByEid: 600,
      hisCalls: 4,
      herCalls: 15,
      eidCall: 'his',
      clinic: 1,
      firstClinicDay: 3,
      shifts: 2,
      walks: 20,
      smokeDays: 8,
      owedAfter: 'Nothing owed to Osman.',
    };
    const silent: MonthFacts = {
      ...mine,
      dateKept: false,
      firstPayDay: 17,
      paidByEid: 300,
      hisCalls: 0,
      eidCall: 'hers',
      clinic: 0,
      shifts: 0,
      walks: 0,
      smokeDays: 22,
      owedAfter: '300 still owed to Osman.',
    };
    const v = compareMonths(mine, silent);
    expect(v.rows.map((r) => r.topic)).toEqual([
      'Osman',
      'Selin in Ramadan',
      'Selin on Eid',
      'The clinic',
      'Cigarettes',
      'Osman after Eid',
    ]);
    expect(v.smaller).toBe('Smaller differences: the afternoon shift and walks by the river.');
    expect(v.same).toBe('');
    expect(compareMonths(mine, mine).same).toMatch(/^Both months came out the same: Osman, /);
  });
});
