// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest';
import { claimLabNotice, claimLocalNotice, SHARED_NOTICE_KEY } from '../src/notice.ts';

afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
});
it('shares a single first-disclosure claim independently of recording identity', async () => {
  vi.stubGlobal('location', { origin: 'https://human.adamwhite.work' });
  expect(await claimLabNotice()).toBe(true);
  expect(claimLocalNotice()).toBe(false);
  expect(localStorage.getItem(SHARED_NOTICE_KEY)).toBe('1');
  expect(localStorage.getItem('hf-lab-player')).toBeNull();
});
it('uses the origin-local disclosure fallback for unapproved hosts', async () => {
  vi.stubGlobal('location', { origin: 'https://unapproved.example' });
  expect(await claimLabNotice()).toBe(true);
  expect(document.querySelector('iframe')).toBeNull();
});
