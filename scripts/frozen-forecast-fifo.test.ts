import { execFileSync, spawn } from 'node:child_process';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';

it('rejects a named pipe promptly without creating output', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'forecast-fifo-'));
  const fifo = join(dir, 'input.json');
  const output = join(dir, 'receipt.json');
  let child: ReturnType<typeof spawn> | undefined;
  try {
    execFileSync('mkfifo', [fifo]);
    child = spawn(
      process.execPath,
      [
        new URL('./frozen-forecast.ts', import.meta.url).pathname,
        'freeze',
        '--metadata',
        fifo,
        '--out',
        output,
      ],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    );
    const running = child;
    const result = await Promise.race([
      new Promise<{ code: number | null; stderr: string; stdout: string }>((resolve, reject) => {
        let stderr = '';
        let stdout = '';
        running.stderr?.on('data', (data: Buffer) => {
          stderr += data.toString();
        });
        running.stdout?.on('data', (data: Buffer) => {
          stdout += data.toString();
        });
        running.once('error', reject);
        running.once('exit', (code) => resolve({ code, stderr, stdout }));
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('FIFO child timed out after 2 s')), 2000),
      ),
    ]);
    expect(result).toEqual({ code: 2, stderr: 'Frozen forecast: input-invalid\n', stdout: '' });
    await expect(stat(output)).rejects.toThrow();
  } finally {
    if (child?.exitCode === null) {
      child.kill('SIGTERM');
      await new Promise<void>((resolve) => child?.once('exit', () => resolve()));
    }
    await rm(dir, { recursive: true, force: true });
  }
});
