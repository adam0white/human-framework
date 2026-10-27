/** A single live landing-page snapshot. This does not play the game. */
import { chromium } from 'playwright';

type Page = {
  goto(url: string, options: { waitUntil: 'domcontentloaded'; timeout: number }): Promise<unknown>;
  url(): string;
  locator(selector: string): { innerText(options: { timeout: number }): Promise<string> };
};
type Browser = { newPage(options: object): Promise<Page>; close(): Promise<unknown> };

export async function collectLiveText(
  url: string,
  launch: () => Promise<Browser> = () => chromium.launch({ headless: true, timeout: 15_000 }),
) {
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15_000 });
    const deadline = Date.now() + 10_000;
    let text = '';
    while (Date.now() < deadline) {
      // biome-ignore lint/performance/useDomNodeTextContent: This audit needs rendered text.
      text = await page.locator('body').innerText({ timeout: Math.max(1, deadline - Date.now()) });
      if (text.trim() && !/^(?:loading|lighting the lantern)(?:\s*[.\u2026]+)?$/i.test(text.trim())) break;
      await new Promise((resolve) => setTimeout(resolve, Math.min(250, deadline - Date.now())));
    }
    if (!text.trim() || /^(?:loading|lighting the lantern)(?:\s*[.\u2026]+)?$/i.test(text.trim()))
      throw new Error('Landing page did not render text before the timeout');
    return {
      url: page.url(),
      timestamp: new Date().toISOString(),
      text,
      limitations: [
        'Rendered DOM text may include off-screen or covered text; canvas text is not captured.',
        'Only the landing state was visited; unvisited screens and later changes are not captured.',
      ],
    };
  } finally {
    await browser.close();
  }
}
