// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest';
import { acceptGameNavigation, gameNavigation, NOTICE_KEY } from '../src/navigation.ts';

afterEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.unstubAllGlobals();
});
function arrive(referrer = 'https://human.adamwhite.work/games/', age = 0) {
  const fragment = encodeURIComponent(
    JSON.stringify({
      v: 1,
      at: 1000 - age,
      to: 'https://pass.adamwhite.work',
      player: 'a'.repeat(32),
      off: false,
      notice: true,
    }),
  );
  vi.stubGlobal('location', {
    origin: 'https://pass.adamwhite.work',
    href: 'https://pass.adamwhite.work/',
    pathname: '/',
    search: '',
    hash: `#hf-lab-navigation=${fragment}`,
  });
  vi.stubGlobal('document', { referrer });
  vi.stubGlobal('history', { state: null, replaceState: vi.fn() });
}
it('hands off only from a direct central visit, starts new recording sessions and leaves history untouched', () => {
  localStorage.setItem('hf-lab-player', 'b'.repeat(32));
  localStorage.setItem('old-record', 'historical-b');
  sessionStorage.setItem('hf-lab-session:pass', 'old-session');
  arrive();
  expect(acceptGameNavigation(1000)).toBe(true);
  expect(localStorage.getItem('hf-lab-player')).toBe('a'.repeat(32));
  expect(localStorage.getItem('old-record')).toBe('historical-b');
  expect(localStorage.getItem(NOTICE_KEY)).toBe('1');
  expect(sessionStorage.getItem('hf-lab-session:pass')).toBeNull();
});
it('rejects hostile, stale and copied handoffs', () => {
  arrive('https://hostile.example/');
  expect(acceptGameNavigation(1000)).toBe(false);
  arrive('https://human.adamwhite.work/games/', 300001);
  expect(acceptGameNavigation(1000)).toBe(false);
  arrive('');
  expect(acceptGameNavigation(1000)).toBe(false);
  expect(localStorage.getItem('hf-lab-player')).toBeNull();
});
it('only creates fragments for central navigation to approved games', () => {
  vi.stubGlobal('location', { origin: 'https://human.adamwhite.work' });
  expect(gameNavigation('https://pass.adamwhite.work/')).toContain('#hf-lab-navigation=');
  expect(gameNavigation('https://evil.example/')).toBe('https://evil.example/');
});

it('does not override a local Recording off choice during navigation', () => {
  localStorage.setItem('hf-lab-recording-off', '1');
  arrive();
  expect(acceptGameNavigation(1000)).toBe(false);
  expect(localStorage.getItem('hf-lab-recording-off')).toBe('1');
  expect(localStorage.getItem('hf-lab-player')).toBeNull();
});

// Current-increment origins need the top-level fallback when iframe storage is unavailable.
it('carries Recording off and the notice to each current-increment game', () => {
  for (const host of ['smoke', 'word', 'child', 'days', 'lefthand']) {
    localStorage.clear();
    localStorage.setItem('hf-lab-recording-off', '1');
    localStorage.setItem(NOTICE_KEY, '1');
    vi.stubGlobal('location', { origin: 'https://human.adamwhite.work' });
    const destination = new URL(gameNavigation(`https://${host}.adamwhite.work/`, 1000));
    expect(destination.hash).toContain('hf-lab-navigation=');
    expect(localStorage.getItem('hf-lab-player')).toBeNull();
    localStorage.clear();
    vi.stubGlobal('location', {
      origin: destination.origin,
      href: destination.href,
      pathname: '/',
      search: '',
      hash: destination.hash,
    });
    vi.stubGlobal('document', { referrer: 'https://human.adamwhite.work/games/' });
    vi.stubGlobal('history', { state: null, replaceState: vi.fn() });
    expect(acceptGameNavigation(1000)).toBe(true);
    expect(localStorage.getItem('hf-lab-recording-off')).toBe('1');
    expect(localStorage.getItem(NOTICE_KEY)).toBe('1');
    expect(localStorage.getItem('hf-lab-player')).toBeNull();
  }
});
