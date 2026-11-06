const { createRequire } = require('node:module');
const { mkdirSync, writeFileSync } = require('node:fs');
const { resolve } = require('node:path');
const requireSnapshot = createRequire(resolve('package.json'));
const { chromium } = requireSnapshot('playwright');
const root = resolve(process.env.FIRST_MINUTE_OUTPUT || '/tmp/hf-first-minute');
mkdirSync(root, { recursive: true });
const base = process.env.FIRST_MINUTE_URL || 'http://127.0.0.1:5173';
const expiryScenario = process.env.FIRST_MINUTE_SCENARIO === 'voice-expiry';
const configs = {
  voice: {
    path: '/voice/',
    start: 'New game',
    guide: '[aria-label="First suggestion guide"]',
    skip: 'Skip guide',
    menu: 'Game menu',
    replay: 'Replay first suggestion guide',
    first: 'button:text-is("Speak")',
    second: 'button:text-is("Go to sleep.")',
    result: '.v-request-account',
  },
  watch: {
    path: '/watch/',
    start: 'Go up to the wall',
    guide: '[aria-label="First watch guide"]',
    skip: 'Skip guide',
    menu: 'Game menu',
    replay: 'Replay first watch guide',
    first: '.w-roster .w-person',
    second: '.w-places .w-place:not([disabled])',
    result: '.w-posted-line',
  },
  well: {
    path: '/colony/',
    start: 'Begin the first morning',
    guide: '.well-tutorial',
    skip: 'Skip tutorial',
    menu: 'Game menu',
    replay: 'Replay tutorial',
    first: '.well-people [data-person]',
    second: '.well-places button',
    result: '.well-tutorial button:text-is("Continue")',
  },
};
const results = [];
async function geometry(locator) {
  const n = await locator.count();
  if (!n) return { ok: false, reason: 'missing' };
  return await locator.first().evaluate((el) => {
    const r = el.getBoundingClientRect();
    const clip = { left: 0, top: 0, right: innerWidth, bottom: innerHeight };

    const inside =
      r.width > 0 &&
      r.height > 0 &&
      r.left >= clip.left - 0.5 &&
      r.top >= clip.top - 0.5 &&
      r.right <= clip.right + 0.5 &&
      r.bottom <= clip.bottom + 0.5;
    const px = Math.min(12, r.width / 4),
      py = Math.min(12, r.height / 4);
    const points = [
      [r.left + r.width / 2, r.top + r.height / 2],
      [r.left + px, r.top + py],
      [r.right - px, r.top + py],
      [r.left + px, r.bottom - py],
      [r.right - px, r.bottom - py],
    ];
    const hits = points.map(([x, y]) => {
      const t = document.elementFromPoint(x, y);
      return !!t && (t === el || el.contains(t));
    });
    return {
      ok: inside && hits.every(Boolean),
      inside,
      hits,
      rect: { x: r.x, y: r.y, width: r.width, height: r.height },
      clip,
      tag: el.tagName,
      disabled: !!el.disabled,
    };
  });
}
async function snapshot(page, run, step, target, guide, skip) {
  await page.screenshot({ path: `${root}/${run}-${step}.png` });
  const checks = {
    target: await geometry(target),
    guide: guide ? await geometry(guide) : null,
    skip: skip ? await geometry(skip) : null,
  };
  runLog.push({ run, step, checks });
  for (const [k, v] of Object.entries(checks))
    if (v && !v.ok) throw Error(`${step}: ${k} not fully visible/unobstructed ${JSON.stringify(v)}`);
}
const runLog = [];
async function clickChecked(page, run, step, target, guide, skip) {
  await target.first().waitFor({ state: 'attached', timeout: 20000 });
  await snapshot(page, run, step, target, guide, skip);
  if ((run.startsWith('watch-') || run.startsWith('well-')) && ['first', 'second'].includes(step)) {
    await skip.focus();
    let reached = false;
    const focusOrder = [];
    for (let n = 0; n < 15; n++) {
      await page.keyboard.press('Tab');
      focusOrder.push(await page.evaluate(() => document.activeElement?.textContent?.trim().slice(0, 60)));
      if (await target.first().evaluate((el) => el === document.activeElement)) {
        reached = true;
        break;
      }
    }
    runLog.push({ run, step: `${step}-keyboard`, focusOrder });
    if (!reached) throw Error(`${step}: target not reached by Tab from guide`);
    await snapshot(page, run, `${step}-after-keyboard`, target, guide, skip);
  }
  const box = await target.first().boundingBox();
  if (!box) throw Error('missing target box');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}
