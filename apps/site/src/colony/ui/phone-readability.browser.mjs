/** Built-site layout regression. Run: PLAYWRIGHT_MODULE=/path/to/playwright node
 * apps/site/src/colony/ui/phone-readability.browser.mjs URL OUTSIDE_REPO_OUTPUT_DIR
 * The real worker keeps running; only injury news is supplied to make this layout repeatable.
 */
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { auditPhone } from '../../../../../packages/lab-kit/src/audit-phone.ts';

const require = createRequire(import.meta.url);
const playwright = await import(
  pathToFileURL(require.resolve(process.env.PLAYWRIGHT_MODULE ?? 'playwright')).href
);
const { chromium } = playwright.default ?? playwright;
const [url, out] = process.argv.slice(2);
assert(url && out, 'Pass the built site URL and an output directory outside the repository.');
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 360, height: 690 }, hasTouch: true, isMobile: true });
const results = [];
async function capture(name, ordering = false) {
  await page.waitForTimeout(300);
  const geometry = await page.evaluate(() => {
    const rect = (selector) => {
      const node = [...document.querySelectorAll(selector)].find(
        (element) => element.getBoundingClientRect().height > 0,
      );
      const r = node?.getBoundingClientRect();
      return r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null;
    };
    return {
      map: rect('.map-viewport'),
      notice: rect('.well-phone-status .hurt-line'),
      sheet: rect('.well-phone-sheet:not([hidden])'),
    };
  });
  const findings = await page.evaluate(auditPhone);
  results.push({ name, geometry, findings });
  await page.screenshot({ path: resolve(out, `${name}.png`) });
  if (ordering) {
    assert(
      geometry.notice && geometry.notice.height <= 48,
      `${name}: injury notice must collapse to one line`,
    );
    assert(
      geometry.map && geometry.map.height >= 690 * 0.39,
      `${name}: map must retain about 40% of the viewport (${geometry.map?.height}px)`,
    );
  }
  assert.equal(findings.length, 0, `${name}: ${JSON.stringify(findings)}`);
}
try {
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    window.Worker = class extends NativeWorker {
      addEventListener(type, callback, options) {
        if (type !== 'message') return super.addEventListener(type, callback, options);
        super.addEventListener(
          type,
          (event) => {
            const data = event.data;
            if (data.type === 'frame') {
              data.frame.news = [
                { personId: 'maryam', side: 'human', minute: data.frame.minute, how: 'hurt at work' },
              ];
            }
            callback.call(this, new MessageEvent('message', { data }));
          },
          options,
        );
      }
    };
  });
  await page.goto(url, { waitUntil: 'networkidle' });
  await capture('start');
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await page.getByRole('button', { name: 'Choose person', exact: true }).click();
  await page.getByRole('button', { name: 'Maryam', exact: true }).click();
  const quickRush = page.locator('.well-phone-tools .well-quick-rush');
  await quickRush.click();
  assert.equal(await quickRush.getAttribute('aria-pressed'), 'true');
  await page.getByRole('button', { name: 'Order options · Maryam', exact: true }).click();
  assert.equal(await page.locator('.well-phone-sheet .btn-confirm').isDisabled(), true);
  await capture('injury-order', true);
  assert.match(await page.locator('#well-confirm-reason').textContent(), /Choose a place first/);
  assert.equal(await quickRush.count(), 1);
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'Suggestion', exact: true }).click();
  await capture('injury-suggestion', true);
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'Order options · Maryam', exact: true }).click();
  await page.getByRole('button', { name: 'Place · Choose', exact: true }).click();
  await page.locator('.well-phone-sheet').getByRole('button', { name: 'House', exact: true }).click();
  await capture('injury-prepared-order', true);
  console.log(JSON.stringify(results, null, 2));
} finally {
  await writeFile(resolve(out, 'phone-readability.json'), `${JSON.stringify(results, null, 2)}\n`);
  await browser.close();
}
