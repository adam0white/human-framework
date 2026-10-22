import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, it } from 'vitest';

const { linkedUploads, playerNames, legacyPlayer } = await import(
  pathToFileURL(resolve('scripts/lab-inbox-linked.ts')).href
);
const id = (digit: string) => digit.repeat(32);
const record = (index: number, text: string, extra = {}) => ({
  v: 2,
  id: id(String(index + 1)),
  player: id('a'),
  session: id('b'),
  runId: id('c'),
  game: 'pass',
  kind: 'run',
  at: 1,
  build: {},
  data: { encoding: 'json', upload: id('d'), index, total: 2, text },
  ...extra,
});
it('reassembles complete uploads out of order, retaining replay JSON exactly', () => {
  expect(linkedUploads([record(1, 'true}'), record(0, '{"saved":')])).toMatchObject([
    { status: 'complete', value: { saved: true } },
  ]);
});
it('never combines different players, sessions, games, runs or record kinds', () => {
  for (const extra of [
    { player: id('e') },
    { session: id('e') },
    { runId: id('e') },
    { game: 'watch' },
    { kind: 'save' },
  ]) {
    const uploads = linkedUploads([record(0, '{"saved":'), record(1, 'true}', extra)]);
    expect(uploads).toHaveLength(2);
    expect(uploads.every((u: { status: string }) => u.status.startsWith('incomplete'))).toBe(true);
  }
});
it('reports missing, conflicting and malformed uploads without exporting them', () => {
  expect(linkedUploads([record(0, '{}')])[0].status).toContain('incomplete');
  expect(linkedUploads([record(0, '{'), record(0, '['), record(1, '}')])[0]).toMatchObject({
    status: 'conflicting or invalid chunks',
  });
  expect(linkedUploads([record(0, '['), record(1, '}')])[0].status).toBe('invalid assembled JSON');
  expect(
    linkedUploads([
      record(0, '{}', { data: { encoding: 'json', upload: id('d'), index: 0, total: 129, text: '{}' } }),
    ])[0].status,
  ).toContain('invalid');
});

it('accepts complete Unicode chunks within the Worker UTF-8 bound', () => {
  const text = JSON.stringify('界'.repeat(64 * 1024 - 2));
  expect(
    linkedUploads([
      record(0, text, { data: { encoding: 'json', upload: id('d'), index: 0, total: 1, text } }),
    ])[0],
  ).toMatchObject({ status: 'complete', value: '界'.repeat(64 * 1024 - 2) });
});

it('labels an entire player timeline by its latest name and matches only unique legacy labels', () => {
  const records = [
    record(0, '{}', { kind: 'note', at: 3, name: '  Sam  ' }),
    record(1, '{}', { kind: 'note', at: 1, name: 'Old name' }),
    record(2, '{}', { kind: 'note', at: 2, player: id('f'), name: 'Sam' }),
  ];
  const names = playerNames(records);
  expect(names.get(id('a'))).toBe('Sam');
  expect(legacyPlayer({ who: 'Sam' }, names)).toBeUndefined();
  expect(legacyPlayer({ who: id('a') }, names)).toBe(id('a'));
  expect(legacyPlayer({ who: 'Old name' }, names)).toBeUndefined();
  names.delete(id('f'));
  expect(legacyPlayer({ who: ' Sam ' }, names)).toBe(id('a'));
});