async function contextFor(browser, viewport) {
  const c = await browser.newContext({ viewport, extraHTTPHeaders: { DNT: '1' }, serviceWorkers: 'block' });
  await c.addInitScript(() => {
    Object.defineProperty(navigator, 'doNotTrack', { value: '1', configurable: true });
    localStorage.setItem('hf-lab-recording-off', '1');
  });
  await c.route('**/*', (route) =>
    new URL(route.request().url()).origin === new URL(base).origin &&
    ['GET', 'HEAD'].includes(route.request().method())
      ? route.continue()
      : route.abort(),
  );
  return c;
}
async function caseRun(browser, name, vp) {
  const cfg = configs[name],
    run = `${name}-${vp.width}`;
  const context = await contextFor(browser, vp);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  try {
    await page.goto(base + cfg.path, { waitUntil: 'domcontentloaded' });
    await clickChecked(page, run, 'start', page.getByRole('button', { name: cfg.start, exact: true }));
    const guide = page.locator(cfg.guide),
      skip = page.getByRole('button', { name: cfg.skip, exact: true });
    await guide.waitFor({ state: 'attached', timeout: 30000 });
    const watcherName =
      name === 'watch' ? (await page.locator('.w-roster .w-person strong').first().textContent()).trim() : '';
    await clickChecked(page, run, 'first', page.locator(cfg.first), guide, skip);
    if (expiryScenario)
      await page
        .getByText('These choices are from an earlier moment.', { exact: false })
        .waitFor({ state: 'visible', timeout: 180000 });
    const selectedWords =
      name === 'voice' ? ((await page.locator(cfg.second).first().textContent()) || '').trim() : '';
    const unsaid = page.locator('.v-spoken-lines[role="status"]').filter({ hasText: 'Unsaid:' });
    if (name === 'voice' && (await unsaid.count())) throw Error('An older Unsaid result is already present');
    await clickChecked(page, run, 'second', page.locator(cfg.second), guide, skip);
    const result =
      name === 'voice'
        ? page.locator('.v-request-account, .v-spoken-lines[role="status"]:has-text("Unsaid:")').first()
        : page.locator(cfg.result).first();
    await result.waitFor({ state: 'visible', timeout: 30000 });
    const resultText = ((await result.textContent()) || '').trim();
    const outcomeText = ((await (name === 'well' ? guide : result).textContent()) || '').trim();
    if (name === 'well' && (!outcomeText || /wait for the answer/i.test(outcomeText)))
      throw Error('No actual Well reply');
    const missed =
      name === 'voice' &&
      (await result.evaluate((element) => element.matches('.v-spoken-lines[role="status"]')));
    if (expiryScenario && !missed) throw Error('The expired choice did not produce Unsaid');
    if (
      missed &&
      (!selectedWords ||
        !resultText.includes(selectedWords) ||
        !/That moment has passed\. Nothing was said\./.test(resultText))
    )
      throw Error('Unsaid result does not match the current selected option and missed-window consequence');
    if (name === 'voice' && !missed && (!resultText || /waiting/i.test(resultText)))
      throw Error('No actual Voice reply');
    if (name === 'watch' && (!resultText || !/is posted|was not posted|has no post/i.test(resultText)))
      throw Error('No frame-confirmed Watch posting response');
    const visibleOutcome = missed ? result : name === 'well' ? guide : guide.locator('[role=status]');
    const visibleText = ((await visibleOutcome.textContent()) || '').trim();
    const visibleGeometry = await geometry(visibleOutcome);
    if (!visibleGeometry.ok || !visibleText || /waiting for|wait for the answer/i.test(visibleText))
      throw Error(`Actual consequence not visible: ${JSON.stringify({ visibleText, visibleGeometry })}`);
    runLog.push({ run, step: 'visible-consequence', text: visibleText, geometry: visibleGeometry });
    if (name === 'well') {
      await clickChecked(page, run, 'continue', result, guide, skip);
      if (await guide.count()) throw Error('Guide remained after Continue');
    }
    if (name === 'watch' && /is posted/i.test(resultText)) {
      // The dusk response says 'asked'; begin the watch before asserting an actual arrival.
      await page.getByRole('button', { name: 'Begin the watch', exact: true }).click();
      await page.getByRole('button', { name: 'Fast', exact: true }).click();
      await page
        .getByRole('button', { name: new RegExp(watcherName) })
        .first()
        .click();
      await page
        .getByText('At the assigned post now.', { exact: false })
        .waitFor({ state: 'visible', timeout: 90000 });
      runLog.push({ run, step: 'post-arrival', text: 'At the assigned post now.' });
    }
    await page.screenshot({ path: `${root}/${run}-result.png` });
    runLog.push({ run, step: 'actual-result', text: resultText, geometry: await geometry(result) });
    // Exercise skip and replay from a separate first-time context, before any game choices.
    const skipContext = await contextFor(browser, vp);
    try {
      const other = await skipContext.newPage();
      other.on('pageerror', (e) => errors.push(`fresh: ${e.message}`));
      await other.goto(base + cfg.path, { waitUntil: 'domcontentloaded' });
      await clickChecked(
        other,
        run + '-fresh',
        'start',
        other.getByRole('button', { name: cfg.start, exact: true }),
      );
      const freshGuide = other.locator(cfg.guide),
        freshSkip = other.getByRole('button', { name: cfg.skip, exact: true });
      await freshGuide.waitFor({ state: 'attached', timeout: 30000 });
      await clickChecked(other, run + '-fresh', 'skip', freshSkip, freshGuide, null);
      if (await freshGuide.count()) throw Error('Guide remained after Skip');
      await clickChecked(
        other,
        run + '-fresh',
        'menu',
        other.getByRole('button', { name: cfg.menu, exact: true }),
      );
      await clickChecked(
        other,
        run + '-fresh',
        'replay',
        other.getByRole('button', { name: cfg.replay, exact: true }),
      );
      await freshGuide.waitFor({ state: 'attached', timeout: 10000 });
      await snapshot(other, run + '-fresh', 'replayed', freshSkip, freshGuide, null);
    } finally {
      await skipContext.close();
    }
    if (errors.length) throw Error(`Page errors: ${errors.join('; ')}`);
    results.push({
      run,
      outcome: 'PASS',
      consequence: missed ? 'missed-window-unsaid' : name === 'voice' ? 'actual-reply' : 'actual-outcome',
      resultText,
      visibleText,
      errors,
    });
  } catch (e) {
    await page.screenshot({ path: `${root}/${run}-failure.png` }).catch(() => {});
    results.push({ run, outcome: 'FAIL', error: String(e), errors });
  } finally {
    await context.close();
    writeFileSync(`${root}/results.json`, JSON.stringify({ results, steps: runLog }, null, 2));
  }
}
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const name of ['voice', 'watch', 'well'])
      for (const vp of [
        { width: 360, height: 690 },
        { width: 1280, height: 800 },
      ]) {
        if (expiryScenario && name !== 'voice') continue;
        await caseRun(browser, name, vp);
      }
  } finally {
    await browser.close();
    writeFileSync(`${root}/results.json`, JSON.stringify({ results, steps: runLog }, null, 2));
    console.log(JSON.stringify(results, null, 2));
    if (results.some((r) => r.outcome !== 'PASS')) process.exitCode = 1;
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
