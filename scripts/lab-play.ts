/**
 * The lab's standard tester driver, referenced by docs/lab/playtester-prompt.md.
 * Runs one persistent browser page and records visible controls, inputs and wall time.
 * Covers text controls, native selects and scrolling panels; exposes no hidden state,
 * arbitrary evaluation or network inspection. Playwright is optional, resolved only
 * at run time; CI never installs browsers. floor records the intended minimum play
 * duration; ceiling enforces the maximum. Only the first open starts the clock.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { appendFile, mkdir, readdir } from 'node:fs/promises';
import { createServer, type IncomingMessage } from 'node:http';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  driverCheck,
  makeLogLine,
  makePlayReply,
  namedTapRoles,
  type PlayOp,
  type PlaySnapshot,
  parsePlayArgs,
  runPlayOperation,
  validatePlayOp,
} from './lab-play-helpers.ts';

import { textControlPoint } from './lab-play-text.ts';

interface Locator {
  first(): Locator;
  nth(index: number): Locator;
  or(other: Locator): Locator;
  isEnabled(): Promise<boolean>;
  filter(options: { visible: boolean }): Locator;
  count(): Promise<number>;
  click(options: { timeout: number }): Promise<void>;
  fill(text: string, options: { timeout: number }): Promise<void>;
  selectOption(option: { label: string } | { value: string }, options: { timeout: number }): Promise<unknown>;
  innerText(options: { timeout: number }): Promise<string>;
  ariaSnapshot(options: { timeout: number }): Promise<string>;
  scrollIntoViewIfNeeded(options: { timeout: number }): Promise<void>;
  boundingBox(): Promise<{ x: number; y: number; width: number; height: number } | null>;
  evaluate<T, A>(fn: (el: Element, arg: A) => T, arg: A): Promise<T>;
}
interface Page {
  goto(url: string, options: { waitUntil: string; timeout: number }): Promise<unknown>;
  locator(selector: string): Locator;
  getByRole(role: string, options: { name: string | RegExp; exact?: boolean }): Locator;
  getByLabel(name: string, options: { exact: boolean }): Locator;
  getByText(text: string, options: { exact: boolean }): Locator;
  evaluate<T, A>(fn: (arg: A) => T, arg: A): Promise<T>;
  screenshot(options: { path: string; fullPage: boolean; timeout: number }): Promise<unknown>;
  setViewportSize(size: { width: number; height: number }): Promise<void>;
  viewportSize(): { width: number; height: number };
  mouse: {
    click(x: number, y: number): Promise<void>;
    move(x: number, y: number): Promise<void>;
    wheel(dx: number, dy: number): Promise<void>;
  };
  touchscreen: { tap(x: number, y: number): Promise<void> };
  keyboard: { press(key: string): Promise<void>; insertText(text: string): Promise<void> };
}
interface Browser {
  newPage(options: object): Promise<Page>;
  close(): Promise<void>;
}
interface Playwright {
  chromium: { executablePath(): string; launch(options: { headless: boolean }): Promise<Browser> };
}
async function loadPlaywright(): Promise<Playwright> {
  const require = createRequire(import.meta.url);
  const candidates = [process.env.PLAYWRIGHT_MODULE, 'playwright'];
  try {
    for (const dir of await readdir(resolve(homedir(), '.npm/_npx')))
      candidates.push(resolve(homedir(), '.npm/_npx', dir, 'node_modules/playwright'));
  } catch {
    /* optional npm cache */
  }
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      const imported = await import(pathToFileURL(require.resolve(candidate)).href);
      const module = (imported.chromium ? imported : imported.default) as Playwright | undefined;
      if (
        module &&
        typeof module.chromium?.launch === 'function' &&
        existsSync(module.chromium.executablePath())
      )
        return module;
    } catch {
      /* try next optional installation */
    }
  }
  throw new Error(
    'Browser unavailable. Set PLAYWRIGHT_MODULE to an installed playwright module with Chromium.',
  );
}
const visible = (locator: Locator) => locator.filter({ visible: true }).first();
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// An on-screen point where the element (or the container it sits in) receives the tap, or null
// when something else covers it.
function uncoveredPoint(el: Element, centre: boolean): { x: number; y: number } | null {
  if (el.matches(':disabled, [aria-disabled="true"]') || el.closest('[aria-disabled="true"]')) return null;
  if (centre) el.scrollIntoView({ block: 'center', inline: 'nearest' });
  const box = el.getBoundingClientRect();
  for (const fy of [0.5, 0.3, 0.7, 0.15, 0.85])
    for (const fx of [0.5, 0.3, 0.7, 0.15, 0.85]) {
      const x = box.left + box.width * fx;
      const y = box.top + box.height * fy;
      if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) continue;
      const hit = document.elementFromPoint(x, y);
      // An ancestor counts too: scene cards may pass taps to a delegating parent.
      if (hit && (hit === el || el.contains(hit) || hit.contains(el))) return { x, y };
    }
  return null;
}

