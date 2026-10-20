/**
 * Repeatable real-shell phone regression. Start Vite or a built preview separately, then run:
 * PLAYWRIGHT_MODULE=/path/to/playwright node apps/site/scripts/watch-phone-layout.ts http://localhost:5173
 * Optional second argument labels scratch artifacts (before/after). No server or dependency is installed.
 * The real App, map, stylesheet and phoneStage run unchanged. Only the Worker transport is replaced: it
 * delivers frozen buildFrame results from controlled real simulation states, so time cannot hide a failure.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Frame } from '../src/watch/sim/view.ts';
import { Harness } from './play-watch.ts';

const { glimpse, outwardSigns, promise } = await import('@adam0white/human-framework');
const { arrive, personOf } = await import('../src/watch/sim/people.ts');
const { checkMoments, catchLeaving } = await import('../src/watch/sim/moments.ts');
const { buildFrame } = await import('../src/watch/sim/view.ts');
const { layoutFor, postXY, hitTest } = await import('../src/watch/ui/map.ts');
const { WATCHER_IDS } = await import('../src/watch/sim/config.ts');
const modulePath =
  process.env.PLAYWRIGHT_MODULE ??
  '/Users/abdul/code/.lab-scratch/patterns/retest/well-cwd/node_modules/playwright';
const { chromium } = await import(pathToFileURL(join(modulePath, 'index.mjs')).href);
const base = process.argv[2] ?? 'http://localhost:5173';
const label = (process.argv[3] ?? 'current').replace(/[^a-z0-9_-]/gi, '-');
const out = join(homedir(), 'code/.lab-scratch/watchwell3/watch-b', `phone-${label}`);
mkdirSync(out, { recursive: true });

type Case = {
  name: string;
  frame: Frame;
  after?: Frame;
  helpers?: boolean;
  mode: 'moment' | 'account' | 'posting';
  who?: string;
};
const cases: Case[] = [];
function state(seed: number) {
  const h = Harness.fresh(seed);
  h.run.input({ k: 'start' });
  h.run.input({ k: 'begin' });
  h.run.step();
  const s = h.run.state;
  for (let night = 2; night <= 12; night++) {
    s.winterNight = night;
    arrive(s);
  }
  s.tokens = [];
  s.spawns = [];
  s.moment = null;
  s.momentLog = [];
  s.lantern = { x: 1, target: 1 };
  for (const [i, id] of WATCHER_IDS.entries()) {
    const p = personOf(s, id);
    if (!p) throw new Error(`Missing ${id}`);
    s.place[id] = i < 2 ? `gate-${i + 1}` : i < 4 ? `mill-${i - 1}` : `west-${i - 3}`;
    s.posts[id] = s.place[id] as (typeof s.posts)[string];
    p.body.asleep = false;
    p.body.downed = undefined;
    p.body.sleepPressure = 0.05;
    p.body.exertion = 0;
    p.body.sleepDebt = 0;
    p.agenda.commitments = [];
    if (p.activity) p.activity.action = 'hold-post';
  }
  return s;
}
// Cover each generator, the maximum four downed answers, and differing real Keeper reads.
for (const seed of [7, 4242, 20261004]) {
  for (const kind of ['waver', 'family', 'downed', 'leaving'] as const) {
    const s = state(seed);
    const who = kind === 'family' ? 'kian' : 'tamar';
    const p = personOf(s, who);
    if (!p) throw new Error(who);
    if (kind === 'downed') p.body.downed = { since: s.minute, reason: 'bite' };
    if (kind === 'downed' && seed === 4242)
      for (const id of WATCHER_IDS.filter((id) => id !== who)) {
        const helper = personOf(s, id);
        if (!helper) continue;
        helper.needs.sleep = 0;
        helper.needs.rest = 1;
        helper.body.sleepPressure = 1;
        helper.social.voices = [{ voiceId: 'keeper', trust: 0 }];
        promise(helper, {
          kind: 'duty',
          toId: 'home',
          actions: ['sleep'],
          from: s.minute,
          until: s.minute + 90,
          importance: 1,
          label: 'sleep',
        });
      }
    if (kind === 'family')
      promise(p, {
        kind: 'duty',
        toId: 'home:gate',
        actions: ['go-home'],
        from: s.minute,
        until: s.minute + 90,
        importance: 1,
        label: 'see to family',
      });
    if (kind === 'waver') {
      s.bell.heard[who] = 1;
      s.bell.rungAt = s.minute;
      p.body.sleepPressure = 1;
      p.needs.sleep = 0;
      p.needs.rest = 1;
      p.social.voices = [{ voiceId: 'keeper', trust: 0 }];
      promise(p, {
        kind: 'duty',
        toId: 'home',
        actions: ['sleep'],
        from: s.minute,
        until: s.minute + 90,
        importance: 1,
        label: 'sleep',
      });
      p.body.sleepDebt = 1;
      p.body.exertion = 1;
    }
    if (kind === 'leaving') catchLeaving(s, who, 'go-home', 'gate');
    else checkMoments(s);
    if (kind === 'waver' && !s.moment && seed !== 7) continue;
    if (!s.moment || s.moment.kind !== (kind === 'leaving' ? 'waver' : kind))
      throw new Error(`Missing generated ${kind} seed ${seed}`);
    cases.push({ name: `${kind}-${seed}`, frame: buildFrame(s, 0, true, 1), mode: 'moment' });
  }
}
// Deliberate layout stress: the longest real generated read in every available read slot.
// This combines legal copy lengths; it does not claim this exact composite occurred in a played run.
const longestRead =
  cases
    .flatMap((test) => test.frame.moment?.options.map((option) => option.read ?? '') ?? [])
    .sort((a, b) => b.length - a.length)[0] ?? '';
const crowded = structuredClone(cases.find((test) => test.name === 'downed-7'));
if (crowded?.frame.moment?.options.length !== 4) throw new Error('Missing maximum-options fixture');
crowded.name = 'downed-long-reads';
for (const option of crowded.frame.moment.options) if (option.read) option.read = longestRead;
cases.push(crowded);
for (const condition of ['healthy', 'tired', 'hurt', 'remote', 'downed'] as const) {
  const s = state(4242);
  const p = personOf(s, 'tamar');
  if (!p) throw new Error('Missing Tamar');
  if (condition === 'tired') {
    p.body.sleepPressure = 1;
    p.body.exertion = 1;
  }
  if (condition === 'hurt') {
    p.body.pain = 0.6;
    p.body.injuries = [
      { id: 'bite', part: 'leftLeg', severity: 0.35, bleeding: 0.1, since: p.now, healRatePerDay: 0.1 },
    ];
  }
  if (condition === 'remote') s.place.tamar = 'east-1';
  if (condition === 'downed') p.body.downed = { since: s.minute, reason: 'bite' };
  cases.push({ name: `account-${condition}`, frame: buildFrame(s, 0, false), mode: 'account', who: 'tamar' });
}
for (const who of WATCHER_IDS.filter((id) => id !== 'tamar'))
  cases.push({ name: `account-${who}`, frame: buildFrame(state(4242), 0, false), mode: 'account', who });
// Running-account regressions: the same open component receives an updated real frame.
for (const change of [
  'healthy-look',
  'helper-asleep',
  'helper-gone',
  'after-relief',
  'awake-after-doze',
] as const) {
  const s = state(4242);
  const p = personOf(s, 'tamar');
  const helper = personOf(s, 'kian');
  if (!p || !helper || !p.activity || !helper.activity) throw new Error('Missing founders');
  s.place.kian = 'gate-2';
  s.posts.kian = 'gate-2';
  p.social.reserve = { fatigue: 0, pain: 0 };
  p.body.sleepPressure = 1;
  p.body.exertion = 1;
  const frame = buildFrame(s, 0, false);
  if (!frame.watchers.find((w) => w.id === 'tamar')?.acts.some((a) => a.input.k === 'relieve'))
    throw new Error('Expected relief before live update');
  if (change === 'healthy-look') {
    p.body.sleepPressure = 0.05;
    p.body.exertion = 0;
    glimpse(s.keeper, 'tamar', { ...outwardSigns(p), fatigue: 0 }, s.minute, 1);
  }
  if (change === 'helper-asleep') helper.activity.action = 'doze';
  if (change === 'helper-gone') s.place.kian = 'home';
  if (change === 'after-relief') {
    const { applyNightAct, resolveNightRequest } = await import('../src/watch/sim/night-actions.ts');
    if (!applyNightAct(s, { k: 'relieve', who: 'tamar', by: 'kian' })) throw new Error('Relief unavailable');
    resolveNightRequest(s, { kind: 'begin', personId: 'kian', affordanceId: 'post:gate-1', at: s.minute });
    s.place.kian = 'gate-1';
    s.minute++;
    resolveNightRequest(s, { kind: 'begin', personId: 'tamar', affordanceId: 'sleep', at: s.minute });
    s.place.tamar = 'home';
  }
  if (change === 'awake-after-doze') {
    s.alerts.push({
      minute: s.minute,
      who: 'tamar',
      section: 'gate',
      kind: 'person',
      text: 'Tamar nods off at the Gate.',
      slowed: false,
    });
    p.body.sleepPressure = 0.05;
    p.body.exertion = 0;
    glimpse(s.keeper, 'tamar', { ...outwardSigns(p), fatigue: 0 }, s.minute, 1);
  }
  cases.push({
    name: `live-${change}`,
    frame,
    after: buildFrame(s, 0, false),
    helpers: change.startsWith('helper') || change === 'healthy-look',
    mode: 'account',
    who: 'tamar',
  });
}
const dusk = state(7);
dusk.phase = 'dusk';
cases.push({ name: 'posting-full', frame: buildFrame(dusk, 0, false), mode: 'posting', who: 'tamar' });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 360, height: 690 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
});
const results = [];
try {
  for (const test of cases) {
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('pageerror', (error: Error) => errors.push(error.message));
    await page.addInitScript(
      ({ frame }: { frame: Frame }) => {
        class LayoutWorker extends EventTarget {
          gen = 0;
          postMessage(msg: { type: string; gen?: number }) {
            if (msg.type === 'init') {
              this.gen = msg.gen ?? 0;
              queueMicrotask(() =>
                this.dispatchEvent(
                  new MessageEvent('message', {
                    data: { type: 'frame', gen: msg.gen, speed: 'watch', frame },
                  }),
                ),
              );
            }
          }
          constructor() {
            super();
            window.addEventListener('watch-layout-frame', (event) =>
              this.dispatchEvent(
                new MessageEvent('message', {
                  data: {
                    type: 'frame',
                    gen: this.gen,
                    speed: 'watch',
                    frame: (event as CustomEvent).detail,
                  },
                }),
              ),
            );
          }
          terminate() {}
        }
        window.Worker = LayoutWorker as unknown as typeof Worker;
      },
      { frame: test.frame },
    );
    await page.goto(new URL('/watch/', base).href);
    await page.locator('.w-stage').waitFor();
    await page.waitForTimeout(180);
    if (test.mode === 'account') {
      const canvas = await page.locator('.w-canvas').boundingBox();
      if (!canvas) throw new Error('No map canvas');
      const layout = layoutFor(canvas.width, canvas.height);
      let target: { x: number; y: number } | undefined;
      for (const sec of test.frame.sections)
        for (const [slot, post] of sec.posts.entries()) {
          const offset = post.watchers.indexOf(test.who ?? '');
          if (offset < 0) continue;
          const at = postXY(layout, sec.id, slot, sec.posts.length);
          target = { x: at.x, y: at.y - offset * 34 - 9 };
        }
      if (!target || hitTest(layout, test.frame, target.x, target.y)?.kind !== 'watcher')
        throw new Error('Watcher map target missing');
      await page.touchscreen.tap(canvas.x + target.x, canvas.y + target.y);
      await page.locator('.w-account-commit').waitFor();
      if (test.helpers) await page.getByRole('button', { name: 'Send relief', exact: true }).tap();
      if (test.after) {
        await page.evaluate(
          (frame: Frame) => window.dispatchEvent(new CustomEvent('watch-layout-frame', { detail: frame })),
          test.after,
        );
        await page.waitForTimeout(180);
        if (
          test.name === 'live-after-relief' &&
          (await page.getByRole('button', { name: /^(Rest|Send relief)$/ }).count())
        )
          throw new Error('Stale relief controls remain');
        if (
          test.name === 'live-awake-after-doze' &&
          !(await page.locator('.w-account-doze').innerText()).includes('nods off')
        )
          throw new Error('Heard doze missing from account');
      }
    }
    if (test.mode === 'posting') {
      await page.locator(`.w-roster .w-person-${test.who}`).tap();
      await page.locator('.w-places').waitFor();
    }
    await page.waitForTimeout(100);
    const measured = await page.evaluate((mode: string) => {
      const selectors =
        mode === 'moment'
          ? '.w-moment button, .w-watch-entry, .w-watch-entry button'
          : mode === 'account'
            ? '.w-account-commit, .w-account-commit button, .w-account-unavailable, .w-account > p, .w-helper-choice > .w-note'
            : '.w-places .w-place:disabled, .w-post-unavailable';
      const rows = [...document.querySelectorAll<HTMLElement>(selectors)].map((el) => {
        const r = el.getBoundingClientRect();
        const clipped: string[] = [];
        for (let parent = el.parentElement; parent; parent = parent.parentElement) {
          const style = getComputedStyle(parent);
          if (/(auto|scroll|hidden|clip)/.test(`${style.overflowX} ${style.overflowY}`)) {
            const box = parent.getBoundingClientRect();
            if (
              r.top < box.top - 1 ||
              r.bottom > box.bottom + 1 ||
              r.left < box.left - 1 ||
              r.right > box.right + 1
            )
              clipped.push(parent.className);
          }
        }
        const visible =
          r.height > 0 &&
          r.top >= -1 &&
          r.bottom <= innerHeight + 1 &&
          r.left >= -1 &&
          r.right <= innerWidth + 1 &&
          !clipped.length;
        return {
          text: el.innerText,
          top: r.top,
          bottom: r.bottom,
          height: r.height,
          button: el.tagName === 'BUTTON',
          visible,
          clipped,
        };
      });
      const scroll = [...document.querySelectorAll<HTMLElement>('.lk-sheet-body, .w-panel')].map((el) => ({
        class: el.className,
        top: el.scrollTop,
        excess: el.scrollHeight - el.clientHeight,
      }));
      const reasons = [...document.querySelectorAll<HTMLElement>('.w-place:disabled')].map((el) => ({
        text: el.innerText,
        reason: el.parentElement?.querySelector('.w-post-unavailable')?.textContent ?? '',
      }));
      const targets = [...document.querySelectorAll<HTMLElement>('button, a[href], summary')]
        .map((el) => ({ el, r: el.getBoundingClientRect() }))
        .filter(
          ({ el, r }) =>
            r.width > 0 &&
            r.height > 0 &&
            r.top >= 0 &&
            r.bottom <= innerHeight &&
            !el.closest('[hidden]') &&
            (() => {
              for (let parent = el.parentElement; parent; parent = parent.parentElement) {
                const style = getComputedStyle(parent),
                  box = parent.getBoundingClientRect();
                if (
                  /(auto|scroll|hidden|clip)/.test(`${style.overflowX} ${style.overflowY}`) &&
                  (r.top < box.top - 1 ||
                    r.bottom > box.bottom + 1 ||
                    r.left < box.left - 1 ||
                    r.right > box.right + 1)
                )
                  return false;
              }
              return true;
            })(),
        );
      const smallTargets = targets
        .filter(({ r }) => r.width < 43.9 || r.height < 43.9)
        .map(({ el, r }) => ({
          text: el.innerText || el.getAttribute('aria-label'),
          width: r.width,
          height: r.height,
        }));
      const overlaps: string[] = [];
      for (let i = 0; i < targets.length; i++)
        for (let j = i + 1; j < targets.length; j++) {
          const a = targets[i],
            b = targets[j];
          if (!a || !b || a.el.contains(b.el) || b.el.contains(a.el)) continue;
          if (
            Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left) > 1 &&
            Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top) > 1
          )
            overlaps.push(`${a.el.innerText} / ${b.el.innerText}`);
        }
      return {
        smallTargets,
        overlaps,
        rows,
        scroll,
        reasons,
        pageScroll: scrollY,
        pageExcess: document.documentElement.scrollHeight - innerHeight,
        accountReason: document.querySelector('.w-account-unavailable')?.textContent ?? '',
        accountButtons: document.querySelectorAll('.w-account-commit button').length,
        helperReasons: [...document.querySelectorAll('.w-helper-choice > .w-note')].map(
          (el) => el.textContent,
        ),
        headerHeight: document.querySelector('.w-top')?.getBoundingClientRect().height,
        availableHeight: document.querySelector('.w-stage')?.getAttribute('style'),
      };
    }, test.mode);
    const failures = measured.rows.filter(
      (row: { visible: boolean; height: number; button: boolean }) =>
        !row.visible || (row.button && row.height < 44),
    );
    const missing =
      test.mode === 'moment'
        ? measured.rows.length !== (test.frame.moment?.options.length ?? 0) + 3
        : test.mode === 'account'
          ? test.helpers
            ? !measured.helperReasons.length
            : !measured.accountButtons && !measured.accountReason
          : !measured.reasons.length || measured.reasons.some((r: { reason: string }) => !r.reason);
    const expectedReason =
      test.name === 'live-helper-asleep'
        ? /asleep/
        : test.name === 'live-helper-gone'
          ? /Away from the wall/
          : test.name === 'live-healthy-look'
            ? /latest account and look/
            : null;
    const reasonsCorrect =
      !expectedReason ||
      measured.helperReasons.some((reason: string | null) => expectedReason.test(reason ?? ''));
    const pass =
      reasonsCorrect &&
      !failures.length &&
      !missing &&
      !errors.length &&
      !measured.smallTargets.length &&
      !measured.overlaps.length &&
      measured.pageScroll === 0 &&
      measured.pageExcess <= 1;
    results.push({ name: test.name, pass, options: test.frame.moment?.options.length, errors, ...measured });
    console.log(
      `${pass ? 'PASS' : 'FAIL'} ${test.name}: ${measured.rows.map((r: { bottom: number }) => Math.round(r.bottom)).join(',')} bottom px; scroll=${measured.pageScroll}; page excess=${measured.pageExcess}`,
    );
    if (!pass)
      console.log(
        JSON.stringify({
          failures,
          smallTargets: measured.smallTargets,
          overlaps: measured.overlaps,
          missing,
        }),
      );
    writeFileSync(join(out, 'results.json'), `${JSON.stringify(results, null, 2)}\n`);
    await page.screenshot({ path: join(out, `${test.name}.png`) });
    await page.close();
  }
} finally {
  await browser.close();
}
writeFileSync(join(out, 'results.json'), `${JSON.stringify(results, null, 2)}\n`);
console.log(`Artifacts: ${out}`);
if (results.some((result) => !result.pass)) process.exitCode = 1;
