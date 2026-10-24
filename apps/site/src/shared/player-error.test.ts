// @vitest-environment happy-dom
import { afterEach, expect, it } from 'vitest';
import { playerError } from './player-error.ts';

afterEach(() => history.replaceState(null, '', '/'));
it('keeps file/import and SDK diagnostics out of ordinary failures and retains meaningful conflict choices', () => {
  expect(playerError('Shelf unavailable. Use a local file.')).not.toMatch(/Shelf|local file/);
  expect(playerError('Shelf unavailable. Use a local file.')).toContain('Feedback');
  expect(playerError('parent revision changed')).toContain('earlier game');
  expect(playerError('unsupported authored role')).toContain('current chapter');
  expect(playerError('parse error', 'load')).toContain('saved copy has been kept');
});
it('keeps the exact technical reason available only under lab=1', () => {
  history.replaceState(null, '', '/?lab=1');
  expect(playerError('Shelf unavailable. Use a local file.')).toBe('Shelf unavailable. Use a local file.');
});
