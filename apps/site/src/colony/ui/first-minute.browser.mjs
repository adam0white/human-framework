/** No body-copy reading: follow only the guide and controls on a fresh desktop. */
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto(process.argv[2] ?? 'http://127.0.0.1:5188/colony/');
  await page.getByRole('button', { name: 'Begin the first morning' }).click();
  const prompt = page.locator('.well-tutorial strong');
  assert.match(await prompt.textContent(), /Tap a person/);
  await page.locator('.well-people [data-person]').first().click();
  assert.match(await prompt.textContent(), /Tap a place/);
  await page.locator('.well-places button').first().click();
  await page.waitForFunction(
    () => !document.querySelector('.well-tutorial strong')?.textContent?.includes('Wait for the answer'),
    null,
    { timeout: 30000 },
  );
  assert.match(await prompt.textContent(), /:/);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  assert.equal(await page.locator('.well-tutorial').count(), 0);
  console.log('PASS: person, place, real reply, continue');
} finally {
  await browser.close();
}
