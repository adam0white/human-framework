import { expect, test } from 'vitest';
import { importedFileRecord, recordFile } from './file-record.ts';

test('a live run keeps its new identity across exports and cannot inherit an import marker', () => {
  const owner = {};
  const first = recordFile(owner, { runId: 'original', fileImport: { imported: true }, minute: 1 });
  const next = recordFile(owner, { minute: 2 });
  expect(first.runId).toMatch(/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/);
  expect(first.runId).toBe(next.runId);
  expect(first.runId).not.toBe('original');
  expect(first).not.toHaveProperty('fileImport');
  expect(first.minute).toBe(1);
  expect(recordFile({}, {}).runId).not.toBe(first.runId);
});

test('an imported record links its source run and hashes the exact original text', async () => {
  // SHA-256 of "abc" is a fixed external hash vector, independent of our encoder.
  const metadata = await importedFileRecord({ runId: 'source-run' }, 'abc');
  expect(metadata).toEqual({
    imported: true,
    sourceRunId: 'source-run',
    sourceHash: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
  });
  const record = recordFile({}, { runId: 'source-run', fileImport: { forged: true } }, metadata);
  expect(record.fileImport).toEqual(metadata);
  expect(record.runId).not.toBe('source-run');
  expect((await importedFileRecord({}, 'abc\n')).sourceHash).not.toBe(metadata.sourceHash);
});

test('legacy or invalid source identities remain unknown', async () => {
  for (const runId of [undefined, '', '  ', 7, 'x'.repeat(129)]) {
    expect((await importedFileRecord({ runId }, '')).sourceRunId).toBeNull();
  }
});
