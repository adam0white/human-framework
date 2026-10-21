import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { createServer, type ServerResponse } from 'node:http';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe.skipIf(!process.env.PLAYWRIGHT_MODULE)('lab:play with a real browser', () => {
  it.each([['Rest', null]])(
    'refuses stale %s and refreshes controls with %s',
    async (requested, current) => {
      const root = join(homedir(), 'code/.lab-scratch/labplay-fix');
      await mkdir(root, { recursive: true });
      const out = await mkdtemp(join(root, 'integration-'));
      let waitingChange: ServerResponse | undefined;
      let waitingConfirmation: ServerResponse | undefined;
      const site = createServer((request, response) => {
        if (request.url === '/change') {
          if (request.method === 'POST') waitingConfirmation = response;
          else waitingChange = response;
          if (waitingConfirmation && waitingChange) waitingChange.end('change');
          return;
        }
        if (request.url === '/changed') {
          response.end();
          waitingConfirmation?.end('changed');
          return;
        }
        response.setHeader('Content-Type', 'text/html');
        response.end(`<!doctype html><html lang="en"><body>
        <button onclick="document.querySelector('p').textContent = 'Activated ' + this.textContent">${requested}</button><p>Before dawn</p>
        <script>fetch('/change').then(() => {
          ${current === null ? "document.querySelector('button').remove();" : `document.querySelector('button').textContent = ${JSON.stringify(current)};`}
          document.querySelector('p').textContent = 'Dawn';
          return fetch('/changed');
        });</script></body></html>`);
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
      const driver = spawn(
        process.execPath,
        [
          resolve('scripts/lab-play.ts'),
          `url=http://127.0.0.1:${siteAddress.port}`,
          `out=${out}`,
          `port=${address.port}`,
          'device=phone',
          'floor=0',
          'ceiling=2',
        ],
        { env: { ...process.env, LAB_PLAY_ALLOW_STALE: '1' } },
      );
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
        expect(opened.body.controls).toContain(`button "${requested}"`);
        // Change the fixture after its initial snapshot, without refreshing the driver's cache.
        const changed = await fetch(`http://127.0.0.1:${siteAddress.port}/change`, {
          method: 'POST',
          signal: AbortSignal.timeout(40_000),
        });
        expect(changed.status).toBe(200);
        const tapped = await post({ op: 'tap', name: requested });
        expect(tapped.status).toBe(500);
        expect(tapped.body.controls).not.toContain(`button "${requested}"`);
        if (current !== null) expect(tapped.body.controls).toContain(`button "${current}"`);
        expect(tapped.body.visible).toContain('Dawn');
        expect(tapped.body.error).toContain(`${requested} is not on the page now`);
        expect(tapped.body.error).toContain('game state, not a driver failure');
        expect(tapped.body.error).toMatch(/it was listed \d+ s ago/);
        expect(JSON.parse(stdout.trim()).driver).toMatch(/^[a-f0-9]+$/);
        expect(tapped.body.snapshot_ms).toBeTypeOf('number');
        const lines = (await readFile(join(out, 'wall-clock.jsonl'), 'utf8')).trim().split('\n');
        expect(JSON.parse(lines.at(-1) ?? '{}').requested_control_present_before).toBe(false);
        // The replacement is actionable, but only when it is requested by its current name.
        if (current !== null) {
          const exact = await post({ op: 'tap', name: current });
          expect(exact.status).toBe(200);
          expect(exact.body.visible).toContain(`Activated ${current}`);
        }
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
    },
    90_000,
  );

  it('skips disabled name duplicates and refuses enabled duplicates; scrolls a text control into view', async () => {
    await withTextFixture('phone', async (post) => {
      await post({ op: 'open' });
      const tapped = await post({ op: 'tap', name: 'Promise it' });
      expect(tapped.status).toBe(200);
      expect(tapped.body.visible).toContain('promises 1');
      const duplicate = await post({ op: 'tap', name: 'As it comes' });
      expect(duplicate.status).toBe(500);
      expect(duplicate.body.error).toMatch(/2 enabled controls are named As it comes.*\(\d+,\d+\)/);
      expect(duplicate.body.visible).toContain('promises 1');
      const far = await post({ op: 'tap', text: 'Far away' });
      expect(far.status).toBe(200);
      expect(far.body.visible).toContain('far clicked');
    });
  });

  it.each(['desktop', 'phone'])(
    'taps a %s control again while its hover tooltip is visible',
    async (device) => {
      await withTextFixture(device, async (post) => {
        expect((await post({ op: 'open' })).status).toBe(200);
        const first = await post({ op: 'tap', text: 'cart' });
        expect(first.status).toBe(200);
        expect(first.body.visible).toContain('cart clicks 1');
        expect(first.body.visible).toContain('wood 30');
        const second = await post({ op: 'tap', text: 'cart' });
        expect(second.status).toBe(200);
        expect(second.body.visible).toContain('cart clicks 2');
        const tooltipLabel = await post({ op: 'tap', text: 'cart wood 30' });
        expect(tooltipLabel.status).toBe(500);
        expect(tooltipLabel.body.visible).toContain('cart clicks 2');
        const fragment = await post({ op: 'tap', text: 'Idris' });
        expect(fragment.status).toBe(500);
        expect(fragment.body.visible).toContain('other clicks 0');
        // A different complete label must never qualify through its direct text prefix.
        await post({ op: 'tap', name: 'Change label' });
        const changed = await post({ op: 'tap', text: 'cart' });
        expect(changed.status).toBe(500);
        expect(changed.body.visible).toContain('cart clicks 2');
        expect(changed.body.visible).toContain('cart tomorrow');
        await post({ op: 'tap', name: 'Restore label' });
        await post({ op: 'tap', name: 'Duplicate label' });
        const duplicate = await post({ op: 'tap', text: 'cart' });
        expect(duplicate.status).toBe(500);
        expect(duplicate.body.error).toContain('matches 2 controls; tap by point');
        expect(duplicate.body.visible).toContain('cart clicks 2');
        expect(duplicate.body.visible).toContain('other clicks 0');
      });
    },
    90_000,
  );
});

async function withTextFixture(
  device: string,
  run: (post: (op: object) => Promise<{ status: number; body: Record<string, unknown> }>) => Promise<void>,
) {
  const root = join(homedir(), 'code/.lab-scratch/labplay-fix');
  await mkdir(root, { recursive: true });
  const out = await mkdtemp(join(root, `tooltip-${device}-`));
  const site = createServer((_request, response) => {
    response.setHeader('Content-Type', 'text/html');
    response.end(`<!doctype html><html lang="en"><meta name="viewport" content="width=device-width, initial-scale=1"><style>
      button, .button { display:block; width:180px; min-height:44px; margin:12px; cursor:pointer; }
      .button { position:relative; border:1px solid; }
      .tooltip { display:none; position:absolute; left:190px; top:0; width:100px; }
      .button:hover .tooltip { display:block; }
      [hidden] { display:none; }
    </style><body>
      <div id="cart" class="button" onclick="count++;document.querySelector('#count').textContent='cart clicks '+count">cart<div class="tooltip">wood 30</div></div>
      <p id="count">cart clicks 0</p><p id="other-count">other clicks 0</p>
      <button onclick="document.querySelector('#cart').firstChild.data='cart tomorrow'">Change label</button>
      <button onclick="document.querySelector('#cart').firstChild.data='cart'">Restore label</button>
      <button onclick="document.querySelector('#other').hidden=false">Duplicate label</button>
      <button id="other" hidden onclick="other++;document.querySelector('#other-count').textContent='other clicks '+other">cart</button>
      <button onclick="other++;document.querySelector('#other-count').textContent='other clicks '+other">Send <span role="img" style="cursor:pointer">Idris</span> home</button>
      <button disabled>Promise it</button>
      <button onclick="document.querySelector('#promises').textContent='promises 1'">Promise it</button>
      <p id="promises">promises 0</p>
      <button onclick="document.querySelector('#promises').textContent='wrong'">As it comes</button>
      <button onclick="document.querySelector('#promises').textContent='wrong'">As it comes</button>
      <button style="margin-top:2000px" onclick="this.textContent='far clicked'">Far away</button>
      <script>let count=0,other=0;</script></body></html>`);
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
  const driver = spawn(
    process.execPath,
    [
      resolve('scripts/lab-play.ts'),
      `url=http://127.0.0.1:${siteAddress.port}`,
      `out=${out}`,
      `port=${address.port}`,
      `device=${device}`,
      'floor=0',
      'ceiling=2',
    ],
    { env: { ...process.env, LAB_PLAY_ALLOW_STALE: '1' } },
  );
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
    await run(async (op) => {
      const response = await fetch(`http://127.0.0.1:${address.port}`, {
        method: 'POST',
        body: JSON.stringify(op),
        signal: AbortSignal.timeout(40_000),
      });
      return { status: response.status, body: (await response.json()) as Record<string, unknown> };
    });
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
}
