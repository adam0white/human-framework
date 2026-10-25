import { expect, it } from 'vitest';
import { settingWords } from './setting-words.ts';

it('translates displayed imported text while preserving the source record', () => {
  const record = { id: 'salah-fajr', label: 'After I pray Fajr, then I will.', name: 'Hajja Maryam' };
  expect(settingWords(record.label)).toBe('After I pray the dawn prayer, then I will.');
  expect(settingWords(record.name)).toBe('Maryam');
  expect(record).toEqual({
    id: 'salah-fajr',
    label: 'After I pray Fajr, then I will.',
    name: 'Hajja Maryam',
  });
  expect(settingWords('Shawwal 1; Shawwal 7')).toBe('Eid day; day 6 after Eid');
  expect(settingWords('Yusuf Usta remembers iftar.')).toBe('Master Yusuf remembers the sunset meal.');
});
