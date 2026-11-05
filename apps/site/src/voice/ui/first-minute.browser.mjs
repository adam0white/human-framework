/** Follow only the guide and controls; do not read body copy. */
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto(process.argv[2] ?? 'http://127.0.0.1:5188/voice/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'New game' }).click();
  const prompt = page.locator('[aria-label="First suggestion guide"] [role=status]');
  await page.getByRole('button', { name: 'Speak', exact: true }).click();
  await page.waitForFunction(() =>
    /Choose a suggestion/.test(
      document.querySelector('[aria-label="First suggestion guide"] [role=status]')?.textContent ?? '',
    ),
  );
  assert.match(await prompt.textContent(), /Choose a suggestion/);
  await page.getByRole('button', { name: 'Go to sleep.' }).click();
  await page.waitForFunction(
    () => {
      const s =
        document.querySelector('[aria-label="First suggestion guide"] [role=status]')?.textContent ?? '';
      return s && !s.startsWith('Waiting');
    },
    null,
    { timeout: 30000 },
  );
  console.log('PASS: Speak, suggestion, recorded reply');
} finally {
  await browser.close();
}
