import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { expect, it, vi } from 'vitest';

vi.mock('node:child_process', () => ({ execFileSync: () => JSON.stringify({ strings: [] }) }));

import { refillReading } from './lab-wai-reading.ts';

it('reads each distinct captured live state once across refill restarts and records its receipt', async () => {
  const scratch = join(homedir(), 'code/.lab-scratch/codex');
  await mkdir(scratch, { recursive: true });
  const root = await mkdtemp(join(scratch, 'wai-refill-test-'));
  try {
    await mkdir(join(root, 'docs/lab'), { recursive: true });
    await writeFile(join(root, 'docs/lab/plain-english.md'), 'Use plain English.');
    const capture = {
      game: 'voice',
      url: 'https://example.test/voice',
      text: 'A visible line\n```',
      timestamp: '2026-10-27T21:00:00.000Z',
    };
    await writeFile(
      join(root, 'live-text.jsonl'),
      `${JSON.stringify(capture)}\n${JSON.stringify(capture)}\n`,
    );
    const infer = vi.fn(async () => JSON.stringify({ suggestions: [] }));
    const budget = { models: async () => ['@cf/qwen/qwen3-30b-a3b-fp8'], infer };
    const options = { budget, root, directory: root, now: new Date('2026-10-27T22:00:00Z') };
    await refillReading(options);
    await refillReading(options);
    expect(infer).toHaveBeenCalledTimes(1);
    const report = await readFile(join(root, 'reading.md'), 'utf8');
    expect(report).toContain(`    ${JSON.stringify(capture)}`);
    expect(report.match(/## Captured live text voice:/g)).toHaveLength(1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