function scrollPanel(arg: { x: number; y: number; dy: number; previous?: number[] }): number[] {
  const panels: Element[] = [];
  for (let element = document.elementFromPoint(arg.x, arg.y); element; element = element.parentElement) {
    if (
      /(auto|scroll)/.test(getComputedStyle(element).overflowY) &&
      element.scrollHeight > element.clientHeight
    )
      panels.push(element);
  }
  if (document.scrollingElement && !panels.includes(document.scrollingElement))
    panels.push(document.scrollingElement);
  if (arg.previous && panels.every((panel, i) => panel.scrollTop === arg.previous?.[i])) {
    const panel = panels.find((p) =>
      arg.dy > 0 ? p.scrollTop + p.clientHeight < p.scrollHeight : p.scrollTop > 0,
    );
    panel?.scrollBy({ top: arg.dy, behavior: 'instant' });
  }
  return panels.map((panel) => panel.scrollTop);
}
async function readJson(request: IncomingMessage): Promise<unknown> {
  let body = '';
  request.setTimeout(5000, () => request.destroy(new Error('Request body timeout')));
  request.setEncoding('utf8');
  for await (const chunk of request) {
    body += String(chunk);
    if (Buffer.byteLength(body) > 65_536) throw new Error('Request exceeds 64 KiB');
  }
  request.setTimeout(0);
  return JSON.parse(body);
}
async function main() {
  const options = parsePlayArgs(process.argv.slice(2));
  const checkout = fileURLToPath(new URL('..', import.meta.url));
  const commit = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: checkout, encoding: 'utf8' });
  const diff = spawnSync(
    'git',
    [
      'diff',
      '--quiet',
      'origin/main',
      '--',
      'scripts/lab-play.ts',
      'scripts/lab-play-helpers.ts',
      'scripts/lab-play-text.ts',
    ],
    { cwd: checkout },
  );
  const identity = driverCheck(
    commit.status === 0 ? commit.stdout : null,
    diff.status,
    process.env.LAB_PLAY_ALLOW_STALE === '1',
  );
  if (identity.refuse)
    throw new Error(
      `Refusing stale lab driver in ${checkout} at ${identity.driver}; use current main or set LAB_PLAY_ALLOW_STALE=1 deliberately.`,
    );
  await mkdir(options.out, { recursive: true });
  const browser = await (await loadPlaywright()).chromium.launch({ headless: true });
  let server: ReturnType<typeof createServer> | undefined;
  let firstMinute: ReturnType<typeof setTimeout> | undefined;
  let ceiling: ReturnType<typeof setTimeout> | undefined;
  try {
    const phone = options.device === 'phone';
    const page = await browser.newPage({
      viewport: phone ? { width: 360, height: 690 } : { width: 1280, height: 800 },
      isMobile: phone,
      hasTouch: phone,
      colorScheme: 'light',
      deviceScaleFactor: 1,
    });
    let openedAt: number | null = null;
    let stopped = false;
    let cached: PlaySnapshot | null = null;
    let queue = Promise.resolve();
    let logQueue = Promise.resolve();
    const enqueue = (work: () => Promise<void>) => {
      queue = queue.then(work).catch((error: unknown) => {
        console.error(error);
      });
    };
    const log = (
      op: Record<string, unknown>,
      started: number,
      error?: string,
      requestedControlPresentBefore: boolean | null = null,
    ) => {
      const line = makeLogLine(
        op,
        { now: Date.now(), openedAt, op_ms: Date.now() - started },
        error,
        requestedControlPresentBefore,
      );
      logQueue = logQueue
        .catch(() => {})
        .then(() => appendFile(resolve(options.out, 'wall-clock.jsonl'), `${JSON.stringify(line)}\n`));
      return logQueue;
    };
    const screenshot = async (file: string) => {
      const path = resolve(options.out, file);
      await page.screenshot({ path, fullPage: false, timeout: 10_000 });
      return path;
    };
    const stop = async () => {
      if (stopped) return;
      stopped = true;
      clearTimeout(firstMinute);
      await log({ op: 'ceiling', kind: 'stop', reason: 'BUDGET' }, Date.now());
    };
    const startClock = () => {
      openedAt = Date.now();
      firstMinute = setTimeout(() => {
        void (async () => {
          const started = Date.now();
          try {
            await screenshot('first-minute.png');
            await log({ op: 'shot', file: 'first-minute.png', kind: 'first_minute' }, started);
          } catch (error) {
            await log({ op: 'shot', file: 'first-minute.png' }, started, String(error));
          }
        })().catch(console.error);
      }, 60_000);
      ceiling = setTimeout(() => {
        void stop().catch(console.error);
      }, options.ceiling * 60_000);
    };
    const click = async (locator: Locator) => {
      const target = locator;
      if (!(await target.count()) || !(await target.isEnabled())) return false;
      try {
        await target.click({ timeout: 1500 });
        return true;
      } catch {
        // A moving or partly covered control (re-laid-out scene cards, a sticky footer) fails
        // Playwright's stability check. Tap an uncovered point of it instead, centring it first.
        for (const centre of [false, true]) {
          const point = await target.evaluate(uncoveredPoint, centre);
          if (point) {
            await tapPoint(point.x, point.y);
            return true;
          }
        }
        return false;
      }
    };
    const tapPoint = async (x: number, y: number) => {
      if (phone) await page.touchscreen.tap(x, y);
      else await page.mouse.click(x, y);
    };
    const act = async (op: PlayOp): Promise<string | undefined> => {
      switch (op.op) {
        case 'open':
          if (openedAt !== null) throw new Error('Already opened; the session clock cannot be reset');
          startClock();
          await page.goto(options.url, { waitUntil: 'load', timeout: 30_000 });
          break;
        case 'tap':
          if ('x' in op && typeof op.x === 'number' && typeof op.y === 'number') await tapPoint(op.x, op.y);
          else if ('name' in op && typeof op.name === 'string') {
            const roles = op.role ? [op.role] : namedTapRoles;
            let matches = page.getByRole(roles[0] ?? 'button', { name: op.name, exact: true });
            for (const role of roles.slice(1))
              matches = matches.or(page.getByRole(role, { name: op.name, exact: true }));
            matches = matches.filter({ visible: true });
            const enabled: Locator[] = [];
            const count = await matches.count();
            for (let i = 0; i < count; i++) {
              const target = matches.nth(i);
              if (await target.isEnabled()) enabled.push(target);
            }
            if (!count)
              throw new Error(
                `${op.name} left the page just before the tap (game state, not a driver failure)`,
              );
            if (!enabled.length)
              throw new Error(
                `${op.name} is shown but disabled right now (game state, not a driver failure)`,
              );
            if (enabled.length > 1) {
              const points = await Promise.all(
                enabled.map(async (target) => {
                  const box = await target.boundingBox();
                  return box
                    ? `(${Math.round(box.x + box.width / 2)},${Math.round(box.y + box.height / 2)})`
                    : '(unavailable)';
                }),
              );
              throw new Error(
                `${enabled.length} enabled controls are named ${op.name}; tap one by point: ${points.join(', ')} (game state, not a driver failure)`,
              );
            }
            if (!enabled[0] || !(await click(enabled[0])))
              throw new Error(
                `Cannot tap ${op.name}: control is covered or off screen; close the covering panel or scroll, then retry (game state, not a driver failure)`,
              );
          } else if ('text' in op && typeof op.text === 'string') {
            const point = await page.evaluate(textControlPoint, op.text);
            if ('reason' in point) {
              if (point.reason === 'disabled')
                throw new Error(
                  `${op.text} is shown but disabled right now (game state, not a driver failure)`,
                );
              const why: Record<string, string> = {
                'not found': 'is not on the page now (game state, not a driver failure)',
                'covered by another element':
                  'is covered by another element on the page; deal with what covers it or tap by point (game state, not a driver failure)',
              };
              throw new Error(
                `${op.text} ${
                  why[point.reason] ??
                  (point.reason.endsWith('controls match')
                    ? `matches ${point.reason.split(' ')[0]} controls; tap by point from a screenshot (ambiguous target, not a driver failure)`
                    : `could not be tapped: ${point.reason} (driver failure)`)
                }`,
              );
            }
            await tapPoint(point.x, point.y);
          }
          break;
        case 'select': {
          let target = visible(
            'label' in op && typeof op.label === 'string'
              ? page.getByLabel(op.label, { exact: true })
              : page.getByRole('combobox', { name: op.name ?? '', exact: true }),
          );
          if (!('label' in op) && !(await target.count()))
            target = visible(page.getByRole('listbox', { name: op.name ?? '', exact: true }));
          try {
            await target.selectOption({ label: op.option }, { timeout: 1500 });
          } catch {
            await target.selectOption({ value: op.option }, { timeout: 1500 });
          }
          break;
        }
        case 'type':
          if (op.name !== undefined)
            await visible(page.getByRole('textbox', { name: op.name, exact: true })).fill(op.text, {
              timeout: 5000,
            });
          else await page.keyboard.insertText(op.text);
          break;
        case 'scroll': {
          const viewport = page.viewportSize();
          let x = op.x ?? viewport.width / 2;
          let y = op.y ?? viewport.height / 2;
          if (op.text !== undefined) {
            const target = visible(page.getByText(op.text, { exact: true }));
            await target.scrollIntoViewIfNeeded({ timeout: 5000 });
            const box = await target.boundingBox();
            if (!box) throw new Error(`No visible scroll target: ${op.text}`);
            x = Math.max(1, Math.min(viewport.width - 1, box.x + box.width / 2));
            y = Math.max(1, Math.min(viewport.height - 1, box.y + box.height / 2));
          }
          const previous = await page.evaluate(scrollPanel, { x, y, dy: op.dy });
          await page.mouse.move(x, y);
          await page.mouse.wheel(0, op.dy);
          await sleep(150);
          await page.evaluate(scrollPanel, { x, y, dy: op.dy, previous });
          break;
        }
        case 'key':
          await page.keyboard.press(op.key);
          break;
        case 'wait':
          await sleep(op.s * 1000);
          break;
        case 'shot':
          return screenshot(op.file);
        case 'resize':
          await page.setViewportSize({ width: op.width, height: op.height });
          break;
        case 'log':
          break;
      }
      return undefined;
    };
    server = createServer((request, response) => {
      // Read bodies before joining the action queue so an incomplete POST cannot block other inputs.
      const body = readJson(request).then(
        (value) => ({ value }),
        (error) => ({ error }),
      );
      void body.then((parsed) => {
        enqueue(async () => {
          const started = Date.now();
          const value = 'value' in parsed ? parsed.value : undefined;
          const raw =
            value && typeof value === 'object' && !Array.isArray(value)
              ? (value as Record<string, unknown>)
              : { op: 'invalid' };
          const result = await runPlayOperation(raw, {
            previous: cached,
            act: async () => {
              // A malformed request or a spent session is not a driver block: say so, so testers do not stop as TOOL.
              const requestError = (message: string) =>
                new Error(`${message} (invalid request, not a driver failure)`);
              if (request.method !== 'POST' || request.url !== '/')
                throw requestError('Use POST / with a JSON operation');
              if ('error' in parsed) throw requestError(String(parsed.error));
              let op: PlayOp;
              try {
                op = validatePlayOp(value);
              } catch (error) {
                throw requestError(error instanceof Error ? error.message : String(error));
              }
              if (op.op !== 'log') {
                if (openedAt !== null && Date.now() - openedAt >= options.ceiling * 60_000) await stop();
                if (stopped)
                  throw new Error(
                    'Session ceiling reached; browser operations are refused (stop reason BUDGET, not a driver failure)',
                  );
                if (op.op !== 'open' && openedAt === null) throw requestError('Call open first');
              }
              const shot = await act(op);
              if (op.op !== 'log') await sleep(100);
              return shot;
            },
            snapshot: async (timeout) => ({
              // biome-ignore lint/performance/useDomNodeTextContent: The agent snapshot must contain only rendered text.
              visible: await page.locator('body').innerText({ timeout }),
              controls: await page.locator('body').ariaSnapshot({ timeout }),
            }),
          });
          cached = result.snapshot;
          await log(raw, started, result.error, result.requested_control_present_before).catch(console.error);
          response.writeHead(result.status, {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-store',
          });
          response.end(JSON.stringify(makePlayReply(result, { now: Date.now(), started, openedAt })));
        });
      });
    });
    await new Promise<void>((done, reject) => {
      server?.once('error', reject);
      server?.listen(options.port, '127.0.0.1', done);
    });
    await log({ op: 'start', driver: identity.driver, driver_check: identity.driver_check }, Date.now());
    const address = server.address();
    console.log(
      JSON.stringify({
        driver: identity.driver,
        driver_check: identity.driver_check,
        pid: process.pid,
        port: typeof address === 'object' ? address?.port : options.port,
      }),
    );
    await new Promise<void>((done) => {
      const close = () => {
        server?.close();
        server?.closeAllConnections();
        done();
      };
      process.once('SIGTERM', close);
      process.once('SIGINT', close);
    });
    await queue;
    await logQueue;
  } finally {
    clearTimeout(firstMinute);
    clearTimeout(ceiling);
    server?.close();
    await browser.close();
  }
}
main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
