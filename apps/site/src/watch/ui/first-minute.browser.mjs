/** Follow only the guide and controls; do not read body copy. */
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto(process.argv[2] ?? 'http://127.0.0.1:5188/watch/');
  await page.getByRole('button', { name: 'Go up to the wall' }).click();
  const prompt = page.locator('[aria-label="First watch guide"] [role=status]');
  assert.match(await prompt.textContent(), /tap a watcher/i);
  await page.locator('.w-roster .w-person').first().click();
  assert.match(await prompt.textContent(), /choose a wall/i);
  await page.locator('.w-places .w-place:not([disabled])').first().click();
  await page.waitForFunction(
    () =>
      /is posted|was not posted/.test(
        document.querySelector('[aria-label="First watch guide"] [role=status]')?.textContent ?? '',
      ),
    null,
    { timeout: 30000 },
  );
  console.log('PASS: watcher, wall, posting receipt');
} finally {
  await browser.close();
}
