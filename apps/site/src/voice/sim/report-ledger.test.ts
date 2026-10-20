import { expect, it } from 'vitest';
import { eidLedger } from './report.ts';
import { TOWN_EID_DAY } from './town.ts';
import type { Cell } from './view.ts';

it('distinguishes Ramadan actions from actions on Eid', () => {
  const cell = (id: string, day: number) => ({ affordanceId: id, from: day * 1440 }) as Cell;
  const said = {
    walk: { label: 'walk after iftar', played: 1, days: 14 },
    'pay-rent': { label: 'pay Osman', played: 1, days: 0 },
  };
  const month = [cell('walk', 15), cell('pay-rent', 16)];
  const missing = eidLedger({ cells: month, said });
  expect(missing.map((x) => x.eid)).toEqual(['Not on Eid.', 'Not on Eid.']);
  const withEid = eidLedger({ cells: [...month, cell('walk', TOWN_EID_DAY)], said });
  expect(withEid[0]?.eid).toMatch(/^Once, first at/);
  expect(withEid[1]?.eid).toBe('Not on Eid.');
});

it('preserves rules-1 report wording without changing the Eid action counts', () => {
  const said = { walk: { label: 'walk after iftar', played: 1, days: 14 } };
  const historic = eidLedger({ cells: [], said, legacyLedgerWords: true });
  const current = eidLedger({ cells: [], said });
  expect(historic[0]?.eid).toBe('Not at all.');
  expect(current[0]?.eid).toBe('Not on Eid.');
  expect(historic[0]?.times).toBe(current[0]?.times);
});
