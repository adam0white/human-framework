import { describe, expect, it, vi } from 'vitest';
import { collectLiveText } from './lab-wai-live-text.ts';

describe('collectLiveText', () => {
  it('returns the rendered landing text and closes the browser', async () => {
    const close = vi.fn();
    const browser = {
      newPage: async () => ({
        goto: async () => {},
        url: () => 'https://example.com/',
        locator: () => ({ innerText: async () => 'Welcome' }),
      }),
      close,
    };
    const result = await collectLiveText('https://example.com/', async () => browser);
    expect(result).toMatchObject({ url: 'https://example.com/', text: 'Welcome' });
    expect(Number.isNaN(Date.parse(result.timestamp))).toBe(false);
    expect(result.limitations.join(' ')).toMatch(/canvas.*unvisited/i);
    expect(close).toHaveBeenCalledOnce();
  });
  it('closes the browser when navigation fails', async () => {
    const close = vi.fn();
    const browser = {
      newPage: async () => ({
        goto: async () => {
          throw new Error('offline');
        },
        url: () => '',
        locator: () => ({ innerText: async () => '' }),
      }),
      close,
    };
    await expect(collectLiveText('https://example.com/', async () => browser)).rejects.toThrow('offline');
    expect(close).toHaveBeenCalledOnce();
  });
  it('waits for delayed landing text instead of returning a loading message', async () => {
    let reads = 0;
    const browser = {
      newPage: async () => ({
        goto: async () => {},
        url: () => 'https://example.com/',
        locator: () => ({
          innerText: async () =>
            ++reads === 1 ? 'Loading...' : reads === 2 ? 'Lighting the lantern…' : 'Ready to play',
        }),
      }),
      close: vi.fn(),
    };
    const result = await collectLiveText('https://example.com/', async () => browser);
    expect(result.text).toBe('Ready to play');
  });
});
