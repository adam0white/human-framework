/** Optional browser check. Playwright is resolved only when this command runs; CI never installs browsers. */

import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { auditPhone, type PhoneFinding } from '../packages/lab-kit/src/audit-phone.ts';
import { parsePhoneArgs, parsePhoneSteps, phoneStepName } from './lab-phone-helpers.ts';

interface Locator {
  click(options: { timeout: number }): Promise<void>;
  fill(text: string): Promise<void>;
  first(): Locator;
  filter(options: { visible: boolean }): Locator;
}
interface Page {
  goto(url: string, options: { waitUntil: string }): Promise<void>;
  locator(selector: string): Locator;
  getByText(text: string, options: { exact: boolean }): Locator;
  waitForTimeout(ms: number): Promise<void>;
  evaluate(expression: string): Promise<PhoneFinding[]>;
  screenshot(options: { path: string; fullPage: boolean }): Promise<void>;
}
interface Playwright {
  chromium: {
    executablePath(): string;
    launch(options: { headless: boolean }): Promise<{
      newPage(options: object): Promise<Page>;
      close(): Promise<void>;
    }>;
  };
}
async function loadPlaywright(): Promise<Playwright> {
  const require = createRequire(import.meta.url);
  const candidates = [process.env.PLAYWRIGHT_MODULE, 'playwright'];
  const cache = resolve(homedir(), '.npm/_npx');
  try {
    for (const dir of await readdir(cache)) candidates.push(resolve(cache, dir, 'node_modules/playwright'));
  } catch {
    /* optional npm cache */
  }
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      const imported = (await import(pathToFileURL(require.resolve(candidate)).href)) as {
        default?: Playwright;
        chromium?: Playwright['chromium'];
      };
      const normalized = imported.chromium ? (imported as Playwright) : imported.default;
      if (
        normalized &&
        typeof normalized.chromium?.launch === 'function' &&
        existsSync(normalized.chromium.executablePath())
      )
        return normalized;
    } catch {
      /* try next optional installation */
    }
  }
  throw new Error(
    'Browser unavailable. Run npm exec --package=playwright -- playwright install chromium, then retry lab:phone.',
  );
}
async function main() {
  const options = parsePhoneArgs(process.argv.slice(2));
  const steps = options.steps ? parsePhoneSteps(JSON.parse(await readFile(options.steps, 'utf8'))) : [];
  const playwright = await loadPlaywright();
  const browser = await playwright.chromium.launch({ headless: true }).catch(() => {
    throw new Error(
      'Browser unavailable. Run npm exec --package=playwright -- playwright install chromium, then retry lab:phone.',
    );
  });
  await mkdir(options.out, { recursive: true });
  const results: { step: string; findings: PhoneFinding[] }[] = [];
  try {
    const page = await browser.newPage({
      viewport: { width: 360, height: 690 },
      isMobile: true,
      hasTouch: true,
      colorScheme: 'light',
      deviceScaleFactor: 1,
    });
    await page.goto(options.url, { waitUntil: 'load' });
    const capture = async (index: number, name: string) => {
      await page.waitForTimeout(150);
      const step = phoneStepName(index, name);
      const findings = await page.evaluate(`(${auditPhone.toString()})()`);
      await page.screenshot({ path: resolve(options.out, `${step}.png`), fullPage: false });
      await writeFile(
        resolve(options.out, `${step}.json`),
        `${JSON.stringify({ url: options.url, viewport: { width: 360, height: 690 }, step, findings }, null, 2)}\n`,
      );
      results.push({ step, findings });
      const counts = Object.entries(Object.groupBy(findings, (f) => f.kind))
        .map(([kind, rows]) => `${kind}: ${rows?.length}`)
        .join(', ');
      console.log(`${step}: ${findings.length} findings${counts ? ` (${counts})` : ''}`);
    };
    await capture(0, 'load');
    for (const [index, step] of steps.entries()) {
      if ('wait' in step) await page.waitForTimeout(step.wait);
      else if ('type' in step) await page.locator(step.selector).fill(step.type);
      else if (step.selector) await page.locator(step.selector).first().click({ timeout: 5000 });
      else if (step.click)
        await page
          .getByText(step.click, { exact: true })
          .filter({ visible: true })
          .first()
          .click({ timeout: 5000 });
      await capture(index + 1, step.name ?? `step-${index + 1}`);
    }
  } finally {
    await writeFile(
      resolve(options.out, 'summary.json'),
      `${JSON.stringify({ url: options.url, results }, null, 2)}\n`,
    );
    await browser.close();
  }
  if (results.some((r) => r.findings.length)) process.exitCode = 1;
}
main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
