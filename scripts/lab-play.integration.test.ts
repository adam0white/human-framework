import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe.skipIf(!process.env.PLAYWRIGHT_MODULE)('lab:play with a real browser', () => {
  it('refreshes controls and explains a timed removal after a failed tap', async () => {
    const out = await mkdtemp(join(homedir(), 'code/.lab-scratch/watchwell3/driver/integration-'));
    const site = createServer((_request, response) => {
      response.setHeader('Content-Type', 'text/html');
      response.end(`<!doctype html><html lang="en"><body>
        <button>Rest</button><p>Before dawn</p>
        <script>setTimeout(() => {
          document.querySelector('button').remove();
          document.querySelector('p').textContent = 'Dawn';
        }, 8000);</script></body></html>`);
    });
    site.listen(0, '127.0.0.1');
    await once(site, 'listening');
    const siteAddress = site.address();
    if (!siteAddress || typeof siteAddress === 'string') throw new Error('No site port');
    const reservation = createServer();
    reservation.listen(0, '127.0.0.1');
    await once(reservation, 'listening');
    const address = reservation.address();
    if (!address || typeof address === 'string') throw new Error('No driver port');
    await new Promise<void>((done) => reservation.close(() => done()));
    const driver = spawn(process.execPath, [
      resolve('scripts/lab-play.ts'),
      `url=http://127.0.0.1:${siteAddress.port}`,
      `out=${out}`,
      `port=${address.port}`,
      'device=phone',
      'floor=0',
      'ceiling=2',
    ]);
    await writeFile(join(out, 'driver-pid.txt'), String(driver.pid));
    console.info(`Driver PID ${driver.pid}; artifacts ${out}`);
    let stdout = '';
    let stderr = '';
    driver.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });
    try {
      await new Promise<void>((done, reject) => {
        const timer = setTimeout(() => reject(new Error(`Driver startup timeout: ${stderr}`)), 30_000);
        driver.once('error', reject);
        driver.once('exit', (code) => {
          clearTimeout(timer);
          reject(new Error(`Driver exited ${code}: ${stderr}`));
        });
        driver.stdout.on('data', (data: Buffer) => {
          stdout += data.toString();
          if (stdout.includes('"pid"')) {
            clearTimeout(timer);
            done();
          }
        });
      });
      const post = async (op: object) => {
        const response = await fetch(`http://127.0.0.1:${address.port}`, {
          method: 'POST',
          body: JSON.stringify(op),
        });
        return { status: response.status, body: (await response.json()) as Record<string, unknown> };
      };
      const opened = await post({ op: 'open' });
      expect(opened.status).toBe(200);
      expect(opened.body.controls).toContain('button "Rest"');
      // Wait outside the driver so its last advertised controls still include Rest.
      await new Promise((done) => setTimeout(done, 9000));
      const tapped = await post({ op: 'tap', name: 'Rest' });
      expect(tapped.status).toBe(500);
      expect(tapped.body.controls).not.toContain('button "Rest"');
      expect(tapped.body.visible).toContain('Dawn');
      expect(tapped.body.error).toContain('Rest is not on the page now');
      expect(tapped.body.error).toContain('game state, not a driver failure');
      expect(tapped.body.snapshot_ms).toBeTypeOf('number');
      const lines = (await readFile(join(out, 'wall-clock.jsonl'), 'utf8')).trim().split('\n');
      expect(JSON.parse(lines.at(-1) ?? '{}').requested_control_present_before).toBe(true);
    } finally {
      await writeFile(join(out, 'process-output.txt'), stdout + stderr);
      if (driver.exitCode === null) {
        const exited = once(driver, 'exit');
        driver.kill('SIGTERM');
        await exited;
      }
      site.closeAllConnections();
      await new Promise<void>((done) => site.close(() => done()));
    }
  }, 90_000);
});
